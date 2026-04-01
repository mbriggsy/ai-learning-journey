import type { GameFlowKind, DoorId, SeekerFSMState } from './state.js';

export type GameEventMap = {
  PHASE_CHANGED: [kind: GameFlowKind];
  DOOR_TOGGLED: [payload: {
    readonly id: DoorId;
    readonly position: { readonly x: number; readonly y: number };
    readonly isOpen: boolean;
  }];
  SONAR_PING_DUE: [payload: {
    readonly seekerX: number;
    readonly seekerY: number;
  }];
  SEEKER_STATE_CHANGED: [payload: {
    readonly oldState: SeekerFSMState;
    readonly newState: SeekerFSMState;
  }];
};

export interface TypedEmitter<TMap extends Record<string, unknown[]>> {
  emit<K extends keyof TMap & string>(event: K, ...args: TMap[K]): void;
  on<K extends keyof TMap & string>(event: K, fn: (...args: TMap[K]) => void): void;
  off<K extends keyof TMap & string>(event: K, fn: (...args: TMap[K]) => void): void;
  offAll(): void;
}

export type TypedListener<TMap extends Record<string, unknown[]>> =
  Pick<TypedEmitter<TMap>, 'on' | 'off' | 'offAll'>;
