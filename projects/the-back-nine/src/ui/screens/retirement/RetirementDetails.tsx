/**
 * src/ui/screens/retirement/RetirementDetails.tsx: Retirement → Analysis → Retirement Details, the panel (plan RC17;
 * ref 2.12). Draws `retirementDetailsView.ts`'s view inside the shared frame (`AnalysisRunsFrame.tsx`): a side's columns
 * over its retired years (income sources, the withdrawal rate, spending), the two sides' income donuts with each part's
 * share named in a key beside them (the slices carry no words of their own, so the key names every colour), or the
 * spending comparison's grouped bars. The charts ride Highcharts' lazy chunk.
 */
import { lazy } from 'react'
import { useWide } from '../../kit'
import { copy, slots } from '../../copy'
import { chartWords } from '../dashboard/snapshotView'
import { PATTERN_IDS, type PatternKind } from '@viz/charts/patterns'
import type { AnalysisFuture } from './analysisRuns'
import { AnalysisRunsFrame, RUNS_CHART_HEIGHT, RUNS_PHONE_HEIGHT } from './AnalysisRunsFrame'
import { ChartSeat } from './Comparisons'
import { cmpFigure } from './comparisonsView'
import type { RetirementDetailsChart, RetirementDetailsView } from './retirementDetailsView'

const YearBars = lazy(() => import('@viz/charts/YearBars').then((m) => ({ default: m.YearBars })))
const Donut = lazy(() => import('@viz/charts/InvestmentCharts').then((m) => ({ default: m.Donut })))
const GroupedBars = lazy(() => import('@viz/charts/GroupedBars').then((m) => ({ default: m.GroupedBars })))

export const INCOME_DONUT_SIZE = 156
export const INCOME_DONUT_PHONE = 140

/** A percent point's printed words (`4.2%`). */
export const percentText = (points: number): string => slots.analysisPercent(String(Math.round(points * 10) / 10))

/** A part's colour and pattern as a small square, drawn by the chart's own classes (`chartTheme.css`): the same fill the
 *  slice wears, so the key names every colour in words. */
export function Swatch({ colorIndex, pattern }: { readonly colorIndex: number; readonly pattern: PatternKind | 'solid' }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
      <g className={`highcharts-color-${colorIndex}${pattern === 'solid' ? '' : ` ${PATTERN_IDS[pattern]}`}`}>
        <rect className="highcharts-point b9-swatch" x="0.75" y="0.75" width="12.5" height="12.5" rx="2" />
      </g>
    </svg>
  )
}

export function RetirementDetailsPanel({
  view,
  onChart,
  future,
  onFuture,
}: {
  readonly view: RetirementDetailsView
  readonly onChart: (c: RetirementDetailsChart) => void
  readonly future: AnalysisFuture
  readonly onFuture: (f: AnalysisFuture) => void
}) {
  const wide = useWide()
  const height = wide ? RUNS_CHART_HEIGHT : RUNS_PHONE_HEIGHT
  let body: React.ReactNode = null
  let metrics: readonly string[] = []
  let notes: readonly string[] = []
  let updating = false
  if (view.kind === 'years') {
    metrics = view.metrics
    notes = view.notes
    updating = view.updating
    const value = view.percent ? percentText : cmpFigure
    body = (
      <ChartSeat title={view.title}>
        <YearBars
          chartId="rd-years"
          sources={view.sources}
          ticks={view.ticks}
          valueText={value}
          pointWords={view.percent ? (n, name, v) => slots.analysisPercentPoint(view.axisTitle, n, name, String(Math.round(v * 10) / 10)) : view.pointWords}
          words={{ ...chartWords(view.title), description: view.metrics[0] ?? view.title }}
          height={height}
          axisTitle={view.axisTitle}
          axisOffset={view.axisOffset}
          {...(view.ranOut !== undefined ? { ranOut: view.ranOut } : {})}
          legend={view.sources.length > 1}
        />
      </ChartSeat>
    )
  } else if (view.kind === 'donuts') {
    metrics = [view.metric]
    notes = view.notes
    updating = view.updating
    const size = wide ? INCOME_DONUT_SIZE : INCOME_DONUT_PHONE
    body = (
      // The key beside the donuts past the phone tier (stacked under them, the panel ran past his window's frame: RC17's look).
      <div className="flex flex-col gap-4 wide:flex-row wide:items-center wide:gap-6" data-rd-donuts="">
        <div className="grid shrink-0 grid-cols-2 gap-4">
          {/* What the holes' share is, once over both rings, so nothing (each chart's credit, under its ring) sits between
              a number and its words; inside the hole the words ran across the ring, and under each name they widened the
              rings' columns until the key beside them broke (RC17's look). */}
          <p className="col-span-2 w-0 min-w-full text-center text-label text-stone-600" data-rd-donut-words="">
            {copy.rdNotWithdrawal}
          </p>
          {view.donuts.map((d) => (
            <div key={d.side} className="flex min-w-0 flex-col items-center gap-2" data-rd-donut={d.side}>
              <h3 className="text-center text-body font-semibold text-stone-900">{d.title}</h3>
              <ChartSeat title={`${view.title}: ${d.title}`}>
                <Donut
                  chartId={`rd-donut-${d.side}`}
                  className="b9-income"
                  parts={d.parts}
                  words={{ ...chartWords(`${view.title}: ${d.title}`), description: view.metric }}
                  size={size}
                  picked={null}
                  pickable={false}
                  centre={<span className="text-chart-title tabular-nums text-stone-900">{d.centre}</span>}
                />
              </ChartSeat>
            </div>
          ))}
        </div>
        <table className="w-full min-w-0 text-label text-stone-900" data-rd-key="">
          <thead>
            <tr className="border-b border-stone-300 text-stone-600">
              <th scope="col" className="py-1 text-left font-regular">
                <span className="sr-only">{view.title}</span>
              </th>
              {view.donuts.map((d) => (
                <th key={d.side} scope="col" className="py-1 text-right font-regular">
                  {d.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.key.map((k) => (
              <tr key={k.id} className="border-b border-stone-200">
                <th scope="row" className="py-1 text-left font-regular">
                  <span className="inline-flex items-center gap-2">
                    <Swatch colorIndex={k.colorIndex} pattern={k.pattern} />
                    {k.name}
                  </span>
                </th>
                {k.shares.map((s, i) => (
                  <td key={view.donuts[i]?.side ?? i} className="py-1 text-right tabular-nums">
                    {s}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  } else if (view.kind === 'grouped') {
    metrics = [view.metric]
    notes = view.notes
    updating = view.updating
    body = (
      <ChartSeat title={view.title}>
        <GroupedBars
          chartId="rd-grouped"
          groups={view.groups}
          series={view.series}
          lattice={view.lattice}
          axisDollar={view.axisDollar}
          words={{ ...chartWords(view.title), description: view.metric }}
          height={height}
          padding={{ group: 0.06, point: 0.24 }}
        />
      </ChartSeat>
    )
  }
  return (
    <AnalysisRunsFrame
      tab="retirement-details"
      charts={view.charts}
      chart={view.chart}
      onChart={onChart}
      future={future}
      onFuture={onFuture}
      body={body}
      {...(view.kind === 'words' ? { words: view.words } : {})}
      metrics={metrics}
      notes={notes}
      updating={updating}
    />
  )
}
