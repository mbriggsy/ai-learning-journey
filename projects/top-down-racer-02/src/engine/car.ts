/**
 * Car Physics Module — Arcade Bicycle Model
 *
 * Pure functions implementing car physics tuned for arcade gameplay:
 * - Input smoothing with exponential decay
 * - Speed-dependent steering authority
 * - Bicycle geometry for heading (geometrically stable — no spin-outs)
 * - Traction-based lateral velocity kill (controls drift feel)
 * - Longitudinal forces: engine, brake, drag, rolling resistance
 *
 * Turning approach inspired by KidsCanCode, iforce2d, and other proven
 * arcade top-down racer implementations. The bicycle geometry computes
 * heading from wheel positions; the traction system controls how quickly
 * velocity aligns to heading. No Pacejka tire forces in the main loop.
 *
 * All functions are pure: they return new objects, never mutate input state.
 * No external physics dependencies, no Math.random — fully deterministic.
 */

import type { Vec2, CarState, Input, SmoothedInput } from './types';
import { Surface } from './types';
import { vec2, fromAngle } from './vec2';
import { CAR, TIRE, SURFACE_GRIP, INPUT_RATES, STEER } from './constants';

/** Minimum speed for bicycle geometry to work (prevents atan2 noise at rest). */
const LOW_SPEED_GUARD = 1.0;

/** Below this speed, braking forces that would reverse the car are zeroed out. */
const REVERSE_BRAKE_THRESHOLD = 1.0;

/**
 * Traction: fraction of lateral velocity killed per tick.
 * Higher = grippier (car goes where it points), Lower = driftier.
 * These are the PRIMARY arcade feel tuning knobs.
 */
const TRACTION_SLOW = 0.85; // At low speed — near-instant grip
const TRACTION_FAST = 0.55; // At max speed — slight drift, still controllable

// ──────────────────────────────────────────────────────────
// createInitialCarState
// ──────────────────────────────────────────────────────────

/**
 * Create a car at rest at the given position and heading.
 * All dynamic state (velocity, yaw rate, input) is zeroed.
 */
export function createInitialCarState(position: Vec2, heading: number): CarState {
  return {
    position: vec2(position.x, position.y),
    velocity: vec2(0, 0),
    heading,
    yawRate: 0,
    speed: 0,
    prevInput: { steer: 0, throttle: 0, brake: 0, steerAngle: 0 },
    surface: Surface.Road,
    accelLongitudinal: 0,
    slipAngle: 0,
  };
}

// ──────────────────────────────────────────────────────────
// smoothInput
// ──────────────────────────────────────────────────────────

/**
 * Apply exponential smoothing to raw input values.
 *
 * Formula: lerp(prev, target, 1 - exp(-rate * dt))
 *
 * This creates a smooth, gradual transition from the previous input value
 * toward the target. Higher rates = faster response.
 *
 * Also computes the steerAngle with speed-dependent authority:
 *   steerAngle = -smoothedSteer * maxAngle / (1 + speed * speedFactor)
 */
export function smoothInput(
  prev: SmoothedInput,
  raw: Input,
  speed: number,
  dt: number,
): SmoothedInput {
  const steerAlpha = 1 - Math.exp(-INPUT_RATES.steer * dt);
  const throttleAlpha = 1 - Math.exp(-INPUT_RATES.throttle * dt);
  const brakeAlpha = 1 - Math.exp(-INPUT_RATES.brake * dt);

  const steer = prev.steer + (raw.steer - prev.steer) * steerAlpha;
  const throttle = prev.throttle + (raw.throttle - prev.throttle) * throttleAlpha;
  const brake = prev.brake + (raw.brake - prev.brake) * brakeAlpha;

  // Speed-dependent steering authority
  const speedFactor = 1.0 / (1.0 + speed * STEER.speedFactor);
  // Negate: positive steer input (right) → negative angle (CW in Y-up engine)
  const steerAngle = -steer * STEER.maxAngle * speedFactor;

  return { steer, throttle, brake, steerAngle };
}

// ──────────────────────────────────────────────────────────
// tireForce (kept for tests and potential future use)
// ──────────────────────────────────────────────────────────

/**
 * Simplified Pacejka tire force model.
 * Not used in the main arcade physics loop, but kept for tests
 * and for potential hybrid tuning if we want to add drift flavor.
 */
export function tireForce(slipAngle: number, load: number, gripMul: number): number {
  return -TIRE.mu * gripMul * load * Math.sin(TIRE.C * Math.atan(TIRE.B * slipAngle));
}

// ──────────────────────────────────────────────────────────
// stepCar — Arcade Bicycle Model
// ──────────────────────────────────────────────────────────

/**
 * Arcade physics step using bicycle geometry + traction.
 *
 * Approach (proven in KidsCanCode, iforce2d, Micro Machines, etc.):
 * 1. Smooth input
 * 2. Bicycle geometry: move front/rear wheels → derive new heading
 * 3. Longitudinal forces: engine, brake, drag → update speed
 * 4. Traction: kill lateral velocity → car goes where it points
 * 5. Clamp speed, prevent reverse, update position
 *
 * The bicycle geometry makes spin-outs geometrically impossible.
 * Traction controls the drift feel (higher = grippier).
 */
