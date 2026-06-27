import { describe, it, expect } from 'vitest'
import {
  simulate,
  isSurvivorPhasePath,
  buildSurvivorConditioned,
  survivorIncomeStepDownMonthlyReal,
  cashTermsForYear,
  type SimOutput,
  type PersonOffsets,
} from '@engine/simulate'
import { validationMarket } from '@engine/reference/methodology'
import {
  NEVER_DEPLETED,
  type OverlayParams,
  type PersonInputs,
  type SimulationParams,
} from '@shared/model'

// =====================================================================================
// The U7 e1 survivor-conditioned surface (simulate's opt-in "as the survivor" statistic).
//
// Correctness pillars (mirroring the bandFan suite):
//   1. isSurvivorPhasePath / buildSurvivorConditioned — the phase determination, the
//      EQUAL-WEIGHT numerator, and presence-keying, externally-derived from HAND-BUILT
//      observations (never the engine's own run), including the cardinal-dangerous choice
//      that a pre-first-death depletion is a survivor FAILURE (DND/012).
//   2. Reduce-to-spine byte-identity — a survivor-on run is byte-identical to a survivor-off
//      run on terminalValuesReal / depletionYears / survivalFraction / taxAware (it OBSERVES).
//   3. Structural honesty under realistic sampled longevity (bounds; presence/absence).
// =====================================================================================

const dist = (o: SimOutput) => {
  if (o.indeterminate) throw new Error(`unexpected indeterminate: ${o.reason}`)
  if (o.infeasible) throw new Error(`unexpected infeasible: ${o.reason}`)
  return o.distribution
}

// ---------------------------------------------------------------------------------------
// 1a. isSurvivorPhasePath — a survivor phase = one spouse outliving the other WITHIN the window.
// ---------------------------------------------------------------------------------------
describe('isSurvivorPhasePath (the phase determination, externally-obvious)', () => {
  it('a couple where one outlives the other within the window HAS a survivor phase', () => {
    expect(isSurvivorPhasePath([5, 12], 30)).toBe(true)
    expect(isSurvivorPhasePath([0, 10], 30)).toBe(true) // immediate widowhood (one dies at year 0)
    expect(isSurvivorPhasePath([29, 35], 30)).toBe(true) // first death at 29 < 30 — one survivor year in-window
  })
  it('NO survivor phase when both die the same year, both outlive the window, or people-of-one', () => {
    expect(isSurvivorPhasePath([12, 12], 30)).toBe(false) // same year — they go together
    expect(isSurvivorPhasePath([30, 35], 30)).toBe(false) // first death AT the window end — both alive in-window
    expect(isSurvivorPhasePath([40, 45], 30)).toBe(false) // both outlive the window
    expect(isSurvivorPhasePath([25], 30)).toBe(false) // people-of-one — no survivor
    expect(isSurvivorPhasePath([], 30)).toBe(false)
  })
  it('order-independent (min/max, not first/last)', () => {
    expect(isSurvivorPhasePath([12, 5], 30)).toBe(true) // the later-listed spouse dies first
  })
})

// ---------------------------------------------------------------------------------------
// 1b. buildSurvivorConditioned — the reduction, externally-derived. Pins the EQUAL-WEIGHT
//     numerator (any depletion, even pre-first-death, is a survivor failure) + presence-keying.
// ---------------------------------------------------------------------------------------
describe('buildSurvivorConditioned (the reduction, externally-derived)', () => {
  it('counts survivor-phase paths; ANY depletion (even pre-first-death) is a survivor failure', () => {
    // maxHorizon 30. Hand-derived, path by path:
    //  p0 deaths [5,12]  depl NEVER → phase, SURVIVED
    //  p1 deaths [5,12]  depl 8     → phase (depleted DURING widowhood), FAILED
    //  p2 deaths [3,20]  depl 1     → phase (depleted while BOTH alive), FAILED  ← the equal-weight choice
    //  p3 deaths [12,12] depl NEVER → no phase (same year)
    //  p4 deaths [40,45] depl NEVER → no phase (both outlive the window)
    //  p5 deaths [25]    depl NEVER → no phase (people-of-one)
    // ⇒ denominator 3 (p0,p1,p2), numerator 1 (p0), fraction 1/3.
    const deaths = [[5, 12], [5, 12], [3, 20], [12, 12], [40, 45], [25]]
    const depl = [NEVER_DEPLETED, 8, 1, NEVER_DEPLETED, NEVER_DEPLETED, NEVER_DEPLETED]
    expect(buildSurvivorConditioned(deaths, depl, 30)).toEqual({
      survivorPhasePaths: 3,
      survivorSurvivors: 1,
      survivalFraction: 1 / 3,
    })
  })

  it('returns null when NO path has a survivor phase (presence-keyed — the surface is absent)', () => {
    const deaths = [[12, 12], [40, 45], [25]]
    const depl = [NEVER_DEPLETED, NEVER_DEPLETED, NEVER_DEPLETED]
    expect(buildSurvivorConditioned(deaths, depl, 30)).toBeNull()
  })

  it('all survivor-phase paths surviving ⇒ fraction 1; all depleting ⇒ fraction 0', () => {
    expect(buildSurvivorConditioned([[5, 12], [3, 20]], [NEVER_DEPLETED, NEVER_DEPLETED], 30)!.survivalFraction).toBe(1)
    expect(buildSurvivorConditioned([[5, 12], [3, 20]], [9, 9], 30)!.survivalFraction).toBe(0)
  })
})

