import { describe, it, expect } from 'vitest';
import { checkDetection } from '../../src/game/detection.js';
import { DISPLAY } from '../../src/constants.js';

const TILE = DISPLAY.TILE_SIZE;

function makeFov(width: number, height: number): Uint8Array {
  // All visible
  return new Uint8Array(width * height).fill(1);
}

describe('checkDetection with vision cone', () => {
  const W = 20;
  const H = 20;

  it('hider in FOV but outside vision cone → none', () => {
    const fov = makeFov(W, H);
    // Seeker at (5,5) facing right (angle 0), hider directly behind at (3,5)
    const result = checkDetection(
      5 * TILE + 16, 5 * TILE + 16,   // seeker
      3 * TILE + 16, 5 * TILE + 16,   // hider — behind
      fov, W,
      0,    // facing right
      60,   // 60° cone
    );
    expect(result).toBe('none');
  });

  it('hider in FOV and inside vision cone → spotted', () => {
    const fov = makeFov(W, H);
    // Seeker facing right, hider ahead and slightly up
    const result = checkDetection(
      5 * TILE + 16, 5 * TILE + 16,
      8 * TILE + 16, 5 * TILE + 16,   // hider directly ahead
      fov, W,
      0,    // facing right
      60,   // 60° cone
    );
    expect(result).toBe('spotted');
  });

  it('hider at exact cone boundary → spotted (inclusive)', () => {
    const fov = makeFov(W, H);
    // 60° cone = 30° half angle. Place hider at exactly 30° from facing direction
    const seekerX = 5 * TILE + 16;
    const seekerY = 5 * TILE + 16;
    const halfConeRad = (60 / 2) * Math.PI / 180; // 30°
    // Hider at 30° above facing-right direction (angle = -halfConeRad)
    const distance = 3 * TILE;
    const hiderX = seekerX + distance * Math.cos(halfConeRad);
    const hiderY = seekerY + distance * Math.sin(halfConeRad);

    const result = checkDetection(
      seekerX, seekerY,
      hiderX, hiderY,
      fov, W,
      0,    // facing right
      60,   // 60° cone — boundary at 30°
    );
    // At boundary — should be spotted (inclusive, Math.abs(angleDiff) <= halfCone)
    expect(result).toBe('spotted');
  });

  it('hider behind seeker with 120° cone → none', () => {
    const fov = makeFov(W, H);
    // Seeker facing right, hider directly behind (180° from facing)
    const result = checkDetection(
      5 * TILE + 16, 5 * TILE + 16,
      2 * TILE + 16, 5 * TILE + 16,   // hider behind
      fov, W,
      0,      // facing right
      120,    // wide 120° cone — still can't see behind
    );
    expect(result).toBe('none');
  });

  it('seeker facing angle wraps around 2π boundary', () => {
    const fov = makeFov(W, H);
    // Seeker facing left (π), hider slightly left-down
    const result = checkDetection(
      5 * TILE + 16, 5 * TILE + 16,
      3 * TILE + 16, 6 * TILE + 16,   // hider left and slightly down
      fov, W,
      Math.PI,  // facing left
      90,       // 90° cone
    );
    expect(result).toBe('spotted');
  });

  it('backwards compatible: no angle params → 360° detection', () => {
    const fov = makeFov(W, H);
    // Hider behind seeker, no cone params — should still detect
    const result = checkDetection(
      5 * TILE + 16, 5 * TILE + 16,
      2 * TILE + 16, 5 * TILE + 16,
      fov, W,
    );
    expect(result).toBe('spotted');
  });

  it('proximity detection works within cone', () => {
    const fov = makeFov(W, H);
    // Hider very close to seeker, within cone
    const result = checkDetection(
      5 * TILE + 16, 5 * TILE + 16,
      5 * TILE + 20, 5 * TILE + 16,   // just a few pixels away
      fov, W,
      0, 60,
    );
    expect(result).toBe('found');
  });
});
