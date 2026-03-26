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

/**
 * Dark noir background suffix for card art — no chroma-key needed.
 * Cards display as rectangular art inside card frames.
 */
const CARD_BG_SUFFIX =
  'on a dark moody noir background with deep shadows and atmospheric smoke, vignette edges fading to black';

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
  // --- Named Policy Cards: Virtuous (15) ---
  {
    name: 'school-lunch-program',
    promptSuffix: `1940s school cafeteria still life, long wooden tables set with tin trays and milk bottles, warm sunlight through tall windows, chalkboard menu on the wall, steam rising from a serving pot, wholesome community feeling, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'public-library-expansion',
    promptSuffix: `grand 1940s public library interior, tall arched windows, rows of wooden bookshelves, reading lamps casting warm pools of light, a blueprint of a new wing on a table, civic pride, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'harbor-cleanup-initiative',
    promptSuffix: `1940s harbor waterfront at dawn, docks with neatly stacked crates, clean water reflecting morning light, fishing boats moored in a row, cranes and rope coils, a freshly painted harbor sign, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'veterans-memorial-park',
    promptSuffix: `1940s city park with an iron memorial arch, stone benches, neat flower beds, an American flag on a pole, autumn leaves, solemn and dignified atmosphere, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'free-clinic-act',
    promptSuffix: `1940s small-town medical clinic interior, a stethoscope draped over a wooden desk, medicine bottles on shelves, warm lamp light, a sign reading FREE CLINIC on the wall, compassionate atmosphere, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'streetcar-modernization',
    promptSuffix: `shiny 1940s electric streetcar on tracks through a city boulevard, overhead wires, Art Deco storefronts, gleaming chrome and brass details, clean civic infrastructure, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'fire-brigade-funding',
    promptSuffix: `1940s fire station with a gleaming red fire engine, brass fittings, fire helmets hanging on hooks, dalmatian dog, sense of civic duty and readiness, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'orphanage-renovation',
    promptSuffix: `1940s brick orphanage building being renovated, scaffolding, fresh paint, new windows, a swing set in the front yard, hopeful atmosphere, warm afternoon light, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'waterfront-promenade',
    promptSuffix: `1940s waterfront boardwalk along a river, wrought-iron lampposts, wooden benches, boats in the distance, golden sunset reflections on water, a hat left on a bench, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'public-radio-license',
    promptSuffix: `1940s radio studio with a large art deco microphone, ON AIR light glowing, sound equipment, records stacked, broadcast tower visible through window, civic communication, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'bridge-safety-inspection',
    promptSuffix: `majestic 1940s suspension bridge at golden hour seen from the riverbank, iron trusses and cable wires gleaming, engineering blueprints and a clipboard on a wooden drafting table in the foreground, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'community-garden-act',
    promptSuffix: `1940s community garden in an urban lot, raised wooden beds with vegetables, picket fence, garden tools leaning against a wheelbarrow, sunflowers, cheerful neighborhood scene, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'school-music-program',
    promptSuffix: `1940s school band room, brass instruments on stands, a grand piano, sheet music scattered, a conductor's baton on the music stand, warm nostalgic atmosphere, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'sidewalk-lamp-project',
    promptSuffix: `row of ornate cast-iron street lamps illuminating a 1940s city sidewalk at dusk, warm golden glow, cobblestone street, sense of safety and civility, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'emergency-relief-fund',
    promptSuffix: `1940s city hall desk with stacked coins and bills, an official ledger book, a rubber stamp marked APPROVED, a small American flag, sense of government aid and emergency support, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },

  // --- Named Policy Cards: Corrupt (15) ---
  {
    name: 'dockside-kickback-scheme',
    promptSuffix: `dark 1940s waterfront dock at night, stacked wooden shipping crates, a leather briefcase left open on a barrel, fog rolling in from the harbor, a single dock lamp, moody film noir lighting, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'casino-license-fast-track',
    promptSuffix: `1940s backroom poker table with stacked chips and cards, a city license document with a red APPROVED stamp, cigar smoke, green felt, corruption in high places, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'evidence-locker-purge',
    promptSuffix: `dark 1940s police evidence room, file cabinets with drawers pulled open, documents burning in a waste bin, badge on the desk, cover-up scene, ominous atmosphere, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'prohibition-expansion',
    promptSuffix: `1940s locked speakeasy door with a large CLOSED BY ORDER notice nailed to it, broken bottles in the alley, a padlock and chain on the door handle, dim streetlight, empty street, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'union-bust-authorization',
    promptSuffix: `1940s factory exterior with tall iron gates closed shut, an official notice posted on the fence, discarded picket signs leaning against the wall, factory smokestacks in the background, overcast sky, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'slum-clearance-racket',
    promptSuffix: `1940s tenement buildings being demolished, a wrecking ball swinging, dust clouds, displaced belongings on the sidewalk, a corrupt developer's plans on a clipboard, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'midnight-rezoning-act',
    promptSuffix: `1940s city hall building at night, a single lit office window glowing warmly, a desk visible through the window with stacked documents and a rubber stamp, a city zoning map pinned to the wall, moonlight on the stone facade, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'witness-relocation-program',
    promptSuffix: `ominous 1940s scene, an empty chair under a single hanging light bulb, rope coiled on the floor, a hat left behind on the chair, threatening atmosphere, disappearance implied, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'police-pension-siphon',
    promptSuffix: `1940s office desk with an open safe showing stacks of money, police pension fund ledger with altered numbers, fountain pen, reading glasses, white-collar crime, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'contraband-tariff-exemption',
    promptSuffix: `1940s customs office at the docks, crates stamped EXEMPT, a customs officer looking away while contraband passes through, clipboards and bribe money, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'backroom-bail-reform',
    promptSuffix: `1940s courthouse backroom, a judge's gavel on a stack of cash, case files scattered, a shadowy handshake between silhouettes, justice for sale, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'shadow-budget-directive',
    promptSuffix: `1940s accountant's office, two sets of books on the desk, one hidden in a drawer, dim green banker's lamp, columns of numbers, financial deception, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'waterfront-tax-holiday',
    promptSuffix: `1940s luxury yacht moored at a private dock, champagne glasses, a city tax document with a large EXEMPT stamp, wealthy excess while the city crumbles, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'ghost-payroll-authorization',
    promptSuffix: `1940s city payroll office, a long ledger with fictitious names, phantom employees, rubber stamp AUTHORIZED, empty desks in rows, bureaucratic fraud, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },
  {
    name: 'jury-selection-override',
    promptSuffix: `1940s courtroom with empty jury box, a shadowy hand placing name cards in a specific order, scales of justice tilted, dark atmosphere of a rigged trial, ${CARD_BG_SUFFIX}`,
    targetWidth: 384, targetHeight: 512, aspectRatio: '3:4',
    needsTransparency: false, postProcess: { kind: 'resize' },
    format: 'webp', outputSubDir: 'cards',
  },

  // --- Trailer-Exclusive Images (not used in game, only in video trailer) ---
  {
    name: 'trailer-table-overhead',
    promptSuffix: 'overhead bird\'s eye view of a dimly lit round table in a 1940s speakeasy, six mobile phones lying face-down on dark wood surface, crystal whiskey glasses, smoldering cigar in ashtray, scattered poker chips, single hanging lamp casting harsh circular pool of light on the table, smoke drifting upward, no people visible only their belongings, moody atmospheric',
    targetWidth: 1920,
    targetHeight: 1080,
    aspectRatio: '16:9',
    needsTransparency: false,
    postProcess: { kind: 'resize' },
  },
  {
    name: 'trailer-city-closeup',
    promptSuffix: 'interior view through a rain-streaked window at night looking out onto a 1940s noir city street, water droplets and condensation on glass, an empty leather chair in the foreground facing the window, blurred neon sign reflections in the rain on glass, warm interior lamp glow on the left edge, half-empty whiskey glass on the windowsill, melancholy atmospheric composition',
    targetWidth: 1920,
    targetHeight: 1080,
    aspectRatio: '16:9',
    needsTransparency: false,
    postProcess: { kind: 'resize' },
  },
  {
    name: 'trailer-dossier-spread',
    promptSuffix: '1940s detective desk from above, manila dossier folders spread open, black and white photographs clipped together with binder clips, red string connecting photographs in a conspiracy pattern, large red CLASSIFIED rubber stamp marks, coffee ring stain on papers, fountain pen, desk lamp casting harsh directional light, investigation in progress',
    targetWidth: 1920,
    targetHeight: 1080,
    aspectRatio: '16:9',
    needsTransparency: false,
    postProcess: { kind: 'resize' },
  },
  {
    name: 'trailer-blueprint',
    promptSuffix: '1940s architect drafting table viewed from above, large city blueprint spread out showing building floor plans and street grids drawn in ink, compass and brass ruler, ink bottle with spilled drops, the blueprint lines subtly form geometric patterns, dim desk lamp illuminating the plans, sense of meticulous planning and precision, sepia and blue-tinted ink',
    targetWidth: 1920,
    targetHeight: 1080,
    aspectRatio: '16:9',
    needsTransparency: false,
    postProcess: { kind: 'resize' },
  },

  // --- Trailer V3 Images — "The Origin Story" ---
  {
    name: 'v3-lone-figure',
    promptSuffix: 'a vintage 1940s writer desk at night seen from above, typewriter in the center with a sheet of paper half-typed, warm desk lamp casting golden pool of light, coffee cup with steam rising, scattered notebooks and pencils, a glowing modern laptop screen reflecting blue light on the typewriter keys creating a contrast of old and new, moody atmospheric workspace',
    targetWidth: 1920,
    targetHeight: 1080,
    aspectRatio: '16:9',
    needsTransparency: false,
    postProcess: { kind: 'resize' },
  },
  {
    name: 'v3-agent-swarm',
    promptSuffix: 'a 1940s noir war room with a large circular table viewed from above, dozens of open dossier folders and documents arranged radially pointing inward, red ink annotations and circled text on every document, magnifying glasses scattered around, golden light illuminating the center where a master blueprint glows, dramatic overhead lamp creating a pool of light, atmosphere of thorough review and meticulous analysis',
    targetWidth: 1920,
    targetHeight: 1080,
    aspectRatio: '16:9',
    needsTransparency: false,
    postProcess: { kind: 'resize' },
  },
  {
    name: 'v3-asset-gallery',
    promptSuffix: '1940s noir art gallery wall displaying framed portraits and cards arranged in a grid pattern, dramatic spotlights illuminating each frame individually, the frames contain silhouettes and playing-card style art, audio waveform visualization glowing in golden light projected on the far wall like a spectrogram, a vintage microphone on a stand in the foreground casting a long shadow, sense of a creative exhibition of AI-generated works, moody museum atmosphere',
    targetWidth: 1920,
    targetHeight: 1080,
    aspectRatio: '16:9',
    needsTransparency: false,
    postProcess: { kind: 'resize' },
  },
] as const satisfies readonly AssetPrompt[];

/** Union of all valid asset names — used to validate --only CLI arg. */
export type AssetName = (typeof ASSET_PROMPTS)[number]['name'];

/** Set of valid asset names for runtime validation. */
export const ASSET_NAMES: Set<string> = new Set(ASSET_PROMPTS.map((p) => p.name));
