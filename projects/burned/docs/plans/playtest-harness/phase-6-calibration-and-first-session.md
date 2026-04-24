---
title: "Playtest Harness — Phase 6: Calibration & First Real Session"
type: feat
status: draft
date: 2026-04-23
absorbed: 2026-04-23
parent: docs/plans/playtest-harness/roadmap.md
origin: docs/testing/PLAYTEST-HARNESS-PRD.md
---

# Phase 6 — Calibration & First Real Session

## Overview

Validate that Phases 1-5 work together by running (a) a dry-run calibration
session at minimum player count focused on proving isolation + pipeline
fidelity, and (b) a first real session that produces a coverage report +
triaged issues good enough to survive Briggsy's review as a genuine
player-experience finding. This is the gate to "the harness is real." If
Phase 6 fails, the harness does not land.

## Problem Frame

Each prior phase has local tests and integration smoke, but nothing has
proven that the full pipeline — catalog → server mode → orchestrator →
seat agents → triage → Briggsy-reviewable issues — actually produces the
class of finding the PRD exists to catch. Phase 6 is the end-to-end proof.
It's also where we tune: catalog coverage, seat-agent prompt effectiveness,
cluster thresholds, triage prompt rigor. Calibration is mandatory because
the harness is an instrument; running it uncalibrated is like shipping a
scale that hasn't been zeroed.

## Requirements Trace

- **R1 (PRD §8.1)** — First session produces no isolation breaches.
- **R2 (PRD §8.2 — revised via phase-3 D13.1 / B5)** — Coverage success
  criterion for the series is **absolute ≥50 distinct catalog scenarios
  fired** (primary gate) AND **zero unhit cells across the 7-row × 2-column
  info-gap matrix** (secondary gate). `passed = (firedCount >= 50) AND
  (zeroCellCount === 0)`. Phase 6 additionally requires **≥5 axis-11
  info-visibility scenarios fire** across the series, since axis-11 is the
  info-presence coverage axis most likely to catch the projection-layer
  bugs the harness exists to detect (PRD target class).
- **R3 (PRD §8.3)** — ≥1 triaged issue file that Briggsy classifies as a
  genuine player-experience bug.
- **R4 (PRD §8.4)** — Recorded seed allows an issue to be reproduced on
  demand.
- **R5 (PRD §8.5)** — Zero false "scenario fired" claims: every
  self-report either matches the god-event log OR produces a recorded
  divergence finding (four `entryType` values consumed by triage per
  phase-4 D5 / phase-5 D14: `scenario-fire`, `suspicion`, `vibe-check`,
  `ui-spec-divergence` — the last RENAMED from `info-gap-divergence` per
  phase-4 C4).
- **R6 (PRD §9.1 resolved: "variety of player combos")** — Multiple
  sessions at 2, 3, 5, 8, 10 players.
- **R7 (phase-3 D12)** — Series #1 defaults `freePlayWallclockFraction`
  to `0.20` (20% of session wallclock budgeted to free-play segments per
  phase-1 Unit 5 Part G). Phase 6 calibration decides whether this default
  survives into series #2.

## Scope Boundaries

- **In scope:** Dry-run calibration, first real session series, post-
  session review loop with Briggsy, living-instrument tuning docs.
- **Out of scope:** Fixing the bugs the first session finds — that's
  Briggsy's follow-up work, triggered by issue promotion.
- **Out of scope:** CI integration, scheduled sessions, cost analysis
  (deferred per PRD §9.5).

### Deferred to Separate Tasks

- **Automated session scheduling / cron.** v1 is on-demand only.
- **Multi-session trend dashboards.** Aggregated analytics across sessions
  is a future project.

## Context & Research

### Relevant Code and Patterns

- **All of Phases 1-5.** Phase 6 is integration; it imports the earlier
  phases' contracts.
- `docs/testing/E2E-ISSUE-LIST.md` — final promotion target for P0/P1
  findings.
- `CLAUDE.md` — final docs update target.

### Institutional Learnings

- Memory `feedback-elite-team-standard.md` — **"hardening means the
  feature WORKS end-to-end, not 'I wrote green unit tests on broken
  code.'"** Phase 6 is the embodiment: the harness is only real when a
  real session produces real findings.
- Memory `feedback-verify-before-presenting.md` — Briggsy does not
  verify; Claude verifies. Phase 6's calibration is Claude's verification
  gate before Briggsy ever sees a session result.
- Memory `feedback-water-beads-polish.md` — first-session output must
  pass the same bar. A coverage report that's half-formed is not shipped.

### External References

None.

## Key Technical Decisions

- **D1. Calibration precedes real session — no skipping.** Dry-run at 3
  players with a stub mini-catalog (5-10 scenarios) to prove the pipeline
  before committing to a full run.
- **D2. First real session is a series, not a single run.** Five runs
  at player counts {2, 3, 5, 8, 10}, each seeded for reproducibility.
  Covers the PRD §9.1 "variety of player combos" decision.
- **D3. Briggsy review after each series run, not after all 5.** Catches
  catalog or prompt problems before wasting 4 more runs on the same
  failure mode.
