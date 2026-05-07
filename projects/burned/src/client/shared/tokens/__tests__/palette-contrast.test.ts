import { describe, test, expect } from 'vitest'
import { wcagContrast, rgb } from 'culori'
import { APCAcontrast, sRGBtoY } from 'apca-w3'
import { PALETTE } from '../palette.generated'

// ---------- Phase 5 §2.5 — WCAG 2.1 AA + APCA Lc contrast gate ----------
//
// Expanded from Phase 1's 13-pair starter to 31 semantic fg/bg pairs across
// five groups (body-text-on-surfaces, interactive-state-text, feedback-state-
// text, DramaOverlay-hero-text, MinimalCard-face-text). Per-pair WCAG and
// APCA minimums make each pair document its own intent rather than inferring
// from a tier label.
//
// APCA Lc is the primary metric (Radix Colors 2023 move). WCAG 2.1 ratios
// are the secondary metric for legacy compliance.
//
// APCA Lc ≥60 floor on every body-text pair — explicitly asserted, called
// out in roadmap §4.5.

type PairRow = readonly [
  fg: string,
  bg: string,
  minWcag: number,
  minApcaLc: number,
  label: string,
]

// Tier mins — semantic shorthand for the (WCAG, APCA) pair per use case.
// AAA: 7.0:1 / Lc 75 — primary body text (highest legibility)
// CONTENT: 4.5:1 / Lc 60 — secondary body, button labels, feedback notices
// LARGE: 3.0:1 / Lc 45 — hero-size text (>24px), muted, intentionally subtle
// SANITY: 1.0:1 / Lc 0 — disabled state. Floor catches palette inversion;
//                       disabled IS intentionally unreadable.
const TIER = {
  AAA:     [7.0, 75] as const,
  CONTENT: [4.5, 60] as const,
  LARGE:   [3.0, 45] as const,
  SANITY:  [1.0, 0]  as const,
}

const PAIRS: ReadonlyArray<PairRow> = [
  // Group 1 — body text on surfaces
  ['color-fg-primary',   'color-bg-app',      ...TIER.AAA,     'primary body on app bg (AAA)'],
  ['color-fg-primary',   'color-bg-surface',  ...TIER.AAA,     'primary body on card'],
  ['color-fg-primary',   'color-bg-elevated', ...TIER.AAA,     'primary body on elevated'],
  ['color-fg-secondary', 'color-bg-app',      ...TIER.CONTENT, 'secondary on app bg'],
  ['color-fg-secondary', 'color-bg-surface',  ...TIER.CONTENT, 'secondary on card'],
  ['color-fg-secondary', 'color-bg-elevated', ...TIER.CONTENT, 'secondary on elevated'],
  // muted is intentionally subtle — large-text tier
  ['color-fg-muted',     'color-bg-app',      ...TIER.LARGE,   'muted on app bg'],
  ['color-fg-muted',     'color-bg-surface',  ...TIER.LARGE,   'muted on card'],

  // Group 2 — interactive state text
  ['color-fg-on-accent',   'color-bg-interactive',        ...TIER.CONTENT, 'button label on primary'],
  ['color-fg-on-accent',   'color-bg-interactive-hover',  ...TIER.CONTENT, 'button label on hovered primary'],
  ['color-fg-on-accent',   'color-bg-interactive-active', ...TIER.CONTENT, 'button label on active primary'],
  ['color-fg-interactive', 'color-bg-app',                ...TIER.CONTENT, 'link on app bg'],
  ['color-fg-interactive', 'color-bg-surface',            ...TIER.CONTENT, 'link on card'],
  // disabled state is intentionally unreadable — sanity floor only
  ['color-fg-disabled',    'color-bg-surface',            ...TIER.SANITY,  'disabled state (intentional low)'],

  // Group 3 — feedback state text
  ['color-fg-danger',  'color-bg-app',     ...TIER.CONTENT, 'danger message on app'],
  ['color-fg-danger',  'color-bg-danger',  ...TIER.CONTENT, 'danger notice (self-contained)'],
  ['color-fg-success', 'color-bg-app',     ...TIER.CONTENT, 'success message on app'],
  ['color-fg-success', 'color-bg-success', ...TIER.CONTENT, 'success notice (self-contained)'],
  ['color-fg-warning', 'color-bg-app',     ...TIER.CONTENT, 'warning message on app'],
  ['color-fg-warning', 'color-bg-warning', ...TIER.CONTENT, 'warning notice (self-contained)'],
  ['color-fg-info',    'color-bg-app',     ...TIER.CONTENT, 'info message on app'],
  ['color-fg-info',    'color-bg-info',    ...TIER.CONTENT, 'info notice (self-contained)'],

  // Group 4 — DramaOverlay hero text. All variants render at hero font size
  // (drama-hero-min 32px, drama-victory-min 40px, drama-subdued-min 24px) —
  // large-text tier per WCAG 1.4.3 (≥24px regular or ≥18.66px bold).
  ['color-cream-12',    'color-cordovan-9', ...TIER.LARGE, 'BURNED hero text'],
  ['color-teal-12',     'color-teal-8',     ...TIER.LARGE, 'EXTRACTED hero text'],
  ['color-charcoal-11', 'color-charcoal-6', ...TIER.LARGE, 'ELIMINATED subdued text'],
  ['color-emerald-12',  'color-emerald-8',  ...TIER.LARGE, 'INTERCEPTED hero text'],
  ['color-cream-12',    'color-ochre-9',    ...TIER.LARGE, 'VICTORY text'],

  // Group 5 — MinimalCard face text. Each card type uses its tuned on-* token
  // per semantic.css (color-fg-on-intercept is APCA-tuned charcoal-1).
  ['color-fg-on-burned',    'color-accent-burned',    ...TIER.CONTENT, 'Burned card face'],
  ['color-fg-on-intercept', 'color-accent-intercept', ...TIER.CONTENT, 'Intercept card face'],
  ['color-fg-on-operative', 'color-accent-operative', ...TIER.CONTENT, 'operative card face'],
  ['color-fg-on-drama',     'color-accent-drama',     ...TIER.CONTENT, 'drama-accent card face'],
]

