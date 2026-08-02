/**
 * U14 S0 — the oracle-token per-run clauses (the mint predicate's four legs).
 *
 * The council's Attack-5 requirement was a flagship PAIR: an NC household's token BLOCKED
 * (state-certification-pending) while FL and PA MINT on the SAME build. **That pair went live-
 * unreachable on 2026-08-02**, when S.L. 2026-41 § 44.1(a) pinned `ncRateSchedule` to an enacted
 * statutory schedule and retired the last directional entry on the priced roster — so every
 * priced state now mints, and Attack-5's per-household DIFFERENTIATION is proven through the
 * pure seam instead (`classifyConsumedConstants` with a planted directional `state.*` row) plus
 * the mint's own `_pinningOverride` seam. This is the trend clause's history repeating: a clause
 * that CLEARS must grow a seam, or deleting its leg stays green forever (insight 048).
 *
 * Every clause also has its pure-seam planted arms: fail-closed on an unclassified directional
 * entry, the lying-mirror trend arm (fake-sourced entry + unmoved pricing mode still blocks),
 * the planted ε sentinel, and the NaN-injected today.
 */
import { describe, it, expect } from 'vitest'
import type { OverlayParams, PersonInputs, SimulationParams } from '@shared/model'
import { sourced, unsourced } from '@engine/constants/types'
import { acaEnhancedSubsidyStatus, PRICED_STATES } from '@engine/constants'
import { productionMarket } from '../../reference/methodology'
import {
  candidateSetHasConversions,
  classifyConsumedConstants,
  epochDayFromIsoDate,
  evaluateAcaFreshnessClause,
  evaluateMedicareTrendClause,
  evaluateEpsilonClause,
  evaluatePinningClause,
  mintOracleToken,
  _evaluateEpsilonClause,
  _evaluateMedicareTrendClause,
} from '../oracleToken'
import { runOptimalityOracle, type OracleReport } from '../optimalityOracle'
import { runRankingStability } from '../rankingStability'
import { SOLVER_CASES } from '../../reference/solver-cases'

const P65: PersonInputs = {
  sex: 'male', currentAge: 65, birthYear: 1961, retirementAge: 65,
  earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 65,
}

function makeParams(over: Partial<SimulationParams> = {}): SimulationParams {
  return {
    initialPortfolio: 1000,
    annualSpendingReal: 40,
    stockWeight: 0.5,
    people: [P65],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    market: productionMarket.value,
    paths: 100,
    maxHorizonYears: 30,
    longevityMode: 'fixed-horizon',
    ...over,
  }
}

const overlayFor = (state?: 'NC' | 'PA' | 'FL'): OverlayParams => ({
  taxEnabled: true,
  rmdEnabled: true,
  startCalendarYear: 2026,
  buckets: { taxable: 0, pretax: 1000, roth: 0 },
  filing: 'mfj',
  ...(state !== undefined ? { retirementState: state } : {}),
})

describe('the pinning clause — the priced roster is FULLY PINNED, so every state mints (S0.2, Attack-5)', () => {
  it('an NC household MINTS free — S.L. 2026-41 pinned the rate schedule, retiring the certification block', () => {
    // THE INVERSION OF THE ORIGINAL ATTACK-5 ARM. Until 2026-08-02 this household was BLOCKED
    // (state-certification-pending) because ncRateSchedule's out-years waited on a revenue
    // certification. S.L. 2026-41 § 44.1(a) enacted the schedule outright AND struck every
    // trigger row through FY2032-33, so the certification gates nothing — the honest posture
    // is now to mint. Blocking here would withhold a recommendation we can actually stand behind.
    const { blocking } = evaluatePinningClause(makeParams({ overlay: overlayFor('NC') }))
    expect(blocking).toEqual([])
  })

  it('NO priced state is directional — the property behind the three mint arms (fail-loud if one regresses)', () => {
    // Non-vacuity for the three arms above: they would all pass trivially if the state branch
    // stopped being consumed at all. This asserts the REASON they pass — every priced state's
    // rate schedule is pinned — so a future directional state re-arms the block instead of
    // silently minting, and this test names which one broke.
    for (const state of PRICED_STATES) {
      const { blocking } = evaluatePinningClause(makeParams({ overlay: overlayFor(state) }))
      expect(blocking, `${state} must be pinned or its household must block`).toEqual([])
    }
  })

  it('an FL household MINTS free on the same build (the constitutional $0 is pinned)', () => {
    const { blocking } = evaluatePinningClause(makeParams({ overlay: overlayFor('FL') }))
    expect(blocking).toEqual([])
  })

  it('a PA household MINTS free on the same build (all PA entries pinned at the S0 pass)', () => {
    const { blocking } = evaluatePinningClause(makeParams({ overlay: overlayFor('PA') }))
    expect(blocking).toEqual([])
  })

  it('a federal-only household is not blocked, and its consumed methodology defaults ship DISCLOSED', () => {
    const { blocking, disclosedDirectional } = evaluatePinningClause(makeParams({ overlay: overlayFor() }))
    expect(blocking).toEqual([])
    // The default market + survivor ratio are methodology substrate: directional, disclosed,
    // never blocking (supersession item 5 — flipping them to clear a gate is laundering).
    expect(disclosedDirectional).toContain('methodology.productionMarket')
    expect(disclosedDirectional).toContain('methodology.survivorSpendingRatio')
  })
})

