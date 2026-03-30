import { describe, it, expect } from 'vitest';
import { createCountdownTicks, createHuntTicks, ticksToDisplaySeconds } from '../../src/game/timer.js';
import { SIMULATION, TIMERS } from '../../src/constants.js';

describe('createCountdownTicks', () => {
  it('converts countdown duration to ticks', () => {
    const ticks = createCountdownTicks();
    const expectedSeconds = TIMERS.COUNTDOWN_DURATION_S;
    const actualSeconds = ticks * SIMULATION.FIXED_STEP_S;
    expect(actualSeconds).toBeCloseTo(expectedSeconds, 5);
  });

  it('returns an integer', () => {
    expect(Number.isInteger(createCountdownTicks())).toBe(true);
  });

  it('returns 600 ticks for 10s at 60fps', () => {
    expect(createCountdownTicks()).toBe(600);
  });
});

describe('createHuntTicks', () => {
  it('converts hunt duration to ticks', () => {
    const ticks = createHuntTicks();
    const expectedSeconds = TIMERS.HUNT_TIME_LIMIT_S;
    const actualSeconds = ticks * SIMULATION.FIXED_STEP_S;
    expect(actualSeconds).toBeCloseTo(expectedSeconds, 5);
  });

  it('returns an integer', () => {
    expect(Number.isInteger(createHuntTicks())).toBe(true);
  });

  it('returns 7200 ticks for 120s at 60fps', () => {
    expect(createHuntTicks()).toBe(7200);
  });
});

describe('ticksToDisplaySeconds', () => {
  it('uses Math.ceil (shows 1 until transition moment)', () => {
    // 1 tick = 1/60 second → ceil → 1
    expect(ticksToDisplaySeconds(1)).toBe(1);
    // 59 ticks ≈ 0.983s → ceil → 1
    expect(ticksToDisplaySeconds(59)).toBe(1);
    // 60 ticks = 1.0s → ceil → 1
    expect(ticksToDisplaySeconds(60)).toBe(1);
    // 61 ticks ≈ 1.017s → ceil → 2
    expect(ticksToDisplaySeconds(61)).toBe(2);
  });

  it('returns 0 for 0 ticks', () => {
    expect(ticksToDisplaySeconds(0)).toBe(0);
  });

  it('countdown timer accuracy: 7200 ticks = 120 display seconds', () => {
    // At the start, 7200 ticks * (1/60) = 120.0 → ceil → 120
    expect(ticksToDisplaySeconds(7200)).toBe(120);
  });

  it('no drift: tick-based counting is exact', () => {
    const ticks = createHuntTicks();
    const exactSeconds = ticks * SIMULATION.FIXED_STEP_S;
    // 7200 * (1/60) should be exactly 120
    expect(exactSeconds).toBe(120);
  });
});
