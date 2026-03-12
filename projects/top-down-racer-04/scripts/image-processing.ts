import sharp from 'sharp';
import type { SpritesheetDescriptor, SpritesheetFrame } from './types';

/** Maximum input image size to prevent memory issues. */
const MAX_INPUT_PIXELS = 4096 * 4096;

const TOLERANCE_INNER = 30; // Below = fully transparent
const TOLERANCE_OUTER = 80; // Above = fully opaque; between = gradient alpha

/**
 * Auto-detect background color by sampling corner pixels.
 * Returns median R, G, B from the four corners.
 */
function detectBackgroundColor(
  data: Buffer,
  width: number,
): { r: number; g: number; b: number } {
  const corners = [
    0, // top-left
    (width - 1) * 4, // top-right
    (width * (width - 1)) * 4, // bottom-left (assumes square)
    (width * width - 1) * 4, // bottom-right
  ];

  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  for (const i of corners) {
    rs.push(data[i]);
    gs.push(data[i + 1]);
    bs.push(data[i + 2]);
  }

  // Use median to be robust against one corner touching the sprite
  const median = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return Math.round((sorted[1] + sorted[2]) / 2);
  };

  return { r: median(rs), g: median(gs), b: median(bs) };
}

/**
 * Two-pass chroma-key removal with soft alpha ramp and color decontamination.
 *
 * Auto-detects the background color from corner pixels (the API doesn't
 * produce exact #FF00FF — the actual color varies per generation).
 *
 * Pass 1: Compute alpha from color distance to detected background.
 * Pass 2: Remove color spill from semi-transparent edge pixels.
 *
 * MUST be called at full resolution BEFORE resizing to avoid color bleed
 * from interpolation.
 */
export async function chromaKeyRemove(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bg = detectBackgroundColor(data, info.width);
  console.log(`    Detected background color: R=${bg.r} G=${bg.g} B=${bg.b}`);

  // Pass 1 — Soft alpha from color distance
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.sqrt((r - bg.r) ** 2 + (g - bg.g) ** 2 + (b - bg.b) ** 2);

    if (dist <= TOLERANCE_INNER) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0; // fully transparent
    } else if (dist < TOLERANCE_OUTER) {
      data[i + 3] = Math.round(
        ((dist - TOLERANCE_INNER) / (TOLERANCE_OUTER - TOLERANCE_INNER)) * 255,
      );
    }
    // else: fully opaque, leave unchanged
  }

  // Pass 2 — Color decontamination (remove background spill from semi-transparent pixels)
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 0 && alpha < 255) {
      const a = alpha / 255;
      data[i] = Math.round(Math.max(0, Math.min(255, (data[i] - bg.r * (1 - a)) / a)));
      data[i + 1] = Math.round(Math.max(0, Math.min(255, (data[i + 1] - bg.g * (1 - a)) / a)));
      data[i + 2] = Math.round(Math.max(0, Math.min(255, (data[i + 2] - bg.b * (1 - a)) / a)));
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

/** Resize image to target dimensions using lanczos3 kernel. */
export async function resizeAsset(
  buffer: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .resize(width, height, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

/** Extract a region then resize — used for curb texture. */
export async function cropAndResize(
  buffer: Buffer,
  cropRegion: { left: number; top: number; width: number; height: number },
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .extract(cropRegion)
    .resize(width, height, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

/** Optimize a PNG: max compression, strip metadata (Sharp default). */
export async function optimizePng(inputPath: string, outputPath: string): Promise<void> {
  await sharp(inputPath, { limitInputPixels: MAX_INPUT_PIXELS })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);
}

/**
 * Build a sprite atlas from input images arranged in a grid.
 * Each cell is `cellWidth × cellHeight`. Padding is added per edge (between and around sprites).
 */
export async function buildAtlas(
  inputPaths: string[],
  outputPath: string,
  cols: number,
  rows: number,
  cellWidth: number,
  cellHeight: number,
  padding: number = 2,
): Promise<{ width: number; height: number }> {
  // Each sprite gets `padding` px on every edge → gap between sprites is 2*padding
  const atlasWidth = cols * (cellWidth + 2 * padding);
  const atlasHeight = rows * (cellHeight + 2 * padding);

  const composites = inputPaths.map((inputPath, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      input: inputPath,
      top: padding + row * (cellHeight + 2 * padding),
      left: padding + col * (cellWidth + 2 * padding),
    };
  });

  await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4 as const,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);

  return { width: atlasWidth, height: atlasHeight };
}

/** Generate a PixiJS Spritesheet JSON descriptor for a grid atlas. */
export function generateSpritesheetJson(
  frameNames: string[],
  cols: number,
  cellWidth: number,
  cellHeight: number,
  padding: number,
  atlasWidth: number,
  atlasHeight: number,
  atlasImageFilename: string,
): SpritesheetDescriptor {
  const frames: Record<string, SpritesheetFrame> = {};
  for (let i = 0; i < frameNames.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    frames[frameNames[i]] = {
      frame: {
        x: padding + col * (cellWidth + 2 * padding),
        y: padding + row * (cellHeight + 2 * padding),
        w: cellWidth,
        h: cellHeight,
      },
      trimmed: false,
      sourceSize: { w: cellWidth, h: cellHeight },
      spriteSourceSize: { x: 0, y: 0, w: cellWidth, h: cellHeight },
    };
  }

  return {
    frames,
    meta: {
      image: atlasImageFilename,
      format: 'RGBA8888',
      size: { w: atlasWidth, h: atlasHeight },
      scale: '1',
    },
  };
}

/** Validate output dimensions and alpha channel against expectations. */
export async function validateOutput(
  buffer: Buffer,
  expectedWidth: number,
  expectedHeight: number,
  expectAlpha: boolean,
): Promise<{ valid: boolean; width: number; height: number; hasAlpha: boolean }> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const hasAlpha = meta.hasAlpha ?? false;

  const valid =
    width === expectedWidth &&
    height === expectedHeight &&
    (expectAlpha ? hasAlpha : true); // non-alpha assets don't need alpha check

  return { valid, width, height, hasAlpha };
}
