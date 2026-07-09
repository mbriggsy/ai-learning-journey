import { describe, expect, it } from 'vitest'
import {
  buildDateInput,
  buildSpineParams,
  escalateQuote,
  firstStepDownYear,
  householdStockWeight,
  missingRequiredFacts,
} from '../intakeMap'
import { contributionCeilingFor } from '../sanity'
import { validateParams } from '@engine/simulate'
import { buildCandidateParams, DATE_OFFSET_WINDOW_TOP, DATE_SEARCH_PATHS } from '@engine/dateSearch'
import { acaAgeRatingCurve } from '@engine/constants/health'
import { employerPlan2026, catchUpForAge } from '@engine/constants/contributions'
import type { ScenarioDraft, PersonDraft } from '@store/memoryModel'

/**
 * The intake→engine contract battery (D1 slice (e)).
 *
 * THE RENDER-ANCHOR COUPLING (the load-bearing test): the placeholder shows
 * exactly while `missingRequiredFacts` is non-empty, so a draft with ZERO
 * missing facts MUST build params `validateParams` ACCEPTS — on the spine
 * route directly, and on the date route for EVERY candidate the sweep will
 * test (all-or-nothing). If this drifts, the UI threshold and the engine
 * threshold disagree — the exact hazard the anchor rule exists to prevent.
 */

const f = (age: number): number => {
  if (age <= 14) return acaAgeRatingCurve.value.childFactorThrough14
  return acaAgeRatingCurve.value.factors.find((r) => r.age === Math.min(age, 64))!.factor
}

const base = (over: Partial<ScenarioDraft> = {}): ScenarioDraft => ({
  people: [{}, {}],
  enteredAccounts: [],
  incomeStreams: [],
  tickerClassifications: {},
  health: {},
  annualSpendingReal: 84_000,
  spendEntryPeriod: 'month',
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'test',
  ...over,
})

const retiredPerson = (over: Partial<PersonDraft> = {}): PersonDraft => ({
  name: 'R',
  sex: 'male',
  birthYear: 1961,
  currentAge: 65,
  workStatus: 'retired',
  retirementAge: 63,
  earnedIncomeReal: 0,
  pia: 24_000,
  socialSecurityClaimAge: 67,
  ...over,
})

const workingPerson = (over: Partial<PersonDraft> = {}): PersonDraft => ({
  name: 'W',
  sex: 'female',
  birthYear: 1968,
  currentAge: 58,
  workStatus: 'working',
  earnedIncomeReal: 150_000,
  pia: 28_000,
  socialSecurityClaimAge: 67,
  ...over,
})

/** A COMPLETE all-retired draft (65/63 — ACA quote + IRMAA seed both required). */
const completeSpineDraft = (): ScenarioDraft =>
  base({
    people: [
      retiredPerson(),
      retiredPerson({ name: 'S', sex: 'female', birthYear: 1963, currentAge: 63, pia: 18_000 }),
    ],
    enteredAccounts: [
      { ownerIndex: 0, kind: '401k', ticker: 'VTI', valueToday: 600_000 },
      { ownerIndex: 1, kind: 'brokerage', ticker: 'VTI', valueToday: 400_000, basis: 250_000 },
    ],
    health: {
      enrolledPremiumMonthlyToday: 950,
      slcspMonthlyToday: 880,
      oopMedicalAnnual: 4_000,
      irmaaMagiSeed: [120_000, 110_000],
    },
  })

/** A COMPLETE mixed (date-route) draft (58 working / 60 retired). */
const completeDateDraft = (): ScenarioDraft =>
  base({
    people: [workingPerson(), retiredPerson({ name: 'S', birthYear: 1966, currentAge: 60, retirementAge: 58 })],
    enteredAccounts: [
      { ownerIndex: 0, kind: '401k', ticker: 'VTI', valueToday: 900_000, annualContribution: 20_000, employerMatchAnnual: 8_000 },
      { ownerIndex: 1, kind: 'roth-ira', ticker: 'VFIFX', valueToday: 200_000 },
    ],
    health: {
      enrolledPremiumMonthlyToday: 1_100,
      slcspMonthlyToday: 1_000,
      workingYearInvestmentByPerson: [30_000, 0],
    },
  })

