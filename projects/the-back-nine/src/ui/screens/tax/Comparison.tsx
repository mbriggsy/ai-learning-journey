/**
 * src/ui/screens/tax/Comparison.tsx: Tax → Tax Strategies → Comparison, the panel (plan RC8;
 * `rc-cashflow-tax/help-tax-tax-strategies-comparison-tab-03.png`, `-05.png`). Draws `taxRunsView.ts`'s comparison: the
 * chart title (a menu of the five charts, its words naming the market), the market select at the top right, then the
 * chart with the key-metric column beside it; the withdrawals are two stacks side by side on one scale. A scrolling
 * page. The charts ride Highcharts' lazy chunk.
 */
import { lazy, Suspense, type ReactNode } from 'react'
import { ChartTitle, LoadingVeil, Select } from '../../kit'
import { copy, slots } from '../../copy'
import { formatDeltaDollar } from '../../money'
import { verdictDescribedBy } from '../../disclaimerId'
import { ChartBoundary } from '../ChartBoundary'
import { chartWords } from '../dashboard/snapshotView'
import { chartFigure, COMPARISON_CHARTS, type ComparisonChart, type ComparisonView, type TaxFuture } from './taxRunsView'

const PairAreas = lazy(() => import('@viz/charts/YearAreas').then((m) => ({ default: m.PairAreas })))
const StackedAreas = lazy(() => import('@viz/charts/YearAreas').then((m) => ({ default: m.StackedAreas })))

/** A point's spoken sentence: the year, whose figure, the figure. */
const pointWords = (year: number, name: string, dollars: number): string => slots.taxStratChartPoint(year, name, formatDeltaDollar(dollars))

export const COMPARISON_HEIGHT = 320
export const STACK_HEIGHT = 280

export const FUTURE_ITEMS: readonly { readonly value: TaxFuture; readonly label: string }[] = [
  { value: 'steady', label: copy.workbenchViewSteady },
  { value: 'rough', label: copy.workbenchViewRough },
]

export function FutureSelect({ value, onValueChange }: { readonly value: TaxFuture; readonly onValueChange: (f: TaxFuture) => void }) {
  return <Select label={copy.taxStratMarketLabel} items={FUTURE_ITEMS} value={value} onValueChange={onValueChange} />
}

export function ComparisonPanel({
  view,
  chart,
  onChart,
  future,
  onFuture,
  caveat,
}: {
  readonly view: ComparisonView
  readonly chart: ComparisonChart
  readonly onChart: (c: ComparisonChart) => void
  readonly future: TaxFuture
  readonly onFuture: (f: TaxFuture) => void
  readonly caveat: ReactNode
}) {
  const title = view.kind === 'pair' || view.kind === 'stacks' ? view.title : undefined
  return (
    <div className="flex flex-col gap-4" data-comparison={view.kind} data-comparison-chart={chart}>
      <div className="flex flex-col items-center gap-4 laptop:grid laptop:grid-cols-[1fr_auto_1fr]">
        <span aria-hidden="true" className="hidden laptop:block" />
        <div className="flex justify-center">
          <ChartTitle items={COMPARISON_CHARTS} value={chart} onValueChange={onChart} />
        </div>
        <div className="flex justify-center laptop:justify-end">
          <FutureSelect value={future} onValueChange={onFuture} />
        </div>
      </div>
      {title !== undefined ? (
        <p className="text-center text-label text-stone-600" data-comparison-title="">
          {title}
        </p>
      ) : null}
      {view.kind === 'waiting' || view.kind === 'withheld' ? (
        <p className="py-12 text-center text-body text-stone-900" data-comparison-words="">
          {view.words}
        </p>
      ) : view.kind === 'pair' ? (
        <LoadingVeil loading={view.updating} label={copy.taxStratRunsWaiting}>
          <div className="flex flex-col gap-6 laptop:grid laptop:grid-cols-[7fr_3fr] laptop:items-center laptop:gap-10">
            <div role="group" aria-label={view.title} aria-describedby={verdictDescribedBy()} className="min-w-0" data-comparison-pair="">
              <ChartBoundary fallback={<p className="py-8 text-body text-stone-600">{copy.chartLoadFailed}</p>}>
                <Suspense fallback={<div aria-hidden="true" className="h-80" />}>
                  <PairAreas
                    chartId="tax-pair"
                    series={view.series}
                    lattice={view.lattice}
                    axisDollar={view.axisDollar}
                    figure={chartFigure}
                    pointWords={pointWords}
                    words={{ ...chartWords(view.title), description: view.metric }}
                    height={COMPARISON_HEIGHT}
                  />
                </Suspense>
              </ChartBoundary>
            </div>
            <div className="flex flex-col gap-2 text-center" data-metrics="">
              <p className="text-body text-stone-900" data-comparison-metric="">
                {view.metric}
              </p>
              {view.notes.map((n) => (
                <p key={n} className="text-label text-stone-600" data-comparison-note="">
                  {n}
                </p>
              ))}
            </div>
          </div>
        </LoadingVeil>
      ) : (
        <LoadingVeil loading={view.updating} label={copy.taxStratRunsWaiting}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-8 laptop:grid laptop:grid-cols-2 laptop:gap-10">
              {view.stacks.map((s, i) => (
                <div key={s.title} role="group" aria-label={`${view.title}: ${s.title}`} aria-describedby={verdictDescribedBy()} className="flex min-w-0 flex-col gap-2" data-comparison-stack={i === 0 ? 'recommended' : 'plan'}>
                  <h3 className="text-center text-body font-semibold text-stone-900">{s.title}</h3>
                  <ChartBoundary fallback={<p className="py-8 text-body text-stone-600">{copy.chartLoadFailed}</p>}>
                    <Suspense fallback={<div aria-hidden="true" className="h-70" />}>
                      <StackedAreas
                        chartId={i === 0 ? 'tax-stack-recommended' : 'tax-stack-plan'}
                        sources={s.sources}
                        lattice={view.lattice}
                        axisDollar={view.axisDollar}
                        figure={chartFigure}
                        pointWords={pointWords}
                        words={{ ...chartWords(`${view.title}: ${s.title}`), description: view.notes[0] ?? s.title }}
                        height={STACK_HEIGHT}
                      />
                    </Suspense>
                  </ChartBoundary>
                </div>
              ))}
            </div>
            {view.notes.map((n) => (
              <p key={n} className="text-center text-label text-stone-600" data-comparison-note="">
                {n}
              </p>
            ))}
          </div>
        </LoadingVeil>
      )}
      {caveat}
    </div>
  )
}
