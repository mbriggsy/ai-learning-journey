import Phaser from 'phaser';
import { computeWobbleOffset } from '../game/animation';

/**
 * Apply sketch wobble effect to a sprite.
 * Updates sprite position with small random offset each frame.
 */
export function applySketchWobble(
  sprite: Phaser.GameObjects.Sprite,
  baseX: number,
  baseY: number,
  timeS: number,
  seed: number,
): void {
  const { dx, dy } = computeWobbleOffset(timeS, seed);
  sprite.setPosition(baseX + dx, baseY + dy);
}
