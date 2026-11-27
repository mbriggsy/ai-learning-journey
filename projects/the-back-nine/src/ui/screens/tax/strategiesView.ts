/**
 * src/ui/screens/tax/strategiesView.ts: Tax → Tax Strategies → Strategies, the one pure composer (plan
 * docs/plans/6-rightcapital-ui-plan.md, RC8; ref 2.17; `rc-cashflow-tax/help-tax-tax-strategies-strategies-tab-01.png`,
 * `-51-later.png`, `rcsite-tax-planning-identify-top-tax-strategies.png`; the Winner card from `diy/pl-optimizer-results.png`).
 * `Strategies.tsx` draws what this returns and decides nothing (insight 048: a rule inline in a render is untested).
 *
 * THE STATE AUTHORITY stays `recommendationView.ts` (every honesty decision of the committed payload: the no-dollar
 * register, the inversion and $0-collapse guards, the grade words, the disclosures, the withheld hold). This module
 * arranges its output into RightCapital's screen and adds only what the screen itself owns:
 *
 * - THE EMPTY STATE (before a solve, or beside a stale, held or failed one): the bold sentence, the goal picker (its lead
 *   verdict-gated on the RAW triple, a positive list, the old GoalPicker's §S2 law), the heirs' bracket beside it for
 *   leave-more, and Find. Find is held (pressable, `aria-disabled`, its reason in words at rest) while no goal is
 *   picked or the plan's answer is not ready (in flight: "being worked out"; the fallback: the facts it waits for, by
 *   name); a refused solve's reason (no pre-tax money, an incomplete answer) shows above it. No pre-tax money also holds
 *   Find on those words (a press would only refuse again; a plan edit re-derives the refusal and clears the hold).
 * - THE WINNER CARD: the hero in the goal's words, its skew and median lines, "N strategies compared", the winner's
 *   levers as chips and its sentence, the grade words with what a close call hinges on, the withheld conversions' hold,
 *   Keep (the save gesture; never on a read-only tab) and, once the record on disk is this one and current, Try it in
 *   the plan. An unsaved solve offers Keep alone (RC3's rule: the rail runs only a saved record).
 * - THE RANKED LIST (active mode only): exactly three rows, the winner, the runner-up and the no-change baseline, each
 *   with its levers and its seed-B figure (the hero's statistic, in the hero's dialect), then one line counting every
 *   other ranked candidate (both counts where some rank above your plan today). A pruned candidate is never a row (its
 *   record carries an id, a rank and a never-rendered score; its id names no start year, length or custom order), so
 *   nothing here reads one. No rank column. Shades follow the DISPLAYED value (ties share one), best for the goal
 *   darkest; a runner-up printing a better figure than the winner says why it ranks second; a near-tie (a coin-flip
 *   grade whose named driver is the sampling-noise sentinel) is said in words on both rows, on the odds where the
 *   grade read the odds.
 * - THE RECORD CARD: a remembered recommendation's face (holds, or superseded with every cause in the producer's order
 *   and the mint year) wherever a record exists: above the empty state, and under the ranked list beside a Winner card
 *   (a household that kept one strategy and found another must still read whether the kept one holds; the old card's
 *   placement ruling, 2026-07-26: the card is gated on its own data, never on the solve).
 *
 * The working route gets one line and nothing else (plan RC8: `buildSolveRequest` refuses the date route).
 */
import { solverAssumedHeirBracket } from '@engine/constants'
import { ordinaryBracketsMFJ } from '@engine/constants/tax'
import type { SolveArm, SolveRecommendation } from '@engine/solver/solve'
import { isDateRoute, pricedStateForRun, spineInheritedHeld, spineMedicarePriced } from '@intake/intakeMap'
import { isInheritedAccount } from '@intake/inheritedIra'
import { rawDisplayed, type MemoryModelSnapshot } from '@store/memoryModel'
import type { SavedRecommendationStatus } from '@store/savedRecommendation'
import { RECOMMENDATION_GOALS, type RecommendationGoal, type SavedRecommendationV3 } from '@shared/model'
import { selectElevatedAnswer } from '../../answerView'
import { planClockAnchor } from '../../bandAnnotations'
import { copy, slots, type CopyKey } from '../../copy'
import { formatActionableDollar, formatBracketPercent, formatDeltaDollar, formatEnteredDollar } from '../../money'
import {
  recommendationView,
  WINNER_STRATEGY_KEY,
  type GradeSignalState,
  type RecommendationDisclosure,
  type RecommendedView,
} from '../../recommendationView'
import { savedRecordCardView, type RecommendationSaveRefusal, type RecommendationSaveView } from '../../recommendationSaveView'
import { SAVED_RECORD_COPY } from '../../savedRecordCopy'
import { composeVerdictStateNote } from '../../stateTaxDisclosure'
import { pinnedLines } from '../../workbench/pinnedLines'
import { recommendationBundle } from '../../workbench/railChrome'

