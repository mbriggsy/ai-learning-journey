import { describe, it, expect } from 'vitest';
import { checkDetection } from '../../src/game/detection.js';
import { DISPLAY, VISION } from '../../src/constants.js';

const TILE = DISPLAY.TILE_SIZE;
const W = 10; // map width in tiles
const FOV_SIZE = W * W;

function makeFov(visibleTiles: Array<[number, number]>): Uint8Array {
  const fov = new Uint8Array(FOV_SIZE);
  for (const [x, y] of visibleTiles) {
    fov[y * W + x] = 1;
  }
  return fov;
}

describe('checkDetection', () => {
  it('returns none when hider is NOT in FOV', () => {
    const fov = makeFov([]); // nothing visible
    const result = checkDetection(
      5 * TILE + 16, 5 * TILE + 16,  // seeker center of tile (5,5)
      7 * TILE + 16, 7 * TILE + 16,  // hider center of tile (7,7)
      fov, W,
    );
    expect(result).toBe('none');
  });

  it('returns spotted when hider is in FOV but beyond proximity', () => {
    // Hider at tile (7,5), seeker at tile (5,5) — 2 tiles apart
    const fov = makeFov([[7, 5]]);
    const result = checkDetection(
      5 * TILE + 16, 5 * TILE + 16,
      7 * TILE + 16, 5 * TILE + 16,
      fov, W,
    );
    expect(result).toBe('spotted');
  });

  it('returns found when hider is in FOV AND within proximity', () => {
    // Same tile — 0 distance
    const fov = makeFov([[5, 5]]);
    const result = checkDetection(
      5 * TILE + 16, 5 * TILE + 16,
      5 * TILE + 20, 5 * TILE + 20, // very close, same tile
      fov, W,
    );
    expect(result).toBe('found');
  });

  it('returns found at exactly PROXIMITY_THRESHOLD distance', () => {
    // PROXIMITY_THRESHOLD is 1.5 tiles
    // Place hider 1.5 tiles to the right
    const hiderTileX = 5 + Math.floor(VISION.PROXIMITY_THRESHOLD);
    const fov = makeFov([[hiderTileX, 5]]);

    const seekerPx = 5 * TILE + 16;
    const hiderPx = seekerPx + VISION.PROXIMITY_THRESHOLD * TILE;
    const hiderTile = Math.floor(hiderPx / TILE);

    // Make sure the hider's tile is in FOV
    const fov2 = makeFov([[hiderTile, 5]]);
    const result = checkDetection(
      seekerPx, 5 * TILE + 16,
      hiderPx, 5 * TILE + 16,
      fov2, W,
    );
    expect(result).toBe('found');
  });

  it('returns spotted just beyond proximity threshold', () => {
    const fov = makeFov([[7, 5]]);
    // 2 tiles apart > 1.5 threshold
    const result = checkDetection(
      5 * TILE + 16, 5 * TILE + 16,
      7 * TILE + 16, 5 * TILE + 16,
      fov, W,
    );
    expect(result).toBe('spotted');
  });

  it('returns none for out-of-bounds hider tile', () => {
    const fov = new Uint8Array(FOV_SIZE);
    const result = checkDetection(
      5 * TILE, 5 * TILE,
      -100, -100, // negative pixels → negative tile
      fov, W,
    );
    expect(result).toBe('none');
  });

  it('returns none for hider at map edge (beyond FOV array)', () => {
    const fov = new Uint8Array(FOV_SIZE);
    const result = checkDetection(
      5 * TILE, 5 * TILE,
      (W + 5) * TILE, 5 * TILE, // beyond map width
      fov, W,
    );
    expect(result).toBe('none');
  });
});
