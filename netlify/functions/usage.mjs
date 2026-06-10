import { connectLambda, getStore } from "@netlify/blobs";

// Server-enforced daily allowance for signed-in users. The client sends a
// character count to debit; document bodies never reach this function.
const DAILY_CHAR_LIMIT = 15000;

// Debits run a compare-and-swap retry loop; this caps how many times a
// request re-reads after losing a write race to a concurrent conversion.
const MAX_WRITE_ATTEMPTS = 4;

const baseHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function respond(statusCode, body) {
  return { statusCode, headers: baseHeaders, body: JSON.stringify(body) };
}

function utcDate() {
  return new Date().toISOString().slice(0, 10);
}

export const handler = async (event, context) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed." });
  }

  // Netlify Identity verifies the bearer token before the function runs and
  // exposes the verified claims here. No password or token handling on our side.
  const user = context.clientContext?.user;
  if (!user?.sub) {
    return respond(401, { error: "Sign in to use the daily allowance." });
  }

  connectLambda(event);
  // Strong-consistency reads are unavailable in lambda-compat functions (no
  // uncachedEdgeURL in the event context) and throw at request time. Eventual
  // reads are fine here: correctness rests on the conditional writes below —
  // a stale read just fails onlyIfMatch and the loop re-reads.
  const store = getStore("cheapagent-usage");
  const key = `users/${user.sub}`;
  const today = utcDate();

  let chars = null;
  if (event.httpMethod === "POST") {
    try {
      chars = JSON.parse(event.body ?? "{}").chars;
    } catch {
      return respond(400, { error: "Request body must be JSON." });
    }
    if (!Number.isInteger(chars) || chars < 1 || chars > DAILY_CHAR_LIMIT) {
      return respond(400, {
        error: `chars must be an integer between 1 and ${DAILY_CHAR_LIMIT}.`,
      });
    }
  }

  for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
    const nowIso = new Date().toISOString();
    const entry = await store.getWithMetadata(key, { type: "json" });
    const profile = entry?.data ?? {
      id: user.sub,
      email: user.email ?? "",
      plan: "free",
      created_at: nowIso,
      last_seen_at: nowIso,
      daily: {},
    };
    profile.email = user.email ?? profile.email;
    profile.last_seen_at = nowIso;

    // Only the current day's counters matter; dropping older dates keeps the
    // stored metadata minimal instead of accumulating a usage history.
    const day = profile.daily?.[today] ?? { chars_used: 0, conversions: 0 };
    profile.daily = { [today]: day };

    const remaining = Math.max(0, DAILY_CHAR_LIMIT - day.chars_used);
    const overLimit = chars !== null && chars > remaining;
    if (chars !== null && !overLimit) {
      day.chars_used += chars;
      day.conversions += 1;
    }

    // Compare-and-swap: write only against the exact revision that was read,
    // so two concurrent conversions cannot both spend the same allowance.
    const { modified } = await store.setJSON(
      key,
      profile,
      entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true },
    );

    if (!modified) {
      if (event.httpMethod === "GET") {
        // Losing the race on a read only means another request refreshed the
        // profile first; the counters just read are still fine to display.
        return respond(200, {
          date: today,
          limit: DAILY_CHAR_LIMIT,
          used: day.chars_used,
          remaining,
        });
      }
      continue;
    }

    if (event.httpMethod === "GET") {
      return respond(200, {
        date: today,
        limit: DAILY_CHAR_LIMIT,
        used: day.chars_used,
        remaining,
      });
    }

    if (overLimit) {
      return respond(200, {
        allowed: false,
        date: today,
        limit: DAILY_CHAR_LIMIT,
        used: day.chars_used,
        remaining,
      });
    }

    return respond(200, {
      allowed: true,
      date: today,
      limit: DAILY_CHAR_LIMIT,
      used: day.chars_used,
      remaining: DAILY_CHAR_LIMIT - day.chars_used,
    });
  }

  // Sustained contention on one user's counter. The client treats a non-OK
  // response as "service unavailable" and falls back to the anonymous limit.
  return respond(503, { error: "Could not record usage. Try again." });
};
