---
title: "Playtest Harness — Phase 7: Coverage Cascade (7-A passive, 7-B conditional hunt)"
type: feat
status: deferred
date: 2026-05-06
parent: docs/plans/playtest-harness/roadmap.md
origin: 2026-05-06 conversation — Briggsy's "let's identify all playable scenarios and have agents play"
review_pass_1: 2026-05-06 — six-persona document-review, 14 substantive findings
review_pass_2: 2026-05-06 — six-persona document-review of v2 rewrite, 54 findings (more, not fewer)
deferred_decision: 2026-05-06 — convergent product-lens / scope / adversarial signal that Phase 7 is the wrong shape of work for this moment. Trying a 2-hour smoke campaign with the existing harness instead. If the smoke produces ≥1 promoted issue file, Phase 7 is unnecessary. If it produces zero, that's a product signal (harness has saturated its bug-finding ROI) and Phase 7's cascade is unlikely to change that. Plan retained as reference for a future moment when (a) BURNED has a playtest scheduled, OR (b) a structural change to the engine motivates fresh coverage measurement.
depends_on:
  - docs/plans/playtest-harness/phase-1-scenarios.md
  - docs/plans/playtest-harness/phase-3-harness-infra.md
  - docs/plans/playtest-harness/phase-4-seat-agents.md
  - docs/plans/playtest-harness/phase-6-calibration-and-first-session.md
