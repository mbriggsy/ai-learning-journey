/**
 * Engine Type Contracts
 *
 * All interfaces used by the simulation engine. These define the contracts
 * that car physics, collision, track, and timing systems build against.
 * Every type here is an immutable snapshot -- no mutation allowed.
 */

/** 2D vector as a plain readonly object. Pure functions operate on this. */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Surface type. const enum inlines to numbers for headless performance. */
export const enum Surface {
  Road = 0,
  Runoff = 1,
  Shoulder = 2,
}

/** Raw input from keyboard or AI agent. Values are normalized. */
export interface Input {
  /** Steering input: -1.0 (full left) to +1.0 (full right) */
  steer: number;
  /** Throttle input: 0.0 (none) to 1.0 (full) */
  throttle: number;
  /** Brake input: 0.0 (none) to 1.0 (full) */
  brake: number;
}

/** Smoothed input after applying response rates, with computed steer angle. */
export interface SmoothedInput {
  steer: number;
  throttle: number;
  brake: number;
  /** Front wheel angle in radians, computed from steer value + speed factor */
  steerAngle: number;
}

/**
 * Complete car state at a single simulation tick.
 * Immutable snapshot -- the physics step produces a new CarState each tick.
 */
export interface CarState {
  /** World-space position of the car's center of gravity */
  position: Vec2;
  /** World-space velocity vector */
  velocity: Vec2;
  /** Car heading in radians (0 = +x, PI/2 = +y) */
  heading: number;
  /** Yaw rate in radians per second */
  yawRate: number;
  /** Scalar speed (magnitude of velocity) */
  speed: number;
  /** Smoothed input from the previous tick (used for input rate limiting) */
  prevInput: SmoothedInput;
  /** Current surface the car's CG is on */
  surface: Surface;
  /** Longitudinal acceleration for weight transfer calculation next tick */
  accelLongitudinal: number;
  /** Rear axle slip angle in radians (absolute value). 0 = no slide. */
  slipAngle: number;
}

/** Track centerline control point with half-width. */
export interface TrackControlPoint {
  /** Position on the centerline spline */
  position: Vec2;
  /** Half-width from centerline to edge (in game units) */
  width: number;
}

/**
 * Arc-length lookup table for uniform parameterization of the track spline.
 * Built once when the track is created, then queried every tick.
 */
export interface ArcLengthTable {
  /** Cumulative arc length at each sample point */
  lengths: readonly number[];
  /** Corresponding spline parameter (0 to N, where N = number of segments) */
  params: readonly number[];
  /** Total arc length of the closed spline loop */
  totalLength: number;
}

/** A checkpoint gate perpendicular to the track at a given arc-length distance. */
export interface Checkpoint {
  /** Left edge of the gate */
  left: Vec2;
  /** Right edge of the gate */
  right: Vec2;
  /** Center of the gate (on the centerline) */
  center: Vec2;
  /** Unit vector along the spline direction at this gate */
  direction: Vec2;
  /** Arc-length distance from the track start */
  arcLength: number;
}

/**
 * Immutable built track. Created once from control points, never mutated.
 * All systems read from this to determine boundaries, checkpoints, etc.
 */
export interface TrackState {
  /** Original control points defining the centerline */
  controlPoints: readonly TrackControlPoint[];
  /** Inner boundary polyline (left side of track) */
  innerBoundary: readonly Vec2[];
  /** Outer boundary polyline (right side of track) */
  outerBoundary: readonly Vec2[];
  /** Checkpoint gates along the track */
  checkpoints: readonly Checkpoint[];
  /** Arc-length lookup table for the centerline spline */
  arcLengthTable: ArcLengthTable;
  /** Total centerline length in game units */
  totalLength: number;
  /** Starting position for the car */
  startPosition: Vec2;
  /** Starting heading in radians */
  startHeading: number;
}

/** Result of a collision test between the car and a wall boundary. */
export interface CollisionResult {
  /** Whether a collision was detected */
  collided: boolean;
  /** Penetration depth into the wall (0 if no collision) */
  penetration: number;
  /** Normal vector pointing away from the wall, into the track */
  normal: Vec2;
  /** Point of contact on the wall boundary */
  contactPoint: Vec2;
}

/** Lap timing and checkpoint tracking state. */
export interface TimingState {
  /** Ticks elapsed in the current lap */
  currentLapTicks: number;
  /** Best lap time in ticks (-1 if no completed lap yet) */
  bestLapTicks: number;
  /** Current lap number (1-indexed) */
  currentLap: number;
  /** Index of the last checkpoint crossed */
  lastCheckpointIndex: number;
  /** True on the tick a lap finishes */
  lapComplete: boolean;
}

/** Full simulation world state at a single tick. */
export interface WorldState {
  /** Current simulation tick number */
  tick: number;
  /** Car state snapshot */
  car: CarState;
  /** Track state (immutable reference, same object each tick) */
  track: TrackState;
  /** Timing and checkpoint state */
  timing: TimingState;
}
