/** Canvas and display */
export const DISPLAY = {
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  TILE_SIZE: 32,
} as const satisfies Record<string, number>;

/** Fixed timestep and simulation tuning */
export const SIMULATION = {
  /** Fixed physics step: 1/60th second */
  FIXED_STEP_S: 1 / 60,
  /** Maximum catch-up ticks per frame (spiral of death prevention) */
  MAX_CATCHUP_TICKS: 5,
} as const satisfies Record<string, number>;

/** Movement speeds */
export const MOVEMENT = {
  /** Base player speed in pixels/second */
  PLAYER_SPEED: 120,
  /** Seeker speed multiplier vs player (1.15 = 15% faster) */
  SEEKER_SPEED_MULTIPLIER: 1.15,
} as const satisfies Record<string, number>;

/** Vision and detection ranges (in tiles) */
export const VISION = {
  HIDER_RANGE: 6,
  SEEKER_RANGE: 8,
  /** Seeker cone angle in degrees (rendering only) */
  SEEKER_ANGLE_DEG: 90,
  /** Proximity detection threshold */
  PROXIMITY_THRESHOLD: 1.5,
  /** Heartbeat audio starts at this range */
  HEARTBEAT_START_RANGE: 3.0,
} as const satisfies Record<string, number>;

/** Timers and intervals (in seconds) */
export const TIMERS = {
  COUNTDOWN_DURATION_S: 10,
  HUNT_TIME_LIMIT_S: 120,
  SONAR_PING_INTERVAL_S: 5,
} as const satisfies Record<string, number>;

/** Interaction ranges (in tiles) */
export const INTERACTION = {
  DOOR_RANGE: 1.5,
} as const satisfies Record<string, number>;

/** Camera settings */
export const CAMERA = {
  ZOOM: 2,
  FOLLOW_LERP: 0.1,
} as const satisfies Record<string, number>;

/** Input settings */
export const INPUT = {
  GAMEPAD_DEADZONE_INNER: 0.15,
  GAMEPAD_DEADZONE_OUTER: 0.95,
  GAMEPAD_MENU_THRESHOLD: 0.5,
} as const satisfies Record<string, number>;

/** Render depth values */
export const DEPTH = {
  GROUND: 0,
  WALLS: 1,
  PLAYER: 5,
  ABOVE_PLAYER: 10,
  UI: 100,
} as const satisfies Record<string, number>;

/** Collision settings */
export const COLLISION = {
  /** Player hitbox width and height in pixels (centered on 32x32 sprite) */
  PLAYER_HITBOX: 20,
} as const satisfies Record<string, number>;
