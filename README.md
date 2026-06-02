# CheapAgent AI

CheapAgent is an early browser-side workbench for measuring and converting agent-context documents with `doc2toon`.

The v0.1 app processes pasted or uploaded `.md` / `.txt` content in the browser, reports measured character and token deltas, surfaces optimizer warnings, and emits TOON output for review. It does not call a hosted LLM API or store document bodies server-side.

## Status

- Version: `0.1.0` alpha
- Deployment target: `https://cheapagent.ai/`
- Hosting target: Netlify static site
- Indexing posture: production is indexable; staging should remain noindex through a separate Netlify site or branch-specific configuration

## Dependency Boundary

CheapAgent depends on the public package boundary:

```js
import { convertTextToToon } from "doc2toon/browser";
```

`doc2toon` is not published to npm yet, so this repo temporarily depends on an immutable packaging commit:

```json
"doc2toon": "git+https://github.com/Profusion-AI/doc2toon.git#1492f12343623ada7159c6d90ddae5646e019382"
```

When `doc2toon` is published, replace that dependency with the npm version, for example `^0.1.1`.

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

Savings are measured per input and are not guaranteed. CheapAgent v0.1 is not a compliance system, storage service, hosted LLM workflow, or proof of production-scale reliability.
