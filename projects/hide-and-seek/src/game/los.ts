/**
 * Symmetric shadowcasting FOV (Albert Ford).
 * Rational arithmetic — zero floating point in slope comparisons.
 * All slopes represented as inline (num, den) pairs — zero object allocations.
 * Reference: albertford.com/shadowcasting/
 */

/** Quadrant transform: maps (row, col) → absolute (x, y). */
type Transform = (originX: number, originY: number, row: number, col: number) => [number, number];

const TRANSFORMS: Transform[] = [
  (ox, oy, row, col) => [ox + col, oy - row], // North
  (ox, oy, row, col) => [ox + col, oy + row], // South
  (ox, oy, row, col) => [ox + row, oy + col], // East
  (ox, oy, row, col) => [ox - row, oy + col], // West
];

// Slope comparisons via cross-multiplication (integer only, zero floats).
// a/b < c/d → a*d < c*b
function slopeLt(aNum: number, aDen: number, bNum: number, bDen: number): boolean {
  return aNum * bDen < bNum * aDen;
}
function slopeGe(aNum: number, aDen: number, bNum: number, bDen: number): boolean {
  return aNum * bDen >= bNum * aDen;
}
function slopeGt(aNum: number, aDen: number, bNum: number, bDen: number): boolean {
  return aNum * bDen > bNum * aDen;
}

// Stack stored as flat number array: [row, startNum, startDen, endNum, endDen, ...]
// Stride of 5 per entry. Avoids object allocation entirely.
const STACK_STRIDE = 5;
const scanStack = new Float64Array(256 * STACK_STRIDE); // max 256 entries
let stackTop = 0;

function stackPush(row: number, sNum: number, sDen: number, eNum: number, eDen: number): void {
  const i = stackTop * STACK_STRIDE;
  scanStack[i] = row;
  scanStack[i + 1] = sNum;
  scanStack[i + 2] = sDen;
  scanStack[i + 3] = eNum;
  scanStack[i + 4] = eDen;
  stackTop++;
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
  startSlopeNum: number, startSlopeDen: number,
  endSlopeNum: number, endSlopeDen: number,
): void {
  stackTop = 0;
  stackPush(startRow, startSlopeNum, startSlopeDen, endSlopeNum, endSlopeDen);

  while (stackTop > 0) {
    stackTop--;
    const si = stackTop * STACK_STRIDE;
    const row = scanStack[si] as number;
    const startNum = scanStack[si + 1] as number;
    const startDen = scanStack[si + 2] as number;
    const endNum = scanStack[si + 3] as number;
    const endDen = scanStack[si + 4] as number;

    if (row > range) continue;

    let minCol = Math.round((row * startNum / startDen) - 0.5);
    if (minCol < -row) minCol = -row;
    const maxCol = row;

    let prevBlocked = false;
    let curStartNum = startNum;
    let curStartDen = startDen;

    for (let col = minCol; col <= maxCol; col++) {
      const tileStartNum = 2 * col - 1;
      const tileDen = 2 * row; // shared denominator for tileStart and tileEnd
      const tileEndNum = 2 * col + 1;

      if (slopeLt(tileEndNum, tileDen, startNum, startDen)) continue;
      if (slopeGt(tileStartNum, tileDen, endNum, endDen)) break;

      const [absX, absY] = transform(originX, originY, row, col);

      // Skip out-of-bounds without modifying shadow state
      if (absX < 0 || absX >= width || absY < 0 || absY >= height) continue;

      const blocked = isBlocking(absX, absY);

      if (blocked) {
        output[absY * width + absX] = 1;
      } else {
        // Floor: visible if center (col/row) is within [start, end]
        if (slopeGe(col, row, startNum, startDen) && !slopeGt(col, row, endNum, endDen)) {
          output[absY * width + absX] = 1;
        }
      }

      if (!blocked && prevBlocked) {
        curStartNum = 2 * col - 1;
        curStartDen = tileDen;
      }

      if (blocked) {
        if (!prevBlocked) {
          stackPush(row + 1, curStartNum, curStartDen, 2 * col - 1, tileDen);
        }
        prevBlocked = true;
      } else {
        prevBlocked = false;
      }
    }

    if (!prevBlocked) {
      stackPush(row + 1, curStartNum, curStartDen, endNum, endDen);
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
  if (originX >= 0 && originX < width && originY >= 0 && originY < height) {
    output[originY * width + originX] = 1;
  }

  for (const transform of TRANSFORMS) {
    scanQuadrant(
      originX, originY, range,
      isBlocking, output, width, height,
      transform, 1, -1, 1, 1, 1,
    );
  }
}
