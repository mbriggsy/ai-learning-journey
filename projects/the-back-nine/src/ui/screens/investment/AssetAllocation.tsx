/**
 * src/ui/screens/investment/AssetAllocation.tsx: Investment → Asset Allocation, the page (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC12; ref 2.19; `rc-cashflow-tax/help-investment-asset-allocation-51.png`,
 * `-54-later.png`). Draws `investmentView.ts`'s view and decides nothing.
 *
 * LAYOUT, as RightCapital draws it: the title and intro; two folder tabs, Summary and Detail. Summary: two thick donuts
 * facing each other, "Current mix" (its picker: all accounts, a person's, a tax bucket's) and "What-if mix" (the mix of the
 * what-if open on Analysis, or the words saying there is none, with a door to try one), each centre printing stocks
 * against bonds and cash; between them the table of each part's current and what-if share. No annual return or standard
 * deviation lines (no engine output stands behind them). Detail: the same scope picker (its Current column reads the
 * accounts shown), then a table of each part (what the run grows it as, what it is held as, current, what-if) beside
 * diverging bars centred on 0. Under either: the one-mix line (under a scope narrower than all accounts: the run grows
 * every account at the household's one blend), the one-split note and the cash line, then the R13 caveat closing the panel. The charts ride Highcharts'
 * lazy chunk.
 */
import { lazy, Suspense, type Ref } from 'react'
import { Button, Caveat, PageFrame, Select, useWide } from '../../kit'
import { copy, slots } from '../../copy'
import { verdictDescribedBy } from '../../disclaimerId'
import { ChartBoundary } from '../ChartBoundary'
import { chartWords } from '../dashboard/snapshotView'
import { Swatch } from './Swatch'
import type { AssetMixView, AssetAllocationView, AssetTab, MixDonut, MixScope } from './investmentView'

const Donut = lazy(() => import('@viz/charts/InvestmentCharts').then((m) => ({ default: m.Donut })))
const MixShift = lazy(() => import('@viz/charts/InvestmentCharts').then((m) => ({ default: m.MixShift })))

/** Each donut's side in CSS px at a laptop width (the two donuts, the table, the notes and the caveat hold his first
 *  frame) and on the phone. */
export const MIX_DONUT_SIZE = 200
export const MIX_PHONE_SIZE = 220

const TABS = [
  { id: 'summary', label: copy.assetTabSummary },
  { id: 'detail', label: copy.assetTabDetail },
] as const

export interface AssetAllocationProps {
  readonly headingRef: Ref<HTMLHeadingElement>
  readonly view: AssetAllocationView
  readonly tab: AssetTab
  readonly onTab: (tab: AssetTab) => void
  readonly onScope: (scope: MixScope) => void
  /** The door where there is no what-if mix: Analysis with its Action Items open at the mix. */
  readonly onTryMix: () => void
  readonly caveat: readonly string[]
}

function Centre({ donut }: { readonly donut: MixDonut }) {
  return (
    <p className="text-[1.125rem] leading-tight font-semibold text-stone-900 tabular-nums" data-asset-centre="">
      {donut.centre}
    </p>
  )
}

function MixDonutChart({ id, donut, description }: { readonly id: string; readonly donut: MixDonut; readonly description: string }) {
  const wide = useWide()
  const size = wide ? MIX_DONUT_SIZE : MIX_PHONE_SIZE
  const title = id === 'mix-current' ? copy.assetCurrentTitle : copy.assetWhatIfTitle
  return (
    <div role="group" aria-label={title} aria-describedby={verdictDescribedBy()} className="flex flex-col items-center gap-2" data-asset-donut={id}>
      <ChartBoundary fallback={<p className="py-8 text-body text-stone-600">{copy.chartLoadFailed}</p>}>
        <Suspense fallback={<div aria-hidden="true" className={wide ? 'h-54 w-50' : 'h-59 w-55'} />}>
          <Donut
            chartId={id}
            className="b9-mix"
            parts={donut.slices.map((s) => ({ id: s.id, share: s.share, colorIndex: s.colorIndex, pattern: s.pattern, point: s.point }))}
            words={{ ...chartWords(title), description }}
            size={size}
            picked={null}
            pickable={false}
            centre={<Centre donut={donut} />}
          />
        </Suspense>
      </ChartBoundary>
      <p className="text-label text-stone-600" data-asset-centre-words="">
        {copy.assetCentreWords}
      </p>
    </div>
  )
}

