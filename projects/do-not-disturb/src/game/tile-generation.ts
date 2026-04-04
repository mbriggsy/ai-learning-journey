import type { SurfaceType } from '../types/state';
import { AREA_PALETTES, hexToRgb } from './color-palettes';

export type TileSpec = {
  readonly surface: SurfaceType;
  readonly area: keyof typeof AREA_PALETTES;
  readonly pattern: 'planks' | 'carpet-pattern' | 'checkerboard' | 'stone';
};

export type RGBA = { r: number; g: number; b: number; a: number };

export const TILE_SPECS: readonly TileSpec[] = [
  // Guest floors — carpet
  { surface: 'carpet', area: 'floors', pattern: 'carpet-pattern' },
  // Guest floors — wood planks
  { surface: 'wood', area: 'floors', pattern: 'planks' },
  // Lobby — tile
  { surface: 'tile', area: 'lobby', pattern: 'checkerboard' },
  // Basement — stone
  { surface: 'wood', area: 'basement', pattern: 'stone' },
  // Attic — wood
  { surface: 'wood', area: 'attic', pattern: 'planks' },
];

/**
 * Generate pixel data for a tile.
 * Returns flat RGBA array (size * size * 4 bytes).
 * Pure function — no Sharp or filesystem dependency.
 */
export function generateTilePixels(
  spec: TileSpec,
  size: number,
): Uint8Array {
  const palette = AREA_PALETTES[spec.area];
  const primary = hexToRgb(palette.primary);
  const shadow = hexToRgb(palette.shadow);
  const accent = hexToRgb(palette.accent);
  const pixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const color = getPatternColor(spec.pattern, x, y, size, primary, shadow, accent);
      pixels[idx] = color.r;
      pixels[idx + 1] = color.g;
      pixels[idx + 2] = color.b;
      pixels[idx + 3] = color.a;
    }
  }

  return pixels;
}

type RGB = { r: number; g: number; b: number };

function getPatternColor(
  pattern: TileSpec['pattern'],
  x: number,
  y: number,
  size: number,
  primary: RGB,
  shadow: RGB,
  accent: RGB,
): RGBA {
  switch (pattern) {
    case 'planks': {
      // Horizontal planks with seam lines
      const plankHeight = Math.floor(size / 4);
      const isSeam = y % plankHeight === 0;
      if (isSeam) return { ...shadow, a: 255 };
      // Alternate plank shade
      const plankIndex = Math.floor(y / plankHeight);
      return plankIndex % 2 === 0
        ? { ...primary, a: 255 }
        : { r: Math.floor(primary.r * 0.85), g: Math.floor(primary.g * 0.85), b: Math.floor(primary.b * 0.85), a: 255 };
    }
    case 'carpet-pattern': {
      // Diamond pattern
      const cx = x % 8;
      const cy = y % 8;
      const isDiamond = Math.abs(cx - 4) + Math.abs(cy - 4) <= 3;
      return isDiamond
        ? { ...accent, a: 255 }
        : { ...primary, a: 255 };
    }
    case 'checkerboard': {
      const tileSize = Math.floor(size / 4);
      const tx = Math.floor(x / tileSize);
      const ty = Math.floor(y / tileSize);
      return (tx + ty) % 2 === 0
        ? { ...primary, a: 255 }
        : { ...shadow, a: 255 };
    }
    case 'stone': {
      // Rough stone with variation
      const noise = ((x * 7 + y * 13) % 17) / 17;
      const blend = 0.7 + noise * 0.3;
      return {
        r: Math.floor(primary.r * blend),
        g: Math.floor(primary.g * blend),
        b: Math.floor(primary.b * blend),
        a: 255,
      };
    }
  }
}
