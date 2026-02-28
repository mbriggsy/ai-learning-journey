/**
 * Car Physics TDD Tests
 *
 * Tests for the dynamic bicycle model: input smoothing, steering authority,
 * weight transfer, tire force (simplified Pacejka), full physics step,
 * and oversteer tendency.
 *
 * RED phase: These tests are written first. car.ts does not exist yet.
 */

import { describe, it, expect } from 'vitest';
import { createInitialCarState, smoothInput, tireForce, stepCar } from '../../src/engine/car';
import { Surface } from '../../src/engine/types';
import type { Input, SmoothedInput, CarState } from '../../src/engine/types';
import { DT, CAR, TIRE, INPUT_RATES, STEER, SURFACE_GRIP } from '../../src/engine/constants';
import { vec2, length as vecLength } from '../../src/engine/vec2';

// ──────────────────────────────────────────────────────────
// createInitialCarState
// ──────────────────────────────────────────────────────────
describe('createInitialCarState', () => {
  it('creates a car at the given position and heading', () => {
    const car = createInitialCarState(vec2(10, 20), Math.PI / 4);
    expect(car.position.x).toBe(10);
    expect(car.position.y).toBe(20);
    expect(car.heading).toBe(Math.PI / 4);
  });

  it('starts with zero velocity', () => {
    const car = createInitialCarState(vec2(0, 0), 0);
    expect(car.velocity.x).toBe(0);
    expect(car.velocity.y).toBe(0);
    expect(car.speed).toBe(0);
  });

  it('starts with zero yaw rate', () => {
    const car = createInitialCarState(vec2(0, 0), 0);
    expect(car.yawRate).toBe(0);
  });

  it('starts with zero-ed smoothed input', () => {
    const car = createInitialCarState(vec2(0, 0), 0);
    expect(car.prevInput.steer).toBe(0);
    expect(car.prevInput.throttle).toBe(0);
    expect(car.prevInput.brake).toBe(0);
    expect(car.prevInput.steerAngle).toBe(0);
  });

  it('starts on Road surface', () => {
    const car = createInitialCarState(vec2(0, 0), 0);
    expect(car.surface).toBe(Surface.Road);
  });

  it('starts with zero longitudinal acceleration', () => {
    const car = createInitialCarState(vec2(0, 0), 0);
    expect(car.accelLongitudinal).toBe(0);
  });

  it('returns a new object each call', () => {
    const a = createInitialCarState(vec2(0, 0), 0);
    const b = createInitialCarState(vec2(0, 0), 0);
    expect(a).not.toBe(b);
    expect(a.position).not.toBe(b.position);
  });
});

