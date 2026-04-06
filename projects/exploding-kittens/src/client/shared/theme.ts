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

  // Accents (only 4 neon categories)
  red: '#e03535',           redGlow: '#ff0000',
  blue: '#3b82f6',          blueGlow: '#1a6bff',
  green: '#2dd885',         greenGlow: '#00e673',
  amber: '#e8922a',         amberGlow: '#ff8c00',
  slate: '#7788aa',         slateGlow: '#556688',
} as const

// ---------------------------------------------------------------------------
// TIER 2: SEMANTIC — role-based, what components reference
// ---------------------------------------------------------------------------

export const SEMANTIC = {
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
  'exploding-kitten': { fill: PRIMITIVES.red, glow: PRIMITIVES.redGlow },
  'defuse':           { fill: PRIMITIVES.blue, glow: PRIMITIVES.blueGlow },
  'nope':             { fill: PRIMITIVES.green, glow: PRIMITIVES.greenGlow },
  'attack':           { fill: PRIMITIVES.amber, glow: PRIMITIVES.amberGlow },
  'targeted-attack':  { fill: PRIMITIVES.amber, glow: PRIMITIVES.amberGlow },
  'skip':             { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'see-the-future':   { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'alter-the-future': { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'shuffle':          { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'draw-from-bottom': { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'favor':            { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'feral-cat':        { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'taco-cat':         { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'beard-cat':        { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'rainbow-ralphing-cat': { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'hairy-potato-cat': { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'cattermelon':      { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
} as const satisfies Record<CardType, { fill: string; glow: string }>

export function cardAccent(type: CardType): { fill: string; glow: string } {
  return CARD_TYPE_ACCENTS[type]
}

// ---------------------------------------------------------------------------
// applyTheme() — called once per entry point, sets CSS custom properties
// ---------------------------------------------------------------------------

const CSS_PROPERTY_MAP: Record<string, string> = {
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
  '--accent-success': PRIMITIVES.green,
  '--accent-nope': PRIMITIVES.green,

  // Raw accent colors for CSS access where inline styles aren't practical
  '--red': PRIMITIVES.red,
  '--red-glow': PRIMITIVES.redGlow,
  '--blue': PRIMITIVES.blue,
  '--blue-glow': PRIMITIVES.blueGlow,
  '--green': PRIMITIVES.green,
  '--green-glow': PRIMITIVES.greenGlow,
  '--amber': PRIMITIVES.amber,
  '--amber-glow': PRIMITIVES.amberGlow,
  '--slate': PRIMITIVES.slate,
  '--slate-glow': PRIMITIVES.slateGlow,
}

export function applyTheme(): void {
  const root = document.documentElement.style
  for (const [prop, value] of Object.entries(CSS_PROPERTY_MAP)) {
    root.setProperty(prop, value)
  }
}
