import type { PathPoint } from '../../types/ai.js';

/**
 * Bresenham line-of-sight check between two tile coordinates.
 * Returns true if no blocking tile is encountered.
 */
export function hasLineOfSight(
  x0: number, y0: number,
  x1: number, y1: number,
  isBlocking: (x: number, y: number) => boolean,
): boolean {
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0;
  let cy = y0;

  while (true) {
    if (cx === x1 && cy === y1) return true;
    if (isBlocking(cx, cy)) return false;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
}

/**
 * Greedy LOS string-pulling: remove unnecessary intermediate waypoints.
 * Compute once on path receive, store smoothed result.
 */
export function smoothPath(
  path: PathPoint[] | null | undefined,
  isBlocking: (x: number, y: number) => boolean,
): PathPoint[] {
  if (!path || path.length === 0) return [];
  if (path.length <= 2) return path;

  const smoothed: PathPoint[] = [path[0]!];
  let current = 0;

  while (current < path.length - 1) {
    let furthest = current + 1;
    for (let i = current + 2; i < path.length; i++) {
      if (hasLineOfSight(path[current]!.x, path[current]!.y, path[i]!.x, path[i]!.y, isBlocking)) {
        furthest = i;
      } else {
        break;
      }
    }
    smoothed.push(path[furthest]!);
    current = furthest;
  }

  return smoothed;
}
