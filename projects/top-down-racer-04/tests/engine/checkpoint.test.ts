/**
 * Checkpoint System and Lap Timing Tests
 *
 * Tests for gate crossing detection, sequential checkpoint enforcement,
 * and lap timing tracking. Validates MECH-10 (sequential checkpoints)
 * and MECH-11 (lap timing).
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialTimingState,
  checkGateCrossing,
  updateTiming,
} from '../../src/engine/checkpoint';
import type { Checkpoint, TimingState } from '../../src/engine/types';
import { vec2 } from '../../src/engine/vec2';

// ──────────────────────────────────────────────────────────
// Helper: create a checkpoint gate at a given position
// ──────────────────────────────────────────────────────────

/**
 * Create a checkpoint gate perpendicular to the given direction.
 * Gate is centered at `center`, spanning `halfWidth` to each side.
 * Direction is the forward-travel direction the car should cross in.
 */
function makeGate(
  center: { x: number; y: number },
  direction: { x: number; y: number },
  halfWidth: number = 5,
): Checkpoint {
  // Perpendicular to direction (left and right)
  const perpX = -direction.y;
  const perpY = direction.x;

  return {
    left: vec2(center.x + perpX * halfWidth, center.y + perpY * halfWidth),
    right: vec2(center.x - perpX * halfWidth, center.y - perpY * halfWidth),
    center: vec2(center.x, center.y),
    direction: vec2(direction.x, direction.y),
    arcLength: 0,
  };
}