describe('classifyConsumedConstants — the pure classification seam (planted arms)', () => {
  const pinned = { key: 'tax.x', entry: sourced(1, { citation: 'c', directionalUntilPinned: false }) }
  const substrate = {
    key: 'methodology.y',
    entry: sourced(1, { citation: 'c', directionalUntilPinned: true, directionalKind: 'methodology-substrate' as const }),
  }
  const certifiable = {
    key: 'health.z',
    entry: sourced(1, { citation: 'c', directionalUntilPinned: true, directionalKind: 'certification-pinnable' as const }),
  }
  const unclassified = { key: 'tax.w', entry: sourced(1, { citation: 'c', directionalUntilPinned: true }) }
  const stateRow = {
    key: 'state.ncRateSchedule',
    entry: sourced(1, { citation: 'c', directionalUntilPinned: true, directionalKind: 'certification-pinnable' as const }),
  }

  it('pinned → neither list; substrate → disclosed; certification-pinnable → blocking by name', () => {
    const out = classifyConsumedConstants([pinned, substrate, certifiable])
    expect(out.blocking).toEqual([{ kind: 'rec-relevant-primary-directional', name: 'health.z' }])
    expect(out.disclosedDirectional).toEqual(['methodology.y'])
  })

  it('an UNCLASSIFIED directional entry fails CLOSED (blocking) — the predicate never guesses optimistically', () => {
    const out = classifyConsumedConstants([unclassified])
    expect(out.blocking).toEqual([{ kind: 'rec-relevant-primary-directional', name: 'tax.w' }])
  })

  it('a directional state row blocks as state-certification-pending, deduped per state', () => {
    const out = classifyConsumedConstants([stateRow, stateRow])
    expect(out.blocking).toEqual([{ kind: 'state-certification-pending', state: 'NC' }])
  })
})

describe('the Medicare-cost-trend clause (S0.4 — the standing conversion blocker, LIFTED by the trend sourcing unit)', () => {
  it('LIVE: a conversion-bearing candidate set is CLEAR — the trend is sourced AND Part-B pricing consumes it (both halves, insight 074)', () => {
    expect(evaluateMedicareTrendClause(true)).toBeNull()
  })

  it('LIVE: a conversion-free candidate set is not the block’s domain', () => {
    expect(evaluateMedicareTrendClause(false)).toBeNull()
  })

  it('planted: a SOURCED trend with an UNMOVED real-flat pricing is STILL blocked — the lying-mirror arm (insights 074/081)', () => {
    const fakeSourced = sourced(0.02, { citation: 'planted', directionalUntilPinned: false })
    expect(_evaluateMedicareTrendClause(true, fakeSourced, 'real-flat')).toEqual({
      kind: 'medicare-trend-unsourced',
    })
  })

  it('planted: sourced AND consumed clears the block; unsourced never clears regardless of mode', () => {
    const fakeSourced = sourced(0.02, { citation: 'planted', directionalUntilPinned: false })
    expect(_evaluateMedicareTrendClause(true, fakeSourced, 'trended')).toBeNull()
    const gap = unsourced('planted pinTo')
    expect(_evaluateMedicareTrendClause(true, gap, 'trended')).toEqual({ kind: 'medicare-trend-unsourced' })
  })

  it('candidateSetHasConversions keys the domain: only a finite positive amount counts', () => {
    expect(candidateSetHasConversions([])).toBe(false)
    expect(candidateSetHasConversions([0, undefined])).toBe(false)
    expect(candidateSetHasConversions([Number.NaN])).toBe(false)
    expect(candidateSetHasConversions([0, 34_000])).toBe(true)
  })
})

