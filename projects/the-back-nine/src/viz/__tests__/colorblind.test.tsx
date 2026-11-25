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
  differenceEuclidean, displayable,
} from 'culori'
import { describe, expect, it } from 'vitest'
import {
  BAND_FILL_INNER_P, BAND_L_MEDIAN, BAND_L_OUTER,
  BAND_FILL_OUTER_P, RC_BAND, RC_HUES, RC_PAIRS, type RcPair,
  CVD_METRIC,
  CVD_MIN_OKLAB,
} from '../palette'
import { rcBandStopCss } from '../scale'
import { GRADE_GLYPH, VERDICT_GLYPH, type VerdictGlyph } from '../../ui/glyphs'

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

// The old charts' cream-paper and ink composites (the old band, its median line, the odds ladder's crown, the two-futures
// pair) left with those charts at Act 6's RC10; the clone's band, its median line and its pairs are probed below
// against the white page (`theme.css`'s `--color-bg`).

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

  it('…while a real clone pair PASSES it (both arms asserted together)', () => {
    expect(minCvdDistance(RC_HUES.blue, RC_HUES.orange)).toBeGreaterThanOrEqual(CVD_MIN_OKLAB)
  })
})

describe('CVD self-test — the two band FILL stops (inner vs outer) read as ordered ink density', () => {
  // The two opaque fills are positions on the clone's ordered ramp (`fanOptions.ts` reads them through `rcBandStopCss`),
  // not a categorical pair, so they are held to LUMINANCE ORDERING — inner (more-likely) darker than outer
  // (less-likely) — never the 0.10 categorical floor (adjacent ordered steps are meant to be close).
  const inner = rcBandStopCss(BAND_FILL_INNER_P)
  const outer = rcBandStopCss(BAND_FILL_OUTER_P)
  const BG = readThemeToken('--color-bg')

  it('the inner fill is DARKER than the outer fill (density tracks likelihood, legible in grayscale)', () => {
    expect(wcagY(inner)).toBeLessThan(wcagY(outer))
  })

  it('both fills stay clearly distinguishable from the white page under every CVD sim', () => {
    expect(minCvdDistance(inner, BG)).toBeGreaterThanOrEqual(CVD_MIN_OKLAB)
    expect(minCvdDistance(outer, BG)).toBeGreaterThanOrEqual(CVD_MIN_OKLAB)
  })

  it('PLANTED: inner and outer are INTENTIONALLY close (ordered, sub-floor) — proving why this is luminance, not 0.10', () => {
    expect(minCvdDistance(inner, outer)).toBeLessThan(CVD_MIN_OKLAB * 2)
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
    //
    // ⚠️ THE PROBE MUST BE A DISTINCT OBJECT, NOT AN ALIAS. Until 2026-08-01 this read
    // `const aliased = GRADE_GLYPH.confident` and then compared `glyphSignature(aliased)` to
    // `glyphSignature(GRADE_GLYPH.confident)` — the SAME function on the SAME reference. That
    // assertion is a tautology: it holds for ANY implementation, including an identity-keyed or
    // constant-returning one, so the non-vacuity RECEIPT was itself vacuous. And it could not
    // model the real regression, which is a COPIED silhouette (a duplicated path list), not a
    // reused reference. A structural copy proves the signature is VALUE-based.
    const source = GRADE_GLYPH.confident
    const aliased: VerdictGlyph = {
      paths: [...source.paths],
      ...(source.dots ? { dots: source.dots.map((d) => [d[0], d[1]] as const) } : {}),
    }
    expect(aliased, 'the probe is a distinct object — comparing a reference to itself proves nothing').not.toBe(source)
    expect(glyphSignature(aliased)).toBe(glyphSignature(source))
    // …and a genuinely different form does NOT collapse (the probe is not trivially-equal either).
    expect(glyphSignature(GRADE_GLYPH.confident)).not.toBe(glyphSignature(GRADE_GLYPH['coin-flip']))
  })
})

