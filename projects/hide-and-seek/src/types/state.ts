export type FogState = 0 | 1 | 2;
export type GamePhase = 'boot' | 'countdown' | 'hunt' | 'found' | 'survived' | 'results';

interface GameStateBase {
  readonly phase: GamePhase;
}

export interface BootState extends GameStateBase {
  readonly phase: 'boot';
}

export interface CountdownState extends GameStateBase {
  readonly phase: 'countdown';
  readonly timeRemaining: number;
}

// Remaining variants added in Phase 1+:
// HuntState, FoundState, SurvivedState, ResultsState

export type GameState = BootState | CountdownState;
