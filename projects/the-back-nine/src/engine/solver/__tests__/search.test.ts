/**
 * U15 §S3 — `search.ts`, the K-candidate batch runner. Every arm below proves a §S3 contract and
 * FAILS if the behavior is deleted:
 *
 *  - REDUCE-TO-SPINE (test-pinned): the conventional-order / conversion-0 candidate is byte-identical
 *    (same seed) to the validated spine — and a conversion arm is NOT (the byte-identity is a real
 *    match, never a predicate that always returns true).
 *  - IDENTICAL CRN DRAWS ACROSS ALL K (contract #5), proven BY IMPORT: search's seed-A outcomes are
 *    byte-identical to a direct `evaluateCandidates` (the exact shared eval path), and the U14
 *    K-candidate stability check MINTS over search's exact candidate set + its canonical seed-B.
 *  - THE LABELED BASELINES: the conventional baseline is ALWAYS present (a set without it is refused);
 *    the user's forced-in CURRENT strategy rides as an out-of-grid labeled baseline scored on the same
 *    draws; the §S0.4 provenance ids keep the arms distinct.
 *  - A/B DISCIPLINE: seed-B is the canonical `deriveSeedB` (never seedA+1); selection ranks A only;
 *    B is a genuinely independent draw (A ≠ B per candidate on a dispersed world) — both evaluated.
 *  - LEGALITY IS UPSTREAM: search scores exactly the set it is handed (1:1, no re-filter, nothing
 *    dropped from the ranked field).
 */
import { describe, it, expect } from 'vitest'
import type { PersonInputs, SimulationParams } from '@shared/model'
import { simulate } from '@engine/simulate'
import { runSearch } from '../search'
import { applyCandidate, enumerateCandidates, solverCandidateId, type CandidateStrategy } from '../candidates'
import { evaluateCandidates, rankCandidates } from '../../validation/evaluate'
import { decisionSurfaceIdentical, runRankingStability } from '../../validation/rankingStability'
import { deriveSeedB } from '../../validation/heldOutSeed'
import { caseIiBuildBase, CASE_II_HEIR_BRACKET } from '../../reference/solver-cases/caseBracketFill'

// ---- A deterministic zero-vol world (caseIi): the cheap arms run here (draw-invariant, 2 paths). --

/** The FULL enumerated set for caseIi's anchor — every searched policy + the injected user baseline
 *  (caseIi's own fixture filters to taxable-first; search needs the whole set to carry the baselines). */
function detCandidates(): readonly CandidateStrategy[] {
  const { candidates } = enumerateCandidates({
    anchor: {
      committed: { rmd: 0, conversion: 0, ongoingTaxable: 0, ssBenefit: 0, filing: 'mfj', count65: 0, calendarYear: 2026 },
      acaCliffMagi: null,
      irmaaSchedule: null,
      pretaxAvailableAtStart: 400_000, // caseIi's PRETAX
      rmdAtStart: 0,
    },
    window: { startYearOffset: 0, years: 1 },
    userBaseline: { policy: 'custom', drawdownOrder: ['roth', 'pretax', 'taxable'] },
  })
  return candidates
}

const DET_SEED = 12_345
const detInput = () => ({
  base: caseIiBuildBase(),
  candidates: detCandidates(),
  seedA: DET_SEED,
  goal: 'leave-more' as const,
  tieTolerance: 0,
  heirBracket: CASE_II_HEIR_BRACKET,
})

