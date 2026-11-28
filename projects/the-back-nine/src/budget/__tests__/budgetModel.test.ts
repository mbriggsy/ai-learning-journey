import { describe, it, expect } from 'vitest'
import type { BudgetLineItem } from '@shared/model'
import {
  budgetGoverns,
  isActiveAt,
  isRampedBudget,
  isSurvivorSticky,
  repeatsOnAtYearZero,
  validateBudgetItems,
} from '@budget/budgetModel'
import { EVERY_YEARS_MAX, EVERY_YEARS_MIN, GROWTH_RATE_MAX } from '@shared/spendingBounds'
import { copy } from '@ui/copy'

const line = (over: Partial<BudgetLineItem>): BudgetLineItem => ({
  category: 'food',
  label: 'Groceries',
  annualAmountReal: 12_000,
  tier: 'essentials',
  startYear: 0,
  ...over,
})

describe('isSurvivorSticky — the sticky rule (council 2026-07-02)', () => {
  it('housing + utilities essentials are sticky', () => {
    expect(isSurvivorSticky(line({ category: 'housing' }))).toBe(true)
    expect(isSurvivorSticky(line({ category: 'utilities' }))).toBe(true)
  })

  it('an OTHER-tagged essentials line ERRS STICKY (the conservative direction — an unclassifiable survival cost must not scale down at widowhood)', () => {
    expect(isSurvivorSticky(line({ category: 'other' }))).toBe(true)
  })

  it('food / transportation / travel / gifts essentials scale', () => {
    for (const category of ['food', 'transportation', 'travel', 'gifts'] as const) {
      expect(isSurvivorSticky(line({ category }))).toBe(false)
    }
  })

  it('DISCRETIONARY lines always scale, whatever the category — sticky is a property of the essentials tier', () => {
    for (const category of ['housing', 'utilities', 'other'] as const) {
      expect(isSurvivorSticky(line({ category, tier: 'discretionary' }))).toBe(false)
    }
  })
})

describe('isActiveAt — window semantics', () => {
  it('endYear ABSENT = lifelong', () => {
    const l = line({ startYear: 2 })
    expect(isActiveAt(l, 1)).toBe(false)
    expect(isActiveAt(l, 2)).toBe(true)
    expect(isActiveAt(l, 500)).toBe(true)
  })

  it('endYear present = INCLUSIVE last active year', () => {
    const l = line({ startYear: 2, endYear: 5 })
    expect(isActiveAt(l, 1)).toBe(false)
    expect(isActiveAt(l, 2)).toBe(true)
    expect(isActiveAt(l, 5)).toBe(true)
    expect(isActiveAt(l, 6)).toBe(false)
  })
})

describe('budgetGoverns — the has-budget gate (U9b, insight 048)', () => {
  it('strictly-undefined is the only "no budget"', () => {
    expect(budgetGoverns(undefined)).toBe(false)
    expect(budgetGoverns([line({})])).toBe(true)
  })

  it('an empty array WOULD govern — which is exactly why the commit seam never writes one (build-gate 2)', () => {
    // Documents the trap rather than papering over it: presence is the predicate, and the
    // engine params gate (intakeMap `d.budget !== undefined`) reads the same shape. The
    // commit seam (commitBudgetPatch) is the guard that [] never exists in a draft.
    expect(budgetGoverns([])).toBe(true)
  })
})

describe('isRampedBudget — the anchor-not-steady-state label gate (U9b)', () => {
  it('all-lifelong-at-zero lines are NOT ramped (the year-0 total IS the steady spend)', () => {
    expect(isRampedBudget([line({}), line({ tier: 'discretionary' })])).toBe(false)
  })

  it('a later start OR any finite end makes the budget ramped', () => {
    expect(isRampedBudget([line({}), line({ startYear: 3 })])).toBe(true)
    expect(isRampedBudget([line({}), line({ endYear: 19 })])).toBe(true)
  })

  it('a repeat makes the budget ramped, even one from year 0 with no end (it charges some years and not others; gap 4’s U3)', () => {
    expect(isRampedBudget([line({}), line({ everyYears: 5 })])).toBe(true)
  })

  it('a line that changes at its own rate makes the budget ramped, even a lifelong one from year 0 (its later years cost something else in today’s dollars; gap 4’s U4)', () => {
    expect(isRampedBudget([line({}), line({ growthRate: 0 })])).toBe(true)
    expect(isRampedBudget([line({ growthRate: 0.05 })])).toBe(true)
  })
})

