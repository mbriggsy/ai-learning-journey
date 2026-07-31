import { describe, it, expect } from 'vitest'
import type { BudgetLineItem } from '@shared/model'
import {
  anchorTarget,
  budgetDraftPatch,
  budgetYearZeroEssentialsTotal,
  budgetYearZeroFullTotal,
  commitBudgetPatch,
  compileBudget,
} from '@budget/budgetToSpending'

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

describe('anchorTarget — the lines-target nets OOP medical (U9b build-gate 1)', () => {
  it('target = S − M: the compile re-adds M on top of typed lines, so quoting the raw S would commit S+M (the double-count answer jump)', () => {
    expect(anchorTarget(78_000, 6_500)).toBe(71_500)
  })

  it('planted-fail: a line typed at the RAW scalar with medical present reconciles ABOVE the scalar — the exact miss the net exists to prevent', () => {
    const patch = budgetDraftPatch([line({ annualAmountReal: 78_000 })], 6_500)
    expect(patch.annualSpendingReal).toBe(84_500) // S+M — NOT the answer the household had
    // ...while a line typed at the NETTED target reconciles exactly back to S:
    const netted = budgetDraftPatch([line({ annualAmountReal: anchorTarget(78_000, 6_500) })], 6_500)
    expect(netted.annualSpendingReal).toBe(78_000)
  })

  it('absent M nets nothing (absence is absence — burned/062), and a target never goes negative', () => {
    expect(anchorTarget(78_000, undefined)).toBe(78_000)
    expect(anchorTarget(4_000, 6_500)).toBe(0)
  })
})

describe('commitBudgetPatch — the ONE commit seam (U9b build-gate 2)', () => {
  it('a non-empty list commits the atomic reconciliation patch', () => {
    const items = [line({ annualAmountReal: 30_000 })]
    expect(commitBudgetPatch(items, 6_000)).toEqual({ budget: items, annualSpendingReal: 36_000 })
  })

  it('an EMPTY list is the escape hatch: budget returns to strictly-undefined and the scalar is NOT touched', () => {
    const patch = commitBudgetPatch([], 6_000)
    expect(patch).toEqual({ budget: undefined })
    expect('annualSpendingReal' in patch).toBe(false)
  })

  it('planted-fail: the escape patch never carries `budget: []` — an empty array is truthy at the params gate and collapses spending to just the injected medical', () => {
    const patch = commitBudgetPatch([], 6_000)
    expect(patch.budget).toBeUndefined()
    expect(Array.isArray(patch.budget)).toBe(false)
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

describe('budgetYearZeroEssentialsTotal — the floor twin, and the two silent ways to get it wrong', () => {
  /* The 2026-07-30 council required the two spending levels to reach the surface, and required the
   * figure be derived from the compiled routing rather than a hand-sum, behind a planted-fail. This
   * fixture is built so BOTH wrong implementations produce a WRONG NUMBER rather than a coincidence:
   *   sticky/scalable essentials typed = 30,000 + 8,000 = 38,000
   *   injected OOP medical             =            5,000   (compileBudget adds it to STICKY)
   *   discretionary                    =           15,000   (NOT essentials)
   *   inactive-at-0 line               =           99,000   (window starts at year 3)
   * ⇒ essentials = 43,000 · full = 58,000. Every pair is distinct, so no arithmetic slip lands on
   * the right answer by luck: a raw line-sum gives 38,000 (omits M), a discretionary-inclusive sum
   * gives 58,000 (the full total), and an isSurvivorSticky-only filter gives 35,000 (drops the
   * scalable half). None of those equals 43,000. */
  const world = [
    line({ annualAmountReal: 30_000 }),
    line({ tier: 'essentials', annualAmountReal: 8_000 }),
    line({ tier: 'discretionary', annualAmountReal: 15_000 }),
    line({ startYear: 3, annualAmountReal: 99_000 }),
  ]

  it('sums the NON-discretionary lines active at k=0 plus the injected medical', () => {
    expect(budgetYearZeroEssentialsTotal(world, 5_000)).toBe(43_000)
  })

  it('is strictly below its full-total sibling by exactly the discretionary spend — the GAP the two dates come from', () => {
    const essentials = budgetYearZeroEssentialsTotal(world, 5_000)
    const full = budgetYearZeroFullTotal(world, 5_000)
    expect(full).toBe(58_000)
    expect(full - essentials).toBe(15_000)
  })

  it('INCLUDES the injected out-of-pocket medical — the omission that would understate essentials by exactly M', () => {
    // The failure this pins: summing the user's TYPED lines. compileBudget adds M to the sticky
    // floor on top of them, so a line-sum understates the floor the engine actually spends.
    expect(budgetYearZeroEssentialsTotal(world, 5_000) - budgetYearZeroEssentialsTotal(world, undefined)).toBe(5_000)
    expect(budgetYearZeroEssentialsTotal(world, undefined)).toBe(38_000)
  })

  it('agrees with compileBudget’s own year-0 routing — the producer this figure must never fork from', () => {
    // The real anti-drift arm: assert against the ARRAYS the engine spends, not against a re-typed
    // expectation. If compileBudget's tier routing ever changes, this reds instead of the surface
    // quietly quoting a number the engine no longer uses.
    const compiled = compileBudget(world, 5_000, 10)
    expect(budgetYearZeroEssentialsTotal(world, 5_000)).toBe(
      compiled.sticky[0]! + compiled.scalableEssentials[0]!,
    )
    expect(budgetYearZeroFullTotal(world, 5_000)).toBe(
      compiled.sticky[0]! + compiled.scalableEssentials[0]! + compiled.discretionary[0]!,
    )
  })
})
