import { describe, it, expect } from 'vitest'
import { stateIncomeTax, type StateTaxYearContext } from '@engine/stateTax'
import { isPricedState, stateRateForYear, stateStandardDeductionFor } from '@engine/constants'

// ===========================================================================
// The PURE state-income-tax primitive — externally-derived DND-012 fixtures. Every expected number
// is HAND-COMPOSED from the state DOR base rule (which channels enter, the SD subtraction, the age
// gate) and the CANONICAL rate/standard-deduction constants — NEVER from stateIncomeTax's own output
// (insight 023: an external panel validates arithmetic, so the rule selection here is independent).
// The distinctive rate/SD tokens (≈0.04 NC, ≈0.03 PA, the single SD) live ONLY in engine/constants
// (the copyGuard gate) — this file reads them through stateRateForYear / stateStandardDeductionFor,
// and every hand-trace in the comments spells the rate as "≈0.04"/"≈0.03", never the bare token.
// ===========================================================================

/** A StateTaxYearContext with every channel zeroed and both members qualified-age (min 67) — each
 *  fixture overrides only the channels it exercises. `state` defaults to NC (overridden per block). */
const mk = (over: Partial<StateTaxYearContext>): StateTaxYearContext => ({
  state: 'NC',
  filing: 'mfj',
  calendarYear: 2026,
  pretaxDistribution: 0,
  conversion: 0,
  ongoingTaxable: 0,
  realizedGain: 0,
  ssBenefitTaxable: 0,
  minLivingAge: 67,
  ...over,
})

// Read the canonical figures ONCE (the independent-path oracle — the DOR-sourced values, never the
// engine's own state formula).
const ncRate = stateRateForYear('NC', 2026)
const paRate = stateRateForYear('PA', 2026)
const ncSdMfj = stateStandardDeductionFor('NC', 'mfj') // 25,500 (MFJ; not a copyGuard-gated token)
const ncSdSingle = stateStandardDeductionFor('NC', 'single') // the single SD (gated → read, never typed)

describe('stateIncomeTax — North Carolina (federal-AGI-derived, flat rate, SS exempt)', () => {
  it('MFJ: (pre-tax distribution − MFJ standard deduction) × the flat rate (DND-012)', () => {
    // pre-tax 60,000 − SD 25,500 = 34,500 taxable; × the NC flat rate (≈0.04) ≈ $1,377.
    expect(stateIncomeTax(mk({ pretaxDistribution: 60_000 }))).toBeCloseTo((60_000 - ncSdMfj) * ncRate, 6)
  })

  it('single filer uses the SMALLER single standard deduction (DND-012)', () => {
    // pre-tax 40,000 − the single SD; × the flat rate. The single SD is HALF the MFJ one — the
    // widow's state cliff (insight 014, the static half; the crossing is proven in the overlay tests).
    expect(stateIncomeTax(mk({ filing: 'single', pretaxDistribution: 40_000 }))).toBeCloseTo(
      (40_000 - ncSdSingle) * ncRate,
      6,
    )
    // The single SD is strictly smaller, so the SAME income owes MORE tax as a survivor.
    expect(ncSdSingle).toBeLessThan(ncSdMfj)
  })

  it('income at or below the standard deduction owes $0 (never a negative tax)', () => {
    expect(stateIncomeTax(mk({ pretaxDistribution: 20_000 }))).toBe(0) // 20,000 < 25,500 SD → base floors at 0
    expect(stateIncomeTax(mk({ pretaxDistribution: ncSdMfj }))).toBe(0) // exactly at the SD → 0
  })

  it('a Roth conversion is fully taxed as ordinary income (the ranking-relevant lever)', () => {
    // conversion 100,000 − SD 25,500 = 74,500 × the flat rate — NO age/source condition, purely linear.
    expect(stateIncomeTax(mk({ conversion: 100_000 }))).toBeCloseTo((100_000 - ncSdMfj) * ncRate, 6)
  })

  it('capital gains are folded into the ORDINARY base at the flat rate (no LTCG preference)', () => {
    // gain 50,000 − SD 25,500 = 24,500 × the flat rate. Federal 0/15/20% preference does NOT carry.
    expect(stateIncomeTax(mk({ realizedGain: 50_000 }))).toBeCloseTo((50_000 - ncSdMfj) * ncRate, 6)
  })

  it('Social Security NEVER enters the NC base (the k-invariant — no torpedo on the state term)', () => {
    // With pre-tax 30,000: base = 30,000 − SD regardless of the SS figure. A huge taxable-SS adds $0.
    const withSS = stateIncomeTax(mk({ pretaxDistribution: 30_000, ssBenefitTaxable: 40_000 }))
    const noSS = stateIncomeTax(mk({ pretaxDistribution: 30_000, ssBenefitTaxable: 0 }))
    expect(withSS).toBe(noSS)
    expect(withSS).toBeCloseTo((30_000 - ncSdMfj) * ncRate, 6)
  })

  it('ongoing other-income + conversion + distribution + gain all ride the one flat base', () => {
    // 30,000 + 20,000 + 10,000 + 40,000 = 100,000 − SD 25,500 = 74,500 × the flat rate.
    const tax = stateIncomeTax(
      mk({ pretaxDistribution: 30_000, conversion: 20_000, ongoingTaxable: 10_000, realizedGain: 40_000 }),
    )
    expect(tax).toBeCloseTo((100_000 - ncSdMfj) * ncRate, 6)
  })

  it('the MFJ→single deduction halving raises the tax on the SAME income by (SD_mfj − SD_single) × rate', () => {
    const base = 80_000
    const mfj = stateIncomeTax(mk({ pretaxDistribution: base, filing: 'mfj' }))
    const single = stateIncomeTax(mk({ pretaxDistribution: base, filing: 'single' }))
    expect(single - mfj).toBeCloseTo((ncSdMfj - ncSdSingle) * ncRate, 6)
  })
})

