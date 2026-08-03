/**
 * U16 §S1 — the live solve anchor deriver (`solver/solveAnchor.ts`): the `SimulationParams →
 * ConversionAnchorContext → CandidateSet` path that was the recorded blocker (no shipped producer
 * derived the anchor from live params). These prove the year-0 committed skeleton + the income rails
 * are SOURCE-BOUND to the same shipped seams the engine's own year-0 iteration reads — the ONE LAW.
 *
 * Committed-income expectations are INDEPENDENT (DND 012): ages/claim-ages are chosen so SS, RMD, and
 * ongoing-taxable land on plainly-derivable values (a factor-1 claim, a pre-RMD age, no income). The
 * rail assertions are WIRING checks (anchor.rail === the shipped rail function's own output) — that the
 * anchor CALLS `cliffMagiFor`/`irmaa`/`selectRmdDivisor`, never a re-typed threshold.
 */
import { describe, expect, it } from 'vitest'
import { expandRothConversion, type SimulationParams } from '@shared/model'
import { deriveConversionAnchor, conversionWindowFor, enumerateSolveCandidates } from '../solveAnchor'
import { applyCandidate, sameDecumulationPlan, solverCandidateId } from '../candidates'
import { cliffMagiFor } from '@engine/magiLandscape'
import { fplForHousehold } from '@engine/healthOverlay'
import { acaApplicablePercentage, irmaa } from '@engine/constants'
import { selectRmdDivisor } from '@engine/rmd'

const MARKET = {
  stock: { mean: 0.04, stdDev: 0.12 },
  bond: { mean: 0.015, stdDev: 0.05 },
  inflation: { mean: 0.03, stdDev: 0.041 },
  stockBondCorrelation: 0,
  space: 'simple' as const,
  returnsAreReal: true,
}

/** A retired couple, startYear 2027 so the entered ages equal `startCalendarYear − birthYear`. */
function baseRetired(over?: {
  readonly people?: SimulationParams['people']
  readonly overlay?: Partial<NonNullable<SimulationParams['overlay']>>
}): SimulationParams {
  return {
    initialPortfolio: 900_000,
    annualSpendingReal: 70_000,
    stockWeight: 0.5,
    people: over?.people ?? [
      // Alex: 67, claims AT FRA-67 (born 1960 ⇒ FRA 67) ⇒ own factor 1 ⇒ ownAnnual = PIA exactly.
      { sex: 'female', currentAge: 67, birthYear: 1960, retirementAge: 65, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 67 },
      // Sam: 62, has NOT claimed (62 < 67) ⇒ contributes 0 own + 0 spousal-excess (gate not open).
      { sex: 'male', currentAge: 62, birthYear: 1965, retirementAge: 60, earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 67 },
    ],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    market: MARKET,
    paths: 256,
    maxHorizonYears: 40,
    longevityMode: 'sampled',
    overlay: {
      taxEnabled: true,
      rmdEnabled: true,
      startCalendarYear: 2027,
      buckets: { taxable: 200_000, pretax: 600_000, roth: 100_000 },
      pretaxByPerson: [600_000, 0],
      initialTaxableBasis: 150_000,
      filing: 'mfj',
      ...over?.overlay,
    },
  }
}

describe('deriveConversionAnchor — the year-0 committed skeleton (source-bound, DND 012)', () => {
  it('derives committed income from params: factor-1 SS, no RMD (pre-75), no income', () => {
    const anchor = deriveConversionAnchor(baseRetired())
    expect(anchor).not.toBeNull()
    if (anchor === null) throw new Error('unreachable')
    // Alex claimed at FRA-67 ⇒ ownAnnual = PIA = 30,000 exactly; Sam unclaimed ⇒ 0; Alex is the higher
    // earner ⇒ her own spousal excess is 0. Independent of the SS sub-engine's internals.
    expect(anchor.committed.ssBenefit).toBe(30_000)
    expect(anchor.committed.rmd).toBe(0) // 67 / 62 both below their birth-year RMD start age
    expect(anchor.rmdAtStart).toBe(0)
    expect(anchor.committed.ongoingTaxable).toBe(0) // no income streams
    expect(anchor.committed.conversion).toBe(0) // the baseline skeleton
    expect(anchor.committed.filing).toBe('mfj')
    expect(anchor.committed.count65).toBe(1) // Alex 67 ≥ 65; Sam 62 < 65
    expect(anchor.committed.calendarYear).toBe(2027)
    expect(anchor.pretaxAvailableAtStart).toBe(600_000) // overlay.buckets.pretax
  })

  it('returns null for a tax-blind spine (no overlay — nothing to sequence)', () => {
    const { overlay: _drop, ...spine } = baseRetired()
    void _drop
    expect(deriveConversionAnchor(spine as SimulationParams)).toBeNull()
  })

  it('RMD at year 0 is source-bound to @engine/rmd (past the start age ⇒ pool ÷ the shipped divisor)', () => {
    // Alex 79 (born 1948, RMD start 72), sole pre-tax holder; Sam 74. rmd = pretaxByPerson ÷ the SAME
    // divisor selector the engine uses (>10yr gap here is false ⇒ ULT) — a WIRING assertion.
    const base = baseRetired({
      people: [
        { sex: 'female', currentAge: 79, birthYear: 1948, retirementAge: 65, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 70 },
        { sex: 'male', currentAge: 74, birthYear: 1953, retirementAge: 63, earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 70 },
      ],
      overlay: { pretaxByPerson: [600_000, 0] },
    })
    const anchor = deriveConversionAnchor(base)!
    const expected = 600_000 / selectRmdDivisor(79, 74)
    expect(anchor.rmdAtStart).toBeCloseTo(expected, 6)
    expect(anchor.committed.rmd).toBeCloseTo(expected, 6)
  })
})