- **D4. Post-series tuning doc.** `docs/testing/playtest/TUNING-LOG.md`
  records what changed between series runs and why. Running history of
  catalog edits, prompt edits, clustering-threshold edits.
- **D5. Harness SHA pinned at series start.** All 5 runs use the same
  harness code SHA. Tuning happens BETWEEN series, not within. Keeps
  apples-to-apples coverage comparison across player counts.
- **D6. "Real session succeeds" means Briggsy marks ≥1 issue as a
  genuine finding.** Not a count of issues; a human-verified finding. If
  5 runs produce 40 noise issues and 0 real findings, that's a failure of
  Phase 6 — back to tuning.
- **D7. Series-#1 authorization gate is explicit, not implicit.** Before
  any series-#1 run fires, Unit 1 pre-flight MUST green-stamp all of:
  (a) Phase 3 Unit 7 isolation self-test — **8 checks** including the
  new scrubber (check 7) and retention-rotation (check 8) gates from
  phase-3 H-2b C7. Green stamp = `.last-selftest` file < 24h old
  (phase-3 D10); (b) custom subagent files exist and parse:
  `.claude/agents/playtest-seat.md` (phase-4 D2 / Unit 1b) AND
  `.claude/agents/playtest-triage.md` (phase-5 D16 / Unit 1b), both with
  frontmatter `tools:` whitelist; (c) scenario catalog carries
  populated `known-product-call:` tags for the A-01, B-03-07, B-13,
  C-15, D-03, D-16 cluster per phase-1 D4 (Unit 6 of Phase 1). Phase 6
  does NOT hot-patch any of these — a red stamp bounces back to the
  owning phase.
- **D8. Series configs filter + select scenarios via catalog fields.**
  Catalog now carries per-scenario `fire-signature:` (three-tier:
  `events:`, `shape:`, `projection-assertions:`, `ui-assertions:`,
  `connection-events:`, `inference:` — phase-1 D3), `vibe-check:`
  (phase-1 D1), `known-product-call:` (phase-1 D4), and 7×2 info-gap
  (phase-1 D5). Series configs MAY declare `scenarioFilter:` to select
  subsets (e.g. axis-11 only, Combo only, free-play only). Filter is a
  field-matcher object; missing field = accept-all. Coverage analysis
  uses these fields verbatim — no re-derivation.
- **D9. Series-#1 defaults baked from phase-3 Config shape, character-
  for-character.** Series configs extend phase-3 Unit 1 shape:
  `freePlayWallclockFraction: 0.20` (phase-3 D12),
  `sessionDirRetention: 10` (phase-3 D15 — rolling, recursive delete,
  no archive), `scrubMode: 'on'` (phase-3 D15 default),
  `godReassemblyTimeoutMs: 5000` (phase-3 D14 / Unit 4 generous default;
  hibernation pauses may exceed — phase-6 Unit 7 retrospective retunes
  if observed), `viewports: [360×640, 390×844, 768×1024]` (phase-3 Unit
  1 defaults). Series-#1 inherits these unchanged; calibration D11
  decides any retune for series #2.
- **D10. Four `entryType` values consumed distinctly during analysis
  (phase-4 D5 / phase-5 D14).** Phase 6 session-log analysis treats:
  `scenario-fire` (fire-log matches), `suspicion` (low-friction signal),
  `vibe-check` (§8.7 Archer-beat yes/no/unsure — equal weight to fire
  signature per phase-1 D1), `ui-spec-divergence` (RENAMED from
  `info-gap-divergence` per phase-4 C4). Triage consumes all four
  (phase-5 D14); Phase 6 post-run review reads each section of
  INDEX.md separately.
- **D11. Calibration output is a decision set, not a log dump.** Phase 6
  is the first place where real-session data exists; decisions deferred
  by phases 1-5 land here. See §Calibration Output below for the
  enumerated decisions (Column-1 sidecar, detectedRole upstream,
  role-drift promotion, free-play clustering retune, godReassembly
  retune, freePlay fraction retune, split-frequency measurement).

## Open Questions

### Resolved During Planning

- **How many runs before declaring Phase 6 done?** 5 runs at varied
  counts is the first series. If Briggsy validates ≥1 finding after run
  #5, Phase 6 is done. If not, tune + re-run up to 3 more times before
  escalating (the instrument may be broken).
- **What counts as "genuine player-experience bug"?** Briggsy's
  judgment. The PRD §8.3 language is deliberate: "a human reviewer would
  classify as a real player-experience problem — not a rule violation
  caught by existing tests."
- **What if the first session only finds the E-01 class of bug that's
  already fixed?** Still counts as a valid harness output — proves the
  instrument can find the class. But should not count as a "new finding."
- **Where does calibration output live?** `runs/calibration-<timestamp>/`
  with a `CALIBRATION` status flag. Not counted toward coverage.

### Deferred to Implementation

- **Exact `nopeWindowMs` value for first session.** Calibration picks
  it: start at 5 minutes (300_000ms), reduce if agents thrash, increase
  if agents miss windows.
- **Session wallclock estimate.** Per research, 10 agents × 30 turns ×
  ~20s latency ≈ 100 minutes. Calibrate with 3-player short games first;
  the 10-player run may be 2+ hours. Acceptable per PRD §9.5 "cost
  deferred."

