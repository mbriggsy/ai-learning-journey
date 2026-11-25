/*
 * src/viz/charts/claimOptions.ts: Retirement → Social Security's three charts (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC9; ref 2.14; `rc-analysis/FRAME_social-security-cumulative-break-even.png`,
 * `comparison-tab-social-security-module__…png`, `summary-tab-social-security-module__…png`). PURE: every figure, the
 * shared scale and every word arrive from the composer (`socialSecurityView.ts`).
 *
 * Plan 4.0's colour roles throughout: the strategy looked at green and solid, the one it is compared against blue with
 * the second cue (hatched bars, a dashed line), so the two read apart with the colour removed; the legend carries each
 * cue to its swatch.
 * - `claimAnnualOptions`: paired bars per year, one pair per age, on ONE scale for both strategies (insight 169).
 * - `claimCumulativeOptions`: two lines of the running totals, each ending in its printed figure (the higher line's above
 *   its last point, the lower's below), and the crossing marked with a ring and its age (RightCapital leaves it unmarked).
 * - `claimSummaryOptions`: one bar per strategy, its lifetime figure printed above it in dark text, the bar's name and
 *   your plan's odds with those ages under it (the category label's two lines; on the phone the figure joins them there). Your plan's own ages are the compared
 *   side: blue and hatched, the others green and solid (two series, ungrouped, so each bar sits centred on its name).
 *
 * The y axis is linear from $0 on the composer's humane lattice, its ticks in the `mm` dialect; the comparison charts'
 * x axis is the first person's age, titled with whose age it is.
 */
import type { Options, PointOptionsObject, SeriesColumnOptions, SeriesLineOptions, SeriesScatterOptions } from 'highcharts/highcharts.src'
import { buildYTicks, type DollarLattice } from '../bandData'
import { chartWordsOptions, type ChartWords } from './chartA11y'
import { GROUPED_BAR_CLASSES } from './groupedBarsOptions'

export interface ClaimChartPoint {
  readonly age: number
  readonly value: number
}

export interface ClaimChartSeries {
  readonly id: string
  readonly name: string
  readonly role: 'alternative' | 'compared'
  readonly points: readonly ClaimChartPoint[]
}

interface Shared {
  readonly lattice: DollarLattice
  readonly axisDollar: (dollars: number) => string
  readonly words: ChartWords
  readonly height: number
}

export interface ClaimPairInput extends Shared {
  readonly series: readonly [ClaimChartSeries, ClaimChartSeries]
  /** The x axis's title ("Alex’s age"). */
  readonly axisTitle: string
  /** A value as the tooltip and the end labels print it (`~` included). */
  readonly figure: (dollars: number) => string
  /** A point's spoken sentence (the age, the series' name, its figure), the composer's words. */
  readonly pointWords: (age: number, name: string, dollars: number) => string
  /** The cumulative chart's crossing: a ring at the point and its label above it. */
  readonly crossing?: { readonly age: number; readonly value: number; readonly label: string }
}

/** The classes each line carries (`chartTheme.css`): solid green, dashed blue, and the crossing's ring. */
export const CLAIM_LINE_CLASSES = { alternative: 'b9-claims-line-a', compared: 'b9-claims-line-b', crossing: 'b9-claims-cross' } as const

/** `sparse`: words on every other gridline only, from $0 (the running totals' short plot at his window set five dollar
 *  ticks about 14 px apart; every gridline stays). */
function yAxis(shared: Shared, sparse = false): Options['yAxis'] {
  const ticks = buildYTicks(shared.lattice, shared.axisDollar)
  const tickLabel = new Map(ticks.filter((_, i) => !sparse || ticks.length <= 4 || i % 2 === 0).map((t) => [t.dollars, t.label]))
  return {
    type: 'linear',
    min: 0,
    max: shared.lattice.ceiling,
    startOnTick: false,
    endOnTick: false,
    tickPositions: ticks.map((t) => t.dollars),
    title: { text: undefined },
    labels: { formatter: (ctx) => tickLabel.get(Number(ctx.value)) ?? '' },
  }
}

