/**
 * One-time money in, its intake half (gap 5's plan, `docs/plans/features/one-time-money-in-build-spec.md`, U3;
 * `src/intake/oneTimeInflow.ts` and its arms in `src/intake/intakeMap.ts`): the form's one decision tree and its words,
 * R17's question for an item dated in the save year, the "still needed" re-judge of a stored year, the params the engine
 * runs on both routes, and the overlay a gift opens.
 *
 * The year range is pinned against the ENGINE's own refusal, never re-derived here (insight 081): the last year intake
 * accepts is the last the engine accepts, and one past it is the first the engine refuses.
 */
import { describe, expect, it } from 'vitest'

import { buildCandidateParams } from '@engine/dateSearch'
import { validateParams } from '@engine/simulate'
import type { OneTimeInflow, SimulationParams } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '@ui/devSeeds'
import { fieldErrorText } from '../fieldErrors'
import { buildDateInput, buildSpineParams, missingRequiredFacts, oneTimeYearRange } from '../intakeMap'
import {
  buildOneTimeInflow,
  oneTimeInflowFormFrom,
  type OneTimeInflowContext,
  type OneTimeInflowForm,
} from '../oneTimeInflow'

const retired: ScenarioDraft = DEV_SEEDS.retired
const RANGE = oneTimeYearRange(retired)
const LAST = RANGE.last!
/** A never-saved plan's save year is its first year (R17). */
const CTX: OneTimeInflowContext = { range: RANGE, couple: true, saveYear: retired.startCalendarYear }

const BOTH: OneTimeInflow = { id: 'gift-a', kind: 'gift', name: 'Aunt Jo’s estate', year: retired.startCalendarYear + 5, amountReal: 200_000 }
const SAMS: OneTimeInflow = { ...BOTH, id: 'gift-b', heirIndex: 1, leftTo: 'someone-else' }

const filled: OneTimeInflowForm = {
  name: 'Aunt Jo’s estate',
  year: retired.startCalendarYear + 5,
  amountReal: 200_000,
  whose: 'both',
  leftTo: undefined,
  arrivedBySave: undefined,
}
const refusal = (form: OneTimeInflowForm, ctx: OneTimeInflowContext = CTX) => {
  const r = buildOneTimeInflow(form, ctx, 'gift-new')
  if (r.ok) throw new Error('expected a refusal')
  return { field: r.field, words: fieldErrorText(r.message) }
}
const withItems = (d: ScenarioDraft, items: readonly OneTimeInflow[]): ScenarioDraft => ({ ...d, oneTimeInflows: items })

describe('the year range is the engine’s own (KTD1, KTD11)', () => {
  it('runs from the plan’s first year to its last horizon year, the same horizon `buildParams` passes the engine', () => {
    const params = buildSpineParams(retired)!
    expect(RANGE).toEqual({ first: retired.startCalendarYear, last: retired.startCalendarYear + params.maxHorizonYears - 1 })
    // The retired seed's youngest is 65 (born 1961): 119 − 65 + 1 = 55 years, so 2026 through 2080.
    expect(LAST).toBe(retired.startCalendarYear + 54)
  })

  it('the engine accepts an item in the last year and refuses one a year later, by name', () => {
    const params = buildSpineParams(withItems(retired, [{ ...BOTH, year: LAST }]))!
    expect(validateParams(params)).toBeNull()
    const past: SimulationParams = {
      ...params,
      overlay: { ...params.overlay!, oneTimeInflows: [{ ...params.overlay!.oneTimeInflows![0]!, year: LAST + 1 }] },
    }
    expect(validateParams(past)).toMatch(/oneTimeInflows\[0\] year must be a calendar year from 2026 to 2080/)
  })

  it('names no last year while an age is unknown (the horizon would read a placeholder age)', () => {
    const unknownAge = { ...retired, people: [retired.people[0], { ...retired.people[1], birthYear: undefined, currentAge: undefined }] } as ScenarioDraft
    expect(oneTimeYearRange(unknownAge)).toEqual({ first: retired.startCalendarYear, last: undefined })
  })
})

