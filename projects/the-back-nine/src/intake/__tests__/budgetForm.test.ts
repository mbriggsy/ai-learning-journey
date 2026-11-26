/**
 * The budget worksheet's pure rules (`budgetForm.ts`), ported by Act 6 · RC14 from the deleted walk builder's battery
 * (`budgetBuilder.test.tsx`, which pinned them through `BudgetBuilder.tsx`'s sheet): a fresh line's honest defaults, what
 * Apply does with the staged lines (an empty worksheet says so over no budget and is the escape over a governing one; a
 * line in error blocks; a warning never does), each line error's own words, and THE RECONCILIATION READOUT (build-gate 1):
 * the lines target nets the out-of-pocket medical, M > S replaces it with the honest exceeds line (F10), a missing figure
 * withholds its lines rather than fabricating one, and the running total waits for the first real dollar. The Living
 * expenses drawer that renders these is pinned in `src/ui/screens/profile/drawers/__tests__/expensesFields.test.tsx`.
 */
import { describe, expect, it } from 'vitest'
import { validateBudgetItems, type BudgetItemError } from '@budget/budgetModel'
import type { BudgetLineItem } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { copy, slots } from '@ui/copy'
import { DEV_SEEDS } from '@ui/devSeeds'
import { BUDGET_ERROR_COPY, budgetApplyFor, budgetReadout, freshLine, isAmountError } from '../budgetForm'
import { formatMoney } from '../moneyFormat'

const line = (patch?: Partial<BudgetLineItem>): BudgetLineItem => ({
  category: 'food',
  label: '',
  annualAmountReal: 30_000,
  tier: 'essentials',
  startYear: 0,
  ...patch,
})

/** A real seed with the spending figure S and the out-of-pocket figure M as given (either may be absent). */
const withSM = (S: number | undefined, M: number | undefined): ScenarioDraft => ({
  ...DEV_SEEDS.retired,
  annualSpendingReal: S,
  health: { ...DEV_SEEDS.retired.health, oopMedicalAnnual: M },
})

const texts = (d: ScenarioDraft, items: readonly BudgetLineItem[]): readonly string[] =>
  budgetReadout(d, items, validateBudgetItems(items)).map((l) => l.text)

describe('a fresh line', () => {
  it('defaults to other + essentials (the err-STICKY unclassified pick) with NO amount (NaN, never a silent 0), from year 0, lifelong, under the id its Add minted', () => {
    const fresh = freshLine('abc')
    expect(fresh).toMatchObject({ id: 'abc', category: 'other', tier: 'essentials', label: '', startYear: 0 })
    expect(Number.isNaN(fresh.annualAmountReal)).toBe(true)
    expect('endYear' in fresh, 'lifelong is the key ABSENT (DND 009)').toBe(false)
    // The missing amount is the line's own blocking rule until a dollar is typed.
    expect(validateBudgetItems([fresh]).errors.map((e) => e.kind)).toEqual(['non-finite-amount'])
  })
})

describe('what Apply does with the staged lines (Card 9; build-gate 2)', () => {
  it('nothing staged with NO budget governing is `empty` (said aloud, never a silent close); over a governing budget it is the `escape` to one figure', () => {
    expect(budgetApplyFor([], false, false)).toBe('empty')
    expect(budgetApplyFor([], true, false)).toBe('escape')
  })

  it('a line in error blocks; a clean list applies', () => {
    const fresh = [freshLine('a')]
    expect(budgetApplyFor(fresh, false, validateBudgetItems(fresh).errors.length > 0)).toBe('blocked')
    expect(budgetApplyFor([line()], true, validateBudgetItems([line()]).errors.length > 0)).toBe('apply')
  })

  it('a warning never blocks: an all-extras budget, and one with no line active at year 0, both apply', () => {
    const allExtras = [line({ tier: 'discretionary', annualAmountReal: 9_000 })]
    const laterOnly = [line({ annualAmountReal: 9_000, startYear: 3 })]
    for (const items of [allExtras, laterOnly]) {
      const v = validateBudgetItems(items)
      expect(v.warnings.length, '[test setup] the list carries a warning').toBeGreaterThan(0)
      expect(budgetApplyFor(items, false, v.errors.length > 0)).toBe('apply')
    }
  })
})

