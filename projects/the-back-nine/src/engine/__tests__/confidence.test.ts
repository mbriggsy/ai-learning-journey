import { describe, it, expect } from 'vitest'
import { summarize, SURVIVAL_GRID } from '@engine/confidence'
import { simulate } from '@engine/simulate'
import { validationMarket } from '@engine/reference/methodology'
import { type Distribution, type SimulationParams, type PersonInputs } from '@shared/model'
import type { SimOutput } from '@engine/simulate'

const PERSON: PersonInputs = {
  sex: 'male', currentAge: 65, birthYear: 1961, retirementAge: 65,
  earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 65,
}
const params: SimulationParams = {
  initialPortfolio: 1000, annualSpendingReal: 48, stockWeight: 0.5, people: [PERSON],
  survivorSpendingRatio: 0.75, drawdownPolicy: 'proportional', market: validationMarket.value,
  paths: 1000, maxHorizonYears: 30, longevityMode: 'fixed-horizon',
}

/** Build a SimOutput with a chosen survival fraction (depletions optional). */
// Returns the RESOLVED arm specifically (summarize's parameter type excludes the M6
// infeasible sentinel — the caller dispatches that arm before summarizing).
function out(
  survivalFraction: number,
  depletionYears: number[] = [],
  terminals: number[] = [],
): Exclude<SimOutput, { infeasible: true }> {
  const dist: Distribution = { terminalValuesReal: terminals, depletionYears, survivalFraction }
  return { indeterminate: false, distribution: dist }
}

/** Build a SimOutput that ALSO carries a survivor-conditioned surface (U7 e1c) with a chosen survivor
 *  fraction + income step-down, so the survivor reading can be exercised independently of the joint. */
function outWithSurvivor(
  jointSurvival: number,
  survivorFraction: number,
  incomeStepDownMonthlyReal: number,
  depletionYears: number[] = [],
): Exclude<SimOutput, { infeasible: true }> {
  const dist: Distribution = {
    terminalValuesReal: [],
    depletionYears,
    survivalFraction: jointSurvival,
    survivorConditioned: {
      survivorPhasePaths: 100,
      survivorSurvivors: Math.round(survivorFraction * 100),
      survivalFraction: survivorFraction,
      incomeStepDownMonthlyReal,
    },
  }
  return { indeterminate: false, distribution: dist }
}

describe('cross-engine headline robustness — quantize BEFORE the band-edge decision', () => {
  it('a last-ULP perturbation of the survival statistic does NOT flip X of 10', () => {
    const base = 0.9
    const perturbed = 0.9 + 1e-15 // a transcendental difference across JS engines
    const a = summarize(out(base), params, 1).headline.xOfTen.value
    const b = summarize(out(perturbed), params, 1).headline.xOfTen.value
    expect(a).toBe(b)
  })

  it('two values straddling a band edge by sub-grid noise resolve identically', () => {
    // 0.85 is a band edge (round(8.5)); ±ULP must not split the verdict.
    const lo = summarize(out(0.85 - 1e-14), params, 1).headline
    const hi = summarize(out(0.85 + 1e-14), params, 1).headline
    expect(lo.xOfTen.value).toBe(hi.xOfTen.value)
    expect(lo.outcomeState).toBe(hi.outcomeState)
  })

  it('the grid is far coarser than ULP noise', () => {
    expect(SURVIVAL_GRID).toBeGreaterThan(1e-6)
  })
})

describe('the 10/10-honesty clamp', () => {
  it('all-paths-survive renders as over-funded at the near-ceiling, NEVER a bald 10 of 10', () => {
    const h = summarize(out(1.0, [], [500, 600, 700]), params, 1).headline
    expect(h.outcomeState).toBe('over-funded')
    expect(h.xOfTen.value).toBe(9) // capped — never 10
  })

  it('99% survival is still capped at 9 (no false certainty)', () => {
    expect(summarize(out(0.99), params, 1).headline.xOfTen.value).toBe(9)
  })
})

