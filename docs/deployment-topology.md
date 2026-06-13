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

## Development Approach

Use this lane model once the two-site split exists:

```text
feature branch -> PR/deploy preview -> staging branch -> cheapagent.netlify.app -> main -> cheapagent.ai
```

Operating rules:

- Feature branches should use Netlify deploy previews for UI review and browser smoke.
- `staging` is the integration lane for Claude/Codex/frontend work in progress.
- `main` is production and should only receive work after the staging build passes the verification gates below.
- The staging Netlify site should have production branch `staging`.
- The production Netlify site should have production branch `main`.
- Do not move `cheapagent.ai` / `www.cheapagent.ai` unless the target production site already has a successful deploy.

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

The build now consumes these variables after Vite finishes. Production output is indexable by default. Staging and deploy-preview output emits:

- `<meta name="robots" content="noindex, nofollow">`
- `robots.txt` with `Disallow: /`
- an empty sitemap
- a generated `_headers` file with `X-Robots-Tag: noindex, nofollow`

This lets the same source tree build differently per Netlify site without keeping separate production and staging source files.

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

## Hosted API subdomain — `api.cheapagent.ai` (Phase 5 spike, 2026-06-13)

The 30-day plan's risk #5 is DNS/SSL/routing for the hosted API namespace. This section records the spike decision so it is an amendment, not drift.

**Decision: same-site alias, host-agnostic `/v1/*` edge stub.** No second site.

- The `/v1/*` namespace is served by an edge function (`netlify/edge-functions/api-v1.mjs`, bound via `[[edge_functions]]` in `netlify.toml`). It answers the pre-gate stub: missing/malformed key → `401`, key-shaped header (`^ca_(live|test)_[A-Za-z0-9]{32,}$`) → `501`, both with `docs_url` + `early_access_url`. It executes nothing, reads no Blobs, and counts nothing — it proves DNS/SSL/routing and the key-header contract only.
- The function is **deliberately not host-matched in code.** Bound to the path `/v1/*`, it answers on every host the site serves. That single choice realizes two plan options at once:
  - **Default (same-site alias):** when `api.cheapagent.ai` is attached as a domain alias on the existing `cheapagent` site, `https://api.cheapagent.ai/v1/*` is answered by this function. Because the function intercepts before the SPA history fallback, the alias **never serves the single-page-app shell** — the leak the spike was written to rule out.
  - **Fallback 2 (apex answers):** `https://cheapagent.ai/v1/*` answers the identical stub today, with no DNS change. The day-30 gate does not care which hostname answers, so the routing proof is already verifiable on the apex before any dashboard action.

### Operator step to light up the subdomain (Kyle, dashboard — optional, not gate-blocking)

The code needs **no change** to serve the subdomain; attaching it is a pure DNS/SSL operation:

1. On the `cheapagent` site (`52eefbb8-f8fd-43e5-8d9f-4c0cf9830eb7`), add domain alias `api.cheapagent.ai` (Netlify DNS already owns the zone — a Netlify-managed alias provisions the A/CNAME automatically).
2. Wait for SSL re-provision to cover `api.cheapagent.ai` (the production cert is requested for `cheapagent.ai` + `*.cheapagent.ai`; confirm the wildcard or add the host explicitly). Budget for the known edge-rebind/SSL-propagation friction.
3. Verify (browser UA, fresh — Prerender serves crawler UAs a stale cache):

   ```bash
   # no key → 401 pointer
   curl -sS https://api.cheapagent.ai/v1/profile | jq .
   # key-shaped header → 501 pointer
   curl -sS https://api.cheapagent.ai/v1/profile -H 'authorization: Bearer ca_live_0000000000000000000000000000000000' | jq .
   # spec-only route, key-shaped → 501 (planned)
   curl -sS https://api.cheapagent.ai/v1/estimate -H 'x-api-key: ca_live_0000000000000000000000000000000000' | jq .
   ```

   The same three commands against `https://cheapagent.ai/v1/...` already pass today.

   Two pre-launch consequences of the host-agnostic `/v1/*` binding, by design: the `401` on a keyless probe is a hosted-stub-only status (the engine-mirrored `openapi.yaml` models only the `501` early-access posture, not auth), and the documented `GET /v1/openapi.yaml` discovery route is also stubbed — callers fetch the published spec at the apex `https://cheapagent.ai/openapi.yaml` until the hosted server exists. Both resolve when Phase 7 replaces the stub.

If subdomain friction ever exceeds the spike's 1-day budget, **stop and ship the apex** (`cheapagent.ai/v1/*`, already live) — the subdomain defers to GA with no code or contract change.

### Phase 7 swap (contingent, gate-pass only)

When the day-30 gate passes, the edge stub is replaced **path-by-path** by a lambda-compat Node function (`netlify/functions/api-v1.mjs`) that imports doc2toon's transport-free `handleProfile/Convert/Validate/Plan`. The `/v1/*` binding and the `ca_(live|test)_…` header contract are unchanged — only the implemented routes flip `501 → 200`; `estimate`/`batch` stay `501`. Edge is wrong for that phase (doc2toon is Node ESM; edge runs Deno; edge/modern functions never receive `clientContext`), which is why verification was designed around an explicit Blobs key lookup rather than `clientContext.user` (see `key-issuance-design.md`).
