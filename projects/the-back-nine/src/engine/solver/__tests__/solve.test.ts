/**
 * U15 §S5 — the solve entry: the two-clause gate (the required token + the fingerprint identity
 * refusal), the clause-derived conversion partition (the trend sourcing unit lifted the block —
 * conversions RANK; the withheld channel stays wired for a clause regression, insight 092), the
 * seed-B display discipline (no seed-A selection score ever reaches a displayed figure), and the
 * deterministic byte-reproducible recommendation. The token is minted in-test via the U14 harness
 * runners; the fingerprint battery is the planted-mutant killer (a fingerprint-blind gate accepts
 * a mismatch).
 */
import { describe, expect, it } from 'vitest'
import { solverCandidateId, type CandidateStrategy } from '../candidates'
import { NEVER_DEPLETED, type SimulationParams } from '@shared/model'
import type { SolvePayload } from '../solveEntry'
import type { SolveArm } from '../solve'
import { runOptimalityOracle } from '../../validation/optimalityOracle'
import { runRankingStability } from '../../validation/rankingStability'
import { mintOracleToken, epochDayFromIsoDate, type OracleClearedToken } from '../../validation/oracleToken'
import { acaEnhancedSubsidyStatus, isUnsourced, medicareCostTrend } from '@engine/constants'
import { deriveSeedB } from '../../validation/heldOutSeed'
import { SOLVER_CODE_VERSION } from '../solverCodeVersion'
import { solverRunFingerprint, type SolverRunRanking } from '../../validation/solverRunFingerprint'
import { SOLVER_CASES } from '../../reference/solver-cases'
import { evaluateCandidates } from '../../validation/evaluate'
import { packSolveWire } from '../../engineProtocol'
import { solveFromWire } from '../../engineWire'
import { deltaSkewFor, enumerateWithheldConversionLevers, gradeAxisFor, gradeSolveRecommendation, solve, type SolveInput } from '../solve'
import { PART_B_PRICING_MODE } from '../../taxOverlay'

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
 *  TRUE amounts of the WHOLE roster (mirroring solveEntry's live binding) — post-trend-sourcing
 *  the clause is CLEAR (sourced constant + consuming Part-B pricing), so the conversion-bearing
 *  set MINTS; the blocking arm stays exercised through the pure seam + the mint's _trendOverride. */
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
    tieTolerance: 0, // the run tolerance the fingerprint pins (matches solveInput's tieTolerance)
  })
  if (!('report' in stabilityOut)) {
    throw new Error(`stability must pass: ${(stabilityOut as { violations: readonly string[] }).violations.join(' | ')}`)
  }
  const mint = mintOracleToken({
    params: BASE,
    candidateConversionAmounts: [undefined, undefined, undefined, 20_000, 40_000], // the whole ranked roster
    todayEpochDay: TODAY,
    oracleReport: oracleOut.report,
    stabilityReport: stabilityOut.report,
  })
  if (!('token' in mint)) throw new Error(`token must mint: ${JSON.stringify((mint as { withheld: unknown }).withheld)}`)
  // The fingerprint the token carries is over the WHOLE roster (what solve() re-checks).
  expect(mint.token.mintedOver.fingerprint).toBe(solverRunFingerprint(BASE, CANDIDATES, RANKING, { seedA: SEED_A, tieTolerance: 0 }))
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
    expect(out.solverCodeVersion).toBe(SOLVER_CODE_VERSION)
    expect(out.rankedIds.length).toBe(5) // the WHOLE field ranks — conversions included (the trend clause clear)
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
    const fp = solverRunFingerprint(noOverlay, seqOnly, RANKING, { seedA: SEED_A, tieTolerance: 0 })
    const fakeToken = { mintedOver: { fingerprint: fp } } as unknown as OracleClearedToken
    const out = solve(fakeToken, solveInput({ base: noOverlay, candidates: seqOnly }))
    expect(out.kind).toBe('refused')
    if (out.kind !== 'refused') throw new Error('unreachable')
    expect(out.reason).toBe('bucket-precondition')
  })

  it('REFUSES a non-finite / negative tie-tolerance BEFORE the fingerprint gate (input validation, insight 010)', () => {
    // tieTolerance is a ranking-affecting run input; a NaN admits every candidate to the survival-top
    // set. The refusal fires FIRST (deleting it lets solve() fall through to the fingerprint check,
    // where the NaN-encoded tolerance mismatches ⇒ the reason would read 'fingerprint-mismatch').
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -0.01]) {
      const out = solve(token, solveInput({ tieTolerance: bad }))
      expect(out.kind, `tieTolerance ${bad}`).toBe('refused')
      if (out.kind !== 'refused') throw new Error('unreachable')
      expect(out.reason, `tieTolerance ${bad}`).toBe('tie-tolerance-invalid')
    }
  })

  it('REFUSES a leave-more solve with NO heir bracket — NAMED, before the search (§S5 grade honesty)', () => {
    // A leave-more objective without the §1014/IRD discount cannot rank or grade. The refusal is NAMED
    // and fires before the search; deleting it lets runSearch's tier2 throw an UNCAUGHT error instead
    // (solve() would throw rather than return a structured refusal — this test reds on that revert).
    const ranking: SolverRunRanking = { goal: 'leave-more' } // no heirBracket
    const fp = solverRunFingerprint(BASE, CANDIDATES, ranking, { seedA: SEED_A, tieTolerance: 0 })
    const fakeToken = { mintedOver: { fingerprint: fp } } as unknown as OracleClearedToken
    const out = solve(fakeToken, solveInput({ ranking }))
    expect(out.kind).toBe('refused')
    if (out.kind !== 'refused') throw new Error('unreachable')
    expect(out.reason).toBe('heir-bracket-missing')
  })
})

