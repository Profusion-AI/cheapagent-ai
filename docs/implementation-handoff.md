# CheapAgent v0.1 Implementation Handoff

> Historical. Superseded by `docs/v0.2-checkpoint-handoff.md` (2026-06-10),
> which records the v0.2 checkpoint and the plan through v0.3.

## What This Repo Owns

`Profusion-AI/cheapagent-ai` is the hosted CheapAgent web app. It owns the Vite app, product UI, brand assets, Netlify configuration, and deployment surface for `https://cheapagent.ai/`.

`Profusion-AI/doc2toon` remains the conversion engine, browser package, CLI, and test suite.

## Current App

- Static Vite app.
- Imports `convertTextToToon` from `doc2toon/browser`.
- Browser-side document processing only.
- Anonymous input limit: 1000 characters.
- Supports pasted content and `.md` / `.txt` uploads.
- Modes:
  - Optimize `CLAUDE.md`
  - Optimize `AGENTS.md`
  - Optimize `SKILL.md`
  - Convert document to TOON
- Reports source/output chars and approximate tokens.
- Shows optimizer warnings for duplicate rules, vague rules, long sections, and split candidates.
- Supports copying and downloading TOON output.

## Visual Assets

Brand assets live in `public/assets/`:

- `cheapagent-logo-knockout.png`: current primary logo, favicon, and Open Graph image.
- `cheapagent1-1.png`: square visual/reference asset.
- `cheapagent1-1.svg`: vector source candidate.
- `cheapagent-brand.png`: tall brand/reference visual.

The page uses `cheapagent-logo-knockout.png` in the first viewport without blocking the workbench path.

## Temporary Dependency

`doc2toon` is not currently published to npm. This app temporarily uses an immutable packaging commit:

```json
"doc2toon": "git+https://github.com/Profusion-AI/doc2toon.git#1492f12343623ada7159c6d90ddae5646e019382"
```

Swap this to the npm package once available.

## Deployment Checklist

1. Run `npm install`.
2. Run `npm run build`.
3. Run `npm run preview`.
4. Verify the page renders on desktop and mobile.
5. Verify sample measurement runs without console import errors.
6. Verify output copy/download controls enable after a successful run.
7. Verify `public/assets/cheapagent-logo-knockout.png` renders and remains responsive.
8. Deploy with Netlify using build command `npm run build` and publish directory `dist`.
9. Bind `cheapagent.ai` and `www.cheapagent.ai` in Netlify and wait for SSL.

The production site is indexable. Staging should remain noindex through a separate Netlify site or branch-specific configuration.

For staging vs production site ownership, see `docs/deployment-topology.md`.
