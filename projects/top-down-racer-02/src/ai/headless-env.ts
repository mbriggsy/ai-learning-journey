/**
 * HeadlessEnv — Headless environment controller wrapping engine + AI modules.
 *
 * Adapts the game engine into an episode-based RL interface. Manages world
 * lifecycle (reset/step), builds observations, computes rewards, and tracks
 * termination conditions. No rendering, no PixiJS.
 */

import type { WorldState } from '../engine/types';
import type { TrackState } from '../engine/types';
import { createWorld, stepWorld } from '../engine/world';
import { buildTrack, distanceToTrackCenter } from '../engine/track';
import { detectWallCollision } from '../engine/collision';
import { CAR } from '../engine/constants';
import { TRACKS } from '../tracks/registry';
import { castRays } from './raycaster';
import { buildObservation } from './observations';
import { computeReward } from './reward';
import type { AiConfig } from './ai-config';
import { DEFAULT_AI_CONFIG } from './ai-config';

/** Checkpoint count for AI training tracks. Matches renderer's DEFAULT_CHECKPOINT_COUNT. */
const CHECKPOINT_COUNT = 30;

/** Padding added to car radius for wall contact detection (compensates for collision push-out). */
const WALL_DETECT_PADDING = 1.0;

export interface ResetResult {
  observation: number[];
  info: Record<string, unknown>;
}

export interface StepResult {
  observation: number[];
  reward: number;
  terminated: boolean;
  truncated: boolean;
  info: Record<string, unknown>;
}

function validateAction(raw: unknown): [number, number, number] {
  if (!Array.isArray(raw) || raw.length !== 3) {
    throw new Error('action must be a 3-element array [steer, throttle, brake]');
  }
  const [steer, throttle, brake] = raw;
  if (!Number.isFinite(steer) || !Number.isFinite(throttle) || !Number.isFinite(brake)) {
    throw new Error('action elements must be finite numbers');
  }
  return [
    Math.max(-1, Math.min(1, steer)),
    Math.max(0, Math.min(1, throttle)),
    Math.max(0, Math.min(1, brake)),
  ];
}

export class HeadlessEnv {
  private readonly track: TrackState;
  private readonly config: AiConfig;
  private world: WorldState | null = null;
  private stepCount = 0;
  private stillnessCounter = 0;
  private prevTrackProgress: { distance: number; arcLength: number } = { distance: 0, arcLength: 0 };

  constructor(trackId = 'track-01', config: AiConfig = DEFAULT_AI_CONFIG) {
    const trackInfo = TRACKS.find((t) => t.id === trackId);
    if (!trackInfo) {
      throw new Error(`Unknown track "${trackId}". Available: ${TRACKS.map((t) => t.id).join(', ')}`);
    }
    this.track = buildTrack(trackInfo.controlPoints, CHECKPOINT_COUNT);
    this.config = config;
  }

  reset(): ResetResult {
    this.world = createWorld(this.track);
    this.stepCount = 0;
    this.stillnessCounter = 0;

    const { car } = this.world;
    const trackProgress = distanceToTrackCenter(car.position, this.track);
    this.prevTrackProgress = trackProgress;

    const rays = castRays(car.position, car.heading, this.track.innerBoundary, this.track.outerBoundary);
    const observation = buildObservation(this.world, rays, trackProgress);

    return {
      observation,
      info: {
        tick: this.world.tick,
        speed: car.speed,
        lap: this.world.timing.currentLap,
        checkpoint: this.world.timing.lastCheckpointIndex,
        stepCount: this.stepCount,
      },
    };
  }

  step(action: [number, number, number]): StepResult {
    if (!this.world) {
      throw new Error('step() called before reset()');
    }

    const [steer, throttle, brake] = validateAction(action);
    const prevWorld = this.world;

    this.world = stepWorld(this.world, { steer, throttle, brake });
    this.stepCount++;

    const { car } = this.world;

    // Detect wall contact with padded radius (compensates for collision push-out)
    const wallResult = detectWallCollision(car.position, CAR.width / 2 + WALL_DETECT_PADDING, this.track);
    const wallContact = wallResult.collided;

    // Compute track progress ONCE per tick — shared with observation + reward
    const currTrackProgress = distanceToTrackCenter(car.position, this.track);

    // Build observation
    const rays = castRays(car.position, car.heading, this.track.innerBoundary, this.track.outerBoundary);
    const observation = buildObservation(this.world, rays, currTrackProgress);

    // Compute reward
    const rewardBreakdown = computeReward(
      prevWorld, this.world, wallContact, this.config.weights,
      { prevArcLength: this.prevTrackProgress.arcLength, currArcLength: currTrackProgress.arcLength },
    );

    // Cache for next tick
    this.prevTrackProgress = currTrackProgress;

    // Track stillness
    if (car.speed < this.config.weights.stillnessSpeedThreshold) {
      this.stillnessCounter++;
    } else {
      this.stillnessCounter = 0;
    }

    // Termination conditions
    const terminated = this.stillnessCounter >= this.config.episode.stillnessTimeoutTicks;
    const truncated = this.stepCount >= this.config.episode.maxSteps;

    return {
      observation,
      reward: rewardBreakdown.total,
      terminated,
      truncated,
      info: {
        progress: rewardBreakdown.progress,
        speed: rewardBreakdown.speed,
        wall: rewardBreakdown.wall,
        offTrack: rewardBreakdown.offTrack,
        backward: rewardBreakdown.backward,
        stillness: rewardBreakdown.stillness,
        tick: this.world.tick,
        rawSpeed: car.speed,
        lap: this.world.timing.currentLap,
        checkpoint: this.world.timing.lastCheckpointIndex,
        stepCount: this.stepCount,
        wallContact,
        stillnessCounter: this.stillnessCounter,
      },
    };
  }
}
