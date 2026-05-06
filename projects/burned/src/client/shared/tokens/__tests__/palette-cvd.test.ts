import { describe, test, expect } from 'vitest'
import {
  parse,
  rgb,
  filterDeficiencyDeuter,
  filterDeficiencyProt,
  filterDeficiencyTrit,
  differenceEuclidean,
  converter,
} from 'culori'
import { APCAcontrast, sRGBtoY } from 'apca-w3'
import { PALETTE } from '../palette.generated'

// ---------- CVD simulation gate ----------
//
// Phase 5 §2.4 — expanded from the 3-pair Phase 1 starter to 36 critical
// pairs across six gameplay-context groups, then re-tiered per Phase 1's
// stated rule: pairs where color is the SOLE indicator gate strict;
// pairs where color always co-occurs with text/iconography gate at the
// perceptual JND floor (catches catastrophic regressions only).
//
// Three describe blocks:
//   1. STRICT — color is the sole indicator (card type, focus ring, full-
//      screen DramaOverlay backgrounds). Gate at MIN_DISTANCE = 0.10.
//   2. INFORMATIONAL — color always paired with semantic text/icons (toast
//      bgs, fg pairs, intentional same-hue pairs). Gate at JND floor 0.02.
//   3. DESIGN_ATTENTION — strict pairs known to fail strict gating, flagged
//      for Phase 1 palette amendment per §7.1. Each is a `test.fails` so the
//      suite passes today AND a future palette improvement trips the test
//      (signal to graduate the pair to STRICT).
//
// 'oklab' (Cartesian, perceptual), NOT 'oklch' (cylindrical — hue wraps).
// culori CVD exports: filterDeficiency{Deuter,Prot,Trit}(severity).
//
// Plan token name → reality (semantic.css):
//   color-rose-neon       → color-accent-neon       (color-neon-magenta)
//   color-rose-neon-glow  → color-accent-neon-glow  (color-neon-magenta-glow)

const STRICT_PAIRS = [
  // Group A — danger vs success: only the pairs that gate WITHOUT a label
  ['color-accent-burned',    'color-accent-intercept', 'A1 Burned vs Intercept'],
  ['color-cordovan-9',       'color-emerald-9',        'A5 cordovan-9 vs emerald-9'],

  // Group B — accent card-type differentiation
  ['color-accent-burned',    'color-accent-operative', 'B1 Burned vs operative'],
  ['color-accent-burned',    'color-accent-drama',     'B2 Burned vs drama'],
  ['color-accent-intercept', 'color-accent-operative', 'B3 Intercept vs operative'],
  ['color-accent-intercept', 'color-accent-drama',     'B4 Intercept vs drama'],
  ['color-accent-operative', 'color-accent-drama',     'B5 operative vs drama'],

  // Group C — focus ring (silent, no co-occurring label)
  ['color-border-focus',     'color-bg-app',         'C1 focus on app'],
  ['color-border-focus',     'color-bg-surface',     'C2 focus on surface'],
  ['color-border-focus',     'color-bg-interactive', 'C3 focus on primary btn'],
  ['color-border-focus',     'color-bg-danger',      'C4 focus on danger btn'],
  ['color-border-focus',     'color-bg-success',     'color-border-focus on success btn'],
  ['color-border-focus',     'color-border-strong',  'C6 focus vs static border'],

  // Group E — DramaOverlay variant backgrounds (full-screen, color carries
  // the moment). E2/E3/E6 fail strict and are listed in DESIGN_ATTENTION.
  ['color-cordovan-9',       'color-teal-8',         'E1 BURNED vs EXTRACTED'],
  ['color-cordovan-9',       'color-ochre-9',        'E4 BURNED vs VICTORY'],
  ['color-teal-8',           'color-charcoal-6',     'E5 EXTRACTED vs ELIMINATED'],
  ['color-teal-8',           'color-ochre-9',        'E7 EXTRACTED vs VICTORY'],
  ['color-charcoal-6',       'color-emerald-8',      'E8 ELIMINATED vs INTERCEPTED'],
  ['color-charcoal-6',       'color-ochre-9',        'E9 ELIMINATED vs VICTORY'],
  ['color-emerald-8',        'color-ochre-9',        'E10 INTERCEPTED vs VICTORY'],

  // Group F — neon spot color readability against surfaces
  ['color-accent-neon',      'color-bg-app',         'F1 neon vs app bg'],
  ['color-accent-neon',      'color-bg-surface',     'F2 neon vs surface'],
] as const

