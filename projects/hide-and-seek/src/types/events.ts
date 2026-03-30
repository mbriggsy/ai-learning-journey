import type { GameFlowKind } from './state.js';

export type GameEventMap = {
  PHASE_CHANGED: [kind: GameFlowKind];
};

export interface TypedEmitter<TMap extends Record<string, unknown[]>> {
  emit<K extends keyof TMap & string>(event: K, ...args: TMap[K]): void;
  on<K extends keyof TMap & string>(event: K, fn: (...args: TMap[K]) => void): void;
  off<K extends keyof TMap & string>(event: K, fn: (...args: TMap[K]) => void): void;
  offAll(): void;
}

export type TypedListener<TMap extends Record<string, unknown[]>> =
  Pick<TypedEmitter<TMap>, 'on' | 'off' | 'offAll'>;
