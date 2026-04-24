---
title: "Playtest Harness — Phase 5: Triage Agent System"
type: feat
status: draft
date: 2026-04-23
absorbed: 2026-04-23
parent: docs/plans/playtest-harness/roadmap.md
origin: docs/testing/PLAYTEST-HARNESS-PRD.md
---

# Phase 5 — Triage Agent System

## Overview

After a playtest session produces seat logs, suspicion logs, a scrubbed
god-event `events.jsonl`, a WS-lifecycle `connections.jsonl`, and a
`coverage.md` report, a pool of triage agents consumes that output and
converts suspicious signals into diagnosed issues. Each triage agent takes
one issue seed (a cluster of related suspicions + log entries) and
produces a diagnosis + proposed fix paths — no code changes. Output lands
in `runs/<id>/issues/NNN-<slug>.md`, harmonized with
`docs/testing/E2E-ISSUE-LIST.md` voice, ready for Briggsy review +
promotion.

**Input surface (frozen by Phase 3 / Phase 4).** The triage pipeline
consumes the session directory at `docs/testing/playtest/runs/<session-id>/`:

- `server/events.jsonl` — scrubbed god-event stream. Each line is
  `{ type: 'god-event', action, events, stateVersion, nowMs,
  projections: Record<playerId, PlayerView>, boardView: BoardView,
  expectedViewerIds? }` (phase-3 Unit 1 `GodEvent`).
- `server/connections.jsonl` — WS lifecycle log. Each line is a
  `ConnectionEvent = { seatId, transition: 'disconnect' | 'reconnect',
  atStateVersion, atNowMs, reason: 'natural' | 'orchestrator-driven' }`
  (phase-3 Unit 1). **Triage treats `reason: 'orchestrator-driven'`
  transitions as harness-internal noise** and filters them out of
  any reconnect-class finding, the same way phase-3 Unit 9's tier-3
  matcher does.
- `seats/seat-N.log.md` + `suspicions/seat-N.suspicions.md` — per-seat
  markdown produced by the `playtest-seat` subagent (phase-4 Unit 1b).
  Each YAML entry carries one of **four** `entryType` values (phase-4
  D5): `scenario-fire`, `suspicion`, `vibe-check`, `ui-spec-divergence`
  (RENAMED from `info-gap-divergence` per phase-4 C4).
- `coverage.md` — 7×2 info-gap grid + absolute `firedCount >= 50`
  banner (phase-3 Unit 10).
- `session.md` — start + end blocks (phase-3 Unit 2).
- `_retention.log` — retention decisions (phase-3 Unit 3).
- `issues/` — pre-created empty. Phase 5 fills it.

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
- **R8 (phase-1 D1 / spec §8.7 Archer acceptance)** — Triage treats
  `entryType: 'vibe-check'` entries as first-class findings — equal
  weight to fire signatures per the spec §8.7 acceptance gate. A
  vibe-check with `feltLikeArcher: no | unsure` + prose rationale is a
  candidate product gap, surfaced in its own triage-output section (not
  collapsed into generic "suspicion"). See D11.
- **R9 (phase-1 Unit 5 Part G / phase-3 D12)** — Free-play issues
  receive looser duplicate-detection than scripted-scenario issues.
  Free-play has no fixed scenarios (`events: []` + `shape: contains`);
  clustering falls back to `card-type + event-type` + time windowing
  instead of scenario-ID equality. Free-play findings surface in a
  distinct triage-output section (see D12).
- **R10 (phase-1 D5 / phase-4 C4 / phase-3 D13)** — Triage consumes
  `ui-spec-divergence` entries (RENAMED from `info-gap-divergence` per
  phase-4 C4). **Phase 5 owns the Column-1-vs-Column-2 analytic
  distinction**: seat agents only see Column 2 from their phone (what
  they should see); phase-5 cross-references the god-event
  `projections[<viewerId>]` snapshot to infer Column-1-vs-Column-2
  divergences post-hoc. See D13.
- **R11 (phase-1 D4 / known-product-call contract)** — Triage has
  explicit Read access to `docs/testing/E2E-ISSUE-LIST.md` and checks
  every seed against the `known-product-call:` tags in the scenario
  catalog before emitting a new finding. Matches become
  `status: KNOWN-PRODUCT-CALL-CONFIRMED`, not new issues. See D5 / D17.
- **R12 (phase-4 D5 — four entryType values)** — Triage consumes all
  four seat-log entryTypes distinctly: `scenario-fire`, `suspicion`,
  `vibe-check`, `ui-spec-divergence`. Earlier phase-5 drafts assumed
  two; corrected here. See D14.
- **R13 (phase-4 D16 — role self-labelling drift)** — Triage compares
  each seat entry's `myRoleLabel` self-report against the
  detector-inferred role (from god-event `projections`, using the
  viewer-gate rules at `src/server/projection.ts`). Self-vs-detector
  role drift is a finding, not a silent correction. See D15.
- **R14 (insight 020 / phase-4 C1 custom-agent pattern)** — The triage
  subagent is defined via a custom `.claude/agents/playtest-triage.md`
  file with an explicit frontmatter `tools:` whitelist (**not**
  `subagent_type: 'general-purpose'`). See D16 / Unit 1b.

## Scope Boundaries

- **In scope:** Custom triage subagent file at
  `.claude/agents/playtest-triage.md` with frontmatter `tools:`
  whitelist (R14 / Unit 1b — mirrors phase-4 Unit 1b for
  `playtest-seat`). Triage agent prompt, input contract (seat logs
  covering all four `entryType` values + `events.jsonl` +
  `connections.jsonl` + `coverage.md` + source code read + existing
  issue tracker read at `docs/testing/E2E-ISSUE-LIST.md`), output
  schema, clustering step that converts raw signals (fires +
  suspicions + vibe-checks + ui-spec-divergences + coverage
  divergences + FireRecord `with-divergence` records + role-drift
  findings) into issue seeds, concurrency model, duplicate-detection
  against `E2E-ISSUE-LIST.md` + `SCENARIOS.md` `known-product-call`
  tags, Column-1-vs-Column-2 post-hoc analysis from god-event
  projections.
- **Out of scope:** Fix implementation. Session execution (Phase 3/4/6).
  Catalog authorship (Phase 1). Browser interaction (triage is
  post-hoc; no Playwright tools in the whitelist).

### Deferred to Separate Tasks

- **Auto-promotion into `E2E-ISSUE-LIST.md`.** Briggsy reviews and
  promotes manually. Future automation possible but out of v1.
- **Cross-session issue deduping.** v1 dedupes within a session against
  prior sessions' surviving issues; cross-session graph analytics
  (trend detection, "this bug keeps appearing") is future work.

## Context & Research

### Relevant Code and Patterns

- **Phase 4 log schemas** (`log-schema.ts`) — triage consumes all four
  `entryType` discriminants via the Phase 4 Zod parser:
  `ScenarioFireEntry`, `SuspicionEntry`, `VibeCheckEntry`,
  `UiSpecDivergenceEntry` (phase-4 D5 / Unit 3). The parser also emits
  parse-warnings for legacy `entryType: 'info-gap-divergence'` entries
  and coerces them to `ui-spec-divergence` (phase-4 C4 transition
  clause).
