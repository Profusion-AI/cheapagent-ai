# Hosted API privacy posture — draft (not yet a page)

**Status:** scaffold-track draft (30-day plan Phase 4.4, written 2026-06-12). This becomes a
public page only if the day-30 gate passes and the hosted beta activates (Phase 7). Drafting
it now is what makes the trust pivot deliberate instead of scrambled — the posture is decided
before the first hosted byte is accepted, not after.
**Companions:** `key-issuance-design.md` (metering inside this boundary), the live
`privacy.html` (the local-first promises this document must never contradict).

## The one-sentence posture

**The hosted API is the explicit, opt-in trust boundary: document bodies are processed in
memory and never stored by default; what we keep is metering arithmetic, not your documents.**

## The two-boundary model (what changes, what doesn't)

Every surface shipped through v0.4.0 — browser, CLI, GitHub Action, MCP server, `doc2toon
serve` — processes documents on the user's own machine. Nothing about those surfaces changes
if hosting launches. The hosted API is a **second, clearly labeled boundary** users choose
when they need conversion off-machine (CI at scale, no-local-install, private-repo
workflows). Choosing it means: your document body transits TLS to our function and exists in
function memory for the life of the request.

## Commitments (the page will state these verbatim)

1. **No document body storage by default.** Request bodies are processed in memory and
   discarded with the request. They are not written to Blobs, logs, analytics, or anywhere
   else. The verdict response is returned, not retained.
2. **What we do store per request:** the metering record — key hash, account `sub`, UTC day,
   characters processed, documents checked (see `key-issuance-design.md`). Integers and
   identifiers, never content, never per-document titles or excerpts.
3. **No training, no resale, no third-party processing of bodies.** The conversion runs the
   same open-source doc2toon engine published on npm; no model, vendor, or analytics pipeline
   sees request content.
4. **Opt-in report history is exactly that — opt-in, and out of beta scope.** If a saved-
   reports feature ever ships, it stores *verdict objects* (the same JSON the API returned,
   `toon_candidate` included only by explicit per-request flag), it is off by default, and it
   gets its own dated privacy-page amendment before launch. The beta makes no storage promises
   it doesn't need.
5. **Logs.** Function logs carry status codes, timing, key *hashes*, and error envelopes —
   never request bodies. Netlify's platform-level request logging (IP, user agent, path) is
   disclosed as the hosting substrate's behavior, same as the existing site disclosure.
6. **Deletion.** Delete the account (existing Identity path) → key records are revoked and
   metering records age out with the same ~400-day aggregate retention already disclosed for
   the web. There are no document bodies to delete — that is the point.
7. **Change discipline.** Any change to this posture is a dated amendment on the privacy page
   plus a CHANGELOG entry **before** the change takes effect — the same binding
   change-disclosure promise privacy.html already makes for the web app.

## Honest tensions, written down now

- **"In memory" includes transit:** bodies cross TLS and live in a Netlify Function's memory.
  Users for whom that is unacceptable keep using the local surfaces — and the marketing copy
  will keep saying so ("local-first is not the demo; it's the product").
- **Metering metadata is identifying at the account level.** Characters-per-day per key is
  usage telemetry by any honest reading; it is disclosed as the price of metered hosting, and
  it is the *only* telemetry.
- **Platform substrate:** we inherit Netlify's edge/function logging behavior; the page links
  Netlify's own privacy documentation rather than pretending we operate the substrate.

## What this draft blocks until launch

No hosted endpoint accepts a document body until: this draft is published as a page, the
401/501 stub behavior is replaced deliberately (Phase 7 wiring), and the early-access page
links the posture. The Phase 6 stub never receives bodies it could mishandle — it answers
before reading them.
