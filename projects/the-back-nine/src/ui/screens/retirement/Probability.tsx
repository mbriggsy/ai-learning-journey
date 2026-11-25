/**
 * src/ui/screens/retirement/Probability.tsx: the Probability tab's panel (plan docs/plans/6-rightcapital-ui-plan.md, RC4;
 * ref 2.7; `rc-analysis/probability-tab-retirement-analysis__…png`, `FRAME_plan-picker-dropdown-above-gauge.png`,
 * `FRAME_probability-refresh-loading-state.png`). Draws `probabilityView.ts`'s view and decides nothing.
 *
 * LAYOUT, as RightCapital draws it: two equal halves, each with its picker (or its name) above its ring, the ring beside
 * its balance bar on the retired route; the alternative on the LEFT (green, solid: plan 4.0's colour roles), the plan it
 * is compared against on the RIGHT (blue, hatched). B9 adds the key-metric column beside the halves (the page's answer
 * in words: the spend clause, the difference line, the state clause), which stacks under them below the 68rem seam.
 * The chart title's menu switches to "Odds by stop year" on the working route. A run in flight fades its half under
 * "Loading…" and keeps its numbers (`LoadingVeil`, no spinner, no skeleton).
 *
 * The balance bar and the odds chart ride Highcharts' lazy chunk (Snapshot's rule): jsdom and the shell's other pages
 * never evaluate it.
 */
