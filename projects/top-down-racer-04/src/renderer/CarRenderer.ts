/**
 * CarRenderer — sprite-based car rendering from atlas.
 *
 * Replaces v02's 15+ Graphics objects with a single Sprite.
 * Y-flip compensation: sprite.scale.y is negative to counteract
 * the camera's negative Y scale (D6).
 */

import { Container, Sprite, Texture } from 'pixi.js';

/** Visual length in world units — matches v02 visual footprint. */
const CAR_VISUAL_LENGTH = 12.0;
/** Atlas frame pixel size. */
const SPRITE_PX = 256;
/**
 * Sprites point UP in the atlas; engine heading 0 = +X (right).
 * Rotate sprite by -90° so heading 0 renders correctly.
 */
const SPRITE_ROTATION_OFFSET = -Math.PI / 2;
/**
 * Car body occupies ~65% of the 256px frame (rest is padding/shadow).
 * Scale to match the visual car length in world units.
 */
const BODY_FILL_RATIO = 0.38;

export class CarRenderer {
  readonly container: Container;
  private readonly sprite: Sprite;

  constructor(frameName: string) {
    this.container = new Container();
    const texture = Texture.from(frameName);
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5, 0.5);
    const scale = CAR_VISUAL_LENGTH / (SPRITE_PX * BODY_FILL_RATIO);
    // Negative Y counteracts camera Y-flip (D6)
    this.sprite.scale.set(scale, -scale);
    this.sprite.rotation = SPRITE_ROTATION_OFFSET;
    this.container.addChild(this.sprite);
  }

  update(worldX: number, worldY: number, heading: number): void {
    this.container.position.set(worldX, worldY);
    this.container.rotation = heading;
  }

  setTint(color: number): void {
    this.sprite.tint = color;
  }

  setAlpha(value: number): void {
    this.container.alpha = value;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