describe('the form’s one decision tree (R2, R3, KTD12)', () => {
  it('a both-people’s gift round-trips through the form unchanged, and an edit keeps its id', () => {
    const r = buildOneTimeInflow(oneTimeInflowFormFrom(BOTH, true), CTX, BOTH.id)
    expect(r).toEqual({ ok: true, item: BOTH })
    const renamed = buildOneTimeInflow({ ...oneTimeInflowFormFrom(BOTH, true), name: '  The house fund ' }, CTX, BOTH.id)
    expect(renamed).toEqual({ ok: true, item: { ...BOTH, name: 'The house fund' } })
  })

  it('a one-person’s gift round-trips with its heir and who it goes to', () => {
    expect(oneTimeInflowFormFrom(SAMS, true)).toMatchObject({ whose: 1, leftTo: 'someone-else' })
    expect(buildOneTimeInflow(oneTimeInflowFormFrom(SAMS, true), CTX, SAMS.id)).toEqual({ ok: true, item: SAMS })
  })

  it('a both-people’s answer writes no heir fields, even with a who-gets-it answer left over from an earlier choice', () => {
    const r = buildOneTimeInflow({ ...filled, leftTo: 'other-member' }, CTX, 'gift-new')
    expect(r.ok && r.item).toEqual({ id: 'gift-new', kind: 'gift', name: 'Aunt Jo’s estate', year: filled.year, amountReal: 200_000 })
  })

  it('on a one-person plan it asks neither whose it is nor who gets it, and writes no heir fields', () => {
    const r = buildOneTimeInflow({ ...filled, whose: undefined }, { ...CTX, couple: false }, 'gift-new')
    expect(r.ok && 'heirIndex' in r.item).toBe(false)
    expect(r.ok).toBe(true)
  })

  it.each<[string, Partial<OneTimeInflowForm>, string, string]>([
    ['a blank name', { name: '   ' }, 'name', 'Still need a name for it.'],
    ['no year', { year: undefined }, 'year', 'Still need the year it comes in.'],
    ['a year one before the plan’s first', { year: 2025 }, 'year', 'The year it comes in is one from 2026 to 2080, the years this plan covers.'],
    ['a year one past the plan’s last', { year: 2081 }, 'year', 'The year it comes in is one from 2026 to 2080, the years this plan covers.'],
    ['no amount', { amountReal: undefined }, 'amountReal', 'Still need the amount.'],
    ['a $0 amount', { amountReal: 0 }, 'amountReal', 'An inheritance or gift is more than $0. To leave one out, delete it instead.'],
    ['a couple’s whose-is-it unanswered', { whose: undefined }, 'whose', 'Still need whose it is: one of you, or both.'],
    [
      'a one-person item’s still-comes unanswered',
      { whose: 0, leftTo: undefined },
      'leftTo',
      'Still need whether it would still come to the other of you if the one it’s for has died first.',
    ],
  ])('%s is refused in words, under its own field', (_, change, field, words) => {
    expect(refusal({ ...filled, ...change })).toEqual({ field, words })
  })

  it('the last year and the first year are accepted; with an unknown age only the first year is named', () => {
    expect(buildOneTimeInflow({ ...filled, year: LAST }, CTX, 'g').ok).toBe(true)
    expect(buildOneTimeInflow({ ...filled, year: 2026, arrivedBySave: false }, CTX, 'g').ok).toBe(true)
    const noLast = { ...CTX, range: { first: 2026, last: undefined } }
    expect(buildOneTimeInflow({ ...filled, year: 2090 }, noLast, 'g').ok).toBe(true)
    expect(refusal({ ...filled, year: 2025 }, noLast)).toEqual({ field: 'year', words: 'The year it comes in is 2026 or later, from this plan’s first year on.' })
  })
})

describe('R17: an item dated in the year the balances were last saved asks whether the money had come in', () => {
  const saved2028: OneTimeInflowContext = { ...CTX, saveYear: 2028 }

  it('unanswered, it is still needed; answered "had already come in", the gift is refused in words', () => {
    expect(refusal({ ...filled, year: 2028 }, saved2028)).toEqual({
      field: 'arrivedBySave',
      words: 'Still need whether the money had already come in when you entered your account balances.',
    })
    expect(refusal({ ...filled, year: 2028, arrivedBySave: true }, saved2028)).toEqual({
      field: 'arrivedBySave',
      words: 'Money that had already come in belongs in your account balances, not here, or it would count twice.',
    })
    expect(buildOneTimeInflow({ ...filled, year: 2028, arrivedBySave: false }, saved2028, 'g').ok).toBe(true)
  })

  it('an item dated after the save year is never asked; the answer is never saved and never seeded', () => {
    expect(buildOneTimeInflow({ ...filled, year: 2029 }, saved2028, 'g').ok).toBe(true)
    const r = buildOneTimeInflow({ ...filled, year: 2028, arrivedBySave: false }, saved2028, 'g')
    expect(r.ok && 'arrivedBySave' in r.item).toBe(false)
    expect(oneTimeInflowFormFrom({ ...BOTH, year: 2028 }, true).arrivedBySave).toBeUndefined()
  })

  it('on a plan never saved, the save year is its first year', () => {
    expect(refusal({ ...filled, year: retired.startCalendarYear }).field).toBe('arrivedBySave')
  })
})

