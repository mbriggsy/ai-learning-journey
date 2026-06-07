import { describe, it, expect } from 'vitest'
import {
  acaMagi,
  irmaaMagi,
  solveAcaFundedGross,
  slidingScalePtc,
  applicableContributionFraction,
  fplForHousehold,
  type MagiComponents,
  type FundNet,
} from '@engine/healthOverlay'
import { acaApplicablePercentage, acaApplicablePercentageEnhanced } from '@engine/constants'

// ---------------------------------------------------------------------------
// P1·U3 · M2 — the two MAGI calculators are PROVABLY DISTINCT.
//
// Externally-derived (DND/012): every expected figure below is hand-computed from the
// PUBLISHED definitions, never by re-running the calculator under test.
//   - research §4a (docs/research/pre65-healthcare-aca-hsa-2026-06-04.md, lines 38/43):
//       ACA-MAGI   = AGI + NON-taxable SS  (+ muni interest + excluded foreign income, 0 in MVP)
//                    → the FULL SS benefit effectively counts
//       IRMAA-MAGI = AGI                   (+ muni interest, 0 in MVP) → NO SS add-back
//   - AGI (as the overlay composes it) = nonSSordinary + realizedGain + the TAXABLE portion of SS
//
// The load-bearing consequence the whole pre-65↔post-65 model rests on:
//       ACA-MAGI − IRMAA-MAGI === ssBenefitFull − ssBenefitTaxable === the non-taxable SS portion.
// (Muni interest + excluded foreign income are 0 in the MVP and omitted from MagiComponents — see
//  the healthOverlay.ts statutory-completeness note — so neither appears in these fixtures.)
// ---------------------------------------------------------------------------

describe('healthOverlay — M2: ACA-MAGI and IRMAA-MAGI are two distinct calculators', () => {
  it('85%-capped SS: ACA-MAGI exceeds IRMAA-MAGI by exactly the non-taxable SS portion', () => {
    const c: MagiComponents = {
      nonSSordinary: 40_000,
      realizedGain: 10_000,
      ssBenefitFull: 30_000,
      ssBenefitTaxable: 25_500, // 0.85 × 30,000 — the 85% inclusion cap; non-taxable = 4,500
    }
    expect(acaMagi(c)).toBe(80_000) // 40,000 + 10,000 + 30,000 (FULL SS)
    expect(irmaaMagi(c)).toBe(75_500) // 40,000 + 10,000 + 25,500 (TAXABLE SS)
    expect(acaMagi(c) - irmaaMagi(c)).toBe(4_500) // 30,000 − 25,500 = the non-taxable SS
  })

  it('50%-band SS: a larger non-taxable portion widens the gap by exactly that portion', () => {
    const c: MagiComponents = {
      nonSSordinary: 20_000,
      realizedGain: 0,
      ssBenefitFull: 24_000,
      ssBenefitTaxable: 6_000, // non-taxable = 18,000
    }
    expect(acaMagi(c)).toBe(44_000) // 20,000 + 24,000
    expect(irmaaMagi(c)).toBe(26_000) // 20,000 + 6,000
    expect(acaMagi(c) - irmaaMagi(c)).toBe(18_000)
  })

  it('large realized gain enters BOTH definitions identically (it cancels in the gap; only the SS treatment differs)', () => {
    const c: MagiComponents = {
      nonSSordinary: 30_000,
      realizedGain: 60_000, // dominates the year, but is in AGI for both
      ssBenefitFull: 20_000,
      ssBenefitTaxable: 17_000, // non-taxable = 3,000
    }
    expect(acaMagi(c)).toBe(110_000) // 30,000 + 60,000 + 20,000 (FULL SS)
    expect(irmaaMagi(c)).toBe(107_000) // 30,000 + 60,000 + 17,000 (TAXABLE SS)
    expect(acaMagi(c) - irmaaMagi(c)).toBe(3_000) // gain cancels; only non-taxable SS remains
  })

  it('presence companion (burned/027) — no SS: the two MAGIs COINCIDE (the gap is purely SS-driven, not a baked-in offset)', () => {
    const c: MagiComponents = {
      nonSSordinary: 50_000,
      realizedGain: 5_000,
      ssBenefitFull: 0,
      ssBenefitTaxable: 0,
    }
    expect(acaMagi(c)).toBe(55_000)
    expect(irmaaMagi(c)).toBe(55_000)
    expect(acaMagi(c) - irmaaMagi(c)).toBe(0)
  })

  it('the defining identity holds across varied fixtures (ACA−IRMAA === full SS − taxable SS; IRMAA === AGI)', () => {
    const cases: readonly MagiComponents[] = [
      { nonSSordinary: 40_000, realizedGain: 10_000, ssBenefitFull: 30_000, ssBenefitTaxable: 25_500 },
      { nonSSordinary: 0, realizedGain: 0, ssBenefitFull: 50_000, ssBenefitTaxable: 0 },
      { nonSSordinary: 100_000, realizedGain: 40_000, ssBenefitFull: 12_000, ssBenefitTaxable: 10_200 },
    ]
    for (const c of cases) {
      // The two definitions differ ONLY in their SS treatment (full vs taxable).
      expect(acaMagi(c) - irmaaMagi(c)).toBe(c.ssBenefitFull - c.ssBenefitTaxable)
      // IRMAA-MAGI is exactly AGI = nonSS ordinary + realized gain + TAXABLE SS (no add-back).
      expect(irmaaMagi(c)).toBe(c.nonSSordinary + c.realizedGain + c.ssBenefitTaxable)
      // ACA-MAGI swaps the taxable SS for the FULL SS benefit.
      expect(acaMagi(c)).toBe(c.nonSSordinary + c.realizedGain + c.ssBenefitFull)
    }
  })
})