import { lazy, Suspense, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { ArrowUpRight, SquarePen } from 'lucide-react'
import { Button, ChartTitle, LoadingVeil, Ring, Select } from '../../kit'
import { verdictDescribedBy } from '../../disclaimerId'
import { copy, slots } from '../../copy'
import type { BarsView, HalfView, LeftPick, ProbabilityChart, ProbabilityView, RightPick } from './probabilityView'
import { ChartBoundary } from '../ChartBoundary'

const BalanceBar = lazy(() => import('@viz/charts/BalanceBar').then((m) => ({ default: m.BalanceBar })))
const OddsByStopYear = lazy(() => import('@viz/charts/OddsByStopYear').then((m) => ({ default: m.OddsByStopYear })))

const BAR_HEIGHT = 160

export type ReadingView = Extract<ProbabilityView, { kind: 'reading' }>

export interface ProbabilityPanelProps {
  readonly view: ReadingView
  readonly onPick: (pick: LeftPick) => void
  /** The right picker (RC5's two-up). */
  readonly onPickCompared: (pick: RightPick) => void
  /** The pencil beside the right picker: the plan list drawer. */
  readonly onOpenPlanList: () => void
  readonly onChart: (chart: ProbabilityChart) => void
  /** The door the record note's words name (the Tax Strategies page). */
  readonly strategies: { readonly href: string; readonly onOpen: () => void }
}

function Bar({ bars, half }: { readonly bars: BarsView | undefined; readonly half: HalfView }) {
  if (bars === undefined) return null
  const figure = bars.figures[half.side]
  // This side's scale: the one both share (the default), or its own (the Display drawer's "same scale" off).
  const scale = bars.scales[half.side]
  if (figure === undefined || half.barMedian === undefined) {
    // The bar's seat stays reserved while its side has no figure, so the landing moves nothing beside it.
    return <div aria-hidden="true" className="w-36 shrink-0" data-bar-seat="" />
  }
  return (
    <div className="w-36 shrink-0" data-bar={half.side}>
      <ChartBoundary fallback={<p className="text-label text-stone-600">{copy.chartLoadFailed}</p>}>
      <Suspense fallback={<div aria-hidden="true" className="h-50" />}>
        <BalanceBar
          role={half.side}
          median={half.barMedian}
          lattice={scale.lattice}
          figure={figure}
          axisDollar={scale.axisDollar}
          sideName={half.title}
          point={slots.probabilityBarPoint(half.title, figure)}
          description={bars.description}
          words={{ title: bars.label, credits: copy.chartCredits, end: copy.chartEnd, legend: copy.chartLegend, legendItem: copy.chartLegendItem }}
          height={BAR_HEIGHT}
        />
      </Suspense>
      </ChartBoundary>
    </div>
  )
}

function Half({ half, bars, header }: { readonly half: HalfView; readonly bars: BarsView | undefined; readonly header: React.ReactNode }) {
  const ring = half.ring
  return (
    <section className="flex min-w-0 flex-col items-center gap-3 text-center compact:gap-2" data-half={half.side} aria-label={half.title}>
      <div className="flex min-h-12 w-full items-end justify-center compact:min-h-10">{header}</div>
      <LoadingVeil loading={half.loading} label={copy.probabilityLoading}>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <div
            role="group"
            aria-label={half.title}
            {...(half.side === 'compared' ? { 'aria-describedby': verdictDescribedBy() } : {})}
            className="flex flex-col items-center gap-2"
            data-ring-half={half.side}
          >
            {ring.kind === 'face' ? (
              <Ring value={ring.face.arc} {...(ring.face.centre !== undefined ? { centre: ring.face.centre } : {})} caption={ring.face.caption} />
            ) : (
              <Ring value={undefined} caption={ring.caption} />
            )}
            {ring.kind === 'face' && ring.face.note !== undefined ? (
              <p className="text-label text-stone-600" data-ring-note="">
                {ring.face.note}
              </p>
            ) : null}
          </div>
          <Bar bars={bars} half={half} />
        </div>
      </LoadingVeil>
      {half.status !== undefined ? (
        <p className="text-label text-stone-600" data-half-status="">
          {half.status}
        </p>
      ) : null}
      {half.rows.length > 0 ? (
        // The rows as one block: their headlines read as one list (a split household's two rows, a gap apart, ran the
        // R13 caveat past his window).
        // A run in flight fades them with the ring (ref 2.7's refresh state): the numbers stay put until the new reading.
        <div className={half.loading ? 'flex flex-col gap-1 opacity-40 transition-opacity duration-200 ease-settle' : 'flex flex-col gap-1 transition-opacity duration-200 ease-settle'}>
          {half.rows.map((row) => (
            <div key={row.text} className="flex flex-col gap-0.5" data-reading-row="">
              <p className="text-body text-stone-900">{row.text}</p>
              {row.notes.map((n) => (
                <p key={n} className="text-label text-stone-600">
                  {n}
                </p>
              ))}
            </div>
          ))}
        </div>
      ) : null}
      {half.stopgap !== undefined ? (
        <p className="text-label text-stone-600" data-survivor-stopgap="">
          {half.stopgap}
        </p>
      ) : null}
    </section>
  )
}

type CaptionSeat = 'halves' | 'metrics'

/**
 * Where the bars' caption sits at the laptop's two columns: under the halves it labels, unless the key-metric column has
 * the room and the halves' column does not (RC4b's landed fit: a landed what-if whose survivor line differs from the
 * plan's keeps a line in each half at half width, and `budget`'s halves then ran its handle 35 px past his window, while
 * `patypical`'s long state clause leaves the key-metric column the taller one). Measured before paint, so the page is
 * never drawn with the caption in the wrong seat; below the laptop seam the columns stack and it stays with the halves.
 * Layout only: the words, and their place in the reading order straight after the halves, never change.
 */
function useCaptionSeat(grid: RefObject<HTMLDivElement | null>, left: RefObject<HTMLDivElement | null>, right: RefObject<HTMLDivElement | null>, caption: RefObject<HTMLParagraphElement | null>): CaptionSeat {
  const [seat, setSeat] = useState<CaptionSeat>('halves')
  useLayoutEffect(() => {
    const g = grid.current
    const l = left.current
    const r = right.current
    const c = caption.current
    if (g === null || l === null || r === null || c === null) return
    if (getComputedStyle(g).display !== 'grid') {
      if (seat !== 'halves') setSeat('halves')
      return
    }
    const gap = 8
    const capH = c.offsetHeight + gap
    // The caption's height in the other seat: its lines scale with the width it is given there.
    const otherW = seat === 'halves' ? r.clientWidth : l.clientWidth
    const capOther = otherW > 0 ? Math.ceil((capH * c.offsetWidth) / otherW) : capH
    const leftBare = l.offsetHeight - (seat === 'halves' ? capH : 0)
    const rightBare = r.offsetHeight - (seat === 'metrics' ? capH : 0)
    const underHalves = Math.max(leftBare + (seat === 'halves' ? capH : capOther), rightBare)
    const inMetrics = Math.max(leftBare, rightBare + (seat === 'metrics' ? capH : capOther))
    // A margin either way, so two estimates a pixel apart never trade the seat back and forth.
    const next: CaptionSeat = seat === 'halves' ? (inMetrics + 8 < underHalves ? 'metrics' : 'halves') : underHalves + 8 < inMetrics ? 'halves' : 'metrics'
    if (next !== seat) setSeat(next)
  })
  return seat
}

function BarsCaption({ view, captionRef, className }: { readonly view: ReadingView; readonly captionRef: RefObject<HTMLParagraphElement | null>; readonly className: string }) {
  if (view.bars !== undefined) {
    return (
      <p ref={captionRef} className={className} data-bar-label="">
        {view.bars.caption}
        {/* Two bars on two scales: said with what the bars hold, so their heights are never read against each other. */}
        {view.bars.ownScales !== undefined ? <span data-bar-own-scales="">{` ${view.bars.ownScales}`}</span> : null}
      </p>
    )
  }
  if (view.barsNone !== undefined) {
    return (
      <p ref={captionRef} className={className} data-bar-label="" data-bar-none="">
        {view.barsNone}
      </p>
    )
  }
  return null
}

function Metrics({ view, seat, captionRef, metricsRef }: { readonly view: ReadingView; readonly seat: CaptionSeat; readonly captionRef: RefObject<HTMLParagraphElement | null>; readonly metricsRef: RefObject<HTMLDivElement | null> }) {
  const m = view.metrics
  const [first, ...rest] = m.lines
  return (
    <div ref={metricsRef} className="flex flex-col gap-3 text-left compact:gap-2" data-metrics="">
      {/* What the bars hold, when the halves keep lines of their own (`barsCaptionSeat`): first in the reading order,
          straight after the halves it labels on the phone, drawn last in the laptop's column. */}
      {seat === 'metrics' ? <BarsCaption view={view} captionRef={captionRef} className="text-left text-label text-stone-600 laptop:order-last" /> : null}
      {first !== undefined ? (
        m.clauseReserve === undefined ? (
          <p className="text-body text-stone-900" data-spend={m.spend}>
            {first}
          </p>
        ) : (
          <p className="grid text-body text-stone-900" data-spend={m.spend}>
            <span className="col-start-1 row-start-1">{first}</span>
            <span aria-hidden="true" className="invisible col-start-1 row-start-1">
              {m.clauseReserve}
            </span>
          </p>
        )
      ) : null}
      {/* The difference line's cell holds its longest form hidden, so a reading landing moves nothing below it. */}
      <p className="grid text-body font-semibold text-stone-900" data-difference="">
        <span className="col-start-1 row-start-1">{m.difference ?? ''}</span>
        <span aria-hidden="true" className="invisible col-start-1 row-start-1">
          {m.differenceReserve}
        </span>
      </p>
      {/* The subsidy-rules what-if's health line, its cell held at its widest from the first frame of that what-if. */}
      {m.health !== undefined ? (
        <p className="grid text-body text-stone-900" data-health="">
          <span className="col-start-1 row-start-1">{m.health.line ?? ''}</span>
          <span aria-hidden="true" className="invisible col-start-1 row-start-1">
            {m.health.reserve}
          </span>
        </p>
      ) : null}
      {rest.map((line) => (
        <p key={line} className="text-label text-stone-600">
          {line}
        </p>
      ))}
      {/* The footnote row (the Medicare residual and its extras appendix) closes the column: at his window the column has
          the room the panel's foot does not, and below the seam it stacks under the halves with the rest. */}
      {view.footnotes.map((n) => (
        <p key={n} className="text-label text-stone-600" data-footnote="">
          {n}
        </p>
      ))}
    </div>
  )
}

function OpenLink({ door, words }: { readonly door: { readonly href: string; readonly onOpen: () => void }; readonly words: string }) {
  return (
    <a
      href={door.href}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        door.onOpen()
      }}
      className="inline-flex items-center gap-1 text-label text-blue-ink underline-offset-2 hover:underline"
    >
      {words}
      <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
    </a>
  )
}

