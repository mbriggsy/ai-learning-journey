// The walk's pure parts' arms, moved out of `questions.test.tsx` with their functions by Act 6's RC0, unchanged
// (`nullClient`, `freshModel`, `draft`, `LINE` and `fork` are that file's fixtures, copied). Since RC14 deleted the walk,
// its step-sequence gates live here too: which steps a household is asked (`intakeStepIds`), the ids the first-run
// stepper places on its six steps. The step bodies' laws moved with the fields to the Profile drawers
// (`src/ui/screens/profile/drawers/__tests__/walkLaws.test.tsx`).
import { describe, expect, it } from 'vitest'
import type { BudgetLineItem } from '@shared/model'
import { medicareExtrasTypical } from '@engine/constants/health'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import { intakeStepIds, oopExceedsBudgetlessSpend, walkStepFields, writeMedicareExtras } from '../steps'

const nullClient: EngineClient = {
  runningInWorker: true,
  reset: () => {},
  engine: {
    ping: async () => 'pong' as const,
    run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestEpoch: async () => {},
    runDateSearch: async () => ({ kind: 'date-search', outcome: { kind: 'cancelled' } }) as const,
    runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    runSpendSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestSpendEpoch: async () => {},
    runSolve: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
  },
}

function freshModel(): MemoryModel {
  return createMemoryModel({
    client: nullClient,
    builders: { buildSpineParams: () => null, buildDateInput: () => null },
    mintSeed: () => 1,
    startCalendarYear: 2026,
  })
}

const draft = (model: MemoryModel): ScenarioDraft => model.getSnapshot().draft

describe('the step sequence: which steps a household is asked (`intakeStepIds`, moved from the walk’s battery by RC14)', () => {
  type Person = Partial<ScenarioDraft['people'][0]>
  const set = (m: MemoryModel, p0: Person, p1: Person) =>
    m.update((d) => ({ ...d, people: [{ ...d.people[0], ...p0 }, { ...d.people[1], ...p1 }] }))
  const ids = (m: MemoryModel) => intakeStepIds(draft(m))

  it('an all-retired household is never asked pay or working-year income; any working member adds both, and the pay check’s two steps close only that route', () => {
    const m = freshModel()
    set(m, { workStatus: 'retired' }, { workStatus: 'retired' })
    for (const id of ['income', 'working-income', 'working-cost', 'working-ledger'] as const) expect(ids(m)).not.toContain(id)
    set(m, { workStatus: 'working' }, {}) // mixed
    for (const id of ['income', 'working-income', 'working-cost', 'working-ledger'] as const) expect(ids(m)).toContain(id)
    expect(ids(m).slice(-2), 'the pay check closes the date route').toEqual(['working-cost', 'working-ledger'])
  })

  it('the ACA quote is asked until everyone is proven 65+: unknown ages keep it, an everyone-65+ household drops it, one pre-65 member restores it', () => {
    const m = freshModel()
    expect(ids(m), 'unknown ages: asked, never silently skipped').toContain('health-quote')
    set(m, { currentAge: 67, birthYear: 1959 }, { currentAge: 66, birthYear: 1960 })
    expect(ids(m)).not.toContain('health-quote')
    set(m, { currentAge: 62, birthYear: 1964 }, {})
    expect(ids(m)).toContain('health-quote')
    set(m, { currentAge: 67, birthYear: 1959 }, { currentAge: undefined, birthYear: undefined })
    expect(ids(m), 'one unknown age beside a 65+ member: still asked').toContain('health-quote')
  })

  it('the employer-coverage question is asked ONLY of a mixed household with a pre-65 retiree, and sits with the health block (straight after the quote, before the accounts)', () => {
    const m = freshModel()
    set(m, { currentAge: 58, birthYear: 1968 }, { currentAge: 60, birthYear: 1966 })
    // All retired: the window gate is a verbatim pass-through, nothing to ask.
    set(m, { workStatus: 'retired' }, { workStatus: 'retired' })
    expect(ids(m)).not.toContain('employer-coverage')
    // Both working: one shared offset, no asymmetry.
    set(m, { workStatus: 'working' }, { workStatus: 'working' })
    expect(ids(m)).not.toContain('employer-coverage')
    // Mixed, the retiree pre-65: the gate bites, so it is asked, beside the quote it qualifies.
    set(m, { workStatus: 'working' }, { workStatus: 'retired' })
    const mixed = ids(m)
    expect(mixed).toContain('employer-coverage')
    expect(mixed.indexOf('employer-coverage')).toBe(mixed.indexOf('health-quote') + 1)
    expect(mixed.indexOf('employer-coverage')).toBeLessThan(mixed.indexOf('accounts'))
    // Mixed, but the retiree already 65: Medicare owns those years.
    set(m, {}, { currentAge: 65, birthYear: 1961 })
    expect(ids(m)).not.toContain('employer-coverage')
  })

  it('the look-back income and the Medicare-extras fork are asked only with a member 64+ (the 2-year look-back reach), never of a younger household', () => {
    const m = freshModel()
    set(m, { currentAge: 63 }, { currentAge: 60 })
    expect(ids(m)).not.toContain('irmaa-seed')
    expect(ids(m)).not.toContain('medicare-extras')
    set(m, { currentAge: 64 }, {})
    expect(ids(m)).toContain('irmaa-seed')
    expect(ids(m)).toContain('medicare-extras')
  })

  it('the state step lands unconditionally, right before spend, on both routes, and gates nothing (an unanswered state never blocks)', () => {
    const m = freshModel()
    for (const status of ['working', 'retired'] as const) {
      set(m, { workStatus: status }, { workStatus: 'retired' })
      const route = ids(m)
      expect(route).toContain('retirement-state')
      expect(route.indexOf('retirement-state')).toBe(route.indexOf('spend') - 1)
    }
    expect(draft(m).retirementState, '[test setup] unanswered').toBeUndefined()
    expect(walkStepFields(draft(m), 'retirement-state')).toEqual([])
  })
})

