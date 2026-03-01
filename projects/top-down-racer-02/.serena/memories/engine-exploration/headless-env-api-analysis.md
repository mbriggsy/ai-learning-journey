# Engine API Analysis for HeadlessEnv Implementation

## Date
2026-03-01

## Overview
This document captures the exact engine API surface that Plan 02's HeadlessEnv must replicate, based on thorough code exploration of src/engine/world.ts, src/engine/track.ts, src/tracks/registry.ts, and related files.

---

## 1. World State Management API

### createWorld(track: TrackState): WorldState
**Location:** src/engine/world.ts lines 42-49

**Signature:**
```typescript
export function createWorld(track: TrackState): WorldState
```

**What it does:**
- Creates initial world state from a built track
- Initializes car at track start position with track start heading
- Initializes timing state for lap 1
- Returns WorldState with tick=0

**Return type (WorldState):**
```typescript
interface WorldState {
  tick: number;                  // Current simulation tick number
  car: CarState;                 // Car state snapshot
  track: TrackState;             // Track state (immutable reference)
  timing: TimingState;           // Timing and checkpoint state
}
```

**Cost:** Very cheap (~1ms for typical track)

### stepWorld(state: WorldState, input: Input): WorldState
**Location:** src/engine/world.ts lines 65-136

**Signature:**
```typescript
export function stepWorld(state: WorldState, input: Input): WorldState
```

**What it does:**
1. Detects surface under car's current position (calls getSurface)
2. Steps car physics with the detected surface (calls stepCar)
3. Performs swept collision detection to prevent tunneling through walls
4. Updates surface after collision resolution
5. Updates checkpoint timing
6. Returns new WorldState

**Pure function guarantee:**
- Takes state and input, returns new state
- Never mutates input (state is completely replaced)
- No Math.random, no Date.now — fully deterministic
- Track reference is passed through unchanged (same object identity)

**Cost:** ~0.1ms per step (>10,000 ticks/sec headless proven in tests)

**Input type (Input):**
```typescript
interface Input {
  steer: number;        // -1.0 (full left) to +1.0 (full right)
  throttle: number;     // 0.0 (none) to 1.0 (full)
  brake: number;        // 0.0 (none) to 1.0 (full)
}
```

**Important:** Input values should be normalized to [-1, 1] or [0, 1] ranges. Engine doesn't enforce this (allows any float), but out-of-range values will cause physics to behave erratically.

---

## 2. Track System API

### Track Lookup by ID

**Location:** src/tracks/registry.ts

**TRACKS array structure:**
```typescript
export const TRACKS: TrackInfo[] = [
  {
    id: 'track-01',
    name: 'Circuit',
    description: 'Beginner — smooth oval, wide racing',
    controlPoints: TRACK_01_CONTROL_POINTS,
    parTimes: { gold: 2400, silver: 3000, bronze: 3600 },
    shoulderSide?: 'inner',  // Optional
  },
  // ... track-02, track-03
]
```

**TrackInfo interface:**
```typescript
interface TrackInfo {
  id: string;
  name: string;
  description: string;
  controlPoints: TrackControlPoint[];
  parTimes: { gold: number; silver: number; bronze: number };
  shoulderSide?: 'inner';
}
```

**How to look up by ID:**
```typescript
import { TRACKS } from '../tracks/registry';

// Option 1: Find by ID (as Plan 02 needs)
const trackInfo = TRACKS.find(t => t.id === trackId);
if (!trackInfo) throw new Error(`Track not found: ${trackId}`);

// Option 2: Direct index (ScreenManager does this)
const trackInfo = TRACKS[trackIndex];
```

**Valid track IDs (as of now):**
- 'track-01' (Circuit)
- 'track-02' (Speedway)
- 'track-03' (Gauntlet)

### buildTrack(controlPoints: TrackControlPoint[], checkpointCount?: number): TrackState

**Location:** src/engine/track.ts lines 63-304

**Signature:**
```typescript
export function buildTrack(
  controlPoints: TrackControlPoint[],
  checkpointCount: number,
): TrackState
```

**What it does:**
1. Validates at least 3 control points
2. Builds arc-length lookup table for the centerline spline (SAMPLES_PER_SEGMENT_ARC = 20)
3. Generates dense boundary polylines (200+ samples for typical track)
4. Generates checkpoint gates at uniform arc-length intervals
5. Performs multi-pass offset smoothing to prevent inner-wall self-intersection
6. Returns immutable TrackState

**Cost:** ~10-50ms for typical track (should be done once, not every step)

