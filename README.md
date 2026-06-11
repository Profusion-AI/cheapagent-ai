# CheapAgent AI

CheapAgent is an early browser-side workbench for measuring and converting agent-context documents with `doc2toon`.

The app processes pasted or uploaded `.md` / `.txt` content in the browser, reports measured character and token deltas, surfaces the contract's coded warnings, and emits TOON output for review. Since v0.2.3 the verdict is computed by the engine's frozen Verdict v1 contract (`runVerdict` from `doc2toon@^0.3.0`) — the web renders the same decision the CLI's `--json` returns for the same input. It does not call a hosted LLM API or store document bodies server-side.

Measured results across the benchmark corpora are published at [`/honesty.html`](https://cheapagent.ai/honesty.html): TOON earns a `convert` verdict on 1 of 19 internal test documents and 0 of 19 real agent docs from public repos (commit-pinned, MIT-licensed sources including the OpenAI Agents SDKs, ruff, biome, and pydantic-ai) — and the page says so.

## Status

- Version: `0.2.3` beta
- Deployment target: `https://cheapagent.ai/`
- Hosting target: Netlify static site plus one Netlify Function for usage accounting
- Indexing posture: production is indexable; staging should remain noindex through a separate Netlify site or branch-specific configuration

## v0.2 Beta: Sign-in and Daily Allowance

- Anonymous use is unchanged: fully local, 1000-character limit, no network requests with content or counts.
- Netlify Identity owns credentials (email sign-up with confirmation). CheapAgent code never stores a password; since v0.2.2 the sign-in form is a first-party in-page dialog built on `@netlify/identity` (the widget iframe is gone), and email/password go straight to the library.
- Signed-in users get 15000 characters per day, enforced server-side by `netlify/functions/usage.mjs`: before each conversion the browser sends only the character count to debit; the document body never leaves the page.
- Stored account data is minimal: user id, email, plan, today's character/conversion counters, created/last-seen timestamps. Counters from previous days are discarded. Storage lives in Netlify Blobs (`cheapagent-usage` store).
- Since v0.2.1 the usage function also records site-wide aggregate daily totals (`metrics/daily/YYYY-MM-DD` in the same store): PII-free integer counters of signed-in activity, production-gated, non-blocking, pruned after ~400 days, and disclosed on the privacy page. Anonymous use still makes no network requests.
- Plain-language privacy page at `/privacy.html`.
- No billing in v0.2.

Site setup: enable Identity on the Netlify site (registration: open or invite-only as preferred; email confirmation on). No extra environment variables are required for Blobs or the function.

## Dependency Boundary

CheapAgent consumes the engine through the public npm package boundary:

```js
import { runVerdict } from "doc2toon/browser";
```

`runVerdict` returns the frozen Verdict v1 wire object (`schemas/verdict.v1.json` in the doc2toon package); the app renders that decision and never re-derives a verdict locally. The app depends on the published registry package:

```json
"doc2toon": "^0.3.0"
```

[`doc2toon`](https://www.npmjs.com/package/doc2toon) is published to npm with provenance from the engine repo's tag-triggered workflow. CheapAgent must not reach into private source paths, sibling repos, or built distribution files outside the package boundary.

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
