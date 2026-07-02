/**
 * Budget line-item semantics (P3·U9 — the essentials-floor / lifestyle-surplus split).
 *
 * THE STICKY RULE (council 2026-07-02 — the survivor-floor honesty law): within the
 * ESSENTIALS tier, `housing`, `utilities`, and `other` lines are SURVIVOR-STICKY —
 * they do NOT scale by `survivorSpendingRatio` at widowhood (the mortgage, the
 * property tax, and the un-classifiable "I don't know what this is but we need it"
 * line do not shrink because one spouse died; scaling them would understate the
 * survivor floor — the cardinal calm-but-wrong direction, so `other`-tagged
 * essentials deliberately ERR STICKY). `food`/`transportation`/`travel`/`gifts`
 * essentials scale (one person genuinely eats/drives less). DISCRETIONARY lines
 * always scale, whatever their category — sticky is a property of the survival
 * floor, and the floor is the essentials tier by definition.
 *
 * THE DEGENERATE-INERT BOUNDARY (documented, test-pinned): the plan's
 * "single-essentials-line budget reproduces ratio-on-total byte-identically" holds
 * for SCALABLE-category lines (the degenerate-identity golden pins it via a `food`
 * line). A single `other`-essentials line is NOT byte-identical to the scalar path —
 * it errs sticky, i.e. the survivor floor reads HIGHER spending (more conservative,
 * never optimistic). That divergence is the deliberate composition of the plan's
 * inert law with the council's err-sticky law; U9b's "break down your spending"
 * seed affordance owns disclosing it (flagged in TODO).
 *
 * R19 SANITY lives here as pure typed issues; the intake grammar (U9b) and the
 * store's `setBudget` consume them. The codec owns restore-path SHAPE (vocab,
 * finiteness, the reversed-window structural reject); the engine's `validateParams`
 * owns the compiled-profile domain gate. Three gates, no overlap (the two-gate rule).
 */
import type { BudgetLineItem } from '@shared/model'

/** Survivor-sticky = essentials-tier AND a category whose cost does not shrink at
 *  widowhood (`other` errs sticky — conservative). See the module header. */
export function isSurvivorSticky(item: BudgetLineItem): boolean {
  if (item.tier !== 'essentials') return false
  return item.category === 'housing' || item.category === 'utilities' || item.category === 'other'
}

/** Is the line active in retirement-year k (offsets from the household work-stop
 *  anchor; `endYear` ABSENT = lifelong, inclusive when present)? */
export function isActiveAt(item: BudgetLineItem, k: number): boolean {
  if (k < item.startYear) return false
  return item.endYear === undefined || k <= item.endYear
}

/** A blocking R19 problem on one line (calm inline message material — U9b renders). */
export interface BudgetItemError {
  readonly index: number
  readonly kind: 'non-finite-amount' | 'negative-amount' | 'non-integer-window' | 'negative-start' | 'reversed-window'
}

/** A non-blocking R19 caution about the budget as a whole. `zero-essentials` = an
 *  all-discretionary budget (coherent — the floor is trivially safe — but warned:
 *  "nothing here is marked essential"). `no-line-at-year-zero` = every window starts
 *  later than the first retirement year, so the year-0 reconciliation anchor would
 *  silently read $0 (council build-gate: warn, never silently pin). */
export type BudgetWarning = 'zero-essentials' | 'no-line-at-year-zero'

export interface BudgetValidation {
  readonly errors: readonly BudgetItemError[]
  readonly warnings: readonly BudgetWarning[]
}

/** Pure R19 pass over the itemized budget. Errors block a commit (validate-before-
 *  mutate — burned/021); warnings surface calmly and never block. */
export function validateBudgetItems(items: readonly BudgetLineItem[]): BudgetValidation {
  const errors: BudgetItemError[] = []
  items.forEach((item, index) => {
    if (!Number.isFinite(item.annualAmountReal)) errors.push({ index, kind: 'non-finite-amount' })
    else if (item.annualAmountReal < 0) errors.push({ index, kind: 'negative-amount' })
    if (!Number.isInteger(item.startYear) || (item.endYear !== undefined && !Number.isInteger(item.endYear))) {
      errors.push({ index, kind: 'non-integer-window' })
    } else if (item.startYear < 0) {
      errors.push({ index, kind: 'negative-start' })
    } else if (item.endYear !== undefined && item.endYear < item.startYear) {
      errors.push({ index, kind: 'reversed-window' })
    }
  })

  const warnings: BudgetWarning[] = []
  if (items.length > 0 && !items.some((i) => i.tier === 'essentials')) warnings.push('zero-essentials')
  if (!items.some((i) => isActiveAt(i, 0))) warnings.push('no-line-at-year-zero')
  return { errors, warnings }
}