describe('runSearch — reduce-to-spine (the solver layer perturbs no golden)', () => {
  it('the conventional-order / conversion-0 candidate is BYTE-IDENTICAL (same seed) to the plain spine', () => {
    const base = caseIiBuildBase()
    const result = runSearch({ ...detInput(), base })
    const conv = result.conventionalBaseline
    expect(conv.candidate.provenance).toBe('conventional-baseline')
    expect(conv.candidate.policy).toBe('taxable-first')
    expect(conv.candidate.conversion).toBeNull()

    const spine = simulate(base, DET_SEED)
    expect(spine.indeterminate).toBe(false)
    if (spine.indeterminate || spine.infeasible) throw new Error('the spine world must resolve')
    if (conv.a.kind !== 'scored') throw new Error('the conventional baseline must be scored')
    expect(decisionSurfaceIdentical(conv.a.distribution, spine.distribution)).toBe(true)
  })

  it('a CONVERSION arm is NOT byte-identical to the spine — the reduce-to-spine match is non-vacuous', () => {
    const base = caseIiBuildBase()
    const result = runSearch({ ...detInput(), base })
    const spine = simulate(base, DET_SEED)
    if (spine.indeterminate || spine.infeasible) throw new Error('the spine world must resolve')
    const conversionArm = result.evaluations.find((e) => e.candidate.conversion !== null)
    expect(conversionArm, 'the enumerated set carries conversion arms').toBeDefined()
    if (conversionArm!.a.kind !== 'scored') throw new Error('the conversion arm must be scored')
    // A real conversion moves the tax-aware surface — decisionSurfaceIdentical CAN return false.
    expect(decisionSurfaceIdentical(conversionArm!.a.distribution, spine.distribution)).toBe(false)
  })
})

describe('runSearch — the labeled baselines (§S3)', () => {
  it('the conventional baseline is ALWAYS present + the user CURRENT strategy is forced in on the same draws', () => {
    const result = runSearch(detInput())
    // Conventional-order / conversion-0 — the no-change oracle case + the shrinkage prior.
    expect(result.conventionalBaseline.candidate.provenance).toBe('conventional-baseline')
    expect(result.conventionalBaseline.a.kind).toBe('scored')
    // The user's out-of-grid labeled baseline (a custom per-bucket order), scored, not searched.
    expect(result.userBaseline).toBeDefined()
    expect(result.userBaseline!.candidate.provenance).toBe('user-baseline')
    expect(result.userBaseline!.candidate.policy).toBe('custom')
    expect(result.userBaseline!.candidate.drawdownOrder).toEqual(['roth', 'pretax', 'taxable'])
    expect(result.userBaseline!.a.kind).toBe('scored') // scored on the SAME shared draws
    // §S0.4 provenance ids keep the two labeled arms distinct.
    expect(result.conventionalBaseline.id).not.toBe(result.userBaseline!.id)
  })

  it('a set with NO user baseline still carries the conventional one (userBaseline undefined, never fabricated)', () => {
    const candidates = detCandidates().filter((c) => c.provenance !== 'user-baseline')
    const result = runSearch({ ...detInput(), candidates })
    expect(result.userBaseline).toBeUndefined()
    expect(result.conventionalBaseline.candidate.provenance).toBe('conventional-baseline')
  })

  it('REFUSES a set missing the conventional baseline (no prior ⇒ no crownable advice)', () => {
    const candidates = detCandidates().filter((c) => c.provenance !== 'conventional-baseline')
    expect(() => runSearch({ ...detInput(), candidates })).toThrow(/exactly ONE conventional/)
  })

  it('REFUSES two conventional baselines (the ambiguous prior)', () => {
    const set = detCandidates()
    const dup = set.find((c) => c.provenance === 'conventional-baseline')!
    expect(() => runSearch({ ...detInput(), candidates: [...set, dup] })).toThrow(/exactly ONE conventional/)
  })

  it('REFUSES two user baselines (the ambiguous status quo)', () => {
    const set = detCandidates()
    const dup = set.find((c) => c.provenance === 'user-baseline')!
    expect(() => runSearch({ ...detInput(), candidates: [...set, dup] })).toThrow(/at most ONE user baseline/)
  })
})

describe('runSearch — input guards (fail loud, never a quiet degrade)', () => {
  it('REFUSES an empty candidate set', () => {
    expect(() => runSearch({ ...detInput(), candidates: [] })).toThrow(/EMPTY/)
  })

  it('REFUSES a non-integer seed (the bit-identical A/B reproduction contract)', () => {
    expect(() => runSearch({ ...detInput(), seedA: 1.5 })).toThrow(/integer/)
  })
})