function pairFrame(input: ClaimPairInput, type: 'column' | 'line'): Options {
  const spoken = chartWordsOptions(input.words)
  const first = input.series[0].points[0]?.age ?? 0
  const last = input.series[0].points.at(-1)?.age ?? first
  return {
    // The running totals print the higher line's figure above its last point: room for it above the plot.
    chart: { type, height: input.height, spacingTop: type === 'line' ? 34 : 20, spacingRight: 16 },
    title: { text: undefined },
    lang: spoken.lang,
    accessibility: { ...spoken.accessibility, point: { descriptionFormatter: (p) => input.pointWords(Number(p.x), p.series.name, Number(p.y ?? 0)) } },
    legend: { enabled: true, align: 'center', verticalAlign: 'bottom' },
    credits: { enabled: true, position: { align: 'right', verticalAlign: 'bottom', x: -4, y: -2 } },
    tooltip: {
      shared: true,
      formatter: function () {
        const ctx = this as unknown as { x: number; points?: { series: { name: string; options: { id?: string } }; y: number }[] }
        const pts = (ctx.points ?? []).filter((p) => p.series.options.id !== CLAIM_LINE_CLASSES.crossing)
        return [`${input.axisTitle} ${ctx.x}`, ...pts.map((p) => `${p.series.name}: ${input.figure(p.y)}`)].join('<br/>')
      },
    },
    xAxis: { type: 'linear', min: first - 0.5, max: last + 0.5, allowDecimals: false, tickInterval: 5, lineWidth: 1, title: { text: input.axisTitle } },
    yAxis: yAxis(input, type === 'line'),
  }
}

export function claimAnnualOptions(input: ClaimPairInput): Options {
  return {
    ...pairFrame(input, 'column'),
    plotOptions: {
      column: {
        borderRadius: 2,
        pointPadding: 0.06,
        groupPadding: 0.12,
        // No entrance growth: a column grows by scaling its group, and a re-render mid-growth stopped it flat (RC4).
        animation: false,
      },
    },
    series: input.series.map(
      (s): SeriesColumnOptions => ({
        type: 'column',
        id: s.id,
        name: s.name,
        colorIndex: s.role === 'alternative' ? 1 : 0,
        className: GROUPED_BAR_CLASSES[s.role],
        data: s.points.map((p) => ({ x: p.age, y: p.value })),
      }),
    ),
  }
}

export function claimCumulativeOptions(input: ClaimPairInput): Options {
  const { series, figure, crossing } = input
  const lastOf = (s: ClaimChartSeries) => s.points.at(-1)?.value ?? 0
  const higher = lastOf(series[0]) >= lastOf(series[1]) ? series[0].id : series[1].id
  const lines = series.map((s): SeriesLineOptions => {
    const last = s.points.length - 1
    const above = s.id === higher
    return {
      type: 'line',
      id: s.id,
      name: s.name,
      colorIndex: s.role === 'alternative' ? 1 : 0,
      className: CLAIM_LINE_CLASSES[s.role],
      marker: { enabled: false },
      data: s.points.map(
        (p, i): PointOptionsObject => ({
          x: p.age,
          y: p.value,
          ...(i === last
            ? {
                dataLabels: {
                  enabled: true,
                  crop: false,
                  overflow: 'allow' as const,
                  // In the gutter right of the plot, where both lines have ended, so no line runs through a figure
                  // (RC9's phone look: a figure printed inside the plot sat on the other line).
                  align: 'left' as const,
                  x: 6,
                  verticalAlign: above ? ('bottom' as const) : ('top' as const),
                  y: above ? 2 : -2,
                  formatter: () => figure(p.value),
                },
              }
            : {}),
        }),
      ),
    }
  })
  const ring: SeriesScatterOptions[] =
    crossing === undefined
      ? []
      : [
          {
            type: 'scatter',
            id: CLAIM_LINE_CLASSES.crossing,
            name: crossing.label,
            className: CLAIM_LINE_CLASSES.crossing,
            showInLegend: false,
            enableMouseTracking: false,
            marker: { enabled: true, symbol: 'circle', radius: 7 },
            data: [
              {
                x: crossing.age,
                y: crossing.value,
                dataLabels: {
                  enabled: true,
                  crop: false,
                  overflow: 'allow' as const,
                  // Below and right of the ring, clear of it: running totals never fall, so both lines leave the crossing
                  // upward to the right and that corner is open (centred under the ring, a steep line ran through it).
                  align: 'left' as const,
                  x: 8,
                  verticalAlign: 'top' as const,
                  y: 6,
                  formatter: () => crossing.label,
                },
              },
            ],
          },
        ]
  // The gutter the end figures print in: the longer figure's width at the label size (about 0.6 em a character, 14 px),
  // and a step to spare. The text audit fails a figure that leaves the chart, so a gutter too narrow cannot pass silently.
  const gutter = Math.ceil(Math.max(...series.map((s) => figure(lastOf(s)).length)) * 8.6) + 14
  const frame = pairFrame(input, 'line')
  return {
    ...frame,
    chart: { ...frame.chart, marginRight: gutter },
    plotOptions: { line: { lineWidth: 2 } },
    series: [...lines, ...ring],
  }
}

