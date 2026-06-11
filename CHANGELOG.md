# Changelog

All notable changes to the CheapAgent app will be documented in this file.

## 0.2.3 - 2026-06-11

The web verdict now comes from the frozen contract; one engine, all surfaces.

### Added

- "Copy summary" button (`#copy-summary-button`): copies a plain-text rendering of the Verdict v1 object built from the schema's own field names — verdict, safe_to_auto_apply, profile, measured_chars, token_estimates, warning codes, mode, and a "Run yours" link. The summary never includes the document body or the TOON output, so it is safe to paste into issues, chats, and posts.

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
