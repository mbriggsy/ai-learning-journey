# Playtest harness — Tuning Log

One entry per series run. Each entry captures the 9 calibration-output
decisions (per
[phase-6 plan §Calibration Output](../../plans/playtest-harness/phase-6-calibration-and-first-session.md#calibration-output)),
R2 routing verdict if coverage missed, post-series observations, and
changes applied before the next series.

Scope guard (D5 / M4): between-series tuning may adjust catalog
entries, subagent prompts, or non-harness config values. It may NOT
modify harness source code — the harness SHA is **pinned at series
start**. A fix that requires harness source changes is itself a signal
that the series is over (pin a fresh SHA for the next series).

---

## Series 1 (TBD — first calibration run)

- SERIES-RESULT: <RESOLVED | DATA-COLLECTION-ONLY>  <!-- per D12 quality gate -->
- Seeds: 1002, 1003, 1005, 1008, 1010
- Harness SHA: <SHA>  <!-- pinned at series start per D5 -->
- Catalog SHA: <SHA>
- nopeWindowMs: 300000
- sessionTimeoutMs: per-config  <!-- required per phase-3 Unit 1 I8 -->
- freePlayWallclockFraction: 0.20  <!-- phase-3 D12 default -->
- godReassemblyTimeoutMs: 5000  <!-- phase-3 D14 default -->
- sessionDirRetention: 10  <!-- phase-3 D15 default -->
- scrubMode: on  <!-- phase-3 D15 default -->

### Calibration-output decisions (§Calibration Output 1-9; see Appendix A)

Each resolves as RESOLVE (Y/N/value) OR DEFER-TO-SERIES-2 per D12 / I7.

- [ ] 1. **Column-1 sidecar Y/N** (phase-5 D13 / Ruling A): <RESOLVE-Y | RESOLVE-N | DEFER-TO-SERIES-2> — <rationale>
- [ ] 2. **detectedRole upstream Y/N** (phase-5 Ruling B / phase-3 Unit 9): <RESOLVE-Y | RESOLVE-N | DEFER-TO-SERIES-2> — <rationale>
- [ ] 3. **Role-drift LOW-SIGNAL promotion Y/N** (phase-5 D15): <RESOLVE-Y | RESOLVE-N | DEFER-TO-SERIES-2> — <rationale>
- [ ] 4. **Free-play loose-cluster retune** (phase-5 D12 / R9): <retune window X→Y | keep | DEFER-TO-SERIES-2> — <rationale>
- [ ] 5. **godReassemblyTimeoutMs retune** (phase-3 D14 / Unit 4): <retune 5000→X | keep 5000 | DEFER-TO-SERIES-2> — <rationale>
- [ ] 6. **freePlayWallclockFraction retune** (phase-3 D12): <0.30 | 0.10 | keep 0.20 | DEFER-TO-SERIES-2> — <rationale>
- [ ] 7. **Split-frequency observed** (phase-2 D4 / phase-3 Unit 4): <N splits / M stateVersion batches>
- [ ] 8. **Axis-11 fire count across series** (R2 / phase-1 catalog): <count>  <!-- R2 floor = 5 -->
- [ ] 9. **Known-product-call match rate** (phase-5 D5 / R11 / phase-1 D4): <run1 N/M, run2 N/M, stability=Jaccard> — <RESOLVE | DEFER: triage variance>

### R2 routing verdict (if R2 missed; per Requirements Trace R2 matrix)

- Coverage outcome: <PASS | R2-miss-R3-pass | R2-miss-R3-miss | zeroCellCount>0>
- Scenario set to re-run in series #2: <list or N/A>

### Post-series resource budget (per Unit 7 / I8)

- Token spend (est): <value>
- Disk footprint pre-retention cull: <value>
- Projected series-#2 budget: <value>

### Post-series observations

<!-- Examples:
- Agents consistently missed SCN-XYZ because the recognition criterion
  was ambiguous. TUNING: refine catalog entry.
- 3-player run produced 12 issues; most flagged as duplicates. TUNING:
  adjust clustering threshold.
-->

### Changes applied before next series

Scope guard: catalog / prompts / configs only — harness SHA is pinned (D5 / M4).

<!-- Examples:
- Catalog SCN-XYZ recognition refined.
- Cluster threshold: 60s window → 45s window (phase-5 D12 loose-cluster).
-->

---

## Appendix A — Decision rationale cheat sheet

Each of the 9 calibration-output decisions maps to a specific
downstream phase or requirement. Context from the phase-6 plan:

1. **Column-1 sidecar Y/N** — Seat agents see only scrubbed data, so
   automated Column-1 extraction for axis-11 hand-identity scenarios
   is infeasible in v1. Options: (a) v2 emits `_unscrubbed/events.jsonl`
   sidecar, (b) orchestrator emits pre-scrub snapshot alongside scrubbed
   `events.jsonl`, (c) accept limitation + document "scrubber-limited;
   human review recommended." NOT built in series #1.
2. **detectedRole upstream Y/N** — If role-drift is HIGH-signal in
   series #1 (measured via D15 LOW-SIGNAL bucket volume + cross-
   corroboration rate), Phase 3 Unit 9 should emit
   `detectedRoleBySeatByStateVersion` alongside `FireRecord` to remove
   Phase 5's best-effort inference dependency.
3. **Role-drift LOW-SIGNAL promotion Y/N** — Calibration measures
   self-label drift rate. If drift rate is HIGH and correlates with
   actual UI ambiguity, promote from LOW-SIGNAL to OPEN for series #2.
   If drift is pure noise, keep LOW-SIGNAL.
4. **Free-play loose-cluster retune** — Default is
   `(cardType, eventType, seatRole)` triple with 60-second window,
   pinned to `events.jsonl.nowMs`. Series #1 measures false-positive
   rate. Retune for series #2 if FP exceeds judgment threshold.
5. **godReassemblyTimeoutMs retune** — Default is 5000ms; Cloudflare
   DO hibernation pauses may exceed. Retune if systematic drift
   observed.
6. **freePlayWallclockFraction retune** — Default is 0.20. Series #1
   measures whether free-play produces findings vs scripted. Raise
   to 0.30 if free-play dominates yield; drop to 0.10 if mostly noise.
7. **Split-frequency measurement** — Phase 3 Unit 4's god-event split
   reassembly uses `expectedViewerIds` per phase-2 D4 with
   `godReassemblyTimeoutMs` fallback. Series #1 records how often a
   `stateVersion` arrives across > 1 WS frame. Feeds decision 5.
8. **Axis-11 coverage floor confirmation** — Series #1 must fire ≥5
   axis-11 info-visibility scenarios. Shortfall → primary diagnosis is
   catalog under-drafting or seat-agent prompt gap. Feeds TUNING-LOG
   for series #2.
9. **Known-product-call match rate** — Triage uses
   `scenario.known-product-call:` tag, NOT parsing of
   `E2E-ISSUE-LIST.md`. Series #1 verifies the tag set catches the
   expected BLOCKED + OPEN-but-deliberate issues (A-01, B-03-07,
   B-13, C-15, D-03, D-16). **Measurement protocol (I6): run triage
   TWICE on the SAME session log** (re-invoke `playtest-triage` fresh).
   Report: (a) match rate per run, AND (b) run-to-run stability. If
   stability is low → the signal to log is **"triage variance"**, not
   the tag set itself. Tag-set tuning DEFERRED per D12 when stability
   falls below the per-decision precision floor.

### R2 coverage-failure routing (procedural, not a tuning decision)

The resolution matrix lives in the Requirements Trace (R2). When a
series misses R2, Unit 7 records the diagnosed branch plus the scenario
set to re-run in the next series.

| Branch                   | Meaning                                                        | Next-series action                                    |
|--------------------------|----------------------------------------------------------------|-------------------------------------------------------|
| R2-miss + R3-pass        | Axis-11 floor missed; scripted fires hit threshold             | Refine axis-11 scenarios; keep scripted set           |
| R2-miss + R3-miss        | Axis-11 floor missed AND scripted fires below threshold        | Catalog under-drafting; series #2 re-runs broad set   |
| zeroCellCount > 0        | Empty cell(s) in the 7×2 grid                                  | Draft scenarios targeting the empty (row, column) pair |

---

<!-- Series 2 entry appended here after series-1 retrospective lands. -->
