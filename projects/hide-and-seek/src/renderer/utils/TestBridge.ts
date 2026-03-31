import type { ReadonlyDeep } from '../../types/utility.js';
import type { PlayingState, GameFlowKind } from '../../types/state.js';

export interface SceneInfo {
  key: string;
  active: boolean;
  visible: boolean;
}

export interface CameraState {
  zoom: number;
  scrollX: number;
  scrollY: number;
}

export interface GameTestBridge {
  ready: boolean;
  sceneInfo(): SceneInfo[];
  cameraState(): CameraState;
  fogState(): number[];
  gameFlowState(): GameFlowKind | null;
  splashText(): string | null;
}

declare global {
  interface Window {
    __GAME_TEST__?: GameTestBridge;
  }
}

export function installTestBridge(
  scene: Phaser.Scene,
  getState: () => ReadonlyDeep<PlayingState> | null,
  getFogState: () => Uint8Array | null,
  getSplashText: () => string | null,
): void {
  // Only install in dev/test mode — tree-shaken from production
  if (!import.meta.env.DEV && import.meta.env.MODE !== 'test') return;

  window.__GAME_TEST__ = {
    ready: true,

    sceneInfo(): SceneInfo[] {
      return scene.scene.manager.getScenes(false).map(s => ({
        key: s.scene.key,
        active: s.scene.isActive(),
        visible: s.scene.isVisible(),
      }));
    },

    cameraState(): CameraState {
      const cam = scene.cameras.main;
      return {
        zoom: cam.zoom,
        scrollX: cam.scrollX,
        scrollY: cam.scrollY,
      };
    },

    fogState(): number[] {
      const fog = getFogState();
      return fog ? Array.from(fog) : [];
    },

    gameFlowState(): GameFlowKind | null {
      const state = getState();
      return state?.gameFlow.kind ?? null;
    },

    splashText(): string | null {
      return getSplashText();
    },
  };
}

export function removeTestBridge(): void {
  if (window.__GAME_TEST__) {
    delete window.__GAME_TEST__;
  }
}
