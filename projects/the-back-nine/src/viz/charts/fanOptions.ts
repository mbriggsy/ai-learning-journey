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
 * - the x axis ticks every 5 years of its number (the first person's age, or the calendar year: the Display drawer's
 *   time axis, `src/ui/displaySettings.ts`; the composer's `tickAt`), and the tooltip names both ages;
 * - the named moments (today, work stops, the plan's end) are labelled plot lines, their labels staggered over two rows
 *   so neighbours never print over each other;
 * - the fan the caller passes is already cut where the cohort thins (`truncateFanAtThinCohort`); nothing here adds a
 *   point past it;
 * - the legend toggles each tier (ref 2.9, `FRAME_confidence-legend-toggled-median-only.png`), and the y axis then fits
 *   what is still drawn (`fanLatticeFor`): with both ranges hidden it zooms to the median, still linear from $0 and still
 *   on the humane lattice (RightCapital's zoomed axis starts above $0; B9's never does). A range's printed words ride
 *   with it (`linkedTo`), so no word ever names a range that is not drawn. A hidden legend item is struck through by
 *   Highcharts' own sheet, so the hidden state is never colour alone.
 */
import type { Chart, Options, Series, SeriesOptionsType, XAxisPlotLinesOptions } from 'highcharts/highcharts.src'
import type { BandFan, BandFanYear } from '@shared/model'
import { buildYTicks, niceLattice, type DollarLattice, type XAnnotation } from '../bandData'
import { BAND_FILL_INNER_P, BAND_FILL_OUTER_P } from '../palette'
import { rcBandStopCss } from '../scale'
import { chartWordsOptions, hcPlain, type ChartWords } from './chartA11y'

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
  /** Highcharts' own spoken words (the chart's name, the credit, the legend's), so none of its built-in English
   *  sentences reach a screen reader (`chartA11y.ts`; the description above rides in as `words.description`). */
  readonly words: Omit<ChartWords, 'description'>
  /** The y axis's tick labels for a lattice ceiling (one unit per lattice). */
  readonly axisDollar: (ceiling: number) => (dollars: number) => string
  /** One projected figure, unhedged (the slots add the `~`). */
  readonly figure: (dollars: number) => string
  /** The axis's number at a year from now: the first person's age, or the calendar year (the Display drawer's time
   *  axis, `src/ui/displaySettings.ts`). The x axis's tick words, and where its ticks fall. */
  readonly tickAt: (yearsFromNow: number) => number
  /** Both ages at a year from now, as the tooltip and the screen reader say them. */
  readonly agesAt: (yearsFromNow: number) => string
  readonly tipRange: (low: string, high: string) => string
  /** The tooltip's line for the middle half (ref 2.9's tooltip names each range's low and high, then the median). */
  readonly tipInner: (low: string, high: string) => string
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
  /** Told the plot's left and right margins after every draw, so a chart drawn under the fan on the same age axis
   *  (Confidence's run-out chart, `runOutOptions.ts`) lines its years up with the fan's, measured, never guessed. */
  readonly onPlotBox?: (box: PlotBox) => void
}

/** A chart's plot area as margins from its container's edges, in CSS px. */
export interface PlotBox {
  readonly left: number
  readonly right: number
}

/** Which of the fan's three tiers the legend has left drawn. */
export interface FanShown {
  readonly outer: boolean
  readonly inner: boolean
  readonly median: boolean
}

/** The series ids the legend toggles. */
export const FAN_SERIES = { outer: 'fan-outer', inner: 'fan-inner', median: 'fan-median' } as const

/**
 * The y axis's lattice for what is still drawn: the outer range's top while it shows, else the middle half's, else the
 * median's (ref 2.9: "with the bands hidden the axis zooms to the median"). Always from $0 on the humane lattice. With
 * nothing drawn, or a shown tier that never leaves $0 (a ruined median), the full lattice stands: a $0-only scale has no
 * honest gridlines, and an axis that jumped to one would read as a picture of nothing.
 */
export function fanLatticeFor(years: readonly BandFanYear[], shown: FanShown): DollarLattice {
  const top = (pick: (y: BandFanYear) => number) => Math.max(0, ...years.map(pick))
  return fanLatticeAt(years, shown.outer ? top((y) => y.p90) : shown.inner ? top((y) => y.p75) : shown.median ? top((y) => y.p50) : undefined)
}

/** The lattice over a drawn top (the axis's `dataMax`): the full fan's when nothing positive is drawn. */
export function fanLatticeAt(years: readonly BandFanYear[], drawnTop: number | undefined): DollarLattice {
  return drawnTop !== undefined && drawnTop > 0 ? niceLattice(drawnTop) : niceLattice(Math.max(0, ...years.map((y) => y.p90)))
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

/** A time axis's tick step: ages every 5; calendar years (four digits) every 10, or the last two collide at a phone's
 *  width, where Highcharts pulls the end label inside the plot ("2055" over "2060", the RC18 look on `date` at 390 px).
 *  Every chart over the plan's years reads it (the Display drawer's years switch, `src/ui/displaySettings.ts`). */
export function timeTickStep(axisNumber: number): 5 | 10 {
  return axisNumber >= 1000 ? 10 : 5
}

/** The x-axis ticks: every year at which the axis's number is a multiple of 5 for an age, of 10 for a calendar year,
 *  inside the drawn years. */
export function axisTicks(lastYear: number, tickAt: (yearsFromNow: number) => number): readonly number[] {
  const out: number[] = []
  const step = timeTickStep(tickAt(0))
  for (let t = 0; t <= lastYear; t++) if (tickAt(t) % step === 0) out.push(t)
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

/** Where a moment's label sits: at the plot's FOOT, staggered over two rows in x order, unless the median line runs
 *  through that foot under the label (a household whose middle path is low there: RC7's look caught "Work stops" printed
 *  across the median on `dip`), when it moves to the plot's TOP. Never at the top in the fan's middle stretch, where the
 *  ranges' words sit (`wordSeat`). Pure, so the test reads it. The label's span is read as about 15% of the years on
 *  its side of the line. The two rows are fixed in px, so on a phone's short plot they fill up to about 40% of its
 *  height (measured on `retired` at 390 px: "Plan horizon" touched a median at 35% of the axis): a median under 45%
 *  of the axis sends the label to the top, and the top is then clear by construction. */
export function momentSeat(years: readonly BandFanYear[], x: number, right: boolean, ceiling: number): 'foot' | 'top' {
  const last = years[years.length - 1]?.yearsFromNow ?? 0
  const span = last * 0.15
  const [from, to] = right ? [x - span, x] : [x, x + span]
  const medianUnder = Math.max(0, ...years.filter((y) => y.yearsFromNow >= from && y.yearsFromNow <= to).map((y) => y.p50))
  const inWords = x > last * 0.3 && x < last * 0.75
  return !inWords && ceiling > 0 && medianUnder < ceiling * 0.45 ? 'top' : 'foot'
}

/** The named moments as plot lines, each label where `momentSeat` puts it, an end label leaning inward. */
function plotLines(moments: readonly XAnnotation[], years: readonly BandFanYear[], ceiling: number, sides?: readonly LabelSide[]): XAxisPlotLinesOptions[] {
  const lastYear = years[years.length - 1]?.yearsFromNow ?? 0
  const named = namedMoments(moments)
  return named.map((m, i) => {
    const side = sides?.[i] ?? preferredSide(m.yearsFromNow > lastYear * 0.6)
    const top = momentSeat(years, m.yearsFromNow, side === 'left', ceiling) === 'top'
    const row = (i % 2) * 18
    return {
      id: `fan-moment-${m.id}`,
      value: m.yearsFromNow,
      className: FAN_CLASSES.moment,
      zIndex: 4,
      label:
        side === 'along'
          ? // Read upward beside its own line, where neither side has room clear of a neighbour's line.
            // At the top it hangs down from the plot's top edge (its end at the anchor); at the foot it rises from the
            // plot's bottom edge (its start at the anchor), so it never leaves the plot either way.
            top
            ? { text: m.label, rotation: 270, align: 'left', textAlign: 'right', x: -4, verticalAlign: 'top', y: 4, useHTML: false }
            : { text: m.label, rotation: 270, align: 'left', textAlign: 'left', x: -4, verticalAlign: 'bottom', y: -4, useHTML: false }
          : {
              text: m.label,
              rotation: 0,
              align: side === 'left' ? 'right' : 'left',
              x: side === 'left' ? -4 : 4,
              verticalAlign: top ? 'top' : 'bottom',
              y: top ? 14 + row : -6 - row,
              useHTML: false,
            },
    }
  })
}

const namedMoments = (moments: readonly XAnnotation[]): XAnnotation[] =>
  moments.filter((m) => m.label !== '').sort((a, b) => a.yearsFromNow - b.yearsFromNow)

/** Which side of its line a moment's label reads on: to its right, to its left, or along it (rotated). */
export type LabelSide = 'right' | 'left' | 'along'
const preferredSide = (pastSixTenths: boolean): LabelSide => (pastSixTenths ? 'left' : 'right')

/**
 * Each named moment's label side, from the drawn geometry (Act 6 · RC7: on `dip` at the phone, "Today" ran across the
 * "Work stops" line five years along). PURE, so the test reads it: each mark's line x and its label's measured width,
 * the plot's edges, all in px. A label keeps its preferred side (right of its line, or left past 60% of the plot) when
 * that span stays inside the plot and crosses no other moment's line; else the other side; else it reads along its
 * own line. No label ever crosses another moment's mark.
 */
export function labelSides(marks: readonly { readonly x: number; readonly width: number }[], plot: { readonly left: number; readonly right: number }, gap = 4): LabelSide[] {
  return marks.map((m, i) => {
    const others = marks.filter((_, j) => j !== i).map((o) => o.x)
    const clear = ([a, b]: readonly [number, number]) => a >= plot.left - 0.5 && b <= plot.right + 0.5 && others.every((o) => o < a - 1 || o > b + 1)
    const right: [number, number] = [m.x + gap, m.x + gap + m.width]
    const left: [number, number] = [m.x - gap - m.width, m.x - gap]
    const prefer = preferredSide(m.x > plot.left + (plot.right - plot.left) * 0.6)
    const [first, second] = prefer === 'right' ? [right, left] : [left, right]
    if (clear(first)) return prefer
    if (clear(second)) return prefer === 'right' ? 'left' : 'right'
    return 'along'
  })
}

/** The fan's options. Throws (through `buildYTicks`) on an all-$0 fan: the caller screens it (no honest scale). */
export function fanOptions({ fan, moments, labels, height, onPlotBox }: FanInput): Options {
  const years = fan.byYear
  const last = years[years.length - 1]
  if (last === undefined) throw new RangeError('fanOptions: an empty fan has nothing to draw')
  const lattice = fanLatticeFor(years, { outer: true, inner: true, median: true })
  const byX = new Map(years.map((y) => [y.yearsFromNow, y]))
  /**
   * After every draw, each moment's label is seated on what is really drawn: the scale the axis now stands on (the tiers
   * the legend leaves shown, `fanLatticeFor`, the lattice `tickPositioner` returned: a zoomed median runs where a top
   * label sat) and the measured label widths against the other moments' lines at this width (`labelSides`). Only when
   * the seating changes are the plot lines removed and added again; the axis itself is never updated (a live axis handed
   * a new scale was seen not to hold it, docs/landmines.md "UI and product").
   */
  const seatMoments = (chart: Chart): void => {
    const named = namedMoments(moments)
    if (named.length === 0) return
    const visible = (id: string) => (chart.get(id) as Series | undefined)?.visible !== false
    const fit = fanLatticeFor(years, { outer: visible(FAN_SERIES.outer), inner: visible(FAN_SERIES.inner), median: visible(FAN_SERIES.median) })
    // The plot-line methods are composed onto the axis at load (Highcharts' `PlotLineOrBand`), not on its declared type.
    const axis = chart.xAxis[0] as unknown as
      | { toPixels(value: number, paneCoordinates?: boolean): number; removePlotLine(id: string): void; addPlotLine(line: XAxisPlotLinesOptions): unknown }
      | undefined
    if (axis === undefined) return
    const marks = named.map((m) => {
      // Measured in the chart's own CSS (the label's class sets its size), then thrown away.
      const probe = chart.renderer.text(m.label, -9999, -9999).addClass('highcharts-plot-line-label').add()
      const width = probe.getBBox().width
      probe.destroy()
      return { x: axis.toPixels(m.yearsFromNow), width }
    })
    const sides = labelSides(marks, { left: chart.plotLeft, right: chart.plotLeft + chart.plotWidth })
    const key = JSON.stringify([fit.ceiling, sides])
    const held = chart as unknown as { b9MomentSeats?: string }
    if (held.b9MomentSeats === key) return
    held.b9MomentSeats = key
    for (const line of plotLines(moments, years, fit.ceiling, sides)) {
      axis.removePlotLine(line.id!)
      axis.addPlotLine(line)
    }
  }
  const outerSeat = wordSeat(years, (y) => y.p75, (y) => y.p90)
  const innerSeat = wordSeat(years, (y) => y.p50, (y) => y.p75, 0.62)
  const words = (seat: { x: number; y: number } | null, text: string, kind: 'outer' | 'inner'): SeriesOptionsType[] =>
    seat === null
      ? []
      : [
          {
            type: 'scatter',
            id: `fan-words-${kind}`,
            // Hidden and shown with the range it names (the legend's toggle), never left naming nothing.
            linkedTo: kind === 'outer' ? FAN_SERIES.outer : FAN_SERIES.inner,
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
  const spoken = chartWordsOptions({ ...labels.words, description: labels.description })
  return {
    chart: {
      height,
      spacingTop: 12,
      events: {
        // After every draw (a legend toggle's axis can change the tick column's width), the plot's margins go to
        // whoever lines up under it.
        render: function (this: Chart) {
          seatMoments(this)
          onPlotBox?.({ left: this.plotLeft, right: this.chartWidth - this.plotLeft - this.plotWidth })
        },
      },
    },
    title: { text: undefined },
    lang: spoken.lang,
    accessibility: {
      ...spoken.accessibility,
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
          labels.tipInner(labels.figure(y.p25), labels.figure(y.p75)),
          labels.tipMedian(labels.figure(y.p50)),
        ].join('<br>')
      },
    },
    xAxis: {
      type: 'linear',
      min: 0,
      max: last.yearsFromNow,
      tickPositions: [...axisTicks(last.yearsFromNow, labels.tickAt)],
      // The first person’s typed name rides this title: escaped, so it prints as typed (`hcPlain`).
      title: { text: hcPlain(labels.xAxisTitle) },
      labels: { formatter: (ctx) => String(labels.tickAt(Number(ctx.value))) },
      plotLines: plotLines(moments, years, lattice.ceiling),
      crosshair: true,
    },
    yAxis: {
      type: 'linear',
      // From $0 to the humane lattice over the top of what is drawn: the full fan's on first draw, and after a legend
      // toggle the shown tiers' (Highcharts recomputes the visible data's top on every redraw and asks again).
      min: 0,
      maxPadding: 0,
      startOnTick: true,
      endOnTick: true,
      tickPositioner: function () {
        // The top of the data the visible series draw (Highcharts' own extremes pass; hidden series are ignored).
        const fit = fanLatticeAt(years, (this as unknown as { readonly dataMax?: number }).dataMax)
        return buildYTicks(fit, labels.axisDollar(fit.ceiling)).map((t) => t.dollars)
      },
      // No drawn title: a rotated title outgrows a phone's plot at a raised browser font (the audit caught it clipped
      // at a 20 px default). The card prints the same words over the chart; a screen reader hears them here.
      title: { text: undefined },
      accessibility: { description: labels.yAxisTitle },
      // The lattice the axis stands on now (the full one, or the one a legend toggle fitted): its top is the ceiling.
      labels: { formatter: (ctx) => labels.axisDollar(ctx.axis.max ?? lattice.ceiling)(Number(ctx.value)) },
    },
    plotOptions: {
      series: { marker: { enabled: false } },
    },
    series: [
      {
        type: 'arearange',
        id: FAN_SERIES.outer,
        name: labels.outer,
        className: FAN_CLASSES.outer,
        data: years.map((y) => [y.yearsFromNow, y.p10, y.p90]),
        zIndex: 1,
      },
      {
        type: 'arearange',
        id: FAN_SERIES.inner,
        name: labels.inner,
        className: FAN_CLASSES.inner,
        data: years.map((y) => [y.yearsFromNow, y.p25, y.p75]),
        zIndex: 2,
      },
      {
        type: 'line',
        id: FAN_SERIES.median,
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
