import { describe, expect, it } from 'vitest'
import {
  accountField,
  annualAdditionsCeilingFor,
  contributionCeilingFor,
  incomeField,
  personField,
  validateDraft,
  validateField,
} from '../sanity'
import { formatMoney } from '../fields'
import type { ScenarioDraft, PersonDraft } from '@store/memoryModel'
import type { IncomeStream } from '@shared/model'

/** R19 UI-half rules: per-rule fire AND boundary-pass pairs (the phase-2 U5
 *  test contract), the status-conditional supersession, touched gating, and
 *  the directional back-nav re-fire. */

const draft = (
  p0: PersonDraft = {},
  p1: PersonDraft = {},
  over: Partial<ScenarioDraft> = {},
): ScenarioDraft => ({
  people: [p0, p1],
  enteredAccounts: [],
  incomeStreams: [],
  tickerClassifications: {},
  health: {},
  survivorSpendingRatio: 0.75,
  drawdownPolicy: 'proportional',
  filing: 'mfj',
  startCalendarYear: 2026,
  taxVintage: 'OBBBA-2025',
  appDefaultVersion: 'test',
  ...over,
  spendEntryPeriod: over.spendEntryPeriod ?? 'month',
})

const touchedAll = new Set([
  personField(0, 'retirementAge'),
  personField(0, 'socialSecurityClaimAge'),
  personField(0, 'birthYear'),
  personField(1, 'retirementAge'),
  'survivorSpendingRatio',
])

describe('sanity — the status-conditional age rule (D1 supersession)', () => {
  it('fires: a RETIRED person whose stop age is in the future (status-vs-age disagreement)', () => {
    const d = draft({ workStatus: 'retired', retirementAge: 66, currentAge: 65 })
    const v = validateDraft(d, touchedAll)
    expect(v).toMatchObject([{ rule: 'retired-stop-age-in-future', messageKey: 'errStopAgeInFuture' }])
  })

  it('boundary passes: stop age EQUAL to current age (stopped this year)', () => {
    const d = draft({ workStatus: 'retired', retirementAge: 65, currentAge: 65 })
    expect(validateDraft(d, touchedAll)).toEqual([])
  })

  it('passes: a stop age well in the past (retired at 62, now 68 — the legitimate negative offset)', () => {
    const d = draft({ workStatus: 'retired', retirementAge: 62, currentAge: 68 })
    expect(validateDraft(d, touchedAll)).toEqual([])
  })

  it('never fires for a STILL-WORKING person (the placeholder is > currentAge by construction)', () => {
    const d = draft({ workStatus: 'working', retirementAge: 66, currentAge: 65 })
    expect(validateDraft(d, touchedAll)).toEqual([])
  })
})

describe('sanity — SS claim window', () => {
  const claim = (age: number) =>
    validateDraft(draft({ socialSecurityClaimAge: age }), touchedAll)
  it('61 fires / 62 passes (lower boundary)', () => {
    expect(claim(61)).toMatchObject([{ rule: 'ss-claim-window' }])
    expect(claim(62)).toEqual([])
  })
  it('71 fires / 70 passes (upper boundary)', () => {
    expect(claim(71)).toMatchObject([{ rule: 'ss-claim-window' }])
    expect(claim(70)).toEqual([])
  })
})

describe('sanity — PIA magnitude ceiling (the 12× monthly-vs-yearly misentry guard)', () => {
  const touchedPia = new Set([personField(0, 'pia')])
  const pia = (annual: number) => validateDraft(draft({ pia: annual }), touchedPia)
  it('fires above the bound: a $2,500/mo benefit ($30k/yr) fat-fingered into the monthly box → stored ×12 = $360k', () => {
    expect(pia(360_000)).toMatchObject([{ rule: 'pia-over-ceiling', messageKey: 'errPiaCeiling' }])
  })
  it('passes a real high earner: the SSA age-70 maximum (~$5,181/mo → ~$62,172/yr) is under the bound', () => {
    expect(pia(62_172)).toEqual([])
  })
  it('boundary: exactly $100,000/yr passes, just above fires', () => {
    expect(pia(100_000)).toEqual([])
    expect(pia(100_001)).toMatchObject([{ rule: 'pia-over-ceiling' }])
  })
})