// ─── Act 6: RightCapital's series pairs and the clone's band (plan 6-rightcapital-ui-plan.md, 2.2) ──────────────────
// Every pairing that sits side by side anywhere in the clone is listed once in palette.ts's RC_PAIRS with its verdict:
// `floor` (clears the 0.10 oklab floor with normal vision AND under all three simulations), `cue` (does not, and a named
// second cue carries it), or `apart` (the two never share a chart). Each row is re-measured here, so a pair moved to
// `floor` that merges, or a `cue` row that names no cue, reds.

const NORMAL_AND_SIMS = [['normal', (c: ReturnType<typeof mustParse>) => c], ...SIMS] as const

/** The weakest separation of a pair across normal vision and the three simulations, with the view that binds. */
function weakest(a: string, b: string): { readonly d: number; readonly view: string } {
  const pa = mustParse(a)
  const pb = mustParse(b)
  return NORMAL_AND_SIMS.map(([view, sim]) => ({ view, d: distOklab(sim(pa), sim(pb)) })).reduce((m, x) => (x.d < m.d ? x : m))
}

/** Every `floor` row that merges somewhere, named; the real list and the planted row go through the same check. */
function floorFailures(pairs: readonly RcPair[]): string[] {
  return pairs
    .filter((p) => p.verdict.kind === 'floor')
    .map((p) => ({ p, w: weakest(RC_HUES[p.a], RC_HUES[p.b]) }))
    .filter(({ w }) => w.d < CVD_MIN_OKLAB)
    .map(({ p, w }) => `${p.a} vs ${p.b} (${p.where}): ${w.d.toFixed(3)} under ${w.view}`)
}

describe('CVD self-test — the clone’s side-by-side pairs (RC_PAIRS)', () => {
  it('every floor pair clears the 0.10 floor with normal vision and under all three simulations', () => {
    expect(floorFailures(RC_PAIRS)).toEqual([])
  })

  it.each(RC_PAIRS.filter((p) => p.verdict.kind === 'cue').map((p) => [`${p.a} vs ${p.b}`, p] as const))(
    'the cue pair %s names its second cue and really needs it (it merges somewhere)',
    (_label, pair) => {
      expect(pair.verdict.kind === 'cue' && pair.verdict.cue.trim().length > 0, 'a cue row names its cue').toBe(true)
      expect(weakest(RC_HUES[pair.a], RC_HUES[pair.b]).d, 'a pair that clears the floor is a floor row').toBeLessThan(CVD_MIN_OKLAB)
    },
  )

  it('green and teal never share a chart: listed apart, and they do merge (0.011 under protanopia, measured)', () => {
    const apart = RC_PAIRS.filter((p) => p.verdict.kind === 'apart')
    expect(apart.map((p) => [p.a, p.b])).toEqual([['green', 'teal']])
    expect(weakest(RC_HUES.green, RC_HUES.teal).d).toBeLessThan(CVD_MIN_OKLAB)
  })

  it('PLANTED: a merging pair entered as floor with no cue FAILS the same check (the gate is not vacuous)', () => {
    const planted: RcPair = { a: 'lightGreen', b: 'sand', where: 'planted', verdict: { kind: 'floor' } }
    expect(floorFailures([planted])).toHaveLength(1)
  })

  it('the 22% bracket line is drawn in sand-ink: it clears the floor against the 24% orange where sand itself does not', () => {
    expect(weakest(RC_HUES.sandInk, RC_HUES.orange).d).toBeGreaterThanOrEqual(CVD_MIN_OKLAB)
    expect(weakest(RC_HUES.sand, RC_HUES.orange).d).toBeLessThan(CVD_MIN_OKLAB)
  })
})

