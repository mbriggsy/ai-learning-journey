import { useSyncExternalStore } from 'react'
import type { CardType } from '@shared/types'

// ---------------------------------------------------------------------------
// TIER 1: PRIMITIVES — raw values, never referenced by components
// ---------------------------------------------------------------------------

const PRIMITIVES = {
  // Surfaces — warm mid-century modern (cocktail lounge, not noir)
  black: '#1a2a2e',        // deep teal-charcoal, warm NOT cold
  surface1: '#1f3338',     // card face — dark teal
  surface2: '#243c42',     // dialog/sheet
  surface3: '#2d4850',     // hover surface
  border: '#3a5860',

  // Text (warm cream, NOT cold white)
  textBright: '#f5f0e0',   // warm cream — AAA on teal-charcoal
  textMuted: '#b8a890',    // warm sand — AA on teal-charcoal
  textDim: '#6a6050',

  // Game-critical accents (saturated, warm, CVD-safe — reserved for drama)
  red: '#d44030',           redGlow: '#ff3020',     // alarm red — BURNED card
  blue: '#3080c0',          blueGlow: '#2070b0',    // cool relief — Extraction
  teal: '#2aaa98',          tealGlow: '#20c0a8',    // intercepted
  amber: '#d48820',         amberGlow: '#f0a020',   // action cards

  // Utility card accent (warm bronze, blends with mid-century palette)
  slate: '#907860',         slateGlow: '#786850',

  // Operative accents — each agent's signature color, warm & saturated
  taco: '#c87830',          tacoGlow: '#e09040',    // Dash — warm tan/orange
  beard: '#2a8878',         beardGlow: '#30a890',   // Vera — sharp teal
  rainbow: '#8848a8',       rainbowGlow: '#a060c8', // Sable — heiress purple
  potato: '#b89028',        potatoGlow: '#d0a838',  // Janet — authoritative gold
  melon: '#b84060',         melonGlow: '#d05070',   // Neal — anxious rose
  feral: '#a0a0a0',         feralGlow: '#c0c0c0',   // Agent X — mysterious grey
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
  focusRing: '#f0a020',   // warm amber — visible on teal backgrounds

  spacingCard: '8px',
  radiusCard: '8px',
} as const

// ---------------------------------------------------------------------------
// TIER 3: PER-CARD-TYPE — compile-time exhaustive accent lookup
// ---------------------------------------------------------------------------

