/*
 * src/viz/charts/stackedAreasOptions.ts: Tax → Tax Strategies → Comparison's year-by-year charts (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC8; `rc-cashflow-tax/help-tax-tax-strategies-comparison-tab-03.png`, `-05.png`).
 * PURE: every value, the shared scale and every word arrive from the composer (`taxRunsView.ts`).
 *
 * Two kinds:
 * - `pairAreasOptions`: two overlapping areas over the years, one measure (invested assets, income tax, required
 *   withdrawals, Roth conversions). Plan 4.0's colour roles: the recommendation green, solid fill and solid line; your
 *   plan today blue, outline only with a dashed top line (`chartTheme.css`, `.b9-pair-compared`), so the two read apart
 *   with the colour removed. Each line ends in its own printed figure, to the RIGHT of its last point and centred on it,
 *   in right spacing held for the widest label, so no line runs under a label; after each draw the two labels are
 *   nudged apart only where their boxes would overlap, and a label at $0 sits above the baseline, never under the axis
 *   (RC17's review: a label left of its point sat on its own sloping line, RC8's too).
 * - `stackedAreasOptions`: one strategy's withdrawals stacked by source, taxable solid, pre-tax hatched, Roth dotted,
 *   HSA lined (each pattern in its own source's ink), the stack order listed in the legend from the bottom. The two
 *   side-by-side stacks share ONE scale (the composer's lattice): two charts that compare need one scale (RC4b).
 *
 * The y axis is linear from $0 on the composer's humane lattice, its ticks in the `mm` dialect; the x axis is the first
 * person's age, titled with whose age it is, or the calendar year, titled "Year" (the Display drawer's time axis,
 * `src/ui/displaySettings.ts`): the points stay keyed by calendar year and `axisOffset` maps them once here. The
 * tooltip and the spoken words read the axis's number.
 */
import type { Chart, Options, SeriesAreaOptions } from 'highcharts/highcharts.src'
import { buildYTicks, type DollarLattice } from '../bandData'
import { chartWordsOptions, hcPlain, type ChartWords } from './chartA11y'

export interface YearPoint {
  readonly year: number
  readonly value: number
}

interface Shared {
  readonly lattice: DollarLattice
  readonly axisDollar: (dollars: number) => string
  /** A value as the tooltip and the end labels print it (`~` included). */
  readonly figure: (dollars: number) => string
  /** A point's spoken sentence (the axis's number, the series' name, its figure), the composer's words. */
  readonly pointWords: (axisNumber: number, name: string, dollars: number) => string
  readonly words: ChartWords
  readonly height: number
  /** The x axis's title ("Alex’s age", or "Year" on the years axis). */
  readonly axisTitle: string
  /** What to add to a point's calendar year to put it on the axis: 0 on the years axis, the age less the year on the ages
   *  axis (`offsetFromYear`). */
  readonly axisOffset: number
}

export interface PairSeries {
  readonly id: string
  readonly name: string
  readonly role: 'alternative' | 'compared'
  readonly points: readonly YearPoint[]
  /** Printed at the line's end in place of its figure, one entry per line (RC17: a run whose money ran out ends at a zero
   *  close that is no balance, so its end says so, never "~$0"). */
  readonly endWord?: readonly string[]
}

export interface PairAreasInput extends Shared {
  /** Two sides, or one (RC17's Comparisons with no what-if open: your plan alone, never a copied second line). */
  readonly series: readonly [PairSeries, PairSeries] | readonly [PairSeries]
}

export type StackSource = 'taxable' | 'pretax' | 'roth' | 'hsa'

/** Each source's colour slot and pattern (RC_PAIRS rows: blue/orange, orange/green, blue/sky, sky/green). */
export const STACK_SOURCES: Readonly<Record<StackSource, { readonly colorIndex: number; readonly className: string }>> = {
  taxable: { colorIndex: 0, className: 'b9-stack-taxable' },
  pretax: { colorIndex: 2, className: 'b9-stack-pretax b9-hatch' },
  roth: { colorIndex: 1, className: 'b9-stack-roth b9-dots' },
  hsa: { colorIndex: 4, className: 'b9-stack-hsa b9-lines' },
}

