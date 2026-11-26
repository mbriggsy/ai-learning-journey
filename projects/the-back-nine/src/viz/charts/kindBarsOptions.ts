/*
 * src/viz/charts/kindBarsOptions.ts: Dashboard → Balance Sheet's one chart (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC16; ref 2.2; `rc-shell/balsheet-01.png`). PURE: every figure, tick and word arrives from the composer
 * (`balanceSheetView.ts`).
 *
 * One column per kind of account (taxable, pre-tax, Roth, HSA), each named under it on the axis and its entered balance
 * printed above it in dark text with no hover needed, on a linear axis from $0 to the composer's one humane lattice. The
 * kinds wear Tax Allocation's look (`BUCKET_LOOK`: taxable solid blue, pre-tax hatched orange, Roth dotted green, HSA
 * lined sky; every neighbouring pair a `floor` row of `RC_PAIRS`), so colour is never the only signal: the name, the
 * printed figure and the pattern each carry the kind too. A kind with no money keeps its slot and prints "$0" (one kind
 * held reads as one kind held, never as a chart that failed to draw; insight 174).
 *
 * The figures are never deferred (a series-level `defer: false`: a deferred label waits on the morph and stays at opacity
 * 0 under a pinned clock, insight 169), and the columns never grow in (a host re-render mid-growth stopped RC4's bar flat).
 *
 * THE PHONE TURNS THE BARS SIDEWAYS (the orchestrator's CALL at RC16's review, 2026-11-26): a chart too narrow for four
 * whole figures side by side draws each kind as a ROW (Highcharts' `inverted`), its name on the left axis and its exact
 * figure printed at its bar's end, never rotated, cut or shortened. Columns at 390 px stood about 59 px apart while
 * "$1,120,000" prints about 76 px wide, so two held kinds of similar size printed their digits over each other (the labels
 * may overlap by the shared default, so nothing hid the collision). The laptop keeps RightCapital's columns. The rule
 * reads the chart's own width (`SIDEWAYS_MAX_WIDTH`), so a resize across it re-lays the same chart; the base options
 * state `inverted: false` and the base right spacing so Highcharts' undo of the rule has a value to restore.
 */
import type { Options, PointOptionsObject } from 'highcharts/highcharts.src'
import { chartWordsOptions, type ChartWords } from './chartA11y'
import { PATTERN_IDS, type PatternKind } from './patterns'

export interface KindBar {
  readonly id: string
  /** The kind's name, printed under its column. */
  readonly name: string
  /** The entered balance, in dollars. */
  readonly value: number
  /** The printed figure. */
  readonly figure: string
  /** The series colour slot (`palette.ts`'s `RC_SERIES` order). */
  readonly colorIndex: number
  readonly pattern: PatternKind | 'solid'
  /** The screen reader's sentence for the column. */
  readonly point: string
}

export interface KindBarsInput {
  readonly bars: readonly KindBar[]
  /** The y axis's ticks, $0 first and the lattice's ceiling last, each with its words. */
  readonly ticks: readonly { readonly dollars: number; readonly label: string }[]
  readonly words: ChartWords
  readonly height: number
}

/** The widest figure the label can print, in CSS px: "$9,999,999" (ten characters, tabular digits) at the label's 14px/600
 *  measures about 76 px in Figtree; 80 leaves slack for the font's rendering. A balance of $10 million or more in one kind
 *  is past the design ceiling Briggsy ruled 2026-11-21 (a household spending about $15,000 to $20,000 a month); its figure
 *  still prints whole, never shortened. */
const FIGURE_PX = 80
/** The clear space wanted between two neighbouring figures. */
const FIGURE_GAP_PX = 12
/** The y axis's tick labels ("$1.5M") and the chart's left and right spacing, which the plot does not get. */
const AXIS_AND_SPACING_PX = 72
/** Columns fit only where four of the widest figures and their gaps fit across the plot: 4 × (80 + 12) + 72 = 440 px of
 *  chart. At or under it the bars run sideways (a 390 px phone's chart is about 330 px wide; his laptop's 896). */