describe('the ACA freshness clause (one calendar with verify:aca; injected today — no clock)', () => {
  // Read the LIVE stamp (never a re-typed date — a verify:aca refresh must not break this
  // test); derive its epoch day through the same pure function the clause uses, then push
  // the injected today around it.
  const verified = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn)
  const acaRun = makeParams({
    overlay: { ...overlayFor(), healthcareEnabled: true, enrolledPremium: [12_000] },
  })

  it('a fresh stamp (age ≤ 30d) passes; a stale one (age > 30d) withholds aca-unverified with the age', () => {
    expect(evaluateAcaFreshnessClause(acaRun, verified + 10)).toBeNull()
    expect(evaluateAcaFreshnessClause(acaRun, verified + 40)).toEqual({ kind: 'aca-unverified', ageDays: 40 })
  })

  it('a run that never prices the ACA fixed point is outside the clause’s domain (insight 027)', () => {
    const medicareOnly = makeParams({ overlay: { ...overlayFor(), healthcareEnabled: true } })
    expect(evaluateAcaFreshnessClause(medicareOnly, verified + 400)).toBeNull()
  })

  it('a NaN / non-integer injected today fails LOUD (insights 008/010 — never a silent pass)', () => {
    expect(() => evaluateAcaFreshnessClause(acaRun, Number.NaN)).toThrow(/integer epoch-day/)
    expect(() => evaluateAcaFreshnessClause(acaRun, 20_000.5)).toThrow(/integer epoch-day/)
  })
})

describe('epochDayFromIsoDate — hand-derived anchors (DND-012: derived by calendar arithmetic, never by Date)', () => {
  it('anchors: the epoch itself, and 2026-07-03 = 20,637 (56y = 20,454d to 2026-01-01 incl. 14 leap days, + 183)', () => {
    expect(epochDayFromIsoDate('1970-01-01')).toBe(0)
    // 1970..2025 inclusive = 56 years = 56×365 + 14 leap days (1972,1976,…,2024) = 20,454 days
    // to 2026-01-01. 2026-07-03 is day-of-year 184 (31+28+31+30+31+30+3; 2026 not a leap year)
    // ⇒ index 183. 20,454 + 183 = 20,637.
    expect(epochDayFromIsoDate('2026-07-03')).toBe(20_637)
    expect(epochDayFromIsoDate('2026-07-18')).toBe(20_652)
  })

  it('leap handling: 2024-02-29 is a real day and 2024-03-01 is exactly one later', () => {
    expect(epochDayFromIsoDate('2024-03-01') - epochDayFromIsoDate('2024-02-29')).toBe(1)
  })

  it('malformed input fails loud', () => {
    expect(() => epochDayFromIsoDate('2026-7-3')).toThrow(/not an ISO date/)
    expect(() => epochDayFromIsoDate('2026-13-01')).toThrow(/out-of-range/)
  })
})

describe('the ε / calibration sentinel clause (burned/062; insights 008/010/039)', () => {
  it('LIVE: every calibration quantity is calibrated (the S4 probe wrote the demotion margin 2026-07-18) — the clause passes', () => {
    expect(evaluateEpsilonClause()).toEqual([])
  })

  it('planted: a sentinel, a NaN, and an Infinity each read UNCALIBRATED (finiteness first)', () => {
    expect(_evaluateEpsilonClause([['a', -1]])).toEqual([{ kind: 'epsilon-uncalibrated', name: 'a' }])
    expect(_evaluateEpsilonClause([['b', Number.NaN]])).toEqual([{ kind: 'epsilon-uncalibrated', name: 'b' }])
    expect(_evaluateEpsilonClause([['c', Number.POSITIVE_INFINITY]])).toEqual([
      { kind: 'epsilon-uncalibrated', name: 'c' },
    ])
    expect(_evaluateEpsilonClause([['d', 1.96]])).toEqual([])
  })
})