**Return type (TrackState) - Immutable:**
```typescript
interface TrackState {
  controlPoints: readonly TrackControlPoint[];  // Original control points
  innerBoundary: readonly Vec2[];               // Left-side wall polyline
  outerBoundary: readonly Vec2[];               // Right-side wall polyline
  innerRoadEdge: readonly Vec2[];               // Left-side road edge
  outerRoadEdge: readonly Vec2[];               // Right-side road edge
  checkpoints: readonly Checkpoint[];           // Checkpoint gates
  arcLengthTable: ArcLengthTable;               // For uniform parameterization
  totalLength: number;                          // Total track centerline length
  startPosition: Vec2;                          // Car spawn position
  startHeading: number;                         // Car spawn heading (radians)
}
```

**Key design:**
- TrackState is immutable and shared (same reference) across entire episode
- Boundaries are closed polylines (last point = first point)
- Arc-length table is built during construction (available in TrackState)

---

## 3. Surface Detection API

### getSurface(position: Vec2, track: TrackState): Surface

**Location:** src/engine/track.ts lines 317-330

**What it does:**
1. Calls distanceToTrackCenter internally (expensive!)
2. Interpolates track width at the nearest arc-length position
3. Returns Surface enum based on distance from centerline

**Returns:**
```typescript
const enum Surface {
  Road = 0,      // Within road width
  Runoff = 1,    // Beyond runoff zone (gravel/wall area)
  Shoulder = 2,  // Sand strip between road and runoff
}
```

**Cost:** ~5-20ms per call (coarse scan + binary search)

### distanceToTrackCenter(position: Vec2, track: TrackState): { distance: number; arcLength: number }

**Location:** src/engine/track.ts lines 342-396

**Signature:**
```typescript
export function distanceToTrackCenter(
  position: Vec2,
  track: TrackState,
): { distance: number; arcLength: number }
```

**What it does:**
1. Performs coarse linear scan (samples every ~2 units)
2. Refines with ternary search (16 iterations)
3. Returns distance to nearest centerline point and its arc-length position

**Cost:** EXPENSIVE (~5-20ms per call)
- This is called by getSurface every tick, but that's unavoidable
- For observation building (raycaster), you may want to cache results or avoid multiple calls per tick

**Important:** This function is already being called every tick by the engine (in getSurface for surface detection), so it's not a new overhead for HeadlessEnv.

---

## 4. Checkpoint System API

**Location:** src/engine/checkpoint.ts

**Checkpoint structure:**
```typescript
interface Checkpoint {
  left: Vec2;        // Left edge of the gate
  right: Vec2;       // Right edge of the gate
  center: Vec2;      // Center of the gate (on the centerline)
  direction: Vec2;   // Unit vector along spline direction at this gate
  arcLength: number; // Arc-length distance from track start
}
```

**Timing state tracked per episode:**
```typescript
interface TimingState {
  currentLapTicks: number;      // Ticks elapsed in current lap
  bestLapTicks: number;         // Best completed lap time (-1 if none)
  totalRaceTicks: number;       // Total ticks since race start
  currentLap: number;           // Lap number (1-indexed)
  lastCheckpointIndex: number;  // Index of last crossed checkpoint
  lapComplete: boolean;         // True on the tick a lap finishes
  lapTimes: readonly number[];  // All completed lap times
}
```

**Important:** Car spawns with lastCheckpointIndex = 0 (on the start/finish line). This ensures a fresh start doesn't require an extra lap to register.

---

## 5. Input Handling

### Input clamping (HeadlessEnv responsibility)

**Where clamping happens:**
1. HeadlessEnv should clamp action values defensively:
   - steer: clamp to [-1, 1]
   - throttle: clamp to [0, 1]
   - brake: clamp to [0, 1]

