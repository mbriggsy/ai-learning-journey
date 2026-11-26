/**
 * Build 2's left-over answer on the intake side (`docs/plans/features/working-year-surplus-build-spec.md`
 * R1–R7, R12, KTD8, KTD9): the ONE write the question's two homes call, and the ONE core the stale lines
 * read. Pure functions of the draft. The shown state itself is `intakeMap.workingYearLeftOverShownState`
 * (the carriage needs it, so it lives beside the money picture it reads); this module imports it one way.
 *
 * THE WRITE (R2, R5, KTD8). A reply is written on the store's CURRENT draft (insight 036), and only while
 * that draft still passes R5's gate — a fresh W and a printed year-0 Left over of $1 or more (the shown
 * state is neither "not asked" nor "waiting on W"). A press that lands after a commit closed the gate
 * stores nothing. "All of it" stores the figure the FACE showed (`shownFigure`: in the panel, the figure
 * the gesture hold drew at the press), never a figure read here: one answer consents to one figure (Key
 * Decisions). Where that differs from the live figure, the answer reads "moved" at once (KTD8). "Spent"
 * and "not sure" store no figure. Nothing ever writes a token for "unanswered": that state is the key's
 * absence (R1). Idempotent: the house's segmented control calls a first tap twice.
 *
 * THE MOVED CORE (R12, U14's obligation (f)). `workingYearLeftOverMoved` returns both figures exactly when
 * the shown state is "saved, moved", or `null`. The re-entry gate's predicate and its sentence both read
 * it, so the two can never disagree — `composeReentry` throws on the fact without its sentence, and its one
 * caller turns that throw into the restore-failed face on every reload.
 *
 * W'S STALE WORDS (R12; the U11 Caddie walk's (ae); their shape from council `wf_7fa86902-35c`). The note the W
 * surfaces print, the line the Result and the gate print, and what their door says are composed here, below,
 * because all three read the left-over answer and the money picture, which `workingYearQuote` cannot import (KTD2).
 */
import type { SimulationParams, WorkingYearLedgerLaterYear, WorkingYearLeftOverKind, WorkingYearLeftOverV5 } from '@shared/model'
import { irmaa } from '@engine/constants/health'
import { survivalToYear } from '@engine/longevity'
import {
  HALF_CENT_DUST_DOLLARS,
  toCents,
  workingYearBottomLine,
  workingYearCredit,
  workingYearCreditBinding,
  type WorkingYearCreditBinding,
} from '@engine/moneyGrain'
import { personOffsetsFor, workingYearCostForYear } from '@engine/simulate'
import type { ScenarioDraft } from '@store/memoryModel'
import {
  LEFT_OVER_WAITING_COPY,
  WORKING_COST_ACT_COPY,
  copy,
  slots,
  workingCostExtras,
  type LeftOverWaitingWords,
  type TypedBelowAmount,
  type TypedBelowAnswer,
  type TypedBelowLeanForm,
  type TypedBelowSpanFrame,
  type TypedBelowSurvivorFrame,
  type TypedBelowYearGroup,
  type WorkingCostAct,
} from '@ui/copy'
import { plainNote, type GateDoor, type NoteDoor, type NoteParts, type NoteSegment } from '@ui/noteParts'
import { formatMoney, formatMoneyPair } from './moneyFormat'
import {
  buildDateInput,
  carriedWorkingYearLeftOver,
  workingYearCostFigure,
  workingYearCostForRun,
  workingYearLedgerForRun,
  workingYearLeftOverLive,
  workingYearLeftOverShownState,
  workingYearWindowTopParams,
} from './intakeMap'
import {
  isWorkingYearCostStale,
  stateTaxBelongsInW,
  workingYearCostAct,
  workingYearCostKeepFigure,
  workingYearCostKeepLabel,
  workingYearCostStaleSentence,
  workingYearCostStaleness,
  workingYearCostTypedBelowQuote,
  workingYearQuote,
  writeConfirmedWorkingYearCost,
} from './workingYearQuote'
import { LEFT_OVER_FACE, LEFT_OVER_MOVED, LEFT_OVER_W_CLAUSE } from './workingYearLeftOverState'

/** The reply as the question's radios name it, written onto `d` — or `d` unchanged where the live draft no
 *  longer passes R5's gate. `shownFigure` is the whole-dollar year-0 Left over the face showed (≥ 1 by
 *  the face's own gate). */
export function writeWorkingYearLeftOver(
  d: ScenarioDraft,
  kind: WorkingYearLeftOverKind,
  shownFigure: number,
): ScenarioDraft {
  // R5's gate: a reply lands only where the question is drawn (the leaf's one face Record).
  if (LEFT_OVER_FACE[workingYearLeftOverShownState(d)] !== 'question') return d
  const answer: WorkingYearLeftOverV5 = kind === 'saved' ? { kind, quotedReal: shownFigure } : { kind }
  return { ...d, workingYearLeftOver: answer }
}

/** The two figures of a "saved, moved" answer — what the household chose against, and today's printed
 *  year-0 Left over — or `null` in every other shown state. The ONE core the moved fact and its words
 *  read (obligation (f)).
 *
 *  `typedBelow` is the figure today's left over rests on, where that needs saying: the typed W (formatted, yearly)
 *  exactly where the typed-below line speaks (`freshTypedBelow`, the line's and its door's own predicate), else
 *  `null`. There the live figure is year 0 at the TYPED figure, while R1's line beside it — on every host that draws
 *  the moved words: the Result's slot and the gate (as that line's own clause, the walk-9 form council's call (1a)), a
 *  rules note's clause above it, the gate's own moved line where neither carries it, and the seat's spans below its
 *  radios — names figures at today's quote (the whole-window rebuild's spans), so the words name the typed figure
 *  (the walk-6 round review's L3-3 / L1-5 / L2-5; U11 walk 7's R2 for the seat). Carried here, not decided per host,
 *  so no host can draw the bare pair beside R1's line (insight 081). */
export interface WorkingYearLeftOverMoved {
  readonly stored: number
  readonly live: number
  readonly typedBelow: string | null
}

export function workingYearLeftOverMoved(d: ScenarioDraft): WorkingYearLeftOverMoved | null {
  const answer = d.workingYearLeftOver
  // The answer first: a draft that is not "saved" never composes the money picture here (the Result reads
  // this on every draft).
  if (answer?.kind !== 'saved' || !LEFT_OVER_MOVED[workingYearLeftOverShownState(d)]) return null
  const live = workingYearLeftOverLive(d)
  return live === null ? null : { stored: answer.quotedReal, live, typedBelow: freshTypedBelow(d)?.typed ?? null }
}

/** The moved line's sentence (after `copy.stalenessLeftOverNote`), and the clause a fired tax, state-tax or
 *  working-years line carries instead (R12) — both read off the moved core's ONE value, so the gate's fact
 *  and its words can never disagree (obligation (f)). Each names the smaller of the two as the most a year adds
 *  (R8 caps every credit at both), and, where the core carries one, the typed figure today's figure rests on. */
export function workingYearLeftOverMovedText(m: WorkingYearLeftOverMoved): string {
  const [stored, live, smaller] = movedFigures(m)
  return m.typedBelow === null
    ? slots.stalenessLeftOverMoved(stored, live, smaller)
    : slots.stalenessLeftOverMovedAt(m.typedBelow, stored, live, smaller)
}

export function workingYearLeftOverMovedClause(m: WorkingYearLeftOverMoved): string {
  const [stored, live, smaller] = movedFigures(m)
  return m.typedBelow === null
    ? slots.stalenessLeftOverClause(stored, live, smaller)
    : slots.stalenessLeftOverClauseAt(m.typedBelow, stored, live, smaller)
}

function movedFigures(m: WorkingYearLeftOverMoved): readonly [string, string, string] {
  return [formatMoney(m.stored), formatMoney(m.live), formatMoney(Math.min(m.stored, m.live))]
}

// ── W'S STALE WORDS (R12; the U11 Caddie walk's (ae), council `wf_fc80029e-d93`, 7/10, Frame B; their SHAPE from
//    council `wf_7fa86902-35c`, 7/10, U11 walk 4). ONE composer for all four surfaces: the W step's note and the
//    panel's W row print the NOTE, the Result's standing line and the re-entry gate print the LINE, and the line
//    always begins with the note (pinned). No threshold figure and no "worse" anywhere (the two vetoed frames). For
//    a "saved" answer waiting on W the line runs in a fixed order per arm: the note, a direction lead, "This answer
//    now:" and what this answer does with the stored figure today, "If a working year costs $X:" and what updating
//    to it does — returned as PARTS since U11 walk 5's (bi), so the hosts draw the labels as structure — then,
//    beside each host's door only, what that host says there (`workingYearCostStaleDoor`). ──

/** The stored figure of a "saved" answer whose W stale line carries R12's clause — the shown state "waiting on
 *  W" (`LEFT_OVER_W_CLAUSE`) — or `null`. The ONE predicate the "saved" lean and the clause both ride, so the
 *  two can never split (insight 081). Under "not asked" a "saved" answer reads as an absent one: nothing is
 *  carried at either figure, and the spending-alone lean is true there by mechanism (`heldYesBelowQuote`'s
 *  docblock). Read on the draft the surface draws: in both W-stale shown states the left-over seat draws no
 *  radios and the write refuses (`LEFT_OVER_FACE`), so the answer read here cannot change under a press —
 *  the R6 / KTD11 amendment at (ae). */
function savedWaitingOnW(d: ScenarioDraft): number | null {
  const answer = d.workingYearLeftOver
  // The answer first: a draft that is not "saved" never composes the money picture here.
  if (answer?.kind !== 'saved') return null
  return LEFT_OVER_W_CLAUSE[workingYearLeftOverShownState(d)] ? answer.quotedReal : null
}

/** The lean after a risen stale sentence, by what the answer is and what a check at the quote does (an exhaustive
 *  Record, insight 147). */
type StaleLean = 'spendingAlone' | 'yearsCheaper' | 'leftOverHigh'

/** W's stale NOTE — the W step's stale note and the panel's W row (`WorkingCostQuestion`, on the draft its
 *  press holds): W's sentence (`workingYearCostStaleSentence`), then, where the spending rose past the held
 *  figure, the lean for this answer:
 *  · `spendingAlone` — absent, spent, not sure, or a "saved" answer that is not asked: no left over is credited at
 *    either figure, so the too-low figure can only hide a short year (b9-7; the U11 walk's (af));
 *  · `yearsCheaper` — "saved", waiting on W, where a working year at the quote comes up short: the stale run carries
 *    no left over and its checked twin carries one, so no whole-answer lean is true across the extension; the
 *    year-level fact is (the Hawk's counterweight);
 *  · `leftOverHigh` — "saved", waiting on W, where NO working year at the quote comes up short (`capped` / `whole` with
 *    no later run): the year-level sentence named a harm that household doesn't have (U11 walk 6's R2: "Does our pay
 *    not cover our years?"), so it says the one it does have — each year's left over reads high by the gap.
 *  `null` while W is not stale. No dollars beyond W's own figures and their gap: a figure here would sit in the fork's
 *  described-by as a reward for a "yes" (the red team's attack 4; PA's tax on pay lives in W, so the quote alone is
 *  rosy there). */
export function workingYearCostStaleNote(d: ScenarioDraft): string | null {
  return staleNoteOf(d, false)
}

/** The note, its `leftOverHigh` comparison scoped "you’re both alive" where `bothAlive` (U11 walk 8's W8-R12 (a)): only
 *  the LINE passes it, where the survivor part follows and sizes such a year; the W surfaces read the unscoped note
 *  (no survivor part beside it there: a scope never shows without its figure, the survivor build's R10). */
function staleNoteOf(d: ScenarioDraft, bothAlive: boolean): string | null {
  const s = workingYearCostStaleSentence(d)
  if (s === null || !s.rose) return s?.sentence ?? null
  const stored = savedWaitingOnW(d)
  const c = stored === null ? null : checkAtQuote(d, stored)
  const lean: StaleLean =
    c === null ? 'spendingAlone' : (c.kind === 'capped' || c.kind === 'whole') && c.laterShort === null ? 'leftOverHigh' : 'yearsCheaper'
  const words: Readonly<Record<StaleLean, () => string>> = {
    spendingAlone: () => slots.workingCostStaleLeansBetter(s.held),
    yearsCheaper: () => slots.workingCostStaleLeftOverYearsCheaper(s.held),
    leftOverHigh: () => slots.workingCostStaleLeftOverInflated(s.held, gapFormatted(d), s.quote, bothAlive),
  }
  return `${s.sentence} ${words[lean]()}`
}

/** Today's quote less the held figure, as the note's two figures print it (whole dollars). Read only where the
 *  spending rose past the held figure, so it is positive. */
function gapFormatted(d: ScenarioDraft): string {
  const w = d.workingYearCost
  return w === undefined ? '0' : formatMoney(workingYearQuote(d).annualReal - workingYearCostFigure(w))
}

/** What a check at today's quote does with a "saved" answer waiting on W whose spending rose past the held
 *  figure — read off the money picture with W re-confirmed at the quote (`writeConfirmedWorkingYearCost`, the
 *  "Yes" tap's own write), never as S − (quote − W). The engine credits each both-alive working year at most
 *  the smallest of that year's cash and year 0's printed left over from the same run and the stored figure
 *  (R8), so year 0 at the quote decides the cap:
 *  · `capped` — it prints $1 or more and less than the stored figure: a check adds at most that;
 *  · `whole` — it prints the stored figure or more: a check adds at most the stored figure;
 *  · `firstShort` / `firstNone` — it prints short, or $0: a check carries nothing (its shown state is "not
 *    asked") and its higher W only adds cost, so the stale answer can look better (true by mechanism);
 *  · `unknown` — no picture at the quote. UNREACHABLE wherever the stale picture is known (the state this
 *    reads in): the re-confirmed draft differs only in W, every input the picture reads but W is the same,
 *    and W at the quote is above $0 (the quote is, `heldYesBelowQuote`) and at most the engine's cap (the
 *    quote is the spending figure, or the budget's first-year lines plus medical, which the same run already
 *    validates). Named so the partition is exhaustive; a test pins the witnesses off it.
 *  `laterShort` (capped and whole only): the run of short years starting at the FIRST later working year the
 *  picture at the quote prints short (everyone alive, the window-top candidate's frame) — each credits nothing
 *  in the checked run and draws more there (the red team's attack 2: a short year the main thread can compute
 *  is never left unsaid). `firstShort` carries the run year 0 starts. A run, never its first year alone (U11
 *  walk 2, b9-3: "that year comes up $4,015 short" read as a one-off where the picture at $105,000 is short
 *  every year from 2029 through 2032, the downside understated beside a gain stated "a year"). */
