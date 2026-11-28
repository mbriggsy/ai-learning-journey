/*
 * src/viz/palette.ts — THE canonical source for every data / series / verdict color and
 * the color-blind-safe encoding primitives the viz layer renders (back-nine-design §dataviz).
 *
 * The reader (the N=1 reviewer) is COLOR BLIND, and the surfaces these primitives feed are
 * ones friends bet real retirement money on — so every value here is a CORRECTNESS decision,
 * not a style preference. Claude owns all color; the reviewer never adjudicates hue.
 *
 * CANONICAL-SOURCE RULE (mirrors src/engine/constants/ + src/ui/styles/theme.css): every
 * hex, ramp endpoint, CVD floor, and metric the viz layer uses is named HERE and imported —
 * never re-typed at a call site or in a test. The CVD self-test
 * (src/viz/__tests__/colorblind.test.tsx) and the band-math test RE-DERIVE their facts from
 * these exports (the source-bind pattern, burned docs/insights/032).
 *
 * COLOR LAW (back-nine-design §1–2):
 *   - The chrome colours are CHROME ONLY and live in theme.css (the old brand green left with tokens.css at Act 6's
 *     RC21) — never a data encoding. Data / series / band color draws EXCLUSIVELY from the clone's categorical
 *     order and band below (`RC_SERIES`, `RC_BAND`; the Okabe–Ito set of the old charts left with
 *     them at Act 6's RC10).
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
 * SCOPE: the confidence-band lightness stops, the CVD contract, and the clone's categorical
 * series, pairs and band.
 */

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

// ── The confidence band: single-hue oklch LIGHTNESS ramp ─────────────────────────────────
// ONE hue (since Act 6, RightCapital's, about 272: `RC_BAND` below), varied ONLY in L. The median region is the darkest
// / densest ink (highest likelihood, highest emphasis); the outer percentiles are lighter
// (lowest emphasis) — so DENSITY OF INK TRACKS LIKELIHOOD and the ordering is legible in pure
// grayscale. NOT green (brand green is chrome-only). NOT a hue gradient.
//
// (The old band held chroma at 0.095 at Okabe–Ito blue's hue; the clone's is `RC_BAND.chroma`.) Every lightness stop stays
// INSIDE the sRGB gamut at the fixed hue. A higher chroma gamut-clamps the dark stop and drifts
// its rendered hue ~14°; 0.095 holds the rendered hue spread across the whole ramp to <0.5°
// (MEASURED, culori 2026-06-14) — a genuinely single-hue ramp, and a calmer blue besides.
//
// The endpoints below are the lerp bounds consumed by scale.ts (`bandLightnessAt`, through `RC_BAND`). MEASURED:
// the rendered ramp's WCAG luminance is strictly monotonic across L, and every stop stays
// clearly legible on the cream paper (--paper #faf7f2, Y ≈ 0.93).
/** L at the median (p = 0, most likely, highest emphasis). */
export const BAND_L_MEDIAN = 0.42
/** L at the outer tail edge (p = 1, least likely, lowest emphasis). */
export const BAND_L_OUTER = 0.82

// ── The two band-FILL stop positions (U6 ConfidenceBand render) ───────────────────────────
// The fan draws two stacked OPAQUE fills whose ink DENSITY tracks likelihood: the inner
// (p25–p75, more-likely) region is the darker stop, the outer (p10–p90, less-likely) region the
// lighter. Both are positions on the SAME single-hue lightness ramp above — fetched via
// scale.ts `rcBandStopCss(p)`, never a re-typed hex (the canonical-source rule). The median p50 is
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
// series hex. The Okabe–Ito exports that stood above left with the last of the old charts (RC10).
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
  /** B9's own slot 13, the inherited IRA (the Act 5 plan's U13): RightCapital draws no inherited part, so no hue of theirs
   *  is its. Each spare one merges with taxable blue (orchid 0.068, purple 0.052, indigo 0.074 under protanopia; salmon
   *  with Roth green at 0.026), and the inherited part sits beside taxable on every page that draws it. This dark umber
   *  (oklch 0.44 0.12 46, 8.13:1 on white) clears every hue it sits beside by 0.149 or more, with normal vision and under
   *  all three simulations (measured with culori 4.0.2 on 2026-11-27; the RC_PAIRS rows below). It always wears the
   *  zigzag pattern (`patterns.ts`), never solid, so its look is one thing wherever it appears. */
  umber: '#863806',
  /** The 22% bracket line's stroke: sand itself is 1.79:1 on white, this is 3.56:1 (plan 2.2). Not a series slot. */
  sandInk: '#a8822f',
  /** The chrome's sky (`theme.css`'s `--color-sky`, ref's `--sky`: RightCapital's stat-ring dashes and its sky tiles),
   *  which Blueprint's sky tiles draw. Not a series slot: listed so RC_PAIRS measures the hex Blueprint draws, never the
   *  series sky beside it; `colorblind.test.tsx` holds it equal to the token. */
  skyTile: '#5ebaf3',
  /** The chrome's stone-400 (`theme.css`'s `--color-stone-400`): Cash Flows → Maps' tax grey (ref 3.1, "the Sankey's tax
   *  grey"; decoration only, never text). Not a series slot; `colorblind.test.tsx` holds it equal to the token. */
  stoneTax: '#a8a29e',
  /** The chrome's stone-500 (`--color-stone-500`): Maps' "not explained" gap, drawn hatched. Not a series slot. */
  stoneGap: '#78716c',
} as const

