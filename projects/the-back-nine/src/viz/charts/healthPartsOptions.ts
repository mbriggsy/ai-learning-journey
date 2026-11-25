/*
 * src/viz/charts/healthPartsOptions.ts: one of Retirement → Health Care's four small charts (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC10; ref 2.15 corrected by critique 9). PURE: every figure, the shared scale,
 * the shared age range and every word arrive from the composer (`healthCareView.ts`).
 *
 * One part per chart, one column per year, never stacked on another part (a sum of middle costs is not the middle
 * total). The four charts share ONE dollar lattice and ONE age range, so a bar in one reads against a bar in another
 * (insight 169): each axis prints its own $0 and its top, the same top on all four. The bars are one quiet hue: the
 * chart's title names the part, so colour carries nothing here. The marketplace part may carry the cliff's stretches:
 * a thin ink bracket over the years of one stretch, its count printed above it in dark text (an adverse count, the
 * composer's words). Neighbouring stretches print their counts on alternate rows, so two short stretches side by side
 * never run their words together (RC10's look: "1 of 102 of 10"). The legend's one item is printed in HTML beside the
 * chart's title by the page.
 */
import type { Options, PointOptionsObject, SeriesColumnOptions, SeriesLineOptions } from 'highcharts/highcharts.src'
import { buildYTicks, type DollarLattice } from '../bandData'
import { chartWordsOptions, hcPlain, type ChartWords } from './chartA11y'

export interface HealthPartBar {
  readonly age: number
  readonly value: number
  readonly point: string
}

export interface HealthCliffStretch {
  readonly fromAge: number
  readonly toAge: number
  readonly label: string
  readonly point: string
}

export interface HealthPartInput {
  readonly id: string
  /** The series' name (the part's title). */
  readonly name: string
  readonly bars: readonly HealthPartBar[]
  readonly cliff: readonly HealthCliffStretch[]
  /** The four charts' shared age range (the first person's ages). */
  readonly ages: { readonly first: number; readonly last: number }
  readonly axisTitle: string
  readonly lattice: DollarLattice
  readonly axisDollar: (dollars: number) => string
  readonly words: ChartWords
  readonly height: number
}

/** The classes the chart's marks carry (`chartTheme.css`). */
export const HEALTH_CLASSES = { bar: 'b9-health-bar', cliff: 'b9-health-cliff' } as const

/** Room above the plot for the cliff's printed counts, two rows of them: the same on all four charts, so their plots
 *  stay one height. */
export const HEALTH_SPACING_TOP = 38

/** Where a bracket's turned-down ends stop, as a share of the scale's top. */
export const HEALTH_BRACKET_END = 0.93

/** How far an odd stretch's count sits above an even one's, in CSS px (one label row). */
export const HEALTH_CLIFF_ROW = 18

export function healthPartOptions(input: HealthPartInput): Options {
  const { lattice, ages } = input
  const spoken = chartWordsOptions(input.words)
  const ticks = buildYTicks(lattice, input.axisDollar)
  // Words on $0 and the top only: the small plot set every gridline's words a few pixels apart. Every gridline stays.
  const tickLabel = new Map(ticks.filter((_, i) => i === 0 || i === ticks.length - 1).map((t) => [t.dollars, t.label]))
  const bars: SeriesColumnOptions = {
    type: 'column',
    id: `${input.id}-bars`,
    name: input.name,
    className: HEALTH_CLASSES.bar,
    // No entrance growth: a column grows by scaling its group, and a re-render mid-growth stopped it flat (RC4).
    animation: false,
    data: input.bars.map((b): PointOptionsObject => ({ x: b.age, y: b.value, custom: { point: b.point } })),
  }
  const cliff = input.cliff.map((c, i): SeriesLineOptions => {
    const mid = (c.fromAge + c.toAge) / 2
    return {
      type: 'line',
      id: `${input.id}-cliff-${i}`,
      name: c.label,
      className: HEALTH_CLASSES.cliff,
      showInLegend: false,
      enableMouseTracking: false,
      marker: { enabled: false },
      // The count is never deferred (`fanOptions.ts`' rule), set on the series: Highcharts reads `defer` for the series'
      // label group, never a point's. Deferred, the count faded in after the morph (missing for about half a second), and
      // under the harnesses' pinned clock the fade never ran at all (b9-10, 2026-11-25).
      dataLabels: { defer: false },
      // A bracket over the stretch's columns at the top of the plot, its two ends turned down so two stretches side by side
      // read as two; its count printed over its middle.
      data: [
        { x: c.fromAge - 0.4, y: lattice.ceiling * HEALTH_BRACKET_END, custom: { point: c.point } },
        { x: c.fromAge - 0.4, y: lattice.ceiling, custom: { point: c.point } },
        {
          x: mid,
          y: lattice.ceiling,
          custom: { point: c.point },
          dataLabels: { enabled: true, crop: false, overflow: 'allow' as const, verticalAlign: 'bottom' as const, y: i % 2 === 0 ? -1 : -1 - HEALTH_CLIFF_ROW, formatter: () => c.label },
        },
        { x: c.toAge + 0.4, y: lattice.ceiling, custom: { point: c.point } },
        { x: c.toAge + 0.4, y: lattice.ceiling * HEALTH_BRACKET_END, custom: { point: c.point } },
      ],
    }
  })
  return {
    chart: { type: 'column', height: input.height, spacingTop: HEALTH_SPACING_TOP, spacingBottom: 6, spacingRight: 8 },
    title: { text: undefined },
    lang: spoken.lang,
    accessibility: { ...spoken.accessibility, point: { descriptionFormatter: (p) => String((p.options.custom as { point?: string } | undefined)?.point ?? '') } },
    legend: { enabled: false },
    // The credit stays on every chart (the Personal Use licence), in the top right corner's spacing: the bottom right
    // holds the last age's words.
    credits: { enabled: true, position: { align: 'right', verticalAlign: 'top', x: -4, y: 12 } },
    tooltip: {
      // A bar’s sentence names the first person’s age by their typed name: escaped where it is drawn (`hcPlain`); the
      // spoken copy above stays raw.
      formatter: function () {
        return hcPlain(String(((this as unknown as { point: { options: { custom?: { point?: string } } } }).point.options.custom?.point) ?? ''))
      },
    },
    xAxis: { type: 'linear', min: ages.first - 0.5, max: ages.last + 0.5, allowDecimals: false, tickInterval: 5, lineWidth: 1, title: { text: undefined } },
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
      column: { borderRadius: 1, pointPadding: 0.08, groupPadding: 0.04 },
      line: { lineWidth: 1.5 },
    },
    series: [bars, ...cliff],
  }
}
