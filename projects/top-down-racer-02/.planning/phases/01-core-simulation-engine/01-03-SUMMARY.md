---
phase: 01-core-simulation-engine
plan: 03
subsystem: engine
tags: [car-physics, bicycle-model, tire-force, pacejka, tdd]

requires:
  - phase: 01-01
    provides: Vec2 math, type contracts, physics constants
provides:
  - Car physics step function (bicycle model)
  - Input smoothing with exponential decay
  - Weight transfer between axles
  - Simplified Pacejka tire force curve
  - Speed-dependent steering authority
  - Natural oversteer tendency
affects: [01-04]

tech-stack:
  added: []
  patterns: [bicycle-model, tdd, pure-physics]

key-files:
  created:
    - src/engine/car.ts
    - tests/engine/car.test.ts
  modified:
    - src/engine/constants.ts

key-decisions:
  - "Simplified Pacejka (B=8, C=1.4, mu=1.0) for approachable tuning"
  - "Low-speed guard at 0.5 units/sec prevents slip angle singularity"
  - "Tuned engine/drag constants for game-feel (60000N engine, 1.5 drag coeff)"
  - "Moment of inertia = mass * wheelbase^2 / 4 (simplified rod approximation)"

requirements-completed: [MECH-01, MECH-02, MECH-03, MECH-04, MECH-05, MECH-06]

duration: ~20 minutes
completed: 2026-02-27
---

# Plan 01-03 Summary: Car Physics (Dynamic Bicycle Model)

## What was built

### Car Physics Module (`src/engine/car.ts`)
Four exported pure functions implementing the dynamic bicycle model:

**`createInitialCarState(position: Vec2, heading: number): CarState`**
Factory that creates a car at rest. All dynamic state (velocity, yaw rate, smoothed input) zeroed. Starts on Road surface.

**`smoothInput(prev: SmoothedInput, raw: Input, speed: number, dt: number): SmoothedInput`**
Exponential decay smoothing: `lerp(prev, target, 1 - exp(-rate * dt))`
- Steer rate: 4.0 (responsive but not instant)
- Throttle rate: 6.0 (moderately fast)
- Brake rate: 10.0 (fastest -- brakes feel immediate)
- Also computes speed-dependent steerAngle: `steer * maxAngle / (1 + speed * 0.006)`

**`tireForce(slipAngle: number, load: number, gripMul: number): number`**
Simplified Pacejka: `mu * gripMul * load * sin(C * atan(B * slipAngle))`
- Peak force at ~0.27 rad slip angle
- Falls off past peak (saturation causes oversteer/understeer)
- Antisymmetric, scales linearly with load, halved on Runoff surface

**`stepCar(car: CarState, input: Input, surface: Surface, dt: number): CarState`**
Full bicycle model physics step:
1. Smooth raw input via exponential decay
2. Transform velocity to car-local frame (forward/lateral)
3. Compute weight transfer from previous tick's longitudinal acceleration
4. Compute front/rear slip angles with low-speed guard (absVx >= 0.5)
5. Compute lateral tire forces via Pacejka model
6. Compute longitudinal forces: engine, brake, quadratic drag, rolling resistance
7. Sum forces in local frame, transform to world frame
8. Compute yaw torque from front/rear lateral force imbalance
9. Euler integrate velocity, position, heading, yawRate
10. Clamp speed to maxSpeed (200 units/sec)
11. Prevent brake-to-reverse at very low speeds

### Physics Constants Tuning (`src/engine/constants.ts`)
Retuned engine/drag/rolling constants for game-feel acceleration profile:
- `maxEngineForce`: 8000 -> 60000 (game-Newtons)
- `maxBrakeForce`: 12000 -> 90000
- `dragCoefficient`: 0.4 -> 1.5 (equilibrium near maxSpeed=200)
- `rollingResistance`: 30 -> 200

These changes preserve the bicycle model structure while achieving the target acceleration profile (150-200 units/sec in 4-5 seconds).

## Key Physics Behaviors Verified

1. **Input smoothing**: Steer=0.065, throttle=0.095, brake=0.154 per tick from zero (correct exponential decay rates)
2. **Steering authority**: 0.6 rad at speed=0, 0.375 at speed=100, 0.273 at speed=200
3. **Weight transfer**: Front-heavy static distribution (Wf > Wr), load shifts under braking/acceleration, total weight conserved
4. **Tire force**: Zero at zero slip, builds to peak at ~0.27 rad, falls off past peak (saturation)
5. **Acceleration**: Reaches 150-200 units/sec in ~300 ticks (5 seconds) from rest
6. **Oversteer**: Yaw rate builds during high-speed cornering with braking (rear tires saturate first)
7. **Determinism**: Identical inputs produce bit-identical outputs, no Math.random

## Test Results

**48 tests, all passing** in `tests/engine/car.test.ts`:
- `createInitialCarState`: 7 tests (factory, initial values, purity)
- `smoothInput`: 7 tests (exponential decay rates, convergence, no overshoot)
- Steering authority: 4 tests (speed-dependent reduction at 0/100/200)
- Weight transfer: 4 tests (static distribution, braking, acceleration, conservation)
- `tireForce`: 9 tests (Pacejka curve shape, peak, saturation, antisymmetry, grip scaling)
- `stepCar`: 13 tests (stationary, throttle, heading, speed target, braking, steering, drag, purity, surface)
- Oversteer tendency: 3 tests (trail-braking yaw, CG position, sustained cornering)
- Determinism: 2 tests (single-step identity, 100-tick reproducibility)

**Total project tests: 174 passing** (vec2: 53, spline: 21, track: 28, collision: 24, car: 48)

TypeScript strict mode compiles clean (`tsc --noEmit` exits 0).

## Requirements Addressed

- **MECH-01**: Car has analog steering with keyboard smoothing -- exponential decay at rate 4.0
- **MECH-02**: Car has analog throttle/brake with keyboard smoothing -- rates 6.0/10.0
- **MECH-03**: Weight transfer affects tire load -- front/rear load shifts with longitudinal acceleration
- **MECH-04**: Tire grip as function of load, slip angle, surface -- simplified Pacejka model
- **MECH-05**: Natural oversteer from physics -- front-heavy CG + tire saturation, no scripted drift
- **MECH-06**: Steering authority reduces at higher speed -- `1/(1 + speed * 0.006)` factor
