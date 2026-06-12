import { recordDailyMetrics } from "./lib/metrics.mjs";

// Pricing-intent capture (30-day plan, Phase 4.5): /go/pro and /go/enterprise
// count one explicit click server-side — no cookie, no identity, no body —
// then 302 onward. The aggregate daily totals are disclosed on the privacy
// page; the day-30 gate readout sums them. Until the Phase 6 Stripe links
// exist, both destinations are the waitlist section with the intent
// preselected; flipping the targets later does not change what is counted.
const INTENTS = new Set(["pro", "enterprise"]);

export const config = { path: "/go/:intent" };

export default async (req, context) => {
  const intent = context.params?.intent ?? "";
  if (req.method !== "GET" || !INTENTS.has(intent)) {
    return new Response(JSON.stringify({ error: "Unknown intent link." }), {
      status: 404,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  // Best-effort and production-gated inside the helper; the redirect never
  // waits on more than the helper's internal time-box and never fails on it.
  await recordDailyMetrics({ [`go_${intent}_clicks`]: 1 });

  const destination = new URL(`/api.html?intent=${intent}#waitlist`, req.url);
  return new Response(null, {
    status: 302,
    headers: { Location: destination.toString(), "Cache-Control": "no-store" },
  });
};
