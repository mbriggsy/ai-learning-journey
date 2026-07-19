/**
 * U15 §S6 — `cancel.ts`: the solve lane's cancellation seam. Two PURE decisions, each an exported,
 * planted-fail-tested seam (insight 048): the UNCONDITIONAL commit-epoch guard (`shouldCommitSolve`)
 * and the injected mid-solve cooperative abort (`abortRequested` → the NAMED `aborted` bin). The abort
 * seam is DRIVEN here at every coarse checkpoint (solveWithMint's two + solve's two), so deleting any
 * checkpoint goes red; the commit-epoch guard's store wiring is proved in memoryModel.test.ts.
 */
import { describe, expect, it } from 'vitest'
import type { SimulationParams } from '@shared/model'
import type { CandidateStrategy } from '../candidates'
import { abortRequested, shouldCommitSolve, solveAborted, type ShouldAbort } from '../cancel'
import { runOptimalityOracle } from '../../validation/optimalityOracle'
import { runRankingStability } from '../../validation/rankingStability'
import { mintOracleToken, epochDayFromIsoDate, type OracleClearedToken } from '../../validation/oracleToken'
import { acaEnhancedSubsidyStatus } from '@engine/constants'
import { deriveSeedB } from '../../validation/heldOutSeed'
import { type SolverRunRanking } from '../../validation/solverRunFingerprint'
import { SOLVER_CASES } from '../../reference/solver-cases'
import { solve, type SolveInput } from '../solve'
import { solveWithMint, type SolveRequest } from '../solveEntry'

// ---- the pure seams ---------------------------------------------------------------------------

describe('shouldCommitSolve — the UNCONDITIONAL commit-epoch guard (§S6)', () => {
  it('commits ONLY a strictly-newer epoch; equal + older never commit (idempotent, monotone)', () => {
    expect(shouldCommitSolve(2, 1)).toBe(true) // newer commits
    expect(shouldCommitSolve(1, 1)).toBe(false) // equal: the same solve cannot land twice
    expect(shouldCommitSolve(1, 2)).toBe(false) // older: a stale result after a newer commit
    expect(shouldCommitSolve(1, 0)).toBe(true) // the first commit over the initial 0
  })
  it('a NON-FINITE resolved epoch NEVER commits (insight 010 — the setLatestEpoch NaN posture)', () => {
    expect(shouldCommitSolve(Number.NaN, 0)).toBe(false)
    expect(shouldCommitSolve(Number.POSITIVE_INFINITY, 5)).toBe(false)
  })
})

describe('abortRequested — the injected seam read verbatim (the engine reads no environment)', () => {
  it('undefined seam ⇒ never aborts (the live default today — the worker-epoch transport is deferred)', () => {
    expect(abortRequested(undefined)).toBe(false)
  })
  it('a defined seam is read STRICTLY (=== true); a false / truthy-non-boolean is NOT an abort', () => {
    expect(abortRequested(() => true)).toBe(true)
    expect(abortRequested(() => false)).toBe(false)
    // A truthy non-boolean (a caller wiring slip) is NOT a true — the strict compare refuses to guess.
    expect(abortRequested((() => 1) as unknown as ShouldAbort)).toBe(false)
  })
})

describe('solveAborted — the named bin (insight 092)', () => {
  it('carries the kind, a detail, and the code version (never a silent nothing)', () => {
    const a = solveAborted('why')
    expect(a.kind).toBe('aborted')
    expect(a.detail).toBe('why')
    expect(a.solverCodeVersion).toBe(1)
  })
})

// ---- the mid-solve abort, DRIVEN through the real solve path --------------------------------------

const BASE: SimulationParams = {
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
  },
}

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

const SEED_A = 0xa11ce
const RANKING: SolverRunRanking = { goal: 'leave-more', heirBracket: 0.25 }
const TODAY = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5

function mintToken(): OracleClearedToken {
  const oracleOut = runOptimalityOracle(SOLVER_CASES)
  if (!('report' in oracleOut)) throw new Error('the committed oracle roster must pass')
  const stabilityOut = runRankingStability({
    base: BASE,
    candidates: CANDIDATES,
    seedA: SEED_A,
    seedB: deriveSeedB(SEED_A),
    perturbIndex: 3,
    siblingIndex: 0,
    ranking: RANKING,
  })
  if (!('report' in stabilityOut)) throw new Error('stability must pass')
  const mint = mintOracleToken({
    params: BASE,
    candidateConversionAmounts: [undefined, undefined, undefined],
    todayEpochDay: TODAY,
    oracleReport: oracleOut.report,
    stabilityReport: stabilityOut.report,
  })
  if (!('token' in mint)) throw new Error('token must mint')
  return mint.token
}

const solveInput = (): SolveInput => ({
  base: BASE,
  candidates: CANDIDATES,
  seedA: SEED_A,
  ranking: RANKING,
  tieTolerance: 0,
  _gradeMinPaths: 50,
})

const requestFor = (): SolveRequest => ({
  base: BASE,
  candidates: CANDIDATES,
  seedA: SEED_A,
  ranking: RANKING,
  tieTolerance: 0,
  todayEpochDay: TODAY,
  _gradeMinPaths: 50,
})

/** A shouldAbort that returns true on its Nth invocation (1-indexed), false before — targeting an
 *  individual checkpoint. */
const abortOnCall = (n: number): ShouldAbort => {
  let c = 0
  return () => ++c === n
}

describe('solve() — the mid-solve cooperative abort (§S6, the two checkpoints)', () => {
  const token = mintToken()

  it('aborts BEFORE the K-candidate search (checkpoint 1) with a named bin — never a recommendation', () => {
    const out = solve(token, solveInput(), () => true)
    expect(out.kind).toBe('aborted')
    if (out.kind !== 'aborted') throw new Error('unreachable')
    expect(out.detail).toMatch(/before the K-candidate search/)
  })

  it('aborts BEFORE the grade B-family (checkpoint 2) — search ran, the grade was skipped', () => {
    // False on call 1 (pre-search passes), true on call 2 (pre-grade) → the second checkpoint fires.
    const out = solve(token, solveInput(), abortOnCall(2))
    expect(out.kind).toBe('aborted')
    if (out.kind !== 'aborted') throw new Error('unreachable')
    expect(out.detail).toMatch(/before the grade/)
  }, 120_000)

  it('a never-true seam does NOT abort — the full recommendation still ships (non-vacuity)', () => {
    const out = solve(token, solveInput(), () => false)
    expect(out.kind).toBe('recommended')
  }, 120_000)
})

describe('solveWithMint() — the mid-solve cooperative abort (§S6, the two orchestration checkpoints)', () => {
  it('aborts BEFORE the harness gates (checkpoint 1) — no mint, no compute burned', () => {
    const out = solveWithMint(requestFor(), () => true)
    expect(out.kind).toBe('aborted')
    if (out.kind !== 'aborted') throw new Error('unreachable')
    expect(out.detail).toMatch(/before the harness gates/)
  })

  it('aborts AFTER the harness gates, before the mint (checkpoint 2) — stability ran, the mint skipped', () => {
    const out = solveWithMint(requestFor(), abortOnCall(2))
    expect(out.kind).toBe('aborted')
    if (out.kind !== 'aborted') throw new Error('unreachable')
    expect(out.detail).toMatch(/after the harness gates/)
  }, 120_000)

  it('a never-true seam recommends end-to-end (non-vacuity — the seam is off by default)', () => {
    const out = solveWithMint(requestFor(), () => false)
    expect(out.kind).toBe('recommended')
  }, 120_000)
})
