/**
 * P3·U9 — the two-track (essentials-floor / full-lifestyle) engine battery.
 *
 * The floor is a GENUINE second decumulation pass (not a bandFan-style observation), so
 * its correctness anchors are (council 2026-07-02, build-gates a–e):
 *   - the DEGENERATE-IDENTITY golden (a single scalable-essentials line == the scalar run,
 *     byte-identical, with FLOOR == FULL both genuinely stressed — insight 029's presence
 *     discipline: an identity on an unstressed surface discriminates nothing);
 *   - the fail-loud oopMedical CONTAINMENT gate (planted-fail + by-construction twin);
 *   - the REACHABLE tier-ordering law (full-success ⊆ floor-success path-for-path, with a
 *     presence companion — the cliff-driven inversion is U10's, dormant without conversions);
 *   - the sticky survivor composition (per-path r-selection at the sampled first death —
 *     insight 040) and its deliberate degenerate-inert boundary;
 *   - a hand-derived external fixture (DND/012 — stdDev 0 makes every path the arithmetic
 *     in the comment, never the engine validating itself).
 */
import { describe, it, expect } from 'vitest'
import { simulate, validateParams, cashTermsForYear } from '@engine/simulate'
import { summarize } from '@engine/confidence'
import { runEngine, fromWire } from '@engine/engineProtocol'
import { runDateSearch, type DateSearchInput } from '@engine/dateSearch'
import { validationMarket } from '@engine/reference/methodology'
import { compileBudget } from '@budget/budgetToSpending'
import {
  NEVER_DEPLETED,
  type BudgetLineItem,
  type MarketAssumptions,
  type OverlayParams,
  type PersonInputs,
  type SimulationParams,
} from '@shared/model'

const line = (over: Partial<BudgetLineItem>): BudgetLineItem => ({
  category: 'food',
  label: 'Groceries',
  annualAmountReal: 48,
  tier: 'essentials',
  startYear: 0,
  ...over,
})

/** A deterministic market: stdDev 0 ⇒ every path's simple real return is exactly `mean`
 *  (exp(ln(1+m) − 0) − 1 = m), whatever normal the shared draw supplies — the DND/012
 *  hand-derivable regime. */
const flatMarket = (mean: number): MarketAssumptions => ({
  stock: { mean, stdDev: 0 },
  bond: { mean, stdDev: 0 },
  inflation: { mean: 0, stdDev: 0 }, // moments are real — informational only
  stockBondCorrelation: 0,
  space: 'simple',
  returnsAreReal: true,
})

/** A stochastic market for the sampled-longevity/monotonicity fixtures. */
const mcMarket: MarketAssumptions = {
  stock: { mean: 0.05, stdDev: 0.17 },
  bond: { mean: 0.018, stdDev: 0.06 },
  inflation: { mean: 0, stdDev: 0 }, // moments are real — informational only
  stockBondCorrelation: 0.1,
  space: 'simple',
  returnsAreReal: true,
}

const retiree = (over: Partial<PersonInputs>): PersonInputs => ({
  sex: 'male',
  currentAge: 70,
  birthYear: 1956,
  retirementAge: 65,
  earnedIncomeReal: 0,
  pia: 0,
  socialSecurityClaimAge: 65,
  ...over,
})

/** A stressed retired couple: sampled longevity ⇒ real survivor phases; spend high enough
 *  that a meaningful share of paths deplete (both tracks genuinely exercised). */
const coupleParams = (over: Partial<SimulationParams>): SimulationParams => ({
  initialPortfolio: 700,
  annualSpendingReal: 48,
  stockWeight: 0.5,
  people: [retiree({}), retiree({ sex: 'female', currentAge: 68, birthYear: 1958 })],
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  market: mcMarket,
  paths: 800,
  maxHorizonYears: 45,
  longevityMode: 'sampled',
  ...over,
})

const resolved = (out: ReturnType<typeof simulate>) => {
  if (out.indeterminate || out.infeasible) throw new Error('expected a resolved run')
  return out
}

