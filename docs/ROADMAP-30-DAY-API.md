# CheapAgent Context API: 30-Day Roadmap

This roadmap covers the next ~30 days. Phases are sequential. Each phase has an exit condition; do not start the next phase until the current one's exit condition is met. Dates are intentionally omitted — sequence is the commitment, not the calendar.

This plan supersedes the previous v0.3.0 scope. DOCX and PDF support are deferred (see Non-Goals). The paid hosted tier moves from "planned" to "the commercial center," delivered as API access rather than web-app convenience features.

## Positioning (fixed before any build or content work)

- Product name: **CheapAgent Context API**.
- Tagline: "Give your agents a context budget."
- Developer CTA: "Call CheapAgent before your agent calls the model."
- Lead with context decisions, not TOON. TOON is the inspectable implementation detail.
- No universal savings claims. Measured per input, always.

## Phase 1 — Foundation

Goal: the engine is a dependency, not a git pin, and the verdict is a schema, not UI copy.

- Publish `doc2toon` to npm. This is already in flight and blocks everything downstream; finish it first.
- Define the **verdict object schema** as a versioned contract: `verdict`, `profile`, measured sizes, token estimates, `toon_candidate`, typed `warnings` with severity, `safe_to_auto_apply`. This schema is the product. Treat changes to it like API breaking changes from day one.
- Extract verdict generation into the reusable core so the CLI, web app, and API all produce identical verdicts from identical input. One engine, three surfaces.
- Stand up the API service skeleton wrapping the npm core. No public access yet.

Exit condition: `doc2toon` installable from npm; verdict schema documented; API skeleton returns a valid verdict object locally.

## Phase 2 — API Surface

Goal: a stranger with an API key can get a verdict in under five minutes.

- Five endpoints, nothing more: `POST /v1/profile`, `/v1/convert`, `/v1/validate`, `/v1/estimate`, `/v1/batch`. `/v1/profile` is the flagship; build and document it first. `/v1/batch` may slip to Phase 6 if it threatens the launch.
- API key issuance and server-side metering. Reuse the v0.2 pattern: debit input characters processed, store no document bodies by default. The privacy posture from the web app carries over unchanged and becomes a selling point.
- OpenAPI spec published alongside the docs.
- Docs: one quickstart, one `curl` example, one TypeScript snippet, one error-handling section. Short and correct beats comprehensive.
- API landing page: "CheapAgent API profiles agent context, flags bloat, estimates token impact, and converts to TOON only when it wins."
- Pricing page with tiers visible (Free / Pro / Team / Enterprise-contact), even if billing is not yet live. Free tier keys can issue immediately.

Exit condition: self-serve key issuance works; `/v1/profile` returns the documented schema in production; quickstart verified by a clean-environment run.

## Phase 3 — Integration Surfaces

Goal: the API is callable from where agents and CI actually live.

- MCP server exposing `/v1/profile` (and optionally `/v1/convert`) as tools, with a README that assumes the reader has never used CheapAgent.
- GitHub Action: fails or comments on a PR when `AGENTS.md`, `CLAUDE.md`, `SKILL.md`, or configured prompt files exceed bloat thresholds. This is the workflow wedge and the most shareable artifact.
- Reference agent flow documented: load context → call `/v1/profile` → act on verdict (keep Markdown / split first / convert) → proceed with smaller payload.

Exit condition: MCP server installable and working in at least one client (Claude Code or Claude Desktop); GitHub Action running in at least one public repo (own repos count).

## Phase 4 — Proof Assets and Teardown Content

Goal: a library of shareable evidence before asking anyone to look.

- Screenshotable verdict card (the shareable unit of the viral loop).
- One 30-second screen recording of paste → verdict.
- The flagship demo video: an agent *refusing* to waste context. First doc gets "split first, TOON would be 8% larger" and the agent keeps Markdown; second doc gets "TOON helps here" and converts. Better decisions, not universal compression.
- Run public teardowns against real file types: `CLAUDE.md`, `AGENTS.md`, `SKILL.md`, prompt files, tool manifests, structured RAG snippets. No toy samples — readers must recognize their own files.
- Begin the daily posting cadence (see Cadence) using teardown results. One teardown per day, each ending with "Run yours."
- At least one "TOON loses here" honesty post in the bank before launch.