describe('stateIncomeTax — Pennsylvania (class-based; qualified-age gate on distributions + conversions)', () => {
  it('qualified age (≥59½): only taxable-account income is taxed — withdrawals/conversions/SS are $0', () => {
    // gain 20,000 + ongoing 5,000 = 25,000 × the PA flat rate (≈0.03); NO standard deduction.
    // The pre-tax 60,000, conversion 50,000, and taxable-SS 30,000 all contribute ZERO at qualified age.
    const tax = stateIncomeTax(
      mk({
        state: 'PA',
        minLivingAge: 67,
        pretaxDistribution: 60_000,
        conversion: 50_000,
        ssBenefitTaxable: 30_000,
        realizedGain: 20_000,
        ongoingTaxable: 5_000,
      }),
    )
    expect(tax).toBeCloseTo((20_000 + 5_000) * paRate, 6)
  })

  it('qualified-age: withdrawals / conversions / SS provably contribute ZERO (vary them, tax is unchanged)', () => {
    const base = mk({ state: 'PA', minLivingAge: 67, realizedGain: 20_000, ongoingTaxable: 5_000 })
    const withRetirementIncome = stateIncomeTax({
      ...base,
      pretaxDistribution: 500_000,
      conversion: 300_000,
      ssBenefitTaxable: 90_000,
    })
    expect(withRetirementIncome).toBe(stateIncomeTax(base)) // the huge retirement income adds $0
    expect(stateIncomeTax(base)).toBeCloseTo((20_000 + 5_000) * paRate, 6)
  })

  it('BELOW the qualified age (<59½): the conservative arm taxes the distribution AND the conversion too', () => {
    // minLivingAge 58 → base = pre-tax 60,000 + conversion 50,000 + gain 20,000 + ongoing 5,000 = 135,000
    // (SS STILL exempt) × the PA flat rate.
    const tax = stateIncomeTax(
      mk({
        state: 'PA',
        minLivingAge: 58,
        pretaxDistribution: 60_000,
        conversion: 50_000,
        ssBenefitTaxable: 30_000,
        realizedGain: 20_000,
        ongoingTaxable: 5_000,
      }),
    )
    expect(tax).toBeCloseTo((60_000 + 50_000 + 20_000 + 5_000) * paRate, 6)
  })

  it('under-59½: a conversion is TAXED — 50,000 more conversion costs 50,000 × the flat rate', () => {
    const withConv = stateIncomeTax(mk({ state: 'PA', minLivingAge: 58, conversion: 50_000 }))
    const noConv = stateIncomeTax(mk({ state: 'PA', minLivingAge: 58, conversion: 0 }))
    expect(withConv - noConv).toBeCloseTo(50_000 * paRate, 6)
  })

  it('the age gate flips at the integer-age crossing — 59 is taxed, 60 is exempt (insight 014, static half)', () => {
    const conv = 100_000
    const at59 = stateIncomeTax(mk({ state: 'PA', minLivingAge: 59, conversion: conv }))
    const at60 = stateIncomeTax(mk({ state: 'PA', minLivingAge: 60, conversion: conv }))
    expect(at59).toBeCloseTo(conv * paRate, 6) // 59 < 59½ → taxed
    expect(at60).toBe(0) // 60 ≥ 59½ → exempt
  })

  it('SS is exempt in PA at every age (never enters, either arm)', () => {
    expect(stateIncomeTax(mk({ state: 'PA', minLivingAge: 58, ssBenefitTaxable: 80_000 }))).toBe(0)
    expect(stateIncomeTax(mk({ state: 'PA', minLivingAge: 67, ssBenefitTaxable: 80_000 }))).toBe(0)
  })
})

describe('stateIncomeTax — the NC-vs-PA conversion DELTA (the inversion mechanism the broad brush was rejected for)', () => {
  it('the SAME qualified-age conversion costs NC (taxed) but is $0 in PA — a lever-ranking asymmetry', () => {
    const conv = 100_000
    const nc = stateIncomeTax(mk({ state: 'NC', minLivingAge: 67, conversion: conv }))
    const pa = stateIncomeTax(mk({ state: 'PA', minLivingAge: 67, conversion: conv }))
    // NC taxes the full conversion (minus the SD, since it is the year's only income); PA exempts it.
    expect(nc).toBeCloseTo((conv - ncSdMfj) * ncRate, 6)
    expect(pa).toBe(0)
    // The delta is exactly the NC conversion cost — the reason a flat 50-state brush mis-prices the lever.
    expect(nc - pa).toBeGreaterThan(0)
  })
})

describe('stateIncomeTax — Florida (sourced constitutional $0; structural literal, byte-identical to absent)', () => {
  it('every decumulation channel incurs $0 FL state tax', () => {
    expect(
      stateIncomeTax(
        mk({
          state: 'FL',
          pretaxDistribution: 500_000,
          conversion: 300_000,
          ongoingTaxable: 50_000,
          realizedGain: 200_000,
          ssBenefitTaxable: 90_000,
          minLivingAge: 40,
        }),
      ),
    ).toBe(0)
  })

  it('FL is PRICED (the affirmation flag reads priced), yet its priced value is a structural 0', () => {
    // The honesty demonstration: FL is in the priced roster, so "no state income tax — nothing to add"
    // is an HONEST affirmation (a pinned constitutional $0), not an unbuilt-state omission.
    expect(isPricedState('FL')).toBe(true)
    expect(stateIncomeTax(mk({ state: 'FL', conversion: 1_000_000, minLivingAge: 45 }))).toBe(0)
  })
})
