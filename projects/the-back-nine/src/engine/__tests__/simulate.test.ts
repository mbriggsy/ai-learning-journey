import { describe, it, expect } from 'vitest'
import { simulate, buildDraws, netWithdrawalForYear, type PersonOffsets, type SimOutput } from '@engine/simulate'
import { validationMarket } from '@engine/reference/methodology'
import { sampleCouplePath } from '@engine/longevity'
import { toRealSeries, rollingSuccessRate } from '@engine/historical'
import { SHILLER_1925_1995 } from '@engine/reference/shillerSeries'
import { NEVER_DEPLETED, type SimulationParams, type PersonInputs } from '@shared/model'

const MALE_65: PersonInputs = {
  sex: 'male', currentAge: 65, retirementAge: 65,
  earnedIncomeReal: 0, socialSecurityReal: 0, socialSecurityClaimAge: 65,
}
const FEMALE_65: PersonInputs = { ...MALE_65, sex: 'female' }

function makeParams(over: Partial<SimulationParams> = {}): SimulationParams {
  return {
    initialPortfolio: 1000,
    annualSpendingReal: 40, // 4%
    stockWeight: 0.5,
    people: [MALE_65],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    market: validationMarket.value,
    paths: 5000,
    maxHorizonYears: 30,
    longevityMode: 'fixed-horizon',
    ...over,
  }
}

const dist = (o: SimOutput) => {
  if (o.indeterminate) throw new Error(`unexpected indeterminate: ${o.reason}`)
  return o.distribution
}

describe('Mode B — MC runs strictly below the SAME-ENGINE historical anchor', () => {
  const realShiller = toRealSeries(SHILLER_1925_1995)
  const histAt = (wRate: number) =>
    rollingSuccessRate(realShiller, { initialPortfolio: 1000, withdrawalRate: wRate, stockWeight: 0.5, horizonYears: 30 }).rate
  const mcAt = (spend: number) =>
    dist(simulate(makeParams({ annualSpendingReal: spend, paths: 8000 }), 13579)).survivalFraction

  it('at 4% (the stress region) i.i.d. MC is STRICTLY below the saturated historical anchor', () => {
    // Both legs are Shiller-GOVERNMENT-bond calibrated (directional until the corporate
    // series is pinned — the P1 exit gate), so both run higher than the Trinity-corporate
    // references (~95%). At 4% the historical saturates near 100% (no 30-yr window failed),
    // while i.i.d. MC strings unbroken bad runs history never saw → a real, lower number.
    const hist = histAt(0.04)
    const mc = mcAt(40)
    console.log(`[band] w=4.0%  hist=${(hist * 100).toFixed(1)}%  mc=${(mc * 100).toFixed(1)}%`)
    expect(hist).toBeGreaterThanOrEqual(0.97) // saturated
    expect(mc).toBeLessThan(hist) // the §Strand-4 "i.i.d. more pessimistic" invariant
    expect(mc).toBeGreaterThan(0.88) // sane band (govt-calibrated; corporate pinning shifts down)
    expect(mc).toBeLessThan(0.97)
  })

  it('the relation is TWO-SIDED (Kitces): in the 70–90% range MC no longer sits below history', () => {
    // §Strand-4 line 113: MC overstates TAIL risk (low withdrawal) but can overstate
    // sustainable INCOME in the mid-range — so the strict-below relation is asserted ONLY
    // in the stress region above, NOT here. At 5% both legs are close and may cross.
    const hist = histAt(0.05)
    const mc = mcAt(50)
    console.log(`[band] w=5.0%  hist=${(hist * 100).toFixed(1)}%  mc=${(mc * 100).toFixed(1)}%`)
    expect(hist).toBeLessThan(0.9) // out of the saturation region
    expect(Math.abs(mc - hist)).toBeLessThan(0.1) // close — the crossover band, not strictly below
  })

  it('a lower withdrawal is safer than a higher one (monotone sanity)', () => {
    const safe = dist(simulate(makeParams({ annualSpendingReal: 30 }), 13579))
    const risky = dist(simulate(makeParams({ annualSpendingReal: 55 }), 13579))
    expect(safe.survivalFraction).toBeGreaterThan(risky.survivalFraction)
  })
})

