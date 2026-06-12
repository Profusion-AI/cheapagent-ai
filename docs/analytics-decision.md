# Anonymous-activation decision — Netlify Analytics (Phase 4.5)

**Decision date:** 2026-06-12 (the plan's "day 15" item, decided when instrumentation shipped)
**Decision:** **Adopt Netlify Analytics** — enable it on the cheapagent.ai site **before launch week**.
**Status:** awaiting the dashboard toggle (operator action; it is a paid site add-on, ~$9/mo, and cannot be enabled from the repo).

## Why adopt

The privacy promises (privacy.html, llms.txt, the consent banner's "No tracking
here") forbid client-side analytics JS, cookies, and passive telemetry. They are
the brand, and they are non-negotiable. Netlify Analytics is the one
promise-compatible source of anonymous traffic data: it reads Netlify's own
server logs — **no client JS, no cookies, nothing added to the page** — which is
infrastructure-level processing the privacy page already discloses under Third
parties ("how they handle infrastructure-level data such as IP addresses in
server logs"). `docs/v0.2-checkpoint-handoff.md` flagged it as the only
compatible option; this records the adoption.

Without it, the day-30 gate readout has **zero anonymous-visitor data**: no
visit counts, no /api.html pageviews, no launch-week traffic shape. Explicit
signals (waitlist, /go clicks, feedback, direct asks) still feed the three gate
criteria — the gate can be read without Analytics — but activation and funnel
questions ("how many launch-week visitors did the soft-linked page convert?")
would be unanswerable. $9/mo against the value of the day-30 decision is not a
close call.

## What changes when it's enabled

- **Operator step (Kyle):** Netlify dashboard → cheapagent.ai site → Analytics → enable. Do this before day 19 (launch week) — Analytics is not retroactive beyond what Netlify retains in logs (~30 days), so enabling late forfeits early data.
- **Disclosure:** add one sentence to privacy.html Third parties when enabled — "We use Netlify Analytics, which reads Netlify's server logs; it adds no cookies and no scripts to the page." — plus a dated CHANGELOG entry, per the page's own change-disclosure promise. (Ready to paste; ship with the toggle, not before.)
- **Gate readout:** `scripts/gate-readout.mjs` prints the explicit-action numbers and reminds the operator to append the Analytics dashboard numbers by hand. Analytics numbers are context for the readout, never gate criteria.

## If the toggle doesn't happen by day 19

Then the recorded position is: the day-30 readout is argued from signed-in and
explicit-action counts alone, with no anonymous-visitor data — known and
accepted in advance, not discovered on day 30. (This is the alternative the
plan required writing down; adoption above is the chosen path.)
