/**
 * dateSearch (C3) — the exhaustive, non-monotone-robust sweep over the household
 * date-offset `Y` → the confidence-graded fuck-off date(s).
 *
 * STRUCTURE: the DECISION RULE (`decideTrack`) is tested on CONSTRUCTED survival curves
 * (pure arithmetic — every expected crowning is hand-derived from §3c's rule, DND/012);
 * the TRANSFORM (`buildCandidateParams`) is tested by parameter inspection on the §3a
 * DIFFERENT-currentAge couple (the same-age fixture is BANNED as vacuous — a household-age
 * bug is invisible when ages coincide); the INTEGRATION tests (two-seed stability, the
 * Y == 0 same-dims golden, the sanity oracle) run the real engine at the pinned tiers.
 *
 * THE RULE UNDER TEST (§3c): per offset, the conservative one-sided lower confidence
 * bound `p̂ − z·SE` (z = 1.645), QUANTIZED to SURVIVAL_GRID, must clear `BANDS.onTrack`
 * AND keep clearing through the window top. Reading the LOWER BOUND is what stops a
 * lucky-noise offset from being crowned a false-earliest date — the "keeps holding" rule
 * alone rubber-stamps it (shared-CRN errors are positively correlated). The quantize-
 * then-compare is the HEADLINE's own reading (objective ≡ headline — the date is DEFINED
 * as "the earliest offset at which the headline reads on-track-or-better").
 */
import { describe, expect, it, vi } from 'vitest'
import {
  DATE_OFFSET_WINDOW_TOP,
  DATE_SEARCH_PATHS,
  DATE_SEARCH_Z,
  buildCandidateParams,
  decideTrack,
  runDateSearch,
  type DateSearchInput,
} from '@engine/dateSearch'
import { simulate } from '@engine/simulate'
import { BANDS, SURVIVAL_GRID, quantizeSurvival } from '@engine/confidence'
import { validationMarket } from '@engine/reference/methodology'
import type { OverlayParams, PersonInputs, SimulationParams } from '@shared/model'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** The §3a different-currentAge couple: 55 and 58, BOTH still working with DIFFERENT
 *  entered retirement ages (the per-person mapping must override the asymmetry for the
 *  projection, not silently retain it). */
const A55: PersonInputs = {
  sex: 'male', currentAge: 55, retirementAge: 60,
  earnedIncomeReal: 90_000, socialSecurityReal: 0, socialSecurityClaimAge: 70,
}
const B58: PersonInputs = {
  sex: 'female', currentAge: 58, retirementAge: 63,
  earnedIncomeReal: 70_000, socialSecurityReal: 0, socialSecurityClaimAge: 70,
}

/** Age-anchored entered schedules covering the couple's pre-65 sim-years (A's window can
 *  reach sim-year 9 at Y ≤ 9; B's reaches 6). Distinct per-year values so a time-SHIFT is
 *  distinguishable from a window-GATE. */
const ENTERED_ENROLLED = Array.from({ length: 12 }, (_, t) => 10_000 + 100 * t)
const ENTERED_SLCSP = Array.from({ length: 12 }, (_, t) => 9_000 + 100 * t)
const ENTERED_OOP = Array.from({ length: 12 }, (_, t) => 500 + 10 * t)

const coupleOverlay: OverlayParams = {
  taxEnabled: true,
  rmdEnabled: false,
  startCalendarYear: 2026,
  buckets: { taxable: 0, pretax: 1_000_000, roth: 0 },
  filing: 'mfj',
  healthcareEnabled: true,
  enrolledPremium: ENTERED_ENROLLED,
  slcsp: ENTERED_SLCSP,
  oopMedical: ENTERED_OOP,
}

const coupleParams: SimulationParams = {
  initialPortfolio: 1_000_000,
  annualSpendingReal: 60_000,
  stockWeight: 0.6,
  people: [A55, B58],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'pre-tax-first',
  market: validationMarket.value,
  paths: 2_000, // the entered headline count — the transform must override it with the tier pin
  maxHorizonYears: 40,
  longevityMode: 'fixed-horizon',
  overlay: coupleOverlay,
}

