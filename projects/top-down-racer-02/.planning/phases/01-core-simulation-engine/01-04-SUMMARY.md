---
phase: 01-core-simulation-engine
plan: 04
subsystem: engine
tags: [world-step, checkpoint, lap-timing, determinism, integration]

requires:
  - phase: 01-01
    provides: Vec2 math, spline, types, constants
  - phase: 01-02
    provides: Track builder, collision detection
  - phase: 01-03
    provides: Car physics step function
provides:
  - World step function (single-tick simulation)
  - Checkpoint gate crossing detection
  - Lap timing system
  - Deterministic simulation guarantee
  - Complete headless simulation engine
affects: [phase-02, phase-04]

tech-stack:
  added: []
  patterns: [pure-world-step, deterministic-simulation, sequential-checkpoints]

key-files:
  created:
    - src/engine/checkpoint.ts
    - src/engine/world.ts
    - tests/engine/checkpoint.test.ts
    - tests/engine/world.test.ts
    - tests/engine/determinism.test.ts
  modified: []

key-decisions:
  - "Gate crossing via 2D segment intersection with direction check (dot product > 0)"
  - "Checkpoints must be crossed sequentially -- skipping does not advance (MECH-10)"
  - "World step order: surface -> physics -> collision -> surface (post-collision) -> checkpoints"
  - "Track reference is never modified in stepWorld (memory efficiency for training)"

requirements-completed: [MECH-10, MECH-11, MECH-14, MECH-15]

duration: ~30 minutes
completed: 2026-02-27
---

# Plan 01-04 Summary: World Integration

## What was built

### Checkpoint System (`src/engine/checkpoint.ts`)
Three pure functions for gate crossing detection and lap timing:

**`createInitialTimingState(): TimingState`**
Factory returning initial state: no checkpoints crossed, lap 1, no best time.

**`checkGateCrossing(prevPos, currPos, gate): boolean`**
2D line segment intersection between car movement vector and checkpoint gate (left-right span). Uses cross-product method for segment-segment intersection. Also verifies the crossing is in the correct direction via dot product with the gate's forward direction -- backward crossings are rejected.

**`updateTiming(timing, prevPos, currPos, checkpoints): TimingState`**
Per-tick timing update. Increments tick counter, checks if the car crossed the NEXT expected checkpoint. Checkpoints must be crossed in order (MECH-10): only the expected next gate index is tested. Lap completes when all gates crossed and gate 0 is re-crossed. Updates best lap time (minimum across completed laps) and increments lap counter.

### World Step Function (`src/engine/world.ts`)
Two exported functions orchestrating all engine modules:

**`createWorld(track: TrackState): WorldState`**
Factory placing the car at the track's start position/heading with initial timing.

**`stepWorld(state: WorldState, input: Input): WorldState`**
THE core simulation function. Pure: `(state, input) -> newState`. Step sequence per tick:
1. Detect surface under car (`getSurface`)
2. Step car physics (`stepCar` with detected surface)
3. Detect wall collision (`detectWallCollision` with CAR.width/2 radius)
4. Resolve wall collision if any (`resolveWallCollision`)
5. Re-detect surface after collision resolution (position may have changed)
6. Update checkpoint timing (`updateTiming` with pre/post positions)
7. Return new WorldState with `track` as immutable reference (same object)

Implementation notes:
- `state.track` is NEVER modified -- same reference shared across all ticks/episodes
- DT from constants.ts (1/60), never from real time
- No Math.random, no Date.now -- fully deterministic

## Key Physics Behaviors Verified

1. **Sequential checkpoints**: Car cannot skip gates -- only the expected next gate index is tested (MECH-10)
2. **Lap timing**: Best lap tracks the fastest completed lap across multiple laps (MECH-11)
3. **Determinism**: 100 independent runs of 10,000 ticks with identical inputs produce identical state hash (MECH-14, MECH-15)
4. **Oversteer emergence**: Rear slip angle exceeds front slip angle during throttle-lift cornering at speed -- natural physics, no scripted drift (MECH-05)
5. **Wall containment**: Car cannot escape the track; speed reduces on wall contact
6. **Performance**: >10,000 ticks/sec headless on a simple track (>13,000 measured)
7. **Full lap completion**: A simple steering controller successfully drives the car around a complete lap

## Test Results

**40 new tests, all passing (214 total across 8 test files):**

- `tests/engine/checkpoint.test.ts`: 27 tests
  - createInitialTimingState: defaults, purity
  - checkGateCrossing: forward, angled, backward, short, parallel, edge cases
  - updateTiming sequential: gate 0 first, sequential progression, skip rejection
  - updateTiming lap completion: lap trigger, tick reset, best time tracking, lap counter
  - updateTiming tick counting: increment, reset, empty checkpoints, immutability

- `tests/engine/world.test.ts`: 10 tests
  - Basic stepping: create world, zero input, full throttle acceleration, track identity
  - Full lap: steering controller completes a lap
  - Wall collision: car containment, speed reduction on contact
  - Surface transition: initial road surface
  - Oversteer emergence: rear slip > front slip during throttle-lift
  - Performance: >10,000 ticks/sec headless

- `tests/engine/determinism.test.ts`: 3 tests
  - Two-run hash identity
  - 100-run hash identity (10,000 ticks each)
  - No Math.random in engine code (checked post comment-stripping)

**Total project tests: 214 passing** (vec2: 53, spline: 21, track: 28, collision: 24, car: 48, checkpoint: 27, world: 10, determinism: 3)

TypeScript strict mode compiles clean (`tsc --noEmit` exits 0).

## Requirements Addressed

- **MECH-10**: Checkpoint gates crossed in order -- sequential enforcement, skipping rejected
- **MECH-11**: Lap timing tracks current and best lap -- updates on lap completion, minimum across laps
- **MECH-14**: Fixed 60Hz physics tick, deterministic -- DT constant, 100-run hash verification
- **MECH-15**: Custom deterministic physics -- no Math.random in any engine file, pure TypeScript

## Phase 1 Complete

This plan completes Phase 1: Core Simulation Engine. All 14 phase requirements are implemented and tested:
- 214 tests passing across 8 test files
- Full headless simulation: car physics, track boundaries, wall collision, checkpoint timing
- Determinism verified: 100 identical runs
- Oversteer emerges from physics model
- Performance exceeds training threshold (>10,000 ticks/sec)
- Zero PixiJS imports in engine code
- TypeScript strict mode clean
