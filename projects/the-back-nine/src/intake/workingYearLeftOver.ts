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
  workingYearCostAct,
  workingYearCostKeepLabel,
  workingYearCostStaleSentence,
  workingYearCostStaleness,
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
//    a "saved" answer waiting on W the line is ONE string in a fixed order per arm: the note, a direction lead, "This
//    answer now:" and what this answer does with the stored figure today, "If a working year costs $X:" and what
//    updating to it does — then, beside the door only, the act defined in the W row's button words
//    (`workingYearCostStaleDoor`). ──

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
/** "This answer now:" and what this answer does with the stored figure today — every "saved" arm waiting on W says
 *  it (walk 4's (bd): B had left it out), after its lead and before its "If" segment. */
const nowWords = (storedFormatted: string, afterWork: string | null = null): readonly string[] => [
  copy.workingCostStaleLabelNow,
  ...(afterWork === null ? [] : [afterWork]),
  slots.workingCostStaleLeftOverAnswered(storedFormatted),
  copy.workingCostStaleLeftOverNone,
]
/** The either-way lead, in the draft's act (`WORKING_COST_ACT_COPY`). */
const eitherWayLead = (d: ScenarioDraft): string => copy[WORKING_COST_ACT_COPY[workingYearCostAct(d)].eitherWay]
/** After the at-most sentence where a later run prints short at the quote: the years that don't come up short,
 *  where the ledger names them (`resumesFrom`), then the run and its close (C keeps it: the safe-side lean, true by
 *  mechanism). */
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
type CheckWords = {
  readonly [K in WorkingYearCheckAtQuote['kind']]: (
    c: Extract<WorkingYearCheckAtQuote, { kind: K }>,
    f: TailFigures,
    lead: string,
  ) => readonly string[]
}
/** The risen line after the note, by what a check at the quote does (exhaustive, insight 147), in the council's
 *  order: the lead, "This answer now:", "If a working year costs $X:". The LEAD (council `wf_7fa86902-35c`): where
 *  year 0 at the quote leaves nothing over (`firstShort` / `firstNone`) the stale answer can look better by
 *  mechanism across the arm, so that leads; everywhere else no whole-answer lean holds across the extension (Frame
 *  B, the Hawk's veto), so the either-way sentence leads (`lead`, in the draft's act). */
const CHECK_WORDS: CheckWords = {
  capped: (c, f, lead) => [
    lead,
    ...nowWords(f.stored),
    slots.workingCostStaleLabelIf(f.quote),
    slots.workingCostStaleLeftOverIfCapped(formatMoney(c.leftOver), c.year, f.quote, c.laterShort !== null),
    ...(c.laterShort === null ? [] : laterShortWords(c.year, c.laterShort, f)),
  ],
  whole: (c, f, lead) => [
    lead,
    ...nowWords(f.stored),
    slots.workingCostStaleLabelIf(f.quote),
    slots.workingCostStaleLeftOverIfWhole(formatMoney(c.leftOver), c.year, f.quote, f.stored, c.laterShort !== null),
    ...(c.laterShort === null ? [] : laterShortWords(c.year, c.laterShort, f)),
  ],
  firstShort: (c, f) => [
    slots.workingCostStaleShortUntilUpdated(f.held),
    ...nowWords(f.stored),
    slots.workingCostStaleLabelIf(f.quote),
    firstShortWords(c.run, f),
  ],
  firstNone: (c, f) => [
    slots.workingCostStaleShortUntilUpdated(f.held),
    ...nowWords(f.stored),
    slots.workingCostStaleLabelIf(f.quote),
    slots.workingCostStaleLeftOverIfFirstNone(c.year, f.quote, f.stored),
  ],
  // No picture at the quote: what R7 makes true, with no figure at the quote and no lean but the either-way one.
  unknown: (_c, f, lead) => [lead, ...nowWords(f.stored)],
}
function checkWords(c: WorkingYearCheckAtQuote, f: TailFigures, lead: string): readonly string[] {
  return (CHECK_WORDS[c.kind] as (c: WorkingYearCheckAtQuote, f: TailFigures, lead: string) => readonly string[])(c, f, lead)
}

