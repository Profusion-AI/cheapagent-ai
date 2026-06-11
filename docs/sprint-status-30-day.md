# 30-Day Sprint — Status & Analysis (Phases 0–2)

**Date:** 2026-06-10 · **Plan of record:** 30-day plan v2 + phased dev plan (both outside the repos, in `C:\Users\kyleg\development\`) · **Repos:** doc2toon (engine, npm) + cheapagent-ai (web, Netlify CD).
**Position:** the plan's day-8 engineering milestone (contract frozen + v0.3.0 released) was reached on **calendar day 1**. The content/marketing workstream has not started and is now the trailing edge.

---

## Where the sprint stands

| Plan milestone | Plan day | Status |
|---|---|---|
| Decision log, realistic fixtures, honesty benchmark, contract draft (Phase 0) | 1–3 | **Done** — doc2toon `57978f4`, QC'd (2 findings fixed) |
| Verdict engine + calibration + freeze merge (Phase 1) | 4–7 | **Done** — doc2toon `50a09e5`, QC'd (2 findings fixed); contract **FROZEN** |
| CLI `--json` + exit-code contract → v0.3.0 (Phase 2) | 8 (ceiling 9) | **Done** — doc2toon `09e6b80` merged; v0.3.0 tagged after the post-merge CI run went green |
| Copy-summary web hedge (`#copy-summary-button`) | 4–6, parallel | **Not started** — the day-7 "verdict card screenshot" beat no longer depends on it (the release landed first), but it remains the right web deliverable pre-swap |
| Daily-ish teardowns + first honesty post | 4–7 | **Not started** — the reproducible inputs exist (benchmark script, calibration table); the cadence itself is the outstanding work |
| Proof assets (card screenshot, 30-second recording, curl/TS snippets) | 1–3 | **Partially** — curl/TS snippets exist in the schema doc and README; screenshot/recording not captured |

**Next on the critical path:** day-9 fork-PR permissions spike (half-day, dummy repo + fork), then the GitHub Action against the published `doc2toon@^0.3`. Off critical path: web verdict swap (days 10–12), Copy-summary hedge, content catch-up.

---

## What shipped, by phase

### Phase 0 — the contract draft (doc2toon `57978f4`)

- `schemas/verdict.v1.json` (JSON Schema 2020-12) + `openapi/cheapagent.v1.yaml` (OpenAPI 3.1), deliberately `$ref`-free so sync is plain deep equality; both ship in the npm tarball.
- `docs/verdict-schema-v1.md`: 12 written decisions (verdict enum lifted from the live web policy; deterministic char-based decision inputs; in-band refusal; unified coded warnings; exit-code contract) plus 7 open calibration questions.
- Five realistic fixtures (350–840 lines, original content) and `scripts/benchmark-honesty.mjs` — the receipts behind the "TOON loses here" honesty posture from week 1.
- cheapagent-ai: supersede banner on `docs/ROADMAP-30-DAY-API.md`.

### Phase 1 — the verdict engine and the freeze (doc2toon `50a09e5`)

- `src/verdict.ts`: `buildVerdict`/`runVerdict`, browser-safe, exported from both entrypoints — every surface (web, CLI, MCP, serve, hosted API) calls the same policy; none re-derives a verdict.
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

### Risk register burndown (top 5 from the dev plan)

| # | Risk | Status |
|---|---|---|
| 1 | Greenfield verdict policy frozen into a public contract | **Retired** — calibrated against realistic fixtures before the freeze; conservative auto-apply; constants documented tunable |
| 2 | Tokenizer divergence flips verdicts across surfaces | **Retired** — char-based decision inputs by design; estimator-parity test proves it corpus-wide; the one nuance (`--target-tokens` is estimator-relative) is documented |
| 3 | CLI `--json` is a refactor gating the day-12 Action | **Retired** — shipped, released, rehearsed |
| 4 | GitHub Action fork-PR permissions | **Open** — day-9 spike is next |
| 5 | api.cheapagent.ai DNS/SSL/routing | **Open** — scheduled days 19–20 |

### Schedule risk has inverted

Engineering is ~7 plan-days ahead; the gate (day 30: ≥20 intent signals / ≥2 hosted-needing payers / ≥1 blocked pilot) is fed by **content and instrumentation**, neither of which has started. The plan's own warning applies: instrumentation landing late "silently starves the day-30 decision." Being ahead on code makes the cheapest high-value moves now: start the teardown cadence (inputs are ready), capture the proof assets, and hold the days-15–18 instrumentation window even if engineering could pull it earlier.

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