describe('each line error names its own rule', () => {
  it('every error kind has its own words, and the amount errors are told from the window errors (the two places a line shows them)', () => {
    const cases: readonly [BudgetItemError['kind'], string, boolean][] = [
      ['non-finite-amount', copy.errBudgetAmountNonFinite, true],
      ['negative-amount', copy.errBudgetAmountNegative, true],
      ['non-integer-window', copy.errBudgetWindowNonInteger, false],
      ['negative-start', copy.errBudgetWindowNegativeStart, false],
      ['reversed-window', copy.errBudgetWindowReversed, false],
    ]
    for (const [kind, words, amount] of cases) {
      expect(copy[BUDGET_ERROR_COPY[kind]], kind).toBe(words)
      expect(isAmountError({ index: 0, kind }), kind).toBe(amount)
    }
  })

  it('a negative amount, a negative start, a non-integer window, a reversed window and a non-integer or negative through-year each name their rule (never swallowed to lifelong)', () => {
    const kinds = (patch: Partial<BudgetLineItem>) => validateBudgetItems([line(patch)]).errors.map((e) => e.kind)
    expect(kinds({ annualAmountReal: -500 })).toEqual(['negative-amount'])
    expect(kinds({ startYear: -2 })).toEqual(['negative-start'])
    expect(kinds({ startYear: 2.5 })).toEqual(['non-integer-window'])
    expect(kinds({ startYear: 5, endYear: 2 })).toEqual(['reversed-window'])
    expect(kinds({ endYear: 2.5 })).toEqual(['non-integer-window'])
    expect(kinds({ endYear: -3 }).length, 'a negative through-year is an error, not lifelong').toBeGreaterThan(0)
  })
})

describe('the reconciliation readout (build-gate 1: the out-of-pocket medical net)', () => {
  const S = 80_000
  const M = 8_000

  it('with S and a positive M: the anchor lead, the carried-medical line, then the lines target = max(0, S − M)', () => {
    expect(texts(withSM(S, M), [])).toEqual([
      slots.budgetAnchorLead(formatMoney(S)),
      slots.budgetMedicalCarried(formatMoney(M)),
      slots.budgetLinesTarget(formatMoney(S - M)),
    ])
  })

  it('M > S: the honest exceeds line REPLACES the lines target, never "about $0 into the lines" beside "about $M carried" (F10); the carried line stays', () => {
    const out = texts(withSM(5_000, 6_500), [])
    expect(out).toContain(slots.budgetMedicalExceedsTotal(formatMoney(6_500), formatMoney(5_000)))
    expect(out).not.toContain(slots.budgetLinesTarget(formatMoney(0)))
    expect(out).toContain(slots.budgetMedicalCarried(formatMoney(6_500)))
  })

  it('M = S is the plain readout byte for byte: a $0 lines target is the truth there (the M >= S mutant-killer)', () => {
    expect(texts(withSM(6_500, 6_500), [])).toEqual([
      slots.budgetAnchorLead(formatMoney(6_500)),
      slots.budgetMedicalCarried(formatMoney(6_500)),
      slots.budgetLinesTarget(formatMoney(0)),
    ])
  })

  it('with NO M (or M = 0): the target and carried lines are WITHHELD (raw S would invite committing S + M); the anchor still shows', () => {
    for (const m of [undefined, 0]) expect(texts(withSM(S, m), []), String(m)).toEqual([slots.budgetAnchorLead(formatMoney(S))])
  })

  it('with NO S: the anchor lines are withheld, never a fabricated figure', () => {
    expect(texts(withSM(undefined, M), [])).toEqual([])
  })

  it('the running total sums ONLY the year-0-active finite lines; the tier split reads the same lines', () => {
    const out = texts(withSM(30_000, undefined), [line({ annualAmountReal: 30_000 }), line({ category: 'travel', annualAmountReal: 6_000, startYear: 2 }), freshLine('x')])
    expect(out).toContain(slots.budgetRunningTotal(formatMoney(30_000)))
    expect(out).toContain(slots.budgetTierSplit(formatMoney(30_000), formatMoney(0)))
  })

  it('a fresh untouched line keeps the running total and tier split ABSENT; the first real dollar starts them (Briggsy live read 2026-07-11)', () => {
    const d = withSM(78_000, undefined)
    const untouched = texts(d, [freshLine('x')])
    expect(untouched.some((t) => t === slots.budgetRunningTotal(formatMoney(0)))).toBe(false)
    expect(untouched.some((t) => t === slots.budgetTierSplit(formatMoney(0), formatMoney(0)))).toBe(false)
    const typed = texts(d, [{ ...freshLine('x'), annualAmountReal: 12_000 }])
    expect(typed).toContain(slots.budgetRunningTotal(formatMoney(12_000)))
    expect(typed).toContain(slots.budgetTierSplit(formatMoney(12_000), formatMoney(0)))
  })

  it('a ramped budget shows the anchor-not-steady-state note; a lifelong-at-0 one does not', () => {
    const d = withSM(36_000, undefined)
    expect(texts(d, [line(), line({ category: 'travel', annualAmountReal: 6_000, endYear: 10 })])).toContain(copy.budgetAnchorRampNote)
    expect(texts(d, [line()])).not.toContain(copy.budgetAnchorRampNote)
  })

  it('the warnings ride the readout as quiet lines: an all-extras budget, and one with no line at year 0', () => {
    const d = withSM(30_000, undefined)
    const allExtras = budgetReadout(d, [line({ tier: 'discretionary' })], validateBudgetItems([line({ tier: 'discretionary' })]))
    expect(allExtras.find((l) => l.text === copy.budgetWarnZeroEssentials)?.muted).toBe(true)
    const later = [line({ startYear: 3 })]
    expect(budgetReadout(d, later, validateBudgetItems(later)).find((l) => l.text === copy.budgetWarnNoYearZero)?.muted).toBe(true)
  })
})
