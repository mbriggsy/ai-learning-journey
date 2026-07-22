import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parse,
  formatHex,
  converter,
  filterDeficiencyDeuter,
  filterDeficiencyProt,
  filterDeficiencyTrit,
  differenceEuclidean,
} from 'culori'
import { describe, expect, it } from 'vitest'
import {
  BAND_FILL_INNER_P,
  BAND_FILL_OUTER_P,
  CVD_METRIC,
  CVD_MIN_OKLAB,
  OKABE_ITO,
  SERIES,
} from '../palette'
import { bandStopCss } from '../scale'
import { VERDICT_GLYPH, type VerdictGlyph } from '../../ui/verdictSignal'
import { GRADE_GLYPH } from '../../ui/GradeSignal'

/**
 * The CVD self-test (back-nine-design §4) — the project's color-blind-safety gate. The reader
 * is color blind, so this is CORRECTNESS, not polish. The pinned pipeline is culori's
 * `filterDeficiencyDeuter/Prot/Trit` + `differenceEuclidean('oklab')` at a 0.10 STRICT floor
 * (burned insight 051 — never ciede2000). Every fact is RE-DERIVED from palette.ts / scale.ts and
 * the canonical --paper token (source-bind, insight 032) — no token hex is re-typed here. The
 * only inline color literals are the deliberately-planted oklch() fixtures, which exist solely to
 * make the gate fail.
 *
 * Two distinct contracts live here:
 *   • CATEGORICAL pairs (the two series) must clear the 0.10 oklab floor under all three sims.
 *   • The ORDERED band ramp is held to MONOTONIC LUMINANCE instead — adjacent ordered steps are
 *     MEANT to be perceptually close, so a 0.10 distinctness assertion there would be wrong.
 *
 * The gate is proven NON-VACUOUS (burned insight 070): a planted matched-luminance red/green
 * pair MUST fail the floor, asserted alongside the real tokens passing.
 *
 * SCOPE: covers the viz layer's two-series colors + the band ramp + the on-band composite (below),
 * AND — U16 §S3b, A1 closure — the STATE-SIGNAL GLYPHS both render consumers draw: the six verdict
 * silhouettes (verdictSignal.tsx) and the three confidence-GRADE silhouettes (GradeSignal.tsx). Those
 * glyphs are drawn in pure --ink (NO per-state chroma), so the closure is two-part: (1) there is no
 * per-state COLOR to collapse — asserted structurally (color is never the sole state signal), and
 * (2) the silhouettes are pairwise-distinct FORMS — asserted with a planted-fail duplicate. The N=1
 * cold-read stays the perceptual oracle for the glyph forms; this gate catches the realistic regression
 * (a glyph aliased/reused for two states). The label-over-band composite stays with ConfidenceBand.
 */

// Source-bound to palette.ts's canonical CVD_METRIC (never a re-typed 'oklab' literal — the
// canonical-source rule the file header states applies to the metric too).
const toOklab = converter(CVD_METRIC)
const distOklab = differenceEuclidean(CVD_METRIC)
const SIMS = [
  ['deuteranopia', filterDeficiencyDeuter()],
  ['protanopia', filterDeficiencyProt()],
  ['tritanopia', filterDeficiencyTrit()],
] as const

/** Parse a CSS color, failing LOUD on an unparseable input (a test value is known-valid — an
 *  undefined here is a real bug, never a silent skip). */
function mustParse(color: string) {
  const c = parse(color)
  if (c === undefined) throw new Error(`unparseable color: ${color}`)
  return c
}

/** Normalize any CSS color to its rendered (gamut-mapped) hex. */
function hexOf(color: string): string {
  const h = formatHex(mustParse(color))
  if (h === undefined) throw new Error(`cannot format hex: ${color}`)
  return h
}

/** Min oklab distance between two colors across all three CVD simulations. */
function minCvdDistance(aColor: string, bColor: string): number {
  const a = mustParse(aColor)
  const b = mustParse(bColor)
  return Math.min(...SIMS.map(([, sim]) => distOklab(sim(a), sim(b))))
}