describe('sanity — survivor ratio ceiling', () => {
  it('>100% fires / exactly 100% passes', () => {
    expect(
      validateDraft(draft({}, {}, { survivorSpendingRatio: 1.01 }), touchedAll),
    ).toMatchObject([{ rule: 'survivor-ratio-ceiling' }])
    expect(validateDraft(draft({}, {}, { survivorSpendingRatio: 1 }), touchedAll)).toEqual([])
  })
})

describe('sanity — birth year + model-age domain', () => {
  it('a future birth year fires / the current year passes', () => {
    expect(validateDraft(draft({ birthYear: 2027 }), touchedAll)).toMatchObject([
      { rule: 'birth-year-in-future' },
    ])
    expect(validateDraft(draft({ birthYear: 2026 }), touchedAll)).toEqual([])
  })
  it('age 120 fires / 119 passes (the SSA-table ceiling)', () => {
    expect(validateDraft(draft({ currentAge: 120 }), touchedAll)).toMatchObject([
      { rule: 'age-beyond-model' },
    ])
    expect(validateDraft(draft({ currentAge: 119 }), touchedAll)).toEqual([])
  })
})

describe('sanity — coherent-but-dire flows through (only impossibilities block)', () => {
  // SUPERSEDED PIN (U12, council 2026-07-08 — the hawk's F9 veto): this arm previously
  // pinned "$0 spend raises NO violation (→ the honest 0-of-10 path)". That rationale was
  // factually BACKWARDS — a $0 spend never depletes, so it renders a confident 10-of-10
  // "over-funded" on a household spending nothing (the rosiest calm-but-wrong), not 0-of-10.
  // WORSE, the old pin was VACUOUS (insight 029): `touchedAll` never contained
  // 'annualSpendingReal', so the touch filter alone produced its expected [] — the rule
  // layer was never exercised. These arms use a touched set that actually includes the
  // field. The coherent-but-dire doctrine's real case is the $0 PORTFOLIO with positive
  // spend (the module header's own example) — that path is untouched and stays clean.
  const touchedSpend = new Set([...touchedAll, 'annualSpendingReal'])
  it('a $0 SPEND now fires spend-zero (the F9 widened gate) — it was never coherent-but-dire', () => {
    const d = draft(
      { workStatus: 'retired', retirementAge: 64, currentAge: 65 },
      { workStatus: 'retired', retirementAge: 64, currentAge: 65 },
      { annualSpendingReal: 0 },
    )
    expect(validateDraft(d, touchedSpend)).toMatchObject([
      { rule: 'spend-zero', field: 'annualSpendingReal', messageKey: 'errSpendZero' },
    ])
  })
  it('a positive spend raises no spend-zero violation (the release sibling)', () => {
    const d = draft(
      { workStatus: 'retired', retirementAge: 64, currentAge: 65 },
      { workStatus: 'retired', retirementAge: 64, currentAge: 65 },
      { annualSpendingReal: 48_000 },
    )
    expect(validateDraft(d, touchedSpend)).toEqual([])
  })
  it('an ABSENT spend stays the missing-fact channel’s job — no spend-zero violation', () => {
    const d = draft(
      { workStatus: 'retired', retirementAge: 64, currentAge: 65 },
      { workStatus: 'retired', retirementAge: 64, currentAge: 65 },
      {},
    )
    expect(validateDraft(d, touchedSpend)).toEqual([])
  })
})

describe('sanity — touched gating + directional re-validation', () => {
  it('an untouched field never pre-flags (the violation waits for its commit)', () => {
    const d = draft({ workStatus: 'retired', retirementAge: 66, currentAge: 65 })
    expect(validateDraft(d, new Set())).toEqual([])
    // …but the field-scoped blur check sees it regardless (its own commit).
    expect(validateField(d, personField(0, 'retirementAge'))).toHaveLength(1)
  })

  it('a back-nav upstream edit re-fires the downstream rule at the point of edit (answers kept)', () => {
    // Entered: retired at 64, then current age 65 — coherent; both committed.
    const before = draft({ workStatus: 'retired', retirementAge: 64, currentAge: 65, birthYear: 1961 })
    const touched = new Set([personField(0, 'birthYear'), personField(0, 'retirementAge')])
    expect(validateDraft(before, touched)).toEqual([])

    // Back: the user corrects the birth year — current age re-derives to 63.
    // The DOWNSTREAM stop-age answer is KEPT (still 64 in the draft) but its
    // rule now fires — same calm message, surfaced by the same pure recompute.
    const after = draft({ workStatus: 'retired', retirementAge: 64, currentAge: 63, birthYear: 1963 })
    expect(validateDraft(after, touched)).toMatchObject([
      { rule: 'retired-stop-age-in-future', field: personField(0, 'retirementAge') },
    ])
  })
})