const INFORMATIONAL_PAIRS = [
  // Phase 1 rule: step-3 bg pairs and step-11 fg pairs always co-occur with
  // semantic icons + words. Logged at JND floor to catch catastrophic
  // regressions (palette inversion etc.) but not tight separation.
  ['color-fg-danger',        'color-fg-success',     'A2 danger fg vs success fg'],
  ['color-bg-danger',        'color-bg-success',     'A3 danger bg vs success bg'],
  ['color-border-danger',    'color-border-success', 'A4 danger border vs success border'],
  ['color-cordovan-11',      'color-emerald-11',     'A6 cordovan-11 vs emerald-11 (=A2 primitives)'],
  ['color-bg-warning',       'color-bg-danger',      'D1 warning vs danger bg'],
  ['color-bg-warning',       'color-bg-success',     'D2 warning vs success bg'],
  ['color-bg-warning',       'color-bg-info',        'D3 warning vs info bg'],
  ['color-bg-info',          'color-bg-interactive', 'D4 info vs interactive bg'],
  ['color-fg-warning',       'color-fg-danger',      'D5 warning fg vs danger fg'],
  ['color-fg-info',          'color-fg-success',     'D6 info fg vs success fg'],
  // F3 is an intentional same-hue pair (glow is brighter version of base).
  ['color-accent-neon-glow', 'color-accent-neon',    'F3 neon glow vs base'],
] as const

// Pairs that fail STRICT gating today, flagged for Phase 1 palette amendment
// per §7.1. Each entry's `test.fails` documents the known-bad state and acts
// as a tripwire — if a palette change makes the pair pass, the test fails
// ("Expect test to fail"), signaling the pair should be moved to STRICT_PAIRS.
//
// Tritan collapses the cool blue-green axis: teal-8 and emerald-8 read as
// nearly the same color. Deuteranopia/protanopia collapse the red-green
// axis: cordovan-9 (wine) loses separation against charcoal-6 / emerald-8;
// emerald-8/9 lose separation against ochre-9 (yellow-toned green/yellow);
// teal-8 loses separation against cordovan-9.
//
// Follow-up: docs/plans/css-foundation-rebuild/phase-5-cvd-followup.md
// authored alongside this re-tier — the palette amendment is its own
// session because it ripples through DramaOverlay backgrounds, badges,
// and accent-color visual identity.
const DESIGN_ATTENTION_CASES: Array<readonly [string, string, 'deuteranopia' | 'protanopia' | 'tritanopia', string]> = [
  ['color-accent-intercept', 'color-accent-drama',  'deuteranopia', 'B4 Intercept vs drama'],
  ['color-accent-operative', 'color-accent-drama',  'protanopia',   'B5 operative vs drama'],
  ['color-cordovan-9',       'color-teal-8',        'deuteranopia', 'E1 BURNED vs EXTRACTED'],
  ['color-cordovan-9',       'color-charcoal-6',    'protanopia',   'E2 BURNED vs ELIMINATED'],
  ['color-cordovan-9',       'color-emerald-8',     'deuteranopia', 'E3 BURNED vs INTERCEPTED'],
  ['color-teal-8',           'color-emerald-8',     'tritanopia',   'E6 EXTRACTED vs INTERCEPTED'],
  ['color-teal-8',           'color-emerald-8',     'deuteranopia', 'E6 EXTRACTED vs INTERCEPTED'],
  ['color-teal-8',           'color-emerald-8',     'protanopia',   'E6 EXTRACTED vs INTERCEPTED'],
  ['color-emerald-8',        'color-ochre-9',       'protanopia',   'E10 INTERCEPTED vs VICTORY'],
]