export const SIDEWAYS_MAX_WIDTH = 4 * (FIGURE_PX + FIGURE_GAP_PX) + AXIS_AND_SPACING_PX
/** Highcharts' default right spacing, stated so the rule's undo restores it. */
const BASE_SPACING_RIGHT = 10
/** Sideways, the longest bar can reach the plot's right edge (the lattice's ceiling may equal the largest balance), and
 *  its figure prints past the end: the widest figure plus the label's padding, so it is never clipped. */
const SIDEWAYS_SPACING_RIGHT = FIGURE_PX + 12

/** Sideways, the value axis runs across a plot of about 170 px on a 390 px phone, too short for the lattice's four or so
 *  intervals of tick words side by side ("$600k" and "$800k" met at RC16's first sideways run). It keeps $0 and the
 *  ceiling always (the axis still ends where the options state, and the top tick is the scale's figure) and the middle
 *  tick where the intervals divide evenly: at most three words across. The bars' own figures carry the exact values. */
export function sidewaysTicks(ticks: readonly number[]): number[] {
  if (ticks.length <= 3) return [...ticks]
  const last = ticks.length - 1
  return last % 2 === 0 ? [ticks[0]!, ticks[last / 2]!, ticks[last]!] : [ticks[0]!, ticks[last]!]
}

export function kindBarsOptions(input: KindBarsInput): Options {
  const { bars, ticks, words, height } = input
  const spoken = chartWordsOptions(words)
  const tickLabel = new Map(ticks.map((t) => [t.dollars, t.label]))
  const ceiling = ticks[ticks.length - 1]?.dollars ?? 0
  const data = bars.map(
    (b, i): PointOptionsObject => ({
      x: i,
      y: b.value,
      colorIndex: b.colorIndex,
      className: [`b9-kind-bar b9-kind-bar--${b.id}`, b.pattern === 'solid' ? '' : PATTERN_IDS[b.pattern]].filter((c) => c !== '').join(' '),
      custom: { figure: b.figure, point: b.point },
    }),
  )
  return {
    // The credit sits in its own band under the axis words.
    chart: { type: 'column', inverted: false, height, spacingTop: 28, spacingBottom: 20, spacingRight: BASE_SPACING_RIGHT },
    title: { text: undefined },
    lang: spoken.lang,
    accessibility: { ...spoken.accessibility, point: { descriptionFormatter: (p) => String((p.options.custom as { point?: string } | undefined)?.point ?? '') } },
    legend: { enabled: false },
    tooltip: { enabled: false },
    credits: { enabled: true, position: { align: 'right', verticalAlign: 'bottom', x: -4, y: -2 } },
    xAxis: {
      categories: bars.map((b) => b.name),
      lineWidth: 1,
      // Each kind's name under its column; never rotated or cut (a cut label hides content).
      labels: { autoRotationLimit: 0, overflow: 'allow', style: { textOverflow: 'clip', whiteSpace: 'normal' } as const },
    },
    yAxis: {
      type: 'linear',
      min: 0,
      max: ceiling,
      startOnTick: false,
      endOnTick: false,
      tickPositions: ticks.map((t) => t.dollars),
      title: { text: undefined },
      labels: { formatter: (ctx) => tickLabel.get(Number(ctx.value)) ?? '' },
    },
    plotOptions: { column: { borderRadius: 4, pointPadding: 0.18, groupPadding: 0.14, maxPointWidth: 96 } },
    series: [
      {
        type: 'column',
        id: 'kind-bars',
        name: words.title,
        className: 'b9-kind-series',
        animation: false,
        data,
        dataLabels: {
          enabled: true,
          defer: false,
          crop: false,
          overflow: 'allow',
          allowOverlap: true,
          useHTML: false,
          formatter: function () {
            return String((this as unknown as { point: { custom?: { figure?: string } } }).point.custom?.figure ?? '')
          },
        },
      },
    ],
    responsive: {
      rules: [
        {
          condition: { maxWidth: SIDEWAYS_MAX_WIDTH },
          chartOptions: {
            chart: { inverted: true, spacingRight: SIDEWAYS_SPACING_RIGHT },
            yAxis: { tickPositions: sidewaysTicks(ticks.map((t) => t.dollars)) },
          },
        },
      ],
    },
  }
}
