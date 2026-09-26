/**
 * magiLandscape (P3·U11) — the rail-headroom translators + the readout geometry.
 *
 * EXTERNALLY-DERIVED FIXTURES (DND 012): every expected number below is hand-computed from
 * the PUBLISHED figures the constants pin (2025 HHS FPL base 15,650 + 5,500/person; the
 * 400%-FPL cliff = 4.0 × household FPL; Pub 915 MFJ thresholds 32k/44k with the 85% cap;
 * the 2026 CMS IRMAA tiers; Rev. Proc. 2025-32 brackets + deductions; OBBBA senior bonus
 * 6,000/person phasing at 0.06 over 150k MFJ / 75k single) — never by running the module's
 * own formula back at itself.
 */
import { describe, it, expect } from 'vitest'
import {
  acaMagiAtFill,
  irmaaMagiAtFill,
  taxableIncomeAtFill,
  acaCliffFillHeadroom,
  irmaaStepFillHeadroom,
  bracketEdgeFillHeadroom,
  cliffMagiFor,
  nextIrmaaStepLine,
  nextIrmaaStep,
  marginalOrdinaryRate,
  nextBracketEdgeAbove,
  subsidyLossPerDollar,
  type CommittedYearIncome,
} from '../magiLandscape'
import { fplForHousehold, irmaaTierSurchargeMonthly, IRMAA_ANCHOR_SCALES } from '../healthOverlay'
import { acaApplicablePercentage, acaApplicablePercentageEnhanced, irmaa } from '@engine/constants'

const MFJ = 'mfj' as const
const SINGLE = 'single' as const

// The IRMAA tier positions are READ from the canonical table (the single-source gate forbids
// re-typing a pinned dated figure, even here) — the hand-derived arithmetic below derives the
// EXPECTED headrooms/deltas FROM these anchors by an independent path (DND 012).
const TIER1_MFJ = irmaa.value.tiers[0]!.mfjMagiThreshold // 218,000 (2026 CMS)
const TIER2_MFJ = irmaa.value.tiers[1]!.mfjMagiThreshold // 274,000
const TIER1_SINGLE = irmaa.value.tiers[0]!.singleMagiThreshold // 109,000

const ctx = (over: Partial<CommittedYearIncome>): CommittedYearIncome => ({
  rmd: 0,
  conversion: 0,
  ongoingTaxable: 0,
  ssBenefit: 0,
  filing: MFJ,
  count65: 0,
  // In-window default (the sunset unit): every hand-derived fixture in this file was derived
  // WITH the senior bonus priced, so they anchor 2026. Sunset-year arms override explicitly.
  calendarYear: 2026,
  ...over,
})

// Hand-derived: household-of-2 FPL = 15,650 + 5,500 = 21,150; cliff = 4.0 × 21,150 = 84,600.
const FPL_2 = 21_150
const CLIFF_2 = 84_600

describe('the fill-model metrics', () => {
  it('acaMagiAtFill counts the FULL SS benefit and is linear above the RMD (fill below the forced RMD is free)', () => {
    const c = ctx({ rmd: 10_000, conversion: 20_000, ongoingTaxable: 5_000, ssBenefit: 30_000 })
    // f = 0 and f = rmd read identically — the RMD is distributed regardless.
    expect(acaMagiAtFill(c, 0)).toBe(65_000)
    expect(acaMagiAtFill(c, 10_000)).toBe(65_000)
    // one dollar above the RMD adds exactly one ACA-MAGI dollar (full-SS add-back has no phase-in).
    expect(acaMagiAtFill(c, 10_001)).toBe(65_001)
  })

  it('irmaaMagiAtFill counts only the Pub-915 TAXABLE SS portion (hand-worked worksheet: 40k benefit, 140k other → 34,000 taxable, the 85% cap binds)', () => {
    const c = ctx({ rmd: 40_000, conversion: 100_000, ssBenefit: 40_000 })
    // provisional = 140,000 + 20,000 = 160,000 > 44,000 ⇒ min(0.85×40,000, 6,000 + 0.85×116,000) = 34,000.
    expect(irmaaMagiAtFill(c, 0)).toBe(174_000)
    // ACA-MAGI on the same context counts the full benefit: 140,000 + 40,000.
    expect(acaMagiAtFill(c, 0)).toBe(180_000)
  })

  it('taxableIncomeAtFill nets the full deduction stack (single 65+: 16,100 + 2,050 + 6,000 = 24,150 shelters the first 24,150)', () => {
    const c = ctx({ filing: SINGLE, count65: 1 })
    expect(taxableIncomeAtFill(c, 24_150)).toBe(0)
    expect(taxableIncomeAtFill(c, 24_151)).toBeCloseTo(1, 6)
  })
})

