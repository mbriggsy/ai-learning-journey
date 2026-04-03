import type { AssetDefinition } from './types.js';

/** Base prompt prepended to ALL asset generation calls */
export const STYLE_PREFIX =
  'Top-down view pixel art, 32-pixel grid style with large chunky pixels ' +
  'visible as distinct squares, stylized cartoon, bold 1-pixel dark outlines, ' +
  'no anti-aliasing, no gradients, no dithering, clean grid-aligned edges, ' +
  'not isometric, not 3/4 view, strict top-down perspective, ' +
  'no text, no labels, no watermarks, no numbers, no letters, no hex codes, ';

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
    promptSuffix: FLOOR_SUFFIX + 'wooden plank flooring, warm brown with light tan grain lines, visible plank seams running horizontally',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-floor-wood-02',
    category: 'tiles',
    promptSuffix: FLOOR_SUFFIX + 'wooden plank flooring variant, warm brown with dark gold knots, planks running vertically',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-floor-wood-03',
    category: 'tiles',
    promptSuffix: FLOOR_SUFFIX + 'wooden plank flooring variant, herringbone pattern, warm brown and light tan alternating',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-floor-carpet-red',
    category: 'tiles',
    promptSuffix: FLOOR_SUFFIX + 'plush carpet texture, rich crimson red, subtle fiber pattern, even texture across entire tile',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-floor-carpet-neutral',
    category: 'tiles',
    promptSuffix: FLOOR_SUFFIX + 'plush carpet texture, warm tan, subtle fiber pattern, even texture across entire tile',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-floor-kitchen',
    category: 'tiles',
    promptSuffix: FLOOR_SUFFIX + 'kitchen floor tile, off-white with subtle dusty blue diamond pattern, clean checkerboard',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-floor-bathroom',
    category: 'tiles',
    promptSuffix: FLOOR_SUFFIX + 'bathroom floor tile, small hexagonal tiles in off-white with dusty blue accent tiles',
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
    promptSuffix: WALL_SUFFIX + 'horizontal wall running left-to-right, cream surface, black outline on top and bottom edges, baseboard detail at bottom edge in dark brown',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-wall-vertical',
    category: 'tiles',
    promptSuffix: WALL_SUFFIX + 'vertical wall running top-to-bottom, cream surface, black outline on left and right edges, baseboard detail on right edge in dark brown',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-wall-corner',
    category: 'tiles',
    promptSuffix: WALL_SUFFIX + 'wall corner piece forming L-shape, cream, wall extends along top edge and right edge of tile, corner junction visible, black outlines',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-wall-tjunction',
    category: 'tiles',
    promptSuffix: WALL_SUFFIX + 'wall T-junction piece, cream, wall extends along top edge with perpendicular wall going downward from center, black outlines',
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
    promptSuffix: WALL_SUFFIX + 'closed wooden door viewed from above, dark brown door panel with cream door frame, brass gold doorknob detail, clearly reads as a closed door',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'tile' }, chromaKey: false, opaque: true,
  },
  {
    id: 'tile-door-open',
    category: 'tiles',
    promptSuffix: WALL_SUFFIX + 'open doorway viewed from above, cream door frame with dark gap in center showing floor below, door swung open against wall, clearly reads as an open passageway',
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
    promptSuffix: 'top-down view of a couch/sofa, 2 tiles wide by 1 tile tall, crimson red upholstery with dark brown armrests, bold black outlines, ' + 'on solid magenta background',
    targetWidth: 64, targetHeight: 32,
    aspectRatio: '4:3', imageSize: '1K',
    postProcess: { kind: 'sprite-multi', sliceWidth: 32, sliceHeight: 32 }, chromaKey: true, opaque: false,
  },
  {
    id: 'furniture-table',
    category: 'furniture',
    promptSuffix: 'top-down view of a rectangular dining table, 2 tiles wide by 2 tiles tall, dark brown surface with warm brown edges, bold black outlines, ' + 'on solid magenta background',
    targetWidth: 64, targetHeight: 64,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'sprite-multi', sliceWidth: 32, sliceHeight: 32 }, chromaKey: true, opaque: false,
  },
  {
    id: 'furniture-bookshelf',
    category: 'furniture',
    promptSuffix: 'top-down view of a tall bookshelf, 1 tile wide by 2 tiles tall, dark brown frame with colorful book spines in crimson red and cobalt blue and gold, bold black outlines, ' + 'on solid magenta background',
    targetWidth: 32, targetHeight: 64,
    aspectRatio: '4:3', imageSize: '1K',
    postProcess: { kind: 'sprite-multi', sliceWidth: 32, sliceHeight: 32 }, chromaKey: false, opaque: true,
  },
  {
    id: 'furniture-chair',
    category: 'furniture',
    promptSuffix: 'top-down view of a single chair, 1 tile, dark brown frame with warm tan seat cushion, bold black outlines, ' + 'on solid magenta background',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false,
  },
  {
    id: 'furniture-bed',
    category: 'furniture',
    promptSuffix: 'top-down view of a bed, 2 tiles wide by 2 tiles tall, cream sheets with crimson red blanket folded at foot, dark brown headboard at top, bold black outlines, ' + 'on solid magenta background',
    targetWidth: 64, targetHeight: 64,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'sprite-multi', sliceWidth: 32, sliceHeight: 32 }, chromaKey: true, opaque: false,
  },
  {
    id: 'furniture-desk',
    category: 'furniture',
    promptSuffix: 'top-down view of a writing desk, 2 tiles wide by 1 tile tall, dark brown surface with warm brown drawer fronts, bold black outlines, ' + 'on solid magenta background',
    targetWidth: 64, targetHeight: 32,
    aspectRatio: '4:3', imageSize: '1K',
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
    promptSuffix: 'top-down view of an ornate rug, 3 tiles wide by 2 tiles tall, crimson red center with gold border pattern and dark red corners, bold black outlines, ' + 'on solid magenta background',
    targetWidth: 96, targetHeight: 64,
    aspectRatio: '4:3', imageSize: '1K',
    postProcess: { kind: 'sprite-multi', sliceWidth: 32, sliceHeight: 32 }, chromaKey: true, opaque: false,
  },
  {
    id: 'tile-lamp',
    category: 'tiles',
    promptSuffix: 'top-down view of a floor lamp, 1 tile, circular lamp shade in warm tan with gold highlight ring, dark brown base, bold black outlines, ' + 'on solid magenta background',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false,
  },
  {
    id: 'tile-plant',
    category: 'tiles',
    promptSuffix: 'top-down view of a potted plant, 1 tile, green green leaves radiating from center, dark brown round pot, bold black outlines, ' + 'on solid magenta background',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false,
  },
  {
    id: 'tile-picture-frame',
    category: 'tiles',
    promptSuffix: 'top-down view of a picture frame hanging on wall, 1 tile, gold frame border with cobalt blue abstract painting inside, bold black outlines, ' + 'on solid magenta background',
    targetWidth: 32, targetHeight: 32,
    aspectRatio: '1:1', imageSize: '1K',
    postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false,
  },
];

