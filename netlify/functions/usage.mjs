import { connectLambda, getStore } from "@netlify/blobs";

// Server-enforced daily allowance for signed-in users. The client sends a
// character count to debit; document bodies never reach this function.
const DAILY_CHAR_LIMIT = 15000;

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
  const store = getStore("cheapagent-usage");
  const key = `users/${user.sub}`;
  const today = utcDate();
  const nowIso = new Date().toISOString();

  const stored = await store.get(key, { type: "json" });
  const profile = stored ?? {
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

  if (event.httpMethod === "GET") {
    await store.setJSON(key, profile);
    return respond(200, {
      date: today,
      limit: DAILY_CHAR_LIMIT,
      used: day.chars_used,
      remaining: Math.max(0, DAILY_CHAR_LIMIT - day.chars_used),
    });
  }

  let chars;
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

  const remaining = Math.max(0, DAILY_CHAR_LIMIT - day.chars_used);
  if (chars > remaining) {
    await store.setJSON(key, profile);
    return respond(200, {
      allowed: false,
      date: today,
      limit: DAILY_CHAR_LIMIT,
      used: day.chars_used,
      remaining,
    });
  }

  day.chars_used += chars;
  day.conversions += 1;
  profile.daily[today] = day;
  await store.setJSON(key, profile);

  return respond(200, {
    allowed: true,
    date: today,
    limit: DAILY_CHAR_LIMIT,
    used: day.chars_used,
    remaining: DAILY_CHAR_LIMIT - day.chars_used,
  });
};
