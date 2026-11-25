/**
 * src/ui/screens/retirement/probabilityView.ts: Retirement → Analysis → Probability's one pure composer (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC4; ref 2.7, 2.8). `Probability.tsx` draws what this returns and decides
 * nothing: every honesty decision of the page lives here (insight 048: a rule inline in a render is untested).
 *
 * THE PAGE. Two equal halves inside one panel: on the RIGHT the compared plan ("Your plan", its reading the ONE plan
 * reading, `planReadingFor`, plan 4.0); on the LEFT the alternative, its picker offering the new what-if (the one
 * what-if the shell keeps, `useWhatIf`; with no lever pulled it reads "No changes yet" beside the plan's own reading,
 * since the empty bundle IS the plan, U14) and the saved recommendation's own action (`recommendationBundle`), offered
 * ONLY while the store reads the record as current and never on the working route (the solve does not run there, so no
 * record exists to run; the rule is stated here, `recommendedOffer`, never left to a runtime null).
 *
 * RAW, EVERYWHERE A COUNT IS PRINTED (RC4's ruling, 2026-11-24): the rings, the intro sentence (`composeVerdictReading`
 * fed `rawDisplayed`, the triple the sticky seam would adopt with no history) and the difference line read the engine's
 * own quantized headline; nothing here reads `snapshot.displayed`. The difference line keys on the two PRINTED counts
 * (insight 099).
 *
 * THE TWO ROUTES (plan 4.0, "The two routes"; RC4's bullets):
 * - retired (`answer.kind === 'headline'`): the intro is the confidence statement; each half shows its ring, the survivor
 *   row (with its spending basis) and the essentials row, each only where present, and the balance bar: the median of
 *   the run's `terminalValuesReal`, labelled for what it is (each future's balance when the second of you dies, capped
 *   at the plan's last year), never "ending assets"; the two bars share one scale. The key-metric column carries the
 *   statement's spend clause, the difference line and the state clause.
 * - working (`answer.kind === 'date'`): the intro is the two-dates sentence (the graded date first, under the provisional
 *   tag while provisional); each ring reads the odds at the stop year its half runs at and names it ("if you stop in
 *   2031"); no balance bar and no survivor row on either half (the survivor stopgap line stands in their place, until
 *   section 6's "the working household's readings at its date" lands); the key-metric column carries the date's odds
 *   and the difference line. The chart menu adds "Odds by stop year" (`oddsChart`).
 *
 * STATES: pending (the computing frame, never a number), compute-error (the retry), the fallback (the missing facts named,
 * the page waits), re-figuring (the old answer stays, the line above it), provisional (the tag), the what-if's `waiting`
 * (until the final tier lands), its refusal or withheld words, its error, and a what-if in flight (the half fades under
 * "Loading…" with its numbers kept, where it has numbers to keep).
 *
 * A RUN IN FLIGHT (RC4b's explicit Refresh): the left half keeps the newest figure it showed in this pick (`landed`, the
 * plan's own or a reading that landed current) faded under "Loading…", so its numbers stay put until the new reading
 * lands; with nothing landed yet it says it is working.
 *
 * READ-ONLY: the panel itself carries no write action (Apply is the tray's, `trayView.ts`, which hides it on a read-only
 * tab), so a read-only view and a writable one compose alike.
 */
import type { MemoryModelSnapshot } from '@store/memoryModel'
import { rawDisplayed } from '@store/memoryModel'
import type { SavedRecommendationStatus } from '@store/savedRecommendation'
import { isDepleted, type DateTrackOutcome, type Headline, type SavedRecommendationV3, type WhatIfLeverV6 } from '@shared/model'
import { isDateRoute, missingRequiredFacts } from '@intake/intakeMap'
import { blockedLeadFor, missingFactLines } from '@intake/missingFacts'
import { BAR_RUNG, agedLadderMarks, curveMarks, offsetHasPassed, type CurveMark } from '@viz/curveMarks'
import { niceLattice, type DollarLattice } from '@viz/bandData'
import type { OddsSeries } from '@viz/charts/oddsByStopYearOptions'
import type { AnswerNotes } from '../../answerNotes'
import { selectElevatedAnswer } from '../../answerView'
import { copy, slots } from '../../copy'
import { dateOddsText } from '../../dateOdds'
import { floorLineText, heroLead } from '../../dateHero'
import { composeDateSplit } from '../../dateSplit'
import { dateTradeoffPoint } from '../../dateTradeoff'
import { staticDisclosures } from '../../entryCopy'
import { formatDeltaDollar, formatMmDollar, formatPerMonth, mmAxisFormatterFor } from '../../money'
import { OUTCOME_PRESENTATION } from '../../outcomeStates'
import { ringFace, type RingFace } from '../../ringReading'
import { spendingBasisLine } from '../../survivorLines'
import { floorRelief } from '../../twoTier'
import { composeVerdictReading, reserveClauseFor, spendClauseFor, verdictReadingText } from '../../verdictSentence'
import { floorUnread, readingCount, readingText, recommendationBundle, refusalWords } from '../../workbench/railChrome'
import type { TableRun } from '../../workbench/tableRun'
import { headlineExtras, planReadingFor, triesSubsidyRules, type HeadlineExtras, type WhatIfReading, type WhatIfSlotView } from '../../workbench/whatIfRun'
import type { LandedFigure } from '../../workbench/useWhatIf'
import { chartWords } from '../dashboard/snapshotView'

// ── Inputs ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** What the left picker shows: the new what-if (the tray's working bundle), a kept what-if reopened in the tray (by id,
 *  RC5), or the saved recommendation. */
export type LeftPick = 'new' | 'recommended' | `kept:${string}`

/** What the right picker shows (RC5's two-up): your plan, a kept what-if (by id), or the saved recommendation. */
export type RightPick = 'plan' | 'recommended' | `kept:${string}`

/** A kept what-if's id from a pick, or undefined. */
export const keptIdOf = (pick: string): string | undefined => (pick.startsWith('kept:') ? pick.slice('kept:'.length) : undefined)

/** Which chart the panel draws (the title's menu; "Odds by stop year" on the working route only). */
export type ProbabilityChart = 'rings' | 'odds'

