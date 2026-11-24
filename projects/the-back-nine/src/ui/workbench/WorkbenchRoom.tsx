/*
 * src/ui/workbench/WorkbenchRoom.tsx — the workbench room (Act 5, U6–U8; workbench plan KTD31).
 *
 * The LAZY half: `RoomSlot.tsx` loads this module on demand behind its own error boundary, so the
 * front room's first paint never pays for it. The room is a phase of the intake app (IntakeApp owns the
 * phase, the history entry and the save machine); this component draws what it is handed, and runs the
 * year-by-year table's two named futures on its own lanes (U5), never on the store's.
 *
 * What it holds: the way back, the plan's save control from the one save machine (so a household can
 * save here and the two screens never disagree about disk), the ask a Back press raises over an entry
 * still open, the many-futures answer pinned above both pages (R9), and two pages behind a tab switch:
 * the year-by-year table (U7: the steady/rough switch, the heading's words, its stopgap lines and the rows)
 * and the facts page (U8: everything the household told the tool, each group behind one door).
 *
 * THE TABLE'S RUNS (KTD9, KTD13): on each FINAL committed answer the room asks both views' lanes for that
 * answer's run, built from the answer's own draft (`tableRunFor`). Both views run up front (one path
 * each), so the switch never waits. Until the newest answer's rows land, the rows on screen stay, marked
 * as updating; the heading's words always come with the rows they describe. The runs live in the room,
 * not the table, so they keep running on each committed answer whichever page shows.
 *
 * THE FACTS PAGE'S DOORS (U8): a step's group opens that step's own body in a sheet (`StepSheet`); the budget and
 * the panel's seats open their own sheets, from the one home of the lever sheets and their writes (`editorSheets.tsx`,
 * which Result calls too). An edit redraws the pinned answer and the table through the store, and the plan reads
 * unsaved through the one save machine. A read-only tab gets the page with no door. Since U15 each lever's line also
 * links to the What if page, and the withdrawal order, the Roth plan and the subsidy regime open no editor here.
 *
 * THE WHAT IF PAGE (U15, `WhatIfPage.tsx`): the lever rail beside the plan. The room holds its one what-if
 * (`useWhatIf`: the slot, made once, and the bundle), so a what-if and its runs survive a page switch, and the page
 * pairs the what-if's rows with the table lanes' own plan rows. The market switch belongs to the table and the What if
 * page alike: the paired rows read the same market the table does (R8).
 *
 * THE ROOM'S ONE LIVE REGION: the save slot's transitions, and the room's own refiguring and updating words, are
 * spoken through one persistent polite region, on transitions only (the visual lines carry no role of their own,
 * so nothing speaks twice).
 */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { SaveSlot } from '../SaveSlot'
import { useSaveAnnouncer, type ResultSaveProp } from '../saveAnnouncer'
import { SegmentedControl } from '@intake/fields'
import { intakeSteps } from '@intake/questions'
import { missingRequiredFacts } from '@intake/intakeMap'
import { engineRunLane, type EngineRunRequest, type Lane } from '@store/runLanes'
import { roughWindow, ROUGH_WINDOW_YEARS } from '@engine/reference/roughSequence'
import type { MemoryModel, MemoryModelSnapshot } from '@store/memoryModel'
import type { LedgerYearRow, SimulationResult } from '@shared/model'
import { copy, slots } from '../copy'
import { appModel } from '../appModel'
import { planClockAnchor } from '../bandAnnotations'
import { useEditorSheets } from '../editorSheets'
import { PinnedAnswer } from './PinnedAnswer'
import { pinnedLines } from './pinnedLines'
import { YearTable, type YearTableState } from './YearTable'
import { FactsPage } from './FactsPage'
import { StepSheet } from './StepSheet'
import { composeFacts, stepSectionTitle, type FactStop } from './factsChrome'
import type { FactDoorId, StepSectionId } from './factRegistry'
import { tableRunFor, type TableMeta, type TableRun, type TableView } from './tableRun'
import { composeYearTable, lifespansLine, yieldLine } from './yearTableChrome'
import { WhatIfPage } from './WhatIfPage'
import { useWhatIf, type RailRecommendation } from './useWhatIf'
import type { WhatIfSlotLanes } from './whatIfRun'
import type { WhatIfLeverKind } from '@shared/model'
import './workbench.css'

