/*
 * src/viz/charts/fanOptions.ts: the projection fan as Highcharts options (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC3; ref 3.2, 3.3, 3.7). PURE: a `BandFan`, the named moments and an injected labels object in, options out
 * (decision 11: `src/viz` takes every word, count and named moment from the screen's composer, `snapshotView.ts` or
 * RC7's `confidenceView.ts`, which build them through `copy.ts`).
 *
 * THE HONEST-FAN LAWS (back-nine-design section 3, carried to Highcharts):
 * - the y axis is LINEAR from $0, its ticks the one humane lattice (`niceLattice`, `buildYTicks`), never Highcharts'
 *   own; the ruin case touches $0;
 * - p10 to p90 and p25 to p75 are two area ranges, each with its own words PRINTED INSIDE it (never relabelled 5 to 95),
 *   the median a solid line in ink over both (insight 038: a band-hued line is swallowed by its band under CVD; the
 *   colour-blind test measures the ink against every band stop);
 * - the fills are one hue ordered by lightness (`RC_BAND` through `rcBandStopCss`): the inner range darker than the
 *   outer, so the order survives grayscale; they reach the chart as CSS custom properties (`fanBandVars`), styled mode;
 * - the x axis ticks every 5 years of the first person's age, and the tooltip names both ages;
 * - the named moments (today, work stops, the plan's end) are labelled plot lines, their labels staggered over two rows
 *   so neighbours never print over each other;
 * - the fan the caller passes is already cut where the cohort thins (`truncateFanAtThinCohort`); nothing here adds a
 *   point past it.
 */
import type { Options, SeriesOptionsType, XAxisPlotLinesOptions } from 'highcharts/highcharts.src'
import type { BandFan, BandFanYear } from '@shared/model'
import { buildYTicks, niceLattice, type XAnnotation } from '../bandData'
import { BAND_FILL_INNER_P, BAND_FILL_OUTER_P } from '../palette'
import { rcBandStopCss } from '../scale'

/** Every word, figure and age the fan prints, built by the screen's composer through `copy.ts`. */
export interface FanLabels {
  /** The three tiers' names (the legend and the words printed inside each range). */
  readonly outer: string
  readonly inner: string
  readonly median: string
  /** The short words printed INSIDE each range (they must fit a phone's plot; the legend names each in full). */
  readonly outerWords: string
  readonly innerWords: string
  readonly yAxisTitle: string
  readonly xAxisTitle: string
  /** The chart's screen-reader description. */
  readonly description: string
  /** The y axis's tick labels for a lattice ceiling (one unit per lattice). */
  readonly axisDollar: (ceiling: number) => (dollars: number) => string
  /** One projected figure, unhedged (the slots add the `~`). */
  readonly figure: (dollars: number) => string
  /** The first person's age at a year from now (the x axis's tick words). */
  readonly ageAt: (yearsFromNow: number) => number
  /** Both ages at a year from now, as the tooltip and the screen reader say them. */
  readonly agesAt: (yearsFromNow: number) => string
  readonly tipRange: (low: string, high: string) => string
  readonly tipMedian: (median: string) => string
  readonly point: (ages: string, low: string, median: string, high: string) => string
}

export interface FanInput {
  readonly fan: BandFan
  /** The household-clock markers (`deriveSpineBandAnnotations` / `deriveDateBandAnnotations`); the named ones (a
   *  non-empty label) become plot lines, the bare age ticks are the axis's own. */
  readonly moments: readonly XAnnotation[]
  readonly labels: FanLabels
  /** The chart's pixel height (the card sets it). */
  readonly height: number
}

/** The class names the chart CSS paints (`chartTheme.css`). */
export const FAN_CLASSES = {
  outer: 'b9-fan-outer',
  inner: 'b9-fan-inner',
  median: 'b9-fan-median',
  word: 'b9-fan-word',
  moment: 'b9-fan-moment',
} as const

