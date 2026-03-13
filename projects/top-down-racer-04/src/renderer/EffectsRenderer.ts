/**
 * EffectsRenderer — visual feedback effects in world space (Phase 3 refactor).
 *
 * Refactored from v02/Phase 2:
 *   - Skid marks → RenderTexture accumulation (zero per-frame Graphics creation)
 *   - Particles → SpritePool (bounded, pre-allocated, no create/destroy per frame)
 *   - Checkpoint flashes → SpritePool (shared pool)
 *
 * External API unchanged: render(), reset(), destroy().
 *
 * Requires Renderer reference for RenderTexture operations.
 */

import { Container, Graphics, Sprite, Texture, RenderTexture, type Renderer } from 'pixi.js';
import type { WorldState, Vec2, TrackState } from '../engine/types';
import { Surface } from '../engine/types';
import { GamePhase, type RaceState } from '../engine/RaceController';
import { SpritePool } from './SpritePool';

// ── Skid mark constants ──
const SKID_SLIP_THRESHOLD = 0.08;
const SKID_COLOR = 0x333333;
const SKID_WIDTH = 2.2;
const SKID_ALPHA = 0.8;
const SKID_FADE_ALPHA = 0.006; // Per-frame fade (0.005–0.008 range avoids 8-bit quantization ghosts)
const SKID_TEXTURE_PADDING = 20;

// ── Checkpoint flash constants ──
const FLASH_DURATION = 18;

// ── Particle constants ──
const POOL_SIZE = 64; // Shared pool: 40 dust + 20 sparks + 4 flashes
const DUST_LIFETIME = 30;
const SPARK_LIFETIME = 18;
const DUST_COLOR = 0xbb9966;
const SPARK_COLOR = 0xffcc44;
const FLASH_COLOR = 0x44ff88;
const PARTICLE_TEXTURE_SIZE = 8; // px for circle texture

interface ActiveParticle {
  sprite: Sprite;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
}

interface ActiveFlash {
  sprite: Sprite;
  age: number;
}

/** Compute axis-aligned bounding box from boundary points. */
function computeTrackAABB(outerBoundary: readonly Vec2[]): { x: number; y: number; width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of outerBoundary) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Generate a white circle texture for particles. */
function createCircleTexture(renderer: Renderer): Texture {
  const gfx = new Graphics();
  const r = PARTICLE_TEXTURE_SIZE / 2;
  gfx.circle(r, r, r).fill({ color: 0xffffff, alpha: 1 });
  const texture = renderer.generateTexture(gfx);
  gfx.destroy();
  return texture;
}

export class EffectsRenderer {
  private readonly effectsLayer: Container;
  private readonly renderer: Renderer;

  // ── Skid marks (RenderTexture) ──
  private skidTexture: RenderTexture | null = null;
  private skidSprite: Sprite | null = null;
  private skidStaging = new Graphics();
  private skidFadeRect: Graphics | null = null;
  private skidTextureHasMarks = false;
  private lastSkidPos: Vec2 | null = null;
  private trackAABB = { x: 0, y: 0, width: 0, height: 0 };

  // ── Particles (SpritePool) ──
  private pool: SpritePool | null = null;
  private particles: ActiveParticle[] = [];
  private flashes: ActiveFlash[] = [];
  private lastCheckpointIndex = 0;
  private wasColliding = false;
  private circleTexture: Texture | null = null;
  private trackInitialized = false;

  constructor(effectsLayer: Container, renderer: Renderer) {
    this.effectsLayer = effectsLayer;
    this.renderer = renderer;
  }

