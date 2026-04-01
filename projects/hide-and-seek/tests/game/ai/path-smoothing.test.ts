import { describe, it, expect } from 'vitest';
import { hasLineOfSight, smoothPath } from '../../../src/game/ai/path-smoothing.js';

const noBlocking = () => false;

describe('hasLineOfSight', () => {
  it('returns true for same tile', () => {
    expect(hasLineOfSight(5, 5, 5, 5, noBlocking)).toBe(true);
  });

  it('returns true for clear straight line', () => {
    expect(hasLineOfSight(0, 0, 5, 0, noBlocking)).toBe(true);
    expect(hasLineOfSight(0, 0, 0, 5, noBlocking)).toBe(true);
  });

  it('returns true for clear diagonal', () => {
    expect(hasLineOfSight(0, 0, 3, 3, noBlocking)).toBe(true);
  });

  it('returns false when wall blocks path', () => {
    const blocking = (x: number, y: number) => x === 2 && y === 0;
    expect(hasLineOfSight(0, 0, 5, 0, blocking)).toBe(false);
  });

  it('returns false when diagonal wall blocks', () => {
    const blocking = (x: number, y: number) => x === 2 && y === 2;
    expect(hasLineOfSight(0, 0, 4, 4, blocking)).toBe(false);
  });
});

describe('smoothPath', () => {
  it('returns empty for null/undefined/empty path', () => {
    expect(smoothPath(null, noBlocking)).toEqual([]);
    expect(smoothPath(undefined, noBlocking)).toEqual([]);
    expect(smoothPath([], noBlocking)).toEqual([]);
  });

  it('returns 1-point path unchanged', () => {
    const path = [{ x: 1, y: 1 }];
    expect(smoothPath(path, noBlocking)).toEqual(path);
  });

  it('returns 2-point path unchanged', () => {
    const path = [{ x: 0, y: 0 }, { x: 5, y: 0 }];
    expect(smoothPath(path, noBlocking)).toEqual(path);
  });

  it('string-pulls zigzag into straight line when no walls', () => {
    const zigzag = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 },
      { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 },
      { x: 3, y: 3 },
    ];
    const result = smoothPath(zigzag, noBlocking);
    // Should skip to start and end
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[result.length - 1]).toEqual({ x: 3, y: 3 });
  });

  it('preserves intermediate waypoints when walls block direct path', () => {
    // Wall at (2,0) blocks straight line from (0,0) to (4,0)
    const blocking = (x: number, y: number) => x === 2 && y === 0;
    const path = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 },
      { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 0 },
    ];
    const result = smoothPath(path, blocking);
    // Can't go direct — needs intermediate points
    expect(result.length).toBeGreaterThan(2);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[result.length - 1]).toEqual({ x: 4, y: 0 });
  });

  it('collapses to 2 points when start sees end directly', () => {
    const path = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
      { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 },
    ];
    const result = smoothPath(path, noBlocking);
    expect(result).toEqual([{ x: 0, y: 0 }, { x: 5, y: 0 }]);
  });
});
