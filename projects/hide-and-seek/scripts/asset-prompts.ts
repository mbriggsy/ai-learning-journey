import type { AssetDefinition } from './types.js';

/** Base prompt prepended to ALL asset generation calls */
export const STYLE_PREFIX =
  'Top-down view pixel art game sprite, 32-pixel grid style with large chunky pixels ' +
  'visible as distinct squares, stylized cartoon, bold 1-pixel dark outlines, solid ' +
  'magenta (#FF00FF) background, game asset, no anti-aliasing, no gradients, no ' +
  'dithering, clean grid-aligned edges, not isometric, not 3/4 view, strict top-down ' +
  'perspective, no text, no labels, no watermarks, ';

/** Suffix for floor tiles — seamless tiling + opaque */
const FLOOR_SUFFIX =
  'seamless tileable texture, edges match when repeated in a grid, uniform overhead ' +
  'lighting from top-left, fill entire canvas with the texture pattern, no magenta, ' +
  'opaque background, ';

/** Suffix for wall tiles */
const WALL_SUFFIX =
  'interior mansion wall segment viewed from directly above, clean straight edges, ' +
  'uniform overhead lighting from top-left, ';

/** Character pose descriptions for walk cycle */
const WALK_POSES = [
  'left foot forward touching ground, right arm forward for balance, contact pose',
  'weight shifting onto left foot, body slightly lowered, down pose',
  'legs crossing at neutral height, body rising, passing pose',
  'right foot forward pushing off, left arm forward, up pose',
] as const;

/** Character idle descriptions */
const IDLE_POSES = [
  'standing neutral pose, arms at sides, slight upright posture',
  'standing with subtle 1-pixel downward shift, gentle breathing bob',
] as const;

// ---------------------------------------------------------------------------
// Floor tiles
// ---------------------------------------------------------------------------

