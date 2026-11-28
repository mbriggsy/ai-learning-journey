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
import { medicareCostTrend } from '@engine/constants'
import {
  BUDGET_ERROR_COPY,
  budgetApplyFor,
  budgetReadout,
  freshLine,
  lineChangeOf,
  lineErrorSlot,
  rateReadBack,
  repeatReadBack,
  withLineChange,
  type LineErrorSlot,
} from '../budgetForm'
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
  it('every error kind has its own words, and each shows under its own box: the amount, the From year, the repeat or the rate', () => {
    const cases: readonly [BudgetItemError['kind'], string, LineErrorSlot][] = [
      ['non-finite-amount', copy.errBudgetAmountNonFinite, 'amount'],
      ['negative-amount', copy.errBudgetAmountNegative, 'amount'],
      ['non-integer-window', copy.errBudgetWindowNonInteger, 'window'],
      ['negative-start', copy.errBudgetWindowNegativeStart, 'window'],
      ['reversed-window', copy.errBudgetWindowReversed, 'window'],
      ['repeat-out-of-range', copy.errBudgetRepeatRange, 'repeat'],
      ['rate-out-of-range', copy.errBudgetRateRange, 'rate'],
    ]
    for (const [kind, words, slot] of cases) {
      expect(copy[BUDGET_ERROR_COPY[kind]], kind).toBe(words)
      expect(lineErrorSlot({ index: 0, kind }), kind).toBe(slot)
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

// ── Gap 4's U8: how a line's cost changes, and the read-backs that show what an answer means in the household's numbers ──

/** Prices' growth from 2026 to 2036 by the closed form, each rate read from the constants (DND 012: never the producer's
 *  own loop): 2026 to 2035 at the near-term rate, 2035 to 2036 at the ultimate one (priceFrame.test.ts pins the split). */
const PRICES_2026_TO_2036 = Math.pow(1 + medicareCostTrend.value.cpiNearTermAvg, 9) * Math.pow(1 + medicareCostTrend.value.cpiUltimate, 1)

describe('how a line’s cost changes (gap 4’s U8, KTD4)', () => {
  it('reads the three answers off the stored field: absent with prices, 0 the same dollar amount, anything else up by a percent (NaN while blank)', () => {
    expect(lineChangeOf(line())).toBe('prices')
    expect(lineChangeOf(line({ growthRate: 0 }))).toBe('same')
    expect(lineChangeOf(line({ growthRate: 0.05 }))).toBe('rate')
    expect(lineChangeOf(line({ growthRate: Number.NaN }))).toBe('rate')
  })

  it('writes each answer: with prices REMOVES the key (never an undefined-valued one), the same writes 0, up by keeps its figure, takes the last one or stages NaN', () => {
    const rated = line({ growthRate: 0.05 })
    const prices = withLineChange(rated, 'prices', undefined)
    expect('growthRate' in prices).toBe(false)
    expect(withLineChange(rated, 'same', undefined).growthRate).toBe(0)
    expect(withLineChange(rated, 'rate', 0.02).growthRate, 'already up by: kept').toBe(0.05)
    expect(withLineChange(line({ growthRate: 0 }), 'rate', 0.05).growthRate, 'back to the percent it held').toBe(0.05)
    expect(withLineChange(line(), 'rate', undefined).growthRate, 'no figure yet: NaN, which the validator refuses').toBeNaN()
    expect(validateBudgetItems([withLineChange(line(), 'rate', undefined)]).errors).toEqual([{ index: 0, kind: 'rate-out-of-range' }])
  })
})

describe('the rate’s read-back (gap 4’s U8, R11): a later year’s cost in today’s dollars, through the run’s own factor', () => {
  it('AE2: a $10,000 line that stays the same dollar amount on a 2026 plan costs about $7,355 in 2036, slower than prices', () => {
    expect(formatMoney(10_000 / PRICES_2026_TO_2036), '[test setup] the hand-worked figure').toBe('7,355')
    expect(rateReadBack(line({ annualAmountReal: 10_000, growthRate: 0 }), 2026)).toBe(slots.budgetRateReadBack('slower', 2036, '7,355', false))
  })

  it('a line going up 5 % a year reads faster than prices; one going up about as fast as prices reads about the same (within 1 %)', () => {
    const faster = formatMoney((10_000 * Math.pow(1.05, 10)) / PRICES_2026_TO_2036)
    expect(rateReadBack(line({ annualAmountReal: 10_000, growthRate: 0.05 }), 2026)).toBe(slots.budgetRateReadBack('faster', 2036, faster, false))
    const near = formatMoney((10_000 * Math.pow(1.031, 10)) / PRICES_2026_TO_2036)
    expect(Math.abs(Math.pow(1.031, 10) / PRICES_2026_TO_2036 - 1), '[test setup] 3.1 % is within 1 % of prices over ten years').toBeLessThan(0.01)
    expect(rateReadBack(line({ annualAmountReal: 10_000, growthRate: 0.031 }), 2026)).toBe(slots.budgetRateReadBack('same', 2036, near, false))
  })

  it('a repeating line says what one would cost; nothing is read back with prices, a blank rate or no amount', () => {
    expect(rateReadBack(line({ annualAmountReal: 10_000, growthRate: 0, everyYears: 5 }), 2026)).toBe(slots.budgetRateReadBack('slower', 2036, '7,355', true))
    expect(rateReadBack(line({ annualAmountReal: 10_000 }), 2026)).toBeNull()
    expect(rateReadBack(line({ annualAmountReal: 10_000, growthRate: Number.NaN }), 2026)).toBeNull()
    expect(rateReadBack(line({ annualAmountReal: 10_000, growthRate: 0.16 }), 2026)).toBeNull()
    expect(rateReadBack(line({ annualAmountReal: Number.NaN, growthRate: 0 }), 2026)).toBeNull()
  })
})

describe('the repeat’s read-back (gap 4’s U8): the years it is charged, in the household’s own years', () => {
  const at2026 = (k: number) => 2026 + k
  it('calendar years on the all-retired route: three, then "and so on" while more follow inside the window', () => {
    expect(repeatReadBack(line({ startYear: 3, everyYears: 5 }), at2026)).toBe(slots.budgetRepeatYears([2029, 2034, 2039], true, true))
    expect(slots.budgetRepeatYears([2029, 2034, 2039], true, true)).toBe('Charged in 2029, 2034, 2039 and so on.')
    expect(repeatReadBack(line({ startYear: 3, endYear: 14, everyYears: 5 }), at2026)).toBe('Charged in 2029, 2034 and 2039.')
    expect(repeatReadBack(line({ startYear: 3, endYear: 18, everyYears: 5 }), at2026), 'a fourth inside the window').toBe('Charged in 2029, 2034, 2039 and so on.')
    expect(repeatReadBack(line({ startYear: 3, endYear: 10, everyYears: 5 }), at2026)).toBe('Charged in 2029 and 2034.')
    expect(repeatReadBack(line({ startYear: 3, endYear: 5, everyYears: 5 }), at2026)).toBe('Charged only in 2029.')
  })

  it('counts from the stop on the date route; nothing without a repeat the validator takes', () => {
    expect(repeatReadBack(line({ startYear: 3, everyYears: 5 }), null)).toBe('Charged in years 3, 8, 13 and so on.')
    expect(repeatReadBack(line({ startYear: 3, endYear: 5, everyYears: 5 }), null)).toBe('Charged only in year 3.')
    expect(repeatReadBack(line(), null)).toBeNull()
    expect(repeatReadBack(line({ everyYears: 1 }), null)).toBeNull()
    expect(repeatReadBack(line({ everyYears: 2.5 }), null)).toBeNull()
  })
})

describe('the readout with a repeat charged in the first year (gap 4’s U8)', () => {
  it('the running total and the split are the first year’s, and the repeat inside them is named; with none, "a year" as before', () => {
    const d = DEV_SEEDS.daterepeat
    const items = d.budget!
    const said = texts(d, items)
    expect(said).toContain(slots.budgetRunningTotalFirstYear('118,000'))
    expect(said).toContain(slots.budgetRepeatInFirstYear('A new car', '40,000', 5, 0))
    expect(said.some((t) => t === slots.budgetRunningTotal('118,000')), 'never "a year" over a first-year repeat').toBe(false)
    const later = items.map((l) => (l.everyYears !== undefined ? { ...l, startYear: 2 } : l))
    expect(texts(d, later).some((t) => t.startsWith('That includes')), 'a repeat that starts later is not in the first year').toBe(false)
    expect(texts(d, later)).toContain(slots.budgetRunningTotal('78,000'))
  })
})
