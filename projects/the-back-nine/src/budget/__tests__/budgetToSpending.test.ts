import { describe, it, expect } from 'vitest'
import type { BudgetLineItem } from '@shared/model'
import { budgetDraftPatch, budgetYearZeroFullTotal, compileBudget } from '@budget/budgetToSpending'

const line = (over: Partial<BudgetLineItem>): BudgetLineItem => ({
  category: 'food',
  label: 'Groceries',
  annualAmountReal: 12_000,
  tier: 'essentials',
  startYear: 0,
  ...over,
})

const H = 10 // profile horizon for these fixtures

describe('compileBudget — component routing', () => {
  it('a lifelong scalable-essentials line fills scalableEssentials across the whole horizon (the degenerate mapping — council build-gate b: NEVER discretionary, which would zero the floor)', () => {
    const c = compileBudget([line({ annualAmountReal: 48_000 })], undefined, H)
    expect(c.scalableEssentials).toEqual(new Array(H).fill(48_000))
    expect(c.sticky).toEqual(new Array(H).fill(0))
    expect(c.discretionary).toEqual(new Array(H).fill(0))
  })

  it('housing/utilities/other essentials route to sticky; discretionary routes to discretionary whatever its category', () => {
    const c = compileBudget(
      [
        line({ category: 'housing', annualAmountReal: 30_000 }),
        line({ category: 'other', annualAmountReal: 5_000 }),
        line({ category: 'housing', tier: 'discretionary', annualAmountReal: 8_000, label: 'Lake cabin' }),
      ],
      undefined,
      H,
    )
    expect(c.sticky[0]).toBe(35_000)
    expect(c.scalableEssentials[0]).toBe(0)
    expect(c.discretionary[0]).toBe(8_000)
  })

  it('overlapping active lines SUM per year', () => {
    const c = compileBudget(
      [line({ annualAmountReal: 10_000 }), line({ annualAmountReal: 2_000, startYear: 3 })],
      undefined,
      H,
    )
    expect(c.scalableEssentials[2]).toBe(10_000)
    expect(c.scalableEssentials[3]).toBe(12_000)
  })
})

describe('compileBudget — window expansion (time-box honored)', () => {
  it('a windowed line is active exactly [startYear, endYear] inclusive, zero outside', () => {
    const c = compileBudget(
      [line({ tier: 'discretionary', startYear: 2, endYear: 5, annualAmountReal: 20_000 })],
      undefined,
      H,
    )
    expect(c.discretionary).toEqual([0, 0, 20_000, 20_000, 20_000, 20_000, 0, 0, 0, 0])
  })

  it('an endYear beyond the horizon clamps to the profile length', () => {
    const c = compileBudget([line({ startYear: 0, endYear: 500 })], undefined, 3)
    expect(c.scalableEssentials).toEqual([12_000, 12_000, 12_000])
  })
})

describe('compileBudget — the OOP-medical injection (the containment fix)', () => {
  it('injects the intake OOP scalar into STICKY at every year, on top of typed lines', () => {
    const c = compileBudget([line({ category: 'housing', annualAmountReal: 30_000 })], 7_000, H)
    expect(c.sticky).toEqual(new Array(H).fill(37_000))
  })

  it('absent intake OOP injects NOTHING (burned/062 — never a plausible default)', () => {
    const c = compileBudget([line({})], undefined, H)
    expect(c.sticky).toEqual(new Array(H).fill(0))
  })

  it('the injection is the whole sticky floor even for an empty item list (the medical sub-floor exists independent of what the user typed)', () => {
    const c = compileBudget([], 6_500, H)
    expect(c.sticky).toEqual(new Array(H).fill(6_500))
    expect(c.scalableEssentials).toEqual(new Array(H).fill(0))
  })
})

describe('compileBudget — structural throws vs faithful domain-bad values', () => {
  it('throws loud on a reversed window (compiling it faithfully would silently drop the line)', () => {
    expect(() => compileBudget([line({ startYear: 5, endYear: 2 })], undefined, H)).toThrow(/reversed window/)
  })

  it('throws loud on a negative or non-integer start, and on a bad horizon', () => {
    expect(() => compileBudget([line({ startYear: -1 })], undefined, H)).toThrow(/startYear/)
    expect(() => compileBudget([line({ startYear: 0.5 })], undefined, H)).toThrow(/startYear/)
    expect(() => compileBudget([], undefined, 0)).toThrow(/horizon/)
  })

  it('compiles a domain-bad AMOUNT faithfully — the ENGINE (validateParams), never this layer, rejects it to a calm indeterminate', () => {
    const c = compileBudget([line({ annualAmountReal: -100 })], undefined, H)
    expect(c.scalableEssentials[0]).toBe(-100)
  })
})

describe('budgetDraftPatch — the reconciliation invariant, atomic', () => {
  it('one patch carries the items AND the reconciled scalar (incl. injected medical) — no consumer can observe them disagreeing', () => {
    const items = [
      line({ annualAmountReal: 30_000 }),
      line({ tier: 'discretionary', annualAmountReal: 15_000, label: 'Travel' }),
    ]
    const patch = budgetDraftPatch(items, 6_000)
    expect(patch.budget).toBe(items)
    expect(patch.annualSpendingReal).toBe(51_000)
  })
})

describe('budgetYearZeroFullTotal — the reconciliation figure', () => {
  it('sums lines active at k=0 across BOTH tiers plus the injected medical', () => {
    const total = budgetYearZeroFullTotal(
      [
        line({ annualAmountReal: 30_000 }),
        line({ tier: 'discretionary', annualAmountReal: 15_000 }),
        line({ startYear: 3, annualAmountReal: 99_000 }), // not active at 0 — excluded
      ],
      5_000,
    )
    expect(total).toBe(50_000)
  })

  it('with no items and no OOP the anchor is 0 (the upstream no-line-at-year-zero warning owns surfacing this)', () => {
    expect(budgetYearZeroFullTotal([], undefined)).toBe(0)
  })
})