describe('runSearch — identical CRN draws across all K, proven BY IMPORT + the exact set is scored', () => {
  it("search's seed-A outcomes are byte-identical to a direct evaluateCandidates (the shared CRN path)", () => {
    const base = caseIiBuildBase()
    const candidates = detCandidates()
    const result = runSearch({ ...detInput(), base, candidates })
    const direct = evaluateCandidates(base, candidates, DET_SEED, { heirBracket: CASE_II_HEIR_BRACKET })

    // The exact set, 1:1, in enumeration order — nothing added, dropped, or reordered.
    expect(result.evaluations.map((e) => e.candidate)).toEqual([...candidates])
    expect(result.evaluations).toHaveLength(candidates.length)
    expect(direct).toHaveLength(candidates.length)

    result.evaluations.forEach((e, i) => {
      const d = direct[i]!
      expect(e.a.kind).toBe(d.kind)
      if (e.a.kind === 'scored' && d.kind === 'scored') {
        expect(decisionSurfaceIdentical(e.a.distribution, d.distribution)).toBe(true)
      }
    })
  })

  it('the ranked field on seed A is the reference ranking (rankForGoal ≡ rankCandidates) — nothing dropped', () => {
    const base = caseIiBuildBase()
    const candidates = detCandidates()
    const result = runSearch({ ...detInput(), base, candidates })
    const direct = evaluateCandidates(base, candidates, DET_SEED, { heirBracket: CASE_II_HEIR_BRACKET })
    const expectedIds = rankCandidates(direct, 'leave-more', 0).map((o) => solverCandidateId(o.candidate))
    expect(result.rankedA.map((o) => solverCandidateId(o.candidate))).toEqual(expectedIds)
    expect(result.rankedA).toHaveLength(candidates.length) // the whole field ranks, none re-filtered
  })
})

// ---- A dispersed, survivor-crossing stochastic world: the A/B independence + the live K-candidate
//      stability MINT over search's EXACT set (both need real vol / a real survivor transition). ----

const stochPeople: readonly PersonInputs[] = [
  { sex: 'female', currentAge: 64, birthYear: 1962, retirementAge: 63, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 67 },
  { sex: 'male', currentAge: 62, birthYear: 1964, retirementAge: 62, earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 67 },
]