describe('S6 — mintOracleToken: the assembled gate (reports required, clauses composed, NC-blocks/FL-mints THROUGH the mint)', () => {
  // The REAL reports, built by the real runners (a planted roster yields failures and no
  // report — the S2 battery pins that — so a token without a clean oracle pass is not a
  // type-checkable program without deliberate casts).
  const oracleOut = runOptimalityOracle(SOLVER_CASES)
  if (!('report' in oracleOut)) throw new Error('the roster must be clean to build the mint battery')
  const oracleReport = oracleOut.report

  const stochastic = (() => {
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
      paths: 200,
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
    return base
  })()
  const stabilityCandidates = [
    { policy: 'taxable-first', conversion: null, provenance: 'conventional-baseline' },
    { policy: 'taxable-first', conversion: { annualAmountReal: 20_000, startYearOffset: 0, years: 3 }, provenance: 'grid' },
    { policy: 'taxable-first', conversion: { annualAmountReal: 40_000, startYearOffset: 0, years: 3 }, provenance: 'grid' },
  ] as const
  // The ranking objective the report's fingerprint pins (§S0.2) — the stability check is
  // goal-agnostic, so any valid objective drives this shared report.
  const ranking = { goal: 'leave-more', heirBracket: 0.25 } as const
  const stabilityOut = runRankingStability({
    base: stochastic,
    candidates: stabilityCandidates,
    seedA: 0xa11ce,
    seedB: 0xb0b5eed,
    perturbIndex: 1,
    siblingIndex: 2,
    ranking,
    tieTolerance: 0, // identity-only (the fingerprint pins it)
  })
  if (!('report' in stabilityOut)) {
    throw new Error(`stability must pass to build the mint battery: ${(stabilityOut as { violations: readonly string[] }).violations.join(' | ')}`)
  }
  const stabilityReport = stabilityOut.report
  const today = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5

  it('an FL household MINTS on this build (conversion-free set) with its provenance', () => {
    const out = mintOracleToken({
      params: makeParams({ overlay: overlayFor('FL') }),
      candidateConversionAmounts: [undefined, undefined],
      todayEpochDay: today,
      oracleReport,
      stabilityReport,
    })
    expect('token' in out, 'token' in out ? '' : JSON.stringify((out as { withheld: unknown }).withheld)).toBe(true)
    if ('token' in out) {
      expect(out.token.mintedOver.oracleCaseIds).toEqual(SOLVER_CASES.map((f) => f.id))
      expect(out.token.mintedOver.stabilityCandidateCount).toBe(3)
      expect(out.disclosedDirectional).toContain('methodology.productionMarket')
      // §S0.2: the token COPIES the stability report's fingerprint verbatim (the single authority)
      // — a mint that dropped or recomputed it (drift) fails here. Non-empty (a real identity).
      expect(out.token.mintedOver.fingerprint).toBe(stabilityReport.fingerprint)
      expect(out.token.mintedOver.fingerprint.length).toBeGreaterThan(0)
    }
  })

  it('the SAME FL household with a conversion-bearing set now MINTS — the trend clause is CLEAR (the standing blocker lifted, 2026-07-19)', () => {
    const out = mintOracleToken({
      params: makeParams({ overlay: overlayFor('FL') }),
      candidateConversionAmounts: [undefined, 20_000],
      todayEpochDay: today,
      oracleReport,
      stabilityReport,
    })
    // Pre-sourcing this exact input was withheld [{ kind: 'medicare-trend-unsourced' }] — the
    // sourced trend + the 'trended' Part-B pricing clear the clause (both halves, insight 074);
    // the blocking arm stays exercised through the pure seam + the mint's _trendOverride arm.
    expect('token' in out, 'token' in out ? '' : JSON.stringify((out as { withheld: unknown }).withheld)).toBe(true)
  })

  it('an NC household now MINTS on the SAME build with the SAME reports — the certification block is retired (S.L. 2026-41)', () => {
    const out = mintOracleToken({
      params: makeParams({ overlay: overlayFor('NC') }),
      candidateConversionAmounts: [undefined, 20_000],
      todayEpochDay: today,
      oracleReport,
      stabilityReport,
    })
    // The INVERTED flagship arm. Every leg is now clear for this household: the trend clause was
    // lifted by the sourcing unit, and the pinning clause by the 2026-08-02 statutory pin. An NC
    // household that still withheld here would be refusing an answer we can stand behind.
    expect('token' in out, 'token' in out ? '' : JSON.stringify((out as { withheld: unknown }).withheld)).toBe(true)
  })

  it('the MINT’s state-blocking leg goes red through the seam (the leg the live roster can no longer drive)', () => {
    // THE POINT OF THE SEAM (insight 048, the `_trendOverride` precedent): with the roster fully
    // pinned, DELETING the `...pinning.blocking` push inside mintOracleToken would stay green on
    // every live test in this file. The planted evaluation proves the leg is still wired — and
    // that its reason reaches the withheld list verbatim, so U17's gate-red branch can name it.
    const out = mintOracleToken({
      params: makeParams({ overlay: overlayFor('NC') }),
      candidateConversionAmounts: [undefined, 20_000],
      todayEpochDay: today,
      oracleReport,
      stabilityReport,
      _pinningOverride: {
        blocking: [{ kind: 'state-certification-pending', state: 'NC' }],
        disclosedDirectional: [],
      },
    })
    expect('withheld' in out).toBe(true)
    if ('withheld' in out) {
      expect(out.withheld).toEqual([{ kind: 'state-certification-pending', state: 'NC' }])
    }
  })

  it('a conversion-FREE candidate set on a pinned-state household escapes the trend block (the domain is the candidate set)', () => {
    const out = mintOracleToken({
      params: makeParams({ overlay: overlayFor('PA') }),
      candidateConversionAmounts: [undefined, undefined],
      todayEpochDay: today,
      oracleReport,
      stabilityReport,
    })
    expect('token' in out).toBe(true)
  })

  it('the clause union: an NC + conversions + stale-ACA + planted-unsourced-trend run names ALL its reasons at once (the wiring pin — the trend leg driven through the seam now the live clause is clear)', () => {
    const params = makeParams({
      overlay: { ...overlayFor('NC'), healthcareEnabled: true, enrolledPremium: [12_000], slcsp: [12_000] },
    })
    // The trend leg rides `_trendOverride` (the `_epsilonRequired` precedent, insight 048): the
    // LIVE clause is clear post-sourcing, so without the seam, deleting the mint's trend push
    // would stay green on every live test — the planted unsourced entry proves the leg is wired.
    // The STATE leg now rides `_pinningOverride` for the same reason the trend leg rides
    // `_trendOverride`: both live clauses are CLEAR (the trend by sourcing, the state by the
    // 2026-08-02 statutory pin), so the union could no longer be driven to three reasons from
    // live constants alone. Only the ACA leg is still live-driven, by the +400-day today.
    const out = mintOracleToken({
      params,
      candidateConversionAmounts: [30_000],
      todayEpochDay: today + 400,
      oracleReport,
      stabilityReport,
      _trendOverride: { entry: unsourced('planted pinTo'), mode: 'trended' },
      _pinningOverride: {
        blocking: [{ kind: 'state-certification-pending', state: 'NC' }],
        disclosedDirectional: [],
      },
    })
    expect('withheld' in out).toBe(true)
    if ('withheld' in out) {
      const kinds = out.withheld.map((w) => w.kind).sort()
      expect(kinds).toEqual(['aca-unverified', 'medicare-trend-unsourced', 'state-certification-pending'])
    }
  })

  it('the MINT’s epsilon leg goes red (U14 fold — the seam the live list could not drive): a planted sentinel withholds THROUGH the mint', () => {
    // Before the _epsilonRequired test seam, deleting the mint's epsilon push stayed green —
    // the live constants are all calibrated, so no test could distinguish wired from unwired.
    const out = mintOracleToken({
      params: makeParams({ overlay: overlayFor('FL') }),
      candidateConversionAmounts: [undefined],
      todayEpochDay: today,
      oracleReport,
      stabilityReport,
      _epsilonRequired: [['solver.planted', -1]],
    })
    expect('withheld' in out).toBe(true)
    if ('withheld' in out) {
      expect(out.withheld).toEqual([{ kind: 'epsilon-uncalibrated', name: 'solver.planted' }])
    }
  })

  it('a ZERO-case oracle report is refused at the mint (U14 fold) — reachable only by deliberate cast, still never green', () => {
    // runOptimalityOracle refuses an empty roster, so this report requires the documented
    // double-cast — the mint is the defense-in-depth backstop, loud even then.
    const emptyReport = { caseIds: [], pass: true } as unknown as OracleReport
    expect(() =>
      mintOracleToken({
        params: makeParams({ overlay: overlayFor('FL') }),
        candidateConversionAmounts: [undefined],
        todayEpochDay: today,
        oracleReport: emptyReport,
        stabilityReport,
      }),
    ).toThrow(/ZERO cases.*vacuous gate is theater/)
  })

  it('the derivation is LIVE, not a snapshot: two mints on the same inputs agree byte-for-byte', () => {
    const inputs = {
      params: makeParams({ overlay: overlayFor('FL') }),
      candidateConversionAmounts: [undefined] as const,
      todayEpochDay: today,
      oracleReport,
      stabilityReport,
    }
    const a = mintOracleToken(inputs)
    const b = mintOracleToken(inputs)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