describe('sanity — the spend period force-confirm (R19 line one; D1 review AB1)', () => {
  const touchedSpend = new Set(['annualSpendingReal'])

  it('forces a confirm ABOVE the old band ceiling under the unconfirmed month default (the 12× misentry)', () => {
    // User typed 55000 under the default 'month' (means $55k/yr) → stored 660000;
    // entered (month-view) = 55000, above the old $50k ceiling that let it sail
    // through to a confident $660k/yr verdict. The floor now has no upper bound.
    const d = draft({}, {}, { annualSpendingReal: 660_000, spendEntryPeriod: 'month' })
    expect(validateDraft(d, touchedSpend)).toMatchObject([
      { rule: 'spend-period-unconfirmed', messageKey: 'periodConfirmPrompt' },
    ])
  })

  it('still forces a confirm for an in-band figure (the original case holds)', () => {
    const d = draft({}, {}, { annualSpendingReal: 360_000, spendEntryPeriod: 'month' }) // entered = 30k
    expect(validateDraft(d, touchedSpend)).toMatchObject([
      { rule: 'spend-period-unconfirmed', messageKey: 'periodConfirmPrompt' },
    ])
  })

  it('does NOT fire below the floor (an unambiguously-monthly small figure)', () => {
    const d = draft({}, {}, { annualSpendingReal: 60_000, spendEntryPeriod: 'month' }) // entered = 5k < 8k
    expect(validateDraft(d, touchedSpend)).toEqual([])
  })

  it('clears the instant the period is explicitly declared (the disarm)', () => {
    const d = draft({}, {}, { annualSpendingReal: 660_000, spendEntryPeriod: 'month' })
    expect(validateDraft(d, new Set(['annualSpendingReal', 'spendEntryPeriod']))).toEqual([])
  })
})

describe('sanity — the spend period force-confirm honors hydration provenance (the restored-draft revisit)', () => {
  // A draft hydrated from a persisted vault / complete dev seed cleared the flow's
  // force-confirm BEFORE it was ever written; a fresh IntakeFlow mount starts `touched`
  // empty, so that prior confirmation survives ONLY as provenance. Revisiting the spend
  // AMOUNT (touching annualSpendingReal, NOT re-tapping the period) must not re-nag —
  // the persisted unit is the household's authored, validated choice.
  const revisitTouched = new Set(['annualSpendingReal']) // amount touched, period NOT

  it('restored draft + revisit spend without touching the period → NO nag (periodConfirmed disarms)', () => {
    const d = draft({}, {}, { annualSpendingReal: 660_000, spendEntryPeriod: 'month' }) // month-view 55k, over the floor
    // Without provenance it DOES fire — that is exactly the false-fire this closes.
    expect(validateDraft(d, revisitTouched)).toMatchObject([{ rule: 'spend-period-unconfirmed' }])
    // With provenance the nag is disarmed even though 'spendEntryPeriod' is untouched.
    expect(validateDraft(d, revisitTouched, { periodConfirmed: true })).toEqual([])
  })

  it('also disarms a persisted YEAR period on revisit (year is never the entry default — only a prior explicit choice)', () => {
    // spendEntryPeriod='year' → entered = the annual figure itself; a hydrated draft carries
    // no touched 'spendEntryPeriod', so pre-fix the nag false-fires on the year arm too.
    const d = draft({}, {}, { annualSpendingReal: 120_000, spendEntryPeriod: 'year' })
    expect(validateDraft(d, revisitTouched)).toMatchObject([{ rule: 'spend-period-unconfirmed' }])
    expect(validateDraft(d, revisitTouched, { periodConfirmed: true })).toEqual([])
  })

  it('fresh draft (no/false provenance), period never touched → the nag STILL fires exactly as today', () => {
    const d = draft({}, {}, { annualSpendingReal: 660_000, spendEntryPeriod: 'month' })
    // The 2-arg call flow.tsx makes today (provenance absent) is unchanged.
    expect(validateDraft(d, revisitTouched)).toMatchObject([
      { rule: 'spend-period-unconfirmed', messageKey: 'periodConfirmPrompt' },
    ])
    // An EXPLICIT periodConfirmed:false is identical — a fresh session never suppresses the guard.
    expect(validateDraft(d, revisitTouched, { periodConfirmed: false })).toMatchObject([
      { rule: 'spend-period-unconfirmed' },
    ])
  })

  it('fresh draft, period explicitly touched THIS session → still disarmed (touched wins without provenance)', () => {
    const d = draft({}, {}, { annualSpendingReal: 660_000, spendEntryPeriod: 'month' })
    expect(validateDraft(d, new Set(['annualSpendingReal', 'spendEntryPeriod']))).toEqual([])
  })

  it('provenance never MANUFACTURES a violation: a below-floor spend stays clean with periodConfirmed either way', () => {
    const d = draft({}, {}, { annualSpendingReal: 60_000, spendEntryPeriod: 'month' }) // entered = 5k < 8k floor
    expect(validateDraft(d, revisitTouched, { periodConfirmed: true })).toEqual([])
    expect(validateDraft(d, revisitTouched, { periodConfirmed: false })).toEqual([])
  })
})

