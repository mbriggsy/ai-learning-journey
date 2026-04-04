import { ENDING } from '../constants';

export type EndingPhase = 'fade' | 'line' | 'credits' | 'done';

const ENDING_LINES: readonly string[] = [
  'I remember now.',
  '...',
  'I\'ve always been here.',
];

export type EndingSequence = {
  start(): void;
  update(dt: number): void;
  readonly phase: EndingPhase;
  readonly currentLine: string | null;
  readonly lineIndex: number;
  readonly isDone: boolean;
};

export function createEndingSequence(): EndingSequence {
  let phase: EndingPhase = 'done';
  let timer = 0;
  let lineIndex = 0;

  return {
    start() {
      phase = 'fade';
      timer = ENDING.FADE_S;
      lineIndex = 0;
    },

    update(dt: number) {
      if (phase === 'done') return;
      timer -= dt;
      if (timer > 0) return;

      switch (phase) {
        case 'fade':
          if (lineIndex < ENDING_LINES.length) {
            phase = 'line';
            timer = ENDING.LINE_HOLD_S;
          } else {
            phase = 'credits';
            timer = ENDING.CREDITS_DELAY_S;
          }
          break;
        case 'line':
          lineIndex++;
          if (lineIndex < ENDING_LINES.length) {
            timer = ENDING.LINE_HOLD_S;
          } else {
            phase = 'credits';
            timer = ENDING.CREDITS_DELAY_S;
          }
          break;
        case 'credits':
          phase = 'done';
          break;
      }
    },

    get phase() { return phase; },
    get currentLine() {
      if (phase === 'line' && lineIndex < ENDING_LINES.length) {
        return ENDING_LINES[lineIndex]!;
      }
      return null;
    },
    get lineIndex() { return lineIndex; },
    get isDone() { return phase === 'done'; },
  };
}
