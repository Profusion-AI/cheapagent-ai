# Anonymous-activation decision — Netlify Analytics (Phase 4.5)

**Decision date:** 2026-06-12 (the plan's "day 15" item, decided when instrumentation shipped)
**Decision:** **Adopt Netlify Analytics** — enable it on the cheapagent.ai site **before launch week**.
**Status:** **CONFIRMED server-side (Kyle, 2026-06-12)** — Netlify Web Analytics is the chosen source; enable on the **Free** tier first, snapshot daily during launch week. Still awaiting the operator dashboard toggle. Two analytics extensions sit installed-but-inert on the team (Baseline, Simple Analytics) and are NOT adopted — see the amendments below. Full decision record: [`kyle-decision-analytics-2026-06-12.md`](kyle-decision-analytics-2026-06-12.md).

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

---

## Amendment 2026-06-12 — what is actually installed: Baseline (not Netlify Analytics), verified not capturing; Prerender found active

QC flagged that the analytics extension on the Netlify team is **"Baseline (web
feature support analytics)" by Google / the W3C WebDX Community Group** — a
different product from the Netlify Analytics this document adopted. Both the
extension's behavior and its live state were verified before this amendment
(extension source read at `tonypconway/netlify-baseline-extension@main`; site
state via the Netlify API; conclusion adversarially reviewed).

### Verified state: installed at team level, capture has never run

