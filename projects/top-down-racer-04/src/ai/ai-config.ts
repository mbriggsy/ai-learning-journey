/**
 * AI Configuration — types, constants, and default weights.
 *
 * All magic numbers for ray casting, observation normalization, and
 * reward computation live here. Engine-side only (no Python, no network).
 */

/** Ray casting configuration constants. */
export const RAY = {
  numRays: 9,
  fovRadians: Math.PI, // 180 degrees
  maxDist: 200, // game units
} as const;

/** Observation normalization constants. */
export const OBS = {
  /** Max expected yaw rate (rad/s) for normalization. Derived from max cornering dynamics. */
  maxYawRate: 5.0,
  /** Max expected centerline distance (game units). Conservative upper bound for road width + WALL_OFFSET. */
  maxCenterlineDist: 80,
  /** Number of observation values in the vector. */
  size: 14,
} as const;

export interface RewardConfig {
  progress: number;
  speedBonus: number;
  wallPenalty: number;
  offTrackPenalty: number;
  backwardPenalty: number;
  stillnessPenalty: number;
  stillnessSpeedThreshold: number;
}

export interface EpisodeConfig {
  maxSteps: number;
  stillnessTimeoutTicks: number;
}

export interface AiConfig {
  weights: RewardConfig;
  episode: EpisodeConfig;
}

export const DEFAULT_AI_CONFIG = {
  weights: {
    progress: 1.0,
    speedBonus: 0.0,
    wallPenalty: -0.002,
    offTrackPenalty: -0.001,
    backwardPenalty: 0.0,
    stillnessPenalty: -0.001,
    stillnessSpeedThreshold: 2.0,
  },
  episode: {
    maxSteps: 3000,
    stillnessTimeoutTicks: 180,
  },
} as const satisfies AiConfig;
