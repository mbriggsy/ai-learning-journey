/**
 * The post-65 Medicare pricing unit — M2 DND-012 fixture battery (council-ratified
 * 2026-07-10, wf_4c8cd836-b22). The NEWLY-REACHABLE domain the widened intake gate
 * (`intakeMap.medicareOnlyPriced`) opens: a STREAMLESS all-65+ "Medicare-only" household —
 * `healthcareEnabled` WITHOUT the ACA quote pair (no `enrolledPremium`/`slcsp`) — now prices
 * base Part B + the IRMAA surcharge, both routes. The engine could always PRICE this shape
 * (validateParams:895 "the all-65+-at-Y=0 household needs nothing — the per-person Medicare
 * onset machinery suffices"); M1 makes intake HAND it the shape. This battery pins the pricing
 * CORRECTNESS on that shape.
 *
 * DND-012 discipline: every expected number is HAND-DERIVED by independent arithmetic (shown in
 * the comment — table values × counts × 12, threshold compares), never computed via the engine's
 * own formula; every dated figure (base Part B, the tier surcharges, the MFJ thresholds) is READ
 * from `@engine/constants` (the single-source copyGuard forbids re-typing a dated literal —
 * CLAUDE.md; the copyGuard scans this file's whole blob, comments included, so no distinctive
 * threshold/premium digits appear below — they are referenced symbolically off the constant).
 * Each fixture exercises the RUNTIME pricing path (`simulate` / `validateParams` / the tax-overlay
 * decumulation), never a stand-in primitive alone.
 *
 * Scope vs the shipped U11 battery (CITED, deliberately NOT duplicated):
 *   - taxOverlay M4 (taxOverlay.test.ts:2313-2496) already pins, on the SAME streamless shape:
 *     the +2yr lag, the per-index seed read (seed[0]@t0, seed[1]@t1), the cross-65 history
 *     handoff, taxable-SS vs full-SS, THE SURVIVOR MFJ→SINGLE FILING FLIP (2378-2410, born 1955,
 *     no ACA streams, single-thresholded surcharge lands at death+2), and depletion non-accrual.
 *   - healthReadout.test.ts:233-269 pins the survivor crossing in the per-year sink (base halves
 *     immediately, surcharge bites at death+lookback) on the same streamless domain.
 *   - The primitive tier-edge step is pinned at healthOverlay.test.ts:294-298.
 *   This file adds what those do NOT: the seed→history crossing observed in the SIMULATE per-year
 *   `healthReadout` series on the all-65+ shape; the tier-edge < / <= boundary on the RUNTIME path
 *   (not the primitive alone); and the HSA qualified cap growing to `oopMedical` + the (now nonzero)
 *   Medicare cost, plus the containment gate's no-false-fire for a budget-carrying Medicare household.
 *   Deliverable 3 (the survivor flip) is COVERED by the two cited fixtures on the streamless
 *   Medicare-only domain and the pricing path is gate-independent (M1 changes only which params
 *   reach the overlay, never the overlay's IRMAA/filing lag), so no brittle sibling is forced here.
 */
import { describe, it, expect } from 'vitest'
import { simulate, validateParams, type SimOutput } from '@engine/simulate'
import {
  runTaxAwareDecumulation,
  type TaxOverlayConfig,
  type Household,
} from '@engine/taxOverlay'
import { type AccountBuckets } from '@engine/sequencing'
import { irmaa, partB2026, medicareCostTrend } from '@engine/constants'
import { compileBudget } from '@budget/budgetToSpending'
import {
  type BudgetLineItem,
  type MarketAssumptions,
  type OverlayParams,
  type PersonInputs,
  type SimulationParams,
} from '@shared/model'

