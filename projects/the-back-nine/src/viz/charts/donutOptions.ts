/*
 * src/viz/charts/donutOptions.ts: Investment's thick donuts (plan docs/plans/6-rightcapital-ui-plan.md, RC12; ref 2.19;
 * `rc-cashflow-tax/help-investment-asset-allocation-51.png`, `help-investment-tax-allocation-51-later.png`) and Asset
 * Allocation → Detail's diverging bars. PURE: every share, percent and word arrives from the composer
 * (`investmentView.ts`).
 *
 * THE DONUT. One pie series with a large hole, starting at 12 o'clock and running clockwise in the composer's order, each
 * slice its part's RightCapital hue and its pattern (`patterns.ts`; `chartTheme.css` paints it), so colour is never the
 * only cue: the parts also print beside the ring (the legend table, the big figures). No words inside the SVG: the centre
 * is HTML over the hole (`InvestmentCharts.tsx`), as the ring's is (plan 4.0, the font law). No hover and no tooltip (every
 * figure is printed); a slice the reader may pick (Tax Allocation) takes a click and a pointer cursor, and the picked one
 * carries a heavy ink edge beside its listed accounts.
 *
 * THE DIVERGING BARS. One bar per part, what-if less current in whole points, on a fixed symmetric scale centred on 0
 * (never fitted around the bars, so a rebuilt chart keeps its axis; insight 169), an ink rule at 0, each bar's figure
 * printed at its end (never deferred: a deferred label waits on the morph and stays at opacity 0 under a pinned clock).
 * Beside the table at a laptop width, its plot rows line up with the table's rows (`SHIFT_ROW_PX`), and the table names
 * each row; on the phone it stands under the table and names its own rows.
 */
import type { Options, PointOptionsObject } from 'highcharts/highcharts.src'
import { chartWordsOptions, type ChartWords } from './chartA11y'
import { PATTERN_IDS, type PatternKind } from './patterns'

export interface DonutPart {
  readonly id: string
  /** The drawn share, 0 to 1 (unrounded: the angle). */
  readonly share: number
  readonly colorIndex: number
  readonly pattern: PatternKind | 'solid'
  /** The screen reader's sentence for the slice. */
  readonly point: string
}

export interface DonutInput {
  readonly parts: readonly DonutPart[]
  readonly words: ChartWords
  /** The chart's side in CSS px (the donut fills it). */
  readonly size: number
  /** The picked part's id (heavy ink edge), or null. */
  readonly picked: string | null
  /** Slices take a click (Tax Allocation). */
  readonly pickable: boolean
}

/** The hole's share of the diameter: RightCapital's thick ring. */
export const DONUT_INNER = '64%'
/** The band under the ring that holds the credit (the licence keeps it on), so its letters are never cut at the edge. */
export const DONUT_CREDIT_PX = 16

export function donutOptions(input: DonutInput, onPick?: (id: string) => void): Options {
  const { parts, words, size, picked, pickable } = input
  const spoken = chartWordsOptions(words)
  const data = parts.map(
    (p): PointOptionsObject => ({
      id: p.id,
      name: p.id,
      y: p.share,
      colorIndex: p.colorIndex,
      className: [`b9-donut-part b9-donut-part--${p.id}`, p.pattern === 'solid' ? '' : PATTERN_IDS[p.pattern], p.id === picked ? 'b9-donut-picked' : ''].filter((c) => c !== '').join(' '),
      custom: { point: p.point },
    }),
  )
  return {
    chart: { type: 'pie', height: size + DONUT_CREDIT_PX, width: size, spacing: [0, 0, 0, 0], margin: [0, 0, DONUT_CREDIT_PX, 0] },
    title: { text: undefined },
    lang: spoken.lang,
    accessibility: { ...spoken.accessibility, point: { descriptionFormatter: (p) => String((p.options.custom as { point?: string } | undefined)?.point ?? '') } },
    legend: { enabled: false },
    tooltip: { enabled: false },
    // The credit stays (the licence), small, in its own band under the ring.
    credits: { enabled: true, position: { align: 'right', verticalAlign: 'bottom', x: 0, y: -3 } },
    plotOptions: {
      pie: {
        innerSize: DONUT_INNER,
        size: '96%',
        center: ['50%', '50%'],
        startAngle: 0,
        borderRadius: 0,
        dataLabels: { enabled: false },
        allowPointSelect: false,
        cursor: pickable ? 'pointer' : undefined,
        states: { hover: { halo: null, brightness: 0 } },
        point: pickable && onPick !== undefined ? { events: { click: function () { onPick(String((this as unknown as { id: string }).id)) } } } : {},
      },
    },
    series: [{ type: 'pie', id: 'donut', name: words.title, className: 'b9-donut-series', animation: false, data }],
  }
}

// ── The diverging bars ───────────────────────────────────────────────────────────────────────────────────────────────