export interface WorkingYearShortRun {
  /** The run's first short year. */
  readonly firstYear: number
  /** The last year of the unbroken run of short years it starts; `firstYear` itself for a year alone. */
  readonly lastYear: number
  /** Whole dollars, positive: the smallest and the largest shortfall in the run. */
  readonly least: number
  readonly most: number
  /** Whole dollars, positive: each year's shortfall as it prints, in year order from `firstYear` (one per calendar year
   *  of the run). The run's sentences say them in the one amount rule ({@link typedBelowAmountOf}: the walk-9 form
   *  council's call (1), flip (iii)), each figure beside its own years where two groups print. */
  readonly byYear: readonly number[]
}
/** A later run of short years at the quote, and where the years that don't come up short resume after it (U11
 *  walk 4, (be): the gain years named, read off the ledger rows). `resumesFrom` — the calendar year right after
 *  the run, where the picture LISTS that year and no year it lists after the run prints short: every working
 *  year from it on then doesn't come up short (every short year is a listed row, `shortRunFrom`'s docblock).
 *  `null` in every other case — another short year after the run, or no row for the year after it (the window's
 *  end, or a year the picture does not list) — where the line names no years and the reach rides the mechanism
 *  phrase alone (`atMostReach`): a year list that left out a later gain year would be false. */
export interface WorkingYearLaterShort extends WorkingYearShortRun {
  readonly resumesFrom: number | null
}
/** `year` — year 0's calendar year, as the money picture labels it (U11 walk 3, b9-4, (aw): the line names it, as
 *  the run sentences name theirs). `firstShort` carries it as `run.firstYear`. */
export type WorkingYearCheckAtQuote =
  | { readonly kind: 'capped'; readonly year: number; readonly leftOver: number; readonly laterShort: WorkingYearLaterShort | null }
  | { readonly kind: 'whole'; readonly year: number; readonly leftOver: number; readonly laterShort: WorkingYearLaterShort | null }
  | { readonly kind: 'firstShort'; readonly run: WorkingYearShortRun }
  | { readonly kind: 'firstNone'; readonly year: number }
  | { readonly kind: 'unknown' }

/** The run of short years that starts at `first` (short), read on through `after` — the picture's later years
 *  that follow it, in year order. The run continues while each next entry is the very next calendar year and
 *  prints short; it ends at a gap or at a year that does not. Every short later year is an entry (the ledger
 *  names a short year by its cause, or `stillShort` / `erosion` where none: `workingYearLedger.ts`), so a gap
 *  is a year that is not short. Exported for its tests. */
export function shortRunFrom(
  first: { readonly calendarYear: number; readonly bottomLine: number },
  after: readonly WorkingYearLedgerLaterYear[],
): WorkingYearShortRun {
  let lastYear = first.calendarYear
  const byYear = [-first.bottomLine]
  for (const y of after) {
    if (y.calendarYear !== lastYear + 1 || y.bottomLine >= 0) break
    lastYear = y.calendarYear
    byYear.push(-y.bottomLine)
  }
  return { firstYear: first.calendarYear, lastYear, least: Math.min(...byYear), most: Math.max(...byYear), byYear }
}

/** A run of short years' shortfall in the one amount rule ({@link typedBelowAmountOf}), from its own per-year figures. */
const shortRunAmount = (r: WorkingYearShortRun): TypedBelowAmount =>
  typedBelowAmountOf(r.byYear.map((dollars, i) => ({ calendarYear: r.firstYear + i, dollars })))

/** The first later run of short years in a picture's later rows (in year order), with where the years that don't
 *  come up short resume after it ({@link WorkingYearLaterShort}), or `null` where no later row prints short.
 *  Exported for its tests. */
export function laterShortOf(laterYears: readonly WorkingYearLedgerLaterYear[]): WorkingYearLaterShort | null {
  const at = laterYears.findIndex((y) => y.bottomLine < 0)
  if (at < 0) return null
  const run = shortRunFrom(laterYears[at]!, laterYears.slice(at + 1))
  const after = laterYears.filter((y) => y.calendarYear > run.lastYear)
  const resumes = after[0]?.calendarYear === run.lastYear + 1 && after.every((y) => y.bottomLine >= 0)
  return { ...run, resumesFrom: resumes ? run.lastYear + 1 : null }
}

/** Memoized on the SOURCE draft (the re-confirmed draft is a fresh object every call, so the money picture's
 *  own memo would miss it each time — the Result reads this on every render). */
const checkAtQuoteMemo = new WeakMap<ScenarioDraft, WorkingYearCheckAtQuote>()

/** {@link WorkingYearCheckAtQuote} for a draft whose answer is "saved" (the stored figure is passed in by the
 *  one caller that has already read it). */
function checkAtQuote(d: ScenarioDraft, stored: number): WorkingYearCheckAtQuote {
  const memo = checkAtQuoteMemo.get(d)
  if (memo !== undefined) return memo
  const read = composeCheckAtQuote(d, stored)
  checkAtQuoteMemo.set(d, read)
  return read
}

function composeCheckAtQuote(d: ScenarioDraft, stored: number): WorkingYearCheckAtQuote {
  const ledger = workingYearLedgerForRun(writeConfirmedWorkingYearCost(d))
  if (ledger === 'unknown') return { kind: 'unknown' }
  const year0 = ledger.year0.bottomLine
  const year = ledger.year0.calendarYear
  if (year0 < 0) return { kind: 'firstShort', run: shortRunFrom({ calendarYear: year, bottomLine: year0 }, ledger.laterYears) }
  if (year0 < 1) return { kind: 'firstNone', year }
  const laterShort = laterShortOf(ledger.laterYears)
  return year0 < stored ? { kind: 'capped', year, leftOver: year0, laterShort } : { kind: 'whole', year, leftOver: year0, laterShort }
}

/** Exported for the tests and the dev seeds' witnesses: the check at the quote for THIS draft, or `null` where
 *  the line reads none (not a "saved" answer waiting on W, or the spending did not rise past the held figure). */
export function workingYearCheckAtQuote(d: ScenarioDraft): WorkingYearCheckAtQuote | null {
  const stored = savedWaitingOnW(d)
  if (stored === null || workingYearCostStaleSentence(d)?.rose !== true) return null
  return checkAtQuote(d, stored)
}

/** Year 0's print at today's quote leaves nothing over where the spending ROSE past W — under ANY answer, since the
 *  seat waits for every answer and the question goes unasked at the quote whatever was answered: `short` with the run
 *  of short years it starts (U11 walk 7's R5: the seat names it), or `none` (exactly $0); `null` where year 0 there
 *  leaves $1 or more, or the spending did not rise. A "saved" answer waiting on W reads its own check at the quote (one
 *  composer, the line's); any other answer reads the same re-confirmed picture's year 0, memoized on the source draft
 *  like the check. */
//  U11 walk 8's W8-R10 (a) (the walk-8 form spec's U4) adds C's form: year 0 there leaves $1 or more, and a LATER working
//  year there comes up short (`laterShort`, the run `laterShortOf` names) — the sheet said S's words there and never named
//  the run its answer page names. Read the same way, under any answer.
type QuoteLeavesNothing =
  | { readonly kind: 'short'; readonly run: WorkingYearShortRun }
  | { readonly kind: 'none' }
  | { readonly kind: 'laterShort'; readonly run: WorkingYearLaterShort }
const quoteLeavesNothingMemo = new WeakMap<ScenarioDraft, QuoteLeavesNothing | null>()
function quoteLeavesNothing(d: ScenarioDraft): QuoteLeavesNothing | null {
  if (workingYearCostStaleSentence(d)?.rose !== true) return null
  const stored = savedWaitingOnW(d)
  if (stored !== null) {
    const c = checkAtQuote(d, stored)
    if (c.kind === 'firstShort') return { kind: 'short', run: c.run }
    if (c.kind === 'firstNone') return { kind: 'none' }
    return (c.kind === 'capped' || c.kind === 'whole') && c.laterShort !== null ? { kind: 'laterShort', run: c.laterShort } : null
  }
  const memo = quoteLeavesNothingMemo.get(d)
  if (memo !== undefined) return memo
  const ledger = workingYearLedgerForRun(writeConfirmedWorkingYearCost(d))
  const year0 = ledger === 'unknown' ? null : ledger.year0
  let read: QuoteLeavesNothing | null = null
  if (ledger !== 'unknown' && year0 !== null) {
    if (year0.bottomLine < 0) read = { kind: 'short', run: shortRunFrom(year0, ledger.laterYears) }
    else if (year0.bottomLine < 1) read = { kind: 'none' }
    else {
      const later = laterShortOf(ledger.laterYears)
      read = later === null ? null : { kind: 'laterShort', run: later }
    }
  }
  quoteLeavesNothingMemo.set(d, read)
  return read
}

/** The waiting form a read names, where it names one (`null`: the draft's act). */
const QUOTE_LEAVES_WORDS: Readonly<Record<QuoteLeavesNothing['kind'], LeftOverWaitingWords>> = {
  short: 'updateShort',
  none: 'updateNone',
  laterShort: 'updateLaterShort',
}

/** Which words the left-over question's "waiting on W" face and its methodology line speak (U11 walk 6's R3, the
 *  sheet's half): the draft's act (`workingYearCostAct`), except B — W stale with the spending risen past it, and year
 *  0 at today's quote short or at $0 ({@link quoteLeavesNothing}), under ANY answer (the round review's L1-2 / L2-1:
 *  keyed on "saved" alone, an unanswered, spent or not-sure B kept the promise) — whose "Until you update…, no money
 *  left over is added" promised what updating takes away (at the quote or above the question isn't asked, and nothing
 *  is carried): `updateShort` where year 0 there comes up short, `updateNone` at exactly $0 (U11 walk 7's R5: "nothing
 *  left over" read as breaking even where the years draw on savings). Read on every draft the two faces draw; only
 *  "waiting on W" reads it. */
export function workingYearLeftOverWaitingWords(d: ScenarioDraft): LeftOverWaitingWords {
  const q = quoteLeavesNothing(d)
  return q === null ? workingYearCostAct(d) : QUOTE_LEAVES_WORDS[q.kind]
}

/** The seat's "waiting on W" words: the waiting form's copy key, or — `updateShort` and `updateLaterShort`, whose words
 *  carry the draft's dollars — the run of short years at today's quote with its lean, named as the Result's B and C arms
 *  name them (U11 walk 7's R5; walk 8's W8-R10): B, the waiting words and the run, the whole-answer lean, then what
 *  updating does (the lean before the loss, W8-R10 (b)); C, the act's waiting words, then the later run and the years'
 *  lean (W8-R10 (a)). Each run is the all-alive picture's, so under the survivor gate it carries the scope on its head
 *  noun and the seat closes on the survivor part, as the stale line does (W8-R12 (a); a scope never shows without its
 *  figure). Year 0 alone carries neither: no one can have died by then. */
export function workingYearLeftOverWaitingSeat(d: ScenarioDraft): string {
  const q = quoteLeavesNothing(d)
  // `s` is non-null wherever `q` is (the read needs the spending risen past the held figure): narrowing for its figures.
  const s = workingYearCostStaleSentence(d)
  if (q === null || q.kind === 'none' || s === null) {
    // Every keyed form reads its key (the words `workingYearLeftOverWaitingWords` returns off the same `q`).
    return copy[LEFT_OVER_WAITING_COPY[q === null ? workingYearCostAct(d) : 'updateNone'].seat]
  }
  const quote = s.quote ?? formatMoney(workingYearQuote(d).annualReal)
  const held = s.held
  const r = q.run
  const oneYear = r.firstYear === r.lastYear
  const survivor = oneYear && q.kind === 'short' ? null : staleSurvivor(d)
  const bothAlive = survivor !== null
  const words =
    q.kind === 'short'
      ? [
          slots.workingLedgerLeftOverWaitingShort(quote, r.firstYear, r.lastYear, shortRunAmount(r), bothAlive),
          slots.workingCostStaleSeatShortLean(held, oneYear),
          slots.workingLedgerLeftOverWaitingShortUpdate(quote, r.firstYear, oneYear),
        ]
      : [
          copy[WORKING_COST_ACT_COPY[workingYearCostAct(d)].waitingSeat],
          slots.workingCostStaleSeatLaterShort(quote, r.firstYear, r.lastYear, shortRunAmount(r), held, bothAlive),
        ]
  return [...words, ...(survivor === null ? [] : staleSurvivorPart(d, survivor))].join(' ')
}

/** The figures the risen arms print: today's quote and the held figure exactly as W's sentence printed them, and
 *  the stored figure. */
interface TailFigures {
  readonly quote: string
  readonly held: string
  readonly stored: string
  /** The stored figure in whole dollars, as `stored` prints it: the arithmetic a sentence states between printed
   *  figures (A's lower-figure extra, U11 walk 7's R6 (a)) is done on what the reader sees. */
  readonly storedDollars: number
  /** The survivor gate is on (`staleSurvivor`): every run of two or more years, and a later year alone, carries "you’re
   *  both alive" on its head noun, and the line closes on the survivor part (U11 walk 8's W8-R12 (a)). */
  readonly bothAlive: boolean
}

/** One labelled part of W's stale line: its label and the sentences under it (`NoteSegment`; the hosts draw it as a
 *  `div>dt+dd`, council `wf_22858e04-f7a`). */
export type WorkingYearCostStaleSegment = NoteSegment
/** W's stale line as parts: the `opening` — the note ({@link workingYearCostStaleNote}, so it always begins with
 *  what the W surfaces say), then, for a "saved" answer waiting on W, the arm's direction lead — and the labelled
 *  `segments` in the council's order ("This answer now", then on the risen arms "If a working year costs $X").
 *  Every other answer: the note alone, no segments. The door is the host's ({@link workingYearCostStaleDoor}). */