describe('the render-anchor coupling (missing-facts empty ⇒ validateParams accepts)', () => {
  it('spine route: a complete draft builds ACCEPTED params', () => {
    const d = completeSpineDraft()
    expect(missingRequiredFacts(d)).toEqual([])
    const params = buildSpineParams(d)
    expect(params).not.toBeNull()
    expect(validateParams(params!)).toBeNull() // accepted — no drift
  })

  it('date route: a complete draft builds input EVERY candidate accepts (the all-or-nothing sweep)', () => {
    const d = completeDateDraft()
    expect(missingRequiredFacts(d)).toEqual([])
    const input = buildDateInput(d)
    expect(input).not.toBeNull()
    for (let y = 0; y <= DATE_OFFSET_WINDOW_TOP; y += 1) {
      const candidate = buildCandidateParams(input!, y, DATE_SEARCH_PATHS.provisional)
      expect(validateParams(candidate), `candidate Y=${y}`).toBeNull()
    }
  })

  it('spend is required NOT-VALIDLY-PRESENT, not merely present (U12, the hawk’s F9 gate)', () => {
    // The engine ACCEPTS a $0 spend (a legitimate CRN-isolation degenerate), so an
    // undefined-only presence check would let a zeroed spend build params and render a
    // confident "over-funded" on a household spending nothing — the veto's named bypass.
    // One NaN-safe clause (`!(s > 0)`) must catch every not-validly-present shape alike.
    const d = completeSpineDraft()
    for (const bad of [undefined, 0, -1, Number.NaN]) {
      const broken: ScenarioDraft = { ...d, annualSpendingReal: bad }
      expect(
        missingRequiredFacts(broken).some((m) => m.labelKey === 'spendLabel'),
        `spend=${String(bad)} must be NAMED missing`,
      ).toBe(true)
      expect(buildSpineParams(broken), `spend=${String(bad)} must not build`).toBeNull()
    }
    // The release sibling: a validly-present spend is not flagged and builds accepted params.
    expect(missingRequiredFacts(d).some((m) => m.labelKey === 'spendLabel')).toBe(false)
  })

  it('spine route: a STALE contribution on a RETIRED owner keeps the coupling (D1 review C1)', () => {
    // An account added while working, then both flipped to retired (Back-nav):
    // the stale contribution must NOT build an accumulation construct, or the
    // engine §6 ACA-overlap reject fires while missingRequiredFacts stays empty —
    // the calm empty-missing dead-end the coupling forbids.
    const d = completeSpineDraft()
    const stale: ScenarioDraft = {
      ...d,
      enteredAccounts: [
        { ...d.enteredAccounts[0]!, annualContribution: 20_000 }, // owner 0 is RETIRED
        d.enteredAccounts[1]!,
      ],
    }
    expect(missingRequiredFacts(stale)).toEqual([])
    const params = buildSpineParams(stale)
    expect(params).not.toBeNull()
    expect(validateParams(params!)).toBeNull() // accepted: the retired owner's stale stream is dropped
  })

  it('date route: a $0-balance portfolio is NAMED missing, not a silent dead-end (D1 review C2)', () => {
    const d = completeDateDraft()
    const zeroed: ScenarioDraft = {
      ...d,
      enteredAccounts: d.enteredAccounts.map((a) => ({ ...a, valueToday: 0 })),
    }
    // The engine rejects a $0 start with the construct present; the date route
    // must NAME a positive portfolio rather than build input every candidate rejects.
    expect(missingRequiredFacts(zeroed).some((m) => m.labelKey === 'addAccount')).toBe(true)
    expect(buildDateInput(zeroed)).toBeNull()
  })

  it('a present birthYear with an absent currentAge is NAMED missing (the buildPeople invariant; D1 review TS1)', () => {
    const d = completeSpineDraft()
    const holed: ScenarioDraft = {
      ...d,
      people: [{ ...d.people[0], currentAge: undefined }, d.people[1]],
    }
    expect(
      missingRequiredFacts(holed).some((m) => m.labelKey === 'birthYearLabel' && m.personIndex === 0),
    ).toBe(true)
  })

  it('routes are exclusive: spine builder nulls on a date-route draft and vice versa', () => {
    expect(buildSpineParams(completeDateDraft())).toBeNull()
    expect(buildDateInput(completeSpineDraft())).toBeNull()
  })
})