/** The stack from the bottom up. */
export const STACK_ORDER: readonly StackSource[] = ['taxable', 'pretax', 'roth', 'hsa']

export interface StackedAreasInput extends Shared {
  readonly sources: Readonly<Record<StackSource, { readonly name: string; readonly points: readonly YearPoint[] }>>
}

function axes(shared: Shared): Pick<Options, 'xAxis' | 'yAxis'> {
  const ticks = buildYTicks(shared.lattice, shared.axisDollar)
  const tickLabel = new Map(ticks.map((t) => [t.dollars, t.label]))
  return {
    // The axis title carries the first person's typed name: escaped wherever it is drawn (`hcPlain`).
    // Its points are keyed by calendar year, so a zero offset is the years axis (`timeTickStep`'s 10; ages tick every 5).
    xAxis: { type: 'linear', allowDecimals: false, tickInterval: shared.axisOffset === 0 ? 10 : 5, lineWidth: 1, title: { text: hcPlain(shared.axisTitle) } },
    yAxis: {
      type: 'linear',
      min: 0,
      max: shared.lattice.ceiling,
      startOnTick: false,
      endOnTick: false,
      tickPositions: ticks.map((t) => t.dollars),
      title: { text: undefined },
      labels: { formatter: (ctx) => tickLabel.get(Number(ctx.value)) ?? '' },
    },
  }
}

function frame(shared: Shared): Options {
  const spoken = chartWordsOptions(shared.words)
  return {
    chart: { type: 'area', height: shared.height, spacingTop: 20, spacingRight: 16 },
    title: { text: undefined },
    lang: spoken.lang,
    // Each point's spoken sentence is the composer's (Highcharts' own reads the raw float).
    accessibility: { ...spoken.accessibility, point: { descriptionFormatter: (p) => shared.pointWords(Number(p.x), p.series.name, Number(p.y ?? 0)) } },
    legend: { enabled: true, align: 'center', verticalAlign: 'bottom' },
    credits: { enabled: true, position: { align: 'right', verticalAlign: 'bottom', x: -4, y: -2 } },
    ...axes(shared),
  }
}

/** An end label's lines: the run's own words where its money ran out, else its last figure. */
const endLines = (s: PairSeries, figure: (dollars: number) => string): readonly string[] => s.endWord ?? [figure(s.points.at(-1)?.value ?? 0)]

/** The gap between an end point and its label, and between two labels nudged apart, in CSS px. */
const END_GAP = 8
/** A label line's advance per character at the label size (14 px semibold, tabular figures), over-reckoned so the
 *  reserved spacing always holds the widest label (a too-wide reserve costs plot width, never a clipped figure). */
const END_CHAR_PX = 8.6

/** The right spacing the end labels need: the widest line of each label that sits at the plot's last year. */
export function endLabelReserve(series: readonly PairSeries[], figure: (dollars: number) => string): number {
  const lastYear = Math.max(...series.map((s) => s.points.at(-1)?.year ?? -Infinity))
  const chars = Math.max(0, ...series.filter((s) => s.points.at(-1)?.year === lastYear).flatMap((s) => endLines(s, figure).map((l) => l.length)))
  return Math.max(16, Math.ceil(chars * END_CHAR_PX) + END_GAP + 6)
}

/** After every draw: each end label clear of the plot's floor (a $0 end word sits above the baseline, never under the
 *  axis among the ticks), inside the chart's right edge, and the two labels apart where their boxes would overlap
 *  (each moved half the overlap, away from the other). Highcharts re-seats the labels on each redraw, so this runs on
 *  each render. */
