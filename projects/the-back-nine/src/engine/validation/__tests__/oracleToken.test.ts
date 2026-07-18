/**
 * U14 S0 — the oracle-token per-run clauses (the mint predicate's four legs).
 *
 * The flagship pair is the council's Attack-5 requirement: an NC household's token is BLOCKED
 * (state-certification-pending — ncRateSchedule's out-years wait on the ~Aug-2026 FY2025-26
 * certification) while an FL and a PA household MINT on the SAME build. Every clause also has
 * its pure-seam planted arms (insight 048): fail-closed on an unclassified directional entry,
 * the lying-mirror trend arm (fake-sourced entry + unmoved pricing mode still blocks), the
 * planted ε sentinel, and the NaN-injected today.
 */
import { describe, it, expect } from 'vitest'
import type { OverlayParams, PersonInputs, SimulationParams } from '@shared/model'
import { sourced, unsourced } from '@engine/constants/types'
import { acaEnhancedSubsidyStatus } from '@engine/constants'
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

describe('the pinning clause — NC-blocks / FL-mints on the SAME build (S0.2, Attack-5)', () => {
  it('an NC household is BLOCKED: state-certification-pending(NC) — the ~Aug-2026 certification', () => {
    const { blocking } = evaluatePinningClause(makeParams({ overlay: overlayFor('NC') }))
    expect(blocking).toContainEqual({ kind: 'state-certification-pending', state: 'NC' })
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

describe('the Medicare-cost-trend block (S0.4 — HARD solver-blocking, disclose-and-ship forbidden)', () => {
  it('LIVE: a conversion-bearing candidate set is blocked TODAY (the trend is a named, unvalued gap)', () => {
    expect(evaluateMedicareTrendClause(true)).toEqual({ kind: 'medicare-trend-unsourced' })
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
  const stabilityOut = runRankingStability({
    base: stochastic,
    candidates: stabilityCandidates,
    seedA: 0xa11ce,
    seedB: 0xb0b5eed,
    perturbIndex: 1,
    siblingIndex: 2,
  })
  if (!('report' in stabilityOut)) {
    throw new Error(`stability must pass to build the mint battery: ${(stabilityOut as { violations: readonly string[] }).violations.join(' | ')}`)
  }
  const stabilityReport = stabilityOut.report
  const today = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5

  it('an FL household MINTS on this build (conversion-free set — the trend block owns conversions today) with its provenance', () => {
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
    }
  })

  it('the SAME FL household with a conversion-bearing set is withheld for EXACTLY the trend block — no state reason (the NC contrast, both directions)', () => {
    const out = mintOracleToken({
      params: makeParams({ overlay: overlayFor('FL') }),
      candidateConversionAmounts: [undefined, 20_000],
      todayEpochDay: today,
      oracleReport,
      stabilityReport,
    })
    expect('withheld' in out).toBe(true)
    if ('withheld' in out) {
      expect(out.withheld).toEqual([{ kind: 'medicare-trend-unsourced' }])
    }
  })

  it('an NC household is WITHHELD on the SAME build with the SAME reports — state-certification-pending(NC)', () => {
    const out = mintOracleToken({
      params: makeParams({ overlay: overlayFor('NC') }),
      candidateConversionAmounts: [undefined, 20_000],
      todayEpochDay: today,
      oracleReport,
      stabilityReport,
    })
    expect('token' in out).toBe(false)
    if ('withheld' in out) {
      expect(out.withheld).toContainEqual({ kind: 'state-certification-pending', state: 'NC' })
      // The Medicare-trend block ALSO fires (the candidate set carries conversions and the
      // trend is a named, unvalued gap) — the withheld list names EVERY true reason.
      expect(out.withheld).toContainEqual({ kind: 'medicare-trend-unsourced' })
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

  it('the clause union: an NC + conversions + stale-ACA + priced-ACA run names ALL its reasons at once (the wiring pin)', () => {
    const params = makeParams({
      overlay: { ...overlayFor('NC'), healthcareEnabled: true, enrolledPremium: [12_000], slcsp: [12_000] },
    })
    const out = mintOracleToken({
      params,
      candidateConversionAmounts: [30_000],
      todayEpochDay: today + 400,
      oracleReport,
      stabilityReport,
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
