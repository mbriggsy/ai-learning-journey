/*
 * src/ui/workbench/WhatIfPage.tsx — the What if page: the lever rail beside the plan (workbench plan U15; R16 to R20,
 * R22, KTD12 to KTD15; RightCapital's "current vs proposed with action items").
 *
 * ONE FORM, NEVER TWO TABLES (the plan's U15): the plan's reading and the what-if's side by side, each under its run's
 * name; then a fixed set of paired columns, the plan's figure beside the what-if's, cell by cell in each year's row. On
 * a laptop the runs' names sit in real table headers each cell is tied to (`headers`); on a phone each year is one block,
 * each paired column the plan's figure over the what-if's, each figure with its run's name as visible text.
 *
 * THE RUNS (U14, `whatIfRun.ts`): the room holds one what-if slot, made once with the room ({@link useWhatIf}), so a
 * bundle and its results survive a page switch. The slot is asked on each committed answer for the bundle shown, only
 * while the bundle holds a lever: an empty bundle IS the plan, so nothing runs for it. The plan's rows are the table's
 * own lanes' rows, paired with the what-if's only when both carry the same answer key. A what-if never starts a solve
 * or a date search (R22, OQ6): the slot's lanes call `engine.run` alone.
 *
 * APPLY (R16; insights 036, 158): the one write. It reads the bundle and the store's CURRENT snapshot at the press,
 * never the render's, so a figure committed by the press's own blur is the one applied, and it checks once more that
 * the what-if shown is worked out on the answer it would be applied to. It writes through `applyBundle`, the writers
 * the front-room sheets and the facts page use, each re-running the check its home surface relied on (the budget's
 * reconciliation, the family-wide deposit ceiling, a claim already in effect), then recomputes; the store's own rule
 * marks a saved recommendation stale. No solve starts.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type Ref } from 'react'
import { applyBundle } from '@intake/whatIf'
import type { MemoryModel, MemoryModelSnapshot, ModelAnswer } from '@store/memoryModel'
import { canonicalIdentityToken, type LedgerYearRow, type SavedRecommendationV3, type WhatIfLeverKind, type WhatIfLeverV6 } from '@shared/model'
import { copy, slots } from '../copy'
import { recomputeAfterEdit } from '../editorSheets'
import { planClockAnchor } from '../bandAnnotations'
import { answerKey, type TableMeta, type TableRun, type TableView } from './tableRun'
import {
  createWhatIfSlot,
  whatIfRunFor,
  whatIfSlotView,
  type PartView,
  type WhatIfRows,
  type WhatIfSlotLanes,
  type WhatIfSlotSnapshot,
  type WhatIfSlotView,
} from './whatIfRun'
import {
  applyState,
  composePaired,
  composeReadings,
  floorUnread,
  pairedColumnsFor,
  railOffers,
  recommendationBundle,
  refusalWords,
  withLever,
  type ApplyState,
  type PairedFigure,
  type PairedTable,
  type ReadingCell,
  type ReadingsView,
  type WhatIfReadingState,
} from './railChrome'
import { RailLevers, policyWords, rothWords } from './RailLevers'

/** The saved recommendation as the rail reads it (R22): the record on disk and whether the store reads it as current. */
export interface RailRecommendation {
  readonly record: SavedRecommendationV3
  readonly current: boolean
}

/** One view's newest delivered plan rows (the room's table lanes), and the answer they belong to. */
export type PlanRows =
  | { readonly kind: 'rows'; readonly key: string; readonly rows: readonly LedgerYearRow[]; readonly meta: TableMeta }
  | { readonly kind: 'error'; readonly key: string }

const WITHHELD_WORDS: Readonly<Record<Extract<TableRun, { kind: 'withheld' }>['reason'], string>> = {
  'no-run': copy.workbenchWithheldNoRun,
  'no-date-answer': copy.workbenchWithheldNoDate,
  'band-missing': copy.workbenchWithheldBand,
  'no-ledger': copy.workbenchWithheldNoLedger,
}

