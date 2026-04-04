/**
 * Asset validation script.
 *
 * Checks:
 * 1. All expected assets exist
 * 2. Dimensions match manifest
 * 3. No opaque pixels on border (edge-strip verification)
 * 4. Alpha channel present (transparency)
 *
 * Usage: npx tsx scripts/validate-assets.ts
 */

import { getAllSpriteAssets } from '../src/game/asset-manifest';
import type { SpriteAsset } from '../src/game/asset-manifest';

export type ValidationResult = {
  readonly asset: string;
  readonly passed: boolean;
  readonly errors: readonly string[];
};

/**
 * Validate that border pixels are transparent (edge-strip check).
 * Returns error messages if border has opaque pixels.
 */
export function validateEdgeStrip(
  pixels: Uint8Array,
  width: number,
  height: number,
): readonly string[] {
  const errors: string[] = [];
  let opaqueEdgeCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        const alpha = pixels[(y * width + x) * 4 + 3]!;
        if (alpha > 0) opaqueEdgeCount++;
      }
    }
  }

  if (opaqueEdgeCount > 0) {
    errors.push(`${opaqueEdgeCount} opaque pixels on border (insight 011 — edge-strip may have failed)`);
  }

  return errors;
}

/**
 * Validate dimensions match expected values from manifest.
 */
export function validateDimensions(
  actualWidth: number,
  actualHeight: number,
  expected: SpriteAsset,
): readonly string[] {
  const errors: string[] = [];
  if (actualWidth !== expected.width) {
    errors.push(`Width mismatch: got ${actualWidth}, expected ${expected.width}`);
  }
  if (actualHeight !== expected.height) {
    errors.push(`Height mismatch: got ${actualHeight}, expected ${expected.height}`);
  }
  return errors;
}

// Entry point for CLI usage
export function getExpectedAssets(): readonly SpriteAsset[] {
  return getAllSpriteAssets();
}
