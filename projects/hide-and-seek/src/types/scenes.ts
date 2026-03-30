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

/**
 * Type-safe scene start. Scenes with no data require no second argument.
 * Usage: startScene(this.scene, 'MainMenu') or startScene(this.scene, 'Results', data)
 */
export function startScene<K extends keyof SceneDataMap>(
  plugin: { start(key: string, data?: unknown): void },
  key: K,
  ...args: SceneDataMap[K] extends undefined ? [] : [data: SceneDataMap[K]]
): void {
  plugin.start(key, args[0]);
}
