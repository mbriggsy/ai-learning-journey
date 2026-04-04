import Phaser from 'phaser';
import type { SquashStretchState } from '../game/animation';

/**
 * Apply squash/stretch to a sprite based on animation state.
 */
export function applySquashStretch(
  sprite: Phaser.GameObjects.Sprite,
  state: SquashStretchState,
): void {
  sprite.setScale(state.scaleX, state.scaleY);
}

/**
 * Create animation definitions for the kid character.
 * Call during scene preload/create.
 */
export function createKidAnimations(scene: Phaser.Scene): void {
  const anims = scene.anims;

  anims.create({ key: 'kid-idle', frames: anims.generateFrameNumbers('kid-idle', { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
  anims.create({ key: 'kid-walk', frames: anims.generateFrameNumbers('kid-walk', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
  anims.create({ key: 'kid-run', frames: anims.generateFrameNumbers('kid-run', { start: 0, end: 7 }), frameRate: 12, repeat: -1 });
  anims.create({ key: 'kid-sneak', frames: anims.generateFrameNumbers('kid-sneak', { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
  anims.create({ key: 'kid-jump', frames: anims.generateFrameNumbers('kid-jump', { start: 0, end: 2 }), frameRate: 6, repeat: 0 });
  anims.create({ key: 'kid-slide', frames: anims.generateFrameNumbers('kid-slide', { start: 0, end: 1 }), frameRate: 4, repeat: 0 });
}

/**
 * Create animation definitions for the Bellhop.
 */
export function createBellhopAnimations(scene: Phaser.Scene): void {
  const anims = scene.anims;

  anims.create({ key: 'bellhop-patrol', frames: anims.generateFrameNumbers('bellhop-patrol', { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
  anims.create({ key: 'bellhop-rush', frames: anims.generateFrameNumbers('bellhop-rush', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
  anims.create({ key: 'bellhop-investigate', frames: anims.generateFrameNumbers('bellhop-investigate', { start: 0, end: 2 }), frameRate: 2, repeat: -1 });
  anims.create({ key: 'bellhop-confused', frames: anims.generateFrameNumbers('bellhop-confused', { start: 0, end: 1 }), frameRate: 2, repeat: -1 });
  anims.create({ key: 'bellhop-catch', frames: anims.generateFrameNumbers('bellhop-catch', { start: 0, end: 3 }), frameRate: 4, repeat: 0 });
}

/**
 * Create animation definitions for the Housekeeper.
 */
export function createHousekeeperAnimations(scene: Phaser.Scene): void {
  const anims = scene.anims;

  anims.create({ key: 'housekeeper-patrol', frames: anims.generateFrameNumbers('housekeeper-patrol', { start: 0, end: 3 }), frameRate: 3, repeat: -1 });
  anims.create({ key: 'housekeeper-check', frames: anims.generateFrameNumbers('housekeeper-check', { start: 0, end: 2 }), frameRate: 2, repeat: -1 });
  anims.create({ key: 'housekeeper-skip', frames: anims.generateFrameNumbers('housekeeper-skip', { start: 0, end: 1 }), frameRate: 2, repeat: 0 });
  anims.create({ key: 'housekeeper-catch', frames: anims.generateFrameNumbers('housekeeper-catch', { start: 0, end: 3 }), frameRate: 4, repeat: 0 });
}

/**
 * Create animation definitions for the Guest.
 * Uses frame skipping for jerky stop-motion effect.
 */
export function createGuestAnimations(scene: Phaser.Scene): void {
  const anims = scene.anims;

  anims.create({ key: 'guest-unfold', frames: anims.generateFrameNumbers('guest-unfold', { start: 0, end: 5 }), frameRate: 6, repeat: 0 });
  anims.create({ key: 'guest-lunge', frames: anims.generateFrameNumbers('guest-lunge', { start: 0, end: 2 }), frameRate: 8, repeat: -1 });
  anims.create({ key: 'guest-fold', frames: anims.generateFrameNumbers('guest-fold', { start: 0, end: 5 }), frameRate: 4, repeat: 0 });
  anims.create({ key: 'guest-catch', frames: anims.generateFrameNumbers('guest-catch', { start: 0, end: 3 }), frameRate: 4, repeat: 0 });
}