describe('the out-of-pocket step — the BUDGETLESS M > S fork (council 2026-10-08, B2: the engine clamps, the intake says so calmly)', () => {
  const LINE: BudgetLineItem = { category: 'food', label: 'Groceries', annualAmountReal: 1_000, tier: 'essentials', startYear: 0 }
  const fork = (S: number | undefined, M: number | undefined, budget?: readonly BudgetLineItem[]): boolean => {
    const d = draft(freshModel())
    return oopExceedsBudgetlessSpend({ ...d, annualSpendingReal: S, budget, health: { ...d.health, oopMedicalAnnual: M } })
  }

  it('the pure fork fires STRICTLY above, only with no budget, never on a blank (insight 048 planted-fail arms)', () => {
    expect(fork(6_000, 6_500)).toBe(true) // M > S — the contradiction
    expect(fork(6_500, 6_500)).toBe(false) // M = S — everything is medical, no contradiction
    expect(fork(78_000, 4_000)).toBe(false) // the ordinary household
    expect(fork(undefined, 6_500)).toBe(false) // no spend yet — nothing to contradict
    expect(fork(6_000, undefined)).toBe(false) // a blank OOP
    expect(fork(6_000, 6_500, [LINE])).toBe(false) // a budget governs — the builder's own F10 line speaks
  })
})

describe('the Medicare-extras write shape (writeMedicareExtras — the ONE editor home)', () => {
  const twoRetired65 = (m: MemoryModel) =>
    m.update((d) => ({
      ...d,
      people: [
        { ...d.people[0], workStatus: 'retired' as const, currentAge: 67, birthYear: 1959 },
        { ...d.people[1], workStatus: 'retired' as const, currentAge: 66, birthYear: 1960 },
      ],
    }))

  it('a single answer fills the OTHER slot with the honest unanswered hole — never a fabricated adoption', () => {
    const m = freshModel()
    twoRetired65(m)
    m.update((d) => writeMedicareExtras(d, 0, { kind: 'entered', monthly: 220 }))
    expect(draft(m).medicareExtrasByPerson).toEqual([
      { kind: 'entered', monthly: 220 },
      { kind: 'unanswered' },
    ])
  })

  it('clearing BOTH slots back to unanswered STRIPS the field entirely (absence = never engaged)', () => {
    const m = freshModel()
    twoRetired65(m)
    m.update((d) => writeMedicareExtras(d, 1, { kind: 'none' }))
    expect(draft(m).medicareExtrasByPerson).toBeDefined()
    m.update((d) => writeMedicareExtras(d, 1, undefined))
    expect(draft(m).medicareExtrasByPerson).toBeUndefined()
  })

  it('the typical arm stamps the adoption vintage from the constant (never re-derived from value equality)', () => {
    const m = freshModel()
    twoRetired65(m)
    m.update((d) => writeMedicareExtras(d, 0, { kind: 'typical', adoptionVintage: medicareExtrasTypical.value.vintage }))
    expect(draft(m).medicareExtrasByPerson?.[0]).toEqual({
      kind: 'typical',
      adoptionVintage: medicareExtrasTypical.value.vintage,
    })
  })
})
