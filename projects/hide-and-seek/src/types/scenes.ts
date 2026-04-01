import type { TypedListener } from './events.js';
import type { GameEventMap } from './events.js';
import type { PlayingState, SpectatingState } from './state.js';
import type { GameSettings, Difficulty } from './settings.js';
import type { ReadonlyDeep } from './utility.js';
import type { RoundResult } from './persistence.js';

export interface GameSceneData {
  readonly settings: GameSettings;
}

export interface SpectatorSceneData {
  readonly settings: GameSettings;
}

export interface HUDSceneData {
  readonly listener: TypedListener<GameEventMap>;
  readonly getState: () => ReadonlyDeep<PlayingState | SpectatingState>;
  readonly spectator?: boolean;
}

export interface ResultsSceneData {
  readonly roundResult?: RoundResult;
  readonly outcome: 'found' | 'survived';
  readonly timeSurvivedMs: number;
}

export interface SpectatorResultsSceneData {
  readonly outcome: 'found' | 'survived';
  readonly huntDurationTicks: number;
  readonly seekerDifficulty: Difficulty;
  readonly hiderDifficulty: Difficulty;
}

export interface SceneDataMap {
  Boot: undefined;
  MainMenu: undefined;
  Game: GameSceneData;
  SpectatorGame: SpectatorSceneData;
  HUD: HUDSceneData;
  PauseMenu: undefined;
  Results: ResultsSceneData;
  SpectatorResults: SpectatorResultsSceneData;
}
