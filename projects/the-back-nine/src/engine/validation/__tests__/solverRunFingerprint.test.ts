/**
 * U15 §S0.3 — THE MOVED-WITNESS BATTERY for the solver-run fingerprint (red-armed).
 *
 * The fingerprint's ONLY job is identity: two runs share it IFF every ranking-affecting input
 * matches, so `solve()` (S5) can refuse a token/report minted over a DIFFERENT run. This battery
 * proves the fingerprint is NOT INERT on any such input — each enumerated class is changed ALONE
 * and the fingerprint MUST move; an inert fingerprint on a genuinely-changed input is a NAMED
 * violation (the mirror of the fold's `decisionSurfaceIdentical` + moved-witness idiom, insight
 * 093 — a guard over a SUBSET passes a reallocation). The named-violation message IS the red arm:
 * delete the field from the serialization and the class's assertion fails, naming exactly what
 * went inert. Beyond the §S0.1 enumerated list, the fail-closed SUPERSET classes (market,
 * stockWeight, paths, survivorSpendingRatio) are witnessed too — the header's claim that the
 * WHOLE run identity is captured, made falsifiable.
 */
import { describe, it, expect } from 'vitest'
import type { OverlayParams, PersonInputs, SimulationParams } from '@shared/model'
import type { CandidateStrategy } from '../../solver/candidates'
import { solverRunFingerprint, type SolverRunRanking } from '../solverRunFingerprint'

const person = (over: Partial<PersonInputs> = {}): PersonInputs => ({
  sex: 'female',
  currentAge: 60,
  birthYear: 1966,
  retirementAge: 60,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 70,
  ...over,
})

const overlay = (over: Partial<OverlayParams> = {}): OverlayParams => ({
  taxEnabled: true,
  rmdEnabled: true,
  startCalendarYear: 2026,
  buckets: { taxable: 300_000, pretax: 500_000, roth: 100_000 },
  initialTaxableBasis: 250_000,
  filing: 'mfj',
  ...over,
})

function baseParams(over: Partial<SimulationParams> = {}): SimulationParams {
  return {
    initialPortfolio: 900_000,
    annualSpendingReal: 70_000,
    stockWeight: 0.5,
    people: [person(), person({ sex: 'male', birthYear: 1964, currentAge: 62 })],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'taxable-first',
    market: {
      stock: { mean: 0.04, stdDev: 0.12 },
      bond: { mean: 0.015, stdDev: 0.05 },
      inflation: { mean: 0.03, stdDev: 0.041 },
      stockBondCorrelation: 0,
      space: 'simple',
      returnsAreReal: true,
    },
    paths: 200,
    maxHorizonYears: 40,
    longevityMode: 'sampled',
    overlay: overlay(),
    ...over,
  }
}

/** A roster spanning all three provenance arms + a custom-order user baseline (the id-lossy case
 *  the full-field capture must still distinguish). */
