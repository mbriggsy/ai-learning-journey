import { describe, it, expect } from 'vitest'
import {
  simulate,
  buildDraws,
  netWithdrawalForYear,
  cashTermsForYear,
  contributionsForYear,
  ongoingIncomeForYear,
  ENGINE_MAX_DOLLAR,
  type PersonOffsets,
  type SimOutput,
} from '@engine/simulate'
import { householdBenefits, realizedClaimAgeAtDeath } from '@engine/socialSecurityBenefit'
import { validationMarket } from '@engine/reference/methodology'
import { sampleCouplePath } from '@engine/longevity'
import { toRealSeries, rollingSuccessRate } from '@engine/historical'
import { SHILLER_1925_1995 } from '@engine/reference/shillerSeries'
import { runTaxAwareDecumulation, type HouseholdYear, type OverlayPerson } from '@engine/taxOverlay'
import { toLogMoments, simpleReturnFromNormal } from '@engine/rng'
import {
  NEVER_DEPLETED,
  type AccumulationParams,
  type IncomeParams,
  type SimulationParams,
  type PersonInputs,
  type OverlayParams,
} from '@shared/model'

const MALE_65: PersonInputs = {
  sex: 'male', currentAge: 65, birthYear: 1961, retirementAge: 65,
  earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 65,
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
  if (o.infeasible) throw new Error(`unexpected infeasible: ${o.reason}`)
  return o.distribution
}

const flatN = (len: number, val: number): number[] => Array.from({ length: len }, () => val)

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
  const retiredClaiming = (ss: number): PersonOffsets => ({ retire: 0, claim: 0, earnedIncomeReal: 0, socialSecurityReal: ss, spousalExcessAnnual: 0 })
  const seamParams = makeParams({ annualSpendingReal: 100, survivorSpendingRatio: 0.75 })

  it('both alive + both claiming: SS is the SUM, netted off spending', () => {
    const w = netWithdrawalForYear(5, seamParams, [retiredClaiming(30), retiredClaiming(20)], [50, 50], 30)
    expect(w).toBe(100 - (30 + 20)) // 50
  })

  it('survivor step-down: the §202 survivor benefit replaces the old max() — the early-widowhood gap is now FILLED (plan §6)', () => {
    // The §6 rewrite target: the old assertion paid the survivor $0 until their OWN claim age. A real
    // 2-person household — deceased (P0) PIA $24k claimed at FRA 67; survivor (P1) age 58, own claim 67.
    // P0 dies at offset 3 (P1 then 61). At t=5 the survivor (age 63) has NOT reached their own claim
    // (offset 9) → the OLD model paid $0; the §202 model pays the age-reduced survivor benefit on P0's
    // record from age 60. survivorStartAge = max(60, 58+3) = 61 → factor 63480/84000 on the deceased's
    // unreduced $24,000 → $18,136.80/yr (hand-derived from the POMS rules — the early-widowhood floor).
    const deceased: PersonInputs = { sex: 'male', currentAge: 65, birthYear: 1961, retirementAge: 65, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 67 }
    const survivor: PersonInputs = { sex: 'female', currentAge: 58, birthYear: 1968, retirementAge: 58, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 67 }
    const p = makeParams({ people: [deceased, survivor], annualSpendingReal: 100_000, survivorSpendingRatio: 0.75 })
    // offsets mirror simulate's pre-loop (own + excess from householdBenefits); higherClaimOffset = the higher PIA's claim.
    const b = householdBenefits([deceased, survivor].map((x) => ({ piaAnnual: x.pia, claimAge: x.socialSecurityClaimAge, birthYear: x.birthYear })))
    const offsets: PersonOffsets[] = [deceased, survivor].map((x, i) => ({
      retire: x.retirementAge - x.currentAge,
      claim: x.socialSecurityClaimAge - x.currentAge,
      earnedIncomeReal: x.earnedIncomeReal,
      socialSecurityReal: b[i]!.ownAnnual,
      spousalExcessAnnual: b[i]!.spousalExcessAnnual,
    }))
    const cash = cashTermsForYear(5, p, offsets, [3, 50], offsets[0]!.claim)
    expect(Math.round(cash.ss * 100), 'the §202 survivor benefit at start-age 61 → $18,136.80/yr (old max() paid $0 pre-own-claim)').toBe(1_813_680)
  })

  it('the earned-income bridge clamps at zero (income > spending never contributes back)', () => {
    const working: PersonOffsets = { retire: 10, claim: 0, earnedIncomeReal: 200, socialSecurityReal: 0, spousalExcessAnnual: 0 }
    expect(netWithdrawalForYear(2, seamParams, [working], [50], 0)).toBe(0) // max(0, 100−200)
  })

  it('never credits a dead earner: income stops at death even before retirement', () => {
    const workingEarner: PersonOffsets = { retire: 10, claim: 99, earnedIncomeReal: 50, socialSecurityReal: 0, spousalExcessAnnual: 0 }
    // alive at t=2 (death at 3) → income nets: 100−50=50
    expect(netWithdrawalForYear(2, seamParams, [workingEarner], [3], 0)).toBe(50)
    // dead at t=5 (>= death 3) → income gone; lone person dead so survivor-ratio spending, no SS
    expect(netWithdrawalForYear(5, seamParams, [workingEarner], [3], 0)).toBe(75)
  })
})

