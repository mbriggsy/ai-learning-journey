import type { FacingDirection } from './input.js';

export type GamePhase = 'boot' | 'playing';

// --- Game flow (sub-phase within PlayingState) ---

export type GameFlowKind = 'countdown' | 'hunt' | 'found' | 'survived';

export interface CountdownPhase {
  readonly kind: 'countdown';
  ticksRemaining: number;
}

export interface HuntPhase {
  readonly kind: 'hunt';
  ticksRemaining: number;
  ticksElapsed: number;
}

export interface FoundPhase {
  readonly kind: 'found';
  readonly ticksSurvived: number;
}

export interface SurvivedPhase {
  readonly kind: 'survived';
  readonly huntDurationTicks: number;
}

export type GameFlowState = CountdownPhase | HuntPhase | FoundPhase | SurvivedPhase;

// --- Detection ---

export type DetectionResult = 'none' | 'spotted' | 'found';

// --- Seeker ---

export type SeekerFSMState = 'patrol' | 'chase';

export interface SeekerRenderState {
  x: number;
  y: number;
  facing: FacingDirection;
  fsmState: SeekerFSMState;
}

// --- Base + variants ---

interface GameStateBase {
  readonly phase: GamePhase;
}

export interface BootState extends GameStateBase {
  readonly phase: 'boot';
}

export interface GameMap {
  readonly width: number;   // tiles
  readonly height: number;  // tiles
  isWalkable(x: number, y: number): boolean;
  isBlocking(x: number, y: number): boolean;
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

/** Mutable alias for engine-internal mutation of PlayingState fields */
export type MutablePlayingState = { -readonly [K in keyof PlayingState]: PlayingState[K] };

export interface GameStats {
  distanceTraveled: number;  // pixels accumulated during HUNT
}

export interface PlayingState extends GameStateBase {
  readonly phase: 'playing';
  readonly player: PlayerState;
  readonly seeker: SeekerRenderState;
  readonly map: GameMap;
  readonly spawns: readonly SpawnPoint[];
  readonly gameFlow: GameFlowState;
  readonly seekerFov: Uint8Array;
  readonly playerFov: Uint8Array;
  readonly stats: GameStats;
}

export type GameState = BootState | PlayingState;