/** The two fills, as the custom properties `chartTheme.css` reads: one hue, the inner range darker than the outer. */
export function fanBandVars(): ReadonlyArray<readonly [name: string, value: string]> {
  return [
    ['--b9-fan-outer', rcBandStopCss(BAND_FILL_OUTER_P)],
    ['--b9-fan-inner', rcBandStopCss(BAND_FILL_INNER_P)],
  ]
}

/** The x-axis ticks: every year at which the first person's age is a multiple of 5, inside the drawn years. */
export function ageTickYears(lastYear: number, ageAt: (yearsFromNow: number) => number): readonly number[] {
  const out: number[] = []
  for (let t = 0; t <= lastYear; t++) if (ageAt(t) % 5 === 0) out.push(t)
  return out
}

/** Where a range's words sit: the year in the middle stretch of the fan where the range is widest, and the vertical
 *  middle of the range there. Pure, so the test can read it. */
export function wordSeat(
  years: readonly BandFanYear[],
  low: (y: BandFanYear) => number,
  high: (y: BandFanYear) => number,
  /** Where between the range's edges the words' middle sits (0.5 the middle; the inner range's words sit a little high,
   *  clear of the median line that runs along its lower edge). */
  at = 0.5,
): { readonly x: number; readonly y: number } | null {
  const n = years.length
  if (n < 2) return null
  const from = Math.floor(n * 0.35)
  const to = Math.max(from, Math.ceil(n * 0.7) - 1)
  let best: BandFanYear | undefined
  for (let i = from; i <= to; i++) {
    const y = years[i]
    if (y === undefined) continue
    if (best === undefined || high(y) - low(y) > high(best) - low(best)) best = y
  }
  if (best === undefined) return null
  return { x: best.yearsFromNow, y: low(best) + at * (high(best) - low(best)) }
}

/** The named moments as plot lines, their labels at the FOOT of the plot (the ranges' words sit in the upper strips, so
 *  the two never meet), staggered over two rows in x order; an end label leans inward. */
function plotLines(moments: readonly XAnnotation[], lastYear: number): XAxisPlotLinesOptions[] {
  const named = moments.filter((m) => m.label !== '').sort((a, b) => a.yearsFromNow - b.yearsFromNow)
  return named.map((m, i) => {
    const right = m.yearsFromNow > lastYear * 0.6
    return {
      value: m.yearsFromNow,
      className: FAN_CLASSES.moment,
      zIndex: 4,
      label: {
        text: m.label,
        rotation: 0,
        align: right ? 'right' : 'left',
        x: right ? -4 : 4,
        verticalAlign: 'bottom',
        y: -6 - (i % 2) * 18,
        useHTML: false,
      },
    }
  })
}

