/**
 * AiCarRenderer — AI ghost car renderer (VIS-06).
 *
 * Wraps a CarRenderer with cyan tint, semi-transparent alpha, and a GlowFilter
 * to make the AI car visually distinct from the player car.
 */
import { GlowFilter } from 'pixi-filters/glow';
import { CarRenderer } from './CarRenderer';
import type { Sprite, Graphics } from 'pixi.js';

// ──────────────────────────────────────────────────────────
// Visual Constants
// ──────────────────────────────────────────────────────────

const AI_TINT = 0x00eeff;
const AI_ALPHA = 0.55;
const GLOW_DISTANCE = 8;
const GLOW_STRENGTH = 1.5;
const GLOW_QUALITY = 0.3;

// ──────────────────────────────────────────────────────────
// AiCarRenderer
// ──────────────────────────────────────────────────────────

export class AiCarRenderer {
  readonly container: CarRenderer['container'];
  private carRenderer: CarRenderer;

  constructor() {
    this.carRenderer = new CarRenderer();
    this.container = this.carRenderer.container;

    // Apply tint to individual children (Sprite/Graphics have .tint; Container does not)
    for (const child of this.container.children) {
      if ('tint' in child) {
        (child as Sprite | Graphics).tint = AI_TINT;
      }
    }

    // Ghost transparency
    this.container.alpha = AI_ALPHA;

    // Glow effect — pixi-filters v6 (PixiJS v8 compatible, WebGL + WebGPU)
    this.container.filters = [
      new GlowFilter({
        distance: GLOW_DISTANCE,
        outerStrength: GLOW_STRENGTH,
        color: AI_TINT,
        quality: GLOW_QUALITY,
      }),
    ];
  }

  /**
   * Update position and heading (call every render frame).
   * Delegates to CarRenderer.update() — same heading convention (no PI/2 offset).
   *
   * @param worldX - World-space X position
   * @param worldY - World-space Y position
   * @param heading - Heading in radians
   */
  update(worldX: number, worldY: number, heading: number): void {
    this.carRenderer.update(worldX, worldY, heading);
  }
}
