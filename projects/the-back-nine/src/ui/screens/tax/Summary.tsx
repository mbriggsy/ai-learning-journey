/**
 * src/ui/screens/tax/Summary.tsx: Tax → Tax Strategies → Summary, the panel (plan RC8;
 * `rc-cashflow-tax/help-tax-tax-strategies-roth-conversion-strategy-51.png`). Draws `summaryView.ts`'s view: the
 * centred chart title, the grouped bars on the left (about 70%) and the key-metric column on the right with the hero's
 * own words, stacked below the 68rem seam. One frame at his window. The bars ride Highcharts' lazy chunk.
 */
import { lazy, Suspense, type ReactNode } from 'react'
import { Button, useWide } from '../../kit'
import { copy } from '../../copy'
import { verdictDescribedBy } from '../../disclaimerId'
import { ChartBoundary } from '../ChartBoundary'
import { chartWords } from '../dashboard/snapshotView'
import type { SummaryView } from './summaryView'

const GroupedBars = lazy(() => import('@viz/charts/GroupedBars').then((m) => ({ default: m.GroupedBars })))

/** The bars' height in CSS px (the one frame at his window, measured on `surplus`). */
export const SUMMARY_BARS_HEIGHT = 300

export function SummaryPanel({ view, caveat, footnotes, onStrategies }: { readonly view: SummaryView; readonly caveat: ReactNode; readonly footnotes: readonly string[]; readonly onStrategies: () => void }) {
  // Below the phone tier the two bars are too narrow for the full figures side by side: the same figures, three digits.
  const wide = useWide()
  if (view.kind !== 'bars') {
    return (
      <div className="flex flex-col gap-6" data-summary={view.kind}>
        <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
          <p className="max-w-2xl text-body text-stone-900">{view.words}</p>
          {view.kind === 'waiting' ? (
            <Button variant="secondary" size="sm" onClick={onStrategies}>
              {view.action}
            </Button>
          ) : null}
        </div>
        {caveat}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4 compact:gap-2" data-summary="bars">
      <h2 className="text-center text-chart-title font-regular text-plum">{view.title}</h2>
      <div className="flex flex-col gap-6 laptop:grid laptop:grid-cols-[7fr_3fr] laptop:items-center laptop:gap-10">
        <div role="group" aria-label={view.title} aria-describedby={verdictDescribedBy()} className="min-w-0" data-summary-chart="">
          <ChartBoundary fallback={<p className="py-8 text-body text-stone-600">{copy.chartLoadFailed}</p>}>
            <Suspense fallback={<div aria-hidden="true" className="h-75" />}>
              <GroupedBars
                chartId="tax-summary"
                groups={[view.category]}
                series={[
                  { id: 'bar-recommended', name: view.winner.name, role: 'alternative', values: [view.winner.statistic], figures: [wide ? view.winner.figure : view.winner.compactFigure], points: [view.winner.point] },
                  { id: 'bar-plan', name: view.baseline.name, role: 'compared', values: [view.baseline.statistic], figures: [wide ? view.baseline.figure : view.baseline.compactFigure], points: [view.baseline.point] },
                ]}
                lattice={view.lattice}
                axisDollar={view.axisDollar}
                words={{ ...chartWords(view.title), description: view.description }}
                height={SUMMARY_BARS_HEIGHT}
              />
            </Suspense>
          </ChartBoundary>
        </div>
        <div className="flex flex-col gap-2 text-center" data-metrics="">
          <p className="text-[1.5rem] leading-tight font-semibold text-stone-900 tabular-nums" data-summary-hero="">
            {view.hero}
          </p>
          {view.average !== undefined ? <p className="text-label text-stone-600">{view.average}</p> : null}
          <p className="text-label text-stone-600">{view.nameplate}</p>
        </div>
      </div>
      {footnotes.map((n) => (
        <p key={n} className="text-label text-stone-600" data-footnote="">
          {n}
        </p>
      ))}
      {caveat}
    </div>
  )
}
