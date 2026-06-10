# Changelog

All notable changes to the CheapAgent app will be documented in this file.

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

### Not in this release

- Billing, paid tiers, multi-file uploads, DOCX/PDF support (see the doc2toon roadmap v0.3 lane).
- Magic-link sign-in: Netlify Identity does not support passwordless magic links, so the beta uses Identity's email confirmation + password flow.

## 0.1.0 - 2026-06-02

Initial controlled alpha: browser-side workbench with paste/upload, four modes, measured before/after stats, optimizer warnings, copy/download, theme toggle, and the anonymous 1000-character limit.
