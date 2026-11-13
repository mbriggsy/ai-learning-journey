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
import {
  LEFT_OVER_WAITING_COPY,
  WORKING_COST_ACT_COPY,
  copy,
  slots,
  workingCostExtras,
  type LeftOverWaitingWords,
  type TypedBelowAnswer,
  type WorkingCostAct,
} from '@ui/copy'
import type { GateDoor, NoteDoor, NoteSegment } from '@ui/noteParts'
import { formatMoney } from './fields'
import {
  workingYearCostFigure,
  workingYearCostForRun,
  workingYearLedgerForRun,
  workingYearLeftOverLive,
  workingYearLeftOverShownState,
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
import { LEFT_OVER_CARRIES, LEFT_OVER_FACE, LEFT_OVER_MOVED, LEFT_OVER_W_CLAUSE } from './workingYearLeftOverState'

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
 *  the moved words: the Result's slot (as its clause), a rules note's clause above it, the gate's own line after it,
 *  and the seat's at-quote line below its radios — names year 0 at today's quote, so the words name the typed figure
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
  const s = workingYearCostStaleSentence(d)
  if (s === null || !s.rose) return s?.sentence ?? null
  const stored = savedWaitingOnW(d)
  const c = stored === null ? null : checkAtQuote(d, stored)
  const lean: StaleLean =
    c === null ? 'spendingAlone' : (c.kind === 'capped' || c.kind === 'whole') && c.laterShort === null ? 'leftOverHigh' : 'yearsCheaper'
  const words: Readonly<Record<StaleLean, () => string>> = {
    spendingAlone: () => slots.workingCostStaleLeansBetter(s.held),
    yearsCheaper: () => slots.workingCostStaleLeftOverYearsCheaper(s.held),
    leftOverHigh: () => slots.workingCostStaleLeftOverInflated(s.held, gapFormatted(d), s.quote),
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

/** Year 0's print at today's quote leaves nothing over where the spending ROSE past W — under ANY answer, since the
 *  seat waits for every answer and the question goes unasked at the quote whatever was answered: `short` with the run
 *  of short years it starts (U11 walk 7's R5: the seat names it), or `none` (exactly $0); `null` where year 0 there
 *  leaves $1 or more, or the spending did not rise. A "saved" answer waiting on W reads its own check at the quote (one
 *  composer, the line's); any other answer reads the same re-confirmed picture's year 0, memoized on the source draft
 *  like the check. */
type QuoteLeavesNothing = { readonly kind: 'short'; readonly run: WorkingYearShortRun } | { readonly kind: 'none' }
const quoteLeavesNothingMemo = new WeakMap<ScenarioDraft, QuoteLeavesNothing | null>()
function quoteLeavesNothing(d: ScenarioDraft): QuoteLeavesNothing | null {
  if (workingYearCostStaleSentence(d)?.rose !== true) return null
  const stored = savedWaitingOnW(d)
  if (stored !== null) {
    const c = checkAtQuote(d, stored)
    return c.kind === 'firstShort' ? { kind: 'short', run: c.run } : c.kind === 'firstNone' ? { kind: 'none' } : null
  }
  const memo = quoteLeavesNothingMemo.get(d)
  if (memo !== undefined) return memo
  const ledger = workingYearLedgerForRun(writeConfirmedWorkingYearCost(d))
  const year0 = ledger === 'unknown' ? null : ledger.year0
  const read: QuoteLeavesNothing | null =
    ledger === 'unknown' || year0 === null || year0.bottomLine >= 1
      ? null
      : year0.bottomLine < 0
        ? { kind: 'short', run: shortRunFrom(year0, ledger.laterYears) }
        : { kind: 'none' }
  quoteLeavesNothingMemo.set(d, read)
  return read
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
  return q === null ? workingYearCostAct(d) : q.kind === 'short' ? 'updateShort' : 'updateNone'
}

/** The seat's "waiting on W" words: the waiting form's copy key, or — `updateShort`, whose words carry the draft's
 *  dollars — the run of short years at today's quote, named as the Result's B arm names it (U11 walk 7's R5). */
export function workingYearLeftOverWaitingSeat(d: ScenarioDraft): string {
  const q = quoteLeavesNothing(d)
  if (q?.kind === 'short') {
    const quote = workingYearCostStaleSentence(d)?.quote ?? formatMoney(workingYearQuote(d).annualReal)
    const r = q.run
    return slots.workingLedgerLeftOverWaitingShort(quote, r.firstYear, r.lastYear, formatMoney(r.least), formatMoney(r.most))
  }
  // Every other form reads its key (the words `workingYearLeftOverWaitingWords` returns off the same `q`).
  return copy[LEFT_OVER_WAITING_COPY[q === null ? workingYearCostAct(d) : 'updateNone'].seat]
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
}
/** The line as one string, its parts in order one space apart: what a test compares and a reader's full text. */
export function workingYearCostStaleLineText(l: WorkingYearCostStaleLine): string {
  return [l.opening, ...l.segments.flatMap((s) => [s.label, ...s.sentences])].join(' ')
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
    ? slots.workingCostStaleShortLaterYear(s.firstYear, formatMoney(s.most), f.held)
    : slots.workingCostStaleShortLaterYears(s.firstYear, s.lastYear, formatMoney(s.least), formatMoney(s.most), f.held),
]
const firstShortWords = (s: WorkingYearShortRun, f: TailFigures): string =>
  s.lastYear === s.firstYear
    ? slots.workingCostStaleLeftOverIfFirstShort(s.firstYear, formatMoney(s.most), f.quote, f.held, f.stored)
    : slots.workingCostStaleLeftOverIfFirstShortRun(s.firstYear, s.lastYear, formatMoney(s.least), formatMoney(s.most), f.quote, f.held, f.stored)
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
  const note = workingYearCostStaleNote(d)
  if (note === null) return null
  const stored = savedWaitingOnW(d)
  const s = workingYearCostStaleSentence(d)
  // `s` is null exactly where the note is (the note is W's sentence): narrowing for the held figure.
  if (stored === null || s === null) return { opening: note, segments: [] }
  const f = { held: s.held, stored: formatMoney(stored), storedDollars: Math.round(stored) }
  const act = WORKING_COST_ACT_COPY[workingYearCostAct(d)]
  const until = slots[act.leftOverNone](f.stored, f.held)
  if (!s.rose) {
    return { opening: `${note} ${eitherWayLead(d)}`, segments: [nowSegment(f, afterWorkSentence(d), until, copy.workingCostStaleNoGuess)] }
  }
  const words = checkWords(checkAtQuote(d, stored), { ...f, quote: s.quote }, eitherWayLead(d))
  const now = words.short
    ? nowSegment(f, afterWorkSentence(d), slots.workingCostStaleLeftOverNoneNow(f.stored, f.held), null)
    : nowSegment(f, afterWorkSentence(d), until, slots.workingCostStaleNoSmallerAmount(s.quote))
  return {
    opening: `${note} ${words.lead}`,
    segments: [now, ...(words.ifSentences === null ? [] : [{ label: slots.workingCostStaleLabelIf(s.quote), sentences: words.ifSentences }])],
  }
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
      : [
          ...(room === null ? [] : [slots.workingCostStaleDoorMore(s.held, room, s.quote)]),
          press,
          room === null
            ? slots.workingCostStaleDoorKeepCovers(keepLabel, keep.formatted, keep.monthly)
            : slots.workingCostStaleDoorKeepUpTo(keepLabel, room),
          slots.workingCostStaleDoorYes(s.quote),
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
 *  the Result it is "This", and `carriesMoved` says whether this line holds the one standing slot the moved line would
 *  otherwise take. The credit sentence speaks only where the left over has NOT moved. Where it has, the moved words say
 *  the cap ("adds at most … the smaller of the two"), so this line says it once with them (U11 walk 7's R3 (c)): as
 *  this line's clause where it holds the Result's slot, and not at all on the gate (the moved line follows as its own
 *  line, one cause, one line) or where a tax, state-tax or working-years line hosts the moved clause on the hero's
 *  rules note (the Result passes `!leftOverClauseHost`). */
export type TypedBelowHost = { readonly kind: 'gate' } | { readonly kind: 'result'; readonly carriesMoved: boolean }

/** Year 0 at today's quote, and the first later short run there (capped and whole), by what the check at the quote reads
 *  (an exhaustive Record, insight 147). Capped and whole print alike here: the line states what the quote's year 0 has,
 *  never what updating adds (W's stale line says that, where the answer waits on W). `unknown` says nothing at the
 *  quote (unreachable wherever a picture at the typed figure is known: `WorkingYearCheckAtQuote`'s docblock).
 *  U11 walk 7 adds what the answer does beside each figure there, read off the run's own rule:
 *  · R4 — after year 0's print at the quote (capped, whole, none), where the credit exceeds it, by how much that year;
 *  · R1 — after a run of short years at the quote (year 0's, or a later one), what the answer does in them
 *    ({@link typedBelowShortYears}). */
interface TypedBelowFigures {
  readonly answer: TypedBelowAnswer
  readonly typed: string
  readonly quote: string
  /** The most a year credits, R8's cap (min(stored, year 0 at the typed figure)), in whole dollars as printed. */
  readonly creditDollars: number
  /** Today's quote less the typed figure, whole dollars: what W at the typed figure leaves in each working year's cash
   *  beyond the quote (W comes off each year's cash dollar for dollar, and the income tax does not read it). */
  readonly gapDollars: number
}
type TypedBelowAtQuote = {
  readonly [K in WorkingYearCheckAtQuote['kind']]: (c: Extract<WorkingYearCheckAtQuote, { kind: K }>, f: TypedBelowFigures) => readonly string[]
}
/** R4's sentence after year 0's print at the quote, where the credit is above it (`[]` where it is not). */
const yearExtra = (atQuoteDollars: number, f: TypedBelowFigures): readonly string[] =>
  f.creditDollars > atQuoteDollars ? [slots.workingCostTypedBelowYearExtra(f.answer, formatMoney(f.creditDollars - atQuoteDollars))] : []
/** R1's sentence after a run of short years at the quote: what the answer does in them at the typed figure. Each year's
 *  cash there is its cash at the quote plus the gap, and the engine credits min(that, the cap) where it is $1 or more
 *  (R8; nothing in a year that comes up short). Where every year of the run leaves money over at the typed figure
 *  (gap − the largest shortfall ≥ $1), it takes none of the shortfalls and adds that credit in each — one figure where
 *  every year's rounds alike, else the range; otherwise (some year short at the typed figure too: no seed reaches it)
 *  the fact true in every case: those years cost the gap less, so it takes less from savings in them. */
const typedBelowShortYears = (run: WorkingYearShortRun, f: TypedBelowFigures): string => {
  const oneYear = run.firstYear === run.lastYear
  const least = Math.round(run.least)
  const most = Math.round(run.most)
  if (f.gapDollars - most < 1) return slots.workingCostTypedBelowShortLess(f.answer, f.typed, oneYear, formatMoney(f.gapDollars))
  const low = Math.min(f.gapDollars - most, f.creditDollars)
  const high = Math.min(f.gapDollars - least, f.creditDollars)
  return slots.workingCostTypedBelowShortCredit(f.answer, f.typed, oneYear, formatMoney(low), formatMoney(high))
}
const leftOverAtQuote = (c: Extract<WorkingYearCheckAtQuote, { kind: 'capped' | 'whole' }>, f: TypedBelowFigures): readonly string[] => [
  slots.workingCostTypedBelowAtQuoteLeftOver(f.quote, c.year, formatMoney(c.leftOver)),
  ...yearExtra(Math.round(c.leftOver), f),
  ...(c.laterShort === null
    ? []
    : [
        slots.workingCostTypedBelowAtQuoteLaterShort(c.laterShort.firstYear, c.laterShort.lastYear, formatMoney(c.laterShort.least), formatMoney(c.laterShort.most)),
        typedBelowShortYears(c.laterShort, f),
      ]),
]
const TYPED_BELOW_AT_QUOTE: TypedBelowAtQuote = {
  capped: leftOverAtQuote,
  whole: leftOverAtQuote,
  firstShort: (c, f) => [
    slots.workingCostTypedBelowAtQuoteShort(f.quote, c.run.firstYear, c.run.lastYear, formatMoney(c.run.least), formatMoney(c.run.most)),
    typedBelowShortYears(c.run, f),
  ],
  firstNone: (c, f) => [slots.workingCostTypedBelowAtQuoteNone(f.quote, c.year), ...yearExtra(0, f)],
  unknown: () => [],
}
function typedBelowAtQuote(c: WorkingYearCheckAtQuote, f: TypedBelowFigures): readonly string[] {
  return (TYPED_BELOW_AT_QUOTE[c.kind] as (c: WorkingYearCheckAtQuote, f: TypedBelowFigures) => readonly string[])(c, f)
}

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

/** The typed-below LINE (R1), one string in W's plain form on both hosts: the answer counts the typed figure, below
 *  today's quote, both yearly, and the whole-answer lean; then, for a "saved" answer the run carries (`saved` or
 *  `saved-moved`, `LEFT_OVER_CARRIES`), the most it credits a year — min(stored, year 0 at the typed figure), R8's cap —
 *  and what the quote's own year 0 has (left over, nothing, or a run of short years), with the first later short run
 *  there, and what the answer does beside each (U11 walk 7's R4 and R1, {@link TypedBelowAtQuote}). Where the left
 *  over has also moved, the credit sentence gives way to the moved words: as this line's clause where it holds the
 *  Result's one slot, and on the gate or under a rules note's hosted clause not at all, since the moved words say the
 *  cap there (U11 walk 7's R3 (c): said twice, it read as "a math error"). Under any other answer (absent, spent, not
 *  sure, a "saved" answer not asked) the first two sentences alone: nothing is credited, and the lower figure only
 *  cheapens the years. `null` where no fresh typed figure sits below the quote ({@link freshTypedBelow}). The figures
 *  are the typed-below pair exactly as the W surfaces' note prints them (`workingYearCostTypedBelowQuote`), so the line
 *  and the note can never name two figures for one. */
export function workingYearCostTypedBelowLine(d: ScenarioDraft, host: TypedBelowHost): string | null {
  const t = freshTypedBelow(d)
  if (t === null) return null
  const answer: TypedBelowAnswer = host.kind === 'gate' ? 'Your' : 'This'
  const counts =
    t.source === 'budget' ? slots.workingCostTypedBelowCountsBudget(answer, t.typed, t.quote) : slots.workingCostTypedBelowCounts(answer, t.typed, t.quote)
  const c = typedBelowCarried(d, t, answer)
  if (c === null) return counts
  const moved = workingYearLeftOverMoved(d)
  const credit: readonly string[] =
    moved === null
      ? [slots.workingCostTypedBelowAdds(formatMoney(c.figures.creditDollars))]
      : host.kind === 'result' && host.carriesMoved
        ? [workingYearLeftOverMovedClause(moved)]
        : []
  return [counts, ...credit, ...c.atQuote].join(' ')
}

/** For a "saved" answer the run carries (`saved` or `saved-moved`, `LEFT_OVER_CARRIES`) under a fresh typed figure `t`:
 *  the line's figures — R8's cap and the gap, in whole dollars as printed — and its at-quote sentences
 *  ({@link TypedBelowAtQuote}); `null` under any other answer. The ONE read the Result's and the gate's line and the
 *  seat's at-quote line ({@link workingYearLeftOverAtQuoteLine}) share, so the sheet can never word them two ways. */
function typedBelowCarried(
  d: ScenarioDraft,
  t: NonNullable<ReturnType<typeof freshTypedBelow>>,
  answer: TypedBelowAnswer,
): { readonly figures: TypedBelowFigures; readonly atQuote: readonly string[] } | null {
  const saved = d.workingYearLeftOver
  // The answer first: a draft that is not "saved" never composes the money picture here.
  if (saved?.kind !== 'saved' || !LEFT_OVER_CARRIES[workingYearLeftOverShownState(d)]) return null
  const live = workingYearLeftOverLive(d)
  // Unreachable: a carried state has a known picture (`leftOverShownState` reads "not asked" without one).
  if (live === null) return null
  const creditDollars = Math.round(Math.min(saved.quotedReal, live))
  // `freshTypedBelow` read an entered W below the quote: its figure and the quote, in whole dollars as printed.
  const w = d.workingYearCost
  const gapDollars = w === undefined ? 0 : Math.round(workingYearQuote(d).annualReal) - Math.round(workingYearCostFigure(w))
  const figures: TypedBelowFigures = { answer, typed: t.typed, quote: t.quote, creditDollars, gapDollars }
  return { figures, atQuote: typedBelowAtQuote(checkAtQuote(d, saved.quotedReal), figures) }
}

/** The typed figure (yearly, formatted) today's year-0 left over rests on, exactly where the typed-below line speaks
 *  ({@link freshTypedBelow}, its own predicate), else `null` — the seat's figure line names it (U11 walk 7's R2). It
 *  reads no answer, so the figure line above the seat's radios stays the same under every answer (R6); where the left
 *  over has moved it is the moved core's `typedBelow`, the one value the moved line names too. */
export function workingYearLeftOverTypedBelow(d: ScenarioDraft): string | null {
  return freshTypedBelow(d)?.typed ?? null
}

/** The seat's half of the typed-below line (U11 walk 7's R2): under a "saved" answer the run carries, on a fresh typed
 *  figure below today's quote, the line's own at-quote sentences ({@link TypedBelowAtQuote}: year 0 at the quote, what the
 *  answer adds past it that year (R4), the first run of short years there and what the answer does in it (R1)) — the
 *  answer said "Your", as on the gate. `null` under any other answer, wherever no fresh typed figure sits below the quote,
 *  and where the check at the quote reads nothing (`unknown`). The details sheet, which the Result's door opens, named
 *  none of them (TM's $5,985 and 2029–2032 run; A's $10,985).
 *  WHERE IT IS DRAWN: below the seat's radios, never at the end of the W row's typed-below note, where the refuter put it.
 *  That note sits directly above the seat, and these sentences read the answer, so a tap on "Spent" would take four
 *  sentences out from above the radio it pressed — R6's law that nothing above the control reads the answer
 *  (`docs/plans/features/working-year-surplus-build-spec.md`, its sanctioned readers amended in only where the answer
 *  is frozen or the reader sits far above the seat). Below the radios is R6's own home for a line chosen by the answer. */
export function workingYearLeftOverAtQuoteLine(d: ScenarioDraft): string | null {
  const t = freshTypedBelow(d)
  if (t === null) return null
  const c = typedBelowCarried(d, t, 'Your')
  return c === null || c.atQuote.length === 0 ? null : c.atQuote.join(' ')
}

/** The typed-below line's door on the gate: the update act's (`gateDoor`), naming the typed figure — or `null` exactly
 *  where the line is. The Result's door is the update act's button (`stalenessPayCheckCtaUpdate`), inline after the
 *  line, as on W's plain stale line. */
export function workingYearCostTypedBelowDoor(d: ScenarioDraft): GateDoor | null {
  const t = freshTypedBelow(d)
  return t === null ? null : gateDoor('update', t.typed)
}