// ---------------------------------------------------------------------------------------
// 2. Reduce-to-spine byte-identity — survivor-on ≡ survivor-off on every joint field.
// ---------------------------------------------------------------------------------------
const MALE_60: PersonInputs = {
  sex: 'male',
  currentAge: 60,
  birthYear: 1966,
  retirementAge: 60,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 67,
}
const FEMALE_58: PersonInputs = { ...MALE_60, sex: 'female', currentAge: 58, birthYear: 1968 }

const realParams = (over: Partial<SimulationParams> = {}): SimulationParams => ({
  initialPortfolio: 1_000_000,
  annualSpendingReal: 45_000,
  stockWeight: 0.6,
  people: [MALE_60, FEMALE_58],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  market: validationMarket.value,
  paths: 2000,
  maxHorizonYears: 45,
  longevityMode: 'sampled',
  ...over,
})

const overlayFor = (): OverlayParams => ({
  taxEnabled: true,
  rmdEnabled: true,
  startCalendarYear: 2026,
  filing: 'mfj',
  buckets: { taxable: 400_000, pretax: 500_000, roth: 100_000 },
  initialTaxableBasis: 300_000,
})

describe('reduce-to-spine byte-identity (the survivor surface only observes; never perturbs)', () => {
  it('SPINE: survivor-on ≡ survivor-off on terminalValuesReal / depletionYears / survivalFraction', () => {
    const p = realParams()
    const off = dist(simulate(p, 777))
    const on = dist(simulate(p, 777, { survivorConditioned: true }))
    expect(off.survivorConditioned).toBeUndefined()
    expect(on.survivorConditioned).toBeDefined()
    expect(on.terminalValuesReal).toEqual(off.terminalValuesReal)
    expect(on.depletionYears).toEqual(off.depletionYears)
    expect(on.survivalFraction).toBe(off.survivalFraction)
  })

  it('OVERLAY (the product path): survivor-on ≡ survivor-off incl. taxAware; composes with bandFan', () => {
    const p = realParams({ overlay: overlayFor() })
    const off = dist(simulate(p, 4242))
    const on = dist(simulate(p, 4242, { survivorConditioned: true, bandFan: true }))
    expect(on.terminalValuesReal).toEqual(off.terminalValuesReal)
    expect(on.depletionYears).toEqual(off.depletionYears)
    expect(on.survivalFraction).toBe(off.survivalFraction)
    expect(on.taxAware).toEqual(off.taxAware)
    expect(on.survivorConditioned).toBeDefined()
    expect(on.bandFan).toBeDefined() // the two opt-in surfaces compose
  })
})