// ── The view ────────────────────────────────────────────────────────────────────────────────────────────────────

export interface RecordFace {
  readonly heading: string
  readonly standing: 'holds' | 'superseded'
  /** The standing's own words (the holds clause, or "It may no longer fit the two of you."): the non-colour signal. */
  readonly lead: string
  /** Every superseded cause, in the producer's order (insight 101); empty on holds. */
  readonly causes: readonly string[]
  /** The mint year, suppressed for a record minted this calendar year. */
  readonly savedIn?: string
}

export interface StrategiesNotice {
  readonly kind: 'stale' | 'unavailable' | 'held'
  readonly heading?: string
  readonly lines: readonly string[]
}

export interface GoalChoice {
  readonly id: RecommendationGoal
  readonly label: string
  readonly gloss: string
}

export interface StrategiesAsk {
  readonly sentence: string
  readonly legend: string
  /** "With the basics covered…": only on a raw outcome its premise holds for (on-track, over-funded, borderline). */
  readonly lead?: string
  readonly goals: readonly GoalChoice[]
  readonly goal: RecommendationGoal | undefined
  /** The heirs' bracket, beside the picker for leave-more only (pay-less-tax never reads it: no hollow control). */
  readonly bracket?: { readonly label: string; readonly help: string; readonly items: readonly { readonly value: string; readonly label: string }[]; readonly value: string }
  /** A refused solve's reason, above Find (no pre-tax money; an incomplete answer). */
  readonly steer?: { readonly kind: 'no-pretax' | 'unready'; readonly words: string }
  readonly find: {
    readonly label: string
    /** Held: Find is pressable (it answers with this reason) but starts nothing. `no-pretax`: the steer's own words (a
     *  press would only refuse again; a plan edit re-derives the refusal and clears it, `memoryModel`'s self-healing). */
    readonly held?: { readonly kind: 'goal' | 'answer' | 'no-pretax'; readonly words: string }
    readonly cost: string
  }
}

export interface StrategyRow {
  readonly role: 'winner' | 'runner-up' | 'baseline'
  readonly name: string
  readonly levers: readonly string[]
  /** The arm's seed-B figure, printed (`~$4,240,000`): the hero's statistic in the hero's dialect. */
  readonly value: string
  /** 0 is the best displayed value for the goal (`--blue-ink`, white text), 1 and 2 lighter (stone-900 text). */
  readonly shade: 0 | 1 | 2
  readonly nearTie?: string
  /** The runner-up's figure beats the recommended one's in the goal's direction: why it still ranks second. */
  readonly note?: string
}

export interface StrategiesList {
  readonly caption: string
  readonly strategyHeading: string
  readonly valueHeading: string
  readonly rows: readonly StrategyRow[]
  readonly others?: string
}

export interface WinnerKeep {
  readonly label: string
  readonly noDollarRegister: boolean
  readonly hint: string
}

export interface WinnerView {
  readonly badge: string
  readonly mode: 'active' | 'no-change'
  readonly hero: string
  /** "(average across futures)", beside a figure only. */
  readonly average?: string
  readonly nameplate: string
  readonly skew?: string
  readonly qualifier?: string
  readonly compared: string
  readonly leversLabel: string
  readonly chips: readonly string[]
  readonly sentence?: string
  readonly grade?: { readonly word: string; readonly signal: GradeSignalState }
  readonly notes: readonly string[]
  readonly withheld?: { readonly heading: string; readonly reasons: readonly string[]; readonly coupling: string }
  readonly runnerUp?: { readonly summary: string; readonly why: string }
  readonly keep?: WinnerKeep
  readonly status?: { readonly kind: 'saving' | 'saved'; readonly words: string }
  readonly refused?: { readonly heading: string; readonly body: string }
  readonly tryIt?: { readonly label: string }
  readonly list?: StrategiesList
}

