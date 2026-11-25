/**
 * src/ui/screens/retirement/HealthCare.tsx: Retirement → Health Care, the page (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC10; ref 2.15 corrected by critique 9). Draws `healthCareView.ts`'s views and decides nothing.
 *
 * LAYOUT, as RightCapital draws its summary: the title and intro; one folder tab, Cost Analysis (Medicare Options and
 * Preferences are left out: their tick-and-cross matrix needs answers B9 does not ask); inside the panel the chart's
 * title, then the four small charts in a two-by-two grid on the left (each part's name and its legend's one item over
 * it) with the key-metric column on the right. The first frame at his window holds those. Under them the sheet's own
 * words for each part, the page's notes, and the R13 caveat closing the panel; the ACTION ITEMS handle opens B9's health
 * inputs under it. The charts ride Highcharts' lazy chunk.
 */
import { lazy, Suspense, type Ref } from 'react'
import { Button, Caveat, LoadingVeil, PageFrame, Tray, useWide } from '../../kit'
import { copy, slots } from '../../copy'
import { verdictDescribedBy } from '../../disclaimerId'
import type { HealthFact } from '../../healthSheetChrome'
import type { FactDoorId } from '../../workbench/factRegistry'
import type { WhatIfLeverKind } from '@shared/model'
import { ChartBoundary } from '../ChartBoundary'
import { chartWords } from '../dashboard/snapshotView'
import type { HealthChartsView, HealthCareView, HealthTrayView } from './healthCareView'

const HealthPartChart = lazy(() => import('@viz/charts/HealthCharts').then((m) => ({ default: m.HealthPartChart })))

/** Each small chart's height in CSS px at his window (the four and the column hold the first frame), and on the phone
 *  (a scrolling page: the charts stand taller so their ages and dollars stay apart). */
export const HEALTH_PART_HEIGHT = 146
export const HEALTH_PHONE_HEIGHT = 180

const TABS = [{ id: 'cost', label: copy.healthTabCost }] as const
const TRAY_ID = 'b9-health-inputs'

export interface HealthCareProps {
  readonly headingRef: Ref<HTMLHeadingElement>
  readonly view: HealthCareView
  /** The Action Items tray's view; absent where the page has no figure (no handle then). */
  readonly tray?: HealthTrayView
  readonly caveat: readonly string[]
  readonly trayOpen: boolean
  readonly onTrayOpen: (open: boolean) => void
  /** The subsidy rules row: open Analysis with the tray at that lever's row (the what-if is tried there). */
  readonly onTryLever: (lever: WhatIfLeverKind) => void
  /** A fact row's door: its Profile drawer. */
  readonly onOpenFact: (door: FactDoorId) => void
}

function Fact({ fact }: { readonly fact: HealthFact }) {
  return (
    <section aria-label={fact.eyebrow} className="flex flex-col gap-1" data-health-fact-card={fact.id}>
      <p className="text-label text-stone-900">
        <span className="font-semibold">{fact.eyebrow}</span>
        {fact.figure !== undefined ? (
          <span aria-hidden="true" className="tabular-nums">
            {` · ${fact.figure}`}
          </span>
        ) : null}
      </p>
      {fact.lines.map((l) => (
        <p key={l} className="text-label text-stone-600">
          {l}
        </p>
      ))}
    </section>
  )
}

