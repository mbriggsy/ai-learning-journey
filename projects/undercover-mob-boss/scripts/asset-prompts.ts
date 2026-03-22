import type { AssetPrompt } from './types.js';

/**
 * Style prefix prepended to ALL prompts for visual consistency.
 *
 * Imagen 4 best practices applied:
 * - Lead with explicit art style to prevent photorealistic default
 * - Layer descriptive modifiers for lighting, texture, color palette
 * - Embed negatives directly ("NOT photographic") since Imagen 4
 *   ignores the negativePrompt config parameter
 * - Keep boosters to 2-3 max to avoid muddy output
 * - Magenta background suffix added per-asset for chroma-key extraction
 */
export const STYLE_PREFIX =
  '1940s film noir illustration, hand-drawn ink and wash style, dramatic chiaroscuro lighting with deep blacks and harsh highlights, sepia-toned with desaturated warm palette, vintage halftone texture, atmospheric smoke and shadow, stylized NOT photographic, NOT 3D render, NOT realistic, no watermarks, no text overlay, no logos, ';

/**
 * Chroma-key background suffix — appended to all assets needing transparency.
 * Imagen 4 cannot produce native transparent PNGs. We generate on a solid
 * magenta background and strip it with Sharp in post-processing.
 */
const CHROMA_BG_SUFFIX =
  'on a solid flat bright magenta background EXACT hex #FF00FF, NO gradients, NO noise, NO texture on background, clean sharp edges against background';

export const ASSET_PROMPTS = [
  // --- Role Cards (3) ---
  {
    name: 'role-citizen',
    promptSuffix: `portrait of a 1940s honest city worker, clean-shaven, wearing a newsboy cap and suspenders, trustworthy expression, warm lighting on face, half-body shot, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'role-mob-soldier',
    promptSuffix: `portrait of a menacing 1940s mobster, wearing a dark fedora pulled low, trench coat with upturned collar, face partially in shadow, cigarette smoke wisps, half-body shot, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'role-mob-boss',
    promptSuffix: `a dark mysterious fedora hat and long overcoat hanging on a coat rack in a 1940s dimly lit office, single desk lamp casting dramatic shadows, empty chair behind a mahogany desk, cigar smoldering in ashtray, moody atmospheric still life, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },

  // --- Policy Cards (2) ---
  {
    name: 'policy-good',
    promptSuffix: `ornate 1940s official city seal on parchment, eagle emblem, laurel wreath border, clean government document style, embossed gold lettering border, dignified and official, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'policy-bad',
    promptSuffix: `dark cracked document, 1940s city seal corrupted and broken, ink splattered, torn edges, ominous red wax seal, sense of decay and corruption, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },

  // --- Background (1) ---
  {
    name: 'background',
    promptSuffix: 'panoramic 1940s noir city skyline at night, rain-slicked streets reflecting neon signs, dark alleyways, steam rising from manholes, moonlight through clouds, cinematic wide establishing shot, moody atmospheric perspective',
    targetWidth: 1920,
    targetHeight: 1080,
    aspectRatio: '16:9',
    needsTransparency: false,
    postProcess: { kind: 'resize' },
  },

  // --- Vote Cards (2) ---
  {
    name: 'vote-approve',
    promptSuffix: `vintage 1940s circular green wax seal with laurel wreath motif, official approval emblem, embossed texture, ornate border design, clean government certification mark, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 512,
    targetHeight: 512,
    aspectRatio: '1:1',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'vote-block',
    promptSuffix: `menacing 1940s mobster in fedora and pinstripe suit lurking in shadows beside a vintage circular red wax seal with bold X motif, official rejection emblem, embossed texture, ornate border design, noir ink illustration style, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 512,
    targetHeight: 512,
    aspectRatio: '1:1',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },

  // --- Executive Power Cards (4) ---
  {
    name: 'power-investigate',
    promptSuffix: `noir detective magnifying glass held up, examining a dossier folder, dramatic single desk lamp lighting, smoke curling, investigation scene, half-body shot, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'power-nominate',
    promptSuffix: `1940s wooden judge gavel on a desk, authoritative, dark wood grain, brass details, dramatic overhead lighting, sense of power and authority, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'power-execute',
    promptSuffix: `dark dramatic silhouette of a hand drawing a line through a name on a list, crossed out name, dim red lighting, ominous elimination scene, sense of finality, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  {
    name: 'power-peek',
    promptSuffix: `noir 1940s gloved hand secretly pulling back the corner of three stacked policy documents on a desk, dramatic low-key lighting, smoke wisps, candlelight revealing hidden text, espionage intrigue scene, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 1024,
    aspectRatio: '3:4',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },
  // --- Veto Deliberation (1) ---
  {
    name: 'veto-deliberation',
    promptSuffix: `1940s noir still life, heavy mahogany desk viewed from above at slight angle, two official documents side by side with large red VETO stamp, brass desk lamp casting harsh dramatic shadows, smoldering cigar in crystal ashtray, whiskey glass half-full, fountain pen resting between the documents, sense of a weighty decision about to be made, moody atmospheric, ${CHROMA_BG_SUFFIX}`,
    targetWidth: 768,
    targetHeight: 768,
    aspectRatio: '1:1',
    needsTransparency: true,
    postProcess: { kind: 'chroma-key-then-resize' },
  },

  // --- Lobby Seal (1) ---
  {
    name: 'lobby-seal',
    promptSuffix: 'vintage 1940s art deco circular ornamental badge, decorative wings motif in center, elaborate geometric border ring pattern, metallic gold color scheme on solid black background, old-fashioned embossed medallion design, clean sharp edges, NO smoke, NO atmosphere, illustration on pure black',
    targetWidth: 512,
    targetHeight: 512,
    aspectRatio: '1:1',
    needsTransparency: false,
    postProcess: { kind: 'resize' },
  },
] as const satisfies readonly AssetPrompt[];

/** Union of all valid asset names — used to validate --only CLI arg. */
export type AssetName = (typeof ASSET_PROMPTS)[number]['name'];

/** Set of valid asset names for runtime validation. */
export const ASSET_NAMES: Set<string> = new Set(ASSET_PROMPTS.map((p) => p.name));
