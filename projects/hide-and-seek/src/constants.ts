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
} as const satisfies Record<string, number>;

/** Render depth values */
export const DEPTH = {
  GROUND: 0,
  WALLS: 1,
  PLAYER: 5,
  FOG: 100,
  MINIMAP_DOORS: 150,
  MINIMAP_SONAR_RING: 180,
  MINIMAP_SONAR_BLIP: 190,
  MINIMAP_PLAYER: 200,
  UI: 200,
  MINIMAP_BORDER: 1000,
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

/** Door settings */
export const DOOR = {
  /** Ticks between toggles (500ms at 60 tick/s) */
  TOGGLE_COOLDOWN_TICKS: 30,
  /** EasyStar tile cost for closed doors (expensive, not blocked) */
  PATHFINDING_COST: 50,
  /** Seeker ticks waiting after opening a door before continuing */
  OPEN_WAIT_TICKS: 3,
  /** Ticks before stuck-at-door fallback (5s at 60 tick/s) */
  STUCK_FALLBACK_TICKS: 300,
} as const satisfies Record<string, number>;

/** Sonar ping settings */
export const SONAR = {
  RING_DURATION_MS: 1500,
  BLIP_HOLD_DURATION_MS: 2000,
  BLIP_FADE_DURATION_MS: 1000,
  RING_MAX_RADIUS_TILES: 15,
  /** Base threshold for distance-based blip reveal */
  BLIP_THRESHOLD: 16,
} as const satisfies Record<string, number>;

/** AI room and search tuning (tier-specific values live in SEEKER_CONFIGS) */
export const AI = {
  /** Ticks before a visited room becomes stale again (30s at 60 tick/s) */
  RE_CLEAR_TICKS: 1800,
  /** Anti-oscillation cooldown for room scoring (5s at 60 tick/s) */
  ROOM_SCORING_COOLDOWN_TICKS: 300,
  /** Normalization ceiling for room staleness (60s at 60 tick/s) */
  MAX_STALE_TICKS: 3600,
  /** Doorway pause duration (500ms at 60 tick/s) */
  DOORWAY_PAUSE_TICKS: 30,
  /** LOOK_AROUND total duration (2s at 60 tick/s) */
  LOOK_AROUND_DURATION_TICKS: 120,
  /** Max distance for room scoring normalization (tiles) */
  MAX_ROOM_DIST: 20,
} as const satisfies Record<string, number>;

/** Minimap settings */
export const MINIMAP = {
  WIDTH: 160,
  HEIGHT: 160,
  MARGIN: 10,
} as const satisfies Record<string, number>;