## Calibration Output

Phase 6 is the first place with real-session data. The following
decisions were deferred by earlier phases and resolve here, one per
post-series entry in `TUNING-LOG.md`. Unit 7 retrospective records each
as a Y/N (or tuned value) with brief rationale; Unit 5's per-run review
surfaces the raw signal.

1. **Column-1 sidecar Y/N** (phase-5 D13 / Ruling A). Seat agents see
   only scrubbed data, so automated Column-1 extraction for axis-11
   hand-identity scenarios is infeasible in v1. Phase 6 decides: either
   (a) v2 emits `_unscrubbed/events.jsonl` sidecar, OR (b) orchestrator
   emits a pre-scrub Column-1 snapshot alongside the scrubbed
   `events.jsonl`, OR (c) accept the limitation and document
   "scrubber-limited; human review recommended." NOT built in series #1.
2. **detectedRole upstream Y/N** (phase-5 Ruling B / phase-3 Unit 9
   future). If role-drift is HIGH-signal in series #1 (measured via
   D15 LOW-SIGNAL bucket volume + cross-corroboration rate), Phase 3
   Unit 9 should emit `detectedRoleBySeatByStateVersion` alongside
   FireRecord to remove Phase 5's best-effort inference dependency.
   Phase 6 Unit 7 decides after series #1 data exists.
3. **Role-drift LOW-SIGNAL promotion Y/N** (phase-5 D15). Calibration
   measures self-label drift rate. If drift rate is HIGH and correlates
   with actual UI ambiguity (cross-corroborated by suspicion or
   `vibe-check: no` on the same window), promote from `LOW-SIGNAL` to
   `OPEN` for series #2. If drift is pure noise, keep `LOW-SIGNAL`.
   Owning decision lives in Phase 6.
4. **Free-play loose-cluster retune** (phase-5 D12 / R9 / phase-6 Risks).
   Default is `(cardType, eventType, seatRole)` triple with 60-second
   window, pinned to `events.jsonl.nowMs`. Series #1 measures
   false-positive rate (clusters that triage agent dismisses as
   unrelated). Retune window or triple shape for series #2 if
   false-positive rate exceeds a judgment threshold.
5. **`godReassemblyTimeoutMs` retune** (phase-3 D14 / Unit 4). Default
   is 5000ms; hibernation pauses on Cloudflare DO may exceed. Series #1
   measures observed inter-message latency and the split-frequency
   (also item 7). Retune default if systematic drift is observed.
6. **`freePlayWallclockFraction` retune** (phase-3 D12). Default is
   `0.20`. Series #1 measures whether free-play segments produce
   findings vs scripted segments. If free-play dominates finding yield,
   raise to 0.30; if free-play produces mostly noise, drop to 0.10.
7. **Split-frequency measurement** (phase-2 D4 / phase-3 Unit 4). Phase
   3 Unit 4 god-event split reassembly uses `expectedViewerIds` per
   phase-2 D4 with `godReassemblyTimeoutMs` fallback. Series #1 records
   split frequency (how often a `stateVersion` arrives across > 1 WS
   frame). Feeds decision 5 (retune timeout) and informs phase-2
   buffer-size future work.
8. **Axis-11 coverage floor confirmation** (R2 / phase-1 catalog).
   Series #1 must fire **≥5 axis-11 info-visibility scenarios**. If
   series #1 falls short, the primary diagnosis is catalog
   under-drafting or seat-agent prompt gap — feeds TUNING-LOG for
   series #2.
9. **Known-product-call match rate** (phase-5 D5 / R11 / phase-1 D4).
   Triage uses `scenario.known-product-call:` tag, NOT parsing of
   `E2E-ISSUE-LIST.md`. Series #1 verifies the tag set catches the
   expected ⏸ BLOCKED + 🔴 OPEN-but-deliberate issues (A-01, B-03-07,
   B-13, C-15, D-03, D-16). Misses feed Phase 1 Unit 6 re-pass.

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

### Calibration run

```text
pnpm playtest:selftest                         # must be green (8 checks per phase-3 Unit 7)
pnpm playtest:run --config config/calibration.json
  config extends phase-3 Unit 1 Config shape:
    {
      seats: 3,
      nopeWindowMs: 300000,
      catalogPath: 'scripts/playtest/fixtures/mini-catalog.md',
      outputRoot: 'docs/testing/playtest/runs',
      seed: 1,
      viewports: [{w:360,h:640},{w:390,h:844},{w:768,h:1024}],   // phase-3 Unit 1
      freePlayWallclockFraction: 0.20,                            // phase-3 D12
      sessionDirRetention: 10,                                    // phase-3 D15
      scrubMode: 'on',                                            // phase-3 D15 default
      godReassemblyTimeoutMs: 5000                                // phase-3 D14 / Unit 4
    }
    │
    ▼
Run completes → orchestrator runs triage → INDEX.md written
    │
    ▼
Human (Claude) checks:
  - session.md end block status == OK
  - isolation-audit.md all-green
  - events.jsonl has valid lines (scrubbed per phase-3 Unit 4b)
  - at least 1 seat log has ≥1 entry per entryType observed:
      scenario-fire, suspicion, vibe-check, ui-spec-divergence
      (four values per phase-4 D5 / phase-5 D14)
  - coverage.md renders with 7×2 info-gap grid + firedCount banner
  - issues/INDEX.md exists (may have 0 issues, that's fine for calibration)
    │
    ▼
If any check fails: debug + fix + re-run calibration.
If all pass: calibration is green. Proceed to real session series.
```

