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
import type { WorkingYearLedgerLaterYear, WorkingYearLeftOverKind, WorkingYearLeftOverV5 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { WORKING_COST_ACT_COPY, copy, slots, type WorkingCostAct } from '@ui/copy'
import { formatMoney } from './fields'
import { workingYearLedgerForRun, workingYearLeftOverLive, workingYearLeftOverShownState } from './intakeMap'
import {
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
  let least = -first.bottomLine
  let most = least
  for (const y of after) {
    if (y.calendarYear !== lastYear + 1 || y.bottomLine >= 0) break
    lastYear = y.calendarYear
    least = Math.min(least, -y.bottomLine)
    most = Math.max(most, -y.bottomLine)
  }
  return { firstYear: first.calendarYear, lastYear, least, most }
}

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

/** The figures the risen arms print: today's quote and the held figure exactly as W's sentence printed them, and
 *  the stored figure. */
interface TailFigures {
  readonly quote: string
  readonly held: string
  readonly stored: string
}

/** One labelled part of W's stale line (U11 walk 5's (bi)): the run-in label and the sentences under it. The hosts
 *  start each part on its own line inside the one paragraph, the label set in the body's semibold (same size and
 *  ink, never color): mid-line in body weight, every cold look read "This answer now:" as a broken sentence. */
export interface WorkingYearCostStaleSegment {
  readonly label: string
  readonly sentences: readonly string[]
}
/** W's stale line as parts: the `opening` — the note ({@link workingYearCostStaleNote}, so it always begins with
 *  what the W surfaces say), then, for a "saved" answer waiting on W, the arm's direction lead — and the labelled
 *  `segments` in the council's order ("This answer now:", then on the risen arms "If a working year costs $X:").
 *  Every other answer: the note alone, no segments. The door's sentences are the host's
 *  ({@link workingYearCostStaleDoor}). */
export interface WorkingYearCostStaleLine {
  readonly opening: string
  readonly segments: readonly WorkingYearCostStaleSegment[]
}
/** The line as one string, its parts in order one space apart: what the hosts' `textContent` reads (each draws a
 *  space before its line break), the gate's React key, and what a screen reader hears. */
export function workingYearCostStaleLineText(l: WorkingYearCostStaleLine): string {
  return [l.opening, ...l.segments.flatMap((s) => [s.label, ...s.sentences])].join(' ')
}

/** "This answer now:" and what this answer does with the stored figure today — every "saved" arm waiting on W says
 *  it (walk 4's (bd)), after its lead and before its "If" part: after work it already uses the spending figure where
 *  the spending moved (walk 5's (bl)), the stored figure dated, and why it adds none of it, in the act's verb ((bh)). */
function nowSegment(d: ScenarioDraft, f: Omit<TailFigures, 'quote'>, afterWork: string | null): WorkingYearCostStaleSegment {
  return {
    label: copy.workingCostStaleLabelNow,
    sentences: [
      ...(afterWork === null ? [] : [afterWork]),
      slots.workingCostStaleLeftOverAnswered(f.stored),
      slots[WORKING_COST_ACT_COPY[workingYearCostAct(d)].leftOverNone](f.stored, f.held),
    ],
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
/** After the at-most sentence where a later run prints short at the quote: the years that don't come up short,
 *  where the ledger names them (`resumesFrom`), then the run and its close (C keeps it: the safe-side lean, true by
 *  mechanism, scoped to those years since walk 5's (bo)). */
const laterShortWords = (year0: number, s: WorkingYearLaterShort, f: TailFigures): readonly string[] => [
  ...(s.resumesFrom === null ? [] : [slots.workingCostStaleLeftOverGainYears(year0, s.firstYear - 1, s.resumesFrom)]),
  s.lastYear === s.firstYear
    ? slots.workingCostStaleShortLaterYear(s.firstYear, formatMoney(s.most), f.held)
    : slots.workingCostStaleShortLaterYears(s.firstYear, s.lastYear, formatMoney(s.least), formatMoney(s.most), f.held),
]
const firstShortWords = (s: WorkingYearShortRun, f: TailFigures): string =>
  s.lastYear === s.firstYear
    ? slots.workingCostStaleLeftOverIfFirstShort(s.firstYear, formatMoney(s.most), f.quote, f.held, f.stored)
    : slots.workingCostStaleLeftOverIfFirstShortRun(s.firstYear, s.lastYear, formatMoney(s.least), formatMoney(s.most), f.quote, f.held, f.stored)
/** Each arm's lead (closing the opening) and the sentences under "If a working year costs $X:" (`null`: no such part). */
interface CheckWordsOf {
  readonly lead: string
  readonly ifSentences: readonly string[] | null
}
type CheckWords = {
  readonly [K in WorkingYearCheckAtQuote['kind']]: (c: Extract<WorkingYearCheckAtQuote, { kind: K }>, f: TailFigures, lead: string) => CheckWordsOf
}
/** The risen line after the note, by what a check at the quote does (exhaustive, insight 147), in the council's
 *  order: the lead, "This answer now:", "If a working year costs $X:". The LEAD (council `wf_7fa86902-35c`): where
 *  year 0 at the quote leaves nothing over (`firstShort` / `firstNone`) the stale answer can look better by
 *  mechanism across the arm, so that leads; everywhere else no whole-answer lean holds across the extension (Frame
 *  B, the Hawk's veto), so the either-way sentence leads (`lead`, in the draft's act). */
const CHECK_WORDS: CheckWords = {
  capped: (c, f, lead) => ({
    lead,
    ifSentences: [
      slots.workingCostStaleLeftOverIfCapped(formatMoney(c.leftOver), c.year, f.quote, c.laterShort !== null),
      ...(c.laterShort === null ? [] : laterShortWords(c.year, c.laterShort, f)),
    ],
  }),
  whole: (c, f, lead) => ({
    lead,
    ifSentences: [
      slots.workingCostStaleLeftOverIfWhole(formatMoney(c.leftOver), c.year, f.quote, f.stored, c.laterShort !== null),
      ...(c.laterShort === null ? [] : laterShortWords(c.year, c.laterShort, f)),
    ],
  }),
  firstShort: (c, f) => ({ lead: slots.workingCostStaleShortUntilUpdated(f.held), ifSentences: [firstShortWords(c.run, f)] }),
  firstNone: (c, f) => ({
    lead: slots.workingCostStaleShortUntilUpdated(f.held),
    ifSentences: [slots.workingCostStaleLeftOverIfFirstNone(c.year, f.quote, f.stored)],
  }),
  // No picture at the quote: what R7 makes true, with no figure at the quote and no lean but the either-way one.
  unknown: (_c, _f, lead) => ({ lead, ifSentences: null }),
}
function checkWords(c: WorkingYearCheckAtQuote, f: TailFigures, lead: string): CheckWordsOf {
  return (CHECK_WORDS[c.kind] as (c: WorkingYearCheckAtQuote, f: TailFigures, lead: string) => CheckWordsOf)(c, f, lead)
}

/** W's ONE stale LINE as the Result and the re-entry gate say it (R12), as parts ({@link WorkingYearCostStaleLine};
 *  U11 walk 5's (bi)): the note ({@link workingYearCostStaleNote}, so the line always begins with what the W surfaces
 *  say), then, for a "saved" answer waiting on W, what the stale W withholds in dollars. `null` while W is not stale.
 *  Under any other answer, and under "not asked" (no picture, or below a printed $1), the line is the note alone. The
 *  door's words are NOT here: each host says its own beside its door only ({@link workingYearCostStaleDoor}).
 *  · Where the spending rose past the held figure: by what a check at the quote does
 *    ({@link workingYearCheckAtQuote}), the lead, "This answer now:" (after work it already uses the spending, the
 *    stored figure dated, why none of it is added), then "If a working year costs $X:" with year 0 there and the most
 *    updating adds (and a later short run, where one prints); or, where year 0 at the quote leaves nothing over, the
 *    short-year lead and that updating adds none of it.
 *  · Otherwise (the spending fell, or only the state moved): the either-way lead in "confirm or change" (the Keep
 *    door is real there), then "This answer now:" — after work it already uses the spending figure, where the
 *    spending moved (walk 4's (bf): both real readers took the answer to run on $84,000 of spending), and the
 *    stored figure, dated. No figure at the quote (the council struck the fallen arm's at-quote pair: there a
 *    check adds at most the stored figure, and naming a print above it would read as more). Its figure is the one
 *    the household ANSWERED at (`quotedReal`), never the live print (KTD7's review, `wf_1b3d4a9f-f3f`): the live
 *    print is read on the stale W, and once a raise lifts it above the stored figure it would name money no
 *    checked W can credit — R8 caps every credit at the stored figure. (Where pay FELL since the answer as well, a
 *    check there can add less than the stored figure: a moved left over hidden behind the stale W, since "waiting
 *    on W" outranks "saved, moved". Filed for U12's register pass as the U11 walk's (al).) */
export function workingYearCostStaleLine(d: ScenarioDraft): WorkingYearCostStaleLine | null {
  const note = workingYearCostStaleNote(d)
  if (note === null) return null
  const stored = savedWaitingOnW(d)
  const s = workingYearCostStaleSentence(d)
  // `s` is null exactly where the note is (the note is W's sentence): narrowing for the held figure.
  if (stored === null || s === null) return { opening: note, segments: [] }
  const f = { held: s.held, stored: formatMoney(stored) }
  const now = nowSegment(d, f, afterWorkSentence(d))
  if (!s.rose) return { opening: `${note} ${eitherWayLead(d)}`, segments: [now] }
  const words = checkWords(checkAtQuote(d, stored), { ...f, quote: s.quote }, eitherWayLead(d))
  return {
    opening: `${note} ${words.lead}`,
    segments: [now, ...(words.ifSentences === null ? [] : [{ label: slots.workingCostStaleLabelIf(s.quote), sentences: words.ifSentences }])],
  }
}

/** What each host says beside the stale line's DOOR (council `wf_7fa86902-35c`; U11 walk 5's (bj), (bk)), said only
 *  where the tab can save (a read-only tab draws no door, so it is told no buttons to press), after the line's parts
 *  and on a line of their own, unlabelled. `act` picks the door's own words (`WORKING_COST_ACT_COPY`).
 *  · `gate` — the door sentence, on EVERY stale arm: neither of the gate's buttons changes the figure, and where each
 *    leads (all four walk-5 cold looks hunted the gate for "Yes, that’s about right").
 *  · `result` — the Result's sentences before its button: none where the line leans on the act nowhere but the door
 *    (every answer but a "saved" one waiting on W); otherwise "press … below".
 *  For a "saved" answer waiting on W both then say "There, …": the condition first, in the W help's own items, then the
 *  W row's buttons by their own labels — risen, "No" (enter the quote plus those costs) or "Yes" at today's figure (no
 *  Keep door below the quote: `keepable` is exactly `!heldYesBelowQuote`); otherwise the Keep door by its own label,
 *  then "Yes" where a quote is offered (`offersYes`), and "No", each with its condition, after the figure's contents
 *  in a sentence of their own (it names no button, so it comes first on both hosts). `null` while W is not stale. */
export interface WorkingYearCostStaleDoor {
  readonly act: WorkingCostAct
  readonly result: readonly string[]
  readonly gate: readonly string[]
}

export function workingYearCostStaleDoor(d: ScenarioDraft): WorkingYearCostStaleDoor | null {
  const s = workingYearCostStaleSentence(d)
  const w = d.workingYearCost
  if (s === null || w === undefined) return null
  const act = workingYearCostAct(d)
  const a = WORKING_COST_ACT_COPY[act]
  const doorLabel = copy[a.resultDoor]
  const gateDoor = slots[a.gateDoor](s.held, doorLabel)
  if (savedWaitingOnW(d) === null) return { act, result: [], gate: [gateDoor] }
  const resultDoor = slots[a.resultDoorLead](doorLabel)
  const stateTax = stateTaxBelongsInW(d)
  // The figure "No" asks for, in the unit of the box it leaves the reader in: a figure held as typed by the month
  // opens its box in months with the unit already answered (the period prompt never asks there), so today's quote is
  // said a month; every other box opens its unit unanswered, so it is said a year (the round review).
  const enterMonthly = w.kind === 'entered' && w.entryPeriod === 'month'
  const enter = (quoteFormatted: string): readonly [string, boolean] =>
    enterMonthly ? [formatMoney(workingYearQuote(d).annualReal / 12), true] : [quoteFormatted, false]
  if (s.rose) {
    const there = slots.workingCostStaleDefineUpdate(s.quote, stateTax, ...enter(s.quote))
    return { act, result: [resultDoor, there], gate: [gateDoor, there] }
  }
  const hold = slots.workingCostStaleDefineHold(stateTax)
  const keepLabel = workingYearCostKeepLabel(w)
  const keep = workingYearCostKeepFigure(w)
  const there =
    s.quote === null
      ? slots.workingCostStaleDefineConfirmNoQuote(keepLabel, keep.formatted, keep.monthly)
      : slots.workingCostStaleDefineConfirm(keepLabel, keep.formatted, keep.monthly, s.quote, ...enter(s.quote))
  return { act, result: [hold, resultDoor, there], gate: [hold, gateDoor, there] }
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
