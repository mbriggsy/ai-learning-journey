/*
 * src/viz/palette.ts — THE canonical source for every data / series / verdict color and
 * the color-blind-safe encoding primitives the viz layer renders (back-nine-design §dataviz).
 *
 * The reader (the N=1 reviewer) is COLOR BLIND, and the surfaces these primitives feed are
 * ones friends bet real retirement money on — so every value here is a CORRECTNESS decision,
 * not a style preference. Claude owns all color; the reviewer never adjudicates hue.
 *
 * CANONICAL-SOURCE RULE (mirrors src/engine/constants/ + src/ui/styles/tokens.css): every
 * hex, ramp endpoint, CVD floor, and metric the viz layer uses is named HERE and imported —
 * never re-typed at a call site or in a test. The CVD self-test
 * (src/viz/__tests__/colorblind.test.tsx) and the band-math test RE-DERIVE their facts from
 * these exports (the source-bind pattern, burned docs/insights/032).
 *
 * COLOR LAW (back-nine-design §1–2):
 *   - Brand green (--brand #0b3d2e) is CHROME ONLY and lives in tokens.css — it is NEVER a
 *     data encoding. Data / series / band / verdict color draws EXCLUSIVELY from the
 *     Okabe–Ito color-universal set below.
 *   - Color is NEVER the only signal (WCAG 1.4.1, Level A). Every consumer pairs color with a
 *     redundant NON-color channel — series: line-style + marker + direct end-label; band:
 *     in-place percentile TEXT + luminance ordering; verdict: word + magnitude + shape. The
 *     tokens here are the color LAYER of that redundancy, never its sole carrier.
 *   - Ordered data (the confidence band) separates by LUMINANCE, not hue — a single-hue oklch
 *     lightness ramp, so the ordering survives grayscale AND all three CVD transforms. Hue
 *     intuition does not survive the deuter/protan/tritan projections (burned insight 010/051);
 *     a rainbow fan reads dishonestly under CVD.
 *
 * CSP NOTE (for the U6 render — held until the cold-read): these JS constants feed SVG
 * PRESENTATION attributes (fill / stroke / stroke-dasharray), which are NOT governed by
 * `style-src 'self'` (only the `style` attribute and <style> blocks are). That is the
 * CSP-safe path for dynamic data-viz color; the ConfidenceBand component proves it under the
 * real enforced CSP (verify:csp) when it lands.
 *
 * SCOPE (built now): the Okabe–Ito set, the two-series pair, the confidence-band lightness
 * ramp, the CVD contract, and the encoding vocabularies. The verdict-state → color/shape
 * mapping and the SVG icon silhouettes are DELIBERATELY NOT here yet — they are ordinal,
 * taste-adjacent, and need the N=1 cold-read + the full UI skill loadout (verdictSignal.tsx).
 */

// ── Okabe–Ito color-universal set ────────────────────────────────────────────────────────
// Hex verified against clauswilke.com/dataviz + jfly.uni-koeln.de (back-nine-design §1, 2026-06-11).
// The categorical surface is deliberately TINY (this is a calm co-pilot, not a dashboard):
// only TWO chromatic accents are ever spent — the two-series pair — and the rest are reserved.
export const OKABE_ITO = {
  black: '#000000',
  blue: '#0072b2',
  vermilion: '#d55e00',
  bluegreen: '#009e73',
  sky: '#56b4e9',
  orange: '#e69f00',
  purple: '#cc79a7',
  /** ~1.32:1 on white (~1.24:1 on the cream paper) — BANNED for thin lines, small markers, and
   *  any text (nowhere near the 4.5:1 floor). Large filled areas only, if at all. */
  yellow: '#f0e442',
} as const

// ── The CVD self-test contract ───────────────────────────────────────────────────────────
/**
 * oklab Euclidean-distance floor for CATEGORICAL distinctness, measured under each of
 * deuteranopia / protanopia / tritanopia (the pinned metric: culori `filterDeficiency*` +
 * `differenceEuclidean('oklab')`; burned insight 051 — never `ciede2000`).
 *
 * Applies to CATEGORICAL pairs ONLY (the two series; any future accent pair). The ordered
 * confidence-band ramp is held to MONOTONIC LUMINANCE instead — adjacent ordered steps are
 * MEANT to be perceptually close, so a 0.10 distinctness assertion there would be wrong.
 */
