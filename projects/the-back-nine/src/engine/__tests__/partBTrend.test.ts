/**
 * The Part-B trend resolver — DND-012 battery (the Medicare-cost-trend sourcing unit; council
 * wf_c673339e-257, build spec `docs/plans/features/medicare-cost-trend-build-spec.md`; research
 * packet `docs/research/medicare-cost-trend.md`). Subjects: `buildPartBPricingSchedule` (shape
 * (c) — V.E2 nominal deflated in-engine horizon-matched, pre-anchor CLAMP, C0-continuous ultimate
 * tail) and `irmaaTierSurchargeMonthly` + `IRMAA_ANCHOR_SCALES` (the hawk-honored DISAGGREGATION).
 *
 * DND-012 discipline (architecture "externally-derived fixtures"): a golden value computed via the
 * engine's own formula proves typing, not correctness — so every expectation is re-derived by an
 * OPERATIONALLY-DISTINCT path:
 *   - the NOMINAL V.E2 premiums are INPUT (packet-verified byte-for-byte; the shape test
 *     `constants.shape.test.ts` pins the full vector verbatim). This file consumes them symbolically
 *     and re-derives the deflation with `Math.pow` — the resolver deflates with an ITERATIVE
 *     cumulative multiply (`deflator *= 1+cpi`). Algebraically equal, operationally distinct (the
 *     historical.test blended-multiplier precedent).
 *   - the real-GROWTH plausibility arm ties the resolver's output to the packet's INDEPENDENTLY
 *     published real-CAGR figures (+2.8%/yr 2026–2031, +3.3% 2026→2035) — never the engine's own
 *     deflation (build-spec ruling #4). It EXCLUDES the two falsified alternatives (real-flat 0%,
 *     and the named trap of deflating the near decade by the 2.4% ULTIMATE CPI → ≥ +3.56%/yr).
 *   - the surcharge tie-out reads the pinned IRMAA constant; the cost-share identity arm re-derives
 *     it from the base × statutory-share (the DND-009 cross-axis the `irmaa` entry documents).
 *
 * copyGuard (burned/063): this file's whole blob is scanned (comments included) for re-typed dated
 * dollar literals. The anchor ($202.90) and every IRMAA threshold/surcharge are read from
 * `@engine/constants`, NEVER typed — the standalone digits appear nowhere below.
 *
 * If any resolver output contradicts a hand derivation here, that is the STOP signal (insight 091 —
 * trace, never fit the test to the code).
 */
import { describe, it, expect } from 'vitest'
import {
  buildPartBPricingSchedule,
  irmaaTierSurchargeMonthly,
  IRMAA_ANCHOR_SCALES,
  type IrmaaSurchargeScales,
} from '@engine/healthOverlay'
import { irmaa, medicareCostTrend, partB2026, type MedicareCostTrendTable } from '@engine/constants'

// ---------------------------------------------------------------------------
// Canonical inputs — READ symbolically (never re-typed; the copyGuard).
// ---------------------------------------------------------------------------
const trend = medicareCostTrend.value
/** The 2026 real-$ anchor. Its ONE canonical home is `partB2026` (burned/057); V.E2's finalized
 *  2026 row IS this value, and the trend table deliberately omits the anchor row (shape test pins
 *  `premiums.some(2026) === false`). At scale 1.0 by definition. */
const anchor = partB2026.value.standardPremiumMonthly
/** The near-term horizon-matched deflator base (Table II.D1, 3.2%/yr avg on the near decade). */
const NEAR = 1 + trend.cpiNearTermAvg
/** The derived ultimate REAL escalator (1+3.8% nominal)/(1+2.4% CPI-W) ≈ 1.0137 — the tail's
 *  per-year growth, C0-spliced onto the 2035 real value. Derived in the CONSUMER, never stored. */
const realUltimate = (1 + trend.ultimateNominalGrowth) / (1 + trend.cpiUltimate)
/** anchorYear + |premiums| = 2026 + 9 = 2035 — the last deflated table year (the splice edge);
 *  asserted here so a table-shape drift fails the setup before any arm runs. */
const tableEdgeYear = trend.anchorYear + trend.premiums.length
if (tableEdgeYear !== 2035) throw new Error(`[test setup] the V.E2 table edge moved (${tableEdgeYear}) — re-derive the splice arms`)

/** The packet-verified nominal V.E2 premium for a calendar year, read from the sourced table
 *  (INPUT — the transcription axis lives in the shape test's full-vector pin). */
