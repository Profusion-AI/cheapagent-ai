import { getStore } from "@netlify/blobs";

// Shared best-effort daily-aggregate increment for modern (Functions 2.0)
// functions — the same metrics/daily Blobs pattern usage.mjs implements
// inline for the lambda-compat runtime. One blob of PII-free integer totals
// per UTC day, disclosed on the privacy page.
//
// Same invariants as usage.mjs: writes are production-gated so previews and
// branch deploys never pollute the series, time-boxed so a slow Blobs call
// cannot delay the user-facing response, retried only on a lost write race,
// and aborted on any thrown error — a delta is applied exactly once or
// dropped (undercount, never double-apply). The ~400-day retention sweep
// stays owned by usage.mjs (it prunes on each day's first quota write);
// this module only increments.
const METRICS_PREFIX = "metrics/daily/";
const METRICS_MAX_ATTEMPTS = 2;
const METRICS_TIMEOUT_MS = 1000;

export function utcDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function recordDailyMetrics(deltas) {
  const entries = Object.entries(deltas).filter(([, amount]) => amount > 0);
  if (entries.length === 0 || process.env.CONTEXT !== "production") return;
  let timer;
  try {
    await Promise.race([
      applyMetricDeltas(getStore("cheapagent-usage"), utcDate(), Object.fromEntries(entries)),
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
    if (modified) return;
  }
  console.warn(`metrics: dropped daily deltas after ${METRICS_MAX_ATTEMPTS} write conflicts (undercount)`);
}
