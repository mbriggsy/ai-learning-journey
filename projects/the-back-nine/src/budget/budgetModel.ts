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
 * always scale, whatever their category — sticky is a property of the essentials
 * tier (the floor reading's lines, which the full plan carries too).
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
import { everyYearsInRange, growthRateInRange } from '@shared/spendingBounds'

/** Survivor-sticky = essentials-tier AND a category whose cost does not shrink at
 *  widowhood (`other` errs sticky — conservative). See the module header. */
export function isSurvivorSticky(item: BudgetLineItem): boolean {
  if (item.tier !== 'essentials') return false
  return item.category === 'housing' || item.category === 'utilities' || item.category === 'other'
}

/** Is the line charged in retirement-year k (offsets from the household work-stop anchor; `endYear` ABSENT =
 *  lifelong, inclusive when present)? A line with a repeat (`everyYears`, schema version 8) is charged only in its
 *  start year and every `everyYears` years after, inside its window (gap 4's KTD5): the ONE home of a line's years,
 *  read by the compile, the year-0 totals and every other reader, so no two can disagree. Counted in the window's own
 *  frame (insight 167). */
export function isActiveAt(item: BudgetLineItem, k: number): boolean {
  if (k < item.startYear) return false
  if (item.endYear !== undefined && k > item.endYear) return false
  return item.everyYears === undefined || (k - item.startYear) % item.everyYears === 0
}

/** THE HAS-BUDGET GATE (U9b — pure + exported per insight 048): a budget governs the
 *  spending scalar iff the field is PRESENT. Strictly-undefined is the only "no budget"
 *  (build-gate 2: `[]` is never written; presence ⇒ non-empty by the commit seam), so
 *  every consumer — the read-only spend question, the entry affordance's wording, the
 *  builder's open state — reads ONE predicate and can never disagree. */
export function budgetGoverns(
  budget: readonly BudgetLineItem[] | undefined,
): budget is readonly BudgetLineItem[] {
  return budget !== undefined
}

/** RAMPED = any line departs from the same cost in every year from year 0: a later start, any finite end, a repeat
 *  (gap 4's U3: it charges some years and not others) or its own rate (gap 4's U4: a line that doesn't go up with
 *  prices costs something else in today's dollars every later year, even a lifelong one). For a ramped budget the
 *  year-0 reconciled total is an ANCHOR — the figure the answer is reconciled through — not a steady-state spend, and
 *  the surfaces quoting it must label it so (council 2026-07-02, the anchor-not-steady-state carry-forward). */
export function isRampedBudget(items: readonly BudgetLineItem[]): boolean {
  return items.some((i) => i.startYear > 0 || i.endYear !== undefined || i.everyYears !== undefined || i.growthRate !== undefined)
}

/** A blocking R19 problem on one line (calm inline message material — U9b renders). */
export interface BudgetItemError {
  readonly index: number
  readonly kind:
    | 'non-finite-amount'
    | 'negative-amount'
    | 'non-integer-window'
    | 'negative-start'
    | 'reversed-window'
    /** A repeat (schema version 8) that is not a whole number of years from 2 to 50 (`spendingBounds.ts`). */
    | 'repeat-out-of-range'
    /** A yearly rate (schema version 8) that is not a figure from 0 to 15 % (`spendingBounds.ts`). The Living drawer's
     *  "Goes up by" with its box blank stages NaN (gap 4's U8), so a blank box blocks the Save with words and is never
     *  saved as "goes up with prices" (insight 059: blank and wrong stay apart). */
    | 'rate-out-of-range'
}

/** The lines a repeat charges in year 0, valued (gap 4's U8 and U15): where the year-0 total is printed, the figure is
 *  the first year's with these inside it, never a steady "a year". Read through {@link isActiveAt}, the one home. */
export function repeatsOnAtYearZero(items: readonly BudgetLineItem[]): readonly BudgetLineItem[] {
  return items.filter((it) => it.everyYears !== undefined && isActiveAt(it, 0) && Number.isFinite(it.annualAmountReal))
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
    if (item.everyYears !== undefined && !everyYearsInRange(item.everyYears)) errors.push({ index, kind: 'repeat-out-of-range' })
    // Finiteness FIRST (insights 008 and 010: a NaN passes every relational compare).
    if (item.growthRate !== undefined && (!Number.isFinite(item.growthRate) || !growthRateInRange(item.growthRate))) {
      errors.push({ index, kind: 'rate-out-of-range' })
    }
  })

  const warnings: BudgetWarning[] = []
  if (items.length > 0 && !items.some((i) => i.tier === 'essentials')) warnings.push('zero-essentials')
  if (!items.some((i) => isActiveAt(i, 0))) warnings.push('no-line-at-year-zero')
  return { errors, warnings }
}
