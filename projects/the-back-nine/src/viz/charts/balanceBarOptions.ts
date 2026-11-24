/*
 * src/viz/charts/balanceBarOptions.ts: one half's balance bar on Probability's retired route (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC4; ref 2.7's ending-assets bar, RENAMED for what it holds, critique 1). PURE:
 * the figure, the shared scale and every word arrive from the composer (`probabilityView.ts`).
 *
 * What it draws: ONE column, the median of the run's `terminalValuesReal` (each future's balance when the second of you
 * dies, capped at the plan's last year), its figure printed ABOVE the column in dark text (back-nine-design: values on
 * the green bar print above it in stone-900), the y axis linear from $0 on the one humane lattice. Both halves share one
 * lattice (`ceiling`), so the two bars compare by height. The colour role follows plan 4.0: the alternative (left) is
 * green and solid; the plan it is compared against (right) is blue and hatched, the second cue.
 */
import type { Options } from 'highcharts/highcharts.src'
import { buildYTicks, type DollarLattice } from '../bandData'
import { chartWordsOptions, type ChartWords } from './chartA11y'

export type BarRole = 'alternative' | 'compared'

export interface BalanceBarInput {
  readonly role: BarRole
  /** The median balance, in today's dollars. */
  readonly median: number
  /** The lattice both halves share (`niceLattice` over the larger median). */
  readonly lattice: DollarLattice
  /** The printed figure (`~` included) and the y ticks' words. */
  readonly figure: string
  readonly axisDollar: (dollars: number) => string
  /** The side's name, for the screen reader's sentence and the column's name. */
  readonly sideName: string
  readonly point: string
  readonly description: string
  readonly words: Omit<ChartWords, 'description'>
  readonly height: number
}

export const BAR_CLASSES = { alternative: 'b9-bar-alternative', compared: 'b9-bar-compared b9-hatch' } as const

export function balanceBarOptions(input: BalanceBarInput): Options {
  const { role, median, lattice, figure, axisDollar, sideName, point, description, words, height } = input
  const ticks = buildYTicks(lattice, axisDollar)
  const tickLabel = new Map(ticks.map((t) => [t.dollars, t.label]))
  const spoken = chartWordsOptions({ ...words, description })
  return {
    chart: { type: 'column', height, spacingTop: 24 },
    title: { text: undefined },
    lang: spoken.lang,
    accessibility: { ...spoken.accessibility, point: { descriptionFormatter: () => point } },
    legend: { enabled: false },
    tooltip: { enabled: false },
    credits: { enabled: true, position: { align: 'right', x: -4, y: -4 } },
    xAxis: { type: 'linear', min: -0.5, max: 0.5, tickPositions: [], labels: { enabled: false }, lineWidth: 1 },
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
        // One column per chart: a fixed width (a lone point's range left the column zero-wide).
        pointWidth: 56,
        dataLabels: { enabled: true, crop: false, overflow: 'allow', allowOverlap: true, useHTML: false, defer: false, formatter: () => figure },
      },
    },
    series: [
      {
        type: 'column',
        id: `bar-${role}`,
        name: sideName,
        colorIndex: role === 'alternative' ? 1 : 0,
        className: BAR_CLASSES[role],
        // No entrance growth: a column grows by scaling its group, and a host re-render mid-growth (the shell re-renders
        // as readings land) stopped it flat (measured: a 0.1 px tall column). The figure is printed either way.
        animation: false,
        data: [{ x: 0, y: median }],
      },
    ],
  }
}
