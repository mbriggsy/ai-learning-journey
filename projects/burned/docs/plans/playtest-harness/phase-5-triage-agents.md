---
title: "Playtest Harness — Phase 5: Triage Agent System"
type: feat
status: draft
date: 2026-04-23
parent: docs/plans/playtest-harness/roadmap.md
origin: docs/testing/PLAYTEST-HARNESS-PRD.md
---

# Phase 5 — Triage Agent System

## Overview

After a playtest session produces seat logs, suspicion logs, god-event
events.jsonl, and a coverage report, a pool of triage agents consumes that
output and converts suspicious signals into diagnosed issues. Each triage
agent takes one issue seed (a cluster of related suspicions + log entries)
and produces a diagnosis + proposed fix paths — no code changes. Output
lands in `runs/<id>/issues/NNN-<slug>.md`, harmonized with
`docs/testing/E2E-ISSUE-LIST.md` voice, ready for Briggsy review +
promotion.

## Problem Frame

A session produces raw signals: fire logs, suspicions, coverage divergences.
Most of those signals are noise (an agent was confused but the game
behaved correctly) or duplicates of known product calls. A triage step is
the difference between "500 log lines to read" and "8 diagnosed findings,
each with a fix path." Without triage, the harness produces overwhelming
output that Briggsy has to wade through; with triage, he reviews a curated
list of fix-ready items.

Triage agents see more than seat agents — they have the god-event log, the
source code, the existing issue tracker, and cross-seat context. That's why
they can diagnose. But they don't touch code: diagnosis + proposed fix
paths only, per PRD §5.

## Requirements Trace

- **R1 (PRD §6.4)** — Triage agent produces diagnosis + 1-3 proposed fix
  paths per issue. Does not implement fixes.
- **R2 (PRD §6.6)** — Issue file format harmonized with
  `E2E-ISSUE-LIST.md`: title, severity (P0/P1/P2), source seats, linked
  scenario IDs, player-POV summary, god-mode reality, diagnosis, proposed
  fix paths, status.
- **R3 (PRD §9.6)** — Unbounded triage concurrency: one agent per open
  issue, spawned concurrently.
- **R4 (PRD §4.4)** — Suspicions carry equal weight to fires; triage
  treats both as primary signals.
- **R5 (PRD §9.4)** — Coverage divergences (self-report ≠ god-event log)
  are themselves valid issue seeds.
- **R6 (PRD §9.7)** — Issues stay in `runs/<id>/issues/`; Briggsy decides
  promotion into `E2E-ISSUE-LIST.md`.
- **R7 (PRD §4.1 isolation)** — Triage runs post-session, after all seat
  agents finish. No triage spawn during a live session.

## Scope Boundaries

- **In scope:** Triage agent prompt, input contract (seat logs +
  events.jsonl + source code read + existing issue tracker read),
  output schema, clustering step that converts raw suspicions into issue
  seeds, concurrency model, duplicate-detection against
  `E2E-ISSUE-LIST.md` + `SCENARIOS.md` `known-product-call` tags.
- **Out of scope:** Fix implementation. Session execution (Phase 3/4/6).
  Catalog authorship (Phase 1).

### Deferred to Separate Tasks

- **Auto-promotion into `E2E-ISSUE-LIST.md`.** Briggsy reviews and
  promotes manually. Future automation possible but out of v1.
- **Cross-session issue deduping.** v1 dedupes within a session against
  prior sessions' surviving issues; cross-session graph analytics
  (trend detection, "this bug keeps appearing") is future work.

## Context & Research

### Relevant Code and Patterns

- **Phase 4 log schemas** (`log-schema.ts`) — triage consumes
  `ScenarioFireEntry` + `SuspicionEntry` via the Phase 4 parser.
- **Phase 3 god-event log** — `server/events.jsonl`, one JSON object per
  line: `{ action, events, stateVersion, nowMs }`.
- **Phase 3 coverage report** — `coverage.md` with divergence list.
- **Phase 1 catalog** — scenario IDs with `known-product-call:` tags and
  suspicion prompts.
- `docs/testing/E2E-ISSUE-LIST.md` — voice, severity rubric, table
  formats. Output harmonizes with this.
- `src/server/projection.ts` — triage agents need to understand player-
  vs-god projection to diagnose information-asymmetry bugs.
- `src/server/game/engine.ts` — mechanics triage agents reference when
  diagnosing.

### Institutional Learnings

