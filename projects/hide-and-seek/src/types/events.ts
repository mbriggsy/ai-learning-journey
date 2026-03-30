import type { GamePhase } from './state.js';
import type { TileCoord } from './grid.js';

export interface GameEventMap {
  // Phase 1+ will populate:
  // PHASE_CHANGED: [phase: GamePhase];
  // DOOR_TOGGLED: [coord: TileCoord, open: boolean];
}

export interface TypedEmitter<TMap extends Record<string, unknown[]>> {
  emit<K extends keyof TMap & string>(event: K, ...args: TMap[K]): void;
  on<K extends keyof TMap & string>(event: K, fn: (...args: TMap[K]) => void): void;
  off<K extends keyof TMap & string>(event: K, fn: (...args: TMap[K]) => void): void;
  offAll(): void;
}
