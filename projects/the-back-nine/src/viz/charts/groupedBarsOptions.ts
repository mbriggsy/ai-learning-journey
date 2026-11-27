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
import { sidewaysTicks } from './kindBarsOptions'

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
  /** The groups' and bars' padding; RC8's Summary keeps the defaults. The bar padding narrows the bars but never moves
   *  their figures apart: neighbouring figures stand (1 − 2 × group padding) ÷ the series count of a group's width apart. */
  readonly padding?: { readonly group: number; readonly point: number }
  /** Turn the bars sideways where the chart is too narrow for every figure side by side (`groupedSidewaysMaxWidth`),
   *  as Balance Sheet's bars do on a phone (`kindBarsOptions`). RC17's spending comparison asks for it; RC8's Summary
   *  keeps its columns. */
  readonly sideways?: boolean
}

export const GROUPED_BAR_CLASSES = { alternative: 'b9-bar-alternative', compared: 'b9-bar-compared b9-hatch' } as const

/** The widest figure a grouped bar prints, in CSS px: "~$9.99mm" or "~$999k" (eight characters, tabular digits) at the
 *  label's 14px/600 measures about 70 px in Figtree on Linux's rasterizer, a few px less on Windows; 80 leaves slack. */
const GROUPED_FIGURE_PX = 80
/** The clear space wanted between two neighbouring figures. */
const GROUPED_FIGURE_GAP_PX = 12
/** The value axis's tick words and the chart's left and right spacing, which the plot does not get. */
const GROUPED_AXIS_AND_SPACING_PX = 72
/** Highcharts' default right spacing, stated so the sideways rule's undo restores it. */
const GROUPED_BASE_SPACING_RIGHT = 10

/** The widest chart at which the bars run sideways: columns fit only where every figure and its gap fit in its bar's
 *  share of the plot, and a group's bars share (1 − 2 × group padding) of the group's width. RC17's spending comparison
 *  (three groups, two sides, group padding 0.03) needs 6 × 92 ÷ 0.94 + 72 ≈ 659 px of chart; at his window the notes
 *  column leaves it about 500, where "~$1.18mm" and "~$1.1mm" met on CI's Linux render (milestone 4's review, round 3's
 *  fit red, run 45926955673). */
export function groupedSidewaysMaxWidth(groups: number, seriesCount: number, groupPadding: number): number {
  return Math.ceil((groups * seriesCount * (GROUPED_FIGURE_PX + GROUPED_FIGURE_GAP_PX)) / (1 - 2 * groupPadding)) + GROUPED_AXIS_AND_SPACING_PX
}

export function groupedBarsOptions(input: GroupedBarsInput): Options {
  const { groups, series, lattice, axisDollar, words, height } = input
  const ticks = buildYTicks(lattice, axisDollar)
  const tickLabel = new Map(ticks.map((t) => [t.dollars, t.label]))
  const spoken = chartWordsOptions(words)
  const groupPadding = input.padding?.group ?? 0.22
  // Sideways, each figure prints at its bar's end, whole and level, never rotated, cut or shortened: the right spacing
  // holds the widest figure past the longest bar (the lattice's ceiling can equal the largest value), and the value
  // axis keeps at most three tick words across its shorter run (`sidewaysTicks`).
  const sidewaysRule = input.sideways === true
    ? {
        responsive: {
          rules: [
            {
              condition: { maxWidth: groupedSidewaysMaxWidth(groups.length, series.length, groupPadding) },
              chartOptions: {
                chart: { inverted: true, spacingRight: GROUPED_FIGURE_PX + 12 },
                yAxis: { tickPositions: sidewaysTicks(ticks.map((t) => t.dollars)) },
              },
            },
          ],
        },
      }
    : {}
  return {
    chart: { type: 'column', height, spacingTop: 28, spacingBottom: 12, ...(input.sideways === true ? { inverted: false, spacingRight: GROUPED_BASE_SPACING_RIGHT } : {}) },
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
        groupPadding,
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
    ...sidewaysRule,
  }
}