describe('U9 · the degenerate-identity golden (build-gate b)', () => {
  // ONE lifelong scalable-essentials line whose amount IS the scalar. The compiled
  // profiles are non-default (insight 029: the compile+expansion path carries real
  // dollars), yet every emitted figure must be byte-identical to the scalar run —
  // including across the survivor ratio-on-total years the sampled twin exercises.
  const H = 45
  const degenerate = compileBudget([line({ annualAmountReal: 48 })], undefined, H)

  it('fixed-horizon: byte-identical to the scalar run; floor == full', () => {
    const base = coupleParams({ longevityMode: 'fixed-horizon', maxHorizonYears: 30 })
    const scalar = resolved(simulate(base, 4242))
    const budgeted = resolved(
      simulate({ ...base, budget: compileBudget([line({ annualAmountReal: 48 })], undefined, 30) }, 4242),
    )
    expect(budgeted.distribution.survivalFraction).toBe(scalar.distribution.survivalFraction)
    expect(budgeted.distribution.terminalValuesReal).toEqual(scalar.distribution.terminalValuesReal)
    expect(budgeted.distribution.depletionYears).toEqual(scalar.distribution.depletionYears)
    // The floor coincides with the full track exactly (essentials ≡ full).
    expect(budgeted.distribution.floor).toBeDefined()
    expect(budgeted.distribution.floor!.survivalFraction).toBe(scalar.distribution.survivalFraction)
    expect(budgeted.distribution.floor!.depletionYears).toEqual(scalar.distribution.depletionYears)
  })

  it('sampled longevity: the survivor ratio-on-total years reproduce byte-identically, and FLOOR == FULL with both tracks GENUINELY STRESSED', () => {
    const base = coupleParams({})
    const scalar = resolved(simulate(base, 90210))
    const budgeted = resolved(simulate({ ...base, budget: degenerate }, 90210))
    expect(budgeted.distribution.survivalFraction).toBe(scalar.distribution.survivalFraction)
    expect(budgeted.distribution.terminalValuesReal).toEqual(scalar.distribution.terminalValuesReal)
    expect(budgeted.distribution.depletionYears).toEqual(scalar.distribution.depletionYears)
    expect(budgeted.distribution.floor!.depletionYears).toEqual(scalar.distribution.depletionYears)
    // Presence companions (insight 029 — the identity must discriminate): the fixture
    // genuinely stresses both tracks (some paths deplete, some survive), so a floor pass
    // that silently ran the wrong vector (e.g. the disc-mis-map that zeroes the floor)
    // could not still pass the equalities above.
    const f = budgeted.distribution.floor!.survivalFraction
    expect(f).toBeGreaterThan(0)
    expect(f).toBeLessThan(1)
    expect(budgeted.distribution.depletionYears.some((d) => d !== NEVER_DEPLETED)).toBe(true)
  })

  it('the degenerate emits a floorReading whose verdict equals the headline verdict', () => {
    const base = coupleParams({})
    const budgeted = resolved(simulate({ ...base, budget: degenerate }, 90210))
    const summary = summarize(budgeted, { ...base, budget: degenerate }, 90210)
    expect(summary.floorReading).toBeDefined()
    expect(summary.floorReading!.outcomeState).toBe(summary.headline.outcomeState)
    expect(summary.floorReading!.xOfTen.value).toBe(summary.headline.xOfTen.value)
  })
})

describe('U9 · the reachable tier-ordering law (build-gate d)', () => {
  it('full-success ⊆ floor-success PATH-FOR-PATH, floor never depletes earlier, and the discretionary gap is genuinely stressed (presence companion)', () => {
    const base = coupleParams({})
    const budget = compileBudget(
      [line({ annualAmountReal: 40 }), line({ tier: 'discretionary', annualAmountReal: 35, label: 'Travel' })],
      undefined,
      45,
    )
    const out = resolved(simulate({ ...base, budget }, 777))
    const full = out.distribution.depletionYears
    const floor = out.distribution.floor!.depletionYears
    expect(floor.length).toBe(full.length)
    let fullFailFloorSurvive = 0
    for (let p = 0; p < full.length; p++) {
      if (full[p] === NEVER_DEPLETED) {
        // Every full-track success is a floor success on the SAME path (less spent on
        // identical draws ⇒ never-lower balances).
        expect(floor[p]).toBe(NEVER_DEPLETED)
      } else if (floor[p] !== NEVER_DEPLETED) {
        // When both deplete, the floor depletes no earlier.
        expect(floor[p]).toBeGreaterThanOrEqual(full[p]!)
      } else {
        fullFailFloorSurvive++
      }
    }
    // burned/027 — the subset assertion is vacuous unless ≥1 path stressed the gap.
    expect(fullFailFloorSurvive).toBeGreaterThan(0)
    expect(out.distribution.floor!.survivalFraction).toBeGreaterThan(out.distribution.survivalFraction)
  })
})

