import type { SeekerConfig } from '../../types/ai.js';
import type { Difficulty } from '../../types/settings.js';
import { MOVEMENT } from '../../constants.js';

/** Easy: dumb but functional. Narrow vision, slow reactions, random patrol. */
export const SEEKER_EASY = {
  // Vision
  visionRange: 4,
  visionConeAngle: 60,
  hearingRange: 5,
  // Timing
  reactionDelayTicks: 90,        // 1.5s
  chaseTimeoutTicks: 180,        // 3.0s
  memoryDurationTicks: 180,      // 3s
  patrolPauseMinTicks: 30,       // 0.5s
  patrolPauseMaxTicks: 60,       // 1.0s
  suspiciousDurationTicks: 120,  // 2s
  suspiciousCooldownTicks: 180,  // 3s
  searchDurationTicks: 300,      // 5s
  menaceLimitTicks: 0,           // no menace gauge
  menaceCooldownTicks: 0,
  // Search
  searchRadiusTiles: 3,
  searchThoroughness: 'spot-check',
  searchSkipLKPChance: 0.6,      // 60% skip — often misses exact spot
  // Movement
  patrolSpeed: MOVEMENT.PLAYER_SPEED * 0.7,
  chaseSpeed: MOVEMENT.PLAYER_SPEED * 1.15,
  doorwayPauseChance: 0,
  doorwayPauseTicks: 30,
  // Patrol
  patrolStrategy: 'random',
  cancelChaseOnBriefGlimpse: true,  // brief glimpse → cancel to SUSPICIOUS
  // Chase
  chaseGraceTicks: 12,
} as const satisfies SeekerConfig;

/** Medium: methodical room-clearer. Predictable pattern players can learn. */
export const SEEKER_MEDIUM = {
  // Vision
  visionRange: 6,
  visionConeAngle: 90,
  hearingRange: 7,
  // Timing
  reactionDelayTicks: 45,        // 0.75s
  chaseTimeoutTicks: 180,        // 3.0s
  memoryDurationTicks: 480,      // 8s
  patrolPauseMinTicks: 30,       // 0.5s
  patrolPauseMaxTicks: 60,       // 1.0s
  suspiciousDurationTicks: 240,  // 4s
  suspiciousCooldownTicks: 180,  // 3s
  searchDurationTicks: 900,      // 15s
  menaceLimitTicks: 1500,        // 25s continuous chase
  menaceCooldownTicks: 300,      // 5s forced patrol
  // Search
  searchRadiusTiles: 5,
  searchThoroughness: 'full-room',
  searchSkipLKPChance: 0.3,      // 30% skip
  // Movement
  patrolSpeed: MOVEMENT.PLAYER_SPEED * 0.8,
  chaseSpeed: MOVEMENT.PLAYER_SPEED * 1.15,
  doorwayPauseChance: 0.1,       // 10%
  doorwayPauseTicks: 30,
  // Patrol
  patrolStrategy: 'systematic',
  cancelChaseOnBriefGlimpse: false, // locked on
  // Chase
  chaseGraceTicks: 12,
} as const satisfies SeekerConfig;

/** Hard: evidence-using, strategic predator. Wide cone, fast reactions, hiding spot priority. */
export const SEEKER_HARD = {
  // Vision
  visionRange: 8,
  visionConeAngle: 120,
  hearingRange: 10,
  // Timing
  reactionDelayTicks: 15,        // 0.25s
  chaseTimeoutTicks: 300,        // 5.0s
  memoryDurationTicks: 1200,     // 20s
  patrolPauseMinTicks: 30,       // 0.5s
  patrolPauseMaxTicks: 60,       // 1.0s
  suspiciousDurationTicks: 300,  // 5s
  suspiciousCooldownTicks: 180,  // 3s
  searchDurationTicks: 1800,     // 30s
  menaceLimitTicks: 1200,        // 20s continuous chase
  menaceCooldownTicks: 300,      // 5s forced patrol
  // Search
  searchRadiusTiles: 8,
  searchThoroughness: 'room-plus-adjacent',
  searchSkipLKPChance: 0.1,      // 10% skip — almost always checks exact spot
  // Movement
  patrolSpeed: MOVEMENT.PLAYER_SPEED * 0.85,
  chaseSpeed: MOVEMENT.PLAYER_SPEED * 1.2,
  doorwayPauseChance: 0.3,       // 30%
  doorwayPauseTicks: 30,
  // Patrol
  patrolStrategy: 'strategic',
  cancelChaseOnBriefGlimpse: false, // locked on
  // Chase
  chaseGraceTicks: 15,
} as const satisfies SeekerConfig;

export const SEEKER_CONFIGS: Record<Difficulty, SeekerConfig> = {
  easy: SEEKER_EASY,
  medium: SEEKER_MEDIUM,
  hard: SEEKER_HARD,
} as const;