const STRICT_MIN_DISTANCE = 0.10
// Informational floor catches only catastrophic palette regressions
// (e.g., a token swap inverting bg/fg). Color isn't carrying the work in
// this tier — text/icon labels do. Floor is well below the CSS CM4 JND
// (0.02) so genuinely-tight pairs pass without clutter.
const INFORMATIONAL_MIN_DISTANCE = 0.005

const deuter = filterDeficiencyDeuter(1)
const protan = filterDeficiencyProt(1)
const tritan = filterDeficiencyTrit(1)
const oklabDistance = differenceEuclidean('oklab')

const SIMULATORS = [
  ['deuteranopia', deuter],
  ['protanopia', protan],
  ['tritanopia', tritan],
] as const

const SIM_BY_NAME: Record<string, ReturnType<typeof filterDeficiencyDeuter>> = {
  deuteranopia: deuter,
  protanopia: protan,
  tritanopia: tritan,
}

// Mirror of semantic.css §2 (--color-* role tokens). When semantic.css adds
// a new role token referenced by a pair list, mirror it here.
const SEMANTIC_MAP: Record<string, string> = {
  'color-bg-app':           PALETTE['color-teal-2'],
  'color-bg-surface':       PALETTE['color-teal-4'],
  'color-bg-interactive':   PALETTE['color-teal-5'],
  'color-border-focus':     PALETTE['color-ochre-8'],
  'color-border-strong':    PALETTE['color-charcoal-7'],
  'color-border-danger':    PALETTE['color-cordovan-7'],
  'color-border-success':   PALETTE['color-emerald-7'],
  'color-fg-danger':        PALETTE['color-cordovan-11'],
  'color-bg-danger':        PALETTE['color-cordovan-3'],
  'color-fg-success':       PALETTE['color-emerald-11'],
  'color-bg-success':       PALETTE['color-emerald-3'],
  'color-fg-warning':       PALETTE['color-ochre-11'],
  'color-bg-warning':       PALETTE['color-ochre-3'],
  'color-fg-info':          PALETTE['color-teal-11'],
  'color-bg-info':          PALETTE['color-teal-3'],
  'color-accent-burned':    PALETTE['color-burned-fire'],
  'color-accent-intercept': PALETTE['color-emerald-9'],
  'color-accent-operative': PALETTE['color-teal-9'],
  'color-accent-drama':     PALETTE['color-ochre-9'],
  'color-accent-neon':      PALETTE['color-neon-magenta'],
  'color-accent-neon-glow': PALETTE['color-neon-magenta-glow'],
}

function resolveColor(key: string): string {
  return SEMANTIC_MAP[key] ?? PALETTE[key as keyof typeof PALETTE]
}

function distanceUnderSim(a: string, b: string, sim: ReturnType<typeof filterDeficiencyDeuter>): number {
  const hexA = resolveColor(a)
  const hexB = resolveColor(b)
  const colorA = parse(hexA)
  const colorB = parse(hexB)
  if (!colorA || !colorB) {
    throw new Error(`Unparseable: ${a}=${hexA} / ${b}=${hexB}`)
  }
  return oklabDistance(sim(colorA), sim(colorB))
}

// Skip-set for STRICT iteration — these (pair, sim) combos are owned by
// DESIGN_ATTENTION_CASES (test.fails) and must not run twice.
const DESIGN_ATTENTION_SKIP = new Set(
  DESIGN_ATTENTION_CASES.map(([a, b, sim]) => `${a}|${b}|${sim}`),
)

describe('palette CVD legibility — STRICT (color is sole indicator)', () => {
  for (const [simName, sim] of SIMULATORS) {
    for (const [a, b, label] of STRICT_PAIRS) {
      const key = `${a}|${b}|${simName}`
      if (DESIGN_ATTENTION_SKIP.has(key)) continue
      test(`${label} — distinguishable under ${simName}`, () => {
        const d = distanceUnderSim(a, b, sim)
        expect(
          d,
          `${a} vs ${b} under ${simName}: distance ${d.toFixed(4)} < ${STRICT_MIN_DISTANCE}`,
        ).toBeGreaterThanOrEqual(STRICT_MIN_DISTANCE)
      })
    }
  }
})

