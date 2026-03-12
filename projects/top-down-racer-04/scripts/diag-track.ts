import { buildTrack } from '../src/engine/track';
import { TRACK_03_CONTROL_POINTS } from '../src/tracks/track03';
import type { Vec2 } from '../src/engine/types';

const track = buildTrack(TRACK_03_CONTROL_POINTS, 45);

function dist(a: Vec2, b: Vec2) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

const SKIP = 15;

function diagnose(name: string, boundary: readonly Vec2[]) {
  const n = boundary.length - 1; // match test: excludes closure point
  let minD = Infinity, minI = 0, minJ = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + SKIP; j < n; j++) {
      const d = dist(boundary[i], boundary[j]);
      if (d < minD) { minD = d; minI = i; minJ = j; }
    }
  }
  console.log(`${name} min gap: ${minD.toFixed(2)} at ${minI}/${minJ} of ${n}`);
  console.log(`  A: (${boundary[minI].x.toFixed(0)}, ${boundary[minI].y.toFixed(0)}) [${((minI/n)*100).toFixed(0)}%]`);
  console.log(`  B: (${boundary[minJ].x.toFixed(0)}, ${boundary[minJ].y.toFixed(0)}) [${((minJ/n)*100).toFixed(0)}%]`);
}

diagnose('Inner', track.innerBoundary);
diagnose('Outer', track.outerBoundary);
