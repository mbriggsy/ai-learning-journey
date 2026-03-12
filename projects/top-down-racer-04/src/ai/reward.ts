/**
 * Reward Computation — dense per-tick reward with per-component breakdown.
 *
 * Pure function: takes world states, wall contact flag, and config weights.
 * No engine queries — all heavy computation happens in the caller.
 */

import type { WorldState } from '../engine/types';
import { Surface } from '../engine/types';
import { CAR } from '../engine/constants';
import { distanceToTrackCenter } from '../engine/track';
import type { RewardConfig } from './ai-config';

export interface RewardBreakdown {
  progress: number;
  speed: number;
  wall: number;
  offTrack: number;
  backward: number;
  stillness: number;
  total: number;
}

/**
 * Compute per-tick reward with component breakdown.
 *
 * @param prevWorld   World state from the previous tick
 * @param currWorld   World state from the current tick
 * @param wallContact Whether the car contacted a wall this tick (before resolution)
 * @param config      Reward weights
 * @param precomputed Optional pre-computed arc lengths to avoid redundant distanceToTrackCenter calls
 */
export function computeReward(
  prevWorld: WorldState,
  currWorld: WorldState,
  wallContact: boolean,
  config: RewardConfig,
  precomputed?: { prevArcLength: number; currArcLength: number },
): RewardBreakdown {
  const totalLen = currWorld.track.totalLength;

  // --- Progress (dense, continuous arc-length) ---
  const prevArc = precomputed
    ? precomputed.prevArcLength
    : distanceToTrackCenter(prevWorld.car.position, prevWorld.track).arcLength;
  const currArc = precomputed
    ? precomputed.currArcLength
    : distanceToTrackCenter(currWorld.car.position, currWorld.track).arcLength;

  let delta = currArc - prevArc;
  // Handle wrap-around at lap boundary
  if (delta < -totalLen / 2) delta += totalLen;
  if (delta > totalLen / 2) delta -= totalLen;

  const progress = (delta / totalLen) * config.progress;

  // --- Speed bonus ---
  const speed = (currWorld.car.speed / CAR.maxSpeed) * config.speedBonus;

  // --- Wall penalty ---
  const wall = wallContact ? config.wallPenalty : 0;

  // --- Off-track penalty ---
  const offTrack = currWorld.car.surface !== Surface.Road ? config.offTrackPenalty : 0;

  // --- Backward penalty ---
  const backward = delta < 0 ? config.backwardPenalty : 0;

  // --- Stillness penalty ---
  const stillness = currWorld.car.speed < config.stillnessSpeedThreshold
    ? config.stillnessPenalty
    : 0;

  const total = progress + speed + wall + offTrack + backward + stillness;

  return { progress, speed, wall, offTrack, backward, stillness, total };
}
