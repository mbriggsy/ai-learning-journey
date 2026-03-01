/**
 * Observation Vector Builder — 14-value normalized vector for the AI agent.
 *
 * Components: 9 ray distances + speed + yawRate + steering + lapProgress + centerlineDist.
 * All values normalized to [-1, 1] or [0, 1] subranges.
 */

import type { WorldState } from '../engine/types';
import { CAR } from '../engine/constants';
import { RAY, OBS } from './ai-config';

export const OBSERVATION_SIZE = 14;

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Build the 14-value normalized observation vector.
 *
 * @param world  Current world state (reads car speed, yawRate, steering, track totalLength)
 * @param rays   Pre-computed ray distances from castRays, length must equal RAY.numRays
 * @param trackProgress  Pre-computed { distance, arcLength } from distanceToTrackCenter
 */
export function buildObservation(
  world: WorldState,
  rays: number[],
  trackProgress: { distance: number; arcLength: number },
): number[] {
  const { car, track } = world;

  const obs = new Array<number>(OBSERVATION_SIZE);

  // [0..8] Ray distances (already normalized to [0, 1])
  for (let i = 0; i < RAY.numRays; i++) {
    obs[i] = rays[i];
  }

  // [9] Speed normalized to [0, 1]
  obs[9] = car.speed / CAR.maxSpeed;

  // [10] Yaw rate normalized to [-1, 1]
  obs[10] = clamp(car.yawRate / OBS.maxYawRate, -1, 1);

  // [11] Steering input [-1, 1] (already in range from input smoothing)
  obs[11] = car.prevInput.steer;

  // [12] Lap progress [0, 1] — continuous arc-length, NOT discrete checkpoint
  obs[12] = trackProgress.arcLength / track.totalLength;

  // [13] Centerline distance [0, 1]
  obs[13] = Math.min(1, trackProgress.distance / OBS.maxCenterlineDist);

  return obs;
}
