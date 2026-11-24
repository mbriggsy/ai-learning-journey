/*
 * src/ui/shell/Shell.tsx: the workspace's shell (Act 6 · RC2; plan docs/plans/6-rightcapital-ui-plan.md, section 3.1).
 *
 * The LAZY half: `ShellSlot.tsx` loads this module on demand behind its own error boundary, so the answer page's first
 * paint never pays for it. The shell is a phase of the intake app (IntakeApp owns the phase, the route, the history
 * entries and the save machine); this component draws what it is handed: the top bar (`TopBar.tsx`), the module's
 * pages (the kit's `SubNav`), and the page the route names.
 *
 * THE SETTLE HOOK: the shell renders ONE `<main class="result">` on every page, carrying the committed answer's tier and
 * the store's refiguring flag exactly as `Result.tsx` mirrors them (`data-answer-tier`, `data-answer-refiguring`), so
 * every harness's `SETTLED_RESULT` (`e2e/reviewSurface.ts`) settles wherever a seed lands. `main.result` is the shell's
 * alone; the legacy layer lays out `.result-page`, never `.result`, so the old answer page's rules never reach it. It is
 * a sibling before `App.tsx`'s trailing disclaimer, as `Result.tsx`'s is (app.css's R13 swap reads that order); no
 * interim page stamps `data-inframe-disclaimer`, so the trailing mount stays the one disclaimer here.
 *
 * WHAT IT MAKES ONCE (moved from the workbench room, so runs survive a page switch): the year-by-year table's steady
 * and rough lanes and their runs on each FINAL committed answer (KTD9, KTD13: built from the answer's own draft,
 * `tableRunFor`; until the newest answer's rows land, the rows on screen stay, marked as updating), the one what-if
 * (`useWhatIf`: its slot and bundle), the facts page's doors (a step's group opens that step's body in a sheet,
 * `StepSheet`; the budget and the panel's seats open their own sheets from `editorSheets.tsx`), the leave ask, and
 * the one live region (the save's transitions, the answer being worked out again, the table updating, the new answer's
 * words; spoken on transitions only).
 *
 * THE INTERIM TABS: the room's three pages ride in their current look (`InterimPage.tsx`, outside any `.rc-root`):
 * Retirement → Analysis → What if (`WhatIfPage.tsx`), Retirement → Cash Flows (`YearTable.tsx`) and Profile → Your
 * facts (`FactsPage.tsx`). The market switch belongs to the table and the What if page alike: the paired rows read the
 * market the table does (R8).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SegmentedControl } from '@intake/fields'
import { intakeSteps } from '@intake/questions'
import { missingRequiredFacts } from '@intake/intakeMap'
import { engineRunLane, type EngineRunRequest, type Lane } from '@store/runLanes'
import { roughWindow, ROUGH_WINDOW_YEARS } from '@engine/reference/roughSequence'
import type { MemoryModel, MemoryModelSnapshot } from '@store/memoryModel'
import type { LedgerYearRow, SimulationResult, WhatIfLeverKind } from '@shared/model'
import { SubNav } from '../kit'
import { copy, slots } from '../copy'
import { appModel } from '../appModel'
import { planClockAnchor } from '../bandAnnotations'
import { useEditorSheets } from '../editorSheets'
import { useSaveAnnouncer, type ResultSaveProp } from '../saveAnnouncer'
import { pinnedLines } from '../workbench/pinnedLines'
import { YearTable, type YearTableState } from '../workbench/YearTable'
import { FactsPage } from '../workbench/FactsPage'
import { StepSheet } from '../workbench/StepSheet'
import { composeFacts, stepSectionTitle, type FactStop } from '../workbench/factsChrome'
import type { FactDoorId, StepSectionId } from '../workbench/factRegistry'
import { tableRunFor, type TableMeta, type TableRun, type TableView } from '../workbench/tableRun'
import { composeYearTable, lifespansLine, yieldLine } from '../workbench/yearTableChrome'
import { WhatIfPage } from '../workbench/WhatIfPage'
import { useWhatIf, type RailRecommendation } from '../workbench/useWhatIf'
import type { WhatIfSlotLanes } from '../workbench/whatIfRun'
import { InterimPage } from './InterimPage'
import { composeLockMenu, type LockMenuAction } from './lockMenu'
import { navModules, routeEquals, routeHash, rowFor, ROUTE_ROWS, type Route } from './routes'
import { TopBar } from './TopBar'

export type TableLanes = Readonly<Record<TableView, Lane<EngineRunRequest, SimulationResult>>>

/** The ask a Back press (or the wordmark) raises over work it would drop. */
export interface ShellLeaveAsk {
  /** What the leave drops, one sentence each (an open entry; an unkept what-if). */
  readonly lines: readonly string[]
  readonly onGo: () => void
  readonly onStay: () => void
}

