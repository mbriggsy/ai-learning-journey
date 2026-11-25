/**
 * src/ui/screens/investment/TaxAllocation.tsx: Investment → Tax Allocation, the page (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC12; ref 2.19; `rc-cashflow-tax/help-investment-tax-allocation-51-later.png`).
 * Draws `investmentView.ts`'s view and decides nothing.
 *
 * LAYOUT, as RightCapital draws it: the title and intro; one panel with no folder tabs; the chart's title centred; the
 * donut of the savings by tax treatment (taxable, pre-tax, Roth, HSA, each its own pattern) on the left, "Your savings"
 * and the total in its hole, beside each part's big figure with its key mark and its word. Picking a part, on the ring or
 * by its figure, lists that part's accounts under them (the figure's button is the keyboard's and the screen reader's
 * way in; the slice is the pointer's). Under them: the balances as entered and what B9 does not ask about (Snapshot's two
 * lines beside the same sums). The R13 caveat closes the panel. The chart rides Highcharts' lazy chunk.
 */
import { lazy, Suspense, type Ref } from 'react'
import { Caveat, cn, PageFrame } from '../../kit'
import { copy } from '../../copy'
import { verdictDescribedBy } from '../../disclaimerId'
import { ChartBoundary } from '../ChartBoundary'
import { chartWords } from '../dashboard/snapshotView'
import { Swatch } from './Swatch'
import type { TaxAllocationView, TaxBucketId } from './investmentView'

const Donut = lazy(() => import('@viz/charts/InvestmentCharts').then((m) => ({ default: m.Donut })))

/** The donut's side in CSS px, at a laptop width and on the phone alike. */
export const TAX_DONUT_SIZE = 240

const LIST_ID = 'b9-taxalloc-list'

export interface TaxAllocationProps {
  readonly headingRef: Ref<HTMLHeadingElement>
  readonly view: TaxAllocationView
  /** Pick a part (the same part again puts the list away). */
  readonly onPick: (bucket: TaxBucketId | null) => void
  readonly caveat: readonly string[]
}

function Parts({ view, onPick }: { readonly view: Extract<TaxAllocationView, { kind: 'buckets' }>; readonly onPick: (bucket: TaxBucketId | null) => void }) {
  const pick = (id: TaxBucketId) => onPick(view.picked === id ? null : id)
  return (
    <div className="flex flex-col gap-6 compact:gap-3" data-taxalloc="">
      <h2 className="text-center text-chart-title font-regular text-plum">{copy.taxAllocTitle}</h2>
      <div className="flex flex-col items-center gap-8 laptop:grid laptop:grid-cols-[auto_minmax(0,1fr)] laptop:gap-16">
        <div role="group" aria-label={copy.taxAllocTitle} aria-describedby={verdictDescribedBy()} data-taxalloc-donut="">
          <ChartBoundary fallback={<p className="py-8 text-body text-stone-600">{copy.chartLoadFailed}</p>}>
            <Suspense fallback={<div aria-hidden="true" className="h-64 w-60" />}>
              <Donut
                chartId="tax-allocation"
                className="b9-taxalloc"
                parts={view.buckets.filter((b) => b.share > 0).map((b) => ({ id: b.id, share: b.share, colorIndex: b.colorIndex, pattern: b.pattern, point: b.point }))}
                words={{ ...chartWords(copy.taxAllocTitle), description: copy.taxAllocDescription }}
                size={TAX_DONUT_SIZE}
                picked={view.picked}
                pickable
                onPick={(id) => pick(id as TaxBucketId)}
                centre={
                  <>
                    <p className="text-label text-stone-600">{copy.taxAllocCentre}</p>
                    <p className="text-[1.125rem] leading-tight font-semibold text-stone-900 tabular-nums" data-taxalloc-total="">
                      {view.total}
                    </p>
                  </>
                }
              />
            </Suspense>
          </ChartBoundary>
        </div>
        <div role="group" aria-label={copy.taxAllocPartsLabel} className="flex w-full flex-wrap justify-center gap-x-6 gap-y-4 wide:gap-x-12" data-taxalloc-parts="">
          {view.buckets.map((b) => {
            const on = view.picked === b.id
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={on}
                aria-controls={LIST_ID}
                onClick={() => pick(b.id)}
                className={cn(
                  'flex min-w-36 cursor-pointer flex-col items-center gap-1 rounded-control border-b-3 px-3 pt-2 pb-1.5 text-center hover:bg-stone-100',
                  on ? 'border-b-stone-900' : 'border-b-transparent',
                )}
                data-taxalloc-part={b.id}
              >
                <span className={cn('text-metric text-stone-900 tabular-nums', on ? 'font-semibold' : 'font-regular')}>{b.figure}</span>
                <span className={cn('flex items-center gap-2 text-body text-stone-900', on && 'font-semibold underline underline-offset-4')}>
                  <Swatch colorIndex={b.colorIndex} pattern={b.pattern} />
                  {b.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div id={LIST_ID} className="flex min-h-12 flex-col gap-2 laptop:mx-auto laptop:w-[36rem]" data-taxalloc-list="">
        {view.list === null ? (
          <p className="text-center text-label text-stone-600" data-taxalloc-hint="">
            {copy.taxAllocHint}
          </p>
        ) : (
          <>
            <h3 className="text-body font-semibold text-stone-900">{view.list.title}</h3>
            <ul className="flex flex-col">
              {view.list.rows.map((r, i) => (
                <li key={`${r.name}-${i}`} className="flex justify-between gap-4 border-b border-stone-300 py-1.5 text-body text-stone-900" data-taxalloc-account="">
                  <span className="min-w-0 break-words">{r.name}</span>
                  <span className="shrink-0 tabular-nums">{r.figure}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="laptop:columns-2 laptop:gap-x-10" data-taxalloc-notes="">
        {view.notes.map((l) => (
          <p key={l} className="mb-1 break-inside-avoid text-label text-stone-600" data-taxalloc-note="">
            {l}
          </p>
        ))}
      </div>
    </div>
  )
}

export function TaxAllocation({ headingRef, view, onPick, caveat }: TaxAllocationProps) {
  return (
    <div className="flex w-full flex-1 flex-col bg-bg" data-screen="tax-allocation">
      <PageFrame title={copy.shellPageTaxAllocation} headingRef={headingRef} intro={copy.taxAllocIntro} caveat={<Caveat lines={caveat} />}>
        {view.kind === 'words' ? (
          <div className="flex flex-col gap-2 py-12 text-center" data-taxalloc-page="words">
            {view.words.map((w) => (
              <p key={w} className="text-body text-stone-900">
                {w}
              </p>
            ))}
          </div>
        ) : (
          <Parts view={view} onPick={onPick} />
        )}
      </PageFrame>
    </div>
  )
}
