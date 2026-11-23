/**
 * The rough market (workbench plan U4, KTD3). The pick is re-derived here by an independent closed form over the
 * committed series' own fields, never by a second run of the backtest: with the year's withdrawal taken at its
 * start and the rest grown by the rebalanced factor g = w·(1 + r_stock) + (1 − w)·(1 + r_bond) (`stepYear`'s
 * order), a flat real withdrawal x from a $1 opening leaves Π g − x·Σ_k Π_{j≥k} g after n years, so the highest
 * rate that still ends above $0 is
 *   x* = 1 / Σ_{k=0}^{n−1} 1 / Π_{j<k} g_j
 * (with every g > 0, a path that ends above $0 never touched $0 on the way).
 */
import { describe, expect, it } from 'vitest'
import { SHILLER_1925_1995 } from '@engine/reference/shillerSeries'
import { ROUGH_WINDOW_YEARS, rankRoughWindows, roughFuture, roughMarketScores, roughWindow } from '@engine/reference/roughSequence'
import { shillerJointZSeries } from '@engine/validation/blockBootstrap'
import { productionMarket } from '@engine/reference/methodology'
import { ENGINE_MAX_HORIZON_YEARS } from '@engine/engineDomain'
import { simulate, steadyFuture } from '@engine/simulate'
import { buildCandidateParams } from '@engine/dateSearch'
import { buildDateInput, buildSpineParams } from '@intake/intakeMap'
import { DEV_SEEDS } from '@ui/devSeeds'
import type { NamedFuture, PersonInputs, SimulationParams } from '@shared/model'

/** Each year's rebalanced real growth factor at `w` stocks, from the series' own nominal fields and CPI. */
const growthFactors = (w: number): { year: number; g: number }[] =>
  SHILLER_1925_1995.slice(1).map((y, i) => {
    const inflation = y.cpi / SHILLER_1925_1995[i]!.cpi
    return { year: y.year, g: (w * (1 + y.stockNominal) + (1 - w) * (1 + y.bondNominal)) / inflation }
  })

const closedFormRate = (gs: readonly number[]): number => {
  let pv = 0
  let grown = 1
  for (const g of gs) {
    pv += 1 / grown
    grown *= g
  }
  return 1 / pv
}

const closedFormPick = (w: number) => {
  const years = growthFactors(w)
  let best = { startYear: -1, rate: Number.POSITIVE_INFINITY }
  for (let s = 0; s + ROUGH_WINDOW_YEARS <= years.length; s++) {
    const rate = closedFormRate(years.slice(s, s + ROUGH_WINDOW_YEARS).map((y) => y.g))
    if (rate < best.rate) best = { startYear: years[s]!.year, rate }
  }
  return best
}

describe('the pick', () => {
  it('is the start with the lowest sustainable rate at 50% stocks, matching the closed form', () => {
    const pick = roughWindow()
    const expected = closedFormPick(0.5)
    expect(pick.startYear).toBe(expected.startYear)
    expect(pick.startYear).toBe(1966) // the plan's expectation: the series' last 30-year start
    expect(Math.abs(pick.sustainableRate - expected.rate)).toBeLessThan(1e-9)
  })

  it('finds every window’s rate by bisection to the closed form', () => {
    const years = growthFactors(0.5)
    const ranks = rankRoughWindows(0.5)
    expect(ranks).toHaveLength(years.length - ROUGH_WINDOW_YEARS + 1)
    ranks.forEach((r, s) => {
      expect(r.startYear).toBe(years[s]!.year)
      expect(Math.abs(r.sustainableRate - closedFormRate(years.slice(s, s + ROUGH_WINDOW_YEARS).map((y) => y.g)))).toBeLessThan(1e-9)
    })
  })

  it('every window survives 4%, so the rate is found, not read', () => {
    expect(rankRoughWindows(0.5).every((r) => r.sustainableRate > 0.04)).toBe(true)
  })
})

