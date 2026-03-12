import { buildTrack } from '../src/engine/track';
import { TRACK_03_CONTROL_POINTS } from '../src/tracks/track03';
import type { Vec2 } from '../src/engine/types';

const track = buildTrack(TRACK_03_CONTROL_POINTS, 30);

function dist(a: Vec2, b: Vec2) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

function segmentsIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
  const d1 = { x: p2.x - p1.x, y: p2.y - p1.y };
  const d2 = { x: p4.x - p3.x, y: p4.y - p3.y };
  const denom = cross(d1, d2);
  if (Math.abs(denom) < 1e-12) return false;
  const d3 = { x: p3.x - p1.x, y: p3.y - p1.y };
  const t = cross(d3, d2) / denom;
  const u = cross(d3, d1) / denom;
  const eps = 1e-6;
  return t > eps && t < 1 - eps && u > eps && u < 1 - eps;
}

const INTERSECTION_SKIP = 3;
const GAP_SKIP = 15;

function findIntersections(name: string, boundary: readonly Vec2[]) {
  const n = boundary.length - 1;
  let count = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + INTERSECTION_SKIP; j < n; j++) {
      if (n - j + i < INTERSECTION_SKIP) continue;
      if (segmentsIntersect(boundary[i], boundary[i + 1], boundary[j], boundary[j + 1])) {
        count++;
        const midA = { x: (boundary[i].x + boundary[i+1].x) / 2, y: (boundary[i].y + boundary[i+1].y) / 2 };
        const midB = { x: (boundary[j].x + boundary[j+1].x) / 2, y: (boundary[j].y + boundary[j+1].y) / 2 };
        console.log(`${name} INTERSECTION #${count}: segs ${i}×${j} of ${n}`);
        console.log(`  A: (${midA.x.toFixed(0)}, ${midA.y.toFixed(0)}) [${((i/n)*100).toFixed(0)}%]`);
        console.log(`  B: (${midB.x.toFixed(0)}, ${midB.y.toFixed(0)}) [${((j/n)*100).toFixed(0)}%]`);
      }
    }
  }
  if (count === 0) console.log(`${name}: no self-intersections ✓`);
}

function findMinGap(name: string, boundary: readonly Vec2[]) {
  const n = boundary.length - 1;
  let minD = Infinity, minI = 0, minJ = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + GAP_SKIP; j < n; j++) {
      if (n - j + i < GAP_SKIP) continue;
      const d = dist(boundary[i], boundary[j]);
      if (d < minD) { minD = d; minI = i; minJ = j; }
    }
  }
  const status = minD > 10 ? '✓' : '✗ FAIL';
  console.log(`${name} min gap: ${minD.toFixed(2)} ${status} at ${minI}/${minJ} of ${n}`);
  console.log(`  A: (${boundary[minI].x.toFixed(0)}, ${boundary[minI].y.toFixed(0)}) [${((minI/n)*100).toFixed(0)}%]`);
  console.log(`  B: (${boundary[minJ].x.toFixed(0)}, ${boundary[minJ].y.toFixed(0)}) [${((minJ/n)*100).toFixed(0)}%]`);
}

console.log(`Track 03: ${TRACK_03_CONTROL_POINTS.length} CPs, ${track.innerBoundary.length} boundary pts\n`);
findIntersections('Inner', track.innerBoundary);
findMinGap('Inner', track.innerBoundary);
console.log();
findIntersections('Outer', track.outerBoundary);
findMinGap('Outer', track.outerBoundary);
