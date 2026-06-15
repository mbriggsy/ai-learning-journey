import { describe, expect, it } from 'vitest'
import { personField, validateDraft, validateField } from '../sanity'
import type { ScenarioDraft, PersonDraft } from '@store/memoryModel'

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
  it('a $0 spend with retired people raises NO violation (→ the honest 0-of-10 path)', () => {
    const d = draft(
      { workStatus: 'retired', retirementAge: 64, currentAge: 65 },
      { workStatus: 'retired', retirementAge: 64, currentAge: 65 },
      { annualSpendingReal: 0 },
    )
    expect(validateDraft(d, touchedAll)).toEqual([])
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
