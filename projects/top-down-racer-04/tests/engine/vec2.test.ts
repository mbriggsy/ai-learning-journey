import { describe, it, expect } from 'vitest';
import {
  vec2,
  add,
  sub,
  scale,
  dot,
  cross,
  length,
  lengthSq,
  normalize,
  rotate,
  distance,
  distanceSq,
  lerp,
  lerpAngle,
  perpCW,
  perpCCW,
  negate,
  fromAngle,
} from '../../src/engine/vec2';

const PI = Math.PI;

describe('vec2', () => {
  it('creates a vector from x and y', () => {
    const v = vec2(3, 4);
    expect(v.x).toBe(3);
    expect(v.y).toBe(4);
  });

  it('creates a zero vector', () => {
    const v = vec2(0, 0);
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });
});

describe('add', () => {
  it('adds two vectors', () => {
    const r = add({ x: 1, y: 2 }, { x: 3, y: 4 });
    expect(r.x).toBe(4);
    expect(r.y).toBe(6);
  });

  it('adds with negative components', () => {
    const r = add({ x: -1, y: 5 }, { x: 3, y: -2 });
    expect(r.x).toBe(2);
    expect(r.y).toBe(3);
  });
});

describe('sub', () => {
  it('subtracts two vectors', () => {
    const r = sub({ x: 5, y: 7 }, { x: 2, y: 3 });
    expect(r.x).toBe(3);
    expect(r.y).toBe(4);
  });

  it('subtracting equal vectors yields zero', () => {
    const r = sub({ x: 3, y: 4 }, { x: 3, y: 4 });
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });
});

describe('scale', () => {
  it('scales a vector by a scalar', () => {
    const r = scale({ x: 3, y: 4 }, 2);
    expect(r.x).toBe(6);
    expect(r.y).toBe(8);
  });

  it('scales by zero produces zero vector', () => {
    const r = scale({ x: 3, y: 4 }, 0);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });

  it('scales by negative flips direction', () => {
    const r = scale({ x: 1, y: -2 }, -3);
    expect(r.x).toBe(-3);
    expect(r.y).toBe(6);
  });
});

