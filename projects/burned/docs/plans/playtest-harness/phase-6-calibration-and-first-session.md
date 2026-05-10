---
title: "Playtest Harness — Phase 6: Calibration & First Real Session"
type: feat
status: locked
date: 2026-04-23
absorbed: 2026-04-23
deepened: 2026-04-23
locked: 2026-04-23
locked_engine_sha: e6b31b5c
locked_projection_sha: 5e86f811
locked_room_sha: e6b31b5c
parent: docs/plans/playtest-harness/roadmap.md
origin: docs/testing/PLAYTEST-HARNESS-PRD.md
---

> **2026-05-09 update — formal Series workflow never operationalized.** This plan was authored against a formal "Series N → tune → Series N+1" cadence that the harness never adopted in practice. The harness shipped, ran ad-hoc sessions (`runs/2026-04-29-2139-3p`, `2026-05-01-1654-3p`, `2026-05-08-0935-3p`, `2026-05-08-2022-5p`), and tuning lived in commit messages + run-dir artifacts rather than a TUNING-LOG. **`docs/testing/playtest/TUNING-LOG.md` was deleted 2026-05-09.** All in-text references below to "TUNING-LOG entries" / "post-series entry in TUNING-LOG.md" are plan-time intent; the actual record of harness tuning is git history. If formal calibration becomes a workstream later, the scaffold structure can be regenerated from §Calibration Output below.


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
  bugs the harness exists to detect (PRD target class). **R2 failure
  resolution matrix** (see also §Calibration Output item 10 and D14):
  - **R2 miss + R3 pass** (coverage shortfall but ≥1 promoted finding):
    series result = "harness-proved, catalog-incomplete." Route to Phase 1
    Unit 6 re-pass to extend the catalog for empty cells / under-fired
    axes; re-run ONLY the affected scenarios (not the full series).
  - **R2 miss + R3 miss**: full retry after catalog extension + triage
    review. Instrument is under-proved; no scoped re-run is defensible.
  - **zeroCellCount > 0 specifically**: per-cell remediation — Phase 1
    Unit 6 re-pass adds scenarios targeting the empty (row, column) pair;
    series #2 runs full catalog but triage + coverage analysis focuses on
    the newly-targeted cells. This is a strictly narrower subset of the
    "R2 miss + R3 pass" branch.
  The `firedCount < 50 BUT zeroCellCount === 0` shape is still R2 miss
  and still routes to the first branch — no special-case.
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
  any series-#1 run fires, Unit 1 pre-flight MUST green-stamp **six
  checks** (see §Unit 1 for the enumerated list):
  (a) Phase 3 Unit 7 isolation self-test green-stamp = `.last-selftest`
  file < 24h old (phase-3 D10). The self-test itself runs 8 checks
  including the scrubber (check 7) and retention-rotation (check 8)
  gates from phase-3 H-2b C7, but at the Phase 6 layer this counts as
  one pre-flight check;
  (b) custom subagent files exist and parse:
  `.claude/agents/playtest-seat.md` (phase-4 D2 / Unit 1b) AND
  `.claude/agents/playtest-triage.md` (phase-5 D16 / Unit 1b), both with
  frontmatter `tools:` whitelist;
  (c) scenario catalog carries populated `known-product-call:` tags for
  the A-01, B-03-07, B-13, C-15, D-03, D-16 cluster per phase-1 D4
  (Unit 6 of Phase 1);
  (d) `--no-scrub` refusal gate — if the CLI invocation passes
  `--no-scrub` without `CALIBRATION_DEBUG=1` env var set, pre-flight
  fails with an actionable message (see I3 notes in §Unit 1);
  (e) **Phase 2 capability probe (live god WS handshake)** — open a god
  WebSocket with the minted `PLAYTEST_TOKEN`, dispatch a no-op action
  against an empty room, and assert the returned god-event envelope
  carries the `expectedViewerIds` field (phase-2 D4). This is a
  **feature-detect, not a version-parse** — the `/health` endpoint's
  `version` string is advisory; the authoritative signal is the live
  envelope shape. Close the probe connection cleanly before proceeding.
  Phase 6 does NOT hot-patch any of these — a red stamp bounces back to
  the owning phase.
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
  enumerated **nine** decisions (Column-1 sidecar, detectedRole upstream,
  role-drift promotion, free-play clustering retune, godReassembly
  retune, freePlay fraction retune, split-frequency measurement, axis-11
  coverage floor confirmation, known-product-call match rate).
