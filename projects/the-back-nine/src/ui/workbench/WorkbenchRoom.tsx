/*
 * src/ui/workbench/WorkbenchRoom.tsx — the workbench room (Act 5, U6–U7; workbench plan KTD31).
 *
 * The LAZY half: `RoomSlot.tsx` loads this module on demand behind its own error boundary, so the
 * front room's first paint never pays for it. The room is a phase of the intake app (IntakeApp owns the
 * phase, the history entry and the save machine); this component draws what it is handed, and runs the
 * year-by-year table's two named futures on its own lanes (U5), never on the store's.
 *
 * What it holds: the way back, the plan's save control from the one save machine (so a household can
 * save here and the two screens never disagree about disk), the ask a Back press raises over an entry
 * still open, the many-futures answer pinned above the table (R9), the steady/rough switch (R8), the
 * table's heading words (R7, R10, the decision record's §5) and its stopgap lines, and the table (U7).
 * U8 adds the facts page.
 *
 * THE TABLE'S RUNS (KTD9, KTD13): on each FINAL committed answer the room asks both views' lanes for that
 * answer's run, built from the answer's own draft (`tableRunFor`). Both views run up front (one path
 * each), so the switch never waits. Until the newest answer's rows land, the rows on screen stay, marked
 * as updating; the heading's words always come with the rows they describe.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SaveSlot, useSaveAnnouncer, type ResultSaveProp } from '../SaveSlot'
import { SegmentedControl } from '@intake/fields'
import { engineRunLane, type EngineRunRequest, type Lane } from '@store/runLanes'
import { roughWindow, ROUGH_WINDOW_YEARS } from '@engine/reference/roughSequence'
import type { MemoryModelSnapshot } from '@store/memoryModel'
import type { LedgerYearRow, SimulationResult } from '@shared/model'
import { copy, slots } from '../copy'
import { PinnedAnswer } from './PinnedAnswer'
import { YearTable, type YearTableState } from './YearTable'
import { tableRunFor, type TableMeta, type TableRun, type TableView } from './tableRun'
import { composeYearTable, lifespansLine, yieldLine } from './yearTableChrome'
import './workbench.css'

export type TableLanes = Readonly<Record<TableView, Lane<EngineRunRequest, SimulationResult>>>

export interface WorkbenchRoomProps {
  /** The plan's save control, derived by IntakeApp from the one save machine. A read-only tab gets
   *  `none` (the machine's own rule), so the room draws no write control there. */
  readonly save: ResultSaveProp
  /** The way back to the answer. IntakeApp makes it a real history Back, so the browser's Back and this
   *  button are one path. */
  readonly onBack: () => void
  /** Present while a Back press is held over an entry still open in the room (the press can't be
   *  cancelled, so IntakeApp put the room's history entry back and asks here first). */
  readonly leaveAsk?: { readonly onGo: () => void; readonly onStay: () => void }
  /** The store's snapshot: the committed answer the table is built on and pinned beside. */
  readonly snapshot: MemoryModelSnapshot
  /** The table's two lanes; tests hand in their own. Default: two lanes on the app's one engine. */
  readonly lanes?: TableLanes
  /** Today's calendar year (the plan's clock: an aged plan names its build year). Default: the device clock. */
  readonly wallCalendarYear?: number
}

/** One view's newest delivered result, and the answer it belongs to. */
type ViewResult =
  | { readonly kind: 'rows'; readonly key: string; readonly rows: readonly LedgerYearRow[]; readonly meta: TableMeta }
  | { readonly kind: 'error'; readonly key: string }

/** The rough window, computed once from the committed series (never typed): its first and last years. */
let roughYears: { readonly start: number; readonly end: number } | undefined
function roughWindowYears(): { readonly start: number; readonly end: number } {
  if (roughYears === undefined) {
    const start = roughWindow().startYear
    roughYears = { start, end: start + ROUGH_WINDOW_YEARS - 1 }
  }
  return roughYears
}

const WITHHELD_WORDS: Readonly<Record<Extract<TableRun, { kind: 'withheld' }>['reason'], string>> = {
  'no-run': copy.workbenchWithheldNoRun,
  'no-date-answer': copy.workbenchWithheldNoDate,
  'band-missing': copy.workbenchWithheldBand,
  'no-ledger': copy.workbenchWithheldNoLedger,
}

/** The table's state for one view, from the store's answer and that view's newest result. */
function tableState(run: TableRun, result: ViewResult | undefined, view: TableView, refiguring: boolean): YearTableState {
  if (run.kind === 'answer-error') return { kind: 'error' }
  if (run.kind === 'withheld') return { kind: 'withheld', words: WITHHELD_WORDS[run.reason] }
  const current = run.kind === 'run' ? run.key : null
  if (result === undefined) return { kind: 'loading' }
  if (result.kind === 'error') return result.key === current ? { kind: 'error' } : { kind: 'loading' }
  const table = composeYearTable({
    rows: result.rows,
    meta: result.meta,
    view,
    ...(view === 'rough' ? { roughEndYear: roughWindowYears().end } : {}),
  })
  return { kind: 'ready', table, updating: result.key !== current || refiguring }
}

