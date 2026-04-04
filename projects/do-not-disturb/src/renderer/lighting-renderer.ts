import Phaser from 'phaser';
import type { LightSource } from '../game/lighting';

export function createLightingRenderer(
  scene: Phaser.Scene,
  width: number,
  height: number,
) {
  const darkness = scene.add.renderTexture(0, 0, width, height);
  darkness.setOrigin(0, 0);
  darkness.setScrollFactor(0);
  darkness.setDepth(100);
  darkness.setBlendMode(Phaser.BlendModes.MULTIPLY);

  // Pre-create a gradient circle for light cutouts
  const lightCircleGraphics = scene.add.graphics({ x: 0, y: 0 });
  lightCircleGraphics.setVisible(false);
  const circleRadius = 128;
  lightCircleGraphics.fillStyle(0xffffff, 1);
  lightCircleGraphics.fillCircle(circleRadius, circleRadius, circleRadius);
  lightCircleGraphics.generateTexture('light-circle', circleRadius * 2, circleRadius * 2);
  lightCircleGraphics.destroy();

  return {
    update(
      ambientLight: number,
      lightSources: readonly LightSource[],
      cameraX: number,
      cameraY: number,
      lightningFlash: number,
    ) {
      darkness.clear();

      // Ambient darkness: lower ambient = darker fill
      const effectiveAmbient = Math.min(ambientLight + lightningFlash, 1.0);
      const darknessAlpha = 1 - effectiveAmbient;
      darkness.fill(0x000000, darknessAlpha);

      // Cut out light sources
      for (const light of lightSources) {
        const screenX = light.x - cameraX;
        const screenY = light.y - cameraY;
        const scale = light.radius / 128; // 128 = base circle radius
        darkness.draw(
          'light-circle',
          screenX - light.radius,
          screenY - light.radius,
          light.intensity,
          // RenderTexture.draw uses erase for light cutouts
        );
      }
    },

    destroy() {
      darkness.destroy();
    },
  };
}
