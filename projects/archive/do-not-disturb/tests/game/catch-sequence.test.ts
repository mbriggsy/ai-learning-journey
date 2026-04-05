import { describe, it, expect } from 'vitest';
import { createCatchSequence, getCatchMessage } from '../../src/game/catch-sequence';
import { MONSTER } from '../../src/constants';

describe('createCatchSequence', () => {
  it('starts inactive', () => {
    const seq = createCatchSequence();
    expect(seq.isActive).toBe(false);
    expect(seq.monsterId).toBeNull();
  });

  it('start activates with monster', () => {
    const seq = createCatchSequence();
    seq.start('bellhop');
    expect(seq.isActive).toBe(true);
    expect(seq.monsterId).toBe('bellhop');
  });

  it('completes after bellhop duration', () => {
    const seq = createCatchSequence();
    seq.start('bellhop');
    seq.update(MONSTER.BELLHOP_CATCH_DURATION_S + 0.1);
    expect(seq.isActive).toBe(false);
    expect(seq.isDone).toBe(true);
  });

  it('completes after housekeeper duration', () => {
    const seq = createCatchSequence();
    seq.start('housekeeper');
    seq.update(MONSTER.HOUSEKEEPER_CATCH_DURATION_S - 0.1);
    expect(seq.isActive).toBe(true);
    seq.update(0.2);
    expect(seq.isDone).toBe(true);
  });

  it('completes after guest duration', () => {
    const seq = createCatchSequence();
    seq.start('guest');
    seq.update(MONSTER.GUEST_CATCH_DURATION_S + 0.1);
    expect(seq.isDone).toBe(true);
  });

  it('progress tracks 0 to 1', () => {
    const seq = createCatchSequence();
    seq.start('bellhop');
    expect(seq.progress).toBeCloseTo(0, 1);
    seq.update(MONSTER.BELLHOP_CATCH_DURATION_S / 2);
    expect(seq.progress).toBeCloseTo(0.5, 1);
  });

  it('update is no-op when inactive', () => {
    const seq = createCatchSequence();
    seq.update(100);
    expect(seq.isActive).toBe(false);
  });
});

describe('getCatchMessage', () => {
  it('bellhop message', () => {
    expect(getCatchMessage('bellhop')).toBe('Checking you in.');
  });

  it('housekeeper message', () => {
    expect(getCatchMessage('housekeeper')).toBe('What a mess.');
  });

  it('guest message', () => {
    expect(getCatchMessage('guest')).toBe('...');
  });

  it('unknown monster returns empty', () => {
    expect(getCatchMessage('unknown')).toBe('');
  });
});