- **Phase 3 god-event log** — `server/events.jsonl`, one JSON object
  per line with the full `GodEvent` envelope (phase-3 Unit 1):
  `{ type: 'god-event', action, events, stateVersion, nowMs,
  projections: Record<playerId, PlayerView>, boardView: BoardView,
  expectedViewerIds? }`. The `projections` map is the durable source
  of truth triage uses for Column-1-vs-Column-2 analysis (R10).
- **Phase 3 connection log** — `server/connections.jsonl`. Each line a
  `ConnectionEvent` (phase-3 Unit 1). Triage filters by `reason`
  the same way phase-3 Unit 9 tier-3 matcher does.
- **Phase 3 coverage report** — `coverage.md` with the 7×2 grid + the
  absolute `firedCount >= 50` banner (phase-3 Unit 10). Triage reads
  `CoverageReport` fields: `firedCount`, `zeroCellCount`, `passed`,
  `gridCells`, `divergences`, `knownProductCalls`, `firedByViewport`,
  `freePlayAccounting`, `threshold: 50`.
- **Phase 3 FireRecord** — `{ scenarioId, seatId, firstEventIdx,
  tiers, matched: 'clean' | 'with-divergence' | 'no-fire',
  divergenceNotes? }` (phase-3 D9.1 / Unit 9). Each FireRecord with
  `matched === 'with-divergence'` is a **first-class issue seed**
  (the scenario fired but an oracle caught a bug — see D2 /
  clustering rule).
- **Phase 3 `ROW_DISPLAY_LABELS`** — literal prose for the 7 viewer
  roles. Triage cites these in issue files when referencing a role
  vantage or a ui-spec-divergence.
- **Phase 1 catalog** — scenario IDs with `known-product-call:` tags,
  `vibe-check:` prose, suspicion prompts, three-tier fire signatures,
  and the 7-row × 2-column info-gap table (phase-1 D1 / D3 / D5).
- `docs/testing/E2E-ISSUE-LIST.md` — voice, severity rubric, table
  formats. Output harmonizes with this. **Triage has explicit Read
  access** (R11 / Unit 1b `tools:` whitelist).
- `src/server/projection.ts` — triage agents need to understand
  player-vs-god projection (especially the viewer-gated
  `augmentNopeWindowForPlayer` at `projection.ts:165-183`, gated at
  `:174`) to diagnose information-asymmetry bugs and run
  Column-1-vs-Column-2 analysis.
- `src/server/game/engine.ts` — mechanics triage agents reference when
  diagnosing. The catalog's `inference:` fields cite function + line;
  triage uses those citations as entry points.
- **`~/.claude/agents/gsd-planner.md`** — reference pattern for the
  custom subagent file frontmatter (Unit 1b mirrors this shape the
  same way phase-4 Unit 1b mirrors it for `playtest-seat`).

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
- `docs/insights/020-claude-code-subagent-frontmatter-tools-whitelist.md`
  (referenced by phase-4 C1 / D2 / Unit 1b) — custom subagent files
  with explicit `tools:` whitelist are the correct mechanism for
  constraining what a subagent can call. Triage gets the same
  treatment: `.claude/agents/playtest-triage.md` declares its own
  narrower whitelist (Read + Write + Grep + Glob; **no Playwright
  MCP tools** — triage is post-hoc, no browser).

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
- **D4. Triage agents have a broader tool surface than seat agents, but
  no browser.** Read access to: source code (`src/` tree),
  `docs/testing/E2E-ISSUE-LIST.md` (R11), `docs/RULES-REFERENCE.md`,
  `docs/PRODUCT-SPECIFICATION.md`, the full run directory (all seat
  logs + suspicions + `server/events.jsonl` + `server/connections.jsonl`
  + `coverage.md`). Write access: the specific issue file for their
  seed, nothing else. **No Bash, no server control, no Playwright MCP
  tools, no `browser_evaluate`** — triage is post-hoc diagnosis, not
  live interaction. The `tools:` whitelist in
  `.claude/agents/playtest-triage.md` (Unit 1b) is the enforcement
  layer; the prompt is defense-in-depth.
- **D5. Duplicate detection is explicit, not implicit, and splits by
  match kind.** Triage agent MUST check its seed against
  `E2E-ISSUE-LIST.md` (R11) and the catalog's `known-product-call:`
  tags (phase-1 D4) before writing. Three terminal states:
  - `status: KNOWN-PRODUCT-CALL-CONFIRMED` — seed matches a
    `known-product-call:` tag on a catalog scenario (either ⏸
    BLOCKED or 🔴 OPEN-but-deliberately-unpatched per phase-1 D4).
    Record the link back to the catalog entry + `E2E-ISSUE-LIST.md`
    entry; no new diagnosis.
  - `status: DUPLICATE` — seed matches an existing
    `E2E-ISSUE-LIST.md` entry that is NOT pre-tagged on the catalog.
    Link + no new diagnosis.
  - `status: OPEN` — new finding. Full diagnosis + fix paths.
  Distinguishing "known product call confirmed" from "duplicate of an
  existing tracker entry" matters: the former is the harness doing
  its job (agents re-discovered a known-unfixed item, suppressed
  correctly); the latter is a tracker-redundancy signal.
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
- **D11. Vibe-check findings get their own triage-output section and
  are first-class (R8).** `VibeCheckEntry` records (phase-4 D5) with
  `feltLikeArcher: 'no' | 'unsure'` + prose rationale cluster into a
  dedicated "Vibe-check findings" section in the per-session
  `issues/INDEX.md`, separate from scenario-fire clusters and generic
  suspicion clusters. Rationale: the spec §8.7 Archer acceptance test
  is binary yes/no; a vibe-check `no` is a product-level gap, not
  engineering noise. Triage agents receive per-vibe-check seeds and
  diagnose against `docs/PRODUCT-SPECIFICATION.md` §2 Quality Bar +
  §3 Archer visual vocabulary rather than engine/protocol source.
  Severity rubric adaptation: a reproducible vibe-check `no` on a
  moment the spec explicitly calls out as load-bearing (e.g. named-
  steal reveal, burned→extracted drama sequence) is P1 by default;
  a vibe-check `unsure` is P2 unless it clusters with ≥2 other seats
  on the same scenario (then P1).
- **D12. Free-play clusters use a looser duplicate-detection
  threshold (R9).** Scripted-scenario clustering groups by
  `relatedScenario` + 30s time windows (D2). Free-play entries —
  identified by `relatedScenario: null` OR by the `freePlayMode: true`
  flag set during a free-play segment (phase-3 D12) — have no fixed
  scenario to cluster on. Free-play clustering rules:
  - Group by `card-type + event-type + seat-role` triple derived from
    the nearest preceding `card-played` event in `events.jsonl`.
  - Widen the time window to 60s (2x scripted).
  - Do NOT require a matching fire — free-play fires are not
    expected (phase-3 coverage reporter accounts for this in
    `freePlayAccounting`; phase-4 Risks row confirms this is by
    design).
  - Seed `relatedScenario` stays `null`; seedId slug is
    derived from `<card-type>-<event-type>-freeplay`.
  Free-play findings surface in a **distinct "Free-play findings"
  section in `issues/INDEX.md`**, separated from scripted-scenario
  findings. Phase 6 calibration tunes the 60s window and the triple
  if false-positive clusters appear.
