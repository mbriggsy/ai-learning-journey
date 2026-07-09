import { describe, it, expect } from 'vitest'
import { summarize, SURVIVAL_GRID, BANDS, quantizeSurvival, marginToStateEdge } from '@engine/confidence'
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

// F5 (council-ratified): the state-edge margin — the THIRD stateless margin, consumed by the
// P3 sticky STATE gate (memoryModel, architecture §9). The x-of-10 display lattice cannot
// stand in for it: its flip points coincide with the onTrack/borderline edges (0.85/0.65)
// but NOT overFunded (0.98). DND-012: every expected margin below is hand-derived in a
// comment — never re-computed via the engine's own formula.
describe('the state-edge margin (stateMarginToEdge — the P3 sticky state gate input)', () => {
  const marginAt = (s: number) => summarize(out(s), params, 1).headline.stateMarginToEdge

  it('hand-derived fixtures: distance of the QUANTIZED survival to the nearest BANDS state edge', () => {
    // quantized 0.86 → nearest edge onTrack 0.85 → |0.86 − 0.85| = 0.01
    expect(marginAt(0.86)).toBeCloseTo(0.01, 12)
    // quantized 0.90 → |0.90 − 0.85| = 0.05 beats |0.90 − 0.98| = 0.08 → 0.05
    expect(marginAt(0.9)).toBeCloseTo(0.05, 12)
    // quantized 0.98 → sits exactly ON the overFunded edge → 0.00
    expect(marginAt(0.98)).toBeCloseTo(0, 12)
    // quantized 0.66 → nearest edge borderline 0.65 → |0.66 − 0.65| = 0.01
    expect(marginAt(0.66)).toBeCloseTo(0.01, 12)
    // quantized 0.30 → nearest edge is still borderline 0.65 → 0.35 (deep off-track measures far)
    expect(marginAt(0.3)).toBeCloseTo(0.35, 12)
  })

  it('is computed ON THE QUANTIZED value — the same value the band compare reads (raw-source mutation arm)', () => {
    // raw 0.857 quantizes to 0.86 → margin |0.86 − 0.85| = 0.01. A mutant measuring the RAW
    // value would emit |0.857 − 0.85| = 0.007 — this pin goes red on it (planted 2026-07-08: red).
    expect(marginAt(0.857)).toBeCloseTo(0.01, 12)
    // And the emission IS the exported helper applied to the quantized statistic — one source.
    expect(marginAt(0.72)).toBe(marginToStateEdge(quantizeSurvival(0.72)))
  })

  it('binds to the exported BANDS — an edge re-typed wrong goes red (the planted-fail arm)', () => {
    // Derived from the BANDS object itself (never re-typed literals): sitting exactly ON each
    // exported edge measures 0; one grid step above it measures exactly one grid step. A
    // re-typed edge inside the helper breaks BOTH pins (planted 2026-07-08: overFunded→0.97 = red).
    for (const edge of Object.values(BANDS)) {
      expect(marginToStateEdge(quantizeSurvival(edge))).toBeCloseTo(0, 12)
      expect(marginToStateEdge(quantizeSurvival(edge + SURVIVAL_GRID))).toBeCloseTo(SURVIVAL_GRID, 12)
    }
  })

  it('the FLOOR reading measures its OWN quantized fraction — every Headline construction site emits it', () => {
    const dist: Distribution = {
      terminalValuesReal: [],
      depletionYears: [],
      survivalFraction: 0.9,
      floor: { survivalFraction: 0.66, depletionYears: [] },
    }
    const r = summarize({ indeterminate: false, distribution: dist }, params, 1)
    // joint quantized 0.90 → 0.05; floor quantized 0.66 → |0.66 − 0.65| = 0.01 (hand-derived).
    expect(r.headline.stateMarginToEdge).toBeCloseTo(0.05, 12)
    expect(r.floorReading!.stateMarginToEdge).toBeCloseTo(0.01, 12)
  })

  it('the indeterminate reading emits 0 — the existing zero-margin convention', () => {
    const r = summarize({ indeterminate: true, reason: 'no people' }, params, 7)
    expect(r.headline.stateMarginToEdge).toBe(0)
  })

  it('ADDITIVITY: an existing pinned reading keeps every OTHER field byte-unchanged, gaining exactly ONE field', () => {
    // The pre-F5 pinned reading at survival 0.9 with p10 = 120,000 (all hand-derived):
    // xOfTen = round(9.0) = 9; its margin = |9.0 − 9.5|/10 = 0.05; state on-track (0.90 ≥ 0.85);
    // dollar = room at (120,000 × 0.04)/12 = 400/mo. None of these may move.
    const r = summarize(out(0.9, [], [120_000]), params, 42)
    expect(r.headline.xOfTen.value).toBe(9)
    expect(r.headline.xOfTen.marginToEdge).toBeCloseTo(0.05, 12)
    expect(r.headline.outcomeState).toBe('on-track')
    expect(r.dollar.direction).toBe('room')
    expect(r.dollar.perMonthReal.value).toBeCloseTo(400, 6)
    expect(r.seed).toBe(42)
    // The additive shape: the ONE new field and nothing else joined the headline.
    expect(Object.keys(r.headline).sort()).toEqual(['outcomeState', 'stateMarginToEdge', 'xOfTen'])
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
