import type { Emitter } from './events';
import type { EscapeWindowPhase } from '../types/state';

export type EscapeConfig = {
  readonly firstWindowAtS: number;
  readonly repeatIntervalS: number;
  readonly warningBeforeS: number;
  readonly windowDurationS: number;
};

export type GameClock = {
  update(dt: number): void;
  readonly elapsedS: number;
  readonly windowState: EscapeWindowPhase;
  reset(): void;
};

export function createClock(emitter: Emitter, escapeConfig: EscapeConfig): GameClock {
  let elapsedS = 0;
  let windowState: EscapeWindowPhase = 'waiting';
  let nextWindowAtS = escapeConfig.firstWindowAtS;

  return {
    update(dt: number) {
      elapsedS += dt;

      if (windowState === 'waiting') {
        if (elapsedS >= nextWindowAtS - escapeConfig.warningBeforeS) {
          windowState = 'warning';
          emitter.emit('ESCAPE_WINDOW_WARNING');
        }
      }

      if (windowState === 'warning') {
        if (elapsedS >= nextWindowAtS) {
          windowState = 'open';
          emitter.emit('ESCAPE_WINDOW_OPEN');
        }
      }

      if (windowState === 'open') {
        if (elapsedS >= nextWindowAtS + escapeConfig.windowDurationS) {
          emitter.emit('ESCAPE_WINDOW_CLOSED');
          nextWindowAtS += escapeConfig.repeatIntervalS;
          windowState = 'waiting';
        }
      }
    },

    get elapsedS() { return elapsedS; },
    get windowState() { return windowState; },
    reset() {
      elapsedS = 0;
      windowState = 'waiting';
      nextWindowAtS = escapeConfig.firstWindowAtS;
    },
  };
}
