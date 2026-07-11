/**
 * P3·U11 — the per-year healthcare readout emission, end to end:
 *   - simulate-level: the opt-in observe-only contract (byte-identity + presence companions,
 *     the healthcareEnabled domain gate, the over-cliff fraction, the lifetime Σ pair).
 *   - overlay-level: the healthOut sink's funded-years alignment, and the TWO survivor
 *     crossing-year fixtures insight 014 mandates — the ACA cliff relocates AT the death year
 *     (current-year clock: fplForHousehold(2) → (1)), while the single-filing IRMAA table
 *     first bites exactly `magiLookbackYears` AFTER the death (the lagged clock) even as the
 *     base Part B count halves immediately. Static both-alive / survivor-forever fixtures
 *     cannot see either relocation — only the crossing year can.
 *
 * Expected figures are hand-derived from the published constants (DND 012): FPL 15,650 +
 * 5,500 ⇒ cliff 84,600 (couple) / 62,600 (survivor); the flat 9.96% top band ⇒ PTC at MAGI
 * 70,000 = 12,000 − 6,972 = 5,028 ⇒ net premium 9,972. Tier positions/surcharges are READ
 * from the canonical table (the single-source gate).
 */
import { describe, it, expect } from 'vitest'
import { simulate, type SimOutput } from '../simulate'
import { runTaxAwareDecumulation, type HealthYearSink, type TaxOverlayConfig } from '../taxOverlay'
import { irmaa, partB2026 } from '@engine/constants'
import { validationMarket } from '@engine/reference/methodology'
import type { OverlayParams, PersonInputs, SimulationParams } from '@shared/model'

const MALE_60: PersonInputs = {
  sex: 'male', currentAge: 60, birthYear: 1966, retirementAge: 60,
  earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70,
}
const FEMALE_60: PersonInputs = { ...MALE_60, sex: 'female' }

const MALE_66: PersonInputs = {
  sex: 'male', currentAge: 66, birthYear: 1960, retirementAge: 65,
  earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70,
}
const FEMALE_66: PersonInputs = { ...MALE_66, sex: 'female' }

const flatN = (len: number, val: number): number[] => Array.from({ length: len }, () => val)

const dist = (o: SimOutput) => {
  if (o.indeterminate) throw new Error(`unexpected indeterminate: ${o.reason}`)
  if (o.infeasible) throw new Error(`unexpected infeasible: ${o.reason}`)
  return o.distribution
}

/** A real-dollar pre-65 couple whose ACA window (years 0–4) then Medicare window (5+) both
 *  land inside a 12-year fixed horizon. Proportional drawdown from a 50/50 pool keeps every
 *  path's MAGI comfortably above the 100%-FPL floor and under the 84,600 cliff. */
function healthParams(over: Partial<SimulationParams> = {}, overlayOver: Partial<OverlayParams> = {}): SimulationParams {
  return {
    initialPortfolio: 2_000_000,
    annualSpendingReal: 90_000,
    stockWeight: 0.5,
    people: [MALE_60, FEMALE_60],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    market: validationMarket.value,
    paths: 500,
    maxHorizonYears: 12,
    longevityMode: 'fixed-horizon',
    overlay: {
      taxEnabled: true,
      rmdEnabled: false,
      startCalendarYear: 2026,
      buckets: { taxable: 1_000_000, pretax: 1_000_000, roth: 0 },
      initialTaxableBasis: 1_000_000,
      filing: 'mfj',
      healthcareEnabled: true,
      slcsp: flatN(12, 12_000),
      enrolledPremium: flatN(12, 15_000),
      ...overlayOver,
    },
    ...over,
  }
}