export interface ProbabilityWhatIf {
  /** The left side's pick (the shell's one what-if's mode). */
  readonly pick: LeftPick
  /** The bundle the slot runs for that pick (the recommendation's own on `recommended`, the household's otherwise). */
  readonly bundle: readonly WhatIfLeverV6[]
  /** The slot's view for that bundle (`useWhatIf`'s `view`; null while no run is asked or its first state is pending). */
  readonly view: WhatIfSlotView | null
  /** The newest figure the left half showed in this pick (`useWhatIf`'s `landed`): held under "Loading…" while a run is
   *  in flight. */
  readonly landed?: LandedFigure | null
  /** A reopened kept what-if, edited since it was kept (RC5): its name is marked "changed, not kept". */
  readonly changed?: boolean
}

/** The right side (RC5): absent means your plan. */
export interface ProbabilityCompared {
  readonly pick: RightPick
  readonly bundle: readonly WhatIfLeverV6[]
  readonly view: WhatIfSlotView | null
  readonly landed?: LandedFigure | null
}

export interface ProbabilityInput {
  readonly snapshot: MemoryModelSnapshot
  readonly wallCalendarYear: number
  readonly readOnly: boolean
  readonly onRetry: () => void
  /** Every note the answer carries (`composeAnswerNotes`): the state, Medicare and extras lines read from it. */
  readonly notes: AnswerNotes
  readonly whatIf: ProbabilityWhatIf
  readonly compared?: ProbabilityCompared
  /** The DISK's remembered recommendation and the store's verdict on it (IntakeApp's `recordCard`). */
  readonly record?: { readonly record: SavedRecommendationV3; readonly status: SavedRecommendationStatus }
  readonly chart: ProbabilityChart
}

// ── The view ──────────────────────────────────────────────────────────────────────────────────────────────────────

export interface ReadingRow {
  readonly text: string
  /** The row's second lines (the survivor's spending basis and income step-down; the essentials' trim note). */
  readonly notes: readonly string[]
}

export type RingSlot =
  | { readonly kind: 'face'; readonly face: RingFace }
  /** No figure to draw: the ring empty, the words in its caption. */
  | { readonly kind: 'empty'; readonly caption: string }

export interface HalfView {
  readonly side: 'alternative' | 'compared'
  /** The half's name ("Your plan", "New what-if", "Recommended"). */
  readonly title: string
  readonly ring: RingSlot
  /** A run in flight over numbers that stay put: the half fades under "Loading…". */
  readonly loading: boolean
  /** One line under the ring: "No changes yet", the what-if's waiting, refusal or error words. */
  readonly status?: string
  readonly rows: readonly ReadingRow[]
  /** The working route's survivor stopgap, in place of the survivor row. */
  readonly stopgap?: string
  /** The median balance at the second death, in today's dollars (the retired route; absent while unread). */
  readonly barMedian?: number
}

export interface BarsView {
  readonly label: string
  readonly note: string
  /** The line under the halves that names what the bars hold: the label, then its note. */
  readonly caption: string
  readonly description: string
  readonly lattice: DollarLattice
  readonly axisDollar: (dollars: number) => string
  /** Each half's printed figure (`~`), keyed by side; absent where the half has no bar to draw. */
  readonly figures: { readonly alternative?: string; readonly compared?: string }
}

export interface IntroView {
  /** The re-figuring line, else the provisional tag: one slot, one line. */
  readonly eyebrow?: string
  /** The answer's lead: the confidence statement's word and count (retired), the hero date sentence (working). */
  readonly lead: string
  /** The rest of the answer's words: the essentials date line (working), its notes. */
  readonly lines: readonly string[]
}

export interface MetricsView {
  /** The lines the key-metric column carries, in order. */
  readonly lines: readonly string[]
  /** The spend clause's widest form while its figure is pending (held hidden, so the landing moves nothing). */
  readonly clauseReserve?: string
  /** Where the spend clause's figure stands (the first line's hook for the "lands without moving anything" arm). */
  readonly spend?: 'pending' | 'sized' | 'unsized'
  /** The difference line (or "No changes yet"), in its own slot so a reading landing moves nothing below it. */
  readonly difference: string | null
  /** The difference line's widest form for the two names on show (held hidden in its cell). */
  readonly differenceReserve: string
  /** The subsidy-rules health line ({@link healthLine}) in its own cell under the difference line: `line` null while
   *  either side's figure is unread, `reserve` its widest form held hidden, so the landing moves nothing. Absent unless the
   *  left side tries the subsidy rules beside your plan. */
  readonly health?: { readonly line: string | null; readonly reserve: string }
}

export interface PickerView<Pick extends string = LeftPick> {
  readonly label: string
  readonly items: readonly { readonly value: Pick; readonly label: string }[]
  readonly value: Pick
}

export interface OddsChartView {
  readonly series: readonly OddsSeries[]
  readonly barRung: number
  /** The provisional tag over a provisional curve (or the re-figuring line), shown with the chart's title. */
  readonly tag?: string
  /** The lines under the chart: the no-date explanation, the window-edge tell, the dip note, the plan caveat, the aged
   *  balances clause. */
  readonly notes: readonly string[]
  readonly labels: {
    readonly barLabel: string
    readonly xAxisTitle: string
    readonly yTick: (rung: number) => string
    readonly xTick: (year: number) => string
    readonly description: string
    readonly words: ReturnType<typeof chartWords>
  }
}

