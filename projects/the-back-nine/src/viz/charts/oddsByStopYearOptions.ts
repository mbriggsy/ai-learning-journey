/*
 * src/viz/charts/oddsByStopYearOptions.ts: the "Odds by stop year" chart as Highcharts options (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC4, critique 3; the old odds ladder's honesty rules, carried to a bar chart).
 * PURE: the bars and every word arrive from the screen's composer (`probabilityView.ts`, through `copy.ts`, decision
 * 11); nothing here maps a reading to a count or a word.
 *
 * THE LAYOUT: years down the side, bars across, every bar's count printed in ONE COLUMN to the right of the plot. Each
 * bar has a row of its own, so no label can run over a neighbouring bar, the on-track line or another label, at any
 * width; standing columns could not do that (at his 1440 px window a year's slot is about 100 px for two columns of
 * about 45 px each, and "doesn't hold" alone is about 78 px). The labels' column is anchored by an invisible spacer
 * stacked on each bar out to the plot's end, so it lines up with its bar's row whatever the grouping does. On a
 * narrow chart (`narrow`, under `ODDS_NARROW_REM` wide, measured by the component) the labels stack onto lines and the
 * rows grow to hold the tallest stack; on a wide one they print on one line. Every size is in root-font units
 * (`remPx`), so a reader who raises their browser font gets taller rows and a wider label column, never clipped words.
 *
 * THE FOUR HONESTY RULES (each an acceptance check in the e2e arms):
 * - the on-track line is drawn at `barRung` (the curve's own `BAR_RUNG`, 8.5, the true midpoint between the highest
 *   failing count 8 and the lowest clearing count 9), so clearing reads by POSITION, never by hue;
 * - a dipped year (`isDip`) wears its worded mark in its printed label and a quieter, outlined bar;
 * - a year at the ceiling prints the composer's ceiling words ("better than 9 in 10"), never "10 of 10";
 * - the crown's word sits on the crowned durable year (`isCrown`), never on the longest bar, and its bar carries a
 *   heavy outline as the second cue.
 * The count axis runs linear from 0 with ticks below the ceiling only (no "10 of 10" tick: the headroom past 10 is the
 * "never certain" signal, as on the old ladder). Colour is never the only signal: the essentials track is hatched and
 * named in the legend, every bar's count is printed, the crown is worded.
 */
import type { Options, PointOptionsObject, SeriesColumnOptions } from 'highcharts/highcharts.src'
import { chartWordsOptions, type ChartWords } from './chartA11y'

/** One evaluated stop year, as the composer built it. */
export interface OddsColumn {
  /** The calendar year you would stop (the row and its tick). */
  readonly year: number
  /** The published X-of-10 count (`round(quantizedLowerBound·10)`), plotted as the bar's length. */
  readonly rung: number
  /** The bar's printed words on a narrow chart, one line each, top to bottom (the crown's word, the count, the dip's
   *  word, or the ceiling's words broken before the count), already worded. */
  readonly lines: readonly string[]
  /** The same words on one line, for a wide chart. */
  readonly inline: string
  /** The bar's one sentence: its screen-reader description and its tooltip. */
  readonly describe: string
  readonly isCrown: boolean
  readonly isDip: boolean
  readonly clears: boolean
}

export interface OddsSeries {
  readonly id: 'hero' | 'floor'
  readonly name: string
  /** The essentials track: hatched, so it reads apart from the full-spending track without its colour. */
  readonly hatched: boolean
  readonly columns: readonly OddsColumn[]
}

export interface OddsLabels {
  /** The on-track line's word. */
  readonly barLabel: string
  readonly xAxisTitle: string
  /** A count tick's words (the X-of-10 slots). */
  readonly yTick: (rung: number) => string
  readonly xTick: (year: number) => string
  readonly description: string
  readonly words: Omit<ChartWords, 'description'>
}

export interface OddsChartInput {
  readonly series: readonly OddsSeries[]
  /** Where the on-track line is drawn (the curve's `BAR_RUNG`). */
  readonly barRung: number
  readonly labels: OddsLabels
  /** The root font size in px (the reader's browser default), every size here is a multiple of it. */
  readonly remPx: number
  /** The chart is narrower than `ODDS_NARROW_REM` (the component measures its own width). */
  readonly narrow: boolean
}