- `docs/insights/008-adversarial-swarm-review-maximum-overdrive.md` —
  "seven agents, distinct mandates." Triage v1 has one shared prompt
  (all triage agents are clones). A future enhancement is per-domain
  triage specialists (rules/visual/input/validation/disconnect); flagged
  as future work. For v1 we gain enough from parallelism alone.
- Memory `feedback-wait-for-all-agents.md` — wait for all seats before
  spawning triage. Orchestrator enforces.
- Memory `feedback-sequential-thinking-always.md` — triage synthesis is
  the right place to use Sequential Thinking MCP; applies at the
  per-agent level (each triage agent uses ST for root-cause analysis).
- `docs/testing/E2E-ISSUE-LIST.md` severity rubric (P0/P1/P2) is the
  working vocabulary. Triage uses identical categories.

### External References

None — all repo-internal signals.

## Key Technical Decisions

- **D1. Triage is post-session only.** Orchestrator invokes the triage
  pipeline after agent audit (Phase 4 Unit 4) + coverage report (Phase 3
  Unit 10). Never concurrent with seat agents (learnings).
- **D2. Clustering step converts raw logs into issue seeds.** A
  deterministic function (not an agent — `cluster-suspicions.ts`) groups
  suspicions + fires + divergences into `IssueSeed` records. Clustering
  rules (v1): same scenario ID, same seats involved, same time window
  (≤30s apart), same severity signal.
- **D3. One triage agent per issue seed, spawned concurrently.** Per D2
  the orchestrator knows the full seed set before spawning. All triage
  agents launch in parallel; orchestrator waits for all before producing
  the final issue index.
- **D4. Triage agents have a broader tool surface than seat agents.**
  Read access to: source code (`src/` tree), `docs/testing/E2E-ISSUE-LIST.md`,
  `docs/rules/RULES-REFERENCE.md`, `docs/specifications/PRODUCT-SPECIFICATION.md`,
  the full run directory (all seat logs + suspicions + events.jsonl +
  coverage.md). Write access: the specific issue file for their seed,
  nothing else. No Bash, no server control, no browser.
- **D5. Duplicate detection is explicit, not implicit.** Triage agent
  MUST check its seed against `E2E-ISSUE-LIST.md` and the catalog's
  `known-product-call:` tags before writing. If the finding matches a
  known item, the issue file records `status: DUPLICATE` with a link,
  and no new diagnosis is written.
- **D6. Issue file format includes a "player-POV summary" block and a
  separate "god-mode reality" block.** The former quotes the relevant
  suspicion/log prose; the latter references events.jsonl lines. The
  gap between the two is often the diagnosis.
- **D7. Severity assigned by triage, not by seat agent.** Seat agents
  log "suspicion: medium" as a rough vibe; triage reclassifies using the
  `E2E-ISSUE-LIST.md` rubric (P0 = game-breaking / privacy / corruption;
  P1 = rule violation with workaround / UX fault / subtle edge case;
  P2 = polish / defense in depth).
- **D8. Proposed fix paths are 1-3 options with tradeoffs.** No single-
  option "do this" — multi-option forces the triage agent to think about
  alternatives. Briggsy reviews and picks at promotion time.
- **D9. Sequential Thinking in the agent's reasoning.** Triage prompt
  directs the agent to use the `mcp__sequential-thinking__sequentialthinking`
  MCP tool for root-cause analysis when the diagnosis isn't immediate.
- **D10. Triage synthesis across agents is mechanical.** After all
  triage agents finish, a `build-issue-index.ts` step lists the
  `issues/NNN-<slug>.md` files and writes `issues/INDEX.md` with status
  counts. No additional synthesis agent — the orchestrator assembles the
  index deterministically.

## Open Questions

### Resolved During Planning

- **Concurrency limits.** Unbounded per PRD §9.6. If we hit practical
  limits during Phase 6 calibration, revisit.
- **Where do issues live between session end and Briggsy review?**
  `runs/<id>/issues/` only. Promotion is a manual Briggsy action; no
  auto-copy.
- **Does the triage agent see other seats' logs?** Yes — triage is
  post-session, isolation is no longer in force, and cross-seat context is
  what makes triage useful.
- **Can the triage agent read the server source?** Yes. It's post-session;
  god-mode is the point. PRD §5 explicitly gives triage broader inputs.
- **Does the triage agent write code or tests?** No. Only the issue file.
  Future automated-fix work is a separate phase/project.

### Deferred to Implementation