const coupleInput: DateSearchInput = {
  params: {
    ...coupleParams,
    overlay: {
      ...coupleOverlay,
      accumulation: {
        contributionsByPerson: [
          { pretax: Array.from({ length: 12 }, () => 20_000) },
          { pretax: Array.from({ length: 12 }, () => 15_000) },
        ],
      },
    },
  },
  workingYearIrmaaMagiByPerson: [90_000, 70_000],
}

/** Build a constructed curve for the decision-rule tests: offsets 0..top with the given
 *  survival fractions (everything else is derived by decideTrack itself). */
const curveOf = (fractions: readonly number[]) =>
  fractions.map((survivalFraction, offsetYears) => ({ offsetYears, survivalFraction }))

// Comfortable clear/fail values at 16k paths: 0.93's quantized lower bound is 0.92 (≥ .85);
// 0.50's is 0.49 (< .85). Hand-derived: SE(.93) = √(.93·.07/16000) ≈ 0.00202, z·SE ≈ 0.00332.
const HI = 0.93
const LO = 0.5
const FINAL = DATE_SEARCH_PATHS.final

// ---------------------------------------------------------------------------
// The decision rule (constructed curves — §3c)
// ---------------------------------------------------------------------------

describe('decideTrack — the quantized-lower-bound earliest-holds-and-keeps-holding rule (§3c)', () => {
  it('crowns the start of the longest clearing suffix (confirmed date below the top)', () => {
    const out = decideTrack(curveOf([LO, LO, LO, HI, HI, HI, HI, HI, HI, HI, HI]), FINAL)
    expect(out.kind).toBe('confirmed-date')
    if (out.kind !== 'confirmed-date') return
    expect(out.offsetYears).toBe(3)
    expect(out.nonMonotoneOffsets).toEqual([])
    expect(out.grade.quantizedLowerBound).toBeGreaterThanOrEqual(BANDS.onTrack)
    expect(out.grade.marginAboveBar).toBeCloseTo(out.grade.quantizedLowerBound - BANDS.onTrack, 12)
    // The point estimate is ALWAYS ≥ the bound — the disclosed conservative margin.
    expect(out.grade.survivalFraction).toBeGreaterThanOrEqual(out.grade.quantizedLowerBound)
  })

  it('NON-MONOTONE (the load-bearing test, insight 013): a dip after an early clear moves the date PAST the dip — never the false-earliest', () => {
    // Clears at 3,4 — dips at 5 (the ACA-cliff signature) — clears 6..10. A bisection
    // assuming "later = safer" would return 3; the §3c rule returns 6 and DISCLOSES [3,4].
    const out = decideTrack(curveOf([LO, LO, LO, HI, HI, LO, HI, HI, HI, HI, HI]), FINAL)
    expect(out.kind).toBe('confirmed-date')
    if (out.kind !== 'confirmed-date') return
    expect(out.offsetYears).toBe(6)
    expect(out.nonMonotoneOffsets).toEqual([3, 4])
  })

  it('SELECTION BIAS (§3c): a point estimate that clears by luck is NOT crowned when its lower bound fails', () => {
    // p̂ = 0.847 at 16k: quantize(p̂) = 0.85 ≥ bar (a point-estimate rule would crown it),
    // but the lower bound 0.847 − 1.645·√(.847·.153/16000) ≈ 0.84232 quantizes to 0.84 —
    // FAILS. Hand-derived (DND/012). The search must report the LATER offset.
    const lucky = 0.847
    const se = Math.sqrt((lucky * (1 - lucky)) / FINAL)
    expect(quantizeSurvival(lucky)).toBeGreaterThanOrEqual(BANDS.onTrack) // the lure is real
    expect(quantizeSurvival(lucky - DATE_SEARCH_Z * se)).toBeLessThan(BANDS.onTrack) // the haircut rejects it
    const out = decideTrack(curveOf([LO, LO, LO, LO, lucky, HI, HI, HI, HI, HI, HI]), FINAL)
    expect(out.kind).toBe('confirmed-date')
    if (out.kind !== 'confirmed-date') return
    expect(out.offsetYears).toBe(5)
    // Offset 4 never CLEARED under the rule, so it is NOT a non-monotone disclosure.
    expect(out.nonMonotoneOffsets).toEqual([])
  })

  it('WINDOW-EDGE arm (a): only the top clears → the date carries the unconfirmed-tail variant, never a silent crown, never no-date', () => {
    const fractions = Array.from({ length: 11 }, (_, y) => (y === 10 ? HI : LO))
    const out = decideTrack(curveOf(fractions), FINAL)
    expect(out.kind).toBe('window-edge-unconfirmed')
    if (out.kind !== 'window-edge-unconfirmed') return
    expect(out.offsetYears).toBe(10)
    expect(out.nonMonotoneOffsets).toEqual([])
  })

  it('WINDOW-EDGE arm (b): clears-dips-recovers-only-at-top carries BOTH disclosures (the §3c two-arm contract)', () => {
    // Y=8 clears, Y=9 fails (the cliff), Y=10 clears: the candidate IS the top — window-edge
    // (zero later evidence) AND the non-monotone disclosure for the cleared-then-dipped 8.
    const fractions = [LO, LO, LO, LO, LO, LO, LO, LO, HI, LO, HI]
    const out = decideTrack(curveOf(fractions), FINAL)
    expect(out.kind).toBe('window-edge-unconfirmed')
    if (out.kind !== 'window-edge-unconfirmed') return
    expect(out.offsetYears).toBe(10)
    expect(out.nonMonotoneOffsets).toEqual([8])
  })

  it('NO-DATE outcome 3: nothing clears → first-class no-date with the full curve (never the window-top offset, never a crash)', () => {
    const out = decideTrack(curveOf(Array.from({ length: 11 }, () => LO)), FINAL)
    expect(out.kind).toBe('no-date-in-window')
    if (out.kind !== 'no-date-in-window') return
    expect(out.curve).toHaveLength(11)
    expect(out.nonMonotoneOffsets).toEqual([])
  })

  it('NO-DATE, dip-never-recovers: an early clear that fails through the top is no-date + the non-monotone disclosure', () => {
    const out = decideTrack(curveOf([LO, LO, HI, HI, HI, HI, LO, LO, LO, LO, LO]), FINAL)
    expect(out.kind).toBe('no-date-in-window')
    if (out.kind !== 'no-date-in-window') return
    expect(out.nonMonotoneOffsets).toEqual([2, 3, 4, 5])
  })

  it('the WINDOW FLOOR (over-funded): everything clears → CONFIRMED at Y=0 ("work-optional AT today"), maximal evidence, no extra disclosure', () => {
    const out = decideTrack(curveOf(Array.from({ length: 11 }, () => HI)), FINAL)
    expect(out.kind).toBe('confirmed-date')
    if (out.kind !== 'confirmed-date') return
    expect(out.offsetYears).toBe(0)
    expect(out.nonMonotoneOffsets).toEqual([])
  })

  it('every reading carries the per-offset clear/fail vector the disclosure surfaces', () => {
    const out = decideTrack(curveOf([LO, HI, LO, HI, HI, HI, HI, HI, HI, HI, HI]), FINAL)
    expect(out.curve.map((r) => r.clears)).toEqual([
      false, true, false, true, true, true, true, true, true, true, true,
    ])
    expect(out.kind).toBe('confirmed-date')
    if (out.kind === 'confirmed-date') expect(out.nonMonotoneOffsets).toEqual([1])
  })
})

