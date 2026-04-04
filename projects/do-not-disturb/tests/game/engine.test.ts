import { describe, it, expect, vi } from 'vitest';
import { createEngine } from '../../src/game/engine';
import { SIMULATION } from '../../src/constants';

describe('createEngine', () => {
  it('runs correct number of steps per delta', () => {
    const fn = vi.fn();
    const engine = createEngine(fn);

    // One frame at 60fps = ~16.67ms = 1 step
    engine.tick(SIMULATION.FIXED_DT_MS);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(SIMULATION.FIXED_DT_S);
  });

  it('accumulates partial frames', () => {
    const fn = vi.fn();
    const engine = createEngine(fn);

    // Half a frame — not enough for a step
    engine.tick(SIMULATION.FIXED_DT_MS / 2);
    expect(fn).not.toHaveBeenCalled();

    // Another half — now one full frame
    engine.tick(SIMULATION.FIXED_DT_MS / 2);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs multiple steps for large deltas', () => {
    const fn = vi.fn();
    const engine = createEngine(fn);

    // 3+ frames worth (extra 1ms avoids IEEE 754 rounding at boundary)
    engine.tick(SIMULATION.FIXED_DT_MS * 3 + 1);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('caps at MAX_CATCHUP_TICKS (spiral of death guard)', () => {
    const fn = vi.fn();
    const engine = createEngine(fn);

    // Try to do 100 frames worth — should be capped
    engine.tick(SIMULATION.FIXED_DT_MS * 100);
    expect(fn).toHaveBeenCalledTimes(SIMULATION.MAX_CATCHUP_TICKS);
  });

  it('resets accumulator after spiral-of-death cap', () => {
    const fn = vi.fn();
    const engine = createEngine(fn);

    engine.tick(SIMULATION.FIXED_DT_MS * 100);
    fn.mockClear();

    // Next tick should start fresh (accumulator was reset)
    engine.tick(SIMULATION.FIXED_DT_MS);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('caps incoming delta at MAX_DELTA_MS', () => {
    const fn = vi.fn();
    const engine = createEngine(fn);

    // Huge delta (1 second) — should be capped to MAX_DELTA_MS
    engine.tick(1000);
    // MAX_DELTA_MS / FIXED_DT_MS = 200 / 16.67 ≈ 12, but capped at MAX_CATCHUP_TICKS (5)
    expect(fn).toHaveBeenCalledTimes(SIMULATION.MAX_CATCHUP_TICKS);
  });

  it('returns number of steps taken', () => {
    const fn = vi.fn();
    const engine = createEngine(fn);

    const steps = engine.tick(SIMULATION.FIXED_DT_MS * 2);
    expect(steps).toBe(2);
  });

  it('fixedUpdate receives constant dt on every call', () => {
    const dts: number[] = [];
    const engine = createEngine((dt) => dts.push(dt));

    engine.tick(SIMULATION.FIXED_DT_MS * 3 + 1);
    expect(dts).toEqual([SIMULATION.FIXED_DT_S, SIMULATION.FIXED_DT_S, SIMULATION.FIXED_DT_S]);
  });
});