describe('missingRequiredFacts — the placeholder naming source', () => {
  it('names the ACA quote pair for a pre-65 household and drops it for an all-65+ one', () => {
    const d = completeSpineDraft()
    const noQuote = { ...d, health: { ...d.health, enrolledPremiumMonthlyToday: undefined, slcspMonthlyToday: undefined } }
    const keys = missingRequiredFacts(noQuote).map((m) => m.labelKey)
    expect(keys).toContain('enrolledPremiumLabel')
    expect(keys).toContain('slcspLabel')

    const old = {
      ...noQuote,
      people: [
        retiredPerson({ birthYear: 1959, currentAge: 67 }),
        retiredPerson({ name: 'S', sex: 'female', birthYear: 1960, currentAge: 66 }),
      ] as ScenarioDraft['people'],
    }
    const oldKeys = missingRequiredFacts(old).map((m) => m.labelKey)
    expect(oldKeys).not.toContain('enrolledPremiumLabel')
    expect(oldKeys).not.toContain('slcspLabel')
  })

  it('the date route requires at least one account; the spine does not ($0 flows to the honest 0-of-10)', () => {
    const dDate = { ...completeDateDraft(), enteredAccounts: [] }
    expect(missingRequiredFacts(dDate).map((m) => m.labelKey)).toContain('addAccount')
    const dSpine = { ...completeSpineDraft(), enteredAccounts: [] }
    expect(missingRequiredFacts(dSpine).map((m) => m.labelKey)).not.toContain('addAccount')
  })

  it('C3 → B: working-year investment income is its own required fact on the date route (no silent skip)', () => {
    const d = completeDateDraft()
    // The pay half is the already-required salary (derived into the IRMAA override); investment is
    // the genuinely-new fact. A blank investment leaves the answer INCOMPLETE — never a silent $0
    // (the optimistic under-statement the council's Hawk + red team flagged). Gap closed by
    // construction, not by copy.
    const noInvestment = { ...d, health: { ...d.health, workingYearInvestmentByPerson: undefined } }
    expect(missingRequiredFacts(noInvestment).map((m) => m.labelKey)).toContain('workInvestmentLabel')
  })

  it('two spouses’ HSAs are an honest named limitation, never a silent owner pick', () => {
    const d = completeSpineDraft()
    const twoHsas = {
      ...d,
      enteredAccounts: [
        ...d.enteredAccounts,
        { ownerIndex: 0, kind: 'hsa', ticker: 'VTI', valueToday: 30_000 },
        { ownerIndex: 1, kind: 'hsa', ticker: 'VTI', valueToday: 20_000 },
      ] as ScenarioDraft['enteredAccounts'],
    }
    expect(missingRequiredFacts(twoHsas).map((m) => m.labelKey)).toContain('kindHsa')
  })

  it('an unclassified entered account is named (never a silent default blend)', () => {
    const d = completeSpineDraft()
    const unknown = {
      ...d,
      enteredAccounts: [
        { ownerIndex: 0, kind: '401k', ticker: 'ZZZNOTREAL', valueToday: 100_000 },
      ] as ScenarioDraft['enteredAccounts'],
    }
    expect(missingRequiredFacts(unknown).map((m) => m.labelKey)).toContain('classifierLegend')
  })
})

