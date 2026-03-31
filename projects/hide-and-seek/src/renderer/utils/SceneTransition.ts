import Phaser from 'phaser';
import type { SceneDataMap } from '../../types/scenes.js';
import { CINEMATIC } from '../../constants.js';

let transitioning = false;

export const SceneTransition = {
  get isTransitioning(): boolean {
    return transitioning;
  },

  reset(): void {
    transitioning = false;
  },

  startScene<K extends keyof SceneDataMap>(
    scene: Phaser.Scene,
    key: K,
    ...args: SceneDataMap[K] extends undefined ? [] : [data: SceneDataMap[K]]
  ): void {
    if (transitioning) return;
    transitioning = true;

    const cam = scene.cameras.main;
    cam.fadeOut(CINEMATIC.SCENE_FADE_MS, 0, 0, 0);

    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      transitioning = false;
      scene.scene.start(key, args[0]);
    });
  },
};
