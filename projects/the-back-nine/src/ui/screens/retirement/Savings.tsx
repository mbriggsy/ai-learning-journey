/**
 * src/ui/screens/retirement/Savings.tsx: Retirement → Analysis → Savings, the panel (plan RC17; ref 2.11). Draws
 * `savingsView.ts`'s view inside the shared frame (`AnalysisRunsFrame.tsx`): this year's deposits as one bar per kind of
 * account (Balance Sheet's look and its sideways phone rule), the working years' deposits, share of pay or left over as
 * columns, or the "not asked yet" words with the Pre-retirement living expenses door. The charts ride Highcharts' lazy
 * chunk.
 */
import { lazy } from 'react'
import { useWide } from '../../kit'
import { slots } from '../../copy'
import { chartWords } from '../dashboard/snapshotView'
import type { AnalysisFuture } from './analysisRuns'
import { AnalysisRunsFrame, RUNS_CHART_HEIGHT, RUNS_PHONE_HEIGHT } from './AnalysisRunsFrame'
import { ChartSeat } from './Comparisons'
import { cmpFigure } from './comparisonsView'
import { percentText } from './RetirementDetails'
import type { SavingsChart, SavingsView } from './savingsView'

const YearBars = lazy(() => import('@viz/charts/YearBars').then((m) => ({ default: m.YearBars })))
const KindBars = lazy(() => import('@viz/charts/KindBars').then((m) => ({ default: m.KindBars })))

export function SavingsPanel({
  view,
  onChart,
  future,
  onFuture,
  onOpenWorkingCost,
}: {
  readonly view: SavingsView
  readonly onChart: (c: SavingsChart) => void
  readonly future: AnalysisFuture
  readonly onFuture: (f: AnalysisFuture) => void
  /** The Pre-retirement living expenses drawer (the door's words come from the view, only on a writable tab). */
  readonly onOpenWorkingCost: () => void
}) {
  const wide = useWide()
  const height = wide ? RUNS_CHART_HEIGHT : RUNS_PHONE_HEIGHT
  const door = view.kind === 'unasked' || view.kind === 'bars' ? view.door : undefined
  const body =
    view.kind === 'bars' ? (
      <ChartSeat title={view.title}>
        <KindBars chartId="sav-bars" bars={view.bars} ticks={view.ticks} words={{ ...chartWords(view.title), description: view.metrics[0] ?? view.title }} height={height} />
      </ChartSeat>
    ) : view.kind === 'years' ? (
      <ChartSeat title={view.title}>
        <YearBars
          chartId="sav-years"
          sources={view.sources}
          ticks={view.ticks}
          valueText={view.percent ? percentText : cmpFigure}
          pointWords={view.percent ? (n, name, v) => slots.analysisPercentPoint(view.axisTitle, n, name, String(Math.round(v * 10) / 10)) : view.pointWords}
          words={{ ...chartWords(view.title), description: view.metrics[0] ?? view.title }}
          height={height}
          axisTitle={view.axisTitle}
          axisOffset={view.axisOffset}
          legend={view.sources.length > 1}
        />
      </ChartSeat>
    ) : null
  return (
    <AnalysisRunsFrame
      tab="savings"
      charts={view.charts}
      chart={view.chart}
      onChart={onChart}
      future={future}
      onFuture={onFuture}
      body={body}
      {...(view.kind === 'words' || view.kind === 'unasked' ? { words: view.words } : {})}
      {...(door !== undefined ? { door: { label: door, onOpen: onOpenWorkingCost } } : {})}
      metrics={view.kind === 'bars' || view.kind === 'years' || view.kind === 'words' ? view.metrics : []}
      notes={view.notes}
      updating={view.kind === 'bars' || view.kind === 'years' ? view.updating : false}
    />
  )
}
