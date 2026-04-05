import Phaser from 'phaser';
import type { Emitter } from '../game/events';
import type { CameraState } from '../game/camera';
import { CAMERA } from '../constants';

export function createCameraController(
  camera: Phaser.Cameras.Scene2D.Camera,
  emitter: Emitter,
  scene: Phaser.Scene,
) {
  // Screen shake on monster alert
  emitter.on('MONSTER_ALERT', () => {
    camera.shake(CAMERA.SHAKE_DURATION_MS, CAMERA.SHAKE_INTENSITY);
  });

  return {
    syncToState(state: CameraState) {
      camera.scrollX = state.x - camera.width / 2;
      camera.scrollY = state.y - camera.height / 2;
      camera.zoom = state.zoom;
    },

    setBounds(x: number, y: number, width: number, height: number) {
      camera.setBounds(x, y, width, height);
    },
  };
}