const nominalFor = (year: number): number => {
  const row = trend.premiums.find((r) => r.calendarYear === year)
  if (!row) throw new Error(`[test setup] no V.E2 nominal row for ${year}`)
  return row.nominalMonthly
}
/** The INDEPENDENT deflation oracle: nominal ÷ (1 + near-term CPI)^(year − anchor), by `Math.pow`
 *  (operationally distinct from the resolver's iterative product — DND-012). */
const realFor = (year: number): number => nominalFor(year) / Math.pow(NEAR, year - trend.anchorYear)

describe('buildPartBPricingSchedule — shape (c): deflated V.E2, pre-anchor clamp, C0 ultimate tail (DND-012)', () => {
  // Arms 1/2/4 index into one 2026-anchored schedule (calendar 2026 @ t0 … 2036 @ t10).
  const sched = buildPartBPricingSchedule(trend, anchor, 2026, 11)

  it('ARM 1 — the anchor year (calendar 2026, t=0) prices the anchor exactly at scale {1, 1}', () => {
    // y === anchorYear ⇒ baseMonthlyReal = partBBaseMonthlyAnchor verbatim; scale = anchor/anchor = 1.
    // The identity V.E2[2026] == partB2026 == scale-1 is the one-home pin (burned/057).
    expect(sched[0]!.baseMonthlyReal).toBe(anchor)
    expect(sched[0]!.scales).toEqual({ partB: 1, partD: 1 })
  })

  it('ARM 2 — a mid-table year (calendar 2030, t=4): base_real = nominal(2030) ÷ 1.032^4, scale = base_real/anchor', () => {
    // HAND DERIVATION (packet Table V.E2): nominal(2030) = $255.50.
    //   1.032^4 = 1.134276120576  ⇒  base_real = 255.50 / 1.134276120576 ≈ $225.2538 (real 2026-$).
    //   scale.partB = 225.2538 / 202.90 ≈ 1.11017 ; scale.partD held at 1 (disaggregated).
    // Independent path: Math.pow(1.032, 4) vs the resolver's four iterated multiplies.
    const expected2030 = realFor(2030) // nominal(2030) / Math.pow(NEAR, 4)
    expect(sched[4]!.baseMonthlyReal).toBeCloseTo(expected2030, 8)
    expect(sched[4]!.scales.partB).toBeCloseTo(expected2030 / anchor, 10)
    expect(sched[4]!.scales.partD).toBe(1)
    // Sanity: a mid-cliff-decade real premium sits well ABOVE the anchor (real growth is real).
    expect(sched[4]!.baseMonthlyReal).toBeGreaterThan(anchor)
  })

  it('ARM 2b — the resolver output matches the packet\'s INDEPENDENT real-CAGR (build-spec #4; excludes real-flat AND the ultimate-CPI trap)', () => {
    // The packet published, by a SEPARATE method (nominal CAGR ÷ horizon-matched CPI): real growth
    // over CPI ≈ +2.8%/yr (2026→2031) and ≈ +3.3%/yr (2026→2035). Deflating the near decade by the
    // 2.4% ULTIMATE CPI instead yields +3.56–4.10%/yr — "a horizon mismatch the cross-checker ruled
    // against" (the named trap). This arm ties the resolver's OUTPUT to the packet's figures and
    // fences the band so the trap (and real-flat 0%) fall outside — the genuine DND-012 oracle.
    // 2031 is at t=5, 2035 at t=9 in the 2026-anchored schedule; the implied real CAGR off the anchor.
    const cagr2031 = Math.pow(sched[5]!.baseMonthlyReal / anchor, 1 / (2031 - 2026)) - 1
    const cagr2035 = Math.pow(sched[9]!.baseMonthlyReal / anchor, 1 / (2035 - 2026)) - 1
    // 2026→2031 ≈ +2.757% (packet ≈ +2.8%); 2026→2035 ≈ +3.293% (packet ≈ +3.3%).
    expect(cagr2031).toBeGreaterThan(0.025)
    expect(cagr2031).toBeLessThan(0.030)
    expect(cagr2035).toBeGreaterThan(0.030) // > real-flat 0 AND above the low edge
    expect(cagr2035).toBeLessThan(0.035) //   < the ultimate-CPI trap's +3.56% floor
  })

  it('ARM 3 — THE CLAMP (aged-vault domain, insights 076/085): start 2024 → 2024/2025/2026 all price the anchor; 2027 is the first deflated year', () => {
    // An aged vault begins at calendar 2024 (its year-0). Pre-anchor sim years CLAMP to the 2026
    // anchor real premium. CONSERVATIVE by direction: the realized 2024/2025 NOMINAL premiums were
    // $174.70 / $185.00 (packet anchors) — BELOW the $202.90 2026 anchor, and lower still in real
    // terms — so clamping UP to the anchor OVERSTATES the pre-anchor Medicare cost (the honest,
    // survival-understating direction; a downward extrapolation would be the optimistic sin).
    const clamp = buildPartBPricingSchedule(trend, anchor, 2024, 6) // 2024..2029
    expect(clamp[0]!.baseMonthlyReal).toBe(anchor) // 2024 clamps to anchor …
    expect(clamp[1]!.baseMonthlyReal).toBe(anchor) // 2025 clamps to anchor …
    expect(clamp[2]!.baseMonthlyReal).toBe(anchor) // 2026 IS the anchor year (y <= anchorYear)
    expect(clamp[0]!.scales.partB).toBe(1)
    expect(clamp[1]!.scales.partB).toBe(1)
    expect(clamp[2]!.scales.partB).toBe(1)
    // t=3 (2027) is the FIRST deflated table year: nominal(2027) $209.50 / 1.032^1 = $203.0039.
    const expected2027 = realFor(2027)
    expect(clamp[3]!.baseMonthlyReal).toBeCloseTo(expected2027, 8)
    expect(clamp[3]!.baseMonthlyReal).not.toBe(anchor) // the clamp releases at the anchor year
  })

  it('ARM 4 — THE C0 SPLICE: 2035 = the in-table real value exactly; 2036 = 2035_real × (1.038/1.024); NO jump', () => {
    // The tail anchors at the EDGE's own real value (2035), never the anchor year. HAND DERIVATION:
    //   real(2035) = nominal(2035) $360.60 / 1.032^9 (= 1.327752951) ≈ $271.59 (real 2026-$).
    //   real(2036) = real(2035) × (1.038/1.024 ≈ 1.013672) ≈ $275.30 — C0-continuous by construction.
    //   ratio real(2036)/real(2035) = 1.038/1.024 EXACTLY (the splice has no discontinuity).
    const expected2035 = realFor(2035) // nominal(2035) / Math.pow(NEAR, 9)
    expect(sched[9]!.baseMonthlyReal).toBeCloseTo(expected2035, 8)
    // The ratio pins BOTH the escalator AND that the tail anchored at 2035, not the anchor year:
    // had it anchored at $202.90 × realUltimate, 2036/2035 would read ≈ 205.67/271.59 ≈ 0.757, not 1.0137.
    const spliceRatio = sched[10]!.baseMonthlyReal / sched[9]!.baseMonthlyReal
    expect(spliceRatio).toBeCloseTo(realUltimate, 12)
    // And the value itself is the edge's real value escalated once — not the anchor's.
    expect(sched[10]!.baseMonthlyReal).toBeCloseTo(expected2035 * realUltimate, 8)
    expect(sched[10]!.baseMonthlyReal).not.toBeCloseTo(anchor * realUltimate, 2) // the splice-off-anchor mutant
  })

  it('ARM 5 — long-tail sanity (insight 028): a ~2075 horizon (50yr) stays finite/positive; consecutive tail ratios are CONSTANT', () => {
    const tail = buildPartBPricingSchedule(trend, anchor, 2026, 50) // calendar 2026..2075
    expect(tail.length).toBe(50)
    // Finite and strictly positive THROUGHOUT (never Infinity/NaN — the persisted-sentinel / DND-009
    // class; a runaway escalator or a zero-divide would surface here on the far horizon).
    for (let t = 0; t < tail.length; t++) {
      expect(Number.isFinite(tail[t]!.baseMonthlyReal) && tail[t]!.baseMonthlyReal > 0, `year ${2026 + t} finite > 0`).toBe(true)
    }
    // The tail (calendar > 2035, i.e. t >= 10) grows at a CONSTANT ratio = realUltimate. Check
    // consecutive PURE-tail years (t = 11..49, both endpoints in the escalator region; the splice
    // edge 2036/2035 is pinned separately in ARM 4).
    expect(realUltimate).toBeGreaterThan(1) // the ultimate real trend is upward (+1.37%/yr)
    for (let t = 11; t < tail.length; t++) {
      const ratio = tail[t]!.baseMonthlyReal / tail[t - 1]!.baseMonthlyReal
      expect(ratio, `tail ratio at calendar ${2026 + t}`).toBeCloseTo(realUltimate, 12)
    }
  })

  describe('ARM 6 — fail-loud on malformed inputs (burned/062; insight 010)', () => {
    it('a non-integer startCalendarYear throws', () => {
      expect(() => buildPartBPricingSchedule(trend, anchor, 2026.5, 10)).toThrow(/startCalendarYear must be an integer/)
    })
    it('a negative horizon throws', () => {
      expect(() => buildPartBPricingSchedule(trend, anchor, 2026, -1)).toThrow(/horizon must be a non-negative integer/)
    })
    it('a non-finite or zero anchor premium throws', () => {
      expect(() => buildPartBPricingSchedule(trend, Number.NaN, 2026, 10)).toThrow(/anchor premium must be finite > 0/)
      expect(() => buildPartBPricingSchedule(trend, 0, 2026, 10)).toThrow(/anchor premium must be finite > 0/)
      expect(() => buildPartBPricingSchedule(trend, -1, 2026, 10)).toThrow(/anchor premium must be finite > 0/)
    })
    it('a malformed trend table (GAP year OR non-positive nominal) throws with the named message', () => {
      // Doctored MedicareCostTrendTable literals (NOT dated-figure retypes — synthetic values). The
      // macro assumptions are spread from the sourced table; only `premiums` is corrupted.
      const gapTable: MedicareCostTrendTable = {
        ...trend,
        premiums: [
          { calendarYear: 2027, nominalMonthly: 100 },
          { calendarYear: 2029, nominalMonthly: 110 }, // GAP — 2028 skipped ⇒ not ascending-contiguous
        ],
        vintage: 'doctored-gap',
      }
      const negTable: MedicareCostTrendTable = {
        ...trend,
        premiums: [
          { calendarYear: 2027, nominalMonthly: 100 },
          { calendarYear: 2028, nominalMonthly: -1 }, // non-positive nominal ⇒ malformed
        ],
        vintage: 'doctored-neg',
      }
      expect(() => buildPartBPricingSchedule(gapTable, anchor, 2026, 10)).toThrow(/malformed trend table/)
      expect(() => buildPartBPricingSchedule(negTable, anchor, 2026, 10)).toThrow(/malformed trend table/)
    })
  })
})