export type TableLanes = Readonly<Record<TableView, Lane<EngineRunRequest, SimulationResult>>>

/** The room's three pages. */
export type RoomPage = 'table' | 'facts' | 'whatif'

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
  /** The store's snapshot: the committed answer the table is built on and pinned beside, and the draft the facts
   *  page reads. */
  readonly snapshot: MemoryModelSnapshot
  /** The store the facts page's doors write through. Default: the app's one model. */
  readonly model?: MemoryModel
  /** The unlock's read-only arm (a second tab holds the plan): the facts page draws no door. `save.kind` can't
   *  carry it (`none` is also a plan that can't be saved yet), so IntakeApp passes it. Default false. */
  readonly readOnly?: boolean
  /** The table's two lanes; tests hand in their own. Default: two lanes on the app's one engine. */
  readonly lanes?: TableLanes
  /** Today's calendar year (the plan's clock: an aged plan names its build year). Default: the device clock. */
  readonly wallCalendarYear?: number
  /** The saved recommendation as the rail runs it (R22): the record on disk and whether the store reads it as current.
   *  Absent where there is none (or the household is on the date route, where none can be re-presented). */
  readonly recommendation?: RailRecommendation
  /** The what-if slot's three lanes; tests hand in their own. Default: three lanes on the app's one engine. */
  readonly whatIfLanes?: WhatIfSlotLanes
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
  // The known omissions that move a printed figure: where the run prices no state income tax, the hero's own unpriced
  // line (`verdictStateUnpricedNote`; every figured surface carries one state clause, `stateTaxDisclosure.ts`), and
  // the surtax line, verbatim.
  const stopgaps = [
    yieldLine(meta, rows),
    meta.statePriced ? null : copy.verdictStateUnpricedNote,
    copy.workbenchKindsMissing,
    copy.recDiscNiit,
  ].filter((s): s is string => s !== null)
  return { what, stopgaps }
}

/** The lever doors and the panel seats a facts-page door opens (every non-step door, exhaustive). */
type SheetDoor = Exclude<FactDoorId, StepSectionId>

/** The ask a Back press raises over an entry still open. Over an open sheet it rides its own layer above the sheet's
 *  backdrop (the sheet is modal, and an ask beneath it could be neither seen nor pressed): a scrim takes every press
 *  meant for the sheet or the room, Tab and Shift+Tab move between its two choices only, and Escape is Stay (the U8
 *  review's C3, C7). Focus moves to its safe choice, and goes back where it was on Stay, or to the room's heading
 *  when that is gone. */
function LeaveAsk({
  ask,
  overSheet,
  fallback,
}: {
  readonly ask: NonNullable<WorkbenchRoomProps['leaveAsk']>
  readonly overSheet: boolean
  readonly fallback: () => HTMLElement | null
}) {
  const stayRef = useRef<HTMLButtonElement>(null)
  const goRef = useRef<HTMLButtonElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  useEffect(() => {
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    stayRef.current?.focus()
  }, [])
  const stay = () => {
    const back = returnTo.current
    ask.onStay()
    if (back !== null && back.isConnected) back.focus()
    else fallback()?.focus()
  }
  const box = (
    <div
      className={overSheet ? 'workbench__ask workbench__ask--over' : 'workbench__ask'}
      role={overSheet ? 'alertdialog' : 'alert'}
      aria-modal={overSheet ? true : undefined}
      aria-label={overSheet ? copy.workbenchLeaveAsk : undefined}
    >
      <p className="workbench__ask-text">{copy.workbenchLeaveAsk}</p>
      <div className="workbench__ask-actions">
        <button type="button" className="btn-primary" ref={stayRef} onClick={stay}>
          {copy.workbenchLeaveStay}
        </button>
        <button type="button" className="btn-quiet" ref={goRef} onClick={ask.onGo}>
          {copy.workbenchLeaveGo}
        </button>
      </div>
    </div>
  )
  if (!overSheet) return box
  return (
    <div
      className="workbench__ask-layer"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          stay()
          return
        }
        if (e.key !== 'Tab') return
        e.preventDefault()
        const onStay = document.activeElement === stayRef.current
        ;(onStay ? goRef : stayRef).current?.focus()
      }}
    >
      {box}
    </div>
  )
}