Exit condition: minimum five published teardowns, verdict card and both videos ready, measurable trickle of organic web-app runs from posts.

## Phase 5 — Public Launch Wave

Goal: launch in developer-native order, smallest audience first.

Sequence within this phase is strict:

1. GitHub release (API docs, MCP server, GitHub Action all referenced from the doc2toon and CheapAgent READMEs).
2. npm release note.
3. Technical blog post (the architecture and the verdict schema, not marketing).
4. X thread + LinkedIn post on launch day.
5. Show HN: "CheapAgent — an API that checks agent docs for context bloat." First comment explains the origin (agent docs as invisible token debt), the verdict types, and the open-source/paid split.

Product Hunt is explicitly **not** in this wave. It waits until the verdict-card loop and funnel are proven.

Exit condition: HN post live; whatever traffic arrives hits working key issuance, docs, and pricing without manual intervention.

## Phase 6 — Buyer Narrative and Conversion

Goal: stop only educating; start asking for money.

- Billing goes live for Pro tier (API quota, saved reports, usage dashboard). Team tier (shared keys, CI comments, batch, policy packs) follows as fast-follow; sell it manually before it is self-serve if demand appears.
- LinkedIn becomes the primary channel: context budgets, duplicate instruction drift, prompt-file entropy, "more context as operational debt," and the no-body-storage privacy posture as a governance feature.
- Intent capture at moments of pain only: limit hit, key creation, batch attempt, private-repo question, CI setup. No generic newsletter form.
- Direct CTAs in rotation: "Need this in CI? Start Team." / "Need an agent-callable API? Generate a key." / "Need retention controls or SSO? Talk to Enterprise." / "Want a review of your team's top 3 agent docs? Apply for a context audit."
- Open enterprise conversations. The first enterprise feature is policy-controlled API usage with no document storage by default — not a dashboard.

Exit condition: first paid conversion, or a documented reason why not plus the fix queued.

## Running Cadence (Phases 4–6)

- Every weekday: one X post, one LinkedIn post, three substantive replies in agent/context/Claude Code/Codex/MCP discussions, five direct outreach messages to founders or engineers building agent workflows.
- Twice weekly: one short demo video.
- Weekly: one longer technical post.
- Weekly: one "TOON loses here" honesty post. The brand is trust; honesty content is load-bearing, not optional.

## Billing Model

- Meter: **documents checked + input characters processed**. Token savings is the ROI story, never the billing unit.
- Free: small monthly quota, no batch, no saved reports.
- Pro: higher quota, API key, saved recent reports, usage dashboard.
- Team: shared keys, GitHub Action/CI comments, batch endpoint, policy packs, team dashboard.
- Enterprise: SSO, audit logs, retention controls, dedicated limits, private deployment option, security review, procurement support. Contact-only.

## 30-Day Targets

Ambitious but checkable. Misses are information, not failure.

- 250–500 API keys issued.
- 25–50 repeat API users or real integrations.
- 10–25 Pro/Team conversions.
- 5–10 enterprise conversations opened.
- 1–2 paid pilots or design partners.
- At least one public repo (not ours) running a CheapAgent CI check or badge.
- North-star metric: **repeat context checks per project per week.** Habit, not pageviews.

## Non-Goals (Next 30 Days)

- No DOCX, PDF, or OCR support. File extraction changes the product category (extraction quality, file privacy, timeouts) and is deferred past this window.
- No "TOON API" framing. It is the Context API.
- No universal savings percentages anywhere in copy.
- No Product Hunt launch in this window.
- No prose-only API responses. Agents get structured verdicts.
- No heavyweight enterprise theater. Policy-controlled usage and no-storage defaults first.

## Risks

- Solo-builder load: Phases 2–3 are build-heavy while Phases 4–6 are content-heavy. The cadence section assumes Phase 2 build is substantially done; if build slips, cut `/v1/batch` and the Team tier before cutting `/v1/profile` quality or the honesty posts.
- Schema churn: every consumer (CLI, web, MCP, Action, customer code) depends on the verdict object. Version it from the first public release.
- npm publication remains the single upstream blocker. Nothing in Phases 2+ should depend on a git pin.
