/*
 * src/viz/charts/stressBarsOptions.ts: Retirement → Stress Test's one chart (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC11; ref 2.13; `rc-analysis/FRAME_stress-test-full-page-hover-tooltip.png`). PURE: every count, height and word
 * arrives from the composer (`stressView.ts`).
 *
 * One bar per stress on a FIXED scale of 0 to 10 (never fitted to the bars, so a chart rebuilt for new runs keeps its
 * axis; insight 169), each bar's count printed on top in dark text with no hover needed, its name and size under it.
 * RightCapital's ten hues are kept as the bars' colours, but colour carries nothing (several neighbours merge for a
 * colour-blind reader, ref 3.4; `RC_PAIRS` lists each pair): Baseline, the plan as it stands, is drawn as an OUTLINE and
 * named; Combined, every stress at once, is CROSS-HATCHED and named; each other bar is solid and named.
 *
 * The counts are never deferred (a series-level `defer: false`: a point-level one is ignored, and a deferred label waits
 * on the morph and stays at opacity 0 under a pinned clock, insight 169), and the columns never grow in (a host
 * re-render mid-growth stopped RC4's bar flat).
 */
import type { Options, PointOptionsObject } from 'highcharts/highcharts.src'
import { chartWordsOptions, type ChartWords } from './chartA11y'

export type StressBarRole = 'baseline' | 'stress' | 'combined'

export interface StressChartBar {
  readonly id: string
  readonly name: string
  /** The line under the name: the stress's size ("20% less"), or Baseline's and Combined's own words. */
  readonly detail: string
  /** The count the bar stands to, 0 to 9 (the ring's arc), or null where the bar has no count yet (no column). */
  readonly height: number | null
  /** The printed count ("7 of 10", "better than 9 in 10"), or '' where the bar has none. */
  readonly count: string
  readonly role: StressBarRole
  /** The series colour slot (`palette.ts`'s `RC_SERIES` order). */
  readonly colorIndex: number
  /** The screen reader's sentence for the bar. */
  readonly point: string
}

export interface StressBarsInput {
  readonly bars: readonly StressChartBar[]
  readonly axisTitle: string
  readonly words: ChartWords
  readonly height: number
  /** A narrow chart (the phone): a long count wraps onto two lines inside its bar's slot. */
  readonly narrow: boolean
}

/** The scale's top: ten futures out of ten, fixed. */
export const STRESS_AXIS_MAX = 10

/** A count broken onto lines of about `width` characters at its spaces (a narrow bar's long words wrap, never cut). */
export function wrapWords(text: string, width: number): string {
  const words = text.split(' ')
  const lines: string[] = []
  for (const w of words) {
    const last = lines[lines.length - 1]
    if (last !== undefined && last.length + 1 + w.length <= width) lines[lines.length - 1] = `${last} ${w}`
    else lines.push(w)
  }
  return lines.join('<br>')
}

export function stressBarsOptions(input: StressBarsInput): Options {
  const { bars, words, height, narrow } = input
  const spoken = chartWordsOptions(words)
  const labelOf = new Map(bars.map((b, i) => [i, `${b.name}<br>${b.detail}`]))
  const data = bars.map(
    (b, i): PointOptionsObject => ({
      x: i,
      y: b.height,
      colorIndex: b.colorIndex,
      className: `b9-stress-bar b9-stress-bar--${b.id} b9-stress-${b.role}`,
      custom: { count: b.count, point: b.point },
    }),
  )
  return {
    // On the phone the last bar's label gets room past the plot's edge: Highcharts cuts a last label that would overflow the
    // chart with "…" (RC11's phone look: "Combined every…").
    chart: { type: 'column', height, spacingTop: 36, spacingBottom: 12, ...(narrow ? { spacingRight: 24, spacingLeft: 4 } : {}) },
    title: { text: undefined },
    lang: spoken.lang,
    accessibility: { ...spoken.accessibility, point: { descriptionFormatter: (p) => String((p.options.custom as { point?: string } | undefined)?.point ?? '') } },
    legend: { enabled: false },
    tooltip: { enabled: false },
    credits: { enabled: true, position: { align: 'right', verticalAlign: 'bottom', x: -4, y: -2 } },
    xAxis: {
      categories: bars.map((b) => b.name),
      lineWidth: 1,
      // Each bar's name and its size under it; never rotated or cut (a cut label hides content).
      labels: { autoRotationLimit: 0, overflow: 'allow', style: { textOverflow: 'clip', whiteSpace: 'normal' } as const, formatter: (ctx) => labelOf.get(Number(ctx.pos)) ?? '' },
    },
    yAxis: {
      type: 'linear',
      min: 0,
      max: STRESS_AXIS_MAX,
      startOnTick: false,
      endOnTick: false,
      tickPositions: [0, 2, 4, 6, 8, 10],
      title: { text: input.axisTitle },
      labels: { formatter: (ctx) => String(ctx.value) },
    },
    plotOptions: { column: { borderRadius: 4, pointPadding: 0.12, groupPadding: 0.12, maxPointWidth: 72 } },
    series: [
      {
        type: 'column',
        id: 'stress-bars',
        name: words.title,
        className: 'b9-stress-series',
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
            const count = String((this as unknown as { point: { custom?: { count?: string } } }).point.custom?.count ?? '')
            return narrow ? wrapWords(count, 11) : count
          },
        },
      },
    ],
  }
}