- **D13. Phase 5 owns Column-1-vs-Column-2 analytic distinction
  (R10).** Seat agents, constrained to their phone view, can only
  describe Column 2 ("what I as the viewer should see") when logging
  a `ui-spec-divergence` entry. They cannot observe Column 1 ("what
  projection returns today") — that lives in the god-event stream.
  Triage is the cross-referencer:
  - For each `UiSpecDivergenceEntry`, load the god-event at the
    closest preceding `stateVersion` from `events.jsonl` and read
    `projections[<seatId>]` — that's Column 1 for this viewer.
  - Compare against the entry's `myRoleLabel` + the scenario
    catalog's Column 2 prose (the scenario's info-gap row for that
    role). Divergences between Column 1 and Column 2 are either
    projection bugs (triage emits an issue citing
    `src/server/projection.ts`) or product-spec drift (Column 2
    prose in the catalog is wrong — triage emits an issue flagging
    the catalog entry for Briggsy review).
  - The scenario-level 7×2 context from the catalog (phase-1 D5)
    enriches every divergence: triage cites which row (via
    `ROW_DISPLAY_LABELS` literal) + which column + the specific
    source (`projection.ts:<line>` for Column 1,
    `RULES-REFERENCE.md` / `PRODUCT-SPECIFICATION.md` for
    Column 2).
- **D14. Four entryType values consumed distinctly (R12).** Triage
  input contract enumerates the four entry types (phase-4 D5) and
  produces seeds that are type-aware:
  - `scenario-fire` — clusters with matching FireRecords from
    `coverage.md`; self-vs-detector divergence is a seed.
  - `suspicion` — low-friction signals; cluster per D2 rules.
  - `vibe-check` — its own section per D11.
  - `ui-spec-divergence` — its own section per D13.
  Triage agent prompt (Unit 1) enumerates all four with their
  handling rules; earlier draft assumed two (`scenario-fire` +
  `suspicion`) and must be corrected.
- **D15. Role-drift detection is a first-class finding (R13 / phase-4
  D16).** For every seat entry carrying a `myRoleLabel`, triage
  compares the self-label against the detector-inferred role from
  the god-event `projections` + action taxonomy at the relevant
  `stateVersion`:
  - ACTOR ↔ god-event's `action.playerId`.
  - TARGET ↔ event's `targetId` / `namedSteal.targetId` /
    `favorTarget` / etc.
  - SPECTATOR ↔ `player.isAlive === false` AND `isConnected === true`.
  - DISCONNECTED ↔ `player.isConnected === false`.
  - OTHER (alive) ↔ none of the above.
  When self-label ≠ detector-inferred role, triage emits a
  `status: OPEN` issue with the drift as the finding, quoting the
  seat entry and god-event side by side. Drift is a signal the UI
  did not make the player's role clear — which is exactly what
  phase-4 D16's acknowledgment calls out. This is NOT a silent
  correction; triage does NOT rewrite the seat entry.
- **D16. Triage subagent defined via `.claude/agents/playtest-triage.md`
  with explicit `tools:` whitelist (R14).** Mirrors phase-4 Unit 1b's
  pattern for `playtest-seat`. Frontmatter whitelist: `Read`, `Write`,
  `Grep`, `Glob`, and `mcp__sequential-thinking__sequentialthinking`
  (D9). **Explicitly excludes**: all `mcp__playwright__*` tools, all
  `browser_*` tools, `Bash`, and any tool that could dispatch
  engine actions. The launcher spawns with `subagent_type:
  'playtest-triage'`, NOT `'general-purpose'`. Unit 1b creates the
  file; Unit 5 integration test verifies the whitelist holds
  (attempt `browser_snapshot` → refusal at boundary).
- **D17. `FireRecord.matched === 'with-divergence'` is a first-class
  seed signal (phase-3 D9.1 / Unit 9).** A FireRecord with
  `matched: 'with-divergence'` means tier-1 events fired (scenario
  triggered) AND at least one tier-2 projection-assertion or tier-3
  connection-event oracle failed. Triage emits an issue per such
  record — the scenario fired but something was wrong. Clustering
  attaches any adjacent seat-log entries (same scenarioId, same
  seat, within time window) as `sourceSignals` on the seed. This
  closes the loop with phase-3's coverage rule that counts
  `'with-divergence'` toward `firedCount` (rather than gaming the
  fire count down when the oracle catches a bug).

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
Phase 3: coverage-reporter writes coverage.md (incl. divergences,
         FireRecord matched='with-divergence' notes, firedCount,
         zeroCellCount, freePlayAccounting)
Phase 4: log-schema validator validates seat logs (all four
         entryType values: scenario-fire, suspicion, vibe-check,
         ui-spec-divergence)
Phase 4: isolation-audit validates write scopes
    │
    ▼
Phase 5: cluster-suspicions.ts
  Inputs: all seat logs + suspicion logs (four entryTypes) +
          coverage report (fires + divergences + with-divergence
          FireRecords) + connections.jsonl (role-drift inference
          input) + events.jsonl (Column 1 source for R10 /
          role-drift inference for R13) + known-product-call map
          (from SCENARIOS.md) + existing E2E-ISSUE-LIST.md
  Output: IssueSeed[] — each seed is a cluster of related signals
          annotated with duplicate matches (if any), seed kind
          (scripted / free-play / vibe-check / ui-spec-divergence /
          role-drift / with-divergence-fire), and Column-1-vs-2
          context for ui-spec-divergence seeds.
    │
    ▼
Phase 5: launchTriageAgents(seeds, runDir, shutdownSignal)
  Parallel Agent spawns via subagent_type: 'playtest-triage' (NOT
  'general-purpose'), one per seed, each with the triage prompt
  + seed-kind-specific handling cues. Each agent writes exactly
  one issue file: issues/NNN-<slug>.md. `tools:` whitelist from
  .claude/agents/playtest-triage.md (Unit 1b) constrains to
  Read / Write / Grep / Glob / sequential-thinking.
    │
    ▼
Wait for all agents (Promise.all).
    │
    ▼