describe('acaCliffFillHeadroom (closed form — the linear full-SS metric)', () => {
  it('household-of-2 hand fixture: K = 84,600 − 20,000 − 5,000 − 30,000 = 29,600, and the fill lands EXACTLY on the (inclusive) cliff', () => {
    const c = ctx({ rmd: 10_000, conversion: 20_000, ongoingTaxable: 5_000, ssBenefit: 30_000 })
    const h = acaCliffFillHeadroom(c, CLIFF_2)
    expect(h).toBe(29_600)
    expect(acaMagiAtFill(c, h)).toBe(CLIFF_2) // exactly-at-400% is eligible (IRC §36B inclusive)
  })

  it('committed income alone over the cliff ⇒ 0 (conversion 30k + SS 60k already exceed K)', () => {
    expect(acaCliffFillHeadroom(ctx({ rmd: 10_000, conversion: 30_000, ssBenefit: 60_000 }), CLIFF_2)).toBe(0)
  })

  it('an RMD larger than the room ⇒ 0 (the forced distribution eats the headroom before any discretionary fill)', () => {
    const c = ctx({ rmd: 35_000, conversion: 20_000, ongoingTaxable: 5_000, ssBenefit: 30_000 })
    expect(acaCliffFillHeadroom(c, CLIFF_2)).toBe(0)
    expect(acaMagiAtFill(c, 0)).toBe(90_000) // baseline is genuinely over — consistent
  })

  it('cliffMagiFor derives the cliff from the ACTIVE table (84,600 reverted; null enhanced — no cliff exists)', () => {
    expect(cliffMagiFor(acaApplicablePercentage.value, fplForHousehold(2))).toBe(CLIFF_2)
    expect(cliffMagiFor(acaApplicablePercentageEnhanced.value, fplForHousehold(2))).toBeNull()
  })
})

describe('irmaaStepFillHeadroom (bisection over the Pub-915-coupled metric)', () => {
  it('hand fixture (85% cap bound): baseline 174,000 → next MFJ threshold (tier 1) → headroom = 40,000 (rmd) + 44,000 = 84,000', () => {
    const c = ctx({ rmd: 40_000, conversion: 100_000, ssBenefit: 40_000 })
    const h = irmaaStepFillHeadroom(c, irmaa.value)
    expect(h).toBeCloseTo(84_000, 3)
    expect(irmaaMagiAtFill(c, h)).toBeCloseTo(TIER1_MFJ, 3) // landing AT the threshold is safe (strictly-over fires)
  })

  it('baseline above the frozen top tier ⇒ +Infinity (no next step — the rail does not bind)', () => {
    const c = ctx({ conversion: 800_000 })
    expect(irmaaStepFillHeadroom(c, irmaa.value)).toBe(Number.POSITIVE_INFINITY)
  })

  it('the TOP tier’s line is INCLUSIVE ("at least" — §1395r(i)(3)(C)(i)(III)): the rail stops one whole dollar UNDER it, and the landed MAGI bills tier 4, not the 85 % tier', () => {
    // The joint top line typed from the statute (150 % of $500,000 — DND-012), never read from the table.
    const topLine = 1.5 * 500_000
    // SS-free, no RMD: IRMAA-MAGI = conversion + fill, a slope-1 line — baseline 600,000 sits in tier 4.
    const c = ctx({ conversion: 600_000 })
    const h = irmaaStepFillHeadroom(c, irmaa.value)
    expect(h).toBeCloseTo(topLine - 1 - 600_000, 3)
    expect(irmaaMagiAtFill(c, h)).toBeLessThanOrEqual(topLine - 1)
    // The bill at the landed MAGI is still tier 4 — the rail's promise ("still under the step") is true.
    expect(irmaaTierSurchargeMonthly(irmaaMagiAtFill(c, h), MFJ, irmaa.value, IRMAA_ANCHOR_SCALES)).toBe(
      irmaaTierSurchargeMonthly(irmaaMagiAtFill(c, 0), MFJ, irmaa.value, IRMAA_ANCHOR_SCALES),
    )
  })

  it('baseline exactly AT a threshold ⇒ only the free below-RMD zone remains (crossing fires strictly above)', () => {
    // ord(0) = tier-1 exactly, with no SS: baseline sits exactly on the first MFJ threshold.
    const c = ctx({ rmd: 18_000, conversion: TIER1_MFJ - 18_000 })
    const h = irmaaStepFillHeadroom(c, irmaa.value)
    // fill below the forced RMD adds no MAGI — the headroom is exactly that free zone.
    expect(h).toBeCloseTo(18_000, 3)
    expect(irmaaMagiAtFill(c, h)).toBeCloseTo(TIER1_MFJ, 3)
  })
})