  /** Initialize track-specific resources (skid texture, particle pool). */
  private initForTrack(track: TrackState): void {
    if (this.trackInitialized) return;

    // Create circle texture for particles
    this.circleTexture = createCircleTexture(this.renderer);

    // Create particle pool
    this.pool = new SpritePool(this.circleTexture, this.effectsLayer, POOL_SIZE);

    // Create skid mark RenderTexture sized to track AABB
    this.trackAABB = computeTrackAABB(track.outerBoundary);
    const texW = Math.ceil(this.trackAABB.width + SKID_TEXTURE_PADDING * 2);
    const texH = Math.ceil(this.trackAABB.height + SKID_TEXTURE_PADDING * 2);

    try {
      this.skidTexture = RenderTexture.create({
        width: texW,
        height: texH,
        resolution: 1,
      });
    } catch {
      // VRAM exhaustion — gracefully degrade to no skid marks
      this.skidTexture = null;
    }

    if (this.skidTexture) {
      this.skidSprite = new Sprite(this.skidTexture);
      this.skidSprite.position.set(
        this.trackAABB.x - SKID_TEXTURE_PADDING,
        this.trackAABB.y - SKID_TEXTURE_PADDING,
      );
      // D6 pattern: counteract camera Y-flip
      this.skidSprite.scale.y = -1;
      this.skidSprite.blendMode = 'multiply';
      // Add to effectsLayer at bottom (behind particles)
      this.effectsLayer.addChildAt(this.skidSprite, 0);

      // Create fade rect for gradual skid mark fade
      this.skidFadeRect = new Graphics()
        .rect(0, 0, texW, texH)
        .fill({ color: 0xffffff, alpha: SKID_FADE_ALPHA });
    }

    this.trackInitialized = true;
  }

  render(prev: WorldState, curr: WorldState, _alpha: number, race: RaceState): void {
    if (race.phase === GamePhase.Loading) return;

    // Initialize on first render (need track data)
    if (!this.trackInitialized) {
      this.initForTrack(curr.track);
    }

    if (curr.tick < prev.tick) {
      this.clearAll();
      return;
    }

    if (race.phase === GamePhase.Racing) {
      this.updateSkidMarks(curr);
      this.updateCheckpointFlash(curr);
      this.spawnDust(curr);
      this.spawnSparks(prev, curr);
    }

    this.fadeSkidMarks();
    this.ageParticles();
    this.ageFlashes();
  }

  // ── Skid Marks (RenderTexture) ──

  private updateSkidMarks(curr: WorldState): void {
    if (!this.skidTexture) return;

    const { car } = curr;
    if (car.slipAngle < SKID_SLIP_THRESHOLD || car.surface === Surface.Runoff) {
      this.lastSkidPos = null;
      return;
    }

    const pos = car.position;
    if (this.lastSkidPos) {
      // Convert world coords to texture-local coords
      const offsetX = this.trackAABB.x - SKID_TEXTURE_PADDING;
      const offsetY = this.trackAABB.y - SKID_TEXTURE_PADDING;

      this.skidStaging.clear();
      this.skidStaging.moveTo(this.lastSkidPos.x - offsetX, this.lastSkidPos.y - offsetY);
      this.skidStaging.lineTo(pos.x - offsetX, pos.y - offsetY);
      this.skidStaging.stroke({ width: SKID_WIDTH, color: SKID_COLOR, alpha: SKID_ALPHA });

      this.renderer.render({
        container: this.skidStaging,
        target: this.skidTexture,
        clear: false,
      });
      this.skidTextureHasMarks = true;
    }

    this.lastSkidPos = { x: pos.x, y: pos.y };
  }

  private fadeSkidMarks(): void {
    // Only fade when we have marks — skip wasted RT bind on non-skidding frames
    if (!this.skidTextureHasMarks || !this.skidTexture || !this.skidFadeRect) return;

    this.renderer.render({
      container: this.skidFadeRect,
      target: this.skidTexture,
      clear: false,
    });
  }

  private clearSkidTexture(): void {
    if (!this.skidTexture) return;
    const empty = new Container();
    this.renderer.render({ container: empty, target: this.skidTexture, clear: true });
    empty.destroy();
    this.skidTextureHasMarks = false;
    this.lastSkidPos = null;
  }

  // ── Checkpoint Flash (SpritePool) ──

  private updateCheckpointFlash(curr: WorldState): void {
    if (!this.pool) return;

    const newIdx = curr.timing.lastCheckpointIndex;
    if (newIdx !== this.lastCheckpointIndex && newIdx >= 0) {
      const cp = curr.track.checkpoints[newIdx];
      if (cp) {
        // Use a pooled sprite placed at checkpoint center
        const sprite = this.pool.acquire();
        if (sprite) {
          sprite.tint = FLASH_COLOR;
          sprite.position.set(cp.center.x, cp.center.y);
          // Scale up for flash effect
          const dx = cp.right.x - cp.left.x;
          const dy = cp.right.y - cp.left.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const scaleX = len / PARTICLE_TEXTURE_SIZE;
          sprite.scale.set(scaleX, 1.5);
          sprite.rotation = Math.atan2(dy, dx);
          sprite.alpha = 0.9;
          // D6: counteract Y-flip
          sprite.scale.y = -sprite.scale.y;
          this.flashes.push({ sprite, age: 0 });
        }
      }
      this.lastCheckpointIndex = newIdx;
    }
  }

