/**
 * Determinism Verification Tests
 *
 * Validates MECH-14 and MECH-15: identical inputs must produce identical
 * WorldState across multiple independent runs. This is the foundational
 * guarantee for AI training reproducibility.
 *
 * Tests:
 * - 100 independent runs of 10,000 ticks with identical inputs produce same hash
 * - No Math.random in any engine source file
 */

import { describe, it, expect } from 'vitest';
import { createWorld, stepWorld } from '../../src/engine/world';
import { buildTrack } from '../../src/engine/track';
import type { Input, WorldState, TrackControlPoint, TrackState } from '../../src/engine/types';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

/**
 * Simple track for determinism testing — few boundary points = fast simulation.
 */
function createSimpleTrack(): TrackState {
  const cp: TrackControlPoint[] = [
    { position: { x: 50, y: 0 }, width: 10 },
    { position: { x: 0, y: 50 }, width: 10 },
    { position: { x: -50, y: 0 }, width: 10 },
    { position: { x: 0, y: -50 }, width: 10 },
  ];
  return buildTrack(cp, 4);
}

/**
 * Generate a deterministic input sequence.
 * Uses sinusoidal steering, varying throttle, and periodic braking.
 */
function generateTestInputs(count: number): Input[] {
  const inputs: Input[] = [];
  for (let i = 0; i < count; i++) {
    inputs.push({
      steer: Math.sin(i * 0.01) * 0.5,
      throttle: 0.3 + 0.3 * Math.sin(i * 0.005),
      brake: i % 200 < 20 ? 0.5 : 0,
    });
  }
  return inputs;
}

/**
 * Hash a WorldState into a stable, deterministic string.
 * Uses toFixed(10) for floating-point reproducibility.
 */
function hashState(state: WorldState): string {
  const normalized = {
    tick: state.tick,
    car: {
      px: state.car.position.x.toFixed(10),
      py: state.car.position.y.toFixed(10),
      vx: state.car.velocity.x.toFixed(10),
      vy: state.car.velocity.y.toFixed(10),
      h: state.car.heading.toFixed(10),
      yr: state.car.yawRate.toFixed(10),
      s: state.car.speed.toFixed(10),
    },
    timing: {
      ticks: state.timing.currentLapTicks,
      best: state.timing.bestLapTicks,
      total: state.timing.totalRaceTicks,
      lap: state.timing.currentLap,
      cp: state.timing.lastCheckpointIndex,
    },
  };
  return JSON.stringify(normalized);
}

/**
 * Run a full simulation with the given inputs and return the final state hash.
 * Uses a simple track for fast execution.
 */
function runSimulation(track: TrackState, inputs: Input[]): string {
  let world = createWorld(track);

  for (const input of inputs) {
    world = stepWorld(world, input);
  }

  return hashState(world);
}

// ──────────────────────────────────────────────────────────
// Determinism tests
// ──────────────────────────────────────────────────────────
describe('Determinism', () => {
  it('two runs with identical inputs produce identical state hash', () => {
    const track = createSimpleTrack();
    const inputs = generateTestInputs(10000);
    const hash1 = runSimulation(track, inputs);
    const hash2 = runSimulation(track, inputs);
    expect(hash1).toBe(hash2);
  });

  it('100 independent runs of 10,000 ticks produce identical state hash', () => {
    const track = createSimpleTrack();
    const inputs = generateTestInputs(10000);
    const hashes = new Set<string>();

    for (let run = 0; run < 100; run++) {
      hashes.add(runSimulation(track, inputs));
    }

    // All 100 runs must produce the same hash
    expect(hashes.size).toBe(1);
  }, 300000); // Extended timeout: 100 runs of 10k ticks

  it('no Math.random calls in any engine source file', () => {
    const engineDir = path.resolve(__dirname, '../../src/engine');
    const files = fs.readdirSync(engineDir).filter((f) => f.endsWith('.ts'));

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = fs.readFileSync(path.join(engineDir, file), 'utf-8');
      // Strip single-line comments (// ...) and block comments (/* ... */)
      // before checking for Math.random usage in actual code
      const codeOnly = content
        .replace(/\/\/.*$/gm, '')        // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
      const hasMathRandom = codeOnly.includes('Math.random');
      expect(hasMathRandom, `Math.random found in code of ${file}`).toBe(false);
    }
  });
});
