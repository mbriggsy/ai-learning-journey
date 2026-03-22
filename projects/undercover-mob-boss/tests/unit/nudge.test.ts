import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startNudgeTimer, stopNudgeTimer, getCurrentLevel } from '../../src/client/nudge';

// Mock the audio engine — nudge.ts imports it
vi.mock('../../src/client/audio/audio-engine', () => ({
  audioEngine: {
    isUnlocked: () => false, // Audio not unlocked in tests
    getContext: () => ({}),
    getChannelGain: () => ({}),
  },
}));

describe('nudge timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopNudgeTimer();
  });

  afterEach(() => {
    stopNudgeTimer();
    vi.useRealTimers();
  });

  it('starts at level 0', () => {
    const cb = vi.fn();
    startNudgeTimer(cb);
    expect(getCurrentLevel()).toBe(0);
    expect(cb).not.toHaveBeenCalled();
  });

  it('escalates to level 1 at 30s', () => {
    const cb = vi.fn();
    startNudgeTimer(cb);

    vi.advanceTimersByTime(30_000);
    expect(cb).toHaveBeenCalledWith(1);
    expect(getCurrentLevel()).toBe(1);
  });

  it('escalates to level 2 at 60s', () => {
    const cb = vi.fn();
    startNudgeTimer(cb);

    vi.advanceTimersByTime(60_000);
    expect(cb).toHaveBeenCalledWith(2);
    expect(getCurrentLevel()).toBe(2);
  });

  it('escalates to level 3 at 90s', () => {
    const cb = vi.fn();
    startNudgeTimer(cb);

    vi.advanceTimersByTime(90_000);
    expect(cb).toHaveBeenCalledWith(3);
    expect(getCurrentLevel()).toBe(3);
  });

  it('level 3 repeats every 15s', () => {
    const cb = vi.fn();
    startNudgeTimer(cb);

    vi.advanceTimersByTime(90_000);
    const callsAtLevel3Start = cb.mock.calls.filter((c) => c[0] === 3).length;
    expect(callsAtLevel3Start).toBe(1);

    vi.advanceTimersByTime(15_000);
    const callsAfter15s = cb.mock.calls.filter((c) => c[0] === 3).length;
    expect(callsAfter15s).toBe(2);

    vi.advanceTimersByTime(15_000);
    const callsAfter30s = cb.mock.calls.filter((c) => c[0] === 3).length;
    expect(callsAfter30s).toBe(3);
  });

  it('stopNudgeTimer clears everything', () => {
    const cb = vi.fn();
    startNudgeTimer(cb);

    vi.advanceTimersByTime(30_000);
    expect(cb).toHaveBeenCalledTimes(1);

    stopNudgeTimer();
    expect(getCurrentLevel()).toBe(0);

    vi.advanceTimersByTime(60_000);
    // No more calls after stop
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('startNudgeTimer resets if called again', () => {
    const cb1 = vi.fn();
    startNudgeTimer(cb1);

    vi.advanceTimersByTime(20_000);

    const cb2 = vi.fn();
    startNudgeTimer(cb2);

    // Old callback should not fire at 30s from original start
    vi.advanceTimersByTime(10_000);
    expect(cb1).not.toHaveBeenCalled();

    // New callback should fire at 30s from restart
    vi.advanceTimersByTime(20_000);
    expect(cb2).toHaveBeenCalledWith(1);
  });

  it('does not fire before 30s', () => {
    const cb = vi.fn();
    startNudgeTimer(cb);

    vi.advanceTimersByTime(29_999);
    expect(cb).not.toHaveBeenCalled();
    expect(getCurrentLevel()).toBe(0);
  });
});
