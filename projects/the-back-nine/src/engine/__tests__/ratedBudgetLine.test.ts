/**
 * Gap 4's U4 — a budget line that changes at its own rate, priced by the engine (KTD1, KTD6;
 * `docs/plans/features/spending-line-repeat-and-rate-build-spec.md`).
 *
 * The compiled budget carries each rated line as its own track: a route (which of the three profiles its dollars join),
 * its typed amounts by k (years since the stop: its window and repeat) and its price factors by t (the sim year, so a
 * calendar year costs the same whatever stop is tested). The engine adds factor[t] × amount[k] to the route's term, so
 * the survivor share and the floor track treat it as they treat its tier and category today. The year-0 readers (the
 * reconciliation check, the survivor's held share of W) read the typed amount, never a factor.
 *
 * ORACLES (DND 012): every factor below is written by `Math.pow` from the price index's constants or typed by hand; the
 * engine never computes one (intake does, `src/intake/priceFrame.ts`, pinned against the same closed form in
 * `src/intake/__tests__/priceFrame.test.ts`). Every expected dollar is the arithmetic in its comment.
 */
import { describe, it, expect } from 'vitest'
import { cashTermsForYear, simulate, validateParams, workingYearCostForYear } from '@engine/simulate'
import { medicareCostTrend } from '@engine/constants'
import type { PersonOffsets } from '@engine/benefitYear'
import type { BudgetRoute, CompiledBudget, MarketAssumptions, PersonInputs, SimulationParams } from '@shared/model'

const H = 30
const TREND = medicareCostTrend.value

/** A fixed-dollar line's factor on a 2026 plan, by the closed form: 1 ÷ prices' growth from 2026 to 2026 + t. */
function fixedDollarFactor(t: number): number {
  const edge = TREND.anchorYear + TREND.premiums.length
  const calendar = 2026 + t
  const near = Math.max(0, Math.min(calendar, edge) - 2026)
  const ultimate = Math.max(0, calendar - edge)
  return 1 / (Math.pow(1 + TREND.cpiNearTermAvg, near) * Math.pow(1 + TREND.cpiUltimate, ultimate))
}

const zeros = (): number[] => new Array<number>(H).fill(0)
const flat = (v: number): number[] => new Array<number>(H).fill(v)

const track = (route: BudgetRoute, amount: number, factorByT: readonly number[]) => ({
  route,
  amountByK: flat(amount),
  factorByT,
})

const retiree = (over: Partial<PersonInputs> = {}): PersonInputs => ({
  sex: 'male',
  currentAge: 70,
  birthYear: 1956,
  retirementAge: 65,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 65,
  ...over,
})

const market: MarketAssumptions = {
  stock: { mean: 0, stdDev: 0 },
  bond: { mean: 0, stdDev: 0 },
  inflation: { mean: 0, stdDev: 0 },
  stockBondCorrelation: 0,
  space: 'simple',
  returnsAreReal: true,
}

const paramsWith = (budget: CompiledBudget, annualSpendingReal: number, over: Partial<SimulationParams> = {}): SimulationParams => ({
  initialPortfolio: 1_000_000,
  annualSpendingReal,
  stockWeight: 0.5,
  people: [retiree(), retiree({ sex: 'female', currentAge: 68, birthYear: 1958 })],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  market,
  paths: 10,
  maxHorizonYears: H,
  longevityMode: 'fixed-horizon',
  budget,
  ...over,
})

const offsetsOf = (people: readonly PersonInputs[]): PersonOffsets[] =>
  people.map((p) => ({
    retire: p.retirementAge - p.currentAge,
    claim: p.socialSecurityClaimAge - p.currentAge,
    earnedIncomeReal: 0,
    socialSecurityReal: 0,
    spousalExcessAnnual: 0,
  }))

const ALIVE = [50, 50]
const FIRST_GONE_AT_3 = [3, 50]