describe('U9 · the sticky survivor composition (per-path r-selection — insight 040)', () => {
  // Direct seam test on cashTermsForYear: the ratio applies to scalable components only,
  // realized off the death timeline, never baked into the profiles.
  const budget = compileBudget(
    [
      line({ category: 'housing', annualAmountReal: 30 }), // sticky
      line({ category: 'food', annualAmountReal: 20 }), // scalable essentials
      line({ tier: 'discretionary', annualAmountReal: 10, label: 'Fun' }), // scalable surplus
    ],
    undefined,
    45,
  )
  const params = coupleParams({ budget })
  const offsets = params.people.map((p) => ({
    retire: p.retirementAge - p.currentAge,
    claim: p.socialSecurityClaimAge - p.currentAge,
    earnedIncomeReal: 0,
    socialSecurityReal: 0,
    spousalExcessAnnual: 0,
  }))

  it('both alive: full = sticky + scalableEss + disc; floor = sticky + scalableEss', () => {
    const cash = cashTermsForYear(5, params, offsets, [50, 50], 0)
    expect(cash.net).toBe(60)
    expect(cash.netFloor).toBe(50)
  })

  it('survivor year: sticky does NOT scale; scalable essentials and discretionary do', () => {
    const cash = cashTermsForYear(5, params, offsets, [3, 50], 0) // first spouse died at t=3
    expect(cash.netFloor).toBe(30 + 0.75 * 20) // 45 — the mortgage does not shrink
    expect(cash.net).toBe(30 + 0.75 * 20 + 0.75 * 10) // 52.5
  })

  it('an OTHER-essentials line errs sticky at the simulate level: weakly LOWER survival than the same dollars as food (the conservative direction, never optimistic)', () => {
    const H = 45
    const sticky = compileBudget([line({ category: 'other', annualAmountReal: 48 })], undefined, H)
    const scalable = compileBudget([line({ category: 'food', annualAmountReal: 48 })], undefined, H)
    const base = coupleParams({})
    const outSticky = resolved(simulate({ ...base, budget: sticky }, 90210))
    const outScalable = resolved(simulate({ ...base, budget: scalable }, 90210))
    // Identical while both live; survivor years spend MORE under sticky ⇒ never higher survival.
    expect(outSticky.distribution.floor!.survivalFraction).toBeLessThanOrEqual(
      outScalable.distribution.floor!.survivalFraction,
    )
    // Presence companion: this fixture's survivor phases genuinely separate the two
    // (equality would mean the sticky arm was never exercised).
    expect(outSticky.distribution.floor!.survivalFraction).toBeLessThan(
      outScalable.distribution.floor!.survivalFraction,
    )
  })
})

