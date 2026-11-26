/**
 * src/ui/screens/retirement/AnalysisRunsFrame.tsx: the one panel body Analysis's Comparisons, Savings and Retirement
 * Details tabs share (plan docs/plans/6-rightcapital-ui-plan.md, RC17; ref 2.10 to 2.12;
 * `rc-analysis/comparisons-tab-retirement-analysis__…10-46-33.png`, `FRAME_comparisons-return-scenario-dropdown-bad-decade.png`).
 *
 * LAYOUT, as RightCapital draws it: the chart's own title centred, a menu of the tab's charts (`ChartTitle`); the future
 * select at the top right (Steady or Rough market, Tax Strategies' own `FutureSelect`); then the chart on the left at
 * about 70% and the key-metric column beside it (the figures in words, then the notes), stacked under it below the
 * laptop seam. Analysis's frame adds the R13 caveat and the ACTION ITEMS handle under it. A run in flight fades the chart
 * under "Loading…" with its picture kept (`LoadingVeil`). Draws what it is handed and decides nothing.
 */
import type { ReactNode } from 'react'
import { Button, ChartTitle, LoadingVeil } from '../../kit'
import { copy } from '../../copy'
import { verdictDescribedBy } from '../../disclaimerId'
import { FutureSelect } from '../tax/Comparison'
import type { AnalysisFuture } from './analysisRuns'

/** The chart's height in CSS px at his window (one frame down to the handle, plan RC17's fit decision: at 250 the date
 *  route's three-line intro put the handle 4 px past his window on `dip`) and on the phone. */
export const RUNS_CHART_HEIGHT = 236
export const RUNS_PHONE_HEIGHT = 280

export interface AnalysisRunsFrameProps<Id extends string> {
  /** `comparisons`, `savings` or `retirement-details`: the e2e and look hooks. */
  readonly tab: string
  readonly charts: readonly { readonly id: Id; readonly label: string }[]
  readonly chart: Id
  readonly onChart: (chart: Id) => void
  readonly future: AnalysisFuture
  readonly onFuture: (future: AnalysisFuture) => void
  /** The chart, or null where words stand in its place. */
  readonly body: ReactNode | null
  /** The words in the chart's place (rows working out, withheld, not asked yet). */
  readonly words?: string
  /** A door beside the words or the metrics (the Pre-retirement living expenses drawer). */
  readonly door?: { readonly label: string; readonly onOpen: () => void }
  readonly metrics: readonly string[]
  readonly notes: readonly string[]
  readonly updating: boolean
}

export function AnalysisRunsFrame<Id extends string>({ tab, charts, chart, onChart, future, onFuture, body, words, door, metrics, notes, updating }: AnalysisRunsFrameProps<Id>) {
  const doorButton =
    door !== undefined ? (
      <div>
        <Button variant="secondary" size="sm" onClick={door.onOpen} data-analysis-door="">
          {door.label}
        </Button>
      </div>
    ) : null
  return (
    <div className="flex flex-col gap-4 compact:gap-3" data-analysis-panel={tab} data-analysis-chart={chart}>
      <div className="flex flex-col items-center gap-3 laptop:grid laptop:grid-cols-[1fr_auto_1fr]">
        <span aria-hidden="true" className="hidden laptop:block" />
        <div className="flex justify-center text-center">
          <ChartTitle items={charts} value={chart} onValueChange={onChart} />
        </div>
        <div className="flex justify-center laptop:justify-end">
          <FutureSelect value={future} onValueChange={onFuture} />
        </div>
      </div>
      {body === null ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center" data-analysis-words="">
          {/* The words stand for the chart's reading, so they name the R13 caveat as the chart would (plan 4.0). */}
          <p className="max-w-2xl text-body text-stone-900" aria-describedby={verdictDescribedBy()}>
            {words}
          </p>
          {doorButton}
          {notes.map((n) => (
            <p key={n} className="max-w-2xl text-label text-stone-600" data-analysis-note="">
              {n}
            </p>
          ))}
        </div>
      ) : (
        <LoadingVeil loading={updating} label={copy.analysisRunsWaiting}>
          <div className="flex flex-col gap-6 laptop:grid laptop:grid-cols-[3fr_2fr] laptop:items-center laptop:gap-10">
            <div className="min-w-0" data-analysis-body="">
              {body}
            </div>
            <div className="flex flex-col gap-2 text-left" data-metrics="">
              {metrics.map((m) => (
                <p key={m} className="text-body text-stone-900" data-analysis-metric="">
                  {m}
                </p>
              ))}
              {doorButton}
              {notes.map((n) => (
                <p key={n} className="text-label text-stone-600" data-analysis-note="">
                  {n}
                </p>
              ))}
            </div>
          </div>
        </LoadingVeil>
      )}
    </div>
  )
}