describe('sanity — the combined HSA family ceiling (employer + employee share one limit)', () => {
  // The advance-time backstop the form's single-account pre-check structurally CANNOT
  // cover: a combined personal+employer total over the one HSA family limit — including
  // across two same-owner HSAs (allowed by missingRequiredFacts, which only blocks HSAs
  // owned by DIFFERENT people). Ceilings are source-bound (contributionCeilingFor), never
  // re-typed here (DND 012).
  const touchedContribution = new Set([accountField(0, 'annualContribution')])
  const hsaDraft = (over: Partial<ScenarioDraft>): ScenarioDraft =>
    draft({ workStatus: 'working', currentAge: 61, birthYear: 1965 }, {}, over)

  it('fires when personal + employer COMBINED exceed the family ceiling (one account) — and QUOTES the limit (F10)', () => {
    const ceiling = contributionCeilingFor('hsa', 61)!
    const d = hsaDraft({
      enteredAccounts: [
        { ownerIndex: 0, kind: 'hsa', valueToday: 30_000, annualContribution: ceiling - 1000, hsaEmployerAnnual: 1001 },
      ],
    })
    // The params pin is SOURCE-BOUND: the pre-formatted limit is built from the real ceiling
    // helper + the intake money formatter — never a re-typed dollar (DND 012).
    expect(validateDraft(d, touchedContribution)).toMatchObject([
      {
        rule: 'contribution-over-ceiling',
        messageKey: 'errContributionCeiling',
        params: { limitFormatted: formatMoney(ceiling) },
      },
    ])
  })

  it('the advance-time §415(c) rule QUOTES its own limit too (params ride the additions violation — F10)', () => {
    const ceiling = annualAdditionsCeilingFor(61)
    const d = hsaDraft({
      enteredAccounts: [
        {
          ownerIndex: 0,
          kind: '401k',
          valueToday: 500_000,
          annualContribution: 10_000,
          employerMatchAnnual: ceiling - 10_000 + 1,
        },
      ],
    })
    expect(validateDraft(d, new Set([accountField(0, 'employerMatchAnnual')]))).toMatchObject([
      {
        rule: 'additions-over-415c',
        messageKey: 'errAdditionsCeiling',
        params: { limitFormatted: formatMoney(ceiling) },
      },
    ])
  })

  it('boundary passes: personal + employer exactly at the family ceiling', () => {
    const ceiling = contributionCeilingFor('hsa', 61)!
    const d = hsaDraft({
      enteredAccounts: [
        { ownerIndex: 0, kind: 'hsa', valueToday: 30_000, annualContribution: ceiling - 1000, hsaEmployerAnnual: 1000 },
      ],
    })
    expect(validateDraft(d, touchedContribution)).toEqual([])
  })

  it('catches two SAME-OWNER HSAs whose combined personal+employer exceeds the limit (the cross-account backstop)', () => {
    const ceiling = contributionCeilingFor('hsa', 61)!
    const d = hsaDraft({
      enteredAccounts: [
        { ownerIndex: 0, kind: 'hsa', valueToday: 10_000, annualContribution: ceiling - 1000 },
        { ownerIndex: 0, kind: 'hsa', valueToday: 5_000, hsaEmployerAnnual: 1001 },
      ],
    })
    expect(validateDraft(d, touchedContribution)).toMatchObject([{ rule: 'contribution-over-ceiling' }])
  })
})

