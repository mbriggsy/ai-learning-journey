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

// ── Act 6: RightCapital's categorical series and the clone's band (plan 6-rightcapital-ui-plan.md, 2.1 decision 4) ──
// Typed ONCE here. `src/viz/charts/seriesVars.ts` writes RC_SERIES onto the root as `--highcharts-color-N` through the
// CSSOM at start-up, which is how Highcharts' styled mode (and `chartTheme.css`) reads them; no stylesheet re-types a
// series hex. The Okabe–Ito exports above stay for the old charts and go with the last of them (RC10).
//
// Meanings kept from RightCapital (ref 3.2): green = the what-if or recommendation, blue = the plan it is compared
// against; orange = tax-deferred or withdrawals; red = expenses or a shortfall. Colour is never the only signal: every
// side-by-side pairing carries a second cue (line style, hatch, printed value, end label), and RC_PAIRS below lists
// each pairing with its verdict, checked by `src/viz/__tests__/colorblind.test.tsx`.

/** RightCapital's hues by name (ref 3.2), plus the 22% bracket line's darker stroke (plan 2.2). */
export const RC_HUES = {
  blue: '#5070e6',
  green: '#56a58c',
  orange: '#f09e36',
  lightGreen: '#8ed88e',
  sky: '#53c0f1',
  red: '#e95b67',
  indigo: '#5a58bc',
  orchid: '#b971c6',
  purple: '#8466c5',
  deepIndigo: '#3d3baa',
  sand: '#e1bd74',
  teal: '#25a88b',
  salmon: '#e0897f',
  /** The 22% bracket line's stroke: sand itself is 1.79:1 on white, this is 3.56:1 (plan 2.2). Not a series slot. */
  sandInk: '#a8822f',
} as const

export type RcHue = keyof typeof RC_HUES

/** RightCapital's categorical order (ref 3.2): index N is Highcharts' colour index N (`.highcharts-color-N`), assigned
 *  in this fixed order, never cycled. */
export const RC_SERIES = [
  RC_HUES.blue,
  RC_HUES.green,
  RC_HUES.orange,
  RC_HUES.lightGreen,
  RC_HUES.sky,
  RC_HUES.red,
  RC_HUES.indigo,
  RC_HUES.orchid,
  RC_HUES.purple,
  RC_HUES.deepIndigo,
  RC_HUES.sand,
  RC_HUES.teal,
  RC_HUES.salmon,
] as const

/**
 * Every pairing of two hues that sits side by side anywhere in the clone, with its verdict (plan 2.2):
 *   - `floor`: the pair clears CVD_MIN_OKLAB with normal vision and under all three simulations;
 *   - `cue`: the pair does not, and the named second cue carries it (the chart that draws it must draw that cue);
 *   - `apart`: the two never share a chart.
 * Measured with culori 4.0.2 (oklab, full severity) on 2026-11-24; the test re-measures every row.
 */
export type RcPairVerdict =
  | { readonly kind: 'floor' }
  | { readonly kind: 'cue'; readonly cue: string }
  | { readonly kind: 'apart' }

export interface RcPair {
  readonly a: RcHue
  readonly b: RcHue
  readonly where: string
  readonly verdict: RcPairVerdict
}

export const RC_PAIRS: readonly RcPair[] = [
  { a: 'blue', b: 'green', where: 'your plan against the what-if or recommendation', verdict: { kind: 'floor' } },
  { a: 'orange', b: 'green', where: 'pre-tax against Roth in a stack', verdict: { kind: 'floor' } },
  { a: 'orange', b: 'red', where: 'the 24% and 32% bracket lines', verdict: { kind: 'floor' } },
  { a: 'blue', b: 'red', where: 'taxable against expenses', verdict: { kind: 'floor' } },
  { a: 'indigo', b: 'orange', where: 'Social Security against withdrawals', verdict: { kind: 'floor' } },
  { a: 'blue', b: 'orange', where: 'taxable against pre-tax in a stack', verdict: { kind: 'floor' } },
  { a: 'blue', b: 'sky', where: 'taxable against HSA in a stack', verdict: { kind: 'floor' } },
  { a: 'sky', b: 'green', where: 'HSA against Roth in a stack', verdict: { kind: 'floor' } },
  { a: 'sandInk', b: 'orange', where: 'the 22% and 24% bracket lines, the 22% drawn in its ink', verdict: { kind: 'floor' } },
  {
    a: 'green',
    b: 'red',
    where: 'assets against debts',
    verdict: { kind: 'cue', cue: 'debts sit below the zero line or in their own bar, in parentheses, named on the axis' },
  },
  {
    a: 'lightGreen',
    b: 'sand',
    where: 'series slots 3 and 10',
    verdict: { kind: 'cue', cue: 'a printed name on each segment; never side by side unlabelled' },
  },
  {
    a: 'sand',
    b: 'orange',
    where: 'a sand fill beside an orange one',
    verdict: { kind: 'cue', cue: 'a dash pattern of its own and an end label on each line' },
  },
  {
    a: 'blue',
    b: 'purple',
    where: 'Federal against Local tax',
    verdict: { kind: 'cue', cue: 'a printed name and value on each segment' },
  },
  {
    a: 'indigo',
    b: 'purple',
    where: 'the stress test Baseline and Combined bars',
    verdict: { kind: 'cue', cue: 'the stress name under each bar and its count printed on top; Baseline outlined, Combined hatched' },
  },
  { a: 'green', b: 'teal', where: 'series slots 1 and 11', verdict: { kind: 'apart' } },
]

/**
 * The clone's confidence band (ref 3.3; plan 2.2): B9's lightness law (the L stops above, ordered by luminance) at
 * RightCapital's hue, about 272. Chroma is 0.085, under the 0.095 cap: at hue 272 the cap's outer stop (L 0.82) falls
 * outside sRGB and clamps (the widest chroma that keeps the whole L range in gamut there is 0.0895, measured with culori
 * on 2026-11-24). The old band keeps BAND_HUE until RC10.
 */
export const RC_BAND = {
  hue: 272,
  chroma: 0.085,
  lMedian: BAND_L_MEDIAN,
  lOuter: BAND_L_OUTER,
} as const
