import type { PhoneScript } from './phone-scripts';
import type { Emitter } from './events';
import { PHONE } from '../constants';

export type PhoneDialogue = {
  start(script: PhoneScript, isRetry: boolean): void;
  advance(): void;
  skip(): void;
  update(dt: number): void;
  readonly isActive: boolean;
  readonly currentLine: string | null;
  readonly currentIndex: number;
  readonly canSkip: boolean;
  readonly isComplete: boolean;
};

export function createPhoneDialogue(emitter: Emitter): PhoneDialogue {
  let active = false;
  let lines: readonly string[] = [];
  let index = 0;
  let lineTimer = 0;
  let complete = false;
  let skipAllowed = false;

  function showLine() {
    if (index < lines.length) {
      lineTimer = PHONE.LINE_DISPLAY_S;
      emitter.emit('PHONE_LINE_SHOWN', lines[index]!, index);
    }
  }

  function finish() {
    active = false;
    complete = true;
    emitter.emit('PHONE_DIALOGUE_COMPLETE');
  }

  return {
    start(script: PhoneScript, isRetry: boolean) {
      if (active || complete) return;
      skipAllowed = script.skipOnRetry && isRetry;
      lines = script.lines;
      index = 0;
      active = true;
      complete = false;
      showLine();
    },

    advance() {
      if (!active) return;
      index++;
      if (index >= lines.length) {
        finish();
      } else {
        showLine();
      }
    },

    skip() {
      if (!active || !skipAllowed) return;
      finish();
    },

    update(dt: number) {
      if (!active) return;
      lineTimer -= dt;
      if (lineTimer <= 0) {
        // Auto-advance after display time
        index++;
        if (index >= lines.length) {
          finish();
        } else {
          showLine();
        }
      }
    },

    get isActive() { return active; },
    get currentLine() { return active && index < lines.length ? lines[index]! : null; },
    get currentIndex() { return index; },
    get canSkip() { return skipAllowed; },
    get isComplete() { return complete; },
  };
}
