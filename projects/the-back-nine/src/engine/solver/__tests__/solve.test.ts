/**
 * U15 §S5 — the solve entry: the two-clause gate (the required token + the fingerprint identity
 * refusal), the trend-blocked-by-design withheld-lever enumeration (insight 092), the seed-B display
 * discipline (no seed-A selection score ever reaches a displayed figure), and the deterministic
 * byte-reproducible recommendation. The token is minted in-test via the U14 harness runners; the
 * fingerprint battery is the planted-mutant killer (a fingerprint-blind gate accepts a mismatch).
 */
import { describe, expect, it } from 'vitest'
import type { CandidateStrategy } from '../candidates'
import type { SimulationParams } from '@shared/model'
import { runOptimalityOracle } from '../../validation/optimalityOracle'
import { runRankingStability } from '../../validation/rankingStability'
import { mintOracleToken, epochDayFromIsoDate, type OracleClearedToken } from '../../validation/oracleToken'
import { acaEnhancedSubsidyStatus } from '@engine/constants'
import { deriveSeedB } from '../../validation/heldOutSeed'
import { solverRunFingerprint, type SolverRunRanking } from '../../validation/solverRunFingerprint'
import { SOLVER_CASES } from '../../reference/solver-cases'
import { evaluateCandidates } from '../../validation/evaluate'
import { packSolveWire } from '../../engineProtocol'
import { solveFromWire } from '../../engineWire'
import { enumerateWithheldConversionLevers, gradeAxisFor, gradeSolveRecommendation, solve, type SolveInput } from '../solve'

// A tax-overlay household (no state, no healthcare — mints clean on this build), sampled longevity so
// ranking stability sees a survivor crossing; modest paths keep the mint + grade cheap.
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

