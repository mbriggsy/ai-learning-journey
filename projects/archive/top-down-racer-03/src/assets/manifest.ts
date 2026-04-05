/**
 * Asset path registry — consumed by the renderer layer.
 *
 * This module is a DATA-ONLY module (like src/tracks/).
 * It must NOT import from src/engine/, src/renderer/, or src/ai/.
 *
 * PLACEHOLDER: This file will be replaced by auto-generated output
 * from tools/generate-manifest.ts (Plan 5). Safe to edit until then.
 *
 * @see docs/asset-spec.md for asset generation specs
 */

/**
 * Expected manifest structure (contract for Plan 5's generator).
 * The generator must produce output conforming to this shape.
 */
export interface AssetManifestShape {
  cars: {
    player: Record<string, string>;
    ai: Record<string, string>;
  };
  tracks: Record<string, { bg: string }>;
  textures: Record<string, string>;
  audio: Record<string, string>;
  /** Atlas entries point to PixiJS-compatible JSON atlas descriptors, not individual frames. */
  atlas: Record<string, string>;
}

/** Asset path registry. Populated by tools/generate-manifest.ts in Plan 5. */
export const ASSETS = {
  cars: {
    player: {},
    ai: {},
  },
  tracks: {},
  textures: {},
  audio: {},
  atlas: {},
} as const;

/** Resolved type of the ASSETS constant. */
export type AssetManifest = typeof ASSETS;
