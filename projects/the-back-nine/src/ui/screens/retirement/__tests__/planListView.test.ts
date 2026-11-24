import { describe, expect, it } from 'vitest'
import type { KeptWhatIfV6, WhatIfLeverV6 } from '@shared/model'
import { copy, slots } from '../../../copy'
import { copyEdit, deleteEdit, keepEdit, keepState, listWrites, moved, nameError, orderEdit, outcomeWords, planListView, renameEdit, type KeepInput } from '../planListView'

/** The plan list's rules (plan 6, RC5; KTD19): writes only on a clean draft (or into the unsaved plan before the first
 *  save), never on a read-only tab; Keep names the committed bundle, not the recommendation's, not an empty one, not
 *  before Refresh, and replaces a changed reopened one; names are trimmed, unique and bounded; the edits apply to the
 *  CURRENT list and refuse when it moved on. */

const LEVER: WhatIfLeverV6 = { kind: 'spending', op: 'total', annualSpendingReal: 60_000 }
const OTHER: WhatIfLeverV6 = { kind: 'spending', op: 'total', annualSpendingReal: 50_000 }
const A: KeptWhatIfV6 = { id: 'a', name: 'Spend less', levers: [LEVER] }
const B: KeptWhatIfV6 = { id: 'b', name: 'Move', levers: [OTHER] }

const base: KeepInput = { writes: { kind: 'open', ceremony: false }, recommendation: false, source: { kind: 'new' }, own: [LEVER], pending: [LEVER], kept: [A, B] }

describe('listWrites: the plan’s save machine decides (KTD19)', () => {
  it('open on a clean plan and before the first save; withheld with words while unsaved, failed or unsaveable; busy while saving; hidden read-only', () => {
    expect(listWrites('clean', false)).toEqual({ kind: 'open', ceremony: false })
    expect(listWrites('first', false)).toEqual({ kind: 'open', ceremony: true })
    expect(listWrites('saving', false)).toEqual({ kind: 'open', ceremony: false, busy: true })
    expect(listWrites('dirty', false)).toEqual({ kind: 'withheld', words: copy.planListWritesDirty })
    expect(listWrites('failed', false)).toEqual({ kind: 'withheld', words: copy.planListWritesFailed })
    expect(listWrites('none', false)).toEqual({ kind: 'withheld', words: copy.planListWritesNone })
    for (const k of ['clean', 'first', 'dirty', 'saving', 'failed', 'none'] as const) expect(listWrites(k, true)).toEqual({ kind: 'hidden' })
  })
})

describe('keepState', () => {
  it('a new what-if holding a lever is offered', () => {
    expect(keepState(base)).toEqual({ kind: 'open' })
  })
  it('read-only hides it; unsaved changes withhold it with their words', () => {
    expect(keepState({ ...base, writes: { kind: 'hidden' } })).toEqual({ kind: 'hidden' })
    expect(keepState({ ...base, writes: listWrites('dirty', false) })).toEqual({ kind: 'withheld', words: copy.planListWritesDirty })
  })
  it('never the recommendation’s side, never before Refresh, never an empty bundle', () => {
    expect(keepState({ ...base, recommendation: true })).toEqual({ kind: 'withheld', words: copy.planListKeepRecommended })
    expect(keepState({ ...base, pending: [OTHER] })).toEqual({ kind: 'withheld', words: copy.planListKeepRefreshFirst })
    expect(keepState({ ...base, own: [], pending: [] })).toEqual({ kind: 'withheld', words: copy.planListKeepEmpty })
  })
  it('a reopened kept what-if unchanged is already kept; changed, Keep replaces it under its id and name', () => {
    expect(keepState({ ...base, source: { kind: 'kept', id: 'a' } })).toEqual({ kind: 'withheld', words: slots.planListKeepAlready('Spend less') })
    expect(keepState({ ...base, source: { kind: 'kept', id: 'a' }, own: [OTHER], pending: [OTHER] })).toEqual({ kind: 'open', replaces: { id: 'a', name: 'Spend less' } })
    // Reset on a reopened one (the empty bundle) is a change too: keeping it replaces the kept one with the plan itself.
    expect(keepState({ ...base, source: { kind: 'kept', id: 'a' }, own: [], pending: [] })).toEqual({ kind: 'open', replaces: { id: 'a', name: 'Spend less' } })
    // Its kept one deleted meanwhile: a new keep.
    expect(keepState({ ...base, source: { kind: 'kept', id: 'gone' } })).toEqual({ kind: 'open' })
  })
})

