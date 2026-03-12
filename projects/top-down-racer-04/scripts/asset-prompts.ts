import type { AssetPrompt } from './types.js';

/**
 * Style prefix prepended to ALL prompts for visual consistency.
 * Includes negative framing since Imagen 4 ignores negativePrompt.
 */
export const STYLE_PREFIX =
  '2D top-down racing game asset, clean vector-style illustration, bold flat colors, hard shadows, professional game art, NOT 3D, NOT realistic, NOT photographic, avoid blurriness, no watermarks, no text overlay, no logos, ';

/** Shared suffix for car sprite prompts (chroma-key background). */
const CAR_BG_SUFFIX =
  'viewed directly from above (bird\'s eye view), car pointing up (north), on a solid flat bright magenta background EXACT hex #FF00FF, NO gradients, NO noise, NO texture, NO shadows on background, NO ground plane, clean white outline 2px wide around the car';

/** Shared suffix for tileable texture prompts. */
const TILE_SUFFIX =
  'seamless tileable pattern, seamless tile, repeating texture, seamless edges, uniform lighting, no directional shadows, no vignette, no center focal point';

export const ASSET_PROMPTS = [
  // --- Car Sprites (4) ---
  {
    name: 'car-player-red',
    promptSuffix: `sleek modern racing car, bright red livery with white racing stripes, compact aerodynamic shape, ${CAR_BG_SUFFIX}`,
    targetWidth: 256,
    targetHeight: 256,
    aspectRatio: '1:1',
    sizeTier: '1K',
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'car-player-blue',
    promptSuffix: `sleek modern racing car, electric blue livery with silver accents, compact aerodynamic shape, ${CAR_BG_SUFFIX}`,
    targetWidth: 256,
    targetHeight: 256,
    aspectRatio: '1:1',
    sizeTier: '1K',
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'car-player-yellow',
    promptSuffix: `sleek modern racing car, bright yellow livery with black racing stripes, compact aerodynamic shape, ${CAR_BG_SUFFIX}`,
    targetWidth: 256,
    targetHeight: 256,
    aspectRatio: '1:1',
    sizeTier: '1K',
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'car-ai',
    promptSuffix: `aggressive angular racing car, dark gunmetal grey livery with neon green accent lines, distinctly different silhouette from a standard sports car, wider body kit, rear spoiler, ${CAR_BG_SUFFIX}`,
    targetWidth: 256,
    targetHeight: 256,
    aspectRatio: '1:1',
    sizeTier: '1K',
    postProcess: { kind: 'chroma-key-then-resize' },
  },

  // --- Track Backgrounds (3) ---
  {
    name: 'track01-bg',
    promptSuffix: 'aerial overhead view of a complete oval racing circuit, bird\'s eye view, top-down perspective, green grass infield, asphalt track surface, daytime sunny weather, grandstands along the straight, pit lane area, clean professional look',
    targetWidth: 2048,
    targetHeight: 2048,
    aspectRatio: '1:1',
    sizeTier: '2K',
    postProcess: { kind: 'resize' },
  },
  {
    name: 'track02-bg',
    promptSuffix: 'aerial overhead view of a speedway racing circuit, bird\'s eye view, top-down perspective, night time under bright stadium floodlights, dramatic lighting, asphalt track with painted lines, banked corners, stadium atmosphere with lit buildings around the track',
    targetWidth: 2048,
    targetHeight: 2048,
    aspectRatio: '1:1',
    sizeTier: '2K',
    postProcess: { kind: 'resize' },
  },
  {
    name: 'track03-bg',
    promptSuffix: 'aerial overhead view of a technical European racing circuit, bird\'s eye view, top-down perspective, winding track with tight chicanes and hairpin turns, overcast moody atmosphere, autumn trees, gravel runoff areas, tire barriers at corners',
    targetWidth: 2048,
    targetHeight: 2048,
    aspectRatio: '1:1',
    sizeTier: '2K',
    postProcess: { kind: 'resize' },
  },

  // --- Tileable Textures (3) ---
  {
    name: 'asphalt-tile',
    promptSuffix: `dark grey asphalt road surface texture, subtle crack patterns, fine aggregate detail, ${TILE_SUFFIX}`,
    targetWidth: 512,
    targetHeight: 512,
    aspectRatio: '1:1',
    sizeTier: '1K',
    postProcess: { kind: 'resize' },
  },
  {
    name: 'grass-tile',
    promptSuffix: `lush green grass texture, short mowed lawn, natural variation in green shades, ${TILE_SUFFIX}`,
    targetWidth: 256,
    targetHeight: 256,
    aspectRatio: '1:1',
    sizeTier: '1K',
    postProcess: { kind: 'resize' },
  },
  {
    name: 'curb-tile',
    promptSuffix: 'red and white alternating curb pattern, racing track kerb, centered vertically in the image, with empty space above and below, bold alternating diagonal stripes, clean sharp edges',
    targetWidth: 128,
    targetHeight: 64,
    aspectRatio: '1:1',
    sizeTier: '1K',
    postProcess: {
      kind: 'crop-and-resize',
      cropRegion: { left: 0, top: 384, width: 1024, height: 256 },
    },
  },

  // --- Menu Background (1) ---
  {
    name: 'menu-bg',
    promptSuffix: 'dramatic dark racing scene, low angle view of a race track at twilight, moody atmospheric lighting, lens flare from distant lights, cinematic wide shot, dark navy and deep purple tones, sense of speed and excitement',
    targetWidth: 1920,
    targetHeight: 1080,
    aspectRatio: '16:9',
    sizeTier: '2K',
    postProcess: { kind: 'resize' },
  },
] as const satisfies readonly AssetPrompt[];

/** Union of all valid asset names — used to validate --only CLI arg. */
export type AssetName = (typeof ASSET_PROMPTS)[number]['name'];

/** Set of valid asset names for runtime validation. */
export const ASSET_NAMES = new Set(ASSET_PROMPTS.map((p) => p.name));
