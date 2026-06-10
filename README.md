# CheapAgent AI

CheapAgent is an early browser-side workbench for measuring and converting agent-context documents with `doc2toon`.

The app processes pasted or uploaded `.md` / `.txt` content in the browser, reports measured character and token deltas, surfaces optimizer warnings, and emits TOON output for review. It does not call a hosted LLM API or store document bodies server-side.

## Status

- Version: `0.2.0` beta
- Deployment target: `https://cheapagent.ai/`
- Hosting target: Netlify static site plus one Netlify Function for usage accounting
- Indexing posture: production is indexable; staging should remain noindex through a separate Netlify site or branch-specific configuration

## v0.2 Beta: Sign-in and Daily Allowance

- Anonymous use is unchanged: fully local, 1000-character limit, no network requests with content or counts.
- Netlify Identity owns credentials (email sign-up with confirmation). CheapAgent code never sees a password.
- Signed-in users get 15000 characters per day, enforced server-side by `netlify/functions/usage.mjs`: before each conversion the browser sends only the character count to debit; the document body never leaves the page.
- Stored account data is minimal: user id, email, plan, today's character/conversion counters, created/last-seen timestamps. Counters from previous days are discarded. Storage lives in Netlify Blobs (`cheapagent-usage` store).
- Plain-language privacy page at `/privacy.html`.
- No billing in v0.2.

Site setup: enable Identity on the Netlify site (registration: open or invite-only as preferred; email confirmation on). No extra environment variables are required for Blobs or the function.

## Dependency Boundary

CheapAgent depends on the public package boundary:

```js
import { convertTextToToon } from "doc2toon/browser";
```

`doc2toon` is not published to npm yet, so this repo temporarily depends on an immutable packaging commit:

```json
"doc2toon": "git+https://github.com/Profusion-AI/doc2toon.git#1492f12343623ada7159c6d90ddae5646e019382"
```

When `doc2toon` is published (the v0.2.0 tag workflow publishes it), replace that dependency with the npm version:

```bash
npm install doc2toon@^0.2.0
```

The pinned commit and doc2toon 0.2.0 have identical library code, so the swap is a dependency-source change only.

## Local Development

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Netlify

Recommended project settings:

- Build command: `npm run build`
- Publish directory: `dist`
- Production branch: `main`
- Node version: `20` or newer

The domain DNS is managed through Netlify DNS. The final site/domain/SSL binding happens in Netlify, not in this repository.

The build runs `scripts/apply-deploy-env.mjs` after Vite to generate environment-specific canonical, robots, sitemap, and noindex header artifacts. For the two-site model, set these Netlify environment variables per site:

```text
# Production
VITE_CHEAPAGENT_ENV=production
VITE_CHEAPAGENT_CANONICAL_URL=https://cheapagent.ai
VITE_CHEAPAGENT_NOINDEX=false

# Staging
VITE_CHEAPAGENT_ENV=staging
VITE_CHEAPAGENT_CANONICAL_URL=https://cheapagent.netlify.app
VITE_CHEAPAGENT_NOINDEX=true
```

See [docs/deployment-topology.md](docs/deployment-topology.md) for the staging/production model. The short version: `cheapagent.netlify.app` can be staging only if staging and production are separate Netlify sites; on a single Netlify site, the default Netlify domain mirrors the production custom domain.

## Claims Boundary

Savings are measured per input and are not guaranteed. CheapAgent v0.2 is not a compliance system, storage service, hosted LLM workflow, or proof of production-scale reliability.
