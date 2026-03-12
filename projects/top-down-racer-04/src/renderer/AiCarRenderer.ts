/**
 * AiCarRenderer — AI ghost car with tint + alpha (Phase 2).
 *
 * Phase 2: tint (cyan) + alpha (55%) only.
 * Phase 3 adds GlowFilter when pixi-filters is added.
 */

import { ASSETS } from '../assets/manifest';
import { CarRenderer } from './CarRenderer';

const AI_CAR_TINT = 0x00eeff;
const AI_CAR_ALPHA = 0.55;

export class AiCarRenderer {
  readonly container: CarRenderer['container'];
  private carRenderer: CarRenderer;

  constructor() {
    this.carRenderer = new CarRenderer(ASSETS.cars.frames.ai);
    this.container = this.carRenderer.container;
    this.carRenderer.setTint(AI_CAR_TINT);
    this.carRenderer.setAlpha(AI_CAR_ALPHA);
  }

  update(worldX: number, worldY: number, heading: number): void {
    this.carRenderer.update(worldX, worldY, heading);
  }

  destroy(): void {
    this.carRenderer.destroy();
  }
}
