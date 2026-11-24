// The blocked Apply's field-order decision, moved out of `rothLever.test.tsx` with its function by Act 6's RC0, unchanged.
import { describe, expect, it } from 'vitest'
import { rothPlanMissingField } from '../rothPlan'

describe('rothPlanMissingField', () => {
  it('rothPlanMissingField — the ONE field-order decision the reason and complete() share', () => {
    expect(rothPlanMissingField({})).toBe('amount')
    expect(rothPlanMissingField({ startYear: 2027, years: 5 })).toBe('amount')
    expect(rothPlanMissingField({ amount: 0, startYear: 2027, years: 5 })).toBe('amount') // $0 is not an amount
    expect(rothPlanMissingField({ amount: Number.NaN, startYear: 2027, years: 5 })).toBe('amount')
    expect(rothPlanMissingField({ amount: 40_000, years: 5 })).toBe('start')
    expect(rothPlanMissingField({ amount: 40_000, startYear: 2027.5, years: 5 })).toBe('start')
    expect(rothPlanMissingField({ amount: 40_000, startYear: 2027 })).toBe('years')
    expect(rothPlanMissingField({ amount: 40_000, startYear: 2027, years: 0 })).toBe('years')
    expect(rothPlanMissingField({ amount: 40_000, startYear: 2027, years: 5 })).toBeNull()
    // A PASSED start is not a missing field — that face renders its own refusal / note, so the
    // field-order decision stays silent on it (the priority chain in RothLever decides).
    expect(rothPlanMissingField({ amount: 40_000, startYear: 1999, years: 5 })).toBeNull()
  })
})