export type ProbabilityView =
  | {
      readonly kind: 'reading'
      readonly route: 'headline' | 'date'
      readonly intro: IntroView
      readonly picker: PickerView
      /** The right side's picker (RC5): your plan, each kept what-if, Recommended. */
      readonly comparedPicker: PickerView<RightPick>
      readonly planTitle: string
      readonly vs: string
      /** Words in place of the Recommended pick (a stale record, one saved before version 6, the working route), with
       *  the door their words name. */
      readonly recordNote?: { readonly words: string; readonly door: 'tax-strategies' }
      readonly halves: { readonly alternative: HalfView; readonly compared: HalfView }
      /** The rows' second lines when both halves would print the same ones (no lever changes them): said once, under
       *  both halves, at the full width of the two (measured: printed in each half, a split household's two rows ran the
       *  R13 caveat 36 px past his 731 px window). Absent when the halves' lines differ: each half keeps its own. */
      readonly sharedNotes?: readonly string[]
      readonly bars?: BarsView
      /** The retired route with every median at $0 (half or more of the futures use their savings up first): the words
       *  in the bars' place, never a silently missing picture. */
      readonly barsNone?: string
      readonly metrics: MetricsView
      /** The answer's own notes: the Medicare-priced affirmation, then the state clause (each only where it applies).
       *  The rings view prints them last in the key-metric column (`metrics.lines` ends with them); Odds by stop year has
       *  no key-metric column, so it prints them first in its footnote row, the affirmation just above the residual it
       *  qualifies (the plan's 4.0 disclosure map: every figured surface carries one state clause). */
      readonly noteLines: readonly string[]
      readonly footnotes: readonly string[]
      readonly charts: readonly { readonly id: ProbabilityChart; readonly label: string }[]
      readonly chart: ProbabilityChart
      readonly odds?: OddsChartView
      readonly caveat: readonly string[]
    }
  | { readonly kind: 'pending'; readonly words: string; readonly caveat: readonly string[] }
  | { readonly kind: 'compute-error'; readonly words: string; readonly retry: string; readonly onRetry: () => void; readonly caveat: readonly string[] }
  | { readonly kind: 'fallback'; readonly lead: string; readonly lines: readonly string[]; readonly caveat: readonly string[] }

const CAVEAT = [staticDisclosures.honestLimitsScope, staticDisclosures.honestLimitsValidate] as const

const WITHHELD_WORDS: Readonly<Record<Extract<TableRun, { kind: 'withheld' }>['reason'], string>> = {
  'no-run': copy.workbenchWithheldNoRun,
  'no-date-answer': copy.workbenchWithheldNoDate,
  'band-missing': copy.workbenchWithheldBand,
  'no-ledger': copy.workbenchWithheldNoLedger,
}

// ── The Recommended pick ────────────────────────────────────────────────────────────────────────────────────────

export type RecommendedOffer =
  | { readonly kind: 'runnable'; readonly bundle: readonly WhatIfLeverV6[] }
  /** A record exists and cannot run: words, no pick. */
  | { readonly kind: 'words'; readonly words: string }
  | { readonly kind: 'none' }

/**
 * THE CURRENT-RECORD RULE, stated once: the Recommended pick runs the saved record's own action (its order and its
 * conversion plan) only while the store reads the record as current; a stale record or one saved before version 6 shows
 * words and runs nothing; the working route never offers it (the solve does not run there, so no record can be born
 * on it, and the store's `recordCard` is withheld there too).
 */
export function recommendedOffer(
  draft: MemoryModelSnapshot['draft'],
  record: ProbabilityInput['record'],
): RecommendedOffer {
  if (isDateRoute(draft) || record === undefined) return { kind: 'none' }
  const bundle = recommendationBundle(record.record)
  if (bundle === null) return { kind: 'words', words: copy.workbenchRailRecOld }
  if (!record.status.current) return { kind: 'words', words: copy.workbenchRailRecStale }
  return { kind: 'runnable', bundle }
}

/** The left picker's pick on landing: Recommended where a current saved recommendation can run, else the new what-if. */
export function landingPick(draft: MemoryModelSnapshot['draft'], record: ProbabilityInput['record']): LeftPick {
  return recommendedOffer(draft, record).kind === 'runnable' ? 'recommended' : 'new'
}

/** The halves, with each second line both halves carry (on the same row) said once, under both, at the full width of the
 *  two; a line only one half carries (a lever changed it: the what-if's own spending basis) stays in its half. Line by
 *  line, never all or none: a landed what-if that moves one line leaves the others shared, so its landing grows the
 *  halves by that line alone (RC4b's landed fit: all-or-none un-shared every line and ran `budget`'s handle 35 px past
 *  his window). */
export function shareRowNotes(alternative: HalfView, compared: HalfView): { halves: { alternative: HalfView; compared: HalfView }; sharedNotes?: readonly string[] } {
  const shared: string[] = []
  alternative.rows.forEach((row, i) => {
    const other = compared.rows[i]
    if (other === undefined) return
    for (const n of row.notes) if (other.notes.includes(n) && !shared.includes(n)) shared.push(n)
  })
  if (shared.length === 0) return { halves: { alternative, compared } }
  const strip = (h: HalfView): HalfView => ({ ...h, rows: h.rows.map((r) => ({ ...r, notes: r.notes.filter((n) => !shared.includes(n)) })) })
  return { halves: { alternative: strip(alternative), compared: strip(compared) }, sharedNotes: shared }
}

// ── The halves ──────────────────────────────────────────────────────────────────────────────────────────────────

/** A spine reading's rows: the survivor row with its basis and its income step-down, and the essentials row where the
 *  relief gate earns it. */
function headlineRows(headline: Headline, extras: HeadlineExtras, planClockYears: number): ReadingRow[] {
  const rows: ReadingRow[] = []
  const s = extras.survivorReading
  if (s !== undefined && OUTCOME_PRESENTATION[s.outcomeState].verdictWordKey !== null) {
    const basis = spendingBasisLine(s.spendingBasis)
    // The old survivor card's context, in its order (`SurvivorReadout.tsx`, deleted at RC4): what the survivor spends,
    // then what the survivor's income does. The step-down shows only for a real drop: a figure that rounds to "$0" (the
    // survivor dying before the steady-state anchor) prints no line, read through the same formatter the slot prints.
    const stepDown = formatPerMonth(s.incomeStepDownMonthlyReal)
    rows.push({
      text: slots.probabilitySurvivorRow(verdictReadingText(s.outcomeState, s.xOfTen.value)),
      notes: [...(basis === null ? [] : [basis]), ...(stepDown === '0' ? [] : [slots.verdictSurvivorStepDown(stepDown)])],
    })
  }
  const relief = floorRelief(headline, extras.floorReading, planClockYears)
  if (relief !== null) {
    rows.push({
      text: slots.probabilityEssentialsRow(verdictReadingText(relief.reading.outcomeState, relief.reading.xOfTen.value)),
      notes: relief.showTrimNote ? [copy.floorReadoutTrimNote] : [],
    })
  }
  return rows
}

