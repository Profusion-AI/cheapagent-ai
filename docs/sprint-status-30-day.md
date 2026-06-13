# 30-Day Sprint — Status & Analysis (Phases 0–2)

**Date:** 2026-06-10 · **Plan of record:** 30-day plan v2 + phased dev plan (both outside the repos, in `C:\Users\kyleg\development\`) · **Repos:** doc2toon (engine, npm) + cheapagent-ai (web, Netlify CD).
*(Phase numbers throughout refer to the **phased dev plan**, not the superseded `ROADMAP-30-DAY-API.md` — that roadmap's "Phase 2" hosted-API surface is demand-gated and has not been built.)*
**Position:** the plan's day-8 engineering milestone (contract frozen + v0.3.0 released) was reached on **calendar day 1**. The content/marketing workstream has not started and is now the trailing edge.

---

## Where the sprint stands

| Plan milestone | Plan day | Status |
|---|---|---|
| Decision log, realistic fixtures, honesty benchmark, contract draft (Phase 0) | 1–3 | **Done** — doc2toon `57978f4`, QC'd (2 findings fixed) |
| Verdict engine + calibration + freeze merge (Phase 1) | 4–7 | **Done** — doc2toon `50a09e5`, QC'd (2 findings fixed); contract **FROZEN** |
| CLI `--json` + exit-code contract → v0.3.0 (Phase 2) | 8 (ceiling 9) | **Done** — doc2toon `09e6b80` merged; v0.3.0 tagged after the post-merge CI run went green |
| Copy-summary web hedge (`#copy-summary-button`) | 4–6, parallel | **Done 2026-06-11** — shipped in v0.2.3 against the engine verdict (better than the hedge: built from VerdictV1 field names directly) |
| Daily-ish teardowns + first honesty post | 4–7 | **First post live 2026-06-11** — cheapagent.ai/honesty.html (19 docs / 1 convert, reproducible); cadence continues with teardowns 2–3 |
| Proof assets (card screenshot, 30-second recording, curl/TS snippets) | 1–3 | **Partially** — curl/TS snippets exist; verdict card + Copy summary are live so the screenshot is one browser visit away; recording not captured |

**Next on the critical path** (updated 2026-06-11): the day-12 GitHub Action build, exactly from the fork-PR spike's binding design (`doc2toon/docs/action-fork-pr-permissions.md`). The first dogfood PR must prove the degradation matrix: same-repo comment posts and updates; fork PR skips the comment but keeps summary/annotations/artifact/exit code; `--fail-on` turns the check red on both paths. The spike, the web verdict swap (v0.2.3, `doc2toon@^0.3.0`), Copy-summary, and the first honesty post all landed 2026-06-11 — see the addendum below. Remaining off-critical-path: marketing-grade card screenshot/recording, teardowns 2–3.

---

## What shipped, by phase

### Phase 0 — the contract draft (doc2toon `57978f4`)

- `schemas/verdict.v1.json` (JSON Schema 2020-12) + `openapi/cheapagent.v1.yaml` (OpenAPI 3.1), deliberately `$ref`-free so sync is plain deep equality; both ship in the npm tarball.
- `docs/verdict-schema-v1.md`: 12 written decisions (verdict enum lifted from the live web policy; deterministic char-based decision inputs; in-band refusal; unified coded warnings; exit-code contract) plus 7 open calibration questions.
- Five realistic fixtures (350–840 lines, original content) and `scripts/benchmark-honesty.mjs` — the receipts behind the "TOON loses here" honesty posture from week 1.
- cheapagent-ai: supersede banner on `docs/ROADMAP-30-DAY-API.md`.

### Phase 1 — the verdict engine and the freeze (doc2toon `50a09e5`)

- `src/verdict.ts`: `buildVerdict`/`runVerdict`, browser-safe, exported from both entrypoints — so every surface (web, CLI, MCP, serve, hosted API) can call the same policy without re-deriving a verdict. As of v0.3.0 the CLI consumes it; as of CheapAgent v0.2.3 (2026-06-11, `doc2toon@^0.3.0`) the web does too. **Accurate scope of the claim: CLI and web now share the frozen Verdict v1 engine; the upcoming Action/MCP/serve surfaces must consume the same contract** — they are designed against it but not yet built.
- Refusal became representable: `BudgetRefusedError` carries the attempted lossless candidate, so `runVerdict` returns `verdict: "refused"` without parsing an error message.
- The three sync mechanisms: per-fixture snapshots + ajv validation, estimator-parity (decisions identical under chars/4 and tokenx across the corpus), OpenAPI↔JSON-Schema deep equality.
- **Calibration answered all 7 open questions with data** (`docs/calibration-v1.md`), and produced three engine changes:
  - `MIN_CONVERT_SAVINGS_PCT` (5%): near-zero "wins" stay `keep_markdown`.
  - `low_coverage` (new registry code): record-mode runs that "win" by deleting content (+91.6% claimed at 8% measured coverage) land on `review`, never `convert`. The decision-12 dishonesty class is contained.
  - Uniform-table `long_section` exemption: the engine's one legitimate win class (config-reference, +21.1%, decode-verified 294/294 rows) became reachable as `convert` with `safe_to_auto_apply: true`.
- Freeze merge with the banner: the contract is governed by versioning rules from `50a09e5` onward.

### Phase 2 — the CLI surface and the release (doc2toon `09e6b80`, tag `v0.3.0`)

- `profile --json` / `convert --json` emit Verdict v1 (`profile` withholds `toon_candidate` per decision 9); `--out` optional under `--json`.
- Exit-code contract (decision 8): representable verdicts exit 0 — including `refused` and `keep_markdown`; I/O, argument (including commander-level), and internal failures exit 1 with the `{"error":{code,message}}` envelope; `validate --json` returns the spec's ValidationResult and keeps exit 1 on `invalid_toon`; `--fail-on` for deliberate CI failure.
- Deprecations live (warn now, remove at 1.0): `toon-doc` (dedicated wrapper bin — fires through Windows cmd shims), `lossless-doc`/`llm-context`.
- 105 tests across 6 files; bash smoke with ajv gates on the `--json` surface; release rehearsed (tarball installed in a clean prefix and smoked) before tagging.

---

## Analysis

### The honesty thesis survived contact with the data

Across 19 corpus documents in lossless mode, TOON earns `convert` on exactly **one** (a uniform-table reference, +21.1%, decode-verified). Real agent docs (CLAUDE/AGENTS/SKILL shapes) profile `mixed` and measure −38% to −129% — their honest verdict is `keep_markdown` or `split_first`, which is the product's actual advice. This is the marketing story working as designed: the verdict is the product, not the compression. The benchmark script now reports the engine's own verdicts, so the weekly honesty post and the engine can never disagree.

### The measurement-integrity incident (the sprint's best catch)

The adversarial review of Phase 2 found that **CI on main was red**: Phase 1's snapshots had been measured on a CRLF working tree (Windows autocrlf smudge) while ubuntu CI checks out LF — and since verdict decisions are character counts, the same fixture genuinely measured differently (+0.4% vs −1.5% on the RFC). Three lessons with durable value:

1. **Corpus line endings are contract material.** `fixtures/**` and `examples/**` are now pinned to LF; snapshots, the calibration table, and every documented number are regenerated from LF truth.
2. **The "stale" day-1 numbers were correct all along** — what Phase 1 "corrected" was the smudge. The restored values (−37.8/−62.1/−38.9/−1.5/+21.1) now agree across docs, snapshots, CI, and the npm tarball.
3. **The savings band earned a better justification than the one it shipped with:** EOL encoding alone moved a measurement by two points, which is exactly why sub-5% "wins" must not earn `convert`. Glossary record mode (+4.7%) is the corpus's standing sub-band case.

Open question flagged (not decided): should the *engine* normalize line endings before measuring, so the same document gets the same verdict regardless of encoding? Affects real CRLF file reads on Windows. Candidate 0.3.x calibration item.

### The QC loop is earning its cost

Every phase ran build→QC→fix→merge, and every QC pass found something real: Phase 0 (tarball claim, stage labels), Phase 1 (benchmark contradicting the policy it receipts, stale heading), Phase 2 (28-agent adversarial review: 14 confirmed findings, including the CI-red corpus bug, a contract gap where commander-level errors bypassed the JSON envelope, and a stale-dist false-green in the test harness — demonstrated by a neutered exit-code contract passing the full suite). The refuted findings (10) were equally useful: they confirmed in writing that the pretty-output changes, threshold semantics, and deprecation design are contract-blessed rather than accidental.

The post-release QC of v0.3.0 itself (independent verification against GitHub/npm) confirmed the release sequence and the registry contents, and found three more real items, all fixed same-day: (1) this report originally over-implied web adoption of the frozen contract (clarified above — web still pins `^0.2.0`); (2) CI was green but not durable — `ci.yml` still ran node20-runtime actions, deprecated with forced migration on 2026-06-16, five days out (patched to v6 actions, matching `publish.yml`, plus a Node 20/24 matrix so CI now covers both the minimum engine and the publish runtime); (3) phase numbering could be misread against the superseded API roadmap (parenthetical added at top).

### Risk register burndown (top 5 from the dev plan)

| # | Risk | Status |
|---|---|---|
| 1 | Greenfield verdict policy frozen into a public contract | **Retired** — calibrated against realistic fixtures before the freeze; conservative auto-apply; constants documented tunable |
| 2 | Tokenizer divergence flips verdicts across surfaces | **Retired** — char-based decision inputs by design; estimator-parity test proves it corpus-wide; the one nuance (`--target-tokens` is estimator-relative) is documented |
| 3 | CLI `--json` is a refactor gating the day-12 Action | **Retired** — shipped, released, rehearsed |
| 4 | GitHub Action fork-PR permissions | **Design decided 2026-06-11** — spike doc is binding (`pull_request` only, no secret paths, comment best-effort, gate on fork-safe channels); empirical fork checklist carried into the day-12 Action dogfood |
| 5 | api.cheapagent.ai DNS/SSL/routing | **Open** — scheduled days 19–20 |

### Schedule risk has inverted

Engineering is ~7 plan-days ahead; the gate (day 30: ≥20 intent signals / ≥2 hosted-needing payers / ≥1 blocked pilot) is fed by **content and instrumentation**, neither of which has started. The plan's own warning applies: instrumentation landing late "silently starves the day-30 decision." Being ahead on code makes the cheapest high-value moves now: start the teardown cadence (inputs are ready), capture the proof assets, and hold the days-15–18 instrumentation window even if engineering could pull it earlier.

---

## Addendum — 2026-06-11 (QC steps 2–5 executed)

Shipped after the v0.3.0 release QC, in its recommended order. Evidence links per item; entries marked *(internal)* were verified in-session and are reproducible but have no public artifact.

| Deliverable | Commit | Verification |
|---|---|---|
| Fork-PR spike decision doc (binding for `action.yml`) | doc2toon [`e72b8ec`](https://github.com/Profusion-AI/doc2toon/commit/e72b8ec) | CI run 19 green: <https://github.com/Profusion-AI/doc2toon/actions/runs/27340844027>; design facts quote GitHub's events/security docs; **fork behavior is design-decided from documented guarantees, not yet empirically proven** — checklist carries into Action dogfood |
| CI v6-actions migration + Node 20/24 matrix (prior QC's hygiene item) | doc2toon [`d27f5e4`](https://github.com/Profusion-AI/doc2toon/commit/d27f5e4) | Run 18 green on both matrix legs, zero deprecation annotations: <https://github.com/Profusion-AI/doc2toon/actions/runs/27340480345> |
| Web verdict swap to `doc2toon@^0.3.0` + Copy summary (v0.2.3) | cheapagent-ai [`b660285`](https://github.com/Profusion-AI/cheapagent-ai/commit/b660285) | Flip-free vs `docs/calibration-v1.md` web-sample rows on all 4 tabs *(internal: preview run)*; Copy-summary clipboard payload contains schema fields and no document body *(internal: clipboard interception in preview)*; deployed bundle `assets/main-DoD1CArQ.js` carries `schema_version`/`safe_to_auto_apply` and its hash equals the locally verified build (checked live) |
| First honesty post | cheapagent-ai [`73b2de0`](https://github.com/Profusion-AI/cheapagent-ai/commit/73b2de0) | Live: <https://cheapagent.ai/honesty.html>; every number re-run from `scripts/benchmark-honesty.mjs` at 0.3.0 and cross-checked against `docs/calibration-v1.md`; sitemap carries 3 URLs (checked live) |

Scope discipline on the headline claim: **CLI and web now share the frozen Verdict v1 engine.** Action, MCP, `serve`, and the hosted API are designed against the same contract but not yet built — public wording should not say "all surfaces" until they are.

---

## Addendum — 2026-06-13 (launch-prep branch protection amendment)

Kyle added one sprint hardening item that was not in the original 30-day plan:
protect `main` on both repos before launch-wave attention creates outside
contributor traffic. This is **contributor-only hardening**, not a slower
internal workflow:

- Kyle, Codex, and Claude must retain direct-push access to `main` for fast
  fixes, analytics-disclosure timing, and release operations.
- Outside contributors must use PRs; direct pushes to `main` from untrusted
  identities are blocked.
- `doc2toon` can require the existing `CI` Node 20/24 matrix for outside PRs;
  keep the context-check dogfood workflow advisory unless explicitly promoted
  to a gate.
- `cheapagent-ai` needs a minimal build CI (`npm ci` + `npm run build`) before
  any required-check rule is useful; its current context-check workflow stays
  advisory.
- Do not enable "do not allow bypassing," and do not require PRs for the
  trusted maintainer identities/apps. Verify after enabling that a trusted
  identity can still push to `main` and an outside/fork-style direct push is
  blocked.

This is now recorded in the root phased plan as Phase 4.6, days 15–18, before
the launch wave.

---

## Inventory of durable artifacts

| Artifact | Where |
|---|---|
| Frozen contract (schema + spec + decision log) | `doc2toon/schemas/verdict.v1.json`, `openapi/cheapagent.v1.yaml`, `docs/verdict-schema-v1.md` |
| Calibration table + tuned constants | `doc2toon/docs/calibration-v1.md` (regenerate: `scripts/calibration-table.mjs`) |
| Honesty benchmark | `doc2toon/scripts/benchmark-honesty.mjs` (verdict-true since Phase 1 QC) |
| Realistic corpus (LF-pinned) | `doc2toon/fixtures/agent-context/realistic/` |
| Released package | `doc2toon@0.3.0` on npm (provenance, OIDC) — schema ships in the tarball |
| Test wall | 105 tests / 6 files + bash smoke with ajv gates |
| This report | `cheapagent-ai/docs/sprint-status-30-day.md` |
