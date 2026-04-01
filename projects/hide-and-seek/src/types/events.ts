import type { GameFlowKind, DoorId, SeekerFSMState, HiderFSMState } from './state.js';

export type FootstepEntity = 'player' | 'seeker' | 'hider';

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
  HIDER_STATE_CHANGED: [payload: {
    readonly oldState: HiderFSMState;
    readonly newState: HiderFSMState;
  }];
  CLOSE_CALL_ENTERED: [payload: {
    readonly distanceTiles: number;
  }];
  CLOSE_CALL_EXITED: [payload: {
    readonly durationMs: number;
    readonly counted: boolean;
  }];
  FOOTSTEP: [payload: {
    readonly entity: FootstepEntity;
    readonly x: number;
    readonly y: number;
  }];
  TIMER_TICK: [payload: {
    readonly secondsRemaining: number;
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
