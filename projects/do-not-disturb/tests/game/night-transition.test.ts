import { describe, it, expect } from 'vitest';
import { createNightTransition } from '../../src/game/night-transition';
import { NIGHT_TRANSITION } from '../../src/constants';

describe('createNightTransition', () => {
  it('starts as done', () => {
    const t = createNightTransition();
    expect(t.isDone).toBe(true);
    expect(t.phase).toBe('done');
  });

  it('start begins fade-out phase', () => {
    const t = createNightTransition();
    t.start(1, 2);
    expect(t.phase).toBe('fade-out');
    expect(t.isDone).toBe(false);
  });

  it('progresses fade-out → text → fade-in → done for normal night', () => {
    const t = createNightTransition();
    t.start(3, 4); // night 4 has no new monster

    expect(t.phase).toBe('fade-out');
    t.update(NIGHT_TRANSITION.FADE_OUT_S + 0.01);
    expect(t.phase).toBe('text');
    expect(t.displayText).toBe('Night 4');

    t.update(NIGHT_TRANSITION.TEXT_HOLD_S + 0.01);
    expect(t.phase).toBe('fade-in');

    t.update(NIGHT_TRANSITION.FADE_IN_S + 0.01);
    expect(t.phase).toBe('done');
    expect(t.isDone).toBe(true);
  });

  it('adds monster-intro phase for night 2 (new monster)', () => {
    const t = createNightTransition();
    t.start(1, 2);

    t.update(NIGHT_TRANSITION.FADE_OUT_S + 0.01); // → text
    expect(t.displayText).toBe('Night 2');

    t.update(NIGHT_TRANSITION.TEXT_HOLD_S + 0.01); // → monster-intro
    expect(t.phase).toBe('monster-intro');
    expect(t.displayText).toBe('What was THAT?');

    t.update(NIGHT_TRANSITION.MONSTER_INTRO_S + 0.01); // → fade-in
    expect(t.phase).toBe('fade-in');
  });

  it('adds monster-intro phase for night 3 (new monster)', () => {
    const t = createNightTransition();
    t.start(2, 3);
    t.update(NIGHT_TRANSITION.FADE_OUT_S + 0.01);
    t.update(NIGHT_TRANSITION.TEXT_HOLD_S + 0.01);
    expect(t.phase).toBe('monster-intro');
    expect(t.displayText).toBe('Something else is here...');
  });

  it('no monster-intro for night 5', () => {
    const t = createNightTransition();
    t.start(4, 5);
    t.update(NIGHT_TRANSITION.FADE_OUT_S + 0.01);
    t.update(NIGHT_TRANSITION.TEXT_HOLD_S + 0.01);
    expect(t.phase).toBe('fade-in'); // no intro
  });

  it('progress tracks within each phase', () => {
    const t = createNightTransition();
    t.start(1, 4);
    expect(t.progress).toBeCloseTo(0, 1);
    t.update(NIGHT_TRANSITION.FADE_OUT_S / 2);
    expect(t.progress).toBeCloseTo(0.5, 1);
  });

  it('displayText is null during fade phases', () => {
    const t = createNightTransition();
    t.start(1, 4);
    expect(t.displayText).toBeNull(); // fade-out
    t.update(NIGHT_TRANSITION.FADE_OUT_S + 0.01);
    t.update(NIGHT_TRANSITION.TEXT_HOLD_S + 0.01);
    expect(t.displayText).toBeNull(); // fade-in
  });

  it('update is no-op when done', () => {
    const t = createNightTransition();
    t.update(100); // no crash
    expect(t.isDone).toBe(true);
  });
});
