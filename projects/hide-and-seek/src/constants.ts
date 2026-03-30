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
  /** Proximity detection threshold */
  PROXIMITY_THRESHOLD: 1.5,
} as const satisfies Record<string, number>;

/** Timers and intervals (in seconds) */
export const TIMERS = {
  COUNTDOWN_DURATION_S: 10,
  HUNT_TIME_LIMIT_S: 120,
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
} as const satisfies Record<string, number>;

/** Render depth values */
export const DEPTH = {
  GROUND: 0,
  WALLS: 1,
  PLAYER: 5,
  FOG: 100,
  UI: 200,
} as const satisfies Record<string, number>;

/** Fog of war settings */
export const FOG = {
  /** Alpha for unexplored tiles (fully black) */
  ALPHA_UNEXPLORED: 1.0,
  /** Alpha for explored tiles (dimly visible) */
  ALPHA_EXPLORED: 0.6,
  /** Alpha for visible tiles (fully clear) */
  ALPHA_VISIBLE: 0.0,
  /** Lerp factor per frame (higher = faster transition, ~200ms at 60fps) */
  LERP_FACTOR: 0.12,
  /** Convergence threshold — stop lerping when within this */
  CONVERGENCE: 0.01,
  /** Inner radius as fraction of vision range (fully clear inside) */
  VIGNETTE_INNER: 0.5,
  /** Outer radius alpha target (slightly dimmed at edge) */
  VIGNETTE_OUTER_ALPHA: 0.15,
} as const satisfies Record<string, number>;

/** Scene transition and cinematic timing (milliseconds) */
export const CINEMATIC = {
  SCENE_FADE_MS: 500,
  COUNTDOWN_TO_HUNT_FADE_OUT_MS: 200,
  COUNTDOWN_TO_HUNT_FADE_IN_MS: 300,
  END_SEQUENCE_PAUSE_MS: 200,
  END_SEQUENCE_ZOOM_MS: 500,
  END_SEQUENCE_FLASH_MS: 250,
  END_SEQUENCE_SPLASH_HOLD_MS: 1500,
  END_SEQUENCE_FADE_OUT_MS: 500,
  SHAKE_DURATION_MS: 100,
  SHAKE_INTENSITY: 0.015,
} as const satisfies Record<string, number>;

/** HUD timer warning thresholds (in seconds) */
export const HUD = {
  WARNING_THRESHOLD_S: 30,
  CRITICAL_THRESHOLD_S: 10,
  COLOR_NORMAL: 0xffffff,
  COLOR_WARNING: 0xffcc00,
  COLOR_CRITICAL: 0xff3333,
} as const satisfies Record<string, number>;

/** Seeker AI tuning (Easy tier) */
export const SEEKER = {
  /** Reaction delay before transitioning PATROL→CHASE (seconds) */
  REACTION_DELAY_S: 1.5,
  /** Time with no LOS before CHASE→PATROL (seconds) */
  CHASE_TIMEOUT_S: 3.0,
  /** Minimum patrol pause at destination (seconds) */
  PATROL_PAUSE_MIN_S: 0.5,
  /** Maximum patrol pause at destination (seconds) */
  PATROL_PAUSE_MAX_S: 1.0,
  /** Re-request path to hider every N ticks during active chase */
  CHASE_REPATH_TICKS: 30,
  /** EasyStar iterations per calculate() call */
  PATHFINDING_ITERATIONS: 200,
} as const satisfies Record<string, number>;

/** Collision settings */
export const COLLISION = {
  /** Player hitbox width and height in pixels (centered on 32x32 sprite) */
  PLAYER_HITBOX: 20,
} as const satisfies Record<string, number>;
