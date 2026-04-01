import { describe, it, expect } from 'vitest';
import { computeFOV } from '../../src/game/los.js';

function makeOutput(w: number, h: number): Uint8Array {
  return new Uint8Array(w * h);
}

function isVisible(output: Uint8Array, width: number, x: number, y: number): boolean {
  return output[y * width + x] === 1;
}

describe('computeFOV', () => {
  it('marks origin as visible', () => {
    const w = 10, h = 10;
    const out = makeOutput(w, h);
    computeFOV(5, 5, 8, () => false, out, w, h);
    expect(isVisible(out, w, 5, 5)).toBe(true);
  });

  it('sees all tiles in open room within range', () => {
    const w = 10, h = 10;
    const out = makeOutput(w, h);
    computeFOV(5, 5, 4, () => false, out, w, h);

    // Should see tiles within range (Chebyshev/quadrant scan)
    expect(isVisible(out, w, 5, 1)).toBe(true); // 4 tiles north
    expect(isVisible(out, w, 5, 9)).toBe(true); // 4 tiles south
    expect(isVisible(out, w, 1, 5)).toBe(true); // 4 tiles west
    expect(isVisible(out, w, 9, 5)).toBe(true); // 4 tiles east
  });

  it('does not see tiles beyond range', () => {
    const w = 20, h = 20;
    const out = makeOutput(w, h);
    computeFOV(10, 10, 3, () => false, out, w, h);

    // 5 tiles away should NOT be visible (range 3)
    expect(isVisible(out, w, 10, 5)).toBe(false);
    expect(isVisible(out, w, 15, 10)).toBe(false);
  });

  it('wall blocks tiles behind it', () => {
    const w = 10, h = 10;
    const out = makeOutput(w, h);

    // Wall at (5, 3) — should block (5, 2) and above from (5, 5)
    const blocking = (x: number, y: number) => x === 5 && y === 3;
    computeFOV(5, 5, 8, blocking, out, w, h);

    // Wall itself should be visible
    expect(isVisible(out, w, 5, 3)).toBe(true);
    // Tile directly behind wall should be blocked
    expect(isVisible(out, w, 5, 2)).toBe(false);
  });

  it('sees through 1-tile doorway', () => {
    const w = 10, h = 10;
    const out = makeOutput(w, h);

    // Wall across row 3, except gap at x=5
    const blocking = (x: number, y: number) => y === 3 && x !== 5;
    computeFOV(5, 5, 8, blocking, out, w, h);

    // Through the gap
    expect(isVisible(out, w, 5, 2)).toBe(true);
    // Wall is visible
    expect(isVisible(out, w, 4, 3)).toBe(true);
    expect(isVisible(out, w, 6, 3)).toBe(true);
  });

  it('wall tile is visible (can see the wall itself)', () => {
    const w = 10, h = 10;
    const out = makeOutput(w, h);
    const blocking = (x: number, y: number) => x === 7 && y === 5;
    computeFOV(5, 5, 8, blocking, out, w, h);
    expect(isVisible(out, w, 7, 5)).toBe(true);
  });

  it('adjacent wall is always visible', () => {
    const w = 10, h = 10;
    const out = makeOutput(w, h);

    // Walls on all 4 adjacent tiles
    const blocking = (x: number, y: number) =>
      (x === 4 && y === 5) || (x === 6 && y === 5) ||
      (x === 5 && y === 4) || (x === 5 && y === 6);
    computeFOV(5, 5, 8, blocking, out, w, h);

    expect(isVisible(out, w, 4, 5)).toBe(true);
    expect(isVisible(out, w, 6, 5)).toBe(true);
    expect(isVisible(out, w, 5, 4)).toBe(true);
    expect(isVisible(out, w, 5, 6)).toBe(true);
  });

  it('symmetry: A sees B ↔ B sees A (open room)', () => {
    const w = 10, h = 10;

    // Test several pairs
    const pairs: Array<[number, number, number, number]> = [
      [2, 2, 7, 7],
      [1, 5, 8, 5],
      [5, 1, 5, 8],
      [3, 2, 7, 6],
    ];

    for (const [ax, ay, bx, by] of pairs) {
      const outA = makeOutput(w, h);
      computeFOV(ax, ay, 8, () => false, outA, w, h);
      const aSeesB = isVisible(outA, w, bx, by);

      const outB = makeOutput(w, h);
      computeFOV(bx, by, 8, () => false, outB, w, h);
      const bSeesA = isVisible(outB, w, ax, ay);

      expect(aSeesB, `(${ax},${ay}) sees (${bx},${by})=${aSeesB} but (${bx},${by}) sees (${ax},${ay})=${bSeesA}`).toBe(bSeesA);
    }
  });

  it('symmetry: A sees B ↔ B sees A (with walls)', () => {
    const w = 15, h = 15;
    // L-shaped wall
    const blocking = (x: number, y: number) =>
      (y === 7 && x >= 3 && x <= 7) || (x === 7 && y >= 7 && y <= 11);

    const pairs: Array<[number, number, number, number]> = [
      [2, 5, 10, 5],
      [5, 5, 5, 10],
      [2, 10, 10, 10],
    ];

    for (const [ax, ay, bx, by] of pairs) {
      const outA = makeOutput(w, h);
      computeFOV(ax, ay, 12, blocking, outA, w, h);
      const aSeesB = isVisible(outA, w, bx, by);

      const outB = makeOutput(w, h);
      computeFOV(bx, by, 12, blocking, outB, w, h);
      const bSeesA = isVisible(outB, w, ax, ay);

      expect(aSeesB).toBe(bSeesA);
    }
  });

  it('pillar casts shadow', () => {
    const w = 10, h = 10;
    const out = makeOutput(w, h);

    // Single pillar at (5, 3) between origin (5, 5) and far tile
    computeFOV(5, 5, 8, (x, y) => x === 5 && y === 3, out, w, h);

    // Pillar visible
    expect(isVisible(out, w, 5, 3)).toBe(true);
    // Behind pillar should be shadowed
    expect(isVisible(out, w, 5, 1)).toBe(false);
  });

  it('corridor visibility (only sees down the hall)', () => {
    const w = 15, h = 5;
    const out = makeOutput(w, h);

    // Walls on rows 0,1 and 3,4 — corridor on row 2
    const blocking = (x: number, y: number) => y !== 2;
    computeFOV(1, 2, 12, blocking, out, w, h);

    // Can see down the corridor
    expect(isVisible(out, w, 10, 2)).toBe(true);
    // Adjacent walls visible
    expect(isVisible(out, w, 1, 1)).toBe(true);
    expect(isVisible(out, w, 1, 3)).toBe(true);
  });

  it('handles edge of map (no out-of-bounds crash)', () => {
    const w = 5, h = 5;
    const out = makeOutput(w, h);
    // Origin at corner
    computeFOV(0, 0, 8, () => false, out, w, h);
    expect(isVisible(out, w, 0, 0)).toBe(true);
    expect(isVisible(out, w, 4, 4)).toBe(true);
  });

  it('zeroes output array is caller responsibility', () => {
    const w = 5, h = 5;
    const out = makeOutput(w, h);
    out.fill(1); // pre-fill with 1s
    computeFOV(2, 2, 1, () => false, out, w, h);
    // Tiles beyond range should still be 1 (FOV writes, doesn't clear)
    // This verifies the contract: caller must zero before calling
    expect(isVisible(out, w, 0, 0)).toBe(true); // still 1 from fill
  });

  it('performance: completes 50x50 grid in under 5ms', () => {
    const w = 50, h = 50;
    const out = makeOutput(w, h);

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      out.fill(0);
      computeFOV(25, 25, 8, () => false, out, w, h);
    }
    const elapsed = performance.now() - start;
    const perCall = elapsed / 100;

    expect(perCall).toBeLessThan(5);
  });
});
