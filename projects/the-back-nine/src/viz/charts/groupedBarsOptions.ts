/*
 * src/viz/charts/groupedBarsOptions.ts: grouped bars, one group per measure, one bar per side (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC8, Tax → Tax Strategies → Summary; ref 2.17's "Summary of tax strategy"). PURE:
 * every figure, the shared scale and every word arrive from the composer (`summaryView.ts`).
 *
 * The colour roles are plan 4.0's: the alternative (the recommendation) green and solid, the plan it is compared against
 * blue and hatched (the second cue, carried to the legend symbol by `chartTheme.css`), the compared side on the right.
 * Every bar prints its own figure above it in dark text (back-nine-design: values on the green bar print above it in
 * stone-900), so the comparison never rests on colour or on height alone. The y axis is linear from $0 on one humane
 * lattice (`niceLattice`), its ticks in the `mm` dialect.
 */
import type { Options, SeriesColumnOptions } from 'highcharts/highcharts.src'
import { buildYTicks, type DollarLattice } from '../bandData'
import { chartWordsOptions, type ChartWords } from './chartA11y'

export interface GroupedBarSeries {
  readonly id: string
  readonly name: string
  readonly role: 'alternative' | 'compared'
  /** One value per group, in the groups' order. */
  readonly values: readonly number[]
  /** The printed figure for each value (`~` included). */
  readonly figures: readonly string[]
  /** The screen reader's sentence for each bar. */
  readonly points: readonly string[]
}

export interface GroupedBarsInput {
  readonly groups: readonly string[]
  readonly series: readonly GroupedBarSeries[]
  readonly lattice: DollarLattice
  readonly axisDollar: (dollars: number) => string
  readonly words: ChartWords
  readonly height: number
  /** The groups' and bars' padding (RC17's spending comparison widens the gap between a group's bars, so two figures
   *  over neighbouring bars never meet); RC8's Summary keeps the defaults. */
  readonly padding?: { readonly group: number; readonly point: number }
}

export const GROUPED_BAR_CLASSES = { alternative: 'b9-bar-alternative', compared: 'b9-bar-compared b9-hatch' } as const

export function groupedBarsOptions(input: GroupedBarsInput): Options {
  const { groups, series, lattice, axisDollar, words, height } = input
  const ticks = buildYTicks(lattice, axisDollar)
  const tickLabel = new Map(ticks.map((t) => [t.dollars, t.label]))
  const spoken = chartWordsOptions(words)
  return {
    chart: { type: 'column', height, spacingTop: 28, spacingBottom: 12 },
    title: { text: undefined },
    lang: spoken.lang,
    // Each bar's spoken sentence is the composer's (Highcharts' own read the raw float: "…, 5,195,002.428181937.").
    accessibility: { ...spoken.accessibility, point: { descriptionFormatter: (p) => String((p.options.custom as { point?: string } | undefined)?.point ?? '') } },
    legend: { enabled: true, align: 'center', verticalAlign: 'bottom' },
    tooltip: { enabled: false },
    credits: { enabled: true, position: { align: 'right', verticalAlign: 'bottom', x: -4, y: -2 } },
    xAxis: { categories: [...groups], lineWidth: 1 },
    yAxis: {
      type: 'linear',
      min: 0,
      max: lattice.ceiling,
      startOnTick: false,
      endOnTick: false,
      tickPositions: ticks.map((t) => t.dollars),
      title: { text: undefined },
      labels: { formatter: (ctx) => tickLabel.get(Number(ctx.value)) ?? '' },
    },
    plotOptions: {
      column: {
        borderRadius: 4,
        pointPadding: input.padding?.point ?? 0.08,
        groupPadding: input.padding?.group ?? 0.22,
        maxPointWidth: 96,
        dataLabels: { enabled: true, crop: false, overflow: 'allow', allowOverlap: true, useHTML: false, defer: false },
      },
    },
    series: series.map(
      (s): SeriesColumnOptions => ({
        type: 'column',
        id: s.id,
        name: s.name,
        colorIndex: s.role === 'alternative' ? 1 : 0,
        className: GROUPED_BAR_CLASSES[s.role],
        // No entrance growth: a column grows by scaling its group, and a host re-render mid-growth stopped it flat
        // (RC4's balance bar). The figures are printed either way.
        animation: false,
        data: s.values.map((y, i) => ({ y, custom: { figure: s.figures[i] ?? '', point: s.points[i] ?? '' } })),
        dataLabels: { formatter: function () { return String((this as unknown as { point: { custom?: { figure?: string } } }).point.custom?.figure ?? '') } },
      }),
    ),
  }
}