/** The store's committed answer's key, for the slot's asks (one per committed answer and bundle). */
const EMPTY_BUNDLE_KEY = canonicalIdentityToken([])

const answerKeyOf = (answer: ModelAnswer): string =>
  answer.kind === 'headline' || answer.kind === 'date' ? answerKey(answer) : answer.kind

export interface WhatIf {
  /** The household's own bundle (the editable what-if). */
  readonly own: readonly WhatIfLeverV6[]
  readonly setLever: (target: string, lever: WhatIfLeverV6 | null) => void
  /** Which what-if is shown: the household's own, or the saved recommendation (read-only). */
  readonly mode: 'own' | 'recommendation'
  readonly setMode: (mode: 'own' | 'recommendation') => void
  /** The bundle the slot runs and the page pairs: the recommendation's in its mode, else the household's own. */
  readonly shown: readonly WhatIfLeverV6[]
  readonly shownKey: string
  readonly view: WhatIfSlotView | null
  /** Bumped by Apply: the levers' local fields start again from the plan. */
  readonly epoch: number
  /** The one write. Returns what to say, and whether it wrote (the bundle is then empty: the plan holds it). */
  readonly apply: () => { readonly words: string; readonly applied: boolean }
}

/** The room's one what-if: its slot (made once), the bundle, the mode, the asks, and Apply. */
export function useWhatIf({
  snapshot,
  model,
  lanes,
  recommendation,
}: {
  readonly snapshot: MemoryModelSnapshot
  readonly model: MemoryModel
  readonly lanes?: WhatIfSlotLanes
  readonly recommendation?: RailRecommendation
}): WhatIf {
  const [slot] = useState(() => createWhatIfSlot(lanes))
  const slotSnapshot = useSyncExternalStore(slot.subscribe, slot.getSnapshot)
  const [own, setOwnState] = useState<readonly WhatIfLeverV6[]>([])
  // The bundle's truth for a press (insight 036): written in the same call that commits a lever, read by Apply.
  const ownRef = useRef(own)
  const [mode, setModeState] = useState<'own' | 'recommendation'>('own')
  const modeRef = useRef(mode)
  const [epoch, setEpoch] = useState(0)
  const recBundle = useMemo(
    () => (recommendation !== undefined && recommendation.current ? recommendationBundle(recommendation.record) : null),
    [recommendation],
  )
  // The recommendation's mode holds only while its row can run (current, version 6): otherwise the household's own.
  const effectiveMode = mode === 'recommendation' && recBundle !== null ? 'recommendation' : 'own'
  const shown = effectiveMode === 'recommendation' && recBundle !== null ? recBundle : own
  const shownKey = canonicalIdentityToken(shown)
  const aKey = answerKeyOf(snapshot.answer)
  // The committed answer as last rendered, for Apply's check. A store commit notifies synchronously and its re-render
  // flushes before the next input task, so at a press this is the store's committed answer.
  const answerRef = useRef(snapshot.answer)
  answerRef.current = snapshot.answer
  const seed = snapshot.draft.seed
  // One ask per committed answer and bundle. An empty bundle is the plan itself: nothing to run.
  useEffect(() => {
    if (shown.length > 0) slot.ask(snapshot.answer, seed, shown)
    // Keyed on the answer's key, the seed and the bundle's key: `snapshot.answer` and `shown` are that key's values.
  }, [aKey, seed, shownKey, slot])
  // NOT HELD as an unsaved buffer: the room's leave ask says "changes you finished stay in your plan", false for a
  // what-if. A Back press over an unkept what-if, and its own words, are U16's (its test list), with Keep.

  const setLever = useCallback((target: string, lever: WhatIfLeverV6 | null) => {
    const next = withLever(ownRef.current, target, lever)
    ownRef.current = next
    setOwnState(next)
  }, [])
  const setMode = useCallback((m: 'own' | 'recommendation') => {
    modeRef.current = m
    setModeState(m)
  }, [])

  const apply = useCallback((): { readonly words: string; readonly applied: boolean } => {
    const not = (words: string) => ({ words, applied: false })
    // The store's CURRENT draft and the bundle as just committed (insight 036), never the render's: a figure the press's
    // own blur committed is in `ownRef` before this runs.
    const now = model.getSnapshot()
    const bundle = modeRef.current === 'recommendation' && recBundle !== null ? recBundle : ownRef.current
    const answer = answerRef.current
    if (answer.kind !== 'headline' && answer.kind !== 'date') return not(copy.workbenchRailApplyWaiting)
    const state = applyState(answer.draft, bundle, isCurrent(slot.getSnapshot(), whatIfRunFor(answer, now.draft.seed, bundle).key, now.refiguring))
    if (state.kind === 'empty') return not(copy.workbenchRailApplyEmpty)
    if (state.kind === 'withheld') return not(state.words)
    if (state.kind === 'waiting') return not(copy.workbenchRailApplyWaiting)
    // The writers' own checks, on the draft Apply writes (insight 158): a refusal applies nothing.
    const applied = applyBundle(now.draft, bundle)
    if (!applied.ok) return not(refusalWords(applied.refusal, now.draft.startCalendarYear))
    model.update((d) => {
      const again = applyBundle(d, bundle)
      return again.ok ? again.draft : d
    })
    recomputeAfterEdit(model)
    ownRef.current = []
    setOwnState([])
    modeRef.current = 'own'
    setModeState('own')
    setEpoch((e) => e + 1)
    return { words: [copy.workbenchRailApplyDone, ...(state.leftOverNote !== undefined ? [state.leftOverNote] : [])].join(' '), applied: true }
  }, [model, recBundle, slot])

  const view = shown.length > 0 && slotSnapshot.run.bundleKey === shownKey ? whatIfSlotView(slotSnapshot) : null
  return { own, setLever, mode: effectiveMode, setMode, shown, shownKey, view, epoch, apply }
}

