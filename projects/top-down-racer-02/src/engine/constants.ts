/**
 * Physics Constants and Tuning Parameters
 *
 * All game physics tuning lives here. Values are starting points --
 * the structure matters more than exact numbers. These will be refined
 * during Phase 1 playtesting.
 *
 * Requirement references noted where applicable.
 */

/** Fixed timestep in seconds. 60Hz physics tick (MECH-14). */
export const DT = 1 / 60;

/** Car body and drivetrain parameters. */
export const CAR = {
  /** Car mass in kg */
  mass: 800,
  /** Weight in Newtons (mass * gravity) */
  weight: 800 * 9.81,
  /** Wheelbase in game units (front axle to rear axle) */
  wheelbase: 1.5,
  /** Distance from CG to front axle */
  cgToFront: 0.85,
  /** Distance from CG to rear axle (rearward bias — more rear grip, less oversteer) */
  cgToRear: 0.65,
  /** CG height for weight transfer calculation (MECH-03) */
  cgHeight: 0.5,
  /** Car length in game units */
  length: 4.0,
  /** Car width in game units */
  width: 2.0,
  /** Maximum engine force in game-Newtons */
  maxEngineForce: 27500,
  /** Maximum brake force in game-Newtons -- stronger than engine for meaningful braking */
  maxBrakeForce: 40000,
  /** Aerodynamic drag coefficient (drag = coeff * v * |v|) */
  dragCoefficient: 2.5,
  /** Rolling resistance factor */
  rollingResistance: 150,
  /** Maximum speed cap in units/sec */
  maxSpeed: 110,
} as const;

/** Simplified Pacejka tire model parameters (MECH-04).
 *  Tuned for arcade feel — tire forces add drift flavor, not primary turning. */
export const TIRE = {
  /** Stiffness factor -- how quickly grip builds with slip angle */
  B: 5.0,
  /** Shape factor -- controls peak width */
  C: 1.4,
  /** Base friction coefficient (low = arcade, high = sim) */
  mu: 0.5,
} as const;

/**
 * Surface grip multipliers indexed by Surface enum value (MECH-07).
 * Road = full grip, Runoff = ~50% grip per CONTEXT.md.
 */
export const SURFACE_GRIP: Record<number, number> = {
  0: 1.0, // Surface.Road
  1: 0.5, // Surface.Runoff
};

/** Input smoothing response rates (MECH-01, MECH-02). */
export const INPUT_RATES = {
  /** Steering response rate (units/sec toward target) */
  steer: 30.0,
  /** Throttle response rate */
  throttle: 6.0,
  /** Brake response rate (fastest -- brakes respond immediately) */
  brake: 10.0,
} as const;

/** Tangential friction coefficient during wall slide (MECH-08). */
export const WALL_FRICTION = 0.3;

/** Steering geometry parameters (MECH-06). */
export const STEER = {
  /** Maximum front wheel angle in radians (~23 degrees) */
  maxAngle: 0.4,
  /** Speed reduction coefficient -- reduces steering authority at high speed.
   *  Higher = more reduction. Arcade: 0.025, Sim: 0.008 */
  speedFactor: 0.025,
} as const;
