/**
 * SpritePool — bounded, pre-allocated sprite pool for particle effects.
 *
 * Pre-allocates ALL sprites at boot to eliminate runtime allocation.
 * Uses `renderable = false` (not `visible = false`) to exclude idle sprites
 * from both rendering and bounds calculations under filter passes.
 *
 * This is a "Manager" class — not a renderer. It owns sprite lifecycle,
 * not per-frame rendering logic.
 */

import { Sprite, Texture, Container } from 'pixi.js';

export class SpritePool {
  private readonly idle: Sprite[] = [];
  private readonly maxSize: number;

  constructor(
    texture: Texture,
    parent: Container,
    maxSize: number = 64,
  ) {
    this.maxSize = maxSize;
    // Pre-allocate ALL sprites — eliminates runtime allocation
    for (let i = 0; i < maxSize; i++) {
      const sprite = new Sprite(texture);
      sprite.renderable = false;
      sprite.anchor.set(0.5);
      parent.addChild(sprite);
      this.idle.push(sprite);
    }
  }

  /** Acquire a sprite from the pool. Returns null if pool exhausted — caller skips spawn. */
  acquire(): Sprite | null {
    const sprite = this.idle.pop();
    if (!sprite) return null;
    sprite.renderable = true;
    return sprite;
  }

  /** Release a sprite back to the pool. Resets visual state. */
  release(sprite: Sprite): void {
    sprite.renderable = false;
    sprite.alpha = 1;
    sprite.tint = 0xffffff;
    sprite.scale.set(1);
    sprite.rotation = 0;
    this.idle.push(sprite);
  }

  get activeCount(): number {
    return this.maxSize - this.idle.length;
  }

  get capacity(): number {
    return this.maxSize;
  }
}
