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
  workingYearTaxReach,
  workingYearTaxReachOfRun,
  type DateSearchInput,
} from '@engine/dateSearch'
import { cashTermsForYear, personOffsetsFor, simulate, validateParams, type SimResolved } from '@engine/simulate'
import { dateSearchFromWire } from '@engine/engineWire'
import { BANDS, SURVIVAL_GRID, quantizeSurvival } from '@engine/confidence'
import { validationMarket } from '@engine/reference/methodology'
import type { IncomeParams, OverlayParams, PersonContributionStreams, PersonInputs, SimulationParams } from '@shared/model'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** The §3a different-currentAge couple: 55 and 58, BOTH still working with DIFFERENT
 *  entered retirement ages (the per-person mapping must override the asymmetry for the
 *  projection, not silently retain it). */
const A55: PersonInputs = {
  sex: 'male', currentAge: 55, birthYear: 1971, retirementAge: 60,
  earnedIncomeReal: 90_000, pia: 0, socialSecurityClaimAge: 70,
}
const B58: PersonInputs = {
  sex: 'female', currentAge: 58, birthYear: 1968, retirementAge: 63,
  earnedIncomeReal: 70_000, pia: 0, socialSecurityClaimAge: 70,
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

  it('rejects a NON-DENSE offset axis loudly — a gap/re-base/non-integer would let an UNEVALUATED dip crown a falsely-early date', () => {
    // The rule's honesty argument ("clears AND keeps clearing through the top") requires
    // every intermediate offset to have been EVALUATED; a gapped curve could skip the exact
    // ACA-cliff dip the rule exists to catch (insight 013). The guard also closes the
    // index↔offset mutation class by CONTRACT (offsetYears === index ⇒ confusion harmless,
    // insight 015) — every fixture above is dense by construction and could not discriminate it.
    const gapped = [
      { offsetYears: 0, survivalFraction: HI },
      { offsetYears: 2, survivalFraction: HI }, // offset 1 unevaluated
    ]
    expect(() => decideTrack(gapped, FINAL)).toThrow(/dense contiguous/i)
    const reBased = curveOf(Array.from({ length: 11 }, () => HI)).map((c) => ({
      ...c,
      offsetYears: c.offsetYears + 1, // starts at 1, not 0
    }))
    expect(() => decideTrack(reBased, FINAL)).toThrow(/dense contiguous/i)
    expect(() => decideTrack([{ offsetYears: 0.5, survivalFraction: HI }], FINAL)).toThrow(/dense contiguous/i)
    expect(() => decideTrack([{ offsetYears: Number.NaN, survivalFraction: HI }], FINAL)).toThrow(/dense contiguous/i)
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

  it('R40 · KTD-8a — the ONGOING INCOME is Y-INVARIANT: it passes through UN-truncated, identical for every Y (a pension is received the same whatever date you stop)', () => {
    // The discriminating pin: contributions are truncated to [0, Y) (tested above), but income must
    // NOT be — it flows through `...overlayBase` un-truncated. A mutant that truncated income the
    // way contributions are truncated would zero a retiree's pension over [0, Y), un-modeling income
    // they actually receive (the calm-but-wrong direction). Distinct per-year values so a truncation
    // (zeros in [0, Y)) is distinguishable from the identical passthrough.
    const incomeVec = Array.from({ length: 12 }, (_, t) => 30_000 + 100 * t)
    const income: IncomeParams = { incomeByPerson: [{ grossFull: incomeVec, taxableFull: incomeVec }, {}] }
    const withIncome: DateSearchInput = {
      params: { ...coupleParams, overlay: { ...coupleOverlay, income } },
      workingYearIrmaaMagiByPerson: [90_000, 70_000],
    }
    for (const y of [0, 4, 10]) {
      const c = buildCandidateParams(withIncome, y, DATE_SEARCH_PATHS.final)
      // Byte-identical vector at every Y — no window-gate, no time-shift.
      expect(c.overlay?.income?.incomeByPerson[0]?.grossFull).toEqual(incomeVec)
      expect(c.overlay?.income?.incomeByPerson[0]?.taxableFull).toEqual(incomeVec)
      expect(c.overlay?.income?.incomeByPerson[1]).toEqual({}) // owner 1's empty leaf passes through too
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

  it('a non-integer seed is the DEFINED input failure (the persisted bit-identical-reproduction contract, DND/009)', async () => {
    // A NaN seed would run the engine on `seed|0 = 0` while persisting null — the saved plan
    // could not even reproduce what produced it. NaN-first, before any candidate work.
    const nan = await runDateSearch({ params: coupleParams }, Number.NaN, { tier: 'provisional' })
    expect(nan.kind).toBe('input-failure')
    if (nan.kind === 'input-failure') expect(nan.reason).toContain('seed')
    const frac = await runDateSearch({ params: coupleParams }, 1.5, { tier: 'provisional' })
    expect(frac.kind).toBe('input-failure')
  })

  it('the horizon-guard boundary: maxHorizon == windowTop rejects; windowTop + 1 is ACCEPTED (the disclosed shallow-window residual)', { timeout: 60_000 }, async () => {
    const working66: PersonInputs = { ...A55, currentAge: 66, retirementAge: 69 }
    const base = (maxHorizonYears: number): DateSearchInput => ({
      params: {
        ...coupleParams,
        maxHorizonYears,
        people: [working66],
        overlay: {
          ...coupleOverlay,
          enrolledPremium: undefined,
          slcsp: undefined,
          oopMedical: undefined,
          irmaaMagiSeed: [60_000, 60_000],
        },
      },
      workingYearIrmaaMagiByPerson: [120_000],
    })
    const rejected = await runDateSearch(base(DATE_OFFSET_WINDOW_TOP), 1, { tier: 'provisional' })
    expect(rejected.kind).toBe('input-failure')
    if (rejected.kind === 'input-failure') expect(rejected.reason).toContain('window top')
    // windowTop + 1 passes — the Y = top candidate then grades on a SINGLE retirement year
    // (survival structurally near 1, the optimistic direction). Accepted + documented at the
    // guard: the principled core is non-emptiness, any larger minimum would be vibed, and a
    // real horizon is longevity-derived (30–50yr) — D1's input shaping owns a user-facing floor.
    const accepted = await runDateSearch(base(DATE_OFFSET_WINDOW_TOP + 1), 1, { tier: 'provisional' })
    expect(accepted.kind).toBe('dates')
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

  it('the Y == 0 golden under SAMPLED longevity (the couple): presence stays inert across IN-WINDOW deaths', { timeout: 120_000 }, () => {
    // The fixed-horizon golden above never reaches the per-path death branches — precisely
    // where the onset machinery and the per-path guards run their death arms (the 2→1 living
    // shrink). This sibling pins the SAME presence-inertness with sampled deaths live, so a
    // future regression in the death-path guards cannot slip through the one reduce-to-spine
    // surface that was previously asserted only death-free (C3 boundary review).
    const candidate = buildCandidateParams(coupleInput, 0, DATE_SEARCH_PATHS.final)
    const sampled: SimulationParams = { ...candidate, longevityMode: 'sampled' }
    const { accumulation: _drop, ...overlayRest } = sampled.overlay!
    const twin: SimulationParams = { ...sampled, overlay: overlayRest }
    const a = simulate(sampled, 4242)
    expect(a.indeterminate).toBe(false)
    expect(a).toEqual(simulate(twin, 4242))
  })
})

// ---------------------------------------------------------------------------
// The D2 crowned band fan (slice 2): the crowned candidate's projection fan, emitted
// ONCE at the decided offset and riding the 'dates' outcome to the band.
// ---------------------------------------------------------------------------

describe('runDateSearch — the D2 crowned band fan', () => {
  // Reuse the integration fixture's still-working 66yo single that crowns a date in-window
  // (the sanity oracle proves sweepInput(55k, 30k) crowns at the provisional tier).
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

  it('CRN-IDENTITY (the load-bearing test): a crowned date emits the crowned candidate\'s OWN fan — never a second, drifting picture', { timeout: 60_000 }, async () => {
    const input = sweepInput(55_000, 30_000)
    const seed = 12345
    const out = await runDateSearch(input, seed, { tier: 'provisional' })
    expect(out.kind).toBe('dates')
    if (out.kind !== 'dates') return
    expect(out.floor.kind).not.toBe('no-date-in-window')
    if (out.floor.kind === 'no-date-in-window') return

    // The band is present and well-formed (the today anchor + ≥ 1 year).
    expect(out.band).toBeDefined()
    const fan = out.band!.fan
    expect(fan.byYear.length).toBeGreaterThan(1)
    expect(fan.byYear[0]!.yearsFromNow).toBe(0)
    // The engine's tag for the band: a crowned date is on-track-or-better by construction (its
    // quantized lower bound cleared the bar), so the band never carries a fail state.
    expect(['on-track', 'over-funded']).toContain(out.band!.outcomeState)
    // The band is SELF-DESCRIBING: it carries its OWN crowned offset (the work-stops inflection),
    // equal to the crowned track's offset — the UI reads this, never re-derives it from floor.
    expect(out.band!.offsetYears).toBe(out.floor.offsetYears)

    // DND/009: every fan value is a FINITE number (the $0 ruin floor reads as a real 0, never an
    // Infinity/NaN that JSON.stringify/IndexedDB would silently null at the U8 persist seam).
    for (const yr of fan.byYear) {
      for (const v of [yr.p10, yr.p25, yr.p50, yr.p75, yr.p90, yr.cohortFraction]) {
        expect(Number.isFinite(v)).toBe(true)
      }
    }

    // THE CLAIM: the emitted fan is byte-identical to a STANDALONE fan-on re-run of the crowned
    // candidate at the same seed/tier — the band observes the very distribution that crowned the
    // date (CRN), proving the RIGHT candidate (out.floor.offsetYears) was projected.
    const crowned = buildCandidateParams(input, out.floor.offsetYears, DATE_SEARCH_PATHS.provisional)
    const standalone = simulate(crowned, seed, { bandFan: true })
    expect(standalone.indeterminate).toBe(false)
    if (standalone.indeterminate || standalone.infeasible) return
    expect(out.band!.fan).toEqual(standalone.distribution.bandFan)

    // It SURVIVES a real structured clone — the worker postMessage semantics, DND/009-clean (no
    // Infinity/NaN/Map/function/class anywhere on the outcome, band included), not just a passthrough.
    expect(structuredClone(out)).toEqual(out)
    // And rides the date wire unchanged (structured clone — the whole outcome, no field mapping).
    const round = dateSearchFromWire({ kind: 'date-search', outcome: out })
    expect(round.ok).toBe(true)
    if (!round.ok || round.outcome.kind !== 'dates') return
    expect(round.outcome.band).toEqual(out.band)
  })

  it('REDUCE-TO-SPINE for the shipped date config: the crowned candidate is byte-identical fan-OFF vs fan-ON', { timeout: 60_000 }, () => {
    // { timeout }: two full provisional-tier simulate() runs over the REAL date-candidate overlay
    // (healthcare + accumulation) sit right at vitest's 5000ms default on CI hardware — this test
    // ran 5.7s on ubuntu-latest and timed out there while passing locally (caught 2026-07-08; the
    // file's other full-sweep tests already carry explicit timeouts for exactly this reason).
    // The band's honesty ("it observes the very distribution that crowned the date") rests on the
    // fan-ON re-run matching the fan-OFF sweep run decideTrack crowned on. The CRN-identity test above
    // is fan-ON vs fan-ON (repeatability); THIS proves the fan only OBSERVES — on the ACTUAL date-
    // candidate overlay shape (healthcare + accumulation + irmaaMagiOverride forced on), the shape the
    // thin spine `bandFan.test.ts` overlay arm never exercises.
    const crowned = buildCandidateParams(coupleInput, 3, DATE_SEARCH_PATHS.provisional)
    expect(crowned.overlay?.healthcareEnabled).toBe(true) // the date config really has the forced overlay
    expect(crowned.overlay?.accumulation).toBeDefined()
    const off = simulate(crowned, 12345)
    const on = simulate(crowned, 12345, { bandFan: true })
    if (off.indeterminate || off.infeasible || on.indeterminate || on.infeasible) {
      throw new Error('the crowned candidate must simulate cleanly under both fan flags')
    }
    expect(on.distribution.survivalFraction).toBe(off.distribution.survivalFraction)
    expect(on.distribution.terminalValuesReal).toEqual(off.distribution.terminalValuesReal)
    expect(on.distribution.depletionYears).toEqual(off.distribution.depletionYears)
  })

  it('a NO-DATE run carries NO fan (no offset to project — the no-date surface shows no band)', { timeout: 60_000 }, async () => {
    // Spend ≫ portfolio: the household depletes even while working (90k income vs 500k spend on a
    // 600k portfolio), so every offset fails ⇒ no-date-in-window ⇒ no crowned candidate to project.
    const out = await runDateSearch(sweepInput(500_000, 0), 12345, { tier: 'provisional' })
    expect(out.kind).toBe('dates')
    if (out.kind !== 'dates') return
    expect(out.floor.kind).toBe('no-date-in-window')
    expect(out.band).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// The working-year tax floor's exposure read (2026-10-20 — the plan's U5, KTD8): which households the
// ledger's v12 row may tell "we've changed how this tool works out your taxes"
// ---------------------------------------------------------------------------

describe('workingYearTaxReach — can the working-year tax floor move this household? (U5, KTD8)', () => {
  const HORIZON = 50
  const ZEROS = Array.from({ length: HORIZON }, () => 0)
  const flat = (x: number) => Array.from({ length: 12 }, () => x)

  /** A young working couple (45 + 47): real Social Security records claimed at 67, pre-tax dollars and a
   *  pre-tax deferral + match, a taxable account, and entered working-year investment income — so every
   *  clamped year carries B > 0 and I > 0, and NO clamped year carries a portfolio income channel: their
   *  own claims sit 20+ years out, a survivor's §202 benefit needs the survivor at 60 (13+ years out), no
   *  one reaches an RMD age, Medicare onset is 18+ years out, and nothing converts. */
  const W45: PersonInputs = {
    sex: 'male', currentAge: 45, birthYear: 1981, retirementAge: 46,
    earnedIncomeReal: 95_000, pia: 30_000, socialSecurityClaimAge: 67,
  }
  const W47: PersonInputs = {
    sex: 'female', currentAge: 47, birthYear: 1979, retirementAge: 48,
    earnedIncomeReal: 60_000, pia: 22_000, socialSecurityClaimAge: 67,
  }
  const BASE_OVERLAY: OverlayParams = {
    taxEnabled: true,
    rmdEnabled: true,
    startCalendarYear: 2026,
    buckets: { taxable: 100_000, pretax: 400_000, roth: 100_000 },
    pretaxByPerson: [250_000, 150_000],
    initialTaxableBasis: 80_000,
    filing: 'mfj',
    healthcareEnabled: true,
    // An explicit $0 marketplace entry for every year (employer retiree coverage): the date-route coverage
    // rule demands a finite entry for each pre-65 retired year, and a $0 never opens the ACA gate.
    enrolledPremium: ZEROS,
    slcsp: ZEROS,
    accumulation: { contributionsByPerson: [{ pretax: flat(19_000), employerMatch: flat(5_000) }, { roth: flat(7_000) }] },
  }
  interface Shape {
    readonly people?: readonly PersonInputs[]
    readonly overlay?: Partial<OverlayParams>
    readonly longevityMode?: SimulationParams['longevityMode']
    /** The entered working-year investment income per person (the override is built as earned + this). */
    readonly investment?: readonly number[]
  }
  const household = (s: Shape = {}): DateSearchInput => {
    const people = s.people ?? [W45, W47]
    const investment = s.investment ?? [10_000, 4_000]
    return {
      params: {
        initialPortfolio: 600_000,
        annualSpendingReal: 80_000,
        stockWeight: 0.6,
        people,
        survivorSpendingRatio: 0.75,
        drawdownPolicy: 'proportional',
        market: validationMarket.value,
        paths: 1,
        maxHorizonYears: HORIZON,
        longevityMode: s.longevityMode ?? 'sampled',
        overlay: { ...BASE_OVERLAY, ...s.overlay },
      },
      workingYearIrmaaMagiByPerson: people.map((p, i) => p.earnedIncomeReal + (investment[i] ?? 0)),
      workingYearInvestmentByPerson: investment,
    }
  }
  /** One person paid differently (a pay change, nothing else) — the B-invariance proof's twin. */
  const withPay = (input: DateSearchInput, i: number, earned: number): DateSearchInput => {
    const people = input.params.people.map((p, j) => (j === i ? { ...p, earnedIncomeReal: earned } : p))
    return { ...input, params: { ...input.params, people } }
  }
  type Resolved = SimResolved
  /** Run one candidate: the resolved distribution, or a loud failure (never a silent skip). */
  const run = (input: DateSearchInput, y: number): Resolved => {
    const candidate = buildCandidateParams(input, y, 300)
    const invalid = validateParams(candidate)
    if (invalid !== null) throw new Error(`fixture candidate Y=${y} rejected: ${invalid}`)
    const out = simulate(candidate, 20261020)
    if (out.indeterminate || out.infeasible) throw new Error(`fixture candidate Y=${y} did not resolve`)
    return out
  }
  /** Every terminal value and every lifetime tax figure identical, bit for bit (Object.is per path). */
  const bitIdentical = (a: Resolved, b: Resolved): boolean => {
    const ta = a.distribution.terminalValuesReal
    const tb = b.distribution.terminalValuesReal
    const la = a.distribution.taxAware?.lifetimeTaxPaidReal ?? []
    const lb = b.distribution.taxAware?.lifetimeTaxPaidReal ?? []
    if (la.length !== ta.length || ta.length !== tb.length || la.length !== lb.length || la.length === 0) return false
    return ta.every((v, p) => Object.is(v, tb[p])) && la.every((v, p) => Object.is(v, lb[p]))
  }

  it('UNREACHED: a working couple with B > 0 and I > 0 but no SS, conversion, RMD or Medicare in any clamped year — on any death timeline — reads `unpriced`', () => {
    const input = household()
    // Non-vacuity: the floor really runs in these years — a clamped year carries B > 0 and I > 0; it just
    // has nothing to price on top of them.
    const candidate = buildCandidateParams(input, 6, 1)
    const { offsets, higherClaimOffset } = personOffsetsFor(candidate.people)
    const outside = cashTermsForYear(0, candidate, offsets, [HORIZON, HORIZON], higherClaimOffset).workingYearOutside
    // B = (95,000 − 19,000 deferral) + (60,000 − 0) = 136,000 (the match is never pay); I = 10,000 + 4,000.
    expect(outside).toEqual({ ordinaryBase: 136_000, investmentIncome: 14_000 })
    expect(workingYearTaxReach(input)).toBe('unpriced')
  })

  it('THE PROOF ARM: the unreached household’s recompute is B-INVARIANT — two runs differing only in pay agree bit for bit — while a moved control (the same + one working-year conversion) is B-variant', { timeout: 120_000 }, () => {
    const input = household()
    expect(bitIdentical(run(input, 6), run(withPay(input, 0, 150_000), 6)), 'unpriced ⇒ nothing the floor prices moves with B').toBe(true)
    // The control: a $20,000 conversion in sim-year 2 (inside Y = 6's working window) is portfolio income
    // in a clamped year — the predicate reads it, and the recompute moves with the pay under it.
    const moved = household({ overlay: { conversions: [0, 0, 20_000] } })
    expect(workingYearTaxReach(moved)).toBe('priced')
    expect(bitIdentical(run(moved, 6), run(withPay(moved, 0, 150_000), 6)), 'priced ⇒ the pay under the conversion moves its tax').toBe(false)
  })

  it('CONVERSION: read per CLAMPED year — a conversion in sim-year 3 reaches; one in sim-year 10 (clamped for no Y ≤ 10) reaches nothing', () => {
    expect(workingYearTaxReach(household({ overlay: { conversions: [0, 0, 0, 20_000] } }))).toBe('priced')
    const late = Array.from({ length: 11 }, (_, t) => (t === 10 ? 20_000 : 0))
    expect(workingYearTaxReach(household({ overlay: { conversions: late } }))).toBe('unpriced')
  })

  it('OWN SS while working: a claim inside the window reads `priced` — the walk reaches the window TOP (claim offset 9 is clamped only at Y = 10); offset 10 is never clamped', () => {
    const single = (currentAge: number): DateSearchInput =>
      household({
        people: [{ ...W45, currentAge, birthYear: 2026 - currentAge, retirementAge: currentAge + 1, pia: 24_000, socialSecurityClaimAge: 70 }],
        overlay: {
          buckets: { taxable: 100_000, pretax: 400_000, roth: 100_000 },
          pretaxByPerson: [400_000],
          filing: 'single',
          accumulation: { contributionsByPerson: [{ roth: flat(7_000) }] },
        },
        investment: [0],
      })
    expect(workingYearTaxReach(single(61)), 'claim offset 9 ⇒ clamped at Y = 10, t = 9').toBe('priced')
    expect(workingYearTaxReach(single(60)), 'claim offset 10 ⇒ never clamped').toBe('unpriced')
  })

  it('SURVIVOR SS (insight 027): a couple both working at 55, claiming at 67, no conversion, reads `priced` — through the §202 benefit a still-working survivor draws from 60 — and the SAME household with no deaths in its timeline reads `unpriced`', () => {
    const at55 = (sex: PersonInputs['sex']): PersonInputs => ({
      sex, currentAge: 55, birthYear: 1971, retirementAge: 56, earnedIncomeReal: 80_000, pia: 28_000, socialSecurityClaimAge: 67,
    })
    const shape: Shape = { people: [at55('male'), at55('female')], investment: [0, 0] }
    expect(workingYearTaxReach(household(shape)), 'sampled: a single death puts survivor SS in a clamped year').toBe('priced')
    expect(workingYearTaxReach(household({ ...shape, longevityMode: 'fixed-horizon' })), 'no death ⇒ no SS until 67').toBe('unpriced')
  })

  it('RMD: a still-working holder at the RMD age with pre-tax dollars reads `priced`; all-Roth, or RMDs off, reads `unpriced`', () => {
    // Born 1952 ⇒ RMD start 73; a working 74-year-old (Medicare onset = Y — never enrolled while working),
    // no Social Security record, nothing converted: the RMD is the only channel.
    const w74: PersonInputs = { ...W45, currentAge: 74, birthYear: 1952, retirementAge: 75, pia: 0, socialSecurityClaimAge: 70 }
    const shape = (pretax: number, rmdEnabled: boolean): Shape => ({
      people: [w74],
      overlay: {
        rmdEnabled,
        buckets: { taxable: 100_000, pretax, roth: 500_000 - pretax },
        pretaxByPerson: [pretax],
        filing: 'single',
        irmaaMagiSeed: [110_000, 110_000],
        accumulation: { contributionsByPerson: [{ roth: flat(7_000) }] },
      },
      investment: [0],
    })
    expect(workingYearTaxReach(household(shape(300_000, true)))).toBe('priced')
    expect(workingYearTaxReach(household(shape(0, true))), 'no pre-tax dollars ⇒ no RMD').toBe('unpriced')
    expect(workingYearTaxReach(household(shape(300_000, false))), 'RMDs off').toBe('unpriced')
  })

  it('RMD on a CONTRIBUTED pool: an RMD-age worker with $0 entered pre-tax reads `priced` whether the inflow is their own deferral or only the employer match', () => {
    // The same working 74-year-old (RMD start 73), $0 of pre-tax entered: the pool the RMD forces is
    // built by the year's inflow — a pre-tax deferral, or a match alone beside a Roth deferral. The RMD
    // arm's `shape(0, true)` above is the `unpriced` control (no inflow ⇒ no pool ⇒ no RMD). Reading
    // `unpriced` here would be the dangerous direction: a recompute that moves, told nothing.
    const w74: PersonInputs = { ...W45, currentAge: 74, birthYear: 1952, retirementAge: 75, pia: 0, socialSecurityClaimAge: 70 }
    const shape = (stream: PersonContributionStreams): Shape => ({
      people: [w74],
      overlay: {
        buckets: { taxable: 100_000, pretax: 0, roth: 500_000 },
        pretaxByPerson: [0],
        filing: 'single',
        irmaaMagiSeed: [110_000, 110_000],
        accumulation: { contributionsByPerson: [stream] },
      },
      investment: [0],
    })
    expect(workingYearTaxReach(household(shape({ pretax: flat(19_000) }))), 'own deferral').toBe('priced')
    expect(workingYearTaxReach(household(shape({ employerMatch: flat(5_000), roth: flat(7_000) }))), 'the match alone').toBe('priced')
  })

  it('RMD on an INHERITED pool: an RMD-age worker with no pre-tax of their own reaches it only once the spouse who held the pool has died — `priced` sampled, `unpriced` with no deaths', () => {
    const w74: PersonInputs = { ...W45, currentAge: 74, birthYear: 1952, retirementAge: 75, pia: 0, socialSecurityClaimAge: 70 }
    const w60: PersonInputs = { ...W47, currentAge: 60, birthYear: 1966, retirementAge: 61, pia: 0, socialSecurityClaimAge: 70 }
    const shape: Shape = {
      people: [w74, w60],
      overlay: {
        buckets: { taxable: 100_000, pretax: 300_000, roth: 200_000 },
        pretaxByPerson: [0, 300_000],
        irmaaMagiSeed: [150_000, 150_000],
        accumulation: { contributionsByPerson: [{ roth: flat(7_000) }, { roth: flat(7_000) }] },
      },
      investment: [0, 0],
    }
    expect(workingYearTaxReach(household(shape)), 'the spousal rollover lands the pool on an RMD-age worker').toBe('priced')
    expect(workingYearTaxReach(household({ ...shape, longevityMode: 'fixed-horizon' })), 'no death ⇒ the pool’s holder is 60').toBe('unpriced')
  })

  it('RMD on the AGGREGATE pool (no per-person split — M6a): the holder is the FIRST LIVING member, so the pool is forced only when THEY are at the RMD age', () => {
    const w74: PersonInputs = { ...W45, currentAge: 74, birthYear: 1952, retirementAge: 75, pia: 0, socialSecurityClaimAge: 70 }
    const w60: PersonInputs = { ...W47, currentAge: 60, birthYear: 1966, retirementAge: 61, pia: 0, socialSecurityClaimAge: 70 }
    const aggregate = (people: readonly PersonInputs[], longevityMode: SimulationParams['longevityMode']): DateSearchInput => {
      const input = household({
        people,
        overlay: {
          buckets: { taxable: 100_000, pretax: 300_000, roth: 200_000 },
          irmaaMagiSeed: [150_000, 150_000],
          accumulation: { contributionsByPerson: [{ roth: flat(7_000) }, { roth: flat(7_000) }] },
        },
        investment: [0, 0],
        longevityMode,
      })
      const { pretaxByPerson: _split, ...overlay } = input.params.overlay!
      return { ...input, params: { ...input.params, overlay } }
    }
    expect(aggregate([w74, w60], 'fixed-horizon').params.overlay?.pretaxByPerson, 'premise: no split').toBeUndefined()
    expect(workingYearTaxReach(aggregate([w74, w60], 'fixed-horizon')), 'the 74-year-old holds the pool').toBe('priced')
    expect(workingYearTaxReach(aggregate([w60, w74], 'fixed-horizon')), 'the 60-year-old holds it — not forced').toBe('unpriced')
    expect(workingYearTaxReach(aggregate([w60, w74], 'sampled')), 'once the holder dies, the pool rides the 74-year-old').toBe('priced')
  })

  it('MEDICARE ONLY: a worker beside an enrolled retired spouse reads `priced` and MOVES with the pay (the premium draw is taxed above it); at B = I = 0 it reads `unpriced`, and B = 0 with I > 0 still reads `priced`', { timeout: 120_000 }, () => {
    // A 60-year-old worker + a retired 65-year-old (enrolled from year 0; born 1961 ⇒ RMD at 75 = sim-year
    // 10, never clamped), neither with a Social Security record, nothing converted: the Part B draw is the
    // only portfolio income a clamped year carries.
    const w60: PersonInputs = { ...W45, currentAge: 60, birthYear: 1966, retirementAge: 61, pia: 0, socialSecurityClaimAge: 70 }
    const r65: PersonInputs = { ...W47, currentAge: 65, birthYear: 1961, retirementAge: 63, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70 }
    const shape = (earned: number, investment: number): Shape => ({
      people: [{ ...w60, earnedIncomeReal: earned }, r65],
      overlay: {
        buckets: { taxable: 100_000, pretax: 400_000, roth: 100_000 },
        pretaxByPerson: [150_000, 250_000],
        irmaaMagiSeed: [90_000, 92_000],
        accumulation: { contributionsByPerson: [{ pretax: flat(12_000) }, {}] },
      },
      investment: [investment, 0],
    })
    expect(workingYearTaxReach(household(shape(90_000, 0)))).toBe('priced')
    expect(workingYearTaxReach(household(shape(0, 0))), 'B = I = 0 ⇒ the charge is today’s T(P, ss)').toBe('unpriced')
    expect(workingYearTaxReach(household(shape(0, 8_000))), 'B = 0, I > 0 ⇒ the ordinary/preferential readings sit on I').toBe('priced')
    // …and it MOVES: the same household at two pays, every other input equal.
    expect(bitIdentical(run(household(shape(90_000, 0)), 5), run(household(shape(160_000, 0)), 5)), 'the Medicare draw’s tax rides the pay under it').toBe(false)
  })

  it('THE BOUNDARIES: the onset year and the RMD-start year are each a reached year — read inclusively, as the engine gates them (fixed horizon; each is the ONLY reached clamped year, at Y = 10)', () => {
    // (1) Medicare: a 60-year-old worker beside a retired 56-year-old (biological 65 at t = 9), no Social
    // Security record, no pre-tax, nothing converted — the onset year t = 9 is the only clamped year with a
    // portfolio channel, and it is clamped only at Y = 10.
    const onsetAtNine = household({
      people: [
        { ...W45, currentAge: 60, birthYear: 1966, retirementAge: 61, earnedIncomeReal: 90_000, pia: 0, socialSecurityClaimAge: 70 },
        { ...W47, currentAge: 56, birthYear: 1970, retirementAge: 55, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70 },
      ],
      overlay: {
        buckets: { taxable: 100_000, pretax: 0, roth: 500_000 },
        pretaxByPerson: [0, 0],
        accumulation: { contributionsByPerson: [{ roth: flat(7_000) }, {}] },
      },
      investment: [0, 0],
      longevityMode: 'fixed-horizon',
    })
    expect(workingYearTaxReach(onsetAtNine), 'enrolled from t = 9 ⇒ the t = 9 premium draw is reached').toBe('priced')
    // (2) RMD: a single 66-year-old worker born 1960 (RMD start 75 = t 9) holding $300,000 pre-tax.
    const rmdAtNine = household({
      people: [{ ...W45, currentAge: 66, birthYear: 1960, retirementAge: 67, earnedIncomeReal: 90_000, pia: 0, socialSecurityClaimAge: 70 }],
      overlay: {
        buckets: { taxable: 100_000, pretax: 300_000, roth: 200_000 },
        pretaxByPerson: [300_000],
        filing: 'single',
        irmaaMagiSeed: [100_000, 100_000],
        accumulation: { contributionsByPerson: [{ roth: flat(7_000) }] },
      },
      investment: [0],
      longevityMode: 'fixed-horizon',
    })
    expect(workingYearTaxReach(rmdAtNine), 'age 75 at t = 9 ⇒ the first RMD is reached').toBe('priced')
  })

  it('no tax overlay ⇒ `unpriced` (no candidate is built, no year is taxed); a construct-absent run ⇒ `unpriced` (it never clamps)', () => {
    const input = household()
    const { overlay: _o, ...bare } = input.params
    expect(workingYearTaxReach({ params: bare })).toBe('unpriced')
    expect(workingYearTaxReach({ params: { ...input.params, overlay: { ...BASE_OVERLAY, taxEnabled: false } } })).toBe('unpriced')
    const { accumulation: _a, ...noConstruct } = BASE_OVERLAY
    expect(workingYearTaxReachOfRun({ ...input.params, overlay: { ...noConstruct, conversions: [20_000] } })).toBe('unpriced')
  })
})