export interface WorkingYearCostStaleLine {
  readonly opening: string
  readonly segments: readonly WorkingYearCostStaleSegment[]
  /** The survivor part (U11 walk 8's W8-R12 (a), the walk-8 form spec's U4), the line's closing paragraph after its
   *  segments and before any door ({@link staleSurvivorPart}): present exactly where the line carries segments, the
   *  spending rose past the held figure, and the engine can draw a working year with one of you dead and the other still
   *  working (A, B, C and F; never S, whose survivor year errs cautious). Absent otherwise (never written as
   *  `undefined`). */
  readonly closing?: readonly string[]
}
/** The line as one string, its parts in order one space apart: what a test compares and a reader's full text. */
export function workingYearCostStaleLineText(l: WorkingYearCostStaleLine): string {
  return [l.opening, ...l.segments.flatMap((s) => [s.label, ...s.sentences]), ...(l.closing ?? [])].join(' ')
}

/** "This answer now" and what this answer does with the stored figure today — every "saved" arm waiting on W says it
 *  (walk 4's (bd)), after its lead and before its "If" part: after work it already uses the spending figure where the
 *  spending moved (walk 5's (bl)), the stored figure dated, why it adds none of it ((bh); `none`), then why it counts no
 *  smaller amount either (U11 walk 6's F6; `why`, absent where `none` already says it brings none back). */
function nowSegment(f: Omit<TailFigures, 'quote'>, afterWork: string | null, none: string, why: string | null): WorkingYearCostStaleSegment {
  return {
    label: copy.workingCostStaleLabelNow,
    sentences: [...(afterWork === null ? [] : [afterWork]), slots.workingCostStaleLeftOverAnswered(f.stored), none, ...(why === null ? [] : [why])],
  }
}
/** The after-work sentence, said where the spending moved (`quoteMoved`: on a state-only move the two figures are the
 *  same), off the draft's spending figure (door 1's anchor), "about" only under a budget. */
function afterWorkSentence(d: ScenarioDraft): string | null {
  const spending = d.annualSpendingReal
  if (workingYearCostStaleness(d)?.quoteMoved !== true || spending === undefined || !Number.isFinite(spending) || spending <= 0) return null
  return slots.workingCostStaleAfterWork(formatMoney(spending), workingYearQuote(d).source === 'spending')
}
/** The either-way lead, in the draft's act (`WORKING_COST_ACT_COPY`). */
const eitherWayLead = (d: ScenarioDraft): string => copy[WORKING_COST_ACT_COPY[workingYearCostAct(d)].eitherWay]
/** After the at-most sentence where a later run prints short at the quote: the years that don't come up short, where
 *  the ledger names them (`resumesFrom`), then what lowers the cap (F7: after "Those are …", never before it, or
 *  "Those" loses its referent), then the run and its close (C keeps it: the safe-side lean, true by mechanism, scoped to
 *  those years since walk 5's (bo), three sentences since walk 6's R5). `eachDollar` — F7's sentence (`capped` only). */
const laterShortWords = (year0: number, s: WorkingYearLaterShort, f: TailFigures, eachDollar: string | null): readonly string[] => [
  ...(s.resumesFrom === null ? [] : [slots.workingCostStaleLeftOverGainYears(year0, s.firstYear - 1, s.resumesFrom)]),
  ...(eachDollar === null ? [] : [eachDollar]),
  s.lastYear === s.firstYear
    ? slots.workingCostStaleShortLaterYear(s.firstYear, formatMoney(s.most), f.held, f.bothAlive)
    : slots.workingCostStaleShortLaterYears(s.firstYear, s.lastYear, shortRunAmount(s), f.held, f.bothAlive),
]
// Year 0 alone carries no scope (no one can have died by then); a run from it does.
const firstShortWords = (s: WorkingYearShortRun, f: TailFigures): string =>
  s.lastYear === s.firstYear
    ? slots.workingCostStaleLeftOverIfFirstShort(s.firstYear, formatMoney(s.most), f.quote, f.held, f.stored)
    : slots.workingCostStaleLeftOverIfFirstShortRun(s.firstYear, s.lastYear, shortRunAmount(s), f.quote, f.held, f.stored, f.bothAlive)
/** Each arm's lead (closing the opening), whether year 0 at the quote leaves nothing over (`short`: B's "This answer
 *  now" then ends on what is true today, R3), and the sentences under "If a working year costs $X" (`null`: no such
 *  part). */
interface CheckWordsOf {
  readonly lead: string
  readonly short: boolean
  readonly ifSentences: readonly string[] | null
}
type CheckWords = {
  readonly [K in WorkingYearCheckAtQuote['kind']]: (c: Extract<WorkingYearCheckAtQuote, { kind: K }>, f: TailFigures, lead: string) => CheckWordsOf
}
/** The risen line after the note, by what a check at the quote does (exhaustive, insight 147), in the council's
 *  order: the lead, "This answer now", "If a working year costs $X". The LEAD (council `wf_7fa86902-35c`): where
 *  year 0 at the quote leaves nothing over (`firstShort` / `firstNone`) the stale answer can look better by
 *  mechanism across the arm, so that leads; everywhere else no whole-answer lean holds across the extension (Frame
 *  B, the Hawk's veto), so the either-way sentence leads (`lead`, in the draft's act). U11 walk 6 closes each "If"
 *  part with what a LOWER figure does (R4: A's form where the cap is year 0's print, B's and C's where a year runs
 *  short; none under `whole`, where the stored figure caps it already), and `capped` with what lowers the cap (F7). */
const CHECK_WORDS: CheckWords = {
  capped: (c, f, lead) => ({
    lead,
    short: false,
    ifSentences: [
      slots.workingCostStaleLeftOverIfCapped(formatMoney(c.leftOver), c.year, f.quote, c.laterShort !== null),
      ...(c.laterShort === null
        ? [
            slots.workingCostStaleEachDollar(f.quote, formatMoney(c.leftOver)),
            // Capped: year 0 at the quote prints below the stored figure, so the extra is a dollar or more.
            slots.workingCostStaleLowerAddsMore(f.quote, formatMoney(c.leftOver), formatMoney(f.storedDollars - Math.round(c.leftOver)), f.stored),
          ]
        : [...laterShortWords(c.year, c.laterShort, f, slots.workingCostStaleEachDollar(f.quote, formatMoney(c.leftOver))), slots.workingCostStaleLowerCountsMore(f.stored)]),
    ],
  }),
  whole: (c, f, lead) => ({
    lead,
    short: false,
    ifSentences: [
      slots.workingCostStaleLeftOverIfWhole(formatMoney(c.leftOver), c.year, f.quote, f.stored, c.laterShort !== null),
      ...(c.laterShort === null ? [] : laterShortWords(c.year, c.laterShort, f, null)),
    ],
  }),
  firstShort: (c, f) => ({
    lead: slots.workingCostStaleShortUntilUpdated(f.held),
    short: true,
    ifSentences: [firstShortWords(c.run, f), copy.workingCostStaleLowerCounts],
  }),
  firstNone: (c, f) => ({
    lead: slots.workingCostStaleShortUntilUpdated(f.held),
    short: true,
    ifSentences: [slots.workingCostStaleLeftOverIfFirstNone(c.year, f.quote, f.stored), copy.workingCostStaleLowerCounts],
  }),
  // No picture at the quote: what R7 makes true, with no figure at the quote and no lean but the either-way one.
  unknown: (_c, _f, lead) => ({ lead, short: false, ifSentences: null }),
}
function checkWords(c: WorkingYearCheckAtQuote, f: TailFigures, lead: string): CheckWordsOf {
  return (CHECK_WORDS[c.kind] as (c: WorkingYearCheckAtQuote, f: TailFigures, lead: string) => CheckWordsOf)(c, f, lead)
}

/** W's ONE stale LINE as the Result and the re-entry gate say it (R12), as parts ({@link WorkingYearCostStaleLine}):
 *  the note ({@link workingYearCostStaleNote}, so the line always begins with what the W surfaces say), then, for a
 *  "saved" answer waiting on W, what the stale W withholds in dollars. `null` while W is not stale. Under any other
 *  answer, and under "not asked" (no picture, or below a printed $1), the line is the note alone. The door's words are
 *  NOT here: each host says its own ({@link workingYearCostStaleDoor}).
 *  · Where the spending rose past the held figure: by what a check at the quote does
 *    ({@link workingYearCheckAtQuote}), the lead, "This answer now" (after work it already uses the spending, the
 *    stored figure dated, why none of it is added, why no smaller amount either), then "If a working year costs $X"
 *    with year 0 there, the most updating adds and what lowers it (and a later short run, where one prints), and what
 *    a lower figure does; or, where year 0 at the quote leaves nothing over, the short-year lead, "This answer now"
 *    ending on what is true today (U11 walk 6's R3), and that updating brings none of it back.
 *  · Otherwise (the spending fell, or only the state moved): the either-way lead in "confirm or change" (the Keep
 *    door is real there), then "This answer now" — after work it already uses the spending figure, where the
 *    spending moved (walk 4's (bf)), the stored figure, dated, and that it guesses at no amount (F6, S's form). No
 *    figure at the quote (the council struck the fallen arm's at-quote pair: there a check adds at most the stored
 *    figure, and naming a print above it would read as more). Its figure is the one the household ANSWERED at
 *    (`quotedReal`), never the live print (KTD7's review, `wf_1b3d4a9f-f3f`): the live print is read on the stale W,
 *    and once a raise lifts it above the stored figure it would name money no checked W can credit — R8 caps every
 *    credit at the stored figure. (Where pay FELL since the answer as well, a check there can add less than the
 *    stored figure: a moved left over hidden behind the stale W, since "waiting on W" outranks "saved, moved". Filed
 *    for U12's register pass as the U11 walk's (al).) */
export function workingYearCostStaleLine(d: ScenarioDraft): WorkingYearCostStaleLine | null {
  const plain = workingYearCostStaleNote(d)
  if (plain === null) return null
  const stored = savedWaitingOnW(d)
  const s = workingYearCostStaleSentence(d)
  // `s` is null exactly where the note is (the note is W's sentence): narrowing for the held figure.
  if (stored === null || s === null) return { opening: plain, segments: [] }
  const f = { held: s.held, stored: formatMoney(stored), storedDollars: Math.round(stored), bothAlive: false }
  const act = WORKING_COST_ACT_COPY[workingYearCostAct(d)]
  const until = slots[act.leftOverNone](f.stored, f.held)
  if (!s.rose) {
    return { opening: `${plain} ${eitherWayLead(d)}`, segments: [nowSegment(f, afterWorkSentence(d), until, copy.workingCostStaleNoGuess)] }
  }
  // The survivor read (W8-R12 (a)): where it is on, the runs and the note's comparison carry the scope, and the line
  // closes on the survivor part (a scope never shows without its figure).
  const survivor = staleSurvivor(d)
  const bothAlive = survivor !== null
  const note = bothAlive ? (staleNoteOf(d, true) ?? plain) : plain
  const words = checkWords(checkAtQuote(d, stored), { ...f, quote: s.quote, bothAlive }, eitherWayLead(d))
  const now = words.short
    ? nowSegment(f, afterWorkSentence(d), slots.workingCostStaleLeftOverNoneNow(f.stored, f.held), null)
    : nowSegment(f, afterWorkSentence(d), until, slots.workingCostStaleNoSmallerAmount(s.quote))
  return {
    opening: `${note} ${words.lead}`,
    segments: [now, ...(words.ifSentences === null ? [] : [{ label: slots.workingCostStaleLabelIf(s.quote), sentences: words.ifSentences }])],
    ...(survivor === null ? {} : { closing: staleSurvivorPart(d, survivor) }),
  }
}

// ── THE OUT-OF-DATE FAMILY'S SURVIVOR PART (U11 walk 8's W8-R12 (a); the walk-8 form spec's U4, measured `3f2d6e4f`: A
//    $4,500, B, C and F $15,750, S −$4,500). Every comparison the stale line and its waiting seat make is the ALL-ALIVE
//    picture's. In a working year with one of you dead and the other still working, the engine credits nothing at either
//    figure and counts W by its survivor rule (`workingYearCostForYear`), so a held figure below today's quote takes the
//    survivor charges' difference less from savings than the quote would, and no stale page said so. The typed-below
//    line's read and words, one home (KD7's words, council `wf_98d8bc0e-e0a`): the held figure in the typed figure's
//    place, the run's carried W against the same draft re-confirmed at today's quote (the "Yes" tap's write). ──

const staleSurvivorMemo = new WeakMap<ScenarioDraft, TypedBelowSurvivor | null>()

/** The survivor read for W's stale figure where the spending rose past it, or `null`: the gate off (no working year of
 *  the window where the engine can draw one of you dead and the other working), the spending not risen past the held
 *  figure (a held figure ABOVE the quote errs cautious in such a year: S's −$4,500), or a ceiling under $1. Under any
 *  answer (the survivor charges read no answer). `'unknown'` reads (no picture, no candidate) give `null`: UNREACHABLE
 *  wherever the stale line is drawn, since the line's own check composes from the same two drafts. Memoized on the
 *  source draft (the re-confirmed draft is a fresh object every call). */
function staleSurvivor(d: ScenarioDraft): TypedBelowSurvivor | null {
  const memo = staleSurvivorMemo.get(d)
  if (memo !== undefined) return memo
  const read = composeStaleSurvivor(d)
  staleSurvivorMemo.set(d, read)
  return read
}

function composeStaleSurvivor(d: ScenarioDraft): TypedBelowSurvivor | null {
  if (workingYearCostStaleSentence(d)?.rose !== true) return null
  const ledger = workingYearLedgerForRun(d)
  const paramsAtHeld = workingYearWindowTopParams(d)
  const paramsAtQuote = workingYearWindowTopParams(writeConfirmedWorkingYearCost(d))
  if (ledger === 'unknown' || paramsAtHeld === 'unknown' || paramsAtQuote === 'unknown') return null
  const read = survivorReadOf(paramsAtHeld, paramsAtQuote, ledger.workingYears.map((y) => y.calendarYear))
  return read === 'unknown' || read === null || read.most < 1 ? null : read
}

/** The stale line's (and its waiting seat's) survivor part: KD7's sentences, the held figure in the typed figure's place,
 *  today's quote in its source's words, the two answers named beside their figures (the walk-9 form council's call (4):
 *  this family compares two answers in dollars nowhere else); its close the line's first rider, so glossed (KD3). */
function staleSurvivorPart(d: ScenarioDraft, survivor: TypedBelowSurvivor): readonly string[] {
  const s = workingYearCostStaleSentence(d)
  const q = workingYearQuote(d)
  const frame: TypedBelowSurvivorFrame = {
    typed: s?.held ?? formatMoney(survivor.chargeAtTyped),
    quote: s?.quote ?? formatMoney(q.annualReal),
    source: q.source,
    names: 'answers',
  }
  return survivorPartOf(survivor, frame, irmaa.value.magiLookbackYears)
}

