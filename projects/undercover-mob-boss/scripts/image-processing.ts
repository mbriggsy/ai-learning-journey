import sharp from 'sharp';

const MAX_INPUT_PIXELS = 4096 * 4096;
const TOLERANCE_INNER = 30; // Below = fully transparent
const TOLERANCE_OUTER = 80; // Above = fully opaque; between = gradient alpha

/**
 * Auto-detect background color by sampling corner pixels.
 * Returns median R, G, B from the four corners.
 *
 * Ported from racer-04. The Imagen 4 API does not produce exact #FF00FF —
 * the actual magenta varies per generation, so we detect empirically.
 */
function detectBackgroundColor(
  data: Buffer,
  width: number,
  height: number,
): { r: number; g: number; b: number } {
  const corners = [
    0,                              // top-left
    (width - 1) * 4,               // top-right
    (width * (height - 1)) * 4,    // bottom-left
    (width * height - 1) * 4,      // bottom-right
  ];

  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  for (const i of corners) {
    rs.push(data[i]);
    gs.push(data[i + 1]);
    bs.push(data[i + 2]);
  }

  const median = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return Math.round((sorted[1] + sorted[2]) / 2);
  };

  return { r: median(rs), g: median(gs), b: median(bs) };
}

/**
 * Two-pass chroma-key removal with soft alpha ramp and color decontamination.
 *
 * Pass 1: Compute alpha from color distance to detected background.
 * Pass 2: Remove color spill from semi-transparent edge pixels.
 *
 * MUST be called at full resolution BEFORE resizing to avoid color bleed.
 */
export async function chromaKeyRemove(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bg = detectBackgroundColor(data, info.width, info.height);
  console.log(`    Detected background color: R=${bg.r} G=${bg.g} B=${bg.b}`);

  // Pass 1 — Soft alpha from color distance
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.sqrt((r - bg.r) ** 2 + (g - bg.g) ** 2 + (b - bg.b) ** 2);

    if (dist <= TOLERANCE_INNER) {
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
    } else if (dist < TOLERANCE_OUTER) {
      data[i + 3] = Math.round(
        ((dist - TOLERANCE_INNER) / (TOLERANCE_OUTER - TOLERANCE_INNER)) * 255,
      );
    }
  }

  // Pass 2 — Color decontamination (remove background spill)
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 0 && alpha < 255) {
      const a = alpha / 255;
      data[i]     = Math.round(Math.max(0, Math.min(255, (data[i]     - bg.r * (1 - a)) / a)));
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

/** Validate output dimensions and alpha channel. */
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
    (expectAlpha ? hasAlpha : true);

  return { valid, width, height, hasAlpha };
}