- **D12. Calibration quality gate — tune with care, not with noise.**
  Series #1 is simultaneously (a) the first real data the harness
  produces AND (b) the data used to tune defaults for series #2. If the
  data is noisy, tuning amplifies the noise. Before Unit 7 resolves any
  of the nine calibration-output decisions, it MUST first run a
  **signal-to-noise quality assessment** across series #1 and record a
  per-decision verdict of either `RESOLVE` or `DEFER-TO-SERIES-2`.
  Defer criteria (any single one is sufficient to defer the decisions
  it feeds):
  - **Cluster false-positive rate > 50%** (clusters that triage agent
    dismisses as unrelated, via the Phase 5 triage `cluster-dismissed`
    outcome field) → DEFER decisions 4 (free-play loose-cluster
    retune) and 6 (freePlayWallclockFraction retune).
  - **Triage run-to-run variance** (see I6 / decision 9 measurement —
    run triage twice on the same session) exceeds the known-product-call
    match rate's precision floor → DEFER decision 9. Precision floor is
    defined in the Unit 7 retrospective appendix per decision; the
    appendix ships with Unit 7.
  - **Role-drift sample count < 3** in the LOW-SIGNAL bucket across the
    full series → DEFER decisions 2 (detectedRole upstream) and 3
    (role-drift LOW-SIGNAL promotion). Insufficient sample for
    cross-corroboration.
  - **Axis-11 fire count < 5** across the series → R2 floor failed; do
    NOT tune anything axis-11-adjacent (no decisions keyed to axis-11
    data). Feed back to Phase 1 Unit 6 / Phase 4 prompt refresh.
  - **Split frequency N = 0** (no `stateVersion` arrived across > 1 WS
    frame during series #1) → DEFER decision 5 (godReassemblyTimeoutMs
    retune). No measurement means no retune basis.
  When ≥3 of the nine decisions defer, series #1 retrospective is a
  **"data collection only" outcome**: TUNING-LOG series 1 header carries
  a `SERIES-RESULT: DATA-COLLECTION-ONLY` stamp, R3 is still evaluated
  on its own merits, and series #2 must complete before any calibration
  tuning lands. This is an acceptable outcome — explicitly not a Phase 6
  failure.

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
   **Measurement protocol (I6) — run triage TWICE on the SAME session
   log** (same seed, same `events.jsonl`, same catalog; re-invoke the
   `playtest-triage` subagent fresh without access to its prior output).
   Report **both**: (a) match rate per run (expected-tagged / actual-
   tagged), AND (b) run-to-run stability (how many of the N flagged
   product calls agree between the two runs). If stability is low —
   i.e. triage results are stochastic — the signal to log is
   **"triage variance"**, NOT the tag set itself. Tag-set tuning is
   DEFERRED per D12 when stability falls below the per-decision
   precision floor defined in the Unit 7 retrospective appendix.

