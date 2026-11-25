/**
 * src/ui/screens/retirement/Confidence.tsx: the Confidence tab's panel (plan docs/plans/6-rightcapital-ui-plan.md, RC7;
 * ref 2.9; `rc-analysis/confidence-tab-retirement-analysis__…png`, `FRAME_confidence-legend-toggled-median-only.png`).
 * Draws `confidenceView.ts`'s view and decides nothing.
 *
 * LAYOUT, as RightCapital draws it: the chart's title centred over the fan, the fan full width with its legend under it
 * (each tier toggles; with the ranges hidden the axis zooms to the median, `fanOptions.ts`). B9 adds, under the fan on
 * the retired route, the small run-out chart on the same age axis (its plot margins handed over from the fan as it
 * draws, so a year sits under the same year; until the fan has drawn once the run-out chart's seat is held empty), and
 * the key-metric column beside the charts, stacked under them below the 68rem seam, with the R13 caveat closing it. No
 * ACTION ITEMS handle on this tab: the fan reads your plan only (a what-if run carries no fan), so a what-if edited here
 * would change nothing on it.
 *
 * Both charts ride Highcharts' lazy chunk (Snapshot's rule): jsdom and the shell's other pages never evaluate it.
 */
import { lazy, Suspense, useCallback, useState, type ReactNode } from 'react'
import type { PlotBox } from '@viz/charts/fanOptions'
import { ChartTitle } from '../../kit'
import { verdictDescribedBy } from '../../disclaimerId'
import { copy } from '../../copy'
import type { ConfidenceView } from './confidenceView'
import { ChartBoundary } from '../ChartBoundary'

const FanChart = lazy(() => import('@viz/charts/FanChart').then((m) => ({ default: m.FanChart })))
const RunOutChart = lazy(() => import('@viz/charts/RunOutChart').then((m) => ({ default: m.RunOutChart })))

/** The fan's height in CSS px, and the run-out chart's (the one frame at his window, measured on `retired`). */
export const CONFIDENCE_FAN_HEIGHT = 270
export const CONFIDENCE_RUN_OUT_HEIGHT = 110

const TITLE = [{ id: 'fan', label: copy.confidenceChartTitle }] as const

function Notes({ view, caveat }: { readonly view: ConfidenceView; readonly caveat: ReactNode }) {
  const lead = view.kind === 'chart' && view.runOut !== undefined
  return (
    <div className="flex flex-col gap-3 text-left compact:gap-2" data-metrics="">
      {view.metrics.map((line, i) => (
        <p key={line} className={i === 0 && lead ? 'text-body font-semibold text-stone-900' : 'text-label text-stone-600'} data-metric="">
          {line}
        </p>
      ))}
      {view.footnotes.map((n) => (
        <p key={n} className="text-label text-stone-600" data-footnote="">
          {n}
        </p>
      ))}
      {/* The R13 caveat closes the column: last in the reading order (after the charts and the notes), and inside the
          one frame at his window, where the panel's foot under two charts is not. */}
      <div className="mt-3 compact:mt-1">{caveat}</div>
    </div>
  )
}

export function ConfidencePanel({ view, caveat }: { readonly view: ConfidenceView; readonly caveat: ReactNode }) {
  const [box, setBox] = useState<PlotBox | null>(null)
  const onPlotBox = useCallback((next: PlotBox) => setBox((prev) => (prev !== null && prev.left === next.left && prev.right === next.right ? prev : next)), [])
  return (
    <div className="flex flex-col gap-4 compact:gap-2" data-confidence={view.kind === 'chart' ? view.route : 'words'}>
      <div className="flex justify-center">
        <ChartTitle items={TITLE} value="fan" onValueChange={() => undefined} />
      </div>
      <div className="flex flex-col gap-8 laptop:grid laptop:grid-cols-[7fr_3fr] laptop:items-start laptop:gap-10">
        <div className="flex min-w-0 flex-col gap-2 compact:gap-1">
          {view.kind === 'chart' ? (
            <>
              <div role="group" aria-label={view.title} aria-describedby={verdictDescribedBy()} className="min-w-0" data-fan="">
                <ChartBoundary fallback={<p className="py-8 text-body text-stone-600">{copy.chartLoadFailed}</p>}>
                  <Suspense fallback={<div aria-hidden="true" className="h-67.5" />}>
                    <FanChart fan={view.fan} moments={view.moments} labels={view.labels} height={CONFIDENCE_FAN_HEIGHT} onPlotBox={onPlotBox} />
                  </Suspense>
                </ChartBoundary>
              </div>
              {view.runOut !== undefined ? (
                <div className="flex min-w-0 flex-col gap-1" data-runout-card="">
                  <p className="text-label font-semibold text-stone-900" data-runout-title="">
                    {view.runOut.title}
                  </p>
                  <div className="min-w-0" data-runout="">
                    <ChartBoundary fallback={<p className="text-body text-stone-600">{copy.chartLoadFailed}</p>}>
                      {box !== null ? (
                        <Suspense fallback={<div aria-hidden="true" className="h-27.5" />}>
                          <RunOutChart points={view.runOut.points} labels={view.runOut.labels} height={CONFIDENCE_RUN_OUT_HEIGHT} box={box} />
                        </Suspense>
                      ) : (
                        // The seat held until the fan reports where its years sit, so nothing below moves when it lands.
                        <div aria-hidden="true" className="h-27.5" />
                      )}
                    </ChartBoundary>
                  </div>
                </div>
              ) : null}
              {view.stopgap !== undefined ? (
                <p className="text-label text-stone-600" data-runout-stopgap="">
                  {view.stopgap}
                </p>
              ) : null}
            </>
          ) : (
            <p className="py-8 text-body text-stone-600" data-confidence-words="">
              {view.words}
            </p>
          )}
        </div>
        <Notes view={view} caveat={caveat} />
      </div>
    </div>
  )
}