describe('outcome-state bands', () => {
  const stateFor = (s: number, dep: number[] = []) => summarize(out(s, dep), params, 1).headline.outcomeState
  it('maps survival fractions to the right verdict', () => {
    expect(stateFor(0.99)).toBe('over-funded')
    expect(stateFor(0.9)).toBe('on-track')
    expect(stateFor(0.75)).toBe('borderline')
    expect(stateFor(0.4)).toBe('off-track')
  })

  it('already-failing requires an EARLY death; a late total failure is off-track', () => {
    expect(stateFor(0.0, [0, 0, 0, 1])).toBe('already-failing') // dies immediately
    expect(stateFor(0.0, [24, 25, 26, 27])).toBe('off-track') // fails, but late
  })
})

describe('margins + framing', () => {
  it('emits a margin-to-edge for both the headline and the dollar', () => {
    const r = summarize(out(0.88, [], [100, 200, 300]), params, 1)
    expect(Number.isFinite(r.headline.xOfTen.marginToEdge)).toBe(true)
    expect(Number.isFinite(r.dollar.perMonthReal.marginToEdge)).toBe(true)
  })

  it('over-funded points to ROOM, off-track points to TRIM (never a probability of failure)', () => {
    expect(summarize(out(0.99, [], [500, 600]), params, 1).dollar.direction).toBe('room')
    expect(summarize(out(0.3, [10, 12, 14]), params, 1).dollar.direction).toBe('trim')
  })
})

// U3-exit code-review pilot (testing-1): the displayed $/month figure had its MAGNITUDE entirely
// unasserted — only direction + finiteness were tested, so a sign flip, a wrong 0.04, a /12-vs-/1 slip,
// or a wrong gap formula would all pass green (a calm-but-wrong recommendation). Pin the values.
describe('the displayed $/month MAGNITUDE is pinned, not just its direction', () => {
  // params.annualSpendingReal === 48 ⇒ monthlySpend === 4.
  it('room = p10 × 4% ÷ 12; trim = −monthlySpend × gap-below-on-track; on-the-line = exactly 0', () => {
    // room: over-funded, p10 = 120,000 ⇒ (120,000 × 0.04) / 12 = 400/mo.
    const room = summarize(out(0.99, [], [120_000]), params, 1).dollar
    expect(room.direction).toBe('room')
    expect(room.perMonthReal.value).toBeCloseTo(400, 6)
    // trim: 30% survival ⇒ gap = onTrack(0.85) − quantize(0.30) = 0.55 ⇒ −4 × 0.55 = −2.2/mo.
    const trim = summarize(out(0.3, [10, 12, 14]), params, 1).dollar
    expect(trim.direction).toBe('trim')
    expect(trim.perMonthReal.value).toBeCloseTo(-2.2, 6)
    // on-the-line: borderline ⇒ exactly 0.
    const hold = summarize(out(0.75), params, 1).dollar
    expect(hold.direction).toBe('on-the-line')
    expect(hold.perMonthReal.value).toBe(0)
  })

  it('an on-track plan with a DEPLETED bad decile (p10 ≤ 0) HOLDS — it never emits a contradictory "trim"', () => {
    // survival 0.88 = on-track, but terminals include zeros ⇒ percentile(·, 0.1) = 0 ⇒ p10 ≤ 0. The prior
    // code fell this through to 'trim' (an on-track headline paired with a trim dollar — contradictory).
    const r = summarize(out(0.88, [], [0, 0, 100, 200, 300]), params, 1).dollar
    expect(r.direction).toBe('on-the-line')
    expect(r.perMonthReal.value).toBe(0)
  })
})