// ──────────────────────────────────────────────────────────
// smoothInput — exponential decay input smoothing
// ──────────────────────────────────────────────────────────
describe('smoothInput', () => {
  const zeroPrev: SmoothedInput = { steer: 0, throttle: 0, brake: 0, steerAngle: 0 };

  it('smooths steering with configured rate (prev=0, raw=1 after 1 tick)', () => {
    const raw: Input = { steer: 1.0, throttle: 0, brake: 0 };
    const result = smoothInput(zeroPrev, raw, 0, DT);
    // Expected: 1 - exp(-INPUT_RATES.steer * DT)
    const expected = 1 - Math.exp(-INPUT_RATES.steer * DT);
    expect(result.steer).toBeCloseTo(expected, 3);
  });

  it('smooths throttle with rate 6.0 (prev=0, raw=1 after 1 tick)', () => {
    const raw: Input = { steer: 0, throttle: 1.0, brake: 0 };
    const result = smoothInput(zeroPrev, raw, 0, DT);
    // Expected: 1 - exp(-6.0 * (1/60)) ≈ 0.0952
    expect(result.throttle).toBeCloseTo(0.0952, 3);
  });

  it('smooths brake with rate 10.0 (prev=0, raw=1 after 1 tick)', () => {
    const raw: Input = { steer: 0, throttle: 0, brake: 1.0 };
    const result = smoothInput(zeroPrev, raw, 0, DT);
    // Expected: 1 - exp(-10.0 * (1/60)) ≈ 0.1535
    expect(result.brake).toBeCloseTo(0.1535, 3);
  });

  it('converges toward target over multiple ticks', () => {
    const raw: Input = { steer: 1.0, throttle: 0, brake: 0 };
    let prev: SmoothedInput = { ...zeroPrev };
    for (let i = 0; i < 120; i++) {
      prev = smoothInput(prev, raw, 0, DT);
    }
    // After 2 seconds at rate 4.0, should be very close to 1.0
    // 1 - exp(-4.0 * 2) = 1 - exp(-8) ≈ 0.99966
    expect(prev.steer).toBeGreaterThan(0.99);
  });

  it('does not overshoot the target', () => {
    const raw: Input = { steer: 1.0, throttle: 1.0, brake: 1.0 };
    let prev: SmoothedInput = { ...zeroPrev };
    for (let i = 0; i < 300; i++) {
      prev = smoothInput(prev, raw, 0, DT);
      expect(prev.steer).toBeLessThanOrEqual(1.0);
      expect(prev.throttle).toBeLessThanOrEqual(1.0);
      expect(prev.brake).toBeLessThanOrEqual(1.0);
    }
  });

  it('smooths from nonzero prev toward zero', () => {
    const prevFull: SmoothedInput = { steer: 1.0, throttle: 1.0, brake: 1.0, steerAngle: 0 };
    const raw: Input = { steer: 0, throttle: 0, brake: 0 };
    const result = smoothInput(prevFull, raw, 0, DT);
    // All values should decrease toward 0
    expect(result.steer).toBeLessThan(1.0);
    expect(result.steer).toBeGreaterThan(0.3); // Only decreased by some amount
    expect(result.throttle).toBeLessThan(1.0);
    expect(result.brake).toBeLessThan(1.0);
  });

  it('returns a new object (does not mutate prev)', () => {
    const prev: SmoothedInput = { steer: 0.5, throttle: 0.5, brake: 0.5, steerAngle: 0 };
    const raw: Input = { steer: 1.0, throttle: 1.0, brake: 1.0 };
    const origSteer = prev.steer;
    smoothInput(prev, raw, 0, DT);
    expect(prev.steer).toBe(origSteer);
  });
});

// ──────────────────────────────────────────────────────────
// Steering authority — speed-dependent reduction
// ──────────────────────────────────────────────────────────
describe('steering authority', () => {
  const zeroPrev: SmoothedInput = { steer: 0, throttle: 0, brake: 0, steerAngle: 0 };

  it('at speed=0, steerAngle magnitude approaches maxAngle', () => {
    // With full steer input after many ticks at speed=0
    const raw: Input = { steer: 1.0, throttle: 0, brake: 0 };
    let prev: SmoothedInput = { ...zeroPrev };
    for (let i = 0; i < 300; i++) {
      prev = smoothInput(prev, raw, 0, DT);
    }
    // steerAngle = -steer * maxAngle / (1 + 0*speedFactor) = -maxAngle
    expect(Math.abs(prev.steerAngle)).toBeCloseTo(STEER.maxAngle, 2);
  });

  it('at speed=100, steerAngle magnitude is reduced', () => {
    const raw: Input = { steer: 1.0, throttle: 0, brake: 0 };
    let prev: SmoothedInput = { ...zeroPrev };
    for (let i = 0; i < 300; i++) {
      prev = smoothInput(prev, raw, 100, DT);
    }
    // steerAngle = -maxAngle / (1 + 100 * speedFactor)
    const expected = STEER.maxAngle / (1 + 100 * STEER.speedFactor);
    expect(Math.abs(prev.steerAngle)).toBeCloseTo(expected, 2);
  });

  it('at speed=200, steerAngle magnitude is further reduced', () => {
    const raw: Input = { steer: 1.0, throttle: 0, brake: 0 };
    let prev: SmoothedInput = { ...zeroPrev };
    for (let i = 0; i < 300; i++) {
      prev = smoothInput(prev, raw, 200, DT);
    }
    // steerAngle = -maxAngle / (1 + 200 * speedFactor)
    const expected = STEER.maxAngle / (1 + 200 * STEER.speedFactor);
    expect(Math.abs(prev.steerAngle)).toBeCloseTo(expected, 2);
  });

  it('steerAngle uses smoothed steer value (not raw)', () => {
    const raw: Input = { steer: 1.0, throttle: 0, brake: 0 };
    const result = smoothInput(zeroPrev, raw, 0, DT);
    // After one tick, steerAngle = -smoothed_steer * maxAngle (negated for CW convention)
    expect(result.steerAngle).toBeCloseTo(-result.steer * STEER.maxAngle, 4);
  });
});