describe('the ACA quote escalator (§3b — the staggered Medicare exit)', () => {
  it('prices the years between the two 65th birthdays at the YOUNGER member’s SOLO value (a flat couple scalar fails)', () => {
    const quote = 1_000 // $/mo household, ages 62 + 64
    const schedule = escalateQuote(quote, [62, 64], 6)

    const share62 = quote * (f(62) / (f(62) + f(64)))
    const share64 = quote * (f(64) / (f(62) + f(64)))
    // t=0: both pre-65.
    expect(schedule[0]).toBeCloseTo((share62 + share64) * 12, 6)
    // t=1: the 64-yo turns 65 — the YOUNGER one's solo, age-escalated value.
    expect(schedule[1]).toBeCloseTo(share62 * (f(63) / f(62)) * 12, 6)
    // t=2: solo at 64 (the most-understated year under a flat scalar).
    expect(schedule[2]).toBeCloseTo(share62 * (f(64) / f(62)) * 12, 6)
    // t=3: the younger turns 65 — zero from here.
    expect(schedule[3]).toBe(0)
    expect(schedule[5]).toBe(0)

    // The planted flat-couple-scalar arm: a held-constant household value would
    // keep t=1 at the t=0 level — the composition must DROP it to solo.
    expect(schedule[1]).toBeLessThan(schedule[0]!)
  })

  it('escalates a solo member ALONG their own ages (3:1 curve rises toward 64)', () => {
    const schedule = escalateQuote(500, [55], 11)
    for (let t = 1; t <= 9; t += 1) {
      expect(schedule[t]).toBeGreaterThan(schedule[t - 1]!) // 56..64 strictly rising
    }
    expect(schedule[10]).toBe(0) // 65
  })

  it('members 65+ contribute nothing anywhere; an all-65+ household prices zero', () => {
    expect(escalateQuote(800, [67, 70], 4)).toEqual([0, 0, 0, 0])
  })
})

describe('aggregations (derived, never stored)', () => {
  it('value-weights the household stock weight across resolved blends', () => {
    const d = base({
      people: [retiredPerson(), retiredPerson({ name: 'S' })] as ScenarioDraft['people'],
      enteredAccounts: [
        { ownerIndex: 0, kind: '401k', ticker: 'VTI', valueToday: 730_000 }, // ~100% stock
        { ownerIndex: 1, kind: 'brokerage', valueToday: 250_000, basis: 100_000, manualBlend: { kind: 'simple', choice: 'cash' } },
      ],
    })
    // VTI ≈ 100% stock at ~.745 of value; cash → bond fold = 0% stock for the rest.
    const w = householdStockWeight(d)!
    expect(w).toBeGreaterThan(0.7)
    expect(w).toBeLessThanOrEqual(0.76)
  })

  it('buckets, per-person pretax, basis, and the HSA owner aggregate correctly', () => {
    const d = completeSpineDraft()
    const withHsa = {
      ...d,
      enteredAccounts: [
        ...d.enteredAccounts,
        { ownerIndex: 1, kind: 'hsa', ticker: 'VTI', valueToday: 50_000 },
      ] as ScenarioDraft['enteredAccounts'],
    }
    const params = buildSpineParams(withHsa)!
    expect(params.initialPortfolio).toBe(1_050_000)
    expect(params.overlay!.buckets).toEqual({ taxable: 400_000, pretax: 600_000, roth: 0, hsa: 50_000 })
    expect(params.overlay!.pretaxByPerson).toEqual([600_000, 0])
    expect(params.overlay!.initialTaxableBasis).toBe(250_000)
    expect(params.overlay!.hsaOwnerIndex).toBe(1)
    expect(validateParams(params)).toBeNull()
  })

  it('oopMedical fills the horizon FLAT (cap-only; never age-stepped, never stopped at 65)', () => {
    const params = buildSpineParams(completeSpineDraft())!
    const oop = params.overlay!.oopMedical!
    expect(oop).toHaveLength(params.maxHorizonYears)
    expect(new Set(oop)).toEqual(new Set([4_000]))
  })
})