/** The words above the table: what this future is, whose lifespans, when work stops, and the stopgaps. */
function headingLines(meta: TableMeta, rows: readonly LedgerYearRow[], view: TableView, wallCalendarYear: number) {
  const { start, end } = roughWindowYears()
  const what = [
    view === 'steady' ? copy.workbenchSteadyWhat : slots.workbenchRoughWhat(start, end, ROUGH_WINDOW_YEARS),
    lifespansLine(meta.people),
    meta.route === 'dated' && meta.stopYear !== undefined ? slots.workbenchStopsIn(meta.stopYear) : '',
    meta.route === 'no-date' && meta.stopYear !== undefined ? slots.workbenchNoDate(meta.stopYear) : '',
    meta.track === 'floor' ? slots.workbenchFloorTrack() : '',
    wallCalendarYear > meta.startCalendarYear ? slots.workbenchAged(meta.startCalendarYear) : '',
  ].filter((s) => s !== '')
  const stopgaps = [yieldLine(meta, rows), copy.workbenchKindsMissing, copy.recDiscNiit].filter((s): s is string => s !== null)
  return { what, stopgaps }
}

export default function WorkbenchRoom({
  save,
  onBack,
  leaveAsk,
  snapshot,
  lanes: lanesProp,
  wallCalendarYear = new Date().getFullYear(),
}: WorkbenchRoomProps) {
  const announcer = useSaveAnnouncer(save.kind)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const roomRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  // Focus to the room's heading on arrival (the project's step-change pattern): it announces the page
  // and brings its top into view, since the door sits below the answer's fold.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  // The table's header stays in view under the pinned answer: its sticky offset is the pinned box's real
  // height, written through the CSSOM (allowed under `style-src 'self'`; a style attribute string is not).
  useLayoutEffect(() => {
    const pin = pinRef.current
    const room = roomRef.current
    if (pin === null || room === null || typeof ResizeObserver === 'undefined') return
    const write = () => room.style.setProperty('--wb-pin-h', `${pin.getBoundingClientRect().height}px`)
    write()
    const observer = new ResizeObserver(write)
    observer.observe(pin)
    return () => observer.disconnect()
  }, [])

  const lanes = useMemo<TableLanes>(() => lanesProp ?? { steady: engineRunLane(), rough: engineRunLane() }, [lanesProp])
  const run = useMemo(() => tableRunFor(snapshot.answer), [snapshot.answer])
  const runKey = run.kind === 'run' ? run.key : null
  const [results, setResults] = useState<Partial<Record<TableView, ViewResult>>>({})
  const [view, setView] = useState<TableView>('steady')

  useEffect(() => {
    if (run.kind !== 'run') return
    let live = true
    const deliver = (v: TableView, r: ViewResult) => {
      if (live) setResults((prev) => ({ ...prev, [v]: r }))
    }
    for (const v of ['steady', 'rough'] as const) {
      const ask = run.views[v]
      if (ask.kind === 'refused') {
        deliver(v, { kind: 'error', key: run.key })
        continue
      }
      void lanes[v].request(ask.request).then((res) => {
        if (res.kind === 'superseded') return
        const rows = res.kind === 'ok' ? res.value.distribution.ledgerRows : undefined
        deliver(
          v,
          rows !== undefined && rows.length > 0
            ? { kind: 'rows', key: run.key, rows, meta: run.meta }
            : { kind: 'error', key: run.key },
        )
      })
    }
    return () => {
      live = false
    }
    // One request pair per committed answer: `runKey` names it, and `run` is that answer's.
  }, [runKey, lanes])

  const result = results[view]
  const state = tableState(run, result, view, snapshot.refiguring)
  const heading = state.kind === 'ready' && result?.kind === 'rows' ? headingLines(result.meta, result.rows, view, wallCalendarYear) : null

  return (
    <main className="workbench" ref={roomRef}>
      <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      <div className="workbench__bar">
        <button type="button" className="btn-quiet workbench__back" onClick={onBack}>
          {copy.workbenchBack}
        </button>
      </div>
      {leaveAsk !== undefined && (
        <div className="workbench__ask" role="alert">
          <p className="workbench__ask-text">{copy.workbenchLeaveAsk}</p>
          <div className="workbench__ask-actions">
            <button type="button" className="btn-primary" onClick={leaveAsk.onStay}>
              {copy.workbenchLeaveStay}
            </button>
            <button type="button" className="btn-quiet" onClick={leaveAsk.onGo}>
              {copy.workbenchLeaveGo}
            </button>
          </div>
        </div>
      )}
      {/* The heading and the plan's save control share a row on a wide screen, so the table starts high. */}
      <div className="workbench__head">
        <h2 ref={headingRef} className="workbench__heading" tabIndex={-1}>
          {copy.workbenchHeading}
        </h2>
        <SaveSlot save={save} />
      </div>
      {/* Pinned while the rows scroll: the many-futures answer, and the switch between the two futures. */}
      <div className="wb-pin-seat" ref={pinRef}>
        <PinnedAnswer snapshot={snapshot} wallCalendarYear={wallCalendarYear} />
        <div className="wb-view">
          <SegmentedControl<TableView>
            legendKey="workbenchViewLegend"
            name="wb-view"
            value={view}
            onChange={setView}
            options={[
              { value: 'steady', label: copy.workbenchViewSteady },
              { value: 'rough', label: copy.workbenchViewRough },
            ]}
          />
        </div>
      </div>
      {heading !== null && (
        <div className="wb-about">
          <div className="wb-about__what">
            {heading.what.map((line) => (
              <p key={line} className="wb-about__line">
                {line}
              </p>
            ))}
          </div>
          <ul className="wb-stopgaps">
            {heading.stopgaps.map((line) => (
              <li key={line} className="wb-stopgaps__line">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
      <YearTable state={state} />
    </main>
  )
}
