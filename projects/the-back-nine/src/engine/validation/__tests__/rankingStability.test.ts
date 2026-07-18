/**
 * U14 S3 — K-candidate CRN ranking stability. The live fixture is a STOCHASTIC household
 * (sampled longevity, real vol) whose candidate set comes from the SHARED enumerator — the
 * set U15 will score — proven dimension-invariant, perturbation-clean, and survivor-crossing
 * NON-vacuous on both seed-sets. The red arms drive the report's refusal paths with worlds
 * that genuinely lack the property (a fixed-horizon world never crosses — the vacuity guard
 * itself must fire), never with mocks.
 */
import { describe, it, expect } from 'vitest'
import type { PersonInputs, SimulationParams } from '@shared/model'
import { enumerateCandidates, type CandidateStrategy } from '../../solver/candidates'
import { caseIiBuildBase } from '../../reference/solver-cases/caseBracketFill'
import { runRankingStability } from '../rankingStability'

const people: readonly PersonInputs[] = [
  { sex: 'female', currentAge: 64, birthYear: 1962, retirementAge: 63, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 67 },
  { sex: 'male', currentAge: 62, birthYear: 1964, retirementAge: 62, earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 67 },
]

function stochasticBase(): SimulationParams {
  return {
    initialPortfolio: 1_100_000,
    annualSpendingReal: 80_000,
    stockWeight: 0.5,
    people,
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    market: {
      stock: { mean: 0.04, stdDev: 0.12 },
      bond: { mean: 0.015, stdDev: 0.05 },
      inflation: { mean: 0.03, stdDev: 0.041 },
      stockBondCorrelation: 0,
      space: 'simple',
      returnsAreReal: true,
    },
    paths: 250,
    maxHorizonYears: 45,
    longevityMode: 'sampled', // the survivor MFJ→single transition is REAL here
    overlay: {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: 2026,
      buckets: { taxable: 400_000, pretax: 600_000, roth: 100_000 },
      initialTaxableBasis: 300_000,
      filing: 'mfj',
    },
  }
}

function stochasticCandidates(): readonly CandidateStrategy[] {
  const { candidates } = enumerateCandidates({
    anchor: {
      committed: { rmd: 0, conversion: 0, ongoingTaxable: 0, ssBenefit: 0, filing: 'mfj', count65: 0, calendarYear: 2026 },
      acaCliffMagi: null,
      irmaaSchedule: null,
      pretaxAvailableAtStart: 600_000,
      rmdAtStart: 0,
    },
    window: { startYearOffset: 0, years: 5 },
    userBaseline: { policy: 'custom', drawdownOrder: ['roth', 'pretax', 'taxable'] },
  })
  return candidates
}

describe('runRankingStability — the live K-candidate CRN pass', () => {
  it('mints the branded report: dimensions invariant, perturbation-clean, survivor crossings non-vacuous on BOTH seeds', () => {
    const candidates = stochasticCandidates()
    const perturbIndex = candidates.findIndex((c) => c.conversion !== null)
    const siblingIndex = candidates.findIndex((c, i) => i !== perturbIndex && c.conversion !== null)
    expect(perturbIndex, 'the enumerated set carries conversion candidates').toBeGreaterThanOrEqual(0)
    const out = runRankingStability({
      base: stochasticBase(),
      candidates,
      seedA: 0xa11ce,
      seedB: 0xb0b5eed, // a distinct literal — S5 owns the REAL seedB derivation discipline
      perturbIndex,
      siblingIndex,
    })
    expect('report' in out, 'ok' in out && out.ok === false ? (out as { violations: readonly string[] }).violations.join(' | ') : '').toBe(true)
    if ('report' in out) {
      expect(out.report.candidateCount).toBe(candidates.length)
      expect(out.report.minSurvivorCrossings).toBeGreaterThan(0) // burned/027 — never vacuous
      expect(out.report.infeasibleCount).toBe(0)
    }
  }, 240_000)

  it('REFUSES a world that never crosses the survivor transition (the vacuity guard fires on a genuinely crossing-free world)', () => {
    // case (ii)'s fixed-horizon world: no sampled deaths ⇒ no survivor phase ⇒ the CRN
    // across-the-transition claim WOULD be vacuous — the guard must say so, loudly.
    const base = caseIiBuildBase()
    const candidates: readonly CandidateStrategy[] = [
      { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' },
      { policy: 'taxable-first', conversion: { annualAmountReal: 10_000, startYearOffset: 0, years: 1 }, provenance: 'grid' },
      { policy: 'taxable-first', conversion: { annualAmountReal: 20_000, startYearOffset: 0, years: 1 }, provenance: 'grid' },
    ]
    const out = runRankingStability({ base, candidates, seedA: 1, seedB: 2, perturbIndex: 1, siblingIndex: 2 })
    expect('report' in out).toBe(false)
    if ('ok' in out && !out.ok) {
      expect(out.violations.some((v) => /survivor regime.*vacuous/.test(v))).toBe(true)
    }
  }, 60_000)

  it('REFUSES a misconfigured perturbation arm (the perturbed candidate must carry a conversion plan)', () => {
    const base = stochasticBase()
    const candidates: readonly CandidateStrategy[] = [
      { policy: 'proportional', conversion: null, provenance: 'grid' },
      { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' },
    ]
    const out = runRankingStability({ base, candidates, seedA: 1, seedB: 2, perturbIndex: 0, siblingIndex: 1 })
    expect('report' in out).toBe(false)
    if ('ok' in out && !out.ok) {
      expect(out.violations.some((v) => /misconfigured/.test(v))).toBe(true)
    }
  }, 120_000)
})