export const CVD_MIN_OKLAB = 0.1
export const CVD_METRIC = 'oklab' as const

// ── Two-series identity (U6 two-series) ──────────────────────────────────────────────────
// blue vs vermilion — the Okabe–Ito pair with the widest luminance + CVD separation.
// MEASURED distance (culori, 2026-06-14): deuter 0.298 / protan 0.229 / tritan 0.354 — all ≫ 0.10.
// Color is the LEAST-trusted of five redundant channels (line-style, marker, end-label,
// luminance, color). NEVER a red/green-adjacent pairing as a sole differentiator.
export type SeriesLineStyle = 'solid' | 'dashed'
/** The two-series marker silhouettes (the non-hue marker channel). The verdict-state icon set is
 *  a SUPERSET that lands WITH verdictSignal (held) — it extends this union and gates its own
 *  pairwise silhouette-distinctness (the C(6,2) probe). Only the values used TODAY are named here
 *  — no vocabulary for held features. */
export type MarkerShape = 'circle' | 'triangle'

export interface SeriesStyle {
  readonly color: string
  readonly lineStyle: SeriesLineStyle
  readonly marker: MarkerShape
}

export const SERIES = {
  one: { color: OKABE_ITO.blue, lineStyle: 'solid', marker: 'circle' },
  two: { color: OKABE_ITO.vermilion, lineStyle: 'dashed', marker: 'triangle' },
} as const satisfies Record<'one' | 'two', SeriesStyle>

// ── The confidence band: single-hue oklch LIGHTNESS ramp ─────────────────────────────────
// ONE hue (Okabe–Ito blue, oklch H≈244.05), varied ONLY in L. The median region is the darkest
// / densest ink (highest likelihood, highest emphasis); the outer percentiles are lighter
// (lowest emphasis) — so DENSITY OF INK TRACKS LIKELIHOOD and the ordering is legible in pure
// grayscale. NOT green (brand green is chrome-only). NOT a hue gradient.
//
// Chroma is held at 0.095 — REDUCED from the base blue's 0.131 — so every lightness stop stays
// INSIDE the sRGB gamut at the fixed hue. A higher chroma gamut-clamps the dark stop and drifts
// its rendered hue ~14°; 0.095 holds the rendered hue spread across the whole ramp to <0.5°
// (MEASURED, culori 2026-06-14) — a genuinely single-hue ramp, and a calmer blue besides.
//
// The endpoints below are the lerp bounds consumed by scale.ts (`bandLightnessAt`). MEASURED:
// the rendered ramp's WCAG luminance is strictly monotonic across L, and every stop stays
// clearly legible on the cream paper (--paper #faf7f2, Y ≈ 0.93).
export const BAND_HUE = 244.05
export const BAND_CHROMA = 0.095
/** L at the median (p = 0, most likely, highest emphasis). */
export const BAND_L_MEDIAN = 0.42
/** L at the outer tail edge (p = 1, least likely, lowest emphasis). */
export const BAND_L_OUTER = 0.82

// ── The two band-FILL stop positions (U6 ConfidenceBand render) ───────────────────────────
// The fan draws two stacked OPAQUE fills whose ink DENSITY tracks likelihood: the inner
// (p25–p75, more-likely) region is the darker stop, the outer (p10–p90, less-likely) region the
// lighter. Both are positions on the SAME single-hue lightness ramp above — fetched via
// scale.ts `bandStopCss(p)`, never a re-typed hex (the canonical-source rule). The median p50 is
// NOT a ramp stop: it is the --ink overlay LINE (the blue-on-blue landmine in colorblind.test.tsx
// — a series-blue line is lost in the dark half of the band under deuteranopia; the on-band line
// MUST be --ink). Emphasis order, darkest→lightest: median ink line > inner fill > outer fill.
/** Ramp position for the inner p25–p75 fill (darker / higher-emphasis). */
export const BAND_FILL_INNER_P = 0.46
/** Ramp position for the outer p10–p90 fill (lighter / lower-emphasis). */
export const BAND_FILL_OUTER_P = 0.84
