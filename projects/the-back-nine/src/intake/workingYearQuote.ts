/**
 * The pay check's W, on the intake side (`docs/plans/features/working-year-pay-check-build-spec.md`
 * KTD5, KTD18, KTD21): the quote the W question offers, the state-tax reading the answer is given
 * under, the ONE stale predicate every surface calls, and the ONE stale sentence they all print
 * (`workingYearCostStaleSentence`, built from the copy slots — the Phase B review's C9; its lean is joined
 * in `workingYearLeftOver.workingYearCostStaleNote`, which reads the left-over answer). Pure functions
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
 * says whether that figure still matches what it was given against. A stale W also stops a "saved"
 * left-over answer from being carried (build 2's R7: `intakeMap.buildDateInput` carries the figure only
 * in the two saved shown states), so for that answer W's staleness reaches the credit too.
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
import { slots, type CatalogMessage, type WorkingCostAct } from '@ui/copy'
import { formatMoney, formatMoneyPair } from './fields'

/** A W answer's yearly figure (annual real $), whichever way it was given — the ONE read of it. It lives
 *  here, not in `intakeMap` (build 2's KTD2): it was this module's only reason to import `intakeMap`, and
 *  `intakeMap`'s carriage now reads this module's stale predicate, so the old edge would have closed a
 *  loop. `intakeMap` imports it back and re-exports it for its other callers. */
export function workingYearCostFigure(w: WorkingYearCostV3): number {
  return w.kind === 'confirmed' ? w.quotedReal : w.amountReal
}

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
 *  a typed figure drops it (`writeEnteredWorkingYearCost`); a unit tap carries it, and converts the kept
 *  figure's money into the tapped unit (`writeWorkingYearCostPeriod`); "yes" replaces the answer with a
 *  fresh yes. */
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

/** Move a held `entered` figure to another period. The reading is NOT re-stamped: a unit tap is not a
 *  re-answer. A no-op on any other answer, or on the same period. Which part stays depends on who gave
 *  the digits on screen:
 *  · a TYPED figure keeps its DIGITS (the spend step's re-base: the typed figure is the truth, the unit
 *    moves — so a 12× misentry is repaired by one tap, never re-typed; KTD17);
 *  · a KEPT figure (stamped, KTD10) keeps its MONEY: $84,000 a year becomes $7,000 a month. The household
 *    never typed those digits (the keep took the quote it said yes to), so there is no misentry to repair,
 *    and a re-read would put a figure it never gave under "the figure you kept" (the U11 Caddie walk's (ab):
 *    "$1,008,000 a year — the figure you kept").
 *
 *  The keep stamp is CARRIED either way: a unit tap types no digits and answers no quote, so it changes
 *  neither who gave the figure nor what it was kept over. (The plan's KTD10 first said a period change drops
 *  it; U5's whole-file review, `wf_e5cbb6be-e97`, four lenses, showed the drop launders a stale kept figure:
 *  "each month", then "each year", put the same $84,000 back unstamped, so it read as typed and never went
 *  stale on the spending again — no digit typed.) Because the kept figure's yearly money never moves, its
 *  stale test reads the same in either unit: a kept figure the spending has passed stays stale in the month
 *  view, where the re-read once made it twelve times larger and fresh, so the walk's Continue let it through
 *  at $1,008,000 a year. */
