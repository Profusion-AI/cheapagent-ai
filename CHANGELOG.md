# Changelog

All notable changes to the CheapAgent app will be documented in this file.

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