describe('the survivor reading (U7 e1c — the "as the survivor" grammar)', () => {
  it('is ABSENT when the run carries no survivor surface (presence-keyed)', () => {
    expect(summarize(out(0.9), params, 1).survivorReading).toBeUndefined()
  })

  it('is PRESENT when the distribution carries a survivor surface, speaking the joint vocabulary', () => {
    const r = summarize(outWithSurvivor(0.9, 0.72, 1250), params, 1)
    expect(r.survivorReading).toBeDefined()
    expect(r.survivorReading!.xOfTen.value).toBe(7) // round(0.72 × 10) = 7
    expect(r.survivorReading!.outcomeState).toBe('borderline') // 0.72 ∈ [0.65, 0.85)
    expect(r.survivorReading!.incomeStepDownMonthlyReal).toBe(1250) // passed straight through
  })

  it('rounds the SURVIVOR fraction, NOT the joint one — the two readings diverge honestly', () => {
    // The whole point: a calm joint 9-of-10 can hide a fragile 4-of-10 survivor outlook.
    const r = summarize(outWithSurvivor(0.9, 0.4, 800), params, 1)
    expect(r.headline.xOfTen.value).toBe(9)
    expect(r.headline.outcomeState).toBe('on-track')
    expect(r.survivorReading!.xOfTen.value).toBe(4)
    expect(r.survivorReading!.outcomeState).toBe('off-track')
  })

  it('applies the SAME 9-cap honesty clamp — an all-survive survivor fraction never reads 10 of 10', () => {
    const r = summarize(outWithSurvivor(1.0, 1.0, 0, []), params, 1)
    expect(r.survivorReading!.xOfTen.value).toBe(9) // capped, never 10
    expect(r.survivorReading!.outcomeState).toBe('over-funded')
  })

  it('reserves already-failing for the JOINT early-death signal, not the survivor fraction alone', () => {
    // Survivor fraction ~0 in both, but already-failing fires only when the JOINT plan was DOA (early
    // depletion) — a survivor cannot be a calm survivor of a year-0-unfundable plan.
    const doa = summarize(outWithSurvivor(0.0, 0.0, 500, [0, 0, 0]), params, 1)
    expect(doa.survivorReading!.outcomeState).toBe('already-failing')
    const late = summarize(outWithSurvivor(0.0, 0.0, 500, [24, 25, 26]), params, 1)
    expect(late.survivorReading!.outcomeState).toBe('off-track')
  })

  it('survives the cross-engine quantize too — a sub-grid perturbation does not flip the survivor count', () => {
    const lo = summarize(outWithSurvivor(0.9, 0.85 - 1e-14, 0), params, 1).survivorReading!
    const hi = summarize(outWithSurvivor(0.9, 0.85 + 1e-14, 0), params, 1).survivorReading!
    expect(lo.xOfTen.value).toBe(hi.xOfTen.value)
    expect(lo.outcomeState).toBe(hi.outcomeState)
  })

  it('pins the survivor band EDGES directionally — its own guard, not only the shared selectOutcomeState', () => {
    const stateAt = (sf: number) => summarize(outWithSurvivor(0.9, sf, 0), params, 1).survivorReading!.outcomeState
    expect(stateAt(0.85)).toBe('on-track') // ≥ onTrack edge
    expect(stateAt(0.84)).toBe('borderline') // just below
    expect(stateAt(0.65)).toBe('borderline') // ≥ borderline edge
    expect(stateAt(0.64)).toBe('off-track') // just below
  })
})

describe('indeterminate — the honest non-answer', () => {
  it('an indeterminate sim output yields the indeterminate state, not a confident number', () => {
    const r = summarize({ indeterminate: true, reason: 'no people' }, params, 99)
    expect(r.headline.outcomeState).toBe('indeterminate')
    expect(r.headline.xOfTen.value).toBe(0)
    expect(r.seed).toBe(99)
  })

  it('integrates: a degenerate sim → indeterminate reading end-to-end', () => {
    const bad = simulate({ ...params, people: [] }, 5)
    if (bad.infeasible) throw new Error('unexpected infeasible') // summarize excludes the M6 sentinel arm by type
    expect(summarize(bad, params, 5).headline.outcomeState).toBe('indeterminate')
  })

  it('integrates: a $0 portfolio → already-failing reading end-to-end', () => {
    const dead = simulate({ ...params, initialPortfolio: 0 }, 5)
    if (dead.infeasible) throw new Error('unexpected infeasible')
    expect(summarize(dead, { ...params, initialPortfolio: 0 }, 5).headline.outcomeState).toBe('already-failing')
  })
})