### First real session series

```text
Series-#1 pre-flight (D7 authorization gate):
    1. `.last-selftest` stamp < 24h old (phase-3 D10; 8 checks per
       phase-3 Unit 7 including scrubber + retention).
    2. `.claude/agents/playtest-seat.md` exists (phase-4 Unit 1b).
    3. `.claude/agents/playtest-triage.md` exists (phase-5 Unit 1b).
    4. Scenario catalog `known-product-call:` tags populated
       (phase-1 Unit 6).
    Any red → bounce back to owning phase; do NOT hot-patch here.

For each playerCount in [2, 3, 5, 8, 10]:
    pnpm playtest:run --config config/series-<N>p.json
      config extends phase-3 Unit 1 shape with:
        { seats: N, nopeWindowMs: 300000,
          catalogPath: 'docs/testing/playtest/SCENARIOS.md',
          outputRoot: 'docs/testing/playtest/runs',
          seed: 1000+N,
          sessionTimeoutMs: <scaled>,
          freePlayWallclockFraction: 0.20,
          sessionDirRetention: 10,
          scrubMode: 'on',
          godReassemblyTimeoutMs: 5000,
          viewports: [360×640, 390×844, 768×1024],
          scenarioFilter?: <D8 selector, omitted default = all> }
      │
      ▼
    Orchestrator per-session:
      - Mints PLAYTEST_TOKEN + scrubSalt at start (phase-3 Unit 3b).
      - Polls /health readiness endpoint (phase-2 Unit 1b), NOT bare `/`.
      - Applies rolling retention after run (phase-3 D15 / Unit 10b):
        recursive delete of session dirs beyond sessionDirRetention=10.
      │
      ▼
    Session completes → triage → INDEX.md
      (triage subagent: subagent_type 'playtest-triage', phase-5 D16)
      │
      ▼
    Claude verifies no isolation breach, logs + coverage present,
    coverage gate passes (firedCount >= 50 AND zeroCellCount === 0
    evaluated across the series-so-far, not per-run; phase-3 D13.1 / B5),
    axis-11 fire count tracked toward R2 ≥5 floor.
      │
      ▼
    Briggsy reviews: INDEX.md (with four entryType sections per
    phase-5 D14), each issue file, coverage.md.
    Decisions:
      - Promote finding → E2E-ISSUE-LIST.md with source-run link.
      - Dismiss finding → status: DISMISSED with rationale.
      - Flag catalog/prompt issue → logged in TUNING-LOG.md, tuning
        changes held until series completes or a P0 issue forces a pause.
      │
      ▼
    If ≥1 promoted finding is a "genuine player-experience bug": Phase 6
    R3 satisfied. Continue series for coverage completeness.
```

### Tuning log structure

```markdown
# BURNED Playtest Harness — Tuning Log

## Series 1 (2026-04-25)
- Seeds: 1002, 1003, 1005, 1008, 1010
- Harness SHA: <SHA>
- Catalog SHA: <SHA>
- nopeWindowMs: 300000
- freePlayWallclockFraction: 0.20 (phase-3 D12 default)
- godReassemblyTimeoutMs: 5000 (phase-3 D14 default)
- sessionDirRetention: 10 (phase-3 D15 default)
- scrubMode: 'on' (phase-3 D15 default)

### Calibration-output decisions (§Calibration Output 1-9)
- [ ] Column-1 sidecar Y/N: <decision + rationale>
- [ ] detectedRole upstream Y/N: <decision>
- [ ] Role-drift LOW-SIGNAL promotion Y/N: <decision>
- [ ] Free-play loose-cluster retune (window / triple): <retune or keep>
- [ ] godReassemblyTimeoutMs retune: <retune or keep 5000>
- [ ] freePlayWallclockFraction retune: <retune or keep 0.20>
- [ ] Split-frequency observed: <N splits / M stateVersion batches>
- [ ] Axis-11 fire count across series: <count> (R2 floor = 5)
- [ ] Known-product-call match rate: <N matched / M expected>

### Post-series observations
- Agents consistently missed SCN-XYZ because the recognition criterion
  was ambiguous. TUNING: refine catalog entry.
- 3-player run produced 12 issues; most flagged as duplicates. TUNING:
  adjust clustering threshold.

### Changes applied before next series
- Catalog SCN-XYZ recognition refined.
- Cluster threshold: 60s window → 45s window (phase-5 D12 loose-cluster).

## Series 2 (2026-05-02)
...
```

## Implementation Units

- [ ] **Unit 1: Calibration fixtures + series-#1 pre-flight gate**

**Goal:** Produce `fixtures/mini-catalog.md` (5-10 scenarios) for fast
calibration runs, `config/calibration.json`, AND the `pre-flight.ts`
authorization gate per D7.

