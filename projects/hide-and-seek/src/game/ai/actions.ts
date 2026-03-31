import type { DoorId } from '../../types/state.js';

// --- Action types ---

export type Action =
  | { readonly type: 'OPEN_DOOR'; readonly doorId: DoorId }
  | { readonly type: 'WAIT'; ticksRemaining: number };

// --- Action queue ---

export class ActionQueue {
  private readonly actions: Action[] = [];

  get length(): number {
    return this.actions.length;
  }

  get current(): Action | undefined {
    return this.actions[0];
  }

  push(...newActions: Action[]): void {
    this.actions.push(...newActions);
  }

  /** Remove and return the head action */
  shift(): Action | undefined {
    return this.actions.shift();
  }

  clear(): void {
    this.actions.length = 0;
  }

  isEmpty(): boolean {
    return this.actions.length === 0;
  }
}
