import { describe, expect, it } from 'vitest'
import {
  acaPricedForRun,
  buildControlPreviewParams,
  buildDateInput,
  buildSpineParams,
  escalateQuote,
  firstStepDownYear,
  householdStockWeight,
  medicareExtrasDisclosureView,
  medicareExtrasView,
  medicareOnlyPriced,
  missingRequiredFacts,
  resolveMedicareExtrasMonthly,
  spineMedicarePriced,
  spineStatePriced,
  dateStatePriced,
  pricedStateForRun,
  isDateRoute,
  workingYearCostForRun,
  workingYearDraftEvents,
  workingYearLedgerForRun,
  workingYearTaxForRun,
} from '../intakeMap'
import { contributionCeilingFor, contributionCeilingInYear } from '../sanity'
import { confirmedWorkingYearCost, isWorkingYearCostStale } from '../workingYearQuote'
import { validateParams } from '@engine/simulate'
import { buildCandidateParams, DATE_OFFSET_WINDOW_TOP, DATE_SEARCH_PATHS, workingYearTaxReach } from '@engine/dateSearch'
import { workingYearLedger } from '@engine/workingYearLedger'
import type { IncomeStream, WorkingYearCostV3 } from '@shared/model'
import { acaAgeRatingCurve, medicareCostTrend, medicareExtrasTypicalMonthly } from '@engine/constants/health'
import { employerPlan2026, catchUpForAge, hsa2026 } from '@engine/constants/contributions'
import type { ScenarioDraft, PersonDraft } from '@store/memoryModel'
import { copy } from '@ui/copy'
import { DEV_SEEDS } from '@ui/devSeeds'

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
      // 60-yo S retired at 58 while 58-yo W keeps working — the mixed pre-65 household the
      // window gate prices at $0 healthcare, so "complete" now REQUIRES this answer. It was
      // never complete before; the fact simply had no name. The `false` arm is pinned below.
      employerPlanCoversRetiredMember: true,
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
    const fact = missingRequiredFacts(twoHsas).find((m) => m.labelKey === 'kindHsaBothSpouses')
    expect(fact, 'the two-HSA limitation must still be named').toBeDefined()
    // It is UNREPRESENTABLE, not absent — they entered two HSAs. Under the old untyped shape this
    // rendered "Still needed: HSA" beneath "the tool prices only what you enter", telling a
    // household that supplied the input twice that it was missing. The kind is what stops that.
    expect(fact?.kind, 'an entered-twice fact must never wear the "still needed" frame').toBe(
      'unrepresentable',
    )
  })

  it('the mixed pre-65 household is ASKED whether work covers the retired one — absence blocks the date', () => {
    // The window gate zeroes the retired member's premiums AND out-of-pocket across every year the
    // other keeps working, so an unanswered premise is a real missing fact — and it is ABSENT, the
    // arm the reader can clear by answering.
    const d = completeDateDraft()
    const unasked = {
      ...d,
      health: { ...d.health, employerPlanCoversRetiredMember: undefined },
    }
    const fact = missingRequiredFacts(unasked).find((m) => m.labelKey === 'employerCoverageLegend')
    expect(fact, 'an unanswered employer-coverage premise must block the date').toBeDefined()
    expect(fact?.kind ?? 'absent').toBe('absent')
    expect(buildDateInput(unasked), 'no date may be built on an unasked premise').toBeNull()
  })

  it('answering NO refuses the date as UNREPRESENTABLE — never as a fact still to enter', () => {
    // `false` is a complete answer. The engine cannot price it (ACA-MAGI has no wage term, so
    // simulate.ts refuses a premium on a bridge year outright), so the refusal must NOT invite a
    // retry that cannot succeed.
    const d = completeDateDraft()
    const own = { ...d, health: { ...d.health, employerPlanCoversRetiredMember: false } }
    const fact = missingRequiredFacts(own).find((m) => m.labelKey === 'employerCoverageUnpriced')
    expect(fact, 'a household buying its own pre-65 coverage must be refused').toBeDefined()
    expect(fact?.kind).toBe('unrepresentable')
    expect(buildDateInput(own)).toBeNull()
    // And it must NOT also be named as something still to enter — one honest home, one frame.
    expect(missingRequiredFacts(own).map((m) => m.labelKey)).not.toContain('employerCoverageLegend')
  })

  it('the question is NOT asked where the gate cannot bite (no pre-65 retiree, or nobody working)', () => {
    // The predicate's whole extension, from the other side: a hollow question on a household the
    // window gate can never touch is its own defect (it invites a wrong answer to an inert fact).
    // All-retired ⇒ windowStart 0 ⇒ the gate is a verbatim pass-through.
    const spine = completeSpineDraft()
    expect(missingRequiredFacts(spine).map((m) => m.labelKey)).not.toContain('employerCoverageLegend')
    // A retired member ALREADY 65 has no pre-65 year left to lose — Medicare owns those years.
    const d = completeDateDraft()
    const retiredAt65 = {
      ...d,
      people: [d.people[0]!, { ...d.people[1]!, birthYear: 1961, currentAge: 65 }] as ScenarioDraft['people'],
      health: { ...d.health, employerPlanCoversRetiredMember: undefined },
    }
    expect(missingRequiredFacts(retiredAt65).map((m) => m.labelKey)).not.toContain(
      'employerCoverageLegend',
    )
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

  // The ultramode fold's DIVERGENCE WITNESS (6-lens convergence, 2026-07-10): the SS-only
  // $0-account all-65+ household is exactly where "age says priceable" and "the run actually
  // priced" split — buildOverlay's degenerate early-return fires UPSTREAM of the medicareOnly
  // branch, so NO overlay exists and Medicare priced $0, while the age predicate still reads
  // true. The disclosure MUST read the built output (spineMedicarePriced), or the verdict
  // surface asserts "Medicare’s premiums … are already counted in this answer" over a run that priced
  // nothing — a confidently-false factual claim (the unit's own cardinal class).
  it('the SS-only $0-portfolio all-65+ household: age predicate TRUE, spineMedicarePriced FALSE — the affirmation is withheld', () => {
    const d = base({
      people: [
        retiredPerson({ birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 24_000 }),
        retiredPerson({ name: 'S', sex: 'female', birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 16_000 }),
      ],
      health: { irmaaMagiSeed: [40_000, 40_000] },
    })
    expect(missingRequiredFacts(d)).toEqual([])
    expect(medicareOnlyPriced(d), 'ages alone say priceable').toBe(true)
    expect(buildSpineParams(d)!.overlay, 'but the run builds NO overlay').toBeUndefined()
    expect(spineMedicarePriced(d), 'so the disclosure reads NOT priced').toBe(false)
  })

  // The direct wiring assertion (the review's testing-lens advisory): the all-65+ household
  // WITH assets gets the Medicare-only overlay — healthcareEnabled true, ACA streams absent —
  // and the disclosure seam reads the same built truth.
  it('an all-65+ household WITH accounts builds the Medicare-only overlay (healthcareEnabled, no ACA streams) and spineMedicarePriced agrees', () => {
    const d = base({
      people: [
        retiredPerson({ birthYear: 1958, currentAge: 68, retirementAge: 64 }),
        retiredPerson({ name: 'S', sex: 'female', birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 16_000 }),
      ],
      enteredAccounts: [
        { ownerIndex: 0, kind: 'traditional-ira', valueToday: 500_000, manualBlend: { kind: 'exact', stockPct: 60, bondPct: 35, cashPct: 5 } },
      ],
      health: { irmaaMagiSeed: [40_000, 40_000] },
    })
    const params = buildSpineParams(d)
    expect(params).not.toBeNull()
    expect(params!.overlay?.healthcareEnabled, 'the medicareOnly branch fires').toBe(true)
    expect(params!.overlay?.enrolledPremium, 'no ACA premium stream').toBeUndefined()
    expect(params!.overlay?.slcsp, 'no SLCSP stream').toBeUndefined()
    expect(params!.overlay?.irmaaMagiSeed, 'the seed rides').toEqual([40_000, 40_000])
    expect(spineMedicarePriced(d), 'the disclosure seam reads the built truth').toBe(true)
    expect(validateParams(params!)).toBeNull()
  })

  // The income-only sibling: a pension with no accounts ALSO opens the overlay (the guard fix
  // above), and post-unit that overlay carries Medicare pricing — the built truth, disclosed.
  it('the income-only all-65+ household prices Medicare too (the overlay exists, so the branch rides it)', () => {
    const d = incomeOnlyDraft()
    expect(buildSpineParams(d)!.overlay?.healthcareEnabled).toBe(true)
    expect(spineMedicarePriced(d)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// The state-tax unit (S4): retirementState threads draft → params.overlay on BOTH
// builders, PRESENCE-KEYED both ways (an absent draft field writes NO overlay field —
// the disclosed-out posture, reduce-to-spine is structural, never a default). The S5
// producer's-output state-priced predicate reads THIS built `overlay.retirementState`,
// so the degenerate-overlay household (no overlay) must carry no state field at all.
// ---------------------------------------------------------------------------
describe('the state-tax unit — retirementState threads to params.overlay (both routes, presence-keyed)', () => {
  it('spine route: a PRICED state (NC) threads onto overlay.retirementState', () => {
    const params = buildSpineParams({ ...completeSpineDraft(), retirementState: 'NC' })!
    expect(params.overlay!.retirementState).toBe('NC')
  })

  it("spine route: an explicit 'elsewhere' threads as itself (a legit value the engine takes on the +0 branch — persisted as a fact, never collapsed)", () => {
    const params = buildSpineParams({ ...completeSpineDraft(), retirementState: 'elsewhere' })!
    expect(params.overlay!.retirementState).toBe('elsewhere')
  })

  it('spine route: an ABSENT draft field writes NO overlay field (presence-keyed — the planted-absence arm; a default here would break reduce-to-spine)', () => {
    const params = buildSpineParams(completeSpineDraft())! // completeSpineDraft carries no retirementState
    expect('retirementState' in params.overlay!).toBe(false)
  })

  it('date route: the field threads onto params.overlay AND is Y-invariant across the candidate sweep (rides ...overlayBase, never re-derived per candidate)', () => {
    const input = buildDateInput({ ...completeDateDraft(), retirementState: 'PA' })!
    expect(input.params.overlay!.retirementState).toBe('PA')
    for (let y = 0; y <= DATE_OFFSET_WINDOW_TOP; y += 1) {
      const candidate = buildCandidateParams(input, y, DATE_SEARCH_PATHS.provisional)
      expect(candidate.overlay!.retirementState, `candidate Y=${y}`).toBe('PA')
    }
  })

  it('date route: an ABSENT draft field writes NO overlay field (presence-keyed both ways)', () => {
    const input = buildDateInput(completeDateDraft())! // no retirementState
    expect('retirementState' in input.params.overlay!).toBe(false)
  })

  it('the degenerate-overlay household ($0 accounts, no income, no premium) builds NO overlay EVEN with a state set — so the S5 state-priced predicate reads unpriced (insight 081; the existing degenerate arm stays green)', () => {
    const d = base({
      people: [
        retiredPerson({ birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 0 }),
        retiredPerson({ name: 'S', sex: 'female', birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 0 }),
      ],
      health: { irmaaMagiSeed: [80_000, 80_000] },
      retirementState: 'NC',
    })
    const params = buildSpineParams(d)
    expect(params).not.toBeNull()
    // The early-return fires UPSTREAM of the overlay assembly: no overlay ⇒ the state field has
    // nowhere to attach ⇒ the run prices no state tax (the disclosed-out posture is preserved).
    expect(params!.overlay).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// The state-tax unit (S5): the PRODUCER'S-OUTPUT state-priced predicate — read off the route's
// OWN built-params overlay decision, roster-gated, NEVER draft.retirementState (insight 081) and
// NEVER a bare isDateRoute disjunct (insight 080). These are the seams Result threads to every
// disclosure home; the compose-side (which words each home shows) is tested in stateTaxDisclosure.
// ---------------------------------------------------------------------------
describe('the state-tax unit (S5) — the producer-output state-priced predicate (route-aware, roster-gated)', () => {
  const spineWith = (state: ScenarioDraft['retirementState']) => ({ ...completeSpineDraft(), retirementState: state })
  const dateWith = (state: ScenarioDraft['retirementState']) => ({ ...completeDateDraft(), retirementState: state })

  it('spine route: each PRICED roster state reads its OWN code (NC/PA/FL); the date reader is null there', () => {
    for (const s of ['NC', 'PA', 'FL'] as const) {
      expect(spineStatePriced(spineWith(s)), `spineStatePriced ${s}`).toBe(s)
      expect(pricedStateForRun(spineWith(s)), `pricedStateForRun ${s}`).toBe(s)
      // buildDateInput returns null on the spine route ⇒ the date reader makes no claim.
      expect(dateStatePriced(spineWith(s)), `dateStatePriced null on spine ${s}`).toBeUndefined()
    }
  })

  it("spine route: 'elsewhere', an ABSENT field, and a recognised-but-UNBUILT roster state (SC) all read UNPRICED", () => {
    expect(spineStatePriced(spineWith('elsewhere')), "'elsewhere'").toBeUndefined()
    expect(spineStatePriced(completeSpineDraft()), 'absent').toBeUndefined()
    expect(spineStatePriced(spineWith('SC')), 'SC is roster-recognised but UNBUILT ⇒ not priced').toBeUndefined()
    expect(pricedStateForRun(spineWith('SC'))).toBeUndefined()
  })

  it('date route: a PRICED state reads its own code off buildDateInput’s overlayBase (the spine reader is null there)', () => {
    expect(dateStatePriced(dateWith('NC')), 'dateStatePriced NC').toBe('NC')
    expect(pricedStateForRun(dateWith('NC')), 'pricedStateForRun NC (date)').toBe('NC')
    expect(spineStatePriced(dateWith('NC')), 'spineStatePriced null on date').toBeUndefined()
  })

  it("date route, OUT OF ROSTER: an 'elsewhere' date household reads UNPRICED — the bare isDateRoute disjunct is FORBIDDEN (insight 080; dateSearch forces healthcare, NOT state pricing)", () => {
    expect(dateStatePriced(dateWith('elsewhere')), "date 'elsewhere'").toBeUndefined()
    expect(pricedStateForRun(dateWith('elsewhere')), "the run prices no state tax for an 'elsewhere' date household").toBeUndefined()
    // An ABSENT field on the date route is likewise unpriced.
    expect(pricedStateForRun(completeDateDraft())).toBeUndefined()
  })

  it('the DEGENERATE-OVERLAY household ($0 accounts, no income, no premium) reads UNPRICED even with the draft set to NC (insight 081: it builds NO overlay ⇒ prices NO state tax; the divergence witness)', () => {
    const degenerate = base({
      people: [
        retiredPerson({ birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 0 }),
        retiredPerson({ name: 'S', sex: 'female', birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 0 }),
      ],
      health: { irmaaMagiSeed: [80_000, 80_000] },
      retirementState: 'NC',
    })
    // The draft SAYS NC, but the producer's output (no overlay) prices nothing — the predicate
    // MUST agree with the run, never the geography. (A draft.retirementState re-derivation would
    // wrongly read 'NC' here — the killed mutant.)
    expect(spineStatePriced(degenerate)).toBeUndefined()
    expect(pricedStateForRun(degenerate)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// O16 (council 2026-07-17, wf_fd7f75cb-916; the ultramode fold's P1 same day): the ACA-priced
// predicate reads the PREVIEW producer (buildControlPreviewParams — spine params, or the CROWNED
// window-gated candidate), never buildDateInput's pre-sweep base overlay and never
// healthcareEnabled alone (the Medicare-only branch carries the flag with NO stream).
// ---------------------------------------------------------------------------
// The control preview (TwoFutures / the Roth preview) runs the CROWNED candidate, so it must run the
// same W the sweep crowned with — a preview that dropped W would show a short household's survival
// rosier than its own date (the whole-file review: planting a W strip here reddened no test).
describe('the control preview carries the pay check’s W (the crowned candidate the sweep ran)', () => {
  it('every W-carrying date seed’s preview params hold the same W and employer-HSA stream as the sweep’s candidate', () => {
    const seeds = Object.entries(DEV_SEEDS).filter(([, d]) => isDateRoute(d) && d.workingYearCost !== undefined)
    expect(seeds.length, 'the date seeds carry W (U10)').toBeGreaterThan(5)
    let compared = 0
    for (const [key, d] of seeds) {
      const input = buildDateInput(d)
      if (input === null || input.workingYearCostReal === undefined) continue // unbuildable, or W not carried
      compared += 1
      for (const offset of [0, 4, DATE_OFFSET_WINDOW_TOP]) {
        const preview = buildControlPreviewParams(d, offset)
        const sweep = buildCandidateParams(input, offset, DATE_SEARCH_PATHS.provisional)
        expect(preview?.overlay?.accumulation?.workingYearCostReal, `${key} @ ${offset}: W`).toBe(input.workingYearCostReal)
        expect(preview?.overlay?.accumulation, `${key} @ ${offset}: the whole construct`).toEqual(sweep.overlay?.accumulation)
      }
    }
    expect(compared, 'the sweep compared real W runs, not a vacuous loop').toBeGreaterThanOrEqual(8)
  })
})

describe('O16 — acaPricedForRun (the preview-producer ACA-priced predicate)', () => {
  it('a pre-65 household with the quote pair reads TRUE on its own route (spine; date via the crowned candidate)', () => {
    expect(acaPricedForRun(completeSpineDraft(), undefined), 'spine ACA household').toBe(true)
    // The date household (58 working / 60 retired): a retire-now crown leaves 7 pre-65 retired
    // years, so the crowned candidate genuinely prices ACA.
    expect(acaPricedForRun(completeDateDraft(), 0), 'date ACA household at a pre-65 crown').toBe(true)
  })

  it('the FOLD P1 witness: a work-to-65+ CROWN reads FALSE — the crowned candidate window-gates the quote stream to zero ACA years, and the pre-sweep base overlay must not overrule it', () => {
    const d = completeDateDraft()
    // The youngest member is 58: at crowned offset 8 every member is 65+ when work stops, so the
    // candidate the preview runs prices ZERO ACA years. The pre-sweep base overlay still carries
    // a positive quote stream (its escalator keys off TODAY's ages) — reading it here rendered a
    // false "the discount is already in these numbers" affirmation (the vetoed shape, one
    // producer deeper — the base-overlay mutant this arm kills).
    expect(acaPricedForRun(d, 8)).toBe(false)
    // And with NO crowned date there is no preview to describe — conservative false.
    expect(acaPricedForRun(d, undefined)).toBe(false)
  })

  it('an all-65+ Medicare-only household reads FALSE — healthcareEnabled WITHOUT a quote stream is not ACA (the healthcareEnabled-alone mutant)', () => {
    const all65 = base({
      people: [
        retiredPerson({ birthYear: 1958, currentAge: 68, retirementAge: 64 }),
        retiredPerson({ name: 'S', sex: 'female', birthYear: 1959, currentAge: 67, retirementAge: 64 }),
      ],
      enteredAccounts: [{ ownerIndex: 0, kind: '401k', ticker: 'VTI', valueToday: 600_000 }],
      health: { irmaaMagiSeed: [120_000, 110_000] },
    })
    // The Medicare-only branch ships healthcareEnabled with NO enrolledPremium stream — a
    // predicate reading the flag alone would falsely narrow the pre-65 clause for a household
    // that has no ACA years at all.
    expect(buildSpineParams(all65)?.overlay?.healthcareEnabled, 'the premise: Medicare-only IS enabled').toBe(true)
    expect(acaPricedForRun(all65, undefined)).toBe(false)
  })

  it('a $0-premium quote pair reads FALSE — a PRESENT all-zero stream is not a priced ACA year (the positivity-conjunct mutant)', () => {
    // An UNMASKED pre-65 household: healthcareOn fires (0 !== undefined), the built overlay
    // carries healthcareEnabled + a PRESENT all-zero enrolledPremium stream — the engine's own
    // per-year gate requires a POSITIVE premium, so no year prices; dropping the `p > 0`
    // conjunct (keeping the presence check) would falsely narrow the clause here.
    const zeroQuote = { ...completeSpineDraft() }
    const d = { ...zeroQuote, health: { ...zeroQuote.health, enrolledPremiumMonthlyToday: 0 } }
    expect(buildSpineParams(d)?.overlay?.healthcareEnabled, 'the premise: the overlay IS enabled').toBe(true)
    expect(acaPricedForRun(d, undefined)).toBe(false)
  })

  it('the DEGENERATE-OVERLAY household reads FALSE (no overlay ⇒ no ACA ⇒ the pre-65 clause conservatively stays)', () => {
    const degenerate = base({
      people: [
        retiredPerson({ birthYear: 1962, currentAge: 64, retirementAge: 62, pia: 0 }),
        retiredPerson({ name: 'S', sex: 'female', birthYear: 1962, currentAge: 64, retirementAge: 62, pia: 0 }),
      ],
      health: { irmaaMagiSeed: [80_000, 80_000] },
    })
    expect(acaPricedForRun(degenerate, undefined)).toBe(false)
  })

  it('an unknown-age household reads FALSE — an unresolved age is never a claim, the clause conservatively stays', () => {
    const unknownAges = base({
      people: [
        retiredPerson({ currentAge: undefined }),
        retiredPerson({ name: 'S', sex: 'female', currentAge: undefined }),
      ],
      enteredAccounts: [{ ownerIndex: 0, kind: '401k', ticker: 'VTI', valueToday: 600_000 }],
      health: { enrolledPremiumMonthlyToday: 950, slcspMonthlyToday: 880 },
    })
    expect(acaPricedForRun(unknownAges, undefined)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The ask-for-Medicare-extras unit (wf_efc6ece2-675): the fork→dollar resolution,
// the overlay threading, and the F5 disclosure view (built-params output — 081).
// ---------------------------------------------------------------------------
describe('medicare extras — resolution, threading, and the disclosure view', () => {
  const all65Draft = () =>
    base({
      people: [
        retiredPerson({ birthYear: 1958, currentAge: 68, retirementAge: 64 }),
        retiredPerson({ name: 'S', sex: 'female', birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 16_000 }),
      ],
      enteredAccounts: [
        { ownerIndex: 0, kind: 'traditional-ira', valueToday: 500_000, manualBlend: { kind: 'exact', stockPct: 60, bondPct: 35, cashPct: 5 } },
      ],
      health: { irmaaMagiSeed: [40_000, 40_000] },
    })

  it('resolution: entered → the own dollar; none → an AFFIRMED $0; typical/unanswered/absent → the conservative typical FUNDED (never a silent $0)', () => {
    const typical = medicareExtrasTypicalMonthly()
    expect(resolveMedicareExtrasMonthly(all65Draft())).toEqual([typical, typical]) // absent field
    const d = {
      ...all65Draft(),
      medicareExtrasByPerson: [
        { kind: 'entered' as const, monthly: 220 },
        { kind: 'none' as const },
      ],
    }
    expect(resolveMedicareExtrasMonthly(d)).toEqual([220, 0])
    const mixed = {
      ...all65Draft(),
      medicareExtrasByPerson: [
        { kind: 'typical' as const, adoptionVintage: 'extras-2026a' },
        { kind: 'unanswered' as const },
      ],
    }
    expect(resolveMedicareExtrasMonthly(mixed)).toEqual([typical, typical])
  })

  it('resolution: the mid-entry entered-with-NO-dollar half-answer degrades to the TYPICAL (conservative), never $0', () => {
    const d = {
      ...all65Draft(),
      medicareExtrasByPerson: [{ kind: 'entered' as const }, { kind: 'none' as const }],
    }
    expect(resolveMedicareExtrasMonthly(d)).toEqual([medicareExtrasTypicalMonthly(), 0])
  })

  it('the built overlay CARRIES the per-person vector on the Medicare-only arm (absent fork ⇒ the typical, both) and validates', () => {
    const params = buildSpineParams(all65Draft())!
    const typical = medicareExtrasTypicalMonthly()
    expect(params.overlay?.medicareExtrasMonthly).toEqual([typical, typical])
    expect(validateParams(params)).toBeNull()
  })

  it('the degenerate early-return household carries NO vector and the view makes NO claim — even WITH fork answers (the 081 witness, extras edition)', () => {
    const d = {
      ...base({
        people: [
          retiredPerson({ birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 24_000 }),
          retiredPerson({ name: 'S', sex: 'female', birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 16_000 }),
        ],
        health: { irmaaMagiSeed: [40_000, 40_000] },
      }),
      medicareExtrasByPerson: [
        { kind: 'entered' as const, monthly: 300 },
        { kind: 'none' as const },
      ],
    }
    expect(buildSpineParams(d)!.overlay, 'no overlay at the early return').toBeUndefined()
    expect(medicareExtrasView(d), 'no overlay ⇒ no extras claim').toBeNull()
  })

  it('the disclosure view maps per-person provenance off the draft while the DOLLARS come from the BUILT vector', () => {
    const typical = medicareExtrasTypicalMonthly()
    const d = {
      ...all65Draft(),
      medicareExtrasByPerson: [
        { kind: 'entered' as const, monthly: 185 },
        { kind: 'typical' as const, adoptionVintage: 'extras-2026a' },
      ],
    }
    expect(medicareExtrasView(d)).toEqual([
      { monthly: 185, provenance: 'entered' },
      { monthly: typical, provenance: 'typical' },
    ])
    // The affirmed-$0 arm reads as its own provenance (the MA household's honest state).
    const ma = { ...all65Draft(), medicareExtrasByPerson: [{ kind: 'none' as const }, { kind: 'none' as const }] }
    expect(medicareExtrasView(ma)).toEqual([
      { monthly: 0, provenance: 'affirmed-zero' },
      { monthly: 0, provenance: 'affirmed-zero' },
    ])
    // The never-asked household (absent field) reads on-typical for both.
    expect(medicareExtrasView(all65Draft())).toEqual([
      { monthly: typical, provenance: 'typical' },
      { monthly: typical, provenance: 'typical' },
    ])
  })

  it('extras are NEVER a required fact (optional-with-average — the R5 never-gate law)', () => {
    expect(missingRequiredFacts(all65Draft())).toEqual([])
  })

  // The ONE disclosure-view assembly both F5 homes consume (the extras ultramode fold,
  // 2026-07-12 — the byte-duplicated Result/HealthcareSheet IIFE pair collapsed here).
  it('the disclosure view resolves each person’s display label ONCE — names when present, the You/Your-spouse fallback when not', () => {
    const typical = medicareExtrasTypicalMonthly()
    const named = {
      ...all65Draft(),
      medicareExtrasByPerson: [
        { kind: 'entered' as const, monthly: 185 },
        { kind: 'typical' as const, adoptionVintage: 'extras-2026a' },
      ],
    }
    expect(medicareExtrasDisclosureView(named)).toEqual([
      { monthly: 185, provenance: 'entered', who: 'R' },
      { monthly: typical, provenance: 'typical', who: 'S' },
    ])
    // The defensive label fallback (the shared assembly's own semantics — position 0 reads
    // as You, position 1 as Your spouse when no name is resolvable at that index).
    const base65 = all65Draft()
    const nameless = {
      ...base65,
      people: [
        { ...base65.people[0], name: undefined as unknown as string },
        { ...base65.people[1], name: undefined as unknown as string },
      ] as ScenarioDraft['people'],
    }
    expect((medicareExtrasDisclosureView(nameless) ?? []).map((p) => p.who)).toEqual([
      copy.personYou,
      copy.personSpouse,
    ])
    // NULL propagates — the 081-witness early-return household (no overlay) makes no claim
    // in either home.
    const degenerate = base({
      people: [
        retiredPerson({ birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 24_000 }),
        retiredPerson({ name: 'S', sex: 'female', birthYear: 1958, currentAge: 68, retirementAge: 64, pia: 16_000 }),
      ],
      health: { irmaaMagiSeed: [40_000, 40_000] },
    })
    expect(medicareExtrasView(degenerate)).toBeNull()
    expect(medicareExtrasDisclosureView(degenerate)).toBeNull()
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

  it('the HSA age-55 catch-up is statute-FIXED ($1,000, IRC §223(b)(3)(B), outside §223(g)’s COLA): a max-contributing 56-yo’s stream trims by exactly the catch-up’s real erosion each runway year (the frozen-nominal Tier 0)', () => {
    // Today's ceiling (the R19 entry gate, "this year's legal limit") is the statute figure; a FUTURE
    // runway year's is the indexed family limit (flat-real — indexed by law) + $1,000 ÷ the price index
    // of that CALENDAR year (the closed form, DND 012). Nothing else in any family deflates.
    const trend = medicareCostTrend.value
    const idx = (y: number): number =>
      y <= trend.anchorYear
        ? 1
        : (1 + trend.cpiNearTermAvg) ** (Math.min(y, trend.anchorYear + trend.premiums.length) - trend.anchorYear) *
          (1 + trend.cpiUltimate) ** Math.max(0, y - trend.anchorYear - trend.premiums.length)
    const today = contributionCeilingFor('hsa', 56)!
    expect(today).toBe(hsa2026.value.contributionFamily + hsa2026.value.catchUp55Plus)
    expect(contributionCeilingInYear('hsa', 56, 2026)).toBe(today)
    expect(contributionCeilingInYear('hsa', 60, 2034)).toBeCloseTo(hsa2026.value.contributionFamily + hsa2026.value.catchUp55Plus / idx(2034), 9)
    expect(contributionCeilingInYear('hsa', 50, 2034)).toBe(hsa2026.value.contributionFamily) // no catch-up below 55
    // The indexed families never deflate — flat-real is right for them.
    expect(contributionCeilingInYear('401k', 60, 2034)).toBe(contributionCeilingFor('401k', 60))
    expect(contributionCeilingInYear('roth-ira', 60, 2034)).toBe(contributionCeilingFor('roth-ira', 60))
    const d = {
      ...completeDateDraft(),
      people: [
        workingPerson({ birthYear: 1970, currentAge: 56 }),
        retiredPerson({ name: 'S', birthYear: 1966, currentAge: 60, retirementAge: 58 }),
      ] as ScenarioDraft['people'],
      enteredAccounts: [
        {
          ownerIndex: 0,
          kind: 'hsa',
          valueToday: 30_000,
          annualContribution: today,
          manualBlend: { kind: 'exact', stockPct: 80, bondPct: 20, cashPct: 0 },
        },
      ] as ScenarioDraft['enteredAccounts'],
    }
    const stream = buildDateInput(d)!.params.overlay!.accumulation!.contributionsByPerson[0]!.hsa!
    const start = d.startCalendarYear!
    expect(stream[0]).toBeCloseTo(today, 6) // year 0: the statute figure, untrimmed
    for (const t of [1, 5]) {
      const ceilingT = hsa2026.value.contributionFamily + hsa2026.value.catchUp55Plus / idx(start + t)
      expect(stream[t], `runway year ${t}`).toBeCloseTo(ceilingT, 6)
    }
    expect(today - stream[5]!).toBeGreaterThan(100) // non-vacuous: the erosion is real dollars by year 5
    // The erosion is NOT a catch-up window closing: the D1 step-down disclosure reads the age-band frame,
    // and the 55+ HSA band is open-ended, so no step-down year exists for this owner.
    expect(firstStepDownYear(d, 8)).toBeNull()
    // Every kind refuses a non-integer year — the fail-loud is the function's, never the HSA branch's.
    expect(() => contributionCeilingInYear('401k', 60, Number.NaN)).toThrow(/integer/)
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

// The working-year tax floor (2026-10-20 — `docs/plans/features/working-year-tax-floor-build-spec.md`
// U3 · KTD11): `buildDateInput` derives the RAW per-person working-year investment vector beside the
// IRMAA override under the SAME completeness gate, so the two can never disagree about a member —
// the identity `override − earnedIncomeReal === investment` for every working member, 0 in both for a
// retired one, and BOTH absent when a working member's figure is missing (never a silent $0). Whole
// dollars ⇒ the identity is exact (`toBe`, never `toBeCloseTo`).
describe('the working-year tax floor — the investment vector rides beside the IRMAA override (the KTD11 identity)', () => {
  it('every working member of every date-route dev seed: override − earnedIncomeReal === I exactly; a retired member is 0 in both', () => {
    let seeds = 0
    let workingMembers = 0
    let nonzeroSlots = 0
    let retiredMembers = 0
    for (const [key, d] of Object.entries(DEV_SEEDS)) {
      const input = buildDateInput(d)
      if (input === null) continue // the spine route (and a refusal seed) builds no date input
      const override = input.workingYearIrmaaMagiByPerson
      const investment = input.workingYearInvestmentByPerson
      expect(override, `${key}: every date-route dev seed enters complete investment figures`).toBeDefined()
      expect(investment, `${key}: the vector rides wherever the override does`).toBeDefined()
      if (override === undefined || investment === undefined) continue
      seeds++
      expect(override.length, `${key}: override aligned to people`).toBe(d.people.length)
      expect(investment.length, `${key}: I aligned to people`).toBe(d.people.length)
      d.people.forEach((p, i) => {
        if (p.workStatus === 'working') {
          workingMembers++
          // The ENGINE's pay figure (the built params the overlay reads), which must be the draft's own.
          const earned = input.params.people[i]!.earnedIncomeReal
          expect(earned, `${key} member ${i}: the built pay is the entered pay`).toBe(p.earnedIncomeReal)
          expect(override[i]! - earned, `${key} member ${i}: override − earned === I`).toBe(investment[i])
          if (investment[i]! > 0) nonzeroSlots++
        } else {
          retiredMembers++
          expect(override[i], `${key} member ${i} (retired): override slot`).toBe(0)
          expect(investment[i], `${key} member ${i} (retired): I slot`).toBe(0)
        }
      })
    }
    // Non-vacuity: the loop reached date seeds, working members with a real figure, and retired spouses.
    expect(seeds, 'date-route seeds checked').toBeGreaterThan(0)
    expect(workingMembers, 'working members checked').toBeGreaterThan(0)
    expect(nonzeroSlots, 'working members with a nonzero investment figure').toBeGreaterThan(0)
    expect(retiredMembers, 'retired members checked').toBeGreaterThan(0)
  })

  it('a RETIRED member’s entered figure never leaks — 0 in BOTH fields, and a retired member’s missing slot leaves the gate complete', () => {
    const date = DEV_SEEDS.date // Alex working (150,000 of pay), the spouse retired
    expect(date.people.map((p) => p.workStatus)).toEqual(['working', 'retired'])
    const stale = buildDateInput({ ...date, health: { ...date.health, workingYearInvestmentByPerson: [30_000, 7_000] } })!
    expect(stale.workingYearIrmaaMagiByPerson).toEqual([180_000, 0])
    expect(stale.workingYearInvestmentByPerson, 'the retired spouse’s 7,000 never reaches the engine').toEqual([30_000, 0])
    const short = buildDateInput({ ...date, health: { ...date.health, workingYearInvestmentByPerson: [30_000, undefined] } })!
    expect(short.workingYearIrmaaMagiByPerson, 'only WORKING members gate completeness').toEqual([180_000, 0])
    expect(short.workingYearInvestmentByPerson).toEqual([30_000, 0])
  })

  it('an INCOMPLETE entry (a working member’s figure missing, or the vector absent) ⇒ BOTH fields absent — no date input at all, the fact named', () => {
    // The missing-facts gate refuses FIRST (`workInvestmentLabel` for each working member without a
    // figure ⇒ `buildParams` null ⇒ `buildDateInput` null), so neither field can ever reach the engine
    // as a silent $0. (`buildDateInput`'s own completeness gate is the inner defense behind it: every
    // draft that passes the missing-facts gate is complete, so that inner arm is not reachable through
    // this builder — what is pinned here is the public consequence.)
    const dip = DEV_SEEDS.dip // both members working
    const missingSlot: ScenarioDraft = { ...dip, health: { ...dip.health, workingYearInvestmentByPerson: [10_000, undefined] } }
    expect(buildDateInput(missingSlot), 'a working member’s figure missing ⇒ no date input').toBeNull()
    expect(missingRequiredFacts(missingSlot).filter((m) => m.labelKey === 'workInvestmentLabel')).toEqual([
      { labelKey: 'workInvestmentLabel', personIndex: 1 },
    ])
    const { workingYearInvestmentByPerson: _absent, ...healthWithout } = dip.health
    const absent: ScenarioDraft = { ...dip, health: healthWithout }
    expect(buildDateInput(absent), 'the vector absent ⇒ no date input').toBeNull()
    expect(missingRequiredFacts(absent).filter((m) => m.labelKey === 'workInvestmentLabel')).toEqual([
      { labelKey: 'workInvestmentLabel', personIndex: 0 },
      { labelKey: 'workInvestmentLabel', personIndex: 1 },
    ])
    // Control: the complete seed carries both (the refusal above is the gate, not the seed).
    const complete = buildDateInput(dip)!
    expect(complete.workingYearIrmaaMagiByPerson).toEqual([85_000, 35_000])
    expect(complete.workingYearInvestmentByPerson).toEqual([10_000, 0])
  })
})

// ── THE PAY CHECK'S W (2026-10-29 — `docs/plans/features/working-year-pay-check-build-spec.md`) ────────
// U7's intake half (KTD2, KTD6: W and the employer's HSA dollar ride `DateSearchInput`), U9/U13's run
// read (`workingYearCostForRun`), U5's moved reach arm, and U6b's money-picture read (KTD12). Every
// expected figure is typed by hand from the draft and the statute tables (DND 012).

/** W as the household answers "Yes" on the W step: the draft's own quote and reading. */
const withMintedW = (d: ScenarioDraft): ScenarioDraft => {
  const w = confirmedWorkingYearCost(d)
  if (w === null) throw new Error('test fixture: this draft quotes $0, so there is no W to confirm')
  return { ...d, workingYearCost: w }
}

/** The same draft with no W answer at all (whatever a seed carries). */
const withoutW = (d: ScenarioDraft): ScenarioDraft => {
  const { workingYearCost: _w, ...rest } = d
  return rest
}

/** A household's own figure, $90,000 a year. */
const ENTERED_W: WorkingYearCostV3 = { kind: 'entered', amountReal: 90_000, entryPeriod: 'year', stateTaxReading: 'unpriced' }

const HSA_BLEND = { kind: 'exact', stockPct: 80, bondPct: 20, cashPct: 0 } as const

/** A 61-year-old worker with an HSA: $3,000 of her own and $1,000 from her employer — $4,000, under the
 *  $9,750 family-plus-catch-up ceiling at every age, so the stream's scale is 1 in every year. The
 *  spouse is retired (60, stopped at 58). Youngest 60 ⇒ a horizon of 119 − 60 + 1 = 60 years. */
const hsaEmployerDraft = (): ScenarioDraft => ({
  ...completeDateDraft(),
  people: [
    workingPerson({ birthYear: 1965, currentAge: 61 }),
    retiredPerson({ name: 'S', birthYear: 1966, currentAge: 60, retirementAge: 58 }),
  ] as ScenarioDraft['people'],
  enteredAccounts: [
    { ownerIndex: 0, kind: 'hsa', valueToday: 30_000, annualContribution: 3_000, hsaEmployerAnnual: 1_000, manualBlend: HSA_BLEND },
  ] as ScenarioDraft['enteredAccounts'],
})

/** A 56-year-old worker at today's whole HSA ceiling, $9,750 ($8,750 family + the $1,000 age-55
 *  catch-up), of which $1,000 is her employer's. The catch-up is statute-fixed, so every later runway
 *  year's ceiling erodes in real terms and the stream trims (the frozen-nominal Tier 0). */
const hsaTrimmedDraft = (): ScenarioDraft => ({
  ...completeDateDraft(),
  people: [
    workingPerson({ birthYear: 1970, currentAge: 56 }),
    retiredPerson({ name: 'S', birthYear: 1966, currentAge: 60, retirementAge: 58 }),
  ] as ScenarioDraft['people'],
  enteredAccounts: [
    { ownerIndex: 0, kind: 'hsa', valueToday: 30_000, annualContribution: 8_750, hsaEmployerAnnual: 1_000, manualBlend: HSA_BLEND },
  ] as ScenarioDraft['enteredAccounts'],
})

describe('the pay check’s W on the date input (U7: KTD2 and KTD6’s intake half)', () => {
  it('at scale 1 the employer-HSA stream is the entered employer dollar in every year of the horizon; a retired member’s entry is []', () => {
    const input = buildDateInput({ ...hsaEmployerDraft(), workingYearCost: ENTERED_W })!
    const employer = input.employerHsaByPerson!
    expect(employer).toHaveLength(2)
    expect(employer[0], 'one entry per year of the 60-year horizon').toHaveLength(60)
    expect(employer[0]!.every((x) => x === 1_000), 'the $1,000 employer dollar, unscaled').toBe(true)
    expect(employer[1], 'the retired spouse deposits nothing — an empty entry, never a hole').toEqual([])
  })

  it('in a trimmed year the employer dollar is scaled by the SAME factor as the hsa stream it rides in', () => {
    // The runway ceiling of calendar year y in real dollars: 8,750 + 1,000 ÷ the price index of y (the
    // closed form the stream's own test derives, re-typed here from the trend table).
    const trend = medicareCostTrend.value
    const idx = (y: number): number =>
      y <= trend.anchorYear
        ? 1
        : (1 + trend.cpiNearTermAvg) ** (Math.min(y, trend.anchorYear + trend.premiums.length) - trend.anchorYear) *
          (1 + trend.cpiUltimate) ** Math.max(0, y - trend.anchorYear - trend.premiums.length)
    const input = buildDateInput({ ...hsaTrimmedDraft(), workingYearCost: ENTERED_W })!
    const hsa = input.params.overlay!.accumulation!.contributionsByPerson[0]!.hsa!
    const employer = input.employerHsaByPerson![0]!
    expect(employer[0]).toBe(1_000) // year 0: today's ceiling, untrimmed
    for (const t of [1, 5, 9]) {
      const scale = (8_750 + 1_000 / idx(2026 + t)) / 9_750
      expect(scale, `year ${t} trims`).toBeLessThan(1)
      expect(employer[t], `year ${t}: the employer dollar × the year's scale`).toBeCloseTo(1_000 * scale, 9)
      expect(employer[t], `year ${t}: the hsa stream's own scale`).toBeCloseTo((1_000 * hsa[t]!) / 9_750, 9)
    }
    expect(1_000 - employer[9]!, 'non-vacuous: the trim is real cents by year 9').toBeGreaterThan(5)
  })

  it('W changes NOTHING inside the built params — the contribution streams are byte-identical with and without it', () => {
    for (const d of [hsaEmployerDraft(), hsaTrimmedDraft(), completeDateDraft()]) {
      const without = buildDateInput(d)!
      const withW = buildDateInput({ ...d, workingYearCost: ENTERED_W })!
      expect(withW.params.overlay!.accumulation!.contributionsByPerson).toEqual(
        without.params.overlay!.accumulation!.contributionsByPerson,
      )
      expect(withW.params).toEqual(without.params)
    }
  })

  it('every employer entry is ≤ that person’s hsa deposit in the same year (validateParams’ bound)', () => {
    let compared = 0
    for (const d of [hsaEmployerDraft(), hsaTrimmedDraft()]) {
      const input = buildDateInput({ ...d, workingYearCost: ENTERED_W })!
      input.employerHsaByPerson!.forEach((entry, i) => {
        const hsa = input.params.overlay!.accumulation!.contributionsByPerson[i]!.hsa
        entry.forEach((x, t) => {
          expect(x, `person ${i}, year ${t}`).toBeLessThanOrEqual(hsa?.[t] ?? 0)
          compared++
        })
      })
    }
    expect(compared, 'non-vacuous').toBeGreaterThan(100)
  })

  it('W and the stream ride ONLY when W is present — absent, neither key exists', () => {
    const absent = buildDateInput(completeDateDraft())!
    expect('workingYearCostReal' in absent).toBe(false)
    expect('employerHsaByPerson' in absent).toBe(false)
    const entered = buildDateInput({ ...completeDateDraft(), workingYearCost: ENTERED_W })!
    expect(entered.workingYearCostReal).toBe(90_000)
    const confirmed = buildDateInput({
      ...completeDateDraft(),
      workingYearCost: { kind: 'confirmed', quotedReal: 84_000, stateTaxReading: 'unpriced' },
    })!
    expect(confirmed.workingYearCostReal).toBe(84_000)
    // A worker with no HSA rides a zero for every year (58 youngest ⇒ 62 years); the retired spouse [].
    expect(confirmed.employerHsaByPerson).toEqual([new Array<number>(62).fill(0), []])
  })

  it('an entered $0 never rides — the run reads exactly as before W was answered (rulings 17 and 22: the ONE carriage rule)', () => {
    // The walk writes a typed $0 into the draft so its own zero rule can hold Continue; the engine
    // accepts W = 0, so the carriage rule's "above $0" is the only thing between that 0 and a run.
    const zero: WorkingYearCostV3 = { kind: 'entered', amountReal: 0, entryPeriod: 'month', stateTaxReading: 'unpriced' }
    const d: ScenarioDraft = { ...completeDateDraft(), workingYearCost: zero }
    const input = buildDateInput(d)!
    expect(input, 'the draft is buildable').not.toBeNull()
    expect('workingYearCostReal' in input).toBe(false)
    expect('employerHsaByPerson' in input).toBe(false)
    expect(input).toEqual(buildDateInput(completeDateDraft()))
    expect(workingYearCostForRun(d)).toBe('unpriced')
  })

  it('a STALE W still rides — the engine keeps using the last figure the household gave (R4)', () => {
    // Confirmed at 80,000; the draft now quotes its 84,000 spending.
    const d: ScenarioDraft = {
      ...completeDateDraft(),
      workingYearCost: { kind: 'confirmed', quotedReal: 80_000, stateTaxReading: 'unpriced' },
    }
    expect(isWorkingYearCostStale(d)).toBe(true)
    expect(buildDateInput(d)!.workingYearCostReal).toBe(80_000)
  })

  it('validateParams accepts EVERY candidate Y = 0..top of a W-present draft with an employer HSA dollar', () => {
    for (const d of [hsaEmployerDraft(), hsaTrimmedDraft()]) {
      expect(missingRequiredFacts(d), 'buildable').toEqual([])
      const input = buildDateInput({ ...d, workingYearCost: ENTERED_W })!
      for (let y = 0; y <= DATE_OFFSET_WINDOW_TOP; y++) {
        const candidate = buildCandidateParams(input, y, DATE_SEARCH_PATHS.provisional)
        expect(validateParams(candidate), `Y=${y}`).toBeNull()
        const acc = candidate.overlay!.accumulation!
        expect(acc.workingYearCostReal, `Y=${y}: W lands on the candidate`).toBe(90_000)
        expect(acc.employerHsaByPerson![0], `Y=${y}: the stream is cut to the working years`).toHaveLength(y)
      }
    }
  })
})

describe('workingYearCostForRun — does THIS run carry W? (U9, U13)', () => {
  it('a W-present date draft reads priced; the same draft without W reads unpriced', () => {
    expect(workingYearCostForRun(withMintedW(DEV_SEEDS.date))).toBe('priced')
    expect(workingYearCostForRun(withoutW(DEV_SEEDS.date))).toBe('unpriced')
  })

  it('an unbuildable draft reads unknown, W or not', () => {
    const noSpend = { ...withMintedW(DEV_SEEDS.date), annualSpendingReal: undefined } as unknown as ScenarioDraft
    expect(missingRequiredFacts(noSpend).length).toBeGreaterThan(0)
    expect(workingYearCostForRun(noSpend)).toBe('unknown')
    const solo = withMintedW(DEV_SEEDS.datesolo)
    expect(missingRequiredFacts(solo).length).toBeGreaterThan(0)
    expect(workingYearCostForRun(solo)).toBe('unknown')
  })

  it('an all-retired draft carrying a stored W reads unpriced — the spine never carries it', () => {
    const d = withMintedW(completeSpineDraft())
    expect(isDateRoute(d)).toBe(false)
    expect(missingRequiredFacts(d)).toEqual([])
    expect(workingYearCostForRun(d)).toBe('unpriced')
  })
})

describe('the reach walk under W (U5’s moved arm, KTD15)', () => {
  it('a W-present draft reads priced through the intake read and the walk — never a masked throw', () => {
    const d = withMintedW(DEV_SEEDS.date)
    const input = buildDateInput(d)!
    expect(input.workingYearCostReal, 'W rides the input').toBe(84_000)
    expect(() => workingYearTaxReach(input)).not.toThrow()
    expect(workingYearTaxReach(input)).toBe('priced')
    expect(workingYearTaxForRun(d), 'its catch would turn a throw into unknown').toBe('priced')
  })

  it('non-vacuous: a household the floor never reaches reads unpriced without W and priced with it — the W branch answers', () => {
    // Both still working at 45 and 47 (the floor's unreached household, stalenessExposure.test.ts).
    const base = DEV_SEEDS.date
    const { retirementAge: _samRetired, ...sam } = base.people[1]!
    const young: ScenarioDraft = withoutW({
      ...base,
      people: [
        { ...base.people[0]!, birthYear: 1981, currentAge: 45 },
        { ...sam, birthYear: 1979, currentAge: 47, workStatus: 'working', earnedIncomeReal: 60_000 },
      ],
    })
    expect(missingRequiredFacts(young), 'buildable').toEqual([])
    expect(workingYearTaxForRun(young)).toBe('unpriced')
    expect(workingYearTaxForRun(withMintedW(young))).toBe('priced')
  })
})

describe('the money picture’s draft events (U6b; KTD12 as built A7)', () => {
  /** A worker at the 60–63 super catch-up ceiling in her 401(k). */
  const superBand = (ownerIndex: 0 | 1, age: number) => ({
    ownerIndex,
    kind: '401k' as const,
    ticker: 'VTI',
    valueToday: 500_000,
    annualContribution: contributionCeilingFor('401k', age)!,
  })

  it('a 61-year-old super-band depositor steps down in year 3 — the year she turns 64 and the 60–63 window closes', () => {
    const d: ScenarioDraft = {
      ...completeDateDraft(),
      people: [
        workingPerson({ birthYear: 1965, currentAge: 61 }),
        retiredPerson({ name: 'S', birthYear: 1966, currentAge: 60, retirementAge: 58 }),
      ] as ScenarioDraft['people'],
      enteredAccounts: [superBand(0, 61)] as ScenarioDraft['enteredAccounts'],
    }
    const H = buildDateInput(d)!.params.maxHorizonYears
    expect(workingYearDraftEvents(d, H)).toEqual([{ yearsIn: 3, code: 'catchUpStepDown', person: 0 }])
  })

  it('TWO super-band depositors give TWO step-downs — every one, not only the first (62 steps down in year 2, 61 in year 3)', () => {
    const d: ScenarioDraft = {
      ...completeDateDraft(),
      people: [
        workingPerson({ birthYear: 1965, currentAge: 61 }),
        workingPerson({ name: 'S', sex: 'male', birthYear: 1964, currentAge: 62, earnedIncomeReal: 90_000 }),
      ] as ScenarioDraft['people'],
      enteredAccounts: [superBand(0, 61), superBand(1, 62)] as ScenarioDraft['enteredAccounts'],
    }
    expect(workingYearDraftEvents(d, 20)).toEqual([
      { yearsIn: 2, code: 'catchUpStepDown', person: 1 },
      { yearsIn: 3, code: 'catchUpStepDown', person: 0 },
    ])
  })

  it('no step-down where nothing steps down: a deposit under the age-64 ceiling, or a retired owner', () => {
    const under: ScenarioDraft = {
      ...completeDateDraft(),
      people: [
        workingPerson({ birthYear: 1965, currentAge: 61 }),
        retiredPerson({ name: 'S', birthYear: 1966, currentAge: 60, retirementAge: 58 }),
      ] as ScenarioDraft['people'],
      // $20,000 sits under the age-64 ceiling ($24,500 + the $8,000 catch-up), so no year trims it.
      enteredAccounts: [{ ...superBand(0, 61), annualContribution: 20_000 }] as ScenarioDraft['enteredAccounts'],
    }
    expect(workingYearDraftEvents(under, 20)).toEqual([])
    const retired: ScenarioDraft = {
      ...completeSpineDraft(),
      enteredAccounts: [superBand(1, 63)] as ScenarioDraft['enteredAccounts'],
    }
    expect(workingYearDraftEvents(retired, 20)).toEqual([])
  })

  /** `completeDateDraft` (W 58 working, S 60 retired ⇒ a 62-year horizon) with other income. */
  const withIncome = (...incomeStreams: IncomeStream[]): ScenarioDraft => ({ ...completeDateDraft(), incomeStreams })
  const pension = (over: Partial<IncomeStream> = {}): IncomeStream =>
    ({ ownerIndex: 0, type: 'pension', annualRealToday: 30_000, startAge: 55, colaMode: 'real-flat', survivorPct: 0.5, ...over }) as IncomeStream

  it('a pension that ends inside the window gives incomeEnds the year after its last paying year (58 → its last at 62 is year 4, so year 5)', () => {
    const d = withIncome(pension({ endAge: 62 }))
    expect(workingYearDraftEvents(d, 62)).toEqual([{ yearsIn: 5, code: 'incomeEnds', person: 0 }])
  })

  it('a stream that starts later gives incomeStarts (the spouse, 60, from 63: year 3); a lifetime stream’s end lands at the horizon', () => {
    const d = withIncome(pension({ ownerIndex: 1, startAge: 63 }))
    expect(workingYearDraftEvents(d, 62)).toEqual([
      { yearsIn: 3, code: 'incomeStarts', person: 1 },
      { yearsIn: 62, code: 'incomeEnds', person: 1 },
    ])
  })

  it('each stream is read ALONE: a pension ending beside a second stream of the same owner still names its end', () => {
    // Pre-summed, the owner's leaf never reaches 0 in year 5 (the rental keeps paying); alone, it does.
    const d = withIncome(pension({ endAge: 62 }), pension({ type: 'rental', annualRealToday: 12_000 } as Partial<IncomeStream>))
    expect(workingYearDraftEvents(d, 62)).toEqual([
      { yearsIn: 5, code: 'incomeEnds', person: 0 },
      { yearsIn: 62, code: 'incomeEnds', person: 0 },
    ])
  })

  it('a stream that already ended, or pays $0, names nothing — never a negative year', () => {
    expect(workingYearDraftEvents(withIncome(pension({ startAge: 40, endAge: 50 })), 62)).toEqual([])
    expect(workingYearDraftEvents(withIncome(pension({ annualRealToday: 0 })), 62)).toEqual([])
  })
})

describe('workingYearLedgerForRun — the money picture’s intake read (U6b; KTD12)', () => {
  it('no W, or no run to build, reads unknown', () => {
    expect(workingYearLedgerForRun(withoutW(DEV_SEEDS.date)), 'W absent').toBe('unknown')
    const solo = withMintedW(DEV_SEEDS.datesolo)
    expect(missingRequiredFacts(solo).length, 'datesolo is unbuildable').toBeGreaterThan(0)
    expect(workingYearLedgerForRun(solo)).toBe('unknown')
    expect(workingYearLedgerForRun(withMintedW(completeSpineDraft())), 'the all-retired route has no picture').toBe('unknown')
  })

  it('a draft the ENGINE refuses (a claim age of 55, which no missing fact names) reads unknown — never a crash', () => {
    const refused = withMintedW({
      ...DEV_SEEDS.date,
      people: [{ ...DEV_SEEDS.date.people[0]!, socialSecurityClaimAge: 55 }, DEV_SEEDS.date.people[1]!],
    })
    expect(missingRequiredFacts(refused), 'no missing fact').toEqual([])
    const input = buildDateInput(refused)!
    expect(() => workingYearLedger({ params: buildCandidateParams(input, DATE_OFFSET_WINDOW_TOP, 1), draftEvents: [] })).toThrow()
    expect(workingYearLedgerForRun(refused)).toBe('unknown')
  })

  it('a horizon the date search turns away (at or below the window top) reads unknown, though the producer itself would compose it', () => {
    // A plant that ages the household WITHOUT moving its birth years (so Social Security still prices),
    // isolating the guard: youngest 110 ⇒ 119 − 110 + 1 = 10 years, at the window top.
    const aged = (age: number): ScenarioDraft =>
      withMintedW({
        ...DEV_SEEDS.date,
        people: [
          { ...DEV_SEEDS.date.people[0]!, currentAge: age },
          { ...DEV_SEEDS.date.people[1]!, currentAge: age + 2 },
        ],
        health: { ...DEV_SEEDS.date.health, irmaaMagiSeed: [180_000, 40_000] },
      })
    const atTop = aged(110)
    const input = buildDateInput(atTop)!
    expect(input.params.maxHorizonYears).toBe(10)
    const params = buildCandidateParams(input, DATE_OFFSET_WINDOW_TOP, 1)
    expect(() => workingYearLedger({ params, draftEvents: [] }), 'the producer alone composes it').not.toThrow()
    expect(workingYearLedgerForRun(atTop)).toBe('unknown')
    // One year younger the horizon clears the top (11 years), and the picture shows.
    expect(buildDateInput(aged(109))!.params.maxHorizonYears).toBe(11)
    expect(workingYearLedgerForRun(aged(109))).not.toBe('unknown')
  })

  it('a W-present draft reads the PRODUCER’s picture of the window-top candidate, its W line the confirmed quote', () => {
    const d = withMintedW(DEV_SEEDS.date)
    expect(workingYearDraftEvents(d, 62), 'date names no draft event').toEqual([])
    const read = workingYearLedgerForRun(d)
    expect(read).toEqual(
      workingYearLedger({ params: buildCandidateParams(buildDateInput(d)!, DATE_OFFSET_WINDOW_TOP, 1), draftEvents: [] }),
    )
    if (read === 'unknown') throw new Error('unreachable')
    expect(read.year0.goingOut.workingYearCost.dollars, 'date spends $84,000 a year').toBe(84_000)
  })

  it('the draft’s events reach the picture: a pension ending in year 5 and two catch-up step-downs are each named in their year', () => {
    const pensionEnds: ScenarioDraft = withMintedW({
      ...completeDateDraft(),
      incomeStreams: [
        { ownerIndex: 0, type: 'pension', annualRealToday: 30_000, startAge: 55, endAge: 62, colaMode: 'real-flat', survivorPct: 0.5 },
      ],
    })
    expect(missingRequiredFacts(pensionEnds)).toEqual([])
    const p = workingYearLedgerForRun(pensionEnds)
    if (p === 'unknown') throw new Error('the pension household must compose')
    expect(p.laterYears.find((y) => y.yearsIn === 5)?.events).toContainEqual({ code: 'incomeEnds', person: 0 })

    const twoSteps: ScenarioDraft = withMintedW({
      ...completeDateDraft(),
      people: [
        workingPerson({ birthYear: 1965, currentAge: 61 }),
        workingPerson({ name: 'S', sex: 'male', birthYear: 1964, currentAge: 62, earnedIncomeReal: 90_000 }),
      ] as ScenarioDraft['people'],
      enteredAccounts: [
        { ownerIndex: 0, kind: '401k', ticker: 'VTI', valueToday: 500_000, annualContribution: contributionCeilingFor('401k', 61)! },
        { ownerIndex: 1, kind: '401k', ticker: 'VTI', valueToday: 500_000, annualContribution: contributionCeilingFor('401k', 62)! },
      ] as ScenarioDraft['enteredAccounts'],
      health: { enrolledPremiumMonthlyToday: 1_100, slcspMonthlyToday: 1_000, workingYearInvestmentByPerson: [30_000, 0] },
    })
    expect(missingRequiredFacts(twoSteps)).toEqual([])
    const s = workingYearLedgerForRun(twoSteps)
    if (s === 'unknown') throw new Error('the two-saver household must compose')
    expect(s.laterYears.find((y) => y.yearsIn === 2)?.events).toContainEqual({ code: 'catchUpStepDown', person: 1 })
    expect(s.laterYears.find((y) => y.yearsIn === 3)?.events).toContainEqual({ code: 'catchUpStepDown', person: 0 })
  })

  it('memoized on the draft REFERENCE: the same draft returns the same object; a copy is recomposed', () => {
    const d = withMintedW(DEV_SEEDS.date)
    const first = workingYearLedgerForRun(d)
    expect(first).not.toBe('unknown')
    expect(workingYearLedgerForRun(d)).toBe(first)
    const copyOf = workingYearLedgerForRun({ ...d })
    expect(copyOf).toEqual(first)
    expect(copyOf).not.toBe(first)
  })

  it('every date seed given its own confirmed W shows a picture exactly when it is buildable — only datesolo is not', () => {
    const unknown: string[] = []
    let shown = 0
    for (const [key, seed] of Object.entries(DEV_SEEDS)) {
      if (!isDateRoute(seed)) continue
      const read = workingYearLedgerForRun(withMintedW(seed))
      expect(read === 'unknown', key).toBe(missingRequiredFacts(seed).length > 0)
      if (read === 'unknown') unknown.push(key)
      else shown++
    }
    expect(unknown).toEqual(['datesolo'])
    expect(shown, 'at least the eight buildable date seeds').toBeGreaterThanOrEqual(8)
  })
})