export type StrategiesView =
  | { readonly kind: 'working-route'; readonly words: string }
  | {
      readonly kind: 'solve'
      readonly title: string
      readonly record?: RecordFace
      readonly notice?: StrategiesNotice
      readonly calculating?: { readonly sentence: string; readonly label: string }
      readonly winner?: WinnerView
      readonly ask?: StrategiesAsk
      /** The re-pick door beside a Winner card ("Aim at a different goal"), which shows the empty state again. */
      readonly repick?: { readonly label: string }
      readonly disclosures: readonly RecommendationDisclosure[]
      /** The footnote row: the shape disclosure and, where no state-tax disclosure already speaks, the state clause. */
      readonly footnotes: readonly string[]
    }

export interface StrategiesInput {
  readonly snapshot: MemoryModelSnapshot
  /** The picks held on the page until Find writes them (a pick never demotes a standing solve by itself). */
  readonly picked: { readonly goal: RecommendationGoal | undefined; readonly heirBracket: number }
  readonly save: RecommendationSaveView
  readonly record?: { readonly status: SavedRecommendationStatus; readonly record: SavedRecommendationV3 }
  readonly readOnly: boolean
  readonly todayEpochDay: number
  readonly wallCalendarYear: number
  /** The re-pick door was pressed: the empty state shows under the Winner card. */
  readonly repick: boolean
}

// ── The pieces ──────────────────────────────────────────────────────────────────────────────────────────────────

const GOAL_LABEL: Record<RecommendationGoal, CopyKey> = { 'leave-more': 'goalLeaveMoreLabel', 'pay-less-tax': 'goalPayLessTaxLabel' }
const GOAL_GLOSS: Record<RecommendationGoal, CopyKey> = { 'leave-more': 'goalLeaveMoreGloss', 'pay-less-tax': 'goalPayLessTaxGloss' }

/** The heirs' bracket ladder: the shipped federal ordinary rates (the assumption panel's own ladder, derived the same
 *  way, never re-typed). */
export const HEIR_BRACKET_ITEMS: readonly { readonly value: string; readonly label: string }[] = ordinaryBracketsMFJ.value.map((b) => ({
  value: String(b.rate),
  label: slots.assumptionHeirBracketOption(formatBracketPercent(b.rate)),
}))

export const DEFAULT_HEIR_BRACKET = solverAssumedHeirBracket.value

/** The goal picker's lead premise (the old GoalPicker's verdict gate, on the RAW triple: Act 6 · RC4's ruling): a
 *  positive list, so a new outcome state falls to silence. "With the basics covered" is false on an off-track or
 *  already-failing household, so there the lead is omitted, never reworded. */
export function goalLeadPremiseHolds(answer: MemoryModelSnapshot['answer']): boolean {
  const raw = rawDisplayed(answer)
  return raw !== null && (raw.outcomeState === 'on-track' || raw.outcomeState === 'over-funded' || raw.outcomeState === 'borderline')
}

const REFUSAL_WORDS: Readonly<Record<RecommendationSaveRefusal, { readonly heading: string; readonly body: string }>> = {
  'record-invalid': { heading: copy.recommendSaveRefusalRecordInvalidHeading, body: copy.recommendSaveRefusalRecordInvalidBody },
  write: { heading: copy.recommendSaveRefusalWriteHeading, body: copy.recommendSaveRefusalWriteBody },
  'recovery-locked': { heading: copy.recommendSaveRefusalRecoveryLockedHeading, body: copy.recommendSaveRefusalRecoveryLockedBody },
}

/** The hero in the goal's words, beside its figure (plan RC8, held to critique 2): leave-more's bequest; pay-less-tax's
 *  all-in cost on a run that priced health premiums, else income tax alone (the hero's two shipped arms). The
 *  no-dollar register keeps the compose reassurance, with no figure. Read by the Summary tab's key-metric column too,
 *  so the bars and the hero speak one sentence (insight 099). */
export function heroWords(view: RecommendedView, healthcarePriced: boolean): { readonly hero: string; readonly average?: string } {
  const figure = view.grade.deltaFigure
  if (view.mode === 'no-change' || figure === undefined) return { hero: view.grade.heroLine }
  const hero =
    view.goal === 'leave-more'
      ? slots.taxStratHeroLeaveMore(figure)
      : healthcarePriced
        ? slots.taxStratHeroPayLessTax(figure)
        : slots.taxStratHeroPayLessTaxUnpriced(figure)
  return { hero, average: copy.taxStratHeroAverage }
}

