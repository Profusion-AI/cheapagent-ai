// Hosted Context API — pre-gate 501 stub (30-day plan Phase 5 spike + Phase 6).
//
// This edge function intercepts /v1/* so the hosted API namespace answers a
// real, documented response over TLS BEFORE any hosted execution exists. It
// proves DNS / SSL / routing and that the API-key header contract will not
// break real beta keys later — nothing more. There is deliberately:
//   - no doc2toon execution (the engine is Node ESM; this is a Deno edge fn),
//   - no Blobs access and no metrics (the stub stores and counts nothing),
//   - no key lookup (only the key *shape* is checked, per key-issuance-design.md).
//
// It is intentionally host-agnostic: bound to /v1/* it answers on every host
// the site serves, which realizes the plan's default (the api.cheapagent.ai
// alias answers once attached) AND fallback-2 (cheapagent.ai/v1/* answers) at
// the same time, and lets the routing proof be verified on the apex today —
// before the DNS alias + SSL re-provision land. Because it intercepts ahead of
// the SPA history fallback, /v1/* never serves the single-page-app shell on any
// host (the leak the Phase 5 spike was written to rule out).
//
// Phase 7 (contingent, gate-pass only) swaps this for a lambda-compat Node
// function that imports doc2toon's transport-free handlers; the key-shape
// contract below is exactly what those real keys satisfy, so the swap is
// path-by-path with no client-visible contract change. See key-issuance-design.md.

// The shape the issuance design freezes ("What the Phase 6 stub needs"). 32
// random base62 bytes behind a self-describing prefix; the stub validates shape
// only, never the value.
const KEY_SHAPE = /^ca_(live|test)_[A-Za-z0-9]{32,}$/;

// Always point at the canonical apex page: the api.cheapagent.ai alias only
// serves /v1/*, so the docs + early-access links live on cheapagent.ai/api.html.
const DOCS_URL = "https://cheapagent.ai/api.html";
const EARLY_ACCESS_URL = "https://cheapagent.ai/api.html#waitlist";

// Spec-only routes (OpenAPI x-status: planned). In the stub everything is 501;
// surfacing the distinction makes the response a faithful preview of Phase 7,
// where profile/convert/validate/plan become 200 and these two stay 501.
const PLANNED_ROUTES = new Set(["estimate", "batch"]);

function jsonResponse(status, body) {
  return new Response(`${JSON.stringify(body, null, 2)}\n`, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// Accept the same two carriers the real verifier will (Authorization: Bearer …
// or x-api-key), so stub-era clients and beta keys present identically.
function presentedKey(request) {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = /^Bearer\s+(.+)$/i.exec(auth);
  if (bearer) return bearer[1].trim();
  const apiKey = request.headers.get("x-api-key");
  return apiKey ? apiKey.trim() : "";
}

export default async (request) => {
  const { pathname } = new URL(request.url);
  // /v1/<route>[/...] — tolerate a trailing slash or deeper sub-path.
  const route = pathname.replace(/^\/v1\/?/, "").split("/")[0] || "";

  // Auth-shape gate first: a missing or malformed key is a 401 on every route,
  // including the spec-only ones. Both envelopes carry the same pointer fields
  // so any /v1 probe — keyed or not — returns the early-access pointer.
  const key = presentedKey(request);
  if (!KEY_SHAPE.test(key)) {
    return jsonResponse(401, {
      error: {
        code: "invalid_key",
        message:
          "Missing or malformed API key. The hosted Context API is in early access; " +
          "no keys are issued yet. doc2toon runs locally today via MCP, `doc2toon serve`, and the CLI.",
      },
      docs_url: DOCS_URL,
      early_access_url: EARLY_ACCESS_URL,
    });
  }

  // Key-shaped header: the contract is recognized, the hosted transport is not
  // live. Spec-only routes say so explicitly (they stay 501 even after launch).
  const planned = PLANNED_ROUTES.has(route);
  return jsonResponse(501, {
    error: {
      code: "not_implemented",
      message: planned
        ? `/v1/${route} is spec-only (x-status: planned) and is not implemented in the hosted API.`
        : "The hosted Context API is not available yet — it launches when early-access demand justifies " +
          "running it properly. The identical /v1 contract already runs locally via MCP, `doc2toon serve`, " +
          "and the CLI, where document bodies never leave your machine.",
    },
    route: route || null,
    docs_url: DOCS_URL,
    early_access_url: EARLY_ACCESS_URL,
  });
};