describe('the DESIGNED tolerance (§3c — pinned, not vibed)', () => {
  it('at the pinned 16k paths, z·SE at the bar is ≤ ½·SURVIVAL_GRID (a paths regression below the tolerance fails loud)', () => {
    const p = BANDS.onTrack
    const se = Math.sqrt((p * (1 - p)) / DATE_SEARCH_PATHS.final)
    expect(DATE_SEARCH_Z * se).toBeLessThanOrEqual(SURVIVAL_GRID / 2)
  })

  it('the provisional tier is the DESIGNED exemption (its coarser haircut errs later/conservative, never crowned as final)', () => {
    // 2000 paths: z·SE ≈ 1.3 grid quanta — documented as the provisional posture, NOT a
    // tolerance regression (the final-crown tier is where the assertion is load-bearing).
    const p = BANDS.onTrack
    const se = Math.sqrt((p * (1 - p)) / DATE_SEARCH_PATHS.provisional)
    expect(DATE_SEARCH_Z * se).toBeGreaterThan(SURVIVAL_GRID / 2)
  })

  it('the bar is READ from BANDS.onTrack (objective ≡ headline) — and the rule is the headline’s own quantize-then-compare', () => {
    // quantize(x) ≥ 0.85 ⇔ x ≥ 0.845 — the same round-half-up reading the headline gives a
    // raw survival fraction (insight 012 nuance: round-quantization to the threshold's own
    // grid shifts the effective edge half a cell DOWN; that is the HEADLINE's documented
    // behavior, and the date is DEFINED as the headline reading of the lower bound).
    expect(quantizeSurvival(0.845)).toBeGreaterThanOrEqual(BANDS.onTrack)
    expect(quantizeSurvival(0.8449)).toBeLessThan(BANDS.onTrack)
  })
})