- Baseline's edge function is injected **at build time, and only when the site
  env var `BASELINE_ANALYTICS` exists** (`shouldInjectFunction` in the
  extension's `src/index.ts`). Without the var the function is **absent from
  the deploy** — not dormant.
- The cheapagent site has **no `BASELINE_ANALYTICS` env var**. The same env
  listing demonstrably shows extension-created vars (the Prerender extension's
  three vars appear with `created_source_type: "extension"`), so the absence is
  meaningful, and it was re-checked after the current production deploy
  (`b506dc5`, built 2026-06-12T23:52Z) was published.
- Therefore **no visitor data has ever been captured by Baseline on this
  site**, and no privacy.html disclosure is currently owed for it.
- One-minute dashboard confirmation, if ever needed: Project → Extensions →
  "Web Platform Baseline" — an "Enable analytics and deploy site" button (vs.
  charts + a Disable button) means capture was never enabled. Or Logs → Edge
  Functions: Baseline's function would carry a `baseline` prefix.

### What Baseline actually is (correcting this document's earlier description)

The "Why adopt" section above describes Netlify Analytics (server-log based,
~30-day retention, $9/mo). Baseline is none of those things. From its source:

- An edge function runs on every non-asset request, parses the **User-Agent
  only** (UAParser.js), and increments an aggregate count per browser+version.
  **No IP, no path, no raw UA string, no per-request timestamp is stored.**
- Aggregates live in the team's Netlify Blobs (store `netlify-baseline`) with a
  **rolling 7-day window**, deleted on every write cycle. Bots and AI crawlers
  are filtered out (~90-entry list).
- No client JS, no cookies, nothing added to the page; the function is
  pass-through.
- The dashboard shows Baseline web-feature support **percentages**, plus raw
  recognised-request totals for the trailing 7 days.

### Gate verdict: Baseline does not satisfy this decision

- The adopted purpose was launch-week traffic shape, /api.html pageviews, and
  funnel denominators. Baseline has **no per-path data, no pageview/visitor
  model, and a 7-day window that cannot span day 19 → day 30** (it is not
  retroactive at all; the "~30 days of logs" line above applies to Netlify
  Analytics only). Weekly manual snapshots of its request totals would give
  only a crude traffic proxy at recurring operational cost.
- Gate mechanics are unaffected either way: analytics numbers are context for
  the readout, never gate criteria.
- **The decision above stands as written: Netlify Analytics, dashboard toggle,
  before day 19. The toggle remains pending.** The fallback position is
  unchanged.

### If the operator instead chooses to enable Baseline capture

It is promise-*compatible* on the no-client-JS / no-cookies axis, but it
**counts visits passively**, which contradicts privacy.html's "Nothing is
counted from merely visiting or reading" and "nothing is ever sent passively,"
llms.txt's "nothing is captured passively," and the consent banner's "No
tracking here" as an ordinary reader would take them. Enabling it therefore
requires, **in the same release, before capture starts**:

1. Amending those sentences (privacy.html "Site-wide daily totals" + "Anonymous
   use", llms.txt current-posture line) to carve out the disclosed exception.
2. A Third-parties disclosure that is accurate for Baseline — NOT the
   Netlify-Analytics sentence drafted earlier in this document (that sentence
   describes server-log reading and would be false for Baseline). Paste-ready:
   *"We use the Baseline extension (by Google / W3C WebDX): a Netlify edge
   function counts which browser versions visit, as anonymous aggregate totals
   kept for 7 days in Netlify's storage. It reads only the browser's
   user-agent — no IP address, no page path, no cookies, no scripts — and
   filters out bots."*
3. A dated CHANGELOG entry, which must also supersede the 0.2.1 entry's
   standing claim that "the privacy promises forbid" anonymous usage
   measurement (that claim and any enabled measurement cannot both stand; the
   carve-out must be stated, not implied).

The same three steps apply, with the original drafted sentence, if Netlify
Analytics is what gets enabled — the 0.2.1 contradiction exists for it too.

### Also found during verification: the Prerender extension is ACTIVE

The Netlify **Prerender** extension (id 4076) has been enabled on this site
since **2026-06-02** — before this sprint — via env vars
`NETLIFY_PRERENDER_ENABLED=true` etc. Verified live: a Googlebot user-agent
receives a cached, post-JS DOM-serialized copy of the page (`X-Prerendered:
true`, `Cache-Tag: nf-prerender`) while a browser user-agent receives the
byte-identical static file. What this means:

- An edge function inspects the **User-Agent of every request** to classify
  crawlers/AI agents; classified agents are served pre-rendered copies of our
  own pages stored in Netlify Blobs (cache up to ~3 days). **No visitor data is
  collected or stored** — the stored objects are our pages.
- This was never disclosed or documented anywhere in the repo. The v0.2.9
  release adds the Third-parties description and an llms.txt note (agents may
  receive a cached copy), which is the dated disclosure the privacy page's own
  change rules call for.
- Operator decision (Kyle): keep or disable. It predates the sprint (likely
  installed during Netlify's legacy-prerendering sunset migration, GA
  2025-12-16). On this static-first site its value is limited to serving
  post-JS DOM to non-JS crawlers; it costs normal function/edge invocations and
  serves agents copies up to ~3 days stale relative to a deploy. Disabling it
  is also fine — nothing in the product depends on it.
  - **Decided 2026-06-12 (Kyle): KEEP Prerender enabled** — the goal is that
    agents discovering the site (and, through it, doc2toon) get a fully
    rendered page rather than an empty SPA shell. The v0.2.9 disclosure stands.

---

## Amendment 2026-06-12 — server-side route CONFIRMED; Simple Analytics declined (third extension, verified inert)

QC follow-up (Codex) surfaced a third analytics extension and recommended a
plan. Kyle's decision, recorded here.

### Decision: Netlify Web Analytics (server-side), Free tier first

Kyle confirmed the **server-side route** — the original adoption above stands,
with the operating plan sharpened:

- **Enable Netlify Web Analytics from the dashboard on the current Free team**
  (`Logs & Metrics > Analytics > Enable`). On Netlify's credit-based plans Web
  Analytics is no longer Pro-only; retention scales by tier (Free: current/past
  day; Personal $9/mo: 7 days; Pro $20/mo: 30 days — per Codex's read of
  Netlify's credit-based pricing docs).
- **Snapshot the dashboard numbers into `gate-tally.md` daily during launch
  week (days 19–30).** Retention limits dashboard lookback, not capture — short
  windows are fine if numbers are copied before they age out.
- **No Pro.** Pro's only analytics benefit over Personal is the 30-day window
  (no manual snapshotting); not worth $20/mo pre-revenue. Step up to **$9
  Personal** only if daily snapshotting is tedious (7-day window = two snapshots
  cover the gate stretch).
- **Legacy-Free caveat (check before toggling):** the team reads as Free and
  may be on a *legacy* Free plan (pre-2025 credit migration). If enabling Web
  Analytics forces a migration to credit-based plans — which Netlify says is
  **irreversible** — stop and reconsider; that is a bigger decision than $9. If
  Free offers analytics on the current plan, just enable it.
- Disclosure on enable is unchanged: the drafted Third-parties sentence above
  ("reads Netlify's server logs; no cookies, no scripts") is accurate for
  Netlify Web Analytics and ships **with** the toggle, in the same release, plus
  a dated CHANGELOG entry that also supersedes the 0.2.1 "promises forbid
  anonymous usage measurement" line.

### Simple Analytics: declined (would break the brand)

The "Simple Analytics" extension (by Simple Analytics, analytics category) was
enabled on the team. **Verified inert exactly as Baseline:** no SA script served
on any page (`/`, `/api.html`, `/honesty.html`, `/privacy.html`; only the app's
own `main.js`), no SA env vars on the site (only the three `NETLIFY_PRERENDER_*`),
SA proxy paths (`/simple.js`, `/sa.js`, …) 404. The extension's scopes are
`env:read/write/delete` only — no site-write, no edge functions — so it cannot
inject anything on its own; enabling it changed nothing.

Why not adopt it: unlike Baseline/Prerender (edge-side, no page script), Simple
Analytics works by adding a **client-side JavaScript beacon** (Netlify's setup
copy: it "will add the Simple Analytics script to your website to start tracking
visits instantly"; SA has no purely server-side/log mode — even its proxy setup
loads a first-party script). A pageview beacon that fires on load is "counted
from merely visiting," which directly contradicts privacy.html ("Nothing is
counted from merely visiting", "nothing is ever sent passively"), llms.txt
("nothing is captured passively"), the consent banner ("No tracking here"), and
AGENTS.md ("no client-side analytics JS … no passive telemetry"). Cookieless and
EU-hosted (SA's strengths) is not the issue — *scriptless* is. Netlify Web
Analytics keeps the promise; Simple Analytics would require pivoting it. Kyle
chose to keep the promise.

- **SA disposition:** left installed-but-inert (harmless; collects nothing).
  Uninstalling it (and Baseline) to shrink surface area is optional and fine;
  not required. Both are disclosed on privacy.html as installed-but-inactive.