export type RcHue = keyof typeof RC_HUES

/** RightCapital's categorical order (ref 3.2): index N is Highcharts' colour index N (`.highcharts-color-N`), assigned
 *  in this fixed order, never cycled. Slots 0 to 12 are RightCapital's; slot 13 is B9's own, the inherited IRA (U13). */
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
  RC_HUES.umber,
] as const

/** The inherited IRA's colour slot (slot 13, `RC_HUES.umber`): every page that draws the inherited part reads this. */
export const INHERITED_COLOR_INDEX = 13

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
  { a: 'orange', b: 'green', where: 'pre-tax against Roth in a stack; Blueprint’s inheritance or gift beside retirement', verdict: { kind: 'floor' } },
  { a: 'orange', b: 'red', where: 'the 24% and 32% bracket lines; Blueprint’s inheritance or gift beside spending', verdict: { kind: 'floor' } },
  { a: 'blue', b: 'red', where: 'taxable against expenses', verdict: { kind: 'floor' } },
  { a: 'indigo', b: 'orange', where: 'Social Security against withdrawals', verdict: { kind: 'floor' } },
  { a: 'blue', b: 'orange', where: 'taxable against pre-tax in a stack; Blueprint’s Social Security beside an inheritance or gift', verdict: { kind: 'floor' } },
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
  // The stress test's neighbours (RC11): Baseline indigo (outlined), Social Security light green, out-of-pocket salmon,
  // the marketplace discount sky, Combined purple (cross-hatched). Each bar's name and count print on it, so a `cue` pair
  // stands on those words.
  { a: 'indigo', b: 'lightGreen', where: 'the stress test Baseline beside Social Security', verdict: { kind: 'floor' } },
  { a: 'indigo', b: 'salmon', where: 'the stress test Baseline beside out-of-pocket medical', verdict: { kind: 'floor' } },
  { a: 'indigo', b: 'sky', where: 'the stress test Baseline beside the marketplace discount', verdict: { kind: 'floor' } },
  {
    a: 'lightGreen',
    b: 'salmon',
    where: 'the stress test Social Security beside out-of-pocket medical',
    verdict: { kind: 'cue', cue: 'the stress name under each bar and its count printed on top' },
  },
  {
    a: 'lightGreen',
    b: 'sky',
    where: 'the stress test Social Security beside the marketplace discount',
    verdict: { kind: 'cue', cue: 'the stress name under each bar and its count printed on top' },
  },
  { a: 'salmon', b: 'sky', where: 'the stress test out-of-pocket medical beside the marketplace discount', verdict: { kind: 'floor' } },
  { a: 'salmon', b: 'purple', where: 'the stress test out-of-pocket medical beside Combined', verdict: { kind: 'floor' } },
  { a: 'sky', b: 'purple', where: 'the stress test marketplace discount beside Combined', verdict: { kind: 'floor' } },
  // Investment (RC12): Asset Allocation's stocks indigo, bonds light green, cash orange (dotted) in one ring, each part
  // also named with its share in the table beside it; Tax Allocation's buckets are the withdrawal stacks' rows above
  // (taxable blue against pre-tax orange, pre-tax against Roth green, Roth against HSA sky, HSA against taxable).
  {
    a: 'lightGreen',
    b: 'orange',
    where: 'Asset Allocation bonds beside cash',
    verdict: { kind: 'cue', cue: 'cash dotted in its slice, its bar and its key mark; each part named with its share in the table beside the ring' },
  },
  // Blueprint (RC15): tiles side by side, each with a 4 px edge in its category's colour AND the category word printed
  // above its name. Net Worth's treatments take the stacks' colours (pre-tax orange, Roth green, taxable blue, HSA sky);
  // Goals' retirement green, Social Security blue, Medicare sky, spending red, an inheritance or gift orange (gap 5's U4:
  // its four neighbours are the rows naming it); Income, Savings, Expenses green, blue, red
  // (rows above). Its sky is the chrome's (`skyTile`, the hex the tiles draw), so every pair with it is its own row.
  { a: 'blue', b: 'skyTile', where: 'Blueprint taxable beside HSA tiles; Social Security beside Medicare', verdict: { kind: 'floor' } },
  { a: 'skyTile', b: 'green', where: 'Blueprint HSA beside Roth tiles; Medicare beside retirement', verdict: { kind: 'floor' } },
  { a: 'orange', b: 'skyTile', where: 'Blueprint pre-tax beside HSA tiles; an inheritance or gift beside Medicare', verdict: { kind: 'floor' } },
  { a: 'skyTile', b: 'red', where: 'Blueprint Medicare beside spending tiles', verdict: { kind: 'floor' } },
  // Analysis's Retirement Details (RC17): income sources stacked per year and ringed in its donuts, bottom-up Social
  // Security deep indigo, other income light green (vertical lines), then the withdrawal stacks' own taxable blue, pre-tax orange (hatched),
  // Roth green (dotted), HSA sky (lined); a part with nothing that year drops out, so any two can touch. The year the money
  // ran out stands beside the last column as a red cross-hatched band with its words over it.
  { a: 'deepIndigo', b: 'lightGreen', where: 'Social Security beside other income', verdict: { kind: 'floor' } },
  { a: 'deepIndigo', b: 'blue', where: 'Social Security beside taxable withdrawals', verdict: { kind: 'floor' } },
  { a: 'deepIndigo', b: 'orange', where: 'Social Security beside pre-tax withdrawals', verdict: { kind: 'floor' } },
  { a: 'deepIndigo', b: 'green', where: 'Social Security beside Roth withdrawals', verdict: { kind: 'floor' } },
  { a: 'deepIndigo', b: 'sky', where: 'Social Security beside HSA spending', verdict: { kind: 'floor' } },
  { a: 'lightGreen', b: 'blue', where: 'other income beside taxable withdrawals', verdict: { kind: 'floor' } },
  { a: 'lightGreen', b: 'green', where: 'other income beside Roth withdrawals', verdict: { kind: 'floor' } },
  {
    a: 'lightGreen',
    b: 'orange',
    where: 'other income beside pre-tax withdrawals',
    verdict: { kind: 'cue', cue: 'pre-tax hatched in its column, slice and key square; each part named in the legend and the donuts’ key' },
  },
  {
    a: 'lightGreen',
    b: 'sky',
    where: 'other income beside HSA spending',
    verdict: { kind: 'cue', cue: 'HSA spending lined in its column, slice and key square; each part named in the legend and the donuts’ key' },
  },
  { a: 'orange', b: 'sky', where: 'pre-tax withdrawals beside HSA spending', verdict: { kind: 'floor' } },
  { a: 'red', b: 'deepIndigo', where: 'the money-ran-out band beside Social Security', verdict: { kind: 'floor' } },
  { a: 'red', b: 'lightGreen', where: 'the money-ran-out band beside other income', verdict: { kind: 'floor' } },
  { a: 'red', b: 'sky', where: 'the money-ran-out band beside HSA spending', verdict: { kind: 'floor' } },
  {
    a: 'red',
    b: 'green',
    where: 'the money-ran-out band beside Roth withdrawals',
    verdict: { kind: 'cue', cue: 'the band cross-hatched with "Money ran out this year" printed over it; Roth dotted' },
  },
  // Cash Flows → Maps (RC20): the year's flow and its tiles. Money in: income green, what is taken from savings orange
  // (the stacks' green against orange row above). Money out, stacked in this order: Expenses red, Taxes stone grey,
  // Planned saving blue, Income not kept sand; any two can touch where a group has nothing that year (red against blue
  // is a row above). Every node and tile prints its name and amount. A gap the year's figures don't explain is stone-500,
  // hatched, named, on either side.
  { a: 'red', b: 'stoneTax', where: 'Maps: Expenses beside Taxes', verdict: { kind: 'floor' } },
  { a: 'stoneTax', b: 'blue', where: 'Maps: Taxes beside Planned saving', verdict: { kind: 'floor' } },
  { a: 'blue', b: 'sand', where: 'Maps: Planned saving beside Income not kept', verdict: { kind: 'floor' } },
  { a: 'stoneTax', b: 'sand', where: 'Maps: Taxes beside Income not kept', verdict: { kind: 'floor' } },
  { a: 'red', b: 'sand', where: 'Maps: Expenses beside Income not kept', verdict: { kind: 'floor' } },
  { a: 'stoneGap', b: 'sand', where: 'Maps: the gap beside Income not kept', verdict: { kind: 'floor' } },
  { a: 'stoneGap', b: 'stoneTax', where: 'Maps: the gap beside Taxes', verdict: { kind: 'floor' } },
  { a: 'stoneGap', b: 'orange', where: 'Maps: the gap beside what is taken from savings', verdict: { kind: 'floor' } },
  { a: 'stoneGap', b: 'blue', where: 'Maps: the gap beside Planned saving', verdict: { kind: 'cue', cue: 'the gap hatched and named "Not explained by the year’s figures"; every node prints its name' } },
  { a: 'stoneGap', b: 'red', where: 'Maps: the gap beside Expenses', verdict: { kind: 'cue', cue: 'the gap hatched and named "Not explained by the year’s figures"; every node prints its name' } },
  { a: 'stoneGap', b: 'green', where: 'Maps: the gap beside an income', verdict: { kind: 'cue', cue: 'the gap hatched and named "Not explained by the year’s figures"; every node prints its name' } },
  // The inherited IRA (U13), umber and zigzagged, its own group beside the other four wherever accounts are grouped: Tax
  // Allocation's ring, Balance Sheet's columns and the withdrawal stacks (taxable blue, pre-tax orange, Roth green, HSA
  // sky); Blueprint's tiles (the chrome's sky); Retirement Details' income parts (Social Security deep indigo, other
  // income light green, the money-ran-out band red).
  { a: 'umber', b: 'blue', where: 'the inherited IRA beside taxable', verdict: { kind: 'floor' } },
  { a: 'umber', b: 'orange', where: 'the inherited IRA beside pre-tax', verdict: { kind: 'floor' } },
  { a: 'umber', b: 'green', where: 'the inherited IRA beside Roth', verdict: { kind: 'floor' } },
  { a: 'umber', b: 'sky', where: 'the inherited IRA beside HSA', verdict: { kind: 'floor' } },
  { a: 'umber', b: 'skyTile', where: 'Blueprint: the inherited IRA tile beside HSA', verdict: { kind: 'floor' } },
  { a: 'umber', b: 'deepIndigo', where: 'Retirement Details: inherited withdrawals beside Social Security', verdict: { kind: 'floor' } },
  { a: 'umber', b: 'lightGreen', where: 'Retirement Details: inherited withdrawals beside other income', verdict: { kind: 'floor' } },
  { a: 'umber', b: 'red', where: 'Retirement Details: inherited withdrawals beside the money-ran-out band', verdict: { kind: 'floor' } },
  { a: 'green', b: 'teal', where: 'series slots 1 and 11', verdict: { kind: 'apart' } },
]

/**
 * The clone's confidence band (ref 3.3; plan 2.2): B9's lightness law (the L stops above, ordered by luminance) at
 * RightCapital's hue, about 272. Chroma is 0.085, under the 0.095 cap: at hue 272 the cap's outer stop (L 0.82) falls
 * outside sRGB and clamps (the widest chroma that keeps the whole L range in gamut there is 0.0895, measured with culori
 * on 2026-11-24).
 */
export const RC_BAND = {
  hue: 272,
  chroma: 0.085,
  lMedian: BAND_L_MEDIAN,
  lOuter: BAND_L_OUTER,
} as const
