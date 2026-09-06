/**
 * U15 §S6 — `profile.ts`: the solve compute-profile gate. Mirrors the dateSearchProfile battery: it
 * MEASURES a full worker-side solve against its single-simulate baseline (the injected clock), reports
 * the structural dims, and — critically — surfaces `payloadKind` so a short-circuited solve (a withheld
 * token, a mint-fail) can NEVER masquerade as a measured full solve. A lying clock is refused (a
 * negative interval would sail under any budget check as a vacuous pass), and an unrunnable baseline is
 * refused (validation cost is not compute cost). The dev-laptop worst-case datapoint is recorded in
 * the build handoff by `scripts/profile-solver.ts` (the caller-side runner supplies the real clock).
 */
import { describe, expect, it } from 'vitest'
import type { RetirementState, SimulationParams } from '@shared/model'
import type { CandidateStrategy } from '../candidates'
import type { SolverRunRanking } from '../../validation/solverRunFingerprint'
import { epochDayFromIsoDate } from '../../validation/oracleToken'
import { acaEnhancedSubsidyStatus, solverBFamilySize } from '@engine/constants'
import { profileSolve } from '../profile'
import type { SolveRequest } from '../solveEntry'

const baseFor = (over: Partial<SimulationParams> = {}, state?: RetirementState): SimulationParams => ({
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
  ...over,
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
  _gradeMinPaths: 50, // keep the grade below the live 16k floor for test speed
  ...over,
})

describe('profileSolve — measures a full worker-side solve against its baseline', () => {
  it('reports the structural dims + a finite ratio on a RECOMMENDED solve (the real worst-case shape)', () => {
    const profile = profileSolve(requestFor(), () => performance.now())
    expect(profile.payloadKind).toBe('recommended') // measured the FULL search + grade, not a gate short-circuit
    expect(profile.candidateCount).toBe(5)
    expect(profile.rankableCount).toBe(3) // the `conversion === null` subset — NOT what solve ranks since 2026-07-19
    expect(profile.conversionCount).toBe(2) // the conversion grid — WITHHELD only under the trend clause's blocking arm
    expect(profile.paths).toBe(256)
    expect(profile.maxHorizonYears).toBe(40)
    expect(profile.bFamilySize).toBe(solverBFamilySize.value)
    expect(profile.singleSimulateMs).toBeGreaterThanOrEqual(0)
    expect(profile.solveMs).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(profile.ratioVsSingle) || profile.ratioVsSingle === Number.POSITIVE_INFINITY).toBe(true)
    // The solve does FAR more work than one simulate (2K stability + 2K search + the grade family) —
    // when the baseline is measurable the ratio is well above 1 (a linear-in-candidates multiple).
    if (profile.singleSimulateMs > 0) expect(profile.ratioVsSingle).toBeGreaterThan(1)
  }, 120_000)

  it('SURFACES a short-circuited solve honestly — a withheld-token household never passes as a full solve', () => {
    // THE DRIVER CHANGED 2026-08-02, THE POINT DID NOT. An NC household used to withhold
    // (state-certification-pending) until S.L. 2026-41 pinned the rate schedule; no priced state
    // withholds any more, so this arm now rides the ACA legislative-freshness clause, which is
    // still live-drivable: an enrolled-premium stream puts the run inside the clause's domain
    // (insight 027) and an injected today past the window fires it. What must never be lost is
    // the assertion itself — the baseline still measures, but payloadKind exposes that solveMs is
    // NOT a full-solve worst case (the outcomeKind discipline).
    //
    // Safe by construction: both members are already retired with zero earned income, so this
    // household has NO bridge years and cannot trip simulate.ts's wage-blind ACA rejection arm
    // (which fires only when someone is still working — `isBridgeYear`, simulate.ts:895-897).
    // `irmaaMagiSeed` is REQUIRED once healthcare prices: the 66-year-old is Medicare-enrolled at
    // t=0 and IRMAA reads MAGI on a 2-year lookback, so the two pre-simulation years must be given
    // rather than computed as a silent ≈$0 (which would understate the surcharge). Without it the
    // baseline is INDETERMINATE and profileSolve refuses it — validation cost is not compute cost.
    const b = baseFor()
    const onAca: SimulationParams = {
      ...b,
      overlay: {
        ...b.overlay!,
        healthcareEnabled: true,
        enrolledPremium: [12_000],
        slcsp: [12_000],
        irmaaMagiSeed: [120_000, 120_000],
      },
    }
    const profile = profileSolve(
      requestFor({ base: onAca, todayEpochDay: TODAY + 400 }),
      () => performance.now(),
    )
    expect(profile.payloadKind).toBe('token-withheld')
  }, 120_000)

  it('REFUSES a lying (backwards) clock — a negative interval is a measurement fault, not a datapoint', () => {
    let n = 0
    const backwards = (): number => (n++ === 0 ? 100 : 50) // baseline end < start
    expect(() => profileSolve(requestFor(), backwards)).toThrow(/backwards/)
  })

  it('REFUSES a non-finite clock (insight 010)', () => {
    expect(() => profileSolve(requestFor(), () => Number.NaN)).toThrow(/non-finite/)
  })

  it('REFUSES an INDETERMINATE baseline — the gate measures compute, not validation (burned/062)', () => {
    // stockWeight out of [0,1] ⇒ the R19 gate returns the defined indeterminate output; profiling it
    // would report validation cost as compute cost. Refuse before the solve ever runs.
    const bad = requestFor({ base: baseFor({ stockWeight: 1.5 }) })
    expect(() => profileSolve(bad, () => performance.now())).toThrow(/INDETERMINATE/)
  })
})