**Requirements:** D1, D7

**Dependencies:** Phase 1 catalog (including Unit 6 `known-product-call:`
tags), phase-3 Unit 7 (selftest), phase-4 Unit 1b (playtest-seat agent
file), phase-5 Unit 1b (playtest-triage agent file).

**Files:**
- Create: `scripts/playtest/fixtures/mini-catalog.md` — subset of the
  real catalog focused on high-confidence scenarios (normal Favor,
  normal triple-steal, Intercept chain-burn, Skip/Go-Dark). Include
  ≥1 axis-11 info-visibility scenario so the mini-run exercises the
  projection-assertion path.
- Create: `scripts/playtest/config/calibration.json`.
- Create: `scripts/playtest/pre-flight.ts` — D7 gate script.
- Create: `scripts/playtest/pre-flight.test.ts`.
- Modify: `package.json` — add `pnpm playtest:pre-flight`.

**Approach:**
- Hand-pick 5-10 scenarios that are (a) easy for agents to recognize,
  (b) cover diverse event sequences so the three-tier fire-signature
  grammar is exercised, (c) include ≥1 axis-11 scenario (even stub-level
  `projection-assertions:` is fine) so the detector's tier-2 path runs.
- calibration.json extends the phase-3 Unit 1 Config shape (D9): 3
  seats, 5-minute Nope window, 15-minute session timeout, seed=1,
  `freePlayWallclockFraction: 0.20`, `sessionDirRetention: 10`,
  `scrubMode: 'on'`, `godReassemblyTimeoutMs: 5000`, viewports default.
- `pre-flight.ts` checks (each fail-closed; exits non-zero with a
  specific failure):
  1. `.last-selftest` file exists AND timestamp < 24h old (phase-3
     D10). Required — the self-test runs all 8 checks per phase-3
     Unit 7 including scrubber (check 7) + retention-rotation
     (check 8).
  2. `.claude/agents/playtest-seat.md` exists and parses with
     frontmatter `tools:` whitelist (phase-4 D2 / Unit 1b).
  3. `.claude/agents/playtest-triage.md` exists and parses with
     frontmatter `tools:` whitelist (phase-5 D16 / Unit 1b).
  4. Scenario catalog at configured `catalogPath` parses; required
     fields per phase-1 D1 present per scenario (ID, title, axes,
     three-tier fire signature, 7×2 info-gap, `vibe-check:`).
  5. `known-product-call:` tags populated on the A-01 / B-03-07 /
     B-13 / C-15 / D-03 / D-16 cluster per phase-1 D4 (Unit 6).
     At minimum: ≥1 scenario per cluster tagged.

**Patterns to follow:**
- Full `SCENARIOS.md` format; mini-catalog is a subset.
- Phase 3 Unit 7 `selftest.ts` style for the gate script.

**Test scenarios:**
- Happy path: fresh selftest stamp + both agent files + tagged catalog
  → pre-flight exits 0.
- Error path: stale selftest stamp (> 24h) → exits non-zero with
  "selftest expired."
- Error path: missing `playtest-seat.md` → exits non-zero.
- Error path: missing `playtest-triage.md` → exits non-zero.
- Error path: catalog scenario missing `vibe-check:` → exits non-zero.
- Error path: A-01 cluster has zero `known-product-call:` tags → exits
  non-zero.

**Verification:**
- `pnpm playtest:pre-flight` passes against the real repo after
  Phases 1-5 complete; all 5 checks green.
- Calibration config loads cleanly; mini-catalog parses with Phase 3
  scenario-detector.

- [ ] **Unit 2: Calibration run checklist script**

**Goal:** `pnpm playtest:verify-calibration <runDir>` script that
runs the checks from the High-Level Design calibration section against a
completed run. Pass/fail output.

**Execution note:** Test-first on check functions. Reusable for real
series runs per Unit 5 (same script, run-agnostic).

**Requirements:** R1, R5

**Dependencies:** Phases 3-5 complete.

**Files:**
- Create: `scripts/playtest/verify-calibration.ts`.
- Create: `scripts/playtest/verify-calibration.test.ts`.
- Modify: `package.json`.

**Approach:**
- Walk run dir, run checks, print table.
- Exit 0 on all pass, non-zero on any fail.
- Checks include: session.md end-block status OK; isolation-audit.md
  all-green; `events.jsonl` valid JSONL (scrubbed per phase-3 Unit
  4b); per-seat logs contain any of the four `entryType` values
  per phase-4 D5 / phase-5 D14 (`scenario-fire`, `suspicion`,
  `vibe-check`, `ui-spec-divergence`) — at least one observed is the
  calibration floor, zero is expected for a minimal mini-catalog run;
  coverage.md renders with 7×2 grid + firedCount banner per phase-3
  Unit 10; `issues/INDEX.md` exists (empty is fine for calibration).

**Patterns to follow:**
- Phase 3 Unit 7 self-test style (8 checks table).

**Test scenarios:**
- Happy path: fixture run dir all-green → exit 0.
- Error path: fixture with missing isolation audit → exit non-zero with
  specific failure.
- Error path: fixture with legacy `entryType: 'info-gap-divergence'`
  entries → exit non-zero with "legacy entryType — rename to
  ui-spec-divergence per phase-4 C4."