/** W's ONE stale LINE as the Result and the re-entry gate say it (R12): the note
 *  ({@link workingYearCostStaleNote}, so the line always begins with what the W surfaces say), then, for a
 *  "saved" answer waiting on W, what the stale W withholds in dollars. `null` while W is not stale. Under any
 *  other answer, and under "not asked" (no picture, or below a printed $1), the line is the note alone. The act's
 *  definition is NOT here: it rides beside the door only ({@link workingYearCostStaleDoor}).
 *  · Where the spending rose past the held figure: by what a check at the quote does
 *    ({@link workingYearCheckAtQuote}), the lead, "This answer now:", then "If a working year costs $X:" with year 0
 *    there and the most updating adds (and a later short run, where one prints); or, where year 0 at the quote
 *    leaves nothing over, the short-year lead and that updating still adds none of it.
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
export function workingYearCostStaleLine(d: ScenarioDraft): string | null {
  const note = workingYearCostStaleNote(d)
  const stored = savedWaitingOnW(d)
  if (note === null || stored === null) return note
  const s = workingYearCostStaleSentence(d)
  // Unreachable: the note is W's sentence, so it is null exactly where this is (narrowing for the held figure).
  if (s === null) return note
  const storedFormatted = formatMoney(stored)
  if (!s.rose) {
    const spending = d.annualSpendingReal
    const afterWork =
      workingYearCostStaleness(d)?.quoteMoved === true && spending !== undefined && Number.isFinite(spending) && spending > 0
        ? slots.workingCostStaleAfterWork(formatMoney(spending))
        : null
    return [note, eitherWayLead(d), ...nowWords(storedFormatted, afterWork)].join(' ')
  }
  const words = checkWords(checkAtQuote(d, stored), { quote: s.quote, held: s.held, stored: storedFormatted }, eitherWayLead(d))
  return [note, ...words].join(' ')
}

/** What the stale line's DOOR says on its host (council `wf_7fa86902-35c`): the act, which picks the door's own
 *  words (`WORKING_COST_ACT_COPY`: the Result's button, the gate's door sentence), and the act DEFINED in the W
 *  row's own button words, said just before the door — or `null` where the line names the act nowhere but the
 *  door (every answer but a "saved" one waiting on W: the door lands on the W row's buttons, and the line's
 *  sentences never lean on the act). The hosts print the definition ONLY beside the door, so a read-only tab,
 *  which draws no door, is told no buttons to press. `null` while W is not stale. */
export interface WorkingYearCostStaleDoor {
  readonly act: WorkingCostAct
  readonly definition: string | null
}

export function workingYearCostStaleDoor(d: ScenarioDraft): WorkingYearCostStaleDoor | null {
  const s = workingYearCostStaleSentence(d)
  const w = d.workingYearCost
  if (s === null || w === undefined) return null
  const act = workingYearCostAct(d)
  if (savedWaitingOnW(d) === null) return { act, definition: null }
  // The buttons the W row draws for this draft (`WorkingCostQuestion`): risen — "Yes" at the quote and "No", no Keep
  // door (`keepable` is exactly `!heldYesBelowQuote`, and `rose` is `heldYesBelowQuote` on every arm that can rise);
  // otherwise the Keep door by its own label, then "Yes" where a quote is offered (`offersYes`), and "No".
  if (s.rose) return { act, definition: slots.workingCostStaleDefineUpdate(s.quote) }
  const keep = workingYearCostKeepLabel(w)
  return {
    act,
    definition: s.quote === null ? slots.workingCostStaleDefineConfirmNoQuote(keep) : slots.workingCostStaleDefineConfirm(keep, s.quote),
  }
}
