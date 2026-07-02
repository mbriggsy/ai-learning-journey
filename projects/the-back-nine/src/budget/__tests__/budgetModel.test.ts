import { describe, it, expect } from 'vitest'
import type { BudgetLineItem } from '@shared/model'
import { isActiveAt, isSurvivorSticky, validateBudgetItems } from '@budget/budgetModel'

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

  it('DISCRETIONARY lines always scale, whatever the category — sticky is a property of the survival floor', () => {
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