// ---------------------------------------------------------------------------------------
// 3. Structural honesty under realistic sampled longevity (bounds + presence/absence).
// ---------------------------------------------------------------------------------------
describe('structural honesty of the realistic survivor statistic', () => {
  it('present + well-formed under sampled longevity: counts within bounds, fraction in [0,1]', () => {
    const d = dist(simulate(realParams({ overlay: overlayFor() }), 99, { survivorConditioned: true }))
    const sc = d.survivorConditioned!
    expect(sc.survivorPhasePaths).toBeGreaterThan(0)
    expect(sc.survivorPhasePaths).toBeLessThanOrEqual(2000)
    expect(sc.survivorSurvivors).toBeGreaterThanOrEqual(0)
    expect(sc.survivorSurvivors).toBeLessThanOrEqual(sc.survivorPhasePaths)
    expect(sc.survivalFraction).toBeGreaterThanOrEqual(0)
    expect(sc.survivalFraction).toBeLessThanOrEqual(1)
    expect(sc.survivalFraction).toBeCloseTo(sc.survivorSurvivors / sc.survivorPhasePaths, 12)
  })

  it('ABSENT in fixed-horizon mode (nobody dies ⇒ no survivor phase ⇒ reduce-to-spine)', () => {
    const d = dist(simulate(realParams({ longevityMode: 'fixed-horizon' }), 99, { survivorConditioned: true }))
    expect(d.survivorConditioned).toBeUndefined()
  })

  it('a fragile (high-spend) plan genuinely fails some survivor futures (the statistic is live)', () => {
    // The survivor fraction is TYPICALLY ≤ the joint on a fragile plan (the honest elevated-risk
    // direction), but it is NOT a guaranteed inequality (paths with no survivor phase are excluded
    // from the denominator), so we do not assert ≤-joint. We assert the statistic is live and < 1 on a
    // plan that genuinely fails often — the case the survivor reading exists to surface honestly.
    const d = dist(simulate(realParams({ annualSpendingReal: 90_000, overlay: overlayFor() }), 55, { survivorConditioned: true }))
    const sc = d.survivorConditioned!
    expect(sc.survivorPhasePaths).toBeGreaterThan(0)
    expect(sc.survivalFraction).toBeLessThan(1)
  })
})

// ---------------------------------------------------------------------------------------
// 4. The income step-down magnitude (U7 e1b). Externally-derived: hand-built offsets carry the OWN
//    benefits (the all-alive cash branch sums them), and pia=0 on the PEOPLE zeroes the §202 survivor
//    benefit (a survivor keeps only their own), so every income drop is exact paper arithmetic — which
//    isolates the e1b logic (the counterfactual, the median, the ÷12, the survivor-phase filter) from
//    the separately-tested survivor-benefit math inside cashTermsForYear.
// ---------------------------------------------------------------------------------------
const STEP_A: PersonInputs = {
  sex: 'male', currentAge: 65, birthYear: 1961, retirementAge: 65, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 65,
}
const STEP_B: PersonInputs = { ...STEP_A, sex: 'female', currentAge: 63, birthYear: 1963 }
const STEP_PARAMS: SimulationParams = {
  initialPortfolio: 1_000_000, annualSpendingReal: 50_000, stockWeight: 0.5, people: [STEP_A, STEP_B],
  survivorSpendingRatio: 0.75, drawdownPolicy: 'proportional', market: validationMarket.value,
  paths: 1, maxHorizonYears: 30, longevityMode: 'sampled',
}
// A: $24k/yr own, B: $18k/yr own — both claiming from year 0, no earned income, no other-income overlay.
const STEP_OFFSETS: readonly PersonOffsets[] = [
  { retire: 0, claim: 0, earnedIncomeReal: 0, socialSecurityReal: 24_000, spousalExcessAnnual: 0 },
  { retire: 0, claim: 0, earnedIncomeReal: 0, socialSecurityReal: 18_000, spousalExcessAnnual: 0 },
]

describe('cashTermsForYear.nonPortfolioIncomeReal (the income the step-down reads)', () => {
  it('all-alive: sums both own benefits (no earned, no other income)', () => {
    expect(cashTermsForYear(0, STEP_PARAMS, STEP_OFFSETS, [12, 12], 0).nonPortfolioIncomeReal).toBe(42_000)
  })
  it('survivor year: only the survivor’s own benefit remains (pia=0 ⇒ no §202 survivor benefit)', () => {
    // B dies at year 5; at t=5 the survivor A keeps own 24,000.
    expect(cashTermsForYear(5, STEP_PARAMS, STEP_OFFSETS, [12, 5], 0).nonPortfolioIncomeReal).toBe(24_000)
  })
})