describe('the per-year join (gap 4’s U4, KTD1 and KTD6)', () => {
  it('AE2 on the all-retired route: a $10,000 fixed-dollar housing line costs 10,000 ÷ (1.032^9 × 1.024) in sim year 10 (calendar 2036)', () => {
    const factors = Array.from({ length: H }, (_, t) => fixedDollarFactor(t))
    const params = paramsWith({ sticky: zeros(), scalableEssentials: zeros(), discretionary: zeros(), rated: [track('sticky', 10_000, factors)] }, 10_000)
    const cash = cashTermsForYear(10, params, offsetsOf(params.people), ALIVE, 0)
    expect(cash.spendingReal).toBeCloseTo(10_000 / (Math.pow(1.032, 9) * 1.024), 9)
    expect(cash.spendingReal).toBe(10_000 * factors[10]!) // the engine multiplies the two it is handed, nothing else
  })

  it('R4: the charge in a sim year is the same whatever stop is tested — at a stop of 0 and of 5, sim year 10 reads factor[10] (k is 10 and 5)', () => {
    const factors = Array.from({ length: H }, (_, t) => fixedDollarFactor(t))
    const budget = { sticky: zeros(), scalableEssentials: zeros(), discretionary: zeros(), rated: [track('sticky', 10_000, factors)] }
    const worker = (retireIn: number): PersonInputs[] => [
      retiree({ currentAge: 57, birthYear: 1969, retirementAge: 57 + retireIn }),
      retiree({ sex: 'female', currentAge: 57, birthYear: 1969, retirementAge: 57 + retireIn }),
    ]
    for (const stop of [0, 5]) {
      const params = paramsWith(budget, 10_000, { people: worker(stop) })
      expect(cashTermsForYear(10, params, offsetsOf(params.people), ALIVE, 0).spendingReal, `stop ${stop}`).toBe(10_000 * factors[10]!)
    }
  })

  it('a rated line adds to the profiles’ own sum: base lines on at k plus factor × amount', () => {
    // Base: housing 30 sticky, food 20 scalable, fun 10 discretionary. Rated: one of each route, amount 4, factor 0.5.
    const half = flat(0.5)
    const budget: CompiledBudget = {
      sticky: flat(30),
      scalableEssentials: flat(20),
      discretionary: flat(10),
      rated: [track('sticky', 4, half), track('scalableEssentials', 4, half), track('discretionary', 4, half)],
    }
    const params = paramsWith(budget, 72)
    const offsets = offsetsOf(params.people)
    // Both alive: 30 + 2 + 20 + 2 + 10 + 2 = 66 full; the floor 30 + 2 + 20 + 2 = 54.
    const both = cashTermsForYear(5, params, offsets, ALIVE, 0)
    expect(both.spendingReal).toBe(66)
    expect(both.essentialsSpendingReal).toBe(54)
    // A survivor year (r = 0.75): the sticky route holds whole, the scalable and discretionary routes scale.
    // Floor: (30 + 2) + 0.75 × (20 + 2) = 32 + 16.5 = 48.5; full: 48.5 + 0.75 × (10 + 2) = 48.5 + 9 = 57.5.
    const survivor = cashTermsForYear(5, params, offsets, FIRST_GONE_AT_3, 0)
    expect(survivor.essentialsSpendingReal).toBe(48.5)
    expect(survivor.spendingReal).toBe(57.5)
  })

  it('a rated essentials line is in the floor track; a rated discretionary line is not', () => {
    const budget: CompiledBudget = { sticky: zeros(), scalableEssentials: zeros(), discretionary: zeros(), rated: [track('discretionary', 8, flat(2))] }
    const cash = cashTermsForYear(4, paramsWith(budget, 8), offsetsOf(paramsWith(budget, 8).people), ALIVE, 0)
    expect(cash.spendingReal).toBe(16)
    expect(cash.essentialsSpendingReal).toBe(0)
    const ess: CompiledBudget = { ...budget, rated: [track('scalableEssentials', 8, flat(2))] }
    expect(cashTermsForYear(4, paramsWith(ess, 8), offsetsOf(paramsWith(ess, 8).people), ALIVE, 0).essentialsSpendingReal).toBe(16)
  })

  it('a rated line’s window rides its amounts by k: a line on in k 2..4 only is charged only there', () => {
    const amountByK = zeros()
    for (const k of [2, 3, 4]) amountByK[k] = 6
    const budget: CompiledBudget = { sticky: flat(1), scalableEssentials: zeros(), discretionary: zeros(), rated: [{ route: 'sticky', amountByK, factorByT: flat(1.5) }] }
    const params = paramsWith(budget, 1)
    const offsets = offsetsOf(params.people)
    expect([1, 2, 4, 5].map((t) => cashTermsForYear(t, params, offsets, ALIVE, 0).spendingReal)).toEqual([1, 10, 10, 1])
  })

  it('simulate charges it on both passes: a $50 sticky line at factor 1.2 is $60 a year, so $1,000 at a 0 % return runs out in year 16 on the full and the floor track alike', () => {
    // 60 × 16 = 960 < 1,000 after year 15; 60 × 17 = 1,020 ≥ 1,000 in year 16. Depletion year 16, every path.
    const budget: CompiledBudget = { sticky: zeros(), scalableEssentials: zeros(), discretionary: zeros(), rated: [track('sticky', 50, flat(1.2))] }
    const out = simulate(paramsWith(budget, 50, { initialPortfolio: 1_000 }), 1)
    if (out.indeterminate || out.infeasible) throw new Error('expected a resolved run')
    expect(out.distribution.depletionYears.every((d) => d === 16)).toBe(true)
    expect(out.distribution.floor!.depletionYears.every((d) => d === 16)).toBe(true)
  })
})

