import { recordDailyMetrics } from "./lib/metrics.mjs";

// Pricing-intent capture (30-day plan, Phase 4.5 → flipped live in Phase 6):
// /go/pro and /go/enterprise count one explicit click server-side — no cookie,
// no identity, no body — then 302 onward. The aggregate daily totals are
// disclosed on the privacy page; the day-30 gate readout sums them.
//
// Phase 6 flips the *destinations* to the paid offers without changing what is
// counted (exactly as the v0.2.6 disclosure promised): /go/pro forwards to the
// Stripe payment link and /go/enterprise to the design-partner application,
// each supplied by the operator as an env var so no secret/price lives in the
// repo. When a destination env var is unset, the link falls back to the waitlist
// with the intent preselected — the pre-Phase-6 behavior, a harmless default.
const INTENTS = new Set(["pro", "enterprise"]);
const DESTINATION_ENV = {
  pro: "CHEAPAGENT_PRO_CHECKOUT_URL",
  enterprise: "CHEAPAGENT_ENTERPRISE_FORM_URL",
};

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

  // Forward to the configured external destination when set (https only, an
  // operator-set value — not user input); otherwise the waitlist fallback.
  const configured = process.env[DESTINATION_ENV[intent]];
  const destination =
    configured && /^https:\/\//i.test(configured)
      ? configured
      : new URL(`/api.html?intent=${intent}#waitlist`, req.url).toString();

  return new Response(null, {
    status: 302,
    headers: { Location: destination, "Cache-Control": "no-store" },
  });
};