function Charts({ view }: { readonly view: HealthChartsView }) {
  const wide = useWide()
  return (
    <div className="flex flex-col gap-3 compact:gap-2" data-health-route={view.route}>
      <div className="flex flex-col items-center gap-0.5">
        <h2 className="text-center text-chart-title font-regular text-plum">{view.title}</h2>
        {/* One age axis for all four (small multiples): whose age it is, said once. */}
        <p className="text-center text-label text-stone-600" data-health-axis="">
          {slots.healthAxisNote(view.axisTitle)}
        </p>
      </div>
      <LoadingVeil loading={view.updating} label={copy.healthRowsWaiting}>
        <div className="flex flex-col gap-6 laptop:grid laptop:grid-cols-[7fr_3fr] laptop:items-center laptop:gap-10">
          <div role="group" aria-label={view.title} aria-describedby={verdictDescribedBy()} className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-2 laptop:grid-cols-2" data-health-charts="">
            {view.parts.map((part) => (
              <div key={part.id} className="flex min-w-0 flex-col" data-health-part={part.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h3 className="text-label font-semibold text-stone-900">{part.title}</h3>
                  {/* The legend's one item, a chip and its words (colour carries nothing: the title names the part). */}
                  <span className="flex shrink-0 items-center gap-1.5 text-axis text-stone-600" data-health-legend="">
                    <span aria-hidden="true" className="inline-block size-2.5 rounded-[2px] bg-blue" />
                    {part.legend}
                  </span>
                </div>
                <ChartBoundary fallback={<p className="py-8 text-body text-stone-600">{copy.chartLoadFailed}</p>}>
                  <Suspense fallback={<div aria-hidden="true" className={wide ? 'h-35' : 'h-45'} />}>
                    <HealthPartChart
                      chartId={`health-${part.id}`}
                      id={part.id}
                      name={part.title}
                      bars={part.bars}
                      cliff={part.cliff}
                      ages={view.ages}
                      axisTitle={view.axisTitle}
                      lattice={view.lattice}
                      axisDollar={view.axisDollar}
                      words={{ ...chartWords(part.title), description: view.description }}
                      height={wide ? HEALTH_PART_HEIGHT : HEALTH_PHONE_HEIGHT}
                    />
                  </Suspense>
                </ChartBoundary>
                {/* The cliff count's key, in the chart's own box whenever a bracket draws. */}
                {part.cliffKey !== undefined ? (
                  <p className="text-axis text-stone-600" data-health-cliff-key="">
                    {part.cliffKey}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 text-center compact:gap-1" data-metrics="">
            {view.hero !== '' ? (
              <p className="text-[1.75rem] leading-tight font-semibold text-stone-900 tabular-nums compact:text-[1.5rem]" data-health-hero="">
                {view.hero}
              </p>
            ) : null}
            {view.heroLine !== '' ? <p className="text-body text-stone-600">{view.heroLine}</p> : null}
            {view.metricLines.map((l) => (
              <p key={l} className="text-label text-stone-900 tabular-nums" data-health-metric="">
                {l}
              </p>
            ))}
          </div>
        </div>
        {/* The groups flow in two columns at his window (a group never splits), so a long group leaves no hole beside it. */}
        <div className="mt-6 laptop:columns-2 laptop:gap-x-10" data-health-notes="">
          {view.notes.map((g) => (
            <section key={g.id} aria-label={g.title} className="mb-5 flex break-inside-avoid flex-col gap-3" data-health-note-group={g.id}>
              <h3 className="text-body font-semibold text-stone-900">{g.title}</h3>
              {g.facts.map((f) => (
                <Fact key={f.id} fact={f} />
              ))}
              {g.lines.map((l) => (
                <p key={l} className="text-label text-stone-600" data-health-note="">
                  {l}
                </p>
              ))}
            </section>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-1" data-health-footnotes="">
          {view.footnotes.map((l) => (
            <p key={l} className="text-label text-stone-600" data-health-footnote="">
              {l}
            </p>
          ))}
        </div>
      </LoadingVeil>
    </div>
  )
}

function TrayBody({ tray, onTryLever, onOpenFact }: { readonly tray: HealthTrayView; readonly onTryLever: (lever: WhatIfLeverKind) => void; readonly onOpenFact: (door: FactDoorId) => void }) {
  return (
    <div className="flex flex-col gap-6 laptop:col-span-2" data-health-tray="">
      {tray.aca !== undefined ? (
        <section className="flex flex-col gap-2" aria-label={copy.healthTrayTry}>
          <h3 className="text-body font-semibold text-stone-900">{copy.healthTrayTry}</h3>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-300 py-3" data-health-tray-aca="">
            <p className="text-body text-stone-900">
              <span className="font-semibold">{tray.aca.label}</span>
              {`: ${tray.aca.value}`}
            </p>
            <Button variant="secondary" size="sm" onClick={() => onTryLever(tray.aca!.lever)}>
              {copy.healthTrayTryAca}
            </Button>
            <p className="w-full text-label text-stone-600">{tray.aca.help}</p>
          </div>
        </section>
      ) : null}
      {tray.facts.length > 0 ? (
        <section className="flex flex-col gap-2" aria-label={copy.healthTrayFacts}>
          <h3 className="text-body font-semibold text-stone-900">{copy.healthTrayFacts}</h3>
          <p className="text-label text-stone-600">{tray.factsNote}</p>
          {tray.facts.map((f) => (
            <div key={f.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-300 py-3" data-health-tray-fact={f.id}>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-body font-semibold text-stone-900">{f.title}</p>
                {f.rows.map((r, i) => (
                  <p key={`${r.heading ?? ''}${r.label}${i}`} className="text-label text-stone-600 tabular-nums">
                    {r.heading !== undefined ? `${r.heading}: ` : ''}
                    {`${r.label} ${r.value}`}
                  </p>
                ))}
              </div>
              {f.door !== null ? (
                <Button variant="secondary" size="sm" aria-label={slots.workbenchFactsEditName(f.title)} data-fact-open={f.door} onClick={() => onOpenFact(f.door!)}>
                  {copy.workbenchFactsEdit}
                </Button>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}

export function HealthCare({ headingRef, view, tray, caveat, trayOpen, onTrayOpen, onTryLever, onOpenFact }: HealthCareProps) {
  const charts = view.kind === 'charts'
  return (
    <div className="flex w-full flex-1 flex-col bg-bg" data-screen="health-care">
      <PageFrame
        title={copy.shellPageHealthCare}
        headingRef={headingRef}
        intro={copy.healthIntro}
        valuesNote={copy.probabilityTodaysDollars}
        tabs={{ label: copy.healthTabsLabel, items: TABS, value: 'cost', onValueChange: () => {} }}
        caveat={<Caveat lines={caveat} />}
        {...(charts && tray !== undefined
          ? {
              handle: { label: copy.trayHandle, open: trayOpen, onOpenChange: onTrayOpen, controls: TRAY_ID },
              tray: (
                <Tray id={TRAY_ID} open={trayOpen} onOpenChange={onTrayOpen} title={copy.trayHandle} closeLabel={copy.trayClose}>
                  <TrayBody tray={tray} onTryLever={onTryLever} onOpenFact={onOpenFact} />
                </Tray>
              ),
            }
          : {})}
      >
        {view.kind === 'words' ? (
          <p className="py-12 text-center text-body text-stone-900" data-health-page="words">
            {view.words}
          </p>
        ) : (
          <Charts view={view} />
        )}
      </PageFrame>
    </div>
  )
}
