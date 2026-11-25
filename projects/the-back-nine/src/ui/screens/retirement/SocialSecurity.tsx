/**
 * src/ui/screens/retirement/SocialSecurity.tsx: Retirement → Social Security, the page (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC9; ref 2.14). Draws `socialSecurityView.ts`'s views and decides nothing.
 *
 * LAYOUT, as RightCapital draws it: the title and intro; the folder tabs Comparison and Summary; on Comparison the chart
 * title (a menu of the two charts) with the two pickers and "vs" at the right, B9's stopgap line under them, the chart on
 * the left with the key metric (a big figure over its sentence) on the right; on Summary the title over one bar per
 * strategy with the key metric beside. The R13 caveat closes the panel, and the ACTION ITEMS handle opens the filing
 * instructions under it (instructions here, as RightCapital's are). One frame at his window per tab. The charts ride
 * Highcharts' lazy chunk.
 */
import { lazy, Suspense, type ReactNode, type Ref } from 'react'
import { Caveat, ChartTitle, LoadingVeil, PageFrame, PickerPair, Select, Tray, useWide } from '../../kit'
import { copy, slots } from '../../copy'
import { formatDeltaDollar } from '../../money'
import { verdictDescribedBy } from '../../disclaimerId'
import { ChartBoundary } from '../ChartBoundary'
import { chartWords } from '../dashboard/snapshotView'
import { compactDollars } from '../tax/summaryView'
import {
  CLAIMS_CHARTS,
  type ClaimsChart,
  type ClaimsComparisonView,
  type ClaimsSettledView,
  type ClaimsSteps,
  type ClaimsSummaryView,
  type StrategyId,
} from './socialSecurityView'

const ClaimPair = lazy(() => import('@viz/charts/ClaimCharts').then((m) => ({ default: m.ClaimPair })))
const ClaimSummaryBars = lazy(() => import('@viz/charts/ClaimCharts').then((m) => ({ default: m.ClaimSummaryBars })))

export type ClaimsTab = 'comparison' | 'summary'

/** The charts' heights in CSS px (the one frame at his window, measured on `retired` and `date`). */
export const CLAIMS_PAIR_HEIGHT = 212
export const CLAIMS_SUMMARY_HEIGHT = 240
/** On the phone (a scrolling page, no one-frame law) the charts stand taller: at his window's height the legend's two
 *  rows and the axis title left the running totals a plot so short its dollar ticks piled on each other. */
export const CLAIMS_PHONE_HEIGHT = 320

const TABS = [
  { id: 'comparison', label: copy.claimsTabComparison },
  { id: 'summary', label: copy.claimsTabSummary },
] as const

export type SocialSecurityPage =
  /** No figure yet (the answer working, withheld or failed), or no one has a benefit. */
  | { readonly kind: 'words'; readonly words: string }
  /** Everyone with a benefit already claims it. */
  | { readonly kind: 'settled'; readonly view: ClaimsSettledView }
  | { readonly kind: 'choices'; readonly comparison: ClaimsComparisonView; readonly summary: ClaimsSummaryView; readonly steps: ClaimsSteps }

export interface SocialSecurityProps {
  readonly headingRef: Ref<HTMLHeadingElement>
  readonly page: SocialSecurityPage
  readonly tab: ClaimsTab
  readonly onTab: (tab: ClaimsTab) => void
  readonly chart: ClaimsChart
  readonly onChart: (chart: ClaimsChart) => void
  readonly onPickA: (id: StrategyId) => void
  readonly onPickB: (id: StrategyId) => void
  readonly caveat: readonly string[]
  readonly trayOpen: boolean
  readonly onTrayOpen: (open: boolean) => void
}

const TRAY_ID = 'b9-claims-steps'

/** A point's spoken sentence: whose age, the series' name, its figure. */
const pointWordsFor = (axisTitle: string) => (age: number, name: string, dollars: number): string => slots.claimsYearPoint(axisTitle, age, name, formatDeltaDollar(dollars))
const figure = (dollars: number): string => slots.claimsFigure(formatDeltaDollar(dollars))
/** The same figure in the axis's `mm` dialect, three figures: a phone's narrow plot has no room for the full one. */
const compactFigure = (dollars: number): string => slots.claimsFigure(compactDollars(dollars))

function Lines({ lines, hook, className = 'text-label text-stone-600' }: { readonly lines: readonly string[]; readonly hook: string; readonly className?: string }) {
  return (
    <>
      {lines.map((n) => (
        <p key={n} className={className} {...{ [`data-claims-${hook}`]: '' }}>
          {n}
        </p>
      ))}
    </>
  )
}