// ---------------------------------------------------------------------------
// Canonical figures — READ from the constants (never re-typed; the copyGuard).
// ---------------------------------------------------------------------------
const SCHED = irmaa.value
const BASE = partB2026.value.standardPremiumMonthly // base Part B / person / month (the 2026 anchor)
const TREND = medicareCostTrend.value // the sourced Part B cost-trend table (V.E2, deflated horizon-matched)
const ANCHOR_YEAR = TREND.anchorYear // 2026 — read, never hard-coded
const LOOKBACK = SCHED.magiLookbackYears // 2 — read, never hard-coded
/**
 * The REAL (anchor-dollar) monthly base Part B for a CALENDAR year — the Medicare-cost-trend unit's
 * documented horizon-matched deflation applied BY HAND off the sourced constant (DND-012: never
 * `buildPartBPricingSchedule`). The anchor (and any earlier year) clamps to `BASE`; a table year is
 * its nominal V.E2 premium ÷ (1 + cpiNearTermAvg)^(year − anchor), the deflator accumulated
 * iteratively. Every dated figure is READ off the constant (the nominals + the CPI) — no premium
 * literal is re-typed (the copyGuard). Fixtures stay inside the table window (≤ 2035).
 */
const baseRealMonthly = (calendarYear: number): number => {
  if (calendarYear <= ANCHOR_YEAR) return BASE
  const row = TREND.premiums[calendarYear - ANCHOR_YEAR - 1]
  if (row === undefined) throw new Error(`baseRealMonthly: ${calendarYear} is beyond the trend table edge`)
  let deflator = 1
  for (let y = ANCHOR_YEAR + 1; y <= calendarYear; y++) deflator *= 1 + TREND.cpiNearTermAvg
  return row.nominalMonthly / deflator
}
/** Tier `i`'s combined (Part B + Part D) monthly surcharge for a billed CALENDAR year: the Part B
 *  surcharge rides the trended base via the cost-share identity (scale = baseReal(y)/anchor), Part D
 *  does NOT (the hawk-honored disaggregation). Defaults to the anchor (scale 1 = the pre-trend twin). */
const tierSurchargeMonthly = (i: number, calendarYear: number = ANCHOR_YEAR) =>
  SCHED.tiers[i]!.partBSurchargeMonthly * (baseRealMonthly(calendarYear) / BASE) +
  SCHED.tiers[i]!.partDSurchargeMonthly
/** The hand oracle: `count × (baseReal(y) + surcharge(y)) × 12` (medicareAnnualCost's independent
 *  twin), trend-priced for calendar year `y` (default = the 2026 anchor, scale 1 — every anchor-only
 *  fixture keeps its old value). */
const medicareAnnual = (count: number, tierIdx: number | null, calendarYear: number = ANCHOR_YEAR) =>
  count *
  (baseRealMonthly(calendarYear) + (tierIdx === null ? 0 : tierSurchargeMonthly(tierIdx, calendarYear))) *
  12
const T1_MFJ = SCHED.tiers[0]!.mfjMagiThreshold
const T2_MFJ = SCHED.tiers[1]!.mfjMagiThreshold

// ---------------------------------------------------------------------------
// Shared runtime helpers (mirror the M4 battery's idioms).
// ---------------------------------------------------------------------------
const STOCK_W = 0.5
const zeros = (n: number) => Array.from({ length: n }, () => 0)
const flatN = (n: number, v: number) => Array.from({ length: n }, () => v)

const mkHousehold = (owner: number, spouse: number): Household => ({
  startCalendarYear: 2026,
  filing: 'mfj',
  owner: { birthYear: owner },
  spouse: { birthYear: spouse },
})

const dist = (o: SimOutput) => {
  if (o.indeterminate) throw new Error(`unexpected indeterminate: ${o.reason}`)
  if (o.infeasible) throw new Error(`unexpected infeasible: ${o.reason}`)
  return o.distribution
}

/** A DETERMINISTIC market — mean 0, stdDev 0 ⇒ every path's real return is exactly 0 (no growth,
 *  so a taxable bucket with basis = value realizes ZERO gain, and every path is identical ⇒ the
 *  `healthReadout` medians are the arithmetic in the comment, never the engine validating itself). */
const flatZeroMarket: MarketAssumptions = {
  stock: { mean: 0, stdDev: 0 },
  bond: { mean: 0, stdDev: 0 },
  inflation: { mean: 0, stdDev: 0 },
  stockBondCorrelation: 0,
  space: 'simple',
  returnsAreReal: true,
}

