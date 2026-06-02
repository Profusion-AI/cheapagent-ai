# CheapAgent Deployment Topology

## Target Model

Use two Netlify sites, not one site with two domains:

- Production: serves `https://cheapagent.ai/` and `https://www.cheapagent.ai/`.
- Staging: serves a Netlify app domain such as `https://cheapagent.netlify.app/`.

Netlify's default app domain mirrors the production deploy of the same Netlify site. That means `cheapagent.netlify.app` cannot be staging while `cheapagent.ai` is production if both domains remain attached to the same site.

## Current State

As of 2026-06-02, the `cheapagent` Netlify site is production:

- Site id: `52eefbb8-f8fd-43e5-8d9f-4c0cf9830eb7`
- Default domain: `cheapagent.netlify.app`
- Custom domain: `cheapagent.ai`
- Domain alias: `www.cheapagent.ai`
- Production branch: `main`
- Build command: `npm run build`
- Publish directory: `dist`

Because those domains are on the same site, both `cheapagent.ai` and `cheapagent.netlify.app` currently serve the same production deploy.

## Recommended Migration

If `cheapagent.netlify.app` must become staging, keep the current `cheapagent` site as staging and create a separate production site:

1. Create a new Netlify site, for example `cheapagent-live`.
2. Connect it to `Profusion-AI/cheapagent-ai`.
3. Set production branch to `main`.
4. Set build command to `npm run build`.
5. Set publish directory to `dist`.
6. Deploy and verify the new production site on its Netlify preview URL.
7. Move `cheapagent.ai` and `www.cheapagent.ai` from the current `cheapagent` site to the new production site.
8. Provision SSL on the new production site.
9. Verify `https://cheapagent.ai/` returns the intended app and `https://www.cheapagent.ai/` redirects to apex.
10. Leave the original `cheapagent` site on `cheapagent.netlify.app` as staging.

Do not detach or move the custom domain until the new production site has a successful deploy ready.

## Branch Discipline

- `main`: production source. Pushing `main` deploys production.
- `staging`: staging source. Pushing `staging` deploys staging.
- Pull requests: use Netlify deploy previews for review.

If the staging site tracks a branch, set its production branch to `staging`. If the staging site should mirror `main` after approved releases, keep its production branch on `main` and deploy staging manually before moving production.

## Environment Labels

Set these per Netlify site, not in source control:

Production site:

```text
VITE_CHEAPAGENT_ENV=production
VITE_CHEAPAGENT_CANONICAL_URL=https://cheapagent.ai
```

Staging site:

```text
VITE_CHEAPAGENT_ENV=staging
VITE_CHEAPAGENT_CANONICAL_URL=https://cheapagent.netlify.app
VITE_CHEAPAGENT_NOINDEX=true
```

The current app does not require these variables to build. They are reserved for future environment-specific UI, analytics, and robots behavior.

## Verification Gates

Before promoting a deploy to production:

```bash
npm ci
npm run build
npm run preview
```

Then verify:

- `doc2toon/browser` import succeeds.
- Sample measurement produces TOON output.
- Copy and download controls enable after conversion.
- Desktop and mobile layouts have no horizontal overflow.
- No hosted LLM API call is made by the page.
- Headers include `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- Production does not send `X-Robots-Tag: noindex`.
- Production SSL certificate covers `cheapagent.ai` and `*.cheapagent.ai`.

## Safer Alternative

If the exact `cheapagent.netlify.app` staging URL is not mandatory, keep the current production site as-is and use a branch deploy URL for staging:

```text
https://staging--cheapagent.netlify.app/
```

That avoids moving the production custom domain. The tradeoff is that the staging URL includes the branch prefix.
