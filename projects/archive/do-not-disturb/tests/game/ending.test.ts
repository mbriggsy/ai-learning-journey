import { describe, it, expect } from 'vitest';
import { createEndingSequence } from '../../src/game/ending';
import { ENDING } from '../../src/constants';

describe('createEndingSequence', () => {
  it('starts as done', () => {
    const seq = createEndingSequence();
    expect(seq.isDone).toBe(true);
  });

  it('start begins fade phase', () => {
    const seq = createEndingSequence();
    seq.start();
    expect(seq.phase).toBe('fade');
    expect(seq.isDone).toBe(false);
  });

  it('progresses through ending lines', () => {
    const seq = createEndingSequence();
    seq.start();

    // Fade
    seq.update(ENDING.FADE_S + 0.01);
    expect(seq.phase).toBe('line');
    expect(seq.currentLine).toBe('I remember now.');
    expect(seq.lineIndex).toBe(0);

    // Line 1 → Line 2
    seq.update(ENDING.LINE_HOLD_S + 0.01);
    expect(seq.currentLine).toBe('...');
    expect(seq.lineIndex).toBe(1);

    // Line 2 → Line 3
    seq.update(ENDING.LINE_HOLD_S + 0.01);
    expect(seq.currentLine).toBe("I've always been here.");
    expect(seq.lineIndex).toBe(2);

    // Line 3 → Credits
    seq.update(ENDING.LINE_HOLD_S + 0.01);
    expect(seq.phase).toBe('credits');

    // Credits → Done
    seq.update(ENDING.CREDITS_DELAY_S + 0.01);
    expect(seq.isDone).toBe(true);
  });

  it('currentLine is null outside line phase', () => {
    const seq = createEndingSequence();
    seq.start();
    expect(seq.currentLine).toBeNull(); // fade phase
  });

  it('update is no-op when done', () => {
    const seq = createEndingSequence();
    seq.update(100);
    expect(seq.isDone).toBe(true);
  });
});