// ===========================================================================
// SS seam — the integration-review goldens (commit 2ec80071 review, plan §6/§7). These pin the
// timing/gating the SEAM owns (what the pure sub-engine cannot see): the deceased's REALIZED claim
// age at an early death, the spousal-excess START/END gates with a NONZERO excess, and the survivor
// max(own, survivor) selection in the OWN-WINS direction. Every expected dollar is HAND-DERIVED from
// the POMS rules (DND/012) — never via householdBenefits/the engine's own formula. Each fixture was
// a structural coverage hole before this review: no prior fixture drove a death-before-claim, a
// nonzero excess through cashTermsForYear, or an own-wins survivor selection.
// ===========================================================================
describe('SS seam — realized-claim survivor base + spousal-excess gating + own-wins (integration-review goldens)', () => {
  // The survivor branch reads `params.people[idx]` (pia/claimAge/birthYear/currentAge), NOT just the
  // offsets — a mismatched `params.people` silently yields ss=0 (the index guard fails; the §202 landmine).
  // So `mk` builds the params with the ALIGNED 2-person people AND the matching offsets/higherClaimOffset.
  // Spend ≫ any SS so `net` is unclamped and `ss` is the only mover under test.
  const mk = (people: readonly PersonInputs[]): { params: SimulationParams; offsets: PersonOffsets[]; higherClaimOffset: number } => {
    const params = makeParams({ people: [...people], annualSpendingReal: 1_000_000, survivorSpendingRatio: 0.75 })
    const b = householdBenefits(people.map((x) => ({ piaAnnual: x.pia, claimAge: x.socialSecurityClaimAge, birthYear: x.birthYear })))
    const offsets: PersonOffsets[] = people.map((x, i) => ({
      retire: x.retirementAge - x.currentAge,
      claim: x.socialSecurityClaimAge - x.currentAge,
      earnedIncomeReal: x.earnedIncomeReal,
      socialSecurityReal: b[i]!.ownAnnual,
      spousalExcessAnnual: b[i]!.spousalExcessAnnual,
    }))
    let hi = 0
    for (let i = 1; i < people.length; i++) if (people[i]!.pia > people[hi]!.pia) hi = i
    return { params, offsets, higherClaimOffset: offsets[hi]!.claim }
  }

  describe('realizedClaimAgeAtDeath — a deceased realizes ONLY the credits they lived to earn (20 CFR §404.313 / RS 00615.301)', () => {
    // The unit's raison d'être is early widowhood; passing the PLANNED claim age verbatim credits DRCs a
    // worker who died before claiming never earned — an OPTIMISTIC overstatement of the survivor floor (the
    // cardinal sin). BY 1961 → retirement FRA 67 (804mo, a whole year ⇒ the floor is EXACT here).
    it('died BEFORE FRA, unfiled → floored at FRA so the base is the FULL PIA (no phantom reduction, no phantom DRC)', () => {
      expect(realizedClaimAgeAtDeath(70, 1961, 66), 'planned 70, died 66 (<FRA) → 67 (=FRA → factor 1.0 → PIA)').toBe(67)
      expect(realizedClaimAgeAtDeath(67, 1961, 66), 'planned 67, died 66 (<FRA) → 67 (PIA, not an early-claim reduction)').toBe(67)
    })
    it('died AFTER FRA but before the planned claim, unfiled → DRCs only THROUGH the age at death, never the later planned age', () => {
      expect(realizedClaimAgeAtDeath(70, 1961, 68), 'planned 70, died 68 → 68 (DRC to 68 = 1.08×, NOT 1.24×)').toBe(68)
      expect(realizedClaimAgeAtDeath(70, 1961, 69), 'planned 70, died 69 → 69').toBe(69)
    })
    it('died AT/AFTER the planned claim → they FILED as planned, realized = planned (DRCs/early-reduction as entered)', () => {
      expect(realizedClaimAgeAtDeath(70, 1961, 71), 'lived past the planned 70 → 70').toBe(70)
      expect(realizedClaimAgeAtDeath(62, 1961, 66), 'claimed early at 62 then died at 66 → 62 (the existing early-claim/RIB-LIM path)').toBe(62)
    })
  })

  it('the survivor base credits ONLY the DRCs the deceased lived to earn (planned-70 claimer dies at 68 → 1.08×PIA base, not 1.24×)', () => {
    // Mirrors the §202 golden above (survivorStartAge 61) but with the deceased dying at 68 — BEFORE their
    // planned claim of 70. Realized claim = 68 ⇒ survivor base = PIA × DRC(12mo) = 24000 × 1.08 = $25,920,
    // age-reduced 63480/84000 → $19,587.60/yr. Passing the PLANNED 70 (the bug) would credit 1.24× → a
    // base of $29,760 → $22,490.40/yr, overstating the early-widowhood floor by $2,902.80/yr (the optimistic sin).
    const deceased: PersonInputs = { sex: 'male', currentAge: 65, birthYear: 1961, retirementAge: 65, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 70 }
    const survivor: PersonInputs = { sex: 'female', currentAge: 58, birthYear: 1968, retirementAge: 58, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 67 }
    const { params, offsets, higherClaimOffset } = mk([deceased, survivor])
    const cash = cashTermsForYear(5, params, offsets, [3, 50], higherClaimOffset) // P0 dies at offset 3 (age 68)
    expect(Math.round(cash.ss * 100), 'realized-claim survivor base → $19,587.60/yr (NOT the planned-70 $22,490.40)').toBe(1_958_760)
  })

  it('the Method-C spousal excess: START gate (higher earner must have filed), per-year add, END gate at first death (no double-count)', () => {
    // A genuine dual-earner couple: higher pia $30k (claim 67), lower pia $6k (claim 62) — excess floors
    // ABOVE 0 (6000 < 0.5×30000). Hand-derived (DND/012): lower own = 6000×0.70 = $4,200; lower excess =
    // (0.5×30000 − 6000)=9000 × 0.65 (spouse 25/36 sched, 60mo early) = $5,850; higher own = $30,000.
    const lower: PersonInputs = { sex: 'female', currentAge: 62, birthYear: 1964, retirementAge: 62, earnedIncomeReal: 0, pia: 6_000, socialSecurityClaimAge: 62 }
    const higher: PersonInputs = { sex: 'male', currentAge: 64, birthYear: 1962, retirementAge: 64, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 67 }
    const { params, offsets, higherClaimOffset } = mk([lower, higher]) // higherClaimOffset = 67−64 = 3
    expect(higherClaimOffset, 'the excess START gate = the higher earner’s claim offset').toBe(3)
    // START gate — t=1: lower has filed (claim offset 0) but the higher earner has NOT (offset 3) → the
    // spousal excess is NOT yet payable (RS 00202.001 worker-must-be-entitled). ss = lower OWN only.
    expect(Math.round(cashTermsForYear(1, params, offsets, [50, 50], higherClaimOffset).ss * 100), 'pre-higher-filing → own only, no excess').toBe(420_000)
    // both filed, both alive — t=3: ss = lower own + lower excess + higher own = 4200 + 5850 + 30000.
    expect(Math.round(cashTermsForYear(3, params, offsets, [50, 50], higherClaimOffset).ss * 100), 'both filed → own + excess + higher own').toBe(4_005_000)
    // END gate — higher (P1) dies at offset 5; at t=6 the lower earner is the survivor. ss = max(own,
    // survivor benefit on the deceased’s record) = max(4200, 30000) = $30,000 — the excess does NOT carry
    // into widowhood (a double-count regression that added it back would read $35,850).
    expect(Math.round(cashTermsForYear(6, params, offsets, [50, 5], higherClaimOffset).ss * 100), 'widowhood → §202 max, NO excess').toBe(3_000_000)
  })

  it('the survivor max(own, survivor) selects OWN when the survivor’s own benefit is the larger (a high earner outliving a low-PIA spouse)', () => {
    // Survivor pia $30k (own at claim 62 = $21,000) outliving a deceased pia $6k (survivor benefit on that
    // record = $6,000 at survivor-FRA) → the max must select the survivor’s OWN $21,000. A regression that
    // returned the survivor stream unconditionally would understate ss to $6,000 (and understate the
    // provisional income fed to the tax overlay — the optimistic-on-the-floor direction).
    const survivor: PersonInputs = { sex: 'female', currentAge: 62, birthYear: 1964, retirementAge: 62, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 62 }
    const deceased: PersonInputs = { sex: 'male', currentAge: 64, birthYear: 1962, retirementAge: 64, earnedIncomeReal: 0, pia: 6_000, socialSecurityClaimAge: 67 }
    const { params, offsets, higherClaimOffset } = mk([survivor, deceased])
    const cash = cashTermsForYear(6, params, offsets, [50, 5], higherClaimOffset) // P1 (deceased) dies at offset 5
    expect(Math.round(cash.ss * 100), 'own $21,000 wins over the $6,000 survivor stream').toBe(2_100_000)
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

describe('SS sub-engine integration — reduce-to-spine + the nonzero-PIA-at-FRA identity bridge (plan §12)', () => {
  it('reduce-to-spine: pia=0 (all persons) yields {own:0, excess:0} ⇒ the cash seam adds nothing, the spine is byte-identical', () => {
    // Two couples that differ ONLY in how "no Social Security" is expressed both reduce to the same
    // distribution: the sub-engine returns ownAnnual:0 / spousalExcessAnnual:0 for pia=0 (the FRA lookup
    // runs on the valid birthYear, then the zero short-circuits the cents math), so nothing is summed.
    const a = dist(simulate(makeParams({ people: [MALE_65, { ...FEMALE_65, currentAge: 63, birthYear: 1963 }], longevityMode: 'sampled', maxHorizonYears: 40 }), 13579))
    const b = dist(simulate(makeParams({ people: [{ ...MALE_65, pia: 0 }, { ...FEMALE_65, currentAge: 63, birthYear: 1963, pia: 0 }], longevityMode: 'sampled', maxHorizonYears: 40 }), 13579))
    expect(a.terminalValuesReal).toEqual(b.terminalValuesReal)
    expect(a.depletionYears).toEqual(b.depletionYears)
    expect(a.survivalFraction).toBe(b.survivalFraction)
  })

  it('identity bridge: own benefit claimed AT FRA 67 = the PIA verbatim (factor 1.0, no excess) — the pre-swap socialSecurityReal=$X equivalence', () => {
    // A nonzero PIA claimed at FRA is the cleanest non-spine identity: factor 1.0 ⇒ the resolved own
    // benefit equals the entered PIA, so a pia=$30k@67 single earner is byte-identical to a legacy
    // flat socialSecurityReal=$30k run (the reduction/credit/excess/survivor branches are all inert).
    const [b] = householdBenefits([{ piaAnnual: 30_000, claimAge: 67, birthYear: 1966 }]) // 1966 → FRA 67
    expect(b!.ownAnnual, 'own at FRA = PIA, no actuarial adjustment').toBe(30_000)
    expect(b!.spousalExcessAnnual, 'a single earner is owed no spousal excess').toBe(0)
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

  it('an incomputable overlay returns the defined indeterminate output (R19), never a crash', () => {
    const P = 1_000_000
    const base = makeParams({ initialPortfolio: P, annualSpendingReal: 40_000 })
    const overlays: OverlayParams[] = [
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P - 1_000, roth: 0 }, filing: 'mfj' }, // buckets ≠ P (≫ the float-dust tolerance)
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: -1, pretax: P + 1, roth: 0 }, filing: 'mfj' }, // negative bucket
      { taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 500_000, pretax: 500_000, roth: 0 }, filing: 'mfj' }, // tax on + taxable>0, basis MISSING
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: NaN, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj' }, // NaN calendar anchor
      { taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', conversions: [NaN] }, // non-finite conversion
      { taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', bracketFillCeilings: [NaN] }, // non-finite ceiling
      { taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', bracketFillCeilings: [-100] }, // negative ceiling
      // Per-person pre-tax split (M6b·B) — guard the new stream like its siblings (insight 008):
      { taxEnabled: false, rmdEnabled: true, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', pretaxByPerson: [P - 1_000] }, // sum ≠ buckets.pretax
      { taxEnabled: false, rmdEnabled: true, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', pretaxByPerson: [NaN] }, // non-finite entry
      { taxEnabled: false, rmdEnabled: true, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', pretaxByPerson: [P / 2, P / 2] }, // length ≠ people (base has 1)
      // U3 healthcare cost streams (M3 Slice 3) — finiteness-FIRST, mirroring `conversions`. The
      // +Infinity case is load-bearing: it is REJECTED here (a real premium has no +Infinity sentinel),
      // the OPPOSITE of a bracket-fill ceiling — a regression that copied the ceiling guard would let it pass.
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', slcsp: [NaN] }, // non-finite SLCSP
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', slcsp: [-1] }, // negative SLCSP
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', slcsp: [Infinity] }, // +Infinity SLCSP — REJECTED (unlike a ceiling)
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', enrolledPremium: [NaN] }, // non-finite enrolled premium
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', enrolledPremium: [-1] }, // negative enrolled premium
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', enrolledPremium: [Infinity] }, // +Infinity enrolled premium — REJECTED
      // U3 · M3 Slice 4 — healthcare is MAGI-driven, so healthcareEnabled with tax OFF is incoherent:
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', healthcareEnabled: true }, // healthcare requires tax
      // a priced enrolled year with NO slcsp benchmark → clean indeterminate (not a mid-path throw):
      { taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', healthcareEnabled: true, enrolledPremium: [15_000], slcsp: [] }, // enrolled>0, slcsp absent → slcsp-coverage gate
      // U3 · M5 — the hsa 4th bucket joins the R19 gate like its siblings (insights 008/010):
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0, hsa: NaN }, filing: 'mfj' }, // NaN hsa → finiteness gate
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0, hsa: -1 }, filing: 'mfj' }, // negative hsa
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0, hsa: 50_000 }, filing: 'mfj' }, // 4-bucket sum = P + 50k ≠ P — hsa is PART of the portfolio total
      // U3 · M5 Slice 2 — the spend-side streams (oopMedical is a real dollar cost: NO +Infinity sentinel):
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', oopMedical: [NaN] }, // non-finite OOP
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', oopMedical: [-1] }, // negative OOP
      { taxEnabled: false, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', oopMedical: [Infinity] }, // +Infinity OOP — REJECTED (would un-cap the qualified spend)
      { taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P - 50_000, roth: 0, hsa: 50_000 }, filing: 'mfj' }, // tax on + hsa > 0, hsaOwnerIndex MISSING → required (burned/062)
      { taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P - 50_000, roth: 0, hsa: 50_000 }, filing: 'mfj', hsaOwnerIndex: -1 }, // out of range
      { taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P - 50_000, roth: 0, hsa: 50_000 }, filing: 'mfj', hsaOwnerIndex: 0.5 }, // non-integer
      { taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P - 50_000, roth: 0, hsa: 50_000 }, filing: 'mfj', hsaOwnerIndex: 5 }, // ≥ people.length
    ]
    for (const overlay of overlays) {
      expect(simulate({ ...base, overlay }, 1).indeterminate).toBe(true)
    }
  })

  it('R19 frontline (M4): a Medicare-enrolled member with a missing / NaN / negative irmaaMagiSeed returns the DEFINED indeterminate output, never a throw', () => {
    // The overlay backstop THROW is proven in taxOverlay.test.ts (the direct-caller path); this pins the
    // OTHER mandated layer of "fail-loud at BOTH layers" — the R19 frontline must convert a missing/non-finite
    // seed into {indeterminate} (a default-0 surcharge would understate cost → overstate survival, burned/062).
    // Both spouses age 65 ⇒ Medicare-enrolled in year 0 ⇒ years 0..lookback-1 REQUIRE the seed.
    const P = 1_000_000
    const base = makeParams({ initialPortfolio: P, annualSpendingReal: 40_000, people: [MALE_65, FEMALE_65] })
    const overlay = (extra: Partial<OverlayParams>): OverlayParams => ({
      taxEnabled: true,
      rmdEnabled: false,
      startCalendarYear: 2026,
      buckets: { taxable: 0, pretax: P, roth: 0 },
      filing: 'mfj',
      healthcareEnabled: true,
      ...extra,
    })
    const reasonOf = (o: OverlayParams): string => {
      const r = simulate({ ...base, overlay: o }, 1)
      expect(r.indeterminate).toBe(true) // the DEFINED output — simulate did NOT throw/crash (R19)
      return r.indeterminate ? r.reason : ''
    }
    expect(reasonOf(overlay({}))).toMatch(/irmaaMagiSeed/) // MISSING seed → the coverage gate (simulate.ts:311-315)
    expect(reasonOf(overlay({ irmaaMagiSeed: [Number.NaN, 60_000] }))).toMatch(/irmaaMagiSeed/) // NaN → finiteness gate (:282)
    expect(reasonOf(overlay({ irmaaMagiSeed: [-1, 60_000] }))).toMatch(/irmaaMagiSeed/) // negative → finiteness gate (:282)
  })

  it('R19 enum + person-field + empty-bucket-basis gaps → indeterminate (U3-exit code-review pilot)', () => {
    // These all arrive over the SAME untyped structured-clone worker boundary the gate exists to defend;
    // each previously slipped to a calm-but-wrong reading or a mid-path throw rather than indeterminate.
    const P = 1_000_000
    const base = makeParams({ initialPortfolio: P, annualSpendingReal: 40_000 })

    // architecture-1 — out-of-union enums. A bad drawdownPolicy would otherwise reach allocateWithdrawal's
    // switch → undefined → TypeError → calm-error; any longevityMode ≠ 'fixed-horizon' would SILENTLY run
    // the sampled survival model (a different answer). Casts simulate the untyped boundary.
    expect(simulate(makeParams({ drawdownPolicy: 'bogus' as unknown as SimulationParams['drawdownPolicy'] }), 1).indeterminate).toBe(true)
    expect(simulate(makeParams({ longevityMode: 'bogus' as unknown as SimulationParams['longevityMode'] }), 1).indeterminate).toBe(true)

    // architecture-2 — a NaN retirementAge/claimAge makes `t < o.retire` / `t >= o.claim` silently false
    // (every NaN compare is false) → the bridge + SS drop → a too-pessimistic calm-but-wrong reading; an
    // out-of-union sex → NaN cohort survival → max longevity. All must be indeterminate, never silent.
    expect(simulate(makeParams({ people: [{ ...MALE_65, retirementAge: NaN }] }), 1).indeterminate).toBe(true)
    expect(simulate(makeParams({ people: [{ ...MALE_65, socialSecurityClaimAge: NaN }] }), 1).indeterminate).toBe(true)
    expect(simulate(makeParams({ people: [{ ...MALE_65, sex: 'other' as unknown as PersonInputs['sex'] }] }), 1).indeterminate).toBe(true)

    // correctness-3 — a NaN initialTaxableBasis with an EMPTY starting taxable bucket previously slipped
    // the `taxable > 0`-gated finiteness check, sat dormant, then poisoned the gross-up once an RMD
    // relocation rebuilt the taxable bucket (a mid-path throw). Finiteness is now unconditional.
    const nanBasisEmptyTaxable: OverlayParams = {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: 2026,
      buckets: { taxable: 0, pretax: P, roth: 0 },
      filing: 'mfj',
      initialTaxableBasis: NaN,
    }
    expect(simulate({ ...base, overlay: nanBasisEmptyTaxable }, 1).indeterminate).toBe(true)
  })

  it("P3·U10 — the custom-order biconditional: 'custom' without an order, an order under a named policy, and a non-permutation each → indeterminate", () => {
    // The wire-side mirror of the codec's persisted biconditional (two-gate rule). Without it,
    // a desynced builder would reach allocateWithdrawal's fail-loud mid-path (a calm-error
    // misattributing the cause) or silently carry an order that does not govern.
    expect(simulate(makeParams({ drawdownPolicy: 'custom' }), 1).indeterminate).toBe(true)
    expect(
      simulate(makeParams({ drawdownPolicy: 'proportional', drawdownOrder: ['roth', 'taxable', 'pretax'] }), 1)
        .indeterminate,
    ).toBe(true)
    const nonPermutations = [
      ['roth', 'taxable'], // short
      ['roth', 'roth', 'taxable'], // duplicated
      ['roth', 'taxable', 'hsa'], // the medical-earmarked bucket can never join the order
      ['roth', 'taxable', 'pretax', 'roth'], // too long
    ]
    for (const order of nonPermutations) {
      expect(
        simulate(
          makeParams({
            drawdownPolicy: 'custom',
            drawdownOrder: order as unknown as SimulationParams['drawdownOrder'],
          }),
          1,
        ).indeterminate,
      ).toBe(true)
    }
    // The VALID pair is accepted — the guard rejects mismatches, never the feature.
    expect(
      simulate(makeParams({ drawdownPolicy: 'custom', drawdownOrder: ['roth', 'taxable', 'pretax'] }), 1)
        .indeterminate,
    ).toBe(false)
  })

  it('a NaN bracket-fill ceiling returns indeterminate, NEVER an uncaught throw (the R19 hole the review found)', () => {
    // With drawdownPolicy 'bracket-fill' + tax ON, a NaN ceiling survives `?? +Infinity`, poisons the
    // allocation, and (absent the validateParams guard) makes the gross-up run all 128 passes and THROW
    // out of simulate. The guard must convert it to the defined indeterminate output. A regression here
    // would surface as a thrown error failing this test, not a quiet false.
    const P = 1_000_000
    const params = makeParams({
      initialPortfolio: P,
      annualSpendingReal: 60_000,
      drawdownPolicy: 'bracket-fill',
      longevityMode: 'fixed-horizon',
      maxHorizonYears: 5,
      paths: 10,
      overlay: { taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', bracketFillCeilings: [NaN, NaN, NaN, NaN, NaN] },
    })
    expect(() => simulate(params, 1)).not.toThrow()
    expect(simulate(params, 1).indeterminate).toBe(true)
  })

  it('more than two people is rejected as indeterminate (the couple model, never a calm-but-wrong 3-adult answer)', () => {
    const third: PersonInputs = { ...MALE_65, currentAge: 60 }
    expect(simulate(makeParams({ people: [MALE_65, FEMALE_65, third] }), 1).indeterminate).toBe(true)
  })

  it('a non-integer seed → indeterminate (U4: the persisted seed carries the bit-identical reproduction contract)', () => {
    // The date route (dateSearch.ts) has rejected non-integer seeds since C3; the headline
    // route silently coerced via mulberry32(seed|0) — and NaN|0 === 0, so a corrupted
    // persisted seed would QUIETLY reproduce a DIFFERENT plan than was saved (the
    // calm-but-wrong vintage of determinism failure). U4 persistence makes the headline
    // seed load-bearing, so the two routes are now aligned on the same reject.
    for (const bad of [NaN, 1.5, Infinity, -Infinity]) {
      const out = simulate(makeParams({}), bad)
      expect(out.indeterminate).toBe(true)
      if (out.indeterminate) expect(out.reason).toContain('seed')
    }
    // The negative arm: a plain integer seed still runs the spine untouched.
    expect(simulate(makeParams({}), 7).indeterminate).toBe(false)
  })
})