describe('survivorIncomeStepDownMonthlyReal (U7 e1b — the counterfactual, externally-derived)', () => {
  it('single path, the LOWER earner dies first → drop = the deceased’s own benefit, monthly', () => {
    // B (18k) dies first; both-alive 42k − survivor A’s 24k = 18k/yr = 1,500/mo.
    expect(survivorIncomeStepDownMonthlyReal([[12, 5]], 30, STEP_PARAMS, STEP_OFFSETS, 0)).toBeCloseTo(1_500, 6)
  })
  it('single path, the HIGHER earner dies first → a bigger drop', () => {
    // A (24k) dies first; 42k − survivor B’s 18k = 24k/yr = 2,000/mo.
    expect(survivorIncomeStepDownMonthlyReal([[5, 12]], 30, STEP_PARAMS, STEP_OFFSETS, 0)).toBeCloseTo(2_000, 6)
  })
  it('MEDIAN across survivor-phase paths (not mean)', () => {
    // drops {18k, 24k} ⇒ median 21k/yr = 1,750/mo (a mean would give the same here; the 3-path case below splits them).
    expect(survivorIncomeStepDownMonthlyReal([[12, 5], [5, 12]], 30, STEP_PARAMS, STEP_OFFSETS, 0)).toBeCloseTo(1_750, 6)
    // {18k, 18k, 24k} ⇒ median 18k/yr = 1,500/mo (mean would be 1,666 — proves it is the median).
    expect(survivorIncomeStepDownMonthlyReal([[12, 5], [12, 5], [5, 12]], 30, STEP_PARAMS, STEP_OFFSETS, 0)).toBeCloseTo(1_500, 6)
  })
  it('IMMEDIATE widowhood (first death at year 0) is INCLUDED — the counterfactual works at fd=0', () => {
    // A dead at 0; both-alive-at-0 42k − survivor B 18k = 24k/yr = 2,000/mo. (A raw fd−1 diff could not measure this.)
    expect(survivorIncomeStepDownMonthlyReal([[0, 12]], 30, STEP_PARAMS, STEP_OFFSETS, 0)).toBeCloseTo(2_000, 6)
  })
  it('non-survivor-phase paths are EXCLUDED; an all-excluded input returns 0', () => {
    expect(survivorIncomeStepDownMonthlyReal([[12, 12]], 30, STEP_PARAMS, STEP_OFFSETS, 0)).toBe(0) // same-year death
    expect(survivorIncomeStepDownMonthlyReal([[40, 45]], 30, STEP_PARAMS, STEP_OFFSETS, 0)).toBe(0) // both outlive window
    // mixed: only the survivor-phase path counts.
    expect(survivorIncomeStepDownMonthlyReal([[12, 12], [12, 5]], 30, STEP_PARAMS, STEP_OFFSETS, 0)).toBeCloseTo(1_500, 6)
  })
  it('the drop is ≥ 0 with NO §202 survivor benefit in play (the §202-present case is the dedicated fixture below)', () => {
    // STEP_OFFSETS people carry pia=0 ⇒ the §202 survivor benefit is structurally 0, so this exercises
    // only the "deceased's own benefit drops out" regime. The §202 path — the one that could make a per-
    // path drop negative pre-claim — is covered by the steady-state-anchor fixture below (insight 029).
    for (const deaths of [[12, 5], [5, 12], [0, 20], [3, 25]]) {
      expect(survivorIncomeStepDownMonthlyReal([deaths], 30, STEP_PARAMS, STEP_OFFSETS, 0)).toBeGreaterThanOrEqual(0)
    }
  })
})

