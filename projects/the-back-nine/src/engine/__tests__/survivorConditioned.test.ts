import { describe, it, expect } from 'vitest'
import {
  simulate,
  isSurvivorPhasePath,
  buildSurvivorConditioned,
  type SimOutput,
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
