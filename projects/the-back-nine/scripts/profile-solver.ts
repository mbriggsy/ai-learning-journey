/**
 * The U15 §S6 solve compute-profile RUNNER — the caller-side clock the pure `profileSolve`
 * (src/engine/solver/profile.ts) is injected with. Lives OUTSIDE src/engine (the engine reads no
 * `performance`/`Date` — engine-purity lint); THIS is where the real clock enters, exactly as the
 * seed is injected. Not a CI gate — a one-off measurement harness: it prints the first datapoint of
 * the on-demand solve budget so the fallback-ladder knobs (fallback.ts, all −1 sentinels today) pin
 * on MEASUREMENT, never a guess.
 *
 * THE WORST-CASE SHAPE it measures: the longest tractable horizon, the full 16,000-path final-crown
 * floor (so the grade runs REAL, not the below-floor `gradeUnavailable`), a multi-amount cliff-anchored
 * conversion grid (the ranking-stability perturbation load), the healthcare overlay's BOTH regimes —
 * ACA (pre-65, the 64yo's fixed-point iteration) + IRMAA (post-65, the 66yo's surcharge feed-forward) —
 * and the m-draw held-out B-family the grade sweeps. `payloadKind` must read `recommended` or the number
 * is a gate short-circuit, not a full-solve cost. Run: `pnpm tsx scripts/profile-solver.ts`.
 */
import { performance } from 'node:perf_hooks'
import type { CandidateStrategy } from '@engine/solver/candidates'
import type { SolverRunRanking } from '@engine/validation/solverRunFingerprint'
import { epochDayFromIsoDate } from '@engine/validation/oracleToken'
import { acaEnhancedSubsidyStatus } from '@engine/constants'
import { profileSolve } from '@engine/solver/profile'
import type { SolveRequest } from '@engine/solver/solveEntry'
import type { SimulationParams } from '@shared/model'

const WORST_CASE_PATHS = 16_000 // the final-crown floor — the grade runs a REAL (not below-floor) read
const WORST_CASE_HORIZON = 45 // a long household horizon

// The worst-case healthcare load: BOTH regimes priced on the same run — the 64yo is pre-65 (ACA, its
// fixed-point iteration is the pre-65 cost driver) and the 66yo is already Medicare-enrolled (IRMAA,
// the post-65 surcharge feed-forward). Enhanced subsidies pick the ARPA/IRA applicable-% table; the
// per-year enrolled/benchmark premium streams trigger the ACA fixed point in every pre-65 year, and
// the irmaaMagiSeed feeds the 2-year IRMAA lookback the year-0/1 Medicare enrollee needs (fail-loud
// without it). Cost-shape only — the profiler measures compute, never correctness.
const HEALTHCARE_PREMIUM = 18_000 // a realistic pre-65 enrolled/benchmark annual premium (real $)

const base: SimulationParams = {
  initialPortfolio: 1_400_000,
  annualSpendingReal: 80_000,
  stockWeight: 0.55,
  people: [
    { sex: 'female', currentAge: 66, birthYear: 1960, retirementAge: 65, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 67 },
    { sex: 'male', currentAge: 64, birthYear: 1962, retirementAge: 64, earnedIncomeReal: 0, pia: 22_000, socialSecurityClaimAge: 67 },
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
  paths: WORST_CASE_PATHS,
  maxHorizonYears: WORST_CASE_HORIZON,
  longevityMode: 'sampled',
  overlay: {
    taxEnabled: true,
    rmdEnabled: true,
    startCalendarYear: 2026,
    buckets: { taxable: 500_000, pretax: 800_000, roth: 100_000 },
    initialTaxableBasis: 400_000,
    filing: 'mfj',
    // The healthcare overlay — BOTH regimes priced (ACA pre-65 for the 64yo, IRMAA post-65 for the 66yo).
    healthcareEnabled: true,
    enhancedSubsidies: true,
    slcsp: Array.from({ length: WORST_CASE_HORIZON }, () => HEALTHCARE_PREMIUM),
    enrolledPremium: Array.from({ length: WORST_CASE_HORIZON }, () => HEALTHCARE_PREMIUM),
    irmaaMagiSeed: [130_000, 130_000], // [MAGI[−2], MAGI[−1]] — the 66yo is IRMAA-priced in years 0 & 1
  },
}

const conv = (amount: number): CandidateStrategy => ({
  policy: 'taxable-first',
  conversion: { annualAmountReal: amount, startYearOffset: 0, years: 3 },
  provenance: 'grid',
  anchoredRail: { kind: 'bracket-edge', edge: 100_000 + amount },
})

// A worst-case roster: 3 sequencing arms (the ranked field) + a 5-amount conversion grid (the
// ranking-stability perturbation load + the withheld-lever enumeration).
const candidates: readonly CandidateStrategy[] = [
  { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' },
  { policy: 'pre-tax-first', conversion: null, provenance: 'grid' },
  { policy: 'proportional', conversion: null, provenance: 'grid' },
  conv(10_000),
  conv(20_000),
  conv(30_000),
  conv(40_000),
  conv(50_000),
]

const ranking: SolverRunRanking = { goal: 'leave-more', heirBracket: 0.25 }
const todayEpochDay = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5 // inside the freshness window

const request: SolveRequest = { base, candidates, seedA: 0xa11ce, ranking, tieTolerance: 0, todayEpochDay }

console.log('[profile-solver] measuring the worst-case solve (dev-laptop) — this runs the FULL harness + search + grade at 16k paths…')
const profile = profileSolve(request, () => performance.now())

console.log(JSON.stringify(profile, null, 2))
console.log('\n--- summary (dev-laptop, NOT the reference device) ---')
console.log(`payloadKind        : ${profile.payloadKind}  ${profile.payloadKind === 'recommended' ? '(a full-solve measurement)' : '(SHORT-CIRCUIT — not a full solve)'}`)
console.log(`paths × horizon    : ${profile.paths} × ${profile.maxHorizonYears}`)
console.log(`roster / rankable  : ${profile.candidateCount} / ${profile.rankableCount}  (+${profile.conversionCount} withheld conversions)  · B-family m=${profile.bFamilySize}`)
console.log(`single simulate    : ${profile.singleSimulateMs.toFixed(1)} ms`)
console.log(`full solve         : ${profile.solveMs.toFixed(1)} ms`)
console.log(`ratio vs single    : ${profile.ratioVsSingle.toFixed(1)}×  (expected linear in candidate count)`)
