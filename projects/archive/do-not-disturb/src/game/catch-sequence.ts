import { MONSTER } from '../constants';

export type CatchSequence = {
  start(monsterId: string): void;
  update(dt: number): void;
  readonly isActive: boolean;
  readonly monsterId: string | null;
  readonly progress: number; // 0-1
  readonly isDone: boolean;
};

const CATCH_MESSAGES: Record<string, string> = {
  bellhop: 'Checking you in.',
  housekeeper: 'What a mess.',
  guest: '...',
};

function getDuration(monsterId: string): number {
  switch (monsterId) {
    case 'bellhop': return MONSTER.BELLHOP_CATCH_DURATION_S;
    case 'housekeeper': return MONSTER.HOUSEKEEPER_CATCH_DURATION_S;
    case 'guest': return MONSTER.GUEST_CATCH_DURATION_S;
    default: return MONSTER.BELLHOP_CATCH_DURATION_S;
  }
}

export function createCatchSequence(): CatchSequence {
  let active = false;
  let monster: string | null = null;
  let timer = 0;
  let duration = 0;
  let done = false;

  return {
    start(monsterId: string) {
      active = true;
      monster = monsterId;
      duration = getDuration(monsterId);
      timer = duration;
      done = false;
    },

    update(dt: number) {
      if (!active) return;
      timer -= dt;
      if (timer <= 0) {
        active = false;
        done = true;
      }
    },

    get isActive() { return active; },
    get monsterId() { return monster; },
    get progress() {
      if (!active || duration === 0) return done ? 1 : 0;
      return Math.max(0, 1 - timer / duration);
    },
    get isDone() { return done; },
  };
}

export function getCatchMessage(monsterId: string): string {
  return CATCH_MESSAGES[monsterId] ?? '';
}