describe('bracketEdgeFillHeadroom (bisection through the deduction stack)', () => {
  it('sheltered single 65+ hand fixture: D = 24,150 flat below the phase-out, edge 12,400 ⇒ headroom 36,550', () => {
    const c = ctx({ filing: SINGLE, count65: 1 })
    const h = bracketEdgeFillHeadroom(c)
    expect(h).toBeCloseTo(36_550, 3)
    expect(taxableIncomeAtFill(c, h)).toBeCloseTo(12_400, 3)
  })

  it('phase-out-band MFJ hand fixture: taxable = 1.12·AGI − 65,500 in the senior-bonus band (EACH spouse’s $6,000 phases separately — Schedule 1-A) ⇒ AGI* = 276,900/1.12, headroom = AGI* − 160,000', () => {
    const c = ctx({ ongoingTaxable: 160_000, count65: 2 })
    // IRS Schedule 1-A lines 32–37: line 35 = 6,000 − 0.06 × (MAGI − 150,000), entered once PER spouse.
    // baseline: D(160,000) = 35,500 + 2 × (6,000 − 0.06×10,000) = 46,300 → taxable 113,700 → next edge 211,400.
    // In the band: taxable = AGI − 35,500 − 2(6,000 − 0.06(AGI − 150,000)) = 1.12·AGI − 65,500.
    // (Until 2026-09-25 the pooled one-$12,000 reading: 1.06·AGI − 56,500, AGI* = 267,900/1.06 — rosy.)
    expect(taxableIncomeAtFill(c, 0)).toBe(113_700)
    const agiStar = 276_900 / 1.12 // ≈ 247,232.14
    expect(6_000 - 0.06 * (agiStar - 150_000), 'each spouse’s bonus is still live at the edge (the band algebra holds)').toBeGreaterThan(0)
    const h = bracketEdgeFillHeadroom(c)
    expect(h).toBeCloseTo(agiStar - 160_000, 2)
    expect(taxableIncomeAtFill(c, h)).toBeCloseTo(211_400, 2)
  })

  it('baseline in the open top band ⇒ +Infinity', () => {
    expect(bracketEdgeFillHeadroom(ctx({ conversion: 900_000 }))).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('the readout geometry', () => {
  it('nextIrmaaStepLine: an EXCLUSIVE line — at-line returns it (the next dollar crosses), lastSafeMagi IS the line; above it, the next tier; above the top, null', () => {
    expect(nextIrmaaStepLine(TIER1_MFJ - 1, MFJ, irmaa.value)).toEqual({ threshold: TIER1_MFJ, lastSafeMagi: TIER1_MFJ })
    expect(nextIrmaaStepLine(TIER1_MFJ, MFJ, irmaa.value)).toEqual({ threshold: TIER1_MFJ, lastSafeMagi: TIER1_MFJ })
    expect(nextIrmaaStepLine(TIER1_MFJ + 1, MFJ, irmaa.value)?.threshold).toBe(TIER2_MFJ)
    expect(nextIrmaaStepLine(800_000, MFJ, irmaa.value)).toBeNull()
    expect(nextIrmaaStepLine(TIER1_SINGLE - 1, SINGLE, irmaa.value)?.threshold).toBe(TIER1_SINGLE)
  })

  it('nextIrmaaStepLine: the INCLUSIVE top line — the threshold stays the statute’s line (the words quote it), lastSafeMagi is one whole dollar under it, and ON the line the step has already fired (null)', () => {
    const topLine = 1.5 * 500_000 // §1395r(i)(3)(C)(ii): 150 % of $500,000 for a joint return (DND-012)
    expect(nextIrmaaStepLine(600_000, MFJ, irmaa.value)).toEqual({ threshold: topLine, lastSafeMagi: topLine - 1 })
    expect(nextIrmaaStepLine(topLine - 1, MFJ, irmaa.value)).toEqual({ threshold: topLine, lastSafeMagi: topLine - 1 })
    expect(nextIrmaaStepLine(topLine, MFJ, irmaa.value)).toBeNull()
    expect(nextIrmaaStepLine(500_000, SINGLE, irmaa.value)).toBeNull()
  })

  it('nextIrmaaStep toward the inclusive top line: the readout names the statute’s line and prices the crossing ON it (tier 4 → 5: 578.0 − 529.6 = 48.4/mo)', () => {
    const topLine = 1.5 * 500_000
    const step = nextIrmaaStep(600_000, MFJ, irmaa.value)
    expect(step?.threshold).toBe(topLine)
    expect(step?.surchargeDeltaMonthlyPerPerson).toBeCloseTo(48.4, 6) // hand-differenced from the CMS 2026 releases
  })

  it('nextIrmaaStep prices the crossing through the ONE canonical tier lookup (tier-1 entry 95.7/mo; tier-1→2 delta 144.7/mo)', () => {
    expect(nextIrmaaStep(100_000, MFJ, irmaa.value)).toEqual({
      threshold: TIER1_MFJ,
      surchargeDeltaMonthlyPerPerson: 95.7, // tier-1 Part B + Part D surcharges, hand-summed from the CMS releases
    })
    const step2 = nextIrmaaStep(TIER1_MFJ + 1, MFJ, irmaa.value)
    expect(step2?.threshold).toBe(TIER2_MFJ)
    expect(step2?.surchargeDeltaMonthlyPerPerson).toBeCloseTo(144.7, 6) // tier-2 minus tier-1 combined surcharges, hand-differenced from the CMS releases
    expect(nextIrmaaStep(800_000, MFJ, irmaa.value)).toBeNull()
  })

  it('marginalOrdinaryRate reads the band the NEXT dollar lands in (exactly-at-edge → the next band)', () => {
    expect(marginalOrdinaryRate(0, MFJ)).toBe(0.1)
    expect(marginalOrdinaryRate(24_799, MFJ)).toBe(0.1)
    expect(marginalOrdinaryRate(24_800, MFJ)).toBe(0.12)
    expect(marginalOrdinaryRate(800_000, MFJ)).toBe(0.37)
    expect(marginalOrdinaryRate(12_400, SINGLE)).toBe(0.12)
  })

  it('nextBracketEdgeAbove: the current band ceiling, or null in the open top band', () => {
    expect(nextBracketEdgeAbove(0, MFJ)).toBe(24_800)
    expect(nextBracketEdgeAbove(113_100, MFJ)).toBe(211_400)
    expect(nextBracketEdgeAbove(800_000, MFJ)).toBeNull()
  })

  it('subsidyLossPerDollar in the flat 9.96% top band: each MAGI dollar costs 9.96¢ of PTC (hand: PTC drops 99.6 over a 1,000 step)', () => {
    // magi 80,000 → 3.78×FPL; magi 81,000 → 3.83×FPL: both inside the flat 3.0–4.0 band.
    expect(subsidyLossPerDollar(80_000, 12_000, FPL_2, acaApplicablePercentage.value)).toBeCloseTo(0.0996, 6)
  })

  it('subsidyLossPerDollar floors at 0 once the credit is exhausted (nothing left to lose)', () => {
    // Tiny benchmark: the contribution share exceeds the SLCSP at both probe points → PTC 0 → 0.
    expect(subsidyLossPerDollar(80_000, 1_000, FPL_2, acaApplicablePercentage.value)).toBe(0)
  })
})