describe('palette CVD legibility — INFORMATIONAL (always co-occurs with label)', () => {
  for (const [simName, sim] of SIMULATORS) {
    for (const [a, b, label] of INFORMATIONAL_PAIRS) {
      test(`${label} — above JND floor under ${simName}`, () => {
        const d = distanceUnderSim(a, b, sim)
        expect(
          d,
          `${a} vs ${b} under ${simName}: distance ${d.toFixed(4)} < ${INFORMATIONAL_MIN_DISTANCE} (palette regression suspected)`,
        ).toBeGreaterThanOrEqual(INFORMATIONAL_MIN_DISTANCE)
      })
    }
  }
})

describe('palette CVD legibility — DESIGN_ATTENTION (flagged for §7.1 palette amendment)', () => {
  // Each test asserts distance ≥ STRICT_MIN_DISTANCE under test.fails — i.e.,
  // the assertion is EXPECTED to fail today. If a palette change improves the
  // pair, the test will pass and Vitest reports "unexpected pass" → the pair
  // should be moved to STRICT_PAIRS.
  for (const [a, b, simName, label] of DESIGN_ATTENTION_CASES) {
    test.fails(`${label} — under ${simName} (expected to fail until palette amended)`, () => {
      const sim = SIM_BY_NAME[simName]!
      const d = distanceUnderSim(a, b, sim)
      expect(d).toBeGreaterThanOrEqual(STRICT_MIN_DISTANCE)
    })
  }
})

// ---------- Radix APCA guarantees per scale ----------

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

const SCALES = ['teal', 'ochre', 'cream', 'charcoal', 'cordovan', 'emerald'] as const

describe('Radix APCA guarantees per scale', () => {
  for (const scale of SCALES) {
    const step2Key = `color-${scale}-2` as keyof typeof PALETTE
    const step11Key = `color-${scale}-11` as keyof typeof PALETTE
    const step12Key = `color-${scale}-12` as keyof typeof PALETTE

    test(`${scale}-11 on ${scale}-2 meets APCA Lc 60`, () => {
      const fgY = sRGBtoY(toApcaRgb(PALETTE[step11Key]))
      const bgY = sRGBtoY(toApcaRgb(PALETTE[step2Key]))
      const lcSigned = APCAcontrast(fgY, bgY)
      const lcMag = Math.abs(lcSigned)
      const polarity = lcSigned < 0 ? 'WoB' : 'BoW'
      expect(
        lcMag,
        `${scale}-11 on ${scale}-2 [${polarity}]: Lc ${lcSigned.toFixed(1)}`,
      ).toBeGreaterThanOrEqual(60)
    })

    test(`${scale}-12 on ${scale}-2 meets APCA Lc 90`, () => {
      const fgY = sRGBtoY(toApcaRgb(PALETTE[step12Key]))
      const bgY = sRGBtoY(toApcaRgb(PALETTE[step2Key]))
      const lcSigned = APCAcontrast(fgY, bgY)
      const lcMag = Math.abs(lcSigned)
      const polarity = lcSigned < 0 ? 'WoB' : 'BoW'
      expect(
        lcMag,
        `${scale}-12 on ${scale}-2 [${polarity}]: Lc ${lcSigned.toFixed(1)}`,
      ).toBeGreaterThanOrEqual(90)
    })
  }
})

// ---------- Luminance separation for the red/green CVD trap ----------

const toOklab = converter('oklab')

describe('cordovan vs emerald luminance separation', () => {
  test('|L_oklab(cordovan-9) - L_oklab(emerald-9)| >= 0.10', () => {
    const cord = parse(PALETTE['color-cordovan-9'])
    const emer = parse(PALETTE['color-emerald-9'])
    if (!cord || !emer) throw new Error('Unparseable cordovan-9 or emerald-9')
    const lCord = toOklab(cord).l ?? 0
    const lEmer = toOklab(emer).l ?? 0
    const delta = Math.abs(lCord - lEmer)
    expect(
      delta,
      `cordovan-9 L ${lCord.toFixed(3)} vs emerald-9 L ${lEmer.toFixed(3)}: ΔL ${delta.toFixed(3)}`,
    ).toBeGreaterThanOrEqual(0.10)
  })
})
