import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import {
  ALL_CONSTANTS,
  taxConstants,
  stateTaxConstants,
  healthConstants,
  contributionConstants,
  socialSecurityConstants,
  solverConstants,
  catchUpForAge,
  fraMonthsForBirthYear,
  PRICED_STATES,
  isPricedState,
  stateRateForYear,
  stateStandardDeductionFor,
  STATE_TAX_PROFILES,
  medicareCostTrend,
  partB2026,
} from '../index'
import { isUnsourced } from '../types'

const SRC = join(process.cwd(), 'src')

function walkTs(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...walkTs(full))
    } else if (/\.tsx?$/.test(name)) {
      out.push(full)
    }
  }
  return out
}

describe('canonical constants — shape & provenance (contract #6)', () => {
  it('every entry carries a citation and a directional marker', () => {
    for (const [key, entry] of Object.entries(ALL_CONSTANTS)) {
      expect(typeof entry.citation, `${key}.citation`).toBe('string')
      expect(entry.citation.length, `${key}.citation non-empty`).toBeGreaterThan(0)
      expect(typeof entry.directionalUntilPinned, `${key}.directionalUntilPinned`).toBe('boolean')
    }
  })

  it('sourced figures read; unsourced gap sentinels THROW on read (burned/062)', () => {
    for (const [key, entry] of Object.entries(ALL_CONSTANTS)) {
      if (isUnsourced(entry)) {
        expect(() => entry.value, `${key} (gap) must throw on read`).toThrow(/not yet sourced/)
        expect(entry.pinTo.length, `${key}.pinTo`).toBeGreaterThan(0)
      } else {
        expect(() => entry.value, `${key} must not throw`).not.toThrow()
        expect(entry.value, `${key}.value defined`).toBeDefined()
      }
    }
  })

  it('every still-directional entry carries a directionalKind — the U14 mint predicate never guesses (S0, supersession item 5)', () => {
    // certification-pinnable → BLOCKS the consuming household's oracle token until the dated
    // event pins it; methodology-substrate → ships-disclosed, never blocks. An unclassified
    // directional entry would force the mint predicate to guess a household's honesty posture.
    for (const [key, entry] of Object.entries(ALL_CONSTANTS)) {
      if (entry.directionalUntilPinned) {
        expect(
          entry.directionalKind,
          `${key} is directional and MUST declare its kind (certification-pinnable | methodology-substrate)`,
        ).toMatch(/^(certification-pinnable|methodology-substrate)$/)
      }
    }
  })

  it('the Medicare-cost-trend entry is SOURCED (the trend sourcing unit, 2026-07-19) — the full V.E2 vector pinned VERBATIM from the research packet (insight 021)', () => {
    const entry = ALL_CONSTANTS['health.medicareCostTrend']
    expect(entry, 'health.medicareCostTrend registered').toBeDefined()
    expect(isUnsourced(entry!), 'the former gap sentinel is now a sourced table').toBe(false)
    const trend = medicareCostTrend.value
    // THE FULL-VECTOR PIN (insight 021 — anchors + structural invariants admit smooth
    // corruptions): every literal below is transcribed from docs/research/medicare-cost-trend.md
    // (Table V.E2 p.207, primary-verified byte-for-byte) — NEVER from the committed module, so
    // this test stays an independent transcription axis (DND-012). 2033 is $313.60 in the
    // primary; secondary press printing $313.65 loses (the packet's named discrepancy).
    expect(trend.premiums).toEqual([
      { calendarYear: 2027, nominalMonthly: 209.5 },
      { calendarYear: 2028, nominalMonthly: 224.5 },
      { calendarYear: 2029, nominalMonthly: 238.5 },
      { calendarYear: 2030, nominalMonthly: 255.5 },
      { calendarYear: 2031, nominalMonthly: 272.1 },
      { calendarYear: 2032, nominalMonthly: 290.2 },
      { calendarYear: 2033, nominalMonthly: 313.6 },
      { calendarYear: 2034, nominalMonthly: 338.5 },
      { calendarYear: 2035, nominalMonthly: 360.6 },
    ])
    // The CROSS-CONSTANT IDENTITY (insight 009's cross-table axis): V.E2's finalized 2026 row
    // ($202.90) IS partB2026.standardPremiumMonthly — the anchor is NOT re-typed in the trend
    // table (one home per figure, burned/057); the resolver binds it from partB2026.
    expect(trend.anchorYear).toBe(2026)
    expect(partB2026.value.standardPremiumMonthly).toBe(202.9)
    expect(trend.premiums.some((r) => r.calendarYear === 2026), 'the anchor row must NOT be re-typed here').toBe(false)
    // The macro assumptions, transcribed from the packet (II.D1 / III.B12 / §III.D):
    expect(trend.cpiNearTermAvg).toBe(0.032)
    expect(trend.cpiUltimate).toBe(0.024)
    expect(trend.ultimateNominalGrowth).toBe(0.038)
    expect(trend.reportEdition).toBe(2026)
    expect(trend.vintage).toBe('medicare-trend-2026a')
    // THE V.E4 FULL-VECTOR PIN (the Part D sourcing pass, 2026-07-19 — insight 021 again):
    // transcribed from the primary PDF (Table V.E4 p.211–212) by the research pass, never from
    // the committed module. THE 2030 JUMP IS DATA (IRA §11201's 6% cap lapses; the 20%-of-bid
    // formula governs 2030+) — a smoothed or base-premium-derived table CANNOT reproduce it.
    expect(trend.partDIrmaa).toEqual([
      { calendarYear: 2027, addOnsMonthly: [15.4, 39.7, 64.0, 88.3, 96.4] },
      { calendarYear: 2028, addOnsMonthly: [16.3, 42.1, 67.9, 93.6, 102.2] },
      { calendarYear: 2029, addOnsMonthly: [17.3, 44.6, 71.9, 99.3, 108.4] },
      { calendarYear: 2030, addOnsMonthly: [51.7, 103.4, 155.1, 206.8, 224.0] },
      { calendarYear: 2031, addOnsMonthly: [53.5, 106.9, 160.4, 213.8, 231.6] },
      { calendarYear: 2032, addOnsMonthly: [53.7, 107.4, 161.1, 214.8, 232.7] },
      { calendarYear: 2033, addOnsMonthly: [55.5, 111.0, 166.5, 222.0, 240.5] },
      { calendarYear: 2034, addOnsMonthly: [56.6, 113.2, 169.8, 226.4, 245.3] },
      { calendarYear: 2035, addOnsMonthly: [58.4, 116.7, 175.1, 233.4, 252.9] },
    ])
    // The CROSS-CONSTANT IDENTITY for Part D (the 009 axis again): V.E4's 2026 row equals the
    // pinned irmaa.tiers Part D surcharges TO THE CENT (the researcher's (d) check) — the anchor
    // row is NOT re-typed in the trend table (one home per figure).
    expect(trend.partDIrmaa.some((r) => r.calendarYear === 2026), 'the Part D anchor row must NOT be re-typed here').toBe(false)
    // Provenance: pinned (the packet verified the primary byte-for-byte), derivations NAMED in
    // the note (022 — the uniform near-term average + the consumer-derived ultimate real growth).
    expect(medicareCostTrend.directionalUntilPinned).toBe(false)
    expect(medicareCostTrend.note).toMatch(/DERIVATION CHOICES/)
    expect(medicareCostTrend.citation).toMatch(/Table V\.E2/)
  })

  it('the formerly-unsourced tax gaps are now ALL SOURCED + still directional (U2 closed; pin gate still pending)', () => {
    for (const key of [
      'ordinaryBracketsSingle',
      'age65AdditionSingle',
      'capitalGainsBreakpoints',
      'uniformLifetimeTableDivisors',
      'jointLifeLastSurvivorTable', // the last gap — closed in M6b
    ] as const) {
      const entry = taxConstants[key]
      expect(isUnsourced(entry), `${key} is sourced (not a throw-on-read gap)`).toBe(false)
      expect(() => entry.value, `${key} reads without throwing`).not.toThrow()
      expect(entry.directionalUntilPinned, `${key} pinned at the 2026-06-11 P1-exit pass (blind double-read vs the IRS/eCFR primaries)`).toBe(false)
    }
  })

  it('the Joint Life & Last Survivor grid (Table II) matches its independent oracle + the reg structure (M6b, DND/012)', () => {
    const entry = taxConstants.jointLifeLastSurvivorTable
    expect(isUnsourced(entry), 'JLLS is sourced (the last tax gap, closed in M6b)').toBe(false)
    if (isUnsourced(entry)) return // narrow the type
    const t = entry.value
    // Domain: owner 72..120, spouse 1..(owner-11); 49 owner rows, each the right width.
    expect([t.minOwnerAge, t.maxAge, t.minSpouseAge]).toEqual([72, 120, 1])
    expect(Object.keys(t.byOwnerThenSpouse)).toHaveLength(49)
    const cell = (owner: number, spouse: number) => t.byOwnerThenSpouse[owner]?.[spouse - t.minSpouseAge]
    // Independently-documented anchor cells (known BEFORE transcription — DND/012).
    expect(cell(75, 64), 'anchor owner75/spouse64').toBe(25.3)
    expect(cell(76, 60), 'anchor owner76/spouse60').toBe(28.2)
    // The eCFR-vs-Pub-590-B discrepancy resolution, pinned as a regression guard: the
    // authoritative reg prints (90,76) twice as 14.7; Pub 590-B's lone 14.8 was rejected.
    expect(cell(90, 76), 'eCFR (90,76) resolved over Pub 590-B 14.8').toBe(14.7)
    const ult = new Map(taxConstants.uniformLifetimeTableDivisors.value.map((r) => [r.age, r.divisor]))
    for (let owner = t.minOwnerAge; owner <= t.maxAge; owner++) {
      const row = t.byOwnerThenSpouse[owner]
      expect(row, `owner ${owner} row present`).toBeDefined()
      if (!row) continue
      expect(row.length, `owner ${owner} covers spouse 1..${owner - 11}`).toBe(owner - 11)
      // Relief-vs-ULT: the smallest stored gap (spouse = owner-11) yields a divisor ≥ ULT
      // (which bakes in a 10-yr-younger beneficiary), strictly larger below the terminal
      // convergence — so a >10yr-younger sole spouse is forced to distribute LESS, never more.
      const gap11 = row[row.length - 1] ?? 0
      const u = ult.get(owner) ?? 0
      expect(gap11 >= u, `JLLS(${owner},${owner - 11}) ≥ ULT(${owner})`).toBe(true)
      if (owner <= 110) expect(gap11 > u, `JLLS(${owner},${owner - 11}) > ULT(${owner})`).toBe(true)
      // Monotone non-increasing as the spouse ages; finite 1-decimals > 0 (DND/009).
      for (let i = 0; i < row.length; i++) {
        const v = row[i] ?? NaN
        expect(Number.isFinite(v) && v > 0 && Math.abs(v * 10 - Math.round(v * 10)) < 1e-9).toBe(true)
        if (i > 0) expect((row[i] ?? 0) <= (row[i - 1] ?? 0), `owner ${owner} monotone at spouse ${i + 1}`).toBe(true)
      }
    }
  })

  it('the sourced tax gaps carry their landmine-guarding shapes (a "half of MFJ" regression fails loud)', () => {
    const single = taxConstants.ordinaryBracketsSingle.value
    expect(single).toHaveLength(7)
    expect(single[6]?.upTo, 'top bracket never capped (no Infinity/NaN)').toBeNull()
    // 35% single edge is $640,600 — NOT ½ of MFJ's $768,700 (the documented landmine).
    expect(single[5]?.upTo).toBe(640_600)
    // single age-65 addition is $2,050 — not the MFJ $1,650, not the $6k senior bonus.
    expect(taxConstants.age65AdditionSingle.value).toBe(2_050)

    const cg = taxConstants.capitalGainsBreakpoints.value
    expect(cg.single.fifteenRateUpTo, 'single 15%-top is NOT ½ of MFJ 613,700').toBe(545_500)
    expect(cg.mfj.zeroRateUpTo).toBe(98_900)

    const ult = taxConstants.uniformLifetimeTableDivisors.value
    expect(ult).toHaveLength(49)
    expect(ult.find((r) => r.age === 75)?.divisor, 'Pub 590-B worked-example anchor').toBe(24.6)
    expect(ult.find((r) => r.age === 72)?.divisor, 'post-2022 table (pre-2022 was 25.6)').toBe(27.4)
    expect(ult[ult.length - 1], 'terminal "120 and over" clamp bucket').toEqual({ age: 120, divisor: 2.0 })
  })

  it('the ACA legislative entry carries reVerifyEveryBuild (the CI gate hooks this)', () => {
    expect(healthConstants.acaEnhancedSubsidyStatus.reVerifyEveryBuild).toBe(true)
  })

  it('the ACA applicable-% table is contiguous, monotone, and matches its Rev. Proc. 2025-25 anchors (U3·M1, DND/012)', () => {
    const entry = healthConstants.acaApplicablePercentage
    expect(entry.directionalUntilPinned, 'pinned at the 2026-06-11 P1-exit pass').toBe(false)
    expect(entry.reVerifyEveryBuild, 'legislatively gated (the cliff can flip)').toBe(true)
    const t = entry.value
    expect(t.cliffFplFraction, '400% cliff (2026 reverted regime)').toBe(4.0)
    expect(t.eligibilityFloorFplFraction, '100% FPL PTC floor').toBe(1.0)
    expect(t.bands).toHaveLength(6)
    // Pin BOTH endpoints of EVERY band (externally-derived from Rev. Proc. 2025-25 — DND/012),
    // so an in-order single-digit corruption of an interior bound fails loud (M1 review). The
    // contiguity/monotonicity checks below are an independent cross-axis, not the only guard.
    expect(t.bands.map((b) => b.applicablePctLow)).toEqual([2.1, 3.14, 4.19, 6.6, 8.44, 9.96])
    expect(t.bands.map((b) => b.applicablePctHigh)).toEqual([2.1, 4.19, 6.6, 8.44, 9.96, 9.96])
    expect(t.bands[1]?.applicablePctLow, 'the one value this milestone had to fetch (133% lower bound)').toBe(3.14)
    t.bands.forEach((b, i) => {
      expect(Number.isFinite(b.fplFractionLow) && Number.isFinite(b.fplFractionHigh)).toBe(true)
      expect(b.fplFractionHigh !== null && b.fplFractionHigh > b.fplFractionLow, `band ${i} width > 0`).toBe(true)
      expect(b.applicablePctHigh >= b.applicablePctLow, `band ${i} non-decreasing within`).toBe(true)
      expect(b.applicablePctLow >= 0 && b.applicablePctHigh <= 100, `band ${i} a valid %`).toBe(true)
      const prev = t.bands[i - 1]
      if (prev) {
        expect(prev.fplFractionHigh, `band ${i} contiguous with prev`).toBe(b.fplFractionLow)
        expect(b.applicablePctLow >= prev.applicablePctHigh, `band ${i} non-decreasing across`).toBe(true)
      }
    })
    expect(t.bands[t.bands.length - 1]?.fplFractionHigh, 'top band ends at the cliff').toBe(t.cliffFplFraction)
  })

  it('the ENHANCED ACA applicable-% table (ARPA/IRA, the toggle regime) has NO cliff + a flat-8.5% open top band, verbatim from §36B(b)(3)(A)(iii) (U3·E, DND/012)', () => {
    const entry = healthConstants.acaApplicablePercentageEnhanced
    expect(entry.directionalUntilPinned, 'pinned 2026-06-11 (verbatim §36B(b)(3)(A)(iii); reVerifyEveryBuild still gates the live regime)').toBe(false)
    expect(entry.reVerifyEveryBuild, 'legislatively gated (the 2026 extension is pending/retroactive)').toBe(true)
    const t = entry.value
    // The defining structural facts: NO cliff (null), and the 100%-FPL Medicaid floor still applies.
    expect(t.cliffFplFraction, 'enhanced regime has NO 400% cliff').toBeNull()
    expect(t.eligibilityFloorFplFraction, '100% FPL PTC floor (Medicaid below)').toBe(1.0)
    expect(t.bands).toHaveLength(6)
    // Pin EVERY band value, externally-derived from the statute (DND/012) — an in-order single-digit
    // corruption of any interior bound fails loud.
    expect(t.bands.map((b) => b.fplFractionLow)).toEqual([0, 1.5, 2.0, 2.5, 3.0, 4.0])
    expect(t.bands.map((b) => b.fplFractionHigh)).toEqual([1.5, 2.0, 2.5, 3.0, 4.0, null])
    expect(t.bands.map((b) => b.applicablePctLow)).toEqual([0, 0, 2.0, 4.0, 6.0, 8.5])
    expect(t.bands.map((b) => b.applicablePctHigh)).toEqual([0, 2.0, 4.0, 6.0, 8.5, 8.5])
    // The open top band: "400% and higher" is FLAT 8.5% (fplFractionHigh null, low === high).
    const top = t.bands[t.bands.length - 1]
    expect(top?.fplFractionHigh, 'open top band').toBeNull()
    expect(top?.applicablePctLow === top?.applicablePctHigh, 'top band is flat (8.5%)').toBe(true)
    // The invariant generalizes (cf. the reverted table line above): the top band ends exactly
    // where the cliff begins — here both are null (no cliff, open band).
    expect(top?.fplFractionHigh, 'top band high === cliffFplFraction (null === null)').toBe(t.cliffFplFraction)
    t.bands.forEach((b, i) => {
      const prev = t.bands[i - 1]
      if (prev) {
        expect(prev.fplFractionHigh, `band ${i} contiguous`).toBe(b.fplFractionLow)
        // Internal continuity (insight 009 self-check): each band's initial % === the prior band's
        // final %, so the sliding scale is continuous (0,0,2,4,6,8.5) — no transcription jump.
        expect(b.applicablePctLow, `band ${i} continuous % (initial === prior final)`).toBe(prev.applicablePctHigh)
      }
      // DND/009 finiteness: every % finite; fplFractionHigh finite OR the open-band null.
      expect(Number.isFinite(b.applicablePctLow) && Number.isFinite(b.applicablePctHigh)).toBe(true)
      expect(b.fplFractionHigh === null || Number.isFinite(b.fplFractionHigh)).toBe(true)
    })
    // Cross-table identity: the enhanced regime is strictly MORE generous than the 2026 reverted
    // table at a shared FPL edge (at 200% FPL: enhanced 2.0% vs reverted 6.6% required contribution).
    const reverted = healthConstants.acaApplicablePercentage.value
    const enhAt200 = t.bands.find((b) => b.fplFractionHigh === 2.0)?.applicablePctHigh
    const revAt200 = reverted.bands.find((b) => b.fplFractionHigh === 2.0)?.applicablePctHigh
    expect(enhAt200 !== undefined && revAt200 !== undefined && enhAt200 < revAt200, 'enhanced more generous at 200% FPL').toBe(true)
  })

  it('the 2025 HHS FPL guidelines reconstruct household sizes + derive the 400% cliff exactly (U3·M1)', () => {
    const entry = healthConstants.federalPovertyGuidelines
    expect(entry.directionalUntilPinned).toBe(false)
    const t = entry.value
    expect(t.guidelineYear, '2025 guidelines drive 2026 coverage').toBe(2025)
    expect(t.base, 'household-of-1 base').toBe(15_650)
    expect(t.perAdditionalPerson, 'per-additional-person increment').toBe(5_500)
    const fpl = (n: number) => t.base + (n - 1) * t.perAdditionalPerson
    expect(fpl(2), 'household-of-2').toBe(21_150)
    // Cross-table identity (insight 009): the 400% cliff dollar is DERIVED, not stored —
    // 4.0 × FPL(2) = 84,600 (the figure the old rounded constant hard-coded). The reverted regime
    // always carries a NUMERIC cliff (only the enhanced regime's cliffFplFraction is null).
    const revertedCliff = healthConstants.acaApplicablePercentage.value.cliffFplFraction
    expect(revertedCliff, 'reverted regime carries a numeric 400% cliff').toBe(4.0)
    expect(fpl(2) * (revertedCliff ?? 0)).toBe(84_600)
    expect(Number.isFinite(t.base) && t.base > 0).toBe(true)
    expect(Number.isFinite(t.perAdditionalPerson) && t.perAdditionalPerson > 0).toBe(true)
  })

  it('the IRMAA schedule is monotone, MFJ=2×single for tiers 1–4 (frozen top breaks it), ties to partB2026 (U3·M1, DND/012)', () => {
    const entry = healthConstants.irmaa
    expect(entry.directionalUntilPinned).toBe(false)
    const t = entry.value
    expect(t.magiLookbackYears, '2026 IRMAA ← 2024 MAGI').toBe(2)
    expect(t.perPerson).toBe(true)
    expect(t.topTierFrozenThrough).toBe(2027)
    expect(t.rothConversionIsSsa44LifeChangingEvent, 'a conversion cannot be appealed away').toBe(false)
    expect(t.tiers).toHaveLength(5)
    // Pin EVERY tier's four values (externally-derived from CMS — DND/012), so an in-order
    // single-digit corruption of an INTERIOR tier fails loud (M1 review). The cost-share +
    // MFJ=2× identities below are independent cross-axes, not the only guard.
    expect(t.tiers[0]).toMatchObject({ singleMagiThreshold: 109_000, mfjMagiThreshold: 218_000, partBSurchargeMonthly: 81.2, partDSurchargeMonthly: 14.5 })
    expect(t.tiers[4]).toMatchObject({ singleMagiThreshold: 500_000, mfjMagiThreshold: 750_000, partBSurchargeMonthly: 487.0, partDSurchargeMonthly: 91.0 })
    expect(t.tiers.map((x) => x.singleMagiThreshold)).toEqual([109_000, 137_000, 171_000, 205_000, 500_000])
    expect(t.tiers.map((x) => x.mfjMagiThreshold)).toEqual([218_000, 274_000, 342_000, 410_000, 750_000])
    expect(t.tiers.map((x) => x.partBSurchargeMonthly)).toEqual([81.2, 202.9, 324.6, 446.3, 487.0])
    expect(t.tiers.map((x) => x.partDSurchargeMonthly)).toEqual([14.5, 37.5, 60.4, 83.3, 91.0])
    const base = healthConstants.partB2026.value.standardPremiumMonthly
    const fullCost = base / 0.25 // the implied 100% Part B cost ($811.60)
    const expectedPct = [0.35, 0.5, 0.65, 0.8, 0.85]
    t.tiers.forEach((tier, i) => {
      expect(Number.isFinite(tier.singleMagiThreshold) && tier.singleMagiThreshold > 0).toBe(true)
      expect(Number.isFinite(tier.partBSurchargeMonthly) && tier.partBSurchargeMonthly > 0).toBe(true)
      expect(Number.isFinite(tier.partDSurchargeMonthly) && tier.partDSurchargeMonthly > 0).toBe(true)
      const prev = t.tiers[i - 1]
      if (prev) {
        expect(tier.singleMagiThreshold > prev.singleMagiThreshold, `tier ${i} single ascending`).toBe(true)
        expect(tier.mfjMagiThreshold > prev.mfjMagiThreshold, `tier ${i} mfj ascending`).toBe(true)
        expect(tier.partBSurchargeMonthly > prev.partBSurchargeMonthly, `tier ${i} Part B ascending`).toBe(true)
        expect(tier.partDSurchargeMonthly > prev.partDSurchargeMonthly, `tier ${i} Part D ascending`).toBe(true)
      }
      // Internal cost-share identity (insight 009): base + surcharge ≈ published % × full cost.
      const pct = expectedPct[i] ?? 0
      expect(base + tier.partBSurchargeMonthly, `tier ${i} Part B total ties to ${pct * 100}%`).toBeCloseTo(pct * fullCost, 0)
    })
    // MFJ = 2× single for tiers 1–4; the frozen top tier deliberately breaks it (750k ≠ 2×500k).
    for (let i = 0; i < 4; i++) {
      const tier = t.tiers[i]
      if (tier) expect(tier.mfjMagiThreshold, `tier ${i} MFJ = 2× single`).toBe(2 * tier.singleMagiThreshold)
    }
    const top = t.tiers[4]
    if (top) expect(top.mfjMagiThreshold, 'frozen top tier breaks 2×').toBeLessThan(2 * top.singleMagiThreshold)
  })

  it('the senior-bonus phase-out encodes the both-65 ceiling, not just the one-spouse $250k landmine', () => {
    const sb = taxConstants.seniorBonus.value
    expect(sb.fullyGoneAbove.mfjOneSpouse65).toBe(250_000)
    expect(sb.fullyGoneAbove.mfjBothSpouses65).toBe(350_000)
  })

  it('the senior-bonus availability window is SYMMETRICALLY pinned — the engine consumes BOTH ends (the sunset unit, council 2026-07-09)', () => {
    // taxCore.seniorBonusFor prices the bonus only in [effectiveFrom .. sunsetAfter]; these
    // are priced figures (insight 074's inverse), so both ends get the dated-figure pin —
    // stripping either one fails the consumer's fail-loud guard AND this pin.
    expect(taxConstants.seniorBonus.effectiveFrom).toBe(2025)
    expect(taxConstants.seniorBonus.sunsetAfter).toBe(2028)
  })

  it('ALL_CONSTANTS is DERIVED from the tables, never hand-listed (burned/061)', () => {
    const expected =
      Object.keys(taxConstants).length +
      Object.keys(stateTaxConstants).length +
      Object.keys(healthConstants).length +
      Object.keys(contributionConstants).length +
      Object.keys(socialSecurityConstants).length +
      Object.keys(solverConstants).length
    expect(Object.keys(ALL_CONSTANTS).length).toBe(expected)
  })

  describe('state income tax — the v1 priced roster {NC, PA, FL} (the state-tax unit, DND/012)', () => {
    it('PRICED_STATES is exactly {NC, PA, FL}; membership is a type guard, not a truthy check', () => {
      expect(PRICED_STATES).toEqual(['NC', 'PA', 'FL'])
      expect(isPricedState('NC') && isPricedState('PA') && isPricedState('FL')).toBe(true)
      // 'elsewhere', absent, and every unbuilt state are NOT priced (byte-identical-OFF branch).
      expect(isPricedState('elsewhere')).toBe(false)
      expect(isPricedState('SC') || isPricedState('GA') || isPricedState('DE')).toBe(false)
    })

    it('every state entry is sourced (never a throw-on-read gap) + carries its split statute/DOR citation', () => {
      for (const [key, entry] of Object.entries(stateTaxConstants)) {
        expect(isUnsourced(entry), `${key} is sourced`).toBe(false)
        expect(() => entry.value, `${key} reads without throwing`).not.toThrow()
        expect(entry.citation.length, `${key} carries a citation`).toBeGreaterThan(0)
      }
    })

    it('the U14 S0 pin split: ncRateSchedule is the ONE directional state entry (certification-pinnable, ~Aug-2026); every other entry is PINNED (2026-07-18)', () => {
      // Transcribed from the primaries 2026-07-15; pinned at the U14 S0 pass on the primary
      // fetches + the verify:state-tax attestation records. The NC rate schedule's 2027+
      // out-years wait on the FY2025-26 revenue certification — a DATED pin event, so the
      // entry is certification-pinnable: an NC household's oracle-cleared token is BLOCKED
      // (state-certification-pending) while FL/PA households mint on the same build. Flipping
      // this flag without the certification is the laundering REJECT (the hawk's veto).
      expect(stateTaxConstants.ncRateSchedule.directionalUntilPinned, 'NC out-years uncertified').toBe(true)
      expect(stateTaxConstants.ncRateSchedule.directionalKind).toBe('certification-pinnable')
      for (const [key, entry] of Object.entries(stateTaxConstants)) {
        if (key === 'ncRateSchedule') continue
        expect(entry.directionalUntilPinned, `${key} pinned at the U14 S0 pass`).toBe(false)
      }
    })

    it('the NC rate schedule carries reVerifyEveryBuild — the live-flip watch the verify:state-tax gate hooks (the ACA/spousalRate precedent)', () => {
      // NC holds 3.99% flat under the hawk veto; the Aug-2026 certification / budget-deal re-fetch
      // could pin a LOWER 2027+ rate at any build, so the NC rate entry is the every-build flip
      // watch — verify:state-tax gates its state-tax-nc-last-verified.json record every build.
      expect(stateTaxConstants.ncRateSchedule.reVerifyEveryBuild).toBe(true)
      // PA (flat 3.07% since 2004) and FL (constitutional $0) have NO live-flip risk — their
      // records re-verify ANNUALLY for drift, but the every-build flip flag is NC-only.
      expect(stateTaxConstants.paRateSchedule.reVerifyEveryBuild, 'PA is stable — not a flip watch').toBeUndefined()
      expect(stateTaxConstants.flIncomeTax.reVerifyEveryBuild, 'FL is constitutional — not a flip watch').toBeUndefined()
    })

    /**
     * THE HAWK-VETO TRAP (wf_d04148cb-1e5, §V; the spirit of insight 022's trap tests): the
     * codified NC 2027+ step-downs are revenue-trigger-conditional on a certification that does
     * not yet exist, and the reported budget-deal schedule is unlocated at primary. Pricing
     * 3.49% for TY2027 is the OPTIMISTIC cardinal-sin direction (understates out-year tax). The
     * rate is HELD FORWARD at 3.99% for 2026 AND every later year; a 2027 lookup returning
     * 0.0349 (the exact wrong derivation) must fail here.
     */
    it('NC rate is HELD at 3.99% for 2026 AND all later years — the 3.49%/2027 veto (never price the unpinned step-down)', () => {
      expect(stateRateForYear('NC', 2026)).toBe(0.0399)
      expect(stateRateForYear('NC', 2027), 'the veto: 2027 holds 3.99%, NOT the unpinned 3.49%').toBe(0.0399)
      expect(stateRateForYear('NC', 2050), 'held forward indefinitely until a lower rate pins').toBe(0.0399)
      expect(stateRateForYear('NC', 2027)).not.toBe(0.0349)
      // A query BEFORE the earliest step is fail-loud (never a silent 0 — burned/062);
      // a non-integer tax year is fail-loud (insight 020).
      expect(() => stateRateForYear('NC', 2025)).toThrow(/no rate step/)
      expect(() => stateRateForYear('NC', 2026.5)).toThrow(/integer/)
    })

    it('NC — fixed standard deduction $25,500 MFJ / $12,750 single (no 65+ add-on) + all-ordinary treatments', () => {
      // $25,500 MFJ is pinned HERE by assertion (not the copyGuard substring gate — it collides
      // with the unrelated 0.85×30,000 SS-taxable figure in healthOverlay.test.ts).
      expect(stateTaxConstants.ncStandardDeduction.value).toEqual({ mfj: 25_500, single: 12_750 })
      expect(stateStandardDeductionFor('NC', 'mfj')).toBe(25_500)
      expect(stateStandardDeductionFor('NC', 'single'), 'survivor SD halves to the single figure (insight 014)').toBe(12_750)
      expect(stateTaxConstants.ncBaseSystem.value).toBe('federal-agi-derived')
      expect(stateTaxConstants.ncSocialSecurity.value, 'SS 100% exempt → state term rides without the ×1.85 torpedo').toBe('exempt')
      expect(stateTaxConstants.ncConversionTreatment.value, 'NC taxes conversions — the ranking-relevant term').toBe('taxed-ordinary')
      expect(stateTaxConstants.ncRetirementIncome.value).toBe('taxed-ordinary')
      expect(stateTaxConstants.ncCapitalGains.value, 'no LTCG preference — gains ordinary').toBe('taxed-ordinary')
    })

    it('PA — flat 3.07% all years, NO standard deduction, class-based, 59½ retirement/conversion gate', () => {
      expect(stateRateForYear('PA', 2026)).toBe(0.0307)
      expect(stateRateForYear('PA', 2099), 'flat since 2004, held forward, no scheduled step-down').toBe(0.0307)
      expect(stateTaxConstants.paStandardDeduction.value, 'No provision — $0 both statuses').toEqual({ mfj: 0, single: 0 })
      expect(stateStandardDeductionFor('PA', 'mfj')).toBe(0)
      expect(stateTaxConstants.paBaseSystem.value, 'eight-class system, NOT federal-AGI-derived').toBe('class-based')
      expect(stateTaxConstants.paQualifiedAge.value, 'the 59½ exemption gate').toBe(59.5)
      expect(stateTaxConstants.paSocialSecurity.value).toBe('exempt')
      // The conservative arm: exempt at/after 59½, TAXED below it (the under-59½ conversion
      // exemption could not be pinned at primary; the date route can reach those ages).
      expect(stateTaxConstants.paConversionTreatment.value).toBe('taxed-if-under-qualified-age')
      expect(stateTaxConstants.paRetirementIncome.value).toBe('taxed-if-under-qualified-age')
      expect(stateTaxConstants.paCapitalGains.value, 'brokerage income at 3.07%, no LTCG preference').toBe('taxed-ordinary')
    })

    it('FL — a sourced constitutional $0 (never a silent default); the no-income-tax profile', () => {
      expect(stateTaxConstants.flIncomeTax.value, 'a pinned constitutional $0, not an absent default').toBe(0)
      expect(stateTaxConstants.flIncomeTax.citation, 'Art. VII §5(a)').toMatch(/Art\. VII/)
      expect(stateRateForYear('FL', 2026), 'no income tax → $0 rate').toBe(0)
      expect(stateRateForYear('FL', 2099)).toBe(0)
      expect(stateStandardDeductionFor('FL', 'mfj')).toBe(0)
      const fl = STATE_TAX_PROFILES.FL
      expect(fl.baseSystem).toBe('no-income-tax')
      expect([fl.ssTreatment, fl.retirementIncomeTreatment, fl.conversionTreatment, fl.capGainsTreatment])
        .toEqual(['none', 'none', 'none', 'none'])
      expect([fl.rateSchedule, fl.standardDeduction, fl.qualifiedAge]).toEqual([null, null, null])
    })

    it('the engine profiles read the sourced entries (no re-typed figure) for every priced state', () => {
      expect(STATE_TAX_PROFILES.NC.rateSchedule).toBe(stateTaxConstants.ncRateSchedule.value)
      expect(STATE_TAX_PROFILES.NC.standardDeduction).toBe(stateTaxConstants.ncStandardDeduction.value)
      expect(STATE_TAX_PROFILES.PA.qualifiedAge).toBe(stateTaxConstants.paQualifiedAge.value)
      expect(Object.keys(STATE_TAX_PROFILES)).toEqual([...PRICED_STATES])
    })
  })

  describe('C1 contribution limits — tiers, identities, provenance (Notice 2025-67 / Rev. Proc. 2025-19, verbatim-read 2026-06-10)', () => {
    it('the age-band catch-up lookup resolves by YEAR-END attained age + account kind, including the 64 step-down', () => {
      // employer plan: below 50 → 0; 50–59 → regular; 60–63 → §109 super; 64+ steps DOWN to regular
      expect(catchUpForAge(35, 'employerPlan')).toBe(0)
      expect(catchUpForAge(50, 'employerPlan')).toBe(8_000)
      expect(catchUpForAge(59, 'employerPlan')).toBe(8_000)
      expect(catchUpForAge(60, 'employerPlan')).toBe(11_250)
      expect(catchUpForAge(63, 'employerPlan')).toBe(11_250)
      // THE per-runway-year fact (C1 unit): the super band EXPIRES — a 64-yo is back on the regular tier
      expect(catchUpForAge(64, 'employerPlan')).toBe(8_000)
      expect(catchUpForAge(75, 'employerPlan')).toBe(8_000)
      // IRA: the §108-INDEXED catch-up — 2026 is its first-ever move off $1,000 (a $1,000 here is stale)
      expect(catchUpForAge(49, 'ira')).toBe(0)
      expect(catchUpForAge(50, 'ira')).toBe(1_100)
      expect(catchUpForAge(70, 'ira')).toBe(1_100)
      // HSA: 55+, statutorily FIXED $1,000 (derived from hsa2026, never re-typed — burned/061)
      expect(catchUpForAge(54, 'hsa')).toBe(0)
      expect(catchUpForAge(55, 'hsa')).toBe(1_000)
      expect(catchUpForAge(64, 'hsa')).toBe(1_000)
    })

    it('a NaN/Infinity/negative age throws BEFORE any band comparison (insights 008/010)', () => {
      expect(() => catchUpForAge(Number.NaN, 'employerPlan')).toThrow(/finite/)
      expect(() => catchUpForAge(Number.POSITIVE_INFINITY, 'ira')).toThrow(/finite/)
      expect(() => catchUpForAge(-1, 'hsa')).toThrow(/finite/)
    })

    it('a FRACTIONAL age throws — the integer-band seams (59,60)/(63,64) must never return a silent $0 (insight 020; burned/062; review fold)', () => {
      // Year-end attained age is an integer by definition; 59.5 matches NO band and
      // `?? 0` would return a plausible default indistinguishable from below-50.
      expect(() => catchUpForAge(59.5, 'employerPlan')).toThrow(/INTEGER/)
      expect(() => catchUpForAge(63.5, 'employerPlan')).toThrow(/INTEGER/)
      expect(() => catchUpForAge(54.5, 'hsa')).toThrow(/INTEGER/)
    })

    it('an out-of-human-range age throws — the birth-year-passed-as-age units bug (the 120 terminal-bucket precedent; review fold)', () => {
      // 1975 would otherwise silently resolve to the 64+ tier ($8,000) — wrong but plausible.
      expect(() => catchUpForAge(1_975, 'employerPlan')).toThrow(/120/)
      expect(() => catchUpForAge(121, 'ira')).toThrow(/120/)
      expect(catchUpForAge(120, 'employerPlan'), 'the 120 boundary itself is valid').toBe(8_000)
    })

    it('a runtime stray account kind throws — never silently priced as the last branch (the sequencing.ts exhaustive-switch pattern; review fold)', () => {
      // Simulates untyped persisted/imported data arriving through a cast (the U4 surface).
      expect(() => catchUpForAge(60, 'employer_plan' as unknown as Parameters<typeof catchUpForAge>[1])).toThrow(/unknown account kind/)
    })

    it('the 64+ step-down band IS the regular age-50 tier — a structural identity, not a numeric coincidence (burned/061; review fold)', () => {
      const bands = contributionConstants.employerPlan2026.value.catchUpBands
      expect(bands[bands.length - 1]?.amount, '§414(v)(2)(B)(i): the super band expiring reverts to the regular tier').toBe(bands[0]?.amount)
    })

    it('the IRA limit is pinned + its own note’s cross-axis identity (Notice 2025-67 verbatim; review fold — this was the ONE unpinned C1 figure)', () => {
      const ira = contributionConstants.ira2026.value
      expect(ira.contributionLimit, 'Notice 2025-67: "increased from $7,000 to $7,500" — a stale $7,000 must fail').toBe(7_500)
      expect(
        ira.contributionLimit + (ira.catchUpBands[0]?.amount ?? Number.NaN),
        'the entry’s own note: 50+ total = $8,600 (insight 009 internal cross-axis)',
      ).toBe(8_600)
    })

    it('the §109 super amount is its OWN COLA figure — NEVER 150% × the current-year regular catch-up (the wrong-derivation guard)', () => {
      const plan = contributionConstants.employerPlan2026.value
      const superBand = plan.catchUpBands.find((b) => b.fromAge === 60)
      const regular = plan.catchUpBands.find((b) => b.fromAge === 50)
      expect(superBand?.amount, 'Notice 2025-67: "remains $11,250"').toBe(11_250)
      // 150% × the 2026 regular ($8,000) = $12,000 — the plausible wrong derivation a
      // future maintainer would reach for; the statutory base is 150% × the 2024 $7,500.
      expect(superBand?.amount).not.toBe(1.5 * (regular?.amount ?? 0))
      expect(superBand?.toAge, 'the super band ends at 63 (attain 64 ⇒ regular tier, whole year)').toBe(63)
      expect(superBand?.legalBasis, '§109 provenance carried on the band').toMatch(/SECURE 2\.0 §109/)
    })

    it('employer-plan catch-up bands are contiguous from 50 with an open-ended tail (the step-down is IN the data)', () => {
      const bands = contributionConstants.employerPlan2026.value.catchUpBands
      expect(bands[0]?.fromAge).toBe(50)
      expect(bands[bands.length - 1]?.toAge, 'last band open-ended').toBeNull()
      for (let i = 1; i < bands.length; i++) {
        const prev = bands[i - 1]
        const cur = bands[i]
        expect(prev?.toAge, `band ${i - 1} is closed before a successor`).not.toBeNull()
        expect(cur?.fromAge, `band ${i} contiguous with band ${i - 1}`).toBe((prev?.toAge ?? Number.NaN) + 1)
        expect(Number.isFinite(cur?.amount ?? Number.NaN) && (cur?.amount ?? 0) > 0).toBe(true)
      }
    })

    it('the §415(c) ceiling exceeds deferral + the largest catch-up (internal cross-axis; catch-ups sit ON TOP of 415c — insight 009)', () => {
      const deferral = contributionConstants.employerPlan2026.value.electiveDeferral
      const maxCatchUp = Math.max(
        ...contributionConstants.employerPlan2026.value.catchUpBands.map((b) => b.amount),
      )
      expect(deferral).toBe(24_500)
      expect(contributionConstants.annualAdditions415c2026.value).toBe(72_000)
      expect(
        contributionConstants.annualAdditions415c2026.value,
        '415c leaves employer room above the full employee deferral + catch-up',
      ).toBeGreaterThan(deferral + maxCatchUp)
    })

    it('hsa2026 MOVED from health to contributions intact (one canonical home, burned/057; catch-up cites the STATUTE, not the Rev. Proc.)', () => {
      expect('contributions.hsa2026' in ALL_CONSTANTS).toBe(true)
      expect('health.hsa2026' in ALL_CONSTANTS, 'the old health-table key is gone').toBe(false)
      expect(contributionConstants.hsa2026.value).toEqual({
        contributionSelfOnly: 4_400,
        contributionFamily: 8_750,
        hdhpMinDeductible: { selfOnly: 1_700, family: 3_400 },
        maxOutOfPocket: { selfOnly: 8_500, family: 17_000 },
        catchUp55Plus: 1_000,
      })
      // The $1,000 catch-up appears NOWHERE in Rev. Proc. 2025-19 — it is IRC §223(b)(3)(B),
      // statutorily fixed since 2009. The provenance must say so or the pin pass will look
      // for a COLA figure that does not exist.
      expect(contributionConstants.hsa2026.citation).toMatch(/223\(b\)\(3\)\(B\)/)
    })
  })

  describe('C1 — the federal default age-rating curve (45 CFR 147.102, CMS Appendix I)', () => {
    it('anchors, the 3:1 cap, monotone non-decreasing, contiguous 15..64 (externally-derived, DND/012)', () => {
      const entry = healthConstants.acaAgeRatingCurve
      expect(entry.directionalUntilPinned, 'pinned at the 2026-06-11 P1-exit pass').toBe(false)
      const t = entry.value
      expect(t.childFactorThrough14, 'the post-2018 child band').toBe(0.765)
      expect(t.factors, 'one row per single year of age, 15..64').toHaveLength(50)
      const at = (age: number) => t.factors.find((f) => f.age === age)?.factor
      // Independently-documented anchors (known BEFORE transcription — DND/012):
      expect(at(21), 'the reference age').toBe(1.0)
      expect(at(24), 'ages 21–24 all 1.000').toBe(1.0)
      expect(at(64), 'the terminal adult age').toBe(3.0)
      expect((at(64) ?? 0) / (at(21) ?? Number.NaN), 'EXACTLY the 3:1 statutory cap').toBe(3.0)
      expect(at(50), 'interior anchor (CMS Appendix I)').toBe(1.786)
      expect(at(60), 'interior anchor (CMS Appendix I)').toBe(2.714)
      // Pin the FULL 50-cell vector (the sibling-table pattern — IRMAA tiers + ACA bands
      // pin every interior value for exactly this reason): with only 5 anchors +
      // monotonicity, 45 cells were mutable without any red — e.g. a monotone-but-wrong
      // linear ramp over ages 25–49 (+17% at age 35) passed the suite (the review's
      // adversary-data catch). Transcribed from the research artifact (CMS Appendix I,
      // cross-verified vs the independently-typeset secondary) — NOT from health.ts,
      // keeping the axis independent (DND/012).
      expect(t.factors.map((f) => f.factor)).toEqual([
        0.833, 0.859, 0.885, 0.913, 0.941, 0.970, 1.000, 1.000, 1.000, 1.000,
        1.004, 1.024, 1.048, 1.087, 1.119, 1.135, 1.159, 1.183, 1.198, 1.214,
        1.222, 1.230, 1.238, 1.246, 1.262, 1.278, 1.302, 1.325, 1.357, 1.397,
        1.444, 1.500, 1.563, 1.635, 1.706, 1.786, 1.865, 1.952, 2.040, 2.135,
        2.230, 2.333, 2.437, 2.548, 2.603, 2.714, 2.810, 2.873, 2.952, 3.000,
      ])
      t.factors.forEach((f, i) => {
        expect(Number.isFinite(f.factor) && f.factor > 0, `age ${f.age} finite > 0 (DND/009)`).toBe(true)
        expect(f.age, 'contiguous single-year ages from 15').toBe(15 + i)
        const prev = t.factors[i - 1]
        if (prev) expect(f.factor >= prev.factor, `age ${f.age} monotone non-decreasing`).toBe(true)
      })
      expect(
        t.childFactorThrough14 < (t.factors[0]?.factor ?? 0),
        'the child factor sits below the age-15 factor',
      ).toBe(true)
    })
  })

  describe('Social Security benefit constants — statutory factors (the PIA-driven sub-engine; verify sweep 2026-06-14, POMS primary-confirmed)', () => {
    it('FRA-by-birth-year resolves in MONTHS for both schedules; both cohorts (1969/1972) → 804 (67y0m)', () => {
      // retirement FRA
      expect(fraMonthsForBirthYear(1969, 'retirement')).toBe(804)
      expect(fraMonthsForBirthYear(1972, 'retirement')).toBe(804)
      expect(fraMonthsForBirthYear(1960, 'retirement')).toBe(804)
      expect(fraMonthsForBirthYear(1959, 'retirement'), '66y10m').toBe(802)
      expect(fraMonthsForBirthYear(1955, 'retirement'), '66y2m').toBe(794)
      expect(fraMonthsForBirthYear(1954, 'retirement'), '66y0m').toBe(792)
      expect(fraMonthsForBirthYear(1937, 'retirement'), '65y0m').toBe(780)
      // survivor FRA — a SEPARATE schedule, but coincides at 804 for our 1962+ cohorts
      expect(fraMonthsForBirthYear(1969, 'survivor')).toBe(804)
      expect(fraMonthsForBirthYear(1962, 'survivor')).toBe(804)
      expect(fraMonthsForBirthYear(1961, 'survivor'), 'survivor 66y10m').toBe(802)
      expect(fraMonthsForBirthYear(1957, 'survivor'), 'survivor 66y2m').toBe(794)
      expect(fraMonthsForBirthYear(1956, 'survivor'), 'survivor 66y0m').toBe(792)
      // the schedules genuinely DIFFER in the 1957–1961 band (the do-not-alias landmine)
      expect(fraMonthsForBirthYear(1957, 'survivor')).not.toBe(fraMonthsForBirthYear(1957, 'retirement'))
    })

    it('the FRA lookup fails loud on a non-finite / fractional / out-of-range birth year (insights 008/010/020; burned/062)', () => {
      expect(() => fraMonthsForBirthYear(Number.NaN, 'retirement')).toThrow(/finite/)
      expect(() => fraMonthsForBirthYear(Number.POSITIVE_INFINITY, 'survivor')).toThrow(/finite/)
      expect(() => fraMonthsForBirthYear(1969.5, 'retirement')).toThrow(/INTEGER/)
      expect(() => fraMonthsForBirthYear(1800, 'retirement')).toThrow(/\[1900, 2200\]/)
      expect(() => fraMonthsForBirthYear(69, 'retirement'), 'a two-digit age passed as a year').toThrow(/1900/)
    })

    it('worker + spouse reduction schedules carry the EXACT POMS fractions, differing in segment 1 (5/9 vs 25/36), converging at 5/12', () => {
      const w = socialSecurityConstants.workerReduction.value
      const s = socialSecurityConstants.spouseReduction.value
      expect(w.firstMonths).toBe(36)
      expect(w.firstRate).toEqual({ numerator: 5, denominator: 9 })
      expect(w.laterRate).toEqual({ numerator: 5, denominator: 12 })
      expect(s.firstMonths).toBe(36)
      expect(s.firstRate).toEqual({ numerator: 25, denominator: 36 })
      expect(s.laterRate).toEqual({ numerator: 5, denominator: 12 })
      // DIFFER in segment 1, CONVERGE beyond it (the do-not-blend landmine).
      expect(w.firstRate).not.toEqual(s.firstRate)
      expect(w.laterRate).toEqual(s.laterRate)
      // Internal cross-axis (insight 009): the 36-month first-segment total = the SSA-documented
      // 20% (worker) / 25% (spouse) — a transcription swap fails here.
      const total = (r: { numerator: number; denominator: number }, months: number) =>
        (r.numerator / r.denominator / 100) * months
      expect(total(w.firstRate, w.firstMonths), 'worker 36-mo total = 20%').toBeCloseTo(0.2, 10)
      expect(total(s.firstRate, s.firstMonths), 'spouse 36-mo total = 25%').toBeCloseTo(0.25, 10)
    })

    it('the DRC schedule is 2/3 of 1%/mo (8%/yr), FRA→70, for births 1943+ (+24% at 70/FRA67)', () => {
      const d = socialSecurityConstants.delayedRetirementCredit.value
      expect(d.ratePerMonth).toEqual({ numerator: 2, denominator: 3 })
      expect(d.throughAge).toBe(70)
      expect(d.bornFromYear, 'the flat-8% cohort floor — pre-1943 must fail loud, never default').toBe(1943)
      // the derived month cap = 70×12 − FRA-months = 36 at FRA 67.
      expect(d.throughAge * 12 - fraMonthsForBirthYear(1969, 'retirement'), 'derived DRC month cap at FRA67').toBe(36)
      expect((d.ratePerMonth.numerator / d.ratePerMonth.denominator / 100) * 36, '+24% at 70/FRA67').toBeCloseTo(0.24, 10)
    })

    it('the survivor reduction holds 28.5% (→ .715 floor) from age 60 (50 disabled)', () => {
      const sr = socialSecurityConstants.survivorReduction.value
      expect(sr.earliestAge).toBe(60)
      expect(sr.disabledEarliestAge).toBe(50)
      expect(sr.maxReductionPct, '28.5% max → 71.5% floor').toBe(0.285)
      expect(1 - sr.maxReductionPct).toBeCloseTo(0.715, 10)
    })

    it('RIB-LIM is the 82.5%-of-death-PIA floor; the POMS example reproduces ($374.90 → $309.29 raw)', () => {
      const r = socialSecurityConstants.ribLim.value
      expect(r.floorPctOfDeathPia).toBe(0.825)
      expect(r.floorPctOfDeathPia * 374.9, 'POMS RS 00615.320 example, pre-dime-round').toBeCloseTo(309.2925, 4)
    })

    it('the spousal rate is 50% of PIA and carries the reVerifyEveryBuild watch (the 50→33% proposal)', () => {
      expect(socialSecurityConstants.spousalRate.value).toBe(0.5)
      // This arm pins that the WATCH is DECLARED. What ENFORCES it is
      // `spousalRate.reverify.tripwire.test.ts`, which reds one year after its recorded
      // re-verify date and whose premise is this very flag (flip the flag and that arm reds,
      // so a removal has to be conscious). Neither arm can detect an enactment — they force a
      // human re-verify. Do not reword either into a claim that they catch it at build time.
      // ⚠️ The gate is deliberately CI-only: a runtime withhold would silence the
      // recommendation for essentially every household on a lapsed calendar (consumedConstants
      // pulls this family whenever any person has pia > 0) while the statute sat unchanged.
      expect(
        socialSecurityConstants.spousalRate.reVerifyEveryBuild,
        'the unenacted 50→33% phase-down keeps this figure on the re-verify watch list',
      ).toBe(true)
    })

    it('the deemed-filing cutoff is DOB ≥ Jan 2, 1954 (both cohorts fully subject)', () => {
      expect(socialSecurityConstants.deemedFilingDobCutoff.value).toEqual({ year: 1954, month: 1, day: 2 })
    })

    it('provenance: POMS byte-pulled factors AND both FRA tables are PINNED (the U14 S0 browser pull)', () => {
      for (const key of [
        'workerReduction',
        'spouseReduction',
        'delayedRetirementCredit',
        'survivorReduction',
        'ribLim',
        'spousalRate',
        'deemedFilingDobCutoff',
      ] as const) {
        expect(socialSecurityConstants[key].directionalUntilPinned, `${key} POMS-pinned`).toBe(false)
      }
      // BOTH FRA tables byte-pinned at the U14 S0 pass (2026-07-18): the retirement table
      // against the live nra.html page verbatim; the survivor table against SSA's own
      // Survivor-FRA calculator at every graduated edge (1944/1945/1956/1957–1961/1962 + an
      // interior spot). The citations carry the pull record.
      expect(socialSecurityConstants.fullRetirementAge.directionalUntilPinned, 'FRA byte-pinned vs live nra.html').toBe(false)
      expect(socialSecurityConstants.survivorFullRetirementAge.directionalUntilPinned, 'survivor-FRA byte-pinned vs the live calculator').toBe(false)
    })

    it('the citation LANDMINE corrections are baked in (RS .101 live + .102-is-dead flagged; deemed filing GN 00204.035)', () => {
      expect(socialSecurityConstants.workerReduction.citation, 'cite the live .101').toMatch(/00615\.101/)
      expect(socialSecurityConstants.workerReduction.citation, 'flag .102 as the dead 404').toMatch(/00615\.102 is a DEAD 404/)
      expect(socialSecurityConstants.deemedFilingDobCutoff.citation, 'the RULE is GN 00204.035').toMatch(/GN 00204\.035/)
    })
  })

  // burned/063 single-source gate + burned/027 presence companion: distinctive
  // figures must live in the constants module and NOWHERE else in src/.
  describe('single-source: no overlay number is inlined outside the constants module', () => {
    const DISTINCTIVE = [
      '768700', '512450', '218000', '202.9',
      // the newly-sourced single-bracket + cap-gains edges (distinctive 6-digit figures)
      '640600', '545500', '613700',
      // U3 healthcare: the FPL base + the IRMAA middle/top MAGI thresholds (single-sourced in
      // health.ts). The 400% cliff dollar ($84,600) is now DERIVED (4 × FPL) and the per-tier
      // Part B TOTALS (e.g. $689.90) are derived (base + surcharge) — neither is a stored literal.
      '109000', '15650', '137000', '171000', '205000', '274000', '342000', '410000', '750000',
      // C1 contribution limits (single-sourced in contributions.ts): the 2026 deferral,
      // the §109 super catch-up, the §415(c) ceiling. (Smaller figures like 8,000/1,100
      // are too collision-prone for a substring gate — the shape tests pin them instead.)
      '24500', '11250', '72000',
      // State tax (single-sourced in stateTax.ts): NC single standard deduction, and the
      // NC + PA flat rates. NC MFJ $25,500 is DELIBERATELY NOT here — it collides with an
      // unrelated 0.85×30,000 SS-taxable figure in healthOverlay.test.ts (the exact
      // collision the comment above names); the state-shape test pins it by assertion instead.
      '12750', '0.0399', '0.0307',
    ]
    // Underscore-insensitive so 768_700 and 768700 both match.
    const norm = (s: string) => s.replace(/_/g, '')

    const allTs = walkTs(SRC)
    const rel = (f: string) => relative(SRC, f).split(sep).join('/')
    const inConstants = (f: string) => rel(f).startsWith('engine/constants/')
    // Presence reads only the constants SOURCE — excluding tests, so this file's own
    // DISTINCTIVE array can't make the companion pass vacuously (burned/027).
    const inConstantsSrc = (f: string) => inConstants(f) && !rel(f).includes('__tests__')

    it('presence companion — every distinctive value exists in the constants module', () => {
      const constantsBlob = norm(
        allTs.filter(inConstantsSrc).map((f) => readFileSync(f, 'utf-8')).join('\n'),
      )
      for (const v of DISTINCTIVE) {
        expect(constantsBlob.includes(v), `${v} present in constants module`).toBe(true)
      }
    })

    it('the gate — no distinctive value appears in any src file outside the constants module', () => {
      // DIGIT-BOUNDARY matching, not bare substring (2026-07-10): "11250" firing inside an
      // unrelated 1_125_000 (a band-axis quarter tick) is exactly the collision class the
      // DISTINCTIVE comment already warns about for small figures — a proper sub-number is
      // a false positive, while a standalone re-typed figure still fires. `norm` strips
      // underscores first, so the boundary is checked on the digits as compiled.
      const offenders: string[] = []
      for (const f of allTs) {
        if (inConstants(f)) continue
        const blob = norm(readFileSync(f, 'utf-8'))
        for (const v of DISTINCTIVE) {
          const boundary = new RegExp(`(?<![\\d.])${v.replace('.', '\\.')}(?![\\d.])`)
          if (boundary.test(blob)) offenders.push(`${relative(SRC, f)} inlines ${v}`)
        }
      }
      expect(offenders, 'inlined constants found (read them from @engine/constants instead)').toEqual([])
    })

    // The SECOND C1 table (engine/reference/tickerBlend.ts) gets its own scoped gate —
    // the C1 spec groups it into the same burned/063 assertion, and the main gate's
    // allowlist (engine/constants/ only) cannot recognize the blend module as a
    // canonical home (review fold). Multi-decimal allocation values are the
    // distinctive markers (VBIAX bond 37.67 · VTINX bond 67.79 · VWELX stock 66.62).
    const DISTINCTIVE_BLEND = ['37.67', '67.79', '66.62']
    const inBlendHome = (f: string) => rel(f) === 'engine/reference/tickerBlend.ts'
    // This file carries the marker array itself — the main gate skips it implicitly
    // (it lives inside the allowlisted constants dir); the blend gate must skip it
    // explicitly or the gate flags its own DISTINCTIVE_BLEND literals.
    const isThisGateFile = (f: string) => rel(f) === 'engine/constants/__tests__/constants.shape.test.ts'

    it('presence companion — every distinctive blend value exists in tickerBlend.ts (burned/027)', () => {
      const blob = norm(allTs.filter(inBlendHome).map((f) => readFileSync(f, 'utf-8')).join('\n'))
      for (const v of DISTINCTIVE_BLEND) {
        expect(blob.includes(v), `${v} present in tickerBlend.ts`).toBe(true)
      }
    })

    it('the blend gate — no distinctive blend value appears in any src file outside its home (burned/063)', () => {
      const offenders: string[] = []
      for (const f of allTs) {
        if (inBlendHome(f) || isThisGateFile(f)) continue
        const blob = norm(readFileSync(f, 'utf-8'))
        for (const v of DISTINCTIVE_BLEND) {
          if (blob.includes(v)) offenders.push(`${relative(SRC, f)} inlines ${v}`)
        }
      }
      expect(offenders, 'inlined blend values found (read them from the tickerBlend module instead)').toEqual([])
    })
  })
})
