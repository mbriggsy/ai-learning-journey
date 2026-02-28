/**
 * World Step Function — Simulation Orchestrator
 *
 * Wires all engine modules together into a single pure step function.
 * This is the CORE function that the renderer (Phase 2) and AI bridge
 * (Phase 4) will call each tick.
 *
 * Step sequence per tick:
 *   1. Detect surface under car
 *   2. Step car physics
 *   3. Detect wall collision
 *   4. Resolve wall collision (if any)
 *   5. Update surface after collision resolution
 *   6. Update checkpoint timing
 *   7. Return new WorldState
 *
 * All functions are pure: (state, input) -> newState.
 * No Math.random, no Date.now — fully deterministic.
 * DT is imported from constants.ts, NOT computed from real time.
 */

import type { Input, WorldState, TrackState } from './types';
import { createInitialCarState, stepCar } from './car';
import { detectWallCollision, resolveWallCollision } from './collision';
import { getSurface } from './track';
import { createInitialTimingState, updateTiming } from './checkpoint';
import { DT, CAR } from './constants';

// ──────────────────────────────────────────────────────────
// createWorld
// ──────────────────────────────────────────────────────────

/**
 * Create a new world state from a built track.
 *
 * Places the car at the track start position with the track start heading.
 * Initializes timing state for lap 1.
 *
 * @param track - Built track state (immutable, shared across episodes)
 * @returns Initial WorldState at tick 0
 */
export function createWorld(track: TrackState): WorldState {
  return {
    tick: 0,
    car: createInitialCarState(track.startPosition, track.startHeading),
    track,
    timing: createInitialTimingState(),
  };
}

// ──────────────────────────────────────────────────────────
// stepWorld
// ──────────────────────────────────────────────────────────

/**
 * Advance the simulation by one tick.
 *
 * Pure function: (state, input) -> newState.
 * The track reference is passed through unchanged (never modified).
 *
 * @param state - Current world state
 * @param input - Raw input for this tick
 * @returns New WorldState after one tick of simulation
 */
export function stepWorld(state: WorldState, input: Input): WorldState {
  // 1. Detect surface under car's current position
  const surface = getSurface(state.car.position, state.track);

  // 2. Step car physics with the detected surface
  const steppedCar = stepCar(state.car, input, surface, DT);

  // 3. Detect wall collision with car's new position
  const collision = detectWallCollision(
    steppedCar.position,
    CAR.width / 2,
    state.track,
  );

  // 4. Resolve wall collision (if any) — applies sliding response
  const resolvedCar = resolveWallCollision(steppedCar, collision);

  // 5. Update surface after collision resolution (position may have changed)
  const newSurface = getSurface(resolvedCar.position, state.track);

  // 6. Update checkpoint timing using previous and resolved positions
  const newTiming = updateTiming(
    state.timing,
    state.car.position,
    resolvedCar.position,
    state.track.checkpoints,
  );

  // 7. Return new WorldState
  return {
    tick: state.tick + 1,
    car: { ...resolvedCar, surface: newSurface },
    track: state.track, // Immutable reference — same object
    timing: newTiming,
  };
}
