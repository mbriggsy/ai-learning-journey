# ETL Reverse Engineering — Brief ("Plan for a Plan")

> **Status:** Pre-plan brainstorm. Captured 2026-04-17.
> **Purpose:** Document shared understanding and open questions *before* writing a real plan.
> **Next artifact:** A pilot-driven RE walkthrough (see [Next Step](#next-step)).

---

## 1. What we're building

A Claude Code **skill** that ingests a shit-show ETL job and emits a **world-class, rebuild-ready PRD**.

The PRD is the sole contract for a future rebuild. A downstream Compound Engineering (CE) workflow picks up the PRD and builds the world-class version:

- Same framework (required constraint)
- Same business logic (modulo flagged bugs)
- New implementation — clean, tested, maintainable, a "wow" from the best ETL engineers on the team

The skill's job is **reverse engineering → specification**, not implementation. Implementation is a later phase owned by CE.

---

## 2. Ground truths (decisions locked in this conversation)

| # | Decision | Implication |
|---|---|---|
| 1 | **Code is the source of truth.** | No SME interviews required. No triangulation against "original intent." The PRD documents what the code *does*, not what it *should do*. |
| 2 | **Existing docs are wrong.** | Ignore them. Don't read them as ground truth. Only the code. |
| 3 | **Unit of work varies.** | Most common: one high-level notebook orchestrating many. The skill must discover UOW boundaries as part of its job — this is a capability, not a configuration. |
| 4 | **Framework is a hard requirement.** | The patented Databricks-job-cluster queuing framework is in-scope. PRD references framework primitives. Rebuild still runs on this framework. No framework-agnostic PRD. |
| 5 | **No existing PRD template.** | Template is ours to design. Bar: "best ETL guys say wow." |
| 6 | **All artifacts are readable.** | Source code, framework, config, sample data, runtime logs, git history — all in scope. Only existing docs are excluded. |
| 7 | **Correctness flags are flagged, not fixed.** | If the original is wrong, the PRD notes it. The rebuild team (or CE) decides what to do. The skill never silently "corrects" behavior. |

---

## 3. Proposed PRD shape

14 sections in four buckets. The **Requirements Traceability Matrix (RTM)** is the spine — every requirement has a row that persists from RE through rebuild to verification.

### Identity & purpose
1. **Job identity** — name, entrypoint, framework registration, schedule, criticality
2. **Purpose** — one paragraph of plain-English intent, *derived from observed code behavior*

### The contract
3. **Inputs** — every source. Table/path, schema, partitioning, freshness, volume
4. **Outputs** — every sink. Same dimensions + downstream consumers (grepped from repo/config)
5. **Parameters** — runtime args, env vars, secrets, config keys
6. **Side effects** — audit writes, metrics, alerts, external calls

### The logic
7. **Business logic** — pseudo-SQL / plain-language per UOW. NOT the original code.
8. **Data lineage** — column-level where possible, else table-level
9. **Requirements Traceability Matrix (RTM)** — the spine. See §3a below.
10. **Framework coupling** — every touchpoint with the patented queue / compute plane. Carries forward to rebuild.

### The rebuild enablement
11. **Failure modes** — from logs + code shape
12. **Correctness flags** — smells, bugs, silent failures, hardcoded time zones, etc. Flagged, not fixed.
13. **Test specification** — golden in/out, edge cases, framework-integration tests the rebuild MUST pass
14. **QA / reconciliation plan** — how we prove the rebuild matches (or intentionally diverges from) the shit show

### 3a. The RTM — why it's the spine, not overkill

An RTM rots when humans maintain it. **Agents don't get bored.** Claude can keep it current on every rebuild commit. Cost of maintenance collapses, so the classic objection evaporates.

What it gives us:

- **Backward coverage proof.** Every meaningful line of the shit show must trace to ≥1 RTM row. If legacy code doesn't map to a row, it's one of three things: (a) a missed requirement (gap), (b) dead code (flag it), (c) a bug (correctness flag). This is how we prove the PRD is complete.
- **Forward enforcement.** When CE kicks in, every rebuild commit lands against a row. Test passes → row goes green. A finished rebuild = 100% green RTM. Intentional divergence = row with a justification column.

**RTM row shape (first draft):**

| Col | Meaning |
|---|---|
| `req_id` | Stable identifier (e.g., `ING-001`, `XFM-014`) |
| `type` | `ingestion` \| `transformation` \| `business_rule` \| `side_effect` \| `framework_coupling` \| `failure_handling` \| `non_functional` |
| `description` | Plain-language statement of the requirement |
| `legacy_anchor` | `file:line` range(s) in the original shit show |
| `rebuild_anchor` | `file:line` in the rebuild (populated by CE) |
| `test_case` | Pointer to the test in the test spec |
| `status` | `discovered` → `specified` → `implemented` → `tested` → `verified` |
| `correctness_flag` | Empty, or a note + severity if the legacy behavior is suspect |
| `divergence` | Empty, or justification if the rebuild intentionally deviates |

Requirement types subsume what earlier drafts called an "I/O Transformation Matrix" — column-lineage rows are just `type=transformation`.

---

## 4. Proposed skill architecture

Skills 2.0 thinking: SKILL.md is the playbook, `reference/` holds templates + taxonomies + framework cheat sheet. Five phases, each a hard gate.

| Phase | Purpose | Output | Concurrency |
|---|---|---|---|
| 1 — Scope discovery | Entrypoint → callee graph → UOW inventory | `scope.md` (file graph, UOW list) | Single pass |
| 2 — Per-unit RE | Extract inputs/outputs/logic per UOW | Unit fragments (one per UOW) | Parallel agents |
| 3 — Synthesis | Merge fragments into job-level PRD + RTM + lineage | `PRD.md` + `RTM.{md,csv}` + `lineage.md` | Single pass |
| 4 — Audit | Coverage (every read/write/branch in an RTM row?), matrix-vs-narrative consistency, flag triage | `audit.md` + gate decision | Single pass |
| 5 — Deliverable assembly | Final bundle: PRD + RTM + tests-spec + QA plan + correctness flags | `deliverables/` folder | Single pass |

**Hard gates between phases.** No phase N+1 until phase N's output passes its audit.

`reference/` contents (anticipated):
- `prd-template.md`
- `rtm-schema.md` + example CSV
- `correctness-flag-taxonomy.md`
- `framework-cheat-sheet.md` ← **gating dependency, see open questions**
- `test-spec-template.md`
- `qa-plan-template.md`

---

## 5. Open questions (must resolve before a real plan)

### Q1. Framework cheat sheet — does one exist?
The skill's quality is capped by its framework literacy. If there's no readable doc of the framework's primitives (queue API, compute-plane interface, job registration, retry model, priority semantics), **we must create one as prerequisite work**. The skill cannot produce correct "framework coupling" PRD sections without it.

**Action needed:** Briggsy confirms whether a cheat sheet exists, needs to be extracted from framework source, or needs to be written from tribal knowledge.

### Q2. Pilot job selection
We need one real ETL job to RE by hand *before* building the skill. Smallest real shit show available, provided it still exhibits:
- Multiple UOWs (so UOW discovery is exercised)
- Non-trivial inputs/outputs (so the RTM is meaningful)
- Framework touchpoints (so framework coupling is exercised)
- At least one suspected correctness issue (so flagging is exercised)

**Action needed:** Briggsy points at a candidate.

### Q3. Runtime access
Does Claude get hands-on access to:
- Run the pilot job end-to-end?
- Query sample input/output data?
- Read runtime logs?

If yes, Phase 2 can use dynamic analysis to verify static inferences. If no, Phase 2 is static-only and the PRD has a "verification pending" banner on anything not provable from code alone.

**Action needed:** Briggsy confirms runtime access scope.

---

## 6. Why skill-second, not skill-first

The skill is the **crystallization** of a workflow we haven't discovered yet. If we skill-first, we hard-code assumptions from job-in-our-heads. Those assumptions die on job #2.

Skill-second: RE one real job by hand (Briggsy + Claude, no skill). Extract the actual workflow that produced a wow-grade PRD. *Then* crystallize into SKILL.md + references.

This also gives the skill a real example to point at in `reference/` as the gold standard.

---

## Next step

**Pick a pilot job.** Confirm Q1–Q3 above, then start Phase 1 of the RE walkthrough manually.

When that's done, we have:
- One completed gold-standard PRD
- A tested workflow
- All the template material needed to scaffold the skill

---

## Glossary

- **RE** — reverse engineering
- **PRD** — product requirements document (here: spec for an ETL job)
- **RTM** — requirements traceability matrix
- **UOW** — unit of work (a notebook, module, or framework-registered job unit)
- **CE** — Compound Engineering (the downstream build workflow)
- **Shit show** — the existing ETL code. It works. It is also shit.
