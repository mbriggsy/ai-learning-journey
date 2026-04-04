import { describe, it, expect, vi } from 'vitest';
import { createClock } from '../../src/game/clock';
import type { EscapeConfig } from '../../src/game/clock';
import { createEmitter } from '../../src/game/events';
import type { GameEventMap } from '../../src/types/events';

function makeTestConfig(): EscapeConfig {
  return {
    firstWindowAtS: 90,
    repeatIntervalS: 60,
    warningBeforeS: 15,
    windowDurationS: 20,
  };
}

function makeSetup() {
  const emitter = createEmitter<GameEventMap>();
  const config = makeTestConfig();
  const clock = createClock(emitter, config);
  return { emitter, config, clock };
}

describe('createClock', () => {
  it('advances elapsed time correctly', () => {
    const { clock } = makeSetup();
    clock.update(1);
    expect(clock.elapsedS).toBeCloseTo(1);
    clock.update(2.5);
    expect(clock.elapsedS).toBeCloseTo(3.5);
  });

  it('starts in waiting state', () => {
    const { clock } = makeSetup();
    expect(clock.windowState).toBe('waiting');
  });

  it('fires warning at correct time before window', () => {
    const { emitter, clock } = makeSetup();
    const warnFn = vi.fn();
    emitter.on('ESCAPE_WINDOW_WARNING', warnFn);

    // Warning at 90 - 15 = 75s
    clock.update(74.9);
    expect(warnFn).not.toHaveBeenCalled();
    expect(clock.windowState).toBe('waiting');

    clock.update(0.2); // now at 75.1
    expect(warnFn).toHaveBeenCalledOnce();
    expect(clock.windowState).toBe('warning');
  });

  it('opens window at correct time', () => {
    const { emitter, clock } = makeSetup();
    const openFn = vi.fn();
    emitter.on('ESCAPE_WINDOW_OPEN', openFn);

    clock.update(89.9);
    expect(openFn).not.toHaveBeenCalled();

    clock.update(0.2); // now at 90.1
    expect(openFn).toHaveBeenCalledOnce();
    expect(clock.windowState).toBe('open');
  });

  it('closes window after duration expires', () => {
    const { emitter, clock } = makeSetup();
    const closeFn = vi.fn();
    emitter.on('ESCAPE_WINDOW_CLOSED', closeFn);

    // Advance to open state (90s) + window duration (20s) = 110s
    clock.update(109.9);
    expect(closeFn).not.toHaveBeenCalled();

    clock.update(0.2); // now at 110.1
    expect(closeFn).toHaveBeenCalledOnce();
    expect(clock.windowState).toBe('waiting'); // back to waiting
  });

  it('schedules next window after miss', () => {
    const { emitter, clock } = makeSetup();
    const warnFn = vi.fn();
    const openFn = vi.fn();
    emitter.on('ESCAPE_WINDOW_WARNING', warnFn);
    emitter.on('ESCAPE_WINDOW_OPEN', openFn);

    // First cycle: window at 90, closes at 110
    clock.update(111);
    expect(openFn).toHaveBeenCalledOnce();

    // Next window at 90 + 60 = 150, warning at 135
    warnFn.mockClear();
    openFn.mockClear();

    clock.update(24); // 111 + 24 = 135
    expect(warnFn).toHaveBeenCalledOnce();

    clock.update(16); // 135 + 16 = 151
    expect(openFn).toHaveBeenCalledOnce();
  });

  it('reset clears state for night restart', () => {
    const { clock } = makeSetup();
    clock.update(100); // past first window
    clock.reset();
    expect(clock.elapsedS).toBe(0);
    expect(clock.windowState).toBe('waiting');
  });

  it('full warning → open → close sequence fires all three events', () => {
    const { emitter, clock } = makeSetup();
    const events: string[] = [];
    emitter.on('ESCAPE_WINDOW_WARNING', () => events.push('warning'));
    emitter.on('ESCAPE_WINDOW_OPEN', () => events.push('open'));
    emitter.on('ESCAPE_WINDOW_CLOSED', () => events.push('closed'));

    // Advance through entire first cycle
    clock.update(76);  // warning at 75
    clock.update(15);  // open at 90 (now at 91)
    clock.update(20);  // closed at 110 (now at 111)

    expect(events).toEqual(['warning', 'open', 'closed']);
  });
});