/** The panel's body for a reading. */
export function ProbabilityPanel({ view, onPick, onPickCompared, onOpenPlanList, onChart, strategies }: ProbabilityPanelProps) {
  const { alternative, compared } = view.halves
  const picker = (
    <Select<LeftPick>
      label={view.picker.label}
      hideLabel
      items={view.picker.items}
      value={view.picker.value}
      onValueChange={onPick}
      className="w-56"
    />
  )
  // The right half's picker and, beside it, the pencil that opens the plan list (ref 2.7, `FRAME_plan-picker-dropdown-
  // above-gauge.png`): an icon with its word (never an icon alone), its full name for a screen reader.
  const comparedPicker = (
    <div className="flex flex-wrap items-end justify-center gap-2">
      <Select<RightPick>
        label={view.comparedPicker.label}
        hideLabel
        items={view.comparedPicker.items}
        value={view.comparedPicker.value}
        onValueChange={onPickCompared}
        className="w-56"
      />
      <Button
        variant="quiet"
        icon={<SquarePen size={18} strokeWidth={1.5} aria-hidden="true" />}
        aria-label={copy.planListOpenLabel}
        onClick={onOpenPlanList}
        data-plan-list-open=""
      >
        {copy.planListOpenWord}
      </Button>
    </div>
  )
  const gridRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const metricsRef = useRef<HTMLDivElement>(null)
  const captionRef = useRef<HTMLParagraphElement>(null)
  const seat = useCaptionSeat(gridRef, leftRef, metricsRef, captionRef)
  return (
    <div className="flex flex-col gap-4 compact:gap-3" data-probability={view.route}>
      {view.charts.length > 1 ? (
        <div className="flex justify-center">
          <ChartTitle items={view.charts} value={view.chart} onValueChange={onChart} />
        </div>
      ) : null}
      {view.chart === 'odds' && view.odds !== undefined ? (
        <div className="flex flex-col gap-3" data-odds-chart="">
          {view.odds.tag !== undefined ? <p className="text-label font-semibold text-stone-900">{view.odds.tag}</p> : null}
          {/* Years down the side, so every stop year and every label reads whole at the phone's width too: no sideways
              scroll inside the chart (`oddsByStopYearOptions.ts` has the layout's reasons). */}
          {/* The chart is this view's answer, so it names the R13 caveat as its description (the plan's 4.0 R13 rule), as
              the rings view's plan ring does. */}
          <div role="group" aria-label={view.odds.labels.words.title} aria-describedby={verdictDescribedBy()} data-odds-frame="">
            <ChartBoundary fallback={<p className="text-body text-stone-600">{copy.chartLoadFailed}</p>}>
              <Suspense fallback={<div aria-hidden="true" className="h-85" />}>
                <OddsByStopYear series={view.odds.series} barRung={view.odds.barRung} labels={view.odds.labels} />
              </Suspense>
            </ChartBoundary>
          </div>
          {view.odds.notes.map((n) => (
            <p key={n} className="text-label text-stone-600">
              {n}
            </p>
          ))}
        </div>
      ) : (
        <div ref={gridRef} className="flex flex-col gap-8 laptop:grid laptop:grid-cols-[3fr_2fr] laptop:items-start">
          <div ref={leftRef} className="flex flex-col gap-3 compact:gap-2">
            <div className="grid grid-cols-1 gap-8 wide:grid-cols-2">
              <Half half={alternative} bars={view.bars} header={picker} />
              <Half half={compared} bars={view.bars} header={comparedPicker} />
            </div>
            {view.sharedNotes !== undefined ? (
              <div className="flex flex-col gap-0.5 text-center" data-shared-notes="">
                {view.sharedNotes.map((n) => (
                  <p key={n} className="text-label text-stone-600">
                    {n}
                  </p>
                ))}
              </div>
            ) : null}
            {/* What the bars hold, under the halves they label (while every second line is said once there). */}
            {seat === 'halves' ? <BarsCaption view={view} captionRef={captionRef} className="text-center text-label text-stone-600" /> : null}
          </div>
          <Metrics view={view} seat={seat} captionRef={captionRef} metricsRef={metricsRef} />
        </div>
      )}
      {view.recordNote !== undefined ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-stone-600" data-record-note="">
          <span>{view.recordNote.words}</span>
          <OpenLink door={strategies} words={copy.probabilityOpenStrategies} />
        </p>
      ) : null}
      {/* Odds by stop year has no key-metric column: the answer's notes (the Medicare-priced affirmation, the state clause)
          open its footnote row, the affirmation just above the residual it qualifies. */}
      {view.chart === 'odds'
        ? [...view.noteLines, ...view.footnotes].map((n) => (
            <p key={n} className="text-label text-stone-600" data-footnote="">
              {n}
            </p>
          ))
        : null}
    </div>
  )
}

/** The panel's body while the answer is not a reading: the computing frame, the retry, the missing facts. */
export function ProbabilityWaiting({ view }: { readonly view: Exclude<ProbabilityView, { kind: 'reading' }> }) {
  switch (view.kind) {
    case 'pending':
      return (
        <div className="flex flex-col items-center gap-4 py-8" data-probability="pending">
          <Ring value={undefined} caption={view.words} />
        </div>
      )
    case 'compute-error':
      return (
        <div className="flex flex-col items-center gap-4 py-8" data-probability="error">
          <p className="text-body text-stone-900">{view.words}</p>
          <Button variant="secondary" onClick={view.onRetry}>
            {view.retry}
          </Button>
        </div>
      )
    case 'fallback':
      return (
        <div className="flex flex-col gap-2 py-8" data-probability="fallback">
          <p className="text-body font-semibold text-stone-900">{view.lead}</p>
          {view.lines.map((line) => (
            <p key={line} className="text-label text-stone-600">
              {line}
            </p>
          ))}
        </div>
      )
  }
}