describe('P3·U10 — the Roth-conversion lever + the custom order reach the engine input', () => {
  it('a persisted plan expands into overlay.conversions via the ONE shared expander (zero-prefix, amount per active year)', () => {
    const d: ScenarioDraft = {
      ...completeSpineDraft(),
      rothConversion: { annualAmountReal: 40_000, startYearOffset: 2, years: 3 },
    }
    const params = buildSpineParams(d)!
    expect(params.overlay!.conversions).toEqual([0, 0, 40_000, 40_000, 40_000])
    expect(validateParams(params)).toBeNull() // the render-anchor coupling holds with the lever set
  })

  it('an ABSENT lever writes NO conversions key at all — reduce-to-spine is presence-keyed, never a zero-fill', () => {
    const params = buildSpineParams(completeSpineDraft())!
    expect('conversions' in params.overlay!).toBe(false)
  })

  it('a window entirely past the horizon stays ABSENT (the expander returns undefined, the spread drops it)', () => {
    const d: ScenarioDraft = {
      ...completeSpineDraft(),
      rothConversion: { annualAmountReal: 40_000, startYearOffset: 500, years: 3 },
    }
    const params = buildSpineParams(d)!
    expect('conversions' in params.overlay!).toBe(false)
    expect(validateParams(params)).toBeNull()
  })

  it("drawdownPolicy 'custom' + drawdownOrder pass through to SimulationParams and the engine gate accepts the pair", () => {
    const d: ScenarioDraft = {
      ...completeSpineDraft(),
      drawdownPolicy: 'custom',
      drawdownOrder: ['roth', 'taxable', 'pretax'],
    }
    const params = buildSpineParams(d)!
    expect(params.drawdownPolicy).toBe('custom')
    expect(params.drawdownOrder).toEqual(['roth', 'taxable', 'pretax'])
    expect(validateParams(params)).toBeNull()
  })

  it('a NAMED policy carries NO drawdownOrder key (spread-if-present — the biconditional cannot be violated from here)', () => {
    const params = buildSpineParams(completeSpineDraft())!
    expect('drawdownOrder' in params).toBe(false)
  })
})

