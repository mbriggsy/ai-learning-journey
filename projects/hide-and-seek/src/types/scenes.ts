import type { TypedListener } from './events.js';
import type { GameEventMap } from './events.js';
import type { PlayingState } from './state.js';
import type { GameSettings } from './settings.js';
import type { ReadonlyDeep } from './utility.js';

export interface GameSceneData {
  readonly settings: GameSettings;
}

export interface HUDSceneData {
  readonly listener: TypedListener<GameEventMap>;
  readonly getState: () => ReadonlyDeep<PlayingState>;
}

export interface ResultsSceneData {
  readonly outcome: 'found' | 'survived';
  readonly timeSurvivedMs: number;
  readonly distanceTraveled: number;
}

export interface SceneDataMap {
  Boot: undefined;
  MainMenu: undefined;
  Game: GameSceneData;
  HUD: HUDSceneData;
  PauseMenu: undefined;
  Results: ResultsSceneData;
}
