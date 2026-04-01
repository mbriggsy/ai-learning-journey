import type { HiderConfig } from '../../types/ai.js';
import type { Difficulty } from '../../types/settings.js';
import { MOVEMENT } from '../../constants.js';

/** Easy: picks a random spot and sits. No strategy, no evasion. */
export const HIDER_EASY = {
  evaluatesSpots: false,
  spotScoreWeights: { distance: 0, losBlockers: 0, escapeRoutes: 0, deadEndPenalty: 0, pathExposure: 0 },
  usesFov: false,
  repositionTriggerRange: 0,
  maxRepositionsPerRound: 0,
  repositionDelayIncrementTicks: 0,
  usesDoors: false,
  speed: MOVEMENT.PLAYER_SPEED * 0.9,
} as const satisfies HiderConfig;

/** Medium: scores hiding spots using weighted criteria. Sits once positioned. */
export const HIDER_MEDIUM = {
  evaluatesSpots: true,
  spotScoreWeights: {
    distance: 2.0,
    losBlockers: 3.0,
    escapeRoutes: 1.5,
    deadEndPenalty: -5.0,
    pathExposure: -2.0,
  },
  usesFov: false,
  repositionTriggerRange: 0,
  maxRepositionsPerRound: 0,
  repositionDelayIncrementTicks: 0,
  usesDoors: false,
  speed: MOVEMENT.PLAYER_SPEED * 0.95,
} as const satisfies HiderConfig;

/** Hard: scores spots, uses FOV to detect seeker, actively evades with doors. */
export const HIDER_HARD = {
  evaluatesSpots: true,
  spotScoreWeights: {
    distance: 2.0,
    losBlockers: 3.0,
    escapeRoutes: 1.5,
    deadEndPenalty: -5.0,
    pathExposure: -2.0,
  },
  usesFov: true,
  repositionTriggerRange: 5,           // tiles
  maxRepositionsPerRound: 3,
  repositionDelayIncrementTicks: 30,    // 0.5s added per reposition
  usesDoors: true,
  speed: MOVEMENT.PLAYER_SPEED * 1.0,
} as const satisfies HiderConfig;

export const HIDER_CONFIGS: Record<Difficulty, HiderConfig> = {
  easy: HIDER_EASY,
  medium: HIDER_MEDIUM,
  hard: HIDER_HARD,
} as const;
