---
phase: 01-core-simulation-engine
plan: 01
subsystem: engine
tags: [typescript, vitest, vec2, spline, catmull-rom]

requires:
  - phase: none
    provides: project initialization
provides:
  - Vec2 math module with 18 pure functions
  - Catmull-Rom spline with arc-length parameterization
  - Engine type contracts (Vec2, CarState, TrackState, etc.)
  - Physics constants and tuning parameters
  - Vitest test infrastructure
affects: [01-02, 01-03, 01-04]

tech-stack:
  added: [vitest]
  patterns: [pure-functions, immutable-data, functional-vec2]

key-files:
  created:
    - vitest.config.ts
    - src/engine/types.ts
    - src/engine/constants.ts
    - src/engine/vec2.ts
    - src/engine/spline.ts
    - tests/engine/vec2.test.ts
    - tests/engine/spline.test.ts
  modified:
    - package.json

key-decisions:
  - "Vec2 as plain interface with pure functions (not class)"
  - "Centripetal Catmull-Rom (alpha=0.5) to avoid cusps"

requirements-completed: [MECH-09, MECH-14, MECH-15]

duration: ~25 minutes
completed: 2026-02-27
---

# Plan 01-01 Summary: Foundation

## What was built

### Vitest Test Infrastructure
- Configured `vitest.config.ts` with explicit imports (no globals), test files in `tests/**/*.test.ts`
- Added `test`, `test:watch`, and `test:verbose` scripts to `package.json`

### Engine Type Contracts (`src/engine/types.ts`)
All interfaces that subsequent plans build against:
- **Vec2** -- Plain readonly interface for 2D vectors (no class, pure functions only)
- **Surface** -- const enum (Road=0, Runoff=1) for inline performance
- **Input / SmoothedInput** -- Raw and rate-limited input with computed steer angle
- **CarState** -- Complete car snapshot per tick (position, velocity, heading, yaw, etc.)
- **TrackControlPoint** -- Centerline position + half-width
- **ArcLengthTable** -- Cumulative arc-length lookup for uniform spline parameterization
- **Checkpoint** -- Gate across the track at a given arc-length distance
- **TrackState** -- Immutable built track (boundaries, checkpoints, arc-length table)
- **CollisionResult** -- Collision detection output (penetration, normal, contact point)
- **TimingState** -- Lap timing and checkpoint progress
- **WorldState** -- Full simulation state at a tick

### Physics Constants (`src/engine/constants.ts`)
All tuning parameters with documented roles:
- **DT** (1/60): Fixed timestep for MECH-14
- **CAR**: Mass, wheelbase, CG geometry, engine/brake forces, drag, speed cap
- **TIRE**: Simplified Pacejka B/C/mu parameters
- **SURFACE_GRIP**: Road=1.0, Runoff=0.5 multipliers
- **INPUT_RATES**: Steer/throttle/brake smoothing rates
- **WALL_FRICTION**: 0.3 tangential friction for wall slides
- **STEER**: Max angle and speed reduction factor

### Vec2 Math Module (`src/engine/vec2.ts`)
18 pure functions, zero external dependencies:
`vec2`, `add`, `sub`, `scale`, `dot`, `cross`, `length`, `lengthSq`, `normalize`, `rotate`, `distance`, `distanceSq`, `lerp`, `lerpAngle`, `perpCW`, `perpCCW`, `negate`, `fromAngle`

Key properties:
- All functions return new objects (no mutation)
- `normalize` returns `{0,0}` for zero/near-zero vectors
- `lerpAngle` handles wrapping around PI/-PI via shortest angular path

### Spline Module (`src/engine/spline.ts`)
Centripetal Catmull-Rom (alpha=0.5) with arc-length parameterization:
- `catmullRomPoint` -- Evaluate spline at parameter t using Hermite basis
- `catmullRomTangent` -- First derivative via differentiated Hermite basis
- `buildArcLengthTable` -- Cumulative arc-length table for closed loop (20 samples/segment default)
- `paramAtDistance` -- Binary search for O(log n) distance-to-param lookup with wrapping
- `pointAtDistance` / `tangentAtDistance` -- Convenience wrappers

## Test Results

**74 tests, all passing:**
- `tests/engine/vec2.test.ts`: 53 tests (every function tested, edge cases, purity verification)
- `tests/engine/spline.test.ts`: 21 tests (interpolation, curvature, arc-length uniformity, wrapping, tangent perpendicularity)

TypeScript strict mode compiles clean (`tsc --noEmit` exits 0).

## Requirements Addressed

- **MECH-09** (partial): Spline-based track geometry with centerline + width -- spline math implemented, track builder comes in plan 01-02
- **MECH-14** (partial): Fixed 60Hz physics tick -- DT constant defined, world step comes in plan 01-04
- **MECH-15** (partial): Custom deterministic physics -- pure TypeScript math with zero external dependencies, no Math.random