describe('the year-0 readers read the typed amount (KTD6)', () => {
  it('a date-route survivor working year with a rated sticky housing line gives the same W_t as its unrated twin', () => {
    // W = 80,000. Twin A: housing 20,000 in the sticky profile. Twin B: housing 20,000 as a rated sticky track (factor
    // 0.6 in every year, so a factor read would hold 12,000). Both hold s = min(80,000, 20,000) = 20,000 whole:
    // W_t = 20,000 + 0.75 × 60,000 = 65,000.
    const unrated = paramsWith({ sticky: flat(20_000), scalableEssentials: flat(60_000), discretionary: zeros() }, 80_000)
    const rated = paramsWith({ sticky: zeros(), scalableEssentials: flat(60_000), discretionary: zeros(), rated: [track('sticky', 20_000, flat(0.6))] }, 80_000)
    expect(workingYearCostForYear(unrated, 80_000, false)).toBe(65_000)
    expect(workingYearCostForYear(rated, 80_000, false)).toBe(65_000)
    // A rated scalable line is not held: it scales with the rest (s = 0 ⇒ W_t = 0.75 × 80,000 = 60,000).
    const ratedScalable = paramsWith({ sticky: zeros(), scalableEssentials: flat(60_000), discretionary: zeros(), rated: [track('scalableEssentials', 20_000, flat(0.6))] }, 80_000)
    expect(workingYearCostForYear(ratedScalable, 80_000, false)).toBe(60_000)
  })

  it('a plan whose rated line is on at year 0 reconciles at its typed amount, and a scalar that leaves the line out does not', () => {
    // Year-0 total: base 30,000 + the rated line's typed 20,000 = 50,000 (a factor of 0.6 never enters it).
    const budget: CompiledBudget = { sticky: flat(30_000), scalableEssentials: zeros(), discretionary: zeros(), rated: [track('sticky', 20_000, flat(0.6))] }
    expect(validateParams(paramsWith(budget, 50_000))).toBeNull()
    expect(validateParams(paramsWith(budget, 30_000))).toMatch(/does not reconcile/)
    expect(validateParams(paramsWith(budget, 42_000))).toMatch(/does not reconcile/) // 30,000 + 0.6 × 20,000: a factor read
  })
})

describe('validateParams holds the rated tracks to the engine’s domain (R19, fail-loud)', () => {
  const base = (rated: unknown): SimulationParams =>
    paramsWith({ sticky: flat(10), scalableEssentials: zeros(), discretionary: zeros(), rated } as CompiledBudget, 14)
  const good = { route: 'sticky', amountByK: flat(4), factorByT: flat(1) }

  it('accepts a well-formed track', () => {
    expect(validateParams(base([good]))).toBeNull()
  })

  it('refuses an empty list (one OFF shape: the key absent), a route outside the three, and arrays that miss the horizon', () => {
    expect(validateParams(base([]))).toMatch(/rated/)
    expect(validateParams(base([{ ...good, route: 'housing' }]))).toMatch(/rated/)
    expect(validateParams(base([{ ...good, factorByT: flat(1).slice(0, H - 1) }]))).toMatch(/rated/)
    expect(validateParams(base([{ ...good, amountByK: flat(4).slice(0, H - 1) }]))).toMatch(/rated/)
  })

  it('refuses a NaN, infinite or negative factor or amount (NaN first: it passes every relational compare)', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      const factorByT = flat(1)
      factorByT[7] = bad
      expect(validateParams(base([{ ...good, factorByT }])), `factor ${bad}`).toMatch(/rated/)
      const amountByK = flat(4)
      amountByK[0] = bad
      expect(validateParams(base([{ ...good, amountByK }])), `amount ${bad}`).toMatch(/rated/)
    }
  })
})
