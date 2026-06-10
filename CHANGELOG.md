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

### Not in this release

- Billing, paid tiers, multi-file uploads, DOCX/PDF support (see the doc2toon roadmap v0.3 lane).
- Magic-link sign-in: Netlify Identity does not support passwordless magic links, so the beta uses Identity's email confirmation + password flow.

## 0.1.0 - 2026-06-02

Initial controlled alpha: browser-side workbench with paste/upload, four modes, measured before/after stats, optimizer warnings, copy/download, theme toggle, and the anonymous 1000-character limit.
