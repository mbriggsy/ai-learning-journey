/**
 * The pay check's W, on the intake side (`docs/plans/features/working-year-pay-check-build-spec.md`
 * KTD5, KTD18, KTD21): the quote the W question offers, the state-tax reading the answer is given
 * under, the ONE stale predicate every surface calls, and the ONE stale sentence they all print
 * (`workingYearCostStaleText`, built from the copy slots — the Phase B review's C9). Pure functions
 * of the draft, with no React state, so the W step, the assumption panel's W row, the result's
 * standing line, the unlock gate and the dev seeds all read the same answers by construction
 * (insight 086).
 *
 * THE QUOTE (KTD5). What the household already told us a year costs, minus anything that reads as
 * a retirement-only splurge:
 *  · no budget — the spending figure (`annualSpendingReal`, which by the spend question's own words
 *    already holds the out-of-pocket medical), shown in the household's own spend period;
 *  · a budget — every line active in the budget's first year, plus the out-of-pocket medical M (the
 *    budget's year-0 total, `budgetYearZeroFullTotal`'s composition), EXCEPT a discretionary line
 *    that is windowed (it ends) or starts later — those are named as left out. A finite-ended
 *    ESSENTIAL (a mortgage that ends) stays in. A budget quote is yearly, like its anchor line.
 * Never the k = 0 retirement total fed straight to a draw (the Hawk's veto; the binding NEGATIVE).
 *
 * THE READING (KTD18) — DRAFT-KEYED, a recorded departure from the plan's "from the built read"
 * (the Phase B build, 2026-10-29): the W question is an INPUT surface, so it reads the answer being
 * edited, exactly as the spend question's help does (`spendHelpKeyFor`); the two input surfaces
 * must never give one household opposite instructions about its state tax. The built read
 * (`pricedStateForRun`) is `undefined` on every unbuildable draft, so a North Carolina household
 * that skipped a non-blocking question would be told to KEEP NC tax in W while the spend step told
 * it to leave NC tax OUT — and filling the skipped answer later would flip the reading and stale a
 * W it gave in good faith. On every buildable date-route draft the two reads agree (the built
 * overlay carries the draft's priced state; `isPricedState` filters the unbuilt roster states the
 * same way the built read does), so the departure changes no answer, only the unbuildable case.
 *
 * STALE (KTD21). The engine keeps using the last figure the household gave (R4); this module only
 * says whether that figure still matches what it was given against.
 *
 * THE KEEP STAMP (build 2's KTD10, R13 — `docs/plans/features/working-year-surplus-build-spec.md`). A
 * stale yes kept through the stale note's door becomes an `entered` figure (Phase B ruling 34), and
 * before the stamp it then never went stale on the spending again: a later rise past it said nothing,
 * so a figure below what the household spends rode on, calm. The keep now stamps the figure with the
 * quote the note showed (`keptOverQuoteReal`), and a STAMPED figure reads like the yes it came from
 * wherever the spending matters: it goes stale when today's quote rises above it, its stale sentence
 * names the spending, its door is withheld below the quote (`heldYesBelowQuote`), and its row says
 * "kept". A TYPED figure carries no stamp and is never staled on a quote the household never saw (the
 * register entry's ⚑ NEGATIVE). Each writer below states the stamp's fate.
 */
import {
  type BudgetLineItem,
  type SpendEntryPeriod,
  type WorkingYearCostV3,
  type WorkingYearStateTaxReading,
} from '@shared/model'
import type { StateBaseSystem } from '@engine/constants'
import { STATE_TAX_PROFILES, isPricedState } from '@engine/constants/stateTax'
import { budgetGoverns, isActiveAt } from '@budget/budgetModel'
import type { ScenarioDraft } from '@store/memoryModel'
import { slots } from '@ui/copy'
import { formatMoney, formatMoneyPair } from './fields'
import { workingYearCostFigure } from './intakeMap'

/** A dollar figure snapped to the cent — the grain a `confirmed` answer stores its quote at, so a
 *  move of the quote's inputs below a cent never reads as stale (KTD21). */
export function roundCents(x: number): number {
  return Math.round(x * 100) / 100
}