describe('a line’s repeat — the window helper and the validator (gap 4’s U3, KTD5)', () => {
  it('isActiveAt charges a repeat in its start year and every N years after, inside its window', () => {
    const car = line({ startYear: 3, endYear: 14, everyYears: 5 })
    expect([0, 3, 4, 8, 13, 14, 18].map((k) => isActiveAt(car, k))).toEqual([false, true, false, true, true, false, false])
  })

  it('the validator refuses a repeat of 1 or 2.5 with its own kind; 2 and 50 pass; the words name the band the bounds module holds', () => {
    for (const everyYears of [1, 2.5, 51]) {
      expect(validateBudgetItems([line({ everyYears })]).errors, `every ${everyYears}`).toEqual([{ index: 0, kind: 'repeat-out-of-range' }])
    }
    for (const everyYears of [2, 50]) expect(validateBudgetItems([line({ everyYears })]).errors, `every ${everyYears}`).toEqual([])
    expect(copy.errBudgetRepeatRange).toContain(`from ${EVERY_YEARS_MIN.value} to ${EVERY_YEARS_MAX.value}`)
  })

  it('repeatsOnAtYearZero: only a valued repeat the window helper charges in year 0', () => {
    const car = line({ label: 'Car', everyYears: 5 })
    const items = [car, line({ label: 'Roof', startYear: 2, everyYears: 10 }), line({ label: 'Blank', everyYears: 4, annualAmountReal: Number.NaN }), line({})]
    expect(repeatsOnAtYearZero(items)).toEqual([car])
  })
})

// Gap 4's U8: the Living drawer's "Goes up by" stages NaN while its box is blank, so the validator is what holds the Save.
describe('a line’s rate — the validator (gap 4’s U8, KTD4)', () => {
  it('refuses a blank (NaN), a negative or a rate above the ceiling with its own kind; 0 and the ceiling pass; absent is with prices', () => {
    for (const growthRate of [Number.NaN, -0.0001, 0.1501, Number.POSITIVE_INFINITY]) {
      expect(validateBudgetItems([line({ growthRate })]).errors, `rate ${growthRate}`).toEqual([{ index: 0, kind: 'rate-out-of-range' }])
    }
    for (const growthRate of [0, 0.05, GROWTH_RATE_MAX.value]) expect(validateBudgetItems([line({ growthRate })]).errors, `rate ${growthRate}`).toEqual([])
    expect(validateBudgetItems([line({})]).errors).toEqual([])
    expect(copy.errBudgetRateRange).toContain(`up to ${GROWTH_RATE_MAX.value * 100}%`)
  })
})

describe('validateBudgetItems — R19 (errors block, warnings never do)', () => {
  it('a clean multi-line budget passes with no issues', () => {
    const v = validateBudgetItems([
      line({}),
      line({ category: 'travel', tier: 'discretionary', startYear: 0, endYear: 19, label: 'See the world' }),
    ])
    expect(v.errors).toEqual([])
    expect(v.warnings).toEqual([])
  })

  it('names each blocking defect with its line index', () => {
    const v = validateBudgetItems([
      line({ annualAmountReal: Number.NaN }),
      line({ annualAmountReal: -5 }),
      line({ startYear: 1.5 }),
      line({ startYear: -1 }),
      line({ startYear: 5, endYear: 2 }),
    ])
    expect(v.errors).toEqual([
      { index: 0, kind: 'non-finite-amount' },
      { index: 1, kind: 'negative-amount' },
      { index: 2, kind: 'non-integer-window' },
      { index: 3, kind: 'negative-start' },
      { index: 4, kind: 'reversed-window' },
    ])
  })

  it('an all-discretionary budget is coherent-but-warned (zero-essentials), never an error', () => {
    const v = validateBudgetItems([line({ tier: 'discretionary' })])
    expect(v.errors).toEqual([])
    expect(v.warnings).toContain('zero-essentials')
  })

  it('a budget with no line active at year 0 is warned (the reconciliation anchor must never silently read $0)', () => {
    const v = validateBudgetItems([line({ startYear: 3 })])
    expect(v.errors).toEqual([])
    expect(v.warnings).toContain('no-line-at-year-zero')
  })

  it('an empty item list warns no-line-at-year-zero but not zero-essentials (there is no budget to mis-tier)', () => {
    const v = validateBudgetItems([])
    expect(v.errors).toEqual([])
    expect(v.warnings).toEqual(['no-line-at-year-zero'])
  })
})