describe('the scores', () => {
  it('carry one score per year up to the longest horizon, the window’s standardized years first, then steady', () => {
    const { stockZ, bondZ } = roughMarketScores(ENGINE_MAX_HORIZON_YEARS)
    expect(stockZ).toHaveLength(ENGINE_MAX_HORIZON_YEARS)
    expect(bondZ).toHaveLength(ENGINE_MAX_HORIZON_YEARS)
    const joint = shillerJointZSeries()
    const first = joint.findIndex((y) => y.year === 1966)
    for (let t = 0; t < ROUGH_WINDOW_YEARS; t++) {
      expect(stockZ[t]).toBe(joint[first + t]!.zStock)
      expect(bondZ[t]).toBe(joint[first + t]!.zBond)
    }
    expect(stockZ.slice(ROUGH_WINDOW_YEARS).every((z) => z === 0)).toBe(true)
    expect(bondZ.slice(ROUGH_WINDOW_YEARS).every((z) => z === 0)).toBe(true)
  })

  it('take no household input: two households read the same market, each keeping its own steady lifespans', () => {
    const person = (sex: PersonInputs['sex'], currentAge: number): PersonInputs => ({
      sex, currentAge, birthYear: 2026 - currentAge, retirementAge: currentAge, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70,
    })
    const a = { maxHorizonYears: 40, people: [person('male', 62), person('female', 60)], market: productionMarket.value }
    const b = { maxHorizonYears: 40, people: [person('female', 71)], market: productionMarket.value }
    const fa = roughFuture(a)
    const fb = roughFuture(b)
    if (!fa.ok || !fb.ok) throw new Error('refused')
    expect(fa.future.stockZ).toEqual(fb.future.stockZ)
    expect(fa.future.bondZ).toEqual(fb.future.bondZ)
    expect(fa.future.longevityU).toEqual(steadyFuture(a).longevityU)
    expect(fb.future.longevityU).toEqual(steadyFuture(b).longevityU)
  })

  it('refuses a market whose stock-bond correlation is not 0, by name', () => {
    const out = roughFuture({ maxHorizonYears: 30, people: [], market: { ...productionMarket.value, stockBondCorrelation: 0.3 } })
    expect(out.ok).toBe(false)
    expect(!out.ok && out.reason).toMatch(/refuses stockBondCorrelation ≠ 0 \(got 0\.3\)/)
  })
})

describe('the rough path sits below the steady one on every seed (KTD3’s premise)', () => {
  /** Each seed's own stock share, portfolio, people and market, on the spine: no overlay, a flat draw. */
  const seedSpines = (): { key: string; base: SimulationParams }[] =>
    Object.entries(DEV_SEEDS).flatMap(([key, d]) => {
      const spine = buildSpineParams(d)
      const input = spine === null ? buildDateInput(d) : null
      const p = spine ?? (input !== null ? buildCandidateParams(input, 0, 1) : null)
      return p === null ? [] : [{ key, base: p }]
    })

  it('at the seed’s own stock share and 2%, 3% and 4% yearly draws: lower at its lowest and at its last year', () => {
    const seeds = seedSpines()
    expect(seeds.length).toBeGreaterThan(20)
    for (const { key, base } of seeds) {
      for (const rate of [0.02, 0.03, 0.04]) {
        const params: SimulationParams = {
          initialPortfolio: base.initialPortfolio,
          annualSpendingReal: rate * base.initialPortfolio,
          stockWeight: base.stockWeight,
          people: base.people,
          survivorSpendingRatio: base.survivorSpendingRatio,
          drawdownPolicy: 'proportional',
          market: base.market,
          paths: 1,
          maxHorizonYears: ROUGH_WINDOW_YEARS,
          longevityMode: 'fixed-horizon',
        }
        const path = (future: NamedFuture) => {
          const out = simulate(params, 1, { namedFuture: future, bandFan: true })
          if (out.indeterminate || out.infeasible) throw new Error(`${key}: ${JSON.stringify(out)}`)
          return out.distribution.bandFan!.byYear.map((y) => y.p50)
        }
        const rough = roughFuture(params)
        if (!rough.ok) throw new Error(`${key}: ${rough.reason}`)
        const r = path(rough.future)
        const s = path(steadyFuture(params))
        const label = `${key} at ${rate * 100}% and ${Math.round(base.stockWeight * 100)}% stocks`
        expect(Math.min(...r), label).toBeLessThan(Math.min(...s))
        expect(r.at(-1)!, label).toBeLessThan(s.at(-1)!)
      }
    }
  })
})