// Mirror of semantic.css §2 — when a new role token is referenced by PAIRS,
// mirror it here. Resolution path: SEMANTIC_MAP first (semantic tokens
// resolve to primitives), then direct PALETTE lookup (raw primitives).
const SEMANTIC_MAP: Record<string, string> = {
  // Foreground
  'color-fg-primary':            PALETTE['color-cream-12'],
  'color-fg-secondary':          PALETTE['color-cream-11'],
  'color-fg-muted':              PALETTE['color-cream-9'],
  'color-fg-disabled':           PALETTE['color-charcoal-8'],
  'color-fg-interactive':        PALETTE['color-teal-12'],
  'color-fg-on-accent':          PALETTE['color-cream-12'],
  'color-fg-on-danger':          PALETTE['color-cream-12'],
  'color-fg-on-success':         PALETTE['color-cream-12'],
  'color-fg-on-intercept':       PALETTE['color-charcoal-1'],
  'color-fg-on-warning':         PALETTE['color-cream-12'],
  'color-fg-on-drama':           PALETTE['color-cream-12'],
  'color-fg-on-neon':            PALETTE['color-cream-12'],
  'color-fg-on-burned':          PALETTE['color-cream-12'],
  'color-fg-on-operative':       PALETTE['color-cream-12'],
  'color-fg-danger':             PALETTE['color-cordovan-11'],
  'color-fg-success':            PALETTE['color-emerald-11'],
  'color-fg-warning':            PALETTE['color-ochre-11'],
  'color-fg-info':               PALETTE['color-teal-11'],
  // Background
  'color-bg-app':                PALETTE['color-teal-2'],
  'color-bg-surface':            PALETTE['color-teal-4'],
  'color-bg-elevated':           PALETTE['color-teal-5'],
  'color-bg-interactive':        PALETTE['color-teal-5'],
  'color-bg-interactive-hover':  PALETTE['color-teal-6'],
  'color-bg-interactive-active': PALETTE['color-teal-7'],
  'color-bg-danger':             PALETTE['color-cordovan-3'],
  'color-bg-success':            PALETTE['color-emerald-3'],
  'color-bg-warning':            PALETTE['color-ochre-3'],
  'color-bg-info':                PALETTE['color-teal-3'],
  // Accents
  'color-accent-burned':         PALETTE['color-burned-fire'],
  'color-accent-intercept':      PALETTE['color-emerald-9'],
  'color-accent-operative':      PALETTE['color-teal-9'],
  'color-accent-drama':          PALETTE['color-ochre-9'],
  'color-accent-neon':           PALETTE['color-neon-magenta'],
}

function resolve(key: string): string {
  return SEMANTIC_MAP[key] ?? PALETTE[key as keyof typeof PALETTE]
}

function toApcaRgb(cssColor: string): [number, number, number, number] {
  // B5: sRGBtoY expects [R, G, B] as 0-255 integers, NOT culori's
  // {r, g, b} in 0-1 floats. Bridge here.
  const c = rgb(cssColor)
  if (!c) throw new Error(`Unparseable color for APCA: ${cssColor}`)
  return [
    Math.round((c.r ?? 0) * 255),
    Math.round((c.g ?? 0) * 255),
    Math.round((c.b ?? 0) * 255),
    c.alpha ?? 1,
  ]
}

