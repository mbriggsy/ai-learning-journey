/**
 * U15 §S5 — mint-then-solve (`solveEntry.ts`): the worker orchestration that runs U14's harness
 * (the optimality oracle + K-candidate ranking stability), mints the oracle-cleared token, and hands
 * it to `solve()`. Every exit is a NAMED bin (insight 092): recommended, token-withheld (an honesty
 * gate fired), mint-failed (the harness gate itself broke / the roster can't be validated),
 * unwitnessable (the harness cannot witness THIS household — a typed refusal, 2026-09-04). The token
 * never crosses a wire (it is branded) — it is minted and consumed entirely here.
 */
import { describe, expect, it } from 'vitest'
import type { CandidateStrategy } from '../candidates'
import type { RetirementState, SimulationParams } from '@shared/model'
import { epochDayFromIsoDate } from '../../validation/oracleToken'
import { acaEnhancedSubsidyStatus } from '@engine/constants'
import type { SolverRunRanking } from '../../validation/solverRunFingerprint'
import { perturbationPair, solveWithMint, type SolveRequest } from '../solveEntry'
import { SOLVER_CODE_VERSION } from '../solverCodeVersion'

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
  it('RECOMMENDS end-to-end on a clean household (oracle + stability + mint + solve) — conversions RANK, nothing withheld', () => {
    const out = solveWithMint(requestFor())
    expect(out.kind).toBe('recommended')
    if (out.kind !== 'recommended') throw new Error('unreachable')
    // The trend sourcing unit lifted the standing blocker: the clause is clear (sourced +
    // consumed), so the conversion levers rejoin the ranked field END-TO-END through the live
    // mint (the withheld enumeration is the clause's regression arm, empty by construction here).
    expect(out.withheldConversionLevers).toEqual([])
    expect(out.rankedIds).toContain('grid:taxable-first:20000')
    expect(out.noActionBaseline.id).toBe('conventional:taxable-first:0')
  }, 120_000)

  it('RECOMMENDS for an NC household — S.L. 2026-41 pinned the rate schedule and retired the certification withhold', () => {
    // INVERTED 2026-08-02. This household was `token-withheld{state-certification-pending}` while
    // ncRateSchedule's out-years waited on a revenue certification. The session law enacted those
    // out-years outright, so withholding here would now refuse an answer the engine can stand
    // behind — the honest-withhold machinery is still wired, it just has no live state to fire on
    // (proven through the mint's `_pinningOverride` seam in oracleToken.test.ts).
    const out = solveWithMint(requestFor({ base: baseFor('NC'), ranking: RANKING }))
    expect(out.kind).toBe('recommended')
    if (out.kind !== 'recommended') throw new Error('unreachable')
    expect(out.rankedIds.length, 'a real ranked field, not an empty pass-through').toBeGreaterThan(0)
  }, 120_000)

  it('MINT-FAILS on a roster with no conversion candidate (ranking stability cannot run)', () => {
    const out = solveWithMint(requestFor({ candidates: CANDIDATES.filter((c) => c.conversion === null) }))
    expect(out.kind).toBe('mint-failed')
    if (out.kind !== 'mint-failed') throw new Error('unreachable')
    expect(out.stage).toBe('roster')
  }, 120_000)

  // THE UNWITNESSABLE HOUSEHOLD (2026-09-04). Ranking stability's perturbation law needs the +1,000
  // conversion variant to MOVE the varied candidate's own decision surface. THIS world reaches the
  // class by the CLAMP route: with pretax 0, both arms clamp to the same post-RMD headroom (the engine
  // caps a conversion at `min(planned, pretax − rmd)`, taxOverlay.ts:1444), so nothing moves BY
  // CONSTRUCTION on a comfortably-funded household — which is also the proof the bin is verdict-blind.
  // The live witness `?seed=failing` (devSeeds.test.ts) reaches the SAME class by the OTHER route:
  // its arms run unclamped and tie because every path is exhausted in year 0. Either way it is the
  // household's property, not the harness's defect — so it exits as a typed refusal the surface can
  // explain, never `mint-failed` (reserved for code defects, and rendered as a "try again" a
  // structurally-inert household can never satisfy).
  it('UNWITNESSABLE on a household the perturbation cannot move (pretax 0): the typed refusal, never mint-failed', () => {
    const base = baseFor()
    const inert: SimulationParams = {
      ...base,
      overlay: { ...base.overlay!, buckets: { taxable: 800_000, pretax: 0, roth: 100_000 } },
    }
    const out = solveWithMint(requestFor({ base: inert }))
    expect(out.kind, 'a decision the surface can explain, never a defect bin').toBe('unwitnessable')
    if (out.kind !== 'unwitnessable') throw new Error('unreachable')
    expect(out.reason).toBe('perturbation-inert')
    expect(out.solverCodeVersion).toBe(SOLVER_CODE_VERSION)
    // The stability prose rides along as DIAGNOSTIC detail (never rendered) — the same sentence the
    // old mint-failed carried, so a log reader sees exactly what the harness saw.
    expect(out.detail).toMatch(/nothing moved/)
    expect(out.detail, 'the mint-failed head is NOT prepended — this is not a CRN break').not.toMatch(/CRN break/)
  }, 240_000)

  it('a HARNESS-class stability failure still MINT-FAILS — a code / world defect never hides behind a household refusal', () => {
    // A fixed-horizon world samples no deaths ⇒ no path enters the survivor regime ⇒ the CRN claim
    // is vacuous for a WORLD reason (burned/027). That is the harness refusing to bless a run it
    // cannot prove, not a household the harness cannot witness — the classifier must keep them apart.
    const out = solveWithMint(requestFor({ base: { ...baseFor(), longevityMode: 'fixed-horizon' } }))
    expect(out.kind).toBe('mint-failed')
    if (out.kind !== 'mint-failed') throw new Error('unreachable')
    expect(out.stage).toBe('stability')
    expect(out.detail).toMatch(/CRN break/)
    expect(out.detail).toMatch(/survivor regime/)
  }, 240_000)
})
