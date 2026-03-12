import sharp from 'sharp';

/** Maximum input image size to prevent memory issues. */
const MAX_INPUT_PIXELS = 4096 * 4096;

// Chroma-key constants (#FF00FF magenta)
const CHROMA_R = 255;
const CHROMA_G = 0;
const CHROMA_B = 255;
const TOLERANCE_INNER = 10; // Below = fully transparent
const TOLERANCE_OUTER = 40; // Above = fully opaque; between = gradient alpha

/**
 * Two-pass chroma-key removal with soft alpha ramp and color decontamination.
 *
 * Pass 1: Compute alpha from color distance to magenta (#FF00FF).
 * Pass 2: Remove magenta spill from semi-transparent edge pixels.
 *
 * MUST be called at full resolution BEFORE resizing to avoid magenta bleed
 * from interpolation.
 */
export async function chromaKeyRemove(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Pass 1 — Soft alpha from color distance
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.sqrt((r - CHROMA_R) ** 2 + (g - CHROMA_G) ** 2 + (b - CHROMA_B) ** 2);

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

  // Pass 2 — Color decontamination (remove magenta spill from semi-transparent pixels)
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 0 && alpha < 255) {
      const a = alpha / 255;
      data[i] = Math.round(Math.max(0, Math.min(255, (data[i] - CHROMA_R * (1 - a)) / a)));
      data[i + 1] = Math.round(Math.max(0, Math.min(255, (data[i + 1] - CHROMA_G * (1 - a)) / a)));
      data[i + 2] = Math.round(Math.max(0, Math.min(255, (data[i + 2] - CHROMA_B * (1 - a)) / a)));
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
