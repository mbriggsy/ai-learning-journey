---
title: "Playtest Harness — Phase 6: Calibration & First Real Session"
type: feat
status: draft
date: 2026-04-23
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
- **R2 (PRD §8.2)** — Meaningful coverage: ≥70% of catalog scenarios fire
  across the session series (multiple runs across player counts).
- **R3 (PRD §8.3)** — ≥1 triaged issue file that Briggsy classifies as a
  genuine player-experience bug.
- **R4 (PRD §8.4)** — Recorded seed allows an issue to be reproduced on
  demand.
- **R5 (PRD §8.5)** — Zero false "scenario fired" claims: every
  self-report either matches the god-event log OR produces a recorded
  divergence finding.
- **R6 (PRD §9.1 resolved: "variety of player combos")** — Multiple
  sessions at 2, 3, 5, 8, 10 players.

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

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

### Calibration run

```text
pnpm playtest:selftest                         # must be green
pnpm playtest:run --config config/calibration.json
  config: { seats: 3, nopeWindowMs: 300000, catalogPath: fixtures/
    mini-catalog.md, seed: 1, sessionTimeoutMs: 900000 }
    │
    ▼
Run completes → orchestrator runs triage → INDEX.md written
    │
    ▼
Human (Claude) checks:
  - session.md end block status == OK
  - isolation-audit.md all-green
  - events.jsonl has valid lines
  - at least 1 seat log has ≥1 scenario-fire entry
  - at least 1 seat log has ≥1 suspicion entry
  - coverage.md renders
  - issues/INDEX.md exists (may have 0 issues, that's fine for calibration)
    │
    ▼
If any check fails: debug + fix + re-run calibration.
If all pass: calibration is green. Proceed to real session series.
```

### First real session series

```text
For each playerCount in [2, 3, 5, 8, 10]:
    pnpm playtest:run --config config/series-<N>p.json
      config: { seats: N, nopeWindowMs: 300000, catalogPath:
        docs/testing/playtest/SCENARIOS.md, seed: 1000+N,
        sessionTimeoutMs: <scaled> }
      │
      ▼
    Session completes → triage → INDEX.md
      │
      ▼
    Claude verifies no isolation breach, logs + coverage present.
      │
      ▼
    Briggsy reviews: INDEX.md, each issue file, coverage.md.
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

### Post-series observations
- Agents consistently missed SCN-XYZ because the recognition criterion
  was ambiguous. TUNING: refine catalog entry.
- 3-player run produced 12 issues; most flagged as duplicates. TUNING:
  adjust clustering threshold.

### Changes applied before next series
- Catalog SCN-XYZ recognition refined.
- Cluster threshold: 30s window → 45s window.

## Series 2 (2026-05-02)
...
```

## Implementation Units

- [ ] **Unit 1: Calibration fixtures**

**Goal:** Produce `fixtures/mini-catalog.md` (5-10 scenarios) for fast
calibration runs + `config/calibration.json`.

**Requirements:** D1

**Dependencies:** Phase 1 catalog.

**Files:**
- Create: `scripts/playtest/fixtures/mini-catalog.md` — subset of the
  real catalog focused on high-confidence scenarios (normal Favor,
  normal triple-steal, Intercept, Skip).
- Create: `scripts/playtest/config/calibration.json`.

**Approach:**
- Hand-pick 5-10 scenarios that are (a) easy for agents to recognize
  and (b) cover diverse event sequences so the detector and triage are
  exercised.
- calibration.json: 3 seats, 5-minute Nope window, 15-minute session
  timeout, seed=1.

**Patterns to follow:**
- Full `SCENARIOS.md` format; this is just a subset.

**Test scenarios:**
Test expectation: none — fixture assets.

**Verification:**
- Calibration config loads cleanly; mini-catalog parses with Phase 3
  scenario-detector.

- [ ] **Unit 2: Calibration run checklist script**

**Goal:** `pnpm playtest:verify-calibration <runDir>` script that
runs the checks from the High-Level Design calibration section against a
completed run. Pass/fail output.

**Execution note:** Test-first on check functions.

**Requirements:** R1, R5

**Dependencies:** Phases 3-5 complete.

**Files:**
- Create: `scripts/playtest/verify-calibration.ts`.
- Create: `scripts/playtest/verify-calibration.test.ts`.
- Modify: `package.json`.

