import { describe, expect, it } from 'vitest'
import { accountField, personField, validateDraft } from '@intake/sanity'
import { fieldErrorText } from '@intake/fieldErrors'
import { applyBundle } from '@intake/whatIf'
import { draftIdentityKey, type ScenarioDraft } from '@store/memoryModel'
import type { WhatIfLeverV6 } from '@shared/model'
import { DEV_SEEDS } from '../../../../devSeeds'
import { copy } from '../../../../copy'
import { refusalWords } from '../../../../workbench/railChrome'
import { profileStore } from '../../__tests__/profileStore'
import { accountFormFromDraft, buildAccountEdit, deleteAccount, ownAccountField } from '../accountFields'
import { saveEdit } from '../drawerSave'
import { buildPerson, ownPersonField, personFormFrom } from '../familyFields'
import { buildSocialSecurity, ownSocialSecurityField, socialSecurityFormFrom } from '../incomeFields'
import { buildOtherIncome, otherIncomeFormFrom } from '../otherIncomeFields'

/**
 * The drawer frame's Save (Act 6 · RC13a; `drawerSave.ts`), on the real store: every check the walk's Continue runs for
 * the drawer's fields refuses here and shows under the field; a fact this edit breaks on another card refuses too
 * (insight 158: a drawer has no later Continue); nothing refused reaches the store and no recompute is sent; a pass is
 * one store commit and one recompute; a Save with nothing changed moves nothing.
 */

const working = DEV_SEEDS.date // Alex, 58, working: a 401(k) taking $20,000 a year and an $8,000 match
const retired = DEV_SEEDS.retired

describe('a refused Save reaches nothing', () => {
  it('a yearly Social Security figure typed into the monthly box (the 12× misentry): refused under its field, the store untouched, no recompute', () => {
    const { model, recompute } = profileStore(retired)
    const before = model.getSnapshot().draft
    const seed = socialSecurityFormFrom(before, 0)
    const res = saveEdit(model, (d) => buildSocialSecurity(d, 0, seed, { ...seed, monthly: 30_000 }), ownSocialSecurityField(0))
    expect(res.saved).toBe(false)
    if (res.saved) return
    expect(res.check.fields.monthly).toBe(copy.errPiaCeiling)
    expect(model.getSnapshot().draft).toBe(before)
    expect(recompute).not.toHaveBeenCalled()
  })

  it('a claim year outside the claim window: refused under its field', () => {
    const { model } = profileStore(retired)
    const seed = socialSecurityFormFrom(model.getSnapshot().draft, 1)
    const res = saveEdit(model, (d) => buildSocialSecurity(d, 1, seed, { ...seed, claimYear: 1961 + 72 }), ownSocialSecurityField(1))
    expect(res.saved || res.check.fields.claimYear).toBe(copy.errSsClaimWindow)
  })

  it('a birth year not yet come, and a retired person’s stop age in the future: each under its own field', () => {
    const { model } = profileStore(retired)
    const seed = personFormFrom(model.getSnapshot().draft, 0)
    const future = saveEdit(model, (d) => buildPerson(d, 0, seed, { ...seed, birthYear: 2031 }), ownPersonField(0))
    expect(future.saved || future.check.fields.birthYear).toBe(copy.errBirthYearFuture)
    const stop = saveEdit(model, (d) => buildPerson(d, 0, seed, { ...seed, retirementAge: 70 }), ownPersonField(0))
    expect(stop.saved || stop.check.fields.retirementAge).toBe(copy.errStopAgeInFuture)
  })

  it('two accounts of one owner over the shared limit: refused exactly as the walk’s accounts step refuses them (the same rule, the same words)', () => {
    const { model, recompute } = profileStore(working)
    const before = model.getSnapshot().draft
    // A 403(b) for Alex taking $15,000: under the limit alone (so the entry form's own Add-time check passes it), over it
    // beside the 401(k)'s $20,000.
    const seed = accountFormFromDraft(before, { kind: '403b', ownerIndex: 0 })
    const form = { ...seed, valueToday: 50_000, annualContribution: 15_000, legs: { stock: '60', bond: '40', cash: '0' } }
    const res = saveEdit(model, (d) => buildAccountEdit(d, 'new', seed, form), ownAccountField(before.enteredAccounts.length))
    expect(res.saved).toBe(false)
    if (res.saved) return
    // The walk's Continue on the accounts step: the same draft, its accounts' deposit fields touched.
    const walkDraft: ScenarioDraft = { ...before, enteredAccounts: [...before.enteredAccounts, { kind: '403b', ownerIndex: 0, valueToday: 50_000, annualContribution: 15_000 }] }
    const touched = new Set(walkDraft.enteredAccounts.flatMap((_, i) => [accountField(i, 'annualContribution'), accountField(i, 'employerMatchAnnual')]))
    const walk = validateDraft(walkDraft, touched, { periodConfirmed: true }).find((v) => v.field === accountField(2, 'annualContribution'))
    expect(walk, '[test setup] the walk refuses the pair').toBeDefined()
    expect(res.check.fields.deposit).toBe(fieldErrorText(walk!))
    expect(model.getSnapshot().draft).toBe(before)
    expect(recompute).not.toHaveBeenCalled()
  })

  it('a birth year that drops a person’s catch-up puts their deposits over the limit on another card: refused, and named there (insight 158)', () => {
    const big: ScenarioDraft = { ...working, enteredAccounts: [{ ...working.enteredAccounts[0]!, annualContribution: 30_000, employerMatchAnnual: 0 }, working.enteredAccounts[1]!] }
    const { model } = profileStore(big)
    expect(validateDraft(big, new Set([accountField(0, 'annualContribution')]), {}), '[test setup] legal at 58').toEqual([])
    const seed = personFormFrom(big, 0)
    const res = saveEdit(model, (d) => buildPerson(d, 0, seed, { ...seed, birthYear: 1980 }), ownPersonField(0))
    expect(res.saved).toBe(false)
    if (res.saved) return
    expect(res.check.fields).toEqual({})
    expect(res.check.elsewhere).toHaveLength(1)
    expect(res.check.elsewhere[0]).toMatch(/^Not saved: this change would leave a problem with Alex’s 401\(k\)\. That’s more than this year’s legal contribution limit/)
    expect(model.getSnapshot().draft).toBe(big)
  })
})