/** The quote the W question offers (KTD5). */
export interface WorkingYearQuote {
  /** The quoted yearly cost (annual real $), snapped to the cent. 0 when there is nothing to quote
   *  (no spending figure yet, or a budget with no first-year line and no medical figure) — the step
   *  then asks for one figure instead. */
  readonly annualReal: number
  /** Where the quote comes from — the spending figure, or the budget's first-year lines. */
  readonly source: 'spending' | 'budget'
  /** The period the quote is SHOWN in: the household's spend period with no budget; a year with
   *  one (the budget's anchor line is yearly). Display only — `annualReal` is always yearly. */
  readonly period: SpendEntryPeriod
  /** The out-of-pocket medical figure inside a BUDGET quote (annual real $; 0 with no budget — the
   *  spending figure already holds it, by the spend question's own words). */
  readonly medicalReal: number
  /** The discretionary lines the quote left out (windowed, or starting later), in budget order —
   *  the question names them: at most three, then "N more". */
  readonly leftOut: readonly Pick<BudgetLineItem, 'label' | 'category'>[]
}

/** Is a budget line a retirement-only splurge the quote leaves out? A discretionary line that ends,
 *  or starts after the budget's first year. */
function leftOutOfQuote(item: BudgetLineItem): boolean {
  return item.tier === 'discretionary' && (item.endYear !== undefined || item.startYear > 0)
}

export function workingYearQuote(d: ScenarioDraft): WorkingYearQuote {
  if (budgetGoverns(d.budget)) {
    const medical = d.health.oopMedicalAnnual ?? 0
    let total = medical
    const leftOut: Pick<BudgetLineItem, 'label' | 'category'>[] = []
    for (const item of d.budget) {
      if (leftOutOfQuote(item)) {
        leftOut.push({ label: item.label, category: item.category })
        continue
      }
      if (isActiveAt(item, 0)) total += item.annualAmountReal
    }
    return {
      annualReal: Number.isFinite(total) && total > 0 ? roundCents(total) : 0,
      source: 'budget',
      period: 'year',
      medicalReal: medical,
      leftOut,
    }
  }
  const spending = d.annualSpendingReal
  return {
    annualReal: spending !== undefined && Number.isFinite(spending) && spending > 0 ? roundCents(spending) : 0,
    source: 'spending',
    period: d.spendEntryPeriod,
    medicalReal: 0,
    leftOut: [],
  }
}

/** The engine's state base system → the persisted reading. Exhaustive over the engine's type, so a
 *  new base system fails `tsc` here rather than reading silently as some other class. */
const READING_OF_BASE_SYSTEM: Readonly<Record<StateBaseSystem, WorkingYearStateTaxReading>> = {
  'federal-agi-derived': 'agi-derived',
  'class-based': 'class-based',
  'no-income-tax': 'none',
}

/** Which state income tax W must hold for this draft (KTD18), read from the draft's own answer (the
 *  module header's recorded departure): a priced state maps through its base system; any other
 *  answer, or none, reads `'unpriced'` (keep it in). */
export function workingYearStateTaxReading(d: ScenarioDraft): WorkingYearStateTaxReading {
  const state = d.retirementState
  return state !== undefined && isPricedState(state)
    ? READING_OF_BASE_SYSTEM[STATE_TAX_PROFILES[state].baseSystem]
    : 'unpriced'
}

/** A `confirmed` answer minted from the draft's CURRENT quote and reading — the "Yes" tap, and the
 *  dev seeds' `withConfirmedW`. `null` when there is nothing to confirm (a $0 quote): the codec
 *  refuses a confirmed $0, and the step asks for a figure instead. */
export function confirmedWorkingYearCost(d: ScenarioDraft): WorkingYearCostV3 | null {
  const quote = workingYearQuote(d).annualReal
  return quote > 0
    ? { kind: 'confirmed', quotedReal: quote, stateTaxReading: workingYearStateTaxReading(d) }
    : null
}