prd_alignment:
  - PRD §2 Goal — finding player-experience bugs (preserved as Phase 7's primary measure)
  - PRD §4.1 Isolation — preserved (no shared mutable state across seats in 7-A; 7-B uses residue mechanism, not Read tool)
  - PRD §4.4 Suspicion — preserved (every cascade run produces suspicion-log corpus regardless of mode)
  - PRD §8.3 — restored as Success Criterion (≥1 promoted issue file)
---

# Phase 7 — Coverage Cascade

## TL;DR

Run a 4-lobby cascade (10/8/6/4) against the **existing 90-scenario
catalog with the existing free-play seat template** (Phase 7-A).
Measure what passive multi-lobby coverage actually produces. *Then,
and only then,* decide whether HUNT mode and a catalog expansion are
warranted (Phase 7-B). This sequencing is the consensus
recommendation of the six-persona document review (2026-05-06): it
de-risks ~$60 hours of speculative work behind a ~10 hour
data-gathering exercise.

The original v1 of this plan committed to HUNT-mode infra + catalog
expansion before measuring whether either was needed. The review
surfaced that:

1. The plan was reframing the harness from PRD §2 ("find player-
   experience bugs") to a *rules-coverage instrument* without
   justifying the shift, and HUNT mode would actively kill the
   harness's only differentiated capability (LLM-as-confused-player).
2. The Read-tool audit underpinning HUNT-mode security was
   structurally impossible under current Claude Code (existing
   `isolation-audit.ts` documents that tool-call history is not
   exposed to the parent process).
3. The "0-fire regression" cited as a P0 prerequisite was sample-of-1
   noise in some readings and tier-2 oracle drift in others — two
   different problems, neither warranting a multi-day diagnosis as
   priced.
4. The catalog target (150+ scenarios, +76 from authoring) was
   derived from a sketch that admits its own numbers, and committed
   to in success criteria before Unit 2 had run.

This draft rebuilds the plan around what the review made clear: the
cheapest way to learn what Phase 7 should be is to run Phase 7-A
first.

## Phase 7-A — Passive Baseline Cascade

### Overview

Run the existing harness, end-to-end, across four lobby sizes
(10/8/6/4) against the **existing 90-scenario catalog** with the
**existing free-play seat template**. Aggregate per-run coverage into
a single cascade evidence package. Promote any new finding (player-
experience bug, scenario fire-pattern surprise, suspicion cluster) to
`E2E-ISSUE-LIST.md`.

This is the cheapest possible "instrument check" against the harness:
does it produce PRD §2 / §8.3 outcomes when given more shots than a
single 3-player run can offer? If it does, Phase 7-B may not be
necessary at all. If it doesn't, the gap between observed coverage and
catalog-completeness measurements tells us *what kind* of 7-B
expansion (catalog, hunt, scripted preconditions) would actually pay
back.

### Quality Bar (7-A)

Inherits the PRD's six principles. Adds two measurable bars:

- **Q7A-1 — Coverage measurement at four lobby sizes.** A single
  cascade run produces a union coverage report that distinguishes
  per-lobby coverage from cross-lobby union coverage. The number is
  the number; we do not commit to a target before the data lands.
- **Q7A-2 — Issue-file production.** Per PRD §8.3, the cascade is
  judged primarily on whether it produced ≥1 new issue file a human
  reviewer classifies as a genuine player-experience finding —
  exactly the bar Phase 6 had. Coverage is the supporting metric, not
  the headline metric.

### Requirements Trace (7-A)

- **R7A-1.** A pre-cascade triage spike (Unit 0) determines whether
  the 0-fire claim from 2026-04-29 is sample-of-1 noise, tier-2
  oracle drift, or a real detector regression. The fix scope follows
  the diagnosis; do not commit to a multi-day Unit 1 before this
  triage runs.
- **R7A-2.** Cascade orchestrator chains four `runSession` calls
  (10/8/6/4) with shared catalog SHA and a cascade-level meta file.
  No shared coverage state across runs (seats remain in PRD §4.1
  isolation).
- **R7A-3.** Cascade union coverage report at
  `docs/testing/playtest/cascades/<cascadeId>/coverage.md` —
  *single file*, not a per-scenario directory tree.
- **R7A-4.** Per-fire post-fire screenshot captured by the seat
  agent, named `<runId>/screenshots/<scenarioId>-seat<N>-post.png`.
  No pre-act snapshot in 7-A.
- **R7A-5.** Triage runs against the cascade output (Unit 5 of phase 5,
  cascade-aware). Output: `<cascadeDir>/issues/`.
- **R7A-6.** Suspicion-log corpus is preserved and surfaced in the
  cascade evidence package as a first-class section, not buried.

### Scope Boundaries (7-A)

**In scope:**
- Cascade orchestrator (chained `runSession`).
- Per-fire post-fire screenshot capture in the existing free-play
  template (no template-mode change).
- Cascade evidence package writer.
- Cascade-aware triage pipeline invocation.
- Calibration: 4-player passive cascade smoke before scaling to 10p.

**Out of scope (deferred to 7-B):**
- HUNT mode and any new agent capability.
- Catalog expansion beyond the existing 90 scenarios.
- Read-tool whitelist additions.
- Shared coverage-state file.
- Pre-act screenshots.
- Per-scenario file forest in evidence package.

### Decisions (7-A)

#### D-A1 — 0-fire triage shape

**Question.** The most-recent runs since 2026-04-29 reported 0 clean
fires. Adversarial review says it's sample-of-1 noise (adjacent runs
fired 1–4); feasibility review says it's tier-2 oracle drift across 5
runs (e.g. `expected $ACTOR, observed <uuid>`). Both can be true.

**Decision.** Unit 0 is a triage spike, not a diagnosis. Run 3 fresh
3p free-play sessions back-to-back at the current SHA. If ≥2 fire ≥1
clean scenario, the "regression" is sample variance — the only
follow-up is to add a flake-rate metric to coverage-reporter and
proceed. If <2 fire clean, run a single 3p with verbose tier-2
divergence logging and chase the highest-confidence divergence
pattern. Time-box the second case to 4 hours; if the diagnosis isn't
in hand by then, call it and surface the observed patterns to
Briggsy.

**Rationale.** The original Unit 1 was priced as a multi-day rabbit
hole based on a single data point. Adversarial review showed adjacent
runs fired cleanly. The prior framing risked spending days on a
non-event.

#### D-A2 — Cascade orchestration (no shared state)

**Question.** Should the cascade share a coverage-state file across
runs, or should each run be fully isolated?

**Decision.** Each run is fully isolated. The cascade orchestrator
chains four `runSession` invocations, threads the cascade ID and
catalog SHA, and aggregates per-run `coverage.md` outputs into one
union report at end-of-cascade. No shared mutable state during the
runs.

**Rationale.** Shared coverage-state was in the v1 plan to support
HUNT mode; without HUNT, it serves no purpose. Removing it eliminates
three review-flagged P0s at once: (a) PRD §4.1 meta-channel
violation, (b) two-detector divergence risk, (c) Read-tool whitelist
addition with no enforceable path-scope.

#### D-A3 — Lobby cadence (10/8/6/4)

**Question.** Phase 6 R6 cited 2/3/5/8/10. Why does this plan use
even counts only?

**Decision.** 7-A uses **2/4/6/8/10** — five lobby sizes, restoring
2p coverage per Phase 6 R6 and adding 4/6 for explicit sweet-spot
sizes. Adversarial review correctly flagged that dropping odd counts
(3, 5, 7, 9) without justification leaves coverage holes; restoring
2p is required because 2p Favor / Targeted-Attack / 2-of-a-kind have
unique semantics absent at 4+. The cascade is 5 runs, not 4.

**Rationale.** Phase 6 series-config files already exist for these
sizes. Cost delta: one extra run (~10 minutes wallclock); no
catalog or template changes needed.

#### D-A4 — Cascade-level evidence package shape

**Question.** v1 specified per-scenario `<scenarioId>.md` files
(~150 files per cascade). Scope review: union coverage.md is enough.

**Decision.** Single `<cascadeDir>/coverage.md` produced by a union
pass over per-run `coverage.md` files. `<cascadeDir>/cascade-meta.json`
records seed, catalog SHA, lobby outcomes. Screenshots referenced via
a `screenshots-manifest.json` mapping scenario IDs to absolute paths
under `runs/<runId>/screenshots/` — no symlinks (Windows
incompatibility), no copies (~180MB pollution).

**Rationale.** The existing `coverage-reporter.ts` already produces
fired/unfired/divergence sections per run. A union pass is a function
of the per-run outputs, not a parallel data structure.

#### D-A5 — Snapshot scope

**Question.** v1 specified pre-act + post-fire snapshots; pre-act was
flagged as scope creep ("optional, hunt-mode only" but specced as
mandatory).

**Decision.** Post-fire only in 7-A. Pre-act snapshot is deferred
indefinitely; resurrect only if a specific WHAT-YOU-SEE bug class
needs it.

#### D-A6 — Catalog stays at 90

**Question.** Should we author the +76 expansion in 7-A?

**Decision.** No. The catalog stays at 90 for the entire 7-A
cascade. The cascade's job is to **measure** what the existing
catalog covers across lobby sizes. Catalog expansion (if any) is a
7-B decision informed by 7-A data.

### Units of Work (7-A)

#### Unit 0 — 0-fire triage spike

**Inputs:**
- `docs/testing/playtest/runs/2026-04-29-1929-2p/` through
  `runs/2026-05-01-1654-3p/` (5 recent runs).
- `scripts/playtest/run-session.ts`.

**Output:**
- 3 fresh 3p smoke runs at HEAD.
- One-page triage memo: noise (proceed) | tier-2 drift (specific
  divergence + hypothesis) | other (escalate).

**Acceptance:** Memo committed at
`docs/testing/playtest/triage-2026-05-06.md`. Decision recorded
inline. Time budget: ≤2 sessions.

#### Unit 1 — 0-fire fix (CONDITIONAL on Unit 0)

**Trigger:** Unit 0 reports tier-2 drift or a structural detector
issue.

**Output:**
- Insight at `docs/insights/<NNN>-<slug>.md`.
- Source-code fix.
- Re-run of 3p smoke shows ≥1 clean fire across 3 consecutive runs.

**Acceptance:** Same as v1, but only invoked if Unit 0 surfaces a
real defect. Time-boxed to 4 hours of investigation; escalate beyond
that.

#### Unit 2 — Cascade orchestrator

**Inputs:** `scripts/playtest/run-session.ts`,
`scripts/playtest/lib/orchestrator.ts`.

**Output:**
- New entry `scripts/playtest/run-cascade.ts`.
- New `pnpm` script: `playtest:cascade`.
- CLI: `--lobbies 2,4,6,8,10` (default), `--seed <S>`.
- Per-lobby seed derivation: `lobbySeed = sha256(cascadeSeed +
  ':' + lobbySize).slice(0,16)` (per adversarial finding — XOR
  collides at `4 ^ 12 = 8`).
- Pre-flight gate: if Unit 0 / Unit 1 health-check status is not
  GREEN within last 24h, abort with clear error.
- One `pnpm` script test verifies `--lobbies 4 --seed 1` runs a
  single 4p lobby and exits 0.

**Acceptance:** A single-lobby cascade invocation runs end-to-end
against current harness without modifications to seat templates.
Server-boot cost (4–5x per cascade) acknowledged in the orchestrator
docstring with a TODO referring to a future "persistent server" mode.

#### Unit 3 — Per-fire post-fire screenshot capture

**Inputs:** `scripts/playtest/agents/seat-free-play.md`.

**Output:**
- Free-play template gains an instruction: after observing a
  scenario-fire candidate (per existing recognition criteria),
  capture a post-fire screenshot at
  `<runDir>/screenshots/<scenarioId>-seat<N>-post.png` with explicit
  path arg (insight 042 — bare path leaks to project cwd).
- Existing isolation-audit extended to walk `<runDir>/screenshots/`
  and reject misnamed or out-of-runDir screenshots (closes the
  unconstrained-write gap from security review).

**Acceptance:** A 2p smoke run produces ≥1 post-fire screenshot for
every fired scenario. Isolation-audit unit test gains a "screenshot
written to project cwd" attack case that flips the run to
`ISOLATION_BREACH`.

#### Unit 4 — Cascade evidence package writer

**Inputs:** Per-run `coverage.md` files, `screenshots/` dirs,
isolation-audit outputs.

**Output:**
- `docs/testing/playtest/cascades/<cascadeId>/coverage.md` — union
  pass over per-run reports. Sections: TL;DR, per-lobby table,
  cross-lobby union, fired-clean, fired-with-divergence, unfired,
  suspicion corpus, isolation status.
- `<cascadeDir>/cascade-meta.json` — seed, catalog SHA, lobby
  outcomes, runtime.
- `<cascadeDir>/screenshots-manifest.json` — scenarioId → path
  index.
- `<cascadeDir>/runs/` — relative path references to the four (now
  five) `<runId>/` dirs (no symlinks, no copies).

**Acceptance:** Union report renders at the cascade end. A reviewer
reading just the cascade `coverage.md` can answer in 5 minutes:
- What did the cascade find that wasn't already known?
- Which scenarios fired clean / with-divergence / not at all?
- Which suspicions clustered into possible findings?
- Was isolation preserved across all five runs?

(This replaces the v1 "WOW-test" framing for the report, per
product-lens review.)

#### Unit 5 — 7-A calibration: 4p passive cascade

**Trigger:** Units 2/3/4 green.

**Output:**
- Single 4p cascade run (one lobby) end-to-end.
- Cascade evidence package reviewed by Briggsy.
- Issues triaged from the run, if any.

**Acceptance:** ≥1 clean fire and a complete evidence package. If
zero clean fires, return to Unit 0 / Unit 1 — the harness is not
ready for the production cascade.

#### Unit 6 — 7-A production: 2/4/6/8/10 passive cascade

**Trigger:** Unit 5 green.

**Output:**
- Single cascade with all five lobby sizes.
- Cascade evidence package + Briggsy review.
- Triage outputs to `<cascadeDir>/issues/`.

**Acceptance (PRD-aligned):**
- Cascade completes all five lobbies without isolation breach.
- Cascade union coverage report renders.
- **PRD §8.2 supporting metric** — ≥5 axis-11 information-visibility
  scenarios fire across the cascade (preserves the original harness
  goal).
- **PRD §8.3 headline metric** — ≥1 promoted issue file from
  triage that Briggsy classifies as a genuine player-experience
  finding (not a known engine invariant). If zero promoted findings,
  the cascade is informative but not "successful" by PRD criteria —
  reopen.

#### Unit 7 — 7-A → 7-B decision gate

**Trigger:** Unit 6 evidence package complete.

**Output:**
- Written gate-decision memo at
  `<cascadeDir>/7B-decision.md` answering:
  - Did 7-A meet PRD §8.3 (≥1 promoted finding)? If yes, the
    instrument is healthy — 7-B is optional, prioritize promoted
    findings instead.
  - What % of the existing 90-scenario catalog fired clean across
    the cascade? What % fired with-divergence? What % never fired?
  - Of the never-fired scenarios, how many are structurally
    unreachable at any lobby size (verifiable from catalog
    metadata) vs hand-state-unreachable vs other?
  - Are the suspicion clusters pointing at axis-11 information-
    visibility gaps that hunt mode could surface, or at engine
    correctness issues that property-based tests already cover?

**Acceptance:** Memo signs off on one of:
- **STOP** — 7-A delivered PRD §8.3; 7-B is unnecessary. Promote
  findings, end Phase 7.
- **CATALOG-ONLY** — 7-A coverage is high but suspicion clusters
  point at uncovered scenarios. Author a tightly-scoped catalog
  expansion (likely 15–25 scenarios per product-lens cut: only the
  (c)-class — requires-hunt AND surfaces info-visibility-gap),
  re-run cascade. No HUNT mode.
- **HUNT-PILOT** — the gap is real and only HUNT can close it.
  Proceed to 7-B Unit 8 (pilot).

## Phase 7-B — Conditional HUNT Mode

This phase activates **only** if Unit 7's gate-decision selects
HUNT-PILOT. Most of v1's HUNT-mode complexity moves here, gated by a
small pilot that learns whether HUNT mode actually pays back.

### Quality Bar (7-B)

Adds three guardrails the v1 plan was missing:

- **Q7B-1 — Suspicion preservation.** Every HUNT-mode turn produces
  a player-POV reflection log entry independent of the hunt-target.
  PRD §4.4 "suspicion is first-class" is preserved as a hard
  contract, not displaced by hunt selection.
- **Q7B-2 — Mixed-mode cascade.** No more than 30% of seats per
  lobby run HUNT mode; the rest run free-play. The cascade preserves
  PRD §2 bug-finding character even when measuring rule-coverage.
- **Q7B-3 — Token cost is measured, not estimated.** The pilot
  (Unit 8) measures actual per-turn token cost. Production cascade
  (Unit 11) is gated on the measured cost being ≤2x the pilot
  estimate — if it overshoots, the cascade aborts with a clean
  PARTIAL package and Briggsy decides whether to continue.

### Decisions (7-B)

#### D-B1 — Coverage-state delivery: residue, not Read

**Question.** v1 D2/D3 added a Read tool to the seat-agent whitelist
and shared `coverage-state.json` for HUNT-mode hint state. Security +
feasibility review showed (a) Read has no path-scoped enforcement,
(b) the existing `isolation-audit.ts` documents that tool-call
history is not exposed to the parent process, (c)
`firstFireSeat` in the file is a meta-channel violation.

**Decision.** **Use the existing Write area as a one-way drop.** The
orchestrator copies a per-seat snapshot into
`<runDir>/seats/<seatId>/coverage-snapshot-<turnIndex>.json` at the
start of each turn. Each seat already has Write access to its own
`seats/<seatId>/` dir; reading a file the orchestrator just put there
needs no new tool. The snapshot strips `firstFireSeat` and any
cross-seat fields — only `{ scenarioId: { fired: bool } }` remains
visible.

**Rationale.** Resolves four review-flagged problems at once: (1) no
Read whitelist addition, (2) no audit gap, (3) no meta-channel info
leak, (4) snapshot freshness is a function of orchestrator timing,
not seat polling.

#### D-B2 — Hunt selection: deterministic predicates, not LLM judgment

**Question.** v1 Unit 4 step 4 had agents LLM-judge "is this
scenario reachable?" against catalog Trigger-conditions prose.
Adversarial review noted that some catalog Trigger conditions
reference server-private state (`top card is burned`) — agents
cannot validly judge reachability against state they don't see.

**Decision.** Catalog scenarios that 7-B's targeted expansion adds
must include a **typed reachability predicate** at authoring time —
an explicit list of (a) cards-in-hand-required, (b) lobby-size-min,
(c) game-phase-required, (d) projection-visible-state-required. The
agent matches its visible state against the predicate using simple
field comparisons, not prose interpretation. Existing 90-scenario
catalog scenarios can be incrementally migrated as needed (out of
scope for 7-B unless promoted by Unit 9).

**Rationale.** Replaces non-reproducible LLM judgment with
deterministic predicate evaluation. Aligns with phase-1 D3 catalog
grammar lockdown — predicates extend the grammar, they don't break
it.

#### D-B3 — 5–8 scenario hunt pilot before any catalog expansion

**Question.** Even with D-B1/D-B2 fixes, does HUNT mode actually
produce coverage that free-play wouldn't?

**Decision.** Unit 8 is a hand-built 5–8 scenario pilot: pick
existing high-value scenarios from the 90-scenario catalog (ones
that *occasionally* fire under free-play but unreliably), author
typed reachability predicates for them, run a 2p cascade with HUNT
mode in **one** seat (other seat free-play). Measure: hit rate, token
cost, isolation preservation, suspicion preservation.

**Rationale.** Converts ~50–80 hours of speculative HUNT-mode work
into a ~6 hour de-risking experiment. If the pilot fails (low hit
rate, high token cost, suspicion log goes empty), Phase 7 stops at
CATALOG-ONLY scope. If it succeeds, Units 9–11 proceed with
calibrated expectations.

#### D-B4 — Catalog targeted expansion (15–25 scenarios, not 76)

**Question.** v1 committed to ~76 new scenarios. Product-lens
review: most of those are already covered by engine unit tests
(`rules-gaps-exhaustive.test.ts`, etc) and don't pay back at the
LLM-harness level.

**Decision.** Catalog expansion (Unit 9) authors **only** scenarios
that meet all three filters:
- **(a)** NOT covered by an existing engine unit test
- **(b)** NOT reliably reachable by free-play (per Unit 6 data)
- **(c)** Surfaces an axis-11 information-visibility gap (PRD §8.2
  / §4.4 territory)

Estimated scope: 15–25 scenarios, 8–18 hours of authoring, locks
when the (a)∩(b)∩(c) set is exhausted, not at a count target.

### Units of Work (7-B, conditional)

#### Unit 8 — HUNT-mode 5–8 scenario pilot

**Trigger:** Unit 7 selects HUNT-PILOT.

**Output:**
- 5–8 hand-authored typed reachability predicates against existing
  catalog scenarios.
- Hand-built `seat-hunt.md` template (one-off; not generator-fed
  yet).
- 3 separate 2p pilot runs (1 hunt seat + 1 free-play seat each).
- Pilot memo with measured: hit rate per scenario, tokens-per-turn
  (mean + p95), suspicion log entry count per turn, isolation status,
  any griefing observed.

**Acceptance (gate to Unit 9):** ≥3 of the 5–8 pilot scenarios fire
clean across the 3 runs AND tokens-per-turn p95 ≤15K AND suspicion
log entries ≥1 per HUNT-mode turn (Q7B-1). Otherwise, STOP — 7-B is
killed and Phase 7 ends at CATALOG-ONLY or STOP.

#### Unit 9 — Targeted catalog expansion (15–25 scenarios)

**Trigger:** Unit 8 acceptance met.

**Output:**
- 15–25 new scenarios authored to the existing catalog grammar +
  typed reachability predicate per D-B2.
- Catalog SHA recorded for next cascade.

**Acceptance:** Catalog parses with `scenario-detector.ts --validate`;
every new scenario passes the (a)∩(b)∩(c) filter; Briggsy reviews
the diff before lock.

#### Unit 10 — HUNT-mode template + residue infra

**Trigger:** Unit 9 complete.

**Output:**
- `scripts/playtest/agents/seat-hunt.md` (generator-fed).
- `scripts/generate-playtest-seat-agents.ts` updated to wire the
  third mode.
- `Mode` union extended in `agent-launcher.ts` (and call-site
  refactor — phase-7 v1 finding 7).
- Per-seat coverage-snapshot writer in orchestrator (D-B1 residue
  mechanism).
- Vitest tests covering: 3-mode template selection, snapshot
  freshness, isolation audit (still passes — no new tool).

**Acceptance:** `pnpm test` green. A 2p smoke with `--mode hunt`
fires the pilot scenarios at the same rate as Unit 8.

#### Unit 11 — 7-B production: targeted hunt cascade

**Trigger:** Unit 10 green.

**Output:**
- Single cascade against the expanded catalog with 30%-HUNT mixed
  seats per lobby.
- Cascade evidence package + suspicion corpus.
- Promoted issues to `E2E-ISSUE-LIST.md`.

**Acceptance:**
- All Q7B guardrails pass.
- Cascade completes within 1.5x measured token budget from Unit 8.
- ≥1 promoted issue file (PRD §8.3) — same bar as 7-A Unit 6.

## Sequencing & Dependencies

```
Unit 0 (0-fire triage spike)
   │
   ├─ noise/clean ─────────────┐
   │                           │
   └─ defect ──► Unit 1 (fix) ─┤
                               │
                               ▼
                       Unit 2 (cascade orchestrator)
                       Unit 3 (post-fire screenshot)
                       Unit 4 (evidence package writer)
                       (Units 2/3/4 parallelizable)
                               │
                               ▼
                       Unit 5 (4p calibration)
                               │
                               ▼
                       Unit 6 (2/4/6/8/10 production)
                               │
                               ▼
                       Unit 7 (7-A → 7-B decision gate)
                               │
                  ┌────────────┼────────────┐
                  ▼            ▼            ▼
               STOP       CATALOG-ONLY    HUNT-PILOT
              (end)      ↓                 ↓
                         Unit 9 (subset)   Unit 8 (pilot)
                         Unit 6 (re-run)     │
                                             ▼
                                         (pass) → Unit 9 → Unit 10 → Unit 11
                                         (fail) → STOP or CATALOG-ONLY
```

**Critical path (7-A only):** Unit 0 → Unit 2/3/4 → Unit 5 → Unit 6
→ Unit 7. ~12–20 hours of work + ~10 hours cascade wallclock.

**Critical path (7-A + 7-B HUNT-PILOT):** add Unit 8 (~6 hours) →
Unit 9 (8–18 hours) → Unit 10 (~6 hours) → Unit 11 (~6 hours
cascade + review). ~30–55 hours additional, conditional.

**Worst case (everything triggered):** 7-A + Unit 1 deep diagnosis
+ HUNT-PILOT path = ~50–80 hours.

**Best case (Unit 7 STOP):** ~12–20 hours + cascade wallclock; Phase
7 done at the gate.

## Open Questions for Briggsy

These survive the rewrite. Reasonable defaults are listed; pick or
override.

- **OQ-1.** Triage budget for Unit 0. Default: ≤2 sessions of
  diagnosis time before escalating.
- **OQ-2.** Token measurement gate for 7-B Unit 8 (if reached).
  Default: pilot accept gate is 15K tokens-per-turn p95; production
  cascade aborts if ≥1.5x the pilot's measured value.
- **OQ-3.** If 7-A Unit 6 produces ≥3 promoted issue files, do we
  STOP at the gate even if coverage is low? Default: yes —
  promoted-finding count is the headline metric per PRD §8.3.
  Coverage gaps become the *next* phase's input, not a 7-B trigger.
- **OQ-4.** Lobby cadence: 2/4/6/8/10 (this draft) or 2/3/5/8/10
  (Phase 6 R6)? Default: 2/4/6/8/10 — even-spacing makes union-
  coverage analysis cleaner; 3p / 5p coverage holes go in 7-B if the
  gate triggers.

## Out of Scope (Phase 7 entirely)

- CI integration, scheduled cascades, cost-monitoring dashboards
  (PRD §9.5 deferral; revisit if cascade becomes recurring).
- Mobile real-device cascades.
- Generalizing the cascade pattern beyond BURNED.
- Pre-act snapshots.
- Per-scenario evidence-package directory tree.
- Scripted-precondition authoring for `unreachable-hand-state`
  scenarios (deferred per D9 in v1).
- Survival-aware hunt selection heuristic (v1 risk-section creep;
  OQ-2 simple fallback is the contract).
- Any catalog scenario that doesn't meet the (a)∩(b)∩(c) filter
  in D-B4.

## Risks & Landmines

- **Unit 0 surfaces a third class of failure** (not noise, not
  tier-2 drift, but something new). Mitigation: Unit 0 is a 2-session
  spike; if it can't classify, escalate to Briggsy.
- **Unit 6 cascade hits server-boot tax** (4–5 wrangler boots per
  cascade; ~8–16 minutes of pure boot/teardown). Mitigation:
  acknowledge in orchestrator docstring with TODO; budget
  realistically (factor included in ~10 hr cascade wallclock).
- **Atomic-write semantics on Windows.** Even without a shared
  state file, per-run `coverage-state.json` writes must survive
  Windows rename-over-existing semantics. Mitigation: when the
  per-seat coverage-snapshot mechanism (D-B1) lands in 7-B, use
  `fs.writeFile` with retry-on-EBUSY rather than tmp+rename. No
  shared file in 7-A means this is a 7-B-only concern.
- **Unit 7 gate-decision inertia.** Reaching the gate after 12–20
  hours of work creates pressure to "just do 7-B" regardless of what
  the data says. Mitigation: the gate-decision memo is a written
  artifact reviewed before any 7-B work starts; if the answer is
  STOP, that's a Phase 7 success, not a failure.
- **Unit 8 pilot is hand-built.** No generator-fed seat-hunt.md
  template, no Mode-union refactor, no audit changes. This means
  Unit 8 results don't trivially translate to Unit 10 production
  shape. Mitigation: Unit 8 outputs predicate-shape and per-turn
  measurements; Unit 10 inherits predicates and re-measures during
  its 2p smoke acceptance test.
- **Catalog SHA drift mid-cascade.** If Briggsy edits SCENARIOS.md
  during a cascade run, the cascade's catalog SHA records mid-edit
  state. Mitigation: cascade orchestrator records catalog SHA at
  Unit 2 (cascade start), refuses to start if working tree is dirty
  in `docs/testing/playtest/SCENARIOS.md`.
- **Suspicion-corpus signal-to-noise.** PRD §4.4 says suspicions
  are first-class, but a 5-lobby cascade × 30 turns × 10 seats may
  produce hundreds of low-signal entries. Mitigation: cluster-
  suspicions logic from `scripts/playtest/lib/cluster-suspicions.ts`
  already exists; cascade evidence package surfaces top-N clusters,
  not raw entries.

## Appendix A — Cost & Wallclock Estimate (revised)

| Phase | Wallclock | Notes |
|---|---|---|
| Unit 0 (triage spike) | 1–2 sessions | 3 fresh smokes + memo |
| Unit 1 (fix, conditional) | ≤4 hr | only if Unit 0 finds defect |
| Units 2/3/4 (orchestrator + screenshot + evidence writer) | 6–10 hr | parallelizable |
| Unit 5 (4p calibration) | 1.5 hr session + 1 hr review | |
| Unit 6 (2/4/6/8/10 production) | ~3 hr session + 2 hr review | 5 lobbies × ~30 min |
| Unit 7 (gate-decision memo) | 1–2 hr | written artifact |
| **7-A subtotal** | **~12–25 hr work + ~10 hr cascade wallclock** | |
| Unit 8 (HUNT pilot, conditional) | ~6 hr | 5–8 predicates + 3 pilot runs |
| Unit 9 (catalog expansion 15–25, conditional) | 8–18 hr | predicate authoring |
| Unit 10 (HUNT infra, conditional) | ~6 hr | template + Mode refactor |
| Unit 11 (HUNT cascade, conditional) | ~6 hr | + 1 hr review |
| **7-B subtotal (if all triggered)** | **~26–36 hr + ~6 hr cascade wallclock** | |
| **Total Phase 7 worst-case** | **~38–61 hr work + ~16 hr cascade wallclock** | |

**Token cost (cascade only):**
- 7-A passive cascade: ~150K tokens of seat-agent activity
  (free-play, no hunt overhead). ~$3–6.
- 7-B HUNT cascade (if reached): measured in Unit 8 pilot; budget
  scales linearly. Estimated $30–80 if pilot lands at expected rate.

## Appendix B — Findings addressed from 2026-05-06 review

| Finding | Persona | Resolution |
|---|---|---|
| Plan reframes harness vs PRD §2 | product P0 | 7-A explicitly preserves PRD §2/§4.4; Q7B-1/2 guardrail HUNT mode if reached |
| HUNT kills differentiated capability | product P0 | Q7B-1 mandates suspicion logs per HUNT turn; Q7B-2 caps HUNT seats at 30% |
| Read audit structurally impossible | security/feasibility P0 | D-B1 replaces Read with residue mechanism (existing Write path) |
| coverage-state.json meta-channel | security HIGH | 7-A has no shared state; 7-B residue strips firstFireSeat |
| Two-detector divergence | adversarial HIGH | 7-A reuses post-hoc detector; 7-B coverage-snapshot is a derived view, not a parallel matcher |
| Hunt-step-4 LLM judgment unreliable | adversarial/feasibility HIGH | D-B2 typed reachability predicates replace prose judgment |
| 0-fire premise opposing finding | adversarial vs feasibility | Unit 0 triage spike resolves before deep diagnosis |
| Inversion test (no required new bug) | product P1 | Unit 6 + Unit 11 acceptance restore PRD §8.3 ≥1 promoted finding |
| Token budget 3x understated | adversarial P1 | Q7B-3 token cost measured in Unit 8, gates Unit 11 |
| Catalog opportunity cost | product P1 | D-B4 (a)∩(b)∩(c) filter cuts +76 to 15–25 |
| 150 catalog target derived from sketch | adversarial/scope | Unit 9 locks at "(a)∩(b)∩(c) exhausted," not at a count |
| Unit 8 file forest | scope HIGH | D-A4 single union coverage.md + manifest |
| Pre-act snapshot scope creep | scope/coherence | Removed per D-A5 |
| Survival-aware hunt heuristic | scope | Removed; OQ-2 simple fallback contract |
| R7-7 reproducibility opposing | scope vs adversarial | Resolved: hash-derived per-lobby seed (D-A2 spec) AND no R7-7 success criterion |
| Cascade lobby cadence (drops 2p/odd) | adversarial | Restored 2/4/6/8/10 (5 lobbies) per D-A3 |
| Unreachable-hand-state unfalsifiable | adversarial | 7-A Unit 6 evidence package distinguishes 4 sub-categories per cluster-suspicions output |
| Atomic-write Windows | adversarial | Risks section flags; per-seat snapshot uses retry-on-EBUSY when 7-B lands |
| Cumulative cascade state | security | No shared state in 7-A; 7-B per-turn snapshot is fresh per-turn |
| Browser navigate after spawn | security | Preserved seat-template constraint; no new navigate beyond initial URL |
| Symlinks on Windows | scope/feasibility | D-A4 manifest replaces symlink/copy approach |
| Server-boot 4x cost | feasibility | Risks section flags; ~10 hr cascade wallclock budget includes it |
| Unit 1 sunk-cost trap | product | Unit 0 triage spike + 4-hour time-box on Unit 1 |
| WOW-test on internal artifact | product | Unit 4 acceptance recast as "5-minute reviewer answers" |
| HUNT one-way commitment | product | 7-B is conditional and gated; STOP path exists |
| Snapshot validator timing | feasibility | Unit 4 validator runs after detector at end-of-run |
| Lobby-size metadata vs Player counts | feasibility | Reuse existing `Player counts:` field; parser extension lands in Unit 2 if needed |
| Mode-union refactor surface | feasibility | Unit 10 explicitly enumerates call-site changes |
| Catalog SHA drift | feasibility (deferred Q) | Risks section addresses |

(Auto-fixes from the prior pass remain applied.)

---

*Draft v2. Re-run `compound-engineering:document-review` against
this revision before locking units. The reviewers were right that v1
optimized the wrong metric; this draft tries to optimize the metric
the PRD originally cared about — finding player-experience bugs at
scale — using a measurable, gated approach.*