/** The ring for a reading, on its route (the caption names the pass it reads and a stop year the plan has passed). */
function ringOf(reading: WhatIfReading | null, startCalendarYear: number, planClockYears: number): RingSlot {
  if (reading === null) return { kind: 'empty', caption: copy.snapshotRingNoReading }
  return { kind: 'face', face: ringFace(reading, startCalendarYear, planClockYears) }
}

type AltState =
  | { readonly kind: 'empty' }
  | { readonly kind: 'waiting' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'error' }
  | { readonly kind: 'words'; readonly words: string }
  | { readonly kind: 'ready'; readonly reading: WhatIfReading; readonly extras?: HeadlineExtras; readonly updating: boolean }

/** A side's state from its slot (the What if page's own reading of it, `WhatIfPage.tsx`'s `readingState`). A kept
 *  what-if whose lever no longer applies (a line, account or person gone, everyone now retired) is the slot's refusal:
 *  its words, and nothing run (insight 102: never the pointer dropped and the rest run). */
function sideState(side: { readonly bundle: readonly WhatIfLeverV6[]; readonly view: WhatIfSlotView | null }, snapshot: MemoryModelSnapshot): AltState {
  if (side.bundle.length === 0) return { kind: 'empty' }
  const a = snapshot.answer
  const v = side.view
  if (v === null) return a.kind === 'date' && a.tier !== 'final' ? { kind: 'waiting' } : { kind: 'pending' }
  if (v.kind === 'refused') return { kind: 'words', words: refusalWords(v.refusal, snapshot.draft.startCalendarYear) }
  if (v.kind === 'withheld') return { kind: 'words', words: WITHHELD_WORDS[v.reason] }
  if (v.kind === 'answer-error') return { kind: 'error' }
  const m = v.many
  if (m.kind === 'loading') return (a.kind === 'date' || a.kind === 'headline') && a.tier !== 'final' ? { kind: 'waiting' } : { kind: 'pending' }
  if (m.kind === 'error') return { kind: 'error' }
  return { kind: 'ready', reading: m.value.whatIf, ...(m.value.extras !== undefined ? { extras: m.value.extras } : {}), updating: m.updating }
}

// ── The subsidy-rules health line ───────────────────────────────────────────────────────────────────────────────

/** The widest figure the health line's reserve holds (a seven-digit lifetime cost, wider than any the design reaches). */
const HEALTH_RESERVE_FIGURE = '9,999,000'

/**
 * THE HEALTH LINE (the register's Tier 0 *The subsidy-rules comparison lost its lifetime health-cost line with RC10…*;
 * council 2026-07-03: the rules' effect sits in the years before Medicare and can barely move the odds, so the odds alone
 * read calmer than the cost). Printed only where your plan is one side and the other tries the subsidy rules (its words,
 * "as figured now", name your plan): the left what-if beside your plan, or a kept what-if on the right beside the left's
 * empty bundle (then from the right slot's view, the what-if named). Each side's figure is its own run's median of each future's lifetime
 * health cost (`lifetimeHealthMedianReal`), never a difference of two medians; both on the same futures (KTD11). Printed
 * in Health Care's dialect (`formatDeltaDollar`, the hero that prints the plan's same figure), and only once both sides
 * landed on the slot's current key: a half-landed pair prints nothing, never one side beside a stale other. Two figures
 * that print alike read "about the same", quoted once.
 *
 * WHERE MONEY RUNS OUT. Each future's lifetime sum accrues only the years it could pay for (`taxOverlay.ts`), so where
 * any future of either side runs out the figures can read low, and the line carries Health Care's own clause
 * (`healthLifetimeStopsAtRunOut`, the same statistic's caveat there). `planRanOut` is the plan side's: known on the spine
 * (the committed answer's `depletionYears`); the working route's plan run carries no such flag yet, so there only the
 * what-if side's (`whatIfHealthRanOut`, its own run's) can add it.
 */
export function healthLine(view: WhatIfSlotView | null, name?: string, planRanOut = false): string | null {
  if (view === null || view.kind !== 'shown') return null
  const { many, planHealth } = view
  if (many.kind !== 'ready' || many.updating || planHealth.kind !== 'ready' || planHealth.updating) return null
  const whatIf = many.value.whatIfHealthReal
  if (whatIf === undefined) return null
  const a = formatDeltaDollar(whatIf)
  const b = formatDeltaDollar(planHealth.value)
  // `name`: the what-if sits on the right (your plan the left's empty bundle), so it is named, never "this way".
  const line = a === b ? slots.subsidyRegimeCostEven(a) : name !== undefined ? slots.subsidyRegimeCostDeltaWith(name, a, b) : slots.subsidyRegimeCostDelta(a, b)
  return planRanOut || many.value.whatIfHealthRanOut === true ? `${line} ${copy.healthLifetimeStopsAtRunOut}` : line
}

// ── The page ────────────────────────────────────────────────────────────────────────────────────────────────────