/** An `entered` answer: the household's own yearly figure (annual real $, > 0), the unit it was
 *  typed in, and the draft's current reading. The caller first refuses a figure that shows as $0
 *  (`working-cost-zero`). Never a keep stamp: a figure built here is a typed one unless the caller
 *  (`writeKeptWorkingYearCost`) adds the stamp itself. */
export function enteredWorkingYearCost(
  d: ScenarioDraft,
  amountReal: number,
  entryPeriod: SpendEntryPeriod,
): Extract<WorkingYearCostV3, { kind: 'entered' }> {
  return { kind: 'entered', amountReal, entryPeriod, stateTaxReading: workingYearStateTaxReading(d) }
}

// ── THE WRITES — draft → draft, each read off the draft it is HANDED. The hosts call them inside
//    their mutate, on the store's CURRENT draft (insight 036), so a write never lands on a
//    render-captured snapshot. One set for both W surfaces (the intake step and the panel's row,
//    through the one `WorkingCostQuestion` face). ──

/** "Yes, the quote is what a working year costs" — the current quote and reading. A no-op on a $0
 *  quote (nothing to confirm; the face offers no "yes" there). */
export function writeConfirmedWorkingYearCost(d: ScenarioDraft): ScenarioDraft {
  const c = confirmedWorkingYearCost(d)
  return c === null ? d : { ...d, workingYearCost: c }
}

/** A figure of the household's own (annual real $), typed in `entryPeriod`. The keep stamp DROPS: a
 *  typed figure is the household's own, never staled on a quote (KTD10). */
export function writeEnteredWorkingYearCost(
  d: ScenarioDraft,
  amountReal: number,
  entryPeriod: SpendEntryPeriod,
): ScenarioDraft {
  return { ...d, workingYearCost: enteredWorkingYearCost(d, amountReal, entryPeriod) }
}

/** Keep the held answer's figure as it is, under the CURRENT reading — KTD21's "committing it
 *  unchanged re-stamps the reading". An `entered` figure keeps its digits and unit. A `confirmed`
 *  answer becomes an `entered` figure at the quote it said yes to, yearly (Phase B ruling 34): a yes no
 *  longer follows a quote that has moved, so keeping the old figure is an answer of its own, quoted in
 *  the unit the stale note names it in (ruling 25). A no-op with no answer.
 *
 *  THE KEEP STAMP'S FATES HERE (KTD10). Converting a `confirmed` answer is the ONE writer that mints it:
 *  the quote the stale note showed — today's, read off the draft this write is handed (the store's
 *  current draft, insight 036) — or, where no quote is left to show (the "no spending figure to offer
 *  now" note), the quote it said yes to, the one figure that note still names. Never unstamped there:
 *  a kept yes with no stamp would read as typed and never go stale on a spending figure entered later.
 *  Keeping (or re-tapping) an `entered` figure carries whatever stamp it has forward and never mints
 *  one: a typed figure kept stays typed, and a kept figure kept again stays kept — so a stale kept
 *  figure cannot be made fresh forever by the keep that guards it (the deepen's F1). The other fates:
 *  a typed figure drops it (`writeEnteredWorkingYearCost`); a unit tap carries it
 *  (`writeWorkingYearCostPeriod`); "yes" replaces the answer with a fresh yes. */
export function writeKeptWorkingYearCost(d: ScenarioDraft): ScenarioDraft {
  const w = d.workingYearCost
  if (w === undefined) return d
  if (w.kind === 'entered') {
    const kept = enteredWorkingYearCost(d, w.amountReal, w.entryPeriod)
    return {
      ...d,
      workingYearCost: w.keptOverQuoteReal === undefined ? kept : { ...kept, keptOverQuoteReal: w.keptOverQuoteReal },
    }
  }
  const quote = workingYearQuote(d).annualReal
  return {
    ...d,
    workingYearCost: { ...enteredWorkingYearCost(d, w.quotedReal, 'year'), keptOverQuoteReal: quote > 0 ? quote : w.quotedReal },
  }
}