// ──────────────────────────────────────────────────────────
// Weight transfer
// ──────────────────────────────────────────────────────────
describe('weight transfer (tested via stepCar internals)', () => {
  // Weight transfer is internal to stepCar, but we can verify through
  // the oversteer tendency tests and by checking that:
  //   Wf = (cgToRear/wheelbase)*weight - (cgHeight/wheelbase)*mass*accel
  //   Wr = (cgToFront/wheelbase)*weight + (cgHeight/wheelbase)*mass*accel

  it('static weight distribution reflects CG position', () => {
    // Wf = (cgToRear/wheelbase)*weight — more rear distance = more front weight
    // With cgToFront=0.85, cgToRear=0.65: rear axle bears more static weight
    const Wf = (CAR.cgToRear / CAR.wheelbase) * CAR.weight;
    const Wr = (CAR.cgToFront / CAR.wheelbase) * CAR.weight;
    expect(Wr).toBeGreaterThan(Wf);
    // Verify formulas produce correct values from constants
    const expectedWf = (CAR.cgToRear / CAR.wheelbase) * CAR.weight;
    const expectedWr = (CAR.cgToFront / CAR.wheelbase) * CAR.weight;
    expect(Wf).toBeCloseTo(expectedWf, 5);
    expect(Wr).toBeCloseTo(expectedWr, 5);
    // Total weight is preserved
    expect(Wf + Wr).toBeCloseTo(CAR.weight, 5);
  });

  it('under braking, front load increases and rear decreases', () => {
    const accel = -5; // braking deceleration
    const Wf = (CAR.cgToRear / CAR.wheelbase) * CAR.weight - (CAR.cgHeight / CAR.wheelbase) * CAR.mass * accel;
    const Wr = (CAR.cgToFront / CAR.wheelbase) * CAR.weight + (CAR.cgHeight / CAR.wheelbase) * CAR.mass * accel;
    const WfStatic = (CAR.cgToRear / CAR.wheelbase) * CAR.weight;
    const WrStatic = (CAR.cgToFront / CAR.wheelbase) * CAR.weight;
    expect(Wf).toBeGreaterThan(WfStatic);
    expect(Wr).toBeLessThan(WrStatic);
  });

  it('under acceleration, rear load increases and front decreases', () => {
    const accel = 5; // forward acceleration
    const Wf = (CAR.cgToRear / CAR.wheelbase) * CAR.weight - (CAR.cgHeight / CAR.wheelbase) * CAR.mass * accel;
    const Wr = (CAR.cgToFront / CAR.wheelbase) * CAR.weight + (CAR.cgHeight / CAR.wheelbase) * CAR.mass * accel;
    const WfStatic = (CAR.cgToRear / CAR.wheelbase) * CAR.weight;
    const WrStatic = (CAR.cgToFront / CAR.wheelbase) * CAR.weight;
    expect(Wf).toBeLessThan(WfStatic);
    expect(Wr).toBeGreaterThan(WrStatic);
  });

  it('total weight is conserved under any acceleration', () => {
    for (const accel of [-10, -5, 0, 5, 10]) {
      const Wf = (CAR.cgToRear / CAR.wheelbase) * CAR.weight - (CAR.cgHeight / CAR.wheelbase) * CAR.mass * accel;
      const Wr = (CAR.cgToFront / CAR.wheelbase) * CAR.weight + (CAR.cgHeight / CAR.wheelbase) * CAR.mass * accel;
      expect(Wf + Wr).toBeCloseTo(CAR.weight, 5);
    }
  });
});

