/**
 * src/ui/screens/retirement/Comparisons.tsx: Retirement → Analysis → Comparisons, the panel (plan RC17; ref 2.10).
 * Draws `comparisonsView.ts`'s view inside the shared frame (`AnalysisRunsFrame.tsx`): the two sides as overlapping
 * areas over the years, or their two bars as retirement begins on one scale (insight 169). The charts ride Highcharts'
 * lazy chunk.
 */
import { lazy, Suspense, type ReactNode } from 'react'
import { useWide } from '../../kit'
import { copy } from '../../copy'
import { verdictDescribedBy } from '../../disclaimerId'
import { ChartBoundary } from '../ChartBoundary'
import { chartWords } from '../dashboard/snapshotView'
import type { AnalysisFuture } from './analysisRuns'
import { AnalysisRunsFrame, RUNS_CHART_HEIGHT, RUNS_PHONE_HEIGHT } from './AnalysisRunsFrame'
import { cmpFigure, type ComparisonsChart, type ComparisonsView } from './comparisonsView'

const PairAreas = lazy(() => import('@viz/charts/YearAreas').then((m) => ({ default: m.PairAreas })))
const KindBars = lazy(() => import('@viz/charts/KindBars').then((m) => ({ default: m.KindBars })))

/** A chart's seat: named, tied to the R13 caveat (the page's figures name it, plan 4.0), a fallback if it fails to load. */
export function ChartSeat({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div role="group" aria-label={title} aria-describedby={verdictDescribedBy()} className="min-w-0" data-analysis-seat="">
      <ChartBoundary fallback={<p className="py-8 text-body text-stone-600">{copy.chartLoadFailed}</p>}>
        <Suspense fallback={<div aria-hidden="true" className="min-h-60" />}>{children}</Suspense>
      </ChartBoundary>
    </div>
  )
}

export function ComparisonsPanel({
  view,
  onChart,
  future,
  onFuture,
}: {
  readonly view: ComparisonsView
  readonly onChart: (c: ComparisonsChart) => void
  readonly future: AnalysisFuture
  readonly onFuture: (f: AnalysisFuture) => void
}) {
  const wide = useWide()
  const height = wide ? RUNS_CHART_HEIGHT : RUNS_PHONE_HEIGHT
  const body =
    view.kind === 'pair' ? (
      <ChartSeat title={view.title}>
        <PairAreas
          chartId="cmp-pair"
          series={view.series}
          lattice={view.lattice}
          axisDollar={view.axisDollar}
          figure={cmpFigure}
          pointWords={view.pointWords}
          axisTitle={view.axisTitle}
          axisOffset={view.axisOffset}
          words={{ ...chartWords(view.title), description: view.metric }}
          height={height}
        />
      </ChartSeat>
    ) : view.kind === 'bars' ? (
      <ChartSeat title={view.title}>
        <KindBars
          chartId="cmp-bars"
          className="b9-kinds b9-sides"
          bars={view.bars}
          ticks={view.ticks}
          words={{ ...chartWords(view.title), description: view.metric }}
          height={height}
        />
      </ChartSeat>
    ) : null
  return (
    <AnalysisRunsFrame
      tab="comparisons"
      charts={view.charts}
      chart={view.chart}
      onChart={onChart}
      future={future}
      onFuture={onFuture}
      body={body}
      {...(view.kind === 'words' ? { words: view.words } : {})}
      metrics={view.kind === 'words' ? [] : [view.metric]}
      notes={view.kind === 'words' ? [] : view.notes}
      updating={view.kind === 'words' ? false : view.updating}
    />
  )
}