- **Exact clustering algorithm parameters.** v1 uses simple rules from
  D2; Phase 6 calibration tunes them.
- **Severity rubric edge cases.** When triage is uncertain between
  P0/P1, prompt biases toward the higher severity with a note — Briggsy
  downgrades at promotion if needed.
- **Triage agent prompt length vs context.** First draft loads the
  full E2E-ISSUE-LIST + catalog into prompt. If this grows unwieldy,
  tune at code time (triage agents can use `Read` on demand instead).

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

### Triage pipeline

```text
Session ends
    │
    ▼
Phase 3: coverage-reporter writes coverage.md (incl. divergences)
Phase 4: log-schema validator validates seat logs
Phase 4: isolation-audit validates write scopes
    │
    ▼
Phase 5: cluster-suspicions.ts
  Inputs: all seat logs + suspicion logs + coverage divergences +
          known-product-call map (from SCENARIOS.md) +
          existing E2E-ISSUE-LIST.md
  Output: IssueSeed[] — each seed is a cluster of related signals
          annotated with duplicate matches (if any)
    │
    ▼
Phase 5: launchTriageAgents(seeds, runDir, shutdownSignal)
  Parallel Agent spawns, one per seed, each with the triage prompt.
  Each agent writes exactly one issue file: issues/NNN-<slug>.md.
    │
    ▼
Wait for all agents (Promise.all).
    │
    ▼
Phase 5: build-issue-index.ts
  Walk issues/*.md, write issues/INDEX.md with counts by status/severity.
    │
    ▼
session.md end block appends final issue counts + coverage summary.
```

### Issue seed shape

```ts
// scripts/playtest/lib/types.ts (additive)
interface IssueSeed {
  seedId: string                // NNN-<slug>, deterministic
  sourceSignals: SignalRef[]    // refs into seat logs + coverage
  candidateDuplicate?: {
    kind: 'E2E-ISSUE' | 'KNOWN-PRODUCT-CALL'
    id: string                  // e.g. 'E-01', 'C-15', or a catalog SCN-ID
  }
  seatsInvolved: string[]       // ['seat-3', 'seat-7']
  scenarioIds: string[]         // scenarios referenced in the cluster
  suspicionSeverityHint: 'low' | 'medium' | 'high'
  timeWindow: { fromMs: number, toMs: number }
}
```

### Issue file template

```markdown
# NNN-<slug> — <one-line title>

**Severity (triage):** P0 | P1 | P2
**Status:** 🔴 OPEN | ⏸ BLOCKED (awaiting Briggsy) | 🏷 DUPLICATE
**Source seats:** seat-3, seat-7
**Linked scenarios:** SCN-NAMED-STEAL-INTERCEPT-01
**Session:** runs/2026-04-24-2030-8p
**Candidate duplicate:** E-01 in E2E-ISSUE-LIST.md (if any)

## Player-POV summary

> *Quoted from seat-3's suspicion log at 18:04:15:*
> "I saw Dash play a triple-steal on me but I never saw which card he
> named before I had to decide about Intercept..."

## God-mode reality

From `server/events.jsonl` lines 412-417:
- 18:04:14.223 — `card-played` (cardType: named-steal, actor: seat-5)
- 18:04:14.240 — `named-steal-pending` (actor: seat-5, target: seat-3,
  namedCardType: neal-proctor)
- 18:04:14.241 — `nope-window-opened` (deadlineMs: 18:09:14.241)
- ... target did NOT receive a state update containing namedCardType ...

## Diagnosis

Root cause: the `named-steal-pending` event's `namedCardType` field is
emitted in the god-event stream but stripped from the projection the
target sees. The target's phone renders a generic "Steal pending" banner
without the named card. This is the 2026-04-22 class of bug — believed
fixed by the pre-resolution banner but evidence suggests the fix did not
land for this game phase.

<use Sequential Thinking to walk projection path>

## Proposed fix paths

**Option A — Verify banner coverage (conservative):** Audit
`src/client/player/IncomingSteal.tsx` for the named-card render branch,
cross-check against `src/server/projection.ts:133-156` named-steal
fields. Likely a render-time conditional that doesn't fire in this state.
Est. effort: small. Risk: low.

**Option B — Extend projection to include namedCardType directly (more
invasive):** Add `namedCardType` to the target-visible projection so
the phone always has the info without reading through nopeWindow state.
Est. effort: medium. Risk: medium (changes projection contract, requires
protocol-version bump).

**Option C — Defer with monitoring:** If this is rare, add a Playwright
regression test that reproduces the missing-banner case and document as
known until the named-steal flow gets a broader refactor. Est. effort:
tiny. Risk: ships a known bug, not recommended.

## Recommended next step

Option A, triaged as P0 if reproducible in smoke, P1 if not.

---

**Triage agent SHA:** <git SHA of this harness version>
**Triage agent session:** <subagent session id>
```