describe('a passed Save', () => {
  it('is one store commit and one recompute; the field lands where the walk writes it', () => {
    const { model, recompute } = profileStore(retired)
    const seed = socialSecurityFormFrom(model.getSnapshot().draft, 0)
    const res = saveEdit(model, (d) => buildSocialSecurity(d, 0, seed, { ...seed, monthly: 2_600 }), ownSocialSecurityField(0))
    expect(res).toEqual({ saved: true, moved: true })
    expect(model.getSnapshot().draft.people[0].pia).toBe(31_200)
    expect(recompute).toHaveBeenCalledTimes(1)
  })

  it('with nothing changed moves nothing and sends no recompute', () => {
    const { model, recompute } = profileStore(working)
    const before = model.getSnapshot().draft
    const seed = accountFormFromDraft(before, { index: 0 })
    const res = saveEdit(model, (d) => buildAccountEdit(d, 0, seed, seed), ownAccountField(0))
    expect(res).toEqual({ saved: true, moved: false })
    expect(model.getSnapshot().draft).toBe(before)
    expect(recompute).not.toHaveBeenCalled()
  })

  it('a Social Security figure the box only shows rounded is never written back rounded', () => {
    const odd: ScenarioDraft = { ...retired, people: [{ ...retired.people[0], pia: 25_001 }, retired.people[1]] }
    const { model } = profileStore(odd)
    const seed = socialSecurityFormFrom(odd, 0)
    const res = saveEdit(model, (d) => buildSocialSecurity(d, 0, seed, { ...seed, claimYear: 2028 }), ownSocialSecurityField(0))
    expect(res.saved).toBe(true)
    expect(model.getSnapshot().draft.people[0].pia).toBe(25_001)
    expect(model.getSnapshot().draft.people[0].socialSecurityClaimAge).toBe(68)
  })
})

describe('delete', () => {
  it('an account a kept what-if changes: the what-if is then refused by name, never aimed at another account', () => {
    const lever = { kind: 'deposits', accountId: working.enteredAccounts[0]!.id!, annualContribution: 10_000 } as unknown as WhatIfLeverV6
    expect(applyBundle(working, [lever]).ok, '[test setup] the what-if runs while the account stands').toBe(true)
    const after = deleteAccount(working, 0)
    const applied = applyBundle(after, [lever])
    expect(applied.ok).toBe(false)
    if (applied.ok) return
    expect(applied.refusal).toEqual({ kind: 'account-gone', accountId: 'acct-0-401k' })
    expect(refusalWords(applied.refusal, after.startCalendarYear)).toBe(copy.workbenchRailRefusedAccountGone)
  })
})

describe('the person drawer writes as the walk’s work step writes', () => {
  it('to working: the stop age cleared and the pay re-opened; to retired: the pay zeroed and the stop age kept', () => {
    const seed = personFormFrom(retired, 1)
    const toWorking = buildPerson(retired, 1, seed, { ...seed, workStatus: 'working' })
    expect(toWorking.ok && toWorking.draft.people[1]).toMatchObject({ workStatus: 'working', retirementAge: undefined, earnedIncomeReal: undefined })
    const wSeed = personFormFrom(working, 0)
    const toRetired = buildPerson(working, 0, wSeed, { ...wSeed, workStatus: 'retired', retirementAge: 57 })
    expect(toRetired.ok && toRetired.draft.people[0]).toMatchObject({ workStatus: 'retired', retirementAge: 57, earnedIncomeReal: 0 })
  })

  it('the rule fields it owns are its own; another person’s are not', () => {
    expect(ownPersonField(0)(personField(0, 'birthYear'))).toBe('birthYear')
    expect(ownPersonField(0)(personField(1, 'birthYear'))).toBeNull()
  })
})

describe('the income drawer', () => {
  it('a new stream goes on the list’s end; one the walk refuses (no survivor share) names the field', () => {
    const seed = otherIncomeFormFrom(retired, { type: 'pension' })
    const missing = buildOtherIncome(retired, 'new', seed, { ...seed, annualRealToday: 12_000, receivingNow: true, colaMode: 'real-flat' })
    expect(missing).toEqual({ ok: false, fields: { survivorPct: copy.errIncomeSurvivorRequired } })
    const ok = buildOtherIncome(retired, 'new', seed, { ...seed, annualRealToday: 12_000, receivingNow: true, colaMode: 'real-flat', survivorPct: 0.5 })
    expect(ok.ok && ok.draft.incomeStreams).toEqual([{ ownerIndex: 0, annualRealToday: 12_000, startAge: 66, colaMode: 'real-flat', survivorPct: 0.5, type: 'pension' }])
    expect(ok.ok && draftIdentityKey({ ...ok.draft, incomeStreams: [] }) === draftIdentityKey(retired)).toBe(true)
  })
})