describe('U9 · the DND/012 hand-derived external fixture (stdDev 0)', () => {
  // Real return EXACTLY 0%/yr (flatMarket(0)), fixed horizon 30, spine (no overlay),
  // portfolio 1000. Budget: essentials 60 lifelong (scalable) + discretionary 40 active
  // k ∈ [0, 4]. Withdraw-then-grow with r = 0 ⇒ balance after year t = 1000 − Σ w.
  //   FULL:  w = 100 for t ≤ 4, then 60. Σ through t=12 = 5·100 + 8·60 = 980 (alive);
  //          t=13 ⇒ 1040 ≥ 1000 ⇒ depletes at year 13.
  //   FLOOR: w = 60 flat. 60·(t+1) ≥ 1000 ⇔ t+1 ≥ 16.67 ⇒ depletes at year 16 (1020).
  // Derived by the arithmetic above — never read back from the engine (DND/012).
  it('every path depletes at the hand-computed years: full 13, floor 16', () => {
    const budget = compileBudget(
      [
        line({ annualAmountReal: 60 }),
        line({ tier: 'discretionary', annualAmountReal: 40, startYear: 0, endYear: 4, label: 'Go-go years' }),
      ],
      undefined,
      30,
    )
    const params = coupleParams({
      initialPortfolio: 1000,
      annualSpendingReal: 100, // the year-0 full total (the reconciliation figure)
      market: flatMarket(0),
      longevityMode: 'fixed-horizon',
      maxHorizonYears: 30,
      paths: 50,
      budget,
    })
    const out = resolved(simulate(params, 1))
    expect(out.distribution.depletionYears.every((d) => d === 13)).toBe(true)
    expect(out.distribution.floor!.depletionYears.every((d) => d === 16)).toBe(true)
    expect(out.distribution.survivalFraction).toBe(0)
    expect(out.distribution.floor!.survivalFraction).toBe(0)
  })

  it('the time-box is load-bearing: extending the discretionary window moves the FULL failure year earlier and leaves the floor untouched', () => {
    const mk = (endYear: number) =>
      compileBudget(
        [
          line({ annualAmountReal: 60 }),
          line({ tier: 'discretionary', annualAmountReal: 40, startYear: 0, endYear, label: 'Go-go years' }),
        ],
        undefined,
        30,
      )
    const base = coupleParams({
      initialPortfolio: 1000,
      annualSpendingReal: 100,
      market: flatMarket(0),
      longevityMode: 'fixed-horizon',
      maxHorizonYears: 30,
      paths: 10,
    })
    const short = resolved(simulate({ ...base, budget: mk(4) }, 1))
    const long = resolved(simulate({ ...base, budget: mk(9) }, 1))
    // Longer window: Σ through t=9 = 1000 ⇒ depletes at year 9 (vs 13 above).
    expect(long.distribution.depletionYears[0]).toBe(9)
    expect(short.distribution.depletionYears[0]).toBe(13)
    expect(long.distribution.floor!.depletionYears[0]).toBe(16)
    expect(short.distribution.floor!.depletionYears[0]).toBe(16)
  })
})

describe('U9 · the containment gate (build-gate a — fail-loud, never the silent clamp)', () => {
  const H = 30
  const people = [retiree({}), retiree({ sex: 'female', currentAge: 68, birthYear: 1958 })]
  const overlayBase = {
    taxEnabled: true,
    rmdEnabled: true,
    startCalendarYear: 2026,
    filing: 'mfj' as const,
    buckets: { taxable: 500, pretax: 400, roth: 100 },
    initialTaxableBasis: 400,
  }
  const withOverlay = (oop: number | undefined, budget: ReturnType<typeof compileBudget>): SimulationParams =>
    coupleParams({
      people,
      initialPortfolio: 1000,
      longevityMode: 'fixed-horizon',
      maxHorizonYears: H,
      budget,
      overlay: {
        ...overlayBase,
        ...(oop !== undefined ? { oopMedical: new Array<number>(H).fill(oop) } : {}),
      },
    })

  it('a budget whose floor essentials dip below oopMedical[t] is REJECTED with the named containment reason', () => {
    // Compiled WITHOUT the injection (the planted fail): essentials 5 < oop 7.
    const starved = compileBudget([line({ annualAmountReal: 5 })], undefined, H)
    const reason = validateParams(withOverlay(7, starved))
    expect(reason).toMatch(/floor-track essentials.*out-of-pocket medical/)
  })

  it('the compile-injection twin passes BY CONSTRUCTION (the same intake scalar feeds both sides)', () => {
    const injected = compileBudget([line({ annualAmountReal: 5 })], 7, H)
    expect(validateParams(withOverlay(7, injected))).toBeNull()
  })

  it('worst-case is the SURVIVOR year: a scalable-only essentials budget that covers oop both-alive can still dip below it at the ratio — rejected', () => {
    // essentials 10 (scalable food), ratio 0.75 ⇒ survivor-year essentials 7.5 < oop 8.
    const scalableOnly = compileBudget([line({ annualAmountReal: 10 })], undefined, H)
    const reason = validateParams(withOverlay(8, scalableOnly))
    expect(reason).toMatch(/floor-track essentials/)
  })

  it('a negative/non-finite profile entry is rejected as the budget-profile gate (domain, calm indeterminate)', () => {
    const bad = compileBudget([line({ annualAmountReal: -100 })], undefined, H)
    expect(validateParams(coupleParams({ budget: bad }))).toMatch(/budget profile invalid/)
  })
})