  private ageFlashes(): void {
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const flash = this.flashes[i];
      flash.age++;
      flash.sprite.alpha = 0.9 * (1 - flash.age / FLASH_DURATION);

      if (flash.age >= FLASH_DURATION) {
        this.pool!.release(flash.sprite);
        // Swap-and-pop O(1) removal
        this.flashes[i] = this.flashes[this.flashes.length - 1];
        this.flashes.pop();
      }
    }
  }

  // ── Dust Particles (SpritePool) ──

  private spawnDust(curr: WorldState): void {
    if (!this.pool) return;

    const { car } = curr;
    // ISS-002 guard: spawn on Shoulder AND Runoff, skip only Road
    if (car.surface === Surface.Road || car.speed < 5) return;

    const onShoulder = car.surface === Surface.Shoulder;
    const count = onShoulder ? 1 : (car.speed > 40 ? 2 : 1);
    for (let i = 0; i < count; i++) {
      const sprite = this.pool.acquire();
      if (!sprite) break; // Pool exhausted

      sprite.tint = DUST_COLOR;
      const size = 1.5 + Math.random() * 2.0;
      const scale = size / (PARTICLE_TEXTURE_SIZE / 2);
      sprite.scale.set(scale, -scale); // D6: Y-flip compensation
      sprite.alpha = 0.7;
      sprite.position.set(
        car.position.x + (Math.random() - 0.5) * 3,
        car.position.y + (Math.random() - 0.5) * 3,
      );

      this.particles.push({
        sprite,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        age: 0,
        maxAge: DUST_LIFETIME,
      });
    }
  }

  // ── Spark Particles (SpritePool) ──

  private spawnSparks(prev: WorldState, curr: WorldState): void {
    if (!this.pool) return;

    const { car } = curr;
    const speedDrop = prev.car.speed - car.speed;
    const isColliding = speedDrop > prev.car.speed * 0.1 && prev.car.speed > 10;

    if (isColliding && !this.wasColliding) {
      const count = Math.min(6, Math.floor(speedDrop / 5));
      for (let i = 0; i < count; i++) {
        const sprite = this.pool.acquire();
        if (!sprite) break;

        sprite.tint = SPARK_COLOR;
        const size = 0.8 + Math.random() * 1.2;
        const scale = size / (PARTICLE_TEXTURE_SIZE / 2);
        sprite.scale.set(scale, -scale); // D6: Y-flip compensation
        sprite.alpha = 0.9;
        sprite.position.set(
          car.position.x + (Math.random() - 0.5) * 2,
          car.position.y + (Math.random() - 0.5) * 2,
        );

        const angle = car.heading + Math.PI + (Math.random() - 0.5) * 1.5;
        const spd = 2 + Math.random() * 3;
        this.particles.push({
          sprite,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          age: 0,
          maxAge: SPARK_LIFETIME,
        });
      }
    }

    this.wasColliding = isColliding;
  }

  // ── Particle Aging ──

  private ageParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age++;
      p.sprite.x += p.vx;
      p.sprite.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.sprite.alpha = 1 - p.age / p.maxAge;

      if (p.age >= p.maxAge) {
        this.pool!.release(p.sprite);
        // Swap-and-pop O(1) removal
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
  }

  // ── Cleanup ──

  private clearAll(): void {
    // Release all active particles and flashes back to pool
    for (const p of this.particles) {
      if (this.pool) this.pool.release(p.sprite);
    }
    this.particles = [];

    for (const f of this.flashes) {
      if (this.pool) this.pool.release(f.sprite);
    }
    this.flashes = [];

    this.lastCheckpointIndex = 0;
    this.wasColliding = false;

    this.clearSkidTexture();
  }

  reset(): void {
    this.clearAll();
  }

  destroy(): void {
    this.clearAll();
    this.skidStaging.destroy();
    if (this.skidFadeRect) this.skidFadeRect.destroy();
    if (this.skidSprite) {
      this.effectsLayer.removeChild(this.skidSprite);
      this.skidSprite.destroy();
    }
    if (this.skidTexture) this.skidTexture.destroy(true);
    if (this.circleTexture) this.circleTexture.destroy(true);
    // Pool sprites are children of effectsLayer — destroyed when effectsLayer is destroyed
  }
}