export function probabilityView(input: ProbabilityInput): ProbabilityView {
  const { snapshot, notes, whatIf, record } = input
  const elevated = selectElevatedAnswer(snapshot, input.onRetry, notes.planClock)
  if (elevated.kind === 'fallback') {
    const facts = missingRequiredFacts(snapshot.draft)
    const lines = missingFactLines(facts)
    return {
      kind: 'fallback',
      lead: blockedLeadFor(facts),
      lines: [lines.stillNeeded, lines.cannotPrice].filter((l): l is string => l !== null),
      caveat: CAVEAT,
    }
  }
  if (elevated.view.kind === 'pending') return { kind: 'pending', words: copy.answerPending, caveat: CAVEAT }
  if (elevated.view.kind === 'compute-error') {
    return { kind: 'compute-error', words: copy.answerError, retry: copy.answerRetry, onRetry: elevated.view.onRetry, caveat: CAVEAT }
  }
  const answer = snapshot.answer
  if (answer.kind !== 'headline' && answer.kind !== 'date') {
    return { kind: 'pending', words: copy.answerPending, caveat: CAVEAT }
  }
  const startCalendarYear = answer.draft.startCalendarYear
  const planClockYears = notes.planClock.yearsSincePlanBuilt
  const plan = planReadingFor(answer)
  const offer = recommendedOffer(snapshot.draft, record)
  const kept = snapshot.draft.keptWhatIfs ?? []
  const keptName = (pick: string): string | undefined => {
    const id = keptIdOf(pick)
    return id === undefined ? undefined : kept.find((k) => k.id === id)?.name
  }
  // A pick the household can no longer make (a record gone stale, a kept what-if deleted) falls back to the default.
  const leftKeptName = keptName(whatIf.pick)
  const pick: LeftPick =
    whatIf.pick === 'recommended' ? (offer.kind === 'runnable' ? 'recommended' : 'new') : leftKeptName !== undefined ? whatIf.pick : 'new'
  const altName =
    pick === 'recommended'
      ? copy.probabilityPickRecommended
      : leftKeptName !== undefined
        ? whatIf.changed === true
          ? slots.probabilityKeptChanged(leftKeptName)
          : leftKeptName
        : copy.probabilityPickNew
  const alt = sideState(whatIf, snapshot)
  const right = input.compared
  const rightKeptName = right === undefined ? undefined : keptName(right.pick)
  // One thing per side: the recommendation on the left (a door's "Try it in the plan" put it there) leaves the right
  // reading your plan, never Recommended beside itself.
  const rightPick: RightPick =
    right === undefined
      ? 'plan'
      : right.pick === 'recommended'
        ? offer.kind === 'runnable' && pick !== 'recommended'
          ? 'recommended'
          : 'plan'
        : rightKeptName !== undefined
          ? right.pick
          : 'plan'
  const rightName = rightPick === 'recommended' ? copy.probabilityPickRecommended : (rightKeptName ?? copy.probabilityPlanTitle)

  // ── Your plan's own reading (the right half's by default; the left half's while its bundle is empty) ──
  const planExtras = answer.kind === 'headline' ? headlineExtras(answer.result) : undefined
  const planHalf: HalfView = {
    side: 'compared',
    title: copy.probabilityPlanTitle,
    ring: ringOf(plan, startCalendarYear, planClockYears),
    loading: false,
    rows: answer.kind === 'headline' && plan?.kind === 'headline' && planExtras !== undefined ? headlineRows(plan.headline, planExtras, planClockYears) : [],
    ...(answer.kind === 'date' ? { stopgap: copy.probabilitySurvivorStopgap } : {}),
    ...(planExtras?.terminalMedianReal !== undefined ? { barMedian: planExtras.terminalMedianReal } : {}),
  }

  /** One side's half from its run's state (the same rules on both sides: RC5's two-up). */
  const sideHalf = (side: HalfView['side'], title: string, state: AltState, landed: LandedFigure | null | undefined): HalfView => {
    const base = { side, title, ...(answer.kind === 'date' ? { stopgap: copy.probabilitySurvivorStopgap } : {}) }
    const asPlan = { ring: planHalf.ring, rows: planHalf.rows, ...(planHalf.barMedian !== undefined ? { barMedian: planHalf.barMedian } : {}) }
    switch (state.kind) {
      case 'empty':
        // The empty bundle IS the plan (U14): the plan's own reading. Beside your plan its words, "No changes yet", are
        // the key-metric column's difference line (one line, said once); beside anything else the half says so itself.
        return { ...base, ...asPlan, loading: false, ...(rightPick !== 'plan' ? { status: copy.probabilityNoChanges } : {}) }
      case 'waiting':
        return { ...base, ring: { kind: 'empty', caption: copy.probabilityLoading }, loading: false, status: copy.probabilityWaitingFinal, rows: [] }
      case 'pending': {
        // The newest figure this side showed stays put, faded under "Loading…" (ref 2.7's refresh state).
        if (landed?.kind === 'plan') return { ...base, ...asPlan, loading: true }
        if (landed?.kind === 'reading') {
          const extras = landed.pair.extras
          const rows = landed.pair.whatIf.kind === 'headline' && extras !== undefined ? headlineRows(landed.pair.whatIf.headline, extras, planClockYears) : []
          return {
            ...base,
            ring: ringOf(landed.pair.whatIf, startCalendarYear, planClockYears),
            loading: true,
            rows,
            ...(extras?.terminalMedianReal !== undefined ? { barMedian: extras.terminalMedianReal } : {}),
          }
        }
        return { ...base, ring: { kind: 'empty', caption: copy.probabilityLoading }, loading: false, status: copy.workbenchRailWorking, rows: [] }
      }
      case 'error':
        return { ...base, ring: { kind: 'empty', caption: copy.snapshotRingNoReading }, loading: false, status: copy.workbenchRailError, rows: [] }
      case 'words':
        return { ...base, ring: { kind: 'empty', caption: copy.snapshotRingNoReading }, loading: false, status: state.words, rows: [] }
      case 'ready': {
        const rows = state.reading.kind === 'headline' && state.extras !== undefined ? headlineRows(state.reading.headline, state.extras, planClockYears) : []
        return {
          ...base,
          ring: ringOf(state.reading, startCalendarYear, planClockYears),
          loading: state.updating,
          rows,
          ...(state.updating ? { status: copy.workbenchRailUpdating } : {}),
          ...(state.extras?.terminalMedianReal !== undefined ? { barMedian: state.extras.terminalMedianReal } : {}),
        }
      }
    }
  }

  // ── The right half: your plan, or a kept what-if or the recommendation on its own slot ──
  const rightState: AltState | null = rightPick === 'plan' || right === undefined ? null : sideState(right, snapshot)
  const compared: HalfView = rightState === null ? planHalf : sideHalf('compared', rightName, rightState, right?.landed)
  // ── The left half: the alternative ──
  const alternative = sideHalf('alternative', altName, alt, whatIf.landed)

  // ── The difference line: the two PRINTED counts, and nothing else (insight 099) ──
  // A side's printed reading: the plan's own for an empty bundle, the run's once it lands current, else none yet.
  const printed = (state: AltState | null): WhatIfReading | null | undefined =>
    state === null || state.kind === 'empty' ? plan : state.kind === 'ready' && !state.updating ? state.reading : undefined
  // A built-in side's name reads in lower case inside the sentence; a kept what-if's name as the household typed it.
  const inSentence = (name: string, builtIn: boolean): string => (builtIn ? name.toLowerCase() : name)
  const altInSentence = inSentence(altName, leftKeptName === undefined)
  const leftReading = alt.kind === 'empty' ? plan : printed(alt)
  const rightReading = printed(rightState)
  // THE FLOOR TRACK'S REASON (U15's floorUnread line, which RC4b's port dropped): where the plan's odds read the
  // essentials-only pass and the what-if beside your plan changes only extra lines, the two counts can't differ, and the
  // line says why in place of "Both read". Only where your plan is one of the two (its words name your plan's odds):
  // on the right beside the what-if, or on the left (its empty bundle) beside a kept what-if; and only where the even
  // line would print.
  const planFloor = plan?.kind === 'offset' && plan.track === 'floor'
  const floorNote =
    planFloor &&
    ((rightPick === 'plan' && floorUnread('floor', answer.draft, whatIf.bundle)) ||
      (alt.kind === 'empty' && rightPick !== 'plan' && right !== undefined && floorUnread('floor', answer.draft, right.bundle)))
  const difference = ((): string | null => {
    if (alt.kind === 'empty' && rightPick === 'plan') return copy.probabilityNoChanges
    if (leftReading === undefined || leftReading === null || rightReading === undefined || rightReading === null) return null
    const rightText = readingText(rightReading)
    const leftText = readingText(leftReading)
    if (rightText === null || leftText === null) return null
    const a = readingCount(rightReading)
    const b = readingCount(leftReading)
    if (a !== null && b !== null && a.n === b.n && a.ceiling === b.ceiling) return floorNote ? copy.workbenchRailFloorUnread : slots.workbenchRailEven(rightText)
    if (rightPick === 'plan') return slots.probabilityDifference(rightText, leftText, altInSentence)
    // The left side's empty bundle is your plan itself: named so.
    const leftName = alt.kind === 'empty' ? copy.probabilityPlanTitle.toLowerCase() : altInSentence
    return slots.probabilityDifferenceBetween(rightName, rightText, leftName, leftText)
  })()
  const ceiling = slots.xOfTenAtCeiling()
  const widest =
    rightPick === 'plan'
      ? slots.probabilityDifference(ceiling, ceiling, altInSentence)
      : slots.probabilityDifferenceBetween(rightName, ceiling, alt.kind === 'empty' ? copy.probabilityPlanTitle.toLowerCase() : altInSentence, ceiling)
  // Where the reason can take the cell (its bundle is known before its run lands, so the reserve is wide from the
  // first frame of the run): the reserve holds the longer, so the landing moves nothing.
  const differenceReserve = floorNote && copy.workbenchRailFloorUnread.length > widest.length ? copy.workbenchRailFloorUnread : widest
  // The health line: its cell exists from the first frame of a subsidy-rules what-if (its bundle is known before its runs
  // land), so the landing moves nothing below it.
  // The other orientation: your plan on the left (its empty bundle) and a kept what-if that tries the rules on the right,
  // read from the right slot's own view (its run carries the same plan side); "this way" would point at no half, so the
  // what-if is named.
  const rightTriesRules = alt.kind === 'empty' && rightPick !== 'plan' && right !== undefined && triesSubsidyRules(right.bundle)
  const rightInSentence = inSentence(rightName, rightKeptName === undefined)
  // The plan side's run-out (the spine's committed futures; a hand-built test answer may carry no distribution). The
  // what-if side's is known only once its run lands, so the reserve always holds the run-out clause: the landing moves
  // nothing whichever side runs out (almost every plan has some future that does).
  const planRanOut = answer.kind === 'headline' && (answer.result.distribution?.depletionYears?.some(isDepleted) ?? false)
  const withRanOut = (reserve: string): string => `${reserve} ${copy.healthLifetimeStopsAtRunOut}`
  const health =
    rightPick === 'plan' && triesSubsidyRules(whatIf.bundle)
      ? { line: healthLine(whatIf.view, undefined, planRanOut), reserve: withRanOut(slots.subsidyRegimeCostDelta(HEALTH_RESERVE_FIGURE, HEALTH_RESERVE_FIGURE)) }
      : rightTriesRules
        ? { line: healthLine(right.view, rightInSentence, planRanOut), reserve: withRanOut(slots.subsidyRegimeCostDeltaWith(rightInSentence, HEALTH_RESERVE_FIGURE, HEALTH_RESERVE_FIGURE)) }
        : undefined

  // ── The bars: the retired route only, one shared scale ──
  const bars = ((): BarsView | undefined => {
    if (answer.kind !== 'headline') return undefined
    const medians = [alternative.barMedian, compared.barMedian].filter((m): m is number => m !== undefined && Number.isFinite(m))
    const max = Math.max(0, ...medians)
    if (!(max > 0)) return undefined // the words stand in its place (`barsNone`)
    const lattice = niceLattice(max)
    const figure = (m: number | undefined) => (m === undefined ? undefined : slots.probabilityBarFigure(formatMmDollar(m)))
    const alt = figure(alternative.barMedian)
    const cmp = figure(compared.barMedian)
    return {
      label: copy.probabilityBarLabel,
      note: copy.probabilityBarNote,
      caption: `${copy.probabilityBarLabel}. ${copy.probabilityBarNote}`,
      description: copy.probabilityBarDescription,
      lattice,
      axisDollar: mmAxisFormatterFor(lattice.ceiling),
      figures: { ...(alt !== undefined ? { alternative: alt } : {}), ...(cmp !== undefined ? { compared: cmp } : {}) },
    }
  })()

  const shared = shareRowNotes(alternative, compared)

  // ── The intro and the key-metric column, per route ──
  let intro: IntroView
  const metricLines: string[] = []
  let clauseReserve: string | undefined
  let spendState: MetricsView['spend']
  const noteLines: string[] = []
  if (notes.medicarePriced !== null) noteLines.push(notes.medicarePriced.affirmation)
  if (notes.stateNote !== null) noteLines.push(notes.stateNote)
  if (elevated.kind === 'spine' && elevated.view.kind === 'reading' && answer.kind === 'headline') {
    const raw = rawDisplayed(answer)
    const spend = raw === null ? undefined : spendClauseFor(snapshot.spend, raw, answer.result.headline.outcomeState)
    const verdict = raw === null ? null : composeVerdictReading(raw, spend)
    intro = {
      ...(elevated.view.refiguring === true ? { eyebrow: copy.answerRefiguringVerdict } : {}),
      lead: verdict === null ? copy.snapshotRingNoReading : `${verdict.word}: ${verdict.reading} ${copy.confidenceCoverageCaption}.`,
      lines: [],
    }
    if (verdict !== null) metricLines.push(verdict.clause)
    // Held while pending AND once sized: the reserve is the sized sentence at its widest figure, so the landed clause
    // sits inside the box the pending one held (measured: dropping the reserve at the landing moved the R13 caveat
    // 40 px up on `surplus`).
    if (raw !== null && (spend?.kind === 'pending' || spend?.kind === 'sized')) clauseReserve = reserveClauseFor(raw) ?? undefined
    if (spend !== undefined) spendState = spend.kind
  } else if (elevated.kind === 'date' && elevated.view.kind === 'dates') {
    const v = elevated.view
    const refiguring = v.refiguring === true
    const split = composeDateSplit(v.floor, v.lifestyle)
    const hero = split.kind === 'single' ? split.track : split.lifestyle
    const heroDated = hero.kind !== 'no-date-in-window'
    const lines: string[] = []
    if (split.kind === 'split') {
      lines.push(floorLineText(split, v.windowTopYears, notes.planClock, refiguring))
      if (split.inverted) lines.push(copy.dateFloorInversionNote)
    }
    if (hero.kind === 'window-edge-unconfirmed') lines.push(copy.dateWindowEdgeNote)
    if (hero.nonMonotoneOffsets.length > 0) lines.push(copy.dateNonMonotoneNote)
    intro = {
      ...(refiguring
        ? { eyebrow: heroDated ? copy.answerRefiguringDate : copy.answerRefiguringVerdict }
        : v.provisional === true
          ? { eyebrow: copy.answerProvisionalTag }
          : {}),
      lead: heroLead(hero, v.windowTopYears, notes.planClock, refiguring),
      lines,
    }
    if (heroDated) {
      metricLines.push(slots.probabilityDateOdds(dateOddsText(hero.grade.quantizedLowerBound)))
      const tradeoff = dateTradeoffPoint(hero, planClockYears)
      if (tradeoff !== null) metricLines.push(slots.dateTradeoff(tradeoff.yearsSooner, tradeoff.oddsText))
    } else {
      const future = agedLadderMarks(curveMarks(hero), planClockYears)
      if (future.length > 0) metricLines.push(slots.noDateHowClose(slots.xOfTen(future.reduce((mx, m) => Math.max(mx, m.rung), 0))))
    }
  } else {
    intro = { lead: copy.snapshotRingNoReading, lines: [] }
  }
  metricLines.push(...noteLines)

  // ── The footnote row: the Medicare residual and its extras appendix ──
  const footnotes: string[] = []
  if (notes.medicarePriced !== null) footnotes.push(notes.medicarePriced.residual)
  if (notes.medicarePricedNote && notes.medicareExtrasTypicalNote !== undefined) footnotes.push(notes.medicareExtrasTypicalNote)

  // ── The pickers (RC5): the left offers the new what-if, each kept what-if and Recommended; the right your plan, each
  // kept what-if and Recommended. Neither offers the kept what-if (or the recommendation) the other side shows, so the
  // two-up never sets one thing beside itself. ──
  const rightKeptId = keptIdOf(rightPick)
  const leftKeptId = keptIdOf(pick)
  const keptItems = (other: string | undefined, current: string | undefined): { value: `kept:${string}`; label: string }[] =>
    kept
      .filter((k) => k.id !== other)
      .map((k) => ({ value: `kept:${k.id}` as const, label: k.id === current && whatIf.changed === true && current === leftKeptId ? slots.probabilityKeptChanged(k.name) : k.name }))
  const items: { value: LeftPick; label: string }[] = [{ value: 'new', label: copy.probabilityPickNew }, ...keptItems(rightKeptId, leftKeptId)]
  if (offer.kind === 'runnable' && rightPick !== 'recommended') items.push({ value: 'recommended', label: copy.probabilityPickRecommended })
  const rightItems: { value: RightPick; label: string }[] = [{ value: 'plan', label: copy.probabilityPlanTitle }, ...keptItems(leftKeptId, rightKeptId)]
  if (offer.kind === 'runnable' && pick !== 'recommended') rightItems.push({ value: 'recommended', label: copy.probabilityPickRecommended })
  const recordNote = offer.kind === 'words' ? { words: offer.words, door: 'tax-strategies' as const } : undefined

  // ── The charts: Odds by stop year on the working route ──
  const odds = elevated.kind === 'date' && elevated.view.kind === 'dates' ? oddsChartView(elevated.view, startCalendarYear, planClockYears, notes.agedBalancesYear) : undefined
  const charts: { id: ProbabilityChart; label: string }[] = [{ id: 'rings', label: copy.probabilityChartRings }]
  if (odds !== undefined) charts.push({ id: 'odds', label: copy.probabilityChartOdds })
  const chart: ProbabilityChart = input.chart === 'odds' && odds !== undefined ? 'odds' : 'rings'

  return {
    kind: 'reading',
    route: answer.kind,
    intro,
    picker: { label: copy.probabilityPickerLabel, items, value: pick },
    comparedPicker: { label: copy.probabilityComparedLabel, items: rightItems, value: rightPick },
    planTitle: copy.probabilityPlanTitle,
    vs: copy.probabilityVs,
    ...(recordNote !== undefined ? { recordNote } : {}),
    ...shared,
    ...(bars !== undefined ? { bars } : {}),
    ...(answer.kind === 'headline' && bars === undefined && compared.barMedian !== undefined ? { barsNone: copy.probabilityBarNone } : {}),
    metrics: {
      lines: metricLines,
      ...(clauseReserve !== undefined ? { clauseReserve } : {}),
      ...(spendState !== undefined ? { spend: spendState } : {}),
      difference,
      differenceReserve,
      ...(health !== undefined ? { health } : {}),
    },
    noteLines,
    footnotes,
    charts,
    chart,
    ...(odds !== undefined ? { odds } : {}),
    caveat: CAVEAT,
  }
}