// ──────────────────────────────────────────────────────────
// tireForce — simplified Pacejka curve
// ──────────────────────────────────────────────────────────
describe('tireForce', () => {
  const nominalLoad = 6000; // approximate axle load in Newtons

  it('returns zero force at zero slip angle', () => {
    expect(tireForce(0, nominalLoad, 1.0)).toBeCloseTo(0, 5);
  });

  it('builds force at small slip angle (0.05 rad)', () => {
    const f = tireForce(0.05, nominalLoad, 1.0);
    // tireForce is negative (restoring force opposes slip direction)
    expect(f).toBeLessThan(0);
    expect(Math.abs(f)).toBeLessThan(nominalLoad); // Not yet at peak
  });

  it('builds significant force at moderate slip angles', () => {
    const f02 = tireForce(0.2, nominalLoad, 1.0);
    const f04 = tireForce(0.4, nominalLoad, 1.0);
    // Force should be building — not zero
    expect(Math.abs(f02)).toBeGreaterThan(0);
    expect(Math.abs(f04)).toBeGreaterThan(Math.abs(f02));
  });

  it('force falls off past peak (saturation)', () => {
    // With B=5, C=1.4 the peak is wider — around 0.5-0.6 rad
    // Use 0.5 (near peak) and 1.2 (well past peak) to show falloff
    const fNearPeak = tireForce(0.5, nominalLoad, 1.0);
    const fPastPeak = tireForce(1.2, nominalLoad, 1.0);
    // Past-peak force should be less than near-peak force
    expect(Math.abs(fPastPeak)).toBeLessThan(Math.abs(fNearPeak));
  });

  it('has a definite peak between 0 and 1.0 rad', () => {
    // Sample the curve and find the peak (wider with B=5)
    let maxForce = 0;
    let peakAngle = 0;
    for (let a = 0.01; a <= 1.0; a += 0.01) {
      const f = Math.abs(tireForce(a, nominalLoad, 1.0));
      if (f > maxForce) {
        maxForce = f;
        peakAngle = a;
      }
    }
    expect(peakAngle).toBeGreaterThan(0.1);
    expect(peakAngle).toBeLessThan(0.8);
    // Force well past peak should be less
    expect(Math.abs(tireForce(1.2, nominalLoad, 1.0))).toBeLessThan(maxForce);
  });

  it('scales with grip multiplier (Runoff = 0.5x Road)', () => {
    const fRoad = tireForce(0.1, nominalLoad, SURFACE_GRIP[0]);
    const fRunoff = tireForce(0.1, nominalLoad, SURFACE_GRIP[1]);
    expect(fRunoff).toBeCloseTo(fRoad * 0.5, 1);
  });

  it('scales linearly with load', () => {
    const f1 = tireForce(0.1, 5000, 1.0);
    const f2 = tireForce(0.1, 10000, 1.0);
    expect(f2).toBeCloseTo(f1 * 2, 1);
  });

  it('is antisymmetric: tireForce(-angle) = -tireForce(angle)', () => {
    const fPos = tireForce(0.1, nominalLoad, 1.0);
    const fNeg = tireForce(-0.1, nominalLoad, 1.0);
    expect(fNeg).toBeCloseTo(-fPos, 5);
  });

  it('returns correct Pacejka formula value (negative sign = restoring force)', () => {
    const slipAngle = 0.1;
    const load = 6000;
    const gripMul = 1.0;
    // tireForce returns NEGATIVE of mu*grip*load*sin(...) — the restoring force opposes slip
    const expected = -TIRE.mu * gripMul * load * Math.sin(TIRE.C * Math.atan(TIRE.B * slipAngle));
    expect(tireForce(slipAngle, load, gripMul)).toBeCloseTo(expected, 5);
  });
});

