# Changelog

All notable changes to the CheapAgent app will be documented in this file.

## 0.2.11 - 2026-06-15

Netlify Web Analytics enabled. Privacy disclosure and promise-reconciliation changes ship in the same deploy, per the gap-free runbook in `docs/kyle-decision-analytics-2026-06-12.md`. No product code changes.

### Enabled

- **Netlify Web Analytics (server-side, Free tier).** Reads Netlify's own server-side request logs to count page views — no script, no cookies, nothing added to the page. Activated via the Netlify dashboard after this deploy. This is an extension of the infrastructure-level log processing Netlify already performs as our hosting provider.

### Changed (privacy, disclosed same-release)

- privacy.html Third parties: replaces the "if we ever turn on visitor analytics" forward declaration with a present-tense Netlify Web Analytics disclosure (server-log reading, no script, no cookies). Notes the two inert team-level extensions (Baseline, Simple Analytics) remain inactive.
- privacy.html Site-wide daily totals: scopes "Nothing is counted from merely visiting or reading" to "Nothing in these application-layer totals is counted from merely visiting or reading" — the explicit carve-out for server-log page-view counting.
- `llms.txt` current posture: scopes "nothing is captured passively" to the application-layer counters; adds a Netlify Web Analytics note.
- "Last updated" line bumped to 2026-06-15, v0.2.11.

### Supersedes

- v0.2.1 "Not in this release: Anonymous usage measurement, traffic sources, funnels, retention cohorts — excluded by design; the privacy promises forbid them." Netlify Web Analytics (server-side) is the one promise-compatible anonymous measurement path, confirmed by the Kyle decision record (2026-06-12). The promises are reconciled by scoped attribution, not retracted.

## 0.2.10 - 2026-06-12

Analytics decision confirmed (Kyle), and a third inert extension disclosed. Docs + one privacy.html accuracy edit; no product code changes.

### Decided

- **Anonymous analytics: Netlify Web Analytics, server-side (Free tier first).** Reads Netlify's server logs — no script, no cookies — so every privacy promise stays intact. Plan: enable from the dashboard, snapshot numbers into `gate-tally.md` daily during launch week; **no Pro** ($20/mo only buys a 30-day no-snapshot window, not worth it pre-revenue; $9 Personal/7-day only if snapshotting is tedious); watch for the irreversible legacy-Free→credit-plan migration prompt before toggling. The dashboard toggle remains the pending operator action; the Web Analytics privacy disclosure ships *with* the toggle, not before.
- **Simple Analytics: declined.** The extension was enabled on the team but is **verified inert** (no script on any page, no SA env vars, env-only scopes so it cannot self-inject). It works by adding a **client-side beacon**, which would break the "no analytics JS / nothing counted from merely visiting" promise — so it is not adopted. Left installed-but-inert (harmless); uninstalling it and Baseline is optional cleanup.
- **Prerender: kept enabled** (Kyle) for agent-discoverability — agents reaching the site get a fully rendered page, not an empty SPA shell. Disclosure from v0.2.9 stands.
- Full record: `docs/kyle-decision-analytics-2026-06-12.md`; operational detail in `docs/analytics-decision.md` (amended).

### Changed (privacy, disclosed same-release)

- privacy.html Third parties: the Baseline-only sentence is generalized to state that **both** team-installed analytics extensions (Baseline and Simple Analytics) are inactive and verified capturing nothing on this site, and that any future visitor analytics will be a server-side, no-script, no-cookie option disclosed here first. (Accuracy fix — the prior wording named only one of the two inert extensions.)
- `AGENTS.md` extension-state note updated: lists all three extensions, the chosen server-side analytics path, and an explicit "do not wire in Simple Analytics."

## 0.2.9 - 2026-06-12

Disclosure and reconciliation release, after QC flagged that the analytics extension installed on the Netlify team is **Baseline (by Google)** — not the Netlify Analytics the Phase 4.5 decision adopted. No product code changes.

### Verified (state, not code)