/** Move a held `entered` figure to another period, keeping the DIGITS the household typed (the spend
 *  step's re-base: the typed figure is the truth, the unit moves — so a 12× misentry is repaired by
 *  one tap, never re-typed). The reading is NOT re-stamped: a unit tap is not a re-answer. A no-op
 *  on any other answer, or on the same period.
 *
 *  The keep stamp is CARRIED, for the same reason: a unit tap types no digits and answers no quote, so
 *  it changes neither who gave the figure nor what it was kept over. (The plan's KTD10 first said a
 *  period change drops it; U5's whole-file review, `wf_e5cbb6be-e97`, four lenses, showed the drop
 *  launders a stale kept figure: "each month", then "each year", put the same $84,000 back unstamped,
 *  so it read as typed and never went stale on the spending again — no digit typed. Carrying it is
 *  never rosy: the stale test reads the FIGURE, so the month view, twelve times larger, reads fresh,
 *  and the trip back is the kept figure exactly, stale wherever the spending is above it.) */
export function writeWorkingYearCostPeriod(d: ScenarioDraft, next: SpendEntryPeriod): ScenarioDraft {
  const w = d.workingYearCost
  if (w?.kind !== 'entered' || w.entryPeriod === next) return d
  const typed = w.entryPeriod === 'month' ? w.amountReal / 12 : w.amountReal
  return { ...d, workingYearCost: { ...w, amountReal: next === 'month' ? typed * 12 : typed, entryPeriod: next } }
}

/** Strip W — the WALK only (the panel never clears, KTD4): choosing "a different figure" over a
 *  held `confirmed` answer (Phase B ruling 10), or clearing the typed figure (the draft never holds
 *  a figure-less `entered`). Either way the W gate then holds Continue until a figure commits, so the
 *  screen and the draft never disagree. */
export function writeClearedWorkingYearCost(d: ScenarioDraft): ScenarioDraft {
  if (d.workingYearCost === undefined) return d
  const { workingYearCost: _cleared, ...rest } = d
  return rest
}

/** Why a stored W no longer matches (KTD21): the quote moved — for a `confirmed` answer, off the
 *  quote it said yes to; for a KEPT figure (stamped, KTD10), up past the figure itself — and/or the
 *  state-tax reading it was given under moved (every kind). A typed figure is never `quoteMoved`. */
export interface WorkingYearCostStaleness {
  readonly quoteMoved: boolean
  readonly readingMoved: boolean
}

/** THE stale predicate (KTD21) — every surface calls it. `null` when W is absent or still matches.
 *  A period-only change never stales (the quote compares yearly figures).
 *
 *  A kept figure's quote test is ONE-SIDED, and its referent is the FIGURE, never the stamp (R13: "the
 *  kept figure goes stale when the live quote rises above it"). The household kept that figure over a
 *  quote at or below it (the door shows only there, ruling 34), so a quote that has since moved without
 *  passing it leaves the answer it gave standing — a working year costing at least what it spends. A
 *  quote above it is the rosy side the stamp exists to name. Keyed to the stamp instead, a quote risen
 *  past the stamp but not the figure would stale an answer whose own door (shown there, the figure not
 *  below the quote) can never cure it: a keep carries the stamp forward. */
export function workingYearCostStaleness(d: ScenarioDraft): WorkingYearCostStaleness | null {
  const w = d.workingYearCost
  if (w === undefined) return null
  const quote = workingYearQuote(d).annualReal
  const quoteMoved =
    w.kind === 'confirmed'
      ? quote !== w.quotedReal
      : w.keptOverQuoteReal !== undefined && quote > w.amountReal
  const readingMoved = workingYearStateTaxReading(d) !== w.stateTaxReading
  return quoteMoved || readingMoved ? { quoteMoved, readingMoved } : null
}

export function isWorkingYearCostStale(d: ScenarioDraft): boolean {
  return workingYearCostStaleness(d) !== null
}

/** A held YES — a `confirmed` answer, or a figure KEPT from one (stamped, KTD10) — whose figure now sits
 *  BELOW today's quote: the household's spending rose past what it said a working year costs, so keeping
 *  that figure is almost always the rosy side. ONE home for the two places that read it (insight 081): the
 *  stale note's Keep door is withheld here (ruling 34), and the quote-moved sentence warns that the answer
 *  can look better than it is (b9-7). A TYPED figure is never one: it answered no quote, so it is never
 *  read against one (the register entry's ⚑ NEGATIVE). */