/** The ranked list's value heading: what the figure counts, per goal and the run's health pricing. */
export function metricWords(goal: RecommendationGoal, healthcarePriced: boolean): string {
  if (goal === 'leave-more') return copy.taxStratMetricLeaveMore
  return healthcarePriced ? copy.taxStratMetricPayLessTax : copy.taxStratMetricPayLessTaxUnpriced
}

/** An arm's printed figure: the hero's statistic in the hero's own ruler (`formatDeltaDollar`), so a row, a Summary
 *  bar and the hero's delta never speak two dialects. */
export const armFigure = (statistic: number): string => slots.taxStratValue(formatDeltaDollar(statistic))

/** An arm's levers in words: its withdrawal order's shipped label, then its conversion. Your plan today's own conversion
 *  is its amount alone, exactly as entered (`taxStratRothRowOwn`): its window is never quoted, since the household's own
 *  years ride unscreened and could name years nothing was priced over. A compared strategy's grid amount is rounded down
 *  (`formatActionableDollar`'s rail law) with its years (every grid schedule starts at offset 0). */
export function armLevers(arm: SolveArm, isBaseline: boolean): readonly string[] {
  const order = copy[WINNER_STRATEGY_KEY[arm.policy]]
  const c = arm.conversion
  if (c === null) return [order, copy.taxStratNoConversion]
  if (isBaseline) return [order, slots.taxStratRothRowOwn(formatEnteredDollar(c.annualAmountReal))]
  return [order, slots.taxStratRothRow(formatActionableDollar(c.annualAmountReal), c.years)]
}

/** The three rows (winner, runner-up, baseline; a runner-up that IS the baseline is one row), their shades by the
 *  displayed value, and the line counting the rest. Active mode only (the caller's gate).
 *
 *  The figures are seed-B means; the ranking is survival first, then seed-A means (`select.ts`), so the runner-up can
 *  PRINT a better figure than the recommended strategy. That row then says why it still ranks second, in a reason true
 *  on every crown (`recRunnerUpAheadHere`: ranked on a separate set of futures, ahead there or too close to split), so a
 *  darker runner-up never reads as a contradiction (the old chart's honesty gate, `runnerUpVizFor`, did the same by
 *  drawing nothing). The baseline cannot invert here: a baseline ahead of the winner is the no-dollar register, which
 *  shows no list.
 *
 *  THE BASELINE'S TWIN. For a household with no conversion on a searched order, the roster holds its plan twice: the
 *  injected baseline (`baseline:<policy>:0`) and the grid's (or conventional) conversion-0 point for the same order
 *  (`sameDecumulationPlan`'s note in `candidates.ts`). They score identically and the stable sort puts the twin just
 *  before the baseline, so a twin is never counted as "another strategy ranked above your plan today", and a twin
 *  runner-up is the one "Your plan today, the runner-up" row. The id (`solverCandidateId`: `<arm>:<policy>:<amount>`)
 *  carries all a twin needs: the same policy and amount 0 on a baseline with no conversion. */