export interface ShellProps {
  /** The plan's save control, derived by IntakeApp from the one save machine. A read-only tab gets `none`. */
  readonly save: ResultSaveProp
  /** Present where a vault exists and the tab can write: the lock menu's Back up opens the existing backup step. */
  readonly onBackup?: () => void
  /** The page shown (IntakeApp holds it and mirrors it to the hash). */
  readonly route: Route
  /** Move to a page (IntakeApp pushes its history entry). */
  readonly onNavigate: (route: Route) => void
  /** The wordmark: back to the answer page. */
  readonly onHome: () => void
  /** Present while a leave is held over work it would drop (a Back press can't be cancelled, so IntakeApp put the
   *  shell's entry back and asks here first). */
  readonly leaveAsk?: ShellLeaveAsk
  /** Told whether the what-if holds a change the plan doesn't (a leave would drop it). */
  readonly onWhatIfHeld?: (held: boolean) => void
  readonly snapshot: MemoryModelSnapshot
  readonly model?: MemoryModel
  /** The unlock's read-only arm: no control that writes the plan or the vault. */
  readonly readOnly?: boolean
  readonly lanes?: TableLanes
  readonly wallCalendarYear?: number
  readonly recommendation?: RailRecommendation
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
  // line (every figured surface carries one state clause, `stateTaxDisclosure.ts`), and the surtax line, verbatim.
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

/** The ask a leave raises over work it would drop. Over an open sheet it rides its own layer above the sheet's backdrop
 *  (the sheet is modal, and an ask beneath it could be neither seen nor pressed): a scrim takes every press meant for
 *  the sheet or the page, Tab and Shift+Tab move between its two choices only, and Escape is Stay (the U8 review's C3,
 *  C7). Focus moves to its safe choice, and goes back where it was on Stay, or to the page's heading when that is gone. */
function LeaveAsk({ ask, overSheet, fallback }: { readonly ask: ShellLeaveAsk; readonly overSheet: boolean; readonly fallback: () => HTMLElement | null }) {
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
  const words = ask.lines.join(' ')
  const box = (
    <div
      className={overSheet ? 'workbench__ask workbench__ask--over' : 'workbench__ask'}
      role={overSheet ? 'alertdialog' : 'alert'}
      aria-modal={overSheet ? true : undefined}
      aria-label={overSheet ? words : undefined}
    >
      {ask.lines.map((line) => (
        <p key={line} className="workbench__ask-text">
          {line}
        </p>
      ))}
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

export default function Shell({
  save,
  onBackup,
  route,
  onNavigate,
  onHome,
  leaveAsk,
  onWhatIfHeld,
  snapshot,
  model = appModel,
  readOnly = false,
  lanes: lanesProp,
  wallCalendarYear = new Date().getFullYear(),
  recommendation,
  whatIfLanes,
}: ShellProps) {
  const announcer = useSaveAnnouncer(save.kind)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const row = rowFor(route) ?? ROUTE_ROWS[0]!
  const screen = row.screen
  const modules = useMemo(() => navModules(), [])
  const module = modules.find((m) => m.id === route.module) ?? modules[0]!

  // Focus to the page's heading on arrival (the project's step-change pattern): it announces the page. A later page
  // change keeps focus where the press left it (the sub-nav's link, or the phone menu's button).
  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  // A new page opens at its own top, never at the old page's scroll.
  const routeKey = routeHash(route)
  const mounted = useRef(false)
  useLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (typeof window.scrollTo === 'function' && !navigator.userAgent.includes('jsdom')) window.scrollTo(0, 0)
  }, [routeKey])

  // ── The lock menu: the one save machine's view, its actions wired to the handlers IntakeApp attached ──────────────
  const lock = composeLockMenu({ save, readOnly, canBackUp: onBackup !== undefined })
  const onLockAction = (action: LockMenuAction) => {
    if (action === 'keep' && save.kind === 'first') save.onKeep()
    else if (action === 'save' && save.kind === 'dirty') save.onSave()
    else if (action === 'retry' && save.kind === 'failed') save.onRetry()
    else if (action === 'reload') window.location.reload()
    else if (action === 'backup') onBackup?.()
  }

  // ── The table's runs, on each FINAL committed answer, whichever page shows ────────────────────────────────────────
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
        deliver(v, rows !== undefined && rows.length > 0 ? { kind: 'rows', key: run.key, rows, meta: run.meta } : { kind: 'error', key: run.key })
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

  // THE SHELL'S WORDS, ON TRANSITIONS ONLY: the answer being worked out again, else the shown table updating.
  const status = snapshot.refiguring ? 'refiguring' : screen === 'interim-table' && state.kind === 'ready' && state.updating ? 'updating' : 'idle'
  const prevStatus = useRef(status)
  useEffect(() => {
    const prev = prevStatus.current
    prevStatus.current = status
    if (status === prev) return
    if (status === 'refiguring') announcer.announce(copy.workbenchPinnedRefiguring)
    else if (status === 'updating') announcer.announce(copy.workbenchTableUpdating)
  }, [status, announcer])
  // The new answer's words, spoken when they change and the answer is not being worked out again (the date route's
  // final lands with no refiguring edge, so the lead's text is the key; the U8 review's C12).
  const lead = pinnedLines(snapshot, wallCalendarYear).lead
  const prevLead = useRef(lead)
  useEffect(() => {
    const prev = prevLead.current
    if (snapshot.refiguring || lead === prev) return
    prevLead.current = lead
    announcer.announce(lead)
  }, [lead, snapshot.refiguring, announcer])

  // ── The facts page's doors (U8) ──────────────────────────────────────────────────────────────────────────────────
  const { draft } = snapshot
  const steps = useMemo(() => intakeSteps(draft), [draft])
  const missing = useMemo(() => missingRequiredFacts(draft), [draft])
  const anchor = useMemo(() => planClockAnchor(draft.startCalendarYear, wallCalendarYear), [draft.startCalendarYear, wallCalendarYear])
  // The stop year the table's LAST DELIVERED run carries, never re-derived (insight 132), held (and marked in words)
  // while a newer answer is worked out: the provisional tier asks no table run (the U8 review's C1).
  const delivered = results.steady?.kind === 'rows' ? results.steady : results.rough?.kind === 'rows' ? results.rough : undefined
  const stopMarked = snapshot.refiguring || delivered === undefined || run.kind !== 'run' || delivered.key !== run.key
  const stop = useMemo((): FactStop | undefined => {
    if (delivered === undefined || run.kind === 'withheld' || run.kind === 'answer-error') return undefined
    const meta = delivered.meta
    if (meta.stopYear === undefined || meta.route === 'spine') return undefined
    return { route: meta.route, year: meta.stopYear, track: meta.track, marked: stopMarked }
  }, [delivered, run.kind, stopMarked])
  const sections = useMemo(
    () => (screen === 'interim-facts' ? composeFacts({ draft, stepIds: steps.map((s) => s.id), anchor, ...(stop !== undefined ? { stop } : {}) }) : []),
    [screen, draft, steps, anchor, stop],
  )

  // Where a door's sheet hands focus back when the door itself is gone: the door again, re-queried at close, else the
  // page's own heading.
  const lastDoor = useRef<FactDoorId | null>(null)
  const restoreFallback = useCallback((): HTMLElement | null => {
    const door = lastDoor.current
    const again = door === null ? null : document.querySelector<HTMLElement>(`[data-fact-open="${door}"]`)
    return again ?? headingRef.current
  }, [])

  const [openStepId, setOpenStepId] = useState<StepSectionId | null>(null)
  // The open step, from the draft's CURRENT walk. A step that left the walk under an edit closes, and its ending runs.
  const openStep = openStepId === null ? null : (steps.find((s) => s.id === openStepId) ?? null)
  if (openStepId !== null && openStep === null) setOpenStepId(null)
  const openStepTitle = useMemo(() => (openStepId === null ? '' : stepSectionTitle(openStepId, draft)), [openStepId, draft])

  const editors = useEditorSheets({
    model,
    snapshot,
    missing,
    savedAnchor: anchor,
    restoreFallback,
    // No collections door here: the facts page has its own Accounts and Other income doors, and the panel's "Edit in
    // the walk-through" would name a walk the shell never leaves for (the U8 review's A4).
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

  // ── The What if page (U15): the one what-if, kept across page switches ─────────────────────────────────────────
  const whatIf = useWhatIf({ snapshot, model, ...(whatIfLanes !== undefined ? { lanes: whatIfLanes } : {}), ...(recommendation !== undefined ? { recommendation } : {}) })
  // A what-if holding a change the plan doesn't is unkept work: IntakeApp asks before a leave drops it, and holds the
  // browser's own leave dialog over it (insight 112: every way out holds). Told to IntakeApp, never put in the open
  // entries' count: the entries' ask says "changes you finished stay in your plan", which a what-if is not.
  const whatIfHeld = whatIf.own.length > 0
  useEffect(() => {
    onWhatIfHeld?.(whatIfHeld)
  }, [whatIfHeld, onWhatIfHeld])
  useEffect(() => () => onWhatIfHeld?.(false), [onWhatIfHeld])
  const [focusLever, setFocusLever] = useState<{ readonly kind: WhatIfLeverKind; readonly n: number } | undefined>(undefined)
  const whatIfRoute = ROUTE_ROWS.find((r) => r.screen === 'interim-whatif')!
  const tryLever = (kind: WhatIfLeverKind) => {
    onNavigate({ module: whatIfRoute.module, page: whatIfRoute.page, ...(whatIfRoute.tab !== undefined ? { tab: whatIfRoute.tab } : {}) })
    setFocusLever((f) => ({ kind, n: (f?.n ?? 0) + 1 }))
  }
  const announce = useCallback((text: string) => announcer.announce(text), [announcer])

  const anySheetOpen = editors.sheetOpen || openStep !== null
  // The committed answer's tier and the store's refiguring flag, mirrored as Result mirrors them: the harnesses'
  // signal that an edit's answer has landed (`SETTLED_RESULT`).
  const answerTier = snapshot.answer.kind === 'headline' || snapshot.answer.kind === 'date' ? snapshot.answer.tier : undefined
  const names = draft.people.map((p) => (p.name ?? '').trim()).filter((n) => n !== '')

  const marketSwitch = (
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
  )

  return (
    <>
      <TopBar
        names={names}
        modules={modules}
        route={route}
        onNavigate={onNavigate}
        onHome={onHome}
        lock={lock}
        onLockAction={onLockAction}
      />
      <SubNav
        label={copy.shellPagesLabel}
        items={module.pages.map((p) => ({ id: p.id, label: p.label, href: routeHash(p.route) }))}
        activeId={route.page}
        onSelect={(id) => {
          const page = module.pages.find((p) => p.id === id)
          if (page !== undefined && !routeEquals(page.route, route)) onNavigate(page.route)
        }}
        className="hidden wide:block"
      />
      <main
        className="result flex flex-1 flex-col pb-10"
        data-shell-screen={screen}
        data-answer-tier={answerTier}
        data-answer-refiguring={snapshot.refiguring ? true : undefined}
      >
        <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
        {/* A failed save speaks on insertion (the save slot's alert arm); its sentence is also first in the lock menu. */}
        {lock.alert ? (
          <p className="sr-only" role="alert">
            {lock.sentence}
          </p>
        ) : null}
        <InterimPage
          title={row.title}
          headingRef={headingRef}
          snapshot={snapshot}
          wallCalendarYear={wallCalendarYear}
          above={
            <>
              {leaveAsk !== undefined && <LeaveAsk ask={leaveAsk} overSheet={anySheetOpen} fallback={() => headingRef.current} />}
              {screen !== 'interim-facts' && marketSwitch}
            </>
          }
        >
          {screen === 'interim-table' && (
            <div className="wb-panel">
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
          )}
          {screen === 'interim-facts' && (
            <div className="wb-panel">
              <FactsPage sections={sections} onTry={tryLever} {...(readOnly ? {} : { onOpen: openDoor })} />
            </div>
          )}
          {screen === 'interim-whatif' && (
            <div className="wb-panel">
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
            </div>
          )}
        </InterimPage>
        {!readOnly && (
          <>
            <StepSheet model={model} step={openStep} title={openStepTitle} onClose={() => setOpenStepId(null)} restoreFallback={restoreFallback} />
            {editors.node}
          </>
        )}
      </main>
    </>
  )
}