/** The fan's options. Throws (through `buildYTicks`) on an all-$0 fan: the caller screens it (no honest scale). */
export function fanOptions({ fan, moments, labels, height }: FanInput): Options {
  const years = fan.byYear
  const last = years[years.length - 1]
  if (last === undefined) throw new RangeError('fanOptions: an empty fan has nothing to draw')
  const max = Math.max(...years.map((y) => y.p90))
  const lattice = niceLattice(max)
  const ticks = buildYTicks(lattice, labels.axisDollar(lattice.ceiling))
  const tickLabel = new Map(ticks.map((t) => [t.dollars, t.label]))
  const byX = new Map(years.map((y) => [y.yearsFromNow, y]))
  const outerSeat = wordSeat(years, (y) => y.p75, (y) => y.p90)
  const innerSeat = wordSeat(years, (y) => y.p50, (y) => y.p75, 0.62)
  const words = (seat: { x: number; y: number } | null, text: string, kind: 'outer' | 'inner'): SeriesOptionsType[] =>
    seat === null
      ? []
      : [
          {
            type: 'scatter',
            id: `fan-words-${kind}`,
            name: text,
            className: `${FAN_CLASSES.word} ${FAN_CLASSES.word}--${kind}`,
            data: [{ x: seat.x, y: seat.y }],
            marker: { enabled: false },
            enableMouseTracking: false,
            showInLegend: false,
            accessibility: { enabled: false },
            states: { inactive: { enabled: false } },
            zIndex: 5,
            dataLabels: {
              enabled: true,
              format: text,
              align: 'center',
              verticalAlign: 'middle',
              y: 0,
              crop: false,
              // Kept inside the plot: a label that would cross its edge slides back in, never cut.
              overflow: 'justify',
              allowOverlap: true,
              useHTML: false,
              // Shown with the ranges they name, never faded in after them: a word that waits on the morph is a word a
              // reader (or a reading) can catch missing.
              defer: false,
            },
          },
        ]
  const pointWords = (x: number): string => {
    const y = byX.get(x)
    if (y === undefined) return ''
    return labels.point(labels.agesAt(x), labels.figure(y.p10), labels.figure(y.p50), labels.figure(y.p90))
  }
  return {
    chart: { height, spacingTop: 12 },
    title: { text: undefined },
    accessibility: {
      description: labels.description,
      point: { descriptionFormatter: (point) => pointWords(Number(point.x)) },
    },
    legend: { enabled: true, align: 'center', verticalAlign: 'bottom' },
    tooltip: {
      shared: true,
      formatter: function () {
        // The hovered year: the shared tooltip's points carry it (Highcharts 13's formatter context varies by mode).
        const ctx = this as unknown as { readonly x?: number | string; readonly key?: number | string; readonly points?: readonly { readonly x: number }[] }
        const x = Number(ctx.points?.[0]?.x ?? ctx.x ?? ctx.key)
        const y = byX.get(x)
        if (y === undefined) return false
        return [
          labels.agesAt(x),
          labels.tipRange(labels.figure(y.p10), labels.figure(y.p90)),
          labels.tipMedian(labels.figure(y.p50)),
        ].join('<br>')
      },
    },
    xAxis: {
      type: 'linear',
      min: 0,
      max: last.yearsFromNow,
      tickPositions: [...ageTickYears(last.yearsFromNow, labels.ageAt)],
      title: { text: labels.xAxisTitle },
      labels: { formatter: (ctx) => String(labels.ageAt(Number(ctx.value))) },
      plotLines: plotLines(moments, last.yearsFromNow),
      crosshair: true,
    },
    yAxis: {
      type: 'linear',
      min: 0,
      max: lattice.ceiling,
      startOnTick: false,
      endOnTick: false,
      tickPositions: ticks.map((t) => t.dollars),
      // No drawn title: a rotated title outgrows a phone's plot at a raised browser font (the audit caught it clipped
      // at a 20 px default). The card prints the same words over the chart; a screen reader hears them here.
      title: { text: undefined },
      accessibility: { description: labels.yAxisTitle },
      labels: { formatter: (ctx) => tickLabel.get(Number(ctx.value)) ?? '' },
    },
    plotOptions: {
      series: { marker: { enabled: false } },
    },
    series: [
      {
        type: 'arearange',
        id: 'fan-outer',
        name: labels.outer,
        className: FAN_CLASSES.outer,
        data: years.map((y) => [y.yearsFromNow, y.p10, y.p90]),
        zIndex: 1,
      },
      {
        type: 'arearange',
        id: 'fan-inner',
        name: labels.inner,
        className: FAN_CLASSES.inner,
        data: years.map((y) => [y.yearsFromNow, y.p25, y.p75]),
        zIndex: 2,
      },
      {
        type: 'line',
        id: 'fan-median',
        name: labels.median,
        className: FAN_CLASSES.median,
        data: years.map((y) => [y.yearsFromNow, y.p50]),
        zIndex: 3,
      },
      ...words(outerSeat, labels.outerWords, 'outer'),
      ...words(innerSeat, labels.innerWords, 'inner'),
    ],
  }
}
