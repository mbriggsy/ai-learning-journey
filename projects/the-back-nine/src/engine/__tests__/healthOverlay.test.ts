import { describe, it, expect } from 'vitest'
import { acaMagi, irmaaMagi, type MagiComponents } from '@engine/healthOverlay'

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