// ---------------------------------------------------------------------------------------
// 4b. The steady-state anchor (U7 e1b) with a REAL §202 survivor benefit present — the case the
//     pia=0 fixtures above cannot reach. A death after retirement but before claiming would, under a
//     raw first-death-year anchor, read the all-alive leg with $0 SS while the survivor already draws
//     a §202 benefit at 60 ⇒ a NEGATIVE drop that understates the cliff. These pin the corrected
//     behavior: anchor at the year both would-be benefits are in pay status, floor at 0.
// ---------------------------------------------------------------------------------------
// Both claim at offset 4 (survivor age 66, deceased age 68). Own benefits set on the OFFSETS; the
// deceased's small PIA gives a §202 survivor benefit < the survivor's own $30k, so the survivor keeps
// their own and the steady-state drop is exact arithmetic (independent of the §202 magnitude).
const PRECLAIM_SURVIVOR: PersonInputs = {
  sex: 'female', currentAge: 62, birthYear: 1964, retirementAge: 62, earnedIncomeReal: 0, pia: 2_000, socialSecurityClaimAge: 66,
}
const PRECLAIM_DECEASED: PersonInputs = {
  sex: 'male', currentAge: 64, birthYear: 1962, retirementAge: 64, earnedIncomeReal: 0, pia: 1_000, socialSecurityClaimAge: 68,
}
const PRECLAIM_PARAMS: SimulationParams = { ...STEP_PARAMS, people: [PRECLAIM_SURVIVOR, PRECLAIM_DECEASED] }
const PRECLAIM_OFFSETS: readonly PersonOffsets[] = [
  { retire: 0, claim: 4, earnedIncomeReal: 0, socialSecurityReal: 30_000, spousalExcessAnnual: 0 },
  { retire: 0, claim: 4, earnedIncomeReal: 0, socialSecurityReal: 12_000, spousalExcessAnnual: 0 },
]

describe('survivorIncomeStepDownMonthlyReal — the steady-state anchor (U7 e1b, §202 present)', () => {
  it('a PRE-CLAIM death measures the PERMANENT cliff at the steady-state year, never a negative pre-claim artifact', () => {
    // Deceased (idx 1) dies at fd=2, BEFORE both claim at offset 4; the survivor (≥60) draws a §202
    // benefit early. The steady-state anchor measures at year 4 (both would-be benefits in pay status):
    // both-alive 42k − survivor's own 30k = 12k/yr = 1,000/mo. THIS GOLDEN IS THE REGRESSION GUARD: a
    // raw fd-anchor yields a NEGATIVE drop here, and a floor-only fix (no anchor) yields 0 — only the
    // steady-state anchor yields 1,000.
    expect(survivorIncomeStepDownMonthlyReal([[20, 2]], 30, PRECLAIM_PARAMS, PRECLAIM_OFFSETS, 4)).toBeCloseTo(1_000, 6)
  })
  it('a death AFTER both claim measures at the death year (steady state already reached) — same cliff', () => {
    // fd=6 > claimYear 4 ⇒ tStar=6; both already claiming ⇒ 42k − survivor own 30k = 12k/yr = 1,000/mo.
    expect(survivorIncomeStepDownMonthlyReal([[20, 6]], 30, PRECLAIM_PARAMS, PRECLAIM_OFFSETS, 4)).toBeCloseTo(1_000, 6)
  })
  it('the drop is ≥ 0 across pre-claim deaths WITH a real §202 benefit — incl. a survivor who dies before claiming (the floor)', () => {
    // [4,2]: the survivor dies at 4, before the claim year 4 is reached ⇒ tStar clamps pre-claim ⇒ the
    // raw diff is negative ⇒ the FLOOR returns 0 (never a negative step-down). The others anchor to year 4.
    for (const deaths of [[20, 1], [20, 2], [4, 2], [18, 0]]) {
      expect(survivorIncomeStepDownMonthlyReal([deaths], 30, PRECLAIM_PARAMS, PRECLAIM_OFFSETS, 4)).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('the income step-down rides the full simulate() surface (U7 e1b integration)', () => {
  // realParams uses pia=0 (zero SS ⇒ a structurally-zero step-down — vacuous, insight 029). A
  // POSITIVE, non-vacuous magnitude needs real benefits, so give both spouses a PIA.
  const PIA_A: PersonInputs = { ...MALE_60, pia: 2_400 }
  const PIA_B: PersonInputs = { ...FEMALE_58, pia: 1_800 }
  it('present, finite, and POSITIVE on a realistic SS household (non-vacuous — insight 029)', () => {
    const d = dist(simulate(realParams({ overlay: overlayFor(), people: [PIA_A, PIA_B] }), 99, { survivorConditioned: true }))
    const sc = d.survivorConditioned!
    expect(Number.isFinite(sc.incomeStepDownMonthlyReal)).toBe(true)
    expect(sc.incomeStepDownMonthlyReal).toBeGreaterThan(0)
    expect(sc.incomeStepDownMonthlyReal).toBeLessThan(12_000) // bounded by a household's monthly SS (single-benefit cap)
  })
})
