import { connectLambda, getStore } from "@netlify/blobs";

// Server-enforced daily allowance for signed-in users. The client sends a
// character count to debit; document bodies never reach this function.
const DAILY_CHAR_LIMIT = 15000;

// Absolute upper bound the request validation accepts before the per-account
// limit is read and enforced in the debit loop. A Pro/partner account may carry
// a per-record override (limits.daily_chars, written by hand via
// scripts/set-entitlement.mjs after a Stripe receipt) above the free default;
// this caps how high any single debit can claim, independent of the override.
const MAX_DAILY_CHAR_LIMIT = 1_000_000;

// Debits run a compare-and-swap retry loop; this caps how many times a
// request re-reads after losing a write race to a concurrent conversion.
const MAX_WRITE_ATTEMPTS = 4;

// Site-wide aggregate daily metrics (v0.2.1): one blob of PII-free integer
// totals per UTC day, disclosed on the privacy page. Only signed-in request
// outcomes are counted (anonymous use never reaches this function) — never
// document text, user ids, or per-user history.
const METRICS_PREFIX = "metrics/daily/";
const METRICS_MAX_ATTEMPTS = 2;

// Signed-in copy/download deltas (v0.2.6, plan-v2 tracked metrics): the
// client reports which result action was clicked — an enum value only, no
// characters, no content, no quota mutation. Maps client event names to
// aggregate metric fields.
const EVENT_FIELDS = {
  copy_output: "copies_output",
  copy_summary: "copies_summary",
  download: "downloads",
};
const METRICS_TIMEOUT_MS = 1000;
const METRICS_RETENTION_DAYS = 400;

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

// The account's effective daily character allowance: an optional per-record
// override (limits.daily_chars) falling back to the free-tier constant. This is
// entitlement *lookup*, not billing — the override is set by hand for Pro and
// design-partner accounts; there is no webhook and no Stripe API in this
// codebase (a standing kill-criterion). Absent or invalid override → free limit.
function effectiveCharLimit(profile) {
  const override = profile?.limits?.daily_chars;
  return Number.isInteger(override) && override > 0
    ? Math.min(override, MAX_DAILY_CHAR_LIMIT)
    : DAILY_CHAR_LIMIT;
}

