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

  // 3. Swept collision detection — sample intermediate positions to prevent
  //    high-speed tunneling through thin walls.
  const collisionRadius = CAR.width / 2;
  const oldPos = state.car.position;
  const newPos = steppedCar.position;
  const dx = newPos.x - oldPos.x;
  const dy = newPos.y - oldPos.y;
  const displacement = Math.sqrt(dx * dx + dy * dy);

  let resolvedCar = steppedCar;

  // If movement this tick exceeds the collision radius, check intermediate points
  const safeStep = collisionRadius * 0.75;
  if (displacement > safeStep) {
    const steps = Math.ceil(displacement / safeStep);
    let hitEarly = false;

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const checkX = oldPos.x + dx * t;
      const checkY = oldPos.y + dy * t;
      const collision = detectWallCollision(
        { x: checkX, y: checkY },
        collisionRadius,
        state.track,
      );
      if (collision.collided) {
        // Collision at intermediate point — resolve from here
        const tempCar = { ...steppedCar, position: { x: checkX, y: checkY } };
        resolvedCar = resolveWallCollision(tempCar, collision);
        hitEarly = true;
        break;
      }
    }

    // If no intermediate hit, check the final position
    if (!hitEarly) {
      const collision = detectWallCollision(newPos, collisionRadius, state.track);
      resolvedCar = resolveWallCollision(steppedCar, collision);
    }
  } else {
    // Low speed — single collision check is sufficient
    const collision = detectWallCollision(newPos, collisionRadius, state.track);
    resolvedCar = resolveWallCollision(steppedCar, collision);
  }

  // 4. Update surface after collision resolution (position may have changed)
  const newSurface = getSurface(resolvedCar.position, state.track);

  // 5. Update checkpoint timing using previous and resolved positions
  const newTiming = updateTiming(
    state.timing,
    state.car.position,
    resolvedCar.position,
    state.track.checkpoints,
  );

  // 6. Return new WorldState
  return {
    tick: state.tick + 1,
    car: { ...resolvedCar, surface: newSurface },
    track: state.track, // Immutable reference — same object
    timing: newTiming,
  };
}