/** Is the slot's many-futures reading worked out on this key (the answer and bundle Apply would write)? */
function isCurrent(s: WhatIfSlotSnapshot, key: string, refiguring: boolean): boolean {
  return !refiguring && s.run.key === key && s.many?.key === key && s.many.kind === 'ok'
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

export interface WhatIfPageProps {
  readonly whatIf: WhatIf
  readonly snapshot: MemoryModelSnapshot
  /** The table lanes' newest plan rows, per view (the room's own). */
  readonly planRows: Partial<Record<TableView, PlanRows>>
  /** The market the table shows (the room's one switch): the paired rows read the same one. */
  readonly view: TableView
  readonly recommendation?: RailRecommendation
  readonly readOnly: boolean
  readonly wallCalendarYear: number
  /** The room's one live region. */
  readonly announce: (text: string) => void
  /** A facts-page link asked for this lever: open it and bring focus to it. `n` changes per ask. */
  readonly focusLever?: { readonly kind: WhatIfLeverKind; readonly n: number }
}

/** The what-if's many-futures reading as the readings take it. */
function readingState(whatIf: WhatIf, startCalendarYear: number): WhatIfReadingState {
  if (whatIf.shown.length === 0) return { kind: 'empty' }
  const v = whatIf.view
  if (v === null) return { kind: 'pending' }
  if (v.kind === 'refused') return { kind: 'refused', words: refusalWords(v.refusal, startCalendarYear) }
  if (v.kind === 'withheld') return { kind: 'refused', words: WITHHELD_WORDS[v.reason] }
  if (v.kind === 'answer-error') return { kind: 'error' }
  const m = v.many
  if (m.kind === 'loading') return { kind: 'pending' }
  if (m.kind === 'error') return { kind: 'error' }
  return { kind: 'ready', reading: m.value.whatIf, updating: m.updating }
}

type PairedState =
  | { readonly kind: 'words'; readonly words: string; readonly role: 'status' | 'alert' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly table: PairedTable; readonly updating: boolean }

function ReadingBox({ cell }: { readonly cell: ReadingCell }) {
  return (
    <div className="wb-reading">
      <p className="wb-reading__label">{cell.label}</p>
      <p className="wb-reading__count">{cell.text}</p>
      {cell.note !== undefined && <p className="wb-reading__note">{cell.note}</p>}
    </div>
  )
}

const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const APPROX = '~'
/** A year a run has no figure for (nothing moved, or no row). */
const NONE = '–'
/** The most paired columns the laptop table holds in the room's column with no sideways scroll: an estimate from the
 *  figure width at 1280 (about 74 px a column beside the year and run headers), not yet measured on the widest bundle. */
const PAIR_FIT_COLUMNS = 9

function Fig({ f }: { readonly f: PairedFigure | null }) {
  if (f === null) return <span className="wb-fig wb-fig--none">{NONE}</span>
  return (
    <span className="wb-fig">
      {f.approx && <span className="wb-fig__approx">{APPROX}</span>}
      {grouped.format(f.dollars)}
    </span>
  )
}

function PairedForm({ state, view }: { readonly state: PairedState; readonly view: TableView }) {
  const uid = useId()
  const captionId = `${uid}-caption`
  const caption = view === 'steady' ? copy.workbenchPairCaptionSteady : copy.workbenchPairCaptionRough
  if (state.kind === 'loading') {
    return (
      <div className="wb-state wb-pair-state" role="status">
        <p className="wb-state__words">{copy.workbenchPairLoading}</p>
      </div>
    )
  }
  if (state.kind === 'words') {
    return (
      <div className="wb-state wb-pair-state" role={state.role}>
        <p className="wb-state__words">{state.words}</p>
      </div>
    )
  }
  const { table, updating } = state
  const plan = copy.workbenchRailPlanLabel
  const whatIf = copy.workbenchRailWhatIfLabel
  const width = 2 + table.columns.length
  const colId = (i: number) => `${uid}-c${i}`
  // Past nine columns the table no longer fits the room's column at a laptop: only then does its frame scroll sideways
  // (the year and run headers held), at the price of the header that otherwise pins under the answer.
  const wide = table.columns.length > PAIR_FIT_COLUMNS
  return (
    <div className="wb-pair-region">
      {updating && <p className="wb-updating">{copy.workbenchTableUpdating}</p>}
      <p id={captionId} className="wb-table__caption">
        {caption}
      </p>
      {/* A laptop: one table. Each year is a group of two rows, the plan's over the what-if's, so the two figures of a
          pair stand in one column, digit under digit; each row's run is a real row header every cell is tied to. */}
      <div className={['wb-pair-wrap', wide ? 'wb-pair-wrap--wide' : '', updating ? 'wb-table-wrap--updating' : ''].filter((c) => c !== '').join(' ')}>
        <table className="wb-table wb-pair" aria-labelledby={captionId} aria-busy={updating || undefined}>
          <thead>
            <tr>
              <th id={`${uid}-year`} scope="col" className="wb-th wb-th--year">
                {copy.workbenchPairYear}
              </th>
              <th id={`${uid}-run`} scope="col" className="wb-th wb-pair__run-head">
                <span className="sr-only">{copy.workbenchPairRun}</span>
              </th>
              {table.columns.map((c, i) => (
                <th key={c.id} id={colId(i)} scope="col" className="wb-th" data-col={c.id}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          {table.rows.map((r) => {
            const y = `${uid}-y${r.t}`
            return (
              <tbody key={r.t} className="wb-pair__year" data-year={r.year}>
                <tr className="wb-pair__plan">
                  <th scope="rowgroup" rowSpan={2} id={y} className="wb-td wb-td--year">
                    <span className="wb-year">{r.year}</span>
                  </th>
                  <th scope="row" id={`${y}-p`} headers={y} className="wb-td wb-pair__run">
                    {plan}
                  </th>
                  {r.cells.map((cell, i) => (
                    <td key={table.columns[i]!.id} className="wb-td" headers={`${y} ${y}-p ${colId(i)}`}>
                      <Fig f={cell.plan} />
                    </td>
                  ))}
                </tr>
                <tr className="wb-pair__what-if">
                  <th scope="row" id={`${y}-w`} headers={y} className="wb-td wb-pair__run wb-pair__run--what-if">
                    {whatIf}
                  </th>
                  {r.cells.map((cell, i) => (
                    <td key={table.columns[i]!.id} className="wb-td" headers={`${y} ${y}-w ${colId(i)}`}>
                      <Fig f={cell.whatIf} />
                    </td>
                  ))}
                </tr>
                {r.notes.length > 0 && (
                  <tr className="wb-notes">
                    <td colSpan={width}>
                      {r.notes.map((n) => (
                        <p key={n} className="wb-note">
                          {n}
                        </p>
                      ))}
                    </td>
                  </tr>
                )}
              </tbody>
            )
          })}
        </table>
      </div>
      {/* A phone: each year one block, each paired column the plan's figure over the what-if's, each figure carrying its
          run's name as visible text. */}
      <ol className={updating ? 'wb-pair-blocks wb-table-wrap--updating' : 'wb-pair-blocks'} aria-labelledby={captionId}>
        {table.rows.map((r) => (
          <li key={r.t} className="wb-pair-block" data-year={r.year}>
            <p className="wb-pair-block__year">{r.year}</p>
            <dl className="wb-pair-block__list">
              {r.cells.map((cell, i) => (
                <div key={table.columns[i]!.id} className="wb-pair-block__item">
                  <dt className="wb-pair-block__col">{table.columns[i]!.header}</dt>
                  <dd className="wb-pair-block__fig">
                    <span className="wb-pair-block__run">{plan}</span>
                    <Fig f={cell.plan} />
                  </dd>
                  <dd className="wb-pair-block__fig">
                    <span className="wb-pair-block__run">{whatIf}</span>
                    <Fig f={cell.whatIf} />
                  </dd>
                </div>
              ))}
            </dl>
            {r.notes.map((n) => (
              <p key={n} className="wb-note">
                {n}
              </p>
            ))}
          </li>
        ))}
      </ol>
      {table.yieldLines.length > 0 && (
        <ul className="wb-stopgaps">
          {table.yieldLines.map((line) => (
            <li key={line} className="wb-stopgaps__line">
              {line}
            </li>
          ))}
        </ul>
      )}
      <p className="wb-foot">{copy.workbenchApproxNote}</p>
    </div>
  )
}

export function WhatIfPage({ whatIf, snapshot, planRows, view, recommendation, readOnly, wallCalendarYear, announce, focusLever }: WhatIfPageProps) {
  const answer = snapshot.answer
  const committed = answer.kind === 'headline' || answer.kind === 'date' ? answer : null
  const draft = committed?.draft ?? snapshot.draft
  const seed = snapshot.draft.seed
  // The plan's own reading and its run meta, for the empty bundle (the plan itself: no run).
  const planRun = useMemo(() => whatIfRunFor(answer, seed, []), [answer, seed])
  const planMeta = planRun.kind === 'run' ? planRun.meta : undefined
  const offers = useMemo(() => (committed === null ? null : railOffers(committed.draft, planMeta?.stopYear)), [committed, planMeta?.stopYear])
  const anchor = useMemo(() => planClockAnchor(draft.startCalendarYear, wallCalendarYear), [draft.startCalendarYear, wallCalendarYear])

  // ── The two readings ──
  const reading = readingState(whatIf, draft.startCalendarYear)
  const many = whatIf.view?.kind === 'shown' ? whatIf.view.many : undefined
  const planReading = many?.kind === 'ready' ? many.value.plan : planRun.kind === 'run' ? planRun.plan : null
  const readings: ReadingsView = composeReadings({
    plan: planReading,
    whatIf: reading,
    route: planMeta?.route ?? 'spine',
    startCalendarYear: draft.startCalendarYear,
    floorUnread: planRun.kind === 'run' && floorUnread(planRun.track, draft, whatIf.shown),
  })
  // Said once when the what-if's reading lands or changes (the room's one live region, on transitions only).
  const spoken = reading.kind === 'ready' && !reading.updating && readings.whatIf.text !== null ? `${readings.whatIf.label}: ${readings.whatIf.text}` : null
  const lastSpoken = useRef<string | null>(null)
  useEffect(() => {
    if (spoken === null || spoken === lastSpoken.current) return
    lastSpoken.current = spoken
    announce(spoken)
  }, [spoken, announce])

  // ── Apply ──
  const current = whatIf.view?.kind === 'shown' && many?.kind === 'ready' && !many.updating && !snapshot.refiguring
  const apply: ApplyState = committed === null ? { kind: 'waiting' } : applyState(committed.draft, whatIf.shown, current)
  // What Apply last said, held for the bundle it was said under (after a write, the empty bundle): any later change to
  // the bundle drops it.
  const [said, setSaid] = useState<{ readonly words: string; readonly key: string } | null>(null)
  const saidNow = said !== null && said.key === whatIf.shownKey ? said.words : null
  const applyWords =
    saidNow ??
    (apply.kind === 'withheld'
      ? apply.words
      : apply.kind === 'open'
        ? (apply.leftOverNote ?? null)
        : apply.kind === 'waiting' && whatIf.shown.length > 0
          ? copy.workbenchRailApplyWaiting
          : null)
  const applyId = useId()

  // ── The paired form ──
  const columns = useMemo(() => pairedColumnsFor(whatIf.shown, draft), [whatIf.shown, draft])
  const lastPaired = useRef<{ readonly key: string; readonly table: PairedTable } | null>(null)
  const paired = ((): PairedState => {
    if (whatIf.shown.length === 0) return { kind: 'words', words: copy.workbenchPairEmpty, role: 'status' }
    const v = whatIf.view
    if (v === null) return held('loading')
    if (v.kind === 'refused') return { kind: 'words', words: refusalWords(v.refusal, draft.startCalendarYear), role: 'status' }
    if (v.kind === 'withheld') return { kind: 'words', words: WITHHELD_WORDS[v.reason], role: 'status' }
    if (v.kind === 'answer-error') return { kind: 'words', words: copy.workbenchTableError, role: 'alert' }
    const part: PartView<WhatIfRows> = view === 'steady' ? v.steady : v.rough
    const planPart = planRows[view]
    if (part.kind === 'error' || planPart?.kind === 'error') return { kind: 'words', words: copy.workbenchPairError, role: 'alert' }
    if (part.kind === 'loading' || planPart === undefined) return held('loading')
    // Rows pair only on one answer (U14's report, its section 5).
    if (planPart.key !== part.answerKey) return held('loading')
    const table = composePaired({ columns, plan: { rows: planPart.rows, meta: planPart.meta }, whatIf: { rows: part.value.rows, meta: part.value.meta } })
    lastPaired.current = { key: `${whatIf.shownKey}|${view}`, table }
    const currentAnswer = planRun.kind === 'run' ? planRun.answerKey : null
    return { kind: 'ready', table, updating: part.updating || part.answerKey !== currentAnswer || snapshot.refiguring }
  })()
  /** While the newest pair is worked out, the last pair of this bundle and view stays, marked as updating (U7's rule). */
  function held(fallback: 'loading'): PairedState {
    const last = lastPaired.current
    if (last !== null && last.key === `${whatIf.shownKey}|${view}`) return { kind: 'ready', table: last.table, updating: true }
    return { kind: fallback }
  }

  // ── A facts-page link opens its lever ──
  const sections = useRef<Partial<Record<WhatIfLeverKind, HTMLDetailsElement | null>>>({})
  const sectionRef = useCallback(
    (kind: WhatIfLeverKind): Ref<HTMLDetailsElement> =>
      (el) => {
        sections.current[kind] = el
      },
    [],
  )
  useEffect(() => {
    if (focusLever === undefined) return
    const el = sections.current[focusLever.kind]
    if (el === null || el === undefined) return
    el.open = true
    el.querySelector<HTMLElement>('summary')?.focus()
  }, [focusLever])

  // ── The saved recommendation's row (R22) ──
  const rec = recommendation
  const recBundle = rec !== undefined ? recommendationBundle(rec.record) : null
  const recRow =
    rec === undefined ? null : (
      <section className="wb-rec" aria-labelledby={`${applyId}-rec`}>
        <h3 id={`${applyId}-rec`} className="wb-rec__title">
          {copy.workbenchRailRecTitle}
        </h3>
        {recBundle === null ? (
          <p className="wb-rec__words">{copy.workbenchRailRecOld}</p>
        ) : !rec.current ? (
          <p className="wb-rec__words">{copy.workbenchRailRecStale}</p>
        ) : (
          <>
            <p className="wb-rec__words">
              {slots.workbenchRailRecAction(
                policyWords(rec.record.action.policy, rec.record.action.drawdownOrder),
                rec.record.action.rothConversion?.kind === 'plan'
                  ? rothWords(rec.record.action.rothConversion.plan, draft.startCalendarYear, anchor)
                  : copy.workbenchRailRecRothNone,
              )}
            </p>
            {whatIf.mode === 'recommendation' ? (
              <>
                <p className="wb-rec__words">{copy.workbenchRailRecShowing}</p>
                <button type="button" className="btn-quiet" onClick={() => whatIf.setMode('own')}>
                  {copy.workbenchRailRecLeave}
                </button>
              </>
            ) : (
              <button type="button" className="btn-quiet" onClick={() => whatIf.setMode('recommendation')}>
                {copy.workbenchRailRecTry}
              </button>
            )}
          </>
        )}
      </section>
    )

  return (
    <div className="wb-whatif">
      <p className="wb-whatif__intro">{copy.workbenchRailIntro}</p>
      <div className="wb-whatif__grid">
        <section className="wb-rail" aria-labelledby={`${applyId}-levers`}>
          <h3 id={`${applyId}-levers`} className="wb-rail__heading">
            {copy.workbenchRailLeversHeading}
          </h3>
          {recRow}
          {offers === null ? (
            <p className="wb-rail__waiting">{copy.workbenchPinnedNone}</p>
          ) : whatIf.mode === 'recommendation' ? null : (
            <RailLevers
              key={whatIf.epoch}
              offers={offers}
              bundle={whatIf.own}
              onLever={whatIf.setLever}
              draft={draft}
              anchor={anchor}
              sectionRef={sectionRef}
            />
          )}
        </section>
        <div className="wb-whatif__result">
          {!readOnly ? (
            <div className="wb-apply">
              <button
                type="button"
                className="btn-primary wb-apply__go"
                aria-disabled={apply.kind !== 'open'}
                aria-describedby={applyWords !== null ? `${applyId}-apply` : undefined}
                onClick={() => {
                  const { words, applied } = whatIf.apply()
                  setSaid({ words, key: applied ? EMPTY_BUNDLE_KEY : whatIf.shownKey })
                  announce(words)
                }}
              >
                {copy.workbenchRailApply}
              </button>
              {applyWords !== null && (
                <p id={`${applyId}-apply`} className="wb-apply__words">
                  {applyWords}
                </p>
              )}
            </div>
          ) : (
            <p className="wb-apply__words">{copy.workbenchRailApplyReadOnly}</p>
          )}
          <section className="wb-readings" aria-labelledby={`${applyId}-readings`}>
            <h3 id={`${applyId}-readings`} className="wb-readings__heading">
              {copy.workbenchRailReadingsHeading}
            </h3>
            <div className="wb-readings__pair">
              <ReadingBox cell={readings.plan} />
              <ReadingBox cell={readings.whatIf} />
            </div>
            {/* The difference line's cell holds its longest form for this plan hidden (the floor note on the floor track,
                else the even line), so a line arriving or leaving moves nothing. */}
            <div className="wb-readings__line-cell">
              <p className="wb-readings__line">{readings.even ?? readings.floorUnread ?? ''}</p>
              <p className="wb-readings__line wb-readings__line--reserve" aria-hidden="true">
                {planRun.kind === 'run' && planRun.track === 'floor'
                  ? copy.workbenchRailFloorUnread
                  : slots.workbenchRailEven(readings.plan.text ?? copy.workbenchRailWorking)}
              </p>
            </div>
          </section>
          <PairedForm state={paired} view={view} />
        </div>
      </div>
    </div>
  )
}
