# AGENTS.md

Guidance for agents working in this repository (the cheapagent.ai web app). The engine lives in a separate repo: [Profusion-AI/doc2toon](https://github.com/Profusion-AI/doc2toon).

## Deployment model — read this first

- Netlify deploys `main` on every merge. There is no staging site: a merged commit is production within minutes.
- Verify before merging, not after: `npm run build`, then `npm run preview` (port 4174) and exercise the workbench.
- `npm run build` also runs `scripts/apply-deploy-env.mjs` (env meta, canonical URLs, sitemap). Don't hand-edit its outputs in `dist/`.
- Netlify extensions in play (state verified 2026-06-12; details in `docs/analytics-decision.md` + `docs/kyle-decision-analytics-2026-06-12.md`): **Prerender is ACTIVE and kept** (agent-discoverability) — crawler/AI user-agents get a cached pre-rendered page copy (`X-Prerendered: true`, up to ~3 days stale), so verify production with a browser UA. **Baseline and Simple Analytics are installed at team level but NOT capturing** (verified inert: no script served, no env vars). Anonymous analytics is **Netlify Web Analytics, server-side** (server-log derived, no script, no cookies; Free tier). Do NOT wire in Simple Analytics — its client-side beacon would break the no-analytics-JS promise. Any change to the analytics posture requires same-release privacy.html/llms.txt/CHANGELOG work per the decision docs (`docs/kyle-decision-analytics-2026-06-12.md`).

## Binding constraints

- **Privacy promises are product brand.** No client-side analytics JS, no cookies for tracking, no passive telemetry. Every counted signal is an explicit, disclosed user action. Document bodies never leave the browser on the default path. New counters require a privacy.html disclosure shipped in the same release (privacy.html's own change-disclosure promise makes this binding).
- **`public/llms.txt` is a contract.** The DOM ids it documents are stable within v0.2.x; changes are additive only. Update llms.txt in the same change that touches any documented element.
- **The verdict is the engine's.** Verdicts and context plans come from `doc2toon/browser` (`runVerdict`, `buildContextPlan`). The web app renders engine decisions and never re-derives them — web output must equal CLI `--json` output for the same input.
- **Public numbers must be executed, not paraphrased.** Any command or measurement published on a page (honesty.html especially) is run verbatim against the released surface before it ships.
- Every release gets a `CHANGELOG.md` entry and a `package.json` version bump.

## Layout

- `index.html` + `src/main.js` — the workbench (verdict card, plan table, quota, auth).
- `src/auth.js`, `src/consent.js` — Netlify Identity sign-in and the storage-consent banner.
- `honesty.html`, `api.html`, `privacy.html` — secondary pages, each a rollup input in `vite.config.js`.
- `netlify/functions/` — `usage.mjs` (quota + disclosed aggregate metrics), `feedback.mjs`, `go.mjs` (intent counters), `lib/metrics.mjs`.
- `scripts/gate-readout.mjs` + `docs/gate-tally.md` — day-30 gate instrumentation; don't break the counters it reads.
- `docs/` — design decisions and handoffs; the 30-day plan of record lives outside the repo.

## Commands

```bash
npm install
npm run build      # vite build + deploy-env script; also the lint gate
npm run dev        # vite dev server on 127.0.0.1:5174
npm run preview    # serves dist/ on 127.0.0.1:4174
```
