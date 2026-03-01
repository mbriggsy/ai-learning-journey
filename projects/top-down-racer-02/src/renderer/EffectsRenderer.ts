/**
 * EffectsRenderer -- Visual feedback effects in world space.
 *
 * Four systems:
 *   1. Skid marks  -- trail of thick line segments where tire slip exceeds threshold
 *   2. Checkpoint flash -- brief green highlight of gate line on crossing
 *   3. Dust particles -- brown particles when driving on runoff surface
 *   4. Spark particles -- yellow burst on wall collision (speed-drop heuristic)
 *
 * All effects are read-only consumers of engine state (no WorldState mutations).
 * All render in world space (move with camera).
 *
 * Requirements: VIS-03, VIS-04, VIS-07, VIS-08
 */

import { Container, Graphics } from 'pixi.js';
import type { WorldState, Vec2 } from '../engine/types';
import { Surface } from '../engine/types';
import { GamePhase, type RaceState } from '../engine/RaceController';

// -----------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------

/** Minimum slip angle (radians) to start leaving skid marks */
const SKID_SLIP_THRESHOLD = 0.08;
/** Maximum age in ticks before skid mark is removed (~12s at 60Hz) */
const SKID_MAX_AGE = 720;
/** Maximum skid mark segments alive at once */
const SKID_MAX_SEGMENTS = 300;
/** Skid mark color — visible against dark track */
const SKID_COLOR = 0x444444;
/** Skid mark width in world units */
const SKID_WIDTH = 1.8;

/** Checkpoint flash duration in ticks (~0.3s) */
const FLASH_DURATION = 18;
/** Checkpoint line width */
const FLASH_LINE_WIDTH = 3;

/** Maximum particles alive at once */
const MAX_PARTICLES = 40;
/** Dust particle lifetime in ticks (~0.5s) */
const DUST_LIFETIME = 30;
/** Spark particle lifetime in ticks (~0.3s) */
const SPARK_LIFETIME = 18;

// -----------------------------------------------------------------
// Data structures
// -----------------------------------------------------------------

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

// -----------------------------------------------------------------
// EffectsRenderer
// -----------------------------------------------------------------

export class EffectsRenderer {
  private container: Container;

  // Skid mark system
  private skidSegments: SkidSegment[] = [];
  private lastSkidPos: Vec2 | null = null;

  // Checkpoint flash system
  private flashes: CheckpointFlash[] = [];
  private lastCheckpointIndex = 0;

  // Particle system (shared for dust + sparks)
  private particles: Particle[] = [];

  // Track if car was colliding last tick (for spark edge-detection)
  private wasColliding = false;

  constructor(private worldContainer: Container) {
    this.container = new Container();
    worldContainer.addChild(this.container);
  }

  /**
   * Called every render frame by GameLoop.
   *
   * NOTE (RI-01): Reset detection currently uses `curr.tick < prev.tick`.
   * This can miss resets when resetWorld() and stepWorld() both execute in
   * the same accumulator frame (tick goes 0 -> 1, so 1 < 0 is false).
   * Upgrade: add a `worldGeneration` counter to GameLoop, increment on
   * resetWorld(), pass to render callbacks, and detect reset via generation
   * mismatch instead of tick comparison.
   */
  render(prev: WorldState, curr: WorldState, _alpha: number, race: RaceState): void {
    // Don't update effects during loading
    if (race.phase === GamePhase.Loading) return;

    // Clear all effects on world reset (tick regression = new session)
    if (curr.tick < prev.tick) {
      this.clearAll();
      return;
    }

    // Only spawn new effects during active racing
    if (race.phase === GamePhase.Racing) {
      this.updateSkidMarks(curr);
      this.updateCheckpointFlash(curr);
      this.spawnDust(curr);
      this.spawnSparks(prev, curr);
    }

    // Always age/fade effects (even during pause -- they just don't spawn new ones)
    this.ageSkidMarks();
    this.ageParticles();
    this.ageFlashes();
  }

  // ---- Skid Marks ------------------------------------------------

  private updateSkidMarks(curr: WorldState): void {
    const { car } = curr;

    // Only leave skid marks on road when slipping hard enough
    if (car.slipAngle < SKID_SLIP_THRESHOLD || car.surface !== Surface.Road) {
      this.lastSkidPos = null;
      return;
    }

    const pos = car.position;

    if (this.lastSkidPos) {
      // Draw a thick line segment from last position to current
      const gfx = new Graphics();
      gfx.moveTo(this.lastSkidPos.x, this.lastSkidPos.y);
      gfx.lineTo(pos.x, pos.y);
      gfx.stroke({ width: SKID_WIDTH, color: SKID_COLOR, alpha: 0.7 });
      this.container.addChild(gfx);
      this.skidSegments.push({ gfx, age: 0 });

      // Cull oldest if over limit
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

      // Fade over last 30% of life
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

  // ---- Checkpoint Flash -------------------------------------------

  private updateCheckpointFlash(curr: WorldState): void {
    const newIdx = curr.timing.lastCheckpointIndex;
    if (newIdx !== this.lastCheckpointIndex && newIdx >= 0) {
      // New checkpoint crossed -- flash the gate line
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

  // ---- Dust Particles (runoff surface) ----------------------------

  private spawnDust(curr: WorldState): void {
    const { car } = curr;
    if (car.surface !== Surface.Runoff || car.speed < 5) return;

    // Spawn 1-2 particles per tick when on runoff (sparse + punchy)
    const count = car.speed > 40 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;

      const gfx = new Graphics();
      const size = 1.5 + Math.random() * 2.0; // RI-05: Math.random for cosmetic randomness
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

  // ---- Spark Particles (wall collision) ---------------------------

  private spawnSparks(prev: WorldState, curr: WorldState): void {
    const { car } = curr;

    // Detect wall collision via speed-drop heuristic:
    // speed decreased by >10% in one tick while travelling above minimum speed
    const speedDrop = prev.car.speed - car.speed;
    const isColliding = speedDrop > prev.car.speed * 0.1 && prev.car.speed > 10;

    if (isColliding && !this.wasColliding) {
      // Spawn a burst of sparks on the leading edge of the collision
      const count = Math.min(6, Math.floor(speedDrop / 5));
      for (let i = 0; i < count; i++) {
        if (this.particles.length >= MAX_PARTICLES) break;

        const gfx = new Graphics();
        const size = 0.8 + Math.random() * 1.2;
        gfx.circle(0, 0, size).fill({ color: 0xffcc44, alpha: 0.9 });
        gfx.x = car.position.x + (Math.random() - 0.5) * 2;
        gfx.y = car.position.y + (Math.random() - 0.5) * 2;
        this.container.addChild(gfx);

        // Sparks fly outward from car (opposite heading + spread)
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

  // ---- Particle aging (shared for dust + sparks) ------------------

  private ageParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age++;
      p.gfx.x += p.vx;
      p.gfx.y += p.vy;
      p.vx *= 0.95; // Drag
      p.vy *= 0.95;
      p.gfx.alpha = 1 - p.age / p.maxAge;

      if (p.age >= p.maxAge) {
        this.container.removeChild(p.gfx);
        p.gfx.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  // ---- Cleanup ----------------------------------------------------

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

  /** Public reset for track switching — clears all effects. */
  reset(): void {
    this.clearAll();
  }

  /** RI-06: Public cleanup for screen transitions / GameLoop teardown. */
  destroy(): void {
    this.clearAll();
    this.container.destroy({ children: true });
  }
}