/** W's stale DOOR on each host (council `wf_7fa86902-35c`; its FORM since council `wf_22858e04-f7a`), said only where
 *  the tab can save (a read-only tab draws no door, so it is told no buttons to press). `act` picks the door's own words
 *  (`WORKING_COST_ACT_COPY`).
 *  · `gate` — on EVERY stale arm: `section.reentry-door` under the gate's buttons, its heading, the scope sentence
 *    (neither of the gate's buttons changes the figure) and the route (where each leads). The W row's buttons are named
 *    only on the Result and the W row itself: on the gate "Yes, that’s about right" sat beside "Balances still about
 *    right" (council (2), (3) — moved only with the Keep condition above Keep, `workingYearCostKeepCondition`).
 *  · `result` — the Result door's last dt/dd, for a "saved" answer waiting on W only (`null` elsewhere: the line leans on
 *    the act nowhere but the door, so the button rides inline): the press sentence, the condition, the cost list (the W
 *    help's own items), then each choice with its condition first — risen, "No" (enter the quote plus them) and "Yes"
 *    at today's figure (no Keep door below the quote: `keepable` is exactly `!heldYesBelowQuote`); fallen, what the
 *    figure should hold (it names no button), where the held figure is above the quote the room it leaves (F11), then
 *    the Keep door by its own label, "Yes" where a quote is offered (`offersYes`), and "No".
 *  `null` while W is not stale. */
export interface WorkingYearCostStaleDoor {
  readonly act: WorkingCostAct
  readonly gate: GateDoor
  readonly result: NoteDoor | null
}

export function workingYearCostStaleDoor(d: ScenarioDraft): WorkingYearCostStaleDoor | null {
  const s = workingYearCostStaleSentence(d)
  const w = d.workingYearCost
  if (s === null || w === undefined) return null
  const act = workingYearCostAct(d)
  const a = WORKING_COST_ACT_COPY[act]
  const doorLabel = copy[a.resultDoor]
  const gate = gateDoor(act, s.held)
  const heading = gate.heading
  if (savedWaitingOnW(d) === null) return { act, gate, result: null }
  const press = slots[a.resultDoorLead](doorLabel)
  const items = workingCostExtras(stateTaxBelongsInW(d))
  // The figure "No" asks for, in the unit of the box it leaves the reader in: a figure held as typed by the month
  // opens its box in months with the unit already answered (the period prompt never asks there), so today's quote is
  // said a month; every other box opens its unit unanswered, so it is said a year (the round review).
  const enterMonthly = w.kind === 'entered' && w.entryPeriod === 'month'
  const enter = (quoteFormatted: string): readonly [string, boolean] =>
    enterMonthly ? [formatMoney(workingYearQuote(d).annualReal / 12), true] : [quoteFormatted, false]
  if (s.rose) {
    return {
      act,
      gate,
      result: {
        label: heading,
        lead: [press, slots.workingCostStaleDoorIfUpdate(...enter(s.quote))],
        items,
        tail: [copy.workingCostStaleDoorCounted, slots.workingCostStaleDoorYes(s.quote)],
      },
    }
  }
  const keepLabel = workingYearCostKeepLabel(w)
  const keep = workingYearCostKeepFigure(w)
  const room = keepRoom(d)
  const tail =
    s.quote === null
      ? [press, slots.workingCostStaleDoorKeepNoQuote(keepLabel, keep.formatted, keep.monthly)]
      : room === null
        ? [
            press,
            slots.workingCostStaleDoorKeepCovers(keepLabel, keep.formatted, keep.monthly),
            slots.workingCostStaleDoorYes(s.quote),
            slots.workingCostStaleDoorNoPlus(...enter(s.quote)),
          ]
        : // Above the quote, the none choice first (U11 walk 8's W8-R12 (c)): a household with none of the costs met
          // "$6,000 or less" and was steered to Keep.
          [
            slots.workingCostStaleDoorMore(s.held, room, s.quote),
            press,
            slots.workingCostStaleDoorYesFirst(s.quote),
            slots.workingCostStaleDoorKeepUpTo(keepLabel, room),
            slots.workingCostStaleDoorNoPlus(...enter(s.quote)),
          ]
  return { act, gate, result: { label: heading, lead: [copy.workingCostStaleDoorHold], items, tail } }
}

/** The gate's door in an act, for the figure it names (`section.reentry-door`, council `wf_22858e04-f7a` (2)): the
 *  heading, the scope sentence and the route, each in the act's own words (`WORKING_COST_ACT_COPY`). ONE home for W's
 *  stale door and the typed-below line's ({@link workingYearCostTypedBelowDoor}), so the two can never word one door
 *  two ways. */
function gateDoor(act: WorkingCostAct, heldFormatted: string): GateDoor {
  const a = WORKING_COST_ACT_COPY[act]
  return {
    heading: slots[a.doorHeading](heldFormatted),
    scope: slots[a.gateScope](heldFormatted),
    route: slots.workingCostStaleGateRoute(copy[a.resultDoor]),
  }
}

/** The room a held figure ABOVE today's quote leaves for the costs the W help lists — the held figure less the quote,
 *  whole dollars — or `null` where it is not a dollar or more above it (or no quote is offered). F11's "$6,000", the one
 *  home the Result's door and the Keep condition read (U11 walk 6: "The $6,000 is never written"). */
function keepRoom(d: ScenarioDraft): string | null {
  const w = d.workingYearCost
  const quote = workingYearQuote(d).annualReal
  if (w === undefined || !(quote > 0)) return null
  const room = workingYearCostFigure(w) - quote
  return room >= 1 ? formatMoney(room) : null
}

/** The Keep door's condition, drawn ABOVE it on the W row (council `wf_22858e04-f7a` (3), the Hawk's condition; U11 walk
 *  6's F11, moved above): with the gate no longer naming the W row's choices, Keep — drawn above the cost lists — must
 *  never read as a safe confirmation. Above today's quote, the room the figure leaves for the costs listed below;
 *  otherwise (or with no quote), the figure's own terms. Read on the draft the press holds (`WorkingCostQuestion`'s
 *  note draft, like the door it describes); `null` with no W. */
export function workingYearCostKeepCondition(d: ScenarioDraft): string | null {
  const w = d.workingYearCost
  if (w === undefined) return null
  const label = workingYearCostKeepLabel(w)
  const room = keepRoom(d)
  if (room !== null) return slots.workingCostKeepConditionUpTo(label, room, formatMoney(workingYearQuote(d).annualReal))
  const keep = workingYearCostKeepFigure(w)
  return slots.workingCostKeepConditionCovers(label, keep.formatted, keep.monthly)
}

/** The Tier 0 register entry's note (*A figure typed below today's spending clears W's stale line for good…*,
 *  prescription (1)) — the W step and the panel's W row, on the draft the press holds (`WorkingCostQuestion`): a TYPED
 *  figure below today's quote (`workingYearCostTypedBelowQuote`), both figures yearly, then the lean for this answer.
 *  The whole answer leans rosy under a fresh typed figure, whatever the answer (a lower figure only cheapens the years
 *  and, under "All of it", credits more); a "saved" answer waiting on W — the typed figure stale on a state move — is
 *  credited at neither figure until a Keep or a new one, so no whole-answer lean holds and the year-level fact is said
 *  (the ONE predicate the stale note's lean rides, `savedWaitingOnW`; the round review of walk 5's round). `null`
 *  where no typed figure sits below the quote. */
export function workingYearCostTypedBelowNote(d: ScenarioDraft): string | null {
  const t = workingYearCostTypedBelowQuote(d)
  if (t === null) return null
  const answerLean = savedWaitingOnW(d) === null
  return t.source === 'budget'
    ? slots.workingCostBelowBudget(t.typed, t.quote, answerLean)
    : slots.workingCostBelowSpending(t.typed, t.quote, answerLean)
}

// ── THE TYPED-BELOW LINE (U11 walk 6's R1; the Tier 0 entry *A figure typed below today's spending clears W's stale line
//    for good…*, its ⚑ MEASURED bullet). The note above reaches the W surfaces only, so a household that types its old
//    figure back in and leaves reads nothing on the surfaces it returns to: W's stale line clears for good (a typed
//    figure is never staled on a quote, KTD10) and the stored "All of it" is credited whole. This line speaks where the
//    answer is read — the Result's standing slot and the re-entry gate — in W's slot and form, with the update act's door
//    (no Keep door below the quote, ruling 34). Never a stamp and never a withheld credit (D7): the figure is used as
//    given, and whether to stamp it stays that entry's council call. ──

/** Where the typed-below line is said, and so its words: on the gate the answer is "Your" (none is on screen yet); on
 *  the Result it is "This". `carriesMoved` — this line hosts the moved left over's clause, one decision per host, read by
 *  both alike (the walk-9 form council `wf_9f28e691-1dc`, call (1a); `docs/plans/features/typed-below-walk9-form-build-spec.md`):
 *  on the gate, `composeReentry`'s host Record (no tax, state-tax or working-years line fired, and this line is the one
 *  drawn), through `ReentryTypedBelow.compose`; on the Result, the session's `!leftOverClauseHost`. Where the left over
 *  has moved, the moved words say the cap ("adds at most … the smaller of the two"), after the counts sentence and before
 *  the lean, ONE order on both hosts. Each run still states this answer's own credit (the rebuild's KD2, its second pilot
 *  call: "each item states the pair"; a span's credit can drift below the cap), so under a moved left over TM says
 *  $16,985 in the moved words and again in each run. */
export type TypedBelowHost = { readonly kind: 'result' | 'gate'; readonly carriesMoved: boolean }

/** Where the seat's spans are drawn (the rebuild's KTD6, host 3), and so whether its line opens on the counts sentence:
 *  in the details sheet the W row's typed-below note sits directly above the seat and carries the lean (`sheet`); on the
 *  walk's money-picture step nothing above the seat does (the W note lives on the W step), so there the line opens with
 *  the counts sentence in its "Your" form (`step`), or the pair would show with nothing saying which answer is the real
 *  one. The host says so; the seat never guesses it. */
export type TypedBelowSeatHost = 'sheet' | 'step'
/** Whether the seat's line opens on the counts sentence, by host (an exhaustive Record, insight 147). */
const SEAT_OPENS_ON_COUNTS: Readonly<Record<TypedBelowSeatHost, boolean>> = { sheet: false, step: true }

/** The typed figure below today's quote, while it is FRESH and the run reads it — or `null`. Fresh: a typed figure
 *  stales only on its state-tax reading, and a stale W rides its own stale line (which wins the slot on both hosts), so
 *  the two never speak at once. Read: on a draft whose run carries no W (a W left on an all-retired draft,
 *  `workingYearCostForRun`'s `'unpriced'` proof — the same conjunct that silences W's stale line on the gate) the line
 *  would claim a working year the answer never counts; `'unknown'` keeps it (fail-safe, as there). */
function freshTypedBelow(d: ScenarioDraft): ReturnType<typeof workingYearCostTypedBelowQuote> {
  const t = workingYearCostTypedBelowQuote(d)
  if (t === null || isWorkingYearCostStale(d) || workingYearCostForRun(d) === 'unpriced') return null
  return t
}

// ── THE WHOLE-WINDOW READ (the rebuild's U3: `docs/plans/features/typed-below-whole-window-rebuild-spec.md` KTD3, KTD4;
//    council `wf_f74697d1-f2e`'s pair, KD1). Every working year of the window, this answer's credit beside the credit the
//    answer at today's quote would give, both the engine's own; the years grouped into spans. Dark until U4 words it. ──

/** What one working year of the window holds, this answer against the answer at today's quote (KTD3; an exhaustive
 *  Record keys every choice made by it, insight 147). Compared on the money picture's grain — each credit printed
 *  through `workingYearBottomLine`, each shortfall as its year prints it, except that `same` compares the two draws on
 *  the cent grain ({@link centDrawOf}):
 *  · `same` — both answers credit the same and draw the same, to the cent: two draws inside one printed dollar are not the
 *    same (the review's round 3: "adds the same" stood over a draw 99¢ a year smaller at the typed figure). Read first,
 *    ahead of every other kind: any year where the stored figure caps both and neither is short; a typed figure cents
 *    below the quote reads `same` only in the years neither answer is short;
 *  · `bothCredit` — both credit at least $1 (this answer more);
 *  · `quoteCreditsNothing` — this answer credits at least $1; the answer at the quote credits nothing in a year that is
 *    not short there (year 0 at the quote below $1, so that run carries no answer: R5's gate);
 *  · `shortLeftOverAtTyped` / `shortStillShortAtTyped` / `shortEvenAtTyped` — short at the quote, and at the typed figure
 *    at least $1 left over, still short, or exactly $0. */
export type TypedBelowYearKind =
  | 'same'
  | 'bothCredit'
  | 'quoteCreditsNothing'
  | 'shortLeftOverAtTyped'
  | 'shortStillShortAtTyped'
  | 'shortEvenAtTyped'

/** Which term binds a year's credit for the span model (KTD3): U2's binding read with its tie settled — in year 0 the
 *  cap IS the year's own print wherever the stored figure does not sit below it, so a year-0 tie counts as the year's
 *  own left over; a later tie counts as the cap. There is no tuned ratio. */
export type TypedBelowBinding = Exclude<WorkingYearCreditBinding, 'tie'>

/** One working year of the window, both answers. `credit` and `creditAtQuote` are the engine's own credit rule
 *  (`workingYearCredit`, the overlay's one home: each `Object.is` the overlay's `creditComposed` on that answer's run),
 *  unrounded; `bottomLine` and `bottomLineAtQuote` are the money picture's prints at the typed figure and at the quote;
 *  `cash` and `cashAtQuote` the raw cash each print is taken from (the pictures' own `workingYears[t].cash`, each the
 *  run's composed cash), the draw the engine really takes in a short year ({@link stillShortDifferenceDollars}). */
export interface TypedBelowYear {
  readonly calendarYear: number
  readonly kind: TypedBelowYearKind
  readonly credit: number
  readonly creditAtQuote: number
  readonly binding: TypedBelowBinding
  readonly bindingAtQuote: TypedBelowBinding
  readonly bottomLine: number
  readonly bottomLineAtQuote: number
  readonly cash: number
  readonly cashAtQuote: number
}

