/*
 * src/viz/charts/runOutOptions.ts: "Futures run out by this age", the small chart under Confidence's fan on the retired
 * route (plan docs/plans/6-rightcapital-ui-plan.md, RC7; ref 2.9's "B9's version"). PURE: the run-out shares and the
 * composer's words in, Highcharts options out (decision 11: every word, including each year's "about N in 100 futures",
 * is `confidenceView.ts`'s, built through `copy.ts`).
 *
 * THE HONEST-CHART LAWS, as they bind a share of futures:
 * - the y axis is the count of futures in every 100, LINEAR from 0, its top the smallest of 10, 20, 50 and 100 that
 *   holds the highest share drawn (`runOutCeiling`), its ticks at 0, half and the top: a small share reads small;
 * - the x axis is the fan's, to the year: the same first and last year, the same age ticks, and the same plot margins,
 *   handed over from the fan as it drew (`PlotBox`), so a year sits under the same year;
 * - every year's share is in words in the tooltip and in the screen reader's sentence for that year ("about 6 in 100
 *   futures", never a percent, never "0 in 100"); no value is printed on the plot, whose few rows of height would put
 *   any label over the line (RC4's lesson: a label over a mark passes every automated check). The key-metric column
 *   beside the charts prints the share by the last year drawn and over the whole plan;
 * - one series, named by the title printed over the chart, so no legend; colour carries nothing (a single ink line over
 *   a pale fill).
 */
import type { Options } from 'highcharts/highcharts.src'
import { chartWordsOptions, type ChartWords } from './chartA11y'
import { ageTickYears, type PlotBox } from './fanOptions'

/** One year of the run-out share: the futures (of every 100) that have run out by then, and the composer's words. */
export interface RunOutPoint {
  /** Years from the plan's start, on the fan's grid. */
  readonly x: number
  /** Futures run out by this year, in every 100 (exact: count × 100 ÷ paths; never rounded for drawing). */
  readonly per100: number
  /** The year's tooltip lines (the ages, then the share in words). */
  readonly tip: string
  /** The year's screen-reader sentence. */
  readonly sentence: string
}

export interface RunOutLabels {
  /** The y axis's tick words ("0", "5", "10"). */
  readonly yTick: (per100: number) => string
  /** The first person's age at a year from now (the x axis's tick words, the fan's). */
  readonly ageAt: (yearsFromNow: number) => number
  readonly description: string
  readonly words: Omit<ChartWords, 'description'>
}

export interface RunOutInput {
  /** One point per year from the fan's first year to its last, in order. */
  readonly points: readonly RunOutPoint[]
  readonly labels: RunOutLabels
  readonly height: number
  /** The fan's plot margins, so the two charts' years line up. */
  readonly box: PlotBox
}

/** The class name the chart CSS paints (`chartTheme.css`). */
export const RUN_OUT_CLASS = 'b9-runout'

/** The y axis's top, in futures of every 100: the smallest of 10, 20, 50 and 100 that holds the highest share. */
export function runOutCeiling(maxPer100: number): number {
  for (const c of [10, 20, 50]) if (maxPer100 <= c) return c
  return 100
}

export function runOutOptions({ points, labels, height, box }: RunOutInput): Options {
  const first = points[0]
  const last = points[points.length - 1]
  if (first === undefined || last === undefined) throw new RangeError('runOutOptions: no years to draw')
  const ceiling = runOutCeiling(Math.max(...points.map((p) => p.per100)))
  const byX = new Map(points.map((p) => [p.x, p]))
  const spoken = chartWordsOptions({ ...labels.words, description: labels.description })
  return {
    // A taller foot than the default 15 px: the credit (the licence keeps it on) sits under the age ticks, never on them.
    chart: { height, spacingTop: 8, spacingBottom: 22, marginLeft: box.left, marginRight: box.right },
    title: { text: undefined },
    lang: spoken.lang,
    accessibility: {
      ...spoken.accessibility,
      point: { descriptionFormatter: (point) => byX.get(Number(point.x))?.sentence ?? '' },
    },
    legend: { enabled: false },
    tooltip: {
      formatter: function () {
        const ctx = this as unknown as { readonly x?: number | string }
        return byX.get(Number(ctx.x))?.tip ?? false
      },
    },
    xAxis: {
      type: 'linear',
      min: first.x,
      max: last.x,
      tickPositions: [...ageTickYears(last.x, labels.ageAt)],
      title: { text: undefined },
      labels: { formatter: (ctx) => String(labels.ageAt(Number(ctx.value))) },
      crosshair: true,
    },
    yAxis: {
      type: 'linear',
      min: 0,
      max: ceiling,
      startOnTick: false,
      endOnTick: false,
      tickPositions: [0, ceiling / 2, ceiling],
      title: { text: undefined },
      labels: { formatter: (ctx) => labels.yTick(Number(ctx.value)) },
    },
    plotOptions: {
      series: { marker: { enabled: false } },
    },
    series: [
      {
        type: 'area',
        id: 'runout',
        name: labels.words.title,
        className: RUN_OUT_CLASS,
        data: points.map((p) => [p.x, p.per100]),
      },
    ],
  }
}
