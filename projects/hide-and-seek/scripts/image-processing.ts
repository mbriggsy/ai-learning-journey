import sharp from 'sharp';
import * as fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const MAX_INPUT_PIXELS = 4096 * 4096;

// ---------------------------------------------------------------------------
// Two-stage pixel art downscale
// ---------------------------------------------------------------------------

/**
 * Two-stage downscale optimized for pixel art:
 * Stage 1: LANCZOS from source to intermediate (intelligent detail merge)
 * Stage 2: NEAREST from intermediate to target (preserve pixel edges)
 *
 * The intermediate size is 4x the target — sweet spot for pixel art.
 */
export async function downscalePixelArt(
  buffer: Buffer,
  targetWidth: number,
  targetHeight: number,
): Promise<Buffer> {
  const intermediateWidth = targetWidth * 4;
  const intermediateHeight = targetHeight * 4;

  // Stage 1: LANCZOS to intermediate
  const intermediate = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .resize(intermediateWidth, intermediateHeight, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  // Stage 2: NEAREST to final
  return sharp(intermediate, { limitInputPixels: MAX_INPUT_PIXELS })
    .resize(targetWidth, targetHeight, { kernel: sharp.kernel.nearest })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Chroma-key background removal
// ---------------------------------------------------------------------------

/**
 * Remove magenta (#FF00FF) background with tolerance.
 * Pixels within tolerance become transparent, fringe pixels get gradient alpha,
 * then binary alpha cleanup snaps everything to opaque or transparent.
 */
export async function chromaKey(
  buffer: Buffer,
  bgColor: { r: number; g: number; b: number } = { r: 255, g: 0, b: 255 },
  tolerance: number = 30,
): Promise<Buffer> {
  const { data, info } = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const outerTolerance = tolerance * 2.5;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;

    const dist = Math.sqrt(
      (r - bgColor.r) ** 2 +
      (g - bgColor.g) ** 2 +
      (b - bgColor.b) ** 2,
    );

    if (dist <= tolerance) {
      data[i + 3] = 0;
    } else if (dist < outerTolerance) {
      const alpha = Math.round(((dist - tolerance) / (outerTolerance - tolerance)) * 255);
      data[i + 3] = alpha;
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Binary alpha cleanup
// ---------------------------------------------------------------------------

/**
 * Snap semi-transparent pixels to fully opaque or fully transparent.
 * Threshold: >= 128 -> 255 (opaque), < 128 -> 0 (transparent).
 */
export async function cleanAlpha(buffer: Buffer, threshold: number = 128): Promise<Buffer> {
  const { data, info } = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 3; i < data.length; i += 4) {
    data[i] = data[i]! >= threshold ? 255 : 0;
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Palette enforcement
// ---------------------------------------------------------------------------

/**
 * Quantize all opaque pixels to the nearest color in the master palette.
 * No dithering — pixel art must have flat solid colors.
 */
export async function enforcePalette(
  buffer: Buffer,
  paletteColors: readonly { r: number; g: number; b: number }[],
): Promise<Buffer> {
  const { data, info } = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]!;
    if (alpha === 0) continue;

    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;

    let bestDist = Infinity;
    let bestR = r;
    let bestG = g;
    let bestB = b;

    for (const c of paletteColors) {
      const dist = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        bestR = c.r;
        bestG = c.g;
        bestB = c.b;
      }
    }

    data[i] = bestR;
    data[i + 1] = bestG;
    data[i + 2] = bestB;
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Palette loading
// ---------------------------------------------------------------------------

export interface MasterPalette {
  colors: Record<string, string>;
}

export function loadPaletteColors(palettePath: string): { r: number; g: number; b: number }[] {
  const palette = JSON.parse(fs.readFileSync(palettePath, 'utf-8')) as MasterPalette;
  return Object.values(palette.colors)
    .filter((hex) => hex !== '#FF00FF') // Exclude chroma-key
    .map((hex) => ({
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    }));
}

// ---------------------------------------------------------------------------
// Tile extrusion
// ---------------------------------------------------------------------------

/**
 * Extrude tiles in a tileset image by duplicating 1px border around each tile.
 * Prevents tile bleed at sub-pixel camera positions in WebGL.
 */
export function extrudeTileset(
  inputPath: string,
  tileWidth: number,
  tileHeight: number,
  outputPath: string,
): void {
  // On Windows, npx must run through cmd.exe shell
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    execFileSync('cmd', ['/c', 'npx', 'tile-extruder',
      '--tileWidth', String(tileWidth),
      '--tileHeight', String(tileHeight),
      '--input', inputPath,
      '--output', outputPath,
    ], { stdio: 'pipe' });
  } else {
    execFileSync('npx', [
      'tile-extruder',
      '--tileWidth', String(tileWidth),
      '--tileHeight', String(tileHeight),
      '--input', inputPath,
      '--output', outputPath,
    ], { stdio: 'pipe' });
  }
}

// ---------------------------------------------------------------------------
// Multi-tile slicing
// ---------------------------------------------------------------------------

/**
 * Slice a multi-tile sprite into individual tile-sized pieces.
 * Returns array of { buffer, name } for each slice.
 */
export async function sliceMultiTile(
  buffer: Buffer,
  sliceWidth: number,
  sliceHeight: number,
  baseName: string,
): Promise<{ buffer: Buffer; name: string }[]> {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) throw new Error('Cannot read image metadata');

  const cols = Math.floor(meta.width / sliceWidth);
  const rows = Math.floor(meta.height / sliceHeight);
  const slices: { buffer: Buffer; name: string }[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const sliceBuffer = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
        .extract({
          left: col * sliceWidth,
          top: row * sliceHeight,
          width: sliceWidth,
          height: sliceHeight,
        })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      slices.push({
        buffer: sliceBuffer,
        name: `${baseName}-r${row}c${col}.png`,
      });
    }
  }

  return slices;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export async function getImageInfo(buffer: Buffer): Promise<{
  width: number;
  height: number;
  channels: number;
  hasAlpha: boolean;
  size: number;
}> {
  const meta = await sharp(buffer).metadata();
  return {
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    channels: meta.channels ?? 0,
    hasAlpha: meta.hasAlpha ?? false,
    size: buffer.length,
  };
}

export async function countColors(buffer: Buffer): Promise<number> {
  const { data } = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const colors = new Set<string>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! === 0) continue;
    colors.add(`${data[i]!},${data[i + 1]!},${data[i + 2]!}`);
  }
  return colors.size;
}

export async function countSemiTransparent(buffer: Buffer): Promise<number> {
  const { data } = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let count = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i]!;
    if (a > 0 && a < 255) count++;
  }
  return count;
}

export async function opaquePercentage(buffer: Buffer): Promise<number> {
  const { data } = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let opaque = 0;
  const total = data.length / 4;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! === 255) opaque++;
  }
  return (opaque / total) * 100;
}

export async function countOffPaletteColors(
  buffer: Buffer,
  paletteColors: readonly { r: number; g: number; b: number }[],
): Promise<number> {
  const { data } = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const paletteSet = new Set(paletteColors.map((c) => `${c.r},${c.g},${c.b}`));
  let offPalette = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! === 0) continue;
    const key = `${data[i]!},${data[i + 1]!},${data[i + 2]!}`;
    if (!paletteSet.has(key)) offPalette++;
  }

  return offPalette;
}