export function writeWorkingYearCostPeriod(d: ScenarioDraft, next: SpendEntryPeriod): ScenarioDraft {
  const w = d.workingYearCost
  if (w?.kind !== 'entered' || w.entryPeriod === next) return d
  if (w.keptOverQuoteReal !== undefined) return { ...d, workingYearCost: { ...w, entryPeriod: next } }
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
 *  quote above it is the rosy side the stamp exists to name (two-sided for a "saved" left-over answer
 *  waiting on W: `heldYesBelowQuote`'s docblock). Keyed to the stamp instead, a quote risen past the
 *  stamp but not the figure would stale an answer whose own door (shown there, the figure not below the
 *  quote) can never cure it: a keep carries the stamp forward. */
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
 *  BELOW today's quote: the household's spending rose past what it said a working year costs. ONE home for
 *  the two places that read it (insight 081): the stale note's Keep door is withheld here (ruling 34), and
 *  the risen sentence carries a lean (`WorkingYearCostStaleSentence.rose`). A TYPED figure is never
 *  one: it answered no quote, so it is never read against one (the register entry's ⚑ NEGATIVE).
 *
 *  WHICH WAY KEEPING THAT FIGURE LEANS, re-derived for each left-over answer (build 2's R15, U8; the U11
 *  walk's (ae), council `wf_fc80029e-d93`). A true result here always means W is stale: a yes below the quote
 *  has `quote !== quotedReal`, and a kept figure below it is exactly the kept quote test in
 *  `workingYearCostStaleness`.
 *   · Absent, spent or not sure: no left over is credited at either figure, so W's level reaches the answer
 *     only through a short year, and a figure below what the household spends is almost always the rosy
 *     side — it can hide a short year ("this answer can look better than it really is").
 *   · "Saved", waiting on W: a stale W carries no left over (R7), while its checked twin carries one, capped
 *     at year 0's left over AT THE QUOTE (R8). U11 measured the whole-answer lean the WRONG way for the
 *     risen household (the stale arm crowns no date, its twin 9 years out), and across the predicate's
 *     extension it runs either way (survivor and later years cost more at a higher W while crediting
 *     nothing: insight 143). So no whole-answer lean rides: the W surfaces say a fact about single years
 *     (`slots.workingCostStaleLeftOverYearsCheaper`), and the Result and the gate add what a check adds at
 *     most, read off the picture at the quote, with "can look better" only beside a short year that makes it
 *     true by mechanism (`workingYearLeftOver.workingYearCostStaleLine`).
 *   · "Saved", not asked (year 0 already prints below $1 at the held figure): the higher checked figure
 *     prints none either (W comes off year 0's cash dollar for dollar), nothing is carried at either figure,
 *     and the reason holds as for an absent answer.
 *  The door is withheld for every answer alike (this function reads no left-over answer). Its reason,
 *  ruling 34's amendment, is the figure: a one-tap keep must never land W below what the household now
 *  spends, since a working year almost never costs less. That holds for every answer. The "rosy side"
 *  that `WorkingCostQuestion`'s `keepable` comment adds holds only as the two bullets above say. */
export function heldYesBelowQuote(d: ScenarioDraft): boolean {
  const w = d.workingYearCost
  if (w === undefined || (w.kind === 'entered' && w.keptOverQuoteReal === undefined)) return false
  const quote = workingYearQuote(d).annualReal
  return quote > 0 && quote > workingYearCostFigure(w)
}

/** The act W's stale line names (`WorkingCostAct`, council `wf_7fa86902-35c`), keyed on the ONE rule that withholds
 *  the Keep door, so the words can never name a door the W row doesn't draw: below today's quote, "update" (the row
 *  offers "Yes" at today's figure or a figure of their own); everywhere else, "confirm or change" (the Keep door is
 *  real). Read only while W is stale (every caller holds a stale line). */
export function workingYearCostAct(d: ScenarioDraft): WorkingCostAct {
  return heldYesBelowQuote(d) ? 'update' : 'confirmOrChange'
}

/** W's stale sentence, split from its lean (KTD21; the U11 walk's (ae), council `wf_fc80029e-d93`). `rose`: the
 *  household's spending now comes to MORE than the held yes or kept figure (`heldYesBelowQuote`), so a lean rides
 *  the sentence; `held` and `quote` are the two figures exactly as `sentence` prints them (to the cent where they
 *  sit under a dollar apart), so every sentence after it names the same strings. `held` rides the unrisen arms too:
 *  the lines after them name the held figure (U11 walk 3, b9-4, (au)). `quote` rides the unrisen arms too, as the
 *  pair would print it beside the held figure, or `null` where no quote is left to offer: the act's definition
 *  names the "Yes" button by the figure it uses (council `wf_7fa86902-35c`; `workingYearCostStaleDoor`). */
export type WorkingYearCostStaleSentence =
  | { readonly rose: true; readonly sentence: string; readonly held: string; readonly quote: string }
  | { readonly rose: false; readonly sentence: string; readonly held: string; readonly quote: string | null }

/** The stale sentence (KTD21): the last figure, the current quote where it moved, and which input
 *  really moved — `null` while W is absent or still matches. ONE home for every surface that says it,
 *  so the cause a household reads never differs between them. A TYPED figure stales only on the reading
 *  (it never answered a quote). A KEPT one (KTD10) says "kept", never "entered" — the household never
 *  typed it — and when the spending rose past it, names the spending (with the state too where that moved
 *  as well).
 *
 *  THE LEAN IS NOT HERE (the U11 walk's (ae)). Which lean follows a risen sentence depends on the left-over
 *  answer — the spending-alone lean (`slots.workingCostStaleLeansBetter`), or, for a "saved" answer waiting
 *  on W, the year-level one (`slots.workingCostStaleLeftOverYearsCheaper`) — and this module cannot read the
 *  answer's shown state: `intakeMap` imports this module, so reading the money picture here would close the
 *  loop build 2's KTD2 removed. So this returns the sentence and the `rose` fact, and the joined note is
 *  composed in ONE place, `workingYearLeftOver.workingYearCostStaleNote`, which every surface prints. The
 *  joined text is deliberately not exported from here: a surface that printed it would print the
 *  spending-alone lean to a "saved" household. */
export function workingYearCostStaleSentence(d: ScenarioDraft): WorkingYearCostStaleSentence | null {
  const w = d.workingYearCost
  const s = workingYearCostStaleness(d)
  if (w === undefined || s === null) return null
  const lastFigure = workingYearCostFigure(w)
  const quote = workingYearQuote(d)
  // The stale check compares at the cent, so a move under a dollar prints both figures to the cent
  // (`formatMoneyPair`) — never "yes to $84,000 … now come to $84,000" (the whole-file review). Every arm reads its
  // two figures off this one pair, so the definition's "to use $X a year" names the quote exactly as the note does.
  const [held, quoted] = formatMoneyPair(lastFigure, quote.annualReal)
  const now = quote.annualReal > 0 ? quoted : null
  if (w.kind === 'entered' && w.keptOverQuoteReal === undefined) {
    return { rose: false, sentence: slots.workingCostStaleStateEntered(formatMoney(lastFigure)), held: formatMoney(lastFigure), quote: now }
  }
  // The lean rides the one home the door reads (`heldYesBelowQuote`), on every arm whose spending ROSE past
  // the held figure — both causes too (the U11 walk's (ac)): a state's income tax either belongs in W (adding
  // to it) or is priced apart (adding nothing), so the state never brings W back below the spending.
  const rose = heldYesBelowQuote(d)
  if (w.kind === 'entered') {
    // Kept. The state alone names one figure; a quote that moved is above the figure, so there is
    // always a second figure to name beside it, printed as a pair (to the cent under a dollar apart).
    if (!s.quoteMoved) return { rose: false, sentence: slots.workingCostStaleStateKept(formatMoney(lastFigure)), held: formatMoney(lastFigure), quote: now }
    const sentence = s.readingMoved ? slots.workingCostStaleKeptBoth(held, quoted) : slots.workingCostStaleKeptQuote(held, quoted)
    return rose ? { rose: true, sentence, held, quote: quoted } : { rose: false, sentence, held, quote: now }
  }
  if (s.quoteMoved && s.readingMoved) {
    if (now === null) return { rose: false, sentence: slots.workingCostStaleBothGone(held), held, quote: null }
    const sentence = slots.workingCostStaleBoth(held, now)
    return rose ? { rose: true, sentence, held, quote: now } : { rose: false, sentence, held, quote: now }
  }
  if (s.quoteMoved) {
    if (now === null) return { rose: false, sentence: slots.workingCostStaleQuoteGone(held), held, quote: null }
    // A lean only where the spending alone moved and now comes to MORE than the figure said yes to (b9-7);
    // never the mirror "can look worse" where it fell (the copy's ONE-SIDED BY DESIGN note).
    const sentence = slots.workingCostStaleQuote(held, now)
    return rose ? { rose: true, sentence, held, quote: now } : { rose: false, sentence, held, quote: now }
  }
  return { rose: false, sentence: slots.workingCostStaleStateConfirmed(held), held, quote: now }
}

/** The stale note's Keep door, in its own words: the figure in the unit it was given — a monthly entered
 *  figure by the month ("Keep $7,000 a month"), every other answer yearly. ONE home for the door
 *  (`WorkingCostQuestion`) and the gate message that names it (`workingYearCostGateMessage`), so the
 *  message can never quote a button the face doesn't draw. */
export function workingYearCostKeepLabel(w: WorkingYearCostV3): string {
  const k = workingYearCostKeepFigure(w)
  return k.monthly ? slots.workingCostKeepMonthly(k.formatted) : slots.workingCostKeepYearly(k.formatted)
}

/** The Keep door's figure in the unit its label names (`workingYearCostKeepLabel` reads it, so the stale line's
 *  condition on the door — "only if $7,000 a month covers…", U11 walk 5's (bk) — can never name another figure). */
export function workingYearCostKeepFigure(w: WorkingYearCostV3): { readonly formatted: string; readonly monthly: boolean } {
  return w.kind === 'entered' && w.entryPeriod === 'month'
    ? { formatted: formatMoney(w.amountReal / 12), monthly: true }
    : { formatted: formatMoney(workingYearCostFigure(w)), monthly: false }
}

/** Does the W help ask this household to ADD its state's income tax on pay to W? Exhaustive over the reading
 *  (insight 147): an unpriced state ("If your state taxes pay, add that tax") and a class-based one ("Add your
 *  state’s income tax on pay") do; an AGI-derived state (the tool works it out) and one with no income tax don't.
 *  The methodology's K7 family splits the same way (`WORK_STATE_KEY`). The stale line's definition names "a local or
 *  state tax" exactly where this holds (U11 walk 5's (bk)). */
const STATE_TAX_IN_W: Readonly<Record<WorkingYearStateTaxReading, boolean>> = {
  'agi-derived': false,
  'class-based': true,
  none: false,
  unpriced: true,
}
export function stateTaxBelongsInW(d: ScenarioDraft): boolean {
  return STATE_TAX_IN_W[workingYearStateTaxReading(d)]
}

/** A TYPED figure below today's quote (the Tier 0 register entry *A figure typed below today's spending clears W's
 *  stale line for good…*, prescription (1)): both figures yearly, printed as a pair (to the cent under a dollar
 *  apart), and where the quote comes from — or `null`. A typed figure is never staled on the quote (KTD10, the
 *  entry's ⚑ NEGATIVE), so nothing else names the two side by side; a kept or said-yes figure below the quote is
 *  stale and its note says so (`heldYesBelowQuote`). Never a block (D7): the face prints a calm note. */
export function workingYearCostTypedBelowQuote(
  d: ScenarioDraft,
): { readonly typed: string; readonly quote: string; readonly source: WorkingYearQuote['source'] } | null {
  const w = d.workingYearCost
  if (w?.kind !== 'entered' || w.keptOverQuoteReal !== undefined) return null
  const quote = workingYearQuote(d)
  // At the cent the quote is stored at (`roundCents`, as every sibling compares): a monthly figure is written as
  // `entered * 12` unrounded, and 12 × 7,083.33 drifts a hair under the quote's 84,999.96 — "below" by float alone,
  // two identical figures printed as one under the other (the round review's P0).
  if (!(quote.annualReal > 0 && roundCents(w.amountReal) < quote.annualReal)) return null
  const [typed, quoted] = formatMoneyPair(w.amountReal, quote.annualReal)
  return { typed, quote: quoted, source: quote.source }
}

/** The W step gate's message (`working-cost-unanswered`, sanity.ts; the U11 Caddie walk's (ad)), read off the
 *  same core the stale note and its door read, so the two can never disagree:
 *  · W absent, or a stale YES — the step checks no option, so "answer it above" is true:
 *    `errWorkingCostUnanswered`;
 *  · a stale HELD FIGURE (typed, or kept from a yes) — "A different figure" stays checked with the figure in
 *    its box, so "answer it above" named no way out. Where the figure sits below today's quote (a kept figure
 *    the spending rose past: `heldYesBelowQuote`, the rule that withholds the door), the ways out are "Yes"
 *    at today's figure or a retype, both figures named yearly (to the cent a cent apart, as the note prints
 *    them); otherwise the note's Keep door shows (`keepable` in the face is exactly `!heldYesBelowQuote`), so
 *    the message names that door by its own label, or a retype.
 *  Never a door below the quote (the register's ⚑ NEGATIVE): this only names what the face already draws. */
export function workingYearCostGateMessage(d: ScenarioDraft): CatalogMessage {
  const w = d.workingYearCost
  if (w?.kind !== 'entered' || workingYearCostStaleness(d) === null) return { messageKey: 'errWorkingCostUnanswered' }
  if (heldYesBelowQuote(d)) {
    const [held, now] = formatMoneyPair(workingYearCostFigure(w), workingYearQuote(d).annualReal)
    return { messageKey: 'errWorkingCostStaleBelowQuote', params: { heldFormatted: held, quoteFormatted: now } }
  }
  return { messageKey: 'errWorkingCostStaleKeep', params: { keepLabel: workingYearCostKeepLabel(w) } }
}

/** KTD17's W-below-M note: the household's W is STRICTLY below its out-of-pocket medical figure.
 *  The engine uses W as given (R9 clamps the survivor-sticky part), so this is a calm, non-blocking
 *  note quoting both figures — never a refusal (the `oopExceedsSpend` precedent). */
export function workingCostBelowMedical(d: ScenarioDraft): boolean {
  const w = d.workingYearCost
  const medical = d.health.oopMedicalAnnual
  return w !== undefined && medical !== undefined && workingYearCostFigure(w) < medical
}