> **R2 coverage-failure routing (not a tuning decision; procedural).**
> The resolution matrix lives in the Requirements Trace (R2). When
> Series #1 misses R2, Unit 7 records the diagnosed branch (`R2 miss +
> R3 pass`, `R2 miss + R3 miss`, or `zeroCellCount > 0`) plus the
> scenario set to re-run in series #2. This is a procedural routing
> record, not a 10th calibration decision — the nine decisions above
> stay tune-the-instrument; R2 routing is decide-what-to-fire-next.

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
      sessionTimeoutMs: 900000,                                   // phase-3 Unit 1 (I8) required
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
Series-#1 pre-flight (D7 authorization gate — SIX checks; see Unit 1):
    1. `.last-selftest` stamp < 24h old (phase-3 D10; 8 checks per
       phase-3 Unit 7 including scrubber + retention).
    2. `.claude/agents/playtest-seat.md` exists (phase-4 Unit 1b).
    3. `.claude/agents/playtest-triage.md` exists (phase-5 Unit 1b).
    4. Scenario catalog parses; `known-product-call:` tags populated
       on the hardcoded cluster list (phase-1 Unit 6).
    5. Phase 2 capability probe — live god WS emits `expectedViewerIds`
       on the envelope (phase-2 D4; feature-detect, not version-parse).
    6. `--no-scrub` refusal gate (I3) — `--no-scrub` without
       `CALIBRATION_DEBUG=1` fails; both together warn + auto-mark
       downstream `UNSCRUBBED-RETAIN-INTERNAL-ONLY`.
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
- SERIES-RESULT: <RESOLVED | DATA-COLLECTION-ONLY>  # per D12 quality gate
- Seeds: 1002, 1003, 1005, 1008, 1010
- Harness SHA: <SHA>  # pinned at series start per D5
- Catalog SHA: <SHA>
- nopeWindowMs: 300000
- sessionTimeoutMs: <per-config>  # required per phase-3 Unit 1 (I8)
- freePlayWallclockFraction: 0.20 (phase-3 D12 default)
- godReassemblyTimeoutMs: 5000 (phase-3 D14 default)
- sessionDirRetention: 10 (phase-3 D15 default)
- scrubMode: 'on' (phase-3 D15 default)

### Calibration-output decisions (§Calibration Output 1-9; see §Appendix A)
# Each resolves as RESOLVE (Y/N/value) OR DEFER-TO-SERIES-2 per D12 / I7.
- [ ] 1. Column-1 sidecar: <RESOLVE-Y | RESOLVE-N | DEFER-TO-SERIES-2> — <rationale>
- [ ] 2. detectedRole upstream: <RESOLVE-Y | RESOLVE-N | DEFER-TO-SERIES-2> — <rationale>
- [ ] 3. Role-drift LOW-SIGNAL promotion: <RESOLVE-Y | RESOLVE-N | DEFER-TO-SERIES-2> — <rationale>
- [ ] 4. Free-play loose-cluster retune: <retune window X→Y | keep | DEFER-TO-SERIES-2> — <rationale>
- [ ] 5. godReassemblyTimeoutMs retune: <retune 5000→X | keep 5000 | DEFER-TO-SERIES-2> — <rationale>
- [ ] 6. freePlayWallclockFraction retune: <0.30 | 0.10 | keep 0.20 | DEFER-TO-SERIES-2> — <rationale>
- [ ] 7. Split-frequency observed: <N splits / M stateVersion batches>
- [ ] 8. Axis-11 fire count across series: <count> (R2 floor = 5)
- [ ] 9. Known-product-call match rate: <run1 N/M, run2 N/M, stability=Jaccard> — <RESOLVE | DEFER: triage variance>

### R2 routing verdict (if R2 missed; per Requirements Trace R2 matrix)
- Coverage outcome: <PASS | R2-miss-R3-pass | R2-miss-R3-miss | zeroCellCount>0>
- Scenario set to re-run in series #2: <list or N/A>

### Post-series resource budget (per Unit 7 / I8)
- Token spend (est): <value>
- Disk footprint pre-retention cull: <value>
- Projected series-#2 budget: <value>

### Post-series observations
- Agents consistently missed SCN-XYZ because the recognition criterion
  was ambiguous. TUNING: refine catalog entry.
- 3-player run produced 12 issues; most flagged as duplicates. TUNING:
  adjust clustering threshold.

### Changes applied before next series
# Scope guard: catalog / prompts / configs only — harness SHA is pinned (D5 / M4).
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

**Requirements:** R1, R5 (see M1 — primary coverage is isolation
selftest reuse plus the divergence-ready subagent files; D-numbered
decisions anchor the structure but the requirement trace is R-numbered)

**Dependencies:** Phase 1 catalog (including Unit 6 `known-product-call:`
tags), phase-3 Unit 7 (selftest), phase-4 Unit 1b (playtest-seat agent
file), phase-5 Unit 1b (playtest-triage agent file), phase-2 Unit 6 /
D4 (god-event `expectedViewerIds` envelope field — required for
capability probe check 5).

**Files:**
- Create: `scripts/playtest/fixtures/mini-catalog.md` — subset of the
  real catalog focused on high-confidence scenarios (normal Favor,
  normal triple-steal, Intercept chain-burn, Skip/Go-Dark). Include
  ≥1 axis-11 info-visibility scenario so the mini-run exercises the
  projection-assertion path.
- Create: `scripts/playtest/config/calibration.json`.
- Create: `scripts/playtest/pre-flight.ts` — D7 gate script. The
  A-01 / B-03-07 / B-13 / C-15 / D-03 / D-16 known-product-call
  cluster list is **hardcoded here as a single `KNOWN_PRODUCT_CALL_
  CLUSTER` constant** (M3); update this file when the cluster
  composition changes (i.e. when a new ⏸ BLOCKED or 🔴 OPEN-but-
  deliberate issue lands in `E2E-ISSUE-LIST.md`).
- Create: `scripts/playtest/pre-flight.test.ts`.
- Modify: `package.json` — add `pnpm playtest:pre-flight`.

**Approach:**
- Hand-pick 5-10 scenarios that are (a) easy for agents to recognize,
  (b) cover diverse event sequences so the three-tier fire-signature
  grammar is exercised, (c) include ≥1 axis-11 scenario (even stub-level
  `projection-assertions:` is fine) so the detector's tier-2 path runs.
- calibration.json extends the phase-3 Unit 1 Config shape (D9): 3
  seats, 5-minute Nope window, `sessionTimeoutMs: 900_000` (15 minutes;
  phase-3 Unit 1 Config required field per I8), seed=1,
  `freePlayWallclockFraction: 0.20`, `sessionDirRetention: 10`,
  `scrubMode: 'on'`, `godReassemblyTimeoutMs: 5000`, viewports default.
- `pre-flight.ts` runs **six checks** (each fail-closed; exits non-zero
  with a specific failure message):
  1. `.last-selftest` file exists AND timestamp < 24h old (phase-3
     D10). Required — the self-test underneath runs all 8 checks per
     phase-3 Unit 7 including scrubber (check 7) + retention-rotation
     (check 8), but at this layer it is counted as one pre-flight
     check.
  2. `.claude/agents/playtest-seat.md` exists and parses with
     frontmatter `tools:` whitelist (phase-4 D2 / Unit 1b).
  3. `.claude/agents/playtest-triage.md` exists and parses with
     frontmatter `tools:` whitelist (phase-5 D16 / Unit 1b).
  4. Scenario catalog at configured `catalogPath` parses; required
     fields per phase-1 D1 present per scenario (ID, title, axes,
     three-tier fire signature, 7×2 info-gap, `vibe-check:`).
     `known-product-call:` tags populated on the hardcoded
     `KNOWN_PRODUCT_CALL_CLUSTER` (phase-1 D4 / Unit 6): at minimum
     ≥1 scenario per cluster issue tagged.
  5. **Phase 2 capability probe (live god WS handshake).** Mint a
     session-scoped `PLAYTEST_TOKEN` via phase-3 D14, boot wrangler
     dev with playtest mode on, open a god WS with the token, send a
     no-op action (e.g. `{ type: 'ping' }` or any known server-action
     that returns without mutating state), and assert the god-event
     envelope on the wire carries `expectedViewerIds: string[]` (phase-
     2 D4). Close the WS + tear down wrangler before proceeding. This
     is a feature-detect, not a version-parse — the `/health`
     endpoint's version string is advisory only.
  6. **`--no-scrub` refusal gate (I3).** If CLI argv contains
     `--no-scrub` AND `process.env.CALIBRATION_DEBUG !== '1'`, fail
     with the actionable message: `"--no-scrub requires
     CALIBRATION_DEBUG=1 env var. Unscrubbed runs retain full myHand
     contents and are retained-internal-only (not shareable)."` If
     BOTH are present, pre-flight passes this check but emits a
     warning banner on stderr; downstream (Unit 3 step 7 /
     session.md end block) is responsible for auto-marking the run
     `UNSCRUBBED-RETAIN-INTERNAL-ONLY`.

