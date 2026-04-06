import type { CardType } from '@shared/types'

// ---------------------------------------------------------------------------
// TIER 1: PRIMITIVES — raw values, never referenced by components
// ---------------------------------------------------------------------------

const PRIMITIVES = {
  // Surfaces (3-4% lightness steps to avoid "dark grey blob")
  black: '#0c0a12',        // hsl(250, 20%, 4%) — warm purple-black, NOT pure #000
  surface1: '#12121f',     // card face
  surface2: '#1a1a2e',     // dialog/sheet
  surface3: '#222240',     // hover surface
  border: '#2a2a4a',

  // Text (off-white, NOT pure #fff — avoids halation)
  textBright: '#e8e8f0',   // ~16.8:1 on black — AAA
  textMuted: '#9999bb',    // ~6.5:1 on black — AA (bumped from #8888aa)
  textDim: '#555570',

  // Game-critical accents (4 neon categories — reserved for dramatic moments)
  red: '#e03535',           redGlow: '#ff0000',
  blue: '#3b82f6',          blueGlow: '#1a6bff',
  teal: '#2dd8c8',          tealGlow: '#00e6cc',    // was green — shifted cyan for CVD safety
  amber: '#e8922a',         amberGlow: '#ff8c00',

  // Utility card accent (warm slate, not cold)
  slate: '#7080a3',         slateGlow: '#566480',   // warmed from #7788aa/#556688

  // Cat card accents — each cat earns its own color
  taco: '#d98842',          tacoGlow: '#ff9f43',
  beard: '#34a89a',         beardGlow: '#2ee6cc',
  rainbow: '#9548c4',       rainbowGlow: '#b060f0',
  potato: '#c9a035',        potatoGlow: '#f0c040',
  melon: '#c94070',         melonGlow: '#ff4080',
  feral: '#bfbfbf',         feralGlow: '#e0e0e0',
} as const

// ---------------------------------------------------------------------------
// TIER 2: SEMANTIC — role-based, what components reference
// ---------------------------------------------------------------------------

const SEMANTIC = {
  bgApp: PRIMITIVES.black,
  bgCard: PRIMITIVES.surface1,
  bgElevated: PRIMITIVES.surface2,
  bgHover: PRIMITIVES.surface3,
  borderSubtle: PRIMITIVES.border,
  textPrimary: PRIMITIVES.textBright,
  textSecondary: PRIMITIVES.textMuted,
  textDisabled: PRIMITIVES.textDim,
  focusRing: '#33ffff',

  spacingCard: '8px',
  radiusCard: '8px',
} as const

// ---------------------------------------------------------------------------
// TIER 3: PER-CARD-TYPE — compile-time exhaustive accent lookup
// ---------------------------------------------------------------------------

const CARD_TYPE_ACCENTS = {
  // Game-critical: each gets a unique neon accent
  'exploding-kitten': { fill: PRIMITIVES.red, glow: PRIMITIVES.redGlow },
  'defuse':           { fill: PRIMITIVES.blue, glow: PRIMITIVES.blueGlow },
  'nope':             { fill: PRIMITIVES.teal, glow: PRIMITIVES.tealGlow },
  'attack':           { fill: PRIMITIVES.amber, glow: PRIMITIVES.amberGlow },
  'targeted-attack':  { fill: PRIMITIVES.amber, glow: PRIMITIVES.amberGlow },

  // Utility: warm slate (calm, not attention-grabbing)
  'skip':             { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'see-the-future':   { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'alter-the-future': { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'shuffle':          { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'draw-from-bottom': { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'favor':            { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },

  // Cats: each type has personality
  'feral-cat':            { fill: PRIMITIVES.feral, glow: PRIMITIVES.feralGlow },
  'taco-cat':             { fill: PRIMITIVES.taco, glow: PRIMITIVES.tacoGlow },
  'beard-cat':            { fill: PRIMITIVES.beard, glow: PRIMITIVES.beardGlow },
  'rainbow-ralphing-cat': { fill: PRIMITIVES.rainbow, glow: PRIMITIVES.rainbowGlow },
  'hairy-potato-cat':     { fill: PRIMITIVES.potato, glow: PRIMITIVES.potatoGlow },
  'cattermelon':          { fill: PRIMITIVES.melon, glow: PRIMITIVES.melonGlow },
} as const satisfies Record<CardType, { fill: string; glow: string }>

export function cardAccent(type: CardType): { fill: string; glow: string } {
  return CARD_TYPE_ACCENTS[type]
}

// ---------------------------------------------------------------------------
// applyTheme() — called once per entry point, sets CSS custom properties
// ---------------------------------------------------------------------------

const CSS_PROPERTY_MAP = {
  // New semantic names
  '--bg-app': SEMANTIC.bgApp,
  '--bg-card': SEMANTIC.bgCard,
  '--bg-elevated': SEMANTIC.bgElevated,
  '--bg-hover': SEMANTIC.bgHover,
  '--border-subtle': SEMANTIC.borderSubtle,
  '--text-primary': SEMANTIC.textPrimary,
  '--text-secondary': SEMANTIC.textSecondary,
  '--text-disabled': SEMANTIC.textDisabled,
  '--focus-ring': SEMANTIC.focusRing,
  '--spacing-card': SEMANTIC.spacingCard,
  '--radius-card': SEMANTIC.radiusCard,

  // Backwards-compat aliases for Phase 4 CSS modules
  '--bg-primary': SEMANTIC.bgApp,
  '--bg-surface': SEMANTIC.bgCard,
  '--accent-danger': PRIMITIVES.red,
  '--accent-success': PRIMITIVES.teal,
  '--accent-nope': PRIMITIVES.teal,

  // Raw accent colors for CSS access where inline styles aren't practical
  '--red': PRIMITIVES.red,
  '--red-glow': PRIMITIVES.redGlow,
  '--blue': PRIMITIVES.blue,
  '--blue-glow': PRIMITIVES.blueGlow,
  '--teal': PRIMITIVES.teal,
  '--teal-glow': PRIMITIVES.tealGlow,
  '--amber': PRIMITIVES.amber,
  '--amber-glow': PRIMITIVES.amberGlow,
  '--slate': PRIMITIVES.slate,
  '--slate-glow': PRIMITIVES.slateGlow,
} as const satisfies Record<string, string>

export function applyTheme(): void {
  const root = document.documentElement.style
  for (const [prop, value] of Object.entries(CSS_PROPERTY_MAP)) {
    root.setProperty(prop, value)
  }
}
