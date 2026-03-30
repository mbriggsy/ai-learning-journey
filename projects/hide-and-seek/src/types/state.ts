import type { FacingDirection } from './input.js';
import type { TileCoord } from './grid.js';

export type FogState = 0 | 1 | 2;
export type TileFlag = 0 | 1;  // 0 = passable, 1 = blocked
export type GamePhase = 'boot' | 'playing' | 'countdown' | 'hunt' | 'found' | 'survived' | 'results';

interface GameStateBase {
  readonly phase: GamePhase;
}

export interface BootState extends GameStateBase {
  readonly phase: 'boot';
}

export interface TileType {
  readonly collides: boolean;
  readonly blocksLos: boolean;
  readonly tileId: number;
}

export interface GameMap {
  readonly width: number;   // tiles
  readonly height: number;  // tiles
  isWalkable(coord: TileCoord): boolean;
  isBlocking(coord: TileCoord): boolean;
}

export interface PlayerState {
  x: number;           // pixels
  y: number;           // pixels
  velocityX: number;   // pixels/sec
  velocityY: number;   // pixels/sec
  facing: FacingDirection;
}

export interface SpawnPoint {
  readonly x: number;  // pixels
  readonly y: number;  // pixels
  readonly type: 'hider_spawn' | 'seeker_spawn';
}

export interface PlayingState extends GameStateBase {
  readonly phase: 'playing';
  readonly player: PlayerState;
  readonly map: GameMap;
  readonly spawns: readonly SpawnPoint[];
}

// Remaining variants added in Phase 2+:
// CountdownState, HuntState, FoundState, SurvivedState, ResultsState

export type GameState = BootState | PlayingState;