describe('healthReadout — the simulate-level emission (opt-in, observe-only)', () => {
  it('is OBSERVE-ONLY: an opted-in run is byte-identical to an opted-out run on every joint field, and only the opted-in run carries the series', () => {
    const params = healthParams()
    const off = dist(simulate(params, 777))
    const on = dist(simulate(params, 777, { healthReadout: true }))
    expect(on.terminalValuesReal).toEqual(off.terminalValuesReal)
    expect(on.depletionYears).toEqual(off.depletionYears)
    expect(on.survivalFraction).toBe(off.survivalFraction)
    expect(off.healthReadout).toBeUndefined()
    expect(on.healthReadout).toBeDefined()
  })

  it('presence companions: the ACA window shows a real subsidized premium; the Medicare window shows the real base Part B; the anchors are live (insight 029 — never vacuous)', () => {
    const on = dist(simulate(healthParams(), 777, { healthReadout: true }))
    const byYear = on.healthReadout!.byYear
    expect(byYear.length).toBe(12) // fixed horizon, nobody dies — full cohort every year
    const acaYear = byYear[0]! // both 60 — priced
    expect(acaYear.acaPricedFraction).toBeGreaterThan(0.99)
    expect(acaYear.acaNetPremiumP50).toBeGreaterThan(0) // a real premium was paid…
    expect(acaYear.acaNetPremiumP50).toBeLessThan(15_000) // …but a real PTC was retained (under the cliff)
    expect(acaYear.overCliffFraction).toBe(0)
    expect(acaYear.acaMagiP50).toBeGreaterThan(21_150) // above the 100%-FPL floor (couple FPL, hand-derived)
    expect(acaYear.cohortFraction).toBe(1)
    // Year 5 = both 65: ACA stops pricing (no pre-65 member), Medicare starts (biological onset).
    const medicareYear = byYear[5]!
    expect(medicareYear.acaPricedFraction).toBe(0)
    expect(medicareYear.acaNetPremiumP50).toBe(0)
    expect(medicareYear.medicareBaseP50).toBeCloseTo(2 * 12 * partB2026.value.standardPremiumMonthly, 6)
    expect(medicareYear.irmaaSurchargeP50).toBe(0) // spending-driven MAGI sits far under the first MFJ tier
  })

  it('the domain gate: a healthcare-OFF overlay run emits NO series even when opted in (the categorical-door contract), and its lifetime Σs are zero', () => {
    const params = healthParams({}, { healthcareEnabled: false, slcsp: [], enrolledPremium: [] })
    const out = dist(simulate(params, 777, { healthReadout: true }))
    expect(out.healthReadout).toBeUndefined()
    expect(out.taxAware).toBeDefined()
    expect(out.taxAware!.lifetimeNetPremiumReal.every((v) => v === 0)).toBe(true)
    expect(out.taxAware!.lifetimeMedicareCostReal.every((v) => v === 0)).toBe(true)
  })

  it('the lifetime Σ pair rides taxAware for a priced run: every path paid a real premium and (post-65) a real Medicare base', () => {
    const out = dist(simulate(healthParams(), 777, { healthReadout: true }))
    const ta = out.taxAware!
    expect(ta.lifetimeNetPremiumReal.length).toBe(500)
    expect(ta.lifetimeNetPremiumReal.every((v) => Number.isFinite(v) && v > 0)).toBe(true)
    expect(ta.lifetimeMedicareCostReal.every((v) => Number.isFinite(v) && v > 0)).toBe(true)
  })

  it('P3·U11 follow-up — a post-65 Medicare-ONLY run (healthcareEnabled WITHOUT the ACA quote pair) emits the Medicare series: base Part B priced, ACA all-zero', () => {
    // The widened intake gate (intakeMap.medicareOnlyPriced) shape: healthcareEnabled true, NO
    // enrolledPremium/slcsp. wantHealth still fires (the domain gate is healthcareEnabled, not the
    // ACA streams), so the sink emits the medicareBase/irmaaSurcharge series while acaNetPremium is
    // all-zero and acaCliffState -1 (never ACA-priced) on every year. Both spouses 66 ⇒ enrolled
    // from year 0; the seed covers years 0..lookback-1.
    const params: SimulationParams = {
      initialPortfolio: 2_000_000,
      annualSpendingReal: 90_000,
      stockWeight: 0.5,
      people: [MALE_66, FEMALE_66],
      survivorSpendingRatio: 0.75,
      drawdownPolicy: 'proportional',
      market: validationMarket.value,
      paths: 500,
      maxHorizonYears: 6,
      longevityMode: 'fixed-horizon',
      overlay: {
        taxEnabled: true,
        rmdEnabled: false,
        startCalendarYear: 2026,
        buckets: { taxable: 1_000_000, pretax: 1_000_000, roth: 0 },
        initialTaxableBasis: 1_000_000, // gain 0 ⇒ IRMAA-MAGI is spending-driven, far under the MFJ tier
        filing: 'mfj',
        healthcareEnabled: true,
        irmaaMagiSeed: [60_000, 60_000],
      },
    }
    const on = dist(simulate(params, 777, { healthReadout: true }))
    expect(on.healthReadout).toBeDefined()
    const year0 = on.healthReadout!.byYear[0]!
    expect(year0.acaPricedFraction, 'no marketplace quote ⇒ ACA never prices').toBe(0)
    expect(year0.acaNetPremiumP50).toBe(0)
    expect(year0.overCliffFraction, 'acaCliffState -1 ⇒ no over-cliff paths').toBe(0)
    expect(year0.medicareBaseP50, 'both enrolled ⇒ 2 × 12 × base Part B').toBeCloseTo(
      2 * 12 * partB2026.value.standardPremiumMonthly,
      6,
    )
    expect(year0.irmaaSurchargeP50, 'MAGI far under the first MFJ tier').toBe(0)
    // The lifetime Σ pair confirms a real Medicare cost with zero ACA premium.
    expect(on.taxAware!.lifetimeMedicareCostReal.every((v) => Number.isFinite(v) && v > 0)).toBe(true)
    expect(on.taxAware!.lifetimeNetPremiumReal.every((v) => v === 0)).toBe(true)
  })

  it('overCliffFraction reads 1 when a committed conversion pushes every priced path over the cliff — and the full enrolled premium is paid', () => {
    const params = healthParams({}, { conversions: flatN(12, 100_000) })
    const on = dist(simulate(params, 777, { healthReadout: true }))
    const acaYear = on.healthReadout!.byYear[0]!
    expect(acaYear.overCliffFraction).toBe(1) // ACA-MAGI ≥ 100k conversion alone — over 84,600 on every path
    expect(acaYear.acaNetPremiumP50).toBe(15_000) // PTC 0 ⇒ the full enrolled premium
  })
})