// Metrics are best-effort by design: they may never fail, slow, or
// double-count a user request. Writes are production-gated so branch-deploy
// tests cannot pollute the series, time-boxed so a slow Blobs call cannot
// delay the response, and aborted on any thrown error so a delta is either
// applied exactly once or dropped (undercount, never double-apply).
async function recordDailyMetrics(store, date, deltas) {
  const entries = Object.entries(deltas).filter(([, amount]) => amount > 0);
  if (entries.length === 0 || process.env.CONTEXT !== "production") return;
  let timer;
  try {
    await Promise.race([
      applyMetricDeltas(store, date, Object.fromEntries(entries)),
      new Promise((resolve) => {
        timer = setTimeout(resolve, METRICS_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    console.warn("metrics: dropped daily deltas (undercount)", error?.name ?? "Error");
  } finally {
    clearTimeout(timer);
  }
}

// Same compare-and-swap pattern as the quota counter below; retry only when
// the write lost a race (modified:false).
async function applyMetricDeltas(store, date, deltas) {
  const key = `${METRICS_PREFIX}${date}`;
  for (let attempt = 1; attempt <= METRICS_MAX_ATTEMPTS; attempt++) {
    const entry = await store.getWithMetadata(key, { type: "json" });
    const totals = entry?.data ?? {};
    for (const [field, amount] of Object.entries(deltas)) {
      totals[field] = (Number.isInteger(totals[field]) ? totals[field] : 0) + amount;
    }
    const { modified } = await store.setJSON(
      key,
      totals,
      entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true },
    );
    if (modified) {
      // The first write of a new day doubles as the retention sweep trigger,
      // so the sweep runs about once per day instead of on every request.
      if (!entry) await pruneOldMetrics(store, date);
      return;
    }
  }
  console.warn(`metrics: dropped daily deltas after ${METRICS_MAX_ATTEMPTS} write conflicts (undercount)`);
}

// Privacy page promises aggregate totals are not kept beyond ~400 days.
async function pruneOldMetrics(store, date) {
  const cutoffMs =
    new Date(`${date}T00:00:00Z`).getTime() - METRICS_RETENTION_DAYS * 86400000;
  const cutoff = new Date(cutoffMs).toISOString().slice(0, 10);
  const { blobs } = await store.list({ prefix: METRICS_PREFIX });
  for (const blob of blobs) {
    if (blob.key.slice(METRICS_PREFIX.length) < cutoff) {
      await store.delete(blob.key);
    }
  }
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
    let body;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return respond(400, { error: "Request body must be JSON." });
    }
    // Result-action delta: counted in the daily aggregate and answered
    // immediately — it never touches the quota record below.
    if (body.event !== undefined) {
      const field = EVENT_FIELDS[body.event];
      if (!field) {
        return respond(400, {
          error: "event must be one of copy_output, copy_summary, download.",
        });
      }
      await recordDailyMetrics(store, today, { [field]: 1 });
      return respond(200, { recorded: true });
    }
    chars = body.chars;
    // Sanity bound only; the per-account limit is enforced by the debit loop's
    // remaining check below, so a Pro account's larger debit is not rejected here.
    if (!Number.isInteger(chars) || chars < 1 || chars > MAX_DAILY_CHAR_LIMIT) {
      return respond(400, {
        error: `chars must be an integer between 1 and ${MAX_DAILY_CHAR_LIMIT}.`,
      });
    }
  }

  for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
    const nowIso = new Date().toISOString();
    const entry = await store.getWithMetadata(key, { type: "json" });
    // Pre-image facts for the metrics deltas, captured before any mutation:
    // a winning write whose pre-image lacked today's counter is one DAU.
    const isNewProfile = !entry;
    const hadToday = Boolean(entry?.data?.daily?.[today]);
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
    // Per-account allowance: the override (if any) is carried on the record and
    // written back untouched by this loop, so entitlement survives every debit.
    const effectiveLimit = effectiveCharLimit(profile);

    // Only the current day's counters matter; dropping older dates keeps the
    // stored metadata minimal instead of accumulating a usage history.
    const day = profile.daily?.[today] ?? { chars_used: 0, conversions: 0 };
    profile.daily = { [today]: day };

    const remaining = Math.max(0, effectiveLimit - day.chars_used);
    const overLimit = chars !== null && chars > remaining;
    const firstConversionToday = day.conversions === 0;
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
        // The winning write is the one that counts the unique-user metric.
        await recordDailyMetrics(store, today, { quota_checks: 1 });
        return respond(200, {
          date: today,
          limit: effectiveLimit,
          used: day.chars_used,
          remaining,
        });
      }
      continue;
    }

    if (event.httpMethod === "GET") {
      await recordDailyMetrics(store, today, {
        quota_checks: 1,
        unique_users: hadToday ? 0 : 1,
        new_usage_profiles: isNewProfile ? 1 : 0,
      });
      return respond(200, {
        date: today,
        limit: effectiveLimit,
        used: day.chars_used,
        remaining,
      });
    }

    if (overLimit) {
      await recordDailyMetrics(store, today, {
        debit_attempts: 1,
        debits_blocked: 1,
        unique_users: hadToday ? 0 : 1,
        new_usage_profiles: isNewProfile ? 1 : 0,
      });
      return respond(200, {
        allowed: false,
        date: today,
        limit: effectiveLimit,
        used: day.chars_used,
        remaining,
      });
    }

    await recordDailyMetrics(store, today, {
      debit_attempts: 1,
      debits_allowed: 1,
      chars_debited: chars,
      unique_converters: firstConversionToday ? 1 : 0,
      unique_users: hadToday ? 0 : 1,
      new_usage_profiles: isNewProfile ? 1 : 0,
    });
    return respond(200, {
      allowed: true,
      date: today,
      limit: effectiveLimit,
      used: day.chars_used,
      remaining: effectiveLimit - day.chars_used,
    });
  }

  // Sustained contention on one user's counter. The client treats a non-OK
  // response as "service unavailable" and falls back to the anonymous limit.
  await recordDailyMetrics(store, today, {
    debit_attempts: 1,
    debit_failures_503: 1,
  });
  return respond(503, { error: "Could not record usage. Try again." });
};
