/**
 * The pay check's W question, its pure words (`WorkingCostQuestion.tsx`'s, moved out unchanged by Act 6 · RC13b so the
 * walk's W step and the Profile → Expenses Pre-retirement living expenses drawer read one rule): the help's two lists, the
 * state sentence by the draft's state-tax reading, the quote's line, the lines it left out, and the draft with a held W.
 */
import { copy, slots, type CopyKey } from '@ui/copy'
import type { WorkingYearStateTaxReading } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { formatMoney } from './moneyFormat'
import { threeThenMore } from './missingFacts'
import { quoteIsAveraged, workingYearQuote, type WorkingYearQuote } from './workingYearQuote'

/** The help's two lists (R1), in reading order: what a working year's figure holds (`workingCostHelpCountItems`, the
 *  one home the Result door's cost list reads too), then what the tool works out itself. Each list sits under its own
 *  lead line. */
export const HELP_LEAVE_OUT: readonly CopyKey[] = [
  'workingCostHelpLeaveOutPayrollTax',
  'workingCostHelpLeaveOutIncomeTax',
  'workingCostHelpLeaveOutSavings',
  'workingCostHelpLeaveOutMedicare',
]

/** The help's state sentence, one per reading (KTD18 — draft-keyed, so it agrees with the spend
 *  step's help on every household). Exhaustive over the persisted vocabulary. */
export const STATE_HELP: Readonly<Record<WorkingYearStateTaxReading, CopyKey>> = {
  'agi-derived': 'workingCostHelpStateAgiDerived',
  'class-based': 'workingCostHelpStateClassBased',
  none: 'workingCostHelpStateNone',
  unpriced: 'workingCostHelpStateUnpriced',
}

/** `d` with `w` as its W — `d` itself when it already holds it (so a memo on the result is stable). */
export function withWorkingYearCost(d: ScenarioDraft, w: ScenarioDraft['workingYearCost']): ScenarioDraft {
  if (d.workingYearCost === w) return d
  if (w !== undefined) return { ...d, workingYearCost: w }
  const { workingYearCost: _held, ...rest } = d
  return rest
}

export function quoteLine(quote: WorkingYearQuote): string {
  const amount = formatMoney(quote.annualReal)
  if (quote.source === 'budget') {
    // With a repeat counted at its average, or a line that changes at its own rate counted at its plan-first-year price
    // (the engine charges it its price in the year work stops), the figure is no year's own total after work stops, so
    // the lead never says "first year" (`quoteIsAveraged`, the below-notes' predicate too).
    const averaged = quoteIsAveraged(quote)
    const medical = formatMoney(quote.medicalReal)
    const total =
      quote.medicalReal > 0
        ? (averaged ? slots.workingCostQuoteBudgetAveragedMedical : slots.workingCostQuoteBudgetMedical)(amount, medical)
        : (averaged ? slots.workingCostQuoteBudgetAveraged : slots.workingCostQuoteBudget)(amount)
    return [total, ...repeatSentences(quote)].join(' ')
  }
  return quote.period === 'month'
    ? slots.workingCostQuoteMonthly(formatMoney(quote.annualReal / 12), amount)
    : slots.workingCostQuoteYearly(amount)
}

/** Each repeating line the budget quote counts at its average (gap 4's KTD5), one sentence each: at most three, then
 *  the rest counted. */
function repeatSentences(quote: WorkingYearQuote): readonly string[] {
  if (quote.repeats.length === 0) return []
  const shown = quote.repeats.slice(0, 3)
  const more = quote.repeats.length - shown.length
  const lines = shown.map((r) =>
    slots.workingCostQuoteRepeat(r.label, formatMoney(r.annualAmountReal), String(r.everyYears), formatMoney(r.annualAmountReal / r.everyYears)),
  )
  return more > 0 ? [...lines, slots.workingCostQuoteRepeatMore(more)] : lines
}

/** Gap 4's U15 (KTD4's stopgap while its build is open, U11 files it): W is one flat figure for every working year, so a
 *  budget line the quote counts that changes at its own rate is counted at its first-year price; the question says so
 *  wherever such a line is in the quote (never under a line the quote leaves out). */
export function ratedQuoteNote(d: ScenarioDraft): string | null {
  // The quote's own record of which lines it counted (a later-start essential or a later repeat counts nothing). The
  // price is the plan's first year's, named as that year (round 2).
  return workingYearQuote(d).countsRated ? slots.workingCostQuoteRatedNoteAt(d.startCalendarYear) : null
}

export function leftOutLine(quote: WorkingYearQuote): string | null {
  if (quote.leftOut.length === 0) return null
  const { shown, more } = threeThenMore(quote.leftOut.map((l) => l.label))
  const names = shown.join(', ')
  return more > 0 ? slots.workingCostLeftOutMore(names, more) : slots.workingCostLeftOut(names)
}

/** The help's second list, in words. */
export const helpLeaveOutItems = (): readonly string[] => HELP_LEAVE_OUT.map((k) => copy[k])