// ---------------------------------------------------------------------------
// buildCandidateParams(Y) — the §0/§3a transform (parameter inspection, no sims)
// ---------------------------------------------------------------------------

describe('buildCandidateParams(Y) — the single owner of per-candidate construction (§0/§3a)', () => {
  it('BOUNDARY COINCIDENCE on the different-currentAge couple: retire offsets, contribution stop, premium window, and OOP window all land at Y', () => {
    for (let y = 0; y <= DATE_OFFSET_WINDOW_TOP; y++) {
      const c = buildCandidateParams(coupleInput, y, DATE_SEARCH_PATHS.final)
      // (1) Every still-working person's retire offset == Y EXACTLY — for BOTH ages (the
      // entered 60/63 asymmetry is overridden for the projection, not retained).
      for (const p of c.people) {
        expect(p.retirementAge - p.currentAge).toBe(y)
      }
      // SS claim ages held AS ENTERED (claim is not searched).
      expect(c.people.map((p) => p.socialSecurityClaimAge)).toEqual([70, 70])
      const o = c.overlay
      expect(o).toBeDefined()
      if (o === undefined) continue
      // (2) Contribution streams truncated to [0, Y) — a stop one year late fails here.
      for (const pc of o.accumulation?.contributionsByPerson ?? []) {
        expect((pc.pretax ?? []).length).toBeLessThanOrEqual(y)
      }
      // (3) The healthcare window opens AT Y: explicit 0 in every working year, the ENTERED
      // value (never time-shifted) from Y — a premium starting a year early fails here.
      for (let t = 0; t < ENTERED_ENROLLED.length; t++) {
        const expected = t < y ? 0 : ENTERED_ENROLLED[t]
        expect(o.enrolledPremium?.[t]).toBe(expected)
        expect(o.slcsp?.[t]).toBe(t < y ? 0 : ENTERED_SLCSP[t])
        // (4) The OOP window is the SAME gate (the §6 sibling: no working year carries a
        // nonzero HSA-qualified spend).
        expect(o.oopMedical?.[t]).toBe(t < y ? 0 : ENTERED_OOP[t])
      }
      // The per-person Medicare onset: max(65 − currentAge, Y) — people-aligned.
      expect(o.medicareOnsetSimYear).toEqual([Math.max(10, y), Math.max(7, y)])
      // The working-year override covers exactly [0, Y).
      expect((o.irmaaMagiOverride ?? []).length).toBe(y)
      // Healthcare is FORCED on for the date route (a silently healthcare-blind date is
      // never an open path — D1's decided posture).
      expect(o.healthcareEnabled).toBe(true)
      // The tier pin replaces the entered paths.
      expect(c.paths).toBe(DATE_SEARCH_PATHS.final)
    }
  })

  it('AGE-ANCHORED values: two candidates price the same absolute sim-year identically in their overlapping retired windows', () => {
    const c2 = buildCandidateParams(coupleInput, 2, DATE_SEARCH_PATHS.final)
    const c4 = buildCandidateParams(coupleInput, 4, DATE_SEARCH_PATHS.final)
    expect(c2.overlay?.enrolledPremium?.[5]).toBe(ENTERED_ENROLLED[5])
    expect(c4.overlay?.enrolledPremium?.[5]).toBe(ENTERED_ENROLLED[5])
  })

  it('an ALREADY-RETIRED member keeps their entered retirementAge VERBATIM (never un-retired into phantom income)', () => {
    const retired62: PersonInputs = { ...B58, currentAge: 62, retirementAge: 60, earnedIncomeReal: 80_000 }
    const input: DateSearchInput = {
      params: { ...coupleParams, people: [A55, retired62] },
      workingYearIrmaaMagiByPerson: [90_000, 0],
    }
    const c = buildCandidateParams(input, 6, DATE_SEARCH_PATHS.final)
    expect(c.people[0]?.retirementAge).toBe(55 + 6) // still-working → currentAge + Y
    expect(c.people[1]?.retirementAge).toBe(60) // already-retired → verbatim (offset stays ≤ 0)
  })

  it('the transform is PURE per candidate: the original input params are never mutated across the sweep', () => {
    const before = JSON.stringify(coupleInput.params)
    buildCandidateParams(coupleInput, 3, DATE_SEARCH_PATHS.final)
    buildCandidateParams(coupleInput, 7, DATE_SEARCH_PATHS.final)
    expect(JSON.stringify(coupleInput.params)).toBe(before)
  })

  it('a household with NO entered contributions still gets the construct (presence keys the §7 clamp — the date route lives on salary)', () => {
    const input: DateSearchInput = { params: coupleParams, workingYearIrmaaMagiByPerson: [90_000, 70_000] }
    const c = buildCandidateParams(input, 4, DATE_SEARCH_PATHS.final)
    expect(c.overlay?.accumulation).toBeDefined()
  })

  it('the IRMAA seed is Y-INVARIANT (pre-sim actual returns no candidate can move)', () => {
    const withSeed: DateSearchInput = {
      params: { ...coupleParams, overlay: { ...coupleOverlay, irmaaMagiSeed: [61_000, 62_000] } },
      workingYearIrmaaMagiByPerson: [90_000, 70_000],
    }
    for (const y of [0, 5, 10]) {
      expect(buildCandidateParams(withSeed, y, DATE_SEARCH_PATHS.final).overlay?.irmaaMagiSeed).toEqual([61_000, 62_000])
    }
  })
})