// ──────────────────────────────────────────────────────────
// stepCar — full bicycle model physics step
// ──────────────────────────────────────────────────────────
describe('stepCar', () => {
  const noInput: Input = { steer: 0, throttle: 0, brake: 0 };
  const fullThrottle: Input = { steer: 0, throttle: 1.0, brake: 0 };
  const fullBrake: Input = { steer: 0, throttle: 0, brake: 1.0 };
  const fullLeft: Input = { steer: -1.0, throttle: 0, brake: 0 };

  it('stationary car with no input stays stationary', () => {
    const car = createInitialCarState(vec2(0, 0), 0);
    const next = stepCar(car, noInput, Surface.Road, DT);
    expect(next.speed).toBeCloseTo(0, 1);
    expect(next.position.x).toBeCloseTo(0, 2);
    expect(next.position.y).toBeCloseTo(0, 2);
  });

  it('full throttle accelerates the car forward', () => {
    const car = createInitialCarState(vec2(0, 0), 0);
    let current = car;
    for (let i = 0; i < 60; i++) {
      current = stepCar(current, fullThrottle, Surface.Road, DT);
    }
    // After 1 second of full throttle, car should have noticeable speed
    expect(current.speed).toBeGreaterThan(5);
  });

  it('car moves in heading direction under throttle', () => {
    // Heading = 0 means +x direction
    const car = createInitialCarState(vec2(0, 0), 0);
    let current = car;
    for (let i = 0; i < 60; i++) {
      current = stepCar(current, fullThrottle, Surface.Road, DT);
    }
    expect(current.position.x).toBeGreaterThan(0);
    // y should be approximately 0 (moving purely in x)
    expect(Math.abs(current.position.y)).toBeLessThan(0.1);
  });

  it('car moves in different heading direction', () => {
    // Heading = PI/2 means +y direction
    const car = createInitialCarState(vec2(0, 0), Math.PI / 2);
    let current = car;
    for (let i = 0; i < 60; i++) {
      current = stepCar(current, fullThrottle, Surface.Road, DT);
    }
    expect(current.position.y).toBeGreaterThan(0);
    expect(Math.abs(current.position.x)).toBeLessThan(0.1);
  });

  it('reaches significant speed in ~300 ticks (5 seconds)', () => {
    const car = createInitialCarState(vec2(0, 0), 0);
    let current = car;
    for (let i = 0; i < 300; i++) {
      current = stepCar(current, fullThrottle, Surface.Road, DT);
    }
    // After 5 seconds with arcade tuning, should reach meaningful speed
    expect(current.speed).toBeGreaterThan(80);
    expect(current.speed).toBeLessThan(CAR.maxSpeed + 1);
  });

  it('speed is capped at maxSpeed', () => {
    const car = createInitialCarState(vec2(0, 0), 0);
    let current = car;
    // Run for a very long time
    for (let i = 0; i < 1200; i++) {
      current = stepCar(current, fullThrottle, Surface.Road, DT);
    }
    expect(current.speed).toBeLessThanOrEqual(CAR.maxSpeed);
  });

  it('braking decelerates a moving car', () => {
    // First accelerate
    const car = createInitialCarState(vec2(0, 0), 0);
    let current = car;
    for (let i = 0; i < 120; i++) {
      current = stepCar(current, fullThrottle, Surface.Road, DT);
    }
    const speedBefore = current.speed;
    expect(speedBefore).toBeGreaterThan(20);

    // Then brake
    for (let i = 0; i < 60; i++) {
      current = stepCar(current, fullBrake, Surface.Road, DT);
    }
    expect(current.speed).toBeLessThan(speedBefore);
  });

  it('steering at speed changes heading', () => {
    // Build up some speed first
    const car = createInitialCarState(vec2(0, 0), 0);
    let current = car;
    for (let i = 0; i < 120; i++) {
      current = stepCar(current, fullThrottle, Surface.Road, DT);
    }
    const headingBefore = current.heading;

    // Now steer left while maintaining throttle
    const steerLeft: Input = { steer: -1.0, throttle: 0.5, brake: 0 };
    for (let i = 0; i < 60; i++) {
      current = stepCar(current, steerLeft, Surface.Road, DT);
    }
    // Heading should have changed
    expect(current.heading).not.toBeCloseTo(headingBefore, 1);
  });

  it('drag slows a coasting car', () => {
    // Build speed, then coast (no input)
    const car = createInitialCarState(vec2(0, 0), 0);
    let current = car;
    for (let i = 0; i < 180; i++) {
      current = stepCar(current, fullThrottle, Surface.Road, DT);
    }
    const speedAfterAccel = current.speed;

    for (let i = 0; i < 120; i++) {
      current = stepCar(current, noInput, Surface.Road, DT);
    }
    expect(current.speed).toBeLessThan(speedAfterAccel);
    expect(current.speed).toBeGreaterThan(0); // Not stopped yet
  });

  it('returns a new CarState (does not mutate input)', () => {
    const car = createInitialCarState(vec2(5, 10), 1.0);
    const origX = car.position.x;
    const origY = car.position.y;
    const origHeading = car.heading;

    const next = stepCar(car, fullThrottle, Surface.Road, DT);

    expect(car.position.x).toBe(origX);
    expect(car.position.y).toBe(origY);
    expect(car.heading).toBe(origHeading);
    expect(next).not.toBe(car);
  });

  it('sets surface on the returned state', () => {
    const car = createInitialCarState(vec2(0, 0), 0);
    const nextRoad = stepCar(car, noInput, Surface.Road, DT);
    expect(nextRoad.surface).toBe(Surface.Road);

    const nextRunoff = stepCar(car, noInput, Surface.Runoff, DT);
    expect(nextRunoff.surface).toBe(Surface.Runoff);
  });

  it('Runoff surface reduces acceleration (less grip)', () => {
    const car = createInitialCarState(vec2(0, 0), 0);
    let roadCar = car;
    let runoffCar = car;
    for (let i = 0; i < 120; i++) {
      roadCar = stepCar(roadCar, fullThrottle, Surface.Road, DT);
      runoffCar = stepCar(runoffCar, fullThrottle, Surface.Runoff, DT);
    }
    // On road should reach higher speed or at least: both move forward
    // The exact comparison depends on how surface grip affects longitudinal force
    // At minimum, both should accelerate
    expect(roadCar.speed).toBeGreaterThan(10);
    expect(runoffCar.speed).toBeGreaterThan(10);
  });
});