## Implementation Units

- [ ] **Unit 1: Triage agent system prompt (`scripts/playtest/agents/triage.md`)**

**Goal:** Write the canonical triage prompt. Hostile-framing focus on
diagnosis rigor. Required checklist: duplicate check, severity
rationale, ≥2 fix options unless truly one-path-only.

**Execution note:** Prose artifact. Unit 5 integration-tests it.

**Requirements:** R1, R2, R4, R5, R8

**Dependencies:** Phase 4 log schema (Unit 3), Phase 3 coverage
reporter (Unit 10), Phase 1 catalog.

**Files:**
- Create: `scripts/playtest/agents/triage.md`.

**Approach:**
- Placeholders: `{{SEED_ID}}`, `{{SEED_SIGNALS}}`, `{{SEATS_INVOLVED}}`,
  `{{SCENARIO_IDS}}`, `{{RUN_DIR}}`, `{{CANDIDATE_DUPLICATE}}`,
  `{{ISSUE_PATH}}`.
- Sections: mandate, inputs available, required process (duplicate
  check → player-POV read → god-mode read → diagnosis → fix paths),
  tool allowlist reminder, output format, anti-patterns.
- Mandate example: "You are a triage agent. You take one issue seed and
  produce one diagnosed issue file. You do not write code. You do not
  implement fixes. You propose 1-3 fix paths with tradeoffs and stop."
- Required process step-by-step with explicit "do not skip" warnings on
  the duplicate check.

**Patterns to follow:**
- Phase 4 seat-agent prompt structure for consistency.
- `docs/testing/E2E-ISSUE-LIST.md` voice as the output style reference.

**Test scenarios:**
Test expectation: none — prose artifact.

**Verification:**
- Every placeholder matches launcher input.
- Severity rubric matches `E2E-ISSUE-LIST.md`.

- [ ] **Unit 2: `cluster-suspicions.ts` — raw logs → IssueSeed[]**

**Goal:** Deterministic clustering of suspicions + divergences + fire
anomalies into seeds.

**Execution note:** Test-first. This is the signal-to-noise gate; test
heavily.

**Requirements:** R4, R5

**Dependencies:** Phase 4 Unit 3 log parser, Phase 3 Unit 10 coverage
reporter output.

**Files:**
- Create: `scripts/playtest/lib/cluster-suspicions.ts`.
- Create: `scripts/playtest/lib/cluster-suspicions.test.ts`.

**Approach:**
- Inputs: parsed seat logs, parsed suspicion logs, coverage report's
  divergence list, catalog's known-product-call map, existing
  E2E-ISSUE-LIST parsed minimally (title + severity + id).
- Output: `IssueSeed[]` as per High-Level Technical Design.
- Clustering rules:
  1. Group suspicions by `relatedScenario`.
  2. Within a scenario group, sub-group by 30s time windows.
  3. Merge coverage divergences tagged to the same scenario.
  4. Tag seed with `candidateDuplicate` if the cluster matches:
     - a known-product-call in the catalog, or
     - an E2E-ISSUE-LIST entry whose title keyword overlap exceeds a
       threshold (simple keyword-based match; tunable in Phase 6).
  5. Assign `seedId` deterministically: `NNN-<slug-from-scenario-id-or-
     primary-suspicion>`. NNN is ordered by timestamp of first signal.
  6. Collapse single-signal noise (a single low-severity suspicion
     with no matching fire or divergence) into a "low-signal"
     bucket — NOT dropped; flagged for Briggsy to choose whether to
     triage.

**Patterns to follow:**
- Pure function style; exhaustive unit tests via fixture inputs.

**Test scenarios:**
- Happy path: 5 suspicions across 2 scenarios at distinct time windows
  → 2 seeds.
- Happy path: 3 suspicions same scenario within 30s → 1 seed with 3
  source signals.
- Edge case: suspicion tagged to known-product-call → seed has
  `candidateDuplicate` filled.
- Edge case: coverage divergence with no matching suspicion → seed
  includes the divergence alone.
