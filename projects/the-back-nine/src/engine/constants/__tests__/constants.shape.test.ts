import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { ALL_CONSTANTS, taxConstants, healthConstants } from '../index'
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
      expect(entry.directionalUntilPinned, `${key} stays directional until the IRS-primary pin gate`).toBe(true)
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
    expect(entry.directionalUntilPinned, 'directional until the P1-exit pin pass').toBe(true)
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
      expect(b.fplFractionHigh > b.fplFractionLow, `band ${i} width > 0`).toBe(true)
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

  it('the 2025 HHS FPL guidelines reconstruct household sizes + derive the 400% cliff exactly (U3·M1)', () => {
    const entry = healthConstants.federalPovertyGuidelines
    expect(entry.directionalUntilPinned).toBe(true)
    const t = entry.value
    expect(t.guidelineYear, '2025 guidelines drive 2026 coverage').toBe(2025)
    expect(t.base, 'household-of-1 base').toBe(15_650)
    expect(t.perAdditionalPerson, 'per-additional-person increment').toBe(5_500)
    const fpl = (n: number) => t.base + (n - 1) * t.perAdditionalPerson
    expect(fpl(2), 'household-of-2').toBe(21_150)
    // Cross-table identity (insight 009): the 400% cliff dollar is DERIVED, not stored —
    // 4.0 × FPL(2) = 84,600 (the figure the old rounded constant hard-coded).
    expect(fpl(2) * healthConstants.acaApplicablePercentage.value.cliffFplFraction).toBe(84_600)
    expect(Number.isFinite(t.base) && t.base > 0).toBe(true)
    expect(Number.isFinite(t.perAdditionalPerson) && t.perAdditionalPerson > 0).toBe(true)
  })

  it('the IRMAA schedule is monotone, MFJ=2×single for tiers 1–4 (frozen top breaks it), ties to partB2026 (U3·M1, DND/012)', () => {
    const entry = healthConstants.irmaa
    expect(entry.directionalUntilPinned).toBe(true)
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
    expect(taxConstants.seniorBonus.sunsetAfter).toBe(2028)
  })

  it('ALL_CONSTANTS is DERIVED from the tables, never hand-listed (burned/061)', () => {
    const expected = Object.keys(taxConstants).length + Object.keys(healthConstants).length
    expect(Object.keys(ALL_CONSTANTS).length).toBe(expected)
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
      const offenders: string[] = []
      for (const f of allTs) {
        if (inConstants(f)) continue
        const blob = norm(readFileSync(f, 'utf-8'))
        for (const v of DISTINCTIVE) {
          if (blob.includes(v)) offenders.push(`${relative(SRC, f)} inlines ${v}`)
        }
      }
      expect(offenders, 'inlined constants found (read them from @engine/constants instead)').toEqual([])
    })
  })
})