// ---------------------------------------------------------------------------
// P1·U3 · M3 Slice 2 — the pure pre-65 ACA premium-funding solver.
//
// Externally-derived (DND/012): every expected PTC / net premium below is hand-computed from the
// published §36B formula + the committed constants, never by re-running the solver under test. The
// inner tax gross-up is isolated behind a SYNTHETIC fundNet, so these unit tests exercise the ACA
// bisection + cliff branch + floor logic ALONE (the integrated gross-up lands in Slice 5's fixtures).
// ---------------------------------------------------------------------------

const REVERTED = acaApplicablePercentage.value
const ENHANCED = acaApplicablePercentageEnhanced.value
const FPL2 = fplForHousehold(2) // 21,150 (2025 HHS, household of 2)

// A synthetic inner gross-up: MAGI is a CONSTANT `m` regardless of the funded net (so the ACA
// bisection's behaviour is exactly predictable), and gross === the net it is handed.
const flatMagi =
  (m: number): FundNet =>
  (netTotal) => ({
    gross: netTotal,
    components: { nonSSordinary: m, realizedGain: 0, ssBenefitFull: 0, ssBenefitTaxable: 0 },
  })
// A synthetic inner gross-up where MAGI RISES with the funded net (intercept + slope·net) — so a
// household can sit under the cliff at zero premium yet cross it once the premium is funded.
const linearMagi =
  (intercept: number, slope: number): FundNet =>
  (netTotal) => ({
    gross: netTotal,
    components: { nonSSordinary: intercept + slope * netTotal, realizedGain: 0, ssBenefitFull: 0, ssBenefitTaxable: 0 },
  })

describe('healthOverlay — M3 Slice 2: applicableContributionFraction + slidingScalePtc (pure)', () => {
  it('interpolates the reverted table linearly within a band and snaps to the upper band at an edge', () => {
    // 175% FPL → band [1.5,2.0] 4.19%→6.60%, midpoint → 5.395% (externally derived).
    expect(applicableContributionFraction(1.75, REVERTED)).toBeCloseTo(0.05395, 8)
    // 250% FPL is a band boundary → the [2.5,3.0] band's low, 8.44% (matches the fixture's edge).
    expect(applicableContributionFraction(2.5, REVERTED)).toBeCloseTo(0.0844, 8)
  })

  it('the enhanced table interpolates from 0% and caps at a flat 8.5% in the open top band (no cliff)', () => {
    // 175% FPL enhanced → band [1.5,2.0] 0%→2%, midpoint → 1.0%.
    expect(applicableContributionFraction(1.75, ENHANCED)).toBeCloseTo(0.01, 8)
    // 450% / 1200% FPL enhanced → the open "400% and higher" band → flat 8.5% (a real credit, no cliff).
    expect(applicableContributionFraction(4.5, ENHANCED)).toBeCloseTo(0.085, 8)
    expect(applicableContributionFraction(12, ENHANCED)).toBeCloseTo(0.085, 8)
  })

  it('slidingScalePtc forces PTC=0 below the 100%-FPL floor (the ratified conservative direction)', () => {
    // 85% FPL (MAGI 18,000 vs FPL 21,150) → below floor → 0, even with a generous benchmark.
    expect(slidingScalePtc(18_000, 24_000, FPL2, REVERTED)).toBe(0)
    // Just above the floor → a positive credit (the floor is a hard step, not a smooth fade).
    expect(slidingScalePtc(21_200, 24_000, FPL2, REVERTED)).toBeGreaterThan(0)
  })
})