- Edge case: single low-severity suspicion, no other signals → goes to
  low-signal bucket, still produces a seed file but flagged.
- Edge case: suspicion with `relatedScenario: null` → clustered purely
  by time + seats.
- Error path: malformed log entries → skipped with warnings, not fatal.

**Verification:**
- All tests pass; deterministic seed ids.

- [ ] **Unit 3: `triage-launcher.ts` — spawn one agent per seed**

**Goal:** Convert `IssueSeed[]` into concurrent triage-agent spawns;
wait for all; no rolling synthesis.

**Execution note:** Test-first on input serialization; integration-tested
via Unit 5.

**Requirements:** R1, R3, R7

**Dependencies:** Unit 1 (prompt), Unit 2 (seeds).

**Files:**
- Create: `scripts/playtest/lib/triage-launcher.ts`.
- Create: `scripts/playtest/lib/triage-launcher.test.ts`.

**Approach:**
- `buildTriagePrompt(seed, runDir, template): string` — fills
  placeholders, including a serialization of `seed.sourceSignals` as
  log-path + line references so the agent can read them.
- `launchTriageAgents(seeds, runDir, promptTemplate): Promise<TriageResult[]>`:
  - `Promise.all(seeds.map(seed => Agent({...})))`.
  - Tool constraint via subagent_type + description.
  - Result includes agent id, issue path, exit status.
- No rolling reduction; orchestrator waits for all.

**Patterns to follow:**
- Phase 4 Unit 2 launcher.

**Test scenarios:**
- Happy path: 3 seeds → 3 prompts fully rendered.
- Edge case: seed with `candidateDuplicate` → prompt surfaces it
  explicitly (so agent runs the duplicate check first).
- Edge case: low-signal seed → prompt flags "low signal; triage may
  conclude no bug."
- Error path: seed missing required fields → throws before spawn.

**Verification:**
- Unit tests pass.

- [ ] **Unit 4: `build-issue-index.ts` — walk issues/ and write INDEX.md**

**Goal:** Deterministic post-triage index.

**Execution note:** Test-first.

**Requirements:** R2, R6

**Dependencies:** Unit 3 writes issue files.

**Files:**
- Create: `scripts/playtest/lib/build-issue-index.ts`.
- Create: `scripts/playtest/lib/build-issue-index.test.ts`.

**Approach:**
- Walk `runs/<id>/issues/NNN-*.md`.
- Parse frontmatter / header block from each.
- Group by severity + status.
- Render `issues/INDEX.md`: counts, then a sortable table with id, title,
  severity, status, linked scenarios, candidate duplicate.
- Append summary line to `session.md` end block.

**Patterns to follow:**
- `E2E-ISSUE-LIST.md` table format + severity legend.

**Test scenarios:**
- Happy path: 3 issue files with varied statuses → correct counts + table.
- Edge case: 0 issues → INDEX.md still written with "No findings." body.
- Edge case: issue file missing required header → listed with a warning
  row; does not crash.

**Verification:**
- Unit tests pass; INDEX.md opens cleanly.

- [ ] **Unit 5: Integration test — sample session end-to-end triage**

**Goal:** Feed a fixture session (pre-captured seat logs + events.jsonl)
through Units 2-4. Assert issue count, statuses, and INDEX.md.

**Execution note:** Integration-first.

**Requirements:** R1, R2, R3, R5, R6

**Dependencies:** Units 1-4.

**Files:**
- Create: `scripts/playtest/integration/phase5-smoke.ts`.
- Create: `scripts/playtest/fixtures/sample-run/` — a hand-built run
  directory used as input.
- Modify: `package.json` — add `pnpm playtest:phase5-smoke`.

**Approach:**
- Sample fixture includes:
  - Seat logs for 3 seats with a mix of fires and suspicions.
  - A suspicion that matches a known-product-call → should produce a
    DUPLICATE-tagged issue.
  - A divergence from coverage.md → should produce a seed.
  - An orphan low-signal suspicion → should appear in low-signal bucket.
- Smoke runs Units 2-4 against fixture, asserts issue count matches
  expectation + statuses are correct.

**Patterns to follow:**
- Phase 3 Unit 8 smoke style.

**Test scenarios:**
- Happy path: fixture produces expected seed count + statuses.
- Edge case: empty fixture run dir → zero seeds, zero issues, INDEX
  still written.

**Verification:**
- `pnpm playtest:phase5-smoke` green.

