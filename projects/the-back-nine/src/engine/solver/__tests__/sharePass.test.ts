/**
 * SHARE-THE-PASS (the solve-time build, 2026-10-03) — the arms the identity gate cannot carry.
 *
 * The gate (`src/ui/__tests__/solvePayloadIdentity.test.ts`) proves the adopting path's payload is
 * bit-identical to the re-simulating path's. It CANNOT prove the adoption happens: a build that
 * silently re-simulated would stay green there. So:
 *
 *  1. THE CONSUMPTION WITNESS — `simulate` is counted per seed through the module the evaluation path
 *     imports. The legacy solve simulates the roster on seedA twice (stability + the crown search)
 *     plus the perturbation pair, and on seedB twice; the shared solve once each. Red-first: the
 *     legacy counts are asserted non-trivial before the shared ones are read.
 *  2. THE REFUSALS — every way a pass could be the wrong run THROWS, never adopts: a misaligned
 *     candidate, an opt-in surface the search never requests, another roster / base / seed pair, a
 *     survivor-stamped search, and a pass whose fingerprint is not the run the token blesses.
 */
import { describe, expect, it, vi } from 'vitest'
import type { SimulationParams } from '@shared/model'
import * as sim from '@engine/simulate'
import { acaEnhancedSubsidyStatus } from '@engine/constants'
import { epochDayFromIsoDate, mintOracleToken } from '../../validation/oracleToken'
import { runOptimalityOracle } from '../../validation/optimalityOracle'
import { runRankingStability, type EvaluatedRosterPass } from '../../validation/rankingStability'
import { adoptObservedOutcome, evaluateCandidates } from '../../validation/evaluate'
import { deriveSeedB } from '../../validation/heldOutSeed'
import { SOLVER_CASES } from '../../reference/solver-cases'
import type { CandidateStrategy } from '../candidates'
import { runSearch } from '../search'
import { solve } from '../solve'
import { solveWithMint, type SolveRequest } from '../solveEntry'

vi.mock('@engine/simulate', async (importOriginal) => {
  const real = await importOriginal<typeof import('@engine/simulate')>()
  return { ...real, simulate: vi.fn(real.simulate) }
})

const base: SimulationParams = {
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
  paths: 128,
  maxHorizonYears: 40,
  longevityMode: 'sampled',
  overlay: {
    taxEnabled: true,
    rmdEnabled: true,
    startCalendarYear: 2026,
    buckets: { taxable: 300_000, pretax: 500_000, roth: 100_000 },
    initialTaxableBasis: 250_000,
    filing: 'mfj',
  },
}