function Metric({ hero, line, more }: { readonly hero: string; readonly line: string; readonly more?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 text-center compact:gap-1" data-metrics="">
      <p className="text-[1.75rem] leading-tight font-semibold text-stone-900 tabular-nums compact:text-[1.5rem]" data-claims-hero="">
        {hero}
      </p>
      {line !== '' ? (
        <p className="text-body text-stone-600" data-claims-hero-line="">
          {line}
        </p>
      ) : null}
      {more}
    </div>
  )
}

function ComparisonBody({ view, chart, onChart, onPickA, onPickB }: { readonly view: ClaimsComparisonView; readonly chart: ClaimsChart; readonly onChart: (c: ClaimsChart) => void; readonly onPickA: (id: StrategyId) => void; readonly onPickB: (id: StrategyId) => void }) {
  const wide = useWide()
  return (
    <div className="flex flex-col gap-3 compact:gap-2" data-claims-comparison={view.kind} data-claims-chart={chart}>
      <div className="flex flex-col items-center gap-3 laptop:grid laptop:grid-cols-[1fr_auto_1fr]">
        <span aria-hidden="true" className="hidden laptop:block" />
        <div className="flex justify-center">
          <ChartTitle items={CLAIMS_CHARTS} value={chart} onValueChange={onChart} />
        </div>
        <div className="flex justify-center laptop:justify-end" data-claims-pickers="">
          <PickerPair
            vsLabel={copy.probabilityVs}
            left={<Select label={copy.claimsPickerA} hideLabel items={view.items} value={view.a} onValueChange={onPickA} />}
            right={<Select label={copy.claimsPickerB} hideLabel items={view.items} value={view.b} onValueChange={onPickB} />}
          />
        </div>
      </div>
      {/* The stopgap (map gap 7), one line under the pickers. */}
      <p className="text-center text-label text-stone-600 laptop:text-right" data-claims-stopgap="">
        {copy.claimsStopgap}
      </p>
      {view.kind === 'words' ? (
        <div className="flex flex-col gap-2 py-8 text-center" data-claims-words="">
          <p className="text-body text-stone-900">{view.words}</p>
          <Lines lines={view.side} hook="side" />
        </div>
      ) : (
        <LoadingVeil loading={view.updating} label={copy.claimsRunsWaiting}>
          <div className="flex flex-col gap-6 laptop:grid laptop:grid-cols-[7fr_3fr] laptop:items-center laptop:gap-10">
            <div role="group" aria-label={view.title} aria-describedby={verdictDescribedBy()} className="min-w-0" data-claims-pair="">
              <ChartBoundary fallback={<p className="py-8 text-body text-stone-600">{copy.chartLoadFailed}</p>}>
                <Suspense fallback={<div aria-hidden="true" className="h-53" />}>
                  <ClaimPair
                    chartId={view.chart === 'annual' ? 'claims-annual' : 'claims-cumulative'}
                    kind={view.chart}
                    series={view.series}
                    axisTitle={view.axisTitle}
                    lattice={view.lattice}
                    axisDollar={view.axisDollar}
                    figure={wide ? figure : compactFigure}
                    pointWords={pointWordsFor(view.axisTitle)}
                    {...(view.crossing !== undefined ? { crossing: view.crossing } : {})}
                    words={{ ...chartWords(view.title), description: view.description }}
                    height={wide ? CLAIMS_PAIR_HEIGHT : CLAIMS_PHONE_HEIGHT}
                  />
                </Suspense>
              </ChartBoundary>
            </div>
            <Metric hero={view.hero} line={view.heroLine} more={<Lines lines={view.side} hook="side" />} />
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <Lines lines={view.notes} hook="note" />
          </div>
        </LoadingVeil>
      )}
    </div>
  )
}

