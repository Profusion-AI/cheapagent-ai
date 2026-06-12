# Day-30 gate — manual tally

Hand-counted gate inputs that have no automated counter. `scripts/gate-readout.mjs`
parses this file: it counts the `- ` bullets under each `##` section, so one
bullet = one countable item, dated, with enough context to defend the count.
Gate review: day 30 = **2026-07-09**.

## Direct asks

Hosted-API asks that arrived as email (the labeled "Hosted API early access"
subject from api.html), DMs, or in-thread requests. One bullet per distinct
person/org.

<!-- - 2026-06-XX — who/where — what they asked for -->

## Paying customers needing hosted

Pro or design-partner customers (Phase 6 offers) who explicitly need hosted —
CI at scale, private repos, no-local-install. One bullet per paying customer.

<!-- - 2026-06-XX — customer — the hosted need in their words -->

## Team conversations blocked on hosted

Conversations where hosted is the stated blocker to a paid pilot.

<!-- - 2026-06-XX — team — what's blocked -->

## Verification deductions

Post-deploy verification exercises the real production counters; honest
counting subtracts our own clicks. Format: `- <date> <metric_field> <count> — note`.

- 2026-06-12 go_pro_clicks 1 — v0.2.6 post-deploy verification (302 + Location checked)
- 2026-06-12 go_enterprise_clicks 1 — v0.2.6 post-deploy verification (302 + Location checked)
- 2026-06-12 feedback_useful 1 — v0.2.6 post-deploy verification (204 checked)