export interface ClaimSummaryBar {
  readonly id: string
  readonly name: string
  /** The lifetime total, or null for a strategy whose total can't be read (no bar; its name and odds still print). */
  readonly total: number | null
  readonly figure: string
  readonly odds: string
  readonly role: 'alternative' | 'compared'
  readonly point: string
}

export interface ClaimSummaryInput extends Shared {
  readonly bars: readonly ClaimSummaryBar[]
  /** The two series' spoken names (no legend: each bar's name prints under it). */
  readonly names: { readonly alternative: string; readonly compared: string }
  /** A narrow chart (the phone): each figure prints under its bar with the name and the odds, where it wraps inside the
   *  bar's own slot, never above it, where neighbouring figures ran into each other (RC9's phone audit). */
  readonly narrow: boolean
}

export function claimSummaryOptions(input: ClaimSummaryInput): Options {
  const { bars } = input
  const spoken = chartWordsOptions(input.words)
  const labelOf = new Map(bars.map((b, i) => [i, input.narrow ? `${b.name}<br>${b.figure}<br>${b.odds}` : `${b.name}<br>${b.odds}`]))
  const sideSeries = (role: 'alternative' | 'compared', id: string): SeriesColumnOptions => ({
    type: 'column',
    id,
    name: input.names[role],
    colorIndex: role === 'alternative' ? 1 : 0,
    className: GROUPED_BAR_CLASSES[role],
    animation: false,
    showInLegend: false,
    data: bars.map(
      (b, i): PointOptionsObject => (b.role === role && b.total !== null ? { x: i, y: b.total, custom: { figure: b.figure, point: b.point } } : { x: i, y: null }),
    ),
    dataLabels: {
      enabled: !input.narrow,
      crop: false,
      overflow: 'allow',
      allowOverlap: true,
      formatter: function () {
        return String((this as unknown as { point: { custom?: { figure?: string } } }).point.custom?.figure ?? '')
      },
    },
  })
  return {
    chart: { type: 'column', height: input.height, spacingTop: 28, spacingBottom: 12 },
    title: { text: undefined },
    lang: spoken.lang,
    accessibility: { ...spoken.accessibility, point: { descriptionFormatter: (p) => String((p.options.custom as { point?: string } | undefined)?.point ?? '') } },
    legend: { enabled: false },
    tooltip: { enabled: false },
    credits: { enabled: true, position: { align: 'right', verticalAlign: 'bottom', x: -4, y: -2 } },
    xAxis: {
      // A category axis: each bar gets an equal slot, and its words wrap inside that slot's width (a linear axis gave
      // the words no width to wrap to, and on the phone they ran into each other).
      categories: bars.map((b) => b.name),
      lineWidth: 1,
      // Each bar's name and its odds, under it; never rotated or cut (a cut label hides content).
      labels: { autoRotationLimit: 0, style: { textOverflow: 'clip', whiteSpace: 'normal' } as const, formatter: (ctx) => labelOf.get(Number(ctx.pos)) ?? '' },
    },
    yAxis: yAxis(input),
    plotOptions: { column: { grouping: false, borderRadius: 4, pointPadding: 0.12, groupPadding: 0.2, maxPointWidth: 96 } },
    series: [sideSeries('alternative', 'claims-bars-other'), sideSeries('compared', 'claims-bars-plan')],
  }
}
