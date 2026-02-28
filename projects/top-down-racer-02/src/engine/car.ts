/**
 * Car Physics Module — Dynamic Bicycle Model
 *
 * Pure functions implementing the car physics simulation:
 * - Input smoothing with exponential decay
 * - Speed-dependent steering authority
 * - Weight transfer between front and rear axles
 * - Simplified Pacejka tire force model
 * - Full bicycle model physics step with Euler integration
 *
 * All functions are pure: they return new objects, never mutate input state.
 * No external physics dependencies, no Math.random — fully deterministic.
 */

import type { Vec2, CarState, Input, SmoothedInput } from './types';
import { Surface } from './types';
import { vec2, fromAngle } from './vec2';
import { CAR, TIRE, SURFACE_GRIP, INPUT_RATES, STEER } from './constants';

/** Minimum forward velocity used in slip angle calculation to prevent div-by-zero. */
const LOW_SPEED_GUARD = 0.5;

/** Below this speed, braking forces that would reverse the car are zeroed out. */
const REVERSE_BRAKE_THRESHOLD = 1.0;

/** Maximum yaw rate in rad/s. ~2 rad/s is a hard drift; 3 is an extreme spin. */
const MAX_YAW_RATE = 3.0;

/** Yaw rate always decays by this fraction per tick (tire scrub friction). */
const YAW_FRICTION = 0.01;

/** Below this speed, additional yaw damping kicks in (tires scrub harder at low speed). */
const YAW_DAMP_SPEED_THRESHOLD = 5.0;

/** Extra yaw damping factor per tick at zero speed. */
const YAW_DAMP_FACTOR = 0.97;

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
 *   steerAngle = smoothedSteer * maxAngle / (1 + speed * speedFactor)
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
// tireForce
// ──────────────────────────────────────────────────────────

/**
 * Simplified Pacejka tire force model.
 *
 * F = mu * gripMul * Fz * sin(C * atan(B * slipAngle))
 *
 * Where:
 * - mu: base friction coefficient (TIRE.mu)
 * - gripMul: surface grip multiplier (1.0 for road, 0.5 for runoff)
 * - Fz: vertical load on the axle (Newtons)
 * - B: stiffness factor (TIRE.B)
 * - C: shape factor (TIRE.C)
 * - slipAngle: angle between tire heading and velocity (radians)
 *
 * The curve builds force with slip angle, peaks, then falls off.
 * This falloff is what causes oversteer and understeer.
 */
export function tireForce(slipAngle: number, load: number, gripMul: number): number {
  // Negative sign: lateral force OPPOSES slip (restoring force).
  // Without it, tire forces amplify yaw → instant spin.
  return -TIRE.mu * gripMul * load * Math.sin(TIRE.C * Math.atan(TIRE.B * slipAngle));
}

// ──────────────────────────────────────────────────────────
// stepCar
// ──────────────────────────────────────────────────────────