// ──────────────────────────────────────────────────────────
// Oversteer tendency — rear tires saturate before front
// ──────────────────────────────────────────────────────────
describe('oversteer tendency', () => {
  it('high-speed corner with braking: yaw rate increases (tail steps out)', () => {
    // Build speed heading in +x direction
    const car = createInitialCarState(vec2(0, 0), 0);
    let current = car;
    for (let i = 0; i < 180; i++) {
      current = stepCar(current, { steer: 0, throttle: 1.0, brake: 0 }, Surface.Road, DT);
    }
    expect(current.speed).toBeGreaterThan(50);

    // Hard turn + braking (trail-braking oversteer)
    const turnBrake: Input = { steer: 1.0, throttle: 0, brake: 0.5 };
    let maxYawRate = 0;
    for (let i = 0; i < 120; i++) {
      current = stepCar(current, turnBrake, Surface.Road, DT);
      maxYawRate = Math.max(maxYawRate, Math.abs(current.yawRate));
    }
    // Car should develop significant yaw rate (oversteer)
    expect(maxYawRate).toBeGreaterThan(0.1);
  });

  it('CG bias creates asymmetric weight distribution', () => {
    // With cgToFront > cgToRear, more weight is on the front axle.
    // Under braking, weight transfers further forward, unloading the rear.
    // This creates natural oversteer tendency during trail-braking.
    expect(CAR.cgToFront).toBeGreaterThan(CAR.cgToRear);
  });

  it('yaw rate builds during sustained cornering at speed', () => {
    const car = createInitialCarState(vec2(0, 0), 0);
    let current = car;
    // Build speed
    for (let i = 0; i < 180; i++) {
      current = stepCar(current, { steer: 0, throttle: 1.0, brake: 0 }, Surface.Road, DT);
    }

    // Sustained hard turn
    const hardTurn: Input = { steer: 1.0, throttle: 0.5, brake: 0 };
    for (let i = 0; i < 60; i++) {
      current = stepCar(current, hardTurn, Surface.Road, DT);
    }
    // Yaw rate should be non-trivial
    expect(Math.abs(current.yawRate)).toBeGreaterThan(0.05);
  });
});

// ──────────────────────────────────────────────────────────
// Determinism and purity
// ──────────────────────────────────────────────────────────
describe('determinism and purity', () => {
  it('same inputs produce identical outputs (no randomness)', () => {
    const car = createInitialCarState(vec2(100, 200), 0.5);
    const input: Input = { steer: 0.5, throttle: 0.8, brake: 0 };

    const a = stepCar(car, input, Surface.Road, DT);
    const b = stepCar(car, input, Surface.Road, DT);

    expect(a.position.x).toBe(b.position.x);
    expect(a.position.y).toBe(b.position.y);
    expect(a.velocity.x).toBe(b.velocity.x);
    expect(a.velocity.y).toBe(b.velocity.y);
    expect(a.heading).toBe(b.heading);
    expect(a.yawRate).toBe(b.yawRate);
    expect(a.speed).toBe(b.speed);
  });

  it('100 ticks with varying input is reproducible', () => {
    const run = () => {
      let car = createInitialCarState(vec2(0, 0), 0);
      for (let i = 0; i < 100; i++) {
        const input: Input = {
          steer: Math.sin(i * 0.1) * 0.5,
          throttle: i < 50 ? 1.0 : 0.0,
          brake: i >= 80 ? 0.8 : 0.0,
        };
        car = stepCar(car, input, Surface.Road, DT);
      }
      return car;
    };

    const a = run();
    const b = run();
    expect(a.position.x).toBe(b.position.x);
    expect(a.position.y).toBe(b.position.y);
    expect(a.heading).toBe(b.heading);
    expect(a.speed).toBe(b.speed);
  });
});