// ===========================================================================
// DELIVERABLE 1 — the t=lookback SEED→HISTORY handoff crossing (insight 014's
// crossing-year law) on the streamless all-65+ shape, observed in the SIMULATE
// per-year `healthReadout` medicareBase/irmaaSurcharge series.
//
// The billed IRMAA-MAGI for sim-year t is IRMAA-MAGI[t−LOOKBACK]: for t < LOOKBACK
// it reads irmaaMagiSeed[t] (pre-sim), and at t = LOOKBACK it FIRST reads the
// RECORDED irmaaMagiHistory[0] (taxOverlay.ts:1437). Choose the seed values (BOTH in
// the no-surcharge tier) and the simulated-MAGI (a Roth conversion putting recorded
// IRMAA-MAGI cleanly in MFJ tier 1) in DIFFERENT tiers, so the surcharge CHANGES at
// exactly t = LOOKBACK (=2) — never t=1 (still the flat seed window), never t=3
// (still the flat history window).
// ===========================================================================
describe('post-65 Medicare pricing — the seed→history handoff crossing (simulate healthReadout series)', () => {
  it('the IRMAA surcharge changes at EXACTLY t=lookback: flat through the seed window (t=0,1), then the recorded-history tier from t=2', () => {
    // Both born 1960 ⇒ age 66 at 2026 — Medicare-enrolled from year 0, count = 2 every year
    // (fixed-horizon ⇒ nobody dies; the cohort is 2 throughout). Retired (retirementAge 65),
    // pia 0 ⇒ no SS in IRMAA-MAGI, rmd off (born 1960 ⇒ RMD age 75, far past this horizon).
    const P66: PersonInputs = {
      sex: 'male', currentAge: 66, birthYear: 1960, retirementAge: 65,
      earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 70,
    }
    const P66F: PersonInputs = { ...P66, sex: 'female' }

    // SEED: both pre-sim years land BELOW MFJ tier 1 ⇒ no surcharge at t=0,1.
    const SEED = 60_000
    // The simulated recorded IRMAA-MAGI = the Roth conversion, EXACTLY: taxable-first funding on a
    // basis-=-value bucket in a zero-return market realizes no gain, and pia 0 ⇒ no taxable SS, so
    // the conversion is the only ordinary income. Pick it in MFJ tier 1 (over T1_MFJ, under T2_MFJ).
    const CONV = T1_MFJ + 20_000
    expect(CONV).toBeGreaterThan(T1_MFJ) // provably over MFJ tier-1 threshold …
    expect(CONV).toBeLessThan(T2_MFJ) //   … and under MFJ tier-2 ⇒ cleanly tier 1

    const YEARS = 6
    const params: SimulationParams = {
      initialPortfolio: 5_000_000,
      annualSpendingReal: 40_000,
      stockWeight: STOCK_W,
      people: [P66, P66F],
      survivorSpendingRatio: 0.75,
      drawdownPolicy: 'taxable-first', // fund from taxable (basis = value ⇒ zero realized gain)
      market: flatZeroMarket,
      paths: 4, // all identical under the zero market ⇒ the medians are exact
      maxHorizonYears: YEARS,
      longevityMode: 'fixed-horizon',
      overlay: {
        taxEnabled: true,
        rmdEnabled: false,
        startCalendarYear: 2026,
        buckets: { taxable: 2_000_000, pretax: 3_000_000, roth: 0 },
        initialTaxableBasis: 2_000_000, // basis = value ⇒ IRMAA-MAGI is exactly the conversion
        filing: 'mfj',
        healthcareEnabled: true, // NO enrolledPremium / slcsp — the streamless Medicare-only shape
        irmaaMagiSeed: [SEED, SEED],
        conversions: flatN(YEARS, CONV),
      },
    }
    expect(validateParams(params)).toBeNull() // the all-65+ Medicare-only shape validates (seed covers t<lookback)

    const on = dist(simulate(params, 4242, { healthReadout: true }))
    expect(on.healthReadout).toBeDefined()
    const s = on.healthReadout!.byYear
    expect(s.length).toBe(YEARS)

    // HAND-DERIVED expected series (count = 2 enrolled every year). The Medicare-cost-trend unit made
    // the base per-YEAR (V.E2 deflated horizon-matched), NO LONGER one flat scalar; the IRMAA Part B
    // surcharge rides that trended base (cost-share identity ⇒ scale = baseReal(y)/anchor), Part D does
    // not. Sim year t prices calendar 2026 + t (overlay.startCalendarYear).
    const baseAt = (t: number) => medicareAnnual(2, null, 2026 + t) // 2 × baseReal(2026+t) × 12
    const tier1SurchargeAt = (t: number) => medicareAnnual(2, 0, 2026 + t) - baseAt(t) // the year's scaled surcharge

    // The base is INVARIANT TO THE SURCHARGE (it keys off the year, never the MAGI/tier), but it TRENDS
    // across years — so assert each year's OWN trended base, not one constant value.
    for (let t = 0; t < YEARS; t++) {
      expect(s[t]!.medicareBaseP50, `year ${t} base = 2×baseReal(${2026 + t})×12`).toBeCloseTo(baseAt(t), 4)
      expect(s[t]!.acaNetPremiumP50, `year ${t} ACA never prices (no quote pair)`).toBe(0)
    }

    // THE CROSSING: seed window (t=0,1) reads the sub-tier seed ⇒ 0; from t=lookback the recorded
    // history (=CONV, tier 1) bills ⇒ the tier-1 surcharge, now TREND-SCALED to each billed year. The
    // change FROM ZERO is AT t=lookback, nowhere else.
    expect(s[0]!.irmaaSurchargeP50, 't=0 reads irmaaMagiSeed[0] (sub-tier) ⇒ no surcharge').toBe(0)
    expect(s[1]!.irmaaSurchargeP50, 't=1 reads irmaaMagiSeed[1] (sub-tier) ⇒ no surcharge').toBe(0)
    expect(s[LOOKBACK]!.irmaaSurchargeP50, 't=lookback FIRST reads irmaaMagiHistory[0] ⇒ tier 1 (scaled to its year)').toBeCloseTo(
      tier1SurchargeAt(LOOKBACK),
      4,
    )
    expect(s[LOOKBACK + 1]!.irmaaSurchargeP50, 't=lookback+1 reads history[1] ⇒ still tier 1 (scaled to its year)').toBeCloseTo(
      tier1SurchargeAt(LOOKBACK + 1),
      4,
    )
    // The change is AT the seed→history boundary — not a year early, not a year late.
    expect(s[1]!.irmaaSurchargeP50).not.toBe(s[LOOKBACK]!.irmaaSurchargeP50) // 0 → tier 1 AT t=lookback
    expect(s[0]!.irmaaSurchargeP50).toBe(s[1]!.irmaaSurchargeP50) // flat-ZERO through the seed window (no change at t=1)
    // The TIER does not change after the crossing (history = CONV every year ⇒ tier 1 throughout), but
    // the surcharge now TRENDS UP with the base it rides — so t=lookback+1 sits strictly ABOVE
    // t=lookback (each its own year's scaled tier-1, pinned above); real-flat pricing once had them equal.
    expect(s[LOOKBACK + 1]!.irmaaSurchargeP50).toBeGreaterThan(s[LOOKBACK]!.irmaaSurchargeP50)
    // Direction sanity: the recorded-history year genuinely costs MORE than the seed years.
    expect(s[LOOKBACK]!.irmaaSurchargeP50).toBeGreaterThan(0)
  })
})

