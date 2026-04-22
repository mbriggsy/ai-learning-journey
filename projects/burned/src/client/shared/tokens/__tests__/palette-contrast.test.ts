import { describe, test, expect } from 'vitest'
import { wcagContrast, rgb } from 'culori'
import { APCAcontrast, sRGBtoY } from 'apca-w3'
import { PALETTE } from '../palette.generated'

// Myndex ARC Bronze thresholds
const APCA_BODY = 75
const APCA_CONTENT = 60
const APCA_LARGE = 45

// WCAG 2.1 AA
const WCAG_NORMAL = 4.5
const WCAG_LARGE = 3.0

type Tier = 'body' | 'content' | 'large'

// Resolve semantic names to primitive hex values.
const SEMANTIC_RESOLVE: Record<string, string> = {
  'color-fg-primary': PALETTE['color-cream-12'],
  'color-fg-secondary': PALETTE['color-cream-11'],
  'color-fg-muted': PALETTE['color-cream-9'],    // CVD-tuned: may be close to threshold
  'color-fg-danger': PALETTE['color-cordovan-11'],
  'color-fg-success': PALETTE['color-emerald-11'],
  'color-fg-warning': PALETTE['color-ochre-11'],
  'color-fg-info': PALETTE['color-teal-11'],
  'color-fg-on-danger': PALETTE['color-cream-12'],
  'color-fg-on-success': PALETTE['color-cream-12'],
  'color-fg-on-intercept': PALETTE['color-charcoal-1'],
  'color-fg-on-warning': PALETTE['color-cream-12'],    // APCA-tuned
  'color-fg-on-drama': PALETTE['color-cream-12'],      // APCA-tuned
  'color-fg-on-neon': PALETTE['color-cream-12'],        // APCA-tuned
  'color-bg-app': PALETTE['color-charcoal-1'],
  'color-bg-surface': PALETTE['color-charcoal-3'],
  'color-accent-burned': PALETTE['color-burned-fire'],
  'color-accent-intercept': PALETTE['color-emerald-9'],
  'color-accent-drama': PALETTE['color-ochre-9'],
  'color-accent-neon': PALETTE['color-neon-magenta'],
  'color-ochre-9': PALETTE['color-ochre-9'],
}

function resolve(key: string): string {
  return SEMANTIC_RESOLVE[key] ?? PALETTE[key as keyof typeof PALETTE]
}

const PAIRS: ReadonlyArray<readonly [string, string, Tier]> = [
  ['color-fg-primary', 'color-bg-app', 'body'],
  ['color-fg-primary', 'color-bg-surface', 'body'],
  ['color-fg-secondary', 'color-bg-app', 'content'],
  ['color-fg-muted', 'color-bg-app', 'large'],
  ['color-fg-danger', 'color-bg-app', 'content'],
  ['color-fg-success', 'color-bg-app', 'content'],
  ['color-fg-warning', 'color-bg-app', 'content'],
  ['color-fg-info', 'color-bg-app', 'content'],
  ['color-fg-on-danger', 'color-accent-burned', 'content'],
  ['color-fg-on-intercept', 'color-accent-intercept', 'large'], // charcoal-1 on emerald-9, large text
  ['color-fg-on-warning', 'color-ochre-9', 'large'],           // warning badges use large text
  ['color-fg-on-drama', 'color-accent-drama', 'large'],        // DramaOverlay titles are display-size
  ['color-fg-on-neon', 'color-accent-neon', 'large'],           // neon accent moments use large text
]

const APCA_MIN: Record<Tier, number> = {
  body: APCA_BODY, content: APCA_CONTENT, large: APCA_LARGE,
}
const WCAG_MIN: Record<Tier, number> = {
  body: WCAG_NORMAL, content: WCAG_NORMAL, large: WCAG_LARGE,
}

function toApcaRgb(cssColor: string): [number, number, number, number] {
  const c = rgb(cssColor)
  if (!c) throw new Error(`Unparseable color for APCA: ${cssColor}`)
  return [
    Math.round((c.r ?? 0) * 255),
    Math.round((c.g ?? 0) * 255),
    Math.round((c.b ?? 0) * 255),
    c.alpha ?? 1,
  ]
}

describe('palette contrast — WCAG 2.1 AA', () => {
  for (const [fg, bg, tier] of PAIRS) {
    test(`${fg} on ${bg} (${tier}) >= ${WCAG_MIN[tier]}:1`, () => {
      const fgHex = resolve(fg)
      const bgHex = resolve(bg)
      const ratio = wcagContrast(fgHex, bgHex)
      expect(
        ratio,
        `${fg}=${fgHex} on ${bg}=${bgHex}: ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(WCAG_MIN[tier])
    })
  }
})

describe('palette contrast — APCA Lc (Myndex Bronze)', () => {
  for (const [fg, bg, tier] of PAIRS) {
    test(`${fg} on ${bg} (${tier}) |Lc| >= ${APCA_MIN[tier]}`, () => {
      const fgHex = resolve(fg)
      const bgHex = resolve(bg)
      const fgY = sRGBtoY(toApcaRgb(fgHex))
      const bgY = sRGBtoY(toApcaRgb(bgHex))
      const lcSigned = APCAcontrast(fgY, bgY)
      const lcMag = Math.abs(lcSigned)
      const polarity = lcSigned < 0 ? 'WoB' : 'BoW'
      expect(
        lcMag,
        `${fg} on ${bg} [${polarity}]: Lc ${lcSigned.toFixed(1)}`,
      ).toBeGreaterThanOrEqual(APCA_MIN[tier])
    })
  }
})