function stochBase(): SimulationParams {
  return {
    initialPortfolio: 1_100_000,
    annualSpendingReal: 80_000,
    stockWeight: 0.5,
    people: stochPeople,
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
    paths: 150,
    maxHorizonYears: 42,
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

function stochCandidates(): readonly CandidateStrategy[] {
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

const STOCH_HEIR_BRACKET = 0.25
const STOCH_RANKING = { goal: 'leave-more', heirBracket: STOCH_HEIR_BRACKET } as const

describe('runSearch — A/B discipline + the U14 K-candidate stability runs over THIS exact set', () => {
  it(
    'seed-B is canonical, B is a genuinely independent draw, A is the selection ranking — and the ' +
      'exact scored set mints the K-candidate CRN stability report',
    () => {
      const base = stochBase()
      const candidates = stochCandidates()
      const seedA = 0xa11ce
      const result = runSearch({ base, candidates, seedA, goal: 'leave-more', tieTolerance: 0, heirBracket: STOCH_HEIR_BRACKET })

      // A/B: seed-B is the CANONICAL expansion (never seedA+1), and both seed-sets were evaluated.
      expect(result.seedB).toBe(deriveSeedB(seedA))
      expect(result.evaluations.every((e) => e.a !== undefined && e.b !== undefined)).toBe(true)

      // B is a genuinely INDEPENDENT draw: at least one candidate's A and B surfaces DIFFER (a copy
      // of A would make the held-out vacuous — insight 029's presence companion).
      const anyDiffer = result.evaluations.some(
        (e) => e.a.kind === 'scored' && e.b.kind === 'scored' && !decisionSurfaceIdentical(e.a.distribution, e.b.distribution),
      )
      expect(anyDiffer).toBe(true)

      // SELECTION ranks A only: rankedA is the seed-A reference ranking, never the B ranking.
      const directA = evaluateCandidates(base, candidates, seedA, { heirBracket: STOCH_HEIR_BRACKET })
      const expectedAIds = rankCandidates(directA, 'leave-more', 0).map((o) => solverCandidateId(o.candidate))
      expect(result.rankedA.map((o) => solverCandidateId(o.candidate))).toEqual(expectedAIds)

      // THE EXACT SET: the U14 K-candidate stability check runs over the SAME (base, candidates) search
      // scored, on search's own canonical seed-B — and mints (BY IMPORT: search + the stability harness
      // both drive `evaluateCandidates`, so the CRN identity is shared, never re-proven here).
      const perturbIndex = candidates.findIndex((c) => c.conversion !== null)
      const siblingIndex = candidates.findIndex((c, i) => i !== perturbIndex && c.conversion !== null)
      expect(perturbIndex, 'the set carries conversion candidates').toBeGreaterThanOrEqual(0)
      const stability = runRankingStability({
        base,
        candidates,
        seedA,
        seedB: result.seedB,
        perturbIndex,
        siblingIndex,
        ranking: STOCH_RANKING,
        tieTolerance: 0,
      })
      expect(
        'report' in stability,
        'ok' in stability && stability.ok === false ? stability.violations.map((v) => v.text).join(' | ') : '',
      ).toBe(true)
      if ('report' in stability) {
        // candidateCount === search's evaluated count ⇒ the check ran over search's EXACT set.
        expect(stability.report.candidateCount).toBe(result.evaluations.length)
        expect(stability.report.candidateCount).toBe(candidates.length)
        expect(stability.report.minSurvivorCrossings).toBeGreaterThan(0) // non-vacuous (burned/027)
      }
    },
    240_000,
  )
})

// ---- contract #8a: spending is IMMUTABLE across the search (the budget is read-only) ----------------
// The solver optimizes the FUNDING of the user-set spending shape; it NEVER optimizes the shape. No
// candidate can express a budget change (the CandidateStrategy type has no spending field), and the
// search mutates nothing on the base. (The plan's §S7 sweep found no live test for this contract.)

describe('runSearch — spending is IMMUTABLE across the search (contract #8a — the budget is read-only)', () => {
  it('every candidate arm carries the base’s budget line byte-identically — a candidate cannot alter spending', () => {
    const base = caseIiBuildBase()
    for (const c of detCandidates()) {
      const arm = applyCandidate(base, c)
      expect(arm.annualSpendingReal, `${solverCandidateId(c)} annualSpendingReal`).toBe(base.annualSpendingReal)
      expect(arm.survivorSpendingRatio, `${solverCandidateId(c)} survivorSpendingRatio`).toBe(base.survivorSpendingRatio)
    }
  })

  it('the CandidateStrategy shape carries NO budget field — spending is immutable BY CONSTRUCTION', () => {
    // A candidate names policy / order / conversion ONLY; there is no spending-bearing key to honor,
    // so no candidate CAN alter the budget — the structural half of contract #8a.
    const allowed = new Set(['policy', 'conversion', 'provenance', 'drawdownOrder', 'anchoredRail'])
    for (const c of detCandidates()) {
      for (const key of Object.keys(c)) {
        expect(allowed.has(key), `candidate carries a non-strategy key: ${key}`).toBe(true)
      }
    }
  })

  it('runSearch MUTATES no field of the base — the household input is read-only across the whole batch', () => {
    const base = caseIiBuildBase()
    const before = JSON.stringify(base)
    runSearch({ ...detInput(), base })
    // Not just spending — the entire input is untouched (the solver reads the base, never writes it).
    expect(JSON.stringify(base)).toBe(before)
  })
})