// ===========================================================================
// DELIVERABLE 2 — the tier-edge < / <= WITNESS on the RUNTIME path. The surcharge
// contract is STRICT lower-exclusive (`magi > threshold`, healthOverlay.ts:451): AT
// the threshold pays NOTHING, AT+1 dollar pays the tier. Drive the MAGI through the
// SEED (t < lookback ⇒ the bill reads the integer seed directly, no gross-up float
// intervenes — insight 012's integer-threshold domain). This complements the pure
// step-function test (healthOverlay.test.ts:294-298) by proving the boundary end to
// end through medicareAnnualCost's billed total.
// ===========================================================================
describe('post-65 Medicare pricing — the tier-edge < / <= witness on the runtime path (seed-driven, integer, no float)', () => {
  const POOL: AccountBuckets = { taxable: 0, pretax: 2_000_000, roth: 0 } // big pretax ⇒ never depletes
  const POST67: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(1959, 1959) }
  const run = (seed: readonly number[]) =>
    runTaxAwareDecumulation(POOL, zeros(1), zeros(1), [40_000], STOCK_W, 'pre-tax-first', POST67, {
      healthcareEnabled: true,
      irmaaMagiSeed: seed,
    })

  it('AT the integer MFJ tier-1 threshold pays NO surcharge; AT+1 dollar pays the full tier (the strict > contract, billed)', () => {
    // Year 0 bill reads irmaaMagiSeed[0] (lag = 0 − lookback < 0), thresholded on the household's own
    // MFJ filing (pre-sim). Both 67 ⇒ count = 2. Hand-derived annual Medicare cost:
    //   AT   (seed[0] = T1_MFJ):     2 × BASE × 12                          (no surcharge — not exceeded)
    //   AT+1 (seed[0] = T1_MFJ + 1): 2 × (BASE + tier0.combinedSurcharge) × 12
    const at = run([T1_MFJ, 60_000])
    const atPlus1 = run([T1_MFJ + 1, 60_000])
    expect(at.totalMedicareCostReal, 'AT threshold ⇒ base only').toBeCloseTo(medicareAnnual(2, null), 4)
    expect(atPlus1.totalMedicareCostReal, 'AT+1 ⇒ tier-1 surcharge added').toBeCloseTo(medicareAnnual(2, 0), 4)
    // The $1 step is the whole tier — the discontinuity is real and one-directional (cost up).
    expect(atPlus1.totalMedicareCostReal).toBeGreaterThan(at.totalMedicareCostReal)
    expect(atPlus1.totalMedicareCostReal - at.totalMedicareCostReal).toBeCloseTo(
      2 * tierSurchargeMonthly(0) * 12,
      4,
    )
  })
})