describe('deriveConversionAnchor — the income rails (the exact engine pricing predicates)', () => {
  it('ACA-cliff rail: active for a pre-65 member with a priced premium ⇒ cliffMagiFor(activeTable, fpl(2))', () => {
    const base = baseRetired({
      people: [
        { sex: 'female', currentAge: 60, birthYear: 1967, retirementAge: 58, earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 67 },
        { sex: 'male', currentAge: 62, birthYear: 1965, retirementAge: 60, earnedIncomeReal: 0, pia: 24_000, socialSecurityClaimAge: 67 },
      ],
      overlay: {
        healthcareEnabled: true,
        enrolledPremium: new Array<number>(40).fill(14_400),
        slcsp: new Array<number>(40).fill(13_200),
      },
    })
    const anchor = deriveConversionAnchor(base)!
    // Both pre-65, standard (non-enhanced) regime ⇒ the cliff exists; wired to the shipped rail.
    expect(anchor.acaCliffMagi).toBe(cliffMagiFor(acaApplicablePercentage.value, fplForHousehold(2)))
  })

  it('IRMAA rail: active (the shipped schedule) when someone is Medicare-enrolled at t + lookback', () => {
    // All-65+ Medicare household (healthcareEnabled, no ACA quote) ⇒ the IRMAA rail binds, no cliff rail.
    const base = baseRetired({ overlay: { healthcareEnabled: true } })
    const anchor = deriveConversionAnchor(base)!
    expect(anchor.irmaaSchedule).toBe(irmaa.value)
    expect(anchor.acaCliffMagi).toBeNull() // no enrolled premium / no pre-65 member
  })

  it('both rails null when healthcare is not priced (bracket-edge is still always enumerated)', () => {
    const anchor = deriveConversionAnchor(baseRetired())!
    expect(anchor.acaCliffMagi).toBeNull()
    expect(anchor.irmaaSchedule).toBeNull()
  })
})

