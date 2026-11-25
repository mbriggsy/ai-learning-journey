/**
 * The budget worksheet's pure rules (`BudgetBuilder.tsx`'s and `BudgetLineItem.tsx`'s, moved out unchanged by Act 6 ·
 * RC13b so the walk's builder and the Profile → Expenses Living expenses drawer read one rule): a fresh line, the
 * reconciliation readout's lines, what Apply does with the staged lines, and each line error's words.
 */
import { copy, slots, type CopyKey } from '@ui/copy'
import type { BudgetLineItem as BudgetLine } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { isActiveAt, isRampedBudget, type BudgetItemError, type BudgetValidation } from '@budget/budgetModel'
import { anchorTarget } from '@budget/budgetToSpending'
import { formatMoney } from './moneyFormat'
import { medicalExceedsTotal } from './budgetChecks'

/** A fresh line: `other` + essentials (the neutral unclassified pick — errs STICKY, insight 055's
 *  conservative direction) with NO amount (NaN blocks Apply until typed — never a silent 0), under the
 *  stable id its Add minted (schema version 6). */
export const freshLine = (id: string): BudgetLine => ({
  id,
  category: 'other',
  label: '',
  annualAmountReal: Number.NaN,
  tier: 'essentials',
  startYear: 0,
})

export const BUDGET_ERROR_COPY: Record<BudgetItemError['kind'], CopyKey> = {
  'non-finite-amount': 'errBudgetAmountNonFinite',
  'negative-amount': 'errBudgetAmountNegative',
  'non-integer-window': 'errBudgetWindowNonInteger',
  'negative-start': 'errBudgetWindowNegativeStart',
  'reversed-window': 'errBudgetWindowReversed',
}

/** The line's amount errors and window errors (the two places a line shows its errors). */
export const isAmountError = (e: BudgetItemError): boolean => e.kind === 'non-finite-amount' || e.kind === 'negative-amount'

/** One line of the reconciliation readout: muted lines are the quiet ones (what is carried, the ramp note, a warning). */
export interface ReadoutLine {
  readonly text: string
  readonly muted: boolean
}

/**
 * THE RECONCILIATION READOUT (build-gate 1): the lines-target NETS the injected OOP medical — target = max(0, S − M) —
 * with the "carried automatically" disclosure (carried-medical BEFORE the lines-target: total → what's carried → what's
 * left), because compileBudget re-adds M on top of typed lines. When M alone exceeds S the target line is REPLACED by the
 * honest exceeds line (F10). The running total and tier split wait for the FIRST real dollar anywhere in the list (a
 * readout that speaks "$0" for lines never valued is the blank-becomes-a-spoken-zero shape). S may be absent on a
 * defensive mount: the anchor lines are then withheld (never a fabricated figure).
 */
export function budgetReadout(draft: ScenarioDraft, items: readonly BudgetLine[], validation: BudgetValidation): readonly ReadoutLine[] {
  const S = draft.annualSpendingReal
  const M = draft.health.oopMedicalAnnual
  const out: ReadoutLine[] = []
  if (S !== undefined) out.push({ text: slots.budgetAnchorLead(formatMoney(S)), muted: false })
  if (S !== undefined && M !== undefined && M > 0) {
    out.push({ text: slots.budgetMedicalCarried(formatMoney(M)), muted: true })
    out.push({
      text: medicalExceedsTotal(S, M) ? slots.budgetMedicalExceedsTotal(formatMoney(M), formatMoney(S)) : slots.budgetLinesTarget(formatMoney(anchorTarget(S, M))),
      muted: false,
    })
  }
  const valued = (it: BudgetLine) => isActiveAt(it, 0) && Number.isFinite(it.annualAmountReal)
  const running = items.reduce((sum, it) => (valued(it) ? sum + it.annualAmountReal : sum), 0)
  const essentialsAt0 = items.reduce((sum, it) => (it.tier === 'essentials' && valued(it) ? sum + it.annualAmountReal : sum), 0)
  if (items.some((it) => Number.isFinite(it.annualAmountReal))) {
    out.push({ text: slots.budgetRunningTotal(formatMoney(running)), muted: false })
    out.push({ text: slots.budgetTierSplit(formatMoney(essentialsAt0), formatMoney(running - essentialsAt0)), muted: false })
  }
  if (items.length > 0 && isRampedBudget(items)) out.push({ text: copy.budgetAnchorRampNote, muted: true })
  if (items.length > 0) {
    for (const w of validation.warnings) out.push({ text: w === 'zero-essentials' ? copy.budgetWarnZeroEssentials : copy.budgetWarnNoYearZero, muted: true })
  }
  return out
}

/** What Apply does with the staged lines (Card 9; build-gate 2): with nothing staged and no budget governing there is
 *  nothing to commit (`empty`, said aloud, never a silent close); with nothing staged over a governing budget it is the
 *  escape back to a single number (`escape`, never `budget: []`); a line in error blocks (`blocked`); else `apply`. */
export type BudgetApply = 'empty' | 'escape' | 'blocked' | 'apply'

export function budgetApplyFor(items: readonly BudgetLine[], governs: boolean, hasErrors: boolean): BudgetApply {
  if (items.length === 0) return governs ? 'escape' : 'empty'
  return hasErrors ? 'blocked' : 'apply'
}