describe('irmaaTierSurchargeMonthly — the disaggregated trend scales (hawk-honored; DND-012)', () => {
  const SCHED = irmaa.value
  const tiers = SCHED.tiers
  const t0 = tiers[0]! // the first surcharge tier

  it('ARM 7 — scales {partB: 2, partD: 1}: a tier-1 crossing = partB × 2 + partD × 1 (the DISAGGREGATION pin)', () => {
    // A MAGI $1 over the tier-1 single threshold (and provably under tier-2) selects tier 0 exactly.
    const magi = t0.singleMagiThreshold + 1
    expect(magi).toBeGreaterThan(t0.singleMagiThreshold) // over tier-1 …
    expect(magi).toBeLessThan(tiers[1]!.singleMagiThreshold) //   … under tier-2 ⇒ cleanly tier 0
    const scales: IrmaaSurchargeScales = { partB: 2, partD: 1 }
    // EXACT: partB rides ×2, partD stays ×1 (its OWN path — never Part B's ratio). A
    // Part-D-scaled-by-Part-B mutant would compute partB×2 + partD×2 here (off by one partD),
    // reddening this assertion — the disaggregation catch that ARM 8's anchor tie-out (both
    // scales 1) structurally CANNOT see.
    expect(irmaaTierSurchargeMonthly(magi, 'single', SCHED, scales)).toBe(
      t0.partBSurchargeMonthly * 2 + t0.partDSurchargeMonthly,
    )
    // With IRMAA_ANCHOR_SCALES {1, 1} the same crossing yields the U14-era combined surcharge
    // (partB + partD, pre-trend) — the identity element.
    expect(irmaaTierSurchargeMonthly(magi, 'single', SCHED, IRMAA_ANCHOR_SCALES)).toBe(
      t0.partBSurchargeMonthly + t0.partDSurchargeMonthly,
    )
    // NaN/zero/negative scales THROW on EITHER field (finiteness-first; a NaN scale would silently
    // zero/corrupt a surcharge through the multiply — insight 010).
    for (const bad of [
      { partB: Number.NaN, partD: 1 },
      { partB: 1, partD: Number.NaN },
      { partB: 0, partD: 1 },
      { partB: 1, partD: 0 },
      { partB: -1, partD: 1 },
      { partB: 1, partD: -1 },
    ]) {
      expect(() => irmaaTierSurchargeMonthly(magi, 'single', SCHED, bad)).toThrow(/surcharge scales must be finite > 0/)
    }
    // Finiteness-first on the MAGI too (a NaN passes every > compare as false ⇒ phantom no-surcharge).
    expect(() => irmaaTierSurchargeMonthly(Number.NaN, 'single', SCHED, IRMAA_ANCHOR_SCALES)).toThrow(/IRMAA-MAGI must be finite/)
  })

  it('ARM 8 — THE 2026 TIE-OUT (the planted-red mandate): at anchor scale the derived surcharge IS the pinned constant, every tier, both filings', () => {
    // At anchor scale {1, 1} the returned surcharge for a MAGI crossing exactly tier k is
    // partB_k × 1 + partD_k × 1 = the PINNED (partB_k + partD_k). This is the structural tie-out:
    // a mutant that DERIVED the 2026 surcharge (e.g. base×(share/0.25−1)) instead of reading the
    // pinned constant would differ by up to CMS dime-rounding (see ARM 9) and RED here (exact).
    tiers.forEach((tier, k) => {
      const combined = tier.partBSurchargeMonthly + tier.partDSurchargeMonthly
      // Single: MAGI $1 over tier k's single threshold selects exactly tier k (thresholds ascending,
      // gaps >> 1) — the highest tier strictly exceeded.
      expect(irmaaTierSurchargeMonthly(tier.singleMagiThreshold + 1, 'single', SCHED, IRMAA_ANCHOR_SCALES), `single tier ${k}`).toBe(combined)
      // MFJ: the same, on the MFJ threshold column.
      expect(irmaaTierSurchargeMonthly(tier.mfjMagiThreshold + 1, 'mfj', SCHED, IRMAA_ANCHOR_SCALES), `mfj tier ${k}`).toBe(combined)
    })
    // Below the first tier ⇒ no surcharge (the implicit base tier).
    expect(irmaaTierSurchargeMonthly(t0.singleMagiThreshold, 'single', SCHED, IRMAA_ANCHOR_SCALES), 'AT the threshold pays 0 (strict >)').toBe(0)
  })

  it('ARM 9 — THE COST-SHARE IDENTITY (DND-009): each tier\'s Part B surcharge ≈ anchor × (share/0.25 − 1) within CMS dime-rounding', () => {
    // The `irmaa` entry documents: tier k's Part B TOTAL = share_k × the full program cost, where the
    // base is 25% of full cost ⇒ fullCost = anchor/0.25. So the surcharge (total − base) satisfies
    //   surcharge_k = share_k × (anchor/0.25) − anchor = anchor × (share_k/0.25 − 1).
    // This is the identity that JUSTIFIES scaling the surcharge with the trended base (surcharge ∝
    // base). Re-derived here from the base × statutory share — an axis independent of the pinned
    // surcharge digits — and matched within CMS's dime rounding (≤ $0.10). HAND DERIVATION (anchor
    // = $202.90):
    //   tier0 share 0.35 → 202.90 × (1.40 − 1) = $81.16   vs pinned $81.20   (Δ 0.04)
    //   tier1 share 0.50 → 202.90 × (2.00 − 1) = $202.90  vs pinned $202.90  (Δ 0.00)
    //   tier2 share 0.65 → 202.90 × (2.60 − 1) = $324.64  vs pinned $324.60  (Δ 0.04)
    //   tier3 share 0.80 → 202.90 × (3.20 − 1) = $446.38  vs pinned $446.30  (Δ 0.08)
    //   tier4 share 0.85 → 202.90 × (3.40 − 1) = $486.96  vs pinned $487.00  (Δ 0.04)
    const BASE_SHARE = 0.25 // the standard premium is 25% of the full Part B program cost
    const shares = [0.35, 0.5, 0.65, 0.8, 0.85]
    expect(shares).toHaveLength(tiers.length) // the identity covers every tier
    tiers.forEach((tier, k) => {
      const share = shares[k]!
      const identitySurcharge = anchor * (share / BASE_SHARE - 1)
      expect(Math.abs(tier.partBSurchargeMonthly - identitySurcharge), `tier ${k} cost-share Δ ≤ $0.10`).toBeLessThanOrEqual(0.1)
    })
  })
})