/** Whole dollars on the money picture's grain: the least and the most across a span's years (equal where every year
 *  prints alike). */
export interface TypedBelowDollars {
  readonly least: number
  readonly most: number
}

/** A run of adjacent working years of one kind (KTD3), with the figures its words need, each on the printed grain:
 *  `credit` and `creditAtQuote`, each answer's credit; `shortAtQuote` and `shortAtTyped`, the year's shortfall there
 *  (positive); `difference`, each year's credit less its shortfall at the typed figure, against the same at the quote
 *  (what this answer adds beyond, or takes less than, the answer at the quote), worked on the printed figures, except the
 *  still-short kind's: the two draws' difference on the cent grain, rounded up ({@link stillShortDifferenceDollars}; R5
 *  over V9), never the two printed shortfalls subtracted. A credit range survives only where one binding term drifts; a
 *  shortfall or difference range is a fact of the picture. Every figure is the ALL-ALIVE picture's. `same` states the
 *  one credit both answers give (the walk-8 card's W8-R5 (a): "adds the same" with no figure read as no figure at all).
 *  How the words SAY a figure that varies across the run is the amount rule's ({@link typedBelowAmountOf}, read off the
 *  run's years), never these two ends. */
export type TypedBelowSpan = { readonly firstYear: number; readonly lastYear: number } & (
  | { readonly kind: 'same'; readonly credit: TypedBelowDollars }
  | { readonly kind: 'bothCredit'; readonly credit: TypedBelowDollars; readonly creditAtQuote: TypedBelowDollars; readonly difference: TypedBelowDollars }
  | { readonly kind: 'quoteCreditsNothing'; readonly credit: TypedBelowDollars; readonly difference: TypedBelowDollars }
  | { readonly kind: 'shortLeftOverAtTyped'; readonly shortAtQuote: TypedBelowDollars; readonly credit: TypedBelowDollars; readonly difference: TypedBelowDollars }
  | { readonly kind: 'shortStillShortAtTyped'; readonly shortAtQuote: TypedBelowDollars; readonly shortAtTyped: TypedBelowDollars; readonly difference: TypedBelowDollars }
  | { readonly kind: 'shortEvenAtTyped'; readonly shortAtQuote: TypedBelowDollars; readonly difference: TypedBelowDollars }
)

/** The whole-window read: every working year (`years`, index-aligned with the sim year) and its spans in time order,
 *  each year in exactly one (R4). `unknown` where it cannot be read — no picture at the quote, two windows that differ,
 *  or a year where the answer at the quote would credit more or print higher than this one — each UNREACHABLE wherever
 *  the typed picture is known: the re-confirmed draft differs only in W, every input the picture reads but W is the
 *  same (`WorkingYearCheckAtQuote`'s docblock), a lower W leaves every year's cash higher by the gap (W comes off the
 *  cash dollar for dollar; the income tax never reads it), and both caps take the one stored figure beside a year 0
 *  that prints higher at the typed figure (KTD4). Named so a reader can never word a premise that failed. */
export type WorkingYearTypedBelowWindow =
  | {
      readonly kind: 'read'
      readonly years: readonly TypedBelowYear[]
      readonly spans: readonly TypedBelowSpan[]
      /** How the answer at today's quote is capped ({@link TypedBelowQuoteCap}): the cap sentence's one decision. */
      readonly quoteCap: TypedBelowQuoteCap
      /** THIS answer's cap, whole dollars on the printed grain: the smaller of the stored figure and year 0's print at the
       *  typed figure (R8; the stored figure IS a print, KTD8). Where a run's credit prints below it in every year, that
       *  run's own left over binds, and the typed side says so (NL's third limit, the walk-9 form council's call (1)). */
      readonly typedCap: number
      /** The survivor read ({@link TypedBelowSurvivor}): `null` exactly where the gate is off. It rides THIS arm only, so a
       *  line can never show the scope without the survivor part's figure (the survivor-path build's R10). */
      readonly survivor: TypedBelowSurvivor | null
    }
  | { readonly kind: 'unknown' }

/** How the answer at today's quote is capped (the walk-8 form council's KD5, keyed on the rebuild's KTD4: that answer's
 *  cap is the smaller of the stored figure and its year 0's print, and it credits nothing where year 0 there prints
 *  below $1), on the printed grain (the stored figure IS a print, KTD8); an exhaustive vocabulary, so the cap sentence
 *  words every member (insight 147):
 *  · `yearZeroLeftOver` — year 0 at the quote leaves `leftOver` over, below the stored figure: that is its cap;
 *  · `yearZeroShort` — year 0 at the quote comes up `short`: that answer is never asked (R5's gate), so it adds nothing;
 *  · `yearZeroNone` — year 0 at the quote has exactly nothing over: never asked either;
 *  · `stored` — the stored figure caps it, as it caps this answer: nothing to explain, so no sentence. */
export type TypedBelowQuoteCap =
  | { readonly kind: 'yearZeroLeftOver'; readonly leftOver: number }
  | { readonly kind: 'yearZeroShort'; readonly short: number }
  | { readonly kind: 'yearZeroNone' }
  | { readonly kind: 'stored' }

/** How the survivor part names the two figures its ceiling is the difference of (the survivor-path build's KTD5; an exhaustive
 *  Record keys every choice made by it, insight 147): `wholeGap` — the two survivor charges differ by exactly the quote
 *  less the typed figure on the cent grain (an all-sticky budget, or a survivor ratio of 1), so the part names both figures in full;
 *  `survivorCharges` — any other rule (a ratio below 1, or a vault's ratio above 1), so it names the two charges
 *  themselves. Decided on cents, never by comparing the held part with either figure. */
export type TypedBelowSurvivorForm = 'wholeGap' | 'survivorCharges'

/** The typed-below line's survivor read (`docs/plans/features/typed-below-survivor-path-build-spec.md`, KTD2–KTD5; council
 *  `wf_dfb7949b-4a7`). The spans are the all-alive picture's; on a path where one of you has died while the other still
 *  works, nobody is credited (`workingYearCredit`'s `allAlive`) and W is charged by the engine's survivor rule
 *  (`workingYearCostForYear`), so the two answers differ by the difference of their two survivor charges. Read only where
 *  the engine can draw such a year (the gate, KTD3), each figure the engine's own on the window-top candidate:
 *  · `survivorYears` — the calendar years of the window where it can (ascending, never empty);
 *  · `chargeAtTyped` / `chargeAtQuote` — what such a year's working cost counts as at the typed figure and at the quote,
 *    each run's own carried W through `workingYearCostForYear` (raw dollars);
 *  · `most` — X, the most this answer takes less from savings in such a year: the raw charge difference rounded UP to the
 *    dollar after the money grain's dust (KTD4), so it never sits under the cent-grain draw difference (each draw is
 *    snapped to the cent alone; the cash differs by exactly the charge difference, since W comes off the cash dollar for
 *    dollar and nothing else in that year reads it), and at most $1 over it;
 *  · `form` — {@link TypedBelowSurvivorForm}.
 *  The bound rests on a death crediting NOTHING (build 2's KTD5, `moneyGrain.ts`): the day anything credits a survivor
 *  year, X and the survivor part's words must change with it (`docs/landmines.md`, the engine's credit-0 tripwire). */
export interface TypedBelowSurvivor {
  readonly survivorYears: readonly number[]
  readonly chargeAtTyped: number
  readonly chargeAtQuote: number
  readonly most: number
  readonly form: TypedBelowSurvivorForm
}

/** Memoized on the SOURCE draft (the re-confirmed draft is a fresh object every call, so the picture's own memo would
 *  miss it each time), as `checkAtQuoteMemo` is. */
const typedBelowWindowMemo = new WeakMap<ScenarioDraft, WorkingYearTypedBelowWindow | null>()

/** The whole-window read for a fresh typed figure below today's quote ({@link freshTypedBelow}) under a "saved" answer
 *  the run carries — or `null` under any other draft (the typed-below line's own predicates: the line reads none).
 *  A pure function of the draft (R12): it reads no crown and no outcome, so the gate (which composes before any run),
 *  the Result on either tier and the seat all read one value. */
export function workingYearTypedBelowWindow(d: ScenarioDraft): WorkingYearTypedBelowWindow | null {
  const memo = typedBelowWindowMemo.get(d)
  if (memo !== undefined) return memo
  const read = composeTypedBelowWindow(d)
  typedBelowWindowMemo.set(d, read)
  return read
}

function composeTypedBelowWindow(d: ScenarioDraft): WorkingYearTypedBelowWindow | null {
  if (freshTypedBelow(d) === null) return null
  // The answer first: a draft that is not "saved" never composes the money picture here. Each answer is credited with
  // exactly the figure its own run carries (`buildDateInput`'s carriage), so no year is credited that the engine skips.
  const stored = carriedWorkingYearLeftOver(d)
  if (stored === undefined) return null
  const atTyped = workingYearLedgerForRun(d)
  const quoteDraft = writeConfirmedWorkingYearCost(d)
  const atQuote = workingYearLedgerForRun(quoteDraft)
  if (atTyped === 'unknown' || atQuote === 'unknown') return { kind: 'unknown' }
  const typedYears = atTyped.workingYears
  const quoteYears = atQuote.workingYears
  if (typedYears.length !== quoteYears.length || typedYears.some((y, t) => y.calendarYear !== quoteYears[t]!.calendarYear)) return { kind: 'unknown' }
  // Under the quote the question goes unasked where year 0 prints below $1, so that run carries nothing (R5's gate).
  const storedAtQuote = carriedWorkingYearLeftOver(quoteDraft)
  const year0 = typedYears[0]!.bottomLine
  const year0AtQuote = quoteYears[0]!.bottomLine
  // The money picture is the no-death timeline (`workingYearLedger`): everyone is alive in every year it shows.
  const years: TypedBelowYear[] = []
  for (let t = 0; t < typedYears.length; t++) {
    const w = typedYears[t]!
    const q = quoteYears[t]!
    const credit = workingYearCredit(w.cash, year0, stored, true)
    const creditAtQuote = storedAtQuote === undefined ? 0 : workingYearCredit(q.cash, year0AtQuote, storedAtQuote, true)
    const printed = workingYearBottomLine(credit)
    const printedAtQuote = workingYearBottomLine(creditAtQuote)
    if (printed < printedAtQuote || w.bottomLine < q.bottomLine) return { kind: 'unknown' }
    years.push({
      calendarYear: w.calendarYear,
      kind: yearKind(printed, printedAtQuote, w.bottomLine, q.bottomLine, w.cash, q.cash),
      credit,
      creditAtQuote,
      binding: settleTie(t, workingYearCreditBinding(w.cash, year0, stored, true)),
      bindingAtQuote: storedAtQuote === undefined ? 'none' : settleTie(t, workingYearCreditBinding(q.cash, year0AtQuote, storedAtQuote, true)),
      bottomLine: w.bottomLine,
      bottomLineAtQuote: q.bottomLine,
      cash: w.cash,
      cashAtQuote: q.cash,
    })
  }
  // The survivor read (KTD2): both answers' window-top candidates, the same params each picture just composed from
  // (`workingYearWindowTopParams`, KTD1). Known wherever both pictures are; `'unknown'` here is unreachable, and kept as
  // the whole read's `unknown` so no line can speak a comparison without the read behind it.
  const paramsAtTyped = workingYearWindowTopParams(d)
  const paramsAtQuote = workingYearWindowTopParams(quoteDraft)
  if (paramsAtTyped === 'unknown' || paramsAtQuote === 'unknown') return { kind: 'unknown' }
  const survivor = survivorReadOf(paramsAtTyped, paramsAtQuote, years.map((y) => y.calendarYear))
  if (survivor === 'unknown') return { kind: 'unknown' }
  // The quote answer's cap (KD5, KTD4). A year 0 at the quote of $1 or more is always asked there, so its stored figure is
  // carried; `unknown` where it is not is unreachable, kept so no line can word a cap it did not read.
  const quoteCap: TypedBelowQuoteCap | 'unknown' =
    year0AtQuote < 0
      ? { kind: 'yearZeroShort', short: -year0AtQuote }
      : year0AtQuote === 0
        ? { kind: 'yearZeroNone' }
        : storedAtQuote === undefined
          ? 'unknown'
          : year0AtQuote < storedAtQuote
            ? { kind: 'yearZeroLeftOver', leftOver: year0AtQuote }
            : { kind: 'stored' }
  if (quoteCap === 'unknown') return { kind: 'unknown' }
  return { kind: 'read', years, spans: spansOf(years), quoteCap, typedCap: workingYearBottomLine(Math.min(year0, stored)), survivor }
}

/** The gate (KTD3): the calendar years among the window's working years (`calendarYears`, index-aligned with the sim
 *  year) where the engine can draw a year with one of the household dead and another still working — some ordered pair of
 *  people (i, j), i ≠ j, with j still working at t (`t < retire_j`, the engine's own offset read, `personOffsetsFor`) and
 *  i one the engine can sample dead by t (`survivalToYear(i, t) < 1`: below 1 exactly where the sampler can draw a death,
 *  none before 66, so no age is re-typed here). One person has no pair; a year where the only worker is the one who may
 *  have died is no working year, so a worker's own possible death never opens it. Household-wide, never per span (the
 *  plan's Key Decisions). Exported for the witness tests (a one-person household is no draft); the line reads it only
 *  through the whole-window read's `survivor`, so the scope can never show without X (R10). */
export function typedBelowSurvivorYears(params: SimulationParams, calendarYears: readonly number[]): readonly number[] {
  const people = params.people
  const { offsets } = personOffsetsFor(people)
  return calendarYears.filter((_, t) =>
    people.some((dies, i) => survivalToYear(dies, t) < 1 && offsets.some((o, j) => j !== i && t < o.retire)),
  )
}

/** The gate and X (KTD3–KTD5), or `null` where the gate is off ({@link typedBelowSurvivorYears}, read on the typed
 *  answer's candidate: the two candidates differ only in W). `'unknown'` where either candidate carries no W
 *  (unreachable: both pictures composed from it). `calendarYears` — the window's working years, index-aligned with the
 *  sim year. Read for the typed-below line and for W's stale line (its held figure in the typed figure's place). */