// ---------------------------------------------------------------------------
// Overlay-level: the sink's alignment + the two crossing-year relocations.
// ---------------------------------------------------------------------------

const freshSink = (): HealthYearSink => ({
  acaNetPremium: [], medicareBase: [], irmaaSurcharge: [], acaMagi: [], irmaaMagi: [], acaCliffState: [],
})
const zeros = (n: number) => Array.from({ length: n }, () => 0)
const STOCK_W = 0.5

describe('healthReadout — the overlay healthOut sink', () => {
  it('records FUNDED years only (the Σ-accrual sibling rule): a depleting path’s arrays stop before the depletion year', () => {
    // Taxable-only 50k (basis = value ⇒ zero tax) against a 40k spend: year 0 funds, year 1 depletes.
    const cfg: TaxOverlayConfig = {
      taxEnabled: true, rmdEnabled: false,
      household: { startCalendarYear: 2026, filing: 'mfj', owner: { birthYear: 1966 }, spouse: { birthYear: 1966 } },
    }
    const sink = freshSink()
    const res = runTaxAwareDecumulation(
      { taxable: 50_000, pretax: 0, roth: 0 }, zeros(3), zeros(3), [40_000, 40_000, 40_000], STOCK_W,
      'proportional', cfg, { initialTaxableBasis: 50_000, healthOut: sink },
    )
    expect(res.depletionYear).toBe(1)
    expect(sink.acaNetPremium.length).toBe(1) // year 0 only — the depletion year observed nothing
    expect(sink.acaCliffState.length).toBe(1)
  })

  it('the ACA cliff RELOCATES at the death year (insight 014, current-year clock): the same 70k MAGI is under the couple’s 84,600 and over the survivor’s 62,600', () => {
    const cfg: TaxOverlayConfig = {
      taxEnabled: true, rmdEnabled: false,
      household: { startCalendarYear: 2026, filing: 'mfj', owner: { birthYear: 1968 }, spouse: { birthYear: 1968 } },
    }
    const both = { living: [{ birthYear: 1968 }, { birthYear: 1968 }] }
    const one = { living: [{ birthYear: 1968 }] }
    const sink = freshSink()
    runTaxAwareDecumulation(
      { taxable: 1_000_000, pretax: 500_000, roth: 0 }, zeros(4), zeros(4), flatN(4, 40_000), STOCK_W,
      'taxable-first', cfg,
      {
        initialTaxableBasis: 1_000_000, // gain 0 ⇒ ACA-MAGI is exactly the 70k conversion, every year
        healthcareEnabled: true,
        slcsp: flatN(4, 12_000),
        enrolledPremium: flatN(4, 15_000),
        conversions: flatN(4, 70_000),
        householdYears: [both, both, one, one],
        healthOut: sink,
      },
    )
    // Years 0–1 (couple): 70,000 ≤ 84,600 ⇒ priced UNDER; years 2–3 (survivor): 70,000 > 62,600 ⇒ OVER.
    expect(sink.acaCliffState).toEqual([0, 0, 1, 1])
    expect(sink.acaMagi[0]).toBeCloseTo(70_000, 6)
    // Under the cliff: PTC = 12,000 − 9.96% × 70,000 = 5,028 ⇒ net 9,972 (hand-derived, flat top band).
    expect(sink.acaNetPremium[0]).toBeCloseTo(9_972, 2)
    // Over the survivor's cliff: PTC 0 ⇒ the full enrolled premium.
    expect(sink.acaNetPremium[2]).toBeCloseTo(15_000, 6)
  })

  it('the survivor’s IRMAA table bites exactly magiLookbackYears AFTER the death while the base Part B count halves IMMEDIATELY (insight 014, both clocks in one run)', () => {
    const lookback = irmaa.value.magiLookbackYears // 2 — read from the canonical schedule
    const tier1 = irmaa.value.tiers[0]!
    const partB = partB2026.value.standardPremiumMonthly
    const cfg: TaxOverlayConfig = {
      taxEnabled: true, rmdEnabled: false,
      household: { startCalendarYear: 2026, filing: 'mfj', owner: { birthYear: 1958 }, spouse: { birthYear: 1958 } },
    }
    const both = { living: [{ birthYear: 1958 }, { birthYear: 1958 }] }
    const one = { living: [{ birthYear: 1958 }] }
    const sink = freshSink()
    // A constant 120k IRMAA-MAGI: under the MFJ tier-1 threshold, over the SINGLE tier-1 threshold
    // (and under single tier-2) — so the surcharge appears IFF the single table is the billed column.
    runTaxAwareDecumulation(
      { taxable: 1_500_000, pretax: 1_000_000, roth: 0 }, zeros(6), zeros(6), flatN(6, 40_000), STOCK_W,
      'taxable-first', cfg,
      {
        initialTaxableBasis: 1_500_000, // gain 0 ⇒ IRMAA-MAGI is exactly the 120k conversion
        healthcareEnabled: true,
        irmaaMagiSeed: [120_000, 120_000], // both enrolled at year 0 (age 68) — the pre-sim bills, under MFJ tier 1
        conversions: flatN(6, 120_000),
        householdYears: [both, both, one, one, one, one], // the death lands at year 2
        healthOut: sink,
      },
    )
    // The base halves AT the death year (the enrolled count intersects the living set — immediate).
    expect(sink.medicareBase[0]).toBeCloseTo(2 * 12 * partB, 6)
    expect(sink.medicareBase[2]).toBeCloseTo(1 * 12 * partB, 6)
    // The surcharge stays 0 through death+lookback−1 (the billed filing is the LAGGED year's — still MFJ)…
    for (let t = 0; t < 2 + lookback; t++) expect(sink.irmaaSurcharge[t]).toBe(0)
    // …and fires at death+lookback exactly, on the single tier-1 step (per-person × the 1 enrolled survivor).
    const singleTier1Annual = 1 * 12 * (tier1.partBSurchargeMonthly + tier1.partDSurchargeMonthly)
    expect(sink.irmaaSurcharge[2 + lookback]).toBeCloseTo(singleTier1Annual, 6)
    expect(sink.irmaaSurcharge[2 + lookback + 1]).toBeCloseTo(singleTier1Annual, 6)
    // ACA never priced (no pre-65 member) — every year reads the not-priced sentinel.
    expect(sink.acaCliffState).toEqual([-1, -1, -1, -1, -1, -1])
  })
})