// ── Odds by stop year ───────────────────────────────────────────────────────────────────────────────────────────

/** A mark's non-colour state (crown > dip > clears > below), the old ladder's order. */
const markState = (m: CurveMark): 'crown' | 'dip' | 'clears' | 'below' => (m.isCrown ? 'crown' : m.isDip ? 'dip' : m.clears ? 'clears' : 'below')

/** One track's columns: the curve's own marks (`curveMarks`), re-based on an aged plan (`agedLadderMarks`: a passed
 *  stop year is not plotted), each printed through the X-of-10 slots (the ceiling's words, never "10 of 10"). */
export function oddsColumns(track: DateTrackOutcome, seriesName: string, startCalendarYear: number, planClockYears: number, crownWord: string | null) {
  return agedLadderMarks(curveMarks(track), planClockYears).map((m) => {
    const count = slots.xOfTen(m.rung)
    const year = startCalendarYear + m.planOffsetYears
    // The ceiling's words print over two lines so they sit over their own column (one line ran past the chart's edge).
    const crowned = m.isCrown && crownWord !== null
    // The tooltip's and screen reader's state is the DRAWN one: a crown the column does not draw (the essentials track
    // beside a split household's hero, a crown that has passed) is never told as "your date" (U9b). A crowned mark clears
    // and is never a dip, so its undrawn state is "clears".
    const state = crowned ? 'crown' : markState({ ...m, isCrown: false })
    // Narrow: the ceiling's words broken before the count, a dipped year's word on a line of its own.
    const lines = [...(crowned ? [crownWord] : []), ...(m.atCeiling ? slots.oddsCeilingLines() : [count]), ...(m.isDip ? [copy.oddsDipWord] : [])]
    // Wide: the same words on one line.
    const inline = slots.oddsInline([...(crowned ? [crownWord] : []), m.atCeiling ? slots.oddsCeilingLines().join(' ') : count, ...(m.isDip ? [copy.oddsDipWord] : [])])
    return {
      year,
      rung: m.rung,
      lines,
      inline,
      describe: slots.oddsPoint(year, seriesName, count, state, m.atCeiling),
      isCrown: crowned,
      isDip: m.isDip,
      clears: m.clears,
    }
  })
}

