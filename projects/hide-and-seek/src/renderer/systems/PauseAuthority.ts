import type { GameEngine } from '../../game/engine.js';

const MENU = Symbol('MENU');
const TAB_HIDDEN = Symbol('TAB_HIDDEN');
const CINEMATIC = Symbol('CINEMATIC');

export const PAUSE_REASONS = { MENU, TAB_HIDDEN, CINEMATIC } as const;
export type PauseReason = typeof PAUSE_REASONS[keyof typeof PAUSE_REASONS];

export class PauseAuthority {
  private readonly activeReasons = new Set<PauseReason>();
  private readonly engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  request(reason: PauseReason): void {
    const wasEmpty = this.activeReasons.size === 0;
    this.activeReasons.add(reason);
    if (wasEmpty) {
      this.engine.pause();
    }
  }

  release(reason: PauseReason): void {
    this.activeReasons.delete(reason);
    if (this.activeReasons.size === 0) {
      this.engine.resume();
    }
  }

  get isPaused(): boolean {
    return this.activeReasons.size > 0;
  }

  hasReason(reason: PauseReason): boolean {
    return this.activeReasons.has(reason);
  }
}