Phase 5: build-issue-index.ts
  Walk issues/*.md, write issues/INDEX.md with counts by
  status/severity AND distinct sections per seed kind:
  Scripted-scenario findings, Free-play findings (R9 / D12),
  Vibe-check findings (R8 / D11), UI-spec-divergence findings
  (R10 / D13), Role-drift findings (R13 / D15),
  With-divergence fires (D17), Known product calls confirmed
  (R11 / D5).
    │
    ▼
session.md end block appends final issue counts + coverage summary.
```

### Issue seed shape

```ts
// scripts/playtest/lib/types.ts (additive)
type SeedKind =
  | 'scripted-scenario'      // scripted fire or scenario-tagged suspicion
  | 'free-play'              // relatedScenario: null OR freePlayMode: true (R9 / D12)
  | 'vibe-check'             // VibeCheckEntry cluster (R8 / D11)
  | 'ui-spec-divergence'     // UiSpecDivergenceEntry cluster (R10 / D13)
  | 'role-drift'             // self-label ≠ detector-inferred role (R13 / D15)
  | 'with-divergence-fire'   // FireRecord matched='with-divergence' (D17)
  | 'coverage-divergence'    // self-vs-detector divergence from coverage.md

interface IssueSeed {
  seedId: string                // NNN-<slug>, deterministic
  kind: SeedKind                // drives prompt specialization (D14)
  sourceSignals: SignalRef[]    // refs into seat logs + coverage + events.jsonl
  candidateDuplicate?: {
    kind: 'E2E-ISSUE' | 'KNOWN-PRODUCT-CALL'  // maps to D5 terminal status
    id: string                  // e.g. 'E-01', 'C-15', or a catalog SCN-ID
  }
  seatsInvolved: string[]       // ['seat-3', 'seat-7']
  scenarioIds: string[]         // scenarios referenced in the cluster (may be [] for free-play)
  suspicionSeverityHint: 'low' | 'medium' | 'high'
  timeWindow: { fromMs: number, toMs: number }
  // For ui-spec-divergence seeds (D13): Column 1 context pulled from
  // god-event at closest stateVersion.
  columnContext?: {
    viewerRole: ViewerRole                // phase-3 Unit 1 ViewerRole enum
    viewerRoleLabel: string               // ROW_DISPLAY_LABELS[viewerRole]
    column1Source: string                 // e.g. 'projection.ts:174'
    column1Value: unknown                 // snapshot of the field at issue
    column2Source: string                 // 'RULES-REFERENCE.md' | 'PRODUCT-SPECIFICATION.md'
    column2Prose: string                  // from catalog scenario's info-gap row
  }
  // For role-drift seeds (D15): the drift metadata.
  roleDrift?: {
    selfLabel: string                     // agent's myRoleLabel (ROW_DISPLAY_LABELS literal)
    detectorLabel: string                 // inferred from god-event
    atStateVersion: number
  }
  // For with-divergence-fire seeds (D17): the tier that failed.
  fireDivergence?: {
    scenarioId: string
    failedTier: 'projectionAsserts' | 'connectionEvents' | 'ui'
    notes: string                         // from FireRecord.divergenceNotes
  }
  // For free-play seeds (D12): loose-clustering fingerprint.
  freePlayFingerprint?: {
    cardType: string                      // from nearest card-played event
    eventType: string
    seatRole: string                      // ROW_DISPLAY_LABELS literal
  }
}
```

### Issue file template

```markdown
# NNN-<slug> — <one-line title>

**Severity (triage):** P0 | P1 | P2
**Status:** 🔴 OPEN | ⏸ BLOCKED (awaiting Briggsy) | 🏷 DUPLICATE | ✅ KNOWN-PRODUCT-CALL-CONFIRMED
**Seed kind:** scripted-scenario | free-play | vibe-check | ui-spec-divergence | role-drift | with-divergence-fire | coverage-divergence
**Source seats:** seat-3, seat-7
**Linked scenarios:** SCN-NAMED-STEAL-INTERCEPT-01
**Viewer role (if ui-spec-divergence):** TARGET  *(literal ROW_DISPLAY_LABELS value)*
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
rationale, ≥2 fix options unless truly one-path-only. Prompt branches
on `{{SEED_KIND}}` (D14) to handle all four seat-log `entryType`
values + the four cross-sourced seed kinds (with-divergence-fire,
role-drift, ui-spec-divergence, coverage-divergence) distinctly.

**Execution note:** Prose artifact. Unit 5 integration-tests it.

**Requirements:** R1, R2, R4, R5, R8, R9, R10, R11, R12, R13, R14

**Dependencies:** Phase 4 log schema (Unit 3), Phase 3 coverage
reporter (Unit 10), Phase 1 catalog, Unit 1b (custom agent file).

**Files:**
- Create: `scripts/playtest/agents/triage.md`.

**Approach:**
- Placeholders: `{{SEED_ID}}`, `{{SEED_KIND}}`, `{{SEED_SIGNALS}}`,
  `{{SEATS_INVOLVED}}`, `{{SCENARIO_IDS}}`, `{{RUN_DIR}}`,
  `{{CANDIDATE_DUPLICATE}}`, `{{ISSUE_PATH}}`, `{{COLUMN_CONTEXT}}`
  (populated for `ui-spec-divergence` seeds per D13),
  `{{ROLE_DRIFT_CONTEXT}}` (populated for `role-drift` seeds per D15),
  `{{FIRE_DIVERGENCE_CONTEXT}}` (populated for `with-divergence-fire`
  seeds per D17).
- Sections: mandate, inputs available, **seed-kind handling cues
  (one paragraph per SeedKind from the IssueSeed type)**, required
  process (duplicate check including explicit Read of
  `docs/testing/E2E-ISSUE-LIST.md` per R11 / D5, then player-POV
  read → god-mode read from `events.jsonl` →
  Column-1-vs-Column-2 analysis if `ui-spec-divergence` →
  role-drift comparison if `role-drift` → tier-specific
  diagnosis if `with-divergence-fire` → fix paths), tool
  allowlist reminder (Read / Write / Grep / Glob /
  sequential-thinking — NOT Playwright), output format,
  anti-patterns.
- Mandate example: "You are a triage agent. You take one issue seed and
  produce one diagnosed issue file. You do not write code. You do not
  implement fixes. You propose 1-3 fix paths with tradeoffs and stop."
- **Vibe-check handling (D11).** For seeds with `kind: 'vibe-check'`,
  diagnose against `docs/PRODUCT-SPECIFICATION.md` §2 Quality Bar +
  §3 Archer visual vocabulary, NOT engine/protocol source. Severity
  rubric per D11.
- **Free-play handling (D12).** For seeds with `kind: 'free-play'`,
  note the looser cluster (no exact scenario ID). Focus diagnosis on
  "is this a novel variant worth cataloguing?" in addition to
  "is this a bug?"; triage-output may recommend Phase 1 catalog
  update.
- **Known-product-call terminal state (R11 / D5).** If duplicate
  check matches a `known-product-call:` tag OR an
  `E2E-ISSUE-LIST.md` entry, terminate with the correct status
  (`KNOWN-PRODUCT-CALL-CONFIRMED` or `DUPLICATE`, per D5). No full
  diagnosis required for those terminal states.
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
- Prompt enumerates all four `entryType` values (phase-4 D5) in
  its "inputs available" section.
- Prompt references `ui-spec-divergence` (not
  `info-gap-divergence`) throughout.
- Prompt's duplicate-check step explicitly reads
  `docs/testing/E2E-ISSUE-LIST.md` AND scans catalog
  `known-product-call:` tags.
- Prompt does NOT mention any `mcp__playwright__*` tool.

- [ ] **Unit 1b: Custom subagent file — `.claude/agents/playtest-triage.md` (R14 / D16)**

**Goal:** Create the custom agent file that defines the
`playtest-triage` subagent type. Mirrors phase-4 Unit 1b's pattern
for `playtest-seat`. This is THE enforcement layer (R14 / D16) —
Claude Code consults the frontmatter `tools:` whitelist before
routing any tool call a triage agent makes.

**Execution note:** Prose + frontmatter artifact. No code tests;
Unit 5 integration test exercises it by proving a triage agent
cannot call `browser_snapshot` (Claude Code rejects at boundary;
log shows the refusal). Mirrors phase-4 Unit 1b's contract test.

**Requirements:** R14

**Dependencies:** Unit 1 prompt (body references the orchestrator-
supplied per-spawn prompt).

**Files:**
- Create: `.claude/agents/playtest-triage.md`.

**Approach:**
- Frontmatter block (YAML):
  ```yaml
  ---
  name: playtest-triage
  description: >
    Diagnoses one playtest-harness issue seed and writes one issue
    file (runs/<id>/issues/NNN-<slug>.md). Receives a filled system
    prompt from the orchestrator (seed-kind-aware per phase-5 D14).
    Reads session artifacts, source tree, E2E-ISSUE-LIST.md, and
    RULES-REFERENCE.md. Proposes 1-3 fix paths with tradeoffs; does
    not implement. Strictly confined to Read / Write / Grep / Glob +
    Sequential Thinking.
  model: sonnet
  tools: Read, Write, Grep, Glob, mcp__sequential-thinking__sequentialthinking
  ---
  ```
  Calibrate the exact tool names at implementation time. Every
  tool is NAMED — no `mcp__*` wildcard. Adding a tool requires
  editing this file (reviewable under version control).
- **Exclusions verified at implementation time.** The whitelist
  MUST NOT contain: any `mcp__playwright__*` tool, `browser_*`
  tools, `Bash`, `WebFetch`, or any tool that could dispatch
  engine actions / spawn subprocesses / touch the network. Triage
  is post-hoc diagnosis only.
- Body: stub body referencing the per-spawn system prompt from the
  launcher — same pattern as phase-4 Unit 1b option (a).
- Audit-on-edit: file listed in `scripts/playtest/README.md` as a
  security-sensitive surface. Any change to the `tools:` list
  lands with an explicit commit message and is reviewable.

**Patterns to follow:**
- `.claude/agents/playtest-seat.md` (phase-4 Unit 1b) — direct
  structural sibling.
- `~/.claude/agents/gsd-planner.md` — reference frontmatter + body
  shape.

**Test scenarios:**
- Happy path: a smoke test (Unit 5) spawns a `playtest-triage`
  subagent and asserts it can call `Read` + `Write` on the issue
  path (observable by the written issue file).
- Isolation: the smoke test's subagent attempts
  `mcp__playwright__browser_snapshot` via a prompt that tries to
  trick it into the call; Claude Code refuses at boundary; smoke
  logs the refusal as an expected audit entry.
- Regression: `.claude/agents/playtest-triage.md`'s frontmatter
  `tools:` line does NOT contain any banned name (grep-asserted
  in the same `scripts/playtest/scripts/check-agent-file.sh`
  lint/pre-commit check phase-4 Unit 1b establishes).

**Verification:**
- File exists; `subagent_type: 'playtest-triage'` resolves.
- Unit 5 smoke demonstrates the contract (Playwright refusal,
  Read/Write success).

- [ ] **Unit 2: `cluster-suspicions.ts` — raw signals → IssueSeed[]**

**Goal:** Deterministic clustering of all four seat-log `entryType`
values + coverage divergences + `with-divergence` FireRecords +
role-drift + Column-1-vs-Column-2 divergences into typed seeds.

**Execution note:** Test-first. This is the signal-to-noise gate; test
heavily.

**Requirements:** R4, R5, R8, R9, R10, R11, R12, R13, R17 (D17
with-divergence)

**Dependencies:** Phase 4 Unit 3 log parser (four-entryType schema),
Phase 3 Unit 9 scenario-detector (FireRecord), Phase 3 Unit 10
coverage reporter output (CoverageReport), Phase 3 Unit 4b scrubber
(events.jsonl shape), Phase 3 Unit 1 types module
(ViewerRole + ROW_DISPLAY_LABELS).

**Files:**
- Create: `scripts/playtest/lib/cluster-suspicions.ts`.
- Create: `scripts/playtest/lib/cluster-suspicions.test.ts`.

**Approach:**
- Inputs:
  - parsed seat logs (all four entryTypes, discriminated-union
    `ScenarioFireEntry | SuspicionEntry | VibeCheckEntry |
    UiSpecDivergenceEntry`);
  - parsed suspicion logs (same schema — separate file per seat);
  - `CoverageReport` from Phase 3 Unit 10: `firedCount`,
    `zeroCellCount`, `passed`, `gridCells`, `divergences`
    (including `column-1-vs-2` kind), `knownProductCalls`,
    `firedByViewport`, `freePlayAccounting`, `threshold: 50`;
  - `FireRecord[]` from Phase 3 Unit 9, filtering those with
    `matched === 'with-divergence'` for D17 seeds;
  - `events.jsonl` — consumed per-ui-spec-divergence seed to
    extract Column 1 snapshot (D13) and per-role-drift seed to
    infer detector role (D15);
  - `connections.jsonl` — consumed for axis-13 / disconnect-class
    seeds; FILTER entries by `reason === 'natural'` (mirror
    phase-3 Unit 9 tier-3 filter);
  - catalog's `known-product-call:` map (phase-1 D4); both
    ⏸ BLOCKED and 🔴 OPEN-but-deliberate are in scope per D4;
  - existing `E2E-ISSUE-LIST.md` parsed minimally
    (title + severity + id + tag + status).
- Output: `IssueSeed[]` with every seed carrying a `kind:
  SeedKind` per the HTD type.
- Clustering rules (seed-kind-aware):
  1. **`scripted-scenario` seeds** — group `ScenarioFireEntry` +
     `SuspicionEntry` with non-null `relatedScenario` by scenario
     ID, then sub-group by 30s time windows.
  2. **`free-play` seeds (R9 / D12)** — entries with
     `relatedScenario === null` OR from a free-play segment
     window (marked by orchestrator). Cluster by
     `(cardType, eventType, seatRole)` triple sourced from the
     nearest preceding `card-played` in `events.jsonl`, within
     60s windows. Free-play seeds never have
     `scenarioIds` populated; `freePlayFingerprint` IS populated.
  3. **`vibe-check` seeds (R8 / D11)** — `VibeCheckEntry` with
     `feltLikeArcher: 'no' | 'unsure'` + prose. One seed per
     entry by default; merge duplicates across seats on the same
     scenario within 60s.
  4. **`ui-spec-divergence` seeds (R10 / D13)** — one per
     `UiSpecDivergenceEntry`. Enrich with `columnContext` by
     loading the closest preceding god-event from `events.jsonl`
     and reading `projections[<seatId>]`; look up the scenario's
     info-gap row + `ROW_DISPLAY_LABELS[myRoleLabel]` for
     Column 2 prose from the catalog. If
     `columnContext.column1Value` does not match
     `column2Prose` intent, flag in `notes` for triage
     attention.
  5. **`role-drift` seeds (R13 / D15)** — for every seat entry
     with a `myRoleLabel`, compute detector-inferred role from
     the matching god-event. Drift ⇒ seed with `roleDrift`
     populated. Drift seeds can coexist with other seeds (a
     `ui-spec-divergence` by a seat that also mislabelled its
     role is two seeds, not one — intentional, to keep signals
     separate).
  6. **`with-divergence-fire` seeds (D17)** — one per FireRecord
     with `matched === 'with-divergence'`. Attach adjacent seat
     entries as `sourceSignals` (same scenarioId + seat + 30s
     window). `fireDivergence` populated with `failedTier` +
     `notes`.
  7. **`coverage-divergence` seeds** — from
     `CoverageReport.divergences` with kind
     `'self-without-detector'` or `'detector-without-self'`.
     `column-1-vs-2` coverage divergences map to
     `ui-spec-divergence` kind (already surfaced by rule 4).
  8. **Duplicate tagging.** For every seed, walk the
     known-product-call map + `E2E-ISSUE-LIST.md` and populate
     `candidateDuplicate` on match. Matching rules:
     - `KNOWN-PRODUCT-CALL`: seed's scenarioIds OR nearest
       scenario (for free-play, nearest catalog scenario with
       same `cardType`) carries a `known-product-call:` tag.
     - `E2E-ISSUE`: title keyword overlap exceeds a threshold
       (simple keyword-based match; tunable in Phase 6).
  9. **SeedId assignment.** `NNN-<slug>` deterministic; NNN
     ordered by timestamp of first signal. Slug from scenarioId
     (scripted) or `<cardType>-<eventType>-freeplay` (free-play)
     or `<entryType>-<scenarioId or seatId>` (other kinds).
  10. **Single-signal noise.** A single low-severity suspicion
      with no matching fire or divergence goes to a "low-signal"
      bucket — NOT dropped; flagged for Briggsy to choose
      whether to triage.

**Patterns to follow:**
- Pure function style; exhaustive unit tests via fixture inputs.
- Phase 4 Unit 3 parse-warning style for legacy-rename coercion
  (though `cluster-suspicions` consumes parsed entries; the
  warning surface is Phase 4's).

**Test scenarios:**
- Happy path: 5 suspicions across 2 scenarios at distinct time windows
  → 2 `scripted-scenario` seeds.
- Happy path: 3 suspicions same scenario within 30s → 1 seed with 3
  source signals.
- Happy path: 4 vibe-check entries (2× `no`, 1× `unsure`, 1× `yes`)
  → 3 `vibe-check` seeds (`yes` entries ignored per D11 — only
  `no`/`unsure` become seeds).
- Happy path: 1 `ui-spec-divergence` entry + a god-event
  snapshot available → `columnContext` populated with
  `ROW_DISPLAY_LABELS` literal + projection.ts line citation.
- Happy path: 2 FireRecords `matched='with-divergence'` →
  2 `with-divergence-fire` seeds with `fireDivergence` populated.
- Happy path: free-play suspicion with `relatedScenario: null` →
  `free-play` seed; `freePlayFingerprint` populated from nearest
  preceding `card-played`.
- Happy path: seat entry `myRoleLabel: 'TARGET'` but detector
  infers role is `OTHER (alive)` → `role-drift` seed.
- Edge case: suspicion tagged to known-product-call → seed has
  `candidateDuplicate = { kind: 'KNOWN-PRODUCT-CALL', id: ... }`.
- Edge case: coverage divergence with no matching suspicion → seed
  `kind: 'coverage-divergence'` includes the divergence alone.
- Edge case: single low-severity suspicion, no other signals → goes to
  low-signal bucket, still produces a seed file but flagged.
- Edge case: suspicion with `relatedScenario: null` but inside a
  scripted segment → clustered under `free-play` kind only if
  the segment flag was free-play; otherwise under the nearest
  scripted scenario by time.
- Edge case: `connections.jsonl` entry with
  `reason: 'orchestrator-driven'` → IGNORED by clustering (do
  not create a disconnect-class seed).
- Error path: malformed log entries → skipped with warnings, not fatal.

**Verification:**
- All tests pass; deterministic seed ids.
- Every `SeedKind` value in the `IssueSeed` union has ≥1 happy-path
  test.
- `candidateDuplicate.kind` correctly splits `KNOWN-PRODUCT-CALL`
  from `E2E-ISSUE` (two distinct code paths, two distinct tests).

- [ ] **Unit 3: `triage-launcher.ts` — spawn one `playtest-triage` subagent per seed**

**Goal:** Convert `IssueSeed[]` into concurrent triage-agent spawns
via `subagent_type: 'playtest-triage'` (D16 / R14); wait for all; no
rolling synthesis.

**Execution note:** Test-first on input serialization; integration-tested
via Unit 5.

**Requirements:** R1, R3, R7, R14

**Dependencies:** Unit 1 (prompt), Unit 1b (custom agent file),
Unit 2 (seeds).

**Files:**
- Create: `scripts/playtest/lib/triage-launcher.ts`.
- Create: `scripts/playtest/lib/triage-launcher.test.ts`.

**Approach:**
- `buildTriagePrompt(seed, runDir, template): string` — fills
  placeholders, including a serialization of `seed.sourceSignals` as
  log-path + line references so the agent can read them. Seed-kind-
  aware placeholder expansion (D14):
  - `ui-spec-divergence`: populate `{{COLUMN_CONTEXT}}` from
    `seed.columnContext` (including the literal
    `ROW_DISPLAY_LABELS[seed.columnContext.viewerRole]` string).
  - `role-drift`: populate `{{ROLE_DRIFT_CONTEXT}}` from
    `seed.roleDrift`.
  - `with-divergence-fire`: populate
    `{{FIRE_DIVERGENCE_CONTEXT}}` from `seed.fireDivergence`.
- `launchTriageAgents(seeds, runDir, promptTemplate): Promise<TriageResult[]>`:
  - `Promise.all(seeds.map(seed => Agent({...})))`.
  - **Tool constraint:** `subagent_type: 'playtest-triage'`. NEVER
    `'general-purpose'` — enforce via assertion in test (mirrors
    phase-4 Unit 2 regression). The actual `tools:` whitelist
    lives in `.claude/agents/playtest-triage.md` (Unit 1b).
  - Result includes agent id, issue path, seed kind, exit status.
- No rolling reduction; orchestrator waits for all.

**Patterns to follow:**
- Phase 4 Unit 2 launcher (direct structural sibling — same
  subagent_type + tool-whitelist contract, same spawn topology).

**Test scenarios:**
- Happy path: 3 seeds → 3 prompts fully rendered;
  `subagent_type === 'playtest-triage'` on every call.
- Edge case: seed with `candidateDuplicate` → prompt surfaces it
  explicitly (so agent runs the duplicate check first).
- Edge case: `ui-spec-divergence` seed → prompt includes literal
  `ROW_DISPLAY_LABELS[viewerRole]` string in the
  `{{COLUMN_CONTEXT}}` block.
- Edge case: `role-drift` seed → prompt includes both selfLabel
  and detectorLabel as `ROW_DISPLAY_LABELS` literal strings.
- Edge case: `with-divergence-fire` seed → prompt names the failed
  tier (`projectionAsserts` / `connectionEvents` / `ui`) from
  `fireDivergence.failedTier`.
- Edge case: low-signal seed → prompt flags "low signal; triage may
  conclude no bug."
- Edge case: vibe-check seed → prompt directs triage to
  `docs/PRODUCT-SPECIFICATION.md` §2 / §3 rather than
  engine source.
- Regression: assertion that every spawn uses
  `subagent_type: 'playtest-triage'`; any `'general-purpose'`
  spawn throws.
- Error path: seed missing required fields → throws before spawn.

**Verification:**
- Unit tests pass.
- Regression test for `subagent_type` enforcement passes.

- [ ] **Unit 4: `build-issue-index.ts` — walk issues/ and write INDEX.md with sections per SeedKind**

**Goal:** Deterministic post-triage index with distinct sections per
`SeedKind` (D11 vibe-check, D12 free-play, D13
ui-spec-divergence, D15 role-drift, D17 with-divergence-fire,
scripted-scenario, coverage-divergence, known-product-calls
confirmed).

**Execution note:** Test-first.

**Requirements:** R2, R6, R8, R9, R10, R11, R12, R13, R17

**Dependencies:** Unit 3 writes issue files.

**Files:**
- Create: `scripts/playtest/lib/build-issue-index.ts`.
- Create: `scripts/playtest/lib/build-issue-index.test.ts`.

**Approach:**
- Walk `runs/<id>/issues/NNN-*.md`.
- Parse frontmatter / header block from each, including the new
  `Seed kind:` header and the `Status:` terminal values
  (`OPEN`, `BLOCKED`, `DUPLICATE`, `KNOWN-PRODUCT-CALL-CONFIRMED`).
- Group by `seed kind`, then by severity + status within each kind.
- Render `issues/INDEX.md` with the following ordered sections:
  1. **Summary counts** — total issues, broken down by status
     (OPEN / BLOCKED / DUPLICATE / KNOWN-PRODUCT-CALL-CONFIRMED)
     and severity (P0 / P1 / P2).
  2. **Scripted-scenario findings** — sortable table of `kind:
     'scripted-scenario'` issues.
  3. **Free-play findings (D12)** — distinct section for `kind:
     'free-play'` issues, noting that free-play has looser
     clustering.
  4. **Vibe-check findings (D11)** — distinct section for `kind:
     'vibe-check'` issues; these are spec-level findings, not
     engine bugs.
  5. **UI-spec-divergence findings (D13)** — distinct section for
     `kind: 'ui-spec-divergence'` issues with the viewer role
     column (ROW_DISPLAY_LABELS literal).
  6. **Role-drift findings (D15)** — distinct section for `kind:
     'role-drift'` issues, pairing selfLabel ↔ detectorLabel.
  7. **With-divergence fires (D17)** — distinct section for `kind:
     'with-divergence-fire'` issues with the failed tier column.
  8. **Coverage divergences** — `kind: 'coverage-divergence'`
     issues.
  9. **Known-product-calls confirmed (R11 / D5)** — all
     `KNOWN-PRODUCT-CALL-CONFIRMED` status issues. Surfaced
     separately so Briggsy can quickly scan "harness suppressed
     the right things."
- Every table includes id, title, severity, status, linked
  scenarios, candidate duplicate.
- Append summary line to `session.md` end block including counts
  per seed kind.

**Patterns to follow:**
- `E2E-ISSUE-LIST.md` table format + severity legend.

**Test scenarios:**
- Happy path: 3 issue files with varied statuses + mixed seed kinds
  → correct counts + section tables (one row in each section).
- Happy path: 1 vibe-check + 2 scripted-scenario + 1
  with-divergence-fire issue → three sections populated, others
  render "none this session."
- Edge case: 0 issues → INDEX.md still written with "No findings."
  body (all sections say "none").
- Edge case: issue file missing required header → listed with a
  warning row; does not crash.
- Edge case: all issues are `KNOWN-PRODUCT-CALL-CONFIRMED` →
  Known-product-calls section has rows, other sections render
  "none this session."

**Verification:**
- Unit tests pass; INDEX.md opens cleanly.
- All seed-kind sections render deterministically.

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
  - Seat logs for 3 seats with a mix of all four `entryType`
    values: `scenario-fire`, `suspicion`, `vibe-check`,
    `ui-spec-divergence`. Plus a legacy
    `entryType: 'info-gap-divergence'` entry to prove the C4
    rename coercion is triage-safe.
  - A suspicion that matches a `known-product-call:` tag →
    should produce a `KNOWN-PRODUCT-CALL-CONFIRMED`-tagged issue.
  - A suspicion that matches an `E2E-ISSUE-LIST.md` title keyword
    → should produce a `DUPLICATE`-tagged issue (distinct
    terminal state from KNOWN-PRODUCT-CALL per D5).
  - A coverage divergence from `coverage.md` → should produce a
    `coverage-divergence` seed.
  - A FireRecord with `matched: 'with-divergence'` → should
    produce a `with-divergence-fire` seed.
  - A vibe-check entry with `feltLikeArcher: 'no'` → should
    produce a `vibe-check` seed rendered in the vibe-check
    section.
  - A free-play suspicion (`relatedScenario: null` inside a
    free-play segment) → should produce a `free-play` seed with
    `freePlayFingerprint`.
  - A seat entry with `myRoleLabel: 'TARGET'` whose god-event
    shows the action was addressed to a different seat → should
    produce a `role-drift` seed.
  - A `UiSpecDivergenceEntry` → should produce a
    `ui-spec-divergence` seed with `columnContext` populated.
  - An orphan low-signal suspicion → should appear in low-signal
    bucket.
  - A `connections.jsonl` entry with `reason:
    'orchestrator-driven'` → should NOT produce a seed.
- Smoke runs Units 2-4 against fixture, asserts issue count matches
  expectation + statuses + seed-kind sections are correct.
- Sub-test: spawn one `playtest-triage` subagent against a single
  seed from the fixture, assert it can Read session artifacts + Write
  the issue file, assert it REFUSES a `browser_snapshot` call
  (contract-test equivalent from Unit 1b).

**Patterns to follow:**
- Phase 3 Unit 8 smoke style.
- Phase 4 Unit 5 smoke style for subagent contract tests.

**Test scenarios:**
- Happy path: fixture produces expected seed count + statuses + all
  seven seed-kind sections render in INDEX.md.
- Happy path: the `playtest-triage` subagent writes a
  well-formed issue file and refuses Playwright calls.
- Edge case: empty fixture run dir → zero seeds, zero issues, INDEX
  still written (all sections "none this session").
- Regression: `subagent_type: 'general-purpose'` never appears in
  any spawn log.
- Regression: grep the rendered prompts for `info-gap-divergence` →
  zero hits (proves C4 rename carried through).

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

- **Interaction graph:** New custom subagent type `playtest-triage`
  defined via `.claude/agents/playtest-triage.md` (R14 / D16 / Unit 1b).
  One subagent spawn per seed via `subagent_type: 'playtest-triage'`.
  Reads from run dir + source tree + `docs/testing/E2E-ISSUE-LIST.md`
  + `docs/RULES-REFERENCE.md` + `docs/PRODUCT-SPECIFICATION.md`.
  Writes to run dir `issues/` only.
- **Error propagation:** Per-agent failures don't abort triage; each
  issue file either lands or is recorded as "triage failed" in INDEX.md.
- **State lifecycle risks:** Concurrent triage writes to disjoint paths
  (one per seed) — no collision possible if seedIds are unique, which
  Unit 2 guarantees by construction.
- **API surface parity:** Issue file format is a contract with Briggsy's
  review process. Changes to the format propagate into
  `E2E-ISSUE-LIST.md` harmonization. The seven-section INDEX.md layout
  (D11/D12/D13/D15/D17 + scripted + coverage-divergence +
  known-product-calls-confirmed) is itself a contract for Briggsy's
  review ergonomics.
- **Upstream contracts consumed (absorbed 2026-04-23):**
  - Phase 4 D5 four-entryType schema (`scenario-fire`, `suspicion`,
    `vibe-check`, `ui-spec-divergence`).
  - Phase 4 C4 rename (`info-gap-divergence` → `ui-spec-divergence`).
  - Phase 4 Unit 1b custom-subagent-file pattern.
  - Phase 3 Unit 1 `ROW_DISPLAY_LABELS`, `GodEvent`, `CoverageReport`,
    `ConnectionEvent`, `FireRecord` shapes.
  - Phase 3 Unit 9 `FireRecord.matched: 'clean' | 'with-divergence'
    | 'no-fire'` tri-state (D17).
  - Phase 1 D1 mandatory `vibe-check:` scenario field (R8 / D11).
  - Phase 1 D4 `known-product-call:` contract (R11 / D5).
  - Phase 1 D5 7-row × 2-column info-gap matrix (R10 / D13).
  - Phase 1 Unit 5 Part G free-play class (R9 / D12).
- **Integration coverage:** Unit 5 smoke + Phase 6 calibration.
- **Unchanged invariants:** No server changes. No seat-agent changes.
  Existing issue tracker (`E2E-ISSUE-LIST.md`) is read-only from triage's
  perspective.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Triage agent misses a duplicate and files a new issue for a known item | D5 explicit duplicate check splits KNOWN-PRODUCT-CALL from DUPLICATE; Briggsy flags at promotion; clustering tuning in Phase 6. |
| Triage agent speculates root cause without reading the god-event log | Prompt required process mandates reading `events.jsonl` before diagnosis. |
| Triage agent writes code | `tools:` whitelist in `.claude/agents/playtest-triage.md` excludes Bash + all Playwright tools. Prompt says "no code." |
| Concurrent triage hits rate limits or context pressure | Acknowledged per PRD §9.6; revisit in Phase 6 if actually observed. |
| Seat log parser errors hide valuable signals | Phase 4 Unit 3 logs parse errors; clustering step surfaces those as a separate seed category ("unparseable signals for review"). |
| Duplicate detection threshold too strict → real new bugs tagged as duplicates | Low threshold for `candidateDuplicate`, but triage agent MUST still judge — the tag is a hint, not a verdict. |
| Free-play loose clustering produces spurious clusters (R9 / D12) | 60s window + `(cardType, eventType, seatRole)` triple tunable in Phase 6 calibration. First session measures false-positive rate. |
| Column-1-vs-Column-2 enrichment blocked by Phase 2 projection extension not landing (R10 / D13) | Phase 1 R7 + phase-2 Harden pass track this. If Phase 2 god-event envelope lacks `projections`, triage still runs but `columnContext` is `undefined` and `ui-spec-divergence` seeds degrade to "Column 2 only" findings. Not fatal. |
| `ui-spec-divergence` rename not propagated through triage prompt | Unit 5 smoke regression greps rendered prompts for `info-gap-divergence` → fails if any hit. |
| Vibe-check findings overwhelm INDEX.md with noise | `VibeCheckEntry` with `feltLikeArcher: 'yes'` are NOT clustered (D11 rule); only `no`/`unsure` enter the seed pipeline. Phase 6 calibration measures the signal-to-noise ratio. |
| Role-drift findings overwhelm INDEX.md during confusing reactive windows | Phase 4 D16 acknowledges self-labelling is best-effort; triage surfaces drift as a distinct finding (not silent correction). If the section becomes noisy, it IS a UI-clarity signal per D15 — feature, not bug. |
| Triage subagent spawned with `subagent_type: 'general-purpose'` by mistake | Unit 3 regression test asserts `'playtest-triage'` on every spawn; throws otherwise. Mirrors phase-4 Unit 2 regression. |
| `.claude/agents/playtest-triage.md` missing or malformed at runtime | Launcher fails loudly on startup with a clear error; triage does not silently fall back to `general-purpose`. |

## Documentation / Operational Notes

- `scripts/playtest/README.md` adds a "Triage agents" section.
- Briggsy's review process: after each session, review `issues/INDEX.md`
  and individual issue files; promote P0/P1 into `E2E-ISSUE-LIST.md` with
  a back-reference to the source run.

## Sources & References

- **Origin:** [docs/testing/PLAYTEST-HARNESS-PRD.md](../../testing/PLAYTEST-HARNESS-PRD.md)
- **Parent roadmap:** [docs/plans/playtest-harness/roadmap.md](./roadmap.md)
- **Phase 1 catalog — contracts absorbed 2026-04-23:**
  [docs/plans/playtest-harness/phase-1-scenarios.md](./phase-1-scenarios.md)
  - D1 mandatory `vibe-check:` field (R8 / D11)
  - D4 `known-product-call:` contract — both ⏸ and 🔴-deliberate
    (R11 / D5)
  - D5 7-row × 2-column info-gap matrix (R10 / D13)
  - Unit 5 Part G free-play class (R9 / D12)
- **Phase 3 god-event log + coverage report — contracts absorbed
  2026-04-23:** [docs/plans/playtest-harness/phase-3-harness-infra.md](./phase-3-harness-infra.md)
  - Unit 1 `GodEvent`, `CoverageReport`, `ConnectionEvent`,
    `ROW_DISPLAY_LABELS`
  - Unit 9 `FireRecord.matched: 'clean' | 'with-divergence' |
    'no-fire'` tri-state (D17)
  - Unit 10 `coverage.md` 7×2 grid + absolute `firedCount >= 50`
- **Phase 4 log schemas + subagent pattern — contracts absorbed
  2026-04-23:** [docs/plans/playtest-harness/phase-4-seat-agents.md](./phase-4-seat-agents.md)
  - D5 four-entryType Zod schema (R12 / D14)
  - D16 role self-labelling rubric (R13 / D15)
  - C4 rename `info-gap-divergence` → `ui-spec-divergence`
  - Unit 1b custom-subagent-file pattern (R14 / D16 / Unit 1b)
- **E2E issue tracker voice + severity rubric + known-product-call
  linkage:** `docs/testing/E2E-ISSUE-LIST.md` (explicit Read access
  per R11 / D4 / Unit 1b whitelist)
- **Rules reference:** `docs/RULES-REFERENCE.md`
- **Product specification:** `docs/PRODUCT-SPECIFICATION.md` (§2
  Quality Bar + §3 Archer acceptance + §8.7 first-time-player
  reaction test — source for vibe-check equal weighting per R8 / D11)
- **Adversarial swarm learnings:** `docs/insights/008-adversarial-swarm-review-maximum-overdrive.md`
- **Custom subagent pattern:** `docs/insights/020-claude-code-subagent-frontmatter-tools-whitelist.md`
- **Memory:** `feedback-wait-for-all-agents.md`, `feedback-sequential-thinking-always.md`
