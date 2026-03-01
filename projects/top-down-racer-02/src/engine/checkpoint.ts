/**
 * Checkpoint Gate Crossing Detection and Lap Timing
 *
 * Implements sequential checkpoint tracking for lap-based racing:
 * - Gate crossing via 2D line segment intersection with direction check
 * - Sequential checkpoint enforcement (no skipping gates)
 * - Lap completion detection when all gates crossed in order
 * - Best lap time tracking across multiple laps
 *
 * All functions are pure: they return new objects, never mutate input state.
 * No Math.random — fully deterministic.
 */

import type { Vec2, Checkpoint, TimingState } from './types';
import { sub, cross, dot } from './vec2';

// ──────────────────────────────────────────────────────────
// createInitialTimingState
// ──────────────────────────────────────────────────────────

/**
 * Create initial timing state for a new race.
 *
 * lastCheckpointIndex starts at 0 because the car spawns on top of the
 * start/finish line (checkpoint 0). Without this, a track where the car
 * doesn't physically cross checkpoint 0 on its first tick would require
 * an extra full lap before the first lap registers.
 */
export function createInitialTimingState(): TimingState {
  return {
    currentLapTicks: 0,
    bestLapTicks: -1,
    currentLap: 1,
    lastCheckpointIndex: 0,
    lapComplete: false,
  };
}

// ──────────────────────────────────────────────────────────
// checkGateCrossing
// ──────────────────────────────────────────────────────────

/**
 * Determine if the car crossed through a checkpoint gate between two positions.
 *
 * Uses 2D line segment intersection between the movement vector (prevPos -> currPos)
 * and the gate line (gate.left -> gate.right).
 *
 * Also verifies crossing direction: the car must be moving forward through
 * the gate (dot product of movement direction with gate.direction > 0).
 *
 * @param prevPos - Car position at the start of the tick
 * @param currPos - Car position at the end of the tick
 * @param gate - Checkpoint gate to test against
 * @returns true if the car crossed through the gate in the correct direction
 */
export function checkGateCrossing(
  prevPos: Vec2,
  currPos: Vec2,
  gate: Checkpoint,
): boolean {
  // Movement vector: prevPos -> currPos
  const moveDir = sub(currPos, prevPos);

  // Gate vector: left -> right
  const gateDir = sub(gate.right, gate.left);

  // Check if movement and gate are parallel (cross product near zero)
  const denom = cross(moveDir, gateDir);
  if (Math.abs(denom) < 1e-10) {
    return false; // Parallel or near-parallel — no crossing
  }

  // Compute intersection parameters using the cross product method
  // We solve: prevPos + t * moveDir = gate.left + u * gateDir
  // Rearranged: t = cross(gate.left - prevPos, gateDir) / cross(moveDir, gateDir)
  //             u = cross(gate.left - prevPos, moveDir) / cross(moveDir, gateDir)
  const startToGate = sub(gate.left, prevPos);
  const t = cross(startToGate, gateDir) / denom;
  const u = cross(startToGate, moveDir) / denom;

  // t must be in [0, 1] — crossing happens within the movement step
  // u must be in [0, 1] — crossing happens within the gate segment
  if (t < 0 || t > 1 || u < 0 || u > 1) {
    return false; // Intersection outside the segments
  }

  // Direction check: car must be moving forward through the gate
  // Dot product of movement direction with gate.direction should be positive
  if (dot(moveDir, gate.direction) <= 0) {
    return false; // Backward crossing
  }

  return true;
}

// ──────────────────────────────────────────────────────────
// updateTiming
// ──────────────────────────────────────────────────────────

/**
 * Update lap timing state for one simulation tick.
 *
 * - Increments currentLapTicks by 1 every tick
 * - Checks if car crossed the NEXT expected checkpoint gate
 * - Checkpoints must be crossed in order (MECH-10): skipping does not advance
 * - Lap completes when all gates crossed in order and gate 0 is re-crossed
 *
 * @param timing - Current timing state (never mutated)
 * @param prevPos - Car position at the start of the tick
 * @param currPos - Car position at the end of the tick
 * @param checkpoints - All checkpoint gates on the track
 * @returns New TimingState (immutable — never mutates input)
 */
export function updateTiming(
  timing: TimingState,
  prevPos: Vec2,
  currPos: Vec2,
  checkpoints: readonly Checkpoint[],
): TimingState {
  const numCheckpoints = checkpoints.length;
  if (numCheckpoints === 0) {
    return { ...timing, currentLapTicks: timing.currentLapTicks + 1, lapComplete: false };
  }

  // The next expected checkpoint index
  const expectedNext = (timing.lastCheckpointIndex + 1) % numCheckpoints;

  // Check if the car crossed the expected next checkpoint
  const crossed = checkGateCrossing(prevPos, currPos, checkpoints[expectedNext]);

  if (!crossed) {
    // No crossing this tick — just increment tick counter
    return {
      ...timing,
      currentLapTicks: timing.currentLapTicks + 1,
      lapComplete: false,
    };
  }

  // Car crossed the expected gate
  // Check if this is a lap completion:
  // expectedNext is 0 AND lastCheckpointIndex was the last gate (all gates crossed)
  const isLapComplete =
    expectedNext === 0 && timing.lastCheckpointIndex === numCheckpoints - 1;

  if (isLapComplete) {
    // Lap completed!
    const lapTicks = timing.currentLapTicks + 1; // Include this tick
    const newBest =
      timing.bestLapTicks > 0
        ? Math.min(timing.bestLapTicks, lapTicks)
        : lapTicks;

    return {
      currentLapTicks: 0,
      bestLapTicks: newBest,
      currentLap: timing.currentLap + 1,
      lastCheckpointIndex: 0,
      lapComplete: true,
    };
  }

  // Normal checkpoint crossing (not lap completion)
  return {
    ...timing,
    currentLapTicks: timing.currentLapTicks + 1,
    lastCheckpointIndex: expectedNext,
    lapComplete: false,
  };
}