// ---------------------------------------------------------------------------
// runDateSearch — the sweep grammar (rejections, cancellation, outcomes)
// ---------------------------------------------------------------------------

describe('runDateSearch — the sweep grammar', () => {
  it('an ALL-RETIRED household is rejected at the ENGINE layer with ZERO candidate runs (§0 — the offset axis is undefined)', async () => {
    const retiredA: PersonInputs = { ...A55, currentAge: 66, retirementAge: 65 }
    const retiredB: PersonInputs = { ...B58, currentAge: 64, retirementAge: 64 }
    const spy = vi.fn(async () => true)
    const out = await runDateSearch(
      { params: { ...coupleParams, people: [retiredA, retiredB] } },
      1,
      { tier: 'provisional', shouldContinue: spy },
    )
    expect(out.kind).toBe('input-failure')
    if (out.kind === 'input-failure') expect(out.reason).toMatch(/retired/i)
    expect(spy).not.toHaveBeenCalled() // never a candidate run, never a Y == 0 crown
  })

  it('the date route REQUIRES the tax overlay (a tax-blind date is the superseded on-ramp — never silently computed)', async () => {
    const { overlay: _drop, ...noOverlay } = coupleParams
    const out = await runDateSearch({ params: noOverlay }, 1, { tier: 'provisional' })
    expect(out.kind).toBe('input-failure')
    if (out.kind === 'input-failure') expect(out.reason).toMatch(/tax/i)
  })

  it('ALL-OR-NOTHING (the §3 rejection policy): one rejecting candidate fails the RUN, naming the offending input — never a crown from the survivors', async () => {
    // A still-working 66yo with NO irmaaMagiSeed: candidates Y = 0/1 need seed[0..1] (their
    // onset is Y), Y ≥ 2 do not — dropping the rejecting candidates would crown a false
    // "confirmed earliest" from the surviving offsets.
    const working66: PersonInputs = { ...A55, currentAge: 66, retirementAge: 69 }
    const spy = vi.fn(async () => true)
    const out = await runDateSearch(
      {
        params: { ...coupleParams, people: [working66], overlay: { ...coupleOverlay, enrolledPremium: undefined, slcsp: undefined, oopMedical: undefined } },
        workingYearIrmaaMagiByPerson: [120_000],
      },
      1,
      { tier: 'provisional', shouldContinue: spy },
    )
    expect(out.kind).toBe('input-failure')
    if (out.kind === 'input-failure') {
      expect(out.reason).toContain('irmaaMagiSeed')
      expect(out.reason).toMatch(/Y\s*=\s*0/i) // names the offending candidate
    }
    expect(spy).not.toHaveBeenCalled() // up-front validation — zero 16k-path runs dispatched
  })

  it('COOPERATIVE CANCELLATION: a false shouldContinue stops the sweep — no further candidate dispatched, the run reports cancelled', async () => {
    const working66: PersonInputs = { ...A55, currentAge: 66, retirementAge: 69 }
    let calls = 0
    const stopAfter3 = async (): Promise<boolean> => ++calls <= 3
    const out = await runDateSearch(
      {
        params: {
          ...coupleParams,
          maxHorizonYears: 13,
          people: [working66],
          overlay: { ...coupleOverlay, enrolledPremium: undefined, slcsp: undefined, oopMedical: undefined, irmaaMagiSeed: [60_000, 60_000] },
        },
        workingYearIrmaaMagiByPerson: [120_000],
      },
      1,
      { tier: 'provisional', shouldContinue: stopAfter3 },
    )
    expect(out.kind).toBe('cancelled')
    expect(calls).toBe(4) // 3 candidates ran; the 4th gate refused — nothing date-shaped escaped
  })
})