const CARD_TYPE_ACCENTS = {
  // Game-critical: each gets a unique neon accent
  'burned':           { fill: PRIMITIVES.red, glow: PRIMITIVES.redGlow },
  'extraction':       { fill: PRIMITIVES.blue, glow: PRIMITIVES.blueGlow },
  'intercepted':      { fill: PRIMITIVES.teal, glow: PRIMITIVES.tealGlow },
  'reassign':         { fill: PRIMITIVES.amber, glow: PRIMITIVES.amberGlow },
  'direct-order':     { fill: PRIMITIVES.amber, glow: PRIMITIVES.amberGlow },

  // Utility: warm slate (calm, not attention-grabbing)
  'go-dark':          { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'intel-briefing':   { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'falsify-intel':    { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'burn-the-files':   { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'back-channel':     { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },
  'call-in-a-favor':  { fill: PRIMITIVES.slate, glow: PRIMITIVES.slateGlow },

  // Operatives: each agent has personality
  'agent-x':          { fill: PRIMITIVES.feral, glow: PRIMITIVES.feralGlow },
  'dash-barlowe':     { fill: PRIMITIVES.taco, glow: PRIMITIVES.tacoGlow },
  'vera-khan':        { fill: PRIMITIVES.beard, glow: PRIMITIVES.beardGlow },
  'sable-ashworth':       { fill: PRIMITIVES.rainbow, glow: PRIMITIVES.rainbowGlow },
  'janet-broadside':  { fill: PRIMITIVES.potato, glow: PRIMITIVES.potatoGlow },
  'neal-proctor':     { fill: PRIMITIVES.melon, glow: PRIMITIVES.melonGlow },
} as const satisfies Record<CardType, { fill: string; glow: string }>

// Light-mode accents: darkened for contrast on warm parchment, muted glows for shadow tinting
const LIGHT_CARD_TYPE_ACCENTS = {
  'burned':           { fill: '#b83020', glow: '#a02818' },
  'extraction':       { fill: '#2060a0', glow: '#185090' },
  'intercepted':      { fill: '#1a7868', glow: '#106858' },
  'reassign':         { fill: '#a07010', glow: '#886008' },
  'direct-order':     { fill: '#a07010', glow: '#886008' },

  'go-dark':          { fill: '#6a5840', glow: '#584830' },
  'intel-briefing':   { fill: '#6a5840', glow: '#584830' },
  'falsify-intel':    { fill: '#6a5840', glow: '#584830' },
  'burn-the-files':   { fill: '#6a5840', glow: '#584830' },
  'back-channel':     { fill: '#6a5840', glow: '#584830' },
  'call-in-a-favor':  { fill: '#6a5840', glow: '#584830' },

  'agent-x':          { fill: '#606060', glow: '#484848' },
  'dash-barlowe':     { fill: '#986020', glow: '#805018' },
  'vera-khan':        { fill: '#186858', glow: '#105848' },
  'sable-ashworth':       { fill: '#683890', glow: '#582880' },
  'janet-broadside':  { fill: '#907020', glow: '#786010' },
  'neal-proctor':     { fill: '#983050', glow: '#802840' },
} as const satisfies Record<CardType, { fill: string; glow: string }>

export function cardAccent(type: CardType): { fill: string; glow: string } {
  return activeScheme === 'light'
    ? LIGHT_CARD_TYPE_ACCENTS[type]
    : CARD_TYPE_ACCENTS[type]
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

// Phone surfaces: lighter than board, same warm teal family.
// Board = rich/saturated showpiece. Phone = slightly muted for readability.
const PHONE_OVERRIDES: Record<string, string> = {
  '--bg-app': '#223840',       // lighter warm teal
  '--bg-card': '#2a4248',
  '--bg-elevated': '#304a52',
  '--bg-hover': '#38545e',
  '--border-subtle': '#486068',
  '--bg-primary': '#223840',
  '--bg-surface': '#2a4248',
}

// Light mode: warm parchment — classified document on a desk in warm light
const LIGHT_PHONE_OVERRIDES: Record<string, string> = {
  '--bg-app':        '#f5efe0',   // warm parchment, aged paper feel
  '--bg-card':       '#faf8f0',   // cream card face
  '--bg-elevated':   '#ffffff',   // true white = "lift" for sheets/dialogs
  '--bg-hover':      '#ece6d8',   // touch feedback
  '--border-subtle': '#d0c8b8',   // warm sand
  '--bg-primary':    '#f5efe0',
  '--bg-surface':    '#faf8f0',
  '--text-primary':  '#1c1a15',   // warm near-black, AAA on parchment
  '--text-secondary':'#5c574d',   // AA on parchment
  '--text-disabled': '#9e998f',   // decorative only
  '--focus-ring':    '#b07010',   // warm amber on light backgrounds
  // Darkened accents for readability on light
  '--red':           '#b83020',
  '--red-glow':      '#a02818',
  '--blue':          '#2060a0',
  '--blue-glow':     '#185090',
  '--teal':          '#1a7868',
  '--teal-glow':     '#106858',
  '--amber':         '#a07010',
  '--amber-glow':    '#886008',
  '--slate':         '#6a5840',
  '--slate-glow':    '#584830',
  '--accent-danger': '#b83020',
  '--accent-success':'#1a7868',
  '--accent-nope':   '#1a7868',
}

// ---------------------------------------------------------------------------
// Color scheme state — tracks active light/dark for cardAccent() and React
// ---------------------------------------------------------------------------

let activeScheme: 'dark' | 'light' = 'dark'
const schemeListeners = new Set<() => void>()

function setScheme(scheme: 'dark' | 'light'): void {
  if (activeScheme === scheme) return
  activeScheme = scheme
  for (const listener of schemeListeners) listener()
}

export function getColorScheme(): 'dark' | 'light' {
  return activeScheme
}

function subscribeScheme(listener: () => void): () => void {
  schemeListeners.add(listener)
  return () => schemeListeners.delete(listener)
}

/** React hook — forces re-render on OS light/dark switch */
export function useColorScheme(): 'dark' | 'light' {
  return useSyncExternalStore(subscribeScheme, getColorScheme)
}

// ---------------------------------------------------------------------------
// applyTheme() — sets CSS custom properties + detects color scheme
// ---------------------------------------------------------------------------

function applyOverrides(overrides: Record<string, string>): void {
  const root = document.documentElement.style
  for (const [prop, value] of Object.entries(overrides)) {
    root.setProperty(prop, value)
  }
}

export function applyTheme(variant: 'board' | 'player' = 'board'): void {
  applyOverrides(CSS_PROPERTY_MAP)

  if (variant === 'player') {
    const mql = window.matchMedia('(prefers-color-scheme: light)')

    const apply = (prefersLight: boolean) => {
      const overrides = prefersLight ? LIGHT_PHONE_OVERRIDES : PHONE_OVERRIDES
      applyOverrides(overrides)
      document.documentElement.dataset.theme = prefersLight ? 'light' : 'dark'
      setScheme(prefersLight ? 'light' : 'dark')
    }

    apply(mql.matches)
    mql.addEventListener('change', (e) => apply(e.matches))
  }
}