function Legend({ view }: { readonly view: AssetMixView }) {
  const withWhatIf = view.rows.some((r) => r.whatIf !== null)
  return (
    <table aria-label={copy.assetTableTitle} className="w-full border-collapse tabular-nums" data-asset-legend="">
      <thead>
        <tr className="border-b border-stone-300 text-label text-stone-600">
          <th scope="col" className="py-2 pr-4 text-right font-regular">
            {copy.assetColCurrent}
          </th>
          <th scope="col" className="py-2 text-left font-regular">
            {copy.assetColPart}
          </th>
          {withWhatIf ? (
            <th scope="col" className="py-2 pl-4 text-right font-regular">
              {copy.assetColWhatIf}
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {view.rows.map((r) => (
          <tr key={r.part} className="border-b border-stone-300 text-body text-stone-900" data-asset-row={r.part}>
            <td className="py-2 pr-4 text-right" data-asset-current="">
              {r.current}
            </td>
            <th scope="row" className="py-2 text-left font-regular">
              <span className="flex items-center gap-2">
                <Swatch colorIndex={r.colorIndex} pattern={r.pattern} />
                {r.name}
              </span>
            </th>
            {withWhatIf ? (
              <td className="py-2 pl-4 text-right" data-asset-whatif="">
                {r.whatIf}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Where there is no what-if mix: the words in the donut's place, and the door to try one. */
function NoWhatIf({ words, onTryMix, tall }: { readonly words: string; readonly onTryMix: () => void; readonly tall: boolean }) {
  return (
    <div className={tall ? 'flex min-h-54 flex-col items-center justify-center gap-3 text-center' : 'flex flex-col items-center gap-3 text-center'} data-asset-none="">
      <p className="text-body font-semibold text-stone-600">{copy.assetNoWhatIf}</p>
      <p className="max-w-64 text-label text-stone-600">{words}</p>
      <Button variant="secondary" onClick={onTryMix} data-asset-try="">
        {copy.assetTryMix}
      </Button>
    </div>
  )
}

function Notes({ view }: { readonly view: AssetMixView }) {
  return (
    <div className="laptop:columns-2 laptop:gap-x-10" data-asset-notes="">
      {view.notes.map((l) => (
        <p key={l} className="mb-1 break-inside-avoid text-label text-stone-600" data-asset-note="">
          {l}
        </p>
      ))}
    </div>
  )
}

function Summary({ view, onScope, onTryMix }: { readonly view: AssetMixView; readonly onScope: (scope: MixScope) => void; readonly onTryMix: () => void }) {
  const titleClasses = 'text-center text-chart-title font-regular text-plum'
  return (
    <div className="flex flex-col gap-6 compact:gap-3" data-asset="summary">
      <div className="flex flex-col gap-8 laptop:grid laptop:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)_minmax(0,1fr)] laptop:items-start laptop:gap-10">
        <section aria-label={copy.assetCurrentTitle} className="flex flex-col items-center gap-3 compact:gap-2" data-asset-side="current">
          <h2 className={titleClasses}>{copy.assetCurrentTitle}</h2>
          <Select label={copy.assetScopeLabel} hideLabel items={view.scopes} value={view.scope} onValueChange={onScope} className="w-64 max-w-full" />
          <MixDonutChart id="mix-current" donut={view.current} description={copy.assetDonutDescription} />
        </section>
        <div className="flex flex-col gap-3 laptop:pt-24 compact:pt-20" data-asset-middle="">
          <Legend view={view} />
        </div>
        <section aria-label={copy.assetWhatIfTitle} className="flex flex-col items-center gap-3 compact:gap-2" data-asset-side="what-if">
          <h2 className={titleClasses}>{copy.assetWhatIfTitle}</h2>
          {view.whatIf.kind === 'mix' ? (
            <>
              {/* The what-if's name sits where the current side's picker does, so the two donuts stand level. */}
              <p className="flex min-h-10 items-center text-center text-label text-stone-600" data-asset-from="">
                {view.whatIf.from}
              </p>
              <MixDonutChart id="mix-what-if" donut={view.whatIf.donut} description={copy.assetWhatIfDescription} />
            </>
          ) : (
            <NoWhatIf words={view.whatIf.words} onTryMix={onTryMix} tall />
          )}
        </section>
      </div>
      <Notes view={view} />
    </div>
  )
}

function Detail({ view, onScope, onTryMix }: { readonly view: AssetMixView; readonly onScope: (scope: MixScope) => void; readonly onTryMix: () => void }) {
  const wide = useWide()
  const besideTable = wide
  const withWhatIf = view.detail.axisMax !== null
  const cell = 'h-12 py-0 align-middle'
  return (
    <div className="flex flex-col gap-6 compact:gap-3" data-asset="detail">
      {/* The Current column reads the accounts shown, so the picker that sets them stands over the table (its label shown:
          no "Current mix" title names it here). */}
      <Select label={copy.assetScopeLabel} items={view.scopes} value={view.scope} onValueChange={onScope} className="w-64 max-w-full" />
      <div className="flex flex-col gap-6 wide:grid wide:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] wide:items-start wide:gap-8">
        <table aria-label={copy.assetTableTitle} className="w-full border-collapse tabular-nums" data-asset-detail-table="">
          <thead>
            <tr className="h-11 border-b-2 border-stone-300 bg-stone-200 text-label text-stone-900">
              <th scope="col" className="px-2 text-left font-semibold whitespace-nowrap wide:px-3">
                {copy.assetColGrowsLike}
              </th>
              <th scope="col" className="px-2 text-left font-semibold whitespace-nowrap wide:px-3">
                {copy.assetColPart}
              </th>
              <th scope="col" className="px-2 text-right font-semibold whitespace-nowrap wide:px-3">
                {copy.assetColCurrent}
              </th>
              {withWhatIf ? (
                <th scope="col" className="px-2 text-right font-semibold whitespace-nowrap wide:px-3">
                  {copy.assetColWhatIf}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {view.detail.rows.map((r) => (
              <tr key={r.part} className="border-b border-stone-300 text-body text-stone-900" data-asset-detail-row={r.part}>
                {r.groupStart ? (
                  <td rowSpan={r.groupSize} className={`${cell} border-r border-stone-300 px-2 wide:px-3`} data-asset-grows-like="">
                    {r.growsLike}
                  </td>
                ) : null}
                <th scope="row" className={`${cell} px-2 text-left font-regular wide:px-3`}>
                  <span className="flex items-center gap-2">
                    <Swatch colorIndex={r.colorIndex} pattern={r.pattern} />
                    {r.name}
                  </span>
                </th>
                <td className={`${cell} px-2 text-right wide:px-3`}>{r.current}</td>
                {withWhatIf ? <td className={`${cell} px-2 text-right wide:px-3`}>{r.whatIf}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
        {withWhatIf && view.detail.axisMax !== null ? (
          <div role="group" aria-label={copy.assetShiftTitle} aria-describedby={verdictDescribedBy()} className="min-w-0" data-asset-shift="">
            <ChartBoundary fallback={<p className="py-8 text-body text-stone-600">{copy.chartLoadFailed}</p>}>
              <Suspense fallback={<div aria-hidden="true" className="h-55" />}>
                <MixShift
                  chartId="mix-shift"
                  bars={view.detail.rows.map((r) => ({
                    id: r.part,
                    name: r.name,
                    shift: r.shift ?? 0,
                    text: r.shiftText ?? '',
                    colorIndex: r.colorIndex,
                    pattern: r.pattern,
                    point: slots.assetShiftPoint(r.name, r.shiftText ?? ''),
                  }))}
                  axisMax={view.detail.axisMax}
                  words={{ ...chartWords(copy.assetShiftTitle), description: copy.assetShiftDescription }}
                  besideTable={besideTable}
                  tickText={slots.assetShift}
                />
              </Suspense>
            </ChartBoundary>
          </div>
        ) : (
          <NoWhatIf words={view.whatIf.kind === 'none' ? view.whatIf.words : copy.assetNoWhatIfOpen} onTryMix={onTryMix} tall={false} />
        )}
      </div>
      <Notes view={view} />
    </div>
  )
}

export function AssetAllocation({ headingRef, view, tab, onTab, onScope, onTryMix, caveat }: AssetAllocationProps) {
  return (
    <div className="flex w-full flex-1 flex-col bg-bg" data-screen="asset-allocation">
      <PageFrame
        title={copy.shellPageAssetAllocation}
        headingRef={headingRef}
        intro={copy.assetIntro}
        caveat={<Caveat lines={caveat} />}
        {...(view.kind === 'mix' ? { tabs: { label: copy.assetTabsLabel, items: TABS, value: tab, onValueChange: onTab } } : {})}
      >
        {view.kind === 'words' ? (
          <div className="flex flex-col gap-2 py-12 text-center" data-asset-page="words">
            {view.words.map((w) => (
              <p key={w} className="text-body text-stone-900">
                {w}
              </p>
            ))}
          </div>
        ) : tab === 'summary' ? (
          <Summary view={view} onScope={onScope} onTryMix={onTryMix} />
        ) : (
          <Detail view={view} onScope={onScope} onTryMix={onTryMix} />
        )}
      </PageFrame>
    </div>
  )
}