// ===========================================================================
// U2 · M6a — the tax-and-accounts overlay wired into the spine. The tax MATH is exhaustively
// golden at the overlay level (taxOverlay.test.ts); these anchor the WIRING: reduce-to-spine
// THROUGH simulate, zero-draw CRN across the survivor MFJ→single transition, faithful per-year
// input assembly across a death, and the birth-year-derived RMD age. Realistic DOLLAR scale
// (P = $1M) — the tax brackets are in real dollars, so the abstract-unit spine scale (P = 1000)
// would leave every draw below the deduction and the tax inert.
// ===========================================================================
describe('U2 overlay wired into simulate (M6a)', () => {
  const COUPLE = makeParams({
    people: [MALE_65, FEMALE_65],
    longevityMode: 'sampled',
    maxHorizonYears: 55,
    annualSpendingReal: 45,
    paths: 4000,
  })
  const offOverlay = (p: SimulationParams): OverlayParams => ({
    taxEnabled: false,
    rmdEnabled: false,
    startCalendarYear: 2026,
    buckets: { taxable: 0, pretax: p.initialPortfolio, roth: 0 },
    filing: 'mfj',
  })

  describe('reduce-to-spine THROUGH simulate: an overlay-ON path under the EXHAUSTIVE OFF condition === the spine', () => {
    it('collapsed single pool + tax off + RMD off + no conversion → byte-identical to the overlay-absent spine (couple, sampled — survivor transitions present)', () => {
      const spineDist = dist(simulate(COUPLE, 2468))
      const withOverlayOff = dist(simulate({ ...COUPLE, overlay: offOverlay(COUPLE) }, 2468))
      expect(withOverlayOff.terminalValuesReal).toEqual(spineDist.terminalValuesReal)
      expect(withOverlayOff.depletionYears).toEqual(spineDist.depletionYears)
      expect(withOverlayOff.survivalFraction).toBe(spineDist.survivalFraction)
    })

    it('a MULTI-bucket split with a non-proportional policy is STILL byte-identical with tax off (the policy is total-neutral)', () => {
      // buckets split across all three (sum = P) + taxable-first: the policy moves WHICH bucket funds
      // each year but never the total trajectory (one shared stepYear), so it reduces to the spine too.
      const split: OverlayParams = {
        taxEnabled: false,
        rmdEnabled: false,
        startCalendarYear: 2026,
        buckets: { taxable: 300, pretax: 500, roth: 200 }, // sums to COUPLE.initialPortfolio = 1000
        filing: 'mfj',
      }
      const spineDist = dist(simulate(COUPLE, 2468))
      const withOverlayOff = dist(simulate({ ...COUPLE, drawdownPolicy: 'taxable-first', overlay: split }, 2468))
      expect(withOverlayOff.terminalValuesReal).toEqual(spineDist.terminalValuesReal)
      expect(withOverlayOff.depletionYears).toEqual(spineDist.depletionYears)
    })

    it('U3 healthcare fields PRESENT but disabled (healthcareEnabled false + populated SLCSP/enrolled streams) → byte-identical to the spine (the permanent healthcare reduce-to-spine contract)', () => {
      // M3 Slice 3 plumbs the U3 streams at the type + R19 gate but NOTHING consumes them yet (Slice 4
      // wires them into the loop). Even with fully-populated cost streams present and the enhanced-table
      // toggle set, healthcareEnabled false MUST be byte-identical to the overlay-absent spine — the
      // permanent contract that the healthcare-OFF path never perturbs the Trinity/Bengen decumulation.
      // (Asserting OFF rather than a stray true keeps the test durable: Slice 4 makes a true MATTER.)
      const withHealthFields: OverlayParams = {
        ...offOverlay(COUPLE),
        healthcareEnabled: false,
        enhancedSubsidies: false,
        slcsp: flatN(55, 12_000),
        enrolledPremium: flatN(55, 15_000),
      }
      const spineDist = dist(simulate(COUPLE, 2468))
      const withHealthOff = dist(simulate({ ...COUPLE, overlay: withHealthFields }, 2468))
      expect(withHealthOff.terminalValuesReal).toEqual(spineDist.terminalValuesReal)
      expect(withHealthOff.depletionYears).toEqual(spineDist.depletionYears)
      expect(withHealthOff.survivalFraction).toBe(spineDist.survivalFraction)
    })
  })

  describe('CRN: two candidates differing ONLY in conversion amount draw identically across the survivor transition', () => {
    const P = 1_000_000
    const crnBase = makeParams({
      people: [MALE_65, FEMALE_65],
      longevityMode: 'sampled',
      maxHorizonYears: 55,
      annualSpendingReal: 45_000,
      initialPortfolio: P,
      paths: 2000,
    })
    const withConv = (conversions: readonly number[]): SimulationParams => ({
      ...crnBase,
      overlay: { taxEnabled: true, rmdEnabled: true, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', conversions },
    })

    it('the draw schedule is dimension-only (conversion is not a buildDraws arg) and the run is deterministic', () => {
      // CRN: buildDraws(seed, paths, maxHorizon, peopleCount) — the conversion amount is NOT one of
      // its arguments, so the normals + longevity draws are byte-identical regardless of conversion.
      expect(buildDraws(2468, crnBase.paths, crnBase.maxHorizonYears, 2)).toEqual(
        buildDraws(2468, crnBase.paths, crnBase.maxHorizonYears, 2),
      )
      const a = dist(simulate(withConv(flatN(55, 30_000)), 2468))
      const b = dist(simulate(withConv(flatN(55, 30_000)), 2468))
      // deterministic + no desync NaN anywhere (a draw desync would scramble per-path returns).
      expect(a.terminalValuesReal).toEqual(b.terminalValuesReal)
      expect(a.terminalValuesReal.every(Number.isFinite)).toBe(true)
    })

    it('the conversion MATTERS (the overlay does tax work) — yet at least one path crosses the survivor transition', () => {
      const noConv = dist(simulate(withConv([]), 2468))
      const conv = dist(simulate(withConv(flatN(55, 50_000)), 2468))
      expect(conv.terminalValuesReal).not.toEqual(noConv.terminalValuesReal)
      // presence companion (burned/027): the "across the MFJ→single transition" claim is non-vacuous.
      const draws = buildDraws(2468, crnBase.paths, crnBase.maxHorizonYears, 2)
      let transitions = 0
      for (let p = 0; p < crnBase.paths; p++) {
        const path = sampleCouplePath([MALE_65, FEMALE_65], draws.longevityU[p] ?? [])
        if (path.firstDeathYear < Math.min(path.lastDeathYear, crnBase.maxHorizonYears) && path.firstDeathYear < crnBase.maxHorizonYears)
          transitions++
      }
      expect(transitions).toBeGreaterThan(0)
    })

    it('the per-path delta is MONOTONE + jitter-free in the conversion amount (a draw desync would oscillate)', () => {
      // Fixed-horizon couple, SHORT horizon, a single year-0 conversion, pre-tax-first (Roth drawn last,
      // so its tax-free-withdrawal benefit cannot fire in-window) → the only effect of a larger conversion
      // is more upfront ordinary tax LEAVING the portfolio. With byte-identical draws the per-path terminal
      // is therefore a clean monotone-decreasing function of the conversion amount; a draw desync (the bug
      // CRN guards against) would scramble per-path returns and break monotonicity.
      const fhBase = makeParams({
        people: [MALE_65, FEMALE_65],
        longevityMode: 'fixed-horizon',
        maxHorizonYears: 3,
        annualSpendingReal: 40_000,
        initialPortfolio: P,
        drawdownPolicy: 'pre-tax-first',
        paths: 300,
      })
      const run = (c: number) =>
        dist(simulate({ ...fhBase, overlay: { taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', conversions: [c] } }, 2468)).terminalValuesReal
      const t0 = run(0)
      const t1 = run(50_000)
      const t2 = run(100_000)
      for (let p = 0; p < t0.length; p++) {
        expect(t1[p]!).toBeLessThanOrEqual(t0[p]!)
        expect(t2[p]!).toBeLessThanOrEqual(t1[p]!)
      }
      // non-vacuous: the conversion genuinely moved the terminal (else monotonicity is trivially true).
      expect(t2[0]!).toBeLessThan(t0[0]!)
    })
  })

  describe('the RMD start age is birth-year-derived THROUGH simulate (SECURE-2.0 bands, never a flat 73)', () => {
    it('a born-1955 cohort’s RMD bites at age 73; a born-1960 cohort’s does not (band 75) → byte-identical to the spine', () => {
      // Single filer, age 73, fixed-horizon 2 years (ages 73–74 — below the born-1960 band 75, so that
      // cohort has NO RMD in-window). Spend below the single deduction stack so the ONLY tax driver is the
      // forced RMD. born-1955 (band 73): RMD ≈ 1M/26.5 ≈ 37.7k forces income above the deduction → tax →
      // strictly below the spine, every path. born-1960 (band 75): no RMD in-window + a sub-deduction draw
      // → 0 tax → byte-identical to the spine. Proves simulate derives birthYear = startCalendarYear − age.
      const P = 1_000_000
      const spend = 12_000 // safely below the single age-65 deduction stack → no tax from the draw itself
      const person: PersonInputs = { ...MALE_65, currentAge: 73, retirementAge: 73 }
      const mk = (startCalendarYear: number): SimulationParams =>
        makeParams({
          initialPortfolio: P,
          annualSpendingReal: spend,
          stockWeight: 0.5,
          people: [person],
          longevityMode: 'fixed-horizon',
          maxHorizonYears: 2,
          paths: 200,
          overlay: { taxEnabled: true, rmdEnabled: true, startCalendarYear, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'single' },
        })
      const spineRun = dist(
        simulate(
          makeParams({ initialPortfolio: P, annualSpendingReal: spend, stockWeight: 0.5, people: [person], longevityMode: 'fixed-horizon', maxHorizonYears: 2, paths: 200 }),
          4321,
        ),
      )
      const born1955 = dist(simulate(mk(2028), 4321)) // 2028 − 73 = born 1955 → band 73
      const born1960 = dist(simulate(mk(2033), 4321)) // 2033 − 73 = born 1960 → band 75
      // born-1960: no RMD in-window + a sub-deduction draw → no tax → byte-identical to the spine.
      expect(born1960.terminalValuesReal).toEqual(spineRun.terminalValuesReal)
      // born-1955: the forced RMD income clears the deduction → tax leaves → strictly below the spine.
      for (let p = 0; p < spineRun.terminalValuesReal.length; p++) {
        expect(born1955.terminalValuesReal[p]!).toBeLessThan(spineRun.terminalValuesReal[p]!)
      }
    })
  })

  describe('bracket-fill is wired through simulate (the OverlayParams.bracketFillCeilings passthrough)', () => {
    it('a sub-deduction ceiling fills cheap pre-tax then draws Roth tax-free → higher terminal than pre-tax-first', () => {
      // {pretax 1M, roth 1M} = $2M, both 67 (no RMD/SS), fixed-horizon 5y, $100k spend. The $35k ceiling is
      // below the MFJ deduction stack in EVERY year — 47,500 in-window AND 35,500 post-sunset (2029–30;
      // the sunset unit — the old $40k was sub-deduction only while the senior bonus priced) — so
      // bracket-fill pays $0 tax (cheap pre-tax + tax-free Roth) and ends at the spine; pre-tax-first
      // leaks tax. Proves the ceiling stream reaches the overlay through simulate.
      const P = 2_000_000
      const base = makeParams({
        initialPortfolio: P,
        annualSpendingReal: 100_000,
        stockWeight: 0.5,
        people: [{ ...MALE_65, currentAge: 67, retirementAge: 67 }, { ...FEMALE_65, currentAge: 67, retirementAge: 67 }],
        longevityMode: 'fixed-horizon',
        maxHorizonYears: 5,
        paths: 200,
      })
      const overlay = (taxEnabled: boolean): OverlayParams => ({ taxEnabled, rmdEnabled: false, startCalendarYear: 2026, buckets: { taxable: 0, pretax: 1_000_000, roth: 1_000_000 }, filing: 'mfj' })
      const spineRun = dist(simulate(base, 4321))
      const bracketFill = dist(simulate({ ...base, drawdownPolicy: 'bracket-fill', overlay: { ...overlay(true), bracketFillCeilings: flatN(5, 35_000) } }, 4321))
      const preTaxFirst = dist(simulate({ ...base, drawdownPolicy: 'pre-tax-first', overlay: overlay(true) }, 4321))
      // bracket-fill pays $0 tax (sub-deduction ceiling) → byte-identical to the spine, every path...
      expect(bracketFill.terminalValuesReal).toEqual(spineRun.terminalValuesReal)
      // ...and strictly above pre-tax-first, which leaks tax on the full pre-tax draw.
      for (let p = 0; p < spineRun.terminalValuesReal.length; p++) {
        expect(bracketFill.terminalValuesReal[p]!).toBeGreaterThan(preTaxFirst.terminalValuesReal[p]!)
      }
    })
  })

  describe('faithful input assembly: a 1-path overlay run === a direct overlay call on the reconstructed inputs (across a survivor transition)', () => {
    it('the survivor MFJ→single flip + SS step-down + conversion stream are all assembled correctly through simulate', () => {
      // 1 path, sampled longevity, an old couple so a first death lands within the horizon. Reconstruct
      // EXACTLY what simulate feeds the overlay — the seeded returns, the death-driven withdrawals + SS
      // step-down (via the SAME cashTermsForYear seam), the survivor householdYears, and the conversion
      // stream — call runTaxAwareDecumulation directly, and assert simulate's terminal/depletion match.
      // The tax MATH is the overlay's golden fixtures; this pins simulate's ASSEMBLY of the overlay
      // inputs across the MFJ→single transition (a wiring bug — wrong householdYears order, SS not
      // stepped down, off-by-one stream, wrong bucket/config — diverges here).
      const P = 1_000_000
      const startCalendarYear = 2026
      const seed = 909
      const MALE_75: PersonInputs = { sex: 'male', currentAge: 75, birthYear: 1951, retirementAge: 75, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 70 }
      const FEMALE_72: PersonInputs = { sex: 'female', currentAge: 72, birthYear: 1954, retirementAge: 72, earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 70 }
      const people = [MALE_75, FEMALE_72]
      const conversions = flatN(40, 25_000)
      const params = makeParams({
        initialPortfolio: P,
        annualSpendingReal: 60_000,
        stockWeight: 0.5,
        people,
        longevityMode: 'sampled',
        maxHorizonYears: 40,
        paths: 1,
        drawdownPolicy: 'pre-tax-first',
        overlay: { taxEnabled: true, rmdEnabled: true, startCalendarYear, buckets: { taxable: 0, pretax: P, roth: 0 }, filing: 'mfj', conversions },
      })

      // --- Reconstruct simulate's single-path overlay inputs from the public engine primitives ---
      const draws = buildDraws(seed, 1, params.maxHorizonYears, 2)
      const longevityPeople = people.map((p) => ({ sex: p.sex, currentAge: p.currentAge }))
      const path = sampleCouplePath(longevityPeople, draws.longevityU[0] ?? [])
      const deathOffsets = [...path.deathYearOffsets]
      const horizon = Math.min(path.lastDeathYear, params.maxHorizonYears)
      expect(path.firstDeathYear).toBeLessThan(horizon) // non-vacuous: the flip actually happens

      const benefits = householdBenefits(people.map((p) => ({ piaAnnual: p.pia, claimAge: p.socialSecurityClaimAge, birthYear: p.birthYear })))
      const offsets: PersonOffsets[] = people.map((p, i) => ({
        retire: p.retirementAge - p.currentAge,
        claim: p.socialSecurityClaimAge - p.currentAge,
        earnedIncomeReal: p.earnedIncomeReal,
        socialSecurityReal: benefits[i]!.ownAnnual,
        spousalExcessAnnual: benefits[i]!.spousalExcessAnnual,
      }))
      let higherIdx = 0
      for (let i = 1; i < people.length; i++) if (people[i]!.pia > people[higherIdx]!.pia) higherIdx = i
      const higherClaimOffset = offsets[higherIdx]!.claim
      const logStock = toLogMoments(params.market.stock.mean, params.market.stock.stdDev)
      const logBond = toLogMoments(params.market.bond.mean, params.market.bond.stdDev)
      const rho = params.market.stockBondCorrelation
      const sqrt1mRho2 = Math.sqrt(Math.max(0, 1 - rho * rho))
      const overlayPeople: OverlayPerson[] = people.map((p) => ({ birthYear: startCalendarYear - p.currentAge }))

      const realStock: number[] = []
      const realBond: number[] = []
      const withdrawals: number[] = []
      const ssBenefits: number[] = []
      const householdYears: HouseholdYear[] = []
      const sRow = draws.stockZ[0] ?? []
      const bRow = draws.bondZ[0] ?? []
      for (let t = 0; t < horizon; t++) {
        const zs = sRow[t]
        const zbRaw = bRow[t]
        if (zs === undefined || zbRaw === undefined) break
        const zb = rho * zs + sqrt1mRho2 * zbRaw
        realStock.push(simpleReturnFromNormal(logStock, zs))
        realBond.push(simpleReturnFromNormal(logBond, zb))
        const cash = cashTermsForYear(t, params, offsets, deathOffsets, higherClaimOffset)
        withdrawals.push(cash.net)
        ssBenefits.push(cash.ss)
        const living: OverlayPerson[] = []
        for (let i = 0; i < overlayPeople.length; i++) {
          const op = overlayPeople[i]
          if (op !== undefined && t < (deathOffsets[i] ?? 0)) living.push(op)
        }
        householdYears.push({ living })
      }
      // Independent cross-check that the regime genuinely flips MFJ→single at the first death.
      expect(householdYears[0]!.living.length).toBe(2) // both alive at t=0 → MFJ
      expect(householdYears[horizon - 1]!.living.length).toBe(1) // a lone survivor at the last year → single

      const ref = runTaxAwareDecumulation(
        { taxable: 0, pretax: P, roth: 0 },
        realStock,
        realBond,
        withdrawals,
        params.stockWeight,
        'pre-tax-first',
        { taxEnabled: true, rmdEnabled: true, household: { startCalendarYear, filing: 'mfj', owner: overlayPeople[0]!, spouse: overlayPeople[1]! } },
        { ssBenefits, conversions, householdYears },
      )
      const sim = dist(simulate(params, seed))
      expect(sim.terminalValuesReal[0]!).toBe(ref.terminalReal)
      expect(sim.depletionYears[0]!).toBe(ref.depletionYear)
    })
  })
})

// ===========================================================================
// U2 · M6b·B — per-person pre-tax splitting wired through simulate (OverlayParams.pretaxByPerson).
// ===========================================================================
describe('U2 per-person pre-tax splitting wired into simulate (M6b·B)', () => {
  // An age-gapped couple, both already retired, a large pre-tax pool so RMDs bite. Fixed-horizon
  // (no deaths) isolates the per-person RMD-deferral effect from the survivor transition.
  const P = 2_000_000
  const older: PersonInputs = { ...MALE_65, currentAge: 78, retirementAge: 78 } // born 1948, RMD active
  const younger: PersonInputs = { ...FEMALE_65, currentAge: 68, retirementAge: 68 } // born 1958, RMD age 73 → mid-horizon
  const base = makeParams({
    people: [older, younger],
    initialPortfolio: P,
    annualSpendingReal: 40_000,
    stockWeight: 0.5,
    longevityMode: 'fixed-horizon',
    maxHorizonYears: 10,
    paths: 200,
  })
  const aggOverlay: OverlayParams = {
    taxEnabled: true,
    rmdEnabled: true,
    startCalendarYear: 2026,
    buckets: { taxable: 0, pretax: P, roth: 0 },
    filing: 'mfj',
  }
  const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

  it('all-on-owner per-person split is byte-identical to the aggregate pool THROUGH simulate', () => {
    const agg = dist(simulate({ ...base, drawdownPolicy: 'pre-tax-first', overlay: aggOverlay }, 2468))
    const allOwner = dist(
      simulate({ ...base, drawdownPolicy: 'pre-tax-first', overlay: { ...aggOverlay, pretaxByPerson: [P, 0] } }, 2468),
    )
    expect(allOwner.terminalValuesReal).toEqual(agg.terminalValuesReal)
    expect(allOwner.depletionYears).toEqual(agg.depletionYears)
  })

  it('splitting the pool per-person defers the younger spouse’s RMD → less early tax → a higher distribution', () => {
    const agg = dist(simulate({ ...base, drawdownPolicy: 'pre-tax-first', overlay: aggOverlay }, 2468))
    const split = dist(
      simulate(
        { ...base, drawdownPolicy: 'pre-tax-first', overlay: { ...aggOverlay, pretaxByPerson: [P / 2, P / 2] } },
        2468,
      ),
    )
    // The aggregate over-forces the whole $2M on the 78-yr-old's age from year 0; the per-person split
    // forces only the older spouse's $1M until the younger reaches 73 — less early ordinary income, so
    // less tax leaves the portfolio. Under one shared seed (CRN) the split run ends materially richer.
    expect(split.terminalValuesReal).not.toEqual(agg.terminalValuesReal)
    expect(mean(split.terminalValuesReal)).toBeGreaterThan(mean(agg.terminalValuesReal))
  })
})

// ===========================================================================
// U3 · M3 Slice 4 — the pre-65 ACA overlay wired THROUGH simulate. The overlay-level wiring (the
// outer ACA fixed point, the age gate, the fail-loud backstops) is golden in taxOverlay.test.ts;
// this anchors the END-TO-END path: simulate assembles the per-path householdYears + threads the
// health streams, so a pre-65 couple's premiums move the headline distribution, and healthcare-off
// stays byte-identical to the spine (the Slice-3 reduce-to-spine test, still green with consumption live).
// ===========================================================================
describe('U3 healthcare overlay wired into simulate (M3 Slice 4)', () => {
  // A pre-65 couple (age 60), fixed-horizon 3 years (ages 60–62, under 65 every year ⇒ the age gate
  // is OPEN), tax on, no RMD. A pretax-only pool drawn pre-tax-first keeps MAGI under the 400% cliff.
  const P = 1_000_000
  const pre65m: PersonInputs = { ...MALE_65, currentAge: 60, retirementAge: 60 }
  const pre65f: PersonInputs = { ...FEMALE_65, currentAge: 60, retirementAge: 60 }
  const base = makeParams({
    initialPortfolio: P,
    annualSpendingReal: 40_000,
    people: [pre65m, pre65f],
    longevityMode: 'fixed-horizon',
    maxHorizonYears: 3,
    paths: 100,
    drawdownPolicy: 'pre-tax-first',
  })
  const overlayBase: OverlayParams = {
    taxEnabled: true,
    rmdEnabled: false,
    startCalendarYear: 2026,
    buckets: { taxable: 0, pretax: P, roth: 0 },
    filing: 'mfj',
  }

  it('healthcare ON prices ACA premiums that leave the portfolio → every path ends strictly below healthcare OFF', () => {
    const on = dist(
      simulate(
        { ...base, overlay: { ...overlayBase, healthcareEnabled: true, slcsp: flatN(3, 15_000), enrolledPremium: flatN(3, 15_000) } },
        2468,
      ),
    )
    const off = dist(simulate({ ...base, overlay: overlayBase }, 2468))
    // CRN: same seed, same dimensions → the ONLY difference is the ACA premium cost. Non-vacuous +
    // directional: every path's terminal drops (the net premium + its tax gross-up left the portfolio).
    expect(on.terminalValuesReal).not.toEqual(off.terminalValuesReal)
    for (let p = 0; p < on.terminalValuesReal.length; p++) {
      expect(on.terminalValuesReal[p]!).toBeLessThan(off.terminalValuesReal[p]!)
    }
  })

  it('the AGE GATE through simulate: an all-≥65 couple gets NO ACA subsidy, but M4 IRMAA now prices the post-65 cost (the handoff at 65)', () => {
    // The same scenario aged past 65 (currentAge 70 → ages 70–72): every member is ≥65, so the ACA age
    // gate suppresses any PTC — but M4's IRMAA now funds the post-65 Medicare cost instead, so the run is
    // NO LONGER byte-identical to healthcare-off (the income-aware curve is continuous across 65). A
    // pre-sim IRMAA-MAGI seed is required because both spouses are Medicare-enrolled in years 0..1.
    const post = makeParams({
      ...base,
      people: [{ ...MALE_65, currentAge: 70, retirementAge: 70 }, { ...FEMALE_65, currentAge: 70, retirementAge: 70 }],
    })
    const on = dist(
      simulate(
        { ...post, overlay: { ...overlayBase, healthcareEnabled: true, slcsp: flatN(3, 15_000), enrolledPremium: flatN(3, 15_000), irmaaMagiSeed: [60_000, 60_000] } },
        2468,
      ),
    )
    const off = dist(simulate({ ...post, overlay: overlayBase }, 2468))
    // ACA never fired (no pre-65 member), but IRMAA's Medicare cost left the portfolio on every path.
    expect(on.terminalValuesReal).not.toEqual(off.terminalValuesReal)
    for (let p = 0; p < on.terminalValuesReal.length; p++) {
      expect(on.terminalValuesReal[p]!).toBeLessThan(off.terminalValuesReal[p]!)
    }
  })

  describe('M3 Slice 5 — CRN stability across the ACA wiring (the healthcare branch draws ZERO)', () => {
    // The ACA outer fixed point + the cliff branch are pure cash-term transforms (zero draws), so two
    // candidates differing only in a CONTROL — here the Roth conversion, which moves ACA-MAGI and can
    // cross the 400% cliff — must still draw normals identical path-for-path WITH healthcare ON. Proof:
    // (1) buildDraws is dimension-only (conversion/healthcare are not its args); (2) a same-input run
    // repeats byte-identically with no desync NaN; (3) the per-path terminal is a clean MONOTONE
    // function of the conversion — a draw desync (the bug CRN guards against) would scramble per-path
    // returns and break monotonicity. (The pure ACA solve is golden in taxOverlay.test.ts Slice 5.)
    const withConv = (conversions: readonly number[]): SimulationParams => ({
      ...base,
      overlay: {
        ...overlayBase,
        healthcareEnabled: true,
        slcsp: flatN(3, 15_000),
        enrolledPremium: flatN(3, 15_000),
        conversions,
      },
    })

    it('a healthcare-ON run is deterministic + finite, and the draw schedule is dimension-only (no desync)', () => {
      expect(buildDraws(2468, base.paths, base.maxHorizonYears, 2)).toEqual(
        buildDraws(2468, base.paths, base.maxHorizonYears, 2),
      )
      const a = dist(simulate(withConv(flatN(3, 20_000)), 2468))
      const b = dist(simulate(withConv(flatN(3, 20_000)), 2468))
      expect(a.terminalValuesReal).toEqual(b.terminalValuesReal)
      expect(a.terminalValuesReal.every(Number.isFinite)).toBe(true)
    })

    it('two conversion candidates draw identically: the per-path terminal is monotone (jitter-free) in the conversion — including across the cliff', () => {
      // conv 0 → MAGI ≈ 45k (under cliff, PTC applies); 20k → ≈ 65k (still under); 40k → ≈ 85k (OVER the
      // cliff, PTC lost). Each step removes more grossed-up tax (and, at the crossing, the whole subsidy)
      // → strictly less terminal on EVERY path. Shared draws make that monotone; a desync would oscillate.
      const t0 = dist(simulate(withConv(flatN(3, 0)), 2468)).terminalValuesReal
      const t1 = dist(simulate(withConv(flatN(3, 20_000)), 2468)).terminalValuesReal
      const t2 = dist(simulate(withConv(flatN(3, 40_000)), 2468)).terminalValuesReal
      for (let p = 0; p < t0.length; p++) {
        expect(t1[p]!).toBeLessThanOrEqual(t0[p]!)
        expect(t2[p]!).toBeLessThanOrEqual(t1[p]!)
      }
      // non-vacuous: the conversion genuinely moved the terminal (else monotonicity is trivially true).
      expect(t2[0]!).toBeLessThan(t0[0]!)
    })
  })
})

// ===========================================================================
// U3 · M5 — the HSA spend side wired THROUGH simulate. The mechanics are golden
// at the overlay level (taxOverlay.test.ts M5 slices); this anchors the
// END-TO-END path: simulate threads oopMedical/hsaOwnerIndex, the spend moves
// the headline distribution, and the cap-only/absent defaults stay byte-identical.
// ===========================================================================
describe('U3 · M5 HSA spend wired into simulate', () => {
  const P = 1_000_000
  const H = 80_000
  const pre65m: PersonInputs = { ...MALE_65, currentAge: 60, retirementAge: 60 }
  const pre65f: PersonInputs = { ...FEMALE_65, currentAge: 60, retirementAge: 60 }
  const base = makeParams({
    initialPortfolio: P,
    annualSpendingReal: 60_000,
    people: [pre65m, pre65f],
    longevityMode: 'fixed-horizon',
    maxHorizonYears: 3,
    paths: 100,
    drawdownPolicy: 'pre-tax-first',
  })
  const hsaOverlay: OverlayParams = {
    taxEnabled: true,
    rmdEnabled: false,
    startCalendarYear: 2026,
    buckets: { taxable: 0, pretax: P - H, roth: 0, hsa: H },
    filing: 'mfj',
    hsaOwnerIndex: 0,
  }

  it('an OOP stream paid by the HSA lifts EVERY path (less gross-up drag, same seed) — presence through the wire', () => {
    // With oopMedical: each year min(hsa, 10k, need) of the SAME spending is HSA-funded ⇒ the
    // taxable withdrawal (and its tax) shrinks ⇒ total outflow strictly drops ⇒ every path ends
    // higher. Without it the hsa just rides. CRN: same seed + dims ⇒ path-for-path comparable.
    const withOop = dist(simulate({ ...base, overlay: { ...hsaOverlay, oopMedical: [10_000, 10_000, 10_000] } }, 2468))
    const without = dist(simulate({ ...base, overlay: hsaOverlay }, 2468))
    expect(withOop.terminalValuesReal).not.toEqual(without.terminalValuesReal)
    for (let p = 0; p < withOop.terminalValuesReal.length; p++) {
      expect(withOop.terminalValuesReal[p]!).toBeGreaterThan(without.terminalValuesReal[p]!)
    }
  })

  it('cap-only THROUGH the wire: at hsa = 0 an OOP stream changes NOTHING (byte-identical distribution)', () => {
    const zeroHsa: OverlayParams = { ...hsaOverlay, buckets: { taxable: 0, pretax: P, roth: 0, hsa: 0 } }
    const { hsaOwnerIndex: _unused, ...zeroHsaNoOwner } = zeroHsa
    const withOop = dist(simulate({ ...base, overlay: { ...zeroHsaNoOwner, oopMedical: [10_000, 10_000, 10_000] } }, 2468))
    const without = dist(simulate({ ...base, overlay: zeroHsaNoOwner }, 2468))
    expect(withOop.terminalValuesReal).toEqual(without.terminalValuesReal) // byte-identical — the stream sizes a cap, never the need
    expect(withOop.depletionYears).toEqual(without.depletionYears)
  })

  it('CRN across the HSA wiring: deterministic repeat, dimension-only draws, and per-path monotone in the OOP cap', () => {
    // The qualified spend is a zero-draw cash transform: two candidates differing only in oopMedical
    // share every draw. More HSA-payable OOP (same spending) ⇒ weakly higher terminal on EVERY path;
    // a draw desync would scramble returns and break the per-path monotonicity.
    const withOop = (oop: number) =>
      dist(simulate({ ...base, overlay: { ...hsaOverlay, oopMedical: [oop, oop, oop] } }, 2468)).terminalValuesReal
    const a = withOop(5_000)
    const b = withOop(5_000)
    expect(a).toEqual(b) // deterministic repeat — no desync
    const t0 = withOop(0)
    const t1 = withOop(5_000)
    const t2 = withOop(12_000)
    for (let p = 0; p < t0.length; p++) {
      expect(t1[p]!).toBeGreaterThanOrEqual(t0[p]!)
      expect(t2[p]!).toBeGreaterThanOrEqual(t1[p]!)
    }
    expect(t2[0]!).toBeGreaterThan(t0[0]!) // non-vacuous: the cap genuinely moved the terminal
  })
})

// The M5 boundary review: the hsaOwnerIndex pass-through was never exercised with a value the
// answer DEPENDS on — a hardcode-0 mutation in the taxInputs spread survived green (insight 015).
describe('U3 · M5 — the hsaOwnerIndex wire pass-through is answer-bearing', () => {
  it('an age-gap couple: owner 1 (the 67yo) opens the Medicare-premium privilege; owner 0 (the 60yo) does not — through the FULL simulate wire', () => {
    const P = 1_000_000
    const H = 80_000
    const m60: PersonInputs = { ...MALE_65, currentAge: 60, retirementAge: 60 }
    const f67: PersonInputs = { ...FEMALE_65, currentAge: 67, retirementAge: 67 }
    const base = makeParams({
      initialPortfolio: P,
      annualSpendingReal: 60_000,
      people: [m60, f67],
      longevityMode: 'fixed-horizon',
      maxHorizonYears: 2,
      paths: 50,
      drawdownPolicy: 'pre-tax-first',
    })
    const overlay = (hsaOwnerIndex: number): OverlayParams => ({
      taxEnabled: true,
      rmdEnabled: false,
      startCalendarYear: 2026,
      buckets: { taxable: 0, pretax: P - H, roth: 0, hsa: H },
      filing: 'mfj',
      healthcareEnabled: true,
      irmaaMagiSeed: [60_000, 60_000], // f67 is Medicare-enrolled in years 0,1
      hsaOwnerIndex,
    })
    const owner1 = dist(simulate({ ...base, overlay: overlay(1) }, 2468)) // the 67yo owns the HSA — privilege OPEN
    const owner0 = dist(simulate({ ...base, overlay: overlay(0) }, 2468)) // the 60yo owns it — privilege CLOSED
    // Same seed + dims (CRN): the ONLY difference is WHOSE age keys the privilege. With the
    // privilege open the Medicare premium is HSA-paid (no gross-up drag) ⇒ every path ends higher.
    // A hardcoded index anywhere in the wire makes these byte-identical — and fails here.
    expect(owner1.terminalValuesReal).not.toEqual(owner0.terminalValuesReal)
    for (let p = 0; p < owner1.terminalValuesReal.length; p++) {
      expect(owner1.terminalValuesReal[p]!).toBeGreaterThanOrEqual(owner0.terminalValuesReal[p]!)
    }
    expect(owner1.terminalValuesReal[0]!).toBeGreaterThan(owner0.terminalValuesReal[0]!) // non-vacuous
  })
})

// ===========================================================================
// C2 — the accumulation construct: the §7 working-year clamp (presence-gated,
// death-aware), the per-path contribution assembly seam, byte-identity, CRN,
// and the R19 gates. Decision record: docs/decisions/accumulation-fuck-off-date.md §1/§2/§7.
// ===========================================================================

/** An EXHAUSTIVE-OFF overlay (single taxable pool, tax/RMD off) carrying an optional
 *  accumulation construct — the minimal vehicle for the §7 clamp + presence-gate tests. */
const offOverlayWith = (portfolio: number, accumulation?: AccumulationParams): OverlayParams => ({
  taxEnabled: false,
  rmdEnabled: false,
  startCalendarYear: 2026,
  buckets: { taxable: portfolio, pretax: 0, roth: 0 },
  filing: 'mfj',
  ...(accumulation ? { accumulation } : {}),
})

describe('C2 §7 — the working-year zero-withdrawal clamp (presence-gated, death-aware)', () => {
  const seamParams = makeParams({ annualSpendingReal: 100, survivorSpendingRatio: 0.75 })
  /** The same params with a ZERO-VALUED construct: presence alone must flip the clamp (§1). */
  const constructed = (people = 1): SimulationParams => ({
    ...seamParams,
    overlay: offOverlayWith(
      seamParams.initialPortfolio,
      { contributionsByPerson: Array.from({ length: people }, () => ({})) },
    ),
  })
  const working: PersonOffsets = { retire: 10, claim: 99, earnedIncomeReal: 50, socialSecurityReal: 0, spousalExcessAnnual: 0 }

  it('a working year with a living worker draws ZERO — even when spending exceeds salary + SS', () => {
    // Construct ABSENT: spending 100 − earned 50 = 50. Construct PRESENT (zero-valued!): the
    // household lives on salary — net 0, no contribute-and-draw double-count. The VALUE of the
    // contribution never enters the predicate (presence-keyed, §1).
    expect(netWithdrawalForYear(2, seamParams, [working], [50], 0)).toBe(50)
    expect(netWithdrawalForYear(2, constructed(), [working], [50], 0)).toBe(0)
  })

  it('SURVIVOR-DRAW arm: once the sole living worker dies, the clamp stops and the survivor draws normally', () => {
    // Person dies at 3; at t=5 there is NO living worker, so the survivor cash semantics run
    // verbatim: survivor-ratio spending 75, no SS → net 75 (the shipped dead-earner seam value).
    // A planted death-blind `t < retire` clamp would return 0 here — flipping the engine's
    // deliberately-conservative survivor paths maximally optimistic (the §7 cardinal hazard).
    expect(netWithdrawalForYear(5, constructed(), [working], [3], 0)).toBe(75)
  })

  it('a COUPLE stays clamped while ANY living worker remains (the surviving worker covers the household)', () => {
    const earnerA: PersonOffsets = { retire: 10, claim: 99, earnedIncomeReal: 50, socialSecurityReal: 0, spousalExcessAnnual: 0 }
    const earnerB: PersonOffsets = { retire: 8, claim: 99, earnedIncomeReal: 30, socialSecurityReal: 0, spousalExcessAnnual: 0 }
    // A dead at 3, B alive and working at t=5: survivor spending 75 − earned 30 = 45 unclamped;
    // the clamp (a living worker exists) takes it to 0.
    expect(netWithdrawalForYear(5, seamParams, [earnerA, earnerB], [3, 50], 0)).toBe(45)
    expect(netWithdrawalForYear(5, constructed(2), [earnerA, earnerB], [3, 50], 0)).toBe(0)
  })

  it('an already-retired person (offset ≤ 0) never trips the clamp', () => {
    const retiredClaiming: PersonOffsets = { retire: 0, claim: 0, earnedIncomeReal: 0, socialSecurityReal: 30, spousalExcessAnnual: 0 }
    // No working years exist — the construct is inert and the net is the plain retirement draw.
    expect(netWithdrawalForYear(5, constructed(), [retiredClaiming], [50], 30)).toBe(100 - 30)
  })
})

describe('C2 — the per-path contribution assembly seam (contributionsForYear)', () => {
  const P = (over: Partial<PersonInputs> = {}): PersonInputs => ({ ...MALE_65, currentAge: 55, retirementAge: 65, ...over })
  const O = (retire: number): PersonOffsets => ({ retire, claim: 99, earnedIncomeReal: 0, socialSecurityReal: 0, spousalExcessAnnual: 0 })

  it('death-truncates PER PERSON: a dead spouse contributes nothing from the death year (two arms)', () => {
    const acc: AccumulationParams = {
      contributionsByPerson: [{ pretax: [10, 10, 10, 10, 10, 10] }, { pretax: [5, 5, 5, 5, 5, 5] }],
    }
    const offsets = [O(10), O(10)]
    const people = [P(), P({ sex: 'female' })]
    // Both alive at t=2: both contribute.
    expect(contributionsForYear(2, acc, offsets, [3, 50], people).pretaxByPerson).toEqual([10, 5])
    // Person 0 dead at 3 → t=4 carries ONLY person 1 (a planted untruncated stream — the phantom
    // dead-spouse contribution — would still show 10 in slot 0 and fail this).
    expect(contributionsForYear(4, acc, offsets, [3, 50], people).pretaxByPerson).toEqual([0, 5])
  })

  it('stops at retirement (t ≥ retire ⇒ 0) and an already-retired person has an EMPTY window', () => {
    const acc: AccumulationParams = { contributionsByPerson: [{ taxable: [7, 7, 7, 7] }] }
    expect(contributionsForYear(2, acc, [O(3)], [50], [P()]).taxableByPerson).toEqual([7])
    expect(contributionsForYear(3, acc, [O(3)], [50], [P()]).taxableByPerson).toEqual([0])
    // Defensive: stray entered contributions on an already-retired person (offset ≤ 0) never land.
    expect(contributionsForYear(0, acc, [O(0)], [50], [P()]).taxableByPerson).toEqual([0])
  })

  it('employer match → PRETAX always, even on a Roth deferral (the confirmed default rule)', () => {
    const acc: AccumulationParams = { contributionsByPerson: [{ roth: [100], employerMatch: [50] }] }
    const yc = contributionsForYear(0, acc, [O(5)], [50], [P()])
    expect(yc.rothByPerson).toEqual([100])
    expect(yc.pretaxByPerson).toEqual([50]) // the match, in the contributor's OWN slot
    expect(yc.taxableByPerson).toEqual([0])
  })

  it('HSA zeroing keys to the CONTRIBUTING person’s own enrollment onset — never the spouse’s', () => {
    // Person 0 is 63 (own onset in 2 years); person 1 is 70 (already enrolled). Both still working.
    const acc: AccumulationParams = { contributionsByPerson: [{ hsa: [7, 7, 7, 7] }, { hsa: [9, 9, 9, 9] }] }
    const offsets = [O(10), O(10)]
    const people = [P({ currentAge: 63 }), P({ currentAge: 70, sex: 'female' })]
    // t=0: person 0 contributes (63 < 65); person 1 is zeroed (70 ≥ 65 — their OWN onset). The
    // per-slot shape discriminates the spouse-keyed mutant structurally: keyed off the spouse it
    // would read [0, 9] — the exact inversion of the correct [7, 0].
    expect(contributionsForYear(0, acc, offsets, [50, 50], people).hsaByPerson).toEqual([7, 0])
    // t=1: person 0 is 64 — still contributing.
    expect(contributionsForYear(1, acc, offsets, [50, 50], people).hsaByPerson).toEqual([7, 0])
    // t=2: person 0 crosses their own 65th sim-year — zeroed (the biological default onset; C3's
    // per-person signal threads through this same predicate; no signal field ships in C2, so the
    // default predicate itself is what this pins).
    expect(contributionsForYear(2, acc, offsets, [50, 50], people).hsaByPerson).toEqual([0, 0])
  })
})

describe('C2 §1 — byte-identity is PRESENCE-keyed (absent ⇔ the spine; zero-valued-constructed ≠ absent)', () => {
  it('construct ABSENT: the EXHAUSTIVE-OFF overlay still reduces byte-identically to the plain spine', () => {
    // The 421-test pre-C2 suite is the real pin (it passed unchanged through the signature
    // change); this golden re-asserts the reduce-to-spine anchor post-C2 explicitly.
    const base = makeParams({ paths: 400, maxHorizonYears: 20 })
    const noOverlay = dist(simulate(base, 4242))
    const offOverlay = dist(simulate({ ...base, overlay: offOverlayWith(base.initialPortfolio) }, 4242))
    expect(offOverlay.terminalValuesReal).toEqual(noOverlay.terminalValuesReal)
    expect(offOverlay.depletionYears).toEqual(noOverlay.depletionYears)
  })

  it('an ALL-RETIRED household with a construct (even NONZERO streams) is byte-identical — the Y == 0 empty phase', () => {
    // retire offset ≤ 0 ⇒ zero working years ⇒ nothing clamps AND every stream window is empty
    // (the entered values are never consumed) ⇒ byte-identical to construct-absent, same dims,
    // zero extra draws. This is the engine-level `Y == 0` golden of §1.
    const base = makeParams({ paths: 400, longevityMode: 'sampled', maxHorizonYears: 30 })
    const absent = dist(simulate({ ...base, overlay: offOverlayWith(base.initialPortfolio) }, 777))
    const constructed = dist(
      simulate(
        {
          ...base,
          overlay: offOverlayWith(base.initialPortfolio, {
            contributionsByPerson: [{ pretax: [50, 50, 50], taxable: [10], hsa: [5] }],
          }),
        },
        777,
      ),
    )
    expect(constructed.terminalValuesReal).toEqual(absent.terminalValuesReal)
    expect(constructed.depletionYears).toEqual(absent.depletionYears)
    expect(constructed.survivalFraction).toBe(absent.survivalFraction)
  })

  it('the NEGATIVE companion: a ZERO-VALUED-but-constructed run with a still-working drawing household DIFFERS', () => {
    // currentAge 60 → 5 working years; spending 40 > earned 25, so absent-construct working years
    // draw 15 while the §7 clamp zeroes them — proving the presence gate (not the values) owns
    // byte-identity. (The §1 deliberate non-identity: never "fix" this into equality.)
    const working: PersonInputs = { ...MALE_65, currentAge: 60, retirementAge: 65, earnedIncomeReal: 25 }
    const base = makeParams({ people: [working], maxHorizonYears: 35, paths: 400 })
    const absent = dist(simulate({ ...base, overlay: offOverlayWith(base.initialPortfolio) }, 909))
    const zeroConstructed = dist(
      simulate({ ...base, overlay: offOverlayWith(base.initialPortfolio, { contributionsByPerson: [{}] }) }, 909),
    )
    expect(zeroConstructed.terminalValuesReal).not.toEqual(absent.terminalValuesReal)
  })
})

describe('C2 — CRN across contribution-stop offsets (the draw schedule never moves)', () => {
  const mkArm = (retirementAge: number, pretaxStream: readonly number[]): SimulationParams => {
    const person: PersonInputs = { ...MALE_65, currentAge: 60, retirementAge, earnedIncomeReal: 0 }
    return makeParams({
      people: [person],
      annualSpendingReal: 0, // isolate the draw schedule: every net is 0 in both arms
      longevityMode: 'sampled',
      maxHorizonYears: 45,
      paths: 300,
      overlay: offOverlayWith(1000, { contributionsByPerson: [{ pretax: pretaxStream }] }),
    })
  }

  it('two stop offsets under one seed consume IDENTICAL draws (zero-valued arm) — and the boundary shift is real (presence arm)', () => {
    // Zero-valued streams + zero spending: terminals reflect ONLY growth over each path's
    // death-sampled horizon. If the assembly consumed even one draw as a function of the stop
    // offset, the longevity uniforms would shift between the arms and the death horizons — and
    // therefore the terminals — would diverge. Identical ⇒ the schedule is dimension-only.
    const zeroA = dist(simulate(mkArm(62, [0, 0, 0, 0, 0]), 1357))
    const zeroB = dist(simulate(mkArm(65, [0, 0, 0, 0, 0]), 1357))
    expect(zeroA.terminalValuesReal).toEqual(zeroB.terminalValuesReal)
    expect(zeroA.depletionYears).toEqual(zeroB.depletionYears)
    // Presence companion (burned/027): with REAL contributions the two stop boundaries truncate
    // differently (2 vs 5 inflow years) — the arms genuinely differ, so the identity above is
    // not vacuous.
    const liveA = dist(simulate(mkArm(62, [10, 10, 10, 10, 10]), 1357))
    const liveB = dist(simulate(mkArm(65, [10, 10, 10, 10, 10]), 1357))
    expect(liveA.terminalValuesReal).not.toEqual(liveB.terminalValuesReal)
  })
})

describe('C2 — the R19 gates (NaN-first, alignment, the zero-balance start, §6, hsa liveness)', () => {
  const workingPerson: PersonInputs = { ...MALE_65, currentAge: 55, retirementAge: 60, earnedIncomeReal: 50 }

  it('a NaN / negative / Infinity contribution entry returns the defined indeterminate output', () => {
    const cases: AccumulationParams[] = [
      { contributionsByPerson: [{ pretax: [Number.NaN] }] },
      { contributionsByPerson: [{ taxable: [-5] }] },
      { contributionsByPerson: [{ roth: [Number.POSITIVE_INFINITY] }] },
      { contributionsByPerson: [{ employerMatch: [Number.NaN] }] },
      { contributionsByPerson: [{ hsa: [Number.NaN] }] },
    ]
    for (const acc of cases) {
      const out = simulate(makeParams({ people: [workingPerson], overlay: offOverlayWith(1000, acc) }), 1)
      expect(out.indeterminate).toBe(true)
    }
  })

  it('two FINITE per-slot entries whose sum overflows to +Infinity are rejected (the wave-2 adversary’s catch)', () => {
    // Each entry passes per-entry FINITENESS (1.5e308 < MAX_VALUE) but the assembled year total
    // is +Infinity — which would ride through stepYear to a non-finite terminal counted as
    // SURVIVED (survivalFraction 1.0, the calm-but-wrong-optimistic escape). Since the M6
    // domain bounds, the per-entry arm rejects these FIRST (1.5e308 > ENGINE_MAX_DOLLAR — the
    // cap is exactly what makes cumulative compounding finite); the Σ arm behind it stays as
    // the defense-in-depth backstop for the bound itself drifting. The overlay-side Σ backstop
    // (a direct caller's surface, uncapped) keeps its own live test in taxOverlay.test.ts.
    const couple: PersonInputs[] = [workingPerson, { ...workingPerson, sex: 'female' }]
    const out = simulate(
      makeParams({
        people: couple,
        overlay: {
          taxEnabled: false,
          rmdEnabled: false,
          startCalendarYear: 2026,
          buckets: { taxable: 1000, pretax: 0, roth: 0 },
          filing: 'mfj',
          accumulation: { contributionsByPerson: [{ pretax: [1.5e308] }, { pretax: [1.5e308] }] },
        },
      }),
      1,
    )
    expect(out.indeterminate).toBe(true)
    if (out.indeterminate) expect(out.reason).toContain('contribution')
  })

  it('a contributionsByPerson length mismatch is rejected (never silently re-indexed)', () => {
    const out = simulate(
      makeParams({ people: [workingPerson], overlay: offOverlayWith(1000, { contributionsByPerson: [] }) }),
      1,
    )
    expect(out.indeterminate).toBe(true)
    if (out.indeterminate) expect(out.reason).toContain('length')
  })

  it('the ZERO-BALANCE start is rejected calmly (a $0 start would read depleted-at-t0 and swallow every contribution)', () => {
    const out = simulate(
      makeParams({
        initialPortfolio: 0,
        people: [workingPerson],
        overlay: offOverlayWith(0, { contributionsByPerson: [{ pretax: [100] }] }),
      }),
      1,
    )
    expect(out.indeterminate).toBe(true)
    if (out.indeterminate) expect(out.reason).toContain('starting balance')
    // The construct-ABSENT $0-portfolio run stays a legitimate already-failing read (unchanged).
    const absent = simulate(makeParams({ initialPortfolio: 0, annualSpendingReal: 40 }), 1)
    expect(absent.indeterminate).toBe(false)
  })

  it('§6 — a contribution overlapping a PRICED ACA year is rejected at the frontline (run-level arm)', () => {
    // A retired 64yo (NO bridge years — the C3 wage-blind arm is deliberately out of this
    // fixture's domain, so what fires is the §6 empty-overlap arm itself): the entered
    // contribution stream erroneously carries an entry at the one priced pre-65 retired year.
    // (The original C2 fixture put the premium on a WORKING year — re-anchored when C3's
    // wage-blind ACA arm made a bridge-year premium its own, earlier rejection.)
    const retired64: PersonInputs = { ...MALE_65, currentAge: 64, retirementAge: 64 }
    const overlap: SimulationParams = makeParams({
      people: [retired64],
      overlay: {
        taxEnabled: true,
        rmdEnabled: false,
        startCalendarYear: 2026,
        buckets: { taxable: 0, pretax: 1000, roth: 0 },
        filing: 'mfj',
        healthcareEnabled: true,
        enrolledPremium: [12_000],
        slcsp: [11_000],
        irmaaMagiSeed: [60_000, 60_000], // the 64yo is Medicare-enrolled at t=1 (their 65th sim-year)
        accumulation: { contributionsByPerson: [{ pretax: [1_000] }] },
      },
    })
    const out = simulate(overlap, 1)
    expect(out.indeterminate).toBe(true)
    if (out.indeterminate) expect(out.reason).toContain('ACA')
    // Control: the SAME shape with the contribution moved OFF the priced year resolves (the gate
    // rejects the overlap, not the construct). Year 1 is the 64yo's 65th — outside both the §6
    // overlap domain and the C3 date-route coverage window ([0, 1) is fully covered above).
    const disjoint = simulate(
      {
        ...overlap,
        overlay: {
          ...overlap.overlay!,
          accumulation: { contributionsByPerson: [{ pretax: [0, 1_000] }] },
        },
      },
      1,
    )
    expect(disjoint.indeterminate).toBe(false)
  })

  it('hsa LIVENESS (insight 020): a positive hsa contribution stream alone now requires hsaOwnerIndex under tax', () => {
    const noOwner: SimulationParams = makeParams({
      people: [workingPerson],
      overlay: {
        taxEnabled: true,
        rmdEnabled: false,
        startCalendarYear: 2026,
        buckets: { taxable: 0, pretax: 1000, roth: 0 },
        filing: 'mfj',
        accumulation: { contributionsByPerson: [{ hsa: [100] }] },
      },
    })
    const out = simulate(noOwner, 1)
    expect(out.indeterminate).toBe(true)
    if (out.indeterminate) expect(out.reason).toContain('hsaOwnerIndex')
    // With the owner supplied, the same params resolve.
    const withOwner = simulate({ ...noOwner, overlay: { ...noOwner.overlay!, hsaOwnerIndex: 0 } }, 1)
    expect(withOwner.indeterminate).toBe(false)
  })
})

// ===========================================================================
// C3 §3b — the four validateParams arms (the R19 frontline mirror of the overlay's
// onset/override/mask machinery) + the onset-threaded HSA contribution seam.
// ===========================================================================
describe('C3 — the R19 arms: onset re-key, override coverage, the wage-blind ACA sibling, date-route coverage', () => {
  // A still-working 66yo (currentAge 66, stops at 69 — offset 3) with earned income: the
  // latent-shipped-hole household (bridge years inside the IRMAA lookback of their own onset).
  const working66: PersonInputs = {
    sex: 'male', currentAge: 66, birthYear: 1960, retirementAge: 69,
    earnedIncomeReal: 50, pia: 0, socialSecurityClaimAge: 70,
  }
  const overlay66 = (extra: Partial<OverlayParams>): OverlayParams => ({
    taxEnabled: true,
    rmdEnabled: false,
    startCalendarYear: 2026,
    buckets: { taxable: 0, pretax: 1000, roth: 0 },
    filing: 'mfj',
    healthcareEnabled: true,
    ...extra,
  })

  it('arm (a) — the seed-coverage loop is ONSET-keyed: a 65+ member still working needs NO seed (the false-rejection guard)', () => {
    // Biological keying would demand irmaaMagiSeed[0]/[1] (the 66yo is 65+ in years 0,1) and
    // spuriously block the whole candidate. Onset [3] ⇒ not enrolled until year 3 ⇒ no seed —
    // but arm (b) then requires the override for bridge years 1,2 (enrolled at 3,4). Supplied ⇒
    // the params RESOLVE with neither seed nor false rejection.
    const out = simulate(
      makeParams({
        people: [working66],
        overlay: overlay66({ medicareOnsetSimYear: [3], irmaaMagiOverride: [60_000, 60_000, 60_000] }),
      }),
      1,
    )
    expect(out.indeterminate).toBe(false)
    // The biological CONTROL (no onset): the seed gate fires — proving the re-key changed which
    // gate governs, rather than silently passing both.
    const control = simulate(makeParams({ people: [working66], overlay: overlay66({}) }), 1)
    expect(control.indeterminate).toBe(true)
    if (control.indeterminate) expect(control.reason).toContain('irmaaMagiSeed')
  })

  it('arm (b) — a bridge year inside the IRMAA lookback of an onset demands the override (the latent shipped hole, enforced)', () => {
    const out = simulate(
      makeParams({ people: [working66], overlay: overlay66({ medicareOnsetSimYear: [3] }) }),
      1,
    )
    expect(out.indeterminate).toBe(true)
    if (out.indeterminate) expect(out.reason).toContain('irmaaMagiOverride')
  })

  it('arm (d) — a PRICED ACA year on a bridge year is rejected (wage-blind: the year is unpriceable)', () => {
    // The pre-C3 shape this fixture replaces silently priced the year off withdrawal-only MAGI
    // (phantom near-max PTC — the optimistic direction). A working 55yo with a premium at the
    // bridge year 0:
    const working55: PersonInputs = { ...working66, currentAge: 55, retirementAge: 60 }
    const out = simulate(
      makeParams({
        people: [working55],
        overlay: overlay66({ enrolledPremium: [12_000], slcsp: [11_000] }),
      }),
      1,
    )
    expect(out.indeterminate).toBe(true)
    if (out.indeterminate) expect(out.reason).toMatch(/BRIDGE|wage/i)
    // Control: the SAME premium entered as an EXPLICIT 0 in the bridge years and real from the
    // work stop resolves (the healthcareStreams window-gate shape — 0 is entered, not absent).
    const gated = simulate(
      makeParams({
        people: [working55],
        overlay: overlay66({
          accumulation: { contributionsByPerson: [{}] },
          enrolledPremium: [0, 0, 0, 0, 0, 120, 120, 120, 120, 120],
          slcsp: [0, 0, 0, 0, 0, 110, 110, 110, 110, 110],
        }),
      }),
      1,
    )
    expect(gated.indeterminate).toBe(false)
  })

  it('arm (c) — the date-route coverage rule: with the accumulation construct, a HOLE in a pre-65 retired year is the error (explicit 0 is legal)', () => {
    const working55: PersonInputs = { ...working66, currentAge: 55, retirementAge: 60 }
    // Years 5..9 are the pre-65 retired window; year 9 is left ABSENT (the silent
    // healthcare-blind hole the ?? [] fallback used to wave through).
    const out = simulate(
      makeParams({
        people: [working55],
        overlay: overlay66({
          accumulation: { contributionsByPerson: [{}] },
          enrolledPremium: [0, 0, 0, 0, 0, 120, 120, 120, 120],
          slcsp: [0, 0, 0, 0, 0, 110, 110, 110, 110],
        }),
      }),
      1,
    )
    expect(out.indeterminate).toBe(true)
    if (out.indeterminate) expect(out.reason).toContain('cover sim-year 9')
    // WITHOUT the construct (plain decumulation), the same partial schedule stays legal — the
    // M3 "no marketplace coverage that year" semantics are unchanged off the date route.
    const plain = simulate(
      makeParams({
        people: [{ ...working55, retirementAge: 55, earnedIncomeReal: 0 }],
        overlay: overlay66({ enrolledPremium: [120], slcsp: [110] }),
      }),
      1,
    )
    expect(plain.indeterminate).toBe(false)
  })

  it('R19 — a NaN/short onset and a NaN override return the defined indeterminate output (insights 008/010)', () => {
    const bad = (extra: Partial<OverlayParams>): boolean =>
      simulate(makeParams({ people: [working66], overlay: overlay66(extra) }), 1).indeterminate
    expect(bad({ medicareOnsetSimYear: [Number.NaN] })).toBe(true)
    expect(bad({ medicareOnsetSimYear: [1.5] })).toBe(true)
    expect(bad({ medicareOnsetSimYear: [0, 0] })).toBe(true) // length ≠ people
    expect(bad({ irmaaMagiOverride: [Number.NaN] })).toBe(true)
    expect(bad({ irmaaMagiOverride: [-1] })).toBe(true)
  })

  it('arm (b) RE-KEY (insight 020) — a ZERO-income still-working person under the construct demands the same override', () => {
    // The §7 clamp keys on `t < retire` alone (income-BLIND), so a zero-earned-income
    // worker's clamped years record the same ≈$0 computed MAGI a salaried worker's do — but
    // the pre-fix bridge predicate (earned > 0) waved exactly them through: lowest tier,
    // understated Medicare cost, a falsely-early date, SILENTLY (the C3 boundary review's
    // P1). The guard now keys to the clamp's own domain: under the accumulation construct,
    // EVERY still-working person's years are bridge years.
    const zeroIncome66: PersonInputs = { ...working66, earnedIncomeReal: 0 }
    const noOverride = simulate(
      makeParams({
        people: [zeroIncome66],
        overlay: overlay66({
          accumulation: { contributionsByPerson: [{}] },
          medicareOnsetSimYear: [3],
        }),
      }),
      1,
    )
    expect(noOverride.indeterminate).toBe(true)
    if (noOverride.indeterminate) expect(noOverride.reason).toContain('irmaaMagiOverride')
    // An EXPLICIT-0 override satisfies coverage and the run resolves: for a genuinely-zero-
    // MAGI household (living on non-portfolio cash — not income) the clamped lowest-tier
    // read IS the correct answer. Coverage is what the arm demands, never a positive value.
    const explicitZero = simulate(
      makeParams({
        people: [zeroIncome66],
        overlay: overlay66({
          accumulation: { contributionsByPerson: [{}] },
          medicareOnsetSimYear: [3],
          irmaaMagiOverride: [0, 0, 0],
        }),
      }),
      1,
    )
    expect(explicitZero.indeterminate).toBe(false)
    // Construct-ABSENT control: plain decumulation never clamps — the computed draw-MAGI is
    // honest there, so the zero-income worker owes NO override (the income-positive bridge
    // shape stays exact off the accumulation route).
    const plain = simulate(
      makeParams({ people: [zeroIncome66], overlay: overlay66({ medicareOnsetSimYear: [3] }) }),
      1,
    )
    expect(plain.indeterminate).toBe(false)
  })

  it('R19 — fractional ages are rejected as the ENTERED field (whole-year contract), never a derived-onset misattribution', () => {
    // Pre-fix, a fractional currentAge passed finiteness and detonated downstream as a
    // derived-field rejection ("medicareOnsetSimYear invalid") or a bare RangeError in
    // healthcareStreams — pointing away from the field the user actually entered.
    const frac = (over: Partial<PersonInputs>): ReturnType<typeof simulate> =>
      simulate(makeParams({ people: [{ ...working66, ...over }] }), 1)
    const byAge = frac({ currentAge: 66.5 })
    expect(byAge.indeterminate).toBe(true)
    if (byAge.indeterminate) expect(byAge.reason).toContain('age')
    expect(frac({ retirementAge: 69.5 }).indeterminate).toBe(true)
    expect(frac({ socialSecurityClaimAge: 70.5 }).indeterminate).toBe(true)
  })

  it('absent-onset byte-identity at the simulate layer (sampled longevity — the living-set intersection is exercised)', () => {
    const seventy: PersonInputs = { ...MALE_65, currentAge: 70, retirementAge: 70 }
    const base = makeParams({
      initialPortfolio: 1_000_000,
      annualSpendingReal: 40_000,
      people: [seventy, { ...seventy, sex: 'female' }],
      longevityMode: 'sampled',
      paths: 500,
    })
    const overlay = (extra: Partial<OverlayParams>): OverlayParams => ({
      taxEnabled: true,
      rmdEnabled: false,
      startCalendarYear: 2026,
      buckets: { taxable: 0, pretax: 1_000_000, roth: 0 },
      filing: 'mfj',
      healthcareEnabled: true,
      irmaaMagiSeed: [60_000, 60_000],
      ...extra,
    })
    const absent = simulate({ ...base, overlay: overlay({}) }, 2468)
    // Biological onset for a 70yo is 65 − 70 = −5: the explicit array must reproduce the
    // absent-signal run EXACTLY (same seed, same dims — the byte-identity contract).
    const explicit = simulate({ ...base, overlay: overlay({ medicareOnsetSimYear: [-5, -5] }) }, 2468)
    expect(explicit).toEqual(absent)
  })
})

describe('C3 — the onset-threaded HSA contribution zeroing (contributionsForYear)', () => {
  const offsets: PersonOffsets[] = [{ retire: 3, claim: 10, earnedIncomeReal: 50, socialSecurityReal: 0, spousalExcessAnnual: 0 }]
  const acc: AccumulationParams = { contributionsByPerson: [{ hsa: [100, 100, 100] }] }
  const person: PersonInputs = {
    sex: 'male', currentAge: 66, birthYear: 1960, retirementAge: 69,
    earnedIncomeReal: 50, pia: 0, socialSecurityClaimAge: 70,
  }

  it('HSA stays LIVE while working past 65 with a supplied onset (a planted age-keyed zeroing fails)', () => {
    // The 66yo works through year 2 (onset 3 — employer coverage delays Medicare): their HSA
    // contribution at t=1 (age 67!) is still credited. The biological default would zero it.
    const withOnset = contributionsForYear(1, acc, offsets, [30], [person], [3])
    expect(withOnset.hsaByPerson).toEqual([100])
    const biological = contributionsForYear(1, acc, offsets, [30], [person])
    expect(biological.hsaByPerson).toEqual([0])
  })

  it('the onset is the ZEROING boundary: t = onset zeroes even mid-working-window', () => {
    // Onset 2 < retire 3: the year t = 2 is working but Medicare-enrolled ⇒ contribution zeroed
    // (enrollment, not work status, is the §223(b)(7) boundary).
    const atOnset = contributionsForYear(2, acc, offsets, [30], [person], [2])
    expect(atOnset.hsaByPerson).toEqual([0])
    const beforeOnset = contributionsForYear(1, acc, offsets, [30], [person], [2])
    expect(beforeOnset.hsaByPerson).toEqual([100])
  })

  it('TWO persons, DISTINCT supplied onsets + DISTINCT streams: each owner zeroes at THEIR OWN onset (an onset-array index swap inverts)', () => {
    // Every prior supplied-onset fixture is single-person, so a planted `onset[1 − i]` swap
    // read a hole and fell to a DIFFERENT default — caught only accidentally (insight 015/024:
    // an equal-valued or single-slot fixture cannot discriminate an index swap). Here both
    // onsets are supplied, in-bounds, and DIFFERENT, with distinct stream values: correct
    // [10, 0] at t = 2; the swap reads [0, 20] — the exact inversion, structurally observable.
    const acc2: AccumulationParams = {
      contributionsByPerson: [{ hsa: [10, 10, 10] }, { hsa: [20, 20, 20] }],
    }
    const offsets2: PersonOffsets[] = [
      { retire: 10, claim: 99, earnedIncomeReal: 50, socialSecurityReal: 0, spousalExcessAnnual: 0 },
      { retire: 10, claim: 99, earnedIncomeReal: 50, socialSecurityReal: 0, spousalExcessAnnual: 0 },
    ]
    const people2: PersonInputs[] = [person, { ...person, sex: 'female' }]
    // Onsets [3, 1]: at t = 2 person 0 (onset 3) still contributes; person 1 (onset 1) is
    // enrolled and zeroed. Both alive ∧ working (retire 10, deaths 50) — never vacuous.
    expect(contributionsForYear(2, acc2, offsets2, [50, 50], people2, [3, 1]).hsaByPerson).toEqual([10, 0])
    // t = 0: both pre-onset — both live (the presence companion, burned/027).
    expect(contributionsForYear(0, acc2, offsets2, [50, 50], people2, [3, 1]).hsaByPerson).toEqual([10, 20])
  })
})

// ===========================================================================
// M6 — full-stack CRN through simulate: ACA + IRMAA + HSA + the survivor flip,
// ALL live in one run, two candidates differing ONLY in conversion amount.
//
// The existing CRN tests each cover ONE wiring (the survivor transition, the ACA
// branch, the HSA branch, the contribution offsets) — none runs the WHOLE stack at
// once, yet the P4 solver's ranking premise is CRN over candidates that carry it
// all. The couple ages 64 + 63 put the 63→65 Medicare handoff IN-window (ACA prices
// t=0,1; Medicare enrollment arrives at t=1 and t=2; the pre-65 years' converged
// MAGIs are the history the t=3+ IRMAA bills lag-read), sampled longevity puts
// survivor MFJ→single transitions on real paths, and the year-0 conversion's tax +
// PTC erosion + 2-yr-lagged surcharge all ride the SAME dimension-only draws.
// ===========================================================================
describe('M6 — full-stack CRN through simulate (ACA × IRMAA × HSA × survivor flip live)', () => {
  const P = 1_000_000
  const HSA = 30_000
  const M64: PersonInputs = {
    sex: 'male', currentAge: 64, birthYear: 1962, retirementAge: 64,
    earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70,
  }
  const F63: PersonInputs = { ...M64, sex: 'female', currentAge: 63, birthYear: 1963 }
  const base = makeParams({
    initialPortfolio: P,
    annualSpendingReal: 60_000,
    people: [M64, F63],
    longevityMode: 'sampled',
    maxHorizonYears: 13, // the 64yo (born 1962, RMD band 75) hits RMD at t=11 — in-window on surviving paths
    drawdownPolicy: 'pre-tax-first',
    paths: 400,
  })
  const fullStack = (conversions: readonly number[]): SimulationParams => ({
    ...base,
    overlay: {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: 2026,
      buckets: { taxable: 0, pretax: P - HSA, roth: 0, hsa: HSA },
      filing: 'mfj',
      healthcareEnabled: true,
      // ACA prices t=0 (both pre-65) and t=1 (the 63yo still 64); the age gate closes at t=2.
      slcsp: [11_000, 11_000],
      enrolledPremium: [12_000, 12_000],
      // The 64yo enrolls at t=1 (biological 65) ⇒ validateParams requires seed[1] (a t<2 bill).
      irmaaMagiSeed: [0, 120_000],
      oopMedical: flatN(13, 2_000),
      hsaOwnerIndex: 0,
      conversions,
    },
  })

  it('deterministic repeat: the full stack resolves and reproduces byte-identically (no draw desync anywhere in the coupled wiring)', () => {
    const a = simulate(fullStack([40_000]), 2468)
    const b = simulate(fullStack([40_000]), 2468)
    expect(a.indeterminate).toBe(false)
    expect(a).toEqual(b)
    const d = dist(a)
    expect(d.terminalValuesReal.every(Number.isFinite)).toBe(true)
  })

  it('per-path MONOTONE in the year-0 conversion with the whole stack live — every coupled channel moves the same direction on shared draws', () => {
    // A larger year-0 conversion can only (1) pay more upfront ordinary tax, (2) raise the
    // priced year's ACA-MAGI ⇒ erode the PTC ⇒ a higher net premium, and (3) raise
    // IRMAA-MAGI[0] ⇒ a weakly higher t=2 Medicare bill — every channel monotone
    // non-increasing in the terminal, and the converted Roth principal cannot pay off
    // in-window under pre-tax-first (Roth drawn last; the pool never exhausts at this scale).
    // With byte-identical dimension-only draws the per-path terminal is therefore monotone
    // DECREASING in the conversion; any draw desync across the coupled stack would scramble
    // returns and break it. (The same shape as the tax-only and HSA monotone CRN tests —
    // here ALL the overlays are live at once.)
    const run = (c: number) => dist(simulate(fullStack([c]), 2468)).terminalValuesReal
    const t0 = run(0)
    const t1 = run(40_000)
    const t2 = run(80_000)
    for (let p = 0; p < t0.length; p++) {
      expect(t1[p]!).toBeLessThanOrEqual(t0[p]!)
      expect(t2[p]!).toBeLessThanOrEqual(t1[p]!)
    }
    expect(t2[0]!).toBeLessThan(t0[0]!) // non-vacuous: the conversion genuinely moved the terminal
  })

  it('presence companions (burned/027): the stack genuinely priced — and survivor transitions occur on real paths', () => {
    // The no-conversion full-stack run differs from the tax-only twin (healthcare + hsa
    // stripped): the ACA premiums, Medicare costs, and HSA-paid OOP all moved real dollars.
    const stack = dist(simulate(fullStack([]), 2468))
    const taxOnlyTwin: SimulationParams = {
      ...base,
      overlay: {
        taxEnabled: true,
        rmdEnabled: true,
        startCalendarYear: 2026,
        buckets: { taxable: 0, pretax: P, roth: 0 },
        filing: 'mfj',
      },
    }
    expect(stack.terminalValuesReal).not.toEqual(dist(simulate(taxOnlyTwin, 2468)).terminalValuesReal)
    // The "across the survivor flip" claim is non-vacuous: count the sampled MFJ→single
    // transitions inside the horizon (the same construction simulate uses).
    const draws = buildDraws(2468, base.paths, base.maxHorizonYears, 2)
    let transitions = 0
    for (let p = 0; p < base.paths; p++) {
      const path = sampleCouplePath([M64, F63], draws.longevityU[p] ?? [])
      if (path.firstDeathYear < Math.min(path.lastDeathYear, base.maxHorizonYears)) transitions++
    }
    expect(transitions).toBeGreaterThan(0)
  })
})

// ===========================================================================
// M6 Slice 2 — the solver output contract through simulate: the per-path
// tax-aware surfaces (Distribution.taxAware) + the typed INFEASIBLE sentinel.
// ===========================================================================
describe('M6 — Distribution.taxAware: the per-path solver surfaces (presence-keyed)', () => {
  const P = 1_000_000
  const M80: PersonInputs = {
    sex: 'male', currentAge: 80, birthYear: 1946, retirementAge: 80,
    earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 70,
  }
  const F78: PersonInputs = { ...M80, sex: 'female', currentAge: 78, birthYear: 1948, pia: 18_000 }
  // ZERO-volatility market: toLogMoments(mean, 0) ⇒ every year's return = mean exactly,
  // independent of the normal draw — so each path is a DETERMINISTIC function of its
  // sampled death years and the test can reconstruct it exactly.
  const zeroVol = {
    stock: { mean: 0.03, stdDev: 0 },
    bond: { mean: 0.01, stdDev: 0 },
    inflation: { mean: 0, stdDev: 0 },
    stockBondCorrelation: 0,
    space: 'simple',
    returnsAreReal: true,
  } as const
  // A LIVE hsa bucket rides the fixture (the M6 review's mutation finding: with no hsa, the
  // terminalHsaReal collection assertion is vacuous — both sides 0 — and a planted zeroing
  // of simulate's hsa collection survived the whole suite). The 80yo owns it (65+ ⇒ the OOP
  // stream drains it per year), so terminalHsaReal is genuinely NONZERO and horizon-varying.
  const OOP = flatN(25, 3_000)
  const overlayParams: SimulationParams = makeParams({
    initialPortfolio: P + 60_000,
    annualSpendingReal: 90_000,
    people: [M80, F78],
    longevityMode: 'sampled',
    maxHorizonYears: 25,
    drawdownPolicy: 'pre-tax-first',
    market: zeroVol,
    paths: 12,
    overlay: {
      taxEnabled: true,
      rmdEnabled: true, // both past their RMD start age — the forced distribution is live
      startCalendarYear: 2026,
      buckets: { taxable: 400_000, pretax: 500_000, roth: 100_000, hsa: 60_000 },
      filing: 'mfj',
      initialTaxableBasis: 250_000,
      hsaOwnerIndex: 0,
      oopMedical: OOP,
    },
  })

  it('presence-keyed: an overlay run carries six length-=paths surfaces; a spine run carries NONE (absence is the honest shape)', () => {
    const withOverlay = dist(simulate(overlayParams, 2468))
    const ta = withOverlay.taxAware
    expect(ta).toBeDefined()
    if (!ta) return
    for (const arr of [ta.lifetimeTaxPaidReal, ta.terminalTaxableReal, ta.terminalPretaxReal, ta.terminalRothReal, ta.terminalHsaReal, ta.terminalTaxableBasisReal]) {
      expect(arr.length).toBe(overlayParams.paths)
      expect(arr.every(Number.isFinite)).toBe(true) // DND/009 — these cross the wire and persist
    }
    // A genuine tax was paid on some path (presence companion — RMD-forced income + SS).
    expect(ta.lifetimeTaxPaidReal.some((t) => t > 0)).toBe(true)
    // The spine run (no overlay) has NO taxAware — zero-fill would contradict terminalValuesReal.
    const { overlay: _o, ...rest } = overlayParams
    const spine = dist(simulate(rest, 2468))
    expect(spine.taxAware).toBeUndefined()
  })

  it('faithful per-path collection: every surface equals a DIRECT per-path overlay run on the identical assembled inputs (byte-exact)', () => {
    // Reconstruct each path exactly as simulate does (zero-vol market ⇒ returns are flat
    // mean; deaths from the same draws; cash terms from the exported seam) and compare all
    // six collected surfaces to the direct runTaxAwareDecumulation result. This pins the
    // COLLECTION (simulate threads each path's result faithfully — per-path death horizons
    // included); the VALUES are pinned by the overlay's own externally-derived batteries.
    const out = dist(simulate(overlayParams, 97531))
    const ta = out.taxAware
    expect(ta).toBeDefined()
    if (!ta) return
    const draws = buildDraws(97531, overlayParams.paths, overlayParams.maxHorizonYears, 2)
    // The flat zero-vol returns BYTE-identically as the engine computes them (e^{ln(1+m)} − 1
    // can differ from m by an ulp — derive through the same conversion, never the raw mean).
    const rs = simpleReturnFromNormal(toLogMoments(0.03, 0), 0)
    const rb = simpleReturnFromNormal(toLogMoments(0.01, 0), 0)
    const benefits = householdBenefits(overlayParams.people.map((pp) => ({ piaAnnual: pp.pia, claimAge: pp.socialSecurityClaimAge, birthYear: pp.birthYear })))
    const offsets: PersonOffsets[] = overlayParams.people.map((pp, i) => ({
      retire: pp.retirementAge - pp.currentAge,
      claim: pp.socialSecurityClaimAge - pp.currentAge,
      earnedIncomeReal: pp.earnedIncomeReal,
      socialSecurityReal: benefits[i]!.ownAnnual,
      spousalExcessAnnual: benefits[i]!.spousalExcessAnnual,
    }))
    let higherIdx = 0
    for (let i = 1; i < overlayParams.people.length; i++) if (overlayParams.people[i]!.pia > overlayParams.people[higherIdx]!.pia) higherIdx = i
    const higherClaimOffset = offsets[higherIdx]!.claim
    const people: OverlayPerson[] = overlayParams.people.map((pp) => ({ birthYear: 2026 - pp.currentAge }))
    const cfg = {
      taxEnabled: true,
      rmdEnabled: true,
      household: { startCalendarYear: 2026, filing: 'mfj' as const, owner: people[0]!, spouse: people[1]! },
    }
    for (let p = 0; p < overlayParams.paths; p++) {
      const path = sampleCouplePath(
        overlayParams.people.map((pp) => ({ sex: pp.sex, currentAge: pp.currentAge })),
        draws.longevityU[p] ?? [],
      )
      const horizon = Math.min(path.lastDeathYear, overlayParams.maxHorizonYears)
      const withdrawals: number[] = []
      const ss: number[] = []
      const householdYears: HouseholdYear[] = []
      for (let t = 0; t < horizon; t++) {
        const cash = cashTermsForYear(t, overlayParams, offsets, [...path.deathYearOffsets], higherClaimOffset)
        withdrawals.push(cash.net)
        ss.push(cash.ss)
        householdYears.push({ living: people.filter((_, i) => t < (path.deathYearOffsets[i] ?? 0)) })
      }
      const direct = runTaxAwareDecumulation(
        { taxable: 400_000, pretax: 500_000, roth: 100_000, hsa: 60_000 },
        flatN(horizon, rs),
        flatN(horizon, rb),
        withdrawals,
        overlayParams.stockWeight,
        'pre-tax-first',
        cfg,
        {
          ssBenefits: ss,
          conversions: [],
          initialTaxableBasis: 250_000,
          householdYears,
          bracketFillCeilings: [],
          hsaOwnerIndex: 0,
          oopMedical: OOP,
        },
      )
      expect(ta.lifetimeTaxPaidReal[p]).toBe(direct.totalTaxPaidReal)
      expect(ta.terminalTaxableReal[p]).toBe(direct.finalBuckets.taxable)
      expect(ta.terminalPretaxReal[p]).toBe(direct.finalBuckets.pretax)
      expect(ta.terminalRothReal[p]).toBe(direct.finalBuckets.roth)
      expect(ta.terminalHsaReal[p]).toBe(direct.finalBuckets.hsa ?? 0)
      expect(ta.terminalTaxableBasisReal[p]).toBe(direct.finalTaxableBasis)
      // ...and the surfaces reconcile to the headline: Σ buckets === the path's terminal.
      expect(
        ta.terminalTaxableReal[p]! + ta.terminalPretaxReal[p]! + ta.terminalRothReal[p]! + ta.terminalHsaReal[p]!,
      ).toBeCloseTo(out.terminalValuesReal[p]!, 6)
    }
    // Non-vacuous: the sampled horizons genuinely differ across paths (per-path death years),
    // so the per-path surfaces are death-year snapshots, not one shared horizon-end.
    const horizons = new Set<number>()
    for (let p = 0; p < overlayParams.paths; p++) {
      const path = sampleCouplePath(
        overlayParams.people.map((pp) => ({ sex: pp.sex, currentAge: pp.currentAge })),
        draws.longevityU[p] ?? [],
      )
      horizons.add(Math.min(path.lastDeathYear, overlayParams.maxHorizonYears))
    }
    expect(horizons.size).toBeGreaterThan(1)
    // ...and the hsa surface is genuinely NONZERO on some path — the vacuous-0 mutant killer
    // (the M6 review proved a planted zeroing of simulate's hsa collection survived the suite
    // when every fixture's hsa was 0-valued; a depleted path's 0 stays legitimate).
    expect(ta.terminalHsaReal.some((h) => h > 0)).toBe(true)
  })
})

describe('M6 — the typed per-candidate INFEASIBLE sentinel + the engine domain bounds (the strategic review’s P1)', () => {
  // REACHABILITY (corrected by the M6 boundary review's claim-refuter — the first draft of
  // this block claimed a universal "float saturation closes any scale" and was REFUTED: the
  // saturation argument assumes FINITE iterates, and a gate-valid 1e300 portfolio overflowed
  // a bucket to Infinity, fed Infinity − Infinity = NaN into the gross-up, and tripped the
  // 128-pass cap; an extreme market mean could even RESOLVE with Infinity counted as a
  // surviving terminal — the calm-but-wrong-optimistic escape). The fold: the ENGINE_MAX_*
  // domain bounds close the whole overflow class at the R19 gate, and the per-path
  // finiteness seam routes the measure-zero stochastic tail (plus any future cap drift) to
  // the typed sentinel. Inside the gated domain every solver cap is closed: max tax ≈
  // 0.31 × 0.85 × ENGINE_MAX_DOLLAR ⇒ ~113 worst-case gross-up passes < 128 (the eps-bound,
  // insight 006, now covers the entire domain — no saturation argument needed).
  const maxSS: SimulationParams = makeParams({
    initialPortfolio: 1_000_000,
    annualSpendingReal: 40_000,
    people: [{ ...MALE_65, pia: ENGINE_MAX_DOLLAR, socialSecurityClaimAge: 67 }],
    longevityMode: 'fixed-horizon',
    maxHorizonYears: 3,
    paths: 50,
    drawdownPolicy: 'pre-tax-first',
    overlay: {
      taxEnabled: true,
      rmdEnabled: false,
      startCalendarYear: 2026,
      buckets: { taxable: 0, pretax: 1_000_000, roth: 0 },
      filing: 'single',
    },
  })

  it('the WORST in-domain SS benefit (the 1e12 cap itself) RESOLVES under the 128-pass cap — the eps-bound covers the whole gated domain', () => {
    // The domain's worst convergence case: SS at ENGINE_MAX_DOLLAR needs ~ln(0.26e12/1e-7)/
    // ln(1/0.685) ≈ 113 passes — under the cap WITH margin, finite all the way (no overflow:
    // every intermediate ≤ ~0.85e12 ≪ MAX_VALUE). If a future map change (a higher k, a new
    // stacked channel — insight 007's class) pushes the worst case past 128, this fails loud
    // and the cap must be re-justified.
    const out = simulate(maxSS, 2468)
    expect(out.indeterminate).toBe(false)
    expect(out.infeasible).toBeUndefined() // resolved — the cap was never hit
    const d = dist(out)
    expect(d.terminalValuesReal.every(Number.isFinite)).toBe(true)
  })

  it('the OVERFLOW class is rejected at the gate as indeterminate (the review’s reproduced escapes, both flavors)', () => {
    // Flavor 1 (the claim-refuter's counterexample): a 1e300 portfolio — would overflow to
    // Infinity mid-path and trip the gross-up cap via Infinity − Infinity = NaN.
    const hugePortfolio = simulate(
      makeParams({ initialPortfolio: 1e300, annualSpendingReal: 10_000, paths: 1, maxHorizonYears: 3 }),
      1,
    )
    expect(hugePortfolio.indeterminate).toBe(true)
    if (hugePortfolio.indeterminate) expect(hugePortfolio.reason).toContain('initialPortfolio')
    // Flavor 2 (the adv-numerical adversary's): a 900%/yr mean over a long horizon — would
    // RESOLVE with Infinity counted as a surviving terminal (the worse, silent flavor).
    const hugeMean = simulate(
      makeParams({
        market: { ...validationMarket.value, stock: { mean: 9, stdDev: 0.1 } },
        maxHorizonYears: 30,
        paths: 1,
      }),
      1,
    )
    expect(hugeMean.indeterminate).toBe(true)
    if (hugeMean.indeterminate) expect(hugeMean.reason).toContain('market moment')
    // And the horizon bound: a 10,000-year window is out of the engine's domain.
    const hugeHorizon = simulate(makeParams({ maxHorizonYears: 10_000 }), 1)
    expect(hugeHorizon.indeterminate).toBe(true)
    if (hugeHorizon.indeterminate) expect(hugeHorizon.reason).toContain('horizon domain')
  })

  it('the sentinel plumbing is deterministic and the resolved arms carry no stray flag', () => {
    // The same (params, seed) reproduces byte-identically through the collection + sentinel
    // plumbing (a sentinel, when it fires, rides the same determinism: the first failing
    // path is a pure function of params + seed).
    expect(simulate(maxSS, 2468)).toEqual(simulate(maxSS, 2468))
  })
})

// ===========================================================================
// R40 · U3 — the atomic other-income engine integration. The COMPILE math is golden at the
// intake level (otherIncome.test.ts); the MAGI math is golden at the overlay level
// (taxOverlay.test.ts). These anchor the WIRING: the per-owner death-gated SELECT, seam 1's
// death-aware netting + the KTD-9 taxable split, reduce-to-spine byte-identity (the swap-mutant),
// the survivor both-dead floor, and the cross-owner-death-order swap-mutant (KTD-7).
// ===========================================================================
describe('R40 · ongoingIncomeForYear — the per-owner death-gated SELECT (KTD-4/KTD-7)', () => {
  // A two-person household: owner 0 has a pension (FULL 30k, SURVIVOR 15k = 0.5), owner 1 has a
  // rental (FULL 20k, SURVIVOR 20k = 1.0). Vectors flat for clarity; taxable === gross here.
  const income: IncomeParams = {
    incomeByPerson: [
      { grossFull: flatN(10, 30_000), taxableFull: flatN(10, 30_000), grossSurvivor: flatN(10, 15_000), taxableSurvivor: flatN(10, 15_000) },
      { grossFull: flatN(10, 20_000), taxableFull: flatN(10, 20_000), grossSurvivor: flatN(10, 20_000), taxableSurvivor: flatN(10, 20_000) },
    ],
  }

  it('both alive: FULL for both (30k + 20k = 50k)', () => {
    expect(ongoingIncomeForYear(2, income, [50, 50])).toEqual({ gross: 50_000, taxable: 50_000 })
  })

  it('owner 0 dead, spouse 1 alive: owner 0 SURVIVOR (15k) + owner 1 FULL (20k) = 35k (the per-owner gate)', () => {
    expect(ongoingIncomeForYear(5, income, [3, 50])).toEqual({ gross: 35_000, taxable: 35_000 })
  })

  it('owner 1 dead, spouse 0 alive: owner 1 SURVIVOR (20k) + owner 0 FULL (30k) = 50k (the ASYMMETRIC order)', () => {
    // The cross-owner-death-order discriminator: a single household gate keyed off the first death
    // would credit owner 0 its SURVIVOR (15k) here instead of its FULL (30k). The per-owner gate
    // gives 50k. (Mirror of the prior case with the death order flipped.)
    expect(ongoingIncomeForYear(5, income, [50, 3])).toEqual({ gross: 50_000, taxable: 50_000 })
  })

  it('BOTH dead: 0 (the survivor both-dead floor)', () => {
    expect(ongoingIncomeForYear(5, income, [3, 4])).toEqual({ gross: 0, taxable: 0 })
  })

  it('the cross-owner-death-order SWAP-MUTANT: a single household death gate FAILS the asymmetric case (KTD-7)', () => {
    // A household-level gate selects FULL for EVERY owner while ANY owner lives, else SURVIVOR for
    // every owner. Construct that mutant inline and prove it disagrees with the per-owner truth on
    // an asymmetric death order — the precise mutant the per-owner gate must survive.
    const householdGate = (t: number, inc: IncomeParams, deaths: readonly number[]): number => {
      const anyAlive = deaths.some((d) => t < d)
      const allAlive = deaths.every((d) => t < d)
      let gross = 0
      for (let i = 0; i < inc.incomeByPerson.length; i++) {
        const leaf = inc.incomeByPerson[i]!
        if (allAlive) gross += leaf.grossFull?.[t] ?? 0
        else if (anyAlive) gross += leaf.grossSurvivor?.[t] ?? 0
      }
      return gross
    }
    const truth = ongoingIncomeForYear(5, income, [50, 3]).gross
    const mutant = householdGate(5, income, [50, 3])
    expect(truth).toBe(50_000)
    expect(mutant).toBe(35_000) // 15k + 20k — the wrong credit
    expect(mutant).not.toBe(truth)
  })

  it('a leaf with no SURVIVOR variant (alimony, survivorPct 0) pays 0 once the owner dies', () => {
    const alimony: IncomeParams = { incomeByPerson: [{ grossFull: flatN(10, 12_000), taxableFull: flatN(10, 12_000) }, {}] }
    expect(ongoingIncomeForYear(2, alimony, [3, 50])).toEqual({ gross: 12_000, taxable: 12_000 })
    expect(ongoingIncomeForYear(5, alimony, [3, 50])).toEqual({ gross: 0, taxable: 0 })
  })
})

describe('R40 · seam 1 — cashTermsForYear nets the ongoing gross + splits the taxable on the §7 clamp (KTD-9)', () => {
  const seamParams = (income?: IncomeParams, accumulation?: AccumulationParams): SimulationParams =>
    makeParams({
      annualSpendingReal: 100_000,
      survivorSpendingRatio: 0.75,
      people: [{ ...MALE_65, currentAge: 60, retirementAge: 65 }],
      overlay: {
        taxEnabled: true,
        rmdEnabled: false,
        startCalendarYear: 2026,
        buckets: { taxable: 1000, pretax: 0, roth: 0 },
        filing: 'mfj',
        ...(income ? { income } : {}),
        ...(accumulation ? { accumulation } : {}),
      },
    })
  const incomeOnly0 = (gross: number, taxable: number): IncomeParams => ({
    incomeByPerson: [{ grossFull: flatN(40, gross), taxableFull: flatN(40, taxable) }],
  })
  const working: PersonOffsets = { retire: 5, claim: 99, earnedIncomeReal: 0, socialSecurityReal: 0, spousalExcessAnnual: 0 }

  it('a RETIRED year nets the ongoing gross AND routes the taxable to the gross-up feed', () => {
    const cash = cashTermsForYear(6, seamParams(incomeOnly0(30_000, 30_000)), [working], [50], 0)
    expect(cash.net).toBe(70_000) // spending 100k − gross 30k (seam 1)
    expect(cash.ongoingTaxableGrossUp).toBe(30_000)
    expect(cash.ongoingTaxableIrmaaOnly).toBe(0)
  })

  it('the KTD-9 split: under the §7 clamp the taxable rides IRMAA-ONLY, never the gross-up (no phantom withdrawal)', () => {
    const params = seamParams(incomeOnly0(30_000, 30_000), { contributionsByPerson: [{}] })
    const clamped = cashTermsForYear(2, params, [working], [50], 0) // t=2 < retire 5 ⇒ clamped
    expect(clamped.net).toBe(0)
    expect(clamped.ongoingTaxableGrossUp).toBe(0)
    expect(clamped.ongoingTaxableIrmaaOnly).toBe(30_000)
    const unclamped = cashTermsForYear(6, params, [working], [50], 0) // t=6 ≥ retire 5 ⇒ unclamped
    expect(unclamped.net).toBe(70_000)
    expect(unclamped.ongoingTaxableGrossUp).toBe(30_000)
    expect(unclamped.ongoingTaxableIrmaaOnly).toBe(0)
  })

  it('income absent: both taxable feeds are 0 (the reduce-to-spine cash shape)', () => {
    const cash = cashTermsForYear(6, seamParams(), [working], [50], 0)
    expect(cash.ongoingTaxableGrossUp).toBe(0)
    expect(cash.ongoingTaxableIrmaaOnly).toBe(0)
  })

  it('the KTD-7 × KTD-9 COMPOSITION: a clamped working year with a DEAD spouse routes the FULL+SURVIVOR SELECT sum entirely to IRMAA-ONLY (net 0, no gross-up)', () => {
    // The single-person seam tests above never COMPOSE the per-owner death-gated SELECT (KTD-7)
    // with the §7 working-year clamp (KTD-9): one person is either alive-and-working or not. Here a
    // TWO-person accumulation household carries the cross: owner 0 is a living clamped worker (alive
    // AND t < retire ⇒ `livingWorker`), owner 1 is DEAD (t ≥ deathOffset) but a spouse survives, so
    // the SELECT credits owner 0 its FULL and owner 1 its SURVIVOR. The clamp (accumulating &&
    // livingWorker) then fires on that summed taxable: net=0 and ongoingTaxableGrossUp=0 (the wages
    // fund the tax outside the portfolio — no phantom withdrawal), while the whole death-gated sum
    // rides ongoingTaxableIrmaaOnly into IRMAA-MAGI. FULL≠SURVIVOR for BOTH owners (30k/15k and
    // 20k/12k) so the assertion discriminates a mutant that credited owner 1 its FULL (20k) — the
    // sum would read 50k, not 42k. This is the precise interaction the single-person seam can't reach.
    const twoOwnerIncome: IncomeParams = {
      incomeByPerson: [
        { grossFull: flatN(40, 30_000), taxableFull: flatN(40, 30_000), grossSurvivor: flatN(40, 15_000), taxableSurvivor: flatN(40, 15_000) },
        { grossFull: flatN(40, 20_000), taxableFull: flatN(40, 20_000), grossSurvivor: flatN(40, 12_000), taxableSurvivor: flatN(40, 12_000) },
      ],
    }
    const params = makeParams({
      annualSpendingReal: 100_000,
      survivorSpendingRatio: 0.75,
      people: [
        { ...MALE_65, currentAge: 60, retirementAge: 65 },
        { ...FEMALE_65, currentAge: 60, retirementAge: 65 },
      ],
      overlay: {
        taxEnabled: true,
        rmdEnabled: false,
        startCalendarYear: 2026,
        buckets: { taxable: 1000, pretax: 0, roth: 0 },
        filing: 'mfj',
        income: twoOwnerIncome,
        accumulation: { contributionsByPerson: [{}, {}] }, // present ⇒ `accumulating` is true
      },
    })
    const offsets: PersonOffsets[] = [
      { retire: 5, claim: 99, earnedIncomeReal: 0, socialSecurityReal: 0, spousalExcessAnnual: 0 },
      { retire: 5, claim: 99, earnedIncomeReal: 0, socialSecurityReal: 0, spousalExcessAnnual: 0 },
    ]
    // t=4: < retire 5 ⇒ clamped working year; owner 1 dead at t=3 (4 ≥ 3), owner 0 alive (4 < 50).
    const cash = cashTermsForYear(4, params, offsets, [50, 3], 99)
    expect(cash.net).toBe(0) // clamped: the portfolio funds nothing this year
    expect(cash.ongoingTaxableGrossUp).toBe(0) // clamped routes NOTHING to the gross-up feed
    expect(cash.ongoingTaxableIrmaaOnly).toBe(42_000) // owner 0 FULL 30k + owner 1 SURVIVOR 12k
  })
})

describe('R40 · reduce-to-spine THROUGH simulate (R40.6 — presence is the key; the swap-mutant)', () => {
  const COUPLE = makeParams({
    people: [{ ...MALE_65, currentAge: 65 }, { ...FEMALE_65, currentAge: 65 }],
    longevityMode: 'sampled',
    maxHorizonYears: 50,
    annualSpendingReal: 60_000,
    initialPortfolio: 1_500_000,
    paths: 1500,
  })
  const baseOverlay: OverlayParams = {
    taxEnabled: true,
    rmdEnabled: true,
    startCalendarYear: 2026,
    buckets: { taxable: 0, pretax: 1_500_000, roth: 0 },
    initialTaxableBasis: 0,
    pretaxByPerson: [1_500_000, 0],
    filing: 'mfj',
  }

  it('the SWAP-MUTANT: a $0 income stream is byte-identical to NO income — absence is the only reduce-to-spine key', () => {
    // A zero-valued income leaf present on the overlay: the SELECT runs every year but adds 0/0, so
    // it must be byte-identical to the no-income run. A mutant that defaulted a missing survivor
    // variant to the FULL value, or netted gross without checking the leaf, would perturb this.
    const zeroIncome: IncomeParams = { incomeByPerson: [{ grossFull: flatN(50, 0), taxableFull: flatN(50, 0) }, {}] }
    const without = dist(simulate({ ...COUPLE, overlay: baseOverlay }, 9090))
    const withZero = dist(simulate({ ...COUPLE, overlay: { ...baseOverlay, income: zeroIncome } }, 9090))
    expect(withZero.terminalValuesReal).toEqual(without.terminalValuesReal)
    expect(withZero.depletionYears).toEqual(without.depletionYears)
    expect(withZero.survivalFraction).toBe(without.survivalFraction)
  })

  it('a REAL pension lifts terminal balances (the income offsets the draw) — the directional pin that the wire is live', () => {
    const pension: IncomeParams = {
      incomeByPerson: [{ grossFull: flatN(50, 40_000), taxableFull: flatN(50, 40_000), grossSurvivor: flatN(50, 20_000), taxableSurvivor: flatN(50, 20_000) }, {}],
    }
    const without = dist(simulate({ ...COUPLE, overlay: baseOverlay }, 9090))
    const withPension = dist(simulate({ ...COUPLE, overlay: { ...baseOverlay, income: pension } }, 9090))
    const median = (xs: readonly number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!
    expect(median(withPension.terminalValuesReal)).toBeGreaterThan(median(without.terminalValuesReal))
    expect(withPension.survivalFraction).toBeGreaterThanOrEqual(without.survivalFraction)
  })
})

describe('R40 · validateParams income block (vectors only; scalars are entity-side)', () => {
  const withIncome = (income: IncomeParams): SimulationParams =>
    makeParams({
      people: [{ ...MALE_65, currentAge: 65 }, { ...FEMALE_65, currentAge: 65 }],
      initialPortfolio: 1_000_000,
      annualSpendingReal: 40_000,
      overlay: {
        taxEnabled: true, rmdEnabled: false, startCalendarYear: 2026,
        buckets: { taxable: 0, pretax: 1_000_000, roth: 0 }, pretaxByPerson: [1_000_000, 0],
        initialTaxableBasis: 0, filing: 'mfj', income,
      },
    })

  it('a NaN in a gross vector is rejected as indeterminate (never a silent dropped pension)', () => {
    const bad: IncomeParams = { incomeByPerson: [{ grossFull: [30_000, NaN, 30_000], taxableFull: [30_000, 30_000, 30_000] }, {}] }
    const out = simulate(withIncome(bad), 1)
    expect(out.indeterminate).toBe(true)
    if (out.indeterminate) expect(out.reason).toContain('income vector invalid')
  })

  it('a leaf-count ≠ people-count mis-maps a spouse — rejected', () => {
    const short: IncomeParams = { incomeByPerson: [{ grossFull: flatN(5, 30_000), taxableFull: flatN(5, 30_000) }] }
    const out = simulate(withIncome(short), 1)
    expect(out.indeterminate).toBe(true)
    if (out.indeterminate) expect(out.reason).toContain('income incomeByPerson length must match people')
  })

  it('a > ENGINE_MAX_DOLLAR income figure is rejected (the computable-domain bound)', () => {
    const huge: IncomeParams = { incomeByPerson: [{ grossFull: [ENGINE_MAX_DOLLAR * 2], taxableFull: [0] }, {}] }
    const out = simulate(withIncome(huge), 1)
    expect(out.indeterminate).toBe(true)
    if (out.indeterminate) expect(out.reason).toContain('income vector invalid')
  })
})
