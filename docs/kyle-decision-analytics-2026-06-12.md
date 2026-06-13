# Kyle decision record — analytics & Netlify extensions (2026-06-12)

Internal decision log. Captures a fork resolved during the Phase 4.5 /
launch-prep window, so the reasoning isn't reconstructed later from diffs.
Canonical operational detail lives in [`analytics-decision.md`](analytics-decision.md);
this is the "why we chose what we chose" narrative.

## Context

The 30-day plan needs an anonymous-traffic source that fits CheapAgent's core
brand promise — **no client-side analytics JS, no cookies, nothing counted from
merely visiting** — repeated across privacy.html, llms.txt, the consent banner
("No tracking here"), and AGENTS.md. During launch prep, three Netlify
extensions were found installed on the team. Each was verified against its
source and the live site (adversarially reviewed); states below are facts, not
dashboard claims.

| Extension | Category | Mechanism | Verified state on cheapagent | Touches a privacy promise? |
|---|---|---|---|---|
| **Prerender** (Netlify) | build | Edge function classifies crawler/AI user-agents, serves them a cached pre-rendered copy of *our own* pages from Blobs (~3-day cache) | **ACTIVE since 2026-06-02** (`X-Prerendered: true` to bots; humans get byte-identical static files) | No visitor data stored; was undisclosed → disclosed in v0.2.9 |
| **Baseline** (Google/W3C WebDX) | analytics | Edge function parses user-agent → aggregate browser/version counts in Blobs, 7-day rolling window | **Installed (team), inert** — no `BASELINE_ANALYTICS` env var ⇒ edge function not injected; never captured | Would be passive if enabled; not enabled |
| **Simple Analytics** | analytics | Adds a **client-side JS beacon** to served HTML ("…will add the Simple Analytics script to your website"); no server-side/log-only mode | **Installed (team), inert** — no SA script on any page, no SA env vars, proxy paths 404; env-only scopes ⇒ cannot self-inject | **Yes** — a pageview beacon is "counted from merely visiting"; breaks the no-script / nothing-passive promise |

## The fork

To get launch-week traffic/funnel numbers, the options were:

- **A — Netlify Web Analytics (server-side).** Reads Netlify's own server/CDN
  logs; no script, no cookies, no ad-blocker dependency. Compatible with every
  existing promise (it's infrastructure-level processing already disclosed under
  Third parties). This was also Codex's actual recommendation.
- **B — Wire in Simple Analytics + revise the brand.** Cookieless and EU-hosted,
  but a client-side beacon; would require rewriting privacy.html, llms.txt,
  consent.js, and AGENTS.md to disclose an analytics script and superseding the
  0.2.1 "promises forbid anonymous usage measurement" line. A deliberate pivot
  of the product's central claim.
- **C — Hold, no analytics until post-launch.** Run the day-30 gate on
  explicit-action counts only (the fallback already written into
  `analytics-decision.md`).

Important framing that made the choice low-stakes: **anonymous traffic is gate
*context*, never a gate criterion.** The day-30 gate passes or fails on explicit
signals (waitlist, `/go` clicks, direct asks). Analytics only answers funnel
color ("how many launch-week visitors did the page convert?").

## Decision (Kyle, 2026-06-12)

1. **Analytics: Option A — Netlify Web Analytics, server-side.** Keep the brand
   intact. Simple Analytics is **declined** and left inert (collects nothing);
   uninstalling it and Baseline is optional cleanup, not required.
2. **Plan: Free first, no Pro.** Enable on the current Free team
   (`Logs & Metrics > Analytics > Enable`); snapshot numbers into
   `gate-tally.md` daily during launch week. Pro's only analytics edge is the
   30-day no-snapshot window — not worth $20/mo pre-revenue. Use $9 Personal
   (7-day) only if daily snapshotting is tedious. **Caveat:** if enabling forces
   a migration off legacy-Free (irreversible per Netlify), pause and reconsider
   before clicking through.
3. **Prerender: keep enabled.** Rationale: agents discovering the site (and
   doc2toon through it) should get a fully rendered page, not an empty SPA
   shell. Already disclosed (v0.2.9).

## Pending operator actions (Kyle)

- [ ] Enable Netlify Web Analytics in the dashboard (before day 19), watching
      for the legacy-Free migration prompt.
- [ ] During days 19–30, snapshot dashboard numbers into `gate-tally.md`.
- [ ] (Optional) Uninstall the Simple Analytics and Baseline extensions to
      reduce surface area.

## What ships only when Web Analytics is actually enabled

Per privacy.html's binding change-disclosure rule, the same release that turns
it on adds: the drafted Third-parties sentence ("We use Netlify Analytics, which
reads Netlify's server logs; it adds no cookies and no scripts to the page."),
a dated CHANGELOG entry, and a line superseding the 0.2.1 "promises forbid
anonymous usage measurement" claim. Not before the toggle.

## If the brand call is ever revisited (the Option-B path, not chosen)

Enabling Simple Analytics (or any client-side beacon) is a one-config-step,
silent promise violation unless the copy is revised **first**. The accurate
SA disclosure and the exact sentences to amend are pre-written in
`analytics-decision.md` so a future pivot is deliberate, not accidental.