describe('R40 — the other-income construct wires into the overlay (the early-return guard fix + compile passthrough)', () => {
  // An all-retired household whose WHOLE picture is a pension + a spend figure: NO accounts, NO
  // marketplace premium. Pre-R40 the overlay early-returned undefined here (a tax-blind run); R40
  // must build a tax-aware overlay carrying the compiled income (income hits SS-§86 / ACA-MAGI /
  // IRMAA-MAGI, so a tax-blind run would be calm-but-wrong).
  // Both spouses are 68 (born 1958) and already retired (retirementAge < currentAge ⇒ the spine
  // route, no pre-65 ACA quote). They ARE Medicare-enrolled, so the IRMAA seed is genuinely required
  // (anyNear65) — supplied here. This isolates the income-only OVERLAY path: no accounts, no
  // marketplace premium, yet the pension must still open a tax-aware overlay (the guard fix).
  const incomeOnlyDraft = (): ScenarioDraft =>
    base({
      people: [
        retiredPerson({ birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 0 }),
        retiredPerson({ name: 'S', sex: 'female', birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 0 }),
      ],
      enteredAccounts: [],
      incomeStreams: [
        { ownerIndex: 0, type: 'pension', annualRealToday: 30_000, startAge: 62, colaMode: 'real-flat', survivorPct: 0.5 },
      ],
      health: { irmaaMagiSeed: [80_000, 80_000] },
    })

  it('an INCOME-ONLY household (no accounts, no health premium) STILL builds a tax-aware overlay (the guard fix)', () => {
    const params = buildSpineParams(incomeOnlyDraft())
    expect(params).not.toBeNull()
    expect(params!.overlay).toBeDefined()
    expect(params!.overlay!.taxEnabled).toBe(true)
    expect(params!.overlay!.income).toBeDefined()
    expect(params!.overlay!.income!.incomeByPerson).toHaveLength(2)
    // owner 0's pension is present (FULL gross), owner 1 has no stream (empty leaf).
    expect(params!.overlay!.income!.incomeByPerson[0]!.grossFull![0]).toBe(30_000)
    expect(params!.overlay!.income!.incomeByPerson[1]).toEqual({})
    expect(validateParams(params!)).toBeNull() // accepted — the render-anchor coupling holds
  })

  it('the compiled income vector length matches the engine horizon (compiled ONCE in buildParams; Y-invariant)', () => {
    const params = buildSpineParams(incomeOnlyDraft())!
    expect(params.overlay!.income!.incomeByPerson[0]!.grossFull).toHaveLength(params.maxHorizonYears)
  })

  it('an empty incomeStreams list leaves income ABSENT (reduce-to-spine — never an empty construct)', () => {
    const params = buildSpineParams(completeSpineDraft())! // has accounts, no income streams
    expect(params.overlay!.income).toBeUndefined()
  })

  it('a household with NOTHING (no accounts, no health, no income) still early-returns no overlay', () => {
    const params = buildSpineParams(
      base({
        people: [
          retiredPerson({ birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 0 }),
          retiredPerson({ name: 'S', sex: 'female', birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 0 }),
        ],
        health: { irmaaMagiSeed: [80_000, 80_000] },
      }),
    )
    // No overlay is built — the spine route with a $0 portfolio + spend (coherent-but-dire flows).
    // (The seed is collected but with no overlay there is nothing for it to ride — the early return
    // fires before the overlay assembly; missingRequiredFacts is empty so buildParams is non-null.)
    expect(params).not.toBeNull()
    expect(params!.overlay).toBeUndefined()
  })
})

