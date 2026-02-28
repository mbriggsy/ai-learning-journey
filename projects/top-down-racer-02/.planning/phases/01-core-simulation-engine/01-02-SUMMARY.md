---
phase: 01-core-simulation-engine
plan: 02
subsystem: engine
tags: [track, collision, polyline, surface-detection]

requires:
  - phase: 01-01
    provides: Vec2 math, spline geometry, type contracts
provides:
  - Track builder (control points -> boundary polylines)
  - Surface detection (road vs runoff)
  - Wall collision detection and sliding response
  - Primary track layout (TRACK_01)
affects: [01-04]

tech-stack:
  added: []
  patterns: [polyline-collision, sliding-response, track-pipeline]

key-files:
  created:
    - src/engine/track.ts
    - src/engine/collision.ts
    - src/tracks/track01.ts
    - tests/engine/track.test.ts
    - tests/engine/collision.test.ts
  modified: []

key-decisions:
  - "Boundary normals computed from wall-to-car direction (not segment perpendicular) for robustness at corners"
  - "Width interpolation uses arc-length position between control points for smooth transitions"
  - "Ternary search refinement for distanceToTrackCenter after coarse linear scan"

requirements-completed: [MECH-07, MECH-08, MECH-09, TRK-01]

duration: ~15 minutes
completed: 2026-02-27
---

# Plan 01-02 Summary: Track & Collision

## What was built

### Track Builder (`src/engine/track.ts`)
Complete track construction pipeline converting control points into renderable/collidable geometry:

- **`buildTrack(controlPoints, checkpointCount)`** -- The main pipeline:
  1. Extracts positions, builds arc-length table (20 samples/segment)
  2. Samples the spline at 200+ points, offsets by interpolated half-width to create inner/outer boundary polylines
  3. Generates checkpoint gates at uniform arc-length intervals
  4. Returns immutable TrackState with boundaries, checkpoints, arc-length table, start position/heading

- **`getSurface(position, track)`** -- Returns Surface.Road if point is within interpolated half-width of centerline, Surface.Runoff otherwise. Uses `distanceToTrackCenter` internally.

- **`distanceToTrackCenter(position, track)`** -- Coarse linear scan (~100+ samples) then ternary search refinement (16 iterations) to find nearest centerline point. Returns perpendicular distance and arc-length position.

- **`nearestBoundaryPoint(position, boundary)`** -- Linear scan over all boundary segments to find nearest point, segment index, distance, and outward normal. Used by collision detection.

Implementation details:
- Boundaries are closed loops (first point appended at end)
- Width is interpolated between control points by arc-length position
- Inner = centerline + perpCCW(tangent) * width, Outer = centerline + perpCW(tangent) * width

### Wall Collision (`src/engine/collision.ts`)
Detection and sliding response per user decisions (no bouncing, proportional speed penalty, nose rotation):

- **`pointToSegmentDistance(point, segA, segB)`** -- Standard point-to-line-segment projection with clamped parameter t. Handles degenerate (zero-length) segments.

- **`detectWallCollision(position, radius, track)`** -- Circle-vs-polyline collision against both inner and outer boundaries. Returns closest collision with penetration depth, normal (pointing into track), and contact point.

- **`resolveWallCollision(car, collision)`** -- The core sliding response:
  1. Decompose velocity into normal (into wall) and tangential (along wall) components
  2. Remove normal component entirely (no bounce)
  3. Apply WALL_FRICTION (0.3) to tangential component
  4. Speed penalty is naturally proportional to impact angle -- no branching needed
  5. Blend heading toward wall tangent: `headingBlend = min(1, normalizedImpact * 2)`
  6. Push car out of penetration: `position + normal * (penetration + 0.1)`
  7. Dampen yaw rate by impact severity

Speed penalty spectrum (verified by tests):
- 10-degree scrape: ~15-25% speed loss
- 45-degree moderate: ~30-50% speed loss
- 90-degree head-on: near-total speed loss (<5% remains)

### Track 01 (`src/tracks/track01.ts`)
Primary circuit with 22 control points forming a closed loop (~400x300 units):
- 2 hairpins (tight ~180-degree turns, width 6)
- 3 sweeping corners (wide radius, width 7-8)
- 1 chicane (S-curve, narrow width 5)
- 2 straights (width 7)

## Test Results

**52 new tests, all passing (126 total across 4 test files):**

- `tests/engine/track.test.ts`: 28 tests
  - buildTrack: boundaries > 100 points, closed loops, width accuracy, checkpoint count/ordering/width
  - getSurface: road on centerline, runoff outside, boundary detection
  - distanceToTrackCenter: accuracy, range validation
  - nearestBoundaryPoint: nearest point, distance, segment index, normal direction
  - Track 01: builds without errors, closed loop, checkpoints, surface detection

- `tests/engine/collision.test.ts`: 24 tests
  - pointToSegmentDistance: midpoint projection, endpoint clamping, degenerate segment, diagonal
  - detectWallCollision: no collision at center, inner/outer boundary penetration, normals
  - resolveWallCollision: glancing/moderate/head-on speed loss, away-from-wall no-op, heading rotation, position correction, yaw dampening, proportional speed penalty, sliding behavior

TypeScript strict mode compiles clean (`tsc --noEmit` exits 0).

## Requirements Addressed

- **MECH-07**: Three surface types (road, runoff, wall) -- getSurface distinguishes road from runoff, wall is the boundary polyline
- **MECH-08**: Wall collision slides car along wall with speed penalty proportional to impact angle -- resolveWallCollision implements sliding response
- **MECH-09**: Spline-based track geometry with centerline + width, closed loops -- buildTrack converts control points to boundary polylines via spline sampling
- **TRK-01**: Primary track with varied corners -- TRACK_01_CONTROL_POINTS defines hairpins, sweepers, chicanes, and straights