- [ ] **Unit 6: Wire Phase 5 into orchestrator**

**Goal:** Connect the triage pipeline to the session lifecycle. After
Phase 3 + Phase 4 complete, orchestrator runs cluster → triage → index
automatically.

**Execution note:** Integration-first via Phase 6 calibration; unit-
test the sequencing glue with mocks.

**Requirements:** R7

**Dependencies:** Units 1-5; Phase 3 Unit 6 (orchestrator), Phase 4
Unit 4 (isolation audit).

**Files:**
- Modify: `scripts/playtest/lib/orchestrator.ts` — add post-session
  triage step.

**Approach:**
- After Phase 4's isolation audit, if `status === OK`, run cluster →
  launch triage → build index.
- If `status === ISOLATION_BREACH`, skip triage and flag in session.md
  ("triage skipped due to isolation breach").
- All failures are logged to session.md's end block.

**Patterns to follow:**
- Phase 3 Unit 6 orchestrator style.

**Test scenarios:**
- Happy path (mocked): cluster produces seeds → launcher spawns →
  index written.
- Edge case (mocked): isolation breach → triage skipped, session.md
  flags.
- Edge case (mocked): zero seeds → launcher skipped, index still written.

**Verification:**
- Orchestrator mock tests pass; Phase 6 calibration proves live
  behavior.

## System-Wide Impact

- **Interaction graph:** New subagent spawns (triage), one per seed.
  Reads from run dir + source tree. Writes to run dir issues/ only.
- **Error propagation:** Per-agent failures don't abort triage; each
  issue file either lands or is recorded as "triage failed" in INDEX.md.
- **State lifecycle risks:** Concurrent triage writes to disjoint paths
  (one per seed) — no collision possible if seedIds are unique, which
  Unit 2 guarantees by construction.
- **API surface parity:** Issue file format is a contract with Briggsy's
  review process. Changes to the format propagate into
  `E2E-ISSUE-LIST.md` harmonization.
- **Integration coverage:** Unit 5 smoke + Phase 6 calibration.
- **Unchanged invariants:** No server changes. No seat-agent changes.
  Existing issue tracker (`E2E-ISSUE-LIST.md`) is read-only from triage's
  perspective.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Triage agent misses a duplicate and files a new issue for a known item | D5 explicit duplicate check; Briggsy flags at promotion; clustering tuning in Phase 6. |
| Triage agent speculates root cause without reading the god-event log | Prompt required process mandates reading events.jsonl before diagnosis. |
| Triage agent writes code | Tool allowlist excludes Bash + file writes outside the issue path. Prompt says "no code." |
| Concurrent triage hits rate limits or context pressure | Acknowledged per PRD §9.6; revisit in Phase 6 if actually observed. |
| Seat log parser errors hide valuable signals | Phase 4 Unit 3 logs parse errors; clustering step surfaces those as a separate seed category ("unparseable signals for review"). |
| Duplicate detection threshold too strict → real new bugs tagged as duplicates | Low threshold for `candidateDuplicate`, but triage agent MUST still judge — the tag is a hint, not a verdict. |

## Documentation / Operational Notes

- `scripts/playtest/README.md` adds a "Triage agents" section.
- Briggsy's review process: after each session, review `issues/INDEX.md`
  and individual issue files; promote P0/P1 into `E2E-ISSUE-LIST.md` with
  a back-reference to the source run.

## Sources & References

- **Origin:** [docs/testing/PLAYTEST-HARNESS-PRD.md](../../testing/PLAYTEST-HARNESS-PRD.md)
- **Parent roadmap:** [docs/plans/playtest-harness/roadmap.md](./roadmap.md)
- **Phase 1 catalog + known-product-call tags:** [docs/plans/playtest-harness/phase-1-scenarios.md](./phase-1-scenarios.md)
- **Phase 3 god-event log + coverage report:** [docs/plans/playtest-harness/phase-3-harness-infra.md](./phase-3-harness-infra.md)
- **Phase 4 log schemas:** [docs/plans/playtest-harness/phase-4-seat-agents.md](./phase-4-seat-agents.md)
- **E2E issue tracker voice:** `docs/testing/E2E-ISSUE-LIST.md`
- **Adversarial swarm learnings:** `docs/insights/008-adversarial-swarm-review-maximum-overdrive.md`
- **Memory:** `feedback-wait-for-all-agents.md`, `feedback-sequential-thinking-always.md`