/** The class names the chart CSS paints (`chartTheme.css`). */
export const ODDS_CLASSES = {
  bar: 'b9-odds-bar',
  crown: 'b9-odds-crown',
  dip: 'b9-odds-dip',
  below: 'b9-odds-below',
  clears: 'b9-odds-clears',
  hatch: 'b9-hatch',
  spacer: 'b9-odds-spacer',
} as const

/** The count ticks: below the ceiling only, so no tick can read as certainty. A narrow chart's plot holds two (four
 *  tilted their words to fit). */
export const ODDS_Y_TICKS = [0, 3, 5, 7] as const
export const ODDS_Y_TICKS_NARROW = [0, 5] as const
/** The plot's end on the count axis: a little past the ceiling (10), the "never certain" headroom. */
export const ODDS_AXIS_END = 10.5
/** Below this chart width (in rem) the labels stack onto lines. */
export const ODDS_NARROW_REM = 40

// Sizes, in rem. A label line is the label face (`--text-label`, 0.875rem) at Highcharts' 1.2 line height; each bar's
// slot holds its label's lines plus a gap, so two labels in one year, and the last of one year and the first of the
// next, never touch. The label column holds the widest label ("9 of 10 · doesn't hold" wide, "doesn't hold" narrow).
const LABEL_LINE_REM = 0.875 * 1.2
// The gap between two stacks: measured on the phone, 0.4rem left a two-line stack's last line touching the next
// stack's first; one-line labels on a wide chart need less.
const LABEL_GAP_REM = { wide: 0.6, narrow: 1 } as const
const GUTTER_WIDE_REM = 13
const GUTTER_NARROW_REM = 7.5
const CHROME_WIDE_REM = 7
const CHROME_NARROW_REM = 9.5
const GROUP_PADDING = { wide: 0.14, narrow: 0.08 } as const
const POINT_PADDING = 0.06

/** A bar's state class: crown, then dip, then clears or below (the old ladder's emphasis order). */
export function columnClass(c: Pick<OddsColumn, 'isCrown' | 'isDip' | 'clears'>): string {
  return c.isCrown ? ODDS_CLASSES.crown : c.isDip ? ODDS_CLASSES.dip : c.clears ? ODDS_CLASSES.clears : ODDS_CLASSES.below
}

interface SpacerCustom {
  readonly lines: readonly string[]
  readonly inline: string
}

/** One year's row, in rem: room for each track's bar slot to hold its tallest label stack plus a gap. */
export function oddsRowRem(series: readonly OddsSeries[], narrow: boolean): number {
  const lines = narrow ? Math.max(1, ...series.flatMap((s) => s.columns.map((c) => c.lines.length))) : 1
  const share = 1 - 2 * (narrow ? GROUP_PADDING.narrow : GROUP_PADDING.wide)
  return (Math.max(1, series.length) * (lines * LABEL_LINE_REM + (narrow ? LABEL_GAP_REM.narrow : LABEL_GAP_REM.wide))) / share
}

/** The chart's height: every year's row, plus the axes, the line's word and the legend. */
export function oddsChartHeight(series: readonly OddsSeries[], years: number, remPx: number, narrow: boolean): number {
  return Math.round(remPx * (years * oddsRowRem(series, narrow) + (narrow ? CHROME_NARROW_REM : CHROME_WIDE_REM)))
}