// The clone's page surface, source-bound to theme.css's --color-bg (never re-typed).
function readThemeToken(name: string): string {
  const here = dirname(fileURLToPath(import.meta.url))
  const css = readFileSync(join(here, '..', '..', 'ui', 'styles', 'theme.css'), 'utf8')
  const m = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\b`))
  if (m === null) throw new Error(`${name} not found in theme.css — the CVD probe cannot run`)
  return m[1]!
}

describe('CVD self-test — the clone’s band (RC_BAND: B9’s lightness law at hue about 272)', () => {
  const P = Array.from({ length: 21 }, (_, i) => i / 20)
  const css = P.map((p) => rcBandStopCss(p))
  const stops = css.map(hexOf)
  const BG = readThemeToken('--color-bg')

  it('sits at RightCapital’s hue (about 272) on B9’s lightness stops', () => {
    expect(RC_BAND.hue).toBeGreaterThanOrEqual(268)
    expect(RC_BAND.hue).toBeLessThanOrEqual(276)
    expect([RC_BAND.lMedian, RC_BAND.lOuter]).toEqual([BAND_L_MEDIAN, BAND_L_OUTER])
  })

  it('every stop is inside sRGB (no clamped stop, so no clamped hue)', () => {
    for (const c of css) expect(displayable(mustParse(c)), c).toBe(true)
  })

  it('is MONOTONIC in luminance from median to tail', () => {
    const ys = stops.map(wcagY)
    for (let i = 1; i < ys.length; i++) expect(ys[i]!).toBeGreaterThan(ys[i - 1]!)
  })

  it('is a single-hue ramp (rendered hue spread under 4°)', () => {
    const toOklch = converter('oklch')
    const hues = stops.map((h) => toOklch(mustParse(h)).h ?? 0)
    expect(Math.max(...hues) - Math.min(...hues)).toBeLessThan(4)
  })

  it('the lightest stop stays clearly visible on the white page under every CVD sim', () => {
    const lightest = stops[stops.length - 1]!
    expect(Math.abs(wcagY(lightest) - wcagY(BG))).toBeGreaterThanOrEqual(0.1)
    expect(minCvdDistance(lightest, BG)).toBeGreaterThanOrEqual(CVD_MIN_OKLAB)
  })
})

// ─── THE CLONE'S MEDIAN LINE OVER ITS OWN BAND (Act 6 · RC3; insight 038) ──────────────────────────────────────────
// The fan's median is a solid line drawn OVER both ranges, which share one hue: a line in the band's own hue is
// swallowed by it under CVD (insight 038's blue-on-blue). The line's stroke is SOURCE-BOUND to the rule that paints it
// (`chartTheme.css`'s `.b9-fan-median .highcharts-graph`) and to the token sheet that names its value; it must clear
// the 0.10 floor against EVERY RC_BAND stop under all three simulations (the line can sit over any stop as the fan
// moves). The planted arm draws the same line in the band's darkest stop and in the series blue: each fails somewhere.
function fanMedianStroke(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  const css = readFileSync(join(here, '..', 'charts', 'chartTheme.css'), 'utf8')
  const m = css.match(/\.b9-fan-median \.highcharts-graph[^{]*\{[^}]*stroke:\s*var\((--[\w-]+)\)/)
  if (m === null) throw new Error('chartTheme.css paints no stroke var on .b9-fan-median — the composite cannot run')
  return readThemeToken(m[1]!)
}

describe('CVD self-test — the clone’s median line over every band stop (insight 038)', () => {
  const P = Array.from({ length: 21 }, (_, i) => i / 20)
  const stops = P.map((p) => hexOf(rcBandStopCss(p)))
  const line = fanMedianStroke()

  it('the median line clears the 0.10 floor against EVERY RC_BAND stop, with normal vision and under all three sims', () => {
    const worst = Math.min(...stops.map((s) => Math.min(distOklab(mustParse(line), mustParse(s)), minCvdDistance(line, s))))
    // Measured 2026-11-24 (RC3): stone-900 #1c1917 against the band's darkest stop (L 0.42) is the binding pair.
    expect(worst).toBeGreaterThanOrEqual(CVD_MIN_OKLAB)
  })

  it('PLANTED: the same line in the band’s own darkest stop, or in the series blue, fails the floor somewhere', () => {
    for (const wrong of [stops[0]!, RC_HUES.blue]) {
      const worst = Math.min(...stops.map((s) => minCvdDistance(wrong, s)))
      expect(worst).toBeLessThan(CVD_MIN_OKLAB)
    }
  })
})