describe('U9 · the anchor (household work-stop) edges', () => {
  it('a mixed household anchors at the WORKING spouse’s offset: a survivor year before the planned stop reads the k=0 profile', () => {
    // Spouse 1 retired; spouse 2 works until t=6 (retirementAge 66, currentAge 60).
    const people = [
      retiree({}),
      retiree({ sex: 'female', currentAge: 60, birthYear: 1966, retirementAge: 66, earnedIncomeReal: 0 }),
    ]
    // A budget whose k=0 year is expensive and k≥3 cheap — if the anchor were wrongly 0,
    // t=4 would read the CHEAP profile; anchored at 6 it must read k=0 (the clamp).
    const budget = compileBudget(
      [line({ annualAmountReal: 80, startYear: 0, endYear: 2 }), line({ annualAmountReal: 20, startYear: 3 })],
      undefined,
      45,
    )
    const params = coupleParams({ people, budget })
    const offsets = people.map((p) => ({
      retire: p.retirementAge - p.currentAge,
      claim: p.socialSecurityClaimAge - p.currentAge,
      earnedIncomeReal: p.earnedIncomeReal,
      socialSecurityReal: 0,
      spousalExcessAnnual: 0,
    }))
    // The worker died at t=2 (no living worker ⇒ no clamp); t=4 < anchor 6 ⇒ k=0.
    const cash = cashTermsForYear(4, params, offsets, [50, 2], 0)
    expect(cash.netFloor).toBe(0.75 * 80) // survivor year, scalable essentials at k=0
    // An all-retired household anchors at 0: t=4 reads k=4 (the cheap window).
    const retiredPeople = [retiree({}), retiree({ sex: 'female', currentAge: 68, birthYear: 1958 })]
    const retiredParams = coupleParams({ people: retiredPeople, budget })
    const retiredOffsets = retiredPeople.map((p) => ({
      retire: p.retirementAge - p.currentAge,
      claim: p.socialSecurityClaimAge - p.currentAge,
      earnedIncomeReal: 0,
      socialSecurityReal: 0,
      spousalExcessAnnual: 0,
    }))
    const retiredCash = cashTermsForYear(4, retiredParams, retiredOffsets, [50, 50], 0)
    expect(retiredCash.netFloor).toBe(20)
  })
})