/** The chart's view: the tracks the old ladder drew (the hero track; beside it, on a split household, the essentials
 *  track, hatched and named), the bar at `BAR_RUNG`, the crown's word on the hero's crowned year only (never on a
 *  no-date track, never on a crown that has passed), and every honesty line under it. */
export function oddsChartView(
  v: Extract<ReturnType<typeof selectElevatedAnswer>, { kind: 'date' }>['view'] & { kind: 'dates' },
  startCalendarYear: number,
  planClockYears: number,
  agedBalancesYear: number | undefined,
): OddsChartView {
  const split = composeDateSplit(v.floor, v.lifestyle)
  const hero = split.kind === 'single' ? split.track : split.lifestyle
  // A crown that has passed has no word (the hero's sentence already speaks the arrived arm), and a no-date track has no
  // crown at all (`curveMarks` marks none).
  const crownPassed = hero.kind !== 'no-date-in-window' && offsetHasPassed(hero.offsetYears, planClockYears)
  const crownWord = crownPassed ? null : copy.ladderCrownLabel
  const heroName = split.kind === 'split' ? copy.oddsSeriesHero : copy.oddsSeriesSingle
  const series: OddsSeries[] = [{ id: 'hero', name: heroName, hatched: false, columns: oddsColumns(hero, heroName, startCalendarYear, planClockYears, crownWord) }]
  if (split.kind === 'split') {
    series.push({ id: 'floor', name: copy.oddsSeriesFloor, hatched: true, columns: oddsColumns(v.floor, copy.oddsSeriesFloor, startCalendarYear, planClockYears, null) })
  }
  const notes: string[] = []
  if (hero.kind === 'no-date-in-window') {
    const future = agedLadderMarks(curveMarks(hero), planClockYears)
    if (future.length > 0) notes.push(slots.noDateHowClose(slots.xOfTen(future.reduce((mx, m) => Math.max(mx, m.rung), 0))))
  }
  if (hero.kind === 'window-edge-unconfirmed') notes.push(copy.dateWindowEdgeNote)
  if (hero.nonMonotoneOffsets.length > 0) notes.push(copy.dateNonMonotoneNote)
  notes.push(copy.ladderPlanCaveat)
  if (agedBalancesYear !== undefined) notes.push(slots.ladderCaveatAgedBalances(agedBalancesYear))
  const tag = v.refiguring === true ? copy.answerRefiguringCaption : v.provisional === true ? copy.answerProvisionalTag : undefined
  return {
    series,
    barRung: BAR_RUNG,
    ...(tag !== undefined ? { tag } : {}),
    notes,
    labels: ODDS_LABELS,
  }
}

/** One labels object for the life of the page, so a re-render hands the chart the same words (its options rebuild only
 *  when the picture or its words change, `OddsByStopYear.tsx`). */
const ODDS_LABELS: OddsChartView['labels'] = {
  barLabel: copy.ladderBarLabel,
  xAxisTitle: copy.oddsAxisYear,
  yTick: (rung) => slots.xOfTen(rung),
  xTick: slots.oddsYearTick,
  description: copy.oddsChartDescription,
  words: chartWords(copy.probabilityChartOdds),
}