function survivorReadOf(
  paramsAtTyped: SimulationParams,
  paramsAtQuote: SimulationParams,
  calendarYears: readonly number[],
): TypedBelowSurvivor | null | 'unknown' {
  const survivorYears = typedBelowSurvivorYears(paramsAtTyped, calendarYears)
  if (survivorYears.length === 0) return null
  const atTyped = paramsAtTyped.overlay?.accumulation?.workingYearCostReal
  const atQuote = paramsAtQuote.overlay?.accumulation?.workingYearCostReal
  if (atTyped === undefined || atQuote === undefined) return 'unknown'
  const chargeAtTyped = workingYearCostForYear(paramsAtTyped, atTyped, false)
  const chargeAtQuote = workingYearCostForYear(paramsAtQuote, atQuote, false)
  return {
    survivorYears,
    chargeAtTyped,
    chargeAtQuote,
    most: Math.max(0, Math.ceil(chargeAtQuote - chargeAtTyped - HALF_CENT_DUST_DOLLARS)),
    form: toCents(chargeAtQuote) - toCents(chargeAtTyped) === toCents(atQuote) - toCents(atTyped) ? 'wholeGap' : 'survivorCharges',
  }
}

const drawOf = (bottomLine: number): number => (bottomLine < 0 ? -bottomLine : 0)
/** A year's draw in whole cents: its cash snapped to the cent exactly as its printed shortfall is (`toCents`, insight
 *  146), so two draws inside one printed dollar still differ. Every comparison of two draws reads it — `same`'s
 *  equality and the still-short difference ({@link stillShortDifferenceDollars}) — never two printed shortfalls, each
 *  rounded up. Positive exactly where the year prints short (`bottomLineFromCents` reads the same cents). */
const centDrawOf = (cash: number): number => Math.max(0, -toCents(cash))

/** A year's kind from its two printed credits, its two prints and its two raw cashes (KTD3's order: `same` first). */
function yearKind(
  printed: number,
  printedAtQuote: number,
  bottomLine: number,
  bottomLineAtQuote: number,
  cash: number,
  cashAtQuote: number,
): TypedBelowYearKind {
  if (printed === printedAtQuote && centDrawOf(cash) === centDrawOf(cashAtQuote)) return 'same'
  if (bottomLineAtQuote < 0) return bottomLine > 0 ? 'shortLeftOverAtTyped' : bottomLine < 0 ? 'shortStillShortAtTyped' : 'shortEvenAtTyped'
  return printedAtQuote > 0 ? 'bothCredit' : 'quoteCreditsNothing'
}

const settleTie = (t: number, b: WorkingYearCreditBinding): TypedBelowBinding => (b === 'tie' ? (t === 0 ? 'ownLeftOver' : 'cap') : b)

/** One answer's credits in two adjacent years join a span where they print alike, or where both are bound by the year's
 *  own left over (a drift under one binding term; the council's split rule). */
const creditsJoin = (a: number, b: number, bindingA: TypedBelowBinding, bindingB: TypedBelowBinding): boolean =>
  workingYearBottomLine(a) === workingYearBottomLine(b) || (bindingA === 'ownLeftOver' && bindingB === 'ownLeftOver')

/** Adjacent years join where their kind matches and, for each answer, their credits join — `same` too, now that it
 *  prints its credit (the walk-8 card's W8-R5 (a); it once joined always, printing no figure), so a range there survives
 *  only where one binding term drifts, as on every kind. A span that recurs later is its own span. */
function joins(a: TypedBelowYear, b: TypedBelowYear): boolean {
  if (a.kind !== b.kind) return false
  return creditsJoin(a.credit, b.credit, a.binding, b.binding) && creditsJoin(a.creditAtQuote, b.creditAtQuote, a.bindingAtQuote, b.bindingAtQuote)
}

function dollarsOf(years: readonly TypedBelowYear[], figure: (y: TypedBelowYear) => number): TypedBelowDollars {
  const all = years.map(figure)
  return { least: Math.min(...all), most: Math.max(...all) }
}

const creditDollars = (y: TypedBelowYear): number => workingYearBottomLine(y.credit)
const creditAtQuoteDollars = (y: TypedBelowYear): number => workingYearBottomLine(y.creditAtQuote)
const differenceDollars = (y: TypedBelowYear): number =>
  creditDollars(y) - drawOf(y.bottomLine) - (creditAtQuoteDollars(y) - drawOf(y.bottomLineAtQuote))
/** The still-short kind's yearly difference: what this answer takes less from savings, said "at most" (R5). Worked on
 *  the printed figures (R6, V9) it is two shortfalls each printed rounded UP, and their difference can land up to 99¢
 *  under the draws the engine really takes (C at $8,416.67 a month: $4,015 − $16 = $3,999, where the engine draws
 *  $3,999.96 less), so the "at most" would be false, on the rosy side. R5 wins over V9 (the whole-file review of the
 *  rebuild, round 1, finding #1; the pilot's call, flagged for walk 8): the two draws' difference on the money
 *  picture's grain, each cash snapped to the cent first exactly as its printed shortfall is (`toCents`, insight 146),
 *  then rounded up to the dollar. It never sits under the engine's draws on that grain, never under the reader's
 *  subtraction of the two printed shortfalls, and at most $1 over it (round 2, finding #2: snapping the raw DIFFERENCE
 *  instead let a typed figure with sub-cent digits, or two cashes each a hair past a cent, print a dollar under both).
 *  Every other kind's figure already sits at or above the engine's on that grain (a printed credit never sits under its
 *  raw credit: the credit rule's min holds the year's own print), and `same`, which prints none, reads its two draws on
 *  this grain too ({@link centDrawOf}; the review's round 3). All of this is the ALL-ALIVE picture: on a path where
 *  one of you has died nobody is credited and W follows the survivor rule, so a comparison there can run past these
 *  figures (round 2, finding #1; the council's ruling governs the words). */
const stillShortDifferenceDollars = (y: TypedBelowYear): number => Math.ceil((centDrawOf(y.cashAtQuote) - centDrawOf(y.cash)) / 100)

const shortAtQuoteDollars = (y: TypedBelowYear): number => drawOf(y.bottomLineAtQuote)
const shortAtTypedDollars = (y: TypedBelowYear): number => drawOf(y.bottomLine)

/** A span's figures by name: each answer's credit, each answer's shortfall, and the yearly difference. */
export type TypedBelowFigure = 'creditAtQuote' | 'credit' | 'shortAtQuote' | 'shortAtTyped' | 'difference'

/** Each kind's figures in the order its words state them (the walk-8 form council's KD4: the spending side, the typed
 *  side, the close), each with its yearly read on the printed grain — the ONE home a span's figures, the split rule and
 *  the amount rule all read, so they can never name two figures for one (an exhaustive Record, insight 147). */
const SPAN_FIGURE_READS: Readonly<Record<TypedBelowYearKind, readonly (readonly [TypedBelowFigure, (y: TypedBelowYear) => number])[]>> = {
  same: [['credit', creditDollars]],
  bothCredit: [
    ['creditAtQuote', creditAtQuoteDollars],
    ['credit', creditDollars],
    ['difference', differenceDollars],
  ],
  quoteCreditsNothing: [
    ['credit', creditDollars],
    ['difference', differenceDollars],
  ],
  shortLeftOverAtTyped: [
    ['shortAtQuote', shortAtQuoteDollars],
    ['credit', creditDollars],
    ['difference', differenceDollars],
  ],
  shortStillShortAtTyped: [
    ['shortAtQuote', shortAtQuoteDollars],
    ['shortAtTyped', shortAtTypedDollars],
    ['difference', stillShortDifferenceDollars],
  ],
  shortEvenAtTyped: [
    ['shortAtQuote', shortAtQuoteDollars],
    ['difference', differenceDollars],
  ],
}

/** THE SPLIT RULE (the walk-8 form council's KD6, kept byte for byte by the walk-9 form council's build so every run it
 *  drew stays the run it was: the chair's counts assume today's runs), pure, exported for its property test. It once
 *  also chose the words: a run whose later range ran the other way from its first named that range's end years. The
 *  amount rule ({@link typedBelowAmountOf}) now says every figure beside its own years, so only the split survives: a run
 *  `'pairs'` while every later range's ends fall on the years where the first range is least and where it is most, one
 *  value on each, and — where one of them runs the other way — each end of the first range falls in ONE year; `'fails'`
 *  otherwise (`creditsJoin` can join a drift that does not complement; an end of the first range can span several
 *  years), and {@link spansOf} splits the run there. A run of one or two years always pairs. */
export function typedBelowPairingOf(kind: TypedBelowYearKind, years: readonly TypedBelowYear[]): 'pairs' | 'fails' {
  const ranged = SPAN_FIGURE_READS[kind]
    .map(([name, read]) => ({ name, values: years.map(read) }))
    .filter((s) => Math.min(...s.values) !== Math.max(...s.values))
  const first = ranged[0]
  if (first === undefined) return 'pairs'
  const atLeast = indicesOf(first.values, Math.min(...first.values))
  const atMost = indicesOf(first.values, Math.max(...first.values))
  let runsOtherWay = false
  for (const later of ranged.slice(1)) {
    const whereLeast = new Set(atLeast.map((i) => later.values[i]!))
    const whereMost = new Set(atMost.map((i) => later.values[i]!))
    if (whereLeast.size !== 1 || whereMost.size !== 1) return 'fails'
    const [a] = whereLeast
    const [b] = whereMost
    const least = Math.min(...later.values)
    const most = Math.max(...later.values)
    if (!((a === least && b === most) || (a === most && b === least))) return 'fails'
    if (a! > b!) runsOtherWay = true
  }
  if (!runsOtherWay) return 'pairs'
  return atLeast.length === 1 && atMost.length === 1 ? 'pairs' : 'fails'
}
const indicesOf = (values: readonly number[], v: number): number[] => values.flatMap((x, i) => (x === v ? [i] : []))

function spanOf(years: readonly TypedBelowYear[]): TypedBelowSpan {
  const kind = years[0]!.kind
  const figures = Object.fromEntries(SPAN_FIGURE_READS[kind].map(([name, read]) => [name, dollarsOf(years, read)]))
  return { firstYear: years[0]!.calendarYear, lastYear: years[years.length - 1]!.calendarYear, kind, ...figures } as TypedBelowSpan
}

/** The spans: adjacent years join ({@link joins}) while the run they make still pairs ({@link typedBelowPairingOf});
 *  a year that would break either starts the next span. */
function spansOf(years: readonly TypedBelowYear[]): TypedBelowSpan[] {
  const spans: TypedBelowSpan[] = []
  let run: TypedBelowYear[] = []
  for (const y of years) {
    const extended = run.length === 0 || !joins(run[run.length - 1]!, y) ? 'fails' : typedBelowPairingOf(y.kind, [...run, y])
    if (extended === 'fails') {
      if (run.length > 0) spans.push(spanOf(run))
      run = [y]
    } else {
      run.push(y)
    }
  }
  if (run.length > 0) spans.push(spanOf(run))
  return spans
}

/** One year's printed figure, for the amount rule: its calendar year and its whole dollars. */
export interface TypedBelowYearFigure {
  readonly calendarYear: number
  readonly dollars: number
}

/** THE AMOUNT RULE (the walk-9 form council `wf_9f28e691-1dc`, call (1): R4 (b) and walk 9's flip (iii), its general
 *  form; `docs/plans/features/typed-below-walk9-form-build-spec.md`), ONE home for every sentence that prints a run's
 *  figure — on the typed-below line, on W's stale line (B, C, F) and on the waiting seats (insight 101). A run's years
 *  (consecutive calendar years, in year order) group where consecutive years print the same figure; then: one group, one
 *  figure ("$X a year"; "$X" on a one-year run); two groups, each figure with its own years, in year order ("$3,005 in
 *  2030 and $3,368 in 2031"; "$4,015 short in 2029 through 2030 and $3,652 short in 2031 through 2032"), so no reader can
 *  pair a figure with the other group's years (walk 8's W8-R3 (a): two ranges side by side paired crosswise); three or
 *  more groups (the drift witness alone; no walked household), the least and the most as a band that names no order
 *  ("between $19,722 and $20,985 a year"). Groups compare the PRINTED figure, so two years a cent apart under one dollar
 *  are one group. The words never group or sort a figure themselves (`TypedBelowAmount`). Exported for its property test. */
export function typedBelowAmountOf(years: readonly TypedBelowYearFigure[]): TypedBelowAmount {
  const groups: { figure: string; dollars: number; firstYear: number; lastYear: number }[] = []
  for (const y of years) {
    const figure = formatMoney(y.dollars)
    const last = groups[groups.length - 1]
    if (last !== undefined && last.figure === figure && y.calendarYear === last.lastYear + 1) last.lastYear = y.calendarYear
    else groups.push({ figure, dollars: y.dollars, firstYear: y.calendarYear, lastYear: y.calendarYear })
  }
  const [g0, g1] = groups
  if (g0 === undefined) throw new Error('typedBelowAmountOf: a run has at least one year')
  if (g1 === undefined) return { kind: 'one', figure: g0.figure }
  const group = (g: (typeof groups)[number]): TypedBelowYearGroup => ({ figure: g.figure, firstYear: g.firstYear, lastYear: g.lastYear })
  if (groups.length === 2) return { kind: 'two', groups: [group(g0), group(g1)] }
  const all = groups.map((g) => g.dollars)
  return { kind: 'band', least: formatMoney(Math.min(...all)), most: formatMoney(Math.max(...all)) }
}

/** The typed-below LINE (U11 walk 6's R1), rebuilt over the whole working window
 *  (`docs/plans/features/typed-below-whole-window-rebuild-spec.md`, KTD6; council `wf_f74697d1-f2e`), in the walk-9 form
 *  council's form (`docs/plans/features/typed-below-walk9-form-build-spec.md`; council `wf_9f28e691-1dc`), as parts, ONE
 *  order on every host: the counts sentence (the answer counts the typed figure, below today's quote, both yearly); the
 *  moved clause where this line hosts it ({@link TypedBelowHost}); the lean, its own sentence naming the quote in dollars
 *  (call (2)); the cap sentence where the answer at the quote has a cap of its own (KD5, {@link TypedBelowQuoteCap}); the
 *  lead on two or more runs. Then, for a "saved" answer the run carries (`saved` or `saved-moved`), the window's runs
 *  ({@link workingYearTypedBelowWindow}) in their kind's words ({@link TYPED_BELOW_SPAN_WORDS}), and the survivor part
 *  after them: one run folds into the opening as plain sentences, so `isPlainNote` holds and every host draws its single
 *  paragraph; two or more draw as an ordered list, one item per run, its years and condition the label, and the survivor
 *  part as the paragraph after the list (KD7, KD8). Under any other answer (absent, spent, not sure, a "saved" answer not
 *  asked) the counts sentence, any moved clause and the lean alone: nothing is credited, and the lower figure only
 *  cheapens the years. Where the read is `unknown` (unreachable wherever the typed picture is known), the fail-safe credit
 *  sentence after them ({@link typedBelowFailSafeCap}), so the credit is still said — except where the left over moved,
 *  whose words say the cap. `null` where no fresh typed figure sits below the quote ({@link freshTypedBelow}). The figures
 *  are the typed-below pair exactly as the W surfaces' note prints them (`workingYearCostTypedBelowQuote`), so the line and
 *  the note never name two figures for one. A pure function of the draft (R12): it reads no crown and no outcome, so the
 *  gate (which composes before any run) and the Result on either tier draw one line. */