// The FULL roster the fingerprint covers: 3 sequencing arms (the conventional baseline + two grid
// policies — a real winner/runner-up field) + 2 conversion candidates (withheld from ranking today,
// and the perturbation material ranking-stability requires).
const CANDIDATES: readonly CandidateStrategy[] = [
  { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' },
  { policy: 'pre-tax-first', conversion: null, provenance: 'grid' },
  { policy: 'proportional', conversion: null, provenance: 'grid' },
  conv(20_000),
  conv(40_000),
]

const SEED_A = 0xa11ce
const RANKING: SolverRunRanking = { goal: 'leave-more', heirBracket: 0.25 }
const TODAY = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5 // inside the freshness window

/** Mint a real oracle-cleared token over (BASE, CANDIDATES, RANKING). The trend clause sees the
 *  RANKED (sequencing-only) subset's amounts — conversion-free — so it PASSES (conversions stay
 *  withheld from ranking, never blocked from the run). */
function mintToken(): OracleClearedToken {
  const oracleOut = runOptimalityOracle(SOLVER_CASES)
  if (!('report' in oracleOut)) throw new Error('the committed oracle roster must pass')
  const stabilityOut = runRankingStability({
    base: BASE,
    candidates: CANDIDATES,
    seedA: SEED_A,
    seedB: deriveSeedB(SEED_A),
    perturbIndex: 3, // the first conversion candidate
    siblingIndex: 0, // the conventional baseline
    ranking: RANKING,
  })
  if (!('report' in stabilityOut)) {
    throw new Error(`stability must pass: ${(stabilityOut as { violations: readonly string[] }).violations.join(' | ')}`)
  }
  const mint = mintOracleToken({
    params: BASE,
    candidateConversionAmounts: [undefined, undefined, undefined], // the ranked sequencing-only subset
    todayEpochDay: TODAY,
    oracleReport: oracleOut.report,
    stabilityReport: stabilityOut.report,
  })
  if (!('token' in mint)) throw new Error(`token must mint: ${JSON.stringify((mint as { withheld: unknown }).withheld)}`)
  // The fingerprint the token carries is over the WHOLE roster (what solve() re-checks).
  expect(mint.token.mintedOver.fingerprint).toBe(solverRunFingerprint(BASE, CANDIDATES, RANKING))
  return mint.token
}

const solveInput = (over: Partial<SolveInput> = {}): SolveInput => ({
  base: BASE,
  candidates: CANDIDATES,
  seedA: SEED_A,
  ranking: RANKING,
  tieTolerance: 0,
  _gradeMinPaths: 50, // the base is 256 paths; keep the grade below the live 16k floor for speed
  ...over,
})

describe('solve() — the gate (§S5 (1))', () => {
  const token = mintToken()

  it('RECOMMENDS on a fingerprint-matching token: the three seed-B arms, the ranking, the grade, the version', () => {
    const out = solve(token, solveInput())
    expect(out.kind).toBe('recommended')
    if (out.kind !== 'recommended') throw new Error('unreachable')
    expect(out.winner.id).toBeTruthy()
    expect(out.noActionBaseline.id).toBe('conventional:taxable-first:0') // the located baseline
    // Every displayed arm carries a full seed-B distribution (the buffers the wire transfers).
    for (const arm of [out.winner, out.noActionBaseline, ...(out.runnerUp ? [out.runnerUp] : [])]) {
      expect(arm.distributionB.terminalValuesReal.length).toBe(BASE.paths)
      expect(Number.isFinite(arm.headlineStatisticB)).toBe(true)
    }
    expect(out.seedB).toBe(deriveSeedB(SEED_A))
    expect(out.solverCodeVersion).toBe(1)
    expect(out.rankedIds.length).toBe(3) // the sequencing-only field ranked
  }, 120_000)

  it('REFUSES a token minted over a DIFFERENT run — the fingerprint identity gate (the mutant-killer)', () => {
    // Same token, a run that differs in ONE ranking-affecting input (spending) ⇒ a different
    // fingerprint ⇒ structured refusal. A fingerprint-BLIND gate would recommend here.
    const out = solve(token, solveInput({ base: { ...BASE, annualSpendingReal: 71_000 } }))
    expect(out.kind).toBe('refused')
    if (out.kind !== 'refused') throw new Error('unreachable')
    expect(out.reason).toBe('fingerprint-mismatch')
  })

  it('REFUSES a different OBJECTIVE (a leave-more token can never bless a pay-less-tax solve)', () => {
    const out = solve(token, solveInput({ ranking: { goal: 'pay-less-tax' } }))
    expect(out.kind).toBe('refused')
    if (out.kind !== 'refused') throw new Error('unreachable')
    expect(out.reason).toBe('fingerprint-mismatch')
  })

  it('REFUSES the bucket precondition — a no-overlay run has no split to sequence (§S5 (3))', () => {
    // Fabricate a token whose fingerprint MATCHES a no-overlay run (the mint can't produce one — no
    // conversion candidate to perturb — so the test double-casts to isolate the bucket clause, which
    // sits AFTER the fingerprint check). This proves the second clause fires on its own.
    const noOverlay: SimulationParams = { ...BASE, overlay: undefined, drawdownPolicy: 'proportional' }
    const seqOnly = CANDIDATES.filter((c) => c.conversion === null)
    const fp = solverRunFingerprint(noOverlay, seqOnly, RANKING)
    const fakeToken = { mintedOver: { fingerprint: fp } } as unknown as OracleClearedToken
    const out = solve(fakeToken, solveInput({ base: noOverlay, candidates: seqOnly }))
    expect(out.kind).toBe('refused')
    if (out.kind !== 'refused') throw new Error('unreachable')
    expect(out.reason).toBe('bucket-precondition')
  })
})

describe('solve() — conversions trend-blocked BY DESIGN + the withheld enumeration (§S5 (2), insight 092)', () => {
  const token = mintToken()

  it('ranks ONLY the sequencing-only field and ENUMERATES every withheld conversion lever, named + directioned', () => {
    const out = solve(token, solveInput())
    if (out.kind !== 'recommended') throw new Error('unreachable')
    // No conversion candidate is crowned or in the ranked field.
    expect(out.rankedIds.every((id) => id.endsWith(':0'))).toBe(true)
    // Both conversion candidates are enumerated as withheld — a silently-dropped channel is an
    // abstention, not a pass (insight 092).
    expect(out.withheldConversionLevers).toHaveLength(2)
    const amounts = out.withheldConversionLevers.map((l) => l.annualAmountReal).sort((a, b) => a - b)
    expect(amounts).toEqual([20_000, 40_000])
    for (const lever of out.withheldConversionLevers) {
      expect(lever.reason).toEqual({ kind: 'medicare-trend-unsourced' }) // the named reason
      expect(lever.anchoredRail).toEqual({ kind: 'bracket-edge', edge: 100_000 + lever.annualAmountReal }) // the direction
    }
  }, 120_000)

  it('enumerateWithheldConversionLevers is empty for a conversion-free set (nothing to abstain on)', () => {
    expect(enumerateWithheldConversionLevers([])).toEqual([])
  })
})

describe('solve() — the seed-B display discipline + determinism (contract #2)', () => {
  const token = mintToken()

  it('displays seed-B figures (never the seed-A selection score) and marks the pruned scalars never-rendered', () => {
    const out = solve(token, solveInput())
    if (out.kind !== 'recommended') throw new Error('unreachable')
    // The winner arm's distribution IS the seed-B run (not the curse-biased seed-A read). Reconstruct
    // the winner strategy from the sequencing field and run it on BOTH seeds to prove which one displays.
    const winnerStrategy = CANDIDATES.filter((c) => c.conversion === null).find(
      (c) => `${c.provenance === 'conventional-baseline' ? 'conventional' : c.provenance}:${c.policy}:0` === out.winner.id,
    )!
    const [runB] = evaluateCandidates(BASE, [winnerStrategy], deriveSeedB(SEED_A), { heirBracket: 0.25 })
    const [runA] = evaluateCandidates(BASE, [winnerStrategy], SEED_A, { heirBracket: 0.25 })
    if (runB!.kind !== 'scored' || runA!.kind !== 'scored') throw new Error('unreachable')
    expect(out.winner.survivalB).toBe(runB!.score.survival) // displays B
    expect(out.winner.distributionB.terminalValuesReal).toEqual(runB!.distribution.terminalValuesReal)
    // The dispersed world makes A and B genuinely differ — so "displays B" is not vacuously "displays A".
    expect(runB!.distribution.terminalValuesReal).not.toEqual(runA!.distribution.terminalValuesReal)
    // Every pruned scalar is MARKED never-rendered (the curse-biased read must never display).
    for (const p of out.prunedScores) {
      if (p.selectionScoreA !== undefined) expect(p.selectionScoreA.neverRendered).toBe(true)
    }
  }, 120_000)

  it('is BYTE-REPRODUCIBLE from (token, input) — two solves toEqual (deterministic selection, R23)', () => {
    const a = solve(token, solveInput())
    const b = solve(token, solveInput())
    expect(a).toEqual(b)
  }, 120_000)

  it('carries the leave-more skew disclosure (the mean beside the typical bequest — §S2) and a grade axis', () => {
    const out = solve(token, solveInput())
    if (out.kind !== 'recommended') throw new Error('unreachable')
    expect(out.skewDisclosure).toBeDefined() // leave-more ⇒ present
    expect(out.skewDisclosure!.meanReal).toBeGreaterThanOrEqual(0)
    // A non-over-funded household grades on SURVIVAL (the headline axis); the named driver is present.
    expect(out.gradeStatistic).toBe('survival')
    expect(out.namedDriver).toBeTruthy()
    // The grade either resolved or is a NAMED unavailable (never a silent drop) — total path.
    expect(out.grade !== undefined || out.gradeUnavailable !== undefined).toBe(true)
  }, 120_000)
})

describe('gradeAxisFor — survival on-track, the goal dollar in surplus', () => {
  it('pins the regime→axis map', () => {
    expect(gradeAxisFor('leave-more', false)).toBe('survival')
    expect(gradeAxisFor('pay-less-tax', false)).toBe('survival')
    expect(gradeAxisFor('leave-more', true)).toBe('leave-more')
    expect(gradeAxisFor('pay-less-tax', true)).toBe('pay-less-tax')
  })
})

describe('gradeSolveRecommendation — the U15 objective wiring the harness deferred', () => {
  const winner: CandidateStrategy = { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' }
  const runnerUp: CandidateStrategy = { policy: 'pre-tax-first', conversion: null, provenance: 'grid' }

  it('GRADES the leave-more dollar axis (the surplus-regime axis gradeRecommendation throws on) via gradeOnFamily', () => {
    const out = gradeSolveRecommendation({
      base: BASE,
      winner,
      runnerUp,
      seedA: SEED_A,
      statistic: 'leave-more',
      heirBracket: 0.25,
      minPathsOverride: 50,
    })
    expect('grade' in out).toBe(true)
    if (!('grade' in out)) throw new Error('unreachable')
    expect(['just-do-it', 'coin-flip']).toContain(out.grade.grade)
    expect(out.grade.memberMargins).toHaveLength(5) // the full B-family
  }, 120_000)

  it('a leave-more grade with NO heir bracket is a NAMED unavailable (never a throw, never a silent grade)', () => {
    const out = gradeSolveRecommendation({ base: BASE, winner, runnerUp, seedA: SEED_A, statistic: 'leave-more', heirBracket: undefined, minPathsOverride: 50 })
    expect('unavailable' in out).toBe(true)
  })

  it('a base below the live 16k B-floor is a NAMED unavailable (the grade path stays total — insight 092)', () => {
    // No override ⇒ the live 16,000-path floor; BASE is 256 paths ⇒ below-floor ⇒ unavailable, not a throw.
    const out = gradeSolveRecommendation({ base: BASE, winner, runnerUp, seedA: SEED_A, statistic: 'survival', heirBracket: undefined })
    expect('unavailable' in out).toBe(true)
    if (!('unavailable' in out)) throw new Error('unreachable')
    expect(out.unavailable).toMatch(/floor/)
  }, 120_000)
})

describe('solve() → the wire round-trip (§S5 (4))', () => {
  const token = mintToken()

  it('packSolveWire → solveFromWire reconstructs the recommendation byte-identically (buffers ↔ number[])', () => {
    const out = solve(token, solveInput())
    if (out.kind !== 'recommended') throw new Error('unreachable')
    const view = solveFromWire(packSolveWire(out))
    expect(view.ok).toBe(true)
    if (!view.ok) throw new Error('unreachable')
    expect(view.payload).toEqual(out) // number[] → Float64 → number[] is exact for the doubles
  }, 120_000)
})