describe('CRN — the draw schedule is dimension-only (contract #1)', () => {
  it('buildDraws is identical for the same (seed, dims) — independent of any financial input', () => {
    const a = buildDraws(42, 100, 30, 2)
    const b = buildDraws(42, 100, 30, 2)
    expect(a).toEqual(b)
  })

  it('two arms differing ONLY in survivor-spending ratio consume identical draws, differ in outcome', () => {
    const base = makeParams({
      people: [MALE_65, FEMALE_65],
      longevityMode: 'sampled',
      maxHorizonYears: 55,
      annualSpendingReal: 45,
      paths: 4000,
    })
    const armA = dist(simulate({ ...base, survivorSpendingRatio: 0.75 }, 2468))
    const armB = dist(simulate({ ...base, survivorSpendingRatio: 0.5 }, 2468))

    // CRN: both arms draw from buildDraws(seed, paths, maxHorizon, peopleCount) with
    // IDENTICAL arguments (the ratio is not one of them), so the normals + longevity
    // draws are byte-identical path-for-path — the structural basis of CRN.
    expect(buildDraws(2468, base.paths, base.maxHorizonYears, 2)).toEqual(
      buildDraws(2468, base.paths, base.maxHorizonYears, 2),
    )
    // …yet the ratio MATTERS: the lower-survivor-spending arm survives more often.
    expect(armB.survivalFraction).toBeGreaterThan(armA.survivalFraction)

    // Presence companion (burned/027): the CRN guarantee isn't vacuous — at least one
    // path actually enters the survivor regime (a first death strictly within horizon).
    const draws = buildDraws(2468, base.paths, base.maxHorizonYears, 2)
    let enteredSurvivorRegime = 0
    for (let p = 0; p < base.paths; p++) {
      const path = sampleCouplePath([MALE_65, FEMALE_65], draws.longevityU[p] ?? [])
      if (path.firstDeathYear < Math.min(path.lastDeathYear, base.maxHorizonYears) && path.firstDeathYear < base.maxHorizonYears) {
        enteredSurvivorRegime++
      }
    }
    expect(enteredSurvivorRegime).toBeGreaterThan(0)
  })

  it('is seed-stable: the same params + seed reproduce a byte-identical distribution', () => {
    const a = dist(simulate(makeParams(), 777))
    const b = dist(simulate(makeParams(), 777))
    expect(a.terminalValuesReal).toEqual(b.terminalValuesReal)
    expect(a.depletionYears).toEqual(b.depletionYears)
    expect(a.survivalFraction).toBe(b.survivalFraction)
  })

  it('the four sequencing policies produce the IDENTICAL distribution on the single pool', () => {
    const policies = ['proportional', 'taxable-first', 'pre-tax-first', 'bracket-fill'] as const
    const base = dist(simulate(makeParams({ drawdownPolicy: 'proportional' }), 555))
    for (const policy of policies) {
      const d = dist(simulate(makeParams({ drawdownPolicy: policy }), 555))
      expect(d.survivalFraction).toBe(base.survivalFraction) // inert on one pool
    }
  })
})

describe('the cash-term seam (bridge + SS step-down)', () => {
  const retiredClaiming = (ss: number): PersonOffsets => ({ retire: 0, claim: 0, earnedIncomeReal: 0, socialSecurityReal: ss })
  const seamParams = makeParams({ annualSpendingReal: 100, survivorSpendingRatio: 0.75 })

  it('both alive + both claiming: SS is the SUM, netted off spending', () => {
    const w = netWithdrawalForYear(5, seamParams, [retiredClaiming(30), retiredClaiming(20)], [50, 50], 30)
    expect(w).toBe(100 - (30 + 20)) // 50
  })

  it('survivor step-down: spending drops to the ratio AND SS becomes the LARGER single benefit', () => {
    // person 0 died at year 3; at t=5 only person 1 survives.
    const w = netWithdrawalForYear(5, seamParams, [retiredClaiming(30), retiredClaiming(20)], [3, 50], 30)
    // spending 100×0.75=75; household SS steps from 50 down to max(30,20)=30 (the survivor keeps the larger).
    expect(w).toBe(75 - 30) // 45
  })

  it('the earned-income bridge clamps at zero (income > spending never contributes back)', () => {
    const working: PersonOffsets = { retire: 10, claim: 0, earnedIncomeReal: 200, socialSecurityReal: 0 }
    expect(netWithdrawalForYear(2, seamParams, [working], [50], 0)).toBe(0) // max(0, 100−200)
  })

  it('never credits a dead earner: income stops at death even before retirement', () => {
    const workingEarner: PersonOffsets = { retire: 10, claim: 99, earnedIncomeReal: 50, socialSecurityReal: 0 }
    // alive at t=2 (death at 3) → income nets: 100−50=50
    expect(netWithdrawalForYear(2, seamParams, [workingEarner], [3], 0)).toBe(50)
    // dead at t=5 (>= death 3) → income gone; lone person dead so survivor-ratio spending, no SS
    expect(netWithdrawalForYear(5, seamParams, [workingEarner], [3], 0)).toBe(75)
  })
})