export function seatEndLabels(chart: Chart): void {
  type Label = { translateX?: number; translateY?: number; width?: number; height?: number; attr(a: { x?: number; y?: number }): unknown }
  const labels = chart.series
    .map((s) => (s.points.at(-1) as unknown as { dataLabel?: Label } | undefined)?.dataLabel)
    .filter((l): l is Label => l !== undefined && l.height !== undefined)
  const floor = chart.plotHeight - 2
  const boxes = labels.map((l) => ({ l, y: l.translateY ?? 0, h: l.height ?? 0 }))
  for (const b of boxes) {
    if (b.y + b.h > floor) b.y = floor - b.h
    const right = chart.plotLeft + (b.l.translateX ?? 0) + (b.l.width ?? 0)
    if (right > chart.chartWidth - 2) b.l.attr({ x: (b.l.translateX ?? 0) - (right - chart.chartWidth + 2) })
  }
  if (boxes.length === 2) {
    const [a, b] = [...boxes].sort((p, q) => p.y - q.y) as [(typeof boxes)[number], (typeof boxes)[number]]
    const overlap = a.y + a.h + 2 - b.y
    if (overlap > 0) {
      a.y -= overlap / 2
      b.y += overlap / 2
      // Pushed through the floor: the lower one sits on it and the upper one above it.
      if (b.y + b.h > floor) {
        b.y = floor - b.h
        a.y = b.y - a.h - 2
      }
    }
  }
  for (const b of boxes) if (b.y !== (b.l.translateY ?? 0)) b.l.attr({ y: b.y })
}

export function pairAreasOptions(input: PairAreasInput): Options {
  const { series, figure } = input
  const base = frame(input)
  return {
    ...base,
    // The end labels sit to the RIGHT of each line's last point, in spacing held for them, so no line ever runs under a
    // label (a label left of its point sat on its own sloping line: RC17's review).
    chart: {
      ...base.chart,
      spacingRight: endLabelReserve(series, figure),
      events: {
        render: function (this: Chart) {
          seatEndLabels(this)
        },
      },
    },
    tooltip: {
      shared: true,
      formatter: function () {
        const ctx = this as unknown as { x: number; points?: { series: { name: string }; y: number }[] }
        return [`${hcPlain(input.axisTitle)} ${ctx.x}`, ...(ctx.points ?? []).map((p) => `${p.series.name}: ${figure(p.y)}`)].join('<br/>')
      },
    },
    // The end figures are never deferred: a deferred label waits on the morph and stays at opacity 0 under the harnesses'
    // pinned clock (insight 169), and a series-level `defer` is the one Highcharts reads.
    plotOptions: { area: { marker: { enabled: false }, fillOpacity: 1, dataLabels: { defer: false } } },
    series: series.map((s): SeriesAreaOptions => {
      const last = s.points.length - 1
      return {
        type: 'area',
        id: s.id,
        name: s.name,
        colorIndex: s.role === 'alternative' ? 1 : 0,
        className: s.role === 'alternative' ? 'b9-pair-alternative' : 'b9-pair-compared',
        data: s.points.map((p, i) => ({
          x: p.year + input.axisOffset,
          y: p.value,
          ...(i === last
            ? {
                dataLabels: {
                  enabled: true,
                  crop: false,
                  overflow: 'allow' as const,
                  // Left edge just right of the point, centred on it (`seatEndLabels` keeps it off the floor and apart).
                  align: 'left' as const,
                  verticalAlign: 'middle' as const,
                  x: END_GAP,
                  y: 0,
                  formatter: () => endLines(s, figure).map(hcPlain).join('<br>'),
                },
              }
            : {}),
        })),
      }
    }),
  }
}

export function stackedAreasOptions(input: StackedAreasInput): Options {
  const { sources, figure } = input
  // Highcharts stacks the FIRST series on top, so the series run top-down and the legend runs reversed (bottom-up).
  const topDown = [...STACK_ORDER].reverse()
  return {
    ...frame(input),
    legend: { enabled: true, align: 'center', verticalAlign: 'bottom', reversed: true },
    tooltip: {
      shared: true,
      formatter: function () {
        const ctx = this as unknown as { x: number; points?: { series: { name: string }; y: number }[] }
        return [`${hcPlain(input.axisTitle)} ${ctx.x}`, ...[...(ctx.points ?? [])].reverse().map((p) => `${p.series.name}: ${figure(p.y)}`)].join('<br/>')
      },
    },
    plotOptions: { area: { stacking: 'normal', marker: { enabled: false }, fillOpacity: 1, lineWidth: 1 } },
    series: topDown.map(
      (src): SeriesAreaOptions => ({
        type: 'area',
        id: `stack-${src}`,
        name: sources[src].name,
        colorIndex: STACK_SOURCES[src].colorIndex,
        className: STACK_SOURCES[src].className,
        data: sources[src].points.map((p) => ({ x: p.year + input.axisOffset, y: p.value })),
      }),
    ),
  }
}