/**
 * Full bicycle model physics step.
 *
 * Takes the current car state, raw input, surface type, and timestep.
 * Returns a brand new CarState after one tick of simulation.
 *
 * Steps:
 * 1. Smooth input from raw
 * 2. Transform velocity to car-local frame (forward/lateral)
 * 3. Compute weight transfer from previous tick's longitudinal acceleration
 * 4. Compute slip angles (front and rear) with low-speed guard
 * 5. Compute lateral tire forces using simplified Pacejka
 * 6. Compute longitudinal forces (engine, brake, drag, rolling resistance)
 * 7. Sum forces in car-local frame, transform to world frame
 * 8. Compute yaw torque from lateral force imbalance
 * 9. Euler integrate: velocity, position, heading, yawRate
 * 10. Clamp speed to maxSpeed
 * 11. Return new CarState
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

  // 2. Transform velocity to car-local frame
  //    Forward direction is determined by heading
  //    vLocal.x = forward velocity, vLocal.y = lateral velocity
  const cosH = Math.cos(car.heading);
  const sinH = Math.sin(car.heading);
  const vLocalX = car.velocity.x * cosH + car.velocity.y * sinH;
  const vLocalY = -car.velocity.x * sinH + car.velocity.y * cosH;

  // 3. Weight transfer from previous tick's longitudinal acceleration
  const Wf = (CAR.cgToRear / CAR.wheelbase) * CAR.weight
    - (CAR.cgHeight / CAR.wheelbase) * CAR.mass * car.accelLongitudinal;
  const Wr = (CAR.cgToFront / CAR.wheelbase) * CAR.weight
    + (CAR.cgHeight / CAR.wheelbase) * CAR.mass * car.accelLongitudinal;

  // 4. Slip angles with low-speed guard
  //    absVx = max(abs(vLocalX), 0.5) to prevent division by near-zero
  const absVx = Math.max(Math.abs(vLocalX), LOW_SPEED_GUARD);

  // Front slip angle: angle between front tire heading and velocity at front axle
  const slipAngleFront = Math.atan2(
    vLocalY + car.yawRate * CAR.cgToFront,
    absVx,
  ) - steerAngle;

  // Rear slip angle: angle between rear tire heading and velocity at rear axle
  const slipAngleRear = Math.atan2(
    vLocalY - car.yawRate * CAR.cgToRear,
    absVx,
  );

  // 5. Lateral tire forces
  const FlatF = tireForce(slipAngleFront, Wf, gripMul);
  const FlatR = tireForce(slipAngleRear, Wr, gripMul);

  // 6. Longitudinal forces
  //    Engine force: throttle * maxEngineForce
  const engineForce = smoothed.throttle * CAR.maxEngineForce;
  //    Brake force: brake * maxBrakeForce, opposing velocity direction
  const brakeForce = smoothed.brake * CAR.maxBrakeForce;
  //    Drag: proportional to speed squared, opposing velocity
  const dragForce = CAR.dragCoefficient * vLocalX * Math.abs(vLocalX);
  //    Rolling resistance: constant opposing velocity direction
  const rollingResistance = CAR.rollingResistance * Math.sign(vLocalX);

  // Net longitudinal force (in car-local forward direction)
  const FlongNet = engineForce
    - brakeForce * Math.sign(vLocalX)
    - dragForce
    - rollingResistance;

  // 7. Accelerations in car-local frame
  //    Lateral force on car body: rear lateral + front lateral component (steer angle)
  const accelX = FlongNet / CAR.mass;
  const accelY = (FlatR + FlatF * Math.cos(steerAngle)) / CAR.mass;

  // Transform acceleration to world frame
  const accelWorldX = accelX * cosH - accelY * sinH;
  const accelWorldY = accelX * sinH + accelY * cosH;

  // 8. Yaw torque and angular acceleration
  //    Torque = front lateral force * lever arm - rear lateral force * lever arm
  const yawTorque = FlatF * CAR.cgToFront * Math.cos(steerAngle) - FlatR * CAR.cgToRear;
  //    Moment of inertia approximation: mass * wheelbase^2 / 12
  //    (simplified for a rod-like body)
  const inertia = CAR.mass * CAR.wheelbase * CAR.wheelbase / 8;
  const yawAccel = yawTorque / inertia;

  // 9. Euler integration
  const newVx = car.velocity.x + accelWorldX * dt;
  const newVy = car.velocity.y + accelWorldY * dt;
  let newYawRate = car.yawRate + yawAccel * dt;

  // Clamp yaw rate to prevent runaway spin
  newYawRate = Math.max(-MAX_YAW_RATE, Math.min(MAX_YAW_RATE, newYawRate));

  // Constant yaw friction — always opposes spin (like tire scrub resistance)
  newYawRate *= (1 - YAW_FRICTION);

  // Extra damping at low speed — tires scrubbing the ground kill spin faster
  const currentSpeed = Math.sqrt(newVx * newVx + newVy * newVy);
  if (currentSpeed < YAW_DAMP_SPEED_THRESHOLD) {
    const dampLerp = 1 - currentSpeed / YAW_DAMP_SPEED_THRESHOLD; // 1 at zero speed, 0 at threshold
    const dampFactor = 1 - dampLerp * (1 - YAW_DAMP_FACTOR); // blend toward YAW_DAMP_FACTOR at low speed
    newYawRate *= dampFactor;
  }

  const newHeading = car.heading + newYawRate * dt;

  // Compute speed and clamp to maxSpeed
  let newSpeed = Math.sqrt(newVx * newVx + newVy * newVy);

  let finalVx = newVx;
  let finalVy = newVy;

  // 10. Clamp speed
  if (newSpeed > CAR.maxSpeed) {
    const clampRatio = CAR.maxSpeed / newSpeed;
    finalVx = newVx * clampRatio;
    finalVy = newVy * clampRatio;
    newSpeed = CAR.maxSpeed;
  }

  // Prevent negative speed (car shouldn't reverse from braking alone)
  // Check if the car is trying to go backward (velocity dot heading < 0)
  // and speed is very low
  const headingVec = fromAngle(newHeading);
  const velDotHeading = finalVx * headingVec.x + finalVy * headingVec.y;
  if (velDotHeading < 0 && newSpeed < REVERSE_BRAKE_THRESHOLD) {
    finalVx = 0;
    finalVy = 0;
    newSpeed = 0;
  }

  const newPosition = vec2(
    car.position.x + finalVx * dt,
    car.position.y + finalVy * dt,
  );

  // 11. Return new CarState
  return {
    position: newPosition,
    velocity: vec2(finalVx, finalVy),
    heading: newHeading,
    yawRate: newYawRate,
    speed: newSpeed,
    prevInput: smoothed,
    surface,
    accelLongitudinal: accelX,
  };
}
