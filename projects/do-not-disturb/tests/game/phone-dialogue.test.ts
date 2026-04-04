import { describe, it, expect, vi } from 'vitest';
import { createPhoneDialogue } from '../../src/game/phone-dialogue';
import { createEmitter } from '../../src/game/events';
import { PHONE } from '../../src/constants';
import type { GameEventMap } from '../../src/types/events';
import type { PhoneScript } from '../../src/game/phone-scripts';

const SCRIPT: PhoneScript = {
  lines: ['Line one.', 'Line two.', 'Line three.'],
  skipOnRetry: true,
};

function makeSetup() {
  const emitter = createEmitter<GameEventMap>();
  const dialogue = createPhoneDialogue(emitter);
  return { emitter, dialogue };
}

describe('createPhoneDialogue', () => {
  it('starts inactive', () => {
    const { dialogue } = makeSetup();
    expect(dialogue.isActive).toBe(false);
    expect(dialogue.currentLine).toBeNull();
  });

  it('start activates dialogue and shows first line', () => {
    const { dialogue } = makeSetup();
    dialogue.start(SCRIPT, false);
    expect(dialogue.isActive).toBe(true);
    expect(dialogue.currentLine).toBe('Line one.');
    expect(dialogue.currentIndex).toBe(0);
  });

  it('emits PHONE_LINE_SHOWN on start', () => {
    const { emitter, dialogue } = makeSetup();
    const fn = vi.fn();
    emitter.on('PHONE_LINE_SHOWN', fn);
    dialogue.start(SCRIPT, false);
    expect(fn).toHaveBeenCalledWith('Line one.', 0);
  });

  it('advance moves to next line', () => {
    const { dialogue } = makeSetup();
    dialogue.start(SCRIPT, false);
    dialogue.advance();
    expect(dialogue.currentLine).toBe('Line two.');
    expect(dialogue.currentIndex).toBe(1);
  });

  it('advance past last line completes dialogue', () => {
    const { emitter, dialogue } = makeSetup();
    const fn = vi.fn();
    emitter.on('PHONE_DIALOGUE_COMPLETE', fn);
    dialogue.start(SCRIPT, false);
    dialogue.advance();
    dialogue.advance();
    dialogue.advance(); // past last line
    expect(dialogue.isActive).toBe(false);
    expect(dialogue.isComplete).toBe(true);
    expect(fn).toHaveBeenCalled();
  });

  it('auto-advances after LINE_DISPLAY_S', () => {
    const { dialogue } = makeSetup();
    dialogue.start(SCRIPT, false);
    expect(dialogue.currentIndex).toBe(0);
    dialogue.update(PHONE.LINE_DISPLAY_S + 0.1);
    expect(dialogue.currentIndex).toBe(1);
  });

  it('auto-completes after all lines auto-advance', () => {
    const { dialogue } = makeSetup();
    dialogue.start(SCRIPT, false);
    dialogue.update(PHONE.LINE_DISPLAY_S + 0.1); // → line 2
    dialogue.update(PHONE.LINE_DISPLAY_S + 0.1); // → line 3
    dialogue.update(PHONE.LINE_DISPLAY_S + 0.1); // → complete
    expect(dialogue.isComplete).toBe(true);
  });

  it('skip not allowed on first play', () => {
    const { dialogue } = makeSetup();
    dialogue.start(SCRIPT, false); // not a retry
    expect(dialogue.canSkip).toBe(false);
    dialogue.skip(); // should be no-op
    expect(dialogue.isActive).toBe(true);
  });

  it('skip allowed on retry', () => {
    const { dialogue } = makeSetup();
    dialogue.start(SCRIPT, true); // retry
    expect(dialogue.canSkip).toBe(true);
    dialogue.skip();
    expect(dialogue.isActive).toBe(false);
    expect(dialogue.isComplete).toBe(true);
  });

  it('skip emits PHONE_DIALOGUE_COMPLETE', () => {
    const { emitter, dialogue } = makeSetup();
    const fn = vi.fn();
    emitter.on('PHONE_DIALOGUE_COMPLETE', fn);
    dialogue.start(SCRIPT, true);
    dialogue.skip();
    expect(fn).toHaveBeenCalled();
  });

  it('cannot start again after complete', () => {
    const { dialogue } = makeSetup();
    dialogue.start(SCRIPT, false);
    dialogue.advance();
    dialogue.advance();
    dialogue.advance(); // complete
    dialogue.start(SCRIPT, false); // no-op
    expect(dialogue.isActive).toBe(false);
  });

  it('update is no-op when inactive', () => {
    const { dialogue } = makeSetup();
    dialogue.update(100); // no crash
    expect(dialogue.isActive).toBe(false);
  });

  it('advance is no-op when inactive', () => {
    const { dialogue } = makeSetup();
    dialogue.advance(); // no crash
    expect(dialogue.currentIndex).toBe(0);
  });
});
