# Hosted API key issuance — design (NOT implementation)

**Status:** scaffold-track design document (30-day plan Phase 4.4, written 2026-06-12). Nothing
here is built before the day-30 gate passes; Phase 7 (days 31–45, contingent) implements this
minimally. Writing it now is what lets the 501 stub check key *shape* in Phase 6 without
breaking real beta keys later.
**Companions:** `hosted-privacy-posture.md` (the trust boundary this metering lives inside),
`deployment-topology.md` (where the endpoints answer), doc2toon `openapi/cheapagent.v1.yaml`
(the contract the keys gate).

## What exists today (the seams this design builds on)

- **Identity:** Netlify Identity owns credentials (`v0.2-checkpoint-handoff.md`); every account
  has a stable `sub`. The web's quota function (`netlify/functions/usage.mjs`) trusts
  `context.clientContext.user` — which **only lambda-compat functions receive**.
- **Usage state:** `cheapagent-usage` Blobs store, `users/{sub}` records with CAS writes
  (`onlyIfMatch`/`onlyIfNew`), eventual reads, per-day counters `{chars_used, conversions}`,
  plan field hardcoded `"free"`; `DAILY_CHAR_LIMIT = 15000` constant. Conversions are recorded
  but **not** limit-enforced today; chars are the enforced meter.
- **Engine:** doc2toon v0.4.0 exports transport-free `handleProfile/Convert/Validate/Plan` —
  the hosted function imports them verbatim; this document only adds the auth/metering shell.

## Key format

```
ca_live_<32 bytes base62>          e.g. ca_live_8fK...
ca_test_<32 bytes base62>          (issued only if a sandbox ever exists; not in beta scope)
```

- Prefix makes keys greppable in leaked-secret scanners (GitHub secret scanning can be
  registered for the `ca_live_` pattern when volume justifies it) and self-describing in
  support threads.
- 32 random bytes from `crypto.randomBytes` — no structure, no embedded user id, no checksum
  beyond the prefix. The key IS the credential; everything else lives server-side.
- Shown **once** at issuance. Only a hash is stored (below), so "show me my key again" is a
  rotation, not a lookup.

## Storage model (Blobs, `cheapagent-usage` store)

```
keys/{sha256(key)}  →  {
  sub,                 // Netlify Identity user
  label,               // operator-entered, e.g. "CI – acme/monorepo"
  created_at,
  revoked_at: null,    // tombstone, never deleted (audit trail)
  last_used_at,        // coarse, day-granularity writes only (see contention)
}
```

- **Hashed-key → sub mapping:** lookup key is `sha256(presented key)` — a Blobs `get` on the
  hash. A plaintext key never lands in storage or logs. SHA-256 (not bcrypt/argon2) is correct
  here: the input is 32 random bytes, not a human password — brute force is infeasible and
  per-request KDF cost would be pure latency.
- One user MAY hold multiple keys (per-repo/per-CI labels); the beta cap is 5 per account,
  enforced at issuance time by listing `keys/` filtered on `sub` (acceptable at beta scale;
  an index blob `users/{sub}/keys` is the post-beta optimization).

## Verification path (the clientContext trap, avoided by design)

**Verification MUST NOT depend on `context.clientContext.user`.** That mechanism only exists
for lambda-compat functions fed a Netlify Identity JWT; **edge functions and modern Node
functions never receive it** (the seam flagged in the v0.2.2 changelog). API keys are not
Identity JWTs anyway. The verification path is self-contained:

1. Read `Authorization: Bearer ca_live_…` (or `x-api-key`) — header *shape* is what the
   Phase 6 stub validates (`^ca_(live|test)_[A-Za-z0-9]{32,}$`), so stub-era clients and real
   beta keys agree.
2. `sha256` the presented key → `keys/{hash}` Blobs lookup. Miss or `revoked_at` set → 401
   JSON envelope (`{"error":{"code":"invalid_key", ...}}`) pointing at the early-access page.
3. The record's `sub` selects the quota record. The Phase 7 function is a **lambda-compat Node
   function for engine reasons** (doc2toon is Node ESM; edge runs Deno) — but because this path
   never touches `clientContext`, the function flavor is swappable later without an auth
   rewrite. That is deliberate.