2. Gymnasium Box space also clips (but we don't rely on it)

**No input smoothing in engine:**
The engine applies response rates internally (via INPUT_RATES constants):
```typescript
export const INPUT_RATES = {
  steer: 24.0,      // units/sec toward target
  throttle: 6.0,    // units/sec toward target
  brake: 10.0,      // units/sec toward target (fastest)
};
```
But HeadlessEnv just passes raw input each step.

---

## 6. Engine Constants (Phase 1 Tuning)

**Location:** src/engine/constants.ts

**DT (timestep):**
```typescript
export const DT = 1 / 60;  // 60Hz physics (fixed)
```

**Car parameters:**
```typescript
export const CAR = {
  mass: 800,
  weight: 800 * 9.81,
  wheelbase: 1.5,
  cgToFront: 0.85,
  cgToRear: 0.65,
  cgHeight: 0.5,
  length: 4.0,
  width: 2.0,
  maxEngineForce: 55000,
  maxBrakeForce: 50000,
  dragCoefficient: 2.0,
  rollingResistance: 150,
  maxSpeed: 160,
};
```

**Surface grip and speed multipliers:**
```typescript
export const SURFACE_GRIP: Record<number, number> = {
  0: 1.0,    // Road
  1: 0.5,    // Runoff
  2: 0.7,    // Shoulder
};

export const SURFACE_SPEED: Record<number, number> = {
  0: 1.0,    // Road (top speed ~160)
  1: 0.4,    // Runoff (top speed ~64)
  2: 0.85,   // Shoulder
};
```

**Steering:**
```typescript
export const STEER = {
  maxAngle: 0.37,      // ~21 degrees
  speedFactor: 0.025,  // High = arcade feel
};
```

---

## 7. Type Contracts (Immutable)

### Vec2
```typescript
interface Vec2 {
  readonly x: number;
  readonly y: number;
}
```

### CarState
```typescript
interface CarState {
  position: Vec2;                 // World-space CG position
  velocity: Vec2;                 // World-space velocity vector
  heading: number;                // Radians (0 = +x, π/2 = +y)
  yawRate: number;                // Radians per second
  speed: number;                  // Magnitude of velocity
  prevInput: SmoothedInput;       // For rate limiting
  surface: Surface;               // Current surface type
  accelLongitudinal: number;      // For weight transfer
  slipAngle: number;              // Rear axle slip (absolute value)
}
```

### ArcLengthTable
```typescript
interface ArcLengthTable {
  lengths: readonly number[];     // Cumulative arc length at each sample
  params: readonly number[];      // Corresponding spline parameter
  totalLength: number;            // Total loop length
}
```

---

## 8. Key Design Patterns for HeadlessEnv

### Pattern 1: Track is built once, reused
```typescript
// In constructor
this.track = buildTrack(trackInfo.controlPoints, CHECKPOINT_COUNT);

// In reset() - only create new WorldState, don't rebuild track
this.world = createWorld(this.track);
```

### Pattern 2: Step is pure
```typescript
// Each step
const prevWorld = this.world;
this.world = stepWorld(this.world, input);
// Use prevWorld and this.world for reward/observation building
```

### Pattern 3: Episode state (separate from world)
```typescript
// HeadlessEnv manages these (not in WorldState)
private stepCount = 0;
private stillnessCounter = 0;
private world: WorldState;
```

### Pattern 4: No side effects in observation building
```typescript
// Safe to call multiple times per step
const rays = castRays(car.position, car.heading, track.innerBoundary, track.outerBoundary);
const obs = buildObservation(world, rays);
```

---

## 9. Validation Checklist for Plan 02

When implementing HeadlessEnv, verify:

1. **Constructor:**
   - [ ] Track lookup by ID works (find in TRACKS array)
   - [ ] buildTrack() is called once, result stored
   - [ ] World is NOT created in constructor (wait for reset())

2. **reset():**
   - [ ] createWorld() is called with the stored track
   - [ ] Step count and stillness counter reset to 0
   - [ ] Initial observation is built from castRays + buildObservation
   - [ ] Returns { observation, info }

3. **step(action):**
   - [ ] Action values are clamped to valid ranges
   - [ ] stepWorld() is called (purely)
   - [ ] Step count is incremented
   - [ ] New observation is built
   - [ ] Reward is computed using computeReward(prevWorld, currWorld)
   - [ ] Stillness is tracked (increment if speed < threshold, else reset)
   - [ ] Termination: stillness counter >= config timeout
   - [ ] Truncation: step count >= config max steps
   - [ ] Info dict includes reward breakdown and world state snapshots

4. **Performance:**
   - [ ] Track building is done once (not per reset)
   - [ ] stepWorld() is called exactly once per step
   - [ ] Observation building doesn't call distanceToTrackCenter (use castRays)

---

## 10. References to Engine Source

- **src/engine/world.ts**: createWorld, stepWorld definitions
- **src/engine/track.ts**: buildTrack, getSurface, distanceToTrackCenter, nearestBoundaryPoint
- **src/engine/types.ts**: All type contracts (WorldState, CarState, TrackState, etc.)
- **src/engine/constants.ts**: DT, CAR, TIRE, SURFACE_*, INPUT_RATES, STEER, WALL_FRICTION
- **src/tracks/registry.ts**: TRACKS array, TrackInfo interface, track lookup pattern
- **src/renderer/GameLoop.ts**: Real example of engine usage (createWorld, stepWorld loop)
- **tests/engine/world.test.ts**: Test cases showing exact API usage patterns