export default function WorkbenchRoom({
  save,
  onBack,
  leaveAsk,
  snapshot,
  model = appModel,
  readOnly = false,
  lanes: lanesProp,
  wallCalendarYear = new Date().getFullYear(),
  recommendation,
  whatIfLanes,
}: WorkbenchRoomProps) {
  const announcer = useSaveAnnouncer(save.kind)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const roomRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const factsPanelRef = useRef<HTMLDivElement>(null)
  const ids = {
    tabs: useId(),
    tablePanel: useId(),
    factsPanel: useId(),
    whatIfPanel: useId(),
    tableTab: useId(),
    factsTab: useId(),
    whatIfTab: useId(),
  }
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
  const [page, setPage] = useState<RoomPage>('table')

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

  // THE ROOM'S WORDS, ON TRANSITIONS ONLY: the pinned answer being worked out again, else the shown table
  // updating. One sentence per change, through the one region the save slot speaks through.
  const roomStatus = snapshot.refiguring ? 'refiguring' : page === 'table' && state.kind === 'ready' && state.updating ? 'updating' : 'idle'
  const prevStatus = useRef(roomStatus)
  useEffect(() => {
    const prev = prevStatus.current
    prevStatus.current = roomStatus
    if (roomStatus === prev) return
    if (roomStatus === 'refiguring') announcer.announce(copy.workbenchPinnedRefiguring)
    else if (roomStatus === 'updating') announcer.announce(copy.workbenchTableUpdating)
  }, [roomStatus, announcer])
  // The new answer's words, spoken when they change and the answer is not being worked out again: the start of a
  // re-figure is said above, and this says its end (on the date route the final lands with no refiguring edge, so the
  // lead's text is the key; the U8 review's C12).
  const pinnedLead = pinnedLines(snapshot, wallCalendarYear).lead
  const prevLead = useRef(pinnedLead)
  useEffect(() => {
    const prev = prevLead.current
    if (snapshot.refiguring || pinnedLead === prev) return
    prevLead.current = pinnedLead
    announcer.announce(pinnedLead)
  }, [pinnedLead, snapshot.refiguring, announcer])

  // ── The facts page (U8) ─────────────────────────────────────────────────────────────────────────────
  const { draft } = snapshot
  const steps = useMemo(() => intakeSteps(draft), [draft])
  const missing = useMemo(() => missingRequiredFacts(draft), [draft])
  const anchor = useMemo(() => planClockAnchor(draft.startCalendarYear, wallCalendarYear), [draft.startCalendarYear, wallCalendarYear])
  // The stop year the table's run carries: the answer's date, never re-derived (insight 132).
  // The stop year the table's LAST DELIVERED run carries (its meta, as the heading reads it), never re-derived
  // (insight 132), and held while a newer answer is worked out: the provisional tier asks no table run, so reading the
  // current answer's run would drop the line for the whole wait and move every door under it (the U8 review's C1). Held,
  // it is marked in words, as the table keeps its prior rows marked updating.
  const delivered = results.steady?.kind === 'rows' ? results.steady : results.rough?.kind === 'rows' ? results.rough : undefined
  const stopMarked = snapshot.refiguring || delivered === undefined || run.kind !== 'run' || delivered.key !== run.key
  const stop = useMemo((): FactStop | undefined => {
    if (delivered === undefined || run.kind === 'withheld' || run.kind === 'answer-error') return undefined
    const meta = delivered.meta
    if (meta.stopYear === undefined || meta.route === 'spine') return undefined
    return { route: meta.route, year: meta.stopYear, track: meta.track, marked: stopMarked }
  }, [delivered, run.kind, stopMarked])
  const sections = useMemo(
    () => (page === 'facts' ? composeFacts({ draft, stepIds: steps.map((s) => s.id), anchor, ...(stop !== undefined ? { stop } : {}) }) : []),
    [page, draft, steps, anchor, stop],
  )

  // Where a door's sheet hands focus back when the door itself is gone: the door again, re-queried at close (a
  // section can re-render under an edit), else the page's own heading.
  const lastDoor = useRef<FactDoorId | null>(null)
  const restoreFallback = useCallback((): HTMLElement | null => {
    const door = lastDoor.current
    const again = door === null ? null : document.querySelector<HTMLElement>(`[data-fact-open="${door}"]`)
    return again ?? factsPanelRef.current
  }, [])

  const [openStepId, setOpenStepId] = useState<StepSectionId | null>(null)
  // The open step, from the draft's CURRENT walk (a step whose fields follow the draft, the accounts' among them,
  // is rebuilt each time). A step that left the walk under an edit closes, and its ending runs.
  const openStep = openStepId === null ? null : (steps.find((s) => s.id === openStepId) ?? null)
  if (openStepId !== null && openStep === null) setOpenStepId(null)
  const openStepTitle = useMemo(() => (openStepId === null ? '' : stepSectionTitle(openStepId, draft)), [openStepId, draft])

  const editors = useEditorSheets({
    model,
    snapshot,
    missing,
    savedAnchor: anchor,
    restoreFallback,
    // No collections door in the room: the facts page has its own Accounts and Other income doors, and the panel's
    // "Edit in the walk-through" would name a walk the room never leaves for (the U8 review's A4).
  })
  const sheetDoors: Readonly<Record<SheetDoor, () => void>> = {
    budget: editors.openBudget,
    sequencing: editors.openSequencing,
    roth: editors.openRoth,
    'subsidy-regime': editors.openHealth,
    'survivor-ratio': () => editors.openAssumptions('survivor-ratio'),
    'heir-bracket': () => editors.openAssumptions('heir-bracket'),
    'extras-panel': () => editors.openAssumptions('medicare-extras'),
    none: () => {},
  }
  const openDoor = (door: FactDoorId) => {
    lastDoor.current = door
    if (Object.hasOwn(sheetDoors, door)) sheetDoors[door as SheetDoor]()
    else setOpenStepId(door as StepSectionId)
  }

  // ── The What if page (U15): the room's one what-if, kept across page switches ──────────────────────────────
  const whatIf = useWhatIf({ snapshot, model, ...(whatIfLanes !== undefined ? { lanes: whatIfLanes } : {}), ...(recommendation !== undefined ? { recommendation } : {}) })
  const [focusLever, setFocusLever] = useState<{ readonly kind: WhatIfLeverKind; readonly n: number } | undefined>(undefined)
  const tryLever = (kind: WhatIfLeverKind) => {
    switchPage('whatif')
    setFocusLever((f) => ({ kind, n: (f?.n ?? 0) + 1 }))
  }
  const announce = useCallback((text: string) => announcer.announce(text), [announcer])

  // ── The page switch: a real tab pattern (arrow keys, Home and End move and show; no history entry) ─────
  const pages: readonly RoomPage[] = ['table', 'facts', 'whatif']
  const tabRefs = useRef<Partial<Record<RoomPage, HTMLButtonElement | null>>>({})
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const at = pages.indexOf(page)
    const to =
      e.key === 'ArrowRight' ? pages[(at + 1) % pages.length] : e.key === 'ArrowLeft' ? pages[(at + pages.length - 1) % pages.length] : e.key === 'Home' ? pages[0] : e.key === 'End' ? pages[pages.length - 1] : undefined
    if (to === undefined) return
    e.preventDefault()
    switchPage(to)
    tabRefs.current[to]?.focus()
  }
  /** The one way the page changes (a press or an arrow key). */
  const switchPage = (to: RoomPage) => setPage(to)
  // A page switch where the seat pins (a laptop) and the page has been scrolled past the panels' top: the new page
  // opens at its own top, just under the seat, never mid-way down at the old page's scroll (the U8 review's C5).
  const pageMounted = useRef(false)
  useLayoutEffect(() => {
    if (!pageMounted.current) {
      pageMounted.current = true
      return
    }
    if (typeof window.matchMedia !== 'function' || !window.matchMedia('(min-width: 68rem)').matches) return
    const panel = document.getElementById(page === 'table' ? ids.tablePanel : page === 'facts' ? ids.factsPanel : ids.whatIfPanel)
    const seat = pinRef.current
    if (panel === null || seat === null) return
    const under = seat.getBoundingClientRect().bottom
    const top = panel.getBoundingClientRect().top
    if (top < under) window.scrollBy(0, top - under)
    // `ids` are stable per mount (useId); the effect is keyed on the page alone.
  }, [page])
  const tab = (p: RoomPage, label: string, tabId: string, panelId: string) => (
    <button
      type="button"
      role="tab"
      id={tabId}
      ref={(el) => {
        tabRefs.current[p] = el
      }}
      className={page === p ? 'wb-pages__tab wb-pages__tab--on' : 'wb-pages__tab'}
      data-label={label}
      aria-selected={page === p}
      aria-controls={panelId}
      tabIndex={page === p ? 0 : -1}
      onClick={() => switchPage(p)}
      onKeyDown={onTabKey}
    >
      {label}
    </button>
  )

  const anySheetOpen = editors.sheetOpen || openStep !== null
  // The committed answer's tier and the store's refiguring flag, mirrored as Result mirrors them
  // (`data-answer-tier`, `data-answer-refiguring`): the harnesses' signal that an edit's answer has landed.
  const answerTier = snapshot.answer.kind === 'headline' || snapshot.answer.kind === 'date' ? snapshot.answer.tier : undefined

  return (
    <main
      className="workbench"
      ref={roomRef}
      data-room-page={page}
      data-answer-tier={answerTier}
      data-answer-refiguring={snapshot.refiguring ? true : undefined}
    >
      <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      <div className="workbench__bar">
        <button type="button" className="btn-quiet workbench__back" onClick={onBack}>
          {copy.workbenchBack}
        </button>
      </div>
      {leaveAsk !== undefined && <LeaveAsk ask={leaveAsk} overSheet={anySheetOpen} fallback={() => headingRef.current} />}
      {/* The heading and the plan's save control share a row on a wide screen, so the table starts high. */}
      <div className="workbench__head">
        <h2 ref={headingRef} className="workbench__heading" tabIndex={-1}>
          {copy.workbenchHeading}
        </h2>
        <SaveSlot save={save} />
      </div>
      {/* Pinned while either page scrolls (at a laptop; a phone's seat scrolls with the page): the many-futures
          answer, the page switch, and the table page's switch between its two futures. In the document the market
          switch comes after the page switch (choose the page, then the table's market), and a phone shows them in
          that order; a laptop seats the market switch beside the answer (workbench.css). On the facts page the
          market switch is out of reach (`inert`): a laptop keeps its place unseen, so the pinned box and the page
          switch hold still when the page changes, and a phone drops it from under the page switch. */}
      <div className="wb-pin-seat" ref={pinRef}>
        <PinnedAnswer snapshot={snapshot} wallCalendarYear={wallCalendarYear} />
        <div className="wb-pages" role="tablist" aria-label={copy.workbenchPagesLabel} id={ids.tabs}>
          {tab('table', copy.workbenchPageTable, ids.tableTab, ids.tablePanel)}
          {tab('facts', copy.workbenchPageFacts, ids.factsTab, ids.factsPanel)}
          {tab('whatif', copy.workbenchPageWhatIf, ids.whatIfTab, ids.whatIfPanel)}
        </div>
        <div className="wb-view" inert={page === 'facts'} aria-hidden={page === 'facts' ? true : undefined}>
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
      <div className="wb-panel" role="tabpanel" id={ids.tablePanel} aria-labelledby={ids.tableTab} hidden={page !== 'table'}>
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
      </div>
      {/* The facts panel is a focus target itself (a sheet whose door is gone hands focus back here; the U8 review's
          C13): named by its tab, so no hidden heading of its own. */}
      <div
        className="wb-panel"
        role="tabpanel"
        id={ids.factsPanel}
        aria-labelledby={ids.factsTab}
        hidden={page !== 'facts'}
        tabIndex={-1}
        ref={factsPanelRef}
      >
        {page === 'facts' && <FactsPage sections={sections} onTry={tryLever} {...(readOnly ? {} : { onOpen: openDoor })} />}
      </div>
      <div className="wb-panel" role="tabpanel" id={ids.whatIfPanel} aria-labelledby={ids.whatIfTab} hidden={page !== 'whatif'}>
        {page === 'whatif' && (
          <WhatIfPage
            whatIf={whatIf}
            snapshot={snapshot}
            planRows={results}
            view={view}
            readOnly={readOnly}
            wallCalendarYear={wallCalendarYear}
            announce={announce}
            {...(recommendation !== undefined ? { recommendation } : {})}
            {...(focusLever !== undefined ? { focusLever } : {})}
          />
        )}
      </div>
      {!readOnly && (
        <>
          <StepSheet
            model={model}
            step={openStep}
            title={openStepTitle}
            onClose={() => setOpenStepId(null)}
            restoreFallback={restoreFallback}
          />
          {editors.node}
        </>
      )}
    </main>
  )
}