// ---------------------------------------------------------------------------
// Integration at the pinned tiers (real sims)
// ---------------------------------------------------------------------------

describe('runDateSearch — integration (the pinned-tier engine runs)', () => {
  // A still-working 66yo single: all candidate ACA windows are EMPTY (65 − 66 < 0 ⇒ no
  // pre-65 retired year), so no ACA coverage is owed — the all-65⁺ exception. IRMAA prices
  // from onset = Y. Seed covers Y ≤ 1; the override (built from the entered working-year
  // figure) covers the bridge years arm (b) demands. Fixed-horizon (no longevity sampling)
  // keeps the curve a pure market statistic.
  const working66: PersonInputs = { ...A55, currentAge: 66, retirementAge: 69, earnedIncomeReal: 90_000 }
  const sweepInput = (spend: number, contributions: number): DateSearchInput => ({
    params: {
      ...coupleParams,
      initialPortfolio: 600_000,
      annualSpendingReal: spend,
      maxHorizonYears: 16,
      people: [working66],
      overlay: {
        ...coupleOverlay,
        buckets: { taxable: 0, pretax: 600_000, roth: 0 },
        enrolledPremium: undefined,
        slcsp: undefined,
        oopMedical: undefined,
        irmaaMagiSeed: [60_000, 60_000],
        accumulation: { contributionsByPerson: [{ pretax: Array.from({ length: 12 }, () => contributions) }] },
      },
    },
    workingYearIrmaaMagiByPerson: [120_000],
  })

  it('TWO-SEED STABILITY (§3c): two independent seeds crown the IDENTICAL date with IDENTICAL per-offset clear/fail vectors (knife-edge-free fixture)', { timeout: 120_000 }, async () => {
    const input = sweepInput(55_000, 30_000)
    const a = await runDateSearch(input, 12345, { tier: 'final' })
    const b = await runDateSearch(input, 98765, { tier: 'final' })
    expect(a.kind).toBe('dates')
    expect(b.kind).toBe('dates')
    if (a.kind !== 'dates' || b.kind !== 'dates') return
    // The designed companion assertion FIRST: both seeds produce the identical per-offset
    // clear/fail vector (date-equality as a designed consequence, never luck).
    const vec = (o: typeof a) =>
      o.kind === 'dates' ? o.floor.curve.map((r) => r.clears) : []
    expect(vec(a)).toEqual(vec(b))
    // Then plain DATE-equality (same outcome kind, same offset).
    expect(b.floor.kind).toBe(a.floor.kind)
    if (a.floor.kind !== 'no-date-in-window' && b.floor.kind !== 'no-date-in-window') {
      expect(b.floor.offsetYears).toBe(a.floor.offsetYears)
    }
    // The v1 degenerate budget: the two tracks coincide (rendered as one date).
    expect(a.lifestyle).toEqual(a.floor)
    expect(a.tier).toBe('final')
    expect(a.windowTopYears).toBe(DATE_OFFSET_WINDOW_TOP)
  })

  it('the INTUITIVE-DIRECTION sanity oracle (cliff-free fixture): more saved / lower spend ⇒ an EARLIER-OR-EQUAL date', { timeout: 60_000 }, async () => {
    const offsetOf = async (spend: number, contributions: number): Promise<number> => {
      const out = await runDateSearch(sweepInput(spend, contributions), 777, { tier: 'provisional' })
      expect(out.kind).toBe('dates')
      if (out.kind !== 'dates') return Number.POSITIVE_INFINITY
      const f = out.floor
      // The oracle fixture is built to produce a date in-window at every arm.
      expect(f.kind).not.toBe('no-date-in-window')
      return f.kind === 'no-date-in-window' ? Number.POSITIVE_INFINITY : f.offsetYears
    }
    const base = await offsetOf(55_000, 30_000)
    expect(await offsetOf(55_000, 45_000)).toBeLessThanOrEqual(base) // more saved
    expect(await offsetOf(48_000, 30_000)).toBeLessThanOrEqual(base) // lower spend
  })

  it('the Y == 0 SAME-DIMS byte-identity golden: a Y = 0 candidate equals the construct-absent twin at the same 16k paths (§1)', { timeout: 60_000 }, () => {
    const input = sweepInput(55_000, 30_000)
    const candidate = buildCandidateParams(input, 0, DATE_SEARCH_PATHS.final)
    // The twin: the SAME candidate params minus the accumulation construct (Y = 0 has no
    // working years — nothing clamped, no inflow years — so presence is inert, §1).
    const { accumulation: _drop, ...overlayRest } = candidate.overlay!
    const twin: SimulationParams = { ...candidate, overlay: overlayRest }
    const a = simulate(candidate, 4242)
    const b = simulate(twin, 4242)
    expect(a.indeterminate).toBe(false)
    expect(a).toEqual(b)
  })
})