describe('dot', () => {
  it('perpendicular vectors have zero dot product', () => {
    expect(dot({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0);
  });

  it('parallel vectors have dot product equal to product of lengths', () => {
    expect(dot({ x: 1, y: 0 }, { x: 1, y: 0 })).toBe(1);
  });

  it('anti-parallel vectors have negative dot product', () => {
    expect(dot({ x: 1, y: 0 }, { x: -1, y: 0 })).toBe(-1);
  });
});

describe('cross', () => {
  it('cross({1,0}, {0,1}) = 1', () => {
    expect(cross({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(1);
  });

  it('cross({0,1}, {1,0}) = -1', () => {
    expect(cross({ x: 0, y: 1 }, { x: 1, y: 0 })).toBe(-1);
  });

  it('parallel vectors have zero cross product', () => {
    expect(cross({ x: 2, y: 0 }, { x: 5, y: 0 })).toBe(0);
  });
});

describe('length', () => {
  it('computes magnitude of a 3-4-5 triangle', () => {
    expect(length({ x: 3, y: 4 })).toBe(5);
  });

  it('unit vector has length 1', () => {
    expect(length({ x: 1, y: 0 })).toBe(1);
  });

  it('zero vector has length 0', () => {
    expect(length({ x: 0, y: 0 })).toBe(0);
  });
});

describe('lengthSq', () => {
  it('computes squared magnitude', () => {
    expect(lengthSq({ x: 3, y: 4 })).toBe(25);
  });

  it('zero vector has squared length 0', () => {
    expect(lengthSq({ x: 0, y: 0 })).toBe(0);
  });
});

describe('normalize', () => {
  it('normalizes a 3-4-5 vector to unit length', () => {
    const r = normalize({ x: 3, y: 4 });
    expect(r.x).toBeCloseTo(0.6, 5);
    expect(r.y).toBeCloseTo(0.8, 5);
  });

  it('normalizing a unit vector returns it unchanged', () => {
    const r = normalize({ x: 1, y: 0 });
    expect(r.x).toBeCloseTo(1, 5);
    expect(r.y).toBeCloseTo(0, 5);
  });

  it('returns zero vector for zero input (guard)', () => {
    const r = normalize({ x: 0, y: 0 });
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });

  it('returns zero vector for near-zero input', () => {
    const r = normalize({ x: 1e-11, y: 1e-11 });
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });
});

describe('rotate', () => {
  it('rotates {1,0} by PI/2 to approximately {0,1}', () => {
    const r = rotate({ x: 1, y: 0 }, PI / 2);
    expect(r.x).toBeCloseTo(0, 5);
    expect(r.y).toBeCloseTo(1, 5);
  });

  it('rotates {1,0} by PI to approximately {-1,0}', () => {
    const r = rotate({ x: 1, y: 0 }, PI);
    expect(r.x).toBeCloseTo(-1, 5);
    expect(r.y).toBeCloseTo(0, 5);
  });

  it('rotating by 0 returns the same vector', () => {
    const r = rotate({ x: 3, y: 4 }, 0);
    expect(r.x).toBeCloseTo(3, 5);
    expect(r.y).toBeCloseTo(4, 5);
  });

  it('rotating by 2*PI returns the same vector', () => {
    const r = rotate({ x: 3, y: 4 }, 2 * PI);
    expect(r.x).toBeCloseTo(3, 5);
    expect(r.y).toBeCloseTo(4, 5);
  });
});

describe('distance', () => {
  it('computes distance between origin and (3,4)', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('distance from a point to itself is 0', () => {
    expect(distance({ x: 7, y: 11 }, { x: 7, y: 11 })).toBe(0);
  });
});

describe('distanceSq', () => {
  it('computes squared distance', () => {
    expect(distanceSq({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
  });

  it('squared distance from a point to itself is 0', () => {
    expect(distanceSq({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });
});

describe('lerp', () => {
  it('interpolates at midpoint', () => {
    const r = lerp({ x: 0, y: 0 }, { x: 10, y: 10 }, 0.5);
    expect(r.x).toBe(5);
    expect(r.y).toBe(5);
  });

  it('t=0 returns first vector', () => {
    const r = lerp({ x: 1, y: 2 }, { x: 10, y: 20 }, 0);
    expect(r.x).toBe(1);
    expect(r.y).toBe(2);
  });

  it('t=1 returns second vector', () => {
    const r = lerp({ x: 1, y: 2 }, { x: 10, y: 20 }, 1);
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
  });
});

describe('lerpAngle', () => {
  it('interpolates between 0 and PI at midpoint', () => {
    expect(lerpAngle(0, PI, 0.5)).toBeCloseTo(PI / 2, 5);
  });

  it('handles near-zero crossing', () => {
    expect(lerpAngle(-0.1, 0.1, 0.5)).toBeCloseTo(0, 5);
  });

  it('wraps around PI correctly', () => {
    // Angles near +PI and -PI should interpolate through PI, not through 0
    const result = lerpAngle(PI - 0.1, -PI + 0.1, 0.5);
    // Should be approximately PI (or -PI, they are the same angle)
    expect(Math.abs(Math.abs(result) - PI)).toBeLessThan(0.15);
  });

  it('t=0 returns the first angle', () => {
    expect(lerpAngle(1.0, 2.0, 0)).toBeCloseTo(1.0, 5);
  });

  it('t=1 returns the second angle', () => {
    expect(lerpAngle(1.0, 2.0, 1)).toBeCloseTo(2.0, 5);
  });
});

describe('perpCW', () => {
  it('perpCW({1,0}) = {0,-1}', () => {
    const r = perpCW({ x: 1, y: 0 });
    expect(r.x).toBe(0);
    expect(r.y).toBe(-1);
  });

  it('perpCW({0,1}) = {1,0}', () => {
    const r = perpCW({ x: 0, y: 1 });
    expect(r.x).toBe(1);
    expect(r.y).toBeCloseTo(0, 10);
  });
});

describe('perpCCW', () => {
  it('perpCCW({1,0}) = {0,1}', () => {
    const r = perpCCW({ x: 1, y: 0 });
    expect(r.x).toBeCloseTo(0, 10);
    expect(r.y).toBe(1);
  });

  it('perpCCW({0,1}) = {-1,0}', () => {
    const r = perpCCW({ x: 0, y: 1 });
    expect(r.x).toBe(-1);
    expect(r.y).toBe(0);
  });
});

describe('negate', () => {
  it('negates both components', () => {
    const r = negate({ x: 3, y: -4 });
    expect(r.x).toBe(-3);
    expect(r.y).toBe(4);
  });

  it('negating zero returns zero', () => {
    const r = negate({ x: 0, y: 0 });
    expect(r.x).toBeCloseTo(0, 10);
    expect(r.y).toBeCloseTo(0, 10);
  });
});

describe('fromAngle', () => {
  it('fromAngle(0) = {1,0}', () => {
    const r = fromAngle(0);
    expect(r.x).toBeCloseTo(1, 5);
    expect(r.y).toBeCloseTo(0, 5);
  });

  it('fromAngle(PI/2) approximately {0,1}', () => {
    const r = fromAngle(PI / 2);
    expect(r.x).toBeCloseTo(0, 5);
    expect(r.y).toBeCloseTo(1, 5);
  });

  it('fromAngle(PI) approximately {-1,0}', () => {
    const r = fromAngle(PI);
    expect(r.x).toBeCloseTo(-1, 5);
    expect(r.y).toBeCloseTo(0, 5);
  });
});

describe('purity (no mutation)', () => {
  it('add does not mutate inputs', () => {
    const a = { x: 1, y: 2 };
    const b = { x: 3, y: 4 };
    add(a, b);
    expect(a.x).toBe(1);
    expect(a.y).toBe(2);
    expect(b.x).toBe(3);
    expect(b.y).toBe(4);
  });

  it('scale does not mutate input', () => {
    const v = { x: 3, y: 4 };
    scale(v, 10);
    expect(v.x).toBe(3);
    expect(v.y).toBe(4);
  });

  it('rotate does not mutate input', () => {
    const v = { x: 1, y: 0 };
    rotate(v, PI / 2);
    expect(v.x).toBe(1);
    expect(v.y).toBe(0);
  });

  it('normalize does not mutate input', () => {
    const v = { x: 3, y: 4 };
    normalize(v);
    expect(v.x).toBe(3);
    expect(v.y).toBe(4);
  });
});
