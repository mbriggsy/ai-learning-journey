import Phaser from 'phaser';
import type { Position } from '../types/state';
import { computeSpatialParams } from '../game/spatial-audio';

export type ActiveSound = {
  readonly key: string;
  readonly sound: Phaser.Sound.BaseSound;
  readonly worldPos: Position;
};

export function createSpatialAudioRenderer(scene: Phaser.Scene) {
  const activeSounds: ActiveSound[] = [];

  return {
    play(key: string, worldPos: Position, options?: { volume?: number; loop?: boolean }) {
      const listenerPos = {
        x: scene.cameras.main.scrollX + scene.cameras.main.width / 2,
        y: scene.cameras.main.scrollY + scene.cameras.main.height / 2,
      };
      const spatial = computeSpatialParams(worldPos, listenerPos);
      const sound = scene.sound.add(key, {
        volume: (options?.volume ?? 1) * spatial.volume,
        loop: options?.loop ?? false,
      });
      sound.play();
      const active: ActiveSound = { key, sound, worldPos };
      activeSounds.push(active);
      return active;
    },

    updateListener(cameraCenter: Position) {
      for (let i = activeSounds.length - 1; i >= 0; i--) {
        const active = activeSounds[i]!;
        if (!active.sound.isPlaying) {
          activeSounds.splice(i, 1);
          continue;
        }
        const spatial = computeSpatialParams(active.worldPos, cameraCenter);
        // Phaser's sound config update
        (active.sound as any).volume = spatial.volume;
      }
    },

    stopAll() {
      for (const active of activeSounds) {
        active.sound.stop();
      }
      activeSounds.length = 0;
    },

    destroy() {
      this.stopAll();
    },
  };
}