// ===========================================================================
// DELIVERABLE 4 — the HSA qualified cap now that medicareCost is NONZERO for the
// all-65+ household. Cap = min(hsaBalance, oopMedical + (owner-65+ ? medicareCost : 0),
// fundingNeed) (healthOverlay.ts:499-501, taxOverlay.ts:1482-1488). Pub 969 exception (4)
// — a 65+ HSA owner may pay Medicare premiums (base Part B + the surcharge) tax-free.
// ===========================================================================
describe('post-65 Medicare pricing — the HSA qualified cap includes the now-nonzero Medicare cost (Pub 969 exception 4)', () => {
  it('the cap = oopMedical + medicareCost on the streamless all-65+ shape (both terms nonzero — the SUM, hand-derived)', () => {
    // Both born 1959 ⇒ 67, count = 2. Low seed ⇒ base only, so medicareCost = 2 × BASE × 12 exactly.
    // OOP = 10,000 (qualified at any age). HSA = 100,000 (covers the whole qualified set); net spend
    // 40,000 > OOP (so the fundingNeed term never binds below the qualified set).
    //   cap = min( 100,000 , 10,000 + 2×BASE×12 , 40,000 + 2×BASE×12 ) = 10,000 + 2×BASE×12
    // The existing owner-65+ fixture (taxOverlay.test.ts:2815) pins cap = medicareCost with OOP = 0;
    // this pins the SUM (both terms live) — the arithmetic identity oopMedical + medicareCost.
    const OOP = 10_000
    const POST67: TaxOverlayConfig = { taxEnabled: true, rmdEnabled: false, household: mkHousehold(1959, 1959) }
    const r = runTaxAwareDecumulation(
      { taxable: 0, pretax: 1_000_000, roth: 0, hsa: 100_000 },
      zeros(1), zeros(1), [40_000], STOCK_W, 'pre-tax-first', POST67,
      { healthcareEnabled: true, irmaaMagiSeed: [60_000, 60_000], oopMedical: [OOP], hsaOwnerIndex: 0 },
    )
    const medicareCost = medicareAnnual(2, null) // 2 × BASE × 12 (base only, low seed)
    expect(r.totalMedicareCostReal, 'the full bill still accrues on its own surface').toBeCloseTo(medicareCost, 6)
    expect(r.totalQualifiedHsaSpendReal, 'the cap is oopMedical + medicareCost — the SUM').toBeCloseTo(
      OOP + medicareCost,
      6,
    )
    // The HSA balance dropped by exactly that qualified spend (zero-return ⇒ no growth).
    expect(r.finalBuckets.hsa).toBeCloseTo(100_000 - (OOP + medicareCost), 6)
  })

  it('the U9a oopMedical containment gate does NOT falsely fire for a budget-carrying all-65+ Medicare household (premiums ride on top, engine-funded)', () => {
    // The gate (simulate.ts:924-949) fences oopMedical ONLY — the floor essentials must dominate the
    // out-of-pocket medical the HSA cap is sized off. The Medicare PREMIUM (≈ 2×BASE×12) is funded on
    // top via fundingNet (taxOverlay.ts:1495), never checked against the budget floor. So a household
    // whose floor covers its OOP validates even though the floor is far below spend-plus-premium.
    const H = 12
    const OOP = 6_000
    const ESSENTIALS = 40_000
    const people: PersonInputs[] = [
      { sex: 'male', currentAge: 70, birthYear: 1956, retirementAge: 65, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 65 },
      { sex: 'female', currentAge: 68, birthYear: 1958, retirementAge: 65, earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 65 },
    ]
    // compileBudget INJECTS the OOP scalar into the sticky floor (single-sourced), so essentials ≥ OOP
    // by construction: sticky[0] = OOP, scalableEssentials[0] = ESSENTIALS, discretionary = 0.
    const budget = compileBudget([{ category: 'food', label: 'Groceries', annualAmountReal: ESSENTIALS, tier: 'essentials', startYear: 0 } as BudgetLineItem], OOP, H)
    const yearZeroFull = budget.sticky[0]! + budget.scalableEssentials[0]! + budget.discretionary[0]!
    const overlay: OverlayParams = {
      taxEnabled: true,
      rmdEnabled: false,
      startCalendarYear: 2026,
      buckets: { taxable: 400_000, pretax: 400_000, roth: 100_000 },
      initialTaxableBasis: 400_000,
      filing: 'mfj',
      healthcareEnabled: true, // Medicare-priced (both 65+) …
      irmaaMagiSeed: [60_000, 60_000], // … so the seed-coverage gate is also satisfied
      oopMedical: flatN(H, OOP),
    }
    const params: SimulationParams = {
      initialPortfolio: 900_000,
      annualSpendingReal: yearZeroFull, // the reconciliation invariant
      stockWeight: STOCK_W,
      people,
      survivorSpendingRatio: 0.75,
      drawdownPolicy: 'proportional',
      market: flatZeroMarket,
      paths: 4,
      maxHorizonYears: H,
      longevityMode: 'fixed-horizon',
      budget,
      overlay,
    }
    // The gate does NOT fire — the Medicare-priced budget household validates cleanly.
    expect(validateParams(params)).toBeNull()

    // NON-VACUOUS (insight 029): the SAME Medicare household with OOP lifted above the floor essentials
    // DOES fire the containment reason — so the passing arm above is a real pass, not a dead gate.
    const overFloor: SimulationParams = {
      ...params,
      overlay: { ...overlay, oopMedical: flatN(H, ESSENTIALS + OOP + 1_000) },
    }
    expect(validateParams(overFloor)).toMatch(/floor-track essentials.*out-of-pocket medical/)
  })
})
