/**
 * U15 §S5 — mint-then-solve (`solveEntry.ts`): the worker orchestration that runs U14's harness
 * (the optimality oracle + K-candidate ranking stability), mints the oracle-cleared token, and hands
 * it to `solve()`. Every exit is a NAMED bin (insight 092): recommended, token-withheld (an honesty
 * gate fired), mint-failed (the harness gate itself broke / the roster can't be validated). The token
 * never crosses a wire (it is branded) — it is minted and consumed entirely here.
 */
import { describe, expect, it } from 'vitest'
import type { CandidateStrategy } from '../candidates'
import type { RetirementState, SimulationParams } from '@shared/model'
import { epochDayFromIsoDate } from '../../validation/oracleToken'
import { acaEnhancedSubsidyStatus } from '@engine/constants'
import type { SolverRunRanking } from '../../validation/solverRunFingerprint'
import { perturbationPair, solveWithMint, type SolveRequest } from '../solveEntry'

const baseFor = (state?: RetirementState): SimulationParams => ({
  initialPortfolio: 900_000,
  annualSpendingReal: 70_000,
  stockWeight: 0.5,
  people: [
    { sex: 'female', currentAge: 66, birthYear: 1960, retirementAge: 65, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 67 },
    { sex: 'male', currentAge: 64, birthYear: 1962, retirementAge: 64, earnedIncomeReal: 0, pia: 16_000, socialSecurityClaimAge: 67 },
  ],
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
  paths: 256,
  maxHorizonYears: 40,
  longevityMode: 'sampled',
  overlay: {
    taxEnabled: true,
    rmdEnabled: true,
    startCalendarYear: 2026,
    buckets: { taxable: 300_000, pretax: 500_000, roth: 100_000 },
    initialTaxableBasis: 250_000,
    filing: 'mfj',
    ...(state !== undefined ? { retirementState: state } : {}),
  },
})

const conv = (amount: number): CandidateStrategy => ({
  policy: 'taxable-first',
  conversion: { annualAmountReal: amount, startYearOffset: 0, years: 3 },
  provenance: 'grid',
  anchoredRail: { kind: 'bracket-edge', edge: 100_000 + amount },
})

const CANDIDATES: readonly CandidateStrategy[] = [
  { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' },
  { policy: 'pre-tax-first', conversion: null, provenance: 'grid' },
  { policy: 'proportional', conversion: null, provenance: 'grid' },
  conv(20_000),
  conv(40_000),
]

const RANKING: SolverRunRanking = { goal: 'leave-more', heirBracket: 0.25 }
const TODAY = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5

const requestFor = (over: Partial<SolveRequest> = {}): SolveRequest => ({
  base: baseFor(),
  candidates: CANDIDATES,
  seedA: 0xa11ce,
  ranking: RANKING,
  tieTolerance: 0,
  todayEpochDay: TODAY,
  _gradeMinPaths: 50,
  ...over,
})

describe('perturbationPair — ranking-stability requires a conversion candidate to perturb', () => {
  it('finds the first conversion + the conventional-baseline sibling', () => {
    expect(perturbationPair(CANDIDATES)).toEqual({ perturbIndex: 3, siblingIndex: 0 })
  })
  it('is null for a conversion-free roster (the harness cannot prove CRN decoupling)', () => {
    expect(perturbationPair(CANDIDATES.filter((c) => c.conversion === null))).toBeNull()
  })
})

describe('solveWithMint — the named bins (insight 092)', () => {
  it('RECOMMENDS end-to-end on a clean household (oracle + stability + mint + solve)', () => {
    const out = solveWithMint(requestFor())
    expect(out.kind).toBe('recommended')
    if (out.kind !== 'recommended') throw new Error('unreachable')
    expect(out.withheldConversionLevers).toHaveLength(2) // conversions withheld, enumerated
    expect(out.noActionBaseline.id).toBe('conventional:taxable-first:0')
  }, 120_000)

  it('WITHHOLDS the token for an NC household — state-certification-pending(NC), never a wrong recommendation', () => {
    const out = solveWithMint(requestFor({ base: baseFor('NC'), ranking: RANKING }))
    expect(out.kind).toBe('token-withheld')
    if (out.kind !== 'token-withheld') throw new Error('unreachable')
    expect(out.reasons).toContainEqual({ kind: 'state-certification-pending', state: 'NC' })
  }, 120_000)

  it('MINT-FAILS on a roster with no conversion candidate (ranking stability cannot run)', () => {
    const out = solveWithMint(requestFor({ candidates: CANDIDATES.filter((c) => c.conversion === null) }))
    expect(out.kind).toBe('mint-failed')
    if (out.kind !== 'mint-failed') throw new Error('unreachable')
    expect(out.stage).toBe('roster')
  }, 120_000)
})