**Patterns to follow:**
- Full `SCENARIOS.md` format; mini-catalog is a subset.
- Phase 3 Unit 7 `selftest.ts` style for the gate script.

**Test scenarios:**
- Happy path: fresh selftest stamp + both agent files + tagged catalog
  + live god WS emits `expectedViewerIds` + no `--no-scrub` → pre-flight
  exits 0.
- Error path: stale selftest stamp (> 24h) → exits non-zero with
  "selftest expired."
- Error path: missing `playtest-seat.md` → exits non-zero.
- Error path: missing `playtest-triage.md` → exits non-zero.
- Error path: catalog scenario missing `vibe-check:` → exits non-zero.
- Error path: A-01 cluster has zero `known-product-call:` tags → exits
  non-zero.
- Error path: live god WS returns envelope WITHOUT `expectedViewerIds`
  → exits non-zero with "Phase 2 capability probe failed — server
  missing expectedViewerIds on god-event envelope. Bounce back to
  Phase 2 Unit 6."
- Error path: `--no-scrub` passed without `CALIBRATION_DEBUG=1` →
  exits non-zero with the refusal-gate message.
- Happy path variant: `--no-scrub` + `CALIBRATION_DEBUG=1` → passes
  with stderr warning banner; no exit code change.

**Verification:**
- `pnpm playtest:pre-flight` passes against the real repo after
  Phases 1-5 complete; all **6 checks green**.
- Calibration config loads cleanly; mini-catalog parses with Phase 3
  scenario-detector.

- [ ] **Unit 2: Calibration run checklist script**

**Goal:** `pnpm playtest:verify-calibration <runDir>` script that
runs the checks from the High-Level Design calibration section against a
completed run. Pass/fail output.

**Execution note:** Test-first on check functions. Reusable for real
series runs per Unit 5 (same script, run-agnostic).

**Requirements:** R1 (see M2 — Unit 2 verifies run-artifact shape; it
does NOT check self-report vs god-event divergence, which is Phase 5's
responsibility. R5 citation removed.)

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
- **Partial-run detection (I5).** If `session.md` exists but LACKS a
  closing end-block (the "status: OK | FAIL | ABORTED" marker emitted
  by the orchestrator on clean shutdown), verify-calibration treats
  the run dir as a partial run: exits non-zero with message `"Partial
  run detected — session.md missing end-block. Invoke 'pnpm
  playtest:purge --full-dir <session-id>' before re-running."` Do
  NOT attempt to salvage; partial-run scrub-salt state is untrusted.