- **Baseline captures nothing on this site.** Its edge function is injected at build time only when a `BASELINE_ANALYTICS` env var exists (confirmed in the extension's source); the site has no such var (in an env listing that demonstrably shows extension-created vars), re-checked after the current production deploy was published. Installed at team level, never enabled for site capture, zero visitor data ever collected. Conclusion adversarially reviewed; the one-minute dashboard re-check is documented in `docs/analytics-decision.md`.
- **The Netlify Prerender extension has been ACTIVE since 2026-06-02** (predates this changelog's history; never previously disclosed or documented). Verified live: crawler/AI user-agents receive a cached, post-JS pre-rendered copy of pages (`X-Prerendered: true`); browser user-agents receive the byte-identical static files. It inspects the user-agent of each request to classify crawlers and stores **our own rendered pages** in Netlify Blobs (~3-day cache) — no visitor data is collected or stored by it.

### Changed (privacy, disclosed same-release)

- privacy.html Third parties now describes the active Prerender behavior (user-agent classification of crawlers, cached copies of our own pages, no visitor data) — this is the dated disclosure the page's own change rules call for, made as soon as the extension's activity was discovered — and states plainly that Baseline is installed but verified not capturing, and that enabling it would change this page first, same release. The server-log sentence now names user-agent strings alongside IP addresses.
- `llms.txt` gains a serving note for agents: crawler/AI user-agents may receive the pre-rendered cached copy (up to ~3 days stale; same DOM contract ids; check `X-Prerendered` or use a browser UA when verifying fresh deploys).
- `docs/analytics-decision.md` gains a dated amendment: Baseline ≠ Netlify Analytics (edge user-agent aggregates in Blobs, 7-day rolling window, no IP/path, bot-filtered — not server-log based, not retroactive); it cannot serve the day-30 funnel purpose (7-day window cannot span days 19–30; no pageviews, paths, or visitors), so **the adopted decision stands and the Netlify Analytics dashboard toggle remains the pending operator action**. The amendment also records exactly what enabling Baseline instead would require (amended "nothing passive" sentences + an accurate disclosure — the previously drafted sentence described server-log reading and would be false for Baseline + a CHANGELOG entry superseding 0.2.1's "the privacy promises forbid anonymous usage measurement" claim, which otherwise contradicts any enabled measurement).
- `AGENTS.md` deployment notes now list the live extension state, including that production verification should use a browser user-agent.

### Unchanged

- The day-30 gate is unaffected throughout: gate criteria are explicit signals only; analytics numbers were always context, never criteria. The recorded fallback (readout argued from explicit-action counts alone) still applies if no analytics is enabled by day 19.

## 0.2.8 - 2026-06-12

Security maintenance: clears both open Dependabot alerts (GHSA-gv7w-rqvm-qjhr high, GHSA-g7r4-m6w7-qqqr low — both on esbuild, development scope, fixed in 0.28.1). Build-tooling only: esbuild was vite's bundler dependency and never ships in the production bundle.

### Changed

- `vite` `^7.2.4` → `^8.0.16` (Dependabot's recommended path: vite 8 drops esbuild entirely, so the vulnerable package leaves the tree rather than getting pinned forward). Verified: clean build, all four pages emitted, deploy-env metadata intact, workbench + plan table exercised against the new bundle in preview, `npm audit` reports 0 vulnerabilities. Netlify's `NODE_VERSION = "20"` resolves to ≥20.19, satisfying vite 8's engine floor.

## 0.2.7 - 2026-06-12

Context plans reach the web: `split_first` stops being the end of the conversation. The plan table renders doc2toon's section-level analysis (Verdict 1.1 `context_plan`) under the verdict card — every heading-bounded section measured standalone under the same frozen policy, zero re-derivation in the web app.

### Added

- Context plan table (`#plan-block`) under the verdict card for multi-section documents: per-section profile, measured Δ chars, standalone verdict, and convert/keep action, with section line ranges; the net line reports section counts, net savings with splice overhead included, `recommend_hybrid`, `reassembly_verified`, and plan-level `safe_to_auto_apply`. Computed by `buildContextPlan` from `doc2toon/browser` — the same engine behind `doc2toon plan`. Plans are lossless-only by design, independent of the tab's conversion mode. Single-section documents show no plan (the plan would only repeat the whole-doc verdict).
- "Copy plan" (`#copy-plan-button`): a paste-anywhere plan summary built from the `context_plan` field names, one evidence row per section. It includes the document's own section headings, never section bodies or TOON output.
- "Download hybrid .md" (`#download-hybrid-button`): the assembled hybrid — converted sections as fenced TOON blocks, kept sections byte-identical (`reassembly_verified` is the engine's own mechanical check). Enabled when at least one section converts; when the net is below the 5% band the notice says the plan recommends against it — the plan informs, the user decides. Hybrid downloads count toward the existing disclosed `downloads` aggregate (signed-in only, enum value, never content); "Copy plan" is deliberately uncounted in this release.
- `/honesty.html` context-plan section: the pre-registered actionable-plan rate — **2 of 38** documents plan-positive (internal 1/19 median +20.9%, external 1/19 median +6.8%, 7 of 38 with ≥1 converting section, reassembly verified on all 38; re-verified at released doc2toon 0.4.2). Flagship: langchain-ai/langchainjs AGENTS.md — whole-doc `keep_markdown` at −42.8%, plan converts its two package tables (+49.5%, +52.0%) for net +6.8% with plan-level `safe_to_auto_apply: true`. The whole-document denominators are unchanged. "Run yours" now includes `npx doc2toon@^0.4 plan AGENTS.md` and `scripts/benchmark-plans.mjs` (all commands executed verbatim against the registry package before publishing).
- `AGENTS.md` — agent guidance for this repo (build/verify commands, contract surfaces, privacy constraints), and `.github/workflows/context-check.yml` — the doc2toon context-check Action (second-repo dogfood, `Profusion-AI/doc2toon@action-v1`).
- `split_first` verdict card now ends with "…and here's the plan" when a plan is shown.

### Changed

- `doc2toon` dependency `^0.3.0` → `^0.4.2` (plans need `buildContextPlan` from the 0.4 browser export; the verdict surface is unchanged — Verdict 1.0 stays byte-stable per the freeze rules).
- `llms.txt`: plan DOM contract (`#plan-block`, `#copy-plan-button`, `#download-hybrid-button`) documented additively; honesty-benchmark description carries the plan metric; programmatic guidance adds `doc2toon plan --json` / `buildContextPlan`.
- No new network requests and no new counters: the plan computes entirely in the browser; anonymous use still sends nothing.

## 0.2.6 - 2026-06-12

Phase 4.5 of the 30-day plan: the hosted-API early-access page and the day-30 gate instrumentation, deployed soft (live and indexable, linked from nowhere on the site yet — promotion is days 24–30). Every captured signal is an explicit, disclosed user action; nothing is collected passively. Privacy disclosures below ship in the same release as the features they describe, per privacy.html's own change-disclosure promise.

### Added

- `/api.html` — hosted Context API early access: the localhost-today/hosted-later story, the published contract (`/openapi.yaml`, OpenAPI 3.1, vendored pinned copy with `x-source: doc2toon@0.4.2`; `/schemas/verdict.v1.json`, byte-identical to the npm tarball's canonical schema so its `$id` URL now resolves), Pro/design-partner early-access framing (Amendment 3 copy: saved/exportable reports listed as "coming," not promised), a Netlify Forms waitlist (`api-early-access`: email + optional hosted-need + optional note + intent), and a labeled mailto for countable direct asks.
- `/go/pro` and `/go/enterprise` (`netlify/functions/go.mjs`) — pricing-intent capture: one explicit click increments a server-side daily aggregate counter (no cookie, no identity, no body), 302 onward to the waitlist with intent preselected. Targets flip to Stripe links in Phase 6; the counting does not change.
- Useful/not-useful button pair (`#useful-button` / `#not-useful-button`) next to the result actions — sends a single anonymous boolean to `POST /api/feedback` (`netlify/functions/feedback.mjs`), counted in the same daily aggregate; one vote per run, buttons disable after voting.
- Signed-in copy/download deltas: `usage.mjs` accepts `{event: copy_output | copy_summary | download}` and counts `copies_output` / `copies_summary` / `downloads` in the daily aggregate — an enum value, never content; fire-and-forget from the client; anonymous use still sends nothing on these actions.
- `netlify/functions/lib/metrics.mjs` — the usage.mjs daily-aggregate pattern (production-gated, time-boxed, CAS, undercount-never-double-apply) shared by the two new modern functions.
- `scripts/gate-readout.mjs` — prints the three day-30 gate numbers mechanically (Netlify Forms waitlist count + Blobs `/go` click totals + `docs/gate-tally.md` manual tallies), evaluates the any-two-of-three gate, subtracts recorded verification clicks, and reminds the operator to append Netlify Analytics numbers by hand. `docs/gate-tally.md` is the hand-counted side (direct asks, paying-needing-hosted, blocked team conversations, verification deductions).
- `docs/analytics-decision.md` — the Phase 4.5 anonymous-activation decision, recorded: adopt Netlify Analytics (server-log based, no client JS, no cookies — the one promise-compatible option) before launch week; enablement is a dashboard step, and the fallback position is written down if it doesn't happen.
- `docs/stripe-privacy-section-draft.md` — the Stripe third-party privacy section, drafted now, flipped live only with the Phase 6 payment links.

### Changed (privacy, disclosed same-release)

- privacy.html (last-updated 2026-06-12): the site-wide daily totals section now lists the new counted actions (signed-in copy/download clicks, feedback votes, API-page interest clicks); a new "API early-access page" section discloses exactly what the waitlist form stores (the one place an email is stored outside sign-up; deletion on request), what a `/go` click counts, and the labeled email channel; the anonymous-use section now states the complete, exhaustive list of anonymous-capable requests — all explicit submissions, never passive; Third parties notes Netlify Forms storage.
- `llms.txt`: api.html added to primary resources; the DOM contract documents the feedback pair (with guidance that agents should not vote on a user's behalf unless the user expressed the judgment); the anonymous-use claim restated with the exhaustive explicit-submission list.
- `vite.config.js` + `scripts/apply-deploy-env.mjs`: api.html is a fourth rollup input and a secondary page (env meta, canonical, sitemap entry handled by the existing mechanism).

External corpus round 2 on the honesty page: the real-world denominator nearly doubles.

### Changed

- `/honesty.html` external section now covers **19 documents from 16 public repos** (round 2 adds openai-agents-python/-js, pydantic-ai, assistant-ui, ruff, biome, logfire, Infisical/agent-vault): **0 convert, 16 split_first, 3 keep_markdown**, deltas −2.8% to −86.9%, `safe_to_auto_apply` on none. Notable receipts: ruff's AGENTS.md at −2.8% with `duplicate_rule` ×7 (closest any real doc came to parity, still loses), openai-agents-python `duplicate_rule` ×4 at −78%.
- New pointer-pattern paragraph: 8 pointer files recorded across the corpus (CLAUDE.md → AGENTS.md in ruff/pydantic-ai/assistant-ui/openai; logfire routed the other way; biome → CONTRIBUTING.md) — the ecosystem's leading repos have already split their agent context, which is what the corpus's dominant `split_first` verdict recommends. Skill-pack ecosystems are measured in a separate lane in the doc2toon repo and never merged into this denominator.
- Homepage link, README, and `llms.txt` counts updated: 38 documents measured, one convert verdict.

## 0.2.4 - 2026-06-11

The honesty benchmark gets an out-of-sample section: real agent docs from public repos.

### Added

- `/honesty.html` "External corpus" section: 10 agent docs from 8 public repos (github/spec-kit, browser-use, langchain py+js, langflow, OpenHands, litellm, uv — 17.8k–149k stars, MIT or MIT-with-carveout verified at the pin, commit-pinned before measurement, thresholds frozen in advance). Result: 0 convert, 9 split_first, 1 keep_markdown; measured deltas −10.5% to −86.4%; `safe_to_auto_apply` on none. Published as measurements with attribution — no third-party file bodies. Two pointer files recorded but not counted. Reproduction: `scripts/benchmark-external.mjs` in the doc2toon repo (fetches at pinned SHAs).
- The internal corpus's provenance is now stated on the page (original content describing fictional projects, written by the team) — the external section exists precisely to remove that objection.

### Changed

- Homepage honesty link, README, and `llms.txt` now cite both corpora separately: 1 convert on 19 internal documents, 0 on 10 public documents.

## 0.2.3 - 2026-06-11

The web verdict now comes from the frozen contract: CLI and web share the Verdict v1 engine. (Upcoming Action/MCP/serve surfaces must consume the same contract.)

### Added

- "Copy summary" button (`#copy-summary-button`): copies a plain-text rendering of the Verdict v1 object built from the schema's own field names — verdict, safe_to_auto_apply, profile, measured_chars, token_estimates, warning codes, mode, and a "Run yours" link. The summary never includes the document body or the TOON output, so it is safe to paste into issues, chats, and posts.
- `/honesty.html` — the first honesty post: TOON earns `convert` on 1 of the 19 benchmark documents; realistic agent docs measure −37.8% to −62.1% and verdict `keep_markdown`/`split_first`. Every number reproduces from `doc2toon` (`scripts/benchmark-honesty.mjs` / `docs/calibration-v1.md`). Linked from the homepage honesty section and footer; added to the sitemap (`apply-deploy-env.mjs` now handles a secondary-pages list).

### Changed

- The verdict is now computed by `runVerdict` from `doc2toon@^0.3.0` — the frozen Verdict v1 contract — instead of a local derivation in `src/main.js`. The web app renders the engine's decision and never re-derives it, so the web verdict equals the CLI `--json` verdict for the same input. User-visible behavior on the built-in samples is unchanged (verified flip-free during calibration and re-verified in this release).
- Warning cards render the contract's coded warnings (`duplicate_rule`, `vague_rule`, `long_section`, `split_candidate`, plus conversion-state codes such as `low_coverage`, `lossy_applied`, `negative_savings`). Unknown codes render generically — the code set is open by contract.
- `llms.txt` updated: programmatic guidance now points at `doc2toon profile --json` / `runVerdict`, and the `#copy-summary-button` contract is documented.

## 0.2.2 - 2026-06-10

First-party sign-in form; the Identity widget iframe is gone.

### Added

- In-page sign-in dialog (`#auth-dialog`, a native `<dialog>`) with sign in, sign up, forgot-password, set-new-password, and confirmation-sent views, themed with the site tokens. Built on `@netlify/identity`, the library Netlify recommends for new Identity work. Netlify Identity still owns credentials; app code hands email/password straight to the library and never stores them.
- Confirmation (`#confirmation_token`), recovery (`#recovery_token`), and invite (`#invite_token`) links are processed on page load via `handleAuthCallback()`; recovery opens the set-new-password view, invites open a choose-password view.
- `llms.txt` agent interface updated: the iframe caveat is removed and the dialog's stable element ids and `data-view` states are documented — agents can now reach the sign-in form by ordinary DOM references.

### Changed

- Quota Bearer-token wiring: the access token now comes from the `@netlify/identity` session (the library's `nf_jwt` cookie hand-off, refreshed via `refreshSession()` near expiry). `netlify/functions/usage.mjs` is unchanged — the library issues the same Netlify Identity JWTs the widget did, so `context.clientContext.user` validation continues to apply.
- Privacy page discloses the essential first-party sign-in cookies (`nf_jwt`, `nf_refresh`) that `@netlify/identity` sets to keep a session — the widget kept the session only in local storage, so this is a new storage location and is disclosed per the page's promise. Still no advertising or analytics cookies. "Last updated" line bumped to v0.2.2.
- `netlify-identity-widget` dependency removed.

## 0.2.1 - 2026-06-10

Aggregate daily usage counters, disclosed on the privacy page in the same release.

### Added

- Site-wide aggregate daily metrics in the existing `cheapagent-usage` Blobs store (`metrics/daily/YYYY-MM-DD`): quota checks, unique signed-in users, unique converters, new usage profiles, debit attempts/allowed/blocked/503s, and characters debited. PII-free integer totals only — no user ids, no per-user history, no document data, no client-side events. Writes are production-gated (`CONTEXT === "production"`), non-blocking and time-boxed (~1s), use the same compare-and-swap pattern as the quota counter (retry only on `modified:false`; thrown errors abort so failures undercount, never double-apply), and metric blobs older than ~400 days are pruned on the first write of each new day.
- Privacy page: new "Site-wide daily totals" section disclosing the aggregate counters, the low-traffic identifiability caveat, the ~400-day retention cap, and a defined deletion rule (on request, daily totals counting fewer than three accounts are zeroed). "Last updated" line bumped to v0.2.1.
- `new_usage_profiles` counts first CheapAgent usage-profile creation in Blobs, not Identity signups — signups remain visible in the Netlify Identity dashboard by design.

### Changed

- README dependency story updated to the published npm package (`doc2toon@^0.2.0`); stale "not published to npm yet" git-pin instructions removed. Lockfile resolves doc2toon 0.2.1 (engine code identical).
- `llms.txt`: replaced "evidence-style receipts" with the v0.2 verdict/measured-delta/advisory-warnings language; noted the server-side aggregate totals in the current posture.

### Not in this release

- Anonymous usage measurement, traffic sources, funnels, retention cohorts — excluded by design; the privacy promises forbid them.
- Identity signup/login event hooks (kept off the signup critical path); admin metrics endpoint (read via the Netlify dashboard or CLI until friction is demonstrated).

## 0.2.0 - 2026-06-10

Beta release: lightweight sign-in and a server-enforced daily allowance.

### Added

- Sign-in via Netlify Identity (email with confirmation). Identity owns credentials; app code never handles passwords.
- 15000-characters-per-day allowance for signed-in users, enforced by a new Netlify Function (`netlify/functions/usage.mjs`) that debits character counts against a per-user daily counter in Netlify Blobs. Only counts are transmitted; document bodies never leave the browser.
- Minimal shadow profile per user: id, email, plan, today's usage counters, created/last-seen timestamps. Previous days' counters are discarded on each request.
- Plain-language privacy page at `/privacy.html`, linked from the footer and included in the sitemap.
- Storage-consent banner on first visit (`src/consent.js`), shown on both pages: "Allow all" or "Essential only". CheapAgent sets no advertising or analytics cookies; the choice governs optional storage (theme preference). Choosing essential-only clears and disables theme persistence. A "Cookie preferences" footer link reopens the choice.
- Account chip in the nav with email and sign-out; live "characters left today" readout next to the input counter.
- Vite multi-page build (`vite.config.js`) covering the privacy page.
- Agent interface contract in `llms.txt`: stable DOM ids for the workbench, auth, quota, and consent controls; guidance that programmatic conversion should use the doc2toon CLI/library rather than driving the web UI; a documented caveat that the sign-in dialog lives in the Identity widget's iframe. Live regions (`aria-live`/`role="status"`) added to the verdict card, status badge, quota readout, and notice line so assistive tech and agents get state changes pushed.

### Changed

- Anonymous flow is unchanged in behavior (local-only, 1000-character limit) but messaging now points to sign-in for the larger daily allowance.
- Character limits are dynamic: 1000 anonymous, 15000 per run for signed-in users, bounded by the remaining daily allowance at debit time.
- If the usage service is unreachable, signed-in users fall back to the anonymous limit instead of being blocked outright.
- `scripts/apply-deploy-env.mjs` now applies environment metadata to the privacy page, adds it to the sitemap, and works on Windows (file-URL path handling).
- Footer and claims-boundary copy updated from v0.1 alpha to v0.2 beta.
- Adopted the staging-lane ("drive aesthetic") copy and design across the landing page: new three-line hero ("Cut context bloat. Optimize token budgets. Improve agentic outputs."), verdict-driven workbench ("To TOONify or not?" with a yes/no verdict card, "Run check", "Bloat warnings"), three-pillar engine section, static before/after TOON examples, scroll-reveal animations, and the "Different output. Same task. Less waste." footer.
- Workbench starts empty with a placeholder; Load sample no longer auto-runs and Reset clears the input. Mode tabs gained arrow-key navigation. The per-run `maxlength` attribute was dropped in favor of the dynamic JS limit so signed-in users can paste beyond 1,000 characters.
- `llms.txt` updated from v0.1-alpha to v0.2-beta posture, including the sign-in allowance and privacy page.
- Usage debits are now atomic: the function reads the profile with its ETag, writes with a compare-and-swap (`onlyIfMatch`/`onlyIfNew`), and retries on conflict. Concurrent conversions can no longer double-spend or overwrite the daily counter. Sustained contention returns 503, which the client already treats as "fall back to the anonymous limit". (Reads stay eventually consistent: strong-consistency reads are not available to lambda-compat functions and threw at request time; the conditional write is what enforces correctness.)

- Dependency source swap: `doc2toon` now comes from the npm registry (`^0.2.0`, published with provenance) instead of the git-pinned commit. Engine code is identical; only the supply chain changed.

### Not in this release

- Billing, paid tiers, multi-file uploads, DOCX/PDF support (see the doc2toon roadmap v0.3 lane).
- Magic-link sign-in: Netlify Identity does not support passwordless magic links, so the beta uses Identity's email confirmation + password flow.

## 0.1.0 - 2026-06-02

Initial controlled alpha: browser-side workbench with paste/upload, four modes, measured before/after stats, optimizer warnings, copy/download, theme toggle, and the anonymous 1000-character limit.
