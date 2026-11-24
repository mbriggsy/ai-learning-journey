/**
 * The stable-id mints (schema version 6; the workbench plan's U9): the deterministic open-time mint
 * (`withMissingIds`) and the random Add mint (`freshStableId` over `idsInUse`). Every plan here is made up.
 */
import { describe, expect, it } from 'vitest'
import type { BudgetLineItem, EnteredAccount, KeptWhatIfV6 } from '../model'
import { freshStableId, idsInUse, withMissingIds, type IdBearingPlan } from '../stableIds'

const ira: EnteredAccount = { ownerIndex: 0, kind: 'traditional-ira', valueToday: 500_000, manualBlend: { kind: 'simple', choice: 'stocks' } }
const roth: EnteredAccount = { ownerIndex: 1, kind: 'roth-ira', valueToday: 100_000, manualBlend: { kind: 'simple', choice: 'bonds' } }
const food: BudgetLineItem = { category: 'food', label: '', annualAmountReal: 12_000, tier: 'essentials', startYear: 0 }

/** Bytes that spell a chosen 24-hex id, then a second one — a fake entropy source for the collision arm. */
function scriptedBytes(...ids: string[]): (n: number) => Uint8Array {
  let next = 0
  return (n) => {
    const hex = ids[next++]!
    expect(hex).toHaveLength(n * 2)
    return Uint8Array.from(hex.match(/../g)!, (h) => parseInt(h, 16))
  }
}

describe('withMissingIds — the open-time mint (deterministic)', () => {
  it('gives each account and line missing an id its kind-and-position id, and two opens of one plan mint the same ids', () => {
    const plan: IdBearingPlan = { enteredAccounts: [ira, roth], budget: [food, food] }
    const once = withMissingIds(plan)
    expect(once.enteredAccounts.map((a) => a.id)).toEqual(['account-0', 'account-1'])
    // Two lines with identical facts still get distinct ids.
    expect(once.budget!.map((l) => l.id)).toEqual(['line-0', 'line-1'])
    expect(withMissingIds(plan)).toEqual(once)
    // The id leads each entry's keys; every other key is the entry's own.
    expect(Object.keys(once.enteredAccounts[0]!)[0]).toBe('id')
    expect({ ...once.enteredAccounts[0]!, id: undefined }).toEqual({ ...ira, id: undefined })
  })

  it('keeps every id already present, and returns the SAME object when nothing is missing (a version-6 plan opens unchanged)', () => {
    const withIds: IdBearingPlan = { enteredAccounts: [{ id: 'a1', ...ira }], budget: [{ id: 'l1', ...food }] }
    expect(withMissingIds(withIds)).toBe(withIds)
    const mixed = withMissingIds({ enteredAccounts: [{ id: 'kept', ...ira }, roth] })
    expect(mixed.enteredAccounts.map((a) => a.id)).toEqual(['kept', 'account-1'])
  })

  it('never mints an id the plan already holds or names: a position id a surviving entry kept moves to the first free suffix', () => {
    // Opened once ([ira, roth] → account-0, account-1), the first account deleted, a new one added by a path that
    // minted no id: at the next open the new account sits at position 1, whose plain id the survivor holds.
    const reopened = withMissingIds({ enteredAccounts: [{ id: 'account-1', ...roth }, ira] })
    expect(reopened.enteredAccounts.map((a) => a.id)).toEqual(['account-1', 'account-1-2'])
    // A kept what-if naming an id counts as holding it.
    const named = withMissingIds({
      enteredAccounts: [ira],
      keptWhatIfs: [{ id: 'w', name: 'n', levers: [{ kind: 'deposits', accountId: 'account-0', annualContribution: 1 }] }],
    })
    expect(named.enteredAccounts[0]!.id).toBe('account-0-2')
  })

  it('adds no budget key to a plan without one, and drops an `id: undefined` key rather than spreading it over the new id', () => {
    const noBudget = withMissingIds({ enteredAccounts: [ira] })
    expect('budget' in noBudget).toBe(false)
    const undefinedId = withMissingIds({ enteredAccounts: [{ ...ira, id: undefined }] })
    expect(undefinedId.enteredAccounts[0]!.id).toBe('account-0')
  })
})

describe('freshStableId and idsInUse — the Add mint (random)', () => {
  it('idsInUse holds every account, line and kept what-if id, and every id a lever names', () => {
    const kept: KeptWhatIfV6 = {
      id: 'wi',
      name: 'Try',
      levers: [
        { kind: 'deposits', accountId: 'acct-gone', annualContribution: 5_000 },
        { kind: 'spending', op: 'remove', lineId: 'line-gone' },
        { kind: 'spending', op: 'add', line: { id: 'line-new', ...food } },
        { kind: 'stop-year', calendarYear: 2030 },
      ],
    }
    const plan: IdBearingPlan = { enteredAccounts: [{ id: 'acct-1', ...ira }, roth], budget: [{ id: 'line-1', ...food }], keptWhatIfs: [kept] }
    expect([...idsInUse(plan)].sort()).toEqual(['acct-1', 'acct-gone', 'line-1', 'line-gone', 'line-new', 'wi'])
  })

  it('a fresh id is 24 hex characters from the platform CSPRNG, and two draws differ', () => {
    const a = freshStableId(new Set())
    const b = freshStableId(new Set())
    expect(a).toMatch(/^[0-9a-f]{24}$/)
    expect(b).not.toBe(a)
  })

  it('never returns an id already taken: it draws again', () => {
    const taken = 'aa'.repeat(12)
    const free = 'bb'.repeat(12)
    expect(freshStableId(new Set([taken]), scriptedBytes(taken, free))).toBe(free)
  })

  it('after a delete followed by an Add, every id in the plan is still unique', () => {
    const opened = withMissingIds({ enteredAccounts: [ira, roth, ira] })
    const afterDelete = { enteredAccounts: opened.enteredAccounts.filter((_, i) => i !== 0) }
    const added = { enteredAccounts: [...afterDelete.enteredAccounts, { id: freshStableId(idsInUse(afterDelete)), ...ira }] }
    const ids = added.enteredAccounts.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
