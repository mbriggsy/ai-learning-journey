import { describe, it, expect, vi } from 'vitest';
import { createNightManager } from '../../src/game/night-manager';
import { createEmitter } from '../../src/game/events';
import { MONSTER, NIGHT_TRANSITION } from '../../src/constants';
import type { GameEventMap } from '../../src/types/events';

function makeSetup() {
  const emitter = createEmitter<GameEventMap>();
  const mgr = createNightManager(emitter);
  return { emitter, mgr };
}

describe('createNightManager', () => {
  it('starts at night 1 in starting phase', () => {
    const { mgr } = makeSetup();
    mgr.start(1);
    expect(mgr.state.currentNight).toBe(1);
    expect(mgr.state.phase).toBe('starting');
  });

  it('emits NIGHT_START on start', () => {
    const { emitter, mgr } = makeSetup();
    const fn = vi.fn();
    emitter.on('NIGHT_START', fn);
    mgr.start(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('loads correct config for night', () => {
    const { mgr } = makeSetup();
    mgr.start(3);
    expect(mgr.state.config.monsters).toEqual(['bellhop', 'housekeeper', 'guest']);
  });

  it('retryCount starts at 0', () => {
    const { mgr } = makeSetup();
    mgr.start(1);
    expect(mgr.state.retryCount).toBe(0);
  });

  describe('catch flow', () => {
    it('onCatch transitions to caught phase', () => {
      const { mgr } = makeSetup();
      mgr.start(1);
      mgr.onCatch('bellhop');
      expect(mgr.state.phase).toBe('caught');
      expect(mgr.state.caughtBy).toBe('bellhop');
    });

    it('onCatch emits CATCH_SEQUENCE_START and NIGHT_END (survived=false)', () => {
      const { emitter, mgr } = makeSetup();
      const catchFn = vi.fn();
      const endFn = vi.fn();
      emitter.on('CATCH_SEQUENCE_START', catchFn);
      emitter.on('NIGHT_END', endFn);
      mgr.start(2);
      mgr.onCatch('housekeeper');
      expect(catchFn).toHaveBeenCalledWith('housekeeper');
      expect(endFn).toHaveBeenCalledWith(2, false);
    });

    it('restarts same night after catch timer expires', () => {
      const { emitter, mgr } = makeSetup();
      mgr.start(2);
      mgr.onCatch('bellhop');
      const startFn = vi.fn();
      emitter.on('NIGHT_START', startFn);
      mgr.update(MONSTER.BELLHOP_CATCH_DURATION_S + 0.1);
      expect(mgr.state.phase).toBe('starting');
      expect(mgr.state.currentNight).toBe(2);
      expect(startFn).toHaveBeenCalledWith(2);
    });

    it('increments retryCount on restart', () => {
      const { mgr } = makeSetup();
      mgr.start(1);
      mgr.onCatch('bellhop');
      mgr.update(MONSTER.BELLHOP_CATCH_DURATION_S + 0.1);
      expect(mgr.state.retryCount).toBe(1);
      mgr.onCatch('bellhop');
      mgr.update(MONSTER.BELLHOP_CATCH_DURATION_S + 0.1);
      expect(mgr.state.retryCount).toBe(2);
    });

    it('uses correct catch duration per monster', () => {
      const { mgr } = makeSetup();
      mgr.start(3);
      mgr.onCatch('guest');
      mgr.update(MONSTER.GUEST_CATCH_DURATION_S - 0.1);
      expect(mgr.state.phase).toBe('caught'); // not yet
      mgr.update(0.2);
      expect(mgr.state.phase).toBe('starting'); // now
    });
  });

  describe('escape flow', () => {
    it('escape on nights 1-4 transitions to transitioning', () => {
      const { mgr } = makeSetup();
      mgr.start(2);
      mgr.onEscape();
      expect(mgr.state.phase).toBe('transitioning');
    });

    it('escape emits NIGHT_END (survived=true) and NIGHT_TRANSITION_START', () => {
      const { emitter, mgr } = makeSetup();
      const endFn = vi.fn();
      const transFn = vi.fn();
      emitter.on('NIGHT_END', endFn);
      emitter.on('NIGHT_TRANSITION_START', transFn);
      mgr.start(1);
      mgr.onEscape();
      expect(endFn).toHaveBeenCalledWith(1, true);
      expect(transFn).toHaveBeenCalledWith(1, 2);
    });

    it('advances to next night after transition timer (with monster intro)', () => {
      const { emitter, mgr } = makeSetup();
      mgr.start(1);
      mgr.onEscape(); // → night 2 (has monster intro)
      // Night 2 introduces Housekeeper → extra MONSTER_INTRO_S
      const totalTransition = NIGHT_TRANSITION.FADE_OUT_S + NIGHT_TRANSITION.TEXT_HOLD_S
        + NIGHT_TRANSITION.MONSTER_INTRO_S + NIGHT_TRANSITION.FADE_IN_S;
      const endFn = vi.fn();
      emitter.on('NIGHT_TRANSITION_END', endFn);
      mgr.update(totalTransition + 0.1);
      expect(mgr.state.phase).toBe('starting');
      expect(mgr.state.currentNight).toBe(2);
      expect(endFn).toHaveBeenCalledWith(2);
    });

    it('transition timer shorter when no monster intro (night 3→4)', () => {
      const { mgr } = makeSetup();
      mgr.start(3);
      mgr.onEscape(); // → night 4 (no new monster)
      const shortTransition = NIGHT_TRANSITION.FADE_OUT_S + NIGHT_TRANSITION.TEXT_HOLD_S + NIGHT_TRANSITION.FADE_IN_S;
      mgr.update(shortTransition + 0.1);
      expect(mgr.state.phase).toBe('starting');
      expect(mgr.state.currentNight).toBe(4);
    });

    it('emits NIGHT_START after transition completes (not just on restart)', () => {
      const { emitter, mgr } = makeSetup();
      mgr.start(3);
      mgr.onEscape(); // → night 4
      const startFn = vi.fn();
      emitter.on('NIGHT_START', startFn);
      const shortTransition = NIGHT_TRANSITION.FADE_OUT_S + NIGHT_TRANSITION.TEXT_HOLD_S + NIGHT_TRANSITION.FADE_IN_S;
      mgr.update(shortTransition + 0.1);
      expect(startFn).toHaveBeenCalledWith(4);
    });

    it('resets retryCount on night advance', () => {
      const { mgr } = makeSetup();
      mgr.start(1);
      mgr.onCatch('bellhop');
      mgr.update(MONSTER.BELLHOP_CATCH_DURATION_S + 0.1); // retry
      expect(mgr.state.retryCount).toBe(1);
      mgr.onEscape();
      // Night 2 has monster intro
      const totalTransition = NIGHT_TRANSITION.FADE_OUT_S + NIGHT_TRANSITION.TEXT_HOLD_S
        + NIGHT_TRANSITION.MONSTER_INTRO_S + NIGHT_TRANSITION.FADE_IN_S;
      mgr.update(totalTransition + 0.1);
      expect(mgr.state.retryCount).toBe(0);
    });

    it('escape on night 5 transitions to ending', () => {
      const { emitter, mgr } = makeSetup();
      const completeFn = vi.fn();
      emitter.on('GAME_COMPLETE', completeFn);
      mgr.start(5);
      mgr.onEscape();
      expect(mgr.state.phase).toBe('ending');
      expect(completeFn).toHaveBeenCalled();
    });

    it('escape on night 5 emits NIGHT_END and GAME_COMPLETE', () => {
      const { emitter, mgr } = makeSetup();
      const endFn = vi.fn();
      emitter.on('NIGHT_END', endFn);
      mgr.start(5);
      mgr.onEscape();
      expect(endFn).toHaveBeenCalledWith(5, true);
    });
  });

  describe('speed multiplier', () => {
    it('night 1-3: base speed unchanged', () => {
      const { mgr } = makeSetup();
      mgr.start(1);
      expect(mgr.getMonsterSpeed(100)).toBe(100);
      mgr.start(3);
      expect(mgr.getMonsterSpeed(250)).toBe(250);
    });

    it('night 4: 25% speed increase', () => {
      const { mgr } = makeSetup();
      mgr.start(4);
      expect(mgr.getMonsterSpeed(100)).toBe(125);
      expect(mgr.getMonsterSpeed(MONSTER.BELLHOP_SPEED)).toBe(MONSTER.BELLHOP_SPEED * 1.25);
    });

    it('night 5: 25% speed increase', () => {
      const { mgr } = makeSetup();
      mgr.start(5);
      expect(mgr.getMonsterSpeed(400)).toBe(500);
    });
  });

  describe('edge cases', () => {
    it('onCatch ignored when not playing/starting', () => {
      const { mgr } = makeSetup();
      mgr.start(5);
      mgr.onEscape(); // → ending
      mgr.onCatch('bellhop'); // should be no-op
      expect(mgr.state.phase).toBe('ending');
    });

    it('onEscape ignored when caught', () => {
      const { mgr } = makeSetup();
      mgr.start(1);
      mgr.onCatch('bellhop');
      mgr.onEscape(); // should be no-op
      expect(mgr.state.phase).toBe('caught');
    });

    it('full 5-night progression (accounts for monster intro nights)', () => {
      const { mgr } = makeSetup();
      const base = NIGHT_TRANSITION.FADE_OUT_S + NIGHT_TRANSITION.TEXT_HOLD_S + NIGHT_TRANSITION.FADE_IN_S;
      const withIntro = base + NIGHT_TRANSITION.MONSTER_INTRO_S;

      mgr.start(1);
      for (let n = 1; n <= 4; n++) {
        expect(mgr.state.currentNight).toBe(n);
        mgr.onEscape();
        // Nights 2 and 3 have monster intros
        const nextNight = n + 1;
        const transTime = (nextNight === 2 || nextNight === 3) ? withIntro : base;
        mgr.update(transTime + 0.1);
      }
      expect(mgr.state.currentNight).toBe(5);
      mgr.onEscape();
      expect(mgr.state.phase).toBe('ending');
    });
  });
});
