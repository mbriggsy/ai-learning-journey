import { describe, it, expect } from 'vitest';
import { generateTilePixels, TILE_SPECS } from '../../src/game/tile-generation';
import type { TileSpec } from '../../src/game/tile-generation';

describe('generateTilePixels', () => {
  it('returns correct buffer size for 32x32 tile', () => {
    const pixels = generateTilePixels(TILE_SPECS[0]!, 32);
    expect(pixels.length).toBe(32 * 32 * 4);
  });

  it('all pixels are fully opaque', () => {
    const pixels = generateTilePixels(TILE_SPECS[0]!, 32);
    for (let i = 3; i < pixels.length; i += 4) {
      expect(pixels[i]).toBe(255);
    }
  });

  it('generates different patterns for different specs', () => {
    const carpet = generateTilePixels(
      { surface: 'carpet', area: 'floors', pattern: 'carpet-pattern' },
      32,
    );
    const checker = generateTilePixels(
      { surface: 'tile', area: 'lobby', pattern: 'checkerboard' },
      32,
    );
    // Pixel data should differ
    let differs = false;
    for (let i = 0; i < carpet.length; i++) {
      if (carpet[i] !== checker[i]) { differs = true; break; }
    }
    expect(differs).toBe(true);
  });

  it('planks have seam lines at plank boundaries', () => {
    const spec: TileSpec = { surface: 'wood', area: 'floors', pattern: 'planks' };
    const size = 32;
    const pixels = generateTilePixels(spec, size);
    // Row 0 should be a seam (shadow color)
    const firstPixel = { r: pixels[0]!, g: pixels[1]!, b: pixels[2]! };
    // Row 1 should be different (primary color)
    const secondRow = (1 * size) * 4;
    const secondPixel = { r: pixels[secondRow]!, g: pixels[secondRow + 1]!, b: pixels[secondRow + 2]! };
    expect(firstPixel).not.toEqual(secondPixel);
  });

  it('checkerboard alternates colors', () => {
    const spec: TileSpec = { surface: 'tile', area: 'lobby', pattern: 'checkerboard' };
    const pixels = generateTilePixels(spec, 32);
    const tileSize = 8; // 32/4
    // Top-left should be one color
    const topLeft = { r: pixels[0]!, g: pixels[1]!, b: pixels[2]! };
    // One tile over should be different
    const nextTile = tileSize * 4;
    const topRight = { r: pixels[nextTile]!, g: pixels[nextTile + 1]!, b: pixels[nextTile + 2]! };
    expect(topLeft).not.toEqual(topRight);
  });

  it('all TILE_SPECS produce valid output', () => {
    for (const spec of TILE_SPECS) {
      const pixels = generateTilePixels(spec, 32);
      expect(pixels.length).toBe(32 * 32 * 4);
    }
  });

  it('deterministic — same input produces same output', () => {
    const a = generateTilePixels(TILE_SPECS[0]!, 32);
    const b = generateTilePixels(TILE_SPECS[0]!, 32);
    expect(a).toEqual(b);
  });
});
