import { describe, expect, it } from 'vitest'
import { accountField, personField, validateDraft } from '@intake/sanity'
import { fieldErrorText } from '@intake/fieldErrors'
import { applyBundle } from '@intake/whatIf'
import { draftIdentityKey, type ScenarioDraft } from '@store/memoryModel'
import type { WhatIfLeverV6 } from '@shared/model'
import { DEV_SEEDS } from '../../../../devSeeds'
import { copy, slots } from '../../../../copy'
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

  // Milestone 3's review, X6: a typed claim year with no birth year to read it as an age is refused, never dropped.
  it('a claim year typed with no birth year: refused under the claim year, naming the birth year it needs; the store untouched', () => {
    const { birthYear: _b, currentAge: _a, socialSecurityClaimAge: _c, ...sam } = retired.people[1]
    const noBirth: ScenarioDraft = { ...retired, people: [retired.people[0], sam] }
    const { model, recompute } = profileStore(noBirth)
    const seed = socialSecurityFormFrom(noBirth, 1)
    const res = saveEdit(model, (d) => buildSocialSecurity(d, 1, seed, { ...seed, claimYear: 2030 }), ownSocialSecurityField(1))
    expect(res.saved).toBe(false)
    if (res.saved) return
    expect(res.check.fields).toEqual({ claimYear: slots.profileBirthYearFirst('Sam’s', false) })
    expect(model.getSnapshot().draft).toBe(noBirth)
    expect(recompute).not.toHaveBeenCalled()
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
    // No claim age typed: a birth year moved 14 years would also carry a typed claim YEAR out of 62–70 (X4), a second
    // refusal this arm is not about.
    const { socialSecurityClaimAge: _claim, ...alex } = working.people[0]
    const big: ScenarioDraft = {
      ...working,
      people: [alex, working.people[1]],
      enteredAccounts: [{ ...working.enteredAccounts[0]!, annualContribution: 30_000, employerMatchAnnual: 0 }, working.enteredAccounts[1]!],
    }
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

  // Milestone 3's review, X5: a retired person's investment-income slot holds the forced $0, never an answer.
  it('to working: the investment income while working is re-asked (the forced retired $0 cleared), the other slot kept', () => {
    const start: ScenarioDraft = { ...retired, health: { ...retired.health, workingYearInvestmentByPerson: [0, 0] } }
    const seed = personFormFrom(start, 1)
    const toWorking = buildPerson(start, 1, seed, { ...seed, workStatus: 'working' })
    expect(toWorking.ok && toWorking.draft.health.workingYearInvestmentByPerson).toEqual([0, undefined])
  })

  // Milestone 3's review, X4: a birth year moved from one known year to another keeps the calendar facts.
  describe('a birth year moved from one known year to another', () => {
    const at = (birthYear: number): ScenarioDraft => {
      const age = retired.startCalendarYear - birthYear
      const people: ScenarioDraft['people'] = [{ ...retired.people[0], birthYear, currentAge: age, socialSecurityClaimAge: 67 }, retired.people[1]]
      return {
        ...retired,
        people,
        incomeStreams: [
          { ownerIndex: 0, annualRealToday: 12_000, startAge: age, colaMode: 'real-flat', survivorPct: 0.5, type: 'pension' },
          { ownerIndex: 0, annualRealToday: 6_000, startAge: age + 3, endAge: age + 10, colaMode: 'real-flat', survivorPct: 0, type: 'other' },
          { ownerIndex: 1, annualRealToday: 5_000, startAge: retired.people[1].currentAge!, colaMode: 'real-flat', survivorPct: 0, type: 'other' },
        ],
      }
    }
    const move = (from: number, to: number) => {
      const d = at(from)
      const seed = personFormFrom(d, 0)
      const built = buildPerson(d, 0, seed, { ...seed, birthYear: to })
      if (!built.ok) throw new Error('[test setup] refused')
      return { before: d, after: built.draft }
    }

    it('1960 → 1961 (a year younger): the claim YEAR holds, and income paying now keeps paying now', () => {
      const { before, after } = move(1960, 1961)
      const p = after.people[0]
      expect(p.currentAge).toBe(before.people[0].currentAge! - 1)
      expect(p.birthYear! + p.socialSecurityClaimAge!).toBe(1960 + 67)
      expect(after.incomeStreams[0]!.startAge).toBe(p.currentAge)
      expect(after.incomeStreams[1], 'a later stream’s typed ages stay').toEqual(before.incomeStreams[1])
      expect(after.incomeStreams[2], 'the other person’s stream is untouched').toEqual(before.incomeStreams[2])
    })

    it('1961 → 1960 (a year older): the claim YEAR holds; no stream moves (paying now stays paying now)', () => {
      const { before, after } = move(1961, 1960)
      const p = after.people[0]
      expect(p.birthYear! + p.socialSecurityClaimAge!).toBe(1961 + 67)
      expect(after.incomeStreams).toEqual(before.incomeStreams)
    })

    it('a held claim year whose age leaves 62–70 is refused on its own card, named in the drawer', () => {
      const d = at(1960)
      const late: ScenarioDraft = { ...d, people: [{ ...d.people[0], socialSecurityClaimAge: 70 }, d.people[1]] }
      const { model } = profileStore(late)
      const seed = personFormFrom(late, 0)
      const res = saveEdit(model, (x) => buildPerson(x, 0, seed, { ...seed, birthYear: 1959 }), ownPersonField(0))
      expect(res.saved).toBe(false)
      if (res.saved) return
      expect(res.check.elsewhere.join(' ')).toContain(copy.errSsClaimWindow)
      expect(model.getSnapshot().draft).toBe(late)
    })
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