describe('enumerateSolveCandidates — a valid live roster', () => {
  it('produces the conventional baseline + ≥1 anchored conversion + the user baseline', () => {
    const set = enumerateSolveCandidates(baseRetired())
    expect(set).not.toBeNull()
    if (set === null) throw new Error('unreachable')
    expect(set.candidates.some((c) => c.provenance === 'conventional-baseline')).toBe(true)
    expect(set.candidates.some((c) => c.conversion !== null)).toBe(true) // bracket-edge headroom exists
    expect(set.candidates.some((c) => c.provenance === 'user-baseline')).toBe(true)
  })

  // ── THE BASELINE ARM IS THE HOUSEHOLD'S OWN PLAN (the 2026-08-03 calm-but-wrong fix) ───────────
  //
  // The surface calls this arm "your plan today" in four shipped strings. Until this fix the injected
  // baseline was minted `conversion: null` unconditionally — there was no field in which a conversion
  // could even be expressed — so a household running the shipped Roth lever was measured against
  // their order with their conversion DELETED. These pin both halves of the repair, and the first is
  // the whole claim in one line: applying the baseline candidate must land back on the household's
  // own spine params, byte-for-byte.
  it("the user baseline REDUCES TO THE SPINE — applying it reproduces the household's own params exactly", () => {
    const plan = { annualAmountReal: 40_000, startYearOffset: 0, years: 5 }
    const base = baseRetired({ overlay: { conversions: expandRothConversion(plan, 40) } })
    const set = enumerateSolveCandidates(base, plan)
    if (set === null) throw new Error('unreachable')
    const user = set.candidates.find((c) => c.provenance === 'user-baseline')
    if (user === undefined) throw new Error('the user baseline is injected unconditionally')

    // (a) the plan RIDES the candidate — not `null`, and not a re-anchored grid amount.
    expect(user.conversion).toEqual(plan)
    // (b) …and it survives the shared apply seam as the household's own schedule. `toEqual(base)` is
    //     the load-bearing assertion: the arm on screen beside "your plan today" IS today's plan.
    //     (`drawdownPolicy` already matches; `applyCandidate` strips-then-re-expands the conversions.)
    expect(applyCandidate(base, user)).toEqual(base)
  })

  it('a household running NO conversion keeps the conversion-0 arm — absence, never a zero-fill', () => {
    const base = baseRetired()
    const set = enumerateSolveCandidates(base, undefined)
    if (set === null) throw new Error('unreachable')
    const user = set.candidates.find((c) => c.provenance === 'user-baseline')!
    expect(user.conversion).toBeNull()
    // Reduce-to-spine holds on this side too, and `conversions` is ABSENT rather than an all-zero
    // vector (the presence-keyed reduce-to-spine signal, model.ts's expander contract).
    const applied = applyCandidate(base, user)
    expect(applied).toEqual(base)
    expect('conversions' in applied.overlay!).toBe(false)
  })

  it('a plan entirely past the horizon is DROPPED — the same decision `intakeMap` makes, so no throw', () => {
    // `expandRothConversion` returns undefined for a window past the horizon, so `buildOverlay` writes
    // no `conversions` key at all. The seam must mirror that: carrying the plan here would hand
    // `applyCandidate` a conversion it refuses by contract (a loud throw on a live solve).
    const pastHorizon = { annualAmountReal: 40_000, startYearOffset: 40, years: 5 }
    expect(expandRothConversion(pastHorizon, 40)).toBeUndefined()
    const base = baseRetired() // no `conversions` on the overlay — exactly what buildOverlay produces
    const set = enumerateSolveCandidates(base, pastHorizon)
    if (set === null) throw new Error('unreachable')
    const user = set.candidates.find((c) => c.provenance === 'user-baseline')!
    expect(user.conversion).toBeNull()
    expect(() => applyCandidate(base, user)).not.toThrow()
  })

  it('the baseline arm is now IDENTIFIABLE by amount — the candidate id stops being always `:0`', () => {
    // `solverCandidateId` is `provenance:policy:amount`, and the run fingerprint serializes the
    // candidate's full fields. A converting baseline that still minted `:0` would collide in id with
    // the conversion-free arm it is no longer equivalent to.
    const plan = { annualAmountReal: 40_000, startYearOffset: 0, years: 5 }
    const base = baseRetired({ overlay: { conversions: expandRothConversion(plan, 40) } })
    const user = enumerateSolveCandidates(base, plan)!.candidates.find((c) => c.provenance === 'user-baseline')!
    expect(solverCandidateId(user)).toBe('baseline:proportional:40000')
    // …and it is NOT the same plan as its conversion-free twin (what `noChange` reads).
    const bare = enumerateSolveCandidates(baseRetired())!.candidates.find((c) => c.provenance === 'user-baseline')!
    expect(sameDecumulationPlan(user, bare)).toBe(false)
  })

  it('the pre-RMD conversion window: years = min runway to the first RMD start age, clamped ≥ 1', () => {
    // Alex 67 (RMD 75) ⇒ 8; Sam 62 (RMD 75) ⇒ 13 ⇒ min 8.
    expect(conversionWindowFor(baseRetired())).toEqual({ startYearOffset: 0, years: 8 })
    // A post-RMD household clamps to a 1-year window (still legal + headroom-filtered).
    const old = baseRetired({
      people: [
        { sex: 'female', currentAge: 79, birthYear: 1948, retirementAge: 65, earnedIncomeReal: 0, pia: 30_000, socialSecurityClaimAge: 70 },
        { sex: 'male', currentAge: 78, birthYear: 1949, retirementAge: 63, earnedIncomeReal: 0, pia: 20_000, socialSecurityClaimAge: 70 },
      ],
    })
    expect(conversionWindowFor(old)).toEqual({ startYearOffset: 0, years: 1 })
  })
})