## Quota model (extends `users/{sub}`, decides the metering question NOW)

Billing meter per plan v2: **documents checked + input characters processed.** The existing
record already counts both per day; only chars are enforced. **Decision (made here, before any
pricing language publishes): hosted API keys hard-meter BOTH counters.** "Documents checked"
on an agent surface is the realistic abuse vector (10⁵ tiny profile calls is real load at zero
chars), and retrofitting a hard meter after pricing publishes is a broken promise.

```
users/{sub}  (existing record, additive fields only)
  plan: "free" | "pro" | "partner"
  limits: { daily_chars?: number, daily_documents?: number }   // absent → plan defaults
  daily: { [date]: { chars_used, conversions, api_documents, api_chars } }
```

- Web traffic and API traffic share the user's allowance but are counted in separate fields —
  one customer story ("your allowance"), auditable split.
- Plan defaults live in code; `limits.*` overrides per record (this is the same additive
  entitlement mechanism Phase 6 ships for the web Pro offer — one mechanism, two surfaces).
- Exhaustion → HTTP 429 with the JSON envelope and the UTC reset time. The web's
  drop-to-anonymous fallback has no API equivalent, deliberately: an agent must see a hard,
  parseable stop, not silent degradation.
- 503-on-contention behavior carries over from `usage.mjs` (the client-visible contract:
  retry).

## CAS contention under agent-paced load

The web's CAS loop (4 attempts on `users/{sub}`) is calibrated for human pacing. A CI matrix
or agent fleet hammering one key changes that:

- **Beta posture:** keep the single-record CAS, raise nothing. Hand-held 10–25 users; the
  503-after-4-conflicts behavior is observable in `debit_failures_503` metrics — that counter
  is the graduation signal, watched, not guessed.
- **First mitigation (sketched now so it's a patch, not a redesign):** per-key daily shards —
  `usage/{sub}/{date}/{key-hash-prefix}` accumulators, summed at read; one CI key contends
  only with itself.
- **Second:** token-bucket rate limit per key (N requests/min) in front of the meter, returning
  429 with `Retry-After` — protects the meter from pathological call rates independent of
  quota.
- **Graduation trigger (restated from the v0.2 handoff):** sustained CAS contention, billing
  commitments, or relational needs (key lists, audit queries, invoices) move usage state from
  Blobs to Supabase Postgres. Blobs-to-Supabase is an export script + cutover, not a schema
  redesign — the record shapes above are deliberately relational-friendly.

## Issuance / rotation / revocation (beta = manual, by design)

- **Issuance:** operator-run script (`scripts/issue-api-key.mjs`, Phase 7) — input: account
  email (must exist in Identity), label; output: the plaintext key printed once + the Blobs
  record written. No self-serve in beta; the waitlist is the queue and onboarding is the
  hand-held step plan v2 specifies.
- **Rotation:** issue new + revoke old as one operation; both keys logged to the manual tally
  doc. No grace-period dual-validity in beta (hand-held users coordinate the swap).
- **Revocation:** set `revoked_at` (tombstone, kept for audit); verification rejects on the
  next lookup. Eventual-consistency caveat: a revoked key may verify for a short propagation
  window on warm edges — acceptable for beta, documented to design partners; the Supabase
  graduation erases the caveat.
- **No key escrow:** lost key = rotation. We cannot display a stored key because we do not
  have it.

## What the Phase 6 stub needs from this document (the only pre-gate consumer)

The 501 stub checks the **shape** `^ca_(live|test)_[A-Za-z0-9]{32,}$`: missing/malformed key →
401 pointing at api.html; key-shaped header → 501. Both bodies use the published `Error` schema —
`{error: {code, message, docs_url, early_access_url}}` (pointer fields nested inside `error`, per
`openapi.yaml`), so the stub envelope and the spec agree and the Phase 7 swap changes nothing. No
Blobs lookup, no doc2toon execution — the stub proves DNS/SSL/routing and that the header
contract won't break real keys later. That is all it proves, on purpose.