describe('solve() — conversions RANK (the trend clause clear) + the withheld channel stays wired (§S5 (2), insight 092)', () => {
  const token = mintToken()

  it('ranks the WHOLE field — both conversion candidates join rankedIds and the withheld enumeration is EMPTY', () => {
    // The U15 tripwire's named re-wire, proven end-to-end: the partition derives from the token's
    // trend clause (clear: sourced + consumed), so the conversion levers REJOIN the ranked field.
    // This arm is also the partition-revert mutant killer — re-hardcoding
    // `rankable = candidates.filter(c => c.conversion === null)` orphans both ids and reds here.
    const out = solve(token, solveInput())
    if (out.kind !== 'recommended') throw new Error('unreachable')
    expect(out.rankedIds).toHaveLength(5)
    expect(out.rankedIds).toContain('grid:taxable-first:20000')
    expect(out.rankedIds).toContain('grid:taxable-first:40000')
    // No lever is withheld — an empty enumeration here is the CLEAR state, not a dropped channel
    // (insight 092: the channel still exists and re-fills if the clause ever re-blocks).
    expect(out.withheldConversionLevers).toEqual([])
  }, 120_000)

  it('enumerateWithheldConversionLevers is empty for a conversion-free set (nothing to abstain on)', () => {
    expect(enumerateWithheldConversionLevers([])).toEqual([])
  })

  it('enumerateWithheldConversionLevers is empty for a CONVERSION-BEARING set — the live clause is clear (the second re-wired seam)', () => {
    // Pre-sourcing this enumerated every lever with `medicare-trend-unsourced`; the clause now
    // returns null (sourced + consumed) and the enumeration self-empties by construction.
    expect(enumerateWithheldConversionLevers([conv(20_000), conv(40_000)])).toEqual([])
  })

  it('the flip witness — medicareCostTrend is SOURCED and the Part-B pricing mode is trended (both halves of the U14 clause)', () => {
    // The old TRIPWIRE arm (green while unsourced, red the day it sourced) did its job on
    // 2026-07-19: both named seams re-wired in the same change (the partition derivation above +
    // the enumeration clearing). This pin holds the pair in the sourced direction; the
    // lying-mirror direction (sourced entry + unmoved real-flat mode STILL blocks) lives in
    // oracleToken.test's pure-seam arms.
    expect(isUnsourced(medicareCostTrend)).toBe(false)
    expect(PART_B_PRICING_MODE).toBe('trended')
  })

  it('seam (ii): copies the token’s mintedOver.disclosedDirectional onto the payload VERBATIM — the []-hardcode mutant reds here', () => {
    // This suite's FIXTURE tokens carry disclosedDirectional: [], so every other arm exercises the
    // copy only with [] — a `disclosedDirectional: []` hardcode in solve.ts survives them all. (The
    // real mint is NON-empty on any default-assumptions run — methodology.productionMarket +
    // survivorSpendingRatio are live directional substrate; corrected 2026-08-20, this comment used
    // to claim the live mint was empty.) Drive the copy with a NON-empty list:
    // fingerprint is unchanged (disclosedDirectional is NOT a fingerprint input), so solve() recommends
    // and must carry the token's list through verbatim (the hawk phasing law — the figure and its
    // disclosure land together, never fed from an empty default).
    const disclosed = ['medicare-part-b-trend', 'heir-bracket-irs-2026']
    const withDisclosed: OracleClearedToken = {
      ...token,
      mintedOver: { ...token.mintedOver, disclosedDirectional: disclosed },
    }
    const out = solve(withDisclosed, solveInput())
    if (out.kind !== 'recommended') throw new Error('unreachable')
    expect(out.disclosedDirectional).toEqual(disclosed)
  }, 120_000)
})