const baseCandidates: readonly CandidateStrategy[] = [
  { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' },
  {
    policy: 'taxable-first',
    conversion: { annualAmountReal: 20_000, startYearOffset: 0, years: 3 },
    provenance: 'grid',
  },
  { policy: 'custom', conversion: null, provenance: 'user-baseline', drawdownOrder: ['roth', 'pretax', 'taxable'] },
]

const baseRanking: SolverRunRanking = { goal: 'leave-more', heirBracket: 0.25 }

const fp = (
  params: SimulationParams = baseParams(),
  candidates: readonly CandidateStrategy[] = baseCandidates,
  ranking: SolverRunRanking = baseRanking,
): string => solverRunFingerprint(params, candidates, ranking)

const baseFp = fp()

/** The red arm: a genuinely-changed input that leaves the fingerprint identical is a NAMED
 *  violation (§S0.3). */
const moves = (label: string, changed: string): void => {
  expect(
    changed,
    `INERT FINGERPRINT — a genuinely-changed ${label} left the fingerprint identical (§S0.3 named violation)`,
  ).not.toBe(baseFp)
}

describe('solverRunFingerprint — determinism + key-order invariance', () => {
  it('is deterministic: identical inputs reproduce the fingerprint byte-for-byte', () => {
    expect(fp()).toBe(baseFp)
    // A freshly rebuilt params object (new identity, same values) fingerprints identically.
    expect(fp(baseParams())).toBe(baseFp)
  })

  it('is INVARIANT to object key insertion order (the canonical serializer sorts keys)', () => {
    // Same values, buckets written in a scrambled key order — a builder’s insertion order must
    // never perturb the run identity.
    const scrambled = baseParams({
      overlay: overlay({ buckets: { roth: 100_000, pretax: 500_000, taxable: 300_000 } }),
    })
    expect(fp(scrambled)).toBe(baseFp)
    // …and at the ranking level too.
    expect(fp(baseParams(), baseCandidates, { heirBracket: 0.25, goal: 'leave-more' })).toBe(baseFp)
  })

  it('encodes a non-finite number DISTINCTLY (Infinity ≠ NaN ≠ nulled — the DND-009 collision guard)', () => {
    // bracketFillCeilings legitimately carries +Infinity; JSON.stringify would null it AND a NaN,
    // collapsing two different runs onto one fingerprint. The canonical serializer keeps them apart.
    const inf = fp(baseParams({ overlay: overlay({ bracketFillCeilings: [Number.POSITIVE_INFINITY] }) }))
    const nan = fp(baseParams({ overlay: overlay({ bracketFillCeilings: [Number.NaN] }) }))
    const finite = fp(baseParams({ overlay: overlay({ bracketFillCeilings: [500_000] }) }))
    expect(inf).not.toBe(nan)
    expect(inf).not.toBe(finite)
    expect(nan).not.toBe(finite)
    expect(inf).not.toBe(baseFp)
  })
})

describe('solverRunFingerprint — the §S0.1 enumerated input classes each move it (red-armed)', () => {
  it('a per-person per-bucket balance', () => {
    moves('per-bucket balance', fp(baseParams({ overlay: overlay({ buckets: { taxable: 300_001, pretax: 500_000, roth: 100_000 } }) })))
    // the per-person pre-tax split is a per-person per-bucket balance too
    moves('pretaxByPerson split', fp(baseParams({ overlay: overlay({ pretaxByPerson: [500_000, 0] }) })))
    moves('initialPortfolio', fp(baseParams({ initialPortfolio: 900_001 })))
    moves('initialTaxableBasis', fp(baseParams({ overlay: overlay({ initialTaxableBasis: 250_001 }) })))
  })

  it('the Tier-2 goal', () => {
    moves('Tier-2 goal', fp(baseParams(), baseCandidates, { goal: 'pay-less-tax' }))
  })

  it('the heirBracket', () => {
    moves('heirBracket', fp(baseParams(), baseCandidates, { goal: 'leave-more', heirBracket: 0.3 }))
    // present-vs-absent heirBracket is itself a change (leave-more with no bracket ≠ hb 0.25)
    moves('heirBracket presence', fp(baseParams(), baseCandidates, { goal: 'leave-more' }))
  })

  it('the budget / spending inputs', () => {
    moves('annualSpendingReal', fp(baseParams({ annualSpendingReal: 70_001 })))
    moves('budget presence', fp(baseParams({ budget: { sticky: [1], scalableEssentials: [2], discretionary: [3] } })))
  })

  it('the horizon + dates', () => {
    moves('maxHorizonYears', fp(baseParams({ maxHorizonYears: 41 })))
    moves('startCalendarYear', fp(baseParams({ overlay: overlay({ startCalendarYear: 2027 }) })))
  })

  it('people (ages / filing)', () => {
    moves('a person currentAge', fp(baseParams({ people: [person({ currentAge: 61 }), person({ sex: 'male', birthYear: 1964, currentAge: 62 })] })))
    moves('a person birthYear', fp(baseParams({ people: [person({ birthYear: 1965 }), person({ sex: 'male', birthYear: 1964, currentAge: 62 })] })))
    moves('the filing status', fp(baseParams({ overlay: overlay({ filing: 'single' }) })))
  })

  it('the overlay feature flags', () => {
    moves('taxEnabled', fp(baseParams({ overlay: overlay({ taxEnabled: false }) })))
    moves('healthcareEnabled', fp(baseParams({ overlay: overlay({ healthcareEnabled: true }) })))
    moves('enhancedSubsidies', fp(baseParams({ overlay: overlay({ enhancedSubsidies: true }) })))
    moves('retirementState', fp(baseParams({ overlay: overlay({ retirementState: 'NC' }) })))
    moves('overlay presence', fp(baseParams({ overlay: undefined })))
  })

  it('the full ordered candidate-id list', () => {
    // remove a candidate
    moves('roster membership (removed candidate)', fp(baseParams(), baseCandidates.slice(0, 2)))
    // reorder the roster (order is part of the identity)
    moves('roster order', fp(baseParams(), [baseCandidates[1]!, baseCandidates[0]!, baseCandidates[2]!]))
    // change one candidate's conversion amount
    moves(
      'a candidate conversion amount',
      fp(baseParams(), [
        baseCandidates[0]!,
        { policy: 'taxable-first', conversion: { annualAmountReal: 25_000, startYearOffset: 0, years: 3 }, provenance: 'grid' },
        baseCandidates[2]!,
      ]),
    )
    // change ONLY the custom candidate's drawdown ORDER — the id string (`baseline:custom:0`) is
    // IDENTICAL, so this is the gap the full-field capture must close (else two custom orders alias).
    moves(
      'a candidate custom drawdown order',
      fp(baseParams(), [
        baseCandidates[0]!,
        baseCandidates[1]!,
        { policy: 'custom', conversion: null, provenance: 'user-baseline', drawdownOrder: ['taxable', 'pretax', 'roth'] },
      ]),
    )
    // change ONLY a candidate's PROVENANCE (the modal collision the widened id fixes): a grid
    // taxable-first:0 vs the conventional-baseline taxable-first:0 are DISTINCT points.
    moves(
      'a candidate provenance (the modal taxable-first:0 collision)',
      fp(baseParams(), [
        { policy: 'taxable-first', conversion: null, provenance: 'grid' },
        baseCandidates[1]!,
        baseCandidates[2]!,
      ]),
    )
  })
})

describe('solverRunFingerprint — the fail-closed SUPERSET classes (beyond the enumerated list)', () => {
  it('the market moments move it (a re-priced ranking under a methodology bump must not share a token)', () => {
    moves('market stock mean', fp(baseParams({ market: { ...baseParams().market, stock: { mean: 0.05, stdDev: 0.12 } } })))
  })
  it('stockWeight, paths, and survivorSpendingRatio move it', () => {
    moves('stockWeight', fp(baseParams({ stockWeight: 0.6 })))
    moves('paths', fp(baseParams({ paths: 201 })))
    moves('survivorSpendingRatio', fp(baseParams({ survivorSpendingRatio: 0.7 })))
    moves('longevityMode', fp(baseParams({ longevityMode: 'fixed-horizon' })))
  })
})