// ---------------------------------------------------------------------------
// Character frames — Hider
// ---------------------------------------------------------------------------

/** Strong magenta background instruction — prevents AI from rendering floors/scenes behind characters */
const CHAR_BG_SUFFIX =
  'the ENTIRE background must be solid flat bright magenta with absolutely no floor tiles, ' +
  'no wood, no scenery, no patterns — ONLY pure solid magenta everywhere except the character itself, ' +
  'character should fill most of the frame leaving minimal magenta border';

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
        promptSuffix: `single character ${dirLabels[dir]}, ${silhouetteDesc}, ${colorDesc}, ${IDLE_POSES[i]}, chibi proportions, grounding shadow dark ellipse under feet, ${CHAR_BG_SUFFIX}`,
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
        promptSuffix: `single character ${dirLabels[dir]}, ${silhouetteDesc}, ${colorDesc}, walking ${WALK_POSES[i]}, chibi proportions, grounding shadow dark ellipse under feet, ${CHAR_BG_SUFFIX}`,
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
          promptSuffix: `single character ${dirLabels[dir]}, ${silhouetteDesc}, ${colorDesc}, running aggressively ${WALK_POSES[i]} with wider stride and leaning forward, chibi proportions, grounding shadow dark ellipse under feet, ${CHAR_BG_SUFFIX}`,
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
  'bright sky blue pill-shaped body with teal belly spot, green stubby feet, dark green shading',
  'cute round critter like Fall Guys, pill-shaped body, big round eyes on top of head visible from above, no visible arms, stubby little feet, looks like a cute toy, harmless and round, slightly hunched forward',
  false,
);

const seekerFrames = makeCharacterFrames(
  'seeker',
  'bright red egg-shaped body with orange stripe across middle, dark red stubby feet, small angry eyebrows visible from above',
  'cute angry egg-shaped blob, slightly bigger than hider, round body with small angry eyebrows, stomping forward pose, cute but determined, cartoon villain energy not scary, no visible arms',
  true,
);

// ---------------------------------------------------------------------------
// Flashlight overlay (seeker prop)
// ---------------------------------------------------------------------------

const flashlightFrames: readonly AssetDefinition[] = [
  { id: 'prop-flashlight-s', category: 'characters', promptSuffix: 'flashlight beam cone pointing downward (south), bright gold beam with amber amber edges fading to transparent, viewed from directly above, on solid magenta background', targetWidth: 32, targetHeight: 32, aspectRatio: '1:1', imageSize: '1K', postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false },
  { id: 'prop-flashlight-n', category: 'characters', promptSuffix: 'flashlight beam cone pointing upward (north), bright gold beam with amber amber edges fading to transparent, viewed from directly above, on solid magenta background', targetWidth: 32, targetHeight: 32, aspectRatio: '1:1', imageSize: '1K', postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false },
  { id: 'prop-flashlight-e', category: 'characters', promptSuffix: 'flashlight beam cone pointing right (east), bright gold beam with amber amber edges fading to transparent, viewed from directly above, on solid magenta background', targetWidth: 32, targetHeight: 32, aspectRatio: '1:1', imageSize: '1K', postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false },
  { id: 'prop-flashlight-w', category: 'characters', promptSuffix: 'flashlight beam cone pointing left (west), bright gold beam with amber amber edges fading to transparent, viewed from directly above, on solid magenta background', targetWidth: 32, targetHeight: 32, aspectRatio: '1:1', imageSize: '1K', postProcess: { kind: 'sprite' }, chromaKey: true, opaque: false },
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