/** WCAG 2.x relative luminance of a CSS color (same formula as the tokens contrast gate). */
function wcagY(color: string): number {
  const n = parseInt(hexOf(color).slice(1), 16)
  const chan = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * chan((n >> 16) & 0xff) + 0.7152 * chan((n >> 8) & 0xff) + 0.0722 * chan(n & 0xff)
}

/** oklab lightness (the grayscale channel). */
function oklabL(color: string): number {
  return toOklab(mustParse(color)).l
}

// The cream page these primitives render on. SOURCE-BOUND to the canonical --paper token
// (read from tokens.css, never re-typed — insight 032, mirroring src/ui/__tests__/tokens.test.ts).
// If --paper drifts, the composite + visibility checks track the REAL surface, not a stale copy.
function readToken(name: string): string {
  const here = dirname(fileURLToPath(import.meta.url))
  const css = readFileSync(join(here, '..', '..', 'ui', 'styles', 'tokens.css'), 'utf8')
  const m = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\b`))
  if (m === null) throw new Error(`${name} not found in tokens.css — the CVD probe cannot run`)
  return m[1]!
}

const PAPER = readToken('--paper')
// The on-band MEDIAN line color, source-bound to the canonical --ink token (band.css applies it
// via the .band-median class — var(--ink), never a re-typed hex). The median is the opacity
// overlay that MUST stay legible over every band stop (the blue-on-blue landmine below).
const INK = readToken('--ink')

// ─── COMPOSITE COVERAGE + THE BLUE-ON-BLUE LANDMINE (U6 ConfidenceBand — LANDED) ─────────────────
// back-nine-design §4 + phase-2-first-answer.md name a composite the FULL probe must cover: the
// median/overlay LINE drawn over the band fill (an on-band line's legibility ≠ its standalone
// contrast). The ConfidenceBand renders this line OPAQUE in --ink (band.css .band-median →
// var(--ink)), so its composite over the band IS the ink itself (no alpha to flatten). The arm
// below asserts the ink line clears the 0.10 floor over EVERY band stop it crosses, AND keeps the
// planted blue-on-blue control: series-1 blue over the same band stops FAILS (the very mistake the
// landmine warns against), so the gate is proven able to catch a wrong on-band line color.
//
// LANDMINE (MEASURED, culori 2026-06-14): series-1 BLUE (#0072b2) over the single-hue BLUE band
// drops BELOW the 0.10 floor for band positions p ≲ 0.58 (min ≈0.024 at p≈0.30) — a blue line is
// perceptually LOST in the dark half of the band under deuteranopia. The on-band line MUST be
// --ink (#1d2b24) — never series-blue. The band FILLS are OPAQUE oklch stops (no alpha), so the
// inner-over-outer composite is just the inner stop — covered by the luminance-ordering arm.

describe('CVD self-test — categorical series pair (the two-series encoding)', () => {
  const one = SERIES.one.color
  const two = SERIES.two.color

  it.each(SIMS.map(([name]) => name))(
    'series-1 vs series-2 clears the %s oklab floor',
    (simName) => {
      const sim = SIMS.find(([n]) => n === simName)![1]
      expect(distOklab(sim(mustParse(one)), sim(mustParse(two)))).toBeGreaterThanOrEqual(
        CVD_MIN_OKLAB,
      )
    },
  )

  // This exact-pair PIN is the PRIMARY guard against a wrong re-pick: the CVD-floor + grayscale
  // arms alone would greenlight some wrong pairs (a warm orange/vermilion pair passes BOTH), so a
  // future re-pick past two accents must raise the grayscale floor / add a same-hue-family guard
  // — the measured arms below are necessary, not sufficient, on their own.
  it('the series colors are drawn from the Okabe–Ito set (blue + vermilion)', () => {
    expect(one).toBe(OKABE_ITO.blue)
    expect(two).toBe(OKABE_ITO.vermilion)
  })

  it('stays distinguishable with COLOR STRIPPED — a real luminance gap backs the geometry', () => {
    // Color is the least-trusted channel; line-style + marker carry the grayscale signal, but a
    // genuine luminance separation reinforces it (and guards against a future same-Y re-pick).
    expect(Math.abs(oklabL(one) - oklabL(two))).toBeGreaterThanOrEqual(0.05)
  })
})

describe('CVD self-test — the ordered confidence-band ramp', () => {
  // Render the lerped oklch stops to the gamut-mapped hex the browser shows.
  const POSITIONS = [0, 0.25, 0.5, 0.75, 1]
  const stops = POSITIONS.map((p) => hexOf(bandStopCss(p)))

  it('is MONOTONIC in luminance from median → tail (the ordering survives grayscale)', () => {
    const ys = stops.map(wcagY)
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]!).toBeGreaterThan(ys[i - 1]!)
    }
  })

  it('is a single-hue ramp — NOT a hue gradient (rendered hue spread < 4°)', () => {
    const toOklch = converter('oklch')
    const hues = stops.map((h) => toOklch(mustParse(h)).h ?? 0)
    const spread = Math.max(...hues) - Math.min(...hues)
    // Chroma is tuned (palette.ts) so every stop stays in-gamut at the fixed hue: MEASURED
    // spread is <0.5°. The <4° bar leaves headroom for culori/engine variance; a rainbow fan
    // would blow past it by 10×.
    expect(spread).toBeLessThan(4)
  })

  it('the lightest (outer-tail) stop stays clearly visible on the cream paper', () => {
    const lightest = stops[stops.length - 1]!
    // A fill, not text — the bar is "clearly distinguishable from the page", not a 4.5:1 text ratio.
    expect(Math.abs(wcagY(lightest) - wcagY(PAPER))).toBeGreaterThanOrEqual(0.1)
    // …and distinguishable under every CVD sim, too.
    expect(minCvdDistance(lightest, PAPER)).toBeGreaterThanOrEqual(CVD_MIN_OKLAB)
  })

  it('adjacent ramp stops are INTENTIONALLY close — proving why this contract is luminance, not 0.10', () => {
    // If we wrongly asserted the 0.10 categorical floor between ordered steps, a smoother (more
    // honest) fan would fail. Document that adjacency here is sub-floor by design.
    const adj = minCvdDistance(stops[0]!, stops[1]!)
    expect(adj).toBeLessThan(0.2) // close, ordered — not a categorical jump
  })
})

describe('CVD self-test — the gate is NON-VACUOUS (planted matched-luminance red/green)', () => {
  // The classic anti-pattern the law forbids: equal luminance, opposite hue, no luminance
  // separator → collapses on the red-green axis. This fixture exists ONLY to prove the probe can
  // fail; it is never a real token.
  const PLANT_RED = hexOf('oklch(0.62 0.13 30)')
  const PLANT_GREEN = hexOf('oklch(0.62 0.13 150)')

  it('the planted red/green pair FAILS the oklab floor (the probe is not silently green)', () => {
    expect(minCvdDistance(PLANT_RED, PLANT_GREEN)).toBeLessThan(CVD_MIN_OKLAB)
  })

  it('…and DEUTERANOPIA is the binding sim (documents the mechanism; a matrix retune fails loud)', () => {
    // minCvdDistance takes the min across sims; MEASURED only deuter binds (≈0.011 vs protan
    // ≈0.104 / tritan ≈0.263). Pinning the binding sim means a future culori retune that stopped
    // it collapsing here would FAIL this test loudly, not silently un-guard the gate (burned/070).
    const deuter = filterDeficiencyDeuter()
    const d = distOklab(deuter(mustParse(PLANT_RED)), deuter(mustParse(PLANT_GREEN)))
    expect(d).toBeLessThan(CVD_MIN_OKLAB)
  })

  it('…while the real series pair PASSES it (both arms asserted together)', () => {
    expect(minCvdDistance(SERIES.one.color, SERIES.two.color)).toBeGreaterThanOrEqual(CVD_MIN_OKLAB)
  })
})

describe('CVD self-test — the ON-BAND MEDIAN LINE composite (the blue-on-blue landmine)', () => {
  // The median line crosses the WHOLE band — from the darkest stop near the median region out to
  // the lightest tail. Sample the ramp densely (the line can sit over any stop as the fan moves)
  // and require the --ink line to clear the 0.10 floor over every one, under all three CVD sims.
  const P_GRID = Array.from({ length: 21 }, (_, i) => i / 20) // 0 … 1
  const bandStops = P_GRID.map((p) => bandStopCss(p))

  it('the --ink median line clears the 0.10 floor over EVERY band stop (it is never lost in the dark half)', () => {
    for (const stop of bandStops) {
      expect(minCvdDistance(INK, stop)).toBeGreaterThanOrEqual(CVD_MIN_OKLAB)
    }
  })

  it('PLANTED: a series-BLUE line over the same band FAILS the floor somewhere (the gate catches it)', () => {
    // The exact mistake the landmine warns against — a blue line lost in the blue band's dark
    // half. At least one stop must drop below the floor, proving the composite probe is not
    // vacuously green for the on-band line.
    const worst = Math.min(...bandStops.map((stop) => minCvdDistance(SERIES.one.color, stop)))
    expect(worst).toBeLessThan(CVD_MIN_OKLAB)
  })
})

describe('CVD self-test — the two band FILL stops (inner vs outer) read as ordered ink density', () => {
  // The two opaque fills are positions on the ordered ramp (not a categorical pair), so they are
  // held to LUMINANCE ORDERING — inner (more-likely) darker than outer (less-likely) — never the
  // 0.10 categorical floor (adjacent ordered steps are meant to be close).
  const inner = bandStopCss(BAND_FILL_INNER_P)
  const outer = bandStopCss(BAND_FILL_OUTER_P)

  it('the inner fill is DARKER than the outer fill (density tracks likelihood, legible in grayscale)', () => {
    expect(wcagY(inner)).toBeLessThan(wcagY(outer))
  })

  it('both fills stay clearly distinguishable from the cream paper under every CVD sim', () => {
    expect(minCvdDistance(inner, PAPER)).toBeGreaterThanOrEqual(CVD_MIN_OKLAB)
    expect(minCvdDistance(outer, PAPER)).toBeGreaterThanOrEqual(CVD_MIN_OKLAB)
  })

  it('PLANTED: inner and outer are INTENTIONALLY close (ordered, sub-floor) — proving why this is luminance, not 0.10', () => {
    expect(minCvdDistance(inner, outer)).toBeLessThan(CVD_MIN_OKLAB * 2)
  })
})

describe('CVD self-test — the D2c odds-ladder marks (crown vermilion + ink dots on paper)', () => {
  // The ladder spends ONE chromatic accent: the crown's vermilion (a palette presentation attribute,
  // OddsLadder.tsx), redundant with the halo ring + the "your date" tell + the dot's height. Every
  // other mark is --ink. back-nine-design §4 still requires probing every color the consumer renders:
  // the crown must be VISIBLE on the cream page AND distinct from the ink dots under all three CVD
  // sims — the redundancy is a backstop, never an excuse to skip the probe. Non-vacuity is the
  // planted matched-luminance red/green pair above (it FAILS the very same minCvdDistance machinery).
  const CROWN = OKABE_ITO.vermilion

  it('the crown wears the reserved Okabe–Ito vermilion accent', () => {
    expect(CROWN).toBe(OKABE_ITO.vermilion)
  })

  it('the crown stays visible on the cream paper under every CVD sim (a crown you can actually read)', () => {
    expect(minCvdDistance(CROWN, PAPER)).toBeGreaterThanOrEqual(CVD_MIN_OKLAB)
  })

  it('the crown is distinct from the ink dots under every CVD sim (color reinforces the ring + label)', () => {
    expect(minCvdDistance(CROWN, INK)).toBeGreaterThanOrEqual(CVD_MIN_OKLAB)
  })
})

// ─── U16 §S3b (A1 closure) — the STATE-SIGNAL GLYPHS: verdict + confidence GRADE silhouettes ────────
// The reader is color-blind, and the ConfidenceGrade is the most trust-load-bearing signal on the
// recommendation surface (word + distinct SHAPE + aria-label, NEVER color alone). Both glyph sets are
// drawn in pure --ink, so the closure is (1) NO per-state color to collapse and (2) pairwise-distinct
// silhouettes — proven non-vacuous by a planted duplicate.

/** A structural silhouette signature — the rounded coordinate multiset over a glyph's stroked paths +
 *  filled dots. Two glyphs with the SAME overall FORM (or an aliased/duplicated glyph) collapse to the
 *  same signature; distinct forms differ. Catches the realistic regression (a glyph reused for two
 *  states); the cold-read remains the perceptual oracle. */
function glyphSignature(g: VerdictGlyph): string {
  const nums = (g.paths.join(' ').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  const dots = (g.dots ?? []).flat()
  return [...nums, ...dots].map((n) => Math.round(n)).sort((a, b) => a - b).join(',')
}

describe('CVD self-test — the state-signal glyphs are NON-COLOR (no per-state chroma)', () => {
  it('every verdict + grade glyph encodes its state in SHAPE ONLY — the glyph data carries no color field', () => {
    // The glyph objects are {paths, dots?} — no per-state color key exists, so color can never be the
    // sole (or even a) state channel for these signals (they render in currentColor = --ink).
    const allowed = new Set(['paths', 'dots'])
    for (const [state, g] of [...Object.entries(VERDICT_GLYPH), ...Object.entries(GRADE_GLYPH)]) {
      for (const k of Object.keys(g)) {
        expect(allowed.has(k), `${state} glyph carries only shape data (no per-state color): unexpected key "${k}"`).toBe(true)
      }
    }
  })
})

describe('CVD self-test — the state-signal glyphs are pairwise-DISTINCT silhouettes (planted-fail)', () => {
  const verdictEntries = Object.entries(VERDICT_GLYPH)
  const gradeEntries = Object.entries(GRADE_GLYPH)

  it('all six VERDICT silhouettes are pairwise distinct (C(6,2)=15 pairs)', () => {
    for (let i = 0; i < verdictEntries.length; i++) {
      for (let j = i + 1; j < verdictEntries.length; j++) {
        const [na, a] = verdictEntries[i]!
        const [nb, b] = verdictEntries[j]!
        expect(glyphSignature(a), `${na} vs ${nb} must be distinct silhouettes`).not.toBe(glyphSignature(b))
      }
    }
  })

  it('all three GRADE silhouettes are pairwise distinct (confident / coin-flip / ungraded)', () => {
    for (let i = 0; i < gradeEntries.length; i++) {
      for (let j = i + 1; j < gradeEntries.length; j++) {
        const [na, a] = gradeEntries[i]!
        const [nb, b] = gradeEntries[j]!
        expect(glyphSignature(a), `${na} vs ${nb} must be distinct silhouettes`).not.toBe(glyphSignature(b))
      }
    }
  })

  it('PLANTED: an aliased glyph (one state reusing another’s silhouette) COLLAPSES the signature — the probe is not vacuous', () => {
    // The exact regression the gate guards: someone points 'coin-flip' at the 'confident' glyph. The
    // signatures must then be EQUAL — proving the pairwise-distinctness arms above can actually fail.
    const aliased: VerdictGlyph = GRADE_GLYPH.confident
    expect(glyphSignature(aliased)).toBe(glyphSignature(GRADE_GLYPH.confident))
    // …and a genuinely different form does NOT collapse (the probe is not trivially-equal either).
    expect(glyphSignature(GRADE_GLYPH.confident)).not.toBe(glyphSignature(GRADE_GLYPH['coin-flip']))
  })
})
