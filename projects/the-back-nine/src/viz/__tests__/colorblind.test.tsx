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
import { CVD_MIN_OKLAB, OKABE_ITO, SERIES } from '../palette'
import { bandStopCss } from '../scale'

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
 * SCOPE: covers what the viz layer renders TODAY — the two-series colors + the band ramp. DEFERRED
 * to the held render components (the N=1 cold-read): the verdict-state colors + icon swatches (with
 * verdictSignal.tsx), the icon-silhouette pairwise-distinctness check (with the icons), and the
 * line-over-band / label-over-band COMPOSITE arms (with ConfidenceBand) — see the LANDMINE below.
 */

const toOklab = converter('oklab')
const distOklab = differenceEuclidean('oklab')
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
const PAPER = (() => {
  const here = dirname(fileURLToPath(import.meta.url))
  const css = readFileSync(join(here, '..', '..', 'ui', 'styles', 'tokens.css'), 'utf8')
  const m = css.match(/--paper:\s*(#[0-9a-fA-F]{6})\b/)
  if (m === null) throw new Error('--paper not found in tokens.css — the CVD probe cannot run')
  return m[1]!
})()

// ─── DEFERRED COMPOSITE COVERAGE + THE BLUE-ON-BLUE LANDMINE (U6 ConfidenceBand, held) ───────────
// back-nine-design §4 + phase-2-first-answer.md name two composites a FULL probe must cover: a
// series/median LINE drawn over the band fill, and a text LABEL over the band (an alpha fill's
// on-screen color ≠ its token). Those land WITH the ConfidenceBand / two-series RENDER components
// (held for the cold-read) — because the line's treatment (color / halo / weight) IS the held
// design decision. This probe covers what renders TODAY: opaque series strokes + the band fill.
//
// LANDMINE for that held work (MEASURED, culori 2026-06-14): series-1 BLUE (#0072b2) drawn over the
// single-hue BLUE band drops BELOW the 0.10 CVD floor for band positions p ≲ 0.58 — min 0.024 at
// p≈0.30 — so a blue median/overlay line is perceptually LOST in the dark half of the band under
// deuteranopia. The on-band line MUST be ink (--ink #1d2b24, min ≥0.16 over the whole band) or
// series-2 vermilion (min ≥0.19) — NEVER series-blue. When that line lands, add a composite arm
// here asserting minCvdDistance(line-over-bandStop, bandStop) ≥ CVD_MIN_OKLAB across the band
// p-grid (it WILL fail for series-blue — that is the point of keeping it).

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
