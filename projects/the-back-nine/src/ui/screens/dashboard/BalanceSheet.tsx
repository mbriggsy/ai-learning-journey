/**
 * src/ui/screens/dashboard/BalanceSheet.tsx: Dashboard → Balance Sheet, the page (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC16; ref 2.2; `rc-shell/balsheet-01.png`, `balsheet-02.png`, `balsheet-03.png`). Draws `balanceSheetView.ts`'s view
 * and decides nothing.
 *
 * LAYOUT, as RightCapital draws it: the title and intro; the folder tabs Current and Details on the panel's top right.
 * Current: the headline centred with the balances' premise beside it (RightCapital's "as of"), the columns under it (one
 * per kind, each named on the axis, its balance printed above it), the stopgap lines, the R13 caveat, and the DETAILS
 * handle on the panel's bottom edge, which opens the kinds' breakdown under the panel (on the phone, a sheet). Details:
 * each kind with accounts, its total, then its accounts. No liabilities and no net worth anywhere (critique 4). The one
 * door, to Profile → Net Worth, sits at the head's right on a tab that can write. The chart rides Highcharts' lazy chunk.
 */
import { lazy, Suspense, type Ref } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Caveat, PageFrame, Tray, useWide } from '../../kit'
import { copy } from '../../copy'
import { verdictDescribedBy } from '../../disclaimerId'
import { ChartBoundary } from '../ChartBoundary'
import { chartWords } from './snapshotView'
import type { BalanceSheetView, BalanceTab } from './balanceSheetView'

const KindBars = lazy(() => import('@viz/charts/KindBars').then((m) => ({ default: m.KindBars })))

/** The chart's height in CSS px at his window (the headline, the chart, its notes and the caveat hold the first frame) and
 *  on the phone (a scrolling page: the columns stand taller). */
export const BALANCE_CHART_HEIGHT = 260
export const BALANCE_PHONE_HEIGHT = 300

const TRAY_ID = 'b9-balance-details'

const TABS = [
  { id: 'current', label: copy.balanceSheetTabCurrent },
  { id: 'details', label: copy.balanceSheetTabDetails },
] as const

export interface BalanceSheetProps {
  readonly headingRef: Ref<HTMLHeadingElement>
  readonly view: BalanceSheetView
  readonly tab: BalanceTab
  readonly onTab: (tab: BalanceTab) => void
  readonly detailsOpen: boolean
  readonly onDetailsOpen: (open: boolean) => void
  readonly caveat: readonly string[]
  /** Profile → Net Worth; drawn only where the view offers its door (a tab that can write). */
  readonly accounts: { readonly href: string; readonly onOpen: () => void }
}

function Notes({ lines }: { readonly lines: readonly string[] }) {
  return (
    <div className="laptop:columns-2 laptop:gap-x-10" data-balance-notes="">
      {lines.map((l) => (
        <p key={l} className="mb-1 break-inside-avoid text-label text-stone-600" data-balance-note="">
          {l}
        </p>
      ))}
    </div>
  )
}

function Door({ label, accounts }: { readonly label: string; readonly accounts: BalanceSheetProps['accounts'] }) {
  return (
    <a
      href={accounts.href}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        accounts.onOpen()
      }}
      className="inline-flex shrink-0 items-center gap-1 text-label text-blue-ink underline-offset-2 hover:underline"
      data-balance-door=""
    >
      {label}
      <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
    </a>
  )
}

type KindsView = Extract<BalanceSheetView, { kind: 'kinds' }>

function Current({ view }: { readonly view: KindsView }) {
  const wide = useWide()
  return (
    <div className="flex flex-col gap-3 compact:gap-2" data-balance-tab="current">
      <h2 className="flex flex-wrap items-baseline justify-center gap-x-2 text-center text-chart-title font-regular text-plum" aria-describedby={verdictDescribedBy()} data-balance-headline="">
        <span className="tabular-nums">{view.headline}</span>
        <span className="text-label text-stone-600" data-balance-as-entered="">
          {view.asEntered}
        </span>
      </h2>
      {view.chart === null ? (
        <p className="py-8 text-center text-body text-stone-900" data-balance-zero="">
          {view.zeroWords}
        </p>
      ) : (
        <div role="group" aria-label={view.chart.title} aria-describedby={verdictDescribedBy()} className="min-w-0 laptop:mx-auto laptop:w-[56rem]" data-balance-chart="">
          <ChartBoundary fallback={<p className="py-8 text-body text-stone-600">{copy.chartLoadFailed}</p>}>
            <Suspense fallback={<div aria-hidden="true" className={wide ? 'h-65' : 'h-75'} />}>
              <KindBars
                chartId="balance-kinds"
                bars={view.chart.bars}
                ticks={view.chart.ticks}
                words={{ ...chartWords(view.chart.title), description: view.chart.description }}
                height={wide ? BALANCE_CHART_HEIGHT : BALANCE_PHONE_HEIGHT}
              />
            </Suspense>
          </ChartBoundary>
        </div>
      )}
      <Notes lines={view.notes} />
    </div>
  )
}

