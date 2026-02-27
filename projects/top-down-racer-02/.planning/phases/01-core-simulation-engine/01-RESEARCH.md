# Phase 1: Core Simulation Engine - Research

**Researched:** 2026-02-27
**Domain:** 2D car physics simulation, spline geometry, deterministic game engine architecture
**Confidence:** HIGH

## Summary

Phase 1 builds a headless simulation engine in pure TypeScript: vector math, spline-based track geometry, bicycle-model car physics with weight transfer and tire grip, wall collision with sliding response, checkpoint gates, and lap timing. The engine must be deterministic (same inputs produce identical state across runs), run at 60Hz fixed timestep, and achieve 10,000+ ticks/sec headless for future AI training.

The core physics model is the **dynamic bicycle model** (Marco Monster's "Car Physics for Games"), which models a car as two axles with slip angles, lateral forces proportional to tire load and slip, and yaw dynamics from torque imbalance. This naturally produces oversteer when rear tires saturate — no scripted drift needed. The track is a **centripetal Catmull-Rom spline** defining the centerline, with width at each control point generating left/right boundary polylines. Collision detection uses point-to-line-segment distance against boundary polylines with a sliding response that preserves tangential velocity.

**Primary recommendation:** Hand-roll everything in the engine. The requirements explicitly prohibit external physics engines (MECH-15), and the domain (2D vectors, splines, bicycle model) consists of well-documented math that is straightforward to implement and easy to test. Zero npm dependencies in `src/engine/`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Car archetype | Rally car | Loose, slidey, recoverable — matches "simcade" target |
| Oversteer level | Noticeable slide | Satisfying to catch, not punishing to trigger |
| Acceleration | ~4-5 sec to top speed | Balanced — speed matters but doesn't dominate |
| Braking | Meaningful zones | Rewards planning, mistakes recoverable |
| Runoff grip | ~50% of road | Forces staying on track, not catastrophic |
| Top speed | 150-200 units/sec | Exciting but reactable in top-down view |
| Steering at speed | Blend (responsive at low speed, wider arcs at high speed) | Natural MECH-06 implementation |
| Slide recovery | Intuitive (self-correcting) | Skill gap in avoidance, not recovery |
| Wall scrape | ~15-25% speed penalty | Punishes sloppiness, not catastrophic |
| Wall hard impact | Near-stop, then slide | Maximum momentum punishment |
| Wall contact mode | Slide along surface | Predictable for humans and AI |
| Wall rotation | Yes — nose aligns to wall | Natural wall-riding behavior |
| Speed penalty | Proportional to impact angle | Physics-based, single formula |

### Claude's Discretion
No explicit discretion areas were raised. The physics model details (specific constants, tire curve shape, spline sampling density) are implementation decisions guided by the locked feel targets above.

### Deferred Ideas (OUT OF SCOPE)
None raised during discussion.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MECH-01 | Car has analog steering (-1.0 to +1.0) with keyboard smoothing | Input smoothing via exponential lerp toward target; steering angle maps to front wheel angle |
| MECH-02 | Car has analog throttle (0-100%) and brake (0-100%) with keyboard smoothing | Same smoothing pattern; throttle drives engine force, brake applies opposing force |
| MECH-03 | Weight transfer affects tire load | Dynamic weight transfer equations: Wf = (c/L)W - (h/L)Ma, Wr = (b/L)W + (h/L)Ma |
| MECH-04 | Tire grip is function of load, slip angle, and surface type | Simplified tire curve: F = mu * Fz * sin(C * atan(B * alpha)), surface multiplier on mu |
| MECH-05 | Natural oversteer emerges from physics | Rear tire saturation at high slip angles with weight transfer lightening rear under braking |
| MECH-06 | Steering authority reduces at higher speed | Front wheel angle = steerInput * maxSteerAngle * steerCurve(speed), where curve reduces with speed |
| MECH-07 | Three surface types: road, runoff, wall | Surface enum with grip multiplier: road=1.0, runoff=0.5, wall=boundary collision |
| MECH-08 | Wall collision slides car along wall with speed penalty | Project velocity onto wall tangent; speed penalty = 1 - cos(impactAngle) scaled by friction |
| MECH-09 | Spline-based track geometry with centerline + width | Centripetal Catmull-Rom spline with per-control-point width, sampled to polyline boundaries |
| MECH-10 | Checkpoint gates along spline (20-50 per track) | Gates perpendicular to spline at uniform arc-length intervals; crossing = line segment intersection |
| MECH-11 | Lap timing tracks current lap and best lap | Tick counter from lap start; best = min(current, previous best); triggered by finish gate crossing |
| MECH-14 | Fixed 60Hz physics tick, deterministic | step(state, input) pure function, dt = 1/60, Euler integration, no randomness |
| MECH-15 | Custom deterministic physics (no external engine) | All math hand-rolled in engine, zero external physics dependencies, no Math.random |
| TRK-01 | 1 primary track with varied corners | Hand-authored control points defining hairpins, sweepers, chicanes; ~20-30 control points |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.x | Language, strict mode | Already installed; mandatory per project config |
| Vitest | 4.0.x | Unit/integration testing | Already installed; Vite-native, fast, TypeScript-first |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vite | 7.3.x | Build tooling | Already installed; only for future bundling, not used by engine directly |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled Vec2 | gl-matrix v4 | gl-matrix adds Float32Array overhead, mutable-output API, 3D/4D baggage. For 2D-only with ~15 functions, hand-rolling is cleaner and avoids dependency in engine. |
| Hand-rolled splines | @thi.ng/vectors + splines | Comprehensive but massive dependency tree. Catmull-Rom is ~80 lines to implement. |
| Simplified tire curve | Pacejka Magic Formula | Full Pacejka needs 10-20 coefficients per tire, is unstable at low speed, and is overkill for simcade feel. Simplified atan curve captures the essential shape. |
| Euler integration | RK4 integration | RK4 is more accurate but 4x the computation. At 60Hz with the forces in this sim, Euler is stable and deterministic. |

**Installation:**
```bash
# No new packages needed — engine has zero external dependencies
# Testing infrastructure already present:
pnpm add -D vitest  # already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── engine/
│   ├── types.ts           # All engine interfaces and type definitions
│   ├── vec2.ts            # 2D vector math (pure functions)
│   ├── spline.ts          # Catmull-Rom spline evaluation + arc-length
│   ├── track.ts           # Track builder (spline → boundaries → collision mesh)
│   ├── car.ts             # Car physics (bicycle model, tire forces, weight transfer)
│   ├── collision.ts       # Point-to-segment distance, wall response, surface detection
│   ├── checkpoint.ts      # Gate crossing detection, lap counting
│   ├── world.ts           # World state + step function (orchestrates all systems)
│   └── constants.ts       # Physics constants, tuning parameters
├── types/                 # Shared types (engine ↔ renderer boundary)
├── tracks/
│   └── track01.ts         # Control point data for primary track
└── ...
tests/
├── engine/
│   ├── vec2.test.ts
│   ├── spline.test.ts
│   ├── car.test.ts
│   ├── collision.test.ts
│   ├── checkpoint.test.ts
│   ├── track.test.ts
│   ├── world.test.ts
│   └── determinism.test.ts
└── ...
```

### Pattern 1: Pure State + Step Function
**What:** The simulation is a pure function: `step(state: WorldState, input: Input): WorldState`. No side effects, no mutation of input state, no global variables.
**When to use:** Always. This is the core architecture for determinism and testability.
**Why:** Enables determinism testing (replay), headless AI training, and trivial serialization.
**Example:**
```typescript
// Source: Standard ECS-lite pattern for deterministic game sims
interface WorldState {
  tick: number;
  car: CarState;
  track: TrackState;  // immutable after creation
  timing: TimingState;
}

interface Input {
  steer: number;   // -1.0 to +1.0
  throttle: number; // 0.0 to 1.0
  brake: number;    // 0.0 to 1.0
}

function step(state: WorldState, input: Input): WorldState {
  const dt = 1 / 60;
  const smoothedInput = smoothInput(state.car.prevInput, input, dt);
  const carState = stepCar(state.car, smoothedInput, state.track, dt);
  const timing = updateTiming(state.timing, carState, state.track);
  return {
    tick: state.tick + 1,
    car: carState,
    track: state.track,
    timing,
  };
}
```

### Pattern 2: Functional Vec2 on Plain Objects
**What:** Vector math as pure functions operating on `{ x: number; y: number }` interfaces. No classes, no mutation.
**When to use:** All vector operations in the engine.
**Why:** Avoids Float32Array overhead, zero allocation for temporaries (struct-like), trivially serializable, works with TypeScript strict mode.
**Example:**
```typescript
// Source: Standard pattern in custom 2D game engines
interface Vec2 {
  readonly x: number;
  readonly y: number;
}

function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len < 1e-10) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

// 2D cross product (returns scalar: z-component of 3D cross)
function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

function rotate(v: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}
```

### Pattern 3: Bicycle Model Physics Step
**What:** Dynamic bicycle model with two axles, slip angles, lateral forces, weight transfer, and yaw dynamics.
**When to use:** Car physics update each tick.
**Reference:** Marco Monster's "Car Physics for Games" (asawicki.info mirror)
**Example:**
```typescript
// Source: Marco Monster "Car Physics for Games" adapted for TypeScript
function stepCar(car: CarState, input: SmoothedInput, track: TrackState, dt: number): CarState {
  // 1. Resolve surface under car
  const surface = getSurface(car.position, track);
  const gripMul = surface === Surface.Road ? 1.0 : 0.5; // runoff

  // 2. Velocity in car-local frame
  const cosH = Math.cos(car.heading);
  const sinH = Math.sin(car.heading);
  const vLocal = {
    x:  car.velocity.x * cosH + car.velocity.y * sinH,  // forward
    y: -car.velocity.x * sinH + car.velocity.y * cosH,  // lateral
  };

  // 3. Weight transfer
  const accel = /* longitudinal acceleration from previous tick */;
  const Wf = (CAR.cgToRear / CAR.wheelbase) * CAR.weight - (CAR.cgHeight / CAR.wheelbase) * CAR.mass * accel;
  const Wr = (CAR.cgToFront / CAR.wheelbase) * CAR.weight + (CAR.cgHeight / CAR.wheelbase) * CAR.mass * accel;

  // 4. Slip angles (with low-speed guard)
  const absVx = Math.max(Math.abs(vLocal.x), 0.5);
  const slipFront = Math.atan2(vLocal.y + car.yawRate * CAR.cgToFront, absVx) - input.steerAngle * Math.sign(vLocal.x);
  const slipRear  = Math.atan2(vLocal.y - car.yawRate * CAR.cgToRear,  absVx);

  // 5. Lateral forces (simplified tire curve)
  const FlatF = tireForce(slipFront, Wf, gripMul);
  const FlatR = tireForce(slipRear,  Wr, gripMul);

  // 6. Forces and torques → acceleration
  // ... (see Code Examples section for full detail)
}

function tireForce(slipAngle: number, load: number, gripMul: number): number {
  const B = 8.0;  // stiffness factor (tune for feel)
  const C = 1.4;  // shape factor
  const mu = 1.0 * gripMul; // friction coefficient
  const maxForce = mu * load;
  return maxForce * Math.sin(C * Math.atan(B * slipAngle));
}
```

### Anti-Patterns to Avoid
- **Mutable world state:** Never mutate the previous state in `step()`. Always return a new state object. Mutation breaks determinism testing and replay.
- **PixiJS imports in engine:** The engine must have zero rendering dependencies. If you need a visual debug aid, write it as a separate tool that reads engine state.
- **Math.random() in engine:** Breaks determinism. If randomness is ever needed (it should not be in Phase 1), use a seeded PRNG passed via state.
- **Class-heavy architecture:** Prefer plain interfaces + pure functions over classes with methods. Classes hide state mutation and make serialization harder.
- **Premature optimization:** Do not use SharedArrayBuffer, WASM, or Float32Array for the initial implementation. Plain objects with number properties are fast enough for 10k+ ticks/sec.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test runner | Custom test harness | Vitest | Already installed, TypeScript-native, snapshot testing for determinism |
| Build tooling | Custom bundler config | Vite | Already installed, zero-config for TS |
| Linting/formatting | Custom style enforcement | (defer to Phase 2) | Not blocking for engine-only work |

**Key insight:** For this phase, nearly everything IS hand-rolled — that is the explicit requirement (MECH-15). The "don't hand-roll" guidance applies to infrastructure (testing, building) rather than game logic. The engine's zero-dependency constraint means every physics/math function is custom code.

## Common Pitfalls

### Pitfall 1: Low-Speed Numerical Instability
**What goes wrong:** Slip angle formulas divide by longitudinal velocity (vx). As the car approaches zero speed, slip angles explode to infinity, producing massive forces that launch the car.
**Why it happens:** `atan2(vy, vx)` is mathematically correct but numerically unstable when vx approaches zero. The car oscillates violently at rest.
**How to avoid:** Clamp the denominator: `absVx = Math.max(Math.abs(vLocal.x), MIN_SPEED)` where MIN_SPEED is ~0.5 units/sec. Below this threshold, lateral forces are negligible anyway. Alternatively, blend to a kinematic model below a speed threshold.
**Warning signs:** Car vibrates or teleports when stationary. Physics state values become NaN or Infinity.

### Pitfall 2: Slip Angle Sign Flipping
**What goes wrong:** When the car reverses direction (vx crosses zero), the slip angle sign flips abruptly, causing a sudden force reversal and jitter.
**Why it happens:** The standard formula `atan2(vy + omega*b, vx) - delta` changes behavior when vx changes sign.
**How to avoid:** Use `atan2(vy + omega*b, Math.abs(vx)) * Math.sign(vx)` or simply `atan2(vy + omega*b, Math.abs(vx))` with the steering subtraction adjusted. Test with a car decelerating through zero.
**Warning signs:** Car snaps to a different heading when speed crosses zero. Oscillation during braking to stop.

### Pitfall 3: Wall Collision Tunneling
**What goes wrong:** A fast-moving car passes through a wall segment between two ticks because the position jumps past the wall boundary.
**Why it happens:** At 200 units/sec and 60Hz, the car moves ~3.3 units per tick. If wall segments are shorter than this, the car can skip over them.
**How to avoid:** Sample track boundaries densely enough (segment length < 1 unit). Additionally, use swept-circle collision: check the line from old position to new position against wall segments, not just the new position.
**Warning signs:** Car occasionally appears on the wrong side of a wall. Happens more at high speed and tight corners.

### Pitfall 4: Spline Parameterization Non-Uniformity
**What goes wrong:** Checkpoints are unevenly spaced around the track. Some track sections have checkpoints bunched together, others have large gaps.
**Why it happens:** Equal steps in spline parameter t do not correspond to equal distances along the curve. A tight corner has many points bunched together in parameter space.
**How to avoid:** Build an arc-length lookup table during track construction. Map desired distances to spline parameters via binary search on this table. Place checkpoints at uniform arc-length intervals, not uniform parameter intervals.
**Warning signs:** Checkpoint gates are visually bunched in some areas. AI training reward signal is inconsistent.

### Pitfall 5: Oversteer Doesn't Emerge
**What goes wrong:** The car feels planted and understeery regardless of speed. No slide, no drift, no rally feel.
**Why it happens:** Tire curve is too linear (infinite grip), weight transfer is too small, or CG is too far forward. The rear tires never saturate.
**How to avoid:** Ensure the tire curve has a clear peak and falloff (the `sin(C * atan(B * alpha))` curve does this). Set CG slightly rearward of center so rear tires carry more static load but less dynamic load under braking. Make the rear grip coefficient slightly lower than front. Test by entering a corner at high speed and lifting throttle — the rear should step out.
**Warning signs:** Car always understeers. Lifting throttle mid-corner has no effect on handling balance.

### Pitfall 6: Determinism Breaks Silently
**What goes wrong:** The determinism test passes initially but fails after code changes. Two runs with identical inputs produce different final states.
**Why it happens:** A code change introduced: conditional branches based on floating-point equality, different evaluation order of operations, uninitialized values, or accidental use of Date.now/Math.random.
**How to avoid:** Hash the full state after every tick in the determinism test. Compare hashes across runs. When it breaks, binary search for the first divergent tick. Never use `===` to compare floats. Never depend on object property iteration order for computation.
**Warning signs:** Determinism test fails intermittently. State hash diverges at a specific tick number.

## Code Examples

Verified patterns from authoritative sources:

### Centripetal Catmull-Rom Spline Evaluation
```typescript
// Source: Wikipedia "Centripetal Catmull-Rom spline" + CMU 15-462 reparameterization notes
// Centripetal (alpha=0.5) avoids cusps and self-intersections

function catmullRomPoint(
  p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2,
  t: number // 0 to 1, interpolates between p1 and p2
): Vec2 {
  // Centripetal parameterization
  function knotInterval(a: Vec2, b: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(Math.sqrt(dx * dx + dy * dy)); // alpha = 0.5
  }

  const dt0 = knotInterval(p0, p1);
  const dt1 = knotInterval(p1, p2);
  const dt2 = knotInterval(p2, p3);

  // Compute tangents
  const t1x = (p2.x - p0.x) / (dt0 + dt1) - (p2.x - p1.x) / dt1 + (p1.x - p0.x) / dt0;
  const t1y = (p2.y - p0.y) / (dt0 + dt1) - (p2.y - p1.y) / dt1 + (p1.y - p0.y) / dt0;
  const t2x = (p3.x - p1.x) / (dt1 + dt2) - (p3.x - p2.x) / dt2 + (p2.x - p1.x) / dt1;
  const t2y = (p3.y - p1.y) / (dt1 + dt2) - (p3.y - p2.y) / dt2 + (p2.y - p1.y) / dt1;

  // Scale tangents
  const m1x = t1x * dt1;
  const m1y = t1y * dt1;
  const m2x = t2x * dt1;
  const m2y = t2y * dt1;

  // Hermite basis
  const t2_ = t * t;
  const t3_ = t2_ * t;
  const h00 = 2 * t3_ - 3 * t2_ + 1;
  const h10 = t3_ - 2 * t2_ + t;
  const h01 = -2 * t3_ + 3 * t2_;
  const h11 = t3_ - t2_;

  return {
    x: h00 * p1.x + h10 * m1x + h01 * p2.x + h11 * m2x,
    y: h00 * p1.y + h10 * m1y + h01 * p2.y + h11 * m2y,
  };
}
```

### Arc-Length Reparameterization
```typescript
// Source: CMU 15-462 "Reparameterizing a Catmull-Rom Spline"
// Build lookup table mapping arc length → spline parameter

interface ArcLengthTable {
  lengths: number[];    // cumulative arc length at each sample
  params: number[];     // corresponding spline parameter (0 to N for N segments)
  totalLength: number;
}

function buildArcLengthTable(controlPoints: Vec2[], samplesPerSegment: number): ArcLengthTable {
  const n = controlPoints.length; // closed loop: indices wrap
  const lengths: number[] = [0];
  const params: number[] = [0];
  let cumLength = 0;
  let prev = controlPoints[0];

  for (let seg = 0; seg < n; seg++) {
    for (let i = 1; i <= samplesPerSegment; i++) {
      const t = i / samplesPerSegment;
      const p0 = controlPoints[(seg - 1 + n) % n];
      const p1 = controlPoints[seg];
      const p2 = controlPoints[(seg + 1) % n];
      const p3 = controlPoints[(seg + 2) % n];
      const pt = catmullRomPoint(p0, p1, p2, p3, t);
      const dx = pt.x - prev.x;
      const dy = pt.y - prev.y;
      cumLength += Math.sqrt(dx * dx + dy * dy);
      lengths.push(cumLength);
      params.push(seg + t);
      prev = pt;
    }
  }

  return { lengths, params, totalLength: cumLength };
}

function paramAtDistance(table: ArcLengthTable, distance: number): number {
  // Binary search for the parameter at a given arc length distance
  const d = ((distance % table.totalLength) + table.totalLength) % table.totalLength;
  let lo = 0;
  let hi = table.lengths.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (table.lengths[mid] < d) lo = mid;
    else hi = mid;
  }
  const frac = (d - table.lengths[lo]) / (table.lengths[hi] - table.lengths[lo]);
  return table.params[lo] + frac * (table.params[hi] - table.params[lo]);
}
```

### Wall Collision Response
```typescript
// Source: Standard 2D collision response (Tim Wheeler, GDC collision talks)

interface CollisionResult {
  collided: boolean;
  penetration: number;
  normal: Vec2;       // points away from wall, into track
  contactPoint: Vec2;
}

function resolveWallCollision(
  car: CarState,
  collision: CollisionResult,
  dt: number
): CarState {
  if (!collision.collided) return car;

  const n = collision.normal;
  const v = car.velocity;

  // Decompose velocity into normal and tangential components
  const vDotN = dot(v, n);

  // Only resolve if moving into wall
  if (vDotN >= 0) return car;

  const vNormal = scale(n, vDotN);        // component into wall
  const vTangent = sub(v, vNormal);        // component along wall

  // Impact angle: 0 = parallel scrape, PI/2 = head-on
  const speed = length(v);
  const impactAngle = Math.acos(Math.min(1, length(vTangent) / Math.max(speed, 0.01)));

  // Speed penalty proportional to impact angle (MECH-08)
  const wallFriction = 0.3;
  const tangentSpeed = length(vTangent) * (1 - wallFriction);
  const newVelocity = scale(normalize(vTangent), tangentSpeed);

  // Rotate car nose to align with wall (from CONTEXT.md decision)
  const wallDir = normalize(vTangent);
  const targetHeading = Math.atan2(wallDir.y, wallDir.x);
  const headingBlend = Math.min(1, impactAngle * 2); // more rotation for harder impacts
  const newHeading = lerpAngle(car.heading, targetHeading, headingBlend);

  // Push car out of wall
  const newPosition = add(car.position, scale(n, collision.penetration + 0.1));

  return {
    ...car,
    position: newPosition,
    velocity: newVelocity,
    heading: newHeading,
    yawRate: car.yawRate * (1 - impactAngle), // dampen spin on impact
  };
}
```

### Input Smoothing
```typescript
// Source: Standard game input smoothing pattern

interface SmoothedInput {
  steer: number;
  throttle: number;
  brake: number;
  steerAngle: number; // computed from steer + speed
}

function smoothInput(prev: SmoothedInput, raw: Input, speed: number, dt: number): SmoothedInput {
  const steerRate = 4.0;   // how fast steering responds (higher = snappier)
  const throttleRate = 6.0;
  const brakeRate = 10.0;  // brakes respond fastest

  const steer = lerp1d(prev.steer, raw.steer, 1 - Math.exp(-steerRate * dt));
  const throttle = lerp1d(prev.throttle, raw.throttle, 1 - Math.exp(-throttleRate * dt));
  const brake = lerp1d(prev.brake, raw.brake, 1 - Math.exp(-brakeRate * dt));

  // Steering authority reduces with speed (MECH-06)
  const maxSteerAngle = 0.6; // radians (~34 degrees)
  const speedFactor = 1.0 / (1.0 + speed * 0.006); // diminishes at high speed
  const steerAngle = steer * maxSteerAngle * speedFactor;

  return { steer, throttle, brake, steerAngle };
}

function lerp1d(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
```

### Determinism Test Pattern
```typescript
// Source: Standard deterministic simulation verification

import { describe, it, expect } from 'vitest';

describe('determinism', () => {
  it('produces identical state from identical inputs across 10,000 ticks', () => {
    const inputs = generateTestInputSequence(10000); // predetermined input sequence
    const state1 = runSimulation(inputs);
    const state2 = runSimulation(inputs);

    // Compare full state hash
    expect(hashState(state1)).toBe(hashState(state2));
  });

  it('produces identical state across 100 independent runs', () => {
    const inputs = generateTestInputSequence(10000);
    const hashes = new Set<string>();

    for (let run = 0; run < 100; run++) {
      const finalState = runSimulation(inputs);
      hashes.add(hashState(finalState));
    }

    expect(hashes.size).toBe(1); // all runs produce same hash
  });
});

function hashState(state: WorldState): string {
  // JSON.stringify with sorted keys for consistent ordering
  return stableStringify(state);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pacejka Magic Formula for all tire modeling | Simplified atan-based curves for games, full Pacejka for sims | ~2015+ | Game devs use simpler curves that capture the essential shape without 20-coefficient tuning |
| External physics engines (Box2D, Matter.js) for car games | Custom physics for car-specific sims | Always true for quality car games | Generic rigid body engines cannot express tire grip, slip angles, or weight transfer |
| gl-matrix for all JS vector math | Hand-rolled for 2D, gl-matrix for 3D/WebGL | N/A | 2D vector math is trivial enough that a library adds more complexity than it removes |
| OOP class hierarchies for game state | Plain interfaces + pure functions | ~2018+ (ECS/functional patterns) | Better testability, determinism, serialization |
| Variable timestep with deltaTime | Fixed timestep with accumulator | Always best practice | Required for determinism and consistent physics |

**Deprecated/outdated:**
- **Matter.js for car physics:** Matter.js is a general rigid body engine. It cannot model tire grip curves, slip angles, or bicycle model dynamics. Using it would violate MECH-15.
- **Planck.js (Box2D port):** Same issue — rigid body engines model shapes bouncing off each other, not tire-road interaction.
- **Full Pacejka for games:** Overkill. The Magic Formula needs careful coefficient tuning and is numerically unstable at low speeds. A simplified curve matches the feel targets with 2-3 tuning parameters.

## Open Questions

1. **Exact tire curve coefficients for "rally car" feel**
   - What we know: The `sin(C * atan(B * alpha))` curve shape is correct. B controls stiffness (how quickly grip builds), C controls peak width.
   - What's unclear: The exact B and C values for a "loose but recoverable" rally feel. This requires iterative tuning.
   - Recommendation: Start with B=8.0, C=1.4 (values from established car physics implementations). Tune by running the car through corners and adjusting until slides feel right per CONTEXT.md targets.

2. **Optimal track boundary sampling density**
   - What we know: Segments must be shorter than car movement per tick (~3.3 units at top speed).
   - What's unclear: How many samples per spline segment balances accuracy vs collision check performance.
   - Recommendation: Start with 20 samples per spline segment. Profile if collision checks exceed budget. Spatial hashing (grid) can accelerate if needed.

3. **Car dimensions in game units**
   - What we know: Top speed is 150-200 units/sec. Track must be designed around this.
   - What's unclear: Physical car size, track width, corner radii in game units.
   - Recommendation: Car ~4 units long, ~2 units wide. Track width ~12-16 units. Hairpin radius ~20 units, sweeper radius ~80+ units. Tune based on feel.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.x |
| Config file | None yet — needs vitest.config.ts in Wave 0 |
| Quick run command | `pnpm vitest run --reporter=verbose` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MECH-01 | Analog steering with smoothing | unit | `pnpm vitest run tests/engine/car.test.ts` | Wave 0 |
| MECH-02 | Analog throttle/brake with smoothing | unit | `pnpm vitest run tests/engine/car.test.ts` | Wave 0 |
| MECH-03 | Weight transfer affects tire load | unit | `pnpm vitest run tests/engine/car.test.ts` | Wave 0 |
| MECH-04 | Tire grip = f(load, slip, surface) | unit | `pnpm vitest run tests/engine/car.test.ts` | Wave 0 |
| MECH-05 | Natural oversteer emerges | integration | `pnpm vitest run tests/engine/world.test.ts` | Wave 0 |
| MECH-06 | Steering authority reduces at speed | unit | `pnpm vitest run tests/engine/car.test.ts` | Wave 0 |
| MECH-07 | Three surface types with grip values | unit | `pnpm vitest run tests/engine/collision.test.ts` | Wave 0 |
| MECH-08 | Wall slide with speed penalty | unit | `pnpm vitest run tests/engine/collision.test.ts` | Wave 0 |
| MECH-09 | Spline-based track geometry | unit | `pnpm vitest run tests/engine/spline.test.ts` | Wave 0 |
| MECH-10 | Checkpoint gates crossed in order | unit | `pnpm vitest run tests/engine/checkpoint.test.ts` | Wave 0 |
| MECH-11 | Lap timing (current + best) | unit | `pnpm vitest run tests/engine/checkpoint.test.ts` | Wave 0 |
| MECH-14 | Fixed 60Hz deterministic tick | integration | `pnpm vitest run tests/engine/determinism.test.ts` | Wave 0 |
| MECH-15 | No external physics, no Math.random | smoke | `pnpm vitest run tests/engine/determinism.test.ts` | Wave 0 |
| TRK-01 | Primary track with varied corners | integration | `pnpm vitest run tests/engine/track.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run --reporter=verbose`
- **Per wave merge:** `pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — Vitest config at project root (TypeScript paths, test file globs)
- [ ] `tests/engine/vec2.test.ts` — Vec2 math correctness
- [ ] `tests/engine/spline.test.ts` — Spline evaluation + arc length
- [ ] `tests/engine/car.test.ts` — Car physics (forces, weight transfer, tire model)
- [ ] `tests/engine/collision.test.ts` — Wall detection + response, surface types
- [ ] `tests/engine/checkpoint.test.ts` — Gate crossing, lap timing
- [ ] `tests/engine/track.test.ts` — Track builder, boundary generation
- [ ] `tests/engine/world.test.ts` — Full simulation step, oversteer emergence
- [ ] `tests/engine/determinism.test.ts` — Identical inputs produce identical outputs
- [ ] `package.json` test script — Update from placeholder to `vitest run`

## Sources

### Primary (HIGH confidence)
- [gl-matrix Context7 /toji/gl-matrix] — Vec2 API, TypeScript types, Float32Array patterns
- [Marco Monster "Car Physics for Games"](https://www.asawicki.info/Mirror/Car%20Physics%20for%20Games/Car%20Physics%20for%20Games.html) — Complete bicycle model equations, weight transfer, slip angles, tire forces, integration procedure
- [Wikipedia "Centripetal Catmull-Rom spline"](https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline) — Parameterization types, cusp avoidance with alpha=0.5
- [CMU 15-462 Catmull-Rom Reparameterization](http://15462.courses.cs.cmu.edu/fall2015content/misc/CatmullRomReparameterization.pdf) — Arc-length lookup table construction
- [Gaffer on Games "Fix Your Timestep!"](https://gafferongames.com/post/fix_your_timestep/) — Accumulator pattern for fixed timestep

### Secondary (MEDIUM confidence)
- [spacejack/carphysics2d](https://github.com/spacejack/carphysics2d) — JavaScript implementation of Marco Monster's model, confirms approach viability
- [Edy's Projects "Facts and myths on the Pacejka curves"](https://www.edy.es/dev/2011/12/facts-and-myths-on-the-pacejka-curves/) — Why simplified curves are preferred for games
- [Tim Wheeler "2D Collision Detection and Resolution"](https://timallanwheeler.com/blog/2024/08/01/2d-collision-detection-and-resolution/) — Point-to-segment, normal calculation, sliding response
- [Engineering .NET "Simple 2D car steering physics"](http://engineeringdotnet.blogspot.com/2010/04/simple-2d-car-physics-in-games.html) — Kinematic bicycle model reference
- [Algorithms for Automated Driving "Kinematic Bicycle Model"](https://thomasfermi.github.io/Algorithms-for-Automated-Driving/Control/BicycleModel.html) — Academic treatment of bicycle model equations

### Tertiary (LOW confidence)
- [GameDev.net forums on car physics headaches](https://www.gamedev.net/forums/topic/630058-vehicle-simulation-headache/) — Low-speed instability patterns, community solutions
- [GameDev.net "Pacejka lateral velocity"](https://www.gamedev.net/forums/topic/711781-vehicle-physics-pacejka-lateral-velocity/) — Slip angle sign-flipping workarounds

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — TypeScript + Vitest are already installed, zero new dependencies for engine
- Architecture: HIGH — Pure state + step function is the established pattern; bicycle model is the standard 2D car physics approach with extensive literature
- Pitfalls: HIGH — Low-speed instability, slip angle sign flipping, and wall tunneling are well-documented problems with known solutions
- Tire model: MEDIUM — The simplified atan curve shape is correct per literature, but exact coefficients (B, C) need iterative tuning
- Track dimensions: MEDIUM — Speed range is locked (150-200 units/sec) but physical dimensions need tuning during implementation

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable domain — 2D physics math does not change)