export function workingYearCostTypedBelowLine(d: ScenarioDraft, host: TypedBelowHost): NoteParts | null {
  return workingYearCostTypedBelowComposed(d, host)?.parts ?? null
}

/** The line and whether it carried the moved clause — what the gate's `ReentryTypedBelow.compose` hands
 *  `composeReentry`, which falls back to the moved note of its own where the fact is set and this line did not carry it
 *  (the walk-9 form council's call (1a): never silence). `null` exactly where the line is. */
export interface TypedBelowLineComposed {
  readonly parts: NoteParts
  readonly carriedMoved: boolean
}
export function workingYearCostTypedBelowComposed(d: ScenarioDraft, host: TypedBelowHost): TypedBelowLineComposed | null {
  const s = workingYearCostTypedBelowStructure(d, host)
  return s === null ? null : { parts: foldTypedBelow(s), carriedMoved: s.carriedMoved }
}

/** The typed-below line as STRUCTURE, before a one-run line folds into one paragraph (the survivor-path build's KTD8):
 *  the opening's sentences (the counts sentence, any moved clause, the lean, any cap sentence, any lead), each run's label
 *  and sentences, and the survivor part's sentences, or `null` where there is none. Exported for the density law, which
 *  reads it rather than slicing a folded paragraph, so the survivor part's sentences are never counted as a run's; every
 *  host's line is {@link foldTypedBelow} of it. `carriedMoved` — the opening carries the moved left over's clause (the
 *  walk-9 form council's call (1a): the structure reports carriage, so a host the fact was assigned to can never print it
 *  nowhere in silence); `false` on the seat's structure, which never carries it. */
export interface TypedBelowLineStructure {
  readonly opening: readonly string[]
  readonly spans: readonly NoteSegment[]
  readonly survivor: readonly string[] | null
  readonly carriedMoved: boolean
}

/** {@link workingYearCostTypedBelowLine}'s structure: `null` exactly where the line is. */
export function workingYearCostTypedBelowStructure(d: ScenarioDraft, host: TypedBelowHost): TypedBelowLineStructure | null {
  const t = freshTypedBelow(d)
  if (t === null) return null
  const counts = typedBelowCounts(t, TYPED_BELOW_NOUN[host.kind])
  // The moved clause BEFORE every early return (the walk-9 form council's call (1a), its landmine): with the clause
  // assigned to this line, an arm that returned before reading it would print the moved fact nowhere, and nothing would
  // throw. Every arm below carries it where the host does.
  const moved = workingYearLeftOverMoved(d)
  const clause = moved !== null && host.carriesMoved ? [workingYearLeftOverMovedClause(moved)] : []
  const carriedMoved = clause.length > 0
  const read = workingYearTypedBelowWindow(d)
  if (read === null || read.kind === 'unknown') {
    // The counts-only arms: [counts, …clause, lean, …the fail-safe credit where the read is `unknown` and nothing moved].
    const cap = read === null || moved !== null ? null : typedBelowFailSafeCap(d)
    return {
      opening: [counts, ...clause, typedBelowLean(t, host.kind), ...(cap === null ? [] : [slots.workingCostTypedBelowAdds(formatMoney(cap))])],
      spans: [],
      survivor: null,
      carriedMoved,
    }
  }
  return typedBelowStructure(counts, clause, read, t, host.kind, carriedMoved)
}

/** The line from its structure: at most one run folds into the opening as plain sentences, the survivor part's after
 *  them, so `isPlainNote` holds and every host draws its one paragraph (the council's one-span ruling: the paragraph and
 *  its pins keep their shape); two or more draw as runs, the survivor part their closing paragraph (KD7, KD8). */
function foldTypedBelow(s: TypedBelowLineStructure): NoteParts {
  if (s.spans.length < 2) return plainNote([...s.opening, ...s.spans.flatMap((x) => x.sentences), ...(s.survivor ?? [])].join(' '))
  return { opening: s.opening.join(' '), segments: [], door: null, runs: { items: s.spans, closing: s.survivor } }
}

type FreshTypedBelow = NonNullable<ReturnType<typeof freshTypedBelow>>

/** The counts sentence, in the quote's own words (the spending, or the budget twin). Its lean is its own slot since the
 *  walk-9 form council's call (2) ({@link typedBelowLean}). */
const TYPED_BELOW_COUNTS: Readonly<Record<FreshTypedBelow['source'], (answer: TypedBelowAnswer, typed: string, quote: string) => string>> = {
  spending: slots.workingCostTypedBelowCounts,
  budget: slots.workingCostTypedBelowCountsBudget,
}
const typedBelowCounts = (t: FreshTypedBelow, answer: TypedBelowAnswer): string => TYPED_BELOW_COUNTS[t.source](answer, t.typed, t.quote)

/** R8's cap as the line said it before the rebuild — min(stored, year 0 at the typed figure), whole dollars — read only
 *  on the whole-window read's `unknown` arm (the plan's Minor faults: live, kept fail-safe so the credit is still said);
 *  `null` where no answer is carried or no year 0 is pictured. */
function typedBelowFailSafeCap(d: ScenarioDraft): number | null {
  const stored = carriedWorkingYearLeftOver(d)
  const live = workingYearLeftOverLive(d)
  return stored === undefined || live === null ? null : Math.round(Math.min(stored, live))
}

/** Every host the line is drawn on (KTD7): the Result, the re-entry gate, and the seat in the details sheet and on the
 *  money-picture step. */
type TypedBelowLineHost = TypedBelowHost['kind'] | TypedBelowSeatHost
/** The answer each host names (the walk-8 form council's KD9; an exhaustive Record, insight 147): "This" where an answer is
 *  on screen — the answer page — and "Your" on the re-entry gate, where no answer is on screen yet, on the walk's
 *  money-picture step, and in the "sheet": since Act 6 that host is the Pre-retirement living expenses drawer
 *  (`WorkingCostDrawer.tsx`, its only caller), which shows no answer for "This" to point at
 *  (milestone 3's review, B6; the details sheet whose title said "this answer", W8-R5 (d)'s reason, is deleted). The
 *  step DOES show an answer (the provisional strip at its top), so "none is yet" is not
 *  its reason: the line there sits right under the left-over question's reply buttons, where a "This answer" would point at
 *  the reply just chosen (council `wf_9bd3c243-4e7`, which corrected this docblock). Whether the step's "Your answer" reads
 *  as that reply too is walk 10's watch item W9 (5), with a step-noun council pre-loaded on one unprompted raise. The lean,
 *  the runs and the survivor part all read it, so one line never says "Your answer" and "this answer" for one answer. */
const TYPED_BELOW_NOUN: Readonly<Record<TypedBelowLineHost, TypedBelowAnswer>> = { result: 'This', gate: 'Your', sheet: 'Your', step: 'Your' }
/** The lean's form by host (the walk-9 form council's call (2); an exhaustive Record, insight 147): the host's noun where
 *  the line opens on its counts sentence, and the floor alone in the details sheet, where the W row's note above already
 *  says the "can look better" half. */
const TYPED_BELOW_LEAN: Readonly<Record<TypedBelowLineHost, TypedBelowLeanForm>> = { result: 'this', gate: 'your', sheet: 'bare', step: 'your' }
const typedBelowLean = (t: FreshTypedBelow, host: TypedBelowLineHost): string => slots.workingCostTypedBelowLean(t.source, t.quote, TYPED_BELOW_LEAN[host])
/** How many runs the line draws: one folds into a paragraph (no lead on any host), two or more draw behind a lead. */
type TypedBelowSpanCount = 'one' | 'many'
/** The lead above the runs, by host and run count, with the survivor gate off and on (the survivor-path build's KTD7; an
 *  exhaustive Record, insight 147): on two or more runs the Result and the gate draw a lead only under the gate, so the
 *  runs' sentences with no year noun of their own take their scope from it; the seat draws its lead either way. One run
 *  names no lead on any host. "Each answer" (the walk-8 form council's words): every run states both. */
const TYPED_BELOW_LEAD: Readonly<Record<TypedBelowLineHost, Readonly<Record<TypedBelowSpanCount, { readonly off: string | null; readonly on: string | null }>>>> = {
  result: { one: { off: null, on: null }, many: { off: null, on: copy.workingLedgerLeftOverSpansLeadSurvivor } },
  gate: { one: { off: null, on: null }, many: { off: null, on: copy.workingLedgerLeftOverSpansLeadSurvivor } },
  sheet: { one: { off: null, on: null }, many: { off: copy.workingLedgerLeftOverSpansLead, on: copy.workingLedgerLeftOverSpansLeadSurvivor } },
  step: { one: { off: null, on: null }, many: { off: copy.workingLedgerLeftOverSpansLead, on: copy.workingLedgerLeftOverSpansLeadSurvivor } },
}

/** The cap sentence by the quote answer's cap (KD5; an exhaustive Record, insight 147): `null` where the stored figure
 *  binds it. The quote's dollars are the lean's, one sentence earlier on every host (call (2)). */
const TYPED_BELOW_CAP: { readonly [K in TypedBelowQuoteCap['kind']]: (c: Extract<TypedBelowQuoteCap, { kind: K }>, t: FreshTypedBelow) => string | null } = {
  yearZeroLeftOver: (c, t) => slots.workingCostTypedBelowCapLeftOver(t.source, formatMoney(c.leftOver)),
  yearZeroShort: (c, t) => slots.workingCostTypedBelowCapShort(t.source, formatMoney(c.short)),
  yearZeroNone: (_c, t) => slots.workingCostTypedBelowCapNone(t.source),
  stored: () => null,
}
const typedBelowCap = (c: TypedBelowQuoteCap, t: FreshTypedBelow): string | null =>
  (TYPED_BELOW_CAP[c.kind] as (c: TypedBelowQuoteCap, t: FreshTypedBelow) => string | null)(c, t)

/** T'S TWIN (the walk-9 form council's call (2), W9-R5 (d); an exhaustive Record, insight 147): on a ONE-RUN line whose cap
 *  sentence is drawn, the run's first beat restates the cap sentence's figure where the at-spending figure equals it in
 *  every year — `bothCredit` with one `creditAtQuote` equal to year 0's left over at the quote, or `quoteCreditsNothing`
 *  under a short or none cap — so it is not drawn, and the close carries the both-alive scope on its own claim. The
 *  pilot's added condition: the close's difference is ONE figure, or the scope cannot ride it ("$X less … in each working
 *  year you're both alive" names one figure), and the run keeps its three beats. Computed here, never by host. */
const TYPED_BELOW_TWIN: { readonly [K in TypedBelowYearKind]: (s: Extract<TypedBelowSpan, { kind: K }>, cap: TypedBelowQuoteCap) => boolean } = {
  same: () => false,
  bothCredit: (s, cap) =>
    cap.kind === 'yearZeroLeftOver' &&
    s.creditAtQuote.least === s.creditAtQuote.most &&
    formatMoney(s.creditAtQuote.most) === formatMoney(cap.leftOver) &&
    s.difference.least === s.difference.most,
  quoteCreditsNothing: (s, cap) => (cap.kind === 'yearZeroShort' || cap.kind === 'yearZeroNone') && s.difference.least === s.difference.most,
  shortLeftOverAtTyped: () => false,
  shortStillShortAtTyped: () => false,
  shortEvenAtTyped: () => false,
}
const isTwin = (s: TypedBelowSpan, cap: TypedBelowQuoteCap): boolean =>
  (TYPED_BELOW_TWIN[s.kind] as (s: TypedBelowSpan, cap: TypedBelowQuoteCap) => boolean)(s, cap)

type TypedBelowRead = Extract<WorkingYearTypedBelowWindow, { kind: 'read' }>

/** The structure over a read's runs, in the walk-9 form council's ONE order: the head (`counts` where the host opens on
 *  it, then any moved `clause`), the lean, the cap sentence (KD5) and the host's lead; each run in its kind's words,
 *  labelled by its years and the condition (call (3)); the gloss on the line's first rider alone (KD3: the first run's
 *  close), its look-back the engine's own; and — where the gate shows (the read's `survivor`) — the scope on every run's
 *  frame and the survivor part after the runs (R1, R3, R5; household-wide, never per run). THE RESTATEMENT PREDICATES
 *  (call (1b); {@link TypedBelowSpanFrame}) are read off what this line has printed before each run, never off a host or
 *  a kind: the quote's dollars (the lean), the typed figure's (the counts sentence, or the first run sentence that names
 *  it), "your savings" (the lead). */