describe('nameError', () => {
  it('trimmed, never empty, bounded, unique among the others regardless of case (a rename may keep its own)', () => {
    expect(nameError('  ', [A])).toBe(copy.planListNameEmpty)
    expect(nameError('x'.repeat(61), [A])).toBe(slots.planListNameLong(60))
    expect(nameError(' spend LESS ', [A])).toBe(copy.planListNameTaken)
    expect(nameError('Spend less', [A], 'a')).toBeNull()
    expect(nameError('Lean years', [A, B])).toBeNull()
  })
})

describe('the edits apply to the current list', () => {
  const ids = new Set(['a', 'b'])
  it('keep appends under the caller’s fresh id, trimmed; refuses an id the plan already holds; replaces in place', () => {
    expect(keepEdit('c', ' Lean ', [LEVER], false)([A, B], ids)).toEqual([A, B, { id: 'c', name: 'Lean', levers: [LEVER] }])
    expect(keepEdit('a', 'Lean', [LEVER], false)([A, B], ids)).toBeNull()
    expect(keepEdit('a', 'Spend less', [OTHER], true)([A, B], ids)).toEqual([{ id: 'a', name: 'Spend less', levers: [OTHER] }, B])
    expect(keepEdit('gone', 'x', [OTHER], true)([A, B], ids), 'its kept one deleted meanwhile').toBeNull()
  })
  it('rename, delete and copy (numbered past the first copy, right after its original)', () => {
    expect(renameEdit('a', ' New ')([A, B], ids)).toEqual([{ ...A, name: 'New' }, B])
    expect(renameEdit('gone', 'x')([A], ids)).toBeNull()
    expect(deleteEdit('a')([A, B], ids)).toEqual([B])
    expect(deleteEdit('gone')([A, B], ids)).toBeNull()
    const once = copyEdit('a')([A, B], ids)!
    expect(once.map((k) => k.name)).toEqual(['Spend less', slots.planListCopyName('Spend less', 1), 'Move'])
    expect(once[1]!.levers).toEqual(A.levers)
    expect(ids.has(once[1]!.id)).toBe(false)
    const twice = copyEdit('a')(once, new Set(once.map((k) => k.id)))!
    expect(twice[1]!.name).toBe(slots.planListCopyName('Spend less', 2))
  })
  it('order takes exactly the list’s ids; moved steps one place and stays put at an end', () => {
    expect(orderEdit(['b', 'a'])([A, B], ids)).toEqual([B, A])
    expect(orderEdit(['b'])([A, B], ids)).toBeNull()
    expect(orderEdit(['b', 'x'])([A, B], ids)).toBeNull()
    expect(moved(['a', 'b'], 'a', 1)).toEqual(['b', 'a'])
    const ends = ['a', 'b']
    expect(moved(ends, 'a', -1)).toBe(ends)
  })
})

describe('planListView', () => {
  it('pins your plan (and Recommended where it runs), lists the kept ones in order, and marks the ones on show', () => {
    const v = planListView({ ...base, recommendedOffered: true, leftKept: 'b', rightKept: 'a' })
    expect(v.pinned).toEqual([copy.probabilityPlanTitle, copy.probabilityPickRecommended])
    expect(v.rows).toEqual([
      { id: 'a', name: 'Spend less', shownLeft: false, shownRight: true },
      { id: 'b', name: 'Move', shownLeft: true, shownRight: false },
    ])
    expect(v.canWrite).toBe(true)
    expect(v.empty).toBeUndefined()
  })
  it('a read-only view carries no write action at all', () => {
    const v = planListView({ ...base, writes: listWrites('none', true), recommendedOffered: false })
    expect(v.canWrite).toBe(false)
    expect(v.keep).toEqual({ kind: 'hidden' })
    expect(v.withheld).toBeUndefined()
    expect(v.rows.length).toBe(2)
  })
  it('before the first save it says what Keep does; an empty list says how to fill it', () => {
    const v = planListView({ ...base, kept: [], writes: listWrites('first', false), recommendedOffered: false })
    expect(v.ceremonyNote).toBe(copy.planListFirstNote)
    expect(v.empty).toBe(copy.planListEmpty)
    expect(planListView({ ...base, writes: listWrites('first', false), recommendedOffered: false }).ceremonyNote).toBe(copy.planListFirstListNote)
  })
})

describe('outcomeWords', () => {
  it('silent where the list shows it; the failed save and each refusal in words', () => {
    expect(outcomeWords({ kind: 'saved' })).toBeNull()
    expect(outcomeWords({ kind: 'ceremony' })).toBeNull()
    expect(outcomeWords({ kind: 'failed' })).toBe(copy.planListSaveFailed)
    expect(outcomeWords({ kind: 'refused', reason: 'dirty' })).toBe(copy.planListWritesDirty)
    expect(outcomeWords({ kind: 'refused', reason: 'saving' })).toBe(copy.planListWritesSaving)
    expect(outcomeWords({ kind: 'refused', reason: 'stale' })).toBe(copy.planListRefused)
  })
})
