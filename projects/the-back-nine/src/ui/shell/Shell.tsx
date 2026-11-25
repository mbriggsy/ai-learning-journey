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
 * WHAT IT MAKES ONCE (moved from the workbench room, so runs survive a page switch): Cash Flows' steady
 * and rough lanes and their runs on each FINAL committed answer (KTD9, KTD13: built from the answer's own draft,
 * `tableRunFor`; until the newest answer's rows land, the rows on screen stay, marked as updating), the one what-if
 * (`useWhatIf`: its slot, its committed and pending bundles, and the Action Items tray's open state and hidden rows,
 * so a page move drops none of them), the facts page's doors (a step's group opens that step's body in a sheet,
 * `StepSheet`; the budget and the panel's seats open their own sheets from `editorSheets.tsx`), the leave ask, and
 * the one live region (the save's transitions, the answer being worked out again, the table updating, the new answer's
 * words; spoken on transitions only).
 *
 * RETIREMENT → CASH FLOWS (RC6, `CashFlows.tsx` over `cashFlowsView.ts`): your plan's rows from the runs above; a
 * picked what-if's from the slot that already runs it (the left half's or the right's on Analysis), else from the page's
 * own slot, which runs only while the page shows; your plan beside the what-if open on Analysis pairs the left half's
 * rows with your plan's (U15's paired form). Its folder tab, drill, table and pick are held here, so a page move keeps them.
 *
 * TAX → TAX STRATEGIES (RC8, `TaxStrategies.tsx` over `strategiesView.ts`, `summaryView.ts` and `taxRunsView.ts`): the
 * solve's page. Its folder tab, the goal and heirs' bracket held until Find writes them, the re-pick door, and the
 * Comparison and Details picks are held here; the recommendation's and the baseline's year-by-year runs ride two slots
 * of their own, asked only while Comparison or Details shows (the baseline reads the plan's own rows when it IS the plan).
 *
 * THE INTERIM TABS: the room's pages ride in their current look (`InterimPage.tsx`, outside any `.rc-root`):
 * Profile → Your facts (`FactsPage.tsx`); the old What if page left with
 * RC4b, its levers now Probability's Action Items tray (`ActionItemsTray.tsx`). A facts-page "Try a change" and the
 * assumption panel's withdrawal-order and Roth rows open the tray at the lever's row.
 *
 * THE TWO-UP AND THE PLAN LIST (RC5): Probability's right side runs on its own slot (`useSlotRun`, made once here), so any
 * two of your plan, the kept what-ifs, Recommended and the new what-if sit side by side. The pencil beside the right
 * picker opens the plan list drawer (`PlanListDrawer.tsx`); its writes go to IntakeApp's `onWriteKept`, the plan's one
 * save path. Its typed name box lives here, so closing the drawer or moving page keeps it, and it holds like an unkept
 * what-if (a leave past the shell asks first). Opening another what-if on the left over an unkept one asks first.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { intakeSteps } from '@intake/questions'
import { healthcarePriced, missingRequiredFacts, pricedStateForRun } from '@intake/intakeMap'
import { unsavedBuffersHeld } from '@intake/unsavedBuffer'
import { engineRunLane, type EngineRunRequest, type Lane } from '@store/runLanes'
import { roughWindow, ROUGH_WINDOW_YEARS } from '@engine/reference/roughSequence'
import type { MemoryModel, MemoryModelSnapshot } from '@store/memoryModel'
import type { KeptWhatIfV6, LedgerYearRow, RecommendationGoal, SavedRecommendationV3, SimulationResult, WhatIfLeverKind, WhatIfLeverV6 } from '@shared/model'
import { freshStableId, idsInUse } from '@shared/stableIds'
import type { SavedRecommendationStatus } from '@store/savedRecommendation'
import { Button, Caveat, SubNav } from '../kit'
import { copy, slots } from '../copy'
import { appModel } from '../appModel'
import { planClockAnchor } from '../bandAnnotations'
import { useEditorSheets } from '../editorSheets'
import { useSaveAnnouncer, type ResultSaveProp } from '../saveAnnouncer'
import { pinnedLines, reserveForms } from '../workbench/pinnedLines'
import { FactsPage } from '../workbench/FactsPage'
import { StepSheet, type StepEnding } from '../workbench/StepSheet'
import { composeFacts, stepSectionTitle, type FactStop } from '../workbench/factsChrome'
import type { FactDoorId, StepSectionId } from '../workbench/factRegistry'
import { tableRunFor, type TableMeta, type TableRun, type TableView } from '../workbench/tableRun'
import { sourceKept, useSlotRun, useWhatIf, type RailRecommendation } from '../workbench/useWhatIf'
import { planReadingFor, whatIfRunFor, type WhatIfSlotLanes, type WhatIfSlotView } from '../workbench/whatIfRun'
import { pairedColumnsFor, policyWords, railOffers, recommendationBundle, refusalWords, rothWords } from '../workbench/railChrome'
import { composeVerdictStateNote } from '../stateTaxDisclosure'
import { staticDisclosures } from '../entryCopy'
import { canonicalIdentityToken } from '@shared/model'
import { CashFlows, type PinnedIntroWords } from '../screens/retirement/CashFlows'
import { cashFlowsView, planSelect, type AccountsTable, type CashFlowsPick, type CashFlowsTab, type RunRows, type SummaryDrill } from '../screens/retirement/cashFlowsView'
import type { RecommendationSaveProp } from '../recommendationSaveView'
import { currentEpochDay } from '../scenarioFromDraft'
import { epochDayToCalendarYear } from '@store/staleness'
import { composeAnswerNotes } from '../answerNotes'
import { TaxStrategies, type TaxTab } from '../screens/tax/TaxStrategies'
import { DEFAULT_HEIR_BRACKET, strategiesView } from '../screens/tax/strategiesView'
import { summaryView } from '../screens/tax/summaryView'
import { SummaryPanel } from '../screens/tax/Summary'
import { ComparisonPanel } from '../screens/tax/Comparison'
import { DetailsPanel } from '../screens/tax/Details'
import { comparisonView, detailsView, taxBundles, type ComparisonChart, type DetailsPick, type DetailsTable, type TaxFuture } from '../screens/tax/taxRunsView'
import { SocialSecurity, type ClaimsTab, type SocialSecurityPage } from '../screens/retirement/SocialSecurity'
import {
  claimsComparisonView,
  claimsSettledView,
  claimsSteps,
  claimsSummaryView,
  claimStrategies,
  picks as claimPicks,
  type ClaimsChart,
  type ReadingState,
  type StrategyId,
} from '../screens/retirement/socialSecurityView'
import { Snapshot, type SnapshotDoors } from '../screens/dashboard/Snapshot'
import { snapshotView, type SteadyRows } from '../screens/dashboard/snapshotView'
import { Analysis } from '../screens/retirement/Analysis'
import { confidenceView } from '../screens/retirement/confidenceView'
import { ActionItemsTray, type TrayFocus } from '../screens/retirement/ActionItemsTray'
import { keptIdOf, landingPick, probabilityView, type LeftPick, type ProbabilityChart, type RightPick } from '../screens/retirement/probabilityView'
import { PlanListDrawer, type NameBox } from '../screens/retirement/PlanListDrawer'
import { copyEdit, deleteEdit, keepEdit, listWrites, nameError, orderEdit, outcomeWords, planListView, renameEdit, type KeptEdit, type KeptWriteOutcome } from '../screens/retirement/planListView'
import { InterimPage } from './InterimPage'
import { composeLockMenu, type LockMenuAction } from './lockMenu'
import { composeStaleLines } from './staleLines'
import { StaleBannerStack } from './StaleBannerStack'
import { navModules, routeEquals, routeHash, routeOfScreen, rowFor, ROUTE_ROWS, type Route, type ScreenId } from './routes'
import { TopBar } from './TopBar'

export type TableLanes = Readonly<Record<TableView, Lane<EngineRunRequest, SimulationResult>>>

/** The ask a Back press (or the wordmark) raises over work it would drop. */
export interface ShellLeaveAsk {
  /** What the leave drops, one sentence each (an open entry; an unkept what-if). */
  readonly lines: readonly string[]
  readonly onGo: () => void
  readonly onStay: () => void
  /** The go choice's words, where the leave is not a Back ("Go on", "Open the other one"). */
  readonly goLabel?: string
}

export interface ShellProps {
  /** The plan's save control, derived by IntakeApp from the one save machine. A read-only tab gets `none`. */
  readonly save: ResultSaveProp
  /** Present where a vault exists and the tab can write: the lock menu's Back up opens the existing backup step. */
  readonly onBackup?: () => void
  /** The re-offer: a returning, writable session with no backup file on record (IntakeApp's `needsBackup`). The lock
   *  menu says so beside its Back up (the old answer page's backup door, RC4). */
  readonly backupOffered?: boolean
  /** The assumption panel's guided re-walk: back to the walk-through with every answer kept (IntakeApp asks first over
   *  anything the leave would drop). */
  readonly onReview?: () => void
  /** P3·U13 — a staleness clock fired at unlock: the StaleBanner carries the "figured fresh under today's rules" note. */
  readonly stalenessNote?: boolean
  /** Build 2's clause host (`composeReentry`, session-lifetime): a moved left over rides the rules note as a clause. */
  readonly leftOverClauseHost?: boolean
  /** The page shown (IntakeApp holds it and mirrors it to the hash). */
  readonly route: Route
  /** Move to a page (IntakeApp pushes its history entry). */
  readonly onNavigate: (route: Route) => void
  /** The wordmark: back to the home (Snapshot), asking first over an open drawer's edit. */
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
  /** Snapshot's Recommendations card: the strategy slot's save state and its gesture (IntakeApp owns both machines,
   *  as on the answer page), and the DISK's remembered record with the store's verdict on it. */
  readonly recSave?: RecommendationSaveProp
  readonly recordCard?: { readonly record: SavedRecommendationV3; readonly status: SavedRecommendationStatus }
  /** The aged-balances clause's year (IntakeApp's `agedBalancesYearFor`), for the Invested accounts card. */
  readonly agedBalancesYear?: number
  /** The plan list's one write (RC5): IntakeApp applies the edit to the store's CURRENT list and writes it through the
   *  plan's one save path (KTD19); a Keep with no vault opens the save ceremony (`keep`: the kept id to reopen after). */
  readonly onWriteKept?: (edit: KeptEdit, keep?: string) => Promise<KeptWriteOutcome>
  /** A kept what-if to reopen on the left as the shell mounts (Keep just kept it through the save ceremony). */
  readonly resumeKept?: string
  /** Told once the shell has read `resumeKept`. */
  readonly onResumed?: () => void
  /** The right side's lanes (tests only; made once with its slot otherwise). */
  readonly compareLanes?: WhatIfSlotLanes
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

/** Your plan's rows in one future, from the store's answer and that future's newest result. Until the newest answer's
 *  rows land, the rows on screen stay, marked as updating (KTD9, KTD13). */
function planRows(run: TableRun, result: ViewResult | undefined, refiguring: boolean): RunRows {
  // The answer itself failed: never "your answer is untouched" (the table's own error words), and never rows from before.
  if (run.kind === 'answer-error') return { kind: 'withheld', words: copy.workbenchTableAnswerError }
  if (run.kind === 'withheld') return { kind: 'withheld', words: WITHHELD_WORDS[run.reason] }
  const current = run.kind === 'run' ? run.key : null
  if (result === undefined) return { kind: 'loading' }
  if (result.kind === 'error') return result.key === current ? { kind: 'error' } : { kind: 'loading' }
  return { kind: 'ready', rows: result.rows, meta: result.meta, updating: result.key !== current || refiguring, answerKey: result.key }
}

/** A what-if slot's rows in one future (the slot's one-key rule, `whatIfSlotView`). */
function slotRows(v: WhatIfSlotView | null, future: TableView, startCalendarYear: number, refiguring: boolean): RunRows {
  if (v === null) return { kind: 'loading' }
  if (v.kind === 'refused') return { kind: 'withheld', words: refusalWords(v.refusal, startCalendarYear) }
  if (v.kind === 'withheld') return { kind: 'withheld', words: WITHHELD_WORDS[v.reason] }
  if (v.kind === 'answer-error') return { kind: 'withheld', words: copy.workbenchTableAnswerError }
  const part = v[future]
  if (part.kind === 'loading') return { kind: 'loading' }
  if (part.kind === 'error') return { kind: 'error' }
  return { kind: 'ready', rows: part.value.rows, meta: part.value.meta, updating: part.updating || refiguring, answerKey: part.answerKey }
}

/** Cash Flows' R13 caveat, inside its panel (plan 4.0), as Probability's and Snapshot's. */
const CASH_FLOWS_CAVEAT = [staticDisclosures.honestLimitsScope, staticDisclosures.honestLimitsValidate] as const

/** No levers: a slot shown nothing asks nothing (one array, so the slot's key never moves on a re-render). */
const NO_LEVERS: readonly WhatIfLeverV6[] = []

/** The lever doors and the panel seats a facts-page door opens (every non-step door, exhaustive). */
type SheetDoor = Exclude<FactDoorId, StepSectionId>

/** The ask a leave raises over work it would drop. Over an open sheet it rides its own layer above the sheet's backdrop
 *  (the sheet is modal, and an ask beneath it could be neither seen nor pressed): a scrim takes every press meant for
 *  the sheet or the page, Tab and Shift+Tab move between its two choices only, and Escape is Stay (the U8 review's C3,
 *  C7). Focus moves to its safe choice, and goes back where it was on Stay, or to the page's heading when that is gone. */
/** A leave ask's open-entry line, said over a step whose Go puts it back (its Continue refuses what was changed). */
const PUTS_BACK_LINES: ReadonlyMap<string, string> = new Map([
  [copy.workbenchLeaveAsk, copy.workbenchLeaveAskPutsBack],
  [copy.shellCeremonyOpenEntry, copy.shellCeremonyPutsBack],
])

function LeaveAsk({ ask, overSheet, fallback }:{ readonly ask: ShellLeaveAsk; readonly overSheet: boolean; readonly fallback: () => HTMLElement | null }) {
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
          {ask.goLabel ?? copy.workbenchLeaveGo}
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
  backupOffered = false,
  onReview,
  stalenessNote = false,
  leftOverClauseHost = false,
  route,
  onNavigate,
  onHome,
  leaveAsk,
  onWhatIfHeld,
  snapshot,
  model = appModel,
  readOnly = false,
  lanes: lanesProp,
  wallCalendarYear = epochDayToCalendarYear(currentEpochDay()),
  recommendation,
  whatIfLanes,
  recSave,
  recordCard,
  agedBalancesYear,
  onWriteKept,
  resumeKept,
  onResumed,
  compareLanes,
}: ShellProps) {
  const announcer = useSaveAnnouncer(save.kind)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const row = rowFor(route) ?? ROUTE_ROWS[0]!
  const screen = row.screen
  const modules = useMemo(() => navModules(), [])
  const module = modules.find((m) => m.id === route.module) ?? modules[0]!

  // Focus to the page's heading on arrival (the project's step-change pattern): it announces the page. A later page
  // change keeps focus where the press left it when that control stays (the top bar, the sub-nav's link, the phone
  // menu's button); a press whose control went with the old page (an in-page door, a Back or Forward, a leave ask's Go)
  // left focus on nothing, so the new page's heading takes it.
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
    const active = document.activeElement
    if (active === null || active === document.body || !active.isConnected) headingRef.current?.focus()
    if (typeof window.scrollTo === 'function' && !navigator.userAgent.includes('jsdom')) window.scrollTo(0, 0)
  }, [routeKey])

  // ── The lock menu: the one save machine's view, its actions wired to the handlers IntakeApp attached ──────────────
  const lock = composeLockMenu({ save, readOnly, canBackUp: onBackup !== undefined, backupOffered })
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
  // A page change ends the open step's edit through the sheet's own ending (the focused field commits, a draft its
  // Continue would refuse goes back), never by dropping the open step under it (`StepSheet`'s `endRef`).
  const stepEndRef = useRef<StepEnding | null>(null)
  const endStep = useCallback(() => {
    const ending = stepEndRef.current
    if (ending !== null) ending.end()
    else setOpenStepId(null)
  }, [])

  // ── The one what-if (U14, U15; the tray's since RC4b), kept across page switches ─────────────────────────────────
  const kept: readonly KeptWhatIfV6[] = snapshot.draft.keptWhatIfs ?? []
  // The kept what-if Keep just kept through the save ceremony, reopened on the left as the shell mounts again.
  const [initialKept] = useState(() => (resumeKept === undefined ? undefined : kept.find((k) => k.id === resumeKept)))
  useEffect(() => {
    if (resumeKept !== undefined) onResumed?.()
    // Mount only: the shell reads it once.
  }, [])
  const whatIf = useWhatIf({
    snapshot,
    model,
    ...(whatIfLanes !== undefined ? { lanes: whatIfLanes } : {}),
    ...(recommendation !== undefined ? { recommendation } : {}),
    ...(initialKept !== undefined ? { initialKept } : {}),
  })
  // Probability's first showing in a session (the landing pick, below): a door that arrives with its own pick sets it, so
  // the landing never overrides the side the door asked for.
  const landedOnProbability = useRef(false)

  // ── The Action Items tray's state (RC4b): open or shut, the rows the Edit drawer hid, the lowered deposits waiting for
  // the employer's figure, and the row a door asked for. Held here, so a page move keeps every one of them.
  const [trayOpen, setTrayOpen] = useState(false)
  const [trayHidden, setTrayHidden] = useState<ReadonlySet<string>>(() => new Set())
  const [trayAwaiting, setTrayAwaiting] = useState<ReadonlyMap<string, number>>(() => new Map())
  const [trayFocus, setTrayFocus] = useState<TrayFocus | undefined>(undefined)
  /** A door into a lever (a facts-page "Try a change", the panel's withdrawal-order and Roth rows): Probability with the
   *  tray open at that lever's row, the row shown again if the Edit drawer hid it. The left side is the household's own
   *  what-if (the recommendation's mode shows no lever rows), and the page's first-showing landing pick never overrides it. */
  const setWhatIfMode = whatIf.setMode
  const tryLever = useCallback(
    (kind: WhatIfLeverKind) => {
      landedOnProbability.current = true
      setWhatIfMode('own')
      onNavigate(routeOfScreen('probability'))
      setTrayOpen(true)
      const mine = (id: string) => id === kind || id.startsWith(`${kind}:`)
      setTrayHidden((h) => ([...h].some(mine) ? new Set([...h].filter((id) => !mine(id))) : h))
      setTrayFocus((f) => ({ lever: kind, n: (f?.n ?? 0) + 1 }))
    },
    [onNavigate, setWhatIfMode],
  )

  const editors = useEditorSheets({
    model,
    snapshot,
    missing,
    savedAnchor: anchor,
    restoreFallback,
    onOpenSequencing: () => tryLever('withdrawal-order'),
    onOpenRoth: () => tryLever('roth'),
    // The panel's guided re-walk (the old answer page's Review, RC4): the shell is the home now, so the walk-through is
    // left for from here. No separate collections door: the facts page has its own Accounts and Other income doors.
    ...(onReview !== undefined ? { onReview } : {}),
  })
  // A sheet belongs to the page it was opened on: a page change (a leave ask's Go, a plain Back or Forward) closes every
  // one, so none stays open over the new page (the room's Back unmounted them; the shell's sheets outlive a page). The
  // plan list drawer too: it draws only on Probability, and a state left open would reopen it there unasked.
  const [planListOpen, setPlanListOpen] = useState(false)
  const closeSheets = editors.closeAll
  const sheetsRoute = useRef(routeKey)
  useLayoutEffect(() => {
    if (sheetsRoute.current === routeKey) return
    sheetsRoute.current = routeKey
    endStep()
    closeSheets()
    setPlanListOpen(false)
  }, [routeKey, closeSheets, endStep])
  const sheetDoors: Readonly<Record<SheetDoor, () => void>> = {
    budget: editors.openBudget,
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

  // ── The right side (RC5's two-up): your plan by default, or a kept what-if or the recommendation on its own slot ──
  const [rightPickState, setRightPick] = useState<RightPick>('plan')
  const rightKept = (() => {
    const id = keptIdOf(rightPickState)
    return id === undefined ? undefined : kept.find((k) => k.id === id)
  })()
  const rightRec = useMemo(() => (recommendation !== undefined && recommendation.current ? recommendationBundle(recommendation.record) : null), [recommendation])
  // A pick that can no longer be made (a deleted kept what-if, a record no longer current) reads your plan.
  const rightPick: RightPick = rightPickState === 'recommended' ? (rightRec !== null ? 'recommended' : 'plan') : rightKept !== undefined ? rightPickState : 'plan'
  const rightBundle = useMemo((): readonly WhatIfLeverV6[] => (rightPick === 'recommended' && rightRec !== null ? rightRec : (rightKept?.levers ?? [])), [rightPick, rightRec, rightKept])
  const right = useSlotRun({ snapshot, ...(compareLanes !== undefined ? { lanes: compareLanes } : {}), shown: rightBundle, tag: rightPick })
  // ── The plan list drawer (RC5): open or shut (declared with the sheets above: a page change shuts it), the typed name
  // box (kept here, so a close or a page move drops nothing) and what its last write said.
  const [nameBox, setNameBox] = useState<NameBox | null>(null)
  const [planListSaid, setPlanListSaid] = useState<string | null>(null)
  const boxHeld = nameBox !== null && nameBox.text.trim() !== nameBox.seed.trim()
  // A Keep box names the what-if it was opened over (and `replaces` the kept one that what-if reopened): another what-if
  // on the left (opened from a picker or the list, or Apply's new one) drops it, so it never keeps a different what-if or
  // writes over a different kept one. Opening another asks first over a typed name (`onPick`). A new what-if is keyed on
  // its epoch (Apply and Reset start another, though the source still reads 'new'); a reopened kept one by its id alone,
  // so Reset keeps its box (its kept one is still the one it replaces).
  const sourceKey = whatIf.source.kind === 'kept' ? `kept:${whatIf.source.id}` : `new:${whatIf.epoch}`
  const [boxSource, setBoxSource] = useState(sourceKey)
  if (boxSource !== sourceKey) {
    setBoxSource(sourceKey)
    if (nameBox?.kind === 'keep') setNameBox(null)
  }
  // A box over a kept what-if the list no longer holds (deleted meanwhile) can write nothing it names: it goes.
  const boxTarget = nameBox === null ? undefined : nameBox.kind === 'rename' ? nameBox.id : nameBox.replaces
  if (boxTarget !== undefined && !kept.some((k) => k.id === boxTarget)) setNameBox(null)
  const keepBoxHeld = boxHeld && nameBox?.kind === 'keep'
  // An ask the page raises itself (opening another what-if over an unkept one), beside IntakeApp's leave asks.
  const [pageAsk, setPageAsk] = useState<ShellLeaveAsk | null>(null)
  // A what-if holding a change the plan doesn't, or a tray edit not yet run, is unkept work: IntakeApp asks before a
  // leave drops it, and holds the browser's own leave dialog over it (insight 112: every way out holds). Told to
  // IntakeApp, never put in the open entries' count: the entries' ask says "changes you finished stay in your plan",
  // which a what-if is not. A lowered deposit waiting for the employer's figure is a tray edit too.
  const whatIfHeld = whatIf.held || trayAwaiting.size > 0 || boxHeld
  useEffect(() => {
    onWhatIfHeld?.(whatIfHeld)
  }, [whatIfHeld, onWhatIfHeld])
  useEffect(() => () => onWhatIfHeld?.(false), [onWhatIfHeld])
  // Apply and Reset start the tray's fields again from the plan: a lowered deposit's wait goes with them.
  const [trayEpoch, setTrayEpoch] = useState(whatIf.epoch)
  if (trayEpoch !== whatIf.epoch) {
    setTrayEpoch(whatIf.epoch)
    if (trayAwaiting.size > 0) setTrayAwaiting(new Map())
  }
  // A wait names an account the plan still offers a deposit for: a plan edit that removes the account (or its owner's
  // work) takes the wait with it, so no ask names a deposit change that is no longer there.
  if (trayAwaiting.size > 0) {
    const offered = new Set(railOffers(snapshot.draft, undefined).deposits.map((d) => d.accountId))
    if ([...trayAwaiting.keys()].some((id) => !offered.has(id))) setTrayAwaiting(new Map([...trayAwaiting].filter(([id]) => offered.has(id))))
  }
  const announce = useCallback((text: string) => announcer.announce(text), [announcer])

  // ── Snapshot (RC3): the home, composed once per change by its pure composer ──────────────────────────────────────
  // The steady future's rows for the SHOWN answer: rows asked under an older answer's key never stand for this one.
  const steady = useMemo((): SteadyRows => {
    if (run.kind === 'answer-error') return { kind: 'error' }
    if (run.kind === 'withheld') return { kind: 'withheld', words: WITHHELD_WORDS[run.reason] }
    const r = results.steady
    if (r === undefined || r.key !== runKey) return { kind: 'waiting' }
    return r.kind === 'error' ? { kind: 'error' } : { kind: 'rows', rows: r.rows, meta: r.meta }
  }, [run, runKey, results.steady])
  const retryAnswer = useCallback(() => void model.recompute('final'), [model])
  const todayEpochDay = useMemo(() => currentEpochDay(), [])
  const snap = useMemo(
    () =>
      screen === 'snapshot'
        ? snapshotView({
            snapshot,
            wallCalendarYear,
            readOnly,
            onRetry: retryAnswer,
            steady,
            ...(agedBalancesYear !== undefined ? { agedBalancesYear } : {}),
            recommendation: {
              solve: snapshot.solve,
              save: recSave?.view ?? { kind: 'none' },
              ...(recordCard !== undefined ? { record: recordCard } : {}),
              todayEpochDay,
            },
          })
        : null,
    [screen, snapshot, wallCalendarYear, readOnly, retryAnswer, steady, agedBalancesYear, recSave?.view, recordCard, todayEpochDay],
  )
  const doorTo = (screenId: ScreenId) => {
    const to = routeOfScreen(screenId)
    return { href: routeHash(to), onOpen: () => onNavigate(to) }
  }

  // ── Retirement → Analysis → Probability (RC4) ─────────────────────────────────────────────────────────────────────
  // The left picker is the one what-if's mode: "New what-if" is the household's own bundle, "Recommended" the saved
  // record's own action (`useWhatIf` runs it only while the record is current). On the page's first showing in a
  // session the pick lands on Recommended where a current record can run (plan RC4, "Default on landing"); after that
  // the household's own choice stands, on this page and the What if page alike (one what-if).
  const [chart, setChart] = useState<ProbabilityChart>('rings')
  useEffect(() => {
    if (screen !== 'probability' || landedOnProbability.current) return
    landedOnProbability.current = true
    if (landingPick(snapshot.draft, recordCard) === 'recommended') whatIf.setMode('recommendation')
  }, [screen, snapshot.draft, recordCard, whatIf])
  /** The left picker (RC5): the recommendation is a mode (nothing dropped); a kept what-if or a new one REPLACES the
   *  working bundle, so over an unkept one it asks first. The same pick again returns to it. */
  const onPick = useCallback(
    (pick: LeftPick) => {
      if (pick === 'recommended') {
        whatIf.setMode('recommendation')
        return
      }
      const id = keptIdOf(pick)
      const target = id === undefined ? undefined : kept.find((k) => k.id === id)
      if (id !== undefined && target === undefined) return
      const already = id === undefined ? whatIf.source.kind === 'new' : whatIf.source.kind === 'kept' && whatIf.source.id === id
      if (already) {
        whatIf.setMode('own')
        return
      }
      const go = () => {
        setPageAsk(null)
        if (target !== undefined) {
          whatIf.openKept(target)
          // One thing per side: the right side leaves the kept what-if the left now shows.
          if (rightPick === `kept:${target.id}`) setRightPick('plan')
        } else whatIf.openNew()
        if (trayAwaiting.size > 0) setTrayAwaiting(new Map())
      }
      if (whatIf.held || trayAwaiting.size > 0 || keepBoxHeld) {
        setPageAsk({ lines: [copy.probabilityOpenDropsAsk], goLabel: copy.probabilityOpenGo, onGo: go, onStay: () => setPageAsk(null) })
        return
      }
      go()
    },
    [whatIf, kept, rightPick, trayAwaiting, keepBoxHeld],
  )
  const onPickCompared = useCallback((pick: RightPick) => setRightPick(pick), [])
  const notes = useMemo(
    () => composeAnswerNotes(snapshot, { readOnly, stalenessNote, leftOverClauseHost, agedBalancesYear, wallCalendarYear }),
    [snapshot, readOnly, stalenessNote, leftOverClauseHost, agedBalancesYear, wallCalendarYear],
  )
  // Probability and Confidence are one page (RC7): Confidence reads the page's title, intro, states and caveat from the
  // same composer, and its own panel from `confidenceView`.
  const analysisTab = screen === 'probability' || screen === 'confidence' ? screen : null
  const prob = useMemo(
    () =>
      analysisTab !== null
        ? probabilityView({
            snapshot,
            wallCalendarYear,
            readOnly,
            onRetry: retryAnswer,
            notes,
            whatIf: {
              pick: whatIf.mode === 'recommendation' ? 'recommended' : whatIf.source.kind === 'kept' ? `kept:${whatIf.source.id}` : 'new',
              bundle: whatIf.shown,
              view: whatIf.view,
              landed: whatIf.landed,
              changed: whatIf.changedFromKept,
            },
            compared: { pick: rightPick, bundle: rightBundle, view: right.view, landed: right.landed },
            ...(recordCard !== undefined ? { record: recordCard } : {}),
            chart,
          })
        : null,
    [analysisTab, snapshot, wallCalendarYear, readOnly, retryAnswer, notes, whatIf.mode, whatIf.source, whatIf.shown, whatIf.view, whatIf.landed, whatIf.changedFromKept, rightPick, rightBundle, right.view, right.landed, recordCard, chart],
  )
  // ── Retirement → Analysis → Confidence (RC7): the plan's fan full size and, retired, the run-out share ──────────────
  const conf = useMemo(
    () => (screen === 'confidence' ? confidenceView({ snapshot, notes, onRetry: retryAnswer, readOnly }) : null),
    [screen, snapshot, notes, retryAnswer, readOnly],
  )

  // ── Retirement → Cash Flows (RC6): its tab, drill, table and pick held here, so a page move keeps them ─────────────
  const cfAnswer = snapshot.answer.kind === 'headline' || snapshot.answer.kind === 'date' ? snapshot.answer : null
  const [cfTab, setCfTab] = useState<CashFlowsTab>('summary')
  const [cfDrill, setCfDrill] = useState<SummaryDrill | null>(null)
  const [cfAccounts, setCfAccounts] = useState<AccountsTable>('end')
  const [cfPickState, setCfPick] = useState<CashFlowsPick>('plan')
  const leftKept = sourceKept(whatIf.source, kept)
  const leftName =
    whatIf.mode === 'recommendation'
      ? copy.probabilityPickRecommended
      : leftKept !== undefined
        ? whatIf.changedFromKept
          ? slots.probabilityKeptChanged(leftKept.name)
          : leftKept.name
        : copy.probabilityPickNew
  // The plan select (plan RC6): your plan; the working what-if where it holds a change no kept one names (a reopened
  // kept what-if, unchanged, is offered by its name); each kept what-if; Recommended where a current record can run; and
  // your plan beside the what-if open on Analysis (U15's paired form), where one is open.
  const cfOffers = {
    working: whatIf.own.length > 0 && (whatIf.source.kind === 'new' || whatIf.changedFromKept) ? (leftKept !== undefined ? slots.probabilityKeptChanged(leftKept.name) : copy.probabilityPickNew) : null,
    kept: kept.map((k) => ({ id: k.id, name: k.name })),
    recommended: rightRec !== null,
    paired: whatIf.shown.length > 0 ? leftName : null,
  }
  const cfPick = planSelect(cfOffers, cfPickState).value
  const cfKept = (() => {
    const id = keptIdOf(cfPick)
    return id === undefined ? undefined : kept.find((k) => k.id === id)
  })()
  const cfBundle = useMemo(
    (): readonly WhatIfLeverV6[] => (cfPick === 'new' ? whatIf.own : cfPick === 'recommended' ? (rightRec ?? []) : (cfKept?.levers ?? [])),
    [cfPick, whatIf.own, rightRec, cfKept],
  )
  const cfKey = canonicalIdentityToken(cfBundle)
  // A run already made on Analysis is read from its slot (the left half's, or the right's); only a pick neither side
  // shows runs on the page's own slot, and only while the page shows.
  const cfShares = cfBundle.length === 0 ? null : cfKey === whatIf.shownKey ? whatIf.view : cfKey === canonicalIdentityToken(rightBundle) ? right.view : undefined
  const cfOwn = useSlotRun({ snapshot, shown: screen === 'cash-flows' && cfShares === undefined ? cfBundle : [], tag: 'cash-flows' })
  const cfView = useMemo(() => {
    if (screen !== 'cash-flows') return null
    const startCalendarYear = cfAnswer?.draft.startCalendarYear ?? snapshot.draft.startCalendarYear
    const otherView = cfPick === 'paired' ? whatIf.view : cfShares === undefined ? cfOwn.view : cfShares
    const otherName = cfPick === 'paired' ? leftName : cfPick === 'new' ? (cfOffers.working ?? copy.probabilityPickNew) : cfPick === 'recommended' ? copy.probabilityPickRecommended : (cfKept?.name ?? leftName)
    const years = roughWindowYears()
    return cashFlowsView({
      tab: cfTab,
      drill: cfDrill,
      accounts: cfAccounts,
      future: view,
      pick: cfPick,
      offers: cfOffers,
      plan: planRows(run, results[view], snapshot.refiguring),
      ...(cfPick !== 'plan' ? { other: slotRows(otherView, view, startCalendarYear, snapshot.refiguring), otherName } : {}),
      ...(cfPick === 'paired' && cfAnswer !== null ? { pairedColumns: pairedColumnsFor(whatIf.shown, cfAnswer.draft) } : {}),
      roughYears: { ...years, years: ROUGH_WINDOW_YEARS },
      wallCalendarYear,
      stateClause: cfAnswer !== null ? composeVerdictStateNote(notes.statePricedNote, false) : null,
    })
    // `cfOffers`, `leftName` and `cfKept` are derived each render from the keys listed.
  }, [screen, cfTab, cfDrill, cfAccounts, view, cfPick, run, results, snapshot.refiguring, snapshot.draft.startCalendarYear, cfAnswer, whatIf.view, whatIf.shown, whatIf.own, whatIf.source, whatIf.mode, whatIf.changedFromKept, cfShares, cfOwn.view, kept, rightRec, wallCalendarYear, notes.statePricedNote])
  const cfIntro = useMemo((): PinnedIntroWords | null => {
    if (screen !== 'cash-flows') return null
    const lines = pinnedLines(snapshot, wallCalendarYear)
    const reserve = reserveForms(snapshot, wallCalendarYear)
    return {
      label: copy.workbenchPinnedLabel,
      ...(lines.status !== undefined ? { status: lines.status } : {}),
      lead: lines.lead,
      ...(lines.second !== undefined ? { second: lines.second } : {}),
      reserveStatuses: [copy.workbenchPinnedRefiguring, copy.answerProvisionalTag],
      reserveLeads: reserve.leads,
      reserveSeconds: snapshot.answer.kind === 'date' ? reserve.seconds : [],
    }
  }, [screen, snapshot, wallCalendarYear])

  // THE SHELL'S WORDS, ON TRANSITIONS ONLY: the answer being worked out again, else the shown table updating.
  const status = snapshot.refiguring ? 'refiguring' : cfView?.updating != null ? 'updating' : 'idle'
  const prevStatus = useRef(status)
  useEffect(() => {
    const prev = prevStatus.current
    prevStatus.current = status
    if (status === prev) return
    if (status === 'refiguring') announcer.announce(copy.workbenchPinnedRefiguring)
    else if (status === 'updating') announcer.announce(copy.workbenchTableUpdating)
  }, [status, announcer])

  // ── The Action Items tray (RC4b): what it offers is read off the COMMITTED answer's draft, with the plan's stop year as
  // the plan's own run carries it (insight 132), as U15's rail read them.
  const committedAnswer = snapshot.answer.kind === 'headline' || snapshot.answer.kind === 'date' ? snapshot.answer : null
  const planMeta = useMemo(() => {
    if (screen !== 'probability') return undefined
    const r = whatIfRunFor(snapshot.answer, snapshot.draft.seed, [] as readonly WhatIfLeverV6[])
    return r.kind === 'run' ? r.meta : undefined
  }, [screen, snapshot.answer, snapshot.draft.seed])
  const offers = useMemo(
    () => (screen === 'probability' && committedAnswer !== null ? railOffers(committedAnswer.draft, planMeta?.stopYear) : null),
    [screen, committedAnswer, planMeta?.stopYear],
  )
  const whatIfMany = whatIf.view?.kind === 'shown' ? whatIf.view.many : undefined
  const whatIfCurrent = whatIfMany?.kind === 'ready' && !whatIfMany.updating && !snapshot.refiguring
  const recWords =
    whatIf.mode === 'recommendation' && recommendation !== undefined && committedAnswer !== null
      ? slots.workbenchRailRecAction(
          policyWords(recommendation.record.action.policy, recommendation.record.action.drawdownOrder),
          recommendation.record.action.rothConversion?.kind === 'plan'
            ? rothWords(recommendation.record.action.rothConversion.plan, committedAnswer.draft.startCalendarYear, anchor)
            : copy.workbenchRailRecRothNone,
        )
      : undefined
  // The date route's crowned lifestyle offset: the run the Roth row's notes describe (the Roth sheet's own read).
  const crownedOffset =
    committedAnswer?.kind === 'date' && committedAnswer.outcome.kind === 'dates' && 'offsetYears' in committedAnswer.outcome.lifestyle
      ? committedAnswer.outcome.lifestyle.offsetYears
      : undefined
  const trayId = 'b9-action-items'
  const tray =
    offers !== null && committedAnswer !== null ? (
      <ActionItemsTray
        id={trayId}
        open={trayOpen}
        onOpenChange={setTrayOpen}
        whatIf={whatIf}
        draft={committedAnswer.draft}
        offers={offers}
        editedLabel={prob?.kind === 'reading' ? prob.halves.alternative.title : copy.probabilityPickNew}
        anchor={anchor}
        {...(crownedOffset !== undefined ? { crownedOffset } : {})}
        wallCalendarYear={wallCalendarYear}
        readOnly={readOnly}
        current={whatIfCurrent}
        {...(recWords !== undefined ? { recommendation: recWords } : {})}
        hidden={trayHidden}
        onHidden={setTrayHidden}
        awaiting={trayAwaiting}
        onAwaiting={setTrayAwaiting}
        {...(trayFocus !== undefined ? { focus: trayFocus } : {})}
        announce={announce}
      />
    ) : undefined

  // ── Tax → Tax Strategies (RC8): the folder tab, the held picks, the re-pick door, Comparison's and Details' picks ──
  const [taxTab, setTaxTab] = useState<TaxTab>('strategies')
  const [pickedGoal, setPickedGoal] = useState<RecommendationGoal | undefined>(undefined)
  const [pickedBracket, setPickedBracket] = useState<number | undefined>(undefined)
  const [repick, setRepick] = useState(false)
  const [taxFuture, setTaxFuture] = useState<TaxFuture>('steady')
  const [taxChart, setTaxChart] = useState<ComparisonChart>('assets')
  const [detailsTable, setDetailsTable] = useState<DetailsTable>('withdrawals')
  const [detailsPick, setDetailsPick] = useState<DetailsPick>('recommended')
  const onTaxScreen = screen === 'tax-strategies'
  // The picks shown: the page's own until Find writes them, else the plan's.
  const goalShown = pickedGoal ?? draft.chosenGoal
  const bracketShown = pickedBracket ?? draft.heirBracket ?? DEFAULT_HEIR_BRACKET
  // A solve that starts closes the re-pick door (its result brings the door back under the new Winner card).
  const solveKind = snapshot.solve.kind
  useEffect(() => {
    if (solveKind === 'pending') setRepick(false)
  }, [solveKind])
  const strat = useMemo(
    () =>
      onTaxScreen
        ? strategiesView({
            snapshot,
            picked: { goal: goalShown, heirBracket: bracketShown },
            save: recSave?.view ?? { kind: 'none' },
            ...(recordCard !== undefined ? { record: recordCard } : {}),
            readOnly,
            todayEpochDay,
            wallCalendarYear,
            repick,
          })
        : null,
    [onTaxScreen, snapshot, goalShown, bracketShown, recSave?.view, recordCard, readOnly, todayEpochDay, wallCalendarYear, repick],
  )
  /** Find: the held picks written to the plan (only what moved, so an untouched default adds nothing), then the solve. */
  const onFind = useCallback(() => {
    const goal = pickedGoal ?? model.getSnapshot().draft.chosenGoal
    if (goal === undefined) return
    model.update((d) => {
      const bracket = pickedBracket ?? d.heirBracket ?? DEFAULT_HEIR_BRACKET
      const next = d.chosenGoal === goal ? d : { ...d, chosenGoal: goal }
      return goal === 'leave-more' && bracket !== (d.heirBracket ?? DEFAULT_HEIR_BRACKET) ? { ...next, heirBracket: bracket } : next
    })
    setPickedGoal(undefined)
    setPickedBracket(undefined)
    void model.dispatchSolve()
  }, [model, pickedGoal, pickedBracket])
  const taxPayload = snapshot.solve.kind === 'committed' && snapshot.solve.payload.kind === 'recommended' ? snapshot.solve.payload : null
  const taxRuns = onTaxScreen && (taxTab === 'comparison' || taxTab === 'details') && committedAnswer !== null && taxPayload !== null && !taxPayload.noChange
  const bundles = useMemo(() => (taxPayload !== null && committedAnswer !== null ? taxBundles(taxPayload, committedAnswer.draft) : null), [taxPayload, committedAnswer])
  const taxWinnerRun = useSlotRun({ snapshot, shown: taxRuns && bundles !== null ? bundles.winner : NO_LEVERS, tag: 'tax-winner' })
  const taxBaselineRun = useSlotRun({ snapshot, shown: taxRuns && bundles !== null && bundles.baseline !== 'plan' ? bundles.baseline : NO_LEVERS, tag: 'tax-baseline' })
  const taxCaveat = <Caveat lines={CASH_FLOWS_CAVEAT} />
  const taxStateClause = committedAnswer !== null ? composeVerdictStateNote(pricedStateForRun(committedAnswer.draft), false) : null
  const taxPanels = ((): { readonly summary: ReactNode; readonly comparison: ReactNode; readonly details: ReactNode } => {
    if (!onTaxScreen || strat === null || strat.kind === 'working-route') return { summary: null, comparison: null, details: null }
    const toStrategies = () => setTaxTab('strategies')
    const summary =
      taxTab === 'summary' ? (
        <SummaryPanel view={summaryView(snapshot)} caveat={taxCaveat} footnotes={taxStateClause !== null ? [taxStateClause] : []} onStrategies={toStrategies} />
      ) : null
    if (taxTab !== 'comparison' && taxTab !== 'details') return { summary, comparison: null, details: null }
    // Before a solve, or where the recommendation IS the plan as it stands, there is nothing to run year by year.
    const words = taxPayload === null ? copy.taxStratWaiting : taxPayload.noChange ? copy.taxStratSameAsPlan : null
    if (words !== null) {
      const waiting = (
        <div className="flex flex-col gap-6" data-tax-runs="words">
          <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
            <p className="max-w-2xl text-body text-stone-900">{words}</p>
            {taxPayload === null ? (
              <Button variant="secondary" size="sm" onClick={toStrategies}>
                {copy.taxStratToStrategies}
              </Button>
            ) : null}
          </div>
          {taxCaveat}
        </div>
      )
      return { summary, comparison: taxTab === 'comparison' ? waiting : null, details: taxTab === 'details' ? waiting : null }
    }
    const start = committedAnswer?.draft.startCalendarYear ?? snapshot.draft.startCalendarYear
    const winnerRows = slotRows(taxWinnerRun.view, taxFuture, start, snapshot.refiguring)
    const baselineRows = bundles?.baseline === 'plan' ? planRows(run, results[taxFuture], snapshot.refiguring) : slotRows(taxBaselineRun.view, taxFuture, start, snapshot.refiguring)
    const comparison =
      taxTab === 'comparison' ? (
        <ComparisonPanel
          view={comparisonView({ chart: taxChart, future: taxFuture, winner: winnerRows, baseline: baselineRows, stateClause: taxStateClause })}
          chart={taxChart}
          onChart={setTaxChart}
          future={taxFuture}
          onFuture={setTaxFuture}
          caveat={taxCaveat}
        />
      ) : null
    const details =
      taxTab === 'details' ? (
        <DetailsPanel
          view={detailsView({ table: detailsTable, pick: detailsPick, future: taxFuture, rows: detailsPick === 'recommended' ? winnerRows : baselineRows })}
          table={detailsTable}
          onTable={setDetailsTable}
          pick={detailsPick}
          onPick={setDetailsPick}
          future={taxFuture}
          onFuture={setTaxFuture}
          caveat={taxCaveat}
        />
      ) : null
    return { summary, comparison, details }
  })()
  const taxKeep = strat?.kind === 'solve' ? strat.winner?.keep : undefined
  const onTaxKeep =
    taxKeep !== undefined && snapshot.solve.kind === 'committed' && recSave !== undefined
      ? (() => {
          const ticket = { fingerprint: snapshot.solve.fingerprint, noDollarRegister: taxKeep.noDollarRegister }
          return () => recSave.onSave(ticket)
        })()
      : undefined

  // ── Retirement → Social Security (RC9): the strategies off the COMMITTED final answer's draft, each one that is not the
  // plan run once on its own slot (at most three: the plan's own ages need no run), the tab, chart, picks and tray held
  // here so a page move keeps them.
  const onClaims = screen === 'social-security'
  const [claimsTab, setClaimsTab] = useState<ClaimsTab>('comparison')
  const [claimsChart, setClaimsChart] = useState<ClaimsChart>('annual')
  const [claimsA, setClaimsA] = useState<StrategyId | undefined>(undefined)
  const [claimsB, setClaimsB] = useState<StrategyId | undefined>(undefined)
  const [claimsTray, setClaimsTray] = useState(false)
  const claimsAnswer = committedAnswer !== null && committedAnswer.tier === 'final' ? committedAnswer : null
  const claimChoices = useMemo(() => (onClaims && claimsAnswer !== null ? claimStrategies(claimsAnswer.draft) : null), [onClaims, claimsAnswer])
  const claimOthers = claimChoices?.kind === 'choices' ? claimChoices.strategies.filter((st) => st.id !== 'plan') : []
  const claimRun0 = useSlotRun({ snapshot, shown: claimOthers[0]?.bundle ?? NO_LEVERS, tag: 'claims-0' })
  const claimRun1 = useSlotRun({ snapshot, shown: claimOthers[1]?.bundle ?? NO_LEVERS, tag: 'claims-1' })
  const claimRun2 = useSlotRun({ snapshot, shown: claimOthers[2]?.bundle ?? NO_LEVERS, tag: 'claims-2' })
  const claimsPage = useMemo((): SocialSecurityPage | null => {
    if (!onClaims) return null
    if (claimsAnswer === null || claimChoices === null) {
      if (run.kind === 'answer-error') return { kind: 'words', words: copy.workbenchTableAnswerError }
      if (run.kind === 'withheld') return { kind: 'words', words: WITHHELD_WORDS[run.reason] }
      return { kind: 'words', words: copy.claimsWaiting }
    }
    const start = claimsAnswer.draft.startCalendarYear
    const planSteady = planRows(run, results.steady, snapshot.refiguring)
    if (claimChoices.kind === 'none') return { kind: 'words', words: copy.claimsNone }
    if (claimChoices.kind === 'all-claimed') return { kind: 'settled', view: claimsSettledView(claimChoices.people, planSteady, taxStateClause) }
    const views = [claimRun0.view, claimRun1.view, claimRun2.view]
    const rows: Partial<Record<StrategyId, ReturnType<typeof planRows>>> = { plan: planSteady }
    const plan = planReadingFor(snapshot.answer)
    const readings: Partial<Record<StrategyId, ReadingState>> = { plan: plan === null ? { kind: 'withheld', words: copy.claimsRunsError } : { kind: 'ready', reading: plan } }
    claimOthers.forEach((st, i) => {
      const v = views[i] ?? null
      rows[st.id] = slotRows(v, 'steady', start, snapshot.refiguring)
      if (v === null) readings[st.id] = { kind: 'loading' }
      else if (v.kind === 'refused') readings[st.id] = { kind: 'withheld', words: refusalWords(v.refusal, start) }
      else if (v.kind === 'withheld') readings[st.id] = { kind: 'withheld', words: WITHHELD_WORDS[v.reason] }
      else if (v.kind === 'answer-error') readings[st.id] = { kind: 'withheld', words: copy.workbenchTableAnswerError }
      else if (v.many.kind === 'ready') readings[st.id] = { kind: 'ready', reading: v.many.value.whatIf }
      else readings[st.id] = v.many.kind === 'error' ? { kind: 'withheld', words: copy.claimsRunsError } : { kind: 'loading' }
    })
    const notes = { choices: claimChoices, stateClause: taxStateClause }
    const picked = claimPicks(claimChoices.strategies, claimsA, claimsB)
    const a = claimChoices.strategies.find((st) => st.id === picked.a)!
    return {
      kind: 'choices',
      comparison: claimsComparisonView({ chart: claimsChart, a: claimsA, b: claimsB, notes, rows }),
      summary: claimsSummaryView({ notes, rows, readings }),
      steps: claimsSteps(a, claimChoices.people, start),
    }
    // `claimOthers` is derived from `claimChoices`; the slot views are the runs' own.
  }, [onClaims, claimsAnswer, claimChoices, run, results.steady, snapshot.refiguring, snapshot.answer, taxStateClause, claimRun0.view, claimRun1.view, claimRun2.view, claimsChart, claimsA, claimsB])

  // ── The StaleBanner (RC4): the old answer page's staleness note, aged-balances line and standing line ──────────────
  const figured = screen === 'snapshot' || screen === 'probability' || screen === 'confidence' || screen === 'cash-flows'
  const inFrameCaveat = figured || screen === 'tax-strategies' || screen === 'social-security'
  // Cash Flows too, aged line and door included: its row-one line (`workbenchAged`) names the build year and claims nothing
  // about the balances, so the two lines say two causes (round 3 of the milestone-1 review).
  const staleLines = useMemo(
    () => (figured ? composeStaleLines(notes, !readOnly && onReview !== undefined) : []),
    [figured, notes, readOnly, onReview],
  )

  const snapshotDoors: SnapshotDoors = { analysis: doorTo('probability'), cashFlows: doorTo('cash-flows'), facts: doorTo('interim-facts') }
  const strategiesDoor = doorTo('tax-strategies')
  const recView = snap?.rec.view
  const solve = snapshot.solve
  const onKeep =
    recView?.kind === 'recommended' && recView.keep !== undefined && solve.kind === 'committed' && recSave !== undefined
      ? (() => {
          const ticket = { fingerprint: solve.fingerprint, noDollarRegister: recView.keep.noDollarRegister }
          return () => recSave.onSave(ticket)
        })()
      : undefined
  // Try it in the plan: the Analysis page with the recommendation on the left side (the tray's Apply, RC4b, writes it).
  const onTry = () => {
    whatIf.setMode('recommendation')
    // One thing per side: the right leaves the recommendation the left now shows (the left picker's own rule, `onPick`).
    if (rightPick === 'recommended') setRightPick('plan')
    landedOnProbability.current = true
    snapshotDoors.analysis!.onOpen()
  }
  // A keep that lands while Snapshot or Tax Strategies shows speaks once through the shell's one live region (the durability event,
  // `RecommendationSaveProp.landed`), and is acknowledged so it never repeats later.
  const landed = (screen === 'snapshot' || screen === 'tax-strategies') && recSave?.landed === true
  const onAnnounced = recSave?.onAnnounced
  useEffect(() => {
    if (!landed) return
    announcer.announce(copy.recommendSaveSavedBadge)
    onAnnounced?.()
  }, [landed, onAnnounced, announcer])

  const anySheetOpen = editors.sheetOpen || openStep !== null
  // The committed answer's tier and the store's refiguring flag, mirrored as Result mirrors them: the harnesses'
  // signal that an edit's answer has landed (`SETTLED_RESULT`).
  const answerTier = snapshot.answer.kind === 'headline' || snapshot.answer.kind === 'date' ? snapshot.answer.tier : undefined
  const names = draft.people.map((p) => (p.name ?? '').trim()).filter((n) => n !== '')

  // A leave's Go makes its words true before the leave moves: every sheet closes, and an entry not yet added (the
  // budget's staged rows) is dropped (`workbenchLeaveAsk`, `shellCeremonyOpenEntry`). Over a step whose Continue would
  // refuse what was changed, Go puts that step back (`StepEnding.putsBack`), so the ask says that in place of "changes
  // you finished stay in your plan".
  const stepPutsBack = leaveAsk !== undefined && stepEndRef.current?.putsBack() === true
  const shownAsk: ShellLeaveAsk | undefined =
    leaveAsk !== undefined
      ? {
          ...leaveAsk,
          lines: stepPutsBack ? leaveAsk.lines.map((l) => PUTS_BACK_LINES.get(l) ?? l) : leaveAsk.lines,
          onGo: () => {
            endStep()
            editors.closeAll(true)
            leaveAsk.onGo()
          },
        }
      : (pageAsk ?? undefined)
  // The plan list drawer is modal too: Keep's ask from inside it rides the layer above it.
  const leave =
    shownAsk !== undefined ? <LeaveAsk key={shownAsk.lines.join(' ')} ask={shownAsk} overSheet={anySheetOpen || planListOpen} fallback={() => headingRef.current} /> : null

  // ── The plan list drawer's view and its writes (RC5) ──
  const writes = listWrites(save.kind, readOnly)
  const planList =
    screen === 'probability'
      ? planListView({
          writes,
          recommendation: whatIf.mode === 'recommendation',
          source: whatIf.source,
          own: whatIf.own,
          pending: whatIf.pending,
          kept,
          recommendedOffered: rightRec !== null,
          ...(whatIf.mode === 'own' && whatIf.source.kind === 'kept' ? { leftKept: whatIf.source.id } : {}),
          ...(rightKept !== undefined ? { rightKept: rightKept.id } : {}),
        })
      : null
  const writeKept = async (edit: KeptEdit, keep?: string): Promise<KeptWriteOutcome | null> => {
    if (onWriteKept === undefined) return null
    const outcome = await onWriteKept(edit, keep)
    setPlanListSaid(outcomeWords(outcome))
    return outcome
  }
  /** A landed write closes only the box it was sent from, still holding what it wrote: a box opened (or typed on) while
   *  the write was in flight stays. */
  const closeSentBox = (sent: NameBox) =>
    setNameBox((cur) =>
      cur !== null && cur.kind === sent.kind && cur.text === sent.text && (cur.kind !== 'rename' || (sent.kind === 'rename' && cur.id === sent.id)) ? null : cur,
    )
  const confirmName = (box: NameBox) => {
    if (box.kind === 'rename') {
      void writeKept(renameEdit(box.id, box.text)).then((o) => {
        if (o !== null && o.kind !== 'refused') closeSentBox(box)
      })
      return
    }
    // Keep writes only what the list offers now, and only over the kept what-if the box was opened for: a box whose
    // target is no longer the one Keep would replace writes nothing.
    const keep = planList?.keep
    if (keep?.kind !== 'open' || box.replaces !== keep.replaces?.id) {
      setPlanListSaid(copy.planListRefused)
      return
    }
    const levers = whatIf.own
    const id = box.replaces ?? freshStableId(idsInUse(snapshot.draft))
    const name = box.text.trim()
    const keepNow = () =>
      void writeKept(keepEdit(id, name, levers, box.replaces !== undefined), id).then((o) => {
        if (o === null || o.kind === 'refused' || o.kind === 'ceremony') return
        whatIf.markKept(id)
        closeSentBox(box)
        if (o.kind !== 'failed') {
          const words = slots.planListKept(name)
          setPlanListSaid(words)
          announcer.announce(words)
        }
      })
    // With no saved plan yet, Keep opens the save steps and the shell unmounts for them: over an entry not yet added or a
    // deposit change still waiting for the employer's figure (neither is in the what-if being kept), ask first, as the
    // lock menu's own save does (insight 112: every way out holds). Never the "isn't kept" words: this what-if is kept.
    const buffers = unsavedBuffersHeld() > 0
    const awaiting = trayAwaiting.size > 0
    if (writes.kind === 'open' && writes.ceremony && (buffers || awaiting)) {
      setPageAsk({
        lines: [...(buffers ? [copy.shellCeremonyOpenEntry] : []), ...(awaiting ? [copy.shellKeepDropsWaiting] : [])],
        goLabel: copy.shellCeremonyGo,
        onGo: () => {
          setPageAsk(null)
          keepNow()
        },
        onStay: () => setPageAsk(null),
      })
      return
    }
    keepNow()
  }
  const planListDrawer =
    planList !== null ? (
      <PlanListDrawer
        open={planListOpen}
        onOpenChange={setPlanListOpen}
        view={planList}
        box={writes.kind === 'open' ? nameBox : null}
        onBox={setNameBox}
        validate={(text, exceptId) => nameError(text, kept, exceptId)}
        onOpenLeft={(id) => {
          setPlanListOpen(false)
          onPick(`kept:${id}`)
        }}
        onConfirm={confirmName}
        onCopy={(id) => void writeKept(copyEdit(id))}
        onDelete={(id) => void writeKept(deleteEdit(id))}
        onOrder={(ids, movedId) => {
          const name = kept.find((k) => k.id === movedId)?.name
          void writeKept(orderEdit(ids)).then((o) => {
            if (o !== null && o.kind !== 'refused' && name !== undefined) announcer.announce(slots.planListMoved(name, ids.indexOf(movedId) + 1))
          })
        }}
        said={planListSaid}
      />
    ) : null
  const staleBanner = (
    <StaleBannerStack lines={staleLines} onOpenSeat={(seat) => editors.openAssumptions(seat)} {...(onReview !== undefined && !readOnly ? { onReconfirm: onReview } : {})} />
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
        // A read-only tab mounts no sheet (below), so it draws no gear: a door must open something.
        {...(readOnly ? {} : { onGear: () => editors.openAssumptions() })}
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
        className={inFrameCaveat ? 'result flex flex-1 flex-col bg-bg pb-10' : 'result flex flex-1 flex-col pb-10'}
        data-shell-screen={screen}
        data-answer-tier={answerTier}
        data-answer-refiguring={snapshot.refiguring ? true : undefined}
        // A figured page carries its own R13 caveat inside its frame, so app.css hides App.tsx's trailing mount (plan 4.0).
        data-inframe-disclaimer={inFrameCaveat ? true : undefined}
      >
        <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
        {/* A failed save speaks on insertion (the save slot's alert arm); its sentence is also first in the lock menu. */}
        {lock.alert ? (
          <p className="sr-only" role="alert">
            {lock.sentence}
          </p>
        ) : null}
        {snap !== null ? (
          <>
            {leave}
            {staleBanner}
            <Snapshot
              view={snap}
              headingRef={headingRef}
              doors={snapshotDoors}
              strategies={strategiesDoor}
              onTry={onTry}
              {...(onKeep !== undefined ? { onKeep } : {})}
              {...(onReview !== undefined && !readOnly ? { onReconfirm: onReview } : {})}
            />
          </>
        ) : prob !== null ? (
          <>
            {leave}
            {staleBanner}
            <Analysis
              view={prob}
              headingRef={headingRef}
              tab={analysisTab ?? 'probability'}
              onTab={(tab) => {
                const to = routeOfScreen(tab)
                if (!routeEquals(to, route)) onNavigate(to)
              }}
              {...(conf !== null ? { confidence: conf } : {})}
              {...(onReview !== undefined && !readOnly ? { onReconfirm: onReview } : {})}
              onPick={onPick}
              onPickCompared={onPickCompared}
              onOpenPlanList={() => {
                setPlanListSaid(null)
                setPlanListOpen(true)
              }}
              onChart={setChart}
              strategies={strategiesDoor}
              handle={{ label: copy.trayHandle, open: trayOpen, onOpenChange: setTrayOpen, controls: trayId }}
              {...(tray !== undefined ? { tray } : {})}
            />
            {planListDrawer}
          </>
        ) : strat !== null ? (
          <>
            {leave}
            <TaxStrategies
              headingRef={headingRef}
              strategies={strat}
              tab={taxTab}
              onTab={setTaxTab}
              caveat={CASH_FLOWS_CAVEAT}
              summary={taxPanels.summary}
              comparison={taxPanels.comparison}
              details={taxPanels.details}
              onPickGoal={setPickedGoal}
              onBracket={setPickedBracket}
              onFind={onFind}
              onRepick={() => setRepick(true)}
              {...(onTaxKeep !== undefined ? { onKeep: onTaxKeep } : {})}
              onTry={onTry}
              announce={announce}
            />
          </>
        ) : claimsPage !== null ? (
          <>
            {leave}
            <SocialSecurity
              headingRef={headingRef}
              page={claimsPage}
              tab={claimsTab}
              onTab={setClaimsTab}
              chart={claimsChart}
              onChart={setClaimsChart}
              onPickA={setClaimsA}
              onPickB={setClaimsB}
              caveat={CASH_FLOWS_CAVEAT}
              trayOpen={claimsTray}
              onTrayOpen={setClaimsTray}
            />
          </>
        ) : cfView !== null && cfIntro !== null ? (
          <>
            {leave}
            {staleBanner}
            <CashFlows
              view={cfView}
              headingRef={headingRef}
              intro={cfIntro}
              caveat={CASH_FLOWS_CAVEAT}
              onTab={(tab) => {
                setCfTab(tab)
                setCfDrill(null)
              }}
              onDrill={setCfDrill}
              onAccounts={setCfAccounts}
              onFuture={setView}
              onPick={setCfPick}
            />
          </>
        ) : (
          <InterimPage
            title={row.title}
            headingRef={headingRef}
            snapshot={snapshot}
            wallCalendarYear={wallCalendarYear}
            above={leave}
          >
            {screen === 'interim-facts' && (
              <div className="wb-panel">
                <FactsPage sections={sections} onTry={tryLever} {...(readOnly ? {} : { onOpen: openDoor })} />
              </div>
            )}
            {screen === 'interim-health' && (
              <div className="wb-panel" data-health-interim="">
                {healthcarePriced(draft) ? (
                  readOnly ? (
                    // No sheet mounts on a read-only tab, so no door is drawn (as the facts page's doors).
                    <p className="wb-about__line">{copy.healthInterimReadOnly}</p>
                  ) : (
                    <>
                      <p className="wb-about__line">{copy.healthInterimIntro}</p>
                      <button type="button" className="btn-quiet" data-door="health" onClick={editors.openHealth}>
                        {draft.enhancedSubsidies === true ? copy.leverHealthDoorEditCta : copy.leverHealthDoorCta}
                      </button>
                    </>
                  )
                ) : (
                  <p className="wb-about__line">{copy.healthInterimNone}</p>
                )}
              </div>
            )}
          </InterimPage>
        )}
        {!readOnly && (
          <>
            <StepSheet model={model} step={openStep} title={openStepTitle} onClose={() => setOpenStepId(null)} restoreFallback={restoreFallback} endRef={stepEndRef} />
            {editors.node}
          </>
        )}
      </main>
    </>
  )
}
