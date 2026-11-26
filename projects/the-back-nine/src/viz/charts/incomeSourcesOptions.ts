/*
 * src/viz/charts/incomeSourcesOptions.ts: columns over the plan's years (plan docs/plans/6-rightcapital-ui-plan.md, RC17;
 * `rc-analysis/retirement-details-tab-retirement-analysis__cleanshot-2024-07-29-at-13-47-56-2x.png`). PURE: every value,
 * tick and word arrives from the composer (`retirementDetailsView.ts`, `savingsView.ts`).
 *
 * One column per year, its parts stacked from the bottom in the composer's order: Retirement Details' income sources
 * (Social Security, other income, then the withdrawals from taxable, pre-tax, Roth and the HSA), its spending (spending,
 * income tax, health premiums) and its withdrawal rate; Savings' deposits by account and its working years' left over
 * (which can run below $0: a short year, drawn under the zero line, which then carries an ink rule). Each part wears its
 * colour slot AND its pattern (`patterns.ts`), named in the legend and in each column's hover, so colour is never the
 * only signal; the legend runs bottom-up, as the stack does.
 *
 * THE YEAR THE MONEY RAN OUT (`ranOut`): that year's row records what the year asked for, not what was paid, so it draws
 * no column. A cross-hatched band stands over the year instead, with "Money ran out this year" printed over it and no
 * dollar figure, and the axis ends there (the composer's notes say the rows end).
 *
 * The y axis is linear on the composer's lattice (from $0, or below it for a short year); the x axis is the first
 * person's age or the calendar year (`axisOffset`, as `stackedAreasOptions.ts`). No value is printed on a column (one per
 * year would crowd the plot): the hover prints each part and the key-metric column carries the figures in words.
 */
import type { Options, PointOptionsObject, SeriesColumnOptions } from 'highcharts/highcharts.src'
import { chartWordsOptions, hcPlain, type ChartWords } from './chartA11y'
import { PATTERN_IDS, type PatternKind } from './patterns'

export interface YearValue {
  readonly year: number
  readonly value: number
}

export interface YearSource {
  readonly id: string
  readonly name: string
  readonly colorIndex: number
  readonly pattern: PatternKind | 'solid'
  readonly points: readonly YearValue[]
}

export interface YearBarsInput {
  /** The parts, bottom-up. */
  readonly sources: readonly YearSource[]
  /** The y axis's ticks with their words, lowest first. */
  readonly ticks: readonly { readonly value: number; readonly label: string }[]
  /** A value as the hover prints it (`~$12,000`, `4.2%`). */
  readonly valueText: (value: number) => string
  /** A point's spoken sentence from the axis's number, the part's name and its value. */
  readonly pointWords: (axisNumber: number, name: string, value: number) => string
  readonly words: ChartWords
  readonly height: number
  readonly axisTitle: string
  readonly axisOffset: number
  /** The year the money ran out, drawn as a cross-hatched band with its words over it. */
  readonly ranOut?: { readonly year: number; readonly label: string }
  /** The legend: on for two parts or more. */
  readonly legend: boolean
}

export const RANOUT_BAND_CLASS = 'b9-ranout-band'

export function yearBarsOptions(input: YearBarsInput): Options {
  const { sources, ticks, valueText, axisOffset } = input
  const spoken = chartWordsOptions(input.words)
  const tickLabel = new Map(ticks.map((t) => [t.value, t.label]))
  const low = ticks[0]?.value ?? 0
  const high = ticks[ticks.length - 1]?.value ?? 0
  const ranOutX = input.ranOut === undefined ? undefined : input.ranOut.year + axisOffset
  // A short span (a few working years) ticks every year or two, so the axis names more than one of them.
  const xs = sources.flatMap((s) => s.points.map((p) => p.year))
  const span = xs.length === 0 ? 0 : Math.max(...xs) - Math.min(...xs)
  const tickInterval = span <= 8 ? 1 : span <= 16 ? 2 : axisOffset === 0 ? 10 : 5
  // Highcharts stacks the FIRST series on top, so the series run top-down and the legend runs reversed (bottom-up).
  const topDown = [...sources].reverse()
  return {
    // The ran-out words print over the plot's top edge, in the band the spacing holds for them.
    chart: { type: 'column', height: input.height, spacingTop: input.ranOut !== undefined ? 28 : 16, spacingRight: 16 },
    title: { text: undefined },
    lang: spoken.lang,
    accessibility: { ...spoken.accessibility, point: { descriptionFormatter: (p) => input.pointWords(Number(p.x), p.series.name, Number(p.y ?? 0)) } },
    legend: { enabled: input.legend, align: 'center', verticalAlign: 'bottom', reversed: true },
    credits: { enabled: true, position: { align: 'right', verticalAlign: 'bottom', x: -4, y: -2 } },
    tooltip: {
      shared: true,
      formatter: function () {
        const ctx = this as unknown as { x: number; points?: { series: { name: string }; y: number }[] }
        return [`${hcPlain(input.axisTitle)} ${ctx.x}`, ...[...(ctx.points ?? [])].reverse().map((p) => `${p.series.name}: ${valueText(p.y)}`)].join('<br/>')
      },
    },
    xAxis: {
      type: 'linear',
      allowDecimals: false,
      tickInterval,
      lineWidth: 1,
      title: { text: hcPlain(input.axisTitle) },
      ...(ranOutX !== undefined
        ? {
            plotBands: [
              {
                from: ranOutX - 0.5,
                to: ranOutX + 0.5,
                className: RANOUT_BAND_CLASS,
                zIndex: 3,
                label: { text: hcPlain(input.ranOut!.label), align: 'right', verticalAlign: 'top', textAlign: 'right', x: 0, y: -8, useHTML: false },
              },
            ],
          }
        : {}),
    },
    yAxis: {
      type: 'linear',
      min: low,
      max: high,
      startOnTick: false,
      endOnTick: false,
      tickPositions: ticks.map((t) => t.value),
      title: { text: undefined },
      labels: { formatter: (ctx) => tickLabel.get(Number(ctx.value)) ?? '' },
      ...(low < 0 ? { plotLines: [{ value: 0, width: 1, className: 'b9-zero-line', zIndex: 3 }] } : {}),
    },
    plotOptions: {
      column: { stacking: 'normal', borderRadius: 2, pointPadding: 0.08, groupPadding: 0.06, maxPointWidth: 28, states: { hover: { brightness: 0 } } },
    },
    series: topDown.map(
      (s): SeriesColumnOptions => ({
        type: 'column',
        id: `year-${s.id}`,
        name: s.name,
        colorIndex: s.colorIndex,
        className: [`b9-year-part b9-year-part--${s.id}`, s.pattern === 'solid' ? '' : PATTERN_IDS[s.pattern]].filter((c) => c !== '').join(' '),
        // No entrance growth: a column grows by scaling its group, and a host re-render mid-growth stopped RC4's bar flat.
        animation: false,
        data: s.points.map(
          (p): PointOptionsObject => ({ x: p.year + axisOffset, y: p.value }),
        ),
      }),
    ),
  }
}