describe('solve() — the seed-B display discipline + determinism (contract #2)', () => {
  const token = mintToken()

  it('displays seed-B figures (never the seed-A selection score) and marks the pruned scalars never-rendered', () => {
    const out = solve(token, solveInput())
    if (out.kind !== 'recommended') throw new Error('unreachable')
    // The winner arm's distribution IS the seed-B run (not the curse-biased seed-A read). Reconstruct
    // the winner strategy from the FULL ranked field (conversions rank too, post-trend-sourcing) and
    // run it on BOTH seeds to prove which one displays.
    const winnerStrategy = CANDIDATES.find((c) => solverCandidateId(c) === out.winner.id)!
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

  it('a demotion-axis-uncalibrated throw PROPAGATES out — a fail-closed guard is never laundered to a calm unavailable (§S5 grade honesty)', () => {
    // A conversion winner over a NON-conversion runner-up on the pay-less-tax DOLLAR axis trips
    // gradeOnFamily's demotion-axis guard (the 0.02 margin is survival-fraction units). The narrowed
    // catch demotes ONLY a GradeFloorRefusal — this Error must escape. The OLD broad catch swallowed
    // it into { unavailable }, so this reds on a revert.
    expect(() =>
      gradeSolveRecommendation({
        base: BASE,
        winner: conv(20_000), // has a conversion
        runnerUp: { policy: 'pre-tax-first', conversion: null, provenance: 'grid' }, // none
        seedA: SEED_A,
        statistic: 'pay-less-tax',
        heirBracket: undefined,
        minPathsOverride: 50,
      }),
    ).toThrow(/SURVIVAL axis only/)
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

  it('the winner arm’s essentials-floor track SURVIVES the wire (a budget household’s floor is never dropped — FIX 7)', () => {
    // A hand-built floor-carrying arm (no engine run needed): the packer must carry `distributionB.floor`
    // across as an Int32 buffer + a cloned fraction, and armFromWire must widen it back. Reverting the
    // packer drops the floor ⇒ the reconstructed arm has no `.floor` ⇒ this reds.
    const withFloor: SolveArm = {
      id: 'conventional:taxable-first:0',
      policy: 'taxable-first',
      conversion: null,
      distributionB: {
        terminalValuesReal: [10, 20, 30],
        depletionYears: [NEVER_DEPLETED, 5, NEVER_DEPLETED],
        survivalFraction: 2 / 3,
        floor: { survivalFraction: 1, depletionYears: [NEVER_DEPLETED, NEVER_DEPLETED, NEVER_DEPLETED] },
      },
      headlineStatisticB: 12_345,
      survivalB: 2 / 3,
    }
    const noFloor: SolveArm = {
      id: 'grid:pre-tax-first:0',
      policy: 'pre-tax-first',
      conversion: null,
      distributionB: { terminalValuesReal: [1, 2, 3], depletionYears: [NEVER_DEPLETED, NEVER_DEPLETED, 7], survivalFraction: 2 / 3 },
      headlineStatisticB: 100,
      survivalB: 2 / 3,
    }
    const payload: SolvePayload = {
      kind: 'recommended',
      goal: 'leave-more',
      heirBracket: 0.25,
      seedA: SEED_A,
      seedB: deriveSeedB(SEED_A),
      winner: withFloor,
      runnerUp: noFloor,
      noActionBaseline: withFloor,
      rankedIds: ['conventional:taxable-first:0', 'grid:pre-tax-first:0'],
      prunedScores: [],
      noChange: true,
      surplusRegime: false,
      grade: undefined,
      gradeStatistic: 'survival',
      gradeUnavailable: undefined,
      namedDriver: 'sampling-noise-near-tie',
      skewDisclosure: undefined,
      // A REAL value (not undefined): pins that the packer/unpacker spread carries the field — a
      // future enumerating packer that forgets deltaSkew fails the equality below.
      deltaSkew: { meanReal: 12_345, medianReal: 4_000, p10Real: -1_000, p90Real: 30_000, skewDirection: 'upside', meanMinusMedianReal: 8_345 },
      withheldConversionLevers: [],
      disclosedDirectional: [],
      solverCodeVersion: SOLVER_CODE_VERSION,
    }
    const view = solveFromWire(packSolveWire(payload))
    expect(view.ok).toBe(true)
    if (!view.ok || view.payload.kind !== 'recommended') throw new Error('unreachable')
    // The delta skew rides the wire intact (structured-clone spread, never dropped by the packer).
    expect(view.payload.deltaSkew).toEqual(payload.deltaSkew)
    // The floor track round-trips (Int32 → number[]); the packer no longer drops it.
    expect(view.payload.winner.distributionB.floor).toEqual({
      survivalFraction: 1,
      depletionYears: [NEVER_DEPLETED, NEVER_DEPLETED, NEVER_DEPLETED],
    })
    // Presence-keyed: a floor-less arm stays floor-less across the wire (absence preserved).
    expect('floor' in view.payload.runnerUp!.distributionB).toBe(false)
  })
})

// ---------------------------------------------------------------------------------------------
// The DELTA skew disclosure (the median-advantage increment, 2026-07-23): the hero's "$X more"
// is a MEAN of the CRN-paired per-path winner-vs-baseline goal differences, and the payload now
// carries that vector's skew so U16 can qualify the mean with the TYPICAL future's gain. Four
// pins: (1) the live arc carries it with internal + hero coherence; (2) a COMMITTED zero-vol
// fixture world reproduces the hero delta BYTE-EXACTLY (mean ≡ median ≡ headline difference —
// linearity with every path identical); (3) the winner-positive sign convention on BOTH goals
// (the argument-order mutant killer); (4) the honest-undefined arms (never a throw in payload
// assembly).
// ---------------------------------------------------------------------------------------------
describe('solve() — the DELTA skew disclosure (the median-advantage increment)', () => {
  it('the live solve carries deltaSkew, internally consistent and coherent with the hero delta', () => {
    const out = solve(mintToken(), solveInput())
    expect(out.kind).toBe('recommended')
    if (out.kind !== 'recommended') throw new Error('unreachable')
    const s = out.deltaSkew
    expect(s, 'the tax-aware live solve always has the delta lens').toBeDefined()
    if (s === undefined) throw new Error('unreachable')
    // Internal consistency: the gap field IS mean − median, and the direction matches its sign.
    expect(s.meanMinusMedianReal).toBe(s.meanReal - s.medianReal)
    const dir = s.meanMinusMedianReal > 0 ? 'upside' : s.meanMinusMedianReal < 0 ? 'downside' : 'symmetric'
    expect(s.skewDirection).toBe(dir)
    // COHERENCE with the hero: mean(paired diffs) reproduces the goal-oriented headline delta
    // (exact linearity up to float summation order — bound the dust well under a display cent).
    const heroDelta =
      out.goal === 'leave-more'
        ? out.winner.headlineStatisticB - out.noActionBaseline.headlineStatisticB
        : out.noActionBaseline.headlineStatisticB - out.winner.headlineStatisticB
    expect(Math.abs(s.meanReal - heroDelta)).toBeLessThan(1e-4)
  })

  it('COMMITTED zero-vol fixture (case iv, leave-more): deltaSkew reproduces the hero delta BYTE-EXACTLY, symmetric', () => {
    const fixture = SOLVER_CASES.find((c) => c.id === 'case-iv-leave-more-inversion')
    expect(fixture, 'the case-(iv) leave-more fixture is committed').toBeDefined()
    if (fixture === undefined) throw new Error('unreachable')
    const base = fixture.buildBase()
    const candidates = fixture.buildCandidates()
    expect(candidates.length).toBeGreaterThanOrEqual(2)
    const hb = fixture.preconditions.heirBracket
    expect(hb, 'case (iv) declares its heir bracket').toBeDefined()
    // The hand-derived BEST vs the conversion-0 baseline — the exact pair a live crown displays.
    const bestId = fixture.expectedRankingIds[0]!
    const winnerC = candidates.find((c) => solverCandidateId(c) === bestId)!
    const baselineC = candidates.find((c) => c.conversion === null)!
    const [w, b] = evaluateCandidates(base, [winnerC, baselineC], fixture.seed, { heirBracket: hb! })
    const s = deltaSkewFor(w!, b!, fixture.goal, hb)
    expect(s).toBeDefined()
    if (s === undefined || w!.kind !== 'scored' || b!.kind !== 'scored') throw new Error('unreachable')
    // Zero-vol: every path identical ⇒ mean ≡ median ≡ the headline difference, byte-exact.
    const heroDelta = w!.score.afterTaxBequestMeanReal! - b!.score.afterTaxBequestMeanReal!
    expect(s.meanReal).toBe(heroDelta)
    expect(s.medianReal).toBe(heroDelta)
    expect(s.skewDirection).toBe('symmetric')
    expect(heroDelta, 'case (iv): the conversion winner leaves MORE after tax').toBeGreaterThan(0)
  })

  it('the sign convention is WINNER-POSITIVE on both goals (the hero orientation — argument-order mutant killer)', () => {
    const dist = (terminalTaxable: number, lifetimeTax: number) => ({
      terminalValuesReal: [terminalTaxable, terminalTaxable],
      depletionYears: [NEVER_DEPLETED, NEVER_DEPLETED],
      survivalFraction: 1,
      taxAware: {
        lifetimeTaxPaidReal: [lifetimeTax, lifetimeTax],
        terminalTaxableReal: [terminalTaxable, terminalTaxable],
        terminalPretaxReal: [0, 0],
        terminalRothReal: [0, 0],
        terminalHsaReal: [0, 0],
        terminalTaxableBasisReal: [terminalTaxable, terminalTaxable],
        lifetimeNetPremiumReal: [0, 0],
        lifetimeMedicareCostReal: [0, 0],
      },
    })
    const scored = (terminalTaxable: number, lifetimeTax: number) =>
      ({
        kind: 'scored',
        candidate: { policy: 'taxable-first', conversion: null, provenance: 'grid' },
        distribution: dist(terminalTaxable, lifetimeTax),
        score: { survival: 1 },
      }) as unknown as Parameters<typeof deltaSkewFor>[0]
    // leave-more: the winner LEAVES 10k more per path ⇒ +10,000 exactly (winner-positive).
    const lm = deltaSkewFor(scored(110_000, 5_000), scored(100_000, 5_000), 'leave-more', 0.25)
    expect(lm).toBeDefined()
    expect(lm!.meanReal).toBe(10_000)
    // pay-less-tax: the winner PAYS 4k less per path ⇒ +4,000 exactly (winner-positive).
    const plt = deltaSkewFor(scored(100_000, 6_000), scored(100_000, 10_000), 'pay-less-tax', undefined)
    expect(plt).toBeDefined()
    expect(plt!.meanReal).toBe(4_000)
  })

  it('honest-undefined: no tax lens or a leave-more goal without a declared heir bracket carries undefined, never a throw', () => {
    const candidate = { policy: 'taxable-first', conversion: null, provenance: 'grid' }
    const bareDistribution = { terminalValuesReal: [1, 2], depletionYears: [NEVER_DEPLETED, NEVER_DEPLETED], survivalFraction: 1 }
    const bare = {
      kind: 'scored',
      candidate,
      distribution: bareDistribution,
      score: { survival: 1 },
    } as unknown as Parameters<typeof deltaSkewFor>[0]
    expect(deltaSkewFor(bare, bare, 'pay-less-tax', undefined)).toBeUndefined()
    const taxed = {
      kind: 'scored',
      candidate,
      distribution: {
        ...bareDistribution,
        taxAware: {
          lifetimeTaxPaidReal: [1, 1], terminalTaxableReal: [1, 1], terminalPretaxReal: [0, 0],
          terminalRothReal: [0, 0], terminalHsaReal: [0, 0], terminalTaxableBasisReal: [1, 1],
          lifetimeNetPremiumReal: [0, 0], lifetimeMedicareCostReal: [0, 0],
        },
      },
      score: { survival: 1 },
    } as unknown as Parameters<typeof deltaSkewFor>[0]
    expect(deltaSkewFor(taxed, taxed, 'leave-more', undefined)).toBeUndefined()
  })
})

/**
 * THE DISPLAYED BASELINE IS THE HOUSEHOLD'S OWN PLAN (re-anchored 2026-08-03) — the seam four shipped
 * strings depend on and none of them can check.
 *
 * `copy.ts` renders "Compared with your plan today", "Your plan today", and BOTH dollar heroes as
 * "…than today's plan". Those are claims about the READER'S OWN order. Until this change `solve.ts`
 * built the displayed arm from `search.conventionalBaseline` — the FIXED `taxable-first`/conversion-0
 * candidate — so for every household whose entered order was not `taxable-first` (including the
 * DEFAULT `proportional` draft) the hero was measured against a plan they never chose, under a label
 * saying it was theirs. `plans/4-recommendation.md` had already ratified the opposite ("the rendered
 * delta is current→recommended, NEVER conventional-default→recommended"), so this was a regression.
 *
 * The main roster above cannot witness it: its household IS `taxable-first`, so the two arms coincide.
 * This one enters `proportional` — the shipped default — and the arms genuinely differ.
 */
describe('solve() — the displayed baseline is the household’s OWN entered strategy', () => {
  const BASE_UB: SimulationParams = { ...BASE, drawdownPolicy: 'proportional' }
  // The live roster shape: the grid + the conventional prior + the user's own order carried as the
  // out-of-grid labeled baseline (what `enumerateSolveCandidates` injects UNCONDITIONALLY).
  const CANDIDATES_UB: readonly CandidateStrategy[] = [
    { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' },
    { policy: 'pre-tax-first', conversion: null, provenance: 'grid' },
    { policy: 'proportional', conversion: null, provenance: 'grid' },
    conv(20_000),
    conv(40_000),
    { policy: 'proportional', conversion: null, provenance: 'user-baseline' },
  ]

  function mintTokenUB(): OracleClearedToken {
    const oracleOut = runOptimalityOracle(SOLVER_CASES)
    if (!('report' in oracleOut)) throw new Error('the committed oracle roster must pass')
    const stabilityOut = runRankingStability({
      base: BASE_UB,
      candidates: CANDIDATES_UB,
      seedA: SEED_A,
      seedB: deriveSeedB(SEED_A),
      perturbIndex: 3,
      siblingIndex: 0,
      ranking: RANKING,
      tieTolerance: 0,
    })
    if (!('report' in stabilityOut)) {
      throw new Error(`stability must pass: ${(stabilityOut as { violations: readonly string[] }).violations.join(' | ')}`)
    }
    const mint = mintOracleToken({
      params: BASE_UB,
      candidateConversionAmounts: [undefined, undefined, undefined, 20_000, 40_000, undefined],
      todayEpochDay: TODAY,
      oracleReport: oracleOut.report,
      stabilityReport: stabilityOut.report,
    })
    if (!('token' in mint)) throw new Error(`token must mint: ${JSON.stringify((mint as { withheld: unknown }).withheld)}`)
    return mint.token
  }

  it('displays the USER baseline arm, never the conventional one (the mutant-killer for the four copy strings)', () => {
    const out = solve(mintTokenUB(), {
      base: BASE_UB,
      candidates: CANDIDATES_UB,
      seedA: SEED_A,
      ranking: RANKING,
      tieTolerance: 0,
      _gradeMinPaths: 50,
    })
    expect(out.kind).toBe('recommended')
    if (out.kind !== 'recommended') throw new Error('unreachable')
    // ⛔ Re-anchoring `solve.ts` step (6) back to `search.conventionalBaseline` reds HERE — and that
    // is the whole point: the four copy strings would silently become lies in the same commit.
    expect(
      out.noActionBaseline.id,
      'the arm labelled "your plan today" must BE the household’s entered order',
    ).toBe('baseline:proportional:0')
    expect(out.noActionBaseline.id).not.toBe('conventional:taxable-first:0')
    // Non-vacuity: the conventional arm really IS a different, present candidate — so the assertion
    // above is a genuine choice between two available arms, not the only thing solve could return.
    expect(CANDIDATES_UB.some((c) => c.provenance === 'conventional-baseline')).toBe(true)
    expect(out.rankedIds).toContain('conventional:taxable-first:0')
    // …and it carries a real displayed distribution like any other rendered arm.
    expect(out.noActionBaseline.distributionB.terminalValuesReal.length).toBe(BASE_UB.paths)
  }, 120_000)

  it('noChange is FALSE when the crown is not the household’s own order — and the copy depends on it', () => {
    const out = solve(mintTokenUB(), {
      base: BASE_UB,
      candidates: CANDIDATES_UB,
      seedA: SEED_A,
      ranking: RANKING,
      tieTolerance: 0,
      _gradeMinPaths: 50,
    })
    if (out.kind !== 'recommended') throw new Error('unreachable')
    // `noChange` gates `recComposeAlready` — "You're already on one of the strongest paths". It is
    // true ONLY when the crowned PLAN is the one the household already runs. Whatever wins here, the
    // flag must agree with the crowned id rather than with the conventional arm's identity.
    const winnerIsTheirs = out.winner.id === 'baseline:proportional:0' || out.winner.id === 'grid:proportional:0'
    expect(out.noChange, `crown=${out.winner.id} — "already" must track the household’s own plan`).toBe(winnerIsTheirs)
  }, 120_000)
})