export function rankedList(payload: SolveRecommendation, healthcarePriced: boolean): StrategiesList {
  const baseline = payload.noActionBaseline
  // A near-tie: a coin-flip grade whose named driver is the sampling-noise sentinel. On the survival grade axis (a plan
  // that is not over-funded) the call is on the odds, not on the dollar figures beside it, so it says so.
  const nearTie = payload.grade?.grade === 'coin-flip' && payload.namedDriver === 'sampling-noise-near-tie'
  const nearTieWords = payload.gradeStatistic === 'survival' ? copy.taxStratRowNearTieOdds : copy.taxStratRowNearTie
  // The baseline's twin (the docstring above): only a baseline with no conversion on a searched order has one.
  const twinPossible = baseline.conversion === null && baseline.policy !== 'custom'
  const isBaselinePlan = (id: string): boolean => {
    if (id === baseline.id) return true
    if (!twinPossible) return false
    const [arm, policy, amount, ...rest] = id.split(':')
    return rest.length === 0 && arm !== 'baseline' && policy === baseline.policy && amount !== undefined && amount !== '' && Number(amount) === 0
  }
  const runnerUpIsBaseline = payload.runnerUp !== undefined && isBaselinePlan(payload.runnerUp.id)
  const runnerUp = payload.runnerUp !== undefined && !runnerUpIsBaseline && payload.runnerUp.id !== payload.winner.id ? payload.runnerUp : undefined
  const arms: { readonly role: StrategyRow['role']; readonly arm: SolveArm; readonly name: string }[] = [
    { role: 'winner', arm: payload.winner, name: copy.taxStratRowWinner },
    ...(runnerUp !== undefined ? [{ role: 'runner-up' as const, arm: runnerUp, name: copy.taxStratRowRunnerUp }] : []),
    { role: 'baseline', arm: baseline, name: runnerUpIsBaseline ? copy.taxStratRowBaselineRunnerUp : copy.taxStratRowBaseline },
  ]
  // The shades follow the DISPLAYED figure (two arms that print the same figure share one shade), best for the goal first.
  const higherIsBetter = payload.goal === 'leave-more'
  const shown = arms.map((a) => ({ ...a, value: armFigure(a.arm.headlineStatisticB) }))
  const distinct = [...new Map(shown.map((a) => [a.value, a.arm.headlineStatisticB])).entries()].sort((x, y) => (higherIsBetter ? y[1] - x[1] : x[1] - y[1]))
  const shadeOf = (value: string): 0 | 1 | 2 => {
    const i = distinct.findIndex(([v]) => v === value)
    if (i <= 0) return 0
    return i === distinct.length - 1 ? 2 : 1
  }
  const winnerValue = shown[0]!.value
  const beatsWinner = (a: (typeof shown)[number]): boolean =>
    a.value !== winnerValue && (higherIsBetter ? a.arm.headlineStatisticB > payload.winner.headlineStatisticB : a.arm.headlineStatisticB < payload.winner.headlineStatisticB)
  const rows: StrategyRow[] = shown.map((a) => ({
    role: a.role,
    name: a.name,
    levers: armLevers(a.arm, a.arm.id === baseline.id),
    value: a.value,
    shade: shadeOf(a.value),
    ...(nearTie && (a.role === 'winner' || a.role === 'runner-up' || (runnerUpIsBaseline && a.role === 'baseline')) ? { nearTie: nearTieWords } : {}),
    ...(a.role === 'runner-up' && beatsWinner(a) ? { note: slots.recRunnerUpAheadHere(higherIsBetter) } : {}),
  }))
  // The rest, counted: `rankedIds` is best-first and the runner-up is always second, so an unshown candidate ranked
  // before your plan today sits between the runner-up and it. Where any does, the line says both counts. The baseline's
  // twin is the same plan as your plan today, so it is never counted as another strategy.
  const shownIds = new Set(arms.map((a) => a.arm.id))
  const baselineAt = payload.rankedIds.indexOf(baseline.id)
  const unshown = payload.rankedIds.flatMap((id, i) => (shownIds.has(id) || isBaselinePlan(id) ? [] : [i]))
  const above = baselineAt < 0 ? 0 : unshown.filter((i) => i < baselineAt).length
  const others = unshown.length === 0 ? undefined : above > 0 ? slots.taxStratOthersAbove(above, unshown.length - above) : slots.taxStratOthers(unshown.length)
  return {
    caption: copy.taxStratListCaption,
    strategyHeading: copy.taxStratListStrategy,
    valueHeading: metricWords(payload.goal, healthcarePriced),
    rows,
    ...(others !== undefined ? { others } : {}),
  }
}

function recordFace(input: StrategiesInput): RecordFace | undefined {
  if (input.record === undefined) return undefined
  const card = savedRecordCardView(input.record.status, input.record.record, input.todayEpochDay, SAVED_RECORD_COPY)
  const holds = card.standing.kind === 'holds'
  return {
    heading: card.heading,
    standing: holds ? 'holds' : 'superseded',
    lead: holds ? (card.standing.clauses[0] ?? copy.recommendRecordHolds) : copy.recommendRecordSuperseded,
    causes: holds ? [] : card.standing.clauses,
    ...(card.savedIn !== undefined ? { savedIn: card.savedIn } : {}),
  }
}