**Patterns to follow:**
- Phase 3 Unit 7 self-test style (8 checks table).

**Test scenarios:**
- Happy path: fixture run dir all-green → exit 0.
- Error path: fixture with missing isolation audit → exit non-zero with
  specific failure.
- Error path: fixture with legacy `entryType: 'info-gap-divergence'`
  entries → exit non-zero with "legacy entryType — rename to
  ui-spec-divergence per phase-4 C4."
- Error path: fixture with `session.md` but no end-block → exits
  non-zero with the partial-run purge instruction (I5).
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
1. `pnpm playtest:pre-flight` — D7 gate must be green (all 6 checks per Unit 1).
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
6. **Crash-recovery step (I5).** If `pnpm playtest:run` aborts
   abnormally (non-zero exit, hang, or operator `Ctrl+C`), before any
   retry the operator MUST:
   a. `taskkill //F //IM workerd.exe` (Windows) / `pkill -f workerd`
      (POSIX) to kill orphaned wrangler dev worker. Same landmine as
      CLAUDE.md "Wrangler local SQLite corruption recovery."
   b. `rm -rf .wrangler/state` per the CLAUDE.md recipe.
   c. `pnpm playtest:purge --full-dir <crashed-session-id>` to wipe
      the partial run directory (scrub artifacts + any half-written
      events.jsonl). `--full-dir` mode is an additive flag to the
      phase-3 Unit 10b purge tool; Unit 2 verify-calibration treats a
      run dir whose session.md lacks a closing end-block as a partial
      run (non-zero exit, message: `"Partial run — invoke 'pnpm
      playtest:purge --full-dir <session-id>' then re-run."`). Do
      NOT retry `pnpm playtest:run` before purging; stale scrub salts
      from a dead session contaminate next-run isolation.
