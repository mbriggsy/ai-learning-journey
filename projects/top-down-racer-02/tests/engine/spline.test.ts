import { describe, it, expect } from 'vitest';
import {
  catmullRomPoint,
  catmullRomTangent,
  buildArcLengthTable,
  paramAtDistance,
  pointAtDistance,
  tangentAtDistance,
} from '../../src/engine/spline';
import { distance, length, normalize, sub, dot } from '../../src/engine/vec2';
import type { Vec2 } from '../../src/engine/types';

const PI = Math.PI;

/**
 * Helper: generate control points for a rough circle of given radius.
 * Uses 8 points evenly spaced around the circle.
 */
function circlePoints(radius: number, count: number = 8): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * PI * i) / count;
    pts.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return pts;
}

/** Helper: a square of 4 control points. */
function squarePoints(): Vec2[] {
  return [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
}

describe('catmullRomPoint', () => {
  it('returns p1 at t=0', () => {
    const pts = squarePoints();
    const result = catmullRomPoint(pts[0], pts[1], pts[2], pts[3], 0);
    expect(result.x).toBeCloseTo(pts[1].x, 5);
    expect(result.y).toBeCloseTo(pts[1].y, 5);
  });

  it('returns p2 at t=1', () => {
    const pts = squarePoints();
    const result = catmullRomPoint(pts[0], pts[1], pts[2], pts[3], 1);
    expect(result.x).toBeCloseTo(pts[2].x, 5);
    expect(result.y).toBeCloseTo(pts[2].y, 5);
  });

  it('midpoint of collinear points lies between p1 and p2', () => {
    // Evenly spaced collinear points
    const p0: Vec2 = { x: 0, y: 0 };
    const p1: Vec2 = { x: 10, y: 0 };
    const p2: Vec2 = { x: 20, y: 0 };
    const p3: Vec2 = { x: 30, y: 0 };
    const mid = catmullRomPoint(p0, p1, p2, p3, 0.5);
    expect(mid.x).toBeCloseTo(15, 1);
    expect(mid.y).toBeCloseTo(0, 5);
  });

  it('produces a curved result for non-collinear arrangement', () => {
    // If points form a curve, the midpoint should NOT lie on the straight line
    // from p1 to p2 (this verifies the spline actually curves)
    const p0: Vec2 = { x: 0, y: 0 };
    const p1: Vec2 = { x: 5, y: 0 };
    const p2: Vec2 = { x: 10, y: 5 };
    const p3: Vec2 = { x: 10, y: 10 };
    const mid = catmullRomPoint(p0, p1, p2, p3, 0.5);

    // The straight line midpoint would be (7.5, 2.5)
    const straightMid = { x: 7.5, y: 2.5 };
    const distFromStraight = distance(mid, straightMid);
    // The spline midpoint should deviate from the straight line
    // (It won't be exactly on the line unless the control points are collinear)
    expect(distFromStraight).toBeGreaterThan(0.01);
  });
});

describe('catmullRomTangent', () => {
  it('tangent at t=0 on collinear points is in the p1->p2 direction', () => {
    const p0: Vec2 = { x: 0, y: 0 };
    const p1: Vec2 = { x: 10, y: 0 };
    const p2: Vec2 = { x: 20, y: 0 };
    const p3: Vec2 = { x: 30, y: 0 };
    const tan = catmullRomTangent(p0, p1, p2, p3, 0);
    // Should point in +x direction
    const n = normalize(tan);
    expect(n.x).toBeCloseTo(1, 3);
    expect(n.y).toBeCloseTo(0, 3);
  });

  it('tangent has non-zero length for non-degenerate points', () => {
    const pts = squarePoints();
    const tan = catmullRomTangent(pts[0], pts[1], pts[2], pts[3], 0.5);
    expect(length(tan)).toBeGreaterThan(0.01);
  });

  it('tangent at t=0 roughly points from p0 toward p2 (Catmull-Rom property)', () => {
    const pts = squarePoints();
    // For Catmull-Rom, tangent at p1 is proportional to (p2 - p0)
    const tan = catmullRomTangent(pts[0], pts[1], pts[2], pts[3], 0);
    const expected = normalize(sub(pts[2], pts[0]));
    const actual = normalize(tan);
    // Dot product should be strongly positive (same direction)
    expect(dot(actual, expected)).toBeGreaterThan(0.5);
  });
});

describe('buildArcLengthTable', () => {
  it('total length of a circle approximation is close to 2*PI*r', () => {
    const r = 100;
    const pts = circlePoints(r, 16);
    const table = buildArcLengthTable(pts, 50);
    const expectedCircumference = 2 * PI * r;
    // Spline through circle points should approximate circumference
    // Allow 5% error since spline is not a perfect circle
    expect(table.totalLength).toBeCloseTo(expectedCircumference, -1);
    expect(Math.abs(table.totalLength - expectedCircumference) / expectedCircumference).toBeLessThan(0.05);
  });

  it('lengths array is monotonically increasing', () => {
    const pts = circlePoints(50);
    const table = buildArcLengthTable(pts);
    for (let i = 1; i < table.lengths.length; i++) {
      expect(table.lengths[i]).toBeGreaterThanOrEqual(table.lengths[i - 1]);
    }
  });

  it('params array is monotonically increasing', () => {
    const pts = circlePoints(50);
    const table = buildArcLengthTable(pts);
    for (let i = 1; i < table.params.length; i++) {
      expect(table.params[i]).toBeGreaterThanOrEqual(table.params[i - 1]);
    }
  });

  it('first entry is 0 length at param 0', () => {
    const pts = squarePoints();
    const table = buildArcLengthTable(pts);
    expect(table.lengths[0]).toBe(0);
    expect(table.params[0]).toBe(0);
  });

  it('last param equals number of segments (closed loop)', () => {
    const pts = squarePoints();
    const table = buildArcLengthTable(pts);
    const lastParam = table.params[table.params.length - 1];
    expect(lastParam).toBeCloseTo(pts.length, 5);
  });
});

describe('paramAtDistance', () => {
  it('param at distance 0 is 0', () => {
    const pts = circlePoints(50);
    const table = buildArcLengthTable(pts);
    expect(paramAtDistance(table, 0)).toBeCloseTo(0, 5);
  });

  it('wrapping: distance beyond totalLength wraps to start', () => {
    const pts = circlePoints(50);
    const table = buildArcLengthTable(pts);
    const d = 10;
    const paramNormal = paramAtDistance(table, d);
    const paramWrapped = paramAtDistance(table, table.totalLength + d);
    expect(paramWrapped).toBeCloseTo(paramNormal, 3);
  });

  it('negative distance wraps correctly', () => {
    const pts = circlePoints(50);
    const table = buildArcLengthTable(pts);
    const d = 10;
    const paramNormal = paramAtDistance(table, table.totalLength - d);
    const paramNeg = paramAtDistance(table, -d);
    expect(paramNeg).toBeCloseTo(paramNormal, 3);
  });

  it('param at half the total length is approximately half the total param', () => {
    const pts = circlePoints(50, 8);
    const table = buildArcLengthTable(pts, 20);
    const halfDist = table.totalLength / 2;
    const param = paramAtDistance(table, halfDist);
    // For a circle, half the arc length should give roughly half the param range
    expect(param).toBeCloseTo(pts.length / 2, 0);
  });
});

describe('pointAtDistance', () => {
  it('closed loop: distance 0 and distance totalLength return the same point', () => {
    const pts = circlePoints(50);
    const table = buildArcLengthTable(pts);
    const p0 = pointAtDistance(pts, table, 0);
    const pTotal = pointAtDistance(pts, table, table.totalLength);
    expect(p0.x).toBeCloseTo(pTotal.x, 3);
    expect(p0.y).toBeCloseTo(pTotal.y, 3);
  });

  it('arc-length uniformity: equal distances produce roughly equal spacing', () => {
    const pts = circlePoints(100, 12);
    const table = buildArcLengthTable(pts, 40);

    // Sample 20 equally-spaced points by arc length
    const numSamples = 20;
    const step = table.totalLength / numSamples;
    const sampledPoints: Vec2[] = [];
    for (let i = 0; i < numSamples; i++) {
      sampledPoints.push(pointAtDistance(pts, table, i * step));
    }

    // Measure distances between consecutive sampled points
    const spacings: number[] = [];
    for (let i = 0; i < numSamples; i++) {
      const next = (i + 1) % numSamples;
      spacings.push(distance(sampledPoints[i], sampledPoints[next]));
    }

    // All spacings should be roughly equal (within 15% of the mean)
    const meanSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
    for (const s of spacings) {
      const deviation = Math.abs(s - meanSpacing) / meanSpacing;
      expect(deviation).toBeLessThan(0.15);
    }
  });

  it('point at distance 0 is near the first control point', () => {
    const pts = circlePoints(50);
    const table = buildArcLengthTable(pts);
    const p = pointAtDistance(pts, table, 0);
    // Distance 0 starts at p1 of segment 0, which is controlPoints[0]
    expect(distance(p, pts[0])).toBeLessThan(1);
  });
});

describe('tangentAtDistance', () => {
  it('tangent has non-zero length', () => {
    const pts = circlePoints(50);
    const table = buildArcLengthTable(pts);
    const tan = tangentAtDistance(pts, table, 10);
    expect(length(tan)).toBeGreaterThan(0.01);
  });

  it('tangent is roughly perpendicular to radius at each point on a circle', () => {
    const r = 100;
    const pts = circlePoints(r, 16);
    const table = buildArcLengthTable(pts, 50);

    // Test at several distances
    for (let i = 1; i <= 8; i++) {
      const d = (table.totalLength * i) / 10;
      const point = pointAtDistance(pts, table, d);
      const tan = tangentAtDistance(pts, table, d);

      // Radius vector from center (0,0) to point
      const radiusDir = normalize(point);
      const tangentDir = normalize(tan);

      // Dot product of radius and tangent should be near zero (perpendicular)
      const dotVal = Math.abs(dot(radiusDir, tangentDir));
      expect(dotVal).toBeLessThan(0.15);
    }
  });
});