function askFor(input: StrategiesInput): StrategiesAsk {
  const { snapshot, picked } = input
  const anchor = planClockAnchor(snapshot.draft.startCalendarYear, input.wallCalendarYear)
  const elevated = selectElevatedAnswer(snapshot, () => undefined, anchor)
  const answerReady = elevated.kind === 'spine' && elevated.view.kind === 'reading'
  const answer = snapshot.answer
  // Only a run in flight is "being worked out"; idle and missing facts are the fallback, which names what it waits for
  // (the pinned box's own words, plan 4.0's fallback state), never a promise that something is under way.
  const answerWorking = answer.kind === 'pending' || (elevated.kind === 'spine' && elevated.view.kind === 'pending')
  const fallbackWords = (): string => {
    const lines = pinnedLines(snapshot, input.wallCalendarYear)
    return lines.second !== undefined ? `${lines.lead} ${lines.second}` : lines.lead
  }
  const solve = snapshot.solve
  const noPretaxWords = snapshot.draft.enteredAccounts.some(isInheritedAccount) ? copy.recommendNoPretaxInheritedNote : copy.recommendNoPretaxNote
  const held: StrategiesAsk['find']['held'] =
    picked.goal === undefined
      ? { kind: 'goal', words: copy.goalPickerConfirmBlocked }
      : !answerReady
        ? { kind: 'answer', words: answerWorking ? copy.taxStratAnswerWaiting : elevated.kind === 'fallback' ? fallbackWords() : copy.recommendSpineUnreadyNote }
        : solve.kind === 'blocked' && solve.gap === 'no-pretax'
          ? { kind: 'no-pretax', words: noPretaxWords }
          : undefined
  const steer: StrategiesAsk['steer'] =
    solve.kind === 'blocked' && solve.gap === 'no-pretax'
      ? { kind: 'no-pretax', words: noPretaxWords }
      : solve.kind === 'blocked' && solve.gap === 'spine-unready' && held?.kind !== 'answer'
        ? { kind: 'unready', words: copy.recommendSpineUnreadyNote }
        : undefined
  return {
    sentence: copy.taxStratAsk,
    legend: copy.goalPickerTitle,
    ...(goalLeadPremiseHolds(answer) ? { lead: copy.goalPickerIntro } : {}),
    goals: RECOMMENDATION_GOALS.map((g) => ({ id: g, label: copy[GOAL_LABEL[g]], gloss: copy[GOAL_GLOSS[g]] })),
    goal: picked.goal,
    ...(picked.goal === 'leave-more'
      ? {
          bracket: {
            label: copy.assumptionHeirBracketLabel,
            // Never chosen yet: the shown rate is the tool's own starting figure, and says so (the line the facts page
            // carried until RC13b; the heirs' bracket's one home is this picker).
            help:
              snapshot.draft.heirBracket === undefined && picked.heirBracket === DEFAULT_HEIR_BRACKET
                ? `${copy.assumptionHeirBracketHelp} ${slots.taxStratHeirDefault(formatBracketPercent(DEFAULT_HEIR_BRACKET))}`
                : copy.assumptionHeirBracketHelp,
            items: HEIR_BRACKET_ITEMS,
            value: String(picked.heirBracket),
          },
        }
      : {}),
    ...(steer !== undefined ? { steer } : {}),
    find: { label: copy.taxStratFind, ...(held !== undefined ? { held } : {}), cost: copy.recommendRecordReopenCost },
  }
}