function SummaryBody({ view }: { readonly view: ClaimsSummaryView }) {
  const wide = useWide()
  if (view.kind === 'words') {
    return (
      <div className="flex flex-col gap-2 py-12 text-center" data-claims-summary="words">
        <p className="text-body text-stone-900">{view.words}</p>
        <Lines lines={view.side} hook="side" />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3 compact:gap-2" data-claims-summary="bars">
      <h2 className="text-center text-chart-title font-regular text-plum">{view.title}</h2>
      <LoadingVeil loading={view.updating} label={copy.claimsRunsWaiting}>
        <div className="flex flex-col gap-6 laptop:grid laptop:grid-cols-[7fr_3fr] laptop:items-center laptop:gap-10">
          <div role="group" aria-label={view.title} aria-describedby={verdictDescribedBy()} className="min-w-0" data-claims-bars="">
            <ChartBoundary fallback={<p className="py-8 text-body text-stone-600">{copy.chartLoadFailed}</p>}>
              <Suspense fallback={<div aria-hidden="true" className="h-60" />}>
                <ClaimSummaryBars
                  chartId="claims-summary"
                  bars={view.bars.map((b) => ({ id: b.id, name: b.name, total: b.total, figure: wide ? b.figure : b.compactFigure, odds: b.odds, role: b.role, point: b.point }))}
                  names={{ alternative: copy.claimsBarsOther, compared: copy.claimsStrategyPlan }}
                  narrow={!wide}
                  lattice={view.lattice}
                  axisDollar={view.axisDollar}
                  words={{ ...chartWords(view.title), description: view.description }}
                  height={wide ? CLAIMS_SUMMARY_HEIGHT : CLAIMS_PHONE_HEIGHT}
                />
              </Suspense>
            </ChartBoundary>
          </div>
          <Metric
            hero={view.hero}
            line={view.heroLine}
            more={
              <>
                {view.oddsLine !== '' ? (
                  <p className="text-body text-stone-900" data-claims-odds-line="">
                    {view.oddsLine}
                  </p>
                ) : null}
                <Lines lines={view.side} hook="side" />
              </>
            }
          />
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <Lines lines={view.notes} hook="note" />
        </div>
      </LoadingVeil>
    </div>
  )
}

function Steps({ steps }: { readonly steps: ClaimsSteps }) {
  return (
    <div className="flex flex-col gap-4 laptop:col-span-2" data-claims-steps="">
      <h3 className="text-body font-semibold text-stone-900">{steps.heading}</h3>
      <ol className="flex max-w-3xl flex-col">
        {steps.steps.map((s, i) => (
          <li key={s} className="border-b border-stone-300 py-3 text-body text-stone-900 tabular-nums" data-claims-step="">
            {`${i + 1}. ${s}`}
          </li>
        ))}
      </ol>
      <p className="text-label text-stone-600">{steps.note}</p>
    </div>
  )
}

export function SocialSecurity({ headingRef, page, tab, onTab, chart, onChart, onPickA, onPickB, caveat, trayOpen, onTrayOpen }: SocialSecurityProps) {
  const choices = page.kind === 'choices'
  const caveatNode = <Caveat lines={caveat} />
  const body =
    page.kind === 'words' ? (
      <p className="py-12 text-center text-body text-stone-900" data-claims-page="words">
        {page.words}
      </p>
    ) : page.kind === 'settled' ? (
      <div className="flex flex-col gap-2 py-8 text-center" data-claims-page="settled">
        {page.view.lines.map((l, i) => (
          <p key={l} className={i === 0 ? 'text-body font-semibold text-stone-900' : 'text-body text-stone-900'} data-claims-settled="">
            {l}
          </p>
        ))}
        <div className="mt-3 flex flex-col gap-1">
          <Lines lines={page.view.notes} hook="note" />
        </div>
      </div>
    ) : tab === 'comparison' ? (
      <ComparisonBody view={page.comparison} chart={chart} onChart={onChart} onPickA={onPickA} onPickB={onPickB} />
    ) : (
      <SummaryBody view={page.summary} />
    )
  return (
    <div className="flex w-full flex-1 flex-col bg-bg" data-screen="social-security" data-claims-tab={choices ? tab : undefined}>
      <PageFrame
        title={copy.shellPageSocialSecurity}
        headingRef={headingRef}
        intro={copy.claimsIntro}
        valuesNote={copy.probabilityTodaysDollars}
        {...(choices ? { tabs: { label: copy.claimsTabsLabel, items: TABS, value: tab, onValueChange: onTab } } : {})}
        caveat={caveatNode}
        {...(choices
          ? {
              handle: { label: copy.trayHandle, open: trayOpen, onOpenChange: onTrayOpen, controls: TRAY_ID },
              tray: (
                <Tray id={TRAY_ID} open={trayOpen} onOpenChange={onTrayOpen} title={copy.trayHandle} closeLabel={copy.trayClose}>
                  <Steps steps={page.steps} />
                </Tray>
              ),
            }
          : {})}
      >
        {body}
      </PageFrame>
    </div>
  )
}