// Pairs that fail tier minimums today, flagged for Phase 1 palette amendment
// per §2.5.3. Each entry is (fg, bg, metric, label) where metric is 'wcag'
// or 'apca'. The same pair may fail one metric and pass the other —
// scope is per (pair, metric) combo.
//
// Each test.fails ratchets the bad state: when a palette change makes the
// pair pass, the test fails ("Expect test to fail") and the entry is removed.
//
// Follow-up: docs/plans/css-foundation-rebuild/phase-5-cvd-followup.md
// (same followup doc as §2.4 — both groups want palette amendments touching
// emerald-8/9, ochre-9, teal-9 and the cream-12 fg pairings).
const DESIGN_ATTENTION: Array<readonly [string, string, 'wcag' | 'apca', string]> = [
  ['color-fg-muted',        'color-bg-surface',       'apca', 'muted on card'],
  ['color-fg-on-intercept', 'color-accent-intercept', 'apca', 'Intercept card face'],
  ['color-fg-on-operative', 'color-accent-operative', 'wcag', 'operative card face'],
  ['color-fg-on-drama',     'color-accent-drama',     'wcag', 'drama-accent card face'],
  // drama-accent card face APCA graduated 2026-05-06 by Option C ochre-9
  // amendment (cream-12 on #947226 = Lc 63.7, was Lc 58.3 against #b0754c).
  // The WCAG variant remains in DESIGN_ATTENTION — ratio 3.77 is still
  // under 4.5:1 CONTENT-tier; full closure would need cream-12 → cream-11
  // OR a darker --color-fg-on-drama token, both deferred.
]

const SKIP = new Set(DESIGN_ATTENTION.map(([fg, bg, m]) => `${fg}|${bg}|${m}`))

describe('palette contrast — WCAG 2.1', () => {
  for (const [fg, bg, minWcag, , label] of PAIRS) {
    if (SKIP.has(`${fg}|${bg}|wcag`)) continue
    test(`${label} — ${fg} on ${bg} >= ${minWcag}:1`, () => {
      const fgHex = resolve(fg)
      const bgHex = resolve(bg)
      const ratio = wcagContrast(fgHex, bgHex)
      expect(
        ratio,
        `${fg}=${fgHex} on ${bg}=${bgHex}: ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(minWcag)
    })
  }
})

describe('palette contrast — APCA Lc (Myndex Bronze)', () => {
  for (const [fg, bg, , minApca, label] of PAIRS) {
    if (SKIP.has(`${fg}|${bg}|apca`)) continue
    test(`${label} — ${fg} on ${bg} |Lc| >= ${minApca}`, () => {
      const fgHex = resolve(fg)
      const bgHex = resolve(bg)
      const fgY = sRGBtoY(toApcaRgb(fgHex))
      const bgY = sRGBtoY(toApcaRgb(bgHex))
      // APCA returns signed Lc (negative = WoB, positive = BoW). Standard
      // practice per Myndex docs: compare |Lc| against the minimum.
      const lcSigned = APCAcontrast(fgY, bgY)
      const lcMag = Math.abs(lcSigned)
      const polarity = lcSigned < 0 ? 'WoB' : 'BoW'
      expect(
        lcMag,
        `${fg} on ${bg} [${polarity}]: Lc ${lcSigned.toFixed(1)}`,
      ).toBeGreaterThanOrEqual(minApca)
    })
  }
})

describe('palette contrast — DESIGN_ATTENTION (flagged for §2.5.3 palette amendment)', () => {
  for (const [fg, bg, metric, label] of DESIGN_ATTENTION) {
    const pair = PAIRS.find(([f, b]) => f === fg && b === bg)
    if (!pair) throw new Error(`DESIGN_ATTENTION pair ${fg}|${bg} not in PAIRS`)
    const [, , minWcag, minApca] = pair

    test.fails(`${label} — ${fg} on ${bg} (${metric}, expected to fail until palette amended)`, () => {
      const fgHex = resolve(fg)
      const bgHex = resolve(bg)
      if (metric === 'wcag') {
        const ratio = wcagContrast(fgHex, bgHex)
        expect(ratio).toBeGreaterThanOrEqual(minWcag)
      } else {
        const fgY = sRGBtoY(toApcaRgb(fgHex))
        const bgY = sRGBtoY(toApcaRgb(bgHex))
        const lcMag = Math.abs(APCAcontrast(fgY, bgY))
        expect(lcMag).toBeGreaterThanOrEqual(minApca)
      }
    })
  }
})
