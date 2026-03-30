/**
 * Symmetric shadowcasting FOV (Albert Ford).
 * Rational arithmetic — zero floating point in slope comparisons.
 * Reference: albertford.com/shadowcasting/
 */

/** Rational slope as numerator/denominator pair (avoids floats). */
interface Slope {
  num: number;
  den: number;
}

/** Quadrant transform: maps (row, col) → absolute (x, y). */
type Transform = (originX: number, originY: number, row: number, col: number) => [number, number];

const TRANSFORMS: Transform[] = [
  // North: row goes up
  (ox, oy, row, col) => [ox + col, oy - row],
  // South: row goes down
  (ox, oy, row, col) => [ox + col, oy + row],
  // East: row goes right
  (ox, oy, row, col) => [ox + row, oy + col],
  // West: row goes left
  (ox, oy, row, col) => [ox - row, oy + col],
];

/** a/b < c/d via cross-multiplication (integer only). */
function slopeLess(a: Slope, b: Slope): boolean {
  return a.num * b.den < b.num * a.den;
}

/** a/b >= c/d */
function slopeGe(a: Slope, b: Slope): boolean {
  return a.num * b.den >= b.num * a.den;
}

/** a/b > c/d */
function slopeGt(a: Slope, b: Slope): boolean {
  return a.num * b.den > b.num * a.den;
}

function scanQuadrant(
  originX: number,
  originY: number,
  range: number,
  isBlocking: (x: number, y: number) => boolean,
  output: Uint8Array,
  width: number,
  height: number,
  transform: Transform,
  startRow: number,
  startSlope: Slope,
  endSlope: Slope,
): void {
  // Iterative stack to avoid deep recursion
  const stack: Array<{ row: number; start: Slope; end: Slope }> = [];
  stack.push({ row: startRow, start: startSlope, end: endSlope });

  while (stack.length > 0) {
    const { row, start, end } = stack.pop()!;
    if (row > range) continue;

    // The start column for this row
    // Floor of (row * start.num / start.den + 0.5) — using integer math
    // col_start = ceil(row * start - 0.5) = floor(row * start - 0.5) + 1 if not exact
    // Simplified: minCol = floor((2 * row * start.num - start.den) / (2 * start.den)) + 1
    // But we scan from the theoretical minimum and skip
    let minCol = Math.round((row * start.num / start.den) - 0.5);
    // Clamp: column can't be less than -row
    if (minCol < -row) minCol = -row;

    let maxCol = row; // theoretical max

    let prevBlocked = false;
    let currentStart: Slope = { num: start.num, den: start.den };

    for (let col = minCol; col <= maxCol; col++) {
      // Slopes for this tile
      const tileStart: Slope = { num: 2 * col - 1, den: 2 * row };
      const tileEnd: Slope = { num: 2 * col + 1, den: 2 * row };

      // Skip tiles that are before our start slope
      if (slopeLess(tileEnd, start)) {
        continue;
      }
      // Stop if we've passed our end slope
      if (slopeGt(tileStart, end)) {
        break;
      }

      const [absX, absY] = transform(originX, originY, row, col);

      // Bounds check — skip without modifying shadow state.
      // Treating OOB as walls would create false shadows blocking valid in-bounds tiles.
      if (absX < 0 || absX >= width || absY < 0 || absY >= height) {
        continue;
      }

      const blocked = isBlocking(absX, absY);

      // Visibility check:
      // Floor tiles (not blocking): visible if center is in arc
      // Wall tiles (blocking): visible if any part of diamond overlaps arc
      if (blocked) {
        // Wall: visible if tile range overlaps [start, end]
        // Overlap if tileEnd > start AND tileStart < end
        output[absY * width + absX] = 1;
      } else {
        // Floor: visible if center point (col/row slope) is within [start, end]
        const center: Slope = { num: col, den: row };
        if (slopeGe(center, start) && !slopeGt(center, end)) {
          output[absY * width + absX] = 1;
        }
      }

      if (blocked && !prevBlocked) {
        // Start of a shadow — push sub-scan for the remaining visible portion
        // (will be processed in a later iteration)
      }

      if (!blocked && prevBlocked) {
        // End of a shadow — new start slope for continuing scan
        currentStart = { num: 2 * col - 1, den: 2 * row };
      }

      if (blocked) {
        // Entering or continuing a shadow
        if (!prevBlocked) {
          // This is the first blocked tile — schedule the scan of what's before it
          const newEnd: Slope = { num: 2 * col - 1, den: 2 * row };
          stack.push({ row: row + 1, start: currentStart, end: newEnd });
        }
        prevBlocked = true;
      } else {
        prevBlocked = false;
      }
    }

    // If the last tile in the row wasn't blocked, continue scanning
    if (!prevBlocked) {
      stack.push({ row: row + 1, start: currentStart, end });
    }
  }
}

/**
 * Compute field-of-view from (originX, originY) with given range.
 * Writes 1 into output for visible tiles. Caller must zero the array first.
 */
export function computeFOV(
  originX: number,
  originY: number,
  range: number,
  isBlocking: (x: number, y: number) => boolean,
  output: Uint8Array,
  width: number,
  height: number,
): void {
  // Origin is always visible
  if (originX >= 0 && originX < width && originY >= 0 && originY < height) {
    output[originY * width + originX] = 1;
  }

  const startSlope: Slope = { num: -1, den: 1 };
  const endSlope: Slope = { num: 1, den: 1 };

  for (const transform of TRANSFORMS) {
    scanQuadrant(
      originX, originY, range,
      isBlocking, output, width, height,
      transform,
      1, startSlope, endSlope,
    );
  }
}
