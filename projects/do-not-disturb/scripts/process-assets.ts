/**
 * Asset processing pipeline (Sharp-based).
 *
 * Steps:
 * 1. Chroma-key background removal (magenta → transparent)
 * 2. 1px edge-strip (insight 011 — Imagen 4 decorative borders)
 * 3. Resize to game resolution
 * 4. Output to public/assets/
 *
 * Usage: npx tsx scripts/process-assets.ts
 * Requires: sharp (devDependency)
 */

// Pipeline configuration
export type ProcessConfig = {
  readonly inputDir: string;
  readonly outputDir: string;
  readonly chromaKeyColor: { r: number; g: number; b: number };
  readonly chromaKeyThreshold: number;
  readonly edgeStripPx: number;
  readonly targetSizes: Record<string, { width: number; height: number }>;
};

export const DEFAULT_CONFIG: ProcessConfig = {
  inputDir: 'assets/raw',
  outputDir: 'public/assets/sprites',
  chromaKeyColor: { r: 255, g: 0, b: 255 }, // magenta
  chromaKeyThreshold: 60,
  edgeStripPx: 1, // insight 011
  targetSizes: {
    kid: { width: 48, height: 64 },
    bellhop: { width: 48, height: 80 },
    housekeeper: { width: 56, height: 64 },
    guest: { width: 48, height: 64 },
    'guest-disguised': { width: 32, height: 32 },
    furniture: { width: 32, height: 32 },
    prop: { width: 16, height: 16 },
  },
};

/**
 * Check if a pixel is within threshold of the chroma-key color.
 * Pure function for testability.
 */
export function isChromaKey(
  r: number, g: number, b: number,
  keyColor: { r: number; g: number; b: number },
  threshold: number,
): boolean {
  const dr = Math.abs(r - keyColor.r);
  const dg = Math.abs(g - keyColor.g);
  const db = Math.abs(b - keyColor.b);
  return dr <= threshold && dg <= threshold && db <= threshold;
}

/**
 * Remove chroma-key pixels from RGBA buffer (in-place).
 * Returns count of removed pixels.
 */
export function removeChromaKey(
  pixels: Uint8Array,
  width: number,
  height: number,
  keyColor: { r: number; g: number; b: number },
  threshold: number,
): number {
  let removed = 0;
  for (let i = 0; i < width * height * 4; i += 4) {
    if (isChromaKey(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!, keyColor, threshold)) {
      pixels[i + 3] = 0; // set alpha to 0
      removed++;
    }
  }
  return removed;
}

/**
 * Strip outermost N pixels of the edge (insight 011).
 * Sets alpha to 0 on border pixels. In-place mutation.
 */
export function stripEdgeBorder(
  pixels: Uint8Array,
  width: number,
  height: number,
  borderPx: number,
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < borderPx || x >= width - borderPx || y < borderPx || y >= height - borderPx) {
        const idx = (y * width + x) * 4;
        pixels[idx + 3] = 0;
      }
    }
  }
}

// Main pipeline would use Sharp here — left as script entry point
// The pure functions above are testable without Sharp dependency