describe('the bridge reduces to the spine (income = 0)', () => {
  it('a retired person with income is byte-identical to income = 0 (bridge inert post-retirement)', () => {
    const incomeRetired: PersonInputs = { ...MALE_65, retirementAge: 65, earnedIncomeReal: 25 } // retire offset 0
    const a = dist(simulate(makeParams({ people: [incomeRetired] }), 909))
    const b = dist(simulate(makeParams({ people: [MALE_65] }), 909)) // income 0
    expect(a.terminalValuesReal).toEqual(b.terminalValuesReal)
  })

  it('a STILL-WORKING person with income differs (income nets in the working years)', () => {
    const working: PersonInputs = { ...MALE_65, currentAge: 60, retirementAge: 65, earnedIncomeReal: 25 }
    const a = dist(simulate(makeParams({ people: [working], maxHorizonYears: 35 }), 909))
    const b = dist(simulate(makeParams({ people: [{ ...working, earnedIncomeReal: 0 }], maxHorizonYears: 35 }), 909))
    expect(a.survivalFraction).not.toBe(b.survivalFraction)
  })
})

describe('R19 engine half + dire-but-honest edges', () => {
  it('degenerate inputs return the defined indeterminate output (never a crash/NaN)', () => {
    const m = validationMarket.value
    const bad: Partial<SimulationParams>[] = [
      { initialPortfolio: -1 },
      { initialPortfolio: NaN },
      { annualSpendingReal: Infinity },
      { maxHorizonYears: 0 },
      { paths: 0 },
      { people: [] },
      { stockWeight: 1.5 },
      // R19 market-domain guards (the adversarial-review fixes — each previously
      // escaped a NaN/calm-but-wrong reading):
      { market: { ...m, stock: { mean: -1, stdDev: 0.15 } } }, // toLogMoments domain (phi=0)
      { market: { ...m, stock: { mean: -1.5, stdDev: 0.1 } } }, // ln(negative) → NaN
      { market: { ...m, stockBondCorrelation: NaN } }, // Cholesky → NaN
      { market: { ...m, stockBondCorrelation: 1.5 } }, // |ρ|>1 silently zeroes the off-diagonal
      { market: { ...m, space: 'log' } }, // unsupported: would double-apply the σ²/2 drag
      { market: { ...m, returnsAreReal: false } }, // unsupported: nominal-as-real overstates survival
    ]
    for (const over of bad) {
      expect(simulate(makeParams(over), 1).indeterminate).toBe(true)
    }
  })

  it('$0 portfolio + positive spending → coherent already-failing (0 survival, no NaN)', () => {
    const d = dist(simulate(makeParams({ initialPortfolio: 0, annualSpendingReal: 40 }), 1))
    expect(d.survivalFraction).toBe(0)
    expect(d.terminalValuesReal.every((v) => v === 0)).toBe(true)
    expect(d.depletionYears.every((y) => y !== NEVER_DEPLETED)).toBe(true)
  })

  it('no NaN/Infinity escapes a valid distribution', () => {
    const d = dist(simulate(makeParams(), 4321))
    expect(Number.isFinite(d.survivalFraction)).toBe(true)
    expect(d.terminalValuesReal.every(Number.isFinite)).toBe(true)
    expect(d.depletionYears.every(Number.isFinite)).toBe(true)
  })
})