describe('healthOverlay — M3 Slice 2: solveAcaFundedGross (bisection + cliff branch + floor)', () => {
  it('under-cliff: nets the benchmark credit and funds baseNet + the net premium (the clean fixture)', () => {
    // MAGI 52,875 = 250% FPL, 8.44% → contribution 4,462.65; SLCSP=enrolled=24,000 → PTC 19,537.35,
    // net premium 4,462.65 (externally derived; the under-cliff-clean fixture).
    const r = solveAcaFundedGross(40_000, 24_000, 24_000, FPL2, REVERTED, flatMagi(52_875))
    expect(r.overCliff).toBe(false)
    expect(r.belowFloor).toBe(false)
    expect(r.ptc).toBeCloseTo(19_537.35, 4)
    expect(r.netPremium).toBeCloseTo(4_462.65, 4)
    expect(r.gross).toBeCloseTo(44_462.65, 4) // baseNet 40,000 + net premium
    // Monotonicity (the judge mustFix): the feasible under-cliff gross is ≤ the over-cliff gross
    // (less premium ⇒ less withdrawal). Over-cliff would fund the full enrolled premium.
    expect(r.gross).toBeLessThanOrEqual(40_000 + 24_000)
  })

  it('interpolation through the solver: 175% FPL nets the interpolated 5.395% contribution', () => {
    // MAGI 37,012.50 = 175% FPL → 5.395% → contribution 1,996.824375 (the interpolation fixture).
    const r = solveAcaFundedGross(30_000, 20_000, 20_000, FPL2, REVERTED, flatMagi(37_012.5))
    expect(r.netPremium).toBeCloseTo(1_996.824375, 4)
    expect(r.ptc).toBeCloseTo(18_003.175625, 4)
  })

  it('probe-at-0 short-circuit: a household already over the cliff at zero premium funds the FULL premium (PTC=0)', () => {
    // MAGI 90,000 > 84,600 cliff at every premium → no feasible under-cliff → over-cliff solve.
    const r = solveAcaFundedGross(40_000, 24_000, 24_000, FPL2, REVERTED, flatMagi(90_000))
    expect(r.overCliff).toBe(true)
    expect(r.ptc).toBe(0)
    expect(r.netPremium).toBe(24_000)
    expect(r.gross).toBe(64_000) // baseNet 40,000 + full enrolled premium 24,000
  })

  it('cliff CROSSING during the solve: under-cliff at zero premium, but funding the premium crosses it → over-cliff', () => {
    // MAGI = baseNet + net premium. At baseNet 84,000 the zero-premium MAGI (84,000) is UNDER the
    // 84,600 cliff, but the self-consistent under-cliff solution pushes MAGI over it → the post-
    // bisection feasibility check (ceil-quantized) catches it and falls to the over-cliff solve.
    const r = solveAcaFundedGross(84_000, 24_000, 24_000, FPL2, REVERTED, linearMagi(0, 1))
    expect(r.overCliff).toBe(true)
    expect(r.ptc).toBe(0)
    expect(r.netPremium).toBe(24_000)
    expect(r.gross).toBe(84_000 + 24_000)
  })

  it('below 100% FPL: conservative PTC=0 + the belowFloor disclosure flag (never an optimistic phantom credit)', () => {
    // MAGI 18,000 = 85% FPL → Medicaid territory → PTC 0, full premium, belowFloor flagged.
    const r = solveAcaFundedGross(10_000, 24_000, 24_000, FPL2, REVERTED, flatMagi(18_000))
    expect(r.belowFloor).toBe(true)
    expect(r.overCliff).toBe(false)
    expect(r.ptc).toBe(0)
    expect(r.netPremium).toBeCloseTo(24_000, 4)
    expect(r.gross).toBeCloseTo(34_000, 4)
  })

  it('the ENHANCED regime has NO cliff: a 946%-FPL household still gets a credit capped at 8.5%', () => {
    // MAGI 200,000 = 946% FPL; enhanced open band 8.5% → contribution 17,000; SLCSP=enrolled=30,000
    // → PTC 13,000, net premium 17,000. Over 400% FPL yet subsidised — the toggle's whole point.
    const r = solveAcaFundedGross(50_000, 30_000, 30_000, FPL2, ENHANCED, flatMagi(200_000))
    expect(r.overCliff).toBe(false)
    expect(r.belowFloor).toBe(false)
    expect(r.ptc).toBeCloseTo(13_000, 4)
    expect(r.netPremium).toBeCloseTo(17_000, 4)
    expect(r.gross).toBeCloseTo(67_000, 4)
  })

  it('R19: non-finite inputs + a non-finite MAGI fail LOUD (insight 010 — finiteness before any compare)', () => {
    const good = flatMagi(52_875)
    expect(() => solveAcaFundedGross(NaN, 24_000, 24_000, FPL2, REVERTED, good)).toThrow(/baseNet/)
    expect(() => solveAcaFundedGross(40_000, NaN, 24_000, FPL2, REVERTED, good)).toThrow(/slcsp/)
    expect(() => solveAcaFundedGross(40_000, 24_000, Infinity, FPL2, REVERTED, good)).toThrow(/enrolledPremium/)
    expect(() => solveAcaFundedGross(40_000, 24_000, 24_000, 0, REVERTED, good)).toThrow(/fplDollar/)
    // A NaN MAGI from the inner gross-up must throw, never sail through `magi > cliff` as "under".
    expect(() => solveAcaFundedGross(40_000, 24_000, 24_000, FPL2, REVERTED, flatMagi(NaN))).toThrow(/non-finite ACA-MAGI/)
  })

  // U3-exit code-review pilot (correctness-1): the reverted table's applicable % JUMPS at 133% FPL
  // (2.10→3.14), so the residual netPremium(P)−P is NOT globally monotone — it jumps UP where MAGI
  // crosses 1.33×FPL, admitting TWO self-consistent roots (an under-133% one at 2.10% and an over-133%
  // one at 3.14%). The prior single bisection converged to a bracketing-dependent (here, the more
  // expensive over-133%) root. The segmented solver must find BOTH and return the CHEAPEST feasible —
  // the rational household's equilibrium, the cost-correct direction.
  it('the 133%-FPL applicable-% discontinuity: picks the CHEAPER under-133% equilibrium, not the over-133% one', () => {
    // MAGI(P) = baseNet + P (linearMagi slope 1). FPL(2) = 21,150 ⇒ 133% FPL = 28,129.50. baseNet 27,400
    // ⇒ MAGI spans [27,400, 31,400], straddling 133%. SLCSP = enrolled = 4,000 ⇒ netPremium = applicable%×MAGI.
    //   UNDER-133% root (2.10%): P = 0.021×(27,400+P)/(1) ⇒ 0.979P = 575.40 ⇒ P = 587.7426, MAGI = 27,987.7426.
    //   OVER-133% root (≈3.14%+ interp): a SEPARATE, more expensive self-consistent equilibrium (~888) —
    //   what the un-segmented single bisection converged to. The cheapest feasible is the under-133% one.
    const r = solveAcaFundedGross(27_400, 4_000, 4_000, FPL2, REVERTED, linearMagi(0, 1))
    expect(r.overCliff).toBe(false)
    expect(r.belowFloor).toBe(false)
    // THE regression assertion: the converged MAGI is on the CHEAP (under-133%) side. The prior single
    // bisection landed ABOVE 28,129.50 (the over-133% root) — this fails on the un-segmented solver.
    expect(r.magi).toBeLessThan(1.33 * FPL2)
    expect(r.netPremium).toBeCloseTo(587.7426, 2)
    expect(r.magi).toBeCloseTo(27_987.7426, 1)
    expect(r.gross).toBeCloseTo(27_987.7426, 1) // baseNet + netPremium (linearMagi: gross = the funded net)
    // SELF-CONSISTENCY (a true equilibrium): the net premium implied at the converged MAGI by the
    // independently-tested slidingScalePtc equals the returned net premium.
    const impliedPtc = slidingScalePtc(r.magi, 4_000, FPL2, REVERTED)
    const impliedNet = Math.max(0, 4_000 - Math.min(impliedPtc, 4_000))
    expect(impliedNet).toBeCloseTo(r.netPremium, 4)
  })
})