describe('U9 · the date-search two-track split (build-gate c)', () => {
  // The dateSearch suite's working couple, budget-carrying: essentials 45k + travel 15k
  // (year-0 full total = the 60k scalar — the reconciliation invariant).
  const A55: PersonInputs = {
    sex: 'male', currentAge: 55, birthYear: 1971, retirementAge: 60,
    earnedIncomeReal: 90_000, pia: 0, socialSecurityClaimAge: 70,
  }
  const B58: PersonInputs = {
    sex: 'female', currentAge: 58, birthYear: 1968, retirementAge: 63,
    earnedIncomeReal: 70_000, pia: 0, socialSecurityClaimAge: 70,
  }
  const overlay: OverlayParams = {
    taxEnabled: true,
    rmdEnabled: false,
    startCalendarYear: 2026,
    buckets: { taxable: 0, pretax: 1_000_000, roth: 0 },
    filing: 'mfj',
    healthcareEnabled: true,
    enrolledPremium: Array.from({ length: 12 }, (_, t) => 10_000 + 100 * t),
    slcsp: Array.from({ length: 12 }, (_, t) => 9_000 + 100 * t),
    oopMedical: Array.from({ length: 12 }, (_, t) => 500 + 10 * t),
    accumulation: {
      contributionsByPerson: [
        { pretax: Array.from({ length: 12 }, () => 20_000) },
        { pretax: Array.from({ length: 12 }, () => 15_000) },
      ],
    },
  }
  const budget = compileBudget(
    [
      line({ annualAmountReal: 45_000 }),
      line({ tier: 'discretionary', annualAmountReal: 15_000, label: 'Travel' }),
    ],
    undefined,
    40,
  )
  const input: DateSearchInput = {
    params: {
      initialPortfolio: 1_000_000,
      annualSpendingReal: 60_000,
      stockWeight: 0.6,
      people: [A55, B58],
      survivorSpendingRatio: 0.75,
      drawdownPolicy: 'pre-tax-first',
      market: validationMarket.value,
      paths: 2_000,
      maxHorizonYears: 40,
      longevityMode: 'fixed-horizon',
      overlay,
      budget,
    },
    workingYearIrmaaMagiByPerson: [90_000, 70_000],
  }

  it('emits two INDEPENDENTLY-derived tracks (never the degenerate alias), floor per-candidate survival ≥ lifestyle, floor date ≤ lifestyle date, and the band rides the FLOOR crown', { timeout: 120_000 }, async () => {
    const outcome = await runDateSearch(input, 20260702, { tier: 'provisional' })
    expect(outcome.kind).toBe('dates')
    if (outcome.kind !== 'dates') return
    // insight 047 — the split must be two objects; mutating one must not corrupt the other.
    expect(outcome.floor).not.toBe(outcome.lifestyle)
    // The floor's curve dominates per candidate (less spent on identical CRN draws).
    for (let i = 0; i < outcome.lifestyle.curve.length; i++) {
      expect(outcome.floor.curve[i]!.survivalFraction).toBeGreaterThanOrEqual(
        outcome.lifestyle.curve[i]!.survivalFraction,
      )
    }
    // R27's normal ordering (the cliff inversion is U10's): floor date ≤ lifestyle date.
    if (
      (outcome.floor.kind === 'confirmed-date' || outcome.floor.kind === 'window-edge-unconfirmed') &&
      (outcome.lifestyle.kind === 'confirmed-date' || outcome.lifestyle.kind === 'window-edge-unconfirmed')
    ) {
      expect(outcome.floor.offsetYears).toBeLessThanOrEqual(outcome.lifestyle.offsetYears)
    }
    // The band crowns off the FLOOR track (council 2026-07-02): its offset is the floor's,
    // and its state is on-track-or-better by the floor curve's own clearing.
    if (outcome.floor.kind === 'confirmed-date' || outcome.floor.kind === 'window-edge-unconfirmed') {
      expect(outcome.band).toBeDefined()
      expect(outcome.band!.offsetYears).toBe(outcome.floor.offsetYears)
      expect(['on-track', 'over-funded']).toContain(outcome.band!.outcomeState)
    } else {
      expect(outcome.band).toBeUndefined()
    }
  })
})

describe('U9 · the wire round-trip (floor + floorReading presence-keyed)', () => {
  it('a budget-carrying run crosses runEngine → fromWire with the floor track and verdict intact; a scalar run carries neither', () => {
    const base = coupleParams({})
    const budget = compileBudget(
      [line({ annualAmountReal: 40 }), line({ tier: 'discretionary', annualAmountReal: 35, label: 'Travel' })],
      undefined,
      45,
    )
    const direct = summarize(
      resolved(simulate({ ...base, budget }, 777)),
      { ...base, budget },
      777,
    )
    const wired = fromWire(runEngine({ ...base, budget }, 777))
    if (!wired.ok) throw new Error(wired.reason)
    expect(wired.result.distribution.floor).toBeDefined()
    expect(wired.result.distribution.floor!.survivalFraction).toBe(direct.distribution.floor!.survivalFraction)
    expect(wired.result.distribution.floor!.depletionYears).toEqual(direct.distribution.floor!.depletionYears)
    expect(wired.result.floorReading).toEqual(direct.floorReading)

    const scalarWired = fromWire(runEngine(base, 777))
    if (!scalarWired.ok) throw new Error(scalarWired.reason)
    expect(scalarWired.result.distribution.floor).toBeUndefined()
    expect(scalarWired.result.floorReading).toBeUndefined()
  })
})