export interface ShiftBar {
  readonly id: string
  readonly name: string
  /** What-if less current, in whole points. */
  readonly shift: number
  /** The printed figure ("+12%", "−5%", "0%"). */
  readonly text: string
  readonly colorIndex: number
  readonly pattern: PatternKind | 'solid'
  readonly point: string
}

export interface ShiftInput {
  readonly bars: readonly ShiftBar[]
  /** The scale's half-width in points (fixed; a multiple of 10). */
  readonly axisMax: number
  readonly words: ChartWords
  /** Beside the table (its rows name the bars; the plot's rows line up with the table's) or on its own (the phone). */
  readonly besideTable: boolean
  /** The axis ticks' words, from the composer (`slots.assetShift`), keyed by tick value. */
  readonly tickText: (points: number) => string
}

/** One table row's height, and the table's header, in CSS px: the bars' plot rows line up with them beside the table. */
export const SHIFT_ROW_PX = 48
export const SHIFT_HEAD_PX = 44
/** The axis ticks' band under the plot, and the credit's band under that (its own, so it never sits on a tick's words). */
export const SHIFT_AXIS_PX = 32
export const SHIFT_CREDIT_PX = 16
/** On its own (the phone) each row is taller: the part's name prints over its bar, at the plot's left edge, so a name
 *  never meets a bar's figure (a name in a column of its own met a leftward bar's figure on a narrow plot). */
export const SHIFT_PHONE_ROW_PX = 60

export function shiftOptions(input: ShiftInput): Options {
  const { bars, axisMax, words, besideTable } = input
  const spoken = chartWordsOptions(words)
  const top = besideTable ? SHIFT_HEAD_PX : 8
  const row = besideTable ? SHIFT_ROW_PX : SHIFT_PHONE_ROW_PX
  const height = top + bars.length * row + SHIFT_AXIS_PX + SHIFT_CREDIT_PX
  const data = bars.map(
    (b): PointOptionsObject => ({
      y: b.shift,
      colorIndex: b.colorIndex,
      className: [`b9-shift-bar b9-shift-bar--${b.id}`, b.pattern === 'solid' ? '' : PATTERN_IDS[b.pattern]].filter((c) => c !== '').join(' '),
      custom: { text: b.text, point: b.point },
    }),
  )
  const half = axisMax / 2
  return {
    // The sides hold a bar's printed figure past the plot's edge and the end ticks' words (a bar can reach the scale's end).
    chart: { type: 'bar', height, marginTop: top, marginBottom: SHIFT_AXIS_PX + SHIFT_CREDIT_PX, spacingLeft: 56, spacingRight: 56 },
    title: { text: undefined },
    lang: spoken.lang,
    accessibility: { ...spoken.accessibility, point: { descriptionFormatter: (p) => String((p.options.custom as { point?: string } | undefined)?.point ?? '') } },
    legend: { enabled: false },
    tooltip: { enabled: false },
    credits: { enabled: true, position: { align: 'right', verticalAlign: 'bottom', x: -4, y: -3 } },
    xAxis: {
      categories: bars.map((b) => b.name),
      lineWidth: 0,
      tickLength: 0,
      // Beside the table the table's rows name the bars; on its own each name sits over its bar, from the plot's left edge.
      labels: besideTable
        ? { enabled: false }
        : { enabled: true, align: 'left', reserveSpace: false, x: 6, y: -20, autoRotationLimit: 0, overflow: 'allow', style: { textOverflow: 'clip', whiteSpace: 'nowrap' } as const },
    },
    yAxis: {
      type: 'linear',
      min: -axisMax,
      max: axisMax,
      startOnTick: false,
      endOnTick: false,
      // Five ticks beside the table; on a narrow plot three, so no tick's words meet another's.
      tickPositions: besideTable ? [-axisMax, -half, 0, half, axisMax] : [-axisMax, 0, axisMax],
      title: { text: undefined },
      labels: { formatter: (ctx) => input.tickText(Number(ctx.value)) },
      plotLines: [{ value: 0, width: 1, className: 'b9-shift-zero', zIndex: 3 }],
    },
    // On its own the bars stand thinner, so each name over its bar clears it.
    plotOptions: { bar: { borderRadius: 2, pointPadding: besideTable ? 0.22 : 0.28, groupPadding: 0.08, states: { hover: { brightness: 0 } } } },
    series: [
      {
        type: 'bar',
        id: 'shift',
        name: words.title,
        className: 'b9-shift-series',
        animation: false,
        data,
        dataLabels: {
          enabled: true,
          defer: false,
          crop: false,
          overflow: 'allow',
          allowOverlap: true,
          inside: false,
          useHTML: false,
          formatter: function () {
            return String((this as unknown as { point: { custom?: { text?: string } } }).point.custom?.text ?? '')
          },
        },
      },
    ],
  }
}
