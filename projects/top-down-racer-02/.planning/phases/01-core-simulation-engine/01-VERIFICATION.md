---
phase: 01
status: passed
verified: 2026-02-27
---

# Phase 1: Core Simulation Engine — Verification

## Goal Check

Build the headless simulation: types, vector math, spline geometry, track builder, car physics (bicycle model with weight transfer and tire grip), collision detection, checkpoint system, lap timing, and the world step function. One track. Zero rendering code. — **PASS**

All five success criteria met:
1. Car can be stepped around a closed track headlessly with analog inputs and lap timing works — PASS (world.test.ts: "steers around track" test completes a full lap)
2. Determinism test passes: identical inputs produce identical state across 10,000 ticks (100 runs, same hash) — PASS (determinism.test.ts: 100-run hash identity confirmed)
3. Car slides along walls with speed penalty and loses grip on runoff surfaces — PASS (collision.test.ts: glancing/moderate/head-on speed loss verified; tireForce halved on Runoff surface)
4. Oversteer emerges naturally when pushing the car through fast corners — PASS (world.test.ts: "oversteer emerges" test confirms rear slip > front slip; no scripted drift)
5. Headless simulation runs at 10,000+ ticks/sec on the dev machine — PASS (world.test.ts: performance test measured >13,000 ticks/sec)

---

## Must-Haves

| # | Must-Have | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Car stepped around closed track with analog inputs and lap timing | ✓ | world.test.ts steering controller completes a full lap; TimingState updates correctly |
| 2 | Determinism: 10,000 ticks × 100 runs → identical hash | ✓ | determinism.test.ts: 100-run hash identity test passes (55,633ms runtime) |
| 3 | Wall slides with speed penalty; grip loss on runoff | ✓ | collision.test.ts: 10°=~15-25% loss, 45°=~30-50% loss, 90°=near-total; tireForce halved on Runoff |
| 4 | Oversteer from physics, not scripted | ✓ | world.test.ts: rear slip angle > front slip angle during throttle-lift cornering |
| 5 | Headless performance >10,000 ticks/sec | ✓ | world.test.ts performance test: >13,000 ticks/sec measured |

---

## Requirements Traceability

All 14 Phase 1 requirements mapped to plan files. Cross-reference between PLAN.md frontmatter, SUMMARY.md reports, and REQUIREMENTS.md completion status:

| Req ID | Description | Plan | REQUIREMENTS.md | Status |
|--------|-------------|------|-----------------|--------|
| MECH-01 | Analog steering (-1.0 to +1.0) with keyboard smoothing | 01-03 | [x] Complete | ✓ |
| MECH-02 | Analog throttle/brake (0-100%) with keyboard smoothing | 01-03 | [x] Complete | ✓ |
| MECH-03 | Weight transfer affects tire load | 01-03 | [x] Complete | ✓ |
| MECH-04 | Tire grip: function of load, slip angle, surface | 01-03 | [x] Complete | ✓ |
| MECH-05 | Natural oversteer from physics | 01-03 | [x] Complete | ✓ |
| MECH-06 | Steering authority reduces at higher speed | 01-03 | [x] Complete | ✓ |
| MECH-07 | Three surface types: road, runoff, wall | 01-02 | [x] Complete | ✓ |
| MECH-08 | Wall collision slides car with proportional speed penalty | 01-02 | [x] Complete | ✓ |
| MECH-09 | Spline-based track geometry, centerline + width, closed loops | 01-01, 01-02 | [x] Complete | ✓ |
| MECH-10 | Checkpoint gates crossed in order (20-50 per track) | 01-04 | [x] Complete | ✓ |
| MECH-11 | Lap timing: current lap and best lap | 01-04 | [x] Complete | ✓ |
| MECH-14 | Fixed 60Hz physics tick, deterministic, decoupled from rendering | 01-01, 01-04 | [x] Complete | ✓ |
| MECH-15 | Custom deterministic physics (no external engine, no Math.random) | 01-01, 01-04 | [x] Complete | ✓ |
| TRK-01 | 1 primary track with hairpins, sweepers, chicanes | 01-02 | [x] Complete | ✓ |

**No gaps.** All 14 requirements are marked complete in REQUIREMENTS.md and verified implemented in their respective plan summaries.

---

## Artifact Checks

| File | Min Lines | Actual Lines | Status |
|------|-----------|--------------|--------|
| src/engine/types.ts | — | 157 | ✓ |
| src/engine/vec2.ts | 60 | 124 | ✓ |
| src/engine/spline.ts | 100 | 317 | ✓ |
| src/engine/car.ts | 150 | 256 | ✓ |
| src/engine/track.ts | 80 | 391 | ✓ |
| src/engine/collision.ts | 80 | 248 | ✓ |
| src/engine/checkpoint.ts | 60 | 169 | ✓ |
| src/engine/world.ts | 60 | 100 | ✓ |
| tests/engine/determinism.test.ts | 40 | 135 | ✓ |

All files exceed their minimum line thresholds by a comfortable margin.

---

## Test Results

- Total tests: 214
- All passing: yes
- TypeScript: clean (npx tsc --noEmit exits 0, zero errors)

**Test breakdown by file:**

| Test File | Tests | Status |
|-----------|-------|--------|
| tests/engine/vec2.test.ts | 53 | ✓ all pass |
| tests/engine/spline.test.ts | 21 | ✓ all pass |
| tests/engine/track.test.ts | 28 | ✓ all pass |
| tests/engine/collision.test.ts | 24 | ✓ all pass |
| tests/engine/car.test.ts | 48 | ✓ all pass |
| tests/engine/checkpoint.test.ts | 27 | ✓ all pass |
| tests/engine/world.test.ts | 10 | ✓ all pass |
| tests/engine/determinism.test.ts | 3 | ✓ all pass |

---

## Human Verification

The following items require human observation to fully verify (not automatable in unit tests):

1. **Car feel / oversteer quality**: The physics model produces oversteer, but whether it _feels_ satisfying and natural to drive requires a human player once the renderer is wired up in Phase 2. The math is verified; the feel is not.
2. **Track layout aesthetics**: TRACK_01 has the required corner types (hairpins, sweepers, chicanes) as verified by code inspection, but whether it produces interesting racing requires human play.
3. **Headless performance on target hardware**: >10,000 ticks/sec is confirmed on the dev machine. This should be re-verified on any deployment or training machine.

---

## Gaps

None.

All 14 Phase 1 requirements implemented, tested, and committed. All artifact size thresholds exceeded. 214 tests passing. TypeScript strict mode clean. No Math.random in engine code (verified by determinism.test.ts post-comment-strip check). Zero PixiJS imports in engine code.

---

## Verdict

**PASSED**