- Edge case: empty coverage.md (0 scenarios) → verified as empty, not
  crash.

**Verification:**
- `pnpm playtest:verify-calibration` works against sample fixture +
  real calibration runs.

- [ ] **Unit 3: Run the calibration session**

**Goal:** Actually execute the calibration run per D1.

**Execution note:** This IS a live verification. No amount of unit
testing substitutes. The elite-engineer-standard memory applies — "I
wrote green unit tests on broken code" is not hardening.

**Requirements:** R1

**Dependencies:** Units 1-2; Phases 1-5 all complete.

**Files:**
- Run artifacts under: `docs/testing/playtest/runs/calibration-<timestamp>/`.

**Approach:**
1. `pnpm playtest:pre-flight` — D7 gate must be green (all 5 checks).
2. Confirm selftest green (Phase 3 Unit 7; 8 checks including scrubber
   + retention).
3. `pnpm playtest:run --config scripts/playtest/config/calibration.json`.
   Orchestrator mints per-session PLAYTEST_TOKEN + scrubSalt (phase-3
   Unit 3b); polls `/health` for readiness (phase-2 Unit 1b), not bare
   `/`; applies rolling `sessionDirRetention: 10` after run (phase-3
   D15 / Unit 10b — recursive delete, no archive).
4. `pnpm playtest:verify-calibration <runDir>`.
5. Read session.md, INDEX.md, at least 2 seat logs by eye. Confirm
   `entryType` values observed use the four-value vocabulary per
   phase-4 D5 / phase-5 D14.
6. If any check fails or anything feels wrong: debug, fix, re-run.
7. If green: write a brief `calibration-notes.md` in the run dir with
   observations, including split-frequency count (calibration-output
   item 7) and observed inter-message latency if abnormal.

**Test scenarios:**
Test expectation: live verification, no unit tests.

**Verification:**
- All checks green.
- Claude has read enough to say "pipeline works" with evidence, not
  belief.

- [ ] **Unit 4: Series configs + TUNING-LOG scaffold**

**Goal:** Produce `config/series-<N>p.json` × 5 and scaffold
`docs/testing/playtest/TUNING-LOG.md`.

**Requirements:** R6, R7, D4, D8, D9

**Dependencies:** Unit 3 passing.

**Files:**
- Create: `scripts/playtest/config/series-2p.json`,
  `series-3p.json`, `series-5p.json`, `series-8p.json`, `series-10p.json`.
- Create: `docs/testing/playtest/TUNING-LOG.md` with series 1 header +
  placeholder sections (including the Calibration-output decision
  checklist from §Calibration Output).

**Approach:**
- Each config extends phase-3 Unit 1 Config shape with:
  - `seats: N` (2, 3, 5, 8, 10)
  - `seed: 1000+N` (distinct)
  - `nopeWindowMs: 300000`
  - `catalogPath: 'docs/testing/playtest/SCENARIOS.md'` (real, not
    mini-catalog)
  - `outputRoot: 'docs/testing/playtest/runs'`
  - `sessionTimeoutMs`: scaled (60 min + 10 min per seat beyond 3)
  - `freePlayWallclockFraction: 0.20` (phase-3 D12 default; D9
    inheritance)
  - `sessionDirRetention: 10` (phase-3 D15)
  - `scrubMode: 'on'` (phase-3 D15 default)
  - `godReassemblyTimeoutMs: 5000` (phase-3 D14)
  - `viewports: [{w:360,h:640},{w:390,h:844},{w:768,h:1024}]`
  - `scenarioFilter`: omitted (default = all scenarios). D8 allows
    per-series filter; series #1 runs full catalog.

**Patterns to follow:**
- Phase 3 Unit 1 Config shape — character-for-character field names +
  defaults.

**Test scenarios:**
Test expectation: none — config assets.

**Verification:**
- All 5 configs parse cleanly against phase-3 Unit 1's Config schema
  (use its Zod parser if wired, otherwise JSON schema).
- No config references a field not in the Config shape (guards against
  silent drift).

- [ ] **Unit 5: Run the first series, review with Briggsy, tune**

**Goal:** Execute runs #1-5 in sequence. After each, Briggsy reviews. Tune
between runs only if blocking; between-series tuning is the default.

**Execution note:** Live verification. Elite-engineer-standard. No
shortcuts.

**Requirements:** R1, R2, R3, R4, R5, R6

**Dependencies:** Units 1-4 complete; Briggsy availability.

**Files:**
- Run artifacts under: `docs/testing/playtest/runs/<timestamp>-Np/` × 5.
- Update: `docs/testing/playtest/TUNING-LOG.md` after each run.
- Update: `docs/testing/E2E-ISSUE-LIST.md` with any promoted findings.

