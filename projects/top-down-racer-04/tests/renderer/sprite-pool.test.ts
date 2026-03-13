import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pixi.js before importing SpritePool
vi.mock('pixi.js', () => {
  class MockSprite {
    renderable = true;
    alpha = 1;
    tint = 0xffffff;
    scale = { x: 1, y: 1, set: function (sx: number, sy?: number) { this.x = sx; this.y = sy ?? sx; } };
    rotation = 0;
    anchor = { set: vi.fn() };
  }

  class MockContainer {
    children: MockSprite[] = [];
    addChild(sprite: MockSprite) { this.children.push(sprite); }
  }

  class MockTexture {}

  return {
    Sprite: MockSprite,
    Container: MockContainer,
    Texture: MockTexture,
  };
});

import { SpritePool } from '../../src/renderer/SpritePool';
import { Container, Texture } from 'pixi.js';

describe('SpritePool', () => {
  let parent: Container;
  let texture: Texture;

  beforeEach(() => {
    parent = new Container();
    texture = new Texture();
  });

  it('pre-allocates all sprites at construction', () => {
    const pool = new SpritePool(texture, parent, 8);
    // All sprites added to parent
    expect((parent as any).children.length).toBe(8);
    // All start as not renderable
    for (const child of (parent as any).children) {
      expect(child.renderable).toBe(false);
    }
    expect(pool.activeCount).toBe(0);
    expect(pool.capacity).toBe(8);
  });

  it('acquire() returns a sprite and marks it renderable', () => {
    const pool = new SpritePool(texture, parent, 4);
    const sprite = pool.acquire();
    expect(sprite).not.toBeNull();
    expect(sprite!.renderable).toBe(true);
    expect(pool.activeCount).toBe(1);
  });

  it('acquire() returns null when pool is exhausted', () => {
    const pool = new SpritePool(texture, parent, 2);
    pool.acquire();
    pool.acquire();
    const third = pool.acquire();
    expect(third).toBeNull();
    expect(pool.activeCount).toBe(2);
  });

  it('release() resets sprite state and returns it to pool', () => {
    const pool = new SpritePool(texture, parent, 4);
    const sprite = pool.acquire()!;
    sprite.alpha = 0.3;
    sprite.tint = 0xff0000;
    sprite.rotation = 1.5;

    pool.release(sprite);
    expect(sprite.renderable).toBe(false);
    expect(sprite.alpha).toBe(1);
    expect(sprite.tint).toBe(0xffffff);
    expect(sprite.rotation).toBe(0);
    expect(pool.activeCount).toBe(0);
  });

  it('released sprites can be re-acquired', () => {
    const pool = new SpritePool(texture, parent, 1);
    const s1 = pool.acquire()!;
    pool.release(s1);
    const s2 = pool.acquire();
    expect(s2).toBe(s1);
    expect(s2!.renderable).toBe(true);
  });

  it('uses default maxSize of 64 when not specified', () => {
    const pool = new SpritePool(texture, parent);
    expect(pool.capacity).toBe(64);
    expect((parent as any).children.length).toBe(64);
  });
});
