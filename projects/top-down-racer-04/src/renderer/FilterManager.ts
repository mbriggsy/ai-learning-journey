/**
 * FilterManager — centralized post-processing filter lifecycle.
 *
 * This is a "Manager" class — distinct from "Renderer" (render callback) and
 * "Controller" (input/camera). It manages cross-cutting filter concerns across
 * multiple containers and does NOT follow the render(prev, curr, alpha, race)
 * callback pattern.
 *
 * Filter attachment points (ADR-05):
 *   worldContainer.filters = [bloom, motionBlur]
 *   carLayer.filters = [shadow]
 *   aiCarContainer.filters = [glow]  (when AI car exists)
 *
 * HUD is NEVER filtered — it lives outside worldContainer.
 */

import { BloomFilter } from 'pixi-filters/bloom';
import { DropShadowFilter } from 'pixi-filters/drop-shadow';
import { GlowFilter } from 'pixi-filters/glow';
import { MotionBlurFilter } from 'pixi-filters/motion-blur';
import type { Container } from 'pixi.js';
import type { QualityTier } from './Settings';

// ── Filter Configuration ──
const BLOOM_STRENGTH = 1;
const BLOOM_QUALITY = 6;
const SHADOW_OFFSET = { x: 3, y: -3 }; // Y negated for camera Y-flip
const SHADOW_ALPHA = 0.4;
const SHADOW_BLUR = 2;
const GLOW_DISTANCE = 8;
const GLOW_OUTER_STRENGTH = 1.5;
const GLOW_COLOR = 0x00eeff; // AI_CAR_TINT
const GLOW_QUALITY = 0.3;
const MOTION_BLUR_KERNEL = 5;
const MOTION_BLUR_MAX_VELOCITY = 30;
const MOTION_BLUR_MAX_VELOCITY_SQ = MOTION_BLUR_MAX_VELOCITY * MOTION_BLUR_MAX_VELOCITY;
const MOTION_BLUR_ENABLE_THRESHOLD_SQ = 4; // Below ~2px screen velocity: skip filter pass entirely

export class FilterManager {
  private readonly bloom: BloomFilter;
  private readonly shadow: DropShadowFilter;
  private readonly glow: GlowFilter;
  private readonly motionBlur: MotionBlurFilter;

  private tier: QualityTier = 'high';
  private attachedWorld: Container | null = null;
  private attachedAiCar: Container | null = null;

  constructor() {
    this.bloom = new BloomFilter({
      strength: BLOOM_STRENGTH,
      quality: BLOOM_QUALITY,
    });

    this.shadow = new DropShadowFilter({
      offset: SHADOW_OFFSET,
      color: 0x000000,
      alpha: SHADOW_ALPHA,
      blur: SHADOW_BLUR,
      quality: 3,
    });

    this.glow = new GlowFilter({
      distance: GLOW_DISTANCE,
      outerStrength: GLOW_OUTER_STRENGTH,
      color: GLOW_COLOR,
      quality: GLOW_QUALITY,
    });

    this.motionBlur = new MotionBlurFilter({
      velocity: { x: 0, y: 0 },
      kernelSize: MOTION_BLUR_KERNEL,
    });
  }

  /**
   * Attach filters to the container hierarchy.
   * MUST be called AFTER WorldRenderer creates all containers and BEFORE first render.
   */
  attach(
    worldContainer: Container,
    carLayer: Container,
    aiCarContainer: Container | null,
  ): void {
    this.attachedWorld = worldContainer;
    this.attachedAiCar = aiCarContainer;

    // Apply filters based on current quality tier
    this.applyTier(worldContainer, aiCarContainer);
  }

  /**
   * Detach filters from containers. Called on track switch / reset.
   */
  detach(
    worldContainer: Container,
    carLayer: Container,
    aiCarContainer: Container | null,
  ): void {
    worldContainer.filters = [];
    carLayer.filters = [];
    if (aiCarContainer) {
      aiCarContainer.filters = [];
    }
    this.attachedWorld = null;
    this.attachedAiCar = null;
  }

  /**
   * Update motion blur velocity from car state.
   * Call every render frame during racing.
   */
  updateMotionBlur(vx: number, vy: number, zoom: number): void {
    if (this.tier !== 'high') return; // motion blur only on high
    const screenVx = vx * zoom;
    const screenVy = -vy * zoom; // Y-flip compensation

    const magSq = screenVx * screenVx + screenVy * screenVy;

    // Below threshold: disable filter entirely to skip the GPU pass
    if (magSq < MOTION_BLUR_ENABLE_THRESHOLD_SQ) {
      this.motionBlur.enabled = false;
      return;
    }
    this.motionBlur.enabled = true;

    // Fast-path: skip sqrt when below clamp threshold (~70% of frames)
    if (magSq <= MOTION_BLUR_MAX_VELOCITY_SQ) {
      this.motionBlur.velocity.x = screenVx;
      this.motionBlur.velocity.y = screenVy;
    } else {
      const mag = Math.sqrt(magSq);
      const scale = MOTION_BLUR_MAX_VELOCITY / mag;
      this.motionBlur.velocity.x = screenVx * scale;
      this.motionBlur.velocity.y = screenVy * scale;
    }
  }

  /** Zero motion blur during pause. */
  pause(): void {
    this.motionBlur.enabled = false;
    this.motionBlur.velocity.x = 0;
    this.motionBlur.velocity.y = 0;
  }

  /**
   * Set quality tier. Reconfigures active filters on attached containers.
   * Low: all filters disabled. Medium: bloom + shadow. High: all filters.
   */
  setQualityTier(tier: QualityTier): void {
    this.tier = tier;
    if (this.attachedWorld) {
      this.applyTier(this.attachedWorld, this.attachedAiCar);
    }
  }

  getQualityTier(): QualityTier {
    return this.tier;
  }

  private applyTier(worldContainer: Container, aiCarContainer: Container | null): void {
    // High tier: native device resolution for crisp filters; medium/low: 1x (cheaper)
    const filterRes = this.tier === 'high' ? (window.devicePixelRatio ?? 1) : 1;
    this.bloom.resolution = filterRes;
    this.motionBlur.resolution = filterRes;
    this.glow.resolution = filterRes;

    switch (this.tier) {
      case 'low':
        worldContainer.filters = [];
        if (aiCarContainer) aiCarContainer.filters = [];
        break;
      case 'medium':
        worldContainer.filters = [this.bloom];
        this.motionBlur.velocity.x = 0;
        this.motionBlur.velocity.y = 0;
        if (aiCarContainer) aiCarContainer.filters = [];
        this.glow.enabled = false;
        break;
      case 'high':
        worldContainer.filters = [this.motionBlur];
        if (aiCarContainer) {
          aiCarContainer.filters = [this.glow];
          this.glow.enabled = true;
        }
        break;
    }
  }

  /** Reset motion blur velocity state between races. */
  resetState(): void {
    this.motionBlur.enabled = false;
    this.motionBlur.velocity.x = 0;
    this.motionBlur.velocity.y = 0;
  }

  /** Enable/disable glow filter (for modes without AI car). */
  setGlowEnabled(enabled: boolean): void {
    this.glow.enabled = enabled;
  }

  destroy(): void {
    this.bloom.destroy();
    this.shadow.destroy();
    this.glow.destroy();
    this.motionBlur.destroy();
  }
}
