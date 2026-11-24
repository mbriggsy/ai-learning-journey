// The walk's pure parts' arms, moved out of `questions.test.tsx` with their functions by Act 6's RC0, unchanged
// (`nullClient`, `freshModel`, `draft`, `LINE` and `fork` are that file's fixtures, copied).
import { describe, expect, it } from 'vitest'
import type { BudgetLineItem } from '@shared/model'
import { medicareExtrasTypical } from '@engine/constants/health'
import { createMemoryModel, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import type { EngineClient } from '@store/engineClient'
import { oopExceedsBudgetlessSpend, writeMedicareExtras } from '../steps'

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