const conv = (amount: number): CandidateStrategy => ({
  policy: 'taxable-first',
  conversion: { annualAmountReal: amount, startYearOffset: 0, years: 3 },
  provenance: 'grid',
  anchoredRail: { kind: 'bracket-edge', edge: 100_000 + amount, calendarYear: 2026, firstCrossingYear: null },
})
const candidates: readonly CandidateStrategy[] = [
  { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' },
  { policy: 'pre-tax-first', conversion: null, provenance: 'grid' },
  { policy: 'proportional', conversion: null, provenance: 'grid' },
  conv(20_000),
  conv(40_000),
]
const K = candidates.length
const SEED_A = 0x5a1ad
const SEED_B = deriveSeedB(SEED_A)
const TODAY = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5
const ranking = { goal: 'leave-more', heirBracket: 0.25 } as const

const request: SolveRequest = { base, candidates, seedA: SEED_A, ranking, tieTolerance: 0, todayEpochDay: TODAY, _gradeMinPaths: 50 }

const simulateMock = vi.mocked(sim.simulate)
const callsOn = (seed: number): number => simulateMock.mock.calls.filter((c) => c[1] === seed).length

const stable = () => {
  const out = runRankingStability({ base, candidates, seedA: SEED_A, seedB: SEED_B, perturbIndex: 3, siblingIndex: 0, ranking, tieTolerance: 0 })
  if (!('report' in out)) throw new Error('the fixture must pass ranking stability')
  return out
}

describe('share-the-pass — the consumption witness (the adoption HAPPENS)', () => {
  it('the oracle fixtures never draw on this test’s seeds (the per-seed counts are this solve’s alone)', () => {
    simulateMock.mockClear()
    runOptimalityOracle(SOLVER_CASES)
    expect(simulateMock.mock.calls.length, 'the oracle ran simulations').toBeGreaterThan(0)
    expect(callsOn(SEED_A) + callsOn(SEED_B)).toBe(0)
  })

  it('legacy: seedA 2K+2 (stability, the perturbation pair, the crown search), seedB 2K — shared: K+2 and K', () => {
    simulateMock.mockClear()
    const legacy = solveWithMint({ ...request, _resimulateSearch: true })
    expect(legacy.kind).toBe('recommended')
    // Red-first: the legacy arm really re-simulates (were this K+2 / K, the witness below proves nothing).
    expect([callsOn(SEED_A), callsOn(SEED_B)]).toEqual([2 * K + 2, 2 * K])

    simulateMock.mockClear()
    const shared = solveWithMint(request)
    expect(shared.kind).toBe('recommended')
    expect([callsOn(SEED_A), callsOn(SEED_B)]).toEqual([K + 2, K])
  }, 60_000)
})

describe('share-the-pass — every wrong pass THROWS, never adopts', () => {
  it('adoptObservedOutcome refuses a candidate the outcome is not for, and a surface the search never requests', () => {
    const [o] = evaluateCandidates(base, [candidates[0]!], SEED_A, { survivorConditioned: true })
    expect(() => adoptObservedOutcome(o!, candidates[1]!)).toThrow(/different candidate/)
    if (o!.kind !== 'scored') throw new Error('the fixture must score')
    const withFan = { ...o!, distribution: { ...o!.distribution, bandFan: o!.distribution.bandFan ?? ({} as never) } }
    expect(() => adoptObservedOutcome(withFan, candidates[0]!)).toThrow(/never requests/)
    // …and the clean adoption drops exactly the stamp.
    const adopted = adoptObservedOutcome(o!, candidates[0]!)
    expect(adopted.kind === 'scored' && 'survivorConditioned' in adopted.distribution).toBe(false)
  })

  it('runSearch refuses another roster, another base, another seed pair, and a survivor-stamped search', () => {
    const { pass } = stable()
    const input = { base, candidates, seedA: SEED_A, goal: 'leave-more' as const, tieTolerance: 0, heirBracket: 0.25, sharedPass: pass }
    expect(() => runSearch(input)).not.toThrow()
    expect(() => runSearch({ ...input, candidates: [...candidates] })).toThrow(/not THIS run/)
    expect(() => runSearch({ ...input, base: { ...base } })).toThrow(/not THIS run/)
    expect(() => runSearch({ ...input, seedA: SEED_A + 1 })).toThrow(/not THIS run/)
    expect(() => runSearch({ ...input, survivorConditioned: true })).toThrow(/survivor-stamped/)
    // The fingerprint does not pin seedB, so a pass evaluated on an arbitrary seedB (the stability
    // tests' own convention) must be refused by the search itself.
    const odd = runRankingStability({ base, candidates, seedA: SEED_A, seedB: 2, perturbIndex: 3, siblingIndex: 0, ranking, tieTolerance: 0 })
    if (!('pass' in odd)) throw new Error('the fixture must pass ranking stability')
    expect(() => runSearch({ ...input, sharedPass: odd.pass })).toThrow(/not THIS run/)
  }, 60_000)

  it('solve() refuses a pass whose fingerprint is not the run the token blesses', () => {
    const out = stable()
    const oracle = runOptimalityOracle(SOLVER_CASES)
    if ('failures' in oracle) throw new Error('the oracle must clear')
    const mint = mintOracleToken({
      params: base,
      candidateConversionAmounts: candidates.map((c) => c.conversion?.annualAmountReal),
      todayEpochDay: TODAY,
      oracleReport: oracle.report,
      stabilityReport: out.report,
    })
    if ('withheld' in mint) throw new Error('the fixture must mint')
    const forged = { ...out.pass, fingerprint: 'not-this-run' } as unknown as EvaluatedRosterPass
    const input = { base, candidates, seedA: SEED_A, ranking, tieTolerance: 0, _gradeMinPaths: 50 }
    expect(() => solve(mint.token, { ...input, sharedPass: forged })).toThrow(/DIFFERENT run/)
    expect(solve(mint.token, { ...input, sharedPass: out.pass }).kind).toBe('recommended')
  }, 60_000)
})