// ──────────────────────────────────────────────────────────
// createInitialTimingState
// ──────────────────────────────────────────────────────────
describe('createInitialTimingState', () => {
  it('returns initial timing state with correct defaults', () => {
    const timing = createInitialTimingState();
    expect(timing.currentLapTicks).toBe(0);
    expect(timing.bestLapTicks).toBe(-1);
    expect(timing.totalRaceTicks).toBe(0);
    expect(timing.currentLap).toBe(1);
    expect(timing.lastCheckpointIndex).toBe(0);
    expect(timing.lapComplete).toBe(false);
  });

  it('returns a new object each call', () => {
    const a = createInitialTimingState();
    const b = createInitialTimingState();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ──────────────────────────────────────────────────────────
// checkGateCrossing
// ──────────────────────────────────────────────────────────
describe('checkGateCrossing', () => {
  // Gate at y=10, spanning x=0 to x=10, direction = (0, 1) (moving up)
  const gateUp = makeGate({ x: 5, y: 10 }, { x: 0, y: 1 }, 5);

  it('detects car crossing gate perpendicularly in the forward direction', () => {
    // Car moves from (5, 5) to (5, 15) — crosses gate at y=10, moving up
    const result = checkGateCrossing(vec2(5, 5), vec2(5, 15), gateUp);
    expect(result).toBe(true);
  });

  it('detects car crossing gate at an angle (still forward)', () => {
    // Car moves from (2, 5) to (8, 15) — crosses gate diagonally, still moving up
    const result = checkGateCrossing(vec2(2, 5), vec2(8, 15), gateUp);
    expect(result).toBe(true);
  });

  it('rejects backward crossing (wrong direction)', () => {
    // Car moves from (5, 15) to (5, 5) — crosses gate but moving down (wrong direction)
    const result = checkGateCrossing(vec2(5, 15), vec2(5, 5), gateUp);
    expect(result).toBe(false);
  });

  it('rejects movement that does not reach gate', () => {
    // Car moves from (5, 2) to (5, 6) — below the gate, doesn't reach it
    const result = checkGateCrossing(vec2(5, 2), vec2(5, 6), gateUp);
    expect(result).toBe(false);
  });

  it('rejects movement parallel to gate', () => {
    // Car moves from (0, 10) to (10, 10) — along the gate, not through it
    const result = checkGateCrossing(vec2(0, 10), vec2(10, 10), gateUp);
    expect(result).toBe(false);
  });

  it('handles car starting exactly on gate line gracefully', () => {
    // Car starts exactly on the gate line and moves forward
    // t will be 0 which is within [0,1] — should be treated as crossing
    const result = checkGateCrossing(vec2(5, 10), vec2(5, 15), gateUp);
    expect(result).toBe(true);
  });

  it('rejects crossing outside the gate segment bounds', () => {
    // Car moves through the gate line but outside the gate's left-right span
    const result = checkGateCrossing(vec2(15, 5), vec2(15, 15), gateUp);
    expect(result).toBe(false);
  });

  it('detects crossing at gate endpoint', () => {
    // Car crosses exactly at the left edge of the gate
    const result = checkGateCrossing(vec2(0, 5), vec2(0, 15), gateUp);
    expect(result).toBe(true);
  });

  // Test with a horizontally-oriented gate (direction = right)
  it('works with a horizontal gate (direction = +x)', () => {
    const gateRight = makeGate({ x: 10, y: 5 }, { x: 1, y: 0 }, 5);
    // Car moves from (5, 5) to (15, 5) — crosses gate at x=10
    const result = checkGateCrossing(vec2(5, 5), vec2(15, 5), gateRight);
    expect(result).toBe(true);
  });

  it('rejects movement with zero distance (car stopped)', () => {
    const result = checkGateCrossing(vec2(5, 5), vec2(5, 5), gateUp);
    expect(result).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────
// updateTiming — sequential crossing
// ──────────────────────────────────────────────────────────
describe('updateTiming - sequential crossing', () => {
  // Set up 4 checkpoint gates in a simple square arrangement
  // Gate 0: at y=20, direction up
  // Gate 1: at x=20, direction right
  // Gate 2: at y=-20, direction down
  // Gate 3: at x=-20, direction left
  const checkpoints: Checkpoint[] = [
    makeGate({ x: 0, y: 20 }, { x: 0, y: 1 }, 5),
    makeGate({ x: 20, y: 0 }, { x: 1, y: 0 }, 5),
    makeGate({ x: 0, y: -20 }, { x: 0, y: -1 }, 5),
    makeGate({ x: -20, y: 0 }, { x: -1, y: 0 }, 5),
  ];

  it('crossing gate 1 first (after start on gate 0) updates lastCheckpointIndex to 1', () => {
    const timing = createInitialTimingState();
    // Car starts at gate 0 (lastCheckpointIndex=0), so expectedNext is gate 1
    // Car crosses gate 1 (at x=20, moving right)
    const result = updateTiming(timing, vec2(15, 0), vec2(25, 0), checkpoints);
    expect(result.lastCheckpointIndex).toBe(1);
    expect(result.lapComplete).toBe(false);
  });

  it('crossing gate 1 after gate 0 updates lastCheckpointIndex to 1', () => {
    const timing: TimingState = {
      currentLapTicks: 10,
      bestLapTicks: -1,
      totalRaceTicks: 0,
      currentLap: 1,
      lastCheckpointIndex: 0,
      lapComplete: false,
    };
    // Car crosses gate 1 (at x=20, moving right)
    const result = updateTiming(timing, vec2(15, 0), vec2(25, 0), checkpoints);
    expect(result.lastCheckpointIndex).toBe(1);
  });

  it('skipping gate 2 and trying gate 3 does NOT advance (sequential enforcement)', () => {
    const timing: TimingState = {
      currentLapTicks: 20,
      bestLapTicks: -1,
      totalRaceTicks: 0,
      currentLap: 1,
      lastCheckpointIndex: 1,
      lapComplete: false,
    };
    // Try to cross gate 3 (expected next is gate 2 — skip not allowed)
    const result = updateTiming(timing, vec2(-15, 0), vec2(-25, 0), checkpoints);
    expect(result.lastCheckpointIndex).toBe(1); // Unchanged
    expect(result.lapComplete).toBe(false);
  });

  it('crossing gate 2 then gate 3 updates correctly', () => {
    let timing: TimingState = {
      currentLapTicks: 20,
      bestLapTicks: -1,
      totalRaceTicks: 0,
      currentLap: 1,
      lastCheckpointIndex: 1,
      lapComplete: false,
    };
    // Cross gate 2
    timing = updateTiming(timing, vec2(0, -15), vec2(0, -25), checkpoints);
    expect(timing.lastCheckpointIndex).toBe(2);

    // Cross gate 3
    timing = updateTiming(timing, vec2(-15, 0), vec2(-25, 0), checkpoints);
    expect(timing.lastCheckpointIndex).toBe(3);
  });

  it('does not advance when car does not cross any gate', () => {
    const timing = createInitialTimingState();
    // Car moves but doesn't cross any gate
    const result = updateTiming(timing, vec2(5, 5), vec2(6, 6), checkpoints);
    expect(result.lastCheckpointIndex).toBe(0); // Unchanged from initial
    expect(result.currentLapTicks).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────
// updateTiming — lap completion
// ──────────────────────────────────────────────────────────
describe('updateTiming - lap completion', () => {
  const checkpoints: Checkpoint[] = [
    makeGate({ x: 0, y: 20 }, { x: 0, y: 1 }, 5),
    makeGate({ x: 20, y: 0 }, { x: 1, y: 0 }, 5),
    makeGate({ x: 0, y: -20 }, { x: 0, y: -1 }, 5),
    makeGate({ x: -20, y: 0 }, { x: -1, y: 0 }, 5),
  ];

  it('completes a lap when all gates crossed in order and gate 0 re-crossed', () => {
    // State: all 4 gates crossed (0, 1, 2, 3), now crossing gate 0 again
    const timing: TimingState = {
      currentLapTicks: 99,
      bestLapTicks: -1,
      totalRaceTicks: 0,
      currentLap: 1,
      lastCheckpointIndex: 3,
      lapComplete: false,
    };
    const result = updateTiming(timing, vec2(0, 15), vec2(0, 25), checkpoints);
    expect(result.lapComplete).toBe(true);
    expect(result.currentLap).toBe(2);
    expect(result.lastCheckpointIndex).toBe(0);
  });

  it('resets currentLapTicks to 0 on lap completion', () => {
    const timing: TimingState = {
      currentLapTicks: 200,
      bestLapTicks: -1,
      totalRaceTicks: 0,
      currentLap: 1,
      lastCheckpointIndex: 3,
      lapComplete: false,
    };
    const result = updateTiming(timing, vec2(0, 15), vec2(0, 25), checkpoints);
    expect(result.currentLapTicks).toBe(0);
  });

  it('sets bestLapTicks on first lap completion', () => {
    const timing: TimingState = {
      currentLapTicks: 149, // This tick brings it to 150
      bestLapTicks: -1,
      totalRaceTicks: 0,
      currentLap: 1,
      lastCheckpointIndex: 3,
      lapComplete: false,
    };
    const result = updateTiming(timing, vec2(0, 15), vec2(0, 25), checkpoints);
    expect(result.bestLapTicks).toBe(150); // 149 + 1 (this tick)
  });

  it('updates bestLapTicks when a faster lap is completed', () => {
    const timing: TimingState = {
      currentLapTicks: 99, // This tick brings it to 100 — faster than 150
      bestLapTicks: 150,
      totalRaceTicks: 0,
      currentLap: 2,
      lastCheckpointIndex: 3,
      lapComplete: false,
    };
    const result = updateTiming(timing, vec2(0, 15), vec2(0, 25), checkpoints);
    expect(result.bestLapTicks).toBe(100); // Faster time wins
  });

  it('keeps bestLapTicks when a slower lap is completed', () => {
    const timing: TimingState = {
      currentLapTicks: 199, // This tick brings it to 200 — slower than 100
      bestLapTicks: 100,
      totalRaceTicks: 0,
      currentLap: 3,
      lastCheckpointIndex: 3,
      lapComplete: false,
    };
    const result = updateTiming(timing, vec2(0, 15), vec2(0, 25), checkpoints);
    expect(result.bestLapTicks).toBe(100); // Best time unchanged
  });

  it('increments currentLap on each completion', () => {
    let timing: TimingState = {
      currentLapTicks: 49,
      bestLapTicks: -1,
      totalRaceTicks: 0,
      currentLap: 1,
      lastCheckpointIndex: 3,
      lapComplete: false,
    };

    // Complete lap 1
    timing = updateTiming(timing, vec2(0, 15), vec2(0, 25), checkpoints);
    expect(timing.currentLap).toBe(2);

    // Simulate crossing all gates for lap 2
    timing = { ...timing, lastCheckpointIndex: 3, currentLapTicks: 59 };
    timing = updateTiming(timing, vec2(0, 15), vec2(0, 25), checkpoints);
    expect(timing.currentLap).toBe(3);

    // Lap 3
    timing = { ...timing, lastCheckpointIndex: 3, currentLapTicks: 39 };
    timing = updateTiming(timing, vec2(0, 15), vec2(0, 25), checkpoints);
    expect(timing.currentLap).toBe(4);
  });
});

// ──────────────────────────────────────────────────────────
// updateTiming — tick counting
// ──────────────────────────────────────────────────────────
describe('updateTiming - tick counting', () => {
  const checkpoints: Checkpoint[] = [
    makeGate({ x: 0, y: 20 }, { x: 0, y: 1 }, 5),
    makeGate({ x: 20, y: 0 }, { x: 1, y: 0 }, 5),
  ];

  it('increments currentLapTicks every call', () => {
    let timing = createInitialTimingState();
    // 60 calls with no gate crossing
    for (let i = 0; i < 60; i++) {
      timing = updateTiming(timing, vec2(5, 5), vec2(5.01, 5.01), checkpoints);
    }
    expect(timing.currentLapTicks).toBe(60);
  });

  it('resets currentLapTicks after lap completion', () => {
    const timing: TimingState = {
      currentLapTicks: 299,
      bestLapTicks: -1,
      totalRaceTicks: 0,
      currentLap: 1,
      lastCheckpointIndex: 1, // All gates crossed for 2-gate track
      lapComplete: false,
    };
    // Cross gate 0 to complete the lap
    const result = updateTiming(timing, vec2(0, 15), vec2(0, 25), checkpoints);
    expect(result.lapComplete).toBe(true);
    expect(result.currentLapTicks).toBe(0);
  });

  it('handles empty checkpoints array', () => {
    const timing = createInitialTimingState();
    const result = updateTiming(timing, vec2(0, 0), vec2(1, 1), []);
    expect(result.currentLapTicks).toBe(1);
    expect(result.lapComplete).toBe(false);
  });

  it('returns new objects (immutability)', () => {
    const timing = createInitialTimingState();
    const result = updateTiming(timing, vec2(5, 5), vec2(5.01, 5.01), checkpoints);
    expect(result).not.toBe(timing);
    expect(timing.currentLapTicks).toBe(0); // Original unchanged
    expect(result.currentLapTicks).toBe(1);
  });
});