7. If any check fails or anything feels wrong (post-crash-recovery):
   debug, fix, re-run. **Retry-tune scope (M4):** between-run debugging
   within a series may adjust **catalog entries, subagent prompts, or
   non-harness config values** (e.g. `nopeWindowMs`). It may NOT modify
   harness source code — the SHA is pinned at series start per D5.
   Harness source changes defer to between-series tuning. A fix that
   requires harness code changes is itself a signal that the series is
   over (pin a fresh SHA for series #2).
8. If green: write a brief `calibration-notes.md` in the run dir with
   observations, including split-frequency count (calibration-output
   item 7) and observed inter-message latency if abnormal. Note any
   `--no-scrub` use (I3) — session.md end-block should already carry
   `UNSCRUBBED-RETAIN-INTERNAL-ONLY`.

**Test scenarios:**
Test expectation: live verification, no unit tests.

**Verification:**
- All checks green.
- Claude has read enough to say "pipeline works" with evidence, not
  belief.

- [ ] **Unit 4: Series configs + Zod schema + TUNING-LOG scaffold**

**Goal:** Produce `config/series-<N>p.json` × 5, the Zod schema that
validates them, and scaffold `docs/testing/playtest/TUNING-LOG.md`.

**Requirements:** R6, R7, D4, D8, D9

**Dependencies:** Unit 3 passing.

**Files:**
- Create: `scripts/playtest/config/series-2p.json`,
  `series-3p.json`, `series-5p.json`, `series-8p.json`, `series-10p.json`.
- Create: `scripts/playtest/lib/config-schema.ts` — Zod schema that
  **mirrors phase-3 Unit 1's `interface Config` character-for-character
  plus Phase 6 extensions** (`scenarioFilter?`, `sessionTimeoutMs`).
  This file is the single source of truth for config validation;
  `pnpm playtest:run` and `pnpm playtest:pre-flight` both import it.
  Per I9: series configs are JSON files under `scripts/playtest/
  config/` (NOT scattered across the repo); validation is centralized
  here.
- Create: `scripts/playtest/lib/config-schema.test.ts` — schema-parse
  each of the 5 series configs + the calibration.json; assert all
  parse without Zod error; assert "no unknown fields" is enforced
  (`.strict()` on the schema — guards against silent drift per
  verification target below).
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
  - `sessionTimeoutMs`: scaled (60 min + 10 min per seat beyond 3;
    i.e. `3_600_000 + 600_000 × max(0, N-3)`) — required per phase-3
    Unit 1 Config (I8 upstream patch)
  - `freePlayWallclockFraction: 0.20` (phase-3 D12 default; D9
    inheritance)
  - `sessionDirRetention: 10` (phase-3 D15)
  - `scrubMode: 'on'` (phase-3 D15 default)
  - `godReassemblyTimeoutMs: 5000` (phase-3 D14)
  - `viewports: [{w:360,h:640},{w:390,h:844},{w:768,h:1024}]`
  - `scenarioFilter`: omitted (default = all scenarios). D8 allows
    per-series filter; series #1 runs full catalog.
- Zod schema uses `.strict()` to reject unknown fields; this is how
  "no config references a field not in the Config shape" is enforced
  mechanically rather than by eyeball review.

**Patterns to follow:**
- Phase 3 Unit 1 Config shape — character-for-character field names +
  defaults.

**Test scenarios:**
- `config-schema.test.ts`: each of the 5 series configs + calibration.json
  parses without Zod error.
- `config-schema.test.ts`: a synthesized config with an unknown field
  (`nonExistentField: 'x'`) fails Zod parse — validates `.strict()`.
- `config-schema.test.ts`: missing required `sessionTimeoutMs` fails
  Zod parse.

**Verification:**
- All 5 configs + calibration.json parse cleanly via `config-schema.ts`.
- Test suite covers strict-mode drift guard + required-field guards.

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
- `pnpm playtest:pre-flight` — D7 gate green across all 6 checks (Unit 1).

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
   **External-sharing gate (I4):** When a finding is promoted, BEFORE
   linking it in `E2E-ISSUE-LIST.md` Claude MUST invoke
   `pnpm playtest:purge --full-dir <run-id> --sanitized-copy
   <run-id>-sanitized` (or equivalent subcommand that produces a
   sanitized copy alongside the original retained-internal run dir).
   The `E2E-ISSUE-LIST.md` link points at the `-sanitized` copy; the
   original stays in `docs/testing/playtest/runs/` as retained-internal
   evidence. This applies to ALL promoted findings, not only `--no-
   scrub` runs; scrub is defense-in-depth, sanitization is the
   external-sharing line (phase-3 D15 operator warning at
   `scripts/playtest/README.md` stands — names + event shapes still
   leak behavioral pattern data even post-scrub).
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

**Requirements:** D4, D11, D12

**Dependencies:** Unit 5 complete. Retrospective template appendix
(§Appendix A — Retrospective Template) must exist and be populated
for each of the nine decisions before this unit runs.

**Files:**
- Modify: `docs/testing/playtest/TUNING-LOG.md` — series 1
  retrospective section, completing the Calibration-output decision
  checklist (items 1-9) using the per-decision evidence criteria from
  §Appendix A.
- Create: `docs/testing/playtest/NEXT-SESSION-NOTES.md` — top-3 tuning
  priorities with estimated impact + effort.

**Approach:**
- Walk each run: what fired, what didn't, what surprised us.
- Resolve calibration-output decisions 1-9 (§Calibration Output) with
  rationale + evidence per decision. Decisions that require code
  changes in earlier phases (e.g. decision 1 Column-1 sidecar, decision
  2 detectedRole upstream) land as items for Phase 3 Unit 9 future or
  a new unit — NOT executed in Phase 6.
- **`DEFER-TO-SERIES-2` is an allowed resolution per D12 / I7.** Any
  calibration-output decision whose evidence falls below the
  appendix-defined precision floor resolves as
  `DEFER-TO-SERIES-2` with rationale citing the trigger (e.g. "axis-11
  fires N=3 < 5 floor," "split-frequency N=0 so no retune basis,"
  "triage stability below precision floor," "role-drift samples < 3").
  An `UNDEFINED-INSUFFICIENT-DATA` verdict without citing D12 is a
  failed retrospective — the retrospective owes an explicit
  Y/N/defer, not a hedge.
- Identify the top pain points in the catalog, prompts, or triage.
- Prioritize by expected uplift (coverage ↑, noise ↓, time-to-finding ↓).
- Record **R2 routing verdict** (see §Calibration Output trailing note
  + Requirements Trace R2 matrix) — diagnosed branch + scenario set to
  re-run in series #2, if R2 missed.
- Record **post-series resource budget estimate** per I8: estimated
  Claude token spend (rough: sum of subagent invocations × avg prompt
  size), disk footprint (sum of `runs/` dir sizes before rolling
  retention culled them, including scrub sidecar if any), and
  projected series-#2 budget assuming same coverage effort. Not a
  gating metric in v1; used to track cost trajectory for PRD §9.5.

**Patterns to follow:**
- Session-end retrospective style from other BURNED memory docs.

**Test scenarios:**
Test expectation: none — reflection artifact.

**Verification:**
- Document exists with substantive content, not boilerplate.
- All 9 calibration-output decisions resolved with
  `RESOLVE` (Y/N/tuned value) OR `DEFER-TO-SERIES-2` + rationale per
  §Appendix A evidence criteria.
- R2 routing verdict recorded if R2 missed.
- Post-series resource budget estimate populated.
- Briggsy has reviewed and agreed with the top-3 priorities.

## Appendix A — Retrospective Template (per-decision evidence criteria)

Template populated in `docs/testing/playtest/TUNING-LOG.md` series 1
retrospective per Unit 7 (I10). Each of the nine calibration-output
decisions (§Calibration Output 1-9) has a row of form:

| # | Decision | Evidence required | Metric | Pass/defer threshold | Resolution form |

Populated rows:

| # | Decision | Evidence required | Metric | Threshold (decision-ready) | Resolution form |
|---|----------|-------------------|--------|----------------------------|-----------------|
| 1 | Column-1 sidecar (phase-5 D13 / Ruling A) | Count of axis-11 hand-identity scenarios fired where the analyst wanted Column-1 data but couldn't reconstruct from scrubbed events alone | `axis11HandIdentityBlockedCount` | ≥5 blocked → decide; <5 → defer | BUILD sidecar in v2 if ≥1 axis-11 hand-identity scenario could not be analyzed from scrubbed data AND the block count ≥5; OTHERWISE decline (scrubber-limited is acceptable) |
| 2 | detectedRole upstream (phase-5 Ruling B / phase-3 Unit 9 future) | Role-drift LOW-SIGNAL bucket volume + cross-corroboration with suspicion / `vibe-check: no` | `roleDriftLowSignalSamples` + `roleDriftCrossCorroborationRate` | samples ≥3 + corroboration ≥50% → decide; <3 samples → defer | BUILD `detectedRoleBySeatByStateVersion` upstream in Phase 3 Unit 9 if role-drift is HIGH-signal (corroboration ≥50%); OTHERWISE keep Phase 5 best-effort inference |
| 3 | Role-drift LOW-SIGNAL promotion (phase-5 D15) | Same evidence as #2; correlation of drift rate with actual UI ambiguity | `roleDriftCrossCorroborationRate` | ≥50% + samples ≥3 → promote to OPEN; <50% → keep LOW-SIGNAL; samples <3 → defer | Promote to OPEN for series #2 if HIGH-signal; keep LOW-SIGNAL otherwise |
| 4 | Free-play loose-cluster retune (phase-5 D12 / R9) | False-positive rate via Phase 5 triage `cluster-dismissed` outcome field | `clusterFalsePositiveRate` | decision-ready if rate ≤50%; >50% → defer ALL free-play tuning (D12 trigger) | Retune window (60s → e.g. 45s) or triple shape for series #2, OR keep; tie-break = fewer FPs at no-signal cost |
| 5 | godReassemblyTimeoutMs retune (phase-3 D14) | Observed inter-message latency + split frequency | `p99InterMessageLatencyMs`, `splitFrequency` | `splitFrequency ≥1` → decide; `splitFrequency = 0` → defer (no basis) | Retune default to `ceil(p99 × 1.5)` if systematic drift; else keep 5000 |
| 6 | freePlayWallclockFraction retune (phase-3 D12) | Finding yield per minute in free-play vs scripted segments | `freePlayFindingYield` vs `scriptedFindingYield` | both yields computable → decide; cluster-FP-rate > 50% → defer (D12 trigger) | If free-play dominates finding yield → raise to 0.30; if free-play is mostly noise → drop to 0.10; otherwise keep 0.20 |
| 7 | Split-frequency measurement (phase-2 D4 / phase-3 Unit 4) | Count of `stateVersion` batches arriving across >1 WS frame | `splitFrequency` | always computable (even if 0) | Log count; feed decision 5; flag phase-2 Unit 8 payload budget review if `splitFrequency / totalStateVersions > 0.10` |
| 8 | Axis-11 coverage floor confirmation (R2 / phase-1 catalog) | Count of axis-11 info-visibility scenarios that fired across series | `axis11FireCount` | ≥5 → pass; <5 → fail (R2 floor) | Pass/fail; on fail, feed Phase 1 Unit 6 (catalog under-draft) and/or Phase 4 (seat-agent prompt gap) |
| 9 | Known-product-call match rate (phase-5 D5 / R11 / phase-1 D4) | Triage match rate against hardcoded cluster + run-to-run stability per I6 (triage runs twice on same session) | `matchRate`, `triageRunToRunStability` | stability ≥ per-decision precision floor (see note) → decide; below → defer with "triage variance" signal | On RESOLVE: record matched vs expected, feed Phase 1 Unit 6 for misses. On DEFER: record stability number; do NOT tune tag set. |

**Precision floor note (decision 9).** v1 precision floor = 80% agreement
between the two triage runs on the set of flagged product calls
(Jaccard similarity ≥ 0.8). Below this, the signal is "triage
variance," not "tag set broken." If v1 floor proves wrong in series #1
retrospective, adjust the floor in series #2's Appendix A before that
retrospective runs.

**Decision-ready vs defer.** A decision is "ready" when its evidence
meets threshold AND none of the D12 quality-gate triggers fire for
that decision's feeder metric. Any decision can resolve to
`DEFER-TO-SERIES-2` — this is not a failure mode (I7).

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
| `--no-scrub` retains full `myHand` contents; data accidentally shared externally | Pre-flight refusal gate (I3 / Unit 1 check 6): `--no-scrub` without `CALIBRATION_DEBUG=1` fails fast. If both set: stderr warning banner + session.md end-block auto-marked `UNSCRUBBED-RETAIN-INTERNAL-ONLY`. External-sharing gate (I4 / Unit 5 step 6) refuses to link unsanitized runs in `E2E-ISSUE-LIST.md`. |
| Promoted finding linked from `E2E-ISSUE-LIST.md` leaks behavioral-pattern data | External-sharing gate (I4): Unit 5 step 6 invokes `pnpm playtest:purge --full-dir <run-id> --sanitized-copy ...` BEFORE linking; `E2E-ISSUE-LIST.md` only ever points at the `-sanitized` copy. Original run stays retained-internal. |
| Partial run after crash contaminates next run via stale salts / workerd state | Crash-recovery protocol (I5 / Unit 3 step 6): taskkill `workerd.exe` → `rm -rf .wrangler/state` → `pnpm playtest:purge --full-dir <crashed-session-id>`. Unit 2 detects partial runs by missing session.md end-block; exits non-zero with purge instruction. |
| Triage stochasticity masquerades as tag-set gap | Decision 9 measurement (I6): run triage TWICE on same session; report run-to-run stability. If Jaccard <0.8 (v1 floor, see §Appendix A note), signal is "triage variance," NOT tag set — DEFER decision 9 per D12. |
| Tuning on noisy series-#1 data calcifies bad defaults into series #2 | Calibration quality gate (C2 / D12): signal-to-noise triggers DEFER each of the nine decisions as appropriate. ≥3 defers → "DATA-COLLECTION-ONLY" series outcome stamp. Explicitly not a Phase 6 failure. |
| Harness source change mid-series invalidates D5 SHA pin | Retry-tune scope (M4 / Unit 3 step 7): within-series debugging may adjust catalog / prompts / configs, NOT harness source. Harness change ends the current series and pins a fresh SHA for series #2. |
| Server lacks `expectedViewerIds` despite `/health` claiming playtest mode | Unit 1 check 5 capability probe (I1): live god WS handshake feature-detects the envelope field, not the version string. Red probe → bounce back to Phase 2 Unit 6. |
| Config drift — new field added to phase-3 Config shape, not propagated to series configs | Unit 4 Zod schema (I9) at `scripts/playtest/lib/config-schema.ts` with `.strict()` parse; `config-schema.test.ts` schema-parses all 5 series configs + calibration.json on every run of the test suite. Unknown-field config fails Zod. |

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
- **H-5b rigor pass (2026-04-23):** this plan ingested findings
  C1 (R2 failure resolution matrix), C2 (calibration quality gate →
  D12), I1 (Phase 2 capability probe → Unit 1 check 5),
  I2 (standardized to 6 pre-flight checks), I3 (`--no-scrub` refusal
  gate → Unit 1 check 6), I4 (external-sharing purge gate → Unit 5
  step 6), I5 (crash recovery + partial-run detection → Unit 3 step 6 /
  Unit 2), I6 (triage-twice stability measurement → Calibration Output
  decision 9 + §Appendix A), I7 (DEFER-TO-SERIES-2 resolution form →
  Unit 7), I8 (upstream `sessionTimeoutMs` required per-config on
  phase-3 Unit 1 Config; no harness default), I9 (Zod config schema
  at `scripts/playtest/lib/config-schema.ts` → Unit 4), I10
  (§Appendix A retrospective template), M1 (Unit 1 Requirements use
  R-numbers not D-numbers), M2 (Unit 2 dropped R5 citation — R5 is
  Phase 5's domain), M3 (known-product-call cluster hardcoded in
  `scripts/playtest/pre-flight.ts`), M4 (between-run retry-tune scope
  excludes harness source; harness SHA pin D5 preserved).
