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
 * W'S STALE WORDS (R12; the U11 Caddie walk's (ae)). The note the W surfaces print and the line the Result and
 * the gate print are composed here, below, because both read the left-over answer and the money picture, which
 * `workingYearQuote` cannot import (KTD2).
 */
import type { WorkingYearLeftOverKind, WorkingYearLeftOverV5 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { copy, slots } from '@ui/copy'
import { formatMoney } from './fields'
import { workingYearLedgerForRun, workingYearLeftOverLive, workingYearLeftOverShownState } from './intakeMap'
import { workingYearCostStaleSentence, writeConfirmedWorkingYearCost } from './workingYearQuote'
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
 *  read (obligation (f)). */
export interface WorkingYearLeftOverMoved {
  readonly stored: number
  readonly live: number
}

export function workingYearLeftOverMoved(d: ScenarioDraft): WorkingYearLeftOverMoved | null {
  const answer = d.workingYearLeftOver
  // The answer first: a draft that is not "saved" never composes the money picture here (the Result reads
  // this on every draft).
  if (answer?.kind !== 'saved' || !LEFT_OVER_MOVED[workingYearLeftOverShownState(d)]) return null
  const live = workingYearLeftOverLive(d)
  return live === null ? null : { stored: answer.quotedReal, live }
}

/** The moved line's sentence (after `copy.stalenessLeftOverNote`), and the clause a fired tax, state-tax or
 *  working-years line carries instead (R12) — both read off the moved core's ONE value, so the gate's fact
 *  and its words can never disagree (obligation (f)). Each names the smaller of the two as the most a year adds
 *  (R8 caps every credit at both). */
export function workingYearLeftOverMovedText(m: WorkingYearLeftOverMoved): string {
  return slots.stalenessLeftOverMoved(formatMoney(m.stored), formatMoney(m.live), formatMoney(Math.min(m.stored, m.live)))
}

export function workingYearLeftOverMovedClause(m: WorkingYearLeftOverMoved): string {
  return slots.stalenessLeftOverClause(formatMoney(m.stored), formatMoney(m.live), formatMoney(Math.min(m.stored, m.live)))
}

// ── W'S STALE WORDS (R12; the U11 Caddie walk's (ae), council `wf_fc80029e-d93`, 7/10, Frame B). ONE composer
//    for all four surfaces: the W step's note and the panel's W row print the NOTE, the Result's standing line
//    and the re-entry gate print the LINE, and the line always begins with the note (pinned). No threshold
//    figure and no "worse" anywhere (the council's two vetoed frames). ──

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

/** The lean after a risen stale sentence, by what the answer is (an exhaustive Record, insight 147). */
type StaleLean = 'spendingAlone' | 'yearsCheaper'
const STALE_LEAN_WORDS: Readonly<Record<StaleLean, (heldFormatted: string) => string>> = {
  // Absent, spent, not sure, or a "saved" answer that is not asked: no left over is credited at either figure,
  // so the too-low figure can only hide a short year (b9-7; the U11 walk's (af)).
  spendingAlone: slots.workingCostStaleLeansBetter,
  // "Saved", waiting on W: the stale run carries no left over and its checked twin carries one, so no
  // whole-answer lean is true across the extension; the year-level fact is (the Hawk's counterweight).
  yearsCheaper: slots.workingCostStaleLeftOverYearsCheaper,
}

/** W's stale NOTE — the W step's stale note and the panel's W row (`WorkingCostQuestion`, on the draft its
 *  press holds): W's sentence (`workingYearCostStaleSentence`), then, where the spending rose past the held
 *  figure, the lean for this answer. `null` while W is not stale. No dollars beyond W's own two figures: a
 *  figure here would sit in the fork's described-by as a reward for a "yes" (the red team's attack 4; PA's tax
 *  on pay lives in W, so the quote alone is rosy there). */
export function workingYearCostStaleNote(d: ScenarioDraft): string | null {
  const s = workingYearCostStaleSentence(d)
  if (s === null || !s.rose) return s?.sentence ?? null
  const lean: StaleLean = savedWaitingOnW(d) === null ? 'spendingAlone' : 'yearsCheaper'
  return `${s.sentence} ${STALE_LEAN_WORDS[lean](s.held)}`
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
 *  `laterShort` (capped and whole only): the FIRST later working year the picture at the quote prints short
 *  (everyone alive, the window-top candidate's frame) — it credits nothing in the checked run and draws more
 *  there (the red team's attack 2: a short year the main thread can compute is never left unsaid). */
export interface WorkingYearLaterShort {
  readonly calendarYear: number
  /** Whole dollars, positive: how far that year's printed bottom line sits below $0. */
  readonly short: number
}
export type WorkingYearCheckAtQuote =
  | { readonly kind: 'capped'; readonly leftOver: number; readonly laterShort: WorkingYearLaterShort | null }
  | { readonly kind: 'whole'; readonly leftOver: number; readonly laterShort: WorkingYearLaterShort | null }
  | { readonly kind: 'firstShort'; readonly short: number }
  | { readonly kind: 'firstNone' }
  | { readonly kind: 'unknown' }

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
  if (year0 < 0) return { kind: 'firstShort', short: -year0 }
  if (year0 < 1) return { kind: 'firstNone' }
  const first = ledger.laterYears.find((y) => y.bottomLine < 0)
  const laterShort = first === undefined ? null : { calendarYear: first.calendarYear, short: -first.bottomLine }
  return year0 < stored ? { kind: 'capped', leftOver: year0, laterShort } : { kind: 'whole', leftOver: year0, laterShort }
}

/** Exported for the tests and the dev seeds' witnesses: the check at the quote for THIS draft, or `null` where
 *  the line reads none (not a "saved" answer waiting on W, or the spending did not rise past the held figure). */
export function workingYearCheckAtQuote(d: ScenarioDraft): WorkingYearCheckAtQuote | null {
  const stored = savedWaitingOnW(d)
  if (stored === null || workingYearCostStaleSentence(d)?.rose !== true) return null
  return checkAtQuote(d, stored)
}

/** The tail's figures, as the line prints them: today's quote exactly as W's sentence printed it, and the
 *  stored figure. */
interface TailFigures {
  readonly quote: string
  readonly stored: string
}
type CheckWords = {
  readonly [K in WorkingYearCheckAtQuote['kind']]: (c: Extract<WorkingYearCheckAtQuote, { kind: K }>, f: TailFigures) => string
}
const laterShortWords = (s: WorkingYearLaterShort | null, f: TailFigures): string =>
  s === null ? '' : ` ${slots.workingCostStaleShortLaterYear(s.calendarYear, formatMoney(s.short), f.quote)}`
/** The Result's and the gate's tail after the note, by what a check at the quote does (exhaustive, insight 147). */
const CHECK_WORDS: CheckWords = {
  capped: (c, f) =>
    `${slots.workingCostStaleLeftOverClause(f.stored)} ${slots.workingCostStaleLeftOverAtMost(f.quote, formatMoney(c.leftOver))}${laterShortWords(c.laterShort, f)}`,
  whole: (c, f) =>
    `${slots.workingCostStaleLeftOverClause(f.stored)} ${slots.workingCostStaleLeftOverAtMostWhole(f.quote, formatMoney(c.leftOver), f.stored)}${laterShortWords(c.laterShort, f)}`,
  firstShort: (c, f) =>
    `${slots.workingCostStaleLeftOverFirstShort(f.quote, formatMoney(c.short), f.stored)} ${copy.workingCostStaleShortUntilChecked}`,
  firstNone: (_c, f) => `${slots.workingCostStaleLeftOverFirstNone(f.quote, f.stored)} ${copy.workingCostStaleShortUntilChecked}`,
  unknown: () => copy.workingCostStaleLeftOverUnknown,
}
function checkWords(c: WorkingYearCheckAtQuote, f: TailFigures): string {
  return (CHECK_WORDS[c.kind] as (c: WorkingYearCheckAtQuote, f: TailFigures) => string)(c, f)
}

/** W's ONE stale LINE as the Result and the re-entry gate say it (R12): the note
 *  ({@link workingYearCostStaleNote}, so the line always begins with what the W surfaces say), then, for a
 *  "saved" answer waiting on W, what the stale W withholds in dollars. `null` while W is not stale. Under any
 *  other answer, and under "not asked" (no picture, or below a printed $1), the line is the note alone.
 *  · Where the spending rose past the held figure: the tail by what a check at the quote does
 *    ({@link workingYearCheckAtQuote}): the clause and the most a check adds, with the first short later year
 *    where one prints; or, where year 0 at the quote leaves nothing over, that a check adds none of it, and the
 *    short-year lean.
 *  · Otherwise (the spending fell, or only the state moved): the clause alone. Its figure is the one the
 *    household ANSWERED at (`quotedReal`), never the live print (KTD7's review, `wf_1b3d4a9f-f3f`): the live print
 *    is read on the stale W, and once a raise lifts it above the stored figure it would name money no checked W
 *    can credit — R8 caps every credit at the stored figure. (Where pay FELL since the answer as well, a check
 *    there can add less than the stored figure: a moved left over hidden behind the stale W, since "waiting on
 *    W" outranks "saved, moved". Filed for U12's register pass as the U11 walk's (al).) */
export function workingYearCostStaleLine(d: ScenarioDraft): string | null {
  const note = workingYearCostStaleNote(d)
  const stored = savedWaitingOnW(d)
  if (note === null || stored === null) return note
  const s = workingYearCostStaleSentence(d)
  const storedFormatted = formatMoney(stored)
  if (s === null || !s.rose) return `${note} ${slots.workingCostStaleLeftOverClause(storedFormatted)}`
  return `${note} ${checkWords(checkAtQuote(d, stored), { quote: s.quote, stored: storedFormatted })}`
}