const floorTiles: readonly AssetDefinition[] = [
  {
    id: 'tile-floor-wood-01',
    category: 'tiles',
    promptSuffix: FLOOR_SUFFIX + 'wooden plank flooring, warm wood brown #8B4513 with lighter #C19A6B grain lines, visible plank seams running horizontally',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-floor-wood-02',
    category: 'tiles',
    promptSuffix: FLOOR_SUFFIX + 'wooden plank flooring variant, warm wood brown #8B4513 with darker #8B6914 knots, planks running vertically',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-floor-wood-03',
    category: 'tiles',
    promptSuffix: FLOOR_SUFFIX + 'wooden plank flooring variant, herringbone pattern, warm wood brown #8B4513 and lighter #C19A6B alternating',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-floor-carpet-red',
    category: 'tiles',
    promptSuffix: FLOOR_SUFFIX + 'plush carpet texture, rich carpet red #C41E3A, subtle fiber pattern, even texture across entire tile',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-floor-carpet-neutral',
    category: 'tiles',
    promptSuffix: FLOOR_SUFFIX + 'plush carpet texture, warm tan #D4C4A8, subtle fiber pattern, even texture across entire tile',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-floor-kitchen',
    category: 'tiles',
    promptSuffix: FLOOR_SUFFIX + 'kitchen floor tile, white #E8E0D0 with subtle blue #5B7FA5 diamond pattern, clean checkerboard',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-floor-bathroom',
    category: 'tiles',
    promptSuffix: FLOOR_SUFFIX + 'bathroom floor tile, small hexagonal tiles in white #E8E0D0 with blue #5B7FA5 accent tiles',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
];

// ---------------------------------------------------------------------------
// Wall tiles
// ---------------------------------------------------------------------------

const wallTiles: readonly AssetDefinition[] = [
  {
    id: 'tile-wall-horizontal',
    category: 'tiles',
    promptSuffix: WALL_SUFFIX + 'horizontal wall running left-to-right, cream #F5E6D3 surface, dark #000000 outline on top and bottom edges, baseboard detail at bottom edge in dark wood #5C3A21',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-wall-vertical',
    category: 'tiles',
    promptSuffix: WALL_SUFFIX + 'vertical wall running top-to-bottom, cream #F5E6D3 surface, dark #000000 outline on left and right edges, baseboard detail on right edge in dark wood #5C3A21',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-wall-corner',
    category: 'tiles',
    promptSuffix: WALL_SUFFIX + 'wall corner piece forming L-shape, cream #F5E6D3, wall extends along top edge and right edge of tile, corner junction visible, dark #000000 outlines',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-wall-tjunction',
    category: 'tiles',
    promptSuffix: WALL_SUFFIX + 'wall T-junction piece, cream #F5E6D3, wall extends along top edge with perpendicular wall going downward from center, dark #000000 outlines',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
];

// ---------------------------------------------------------------------------
// Door tiles
// ---------------------------------------------------------------------------

const doorTiles: readonly AssetDefinition[] = [
  {
    id: 'tile-door-closed',
    category: 'tiles',
    promptSuffix: WALL_SUFFIX + 'closed wooden door viewed from above, dark wood #5C3A21 door panel with cream #F5E6D3 door frame, brass #FFD700 doorknob detail, clearly reads as a closed door',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-door-open',
    category: 'tiles',
    promptSuffix: WALL_SUFFIX + 'open doorway viewed from above, cream #F5E6D3 door frame with dark gap in center showing floor below, door swung open against wall, clearly reads as an open passageway',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
];

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------

const furniture: readonly AssetDefinition[] = [
  {
    id: 'furniture-couch',
    category: 'furniture',
    promptSuffix: 'top-down view of a couch/sofa, 2 tiles wide by 1 tile tall, carpet red #C41E3A upholstery with dark wood #5C3A21 armrests, bold black #000000 outlines, ' + 'on solid magenta #FF00FF background',
    targetWidth: 64, targetHeight: 32,
    aspectRatio: '3:2', imageSize: '1K',
    postProcess: { kind: 'sprite-multi', sliceWidth: 32, sliceHeight: 32 }, chromaKey: true, opaque: false,
  },
  {
    id: 'furniture-table',
    category: 'furniture',
    promptSuffix: 'top-down view of a rectangular dining table, 2 tiles wide by 2 tiles tall, dark wood #5C3A21 surface with wood brown #8B4513 edges, bold black #000000 outlines, ' + 'on solid magenta #FF00FF background',
    targetWidth: 64, targetHeight: 64,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'sprite-multi', sliceWidth: 32, sliceHeight: 32 }, chromaKey: true, opaque: false,
  },
  {
    id: 'furniture-bookshelf',
    category: 'furniture',
    promptSuffix: 'top-down view of a tall bookshelf, 1 tile wide by 2 tiles tall, dark wood #5C3A21 frame with colorful book spines in carpet red #C41E3A and sonar blue #0047AB and gold #FFD700, bold black #000000 outlines, ' + 'on solid magenta #FF00FF background',
    targetWidth: 32, targetHeight: 64,
    aspectRatio: '3:2', imageSize: '1K',
    postProcess: { kind: 'sprite-multi', sliceWidth: 32, sliceHeight: 32 }, chromaKey: true, opaque: false,
  },
  {
    id: 'furniture-chair',
    category: 'furniture',
    promptSuffix: 'top-down view of a single chair, 1 tile, dark wood #5C3A21 frame with warm tan #D4C4A8 seat cushion, bold black #000000 outlines, ' + 'on solid magenta #FF00FF background',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false,
  },
  {
    id: 'furniture-bed',
    category: 'furniture',
    promptSuffix: 'top-down view of a bed, 2 tiles wide by 2 tiles tall, cream #F5E6D3 sheets with carpet red #C41E3A blanket folded at foot, dark wood #5C3A21 headboard at top, bold black #000000 outlines, ' + 'on solid magenta #FF00FF background',
    targetWidth: 64, targetHeight: 64,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'sprite-multi', sliceWidth: 32, sliceHeight: 32 }, chromaKey: true, opaque: false,
  },
  {
    id: 'furniture-desk',
    category: 'furniture',
    promptSuffix: 'top-down view of a writing desk, 2 tiles wide by 1 tile tall, dark wood #5C3A21 surface with wood brown #8B4513 drawer fronts, bold black #000000 outlines, ' + 'on solid magenta #FF00FF background',
    targetWidth: 64, targetHeight: 32,
    aspectRatio: '3:2', imageSize: '1K',
    postProcess: { kind: 'sprite-multi', sliceWidth: 32, sliceHeight: 32 }, chromaKey: true, opaque: false,
  },
];

// ---------------------------------------------------------------------------
// Decorative tiles
// ---------------------------------------------------------------------------

const decorativeTiles: readonly AssetDefinition[] = [
  {
    id: 'furniture-rug',
    category: 'furniture',
    promptSuffix: 'top-down view of an ornate rug, 3 tiles wide by 2 tiles tall, carpet red #C41E3A center with gold #FFD700 border pattern and dark red #8B1A1A corners, bold black #000000 outlines, ' + 'on solid magenta #FF00FF background',
    targetWidth: 96, targetHeight: 64,
    aspectRatio: '3:2', imageSize: '1K',
    postProcess: { kind: 'sprite-multi', sliceWidth: 32, sliceHeight: 32 }, chromaKey: true, opaque: false,
  },
  {
    id: 'tile-lamp',
    category: 'tiles',
    promptSuffix: 'top-down view of a floor lamp, 1 tile, circular lamp shade in warm tan #D4C4A8 with gold #FFD700 highlight ring, dark wood #5C3A21 base, bold black #000000 outlines, ' + 'on solid magenta #FF00FF background',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false,
  },
  {
    id: 'tile-plant',
    category: 'tiles',
    promptSuffix: 'top-down view of a potted plant, 1 tile, green #27AE60 leaves radiating from center, dark wood #5C3A21 round pot, bold black #000000 outlines, ' + 'on solid magenta #FF00FF background',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false,
  },
  {
    id: 'tile-picture-frame',
    category: 'tiles',
    promptSuffix: 'top-down view of a picture frame hanging on wall, 1 tile, gold #FFD700 frame border with sonar blue #0047AB abstract painting inside, bold black #000000 outlines, ' + 'on solid magenta #FF00FF background',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false,
  },
];

// ---------------------------------------------------------------------------
// Character frames — Hider
// ---------------------------------------------------------------------------

function makeCharacterFrames(
  character: 'hider' | 'seeker',
  colorDesc: string,
  silhouetteDesc: string,
  includeChase: boolean,
): AssetDefinition[] {
  const directions = ['s', 'n', 'e'] as const;
  const dirLabels = { s: 'facing downward (south), showing front of body', n: 'facing upward (north), showing back of body', e: 'facing right (east), showing right side profile' } as const;
  const frames: AssetDefinition[] = [];

  for (const dir of directions) {
    // Idle frames
    for (let i = 0; i < IDLE_POSES.length; i++) {
      frames.push({
        id: `char-${character}-idle-${dir}-${String(i + 1).padStart(2, '0')}`,
        category: 'characters',
        promptSuffix: `single character ${dirLabels[dir]}, ${silhouetteDesc}, ${colorDesc}, ${IDLE_POSES[i]}, chibi proportions head 10-16 pixels tall at 32x32 final size, grounding shadow 1-2 pixel dark ellipse under feet, on solid magenta #FF00FF background`,
        targetWidth: 32, targetHeight: 32,
        aspectRatio: '1:1', imageSize: '1K',
        postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false,
      });
    }

    // Walk frames
    for (let i = 0; i < WALK_POSES.length; i++) {
      frames.push({
        id: `char-${character}-walk-${dir}-${String(i + 1).padStart(2, '0')}`,
        category: 'characters',
        promptSuffix: `single character ${dirLabels[dir]}, ${silhouetteDesc}, ${colorDesc}, walking ${WALK_POSES[i]}, chibi proportions head 10-16 pixels tall at 32x32 final size, grounding shadow 1-2 pixel dark ellipse under feet, on solid magenta #FF00FF background`,
        targetWidth: 32, targetHeight: 32,
        aspectRatio: '1:1', imageSize: '1K',
        postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false,
      });
    }

    // Chase frames (seeker only)
    if (includeChase) {
      for (let i = 0; i < WALK_POSES.length; i++) {
        frames.push({
          id: `char-${character}-chase-${dir}-${String(i + 1).padStart(2, '0')}`,
          category: 'characters',
          promptSuffix: `single character ${dirLabels[dir]}, ${silhouetteDesc}, ${colorDesc}, running aggressively ${WALK_POSES[i]} with wider stride and leaning forward, chibi proportions head 10-16 pixels tall at 32x32 final size, grounding shadow 1-2 pixel dark ellipse under feet, on solid magenta #FF00FF background`,
          targetWidth: 32, targetHeight: 32,
          aspectRatio: '1:1', imageSize: '1K',
          postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false,
        });
      }
    }
  }

  return frames;
}

const hiderFrames = makeCharacterFrames(
  'hider',
  'cool blue #2E86C1 body with teal #1ABC9C accents and green #27AE60 highlights, dark shadow #1B5E20 shading',
  'rounded compact slightly hunched silhouette, hiding posture, small cautious character',
  false,
);

const seekerFrames = makeCharacterFrames(
  'seeker',
  'warm red #E74C3C body with orange #E67E22 accents, dark red #922B21 shading',
  'angular broad upright silhouette, confident intimidating posture, tall authoritative character',
  true,
);

// ---------------------------------------------------------------------------
// Flashlight overlay (seeker prop)
// ---------------------------------------------------------------------------

const flashlightFrames: readonly AssetDefinition[] = [
  { id: 'prop-flashlight-s', category: 'characters', promptSuffix: 'flashlight beam cone pointing downward (south), bright gold #FFD700 beam with amber #FFA500 edges fading to transparent, viewed from directly above, on solid magenta #FF00FF background', targetWidth: 32, targetHeight: 32, aspectRatio: '1:1', imageSize: '1K', postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false },
  { id: 'prop-flashlight-n', category: 'characters', promptSuffix: 'flashlight beam cone pointing upward (north), bright gold #FFD700 beam with amber #FFA500 edges fading to transparent, viewed from directly above, on solid magenta #FF00FF background', targetWidth: 32, targetHeight: 32, aspectRatio: '1:1', imageSize: '1K', postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false },
  { id: 'prop-flashlight-e', category: 'characters', promptSuffix: 'flashlight beam cone pointing right (east), bright gold #FFD700 beam with amber #FFA500 edges fading to transparent, viewed from directly above, on solid magenta #FF00FF background', targetWidth: 32, targetHeight: 32, aspectRatio: '1:1', imageSize: '1K', postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false },
  { id: 'prop-flashlight-w', category: 'characters', promptSuffix: 'flashlight beam cone pointing left (west), bright gold #FFD700 beam with amber #FFA500 edges fading to transparent, viewed from directly above, on solid magenta #FF00FF background', targetWidth: 32, targetHeight: 32, aspectRatio: '1:1', imageSize: '1K', postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false },
];

// ---------------------------------------------------------------------------
// All prompts combined
// ---------------------------------------------------------------------------

export const ASSET_PROMPTS = [
  ...floorTiles,
  ...wallTiles,
  ...doorTiles,
  ...furniture,
  ...decorativeTiles,
  ...hiderFrames,
  ...seekerFrames,
  ...flashlightFrames,
] as const satisfies readonly AssetDefinition[];

export type AssetId = (typeof ASSET_PROMPTS)[number]['id'];

/** Set for CLI --only validation */
export const ASSET_IDS = new Set(ASSET_PROMPTS.map((p) => p.id));