export function heldYesBelowQuote(d: ScenarioDraft): boolean {
  const w = d.workingYearCost
  if (w === undefined || (w.kind === 'entered' && w.keptOverQuoteReal === undefined)) return false
  const quote = workingYearQuote(d).annualReal
  return quote > 0 && quote > workingYearCostFigure(w)
}

/** The stale sentence (KTD21): the last figure, the current quote where it moved, and which input
 *  really moved — `null` while W is absent or still matches. ONE home for the three surfaces that say
 *  it: the W step's stale note, the panel row's stale face (both through `WorkingCostQuestion`) and
 *  the result's standing line, so the cause a household reads never differs between them. A TYPED
 *  figure stales only on the reading (it never answered a quote). A KEPT one (KTD10) says "kept",
 *  never "entered" — the household never typed it — and when the spending rose past it, names the
 *  spending, never the state, with the rosy-side lean (a stale kept figure's quote is always above
 *  it: `workingYearCostStaleness`). */
export function workingYearCostStaleText(d: ScenarioDraft): string | null {
  const w = d.workingYearCost
  const s = workingYearCostStaleness(d)
  if (w === undefined || s === null) return null
  const lastFigure = workingYearCostFigure(w)
  if (w.kind === 'entered' && w.keptOverQuoteReal === undefined) {
    return slots.workingCostStaleStateEntered(formatMoney(lastFigure))
  }
  const quote = workingYearQuote(d)
  if (w.kind === 'entered') {
    // Kept. The state alone names one figure; a quote that moved is above the figure, so there is
    // always a second figure to name beside it, printed as a pair (to the cent under a dollar apart).
    // The lean rides the one home the door reads (`heldYesBelowQuote`), as the yes's own arm below.
    if (!s.quoteMoved) return slots.workingCostStaleStateKept(formatMoney(lastFigure))
    const [kept, now] = formatMoneyPair(lastFigure, quote.annualReal)
    if (s.readingMoved) return slots.workingCostStaleKeptBoth(kept, now)
    const sentence = slots.workingCostStaleKeptQuote(kept, now)
    return heldYesBelowQuote(d) ? `${sentence} ${slots.workingCostStaleLeansBetter(kept)}` : sentence
  }
  // The stale check compares at the cent, so a move under a dollar prints both figures to the cent
  // (`formatMoneyPair`) — never "yes to $84,000 … now come to $84,000" (the whole-file review).
  const [last, quoted] = formatMoneyPair(lastFigure, quote.annualReal)
  const now = quote.annualReal > 0 ? quoted : null
  if (s.quoteMoved && s.readingMoved) {
    return now === null ? slots.workingCostStaleBothGone(last) : slots.workingCostStaleBoth(last, now)
  }
  if (s.quoteMoved) {
    if (now === null) return slots.workingCostStaleQuoteGone(last)
    // The rosy-side warning (b9-7): only where the spending alone moved, and only where it now comes to
    // MORE than the figure said yes to — a figure too low can make the answer look better than it is.
    // Never the mirror "can look worse": where no year runs short at either figure the answer is
    // identical, and two seats read that sentence as "the real answer is better" (the copy's note).
    const sentence = slots.workingCostStaleQuote(last, now)
    return heldYesBelowQuote(d) ? `${sentence} ${slots.workingCostStaleLeansBetter(last)}` : sentence
  }
  return slots.workingCostStaleStateConfirmed(last)
}

/** KTD17's W-below-M note: the household's W is STRICTLY below its out-of-pocket medical figure.
 *  The engine uses W as given (R9 clamps the survivor-sticky part), so this is a calm, non-blocking
 *  note quoting both figures — never a refusal (the `oopExceedsSpend` precedent). */
export function workingCostBelowMedical(d: ScenarioDraft): boolean {
  const w = d.workingYearCost
  const medical = d.health.oopMedicalAnnual
  return w !== undefined && medical !== undefined && workingYearCostFigure(w) < medical
}