describe('a stored item re-judged against the live draft (KTD11)', () => {
  it('the seed carries no problem, and a year inside the range none', () => {
    expect(missingRequiredFacts(DEV_SEEDS.dateinherit)).toEqual([])
    expect(missingRequiredFacts(withItems(retired, [{ ...BOTH, year: LAST }]))).toEqual([])
  })

  it('a year that fell past the plan’s last (an older birth year moves it) is an absent fact, re-asked on Income', () => {
    // The youngest born a year earlier: the horizon shrinks by one, so an item in the old last year falls outside.
    const older = { ...retired, people: [retired.people[0], { ...retired.people[1], birthYear: 1960, currentAge: 66 }] } as ScenarioDraft
    expect(oneTimeYearRange(older).last).toBe(LAST - 1)
    const facts = missingRequiredFacts(withItems(older, [{ ...BOTH, year: LAST }]))
    expect(facts).toEqual([{ labelKey: 'oneTimeYearLabel', kind: 'absent' }])
    expect(buildSpineParams(withItems(older, [{ ...BOTH, year: LAST }]))).toBeNull()
  })

  it('a year before the plan’s first is an absent fact too', () => {
    expect(missingRequiredFacts(withItems(retired, [{ ...BOTH, year: 2025 }]))).toEqual([{ labelKey: 'oneTimeYearLabel', kind: 'absent' }])
  })

  it('while an age is unknown, only that age is named (no year is judged against a guessed horizon)', () => {
    const unknownAge = { ...retired, people: [retired.people[0], { ...retired.people[1], birthYear: undefined, currentAge: undefined }] } as ScenarioDraft
    const keys = missingRequiredFacts(withItems(unknownAge, [{ ...BOTH, year: 2099 }])).map((m) => m.labelKey)
    expect(keys).toContain('birthYearLabel')
    expect(keys).not.toContain('oneTimeYearLabel')
  })
})

describe('the params the engine runs (KTD2, KTD12)', () => {
  it('the date seed carries its gift on every tested stop, in the same calendar year (AE5’s intake side)', () => {
    const input = buildDateInput(DEV_SEEDS.dateinherit)!
    const expected = [{ year: DEV_SEEDS.dateinherit.startCalendarYear + 4, cashReal: 250_000 }]
    expect(input.params.overlay!.oneTimeInflows).toEqual(expected)
    for (const stop of [0, 3, 5, 10]) {
      const p = buildCandidateParams(input, stop, 100)
      expect(p.overlay!.oneTimeInflows, `stop ${stop}`).toEqual(expected)
      expect(validateParams(p), `stop ${stop}`).toBeNull()
    }
  })

  it('a couple’s one-person item passes its heir and who it goes to; a both-people’s item passes neither', () => {
    const params = buildSpineParams(withItems(retired, [BOTH, SAMS]))!
    expect(params.overlay!.oneTimeInflows).toEqual([
      { year: BOTH.year, cashReal: 200_000 },
      { year: SAMS.year, cashReal: 200_000, heirIndex: 1, leftTo: 'someone-else' },
    ])
    expect(validateParams(params)).toBeNull()
  })

  it('a plan with no item builds params with no new key, on both routes', () => {
    expect('oneTimeInflows' in buildSpineParams(retired)!.overlay!).toBe(false)
    expect('oneTimeInflows' in buildDateInput(DEV_SEEDS.dip)!.params.overlay!).toBe(false)
  })

  it('a household with no accounts, no premium and no income but one gift gets an overlay carrying it (the early return, KTD2)', () => {
    const bare: ScenarioDraft = {
      ...retired,
      enteredAccounts: [],
      incomeStreams: [],
      health: { ...retired.health, enrolledPremiumMonthlyToday: undefined, slcspMonthlyToday: undefined },
    }
    expect(missingRequiredFacts(bare)).toEqual([])
    expect(buildSpineParams(bare)!.overlay).toBeUndefined() // the early return, as before
    const params = buildSpineParams(withItems(bare, [BOTH]))!
    expect(params.overlay!.taxEnabled).toBe(true)
    expect(params.overlay!.oneTimeInflows).toEqual([{ year: BOTH.year, cashReal: 200_000 }])
    expect(validateParams(params)).toBeNull()
  })
})