function Details({ view }: { readonly view: KindsView }) {
  return (
    <div className="flex flex-col gap-6" data-balance-tab="details">
      <h2 className="text-center text-chart-title font-regular text-plum">{view.details.title}</h2>
      <div className="grid gap-x-12 gap-y-8 laptop:grid-cols-2" aria-describedby={verdictDescribedBy()} data-balance-groups="">
        {view.details.groups.map((g) => (
          <section key={g.id} aria-labelledby={`b9-balance-group-${g.id}`} data-balance-group={g.id}>
            <h3 id={`b9-balance-group-${g.id}`} className="flex justify-between gap-4 border-b border-stone-300 pb-2 text-body font-semibold text-stone-900">
              <span>{g.name}</span>
              <span className="tabular-nums">{g.total}</span>
            </h3>
            <ul className="flex flex-col">
              {g.accounts.map((a) => (
                <li key={a.id} className="flex justify-between gap-4 border-b border-stone-300 py-2 text-body text-stone-900" data-balance-account="">
                  <span className="min-w-0 break-words">{a.name}</span>
                  <span className="shrink-0 tabular-nums">{a.balance}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Notes lines={[view.asEntered, ...view.notes]} />
    </div>
  )
}

function Breakdown({ view }: { readonly view: KindsView }) {
  return (
    <section aria-labelledby="b9-balance-breakdown" data-balance-breakdown="">
      <h3 id="b9-balance-breakdown" className="border-b border-stone-300 pb-3 text-body font-semibold text-stone-900">
        {view.breakdown.title}
      </h3>
      <dl className="flex flex-col">
        {view.breakdown.rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4 border-b border-stone-300 py-3 text-body text-stone-900">
            <dt>{r.label}</dt>
            <dd className="tabular-nums">{r.value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-b border-stone-300 py-3 text-body font-semibold text-stone-900">
          <dt>{view.breakdown.total.label}</dt>
          <dd className="tabular-nums">{view.breakdown.total.value}</dd>
        </div>
      </dl>
      {/* The premise and the stopgap lines, as Snapshot's Invested accounts card prints them inside its card: on the phone
          this list is a full-screen sheet, so its figures never stand without the words that qualify them. */}
      <div className="mt-3 flex flex-col gap-1" data-balance-breakdown-notes="">
        {view.breakdown.notes.map((l) => (
          <p key={l} className="text-label text-stone-600" data-balance-note="">
            {l}
          </p>
        ))}
      </div>
    </section>
  )
}

export function BalanceSheet({ headingRef, view, tab, onTab, detailsOpen, onDetailsOpen, caveat, accounts }: BalanceSheetProps) {
  const door = view.door === null ? undefined : <Door label={view.door.label} accounts={accounts} />
  if (view.kind === 'empty') {
    return (
      <div className="flex w-full flex-1 flex-col bg-bg" data-screen="balance-sheet">
        <PageFrame title={copy.shellPageBalanceSheet} headingRef={headingRef} intro={view.intro} headAction={door} caveat={<Caveat lines={caveat} />}>
          <div className="flex flex-col gap-3 py-12 text-center" data-balance-page="empty">
            <p className="text-body text-stone-900">{view.words}</p>
            {view.notes.map((l) => (
              <p key={l} className="text-label text-stone-600" data-balance-note="">
                {l}
              </p>
            ))}
          </div>
        </PageFrame>
      </div>
    )
  }
  const current = tab === 'current'
  return (
    <div className="flex w-full flex-1 flex-col bg-bg" data-screen="balance-sheet">
      <PageFrame
        title={copy.shellPageBalanceSheet}
        headingRef={headingRef}
        intro={view.intro}
        headAction={door}
        tabs={{ label: copy.balanceSheetTabsLabel, items: TABS, value: tab, onValueChange: onTab }}
        caveat={<Caveat lines={caveat} />}
        {...(current
          ? {
              handle: { label: copy.balanceSheetHandle, open: detailsOpen, onOpenChange: onDetailsOpen, controls: TRAY_ID },
              tray: (
                <Tray id={TRAY_ID} open={detailsOpen} onOpenChange={onDetailsOpen} title={copy.balanceSheetHandle} closeLabel={copy.trayClose}>
                  <Breakdown view={view} />
                </Tray>
              ),
            }
          : {})}
      >
        {current ? <Current view={view} /> : <Details view={view} />}
      </PageFrame>
    </div>
  )
}