export function stepCar(
  car: CarState,
  input: Input,
  surface: Surface,
  dt: number,
): CarState {
  const gripMul = SURFACE_GRIP[surface] ?? 1.0;

  // 1. Smooth input
  const smoothed = smoothInput(car.prevInput, input, car.speed, dt);
  const { steerAngle } = smoothed;

  // 2. Bicycle geometry — compute new heading from wheel positions
  //    Front and rear wheels are on the car centerline, separated by wheelbase.
  //    Rear wheel moves in heading direction; front wheel moves in steered direction.
  const cosH = Math.cos(car.heading);
  const sinH = Math.sin(car.heading);

  let newHeading: number;
  if (car.speed > LOW_SPEED_GUARD) {
    const halfWB = CAR.wheelbase / 2;
    const moveD = car.speed * dt;

    // Rear wheel: moves forward along current heading
    const rearX = -cosH * halfWB + cosH * moveD;
    const rearY = -sinH * halfWB + sinH * moveD;

    // Front wheel: moves forward along (heading + steerAngle)
    const steerH = car.heading + steerAngle;
    const frontX = cosH * halfWB + Math.cos(steerH) * moveD;
    const frontY = sinH * halfWB + Math.sin(steerH) * moveD;

    // New heading = direction from rear to front
    newHeading = Math.atan2(frontY - rearY, frontX - rearX);
  } else {
    // At very low speed, apply steer directly (avoids atan2 noise)
    // Multiplier kept low — car should barely turn until it has real forward speed
    newHeading = car.heading + steerAngle * (car.speed / LOW_SPEED_GUARD) * dt * 1.0;
  }

  // Compute yaw rate for external systems (collision, HUD, camera)
  let headingDelta = newHeading - car.heading;
  while (headingDelta > Math.PI) headingDelta -= 2 * Math.PI;
  while (headingDelta < -Math.PI) headingDelta += 2 * Math.PI;
  const newYawRate = headingDelta / dt;

  // 3. Longitudinal forces — forward acceleration along heading
  const engineForce = smoothed.throttle * CAR.maxEngineForce;
  const brakeForce = smoothed.brake * CAR.maxBrakeForce;
  const dragForce = CAR.dragCoefficient * car.speed * car.speed;
  const rollingRes = CAR.rollingResistance;

  // Net force in the forward direction
  let netForwardForce = engineForce;
  if (car.speed > REVERSE_BRAKE_THRESHOLD) {
    netForwardForce -= brakeForce + dragForce + rollingRes;
  } else if (car.speed > 0.01) {
    // Near zero: only apply forces that don't reverse the car
    netForwardForce -= Math.min(brakeForce + dragForce + rollingRes, car.speed / dt * CAR.mass);
  }

  const accelForward = netForwardForce / CAR.mass;

  // Update speed
  let newSpeed = car.speed + accelForward * dt;
  if (newSpeed < 0) newSpeed = 0;
  if (newSpeed > CAR.maxSpeed) newSpeed = CAR.maxSpeed;

  // 4. Traction — decompose velocity, kill lateral component
  const newCosH = Math.cos(newHeading);
  const newSinH = Math.sin(newHeading);

  // Decompose current velocity into forward/lateral relative to NEW heading
  const forwardVel = car.velocity.x * newCosH + car.velocity.y * newSinH;
  const lateralVel = -car.velocity.x * newSinH + car.velocity.y * newCosH;

  // Traction interpolation: more grip at low speed, slight drift at high speed
  const speedT = Math.min(car.speed / CAR.maxSpeed, 1.0);
  const baseTraction = TRACTION_SLOW + (TRACTION_FAST - TRACTION_SLOW) * speedT;
  // Surface affects traction: runoff (gripMul=0.5) = more sliding
  const traction = baseTraction * gripMul;

  // Forward velocity comes from the speed calculation (heading-aligned)
  // Lateral velocity is killed by traction
  const newLateralVel = lateralVel * (1 - traction);

  // Reconstruct velocity in world frame
  let finalVx = newCosH * newSpeed + (-newSinH) * newLateralVel;
  let finalVy = newSinH * newSpeed + newCosH * newLateralVel;

  // Recompute actual speed from velocity (includes any remaining lateral)
  let finalSpeed = Math.sqrt(finalVx * finalVx + finalVy * finalVy);

  // 5. Clamp speed
  if (finalSpeed > CAR.maxSpeed) {
    const clampRatio = CAR.maxSpeed / finalSpeed;
    finalVx *= clampRatio;
    finalVy *= clampRatio;
    finalSpeed = CAR.maxSpeed;
  }

  // Prevent reverse
  const headingVec = fromAngle(newHeading);
  const velDotHeading = finalVx * headingVec.x + finalVy * headingVec.y;
  if (velDotHeading < 0 && finalSpeed < REVERSE_BRAKE_THRESHOLD) {
    finalVx = 0;
    finalVy = 0;
    finalSpeed = 0;
  }

  // 6. Update position
  const newPosition = vec2(
    car.position.x + finalVx * dt,
    car.position.y + finalVy * dt,
  );

  // Compute slip angle: angle between heading and velocity direction
  let slipAngle = 0;
  if (finalSpeed > LOW_SPEED_GUARD) {
    const velAngle = Math.atan2(finalVy, finalVx);
    let diff = velAngle - newHeading;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    slipAngle = Math.abs(diff);
  }

  return {
    position: newPosition,
    velocity: vec2(finalVx, finalVy),
    heading: newHeading,
    yawRate: newYawRate,
    speed: finalSpeed,
    prevInput: smoothed,
    surface,
    accelLongitudinal: accelForward,
    slipAngle,
  };
}