export function oddsByStopYearOptions({ series, barRung, labels, remPx, narrow }: OddsChartInput): Options {
  const years = [...new Set(series.flatMap((s) => s.columns.map((c) => c.year)))].sort((a, b) => a - b)
  const spoken = chartWordsOptions({ ...labels.words, description: labels.description })
  const describeOf = (point: { options?: { custom?: unknown } }): string => {
    const custom = point.options?.custom as { describe?: string } | undefined
    return custom?.describe ?? ''
  }
  const bars = series.map(
    (s, i): SeriesColumnOptions => ({
      type: 'column',
      id: `odds-${s.id}`,
      name: s.name,
      stack: s.id,
      colorIndex: 0,
      className: s.hatched ? ODDS_CLASSES.hatch : undefined,
      // No entrance growth (`balanceBarOptions.ts` has the measured reason: a re-render mid-growth left bars flat).
      animation: false,
      index: i,
      legendIndex: i,
      dataLabels: { enabled: false },
      data: s.columns.map(
        (c): PointOptionsObject => ({ x: c.year, y: c.rung, className: columnClass(c), custom: { describe: c.describe } }),
      ),
    }),
  )
  // Each bar's spacer: invisible, out to the plot's end, carrying its bar's words at its end (the labels' column).
  const spacers = series.map(
    (s, i): SeriesColumnOptions => ({
      type: 'column',
      id: `odds-${s.id}-words`,
      name: s.name,
      stack: s.id,
      className: ODDS_CLASSES.spacer,
      animation: false,
      index: series.length + i,
      showInLegend: false,
      enableMouseTracking: false,
      accessibility: { enabled: false },
      dataLabels: {
        enabled: true,
        inside: false,
        align: 'left',
        verticalAlign: 'middle',
        x: Math.round(remPx * 0.5),
        crop: false,
        overflow: 'allow',
        formatter: function () {
          const ctx = this as unknown as { readonly point: { readonly options: { readonly custom?: unknown } } }
          const custom = ctx.point.options.custom as SpacerCustom | undefined
          if (custom === undefined) return null
          return narrow ? custom.lines.join('<br>') : custom.inline
        },
      },
      data: s.columns.map(
        (c): PointOptionsObject => ({ x: c.year, y: ODDS_AXIS_END - c.rung, custom: { lines: c.lines, inline: c.inline } satisfies SpacerCustom }),
      ),
    }),
  )
  return {
    chart: {
      type: 'column',
      inverted: true,
      height: oddsChartHeight(series, years.length, remPx, narrow),
      marginRight: Math.round(remPx * (narrow ? GUTTER_NARROW_REM : GUTTER_WIDE_REM)),
      // Room above the plot for the on-track line's word.
      spacingTop: Math.round(remPx * 2),
    },
    title: { text: undefined },
    lang: spoken.lang,
    accessibility: {
      ...spoken.accessibility,
      point: { descriptionFormatter: (point) => describeOf(point) },
    },
    legend: { enabled: series.length > 1, align: 'center', verticalAlign: 'bottom' },
    tooltip: {
      formatter: function () {
        const ctx = this as unknown as { readonly point?: { readonly options?: { readonly custom?: unknown } } }
        const d = ctx.point === undefined ? '' : describeOf(ctx.point)
        return d === '' ? false : d
      },
    },
    xAxis: {
      type: 'linear',
      min: years.length > 0 ? years[0]! - 0.5 : undefined,
      max: years.length > 0 ? years[years.length - 1]! + 0.5 : undefined,
      tickPositions: years,
      title: { text: labels.xAxisTitle },
      labels: { formatter: (ctx) => labels.xTick(Number(ctx.value)) },
    },
    yAxis: {
      type: 'linear',
      min: 0,
      max: ODDS_AXIS_END,
      startOnTick: false,
      endOnTick: false,
      reversedStacks: false,
      tickPositions: [...(narrow ? ODDS_Y_TICKS_NARROW : ODDS_Y_TICKS)],
      title: { text: undefined },
      labels: { formatter: (ctx) => labels.yTick(Number(ctx.value)) },
      plotLines: [
        {
          value: barRung,
          className: ODDS_CLASSES.bar,
          zIndex: 4,
          // The line's word above the plot, centred on the line.
          label: { text: labels.barLabel, rotation: 0, align: 'center', textAlign: 'center', verticalAlign: 'top', x: 0, y: -Math.round(remPx * 0.6), useHTML: false },
        },
      ],
    },
    plotOptions: {
      column: {
        stacking: 'normal',
        grouping: true,
        pointPadding: POINT_PADDING,
        groupPadding: narrow ? GROUP_PADDING.narrow : GROUP_PADDING.wide,
        borderRadius: 4,
      },
    },
    series: [...bars, ...spacers],
  }
}