function winnerFor(input: StrategiesInput, view: RecommendedView, payload: SolveRecommendation, healthcarePriced: boolean): WinnerView {
  const { save, readOnly, record } = input
  const { hero, average } = heroWords(view, healthcarePriced)
  const action = view.winnerAction
  const g = view.grade
  const keep: WinnerKeep | undefined =
    !readOnly && save.kind === 'offer'
      ? { label: copy.snapshotRecKeep, noDollarRegister: view.mode === 'no-change', hint: save.route === 'ceremony' ? copy.recommendSaveHintCeremony : copy.recommendSaveHintUpdate }
      : undefined
  const status = save.kind === 'saved' ? { kind: 'saved' as const, words: copy.recommendSaveSavedBadge } : save.kind === 'saving' ? { kind: 'saving' as const, words: copy.recommendSavePending } : undefined
  // Try it only once the disk carries THIS recommendation as current (the rail runs a saved record only, RC3's rule).
  const tryIt = save.kind === 'saved' && record !== undefined && record.status.current && recommendationBundle(record.record) !== null ? { label: copy.snapshotRecTry } : undefined
  const sentence = action !== undefined ? [action.orderGloss, action.conversionLine, action.conversionNote].filter((s): s is string => s !== undefined).join(' ') : undefined
  return {
    badge: copy.taxStratWinner,
    mode: view.mode,
    hero,
    ...(average !== undefined ? { average } : {}),
    nameplate: view.baselineNameplate,
    ...(view.skew !== undefined ? { skew: view.skew.medianQuote } : {}),
    ...(g.deltaQualifier !== undefined ? { qualifier: g.deltaQualifier } : {}),
    compared: slots.taxStratCompared(payload.rankedIds.length),
    leversLabel: copy.taxStratLevers,
    // The winner's levers name what the crowned plan SETS; in the no-change register the hero already says the honest
    // thing, and naming a strategy beside it would be a different, weaker claim (`winnerActionView`'s rule).
    chips: action !== undefined ? armLevers(payload.winner, payload.winner.id === payload.noActionBaseline.id) : [],
    ...(sentence !== undefined && sentence !== '' ? { sentence } : {}),
    ...(g.word !== undefined ? { grade: { word: g.word, signal: g.signalState } } : {}),
    notes: [g.hingeNote, g.ungradedNote].filter((s): s is string => s !== undefined),
    ...(view.withheldConversion !== undefined
      ? { withheld: { heading: copy.recommendWithheldConversionsHeading, reasons: view.withheldConversion.reasons, coupling: view.withheldConversion.coupling } }
      : {}),
    ...(view.runnerUp !== undefined ? { runnerUp: { summary: copy.recSeeRunnerUp, why: view.runnerUp.why } } : {}),
    ...(keep !== undefined ? { keep } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(save.kind === 'refused' ? { refused: REFUSAL_WORDS[save.reason] } : {}),
    ...(tryIt !== undefined ? { tryIt } : {}),
    ...(view.mode === 'active' ? { list: rankedList(payload, healthcarePriced) } : {}),
  }
}

// ── The composer ────────────────────────────────────────────────────────────────────────────────────────────────

export function strategiesView(input: StrategiesInput): StrategiesView {
  const { snapshot } = input
  const draft = snapshot.draft
  if (isDateRoute(draft)) return { kind: 'working-route', words: copy.taxStratWorkingRoute }
  const pricedState = pricedStateForRun(draft)
  const healthcarePriced = spineMedicarePriced(draft)
  const inheritedHeld = spineInheritedHeld(draft)
  const solve = snapshot.solve
  const planClock = planClockAnchor(draft.startCalendarYear, input.wallCalendarYear)
  const view = recommendationView(solve, { pricedState, healthcarePriced, inheritedHeld, planClock })
  const stateClause = composeVerdictStateNote(pricedState, false)
  const record = recordFace(input)

  if (view.kind === 'pending') {
    return {
      kind: 'solve',
      title: copy.taxStratTopTitle,
      ...(record !== undefined ? { record } : {}),
      calculating: { sentence: copy.recommendPendingLabel, label: copy.taxStratCalculating },
      disclosures: [],
      footnotes: stateClause !== null ? [stateClause] : [],
    }
  }

  if (view.kind === 'recommended' && solve.kind === 'committed' && solve.payload.kind === 'recommended') {
    const winner = winnerFor(input, view, solve.payload, healthcarePriced)
    const speaksState = view.disclosures.some((d) => d.id === 'state-tax')
    return {
      kind: 'solve',
      title: copy.taxStratTopTitle,
      ...(record !== undefined ? { record } : {}),
      winner,
      ...(input.repick ? { ask: askFor(input) } : { repick: { label: copy.recommendRepickCta } }),
      disclosures: view.disclosures,
      footnotes: [
        ...(view.grade.shapeNote !== undefined ? [view.grade.shapeNote] : []),
        ...(!speaksState && stateClause !== null ? [stateClause] : []),
      ],
    }
  }

  const notice: StrategiesNotice | undefined =
    view.kind === 'stale'
      ? { kind: 'stale', heading: view.heading, lines: [view.body] }
      : view.kind === 'unavailable'
        ? { kind: 'unavailable', lines: [view.note] }
        : view.kind === 'held'
          ? { kind: 'held', heading: view.heading, lines: view.reasons }
          : undefined
  return {
    kind: 'solve',
    title: copy.taxStratTopTitle,
    ...(record !== undefined ? { record } : {}),
    ...(notice !== undefined ? { notice } : {}),
    ask: askFor(input),
    disclosures: [],
    footnotes: stateClause !== null ? [stateClause] : [],
  }
}