// ---------------------------------------------------------------------------
// R40 other-income ENTITY-SCALAR ranges (the entity-side gate KTD-4 names — the
// engine multiplies these scalars away, so its validateParams never sees them;
// the ONLY guards are the form's controls AND these rules AND the U8 codec).
// These fire on a directly-mutated draft / a restored blob (no touched state),
// so they are exercised via validateField (touched-independent). The fixtures
// are the SHAPE the U8 restore path produces (`JSON.parse + as` erases the
// discriminated union, so a corrupt scalar IS representable post-restore).
// ---------------------------------------------------------------------------

const incomeDraft = (streams: readonly IncomeStream[]): ScenarioDraft => draft({}, {}, { incomeStreams: streams })

describe('sanity — R40 income entity-scalar ranges (fail-loud, the KTD-4 entity gate)', () => {
  it('survivorPct > 1 fires LOUD (a survivor cannot keep more than 100% of a benefit)', () => {
    const s: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 30_000, startAge: 65, colaMode: 'real-flat', survivorPct: 1.2 }
    expect(validateField(incomeDraft([s]), incomeField(0, 'survivorPct'))).toMatchObject([
      { rule: 'income-survivor-range', messageKey: 'errIncomeSurvivorRange' },
    ])
  })

  it('survivorPct < 0 fires LOUD (never coerced to 0)', () => {
    const s: IncomeStream = { ownerIndex: 1, type: 'rental', annualRealToday: 12_000, startAge: 60, colaMode: 'real-flat', survivorPct: -0.1 }
    expect(validateField(incomeDraft([s]), incomeField(0, 'survivorPct'))).toMatchObject([
      { rule: 'income-survivor-range' },
    ])
  })

  it('survivorPct at the [0,1] boundaries PASSES (0 and 1 are legal)', () => {
    const s0: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 30_000, startAge: 65, colaMode: 'real-flat', survivorPct: 0 }
    const s1: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 30_000, startAge: 65, colaMode: 'real-flat', survivorPct: 1 }
    expect(validateField(incomeDraft([s0]), incomeField(0, 'survivorPct'))).toEqual([])
    expect(validateField(incomeDraft([s1]), incomeField(0, 'survivorPct'))).toEqual([])
  })

  it('taxableFraction > 1 on a pension/rental/other fires LOUD', () => {
    const s: IncomeStream = { ownerIndex: 0, type: 'other', annualRealToday: 5_000, startAge: 70, colaMode: 'nominal-flat', survivorPct: 0.5, taxableFraction: 1.5 }
    expect(validateField(incomeDraft([s]), incomeField(0, 'taxableFraction'))).toMatchObject([
      { rule: 'income-taxable-range', messageKey: 'errIncomeTaxableRange' },
    ])
  })

  it('exclusionFraction > 1 on a NON-QUALIFIED annuity fires LOUD (the annuity analog)', () => {
    const s: IncomeStream = { ownerIndex: 0, type: 'annuity', qualified: false, exclusionFraction: 1.4, annualRealToday: 20_000, startAge: 66, colaMode: 'nominal-flat', survivorPct: 0.5 }
    expect(validateField(incomeDraft([s]), incomeField(0, 'exclusionFraction'))).toMatchObject([
      { rule: 'income-exclusion-range', messageKey: 'errIncomeExclusionRange' },
    ])
  })

  it('colaMode=fixed-pct with an ABSENT colaPct fires LOUD (never coerced to 0 — the optimistic-erosion sin)', () => {
    // The restore-corruption shape: a fixed-pct stream whose REQUIRED colaPct is gone.
    const s = { ownerIndex: 0, type: 'pension', annualRealToday: 40_000, startAge: 60, colaMode: 'fixed-pct', survivorPct: 1 } as unknown as IncomeStream
    expect(validateField(incomeDraft([s]), incomeField(0, 'colaPct'))).toMatchObject([
      { rule: 'income-cola-pct-required', messageKey: 'errIncomeColaPct' },
    ])
  })

  it('colaMode=fixed-pct WITH a finite colaPct passes (the legal in-form shape)', () => {
    const s: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 40_000, startAge: 60, colaMode: 'fixed-pct', colaPct: 0.02, survivorPct: 1 }
    expect(validateField(incomeDraft([s]), incomeField(0, 'colaPct'))).toEqual([])
  })

  it('colaMode=fixed-pct with a NON-FINITE colaPct (NaN / null) fires LOUD — not just the absent-key case', () => {
    // The rule guards `!Number.isFinite` as well as absent, because JSON.parse on a
    // restored blob yields colaPct:null (Number.isFinite(null)===false) or a NaN.
    // Reducing the guard to `=== undefined` would silently pass these corrupt rates.
    const sNaN = { ownerIndex: 0, type: 'pension', annualRealToday: 40_000, startAge: 60, colaMode: 'fixed-pct', colaPct: NaN, survivorPct: 1 } as unknown as IncomeStream
    expect(validateField(incomeDraft([sNaN]), incomeField(0, 'colaPct'))).toMatchObject([
      { rule: 'income-cola-pct-required', messageKey: 'errIncomeColaPct' },
    ])
    const sNull = { ownerIndex: 0, type: 'pension', annualRealToday: 40_000, startAge: 60, colaMode: 'fixed-pct', colaPct: null, survivorPct: 1 } as unknown as IncomeStream
    expect(validateField(incomeDraft([sNull]), incomeField(0, 'colaPct'))).toMatchObject([
      { rule: 'income-cola-pct-required', messageKey: 'errIncomeColaPct' },
    ])
  })

  it('colaMode=fixed-pct with an OUT-OF-RANGE colaPct fires the range rule; boundary values pass (not over-strict)', () => {
    // A fat-fingered 0.30 (30%/yr) compounds to fantasy real income the confidence fan is structurally
    // blind to — the grounded ceiling (COLA_PCT_MAX, council 2026-07-01) is the sole defense. HARD
    // refuse at the SAME 0.05 the restore codec + the form enforce (no intake↔codec desync).
    const hot: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 40_000, startAge: 60, colaMode: 'fixed-pct', colaPct: 0.3, survivorPct: 1 }
    expect(validateField(incomeDraft([hot]), incomeField(0, 'colaPct'))).toMatchObject([
      { rule: 'income-cola-pct-range', messageKey: 'errIncomeColaRange' },
    ])
    // NOT over-strict (insight 046/043): the inclusive ceiling (0.05), a real 3% COLA, flat 0, and a
    // nominally-decaying stream (-0.02, the conservative non-sin direction) raise NOTHING.
    for (const colaPct of [0.05, 0.03, 0, -0.02]) {
      const ok: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 40_000, startAge: 60, colaMode: 'fixed-pct', colaPct, survivorPct: 1 }
      expect(validateField(incomeDraft([ok]), incomeField(0, 'colaPct'))).toEqual([])
    }
  })

  it('the taxable/exclusion range rules DISCRIMINATE by type — a cross-arm scalar on the wrong arm is IGNORED (no false fire)', () => {
    // A restored blob (JSON.parse + as) erases the discriminated union, so a corrupt
    // scalar on the wrong arm IS representable. The rule's `type ∈ {...}` guard is the
    // only thing scoping it; dropping that guard would fire on the wrong arm. Prove
    // the discrimination: an annuity bearing a (cast) taxableFraction:1.5 raises NO
    // income-taxable-range, and a pension bearing an exclusionFraction:1.5 raises NO
    // income-exclusion-range. (taxableFraction lives on pension/rental/other only;
    // exclusionFraction on the non-qual annuity only — KTD-6.)
    const annuityWithTaxable = { ownerIndex: 0, type: 'annuity', qualified: true, taxableFraction: 1.5, annualRealToday: 20_000, startAge: 66, colaMode: 'nominal-flat', survivorPct: 0.5 } as unknown as IncomeStream
    expect(validateField(incomeDraft([annuityWithTaxable]), incomeField(0, 'taxableFraction'))).toEqual([])

    const pensionWithExclusion = { ownerIndex: 0, type: 'pension', exclusionFraction: 1.5, annualRealToday: 30_000, startAge: 65, colaMode: 'real-flat', survivorPct: 0.5 } as unknown as IncomeStream
    expect(validateField(incomeDraft([pensionWithExclusion]), incomeField(0, 'exclusionFraction'))).toEqual([])
  })

  it('a clean in-range stream raises NO income violations across every income field', () => {
    const s: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 30_000, startAge: 65, colaMode: 'real-flat', survivorPct: 0.5, taxableFraction: 0.9 }
    const d = incomeDraft([s])
    for (const f of ['survivorPct', 'taxableFraction', 'exclusionFraction', 'colaPct'] as const) {
      expect(validateField(d, incomeField(0, f))).toEqual([])
    }
  })
})