describe('contribution streams (R31 + the step-down)', () => {
  it('a 61-yo super-band contribution steps DOWN at 64 (the flat projection fails); the disclosure names the year', () => {
    const ceiling61 = contributionCeilingFor('401k', 61)!
    const d = {
      ...completeDateDraft(),
      people: [
        workingPerson({ birthYear: 1965, currentAge: 61 }),
        retiredPerson({ name: 'S', birthYear: 1966, currentAge: 60, retirementAge: 58 }),
      ] as ScenarioDraft['people'],
      enteredAccounts: [
        { ownerIndex: 0, kind: '401k', ticker: 'VTI', valueToday: 900_000, annualContribution: ceiling61 },
      ] as ScenarioDraft['enteredAccounts'],
    }
    const input = buildDateInput(d)!
    const stream = input.params.overlay!.accumulation!.contributionsByPerson[0]!.pretax!
    // Ages 61–63 (t=0..2): the entered super-band max carries through.
    expect(stream[0]).toBeCloseTo(ceiling61, 6)
    expect(stream[2]).toBeCloseTo(ceiling61, 6)
    // Age 64 (t=3): the super band expires — the stream steps down to the
    // age-64 ceiling (deferral + the regular catch-up).
    const ceiling64 = employerPlan2026.value.electiveDeferral + catchUpForAge(64, 'employerPlan')
    expect(stream[3]).toBeCloseTo(ceiling64, 6)
    expect(stream[3]).toBeLessThan(stream[2]!) // the planted flat arm fails
    expect(firstStepDownYear(d, 10)).toBe(3)
  })

  it('an HSA employer contribution joins the OWNER’s hsa channel — never the pretax/match channels', () => {
    const d = {
      ...completeDateDraft(),
      people: [
        workingPerson({ birthYear: 1965, currentAge: 61 }),
        retiredPerson({ name: 'S', birthYear: 1966, currentAge: 60, retirementAge: 58 }),
      ] as ScenarioDraft['people'],
      enteredAccounts: [
        {
          ownerIndex: 0,
          kind: 'hsa',
          valueToday: 30_000,
          annualContribution: 3_000,
          hsaEmployerAnnual: 1_000,
          manualBlend: { kind: 'exact', stockPct: 80, bondPct: 20, cashPct: 0 },
        },
      ] as ScenarioDraft['enteredAccounts'],
    }
    const streams = buildDateInput(d)!.params.overlay!.accumulation!.contributionsByPerson[0]!
    // Both dollars land in the ONE hsa channel (4,000 = 3,000 personal + 1,000
    // employer, under the family ceiling so no step-down) — the employer figure is
    // present (a personal-only stream would read 3,000), and it NEVER leaks to the
    // pretax or employer-match channels (those are the 401(k) routing, not HSA).
    expect(streams.hsa![0]).toBeCloseTo(4_000, 6)
    expect(streams.pretax).toBeUndefined()
    expect(streams.employerMatch).toBeUndefined()
  })

  it('an HSA with ONLY an employer contribution (no personal) still builds the accumulation construct', () => {
    // An employer-seeded HSA the employee never personally funds is a real shape; the
    // accumulation construct must be present-keyed off the EMPLOYER figure alone, or
    // the inflow vanishes from the projection (the optimistic-direction sin).
    const d = {
      ...completeDateDraft(),
      people: [
        workingPerson({ birthYear: 1965, currentAge: 61 }),
        retiredPerson({ name: 'S', birthYear: 1966, currentAge: 60, retirementAge: 58 }),
      ] as ScenarioDraft['people'],
      enteredAccounts: [
        {
          ownerIndex: 0,
          kind: 'hsa',
          valueToday: 30_000,
          hsaEmployerAnnual: 1_500, // employer-only — no annualContribution
          manualBlend: { kind: 'exact', stockPct: 80, bondPct: 20, cashPct: 0 },
        },
      ] as ScenarioDraft['enteredAccounts'],
    }
    const overlay = buildDateInput(d)!.params.overlay!
    expect(overlay.accumulation).toBeDefined()
    expect(overlay.accumulation!.contributionsByPerson[0]!.hsa![0]).toBeCloseTo(1_500, 6)
  })

  it('an HSA with NO employer field is a true no-op — the hsa channel carries the personal figure only', () => {
    // The reduce-to-spine / byte-identity control for the absent field: the employer
    // branch is presence-keyed (guarded on !== undefined), so an account WITHOUT it
    // must read 3,000 (the personal figure), not 3,000+coerced-0 by a different path.
    const d = {
      ...completeDateDraft(),
      people: [
        workingPerson({ birthYear: 1965, currentAge: 61 }),
        retiredPerson({ name: 'S', birthYear: 1966, currentAge: 60, retirementAge: 58 }),
      ] as ScenarioDraft['people'],
      enteredAccounts: [
        {
          ownerIndex: 0,
          kind: 'hsa',
          valueToday: 30_000,
          annualContribution: 3_000, // hsaEmployerAnnual ABSENT
          manualBlend: { kind: 'exact', stockPct: 80, bondPct: 20, cashPct: 0 },
        },
      ] as ScenarioDraft['enteredAccounts'],
    }
    const streams = buildDateInput(d)!.params.overlay!.accumulation!.contributionsByPerson[0]!
    expect(streams.hsa![0]).toBeCloseTo(3_000, 6)
  })

  it('the placeholder retirementAge is constructed strictly above currentAge and never stored', () => {
    const d = completeDateDraft()
    const input = buildDateInput(d)!
    expect(input.params.people[0]!.retirementAge).toBe(59) // 58 + 1
    expect(d.people[0].retirementAge).toBeUndefined() // the draft never holds it
  })

  it('a no-contribution household carries NO accumulation construct (presence-keyed §1)', () => {
    const params = buildSpineParams(completeSpineDraft())!
    expect(params.overlay!.accumulation).toBeUndefined()
  })
})