**Approach:**
- Walk run dir, run checks, print table.
- Exit 0 on all pass, non-zero on any fail.

**Patterns to follow:**
- Phase 3 Unit 7 self-test style.

**Test scenarios:**
- Happy path: fixture run dir all-green → exit 0.
- Error path: fixture with missing isolation audit → exit non-zero with
  specific failure.
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
1. Confirm selftest green (Phase 3 Unit 7).
2. `pnpm playtest:run --config scripts/playtest/config/calibration.json`.
3. `pnpm playtest:verify-calibration <runDir>`.
4. Read session.md, INDEX.md, at least 2 seat logs by eye.
5. If any check fails or anything feels wrong: debug, fix, re-run.
6. If green: write a brief `calibration-notes.md` in the run dir with
   observations.

**Test scenarios:**
Test expectation: live verification, no unit tests.

**Verification:**
- All checks green.
- Claude has read enough to say "pipeline works" with evidence, not
  belief.

- [ ] **Unit 4: Series configs + TUNING-LOG scaffold**

**Goal:** Produce `config/series-<N>p.json` × 5 and scaffold
`docs/testing/playtest/TUNING-LOG.md`.

**Requirements:** R6, D4

**Dependencies:** Unit 3 passing.

**Files:**
- Create: `scripts/playtest/config/series-2p.json`,
  `series-3p.json`, `series-5p.json`, `series-8p.json`, `series-10p.json`.
- Create: `docs/testing/playtest/TUNING-LOG.md` with series 1 header +
  placeholder sections.

**Approach:**
- Each config: distinct seed (1002, 1003, 1005, 1008, 1010),
  nopeWindowMs=300000, catalogPath=real SCENARIOS.md, sessionTimeoutMs
  scaled to seat count (rough formula: 60 min + 10 min per seat beyond
  3).

**Patterns to follow:**
- Phase 3 config file shape.

**Test scenarios:**
Test expectation: none — config assets.

**Verification:**
- All 5 configs parse cleanly.

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
Per run:
1. `pnpm playtest:selftest` green.
2. `pnpm playtest:run --config config/series-Np.json`.
3. `pnpm playtest:verify-calibration <runDir>` (same script works for
   real sessions — it's a generic run-sanity check).
4. Claude reviews coverage.md + INDEX.md, confirms no obvious pipeline
   failures.
5. Hand off to Briggsy: present the run dir, walk INDEX.md, talk through
   candidate findings.
6. Briggsy decides: promote / dismiss / flag-catalog-issue. Claude
   records decisions in TUNING-LOG.md.
7. Only block the next run if a P0 issue is found and Briggsy chooses
   to fix before continuing.

**Test scenarios:**
Test expectation: live verification.

**Verification:**
- R3 satisfied: ≥1 finding promoted into `E2E-ISSUE-LIST.md`.
- R4 satisfied: pick one promoted finding, re-run with the same seed +
  config, confirm the finding reproduces.
- R5 satisfied: zero divergence findings of "self-report without event
  support" OR all such divergences are themselves triaged as real
  findings (per PRD §9.4 divergence-is-a-finding policy).

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
from the first series and list the top-3 tuning priorities for series 2.

**Requirements:** D4

**Dependencies:** Unit 5 complete.

**Files:**
- Modify: `docs/testing/playtest/TUNING-LOG.md` — series 1
  retrospective section.
- Create: `docs/testing/playtest/NEXT-SESSION-NOTES.md` — top-3 tuning
  priorities with estimated impact + effort.

**Approach:**
- Walk each run: what fired, what didn't, what surprised us.
- Identify the top pain points in the catalog, prompts, or triage.
- Prioritize by expected uplift (coverage ↑, noise ↓, time-to-finding ↓).

**Patterns to follow:**
- Session-end retrospective style from other BURNED memory docs.

**Test scenarios:**
Test expectation: none — reflection artifact.

**Verification:**
- Document exists with substantive content, not boilerplate.
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
- **Promotion target:** `docs/testing/E2E-ISSUE-LIST.md`.
- **Final docs targets:** `CLAUDE.md`, `README.md`, `TODO.md`.
- **Memory:** `feedback-elite-team-standard.md`,
  `feedback-verify-before-presenting.md`,
  `feedback-water-beads-polish.md`.