**Approach:**
Pre-series (once, before run #1):
- `pnpm playtest:pre-flight` — D7 gate green across all 5 checks.

Per run:
1. `pnpm playtest:selftest` green (8 checks per phase-3 Unit 7 —
   stamp < 24h gate per phase-3 D10; re-run if stale).
2. `pnpm playtest:run --config config/series-Np.json`. Orchestrator
   mints per-session PLAYTEST_TOKEN + scrubSalt (phase-3 Unit 3b),
   polls `/health` (phase-2 Unit 1b), applies rolling retention of
   10 (phase-3 D15 / Unit 10b).
3. `pnpm playtest:verify-calibration <runDir>` (same script works for
   real sessions — it's a generic run-sanity check).
4. Claude reviews coverage.md (primary + secondary gates: `firedCount
   >= 50` AND `zeroCellCount === 0` across series-so-far) + INDEX.md
   (four-entryType sections per phase-5 D14), confirms no obvious
   pipeline failures.
5. Hand off to Briggsy: present the run dir, walk INDEX.md, talk through
   candidate findings.
6. Briggsy decides: promote / dismiss / flag-catalog-issue. Claude
   records decisions in TUNING-LOG.md.
7. Only block the next run if a P0 issue is found and Briggsy chooses
   to fix before continuing.

Across the series:
- Track axis-11 fire count toward the R2 ≥5 floor.
- Track calibration-output decisions 1-9 (see §Calibration Output) —
  these resolve in Unit 7 retrospective, not per-run.

**Test scenarios:**
Test expectation: live verification.

**Verification:**
- R2 satisfied: across the 5 runs, `firedCount >= 50` AND
  `zeroCellCount === 0` AND ≥5 axis-11 scenarios fire.
- R3 satisfied: ≥1 finding promoted into `E2E-ISSUE-LIST.md`.
- R4 satisfied: pick one promoted finding, re-run with the same seed +
  config, confirm the finding reproduces.
- R5 satisfied: zero divergence findings of "self-report without event
  support" OR all such divergences are themselves triaged as real
  findings (per PRD §9.4 divergence-is-a-finding policy).
- R7 satisfied: `freePlayWallclockFraction: 0.20` used for series #1;
  calibration data logged for Unit 7's retune decision.

- [ ] **Unit 6: Documentation sweep**

**Goal:** Final docs update reflecting the harness as landed.

**Requirements:** All.

**Dependencies:** Unit 5 green.

**Files:**
- Modify: `CLAUDE.md` — add "Playtest Harness" section linking PRD +
  roadmap + operator commands.
- Modify: `README.md` — mention playtest harness as a BURNED subsystem
  (one-liner + link).
- Modify: `TODO.md` — record Phase 6 done, promote any post-series
  tuning items to the real queue.
- Modify: `docs/testing/PLAYTEST-HARNESS-PRD.md` — flip status from
  `v0.2` to `LOCKED YYYY-MM-DD` (after Phase 6 success).
- Modify: each phase plan file — flip `status: draft` to
  `status: shipped` as appropriate.

**Approach:**
- Plain-English description in CLAUDE.md + README.md.
- Operator quick-reference for the three pnpm scripts.
- PRD status flip ONLY after Unit 5 R3 is satisfied.

**Patterns to follow:**
- Existing `CLAUDE.md` sectioning.
- Existing `docs/PRODUCT-SPECIFICATION.md` lock status
  convention.

**Test scenarios:**
Test expectation: none — docs.

**Verification:**
- README opens cleanly; CLAUDE.md section renders; PRD shows LOCKED.

- [ ] **Unit 7: Post-series retrospective + next-session planning**

**Goal:** Close the loop. Document what we learned about the harness
from the first series, resolve the calibration-output decisions (§1-9),
and list the top-3 tuning priorities for series 2.

**Requirements:** D4, D11

**Dependencies:** Unit 5 complete.

**Files:**
- Modify: `docs/testing/playtest/TUNING-LOG.md` — series 1
  retrospective section, completing the Calibration-output decision
  checklist (items 1-9).
- Create: `docs/testing/playtest/NEXT-SESSION-NOTES.md` — top-3 tuning
  priorities with estimated impact + effort.

**Approach:**
- Walk each run: what fired, what didn't, what surprised us.
- Resolve calibration-output decisions 1-9 (§Calibration Output) with
  rationale + evidence per decision. Decisions that require code
  changes in earlier phases (e.g. decision 1 Column-1 sidecar, decision
  2 detectedRole upstream) land as items for Phase 3 Unit 9 future or
  a new unit — NOT executed in Phase 6.
- Identify the top pain points in the catalog, prompts, or triage.
- Prioritize by expected uplift (coverage ↑, noise ↓, time-to-finding ↓).

**Patterns to follow:**
- Session-end retrospective style from other BURNED memory docs.

**Test scenarios:**
Test expectation: none — reflection artifact.

**Verification:**
- Document exists with substantive content, not boilerplate.
- All 9 calibration-output decisions resolved with Y/N + rationale.
- Briggsy has reviewed and agreed with the top-3 priorities.

## System-Wide Impact

- **Interaction graph:** No new code paths introduced in Phase 6; uses
  existing Phase 1-5 artifacts end-to-end.
- **Error propagation:** Session failures documented in run dir + TUNING-
  LOG; do not silently drop.
- **State lifecycle risks:** Run directories accumulate on disk. Policy:
  keep all runs for v1; implement retention later if disk pressure shows up.
- **API surface parity:** Docs updated in sync; PRD status flip is the
  single source of truth for "harness is real."
- **Integration coverage:** This IS the integration coverage.
- **Unchanged invariants:** Game logic, protocol, existing test suites.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Calibration reveals a pipeline gap not caught by earlier smoke tests | Expected — that's why calibration exists. Fix in the affected phase, re-run. |
| First series produces 0 genuine findings | Phase 6 acknowledges this as a failure mode. Tune (top-3 priorities from Unit 7), re-run up to 3 more series. |
| Wallclock for 10p run is prohibitive | 10p run deferred within series if too slow; 8p + 5p + 3p + 2p still satisfies variety. |
| Briggsy unavailable between runs | Claude can queue runs but cannot complete Unit 5 R3 without Briggsy's review. Pause the series, document status, resume on his return. |
| A P0 bug found mid-series requires immediate fix | Pause series, fix, re-run from the current run onward. Tuning log records the pause + fix + resume. |
| Catalog still has holes after Unit 7 retrospective | Feed back into Phase 1 — catalog is a living doc. Phase 6 doesn't "lock" the catalog; it just proves v1 is worth running. |
| `godReassemblyTimeoutMs: 5000` default is wrong for real sessions (Cloudflare DO hibernation exceeds) | Phase 3 D14 documents 5000ms as generous default. Phase 6 calibration-output decision 5 retunes based on observed inter-message latency + split frequency. Partial flush is diagnostic, not fatal. |
| Free-play loose-cluster fires on spurious signals | Phase 5 D12 uses `(cardType, eventType, seatRole)` triple + 60s window. Calibration-output decision 4 retunes for series #2 against observed false-positive rate. |
| Axis-11 fire count < 5 after series #1 | R2 floor failed. Diagnosis: catalog under-draft (feed Phase 1) or seat-agent prompt gap (feed Phase 4). TUNING-LOG records; series #2 re-targets. |
| Role-drift produces noise vs signal is ambiguous | Phase 5 D15 / Ruling B: LOW-SIGNAL bucket by default. Phase 6 decision 3 measures cross-corroboration rate; promote to OPEN only if HIGH-signal. |
| Legacy `entryType: 'info-gap-divergence'` entries leak into logs | Phase 4 C4 rename enforced by phase-4 Zod parser + verify-calibration (Unit 2 error-path test). Coercion warning surfaces, not silent accept. |

## Documentation / Operational Notes

- After Phase 6 lands, the harness is a permanent BURNED asset. Running
  it before material game changes (new card types, protocol updates,
  major visual work) is recommended but not enforced.
- TUNING-LOG is append-only; every session appends a section, even if
  just to record "ran, no changes."
- NEXT-SESSION-NOTES lives until the next series starts, then archives
  into TUNING-LOG as "prior session's top-3."

## Sources & References

- **Origin:** [docs/testing/PLAYTEST-HARNESS-PRD.md](../../testing/PLAYTEST-HARNESS-PRD.md)
- **Parent roadmap:** [docs/plans/playtest-harness/roadmap.md](./roadmap.md)
- **All prior phases:** [phase-1](./phase-1-scenarios.md),
  [phase-2](./phase-2-playtest-mode.md),
  [phase-3](./phase-3-harness-infra.md),
  [phase-4](./phase-4-seat-agents.md),
  [phase-5](./phase-5-triage-agents.md).
- **Absorbed contracts (H-5a, 2026-04-23):**
  - Phase 1 D1 (`vibe-check:`), D3 (three-tier fire signature), D4
    (`known-product-call:`), D5 (7×2 info-gap), D7 (coverage axes —
    axis-11 is the reason the harness exists).
  - Phase 2 Unit 1b (`/health` endpoint polling), D4
    (`expectedViewerIds`).
  - Phase 3 Unit 1 (Config shape), Unit 3b (PLAYTEST_TOKEN + scrubSalt
    per-session minting), Unit 4 (god-event split reassembly, 5000ms
    default), Unit 7 (8-check self-test including scrubber + retention
    gates), D10 (selftest freshness stamp), D12
    (`freePlayWallclockFraction: 0.20`), D13.1 (coverage primary +
    secondary gates), D15 (retention `10`, `scrubMode: 'on'`, recursive
    delete).
  - Phase 4 Unit 1b (`.claude/agents/playtest-seat.md`), D2 (custom
    subagent + `tools:` whitelist), D5 (four `entryType` values), D12
    (vibe-check rubric), C4 (rename `info-gap-divergence` →
    `ui-spec-divergence`).
  - Phase 5 Unit 1b (`.claude/agents/playtest-triage.md`), D5 (status
    values including `LOW-SIGNAL`), D12 (loose-cluster triple +
    60s window), D13 + Ruling A (scrubber-limited Column-1 analysis),
    D14 (four `entryType` consumption), D15 + Ruling B (role-drift
    LOW-SIGNAL), D16 (custom triage subagent).
- **Promotion target:** `docs/testing/E2E-ISSUE-LIST.md`.
- **Final docs targets:** `CLAUDE.md`, `README.md`, `TODO.md`.
- **Memory:** `feedback-elite-team-standard.md`,
  `feedback-verify-before-presenting.md`,
  `feedback-water-beads-polish.md`.
