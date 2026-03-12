/**
 * EffectsRenderer — visual feedback effects in world space.
 *
 * Adapted from v02. Only change: constructor accepts effectsLayer (not worldContainer)
 * so effects render at the correct z-order (between track and cars) per ADR-05.
 *
 * Four systems: skid marks, checkpoint flash, dust particles, spark particles.
 * All effects are read-only consumers of engine state.
 *
 * Phase 3 debt: per-frame Graphics allocation will bottleneck with filter passes.
 */

import { Container, Graphics } from 'pixi.js';
import type { WorldState, Vec2 } from '../engine/types';
import { Surface } from '../engine/types';
import { GamePhase, type RaceState } from '../engine/RaceController';

const SKID_SLIP_THRESHOLD = 0.08;
const SKID_MAX_AGE = 720;
const SKID_MAX_SEGMENTS = 300;
const SKID_COLOR = 0x444444;
const SKID_WIDTH = 1.8;

const FLASH_DURATION = 18;
const FLASH_LINE_WIDTH = 3;

const MAX_PARTICLES = 40;
const DUST_LIFETIME = 30;
const SPARK_LIFETIME = 18;

interface SkidSegment {
  gfx: Graphics;
  age: number;
}

interface Particle {
  gfx: Graphics;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
}

interface CheckpointFlash {
  gfx: Graphics;
  age: number;
}

export class EffectsRenderer {
  private container: Container;

  private skidSegments: SkidSegment[] = [];
  private lastSkidPos: Vec2 | null = null;

  private flashes: CheckpointFlash[] = [];
  private lastCheckpointIndex = 0;

  private particles: Particle[] = [];
  private wasColliding = false;

  /** v04 change: accepts effectsLayer instead of worldContainer (C6). */
  constructor(effectsLayer: Container) {
    this.container = new Container();
    effectsLayer.addChild(this.container);
  }

  render(prev: WorldState, curr: WorldState, _alpha: number, race: RaceState): void {
    if (race.phase === GamePhase.Loading) return;

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

    this.ageSkidMarks();
    this.ageParticles();
    this.ageFlashes();
  }

  // ── Skid Marks ──

  private updateSkidMarks(curr: WorldState): void {
    const { car } = curr;
    if (car.slipAngle < SKID_SLIP_THRESHOLD || car.surface === Surface.Runoff) {
      this.lastSkidPos = null;
      return;
    }

    const pos = car.position;
    if (this.lastSkidPos) {
      const gfx = new Graphics();
      gfx.moveTo(this.lastSkidPos.x, this.lastSkidPos.y);
      gfx.lineTo(pos.x, pos.y);
      gfx.stroke({ width: SKID_WIDTH, color: SKID_COLOR, alpha: 0.7 });
      this.container.addChild(gfx);
      this.skidSegments.push({ gfx, age: 0 });

      while (this.skidSegments.length > SKID_MAX_SEGMENTS) {
        const old = this.skidSegments.shift()!;
        this.container.removeChild(old.gfx);
        old.gfx.destroy();
      }
    }

    this.lastSkidPos = { x: pos.x, y: pos.y };
  }

  private ageSkidMarks(): void {
    for (let i = this.skidSegments.length - 1; i >= 0; i--) {
      const seg = this.skidSegments[i];
      seg.age++;

      const fadeStart = SKID_MAX_AGE * 0.7;
      if (seg.age > fadeStart) {
        seg.gfx.alpha = 1 - (seg.age - fadeStart) / (SKID_MAX_AGE - fadeStart);
      }

      if (seg.age >= SKID_MAX_AGE) {
        this.container.removeChild(seg.gfx);
        seg.gfx.destroy();
        this.skidSegments.splice(i, 1);
      }
    }
  }

  // ── Checkpoint Flash ──

  private updateCheckpointFlash(curr: WorldState): void {
    const newIdx = curr.timing.lastCheckpointIndex;
    if (newIdx !== this.lastCheckpointIndex && newIdx >= 0) {
      const cp = curr.track.checkpoints[newIdx];
      if (cp) {
        const gfx = new Graphics();
        gfx.moveTo(cp.left.x, cp.left.y);
        gfx.lineTo(cp.right.x, cp.right.y);
        gfx.stroke({ width: FLASH_LINE_WIDTH, color: 0x44ff88, alpha: 0.9 });
        this.container.addChild(gfx);
        this.flashes.push({ gfx, age: 0 });
      }
      this.lastCheckpointIndex = newIdx;
    }
  }

  private ageFlashes(): void {
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const flash = this.flashes[i];
      flash.age++;
      flash.gfx.alpha = 1 - flash.age / FLASH_DURATION;

      if (flash.age >= FLASH_DURATION) {
        this.container.removeChild(flash.gfx);
        flash.gfx.destroy();
        this.flashes.splice(i, 1);
      }
    }
  }

  // ── Dust Particles ──

  private spawnDust(curr: WorldState): void {
    const { car } = curr;
    if (car.surface === Surface.Road || car.speed < 5) return;

    const onShoulder = car.surface === Surface.Shoulder;
    const count = onShoulder ? 1 : (car.speed > 40 ? 2 : 1);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;

      const gfx = new Graphics();
      const size = 1.5 + Math.random() * 2.0;
      gfx.circle(0, 0, size).fill({ color: 0xbb9966, alpha: 0.7 });
      gfx.x = car.position.x + (Math.random() - 0.5) * 3;
      gfx.y = car.position.y + (Math.random() - 0.5) * 3;
      this.container.addChild(gfx);

      this.particles.push({
        gfx,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        age: 0,
        maxAge: DUST_LIFETIME,
      });
    }
  }

  // ── Spark Particles ──

  private spawnSparks(prev: WorldState, curr: WorldState): void {
    const { car } = curr;
    const speedDrop = prev.car.speed - car.speed;
    const isColliding = speedDrop > prev.car.speed * 0.1 && prev.car.speed > 10;

    if (isColliding && !this.wasColliding) {
      const count = Math.min(6, Math.floor(speedDrop / 5));
      for (let i = 0; i < count; i++) {
        if (this.particles.length >= MAX_PARTICLES) break;

        const gfx = new Graphics();
        const size = 0.8 + Math.random() * 1.2;
        gfx.circle(0, 0, size).fill({ color: 0xffcc44, alpha: 0.9 });
        gfx.x = car.position.x + (Math.random() - 0.5) * 2;
        gfx.y = car.position.y + (Math.random() - 0.5) * 2;
        this.container.addChild(gfx);

        const angle = car.heading + Math.PI + (Math.random() - 0.5) * 1.5;
        const spd = 2 + Math.random() * 3;
        this.particles.push({
          gfx,
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
      p.gfx.x += p.vx;
      p.gfx.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.gfx.alpha = 1 - p.age / p.maxAge;

      if (p.age >= p.maxAge) {
        this.container.removeChild(p.gfx);
        p.gfx.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  // ── Cleanup ──

  private clearAll(): void {
    for (const seg of this.skidSegments) {
      this.container.removeChild(seg.gfx);
      seg.gfx.destroy();
    }
    this.skidSegments = [];
    this.lastSkidPos = null;

    for (const flash of this.flashes) {
      this.container.removeChild(flash.gfx);
      flash.gfx.destroy();
    }
    this.flashes = [];
    this.lastCheckpointIndex = 0;

    for (const p of this.particles) {
      this.container.removeChild(p.gfx);
      p.gfx.destroy();
    }
    this.particles = [];
    this.wasColliding = false;
  }

  reset(): void {
    this.clearAll();
  }

  destroy(): void {
    this.clearAll();
    this.container.destroy({ children: true });
  }
}
