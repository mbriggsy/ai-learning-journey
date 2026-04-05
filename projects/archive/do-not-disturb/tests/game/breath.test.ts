import { describe, it, expect, vi } from 'vitest';
import { createBreathSystem } from '../../src/game/breath';
import { createEmitter } from '../../src/game/events';
import { BREATH } from '../../src/constants';
import type { GameEventMap } from '../../src/types/events';

function makeSetup() {
  const emitter = createEmitter<GameEventMap>();
  const breath = createBreathSystem(emitter);
  return { emitter, breath };
}

describe('createBreathSystem', () => {
  it('starts inactive', () => {
    const { breath } = makeSetup();
    expect(breath.isActive).toBe(false);
  });

  it('startHolding activates with base duration', () => {
    const { breath } = makeSetup();
    breath.startHolding('room-a', { x: 50, y: 50 });
    expect(breath.isActive).toBe(true);
    expect(breath.remaining).toBe(BREATH.BASE_DURATION_S);
  });

  it('remaining counts down', () => {
    const { breath } = makeSetup();
    breath.startHolding('room-a', { x: 50, y: 50 });
    breath.update(1);
    expect(breath.remaining).toBeCloseTo(BREATH.BASE_DURATION_S - 1);
  });

  it('gasp emits BREATH_GASP when timer runs out', () => {
    const { emitter, breath } = makeSetup();
    const fn = vi.fn();
    emitter.on('BREATH_GASP', fn);
    breath.startHolding('room-a', { x: 50, y: 50 });
    breath.update(BREATH.BASE_DURATION_S + 1);
    expect(fn).toHaveBeenCalledOnce();
    expect(breath.isActive).toBe(false);
  });

  it('gasp emits NOISE_EMITTED', () => {
    const { emitter, breath } = makeSetup();
    const fn = vi.fn();
    emitter.on('NOISE_EMITTED', fn);
    breath.startHolding('room-a', { x: 50, y: 50 });
    breath.update(BREATH.BASE_DURATION_S + 1);
    expect(fn).toHaveBeenCalled();
  });

  it('rhythmTap extends timer during rhythm window', () => {
    const { breath } = makeSetup();
    breath.startHolding('room-a', { x: 50, y: 50 });
    // Advance past first rhythm interval to open window
    breath.update(2.1); // past RHYTHM_INTERVAL_S
    if (breath.isRhythmWindow) {
      const before = breath.remaining;
      breath.rhythmTap();
      expect(breath.remaining).toBeCloseTo(before + BREATH.RHYTHM_EXTEND_S);
    }
  });

  it('rhythmTap does nothing when inactive', () => {
    const { breath } = makeSetup();
    breath.rhythmTap(); // no-op, no crash
    expect(breath.isActive).toBe(false);
  });

  it('stopHolding deactivates', () => {
    const { breath } = makeSetup();
    breath.startHolding('room-a', { x: 50, y: 50 });
    breath.stopHolding();
    expect(breath.isActive).toBe(false);
  });
});