function typedBelowStructure(
  counts: string | null,
  clause: readonly string[],
  read: TypedBelowRead,
  t: FreshTypedBelow,
  host: TypedBelowLineHost,
  carriedMoved: boolean,
): TypedBelowLineStructure {
  const lean = typedBelowLean(t, host)
  const head = [...(counts === null ? [] : [counts]), ...clause, lean]
  const { spans, survivor } = read
  if (spans.length === 0) return { opening: head, spans: [], survivor: null, carriedMoved }
  const answer = TYPED_BELOW_NOUN[host]
  const count: TypedBelowSpanCount = spans.length < 2 ? 'one' : 'many'
  const lead = TYPED_BELOW_LEAD[host][count][survivor === null ? 'off' : 'on']
  const cap = typedBelowCap(read.quoteCap, t)
  const opening = [...head, ...(cap === null ? [] : [cap]), ...(lead === null ? [] : [lead])]
  // What the line has printed before its runs: the lean says the quote's dollars (`SPAN_QUOTE`), the lead says "your
  // savings", and the counts sentence the typed figure's dollars.
  const quoteNamed = opening.includes(lean)
  const savingsNamed = lead !== null && opening.includes(lead)
  let typedNamed = counts !== null && opening.includes(counts)
  const items: NoteSegment[] = []
  for (const [i, s] of spans.entries()) {
    const years = read.years.filter((y) => y.calendarYear >= s.firstYear && y.calendarYear <= s.lastYear)
    const amounts = new Map(
      SPAN_FIGURE_READS[s.kind].map(([name, figureOf]) => [name, typedBelowAmountOf(years.map((y) => ({ calendarYear: y.calendarYear, dollars: figureOf(y) })))]),
    )
    const words = typedBelowRunWords(s, {
      f: {
        answer,
        opener: count === 'one',
        oneYear: s.firstYear === s.lastYear,
        typed: t.typed,
        quote: t.quote,
        source: t.source,
        bothAlive: survivor !== null,
        quoteNamed,
        typedNamed,
        savingsNamed,
      },
      amount: (name) => {
        const a = amounts.get(name)
        // Unreachable: each kind's words read only its own figures (`SPAN_FIGURE_READS`, the Record they are keyed by).
        if (a === undefined) throw new Error(`typedBelowStructure: a ${s.kind} run has no ${name}`)
        return a
      },
      gloss: i === 0 ? irmaa.value.magiLookbackYears : null,
      twin: count === 'one' && isTwin(s, read.quoteCap),
      allLeftOver: years.every((y) => workingYearBottomLine(y.credit) < read.typedCap),
    })
    items.push({ label: slots.workingCostTypedBelowSpanLabel(s.firstYear, s.lastYear), sentences: words.sentences })
    typedNamed = typedNamed || words.namesTyped
  }
  return { opening, spans: items, survivor: survivor === null ? null : typedBelowSurvivorPart(survivor, t), carriedMoved }
}

/** The survivor part (KD7; council `wf_dfb7949b-4a7`): the costs first, by the read's form (KTD5), then the runs' close
 *  with X, "at most", and the rider. X is the read's, never re-derived here. The answers are not named beside the costs:
 *  the runs above named each one (the walk-9 form council's call (4), `names: 'none'`). */
function typedBelowSurvivorPart(s: TypedBelowSurvivor, t: FreshTypedBelow): readonly string[] {
  // Never glossed here: the typed-below line's first rider is a run's (KD3).
  return survivorPartOf(s, { typed: t.typed, quote: t.quote, source: t.source, names: 'none' }, null)
}
/** KD7's two sentences for a read and its frame, one home for the typed-below line and W's stale line; `glossYears` where
 *  the close is its line's first rider (KD3). */
function survivorPartOf(s: TypedBelowSurvivor, f: TypedBelowSurvivorFrame, glossYears: number | null): readonly string[] {
  return [TYPED_BELOW_SURVIVOR_COSTS[s.form](f, s), slots.workingCostTypedBelowSurvivorLess(f, formatMoney(s.most), glossYears)]
}
/** The survivor part's costs sentence by form (an exhaustive Record, insight 147): both whole figures where the whole gap
 *  holds, else the two survivor charges, printed so they differ wherever they differ (`formatMoneyPair`, R7). */
const TYPED_BELOW_SURVIVOR_COSTS: Readonly<Record<TypedBelowSurvivorForm, (f: TypedBelowSurvivorFrame, s: TypedBelowSurvivor) => string>> = {
  wholeGap: (f) => slots.workingCostTypedBelowSurvivorWholeGap(f),
  survivorCharges: (f, s) => slots.workingCostTypedBelowSurvivorCharges(f, formatMoneyPair(s.chargeAtTyped, s.chargeAtQuote)),
}

/** What a run's words need beyond its span: the frame (its predicates included), each figure in the amount rule, the
 *  gloss (the engine's look-back on the line's first run, `null` on every later one), T's twin, and NL's third limit
 *  (`allLeftOver`: this answer's credit prints below its own cap in every year of the run). */
interface TypedBelowRunContext {
  readonly f: TypedBelowSpanFrame
  readonly amount: (name: TypedBelowFigure) => TypedBelowAmount
  readonly gloss: number | null
  readonly twin: boolean
  readonly allLeftOver: boolean
}
/** A run's sentences (each its own paragraph) and whether they printed the typed figure's dollars, so the next run on the
 *  line says "your figure" (call (1b)). */
interface TypedBelowRunWords {
  readonly sentences: readonly string[]
  readonly namesTyped: boolean
}
/** A credit kind's beats by the line's shape (the walk-9 form council's call (1b) and call (2)): T's twin draws no first
 *  beat; a one-run line keeps three paragraphs; inside a list the pair is ONE paragraph of two sentences, then the close.
 *  ⚑ The pair as one paragraph is Briggsy's to close on walk 10's card. */
const creditBeats = (first: string, second: string, close: string, c: TypedBelowRunContext): readonly string[] =>
  c.twin ? [second, close] : c.f.opener ? [first, second, close] : [`${first} ${second}`, close]

/** Each run's words by its kind (KD4; an exhaustive Record, insight 147: a new kind fails to compile until it is worded):
 *  the spending side, the typed side, the close — a short run three paragraphs (the years that draw on savings look
 *  heavier, which is honest); a credit run inside a list two (its pair, then the close); `same` inside a list its merged
 *  sentence, then the close. A run carries only its own kind's figures, so no kind can word a figure it does not have. */
type TypedBelowSpanWords = {
  readonly [K in TypedBelowYearKind]: (s: Extract<TypedBelowSpan, { kind: K }>, c: TypedBelowRunContext) => TypedBelowRunWords
}
const TYPED_BELOW_SPAN_WORDS: TypedBelowSpanWords = {
  same: (s, c) => {
    const nothing = s.credit.most === 0
    const close = slots.workingCostTypedBelowSpanSame(c.f, c.gloss)
    // Never NL's third limit: both answers credit alike there.
    if (!c.f.opener) {
      return {
        sentences: [nothing ? slots.workingCostTypedBelowSpanBothNothing(c.f) : slots.workingCostTypedBelowSpanBothAdd(c.f, c.amount('credit')), close],
        namesTyped: false,
      }
    }
    return {
      sentences: nothing
        ? [slots.workingCostTypedBelowSpanAtQuoteNothing(c.f), slots.workingCostTypedBelowSpanAddsNothing(c.f), close]
        : [slots.workingCostTypedBelowSpanAtQuoteAdds(c.f, c.amount('credit')), slots.workingCostTypedBelowSpanAdds(c.f, c.amount('credit'), false), close],
      namesTyped: false,
    }
  },
  bothCredit: (_s, c) => ({
    sentences: creditBeats(
      slots.workingCostTypedBelowSpanAtQuoteAdds(c.f, c.amount('creditAtQuote')),
      slots.workingCostTypedBelowSpanAdds(c.f, c.amount('credit'), c.allLeftOver),
      c.twin ? slots.workingCostTypedBelowSpanLessTwin(c.f, c.amount('difference'), c.gloss) : slots.workingCostTypedBelowSpanLess(c.f, c.amount('difference'), false, c.gloss),
      c,
    ),
    namesTyped: false,
  }),
  quoteCreditsNothing: (_s, c) => ({
    sentences: creditBeats(
      slots.workingCostTypedBelowSpanAtQuoteNothing(c.f),
      slots.workingCostTypedBelowSpanAdds(c.f, c.amount('credit'), c.allLeftOver),
      c.twin ? slots.workingCostTypedBelowSpanLessTwin(c.f, c.amount('difference'), c.gloss) : slots.workingCostTypedBelowSpanLess(c.f, c.amount('difference'), false, c.gloss),
      c,
    ),
    namesTyped: false,
  }),
  // The short kinds' typed side names the typed figure; in full where the line has not yet printed it (`typedNamed`).
  shortLeftOverAtTyped: (_s, c) => ({
    sentences: [
      slots.workingCostTypedBelowSpanShortNothing(c.f, c.amount('shortAtQuote')),
      slots.workingCostTypedBelowSpanShortOut(c.f, c.amount('credit'), c.allLeftOver),
      slots.workingCostTypedBelowSpanLess(c.f, c.amount('difference'), true, c.gloss),
    ],
    namesTyped: !c.f.typedNamed,
  }),
  shortStillShortAtTyped: (_s, c) => ({
    sentences: [
      slots.workingCostTypedBelowSpanShort(c.f, c.amount('shortAtQuote')),
      slots.workingCostTypedBelowSpanStillShort(c.f, c.amount('shortAtTyped')),
      slots.workingCostTypedBelowSpanLess(c.f, c.amount('difference'), true, c.gloss),
    ],
    namesTyped: !c.f.typedNamed,
  }),
  shortEvenAtTyped: (_s, c) => ({
    sentences: [
      slots.workingCostTypedBelowSpanShort(c.f, c.amount('shortAtQuote')),
      slots.workingCostTypedBelowSpanEven(c.f),
      slots.workingCostTypedBelowSpanLess(c.f, c.amount('difference'), true, c.gloss),
    ],
    namesTyped: !c.f.typedNamed,
  }),
}
function typedBelowRunWords(s: TypedBelowSpan, c: TypedBelowRunContext): TypedBelowRunWords {
  return (TYPED_BELOW_SPAN_WORDS[s.kind] as (s: TypedBelowSpan, c: TypedBelowRunContext) => TypedBelowRunWords)(s, c)
}

/** The band caption's working-year half (U11 walk 8's W8-R7; `docs/plans/features/typed-below-walk8-form-build-spec.md`,
 *  U3): the figure the run counts a working year at, beside today's quote, wherever the two print differently, so the
 *  band's "prices your full budget" never reads as every year at the spending. `last` where W's answer is out of date
 *  (the run still carries its last figure: `buildDateInput`'s own W). Keyed on the figures the run and the quote carry,
 *  never on "typed": a kept figure, an out-of-date yes and a typed figure count alike, below or above the quote. `null`
 *  where the run carries no W, there is no quote, or the two print alike (a monthly entry a few cents off the quote). */
export interface WorkingYearFigureBesideQuote {
  readonly figure: string
  readonly quote: string
  readonly last: boolean
}
const figureBesideQuoteMemo = new WeakMap<ScenarioDraft, WorkingYearFigureBesideQuote | null>()
export function workingYearFigureBesideQuote(d: ScenarioDraft): WorkingYearFigureBesideQuote | null {
  const memo = figureBesideQuoteMemo.get(d)
  if (memo !== undefined) return memo
  const w = buildDateInput(d)?.workingYearCostReal
  const quote = workingYearQuote(d).annualReal
  const read =
    w === undefined || quote <= 0 || formatMoney(w) === formatMoney(quote)
      ? null
      : { figure: formatMoney(w), quote: formatMoney(quote), last: isWorkingYearCostStale(d) }
  figureBesideQuoteMemo.set(d, read)
  return read
}

/** The typed figure (yearly, formatted) today's year-0 left over rests on, exactly where the typed-below line speaks
 *  ({@link freshTypedBelow}, its own predicate), else `null` — the seat's figure line names it (U11 walk 7's R2). It
 *  reads no answer, so the figure line above the seat's radios stays the same under every answer (R6); where the left
 *  over has moved it is the moved core's `typedBelow`, the one value the moved line names too. */
export function workingYearLeftOverTypedBelow(d: ScenarioDraft): string | null {
  return freshTypedBelow(d)?.typed ?? null
}

/** The seat's half of the typed-below line (the rebuild's KTD6, host 3): under a "saved" answer the run carries, on a
 *  fresh typed figure below today's quote, the window's runs in the line's own words, the answer named by host
 *  ({@link TYPED_BELOW_NOUN}: "Your" in the sheet and on the step), its lean first (the quote in dollars; in the
 *  sheet the floor alone, the W row's note above saying the rest: the walk-9 form council's call (2)), then its cap
 *  sentence where there is one: one run as plain sentences, two or more behind the seat's lead
 *  (`workingLedgerLeftOverSpansLead`) as an ordered list. On the walk's money-picture step, where nothing above the seat
 *  carries the lean, the line opens with the counts sentence ({@link TypedBelowSeatHost}). It never carries the moved
 *  clause. `null` under any other answer, wherever no fresh typed figure sits below the quote, and where the read is
 *  `unknown`.
 *  WHERE IT IS DRAWN: below the seat's radios, never at the end of the W row's typed-below note, where walk 7's refuter
 *  put it. That note sits directly above the seat, and these sentences read the answer, so a tap on "Spent" would take
 *  them out from above the radio it pressed — R6's law that nothing above the control reads the answer
 *  (`docs/plans/features/working-year-surplus-build-spec.md`, its sanctioned readers amended in only where the answer
 *  is frozen or the reader sits far above the seat). Below the radios is R6's own home for a line chosen by the answer. */
export function workingYearLeftOverAtQuoteLine(d: ScenarioDraft, host: TypedBelowSeatHost): NoteParts | null {
  const s = workingYearLeftOverAtQuoteStructure(d, host)
  return s === null ? null : foldTypedBelow(s)
}

/** {@link workingYearLeftOverAtQuoteLine}'s structure (KTD8): `null` exactly where the line is. */
export function workingYearLeftOverAtQuoteStructure(d: ScenarioDraft, host: TypedBelowSeatHost): TypedBelowLineStructure | null {
  const t = freshTypedBelow(d)
  if (t === null) return null
  const read = workingYearTypedBelowWindow(d)
  if (read === null || read.kind === 'unknown' || read.spans.length === 0) return null
  return typedBelowStructure(SEAT_OPENS_ON_COUNTS[host] ? typedBelowCounts(t, TYPED_BELOW_NOUN[host]) : null, [], read, t, host, false)
}

/** The typed-below line's door on the gate: the update act's (`gateDoor`), naming the typed figure — or `null` exactly
 *  where the line is. `carriesMoved` — the line on this gate carries the moved left over's clause, so no moved note (nor
 *  its door sentence) is drawn, and the scope sentence names that fact's noun too (the walk-9 form council's call (1a);
 *  `composeReentry` picks the variant from its host Record). The Result's door is the update act's button
 *  (`stalenessPayCheckCtaUpdate`), inline after the line, as on W's plain stale line. */
export function workingYearCostTypedBelowDoor(d: ScenarioDraft, carriesMoved: boolean): GateDoor | null {
  const t = freshTypedBelow(d)
  if (t === null) return null
  const door = gateDoor('update', t.typed)
  return carriesMoved ? { ...door, scope: slots.workingCostTypedBelowGateScopeMoved(t.typed) } : door
}
