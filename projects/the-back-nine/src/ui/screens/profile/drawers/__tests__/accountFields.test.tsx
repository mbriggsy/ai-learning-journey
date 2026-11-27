// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { annualAdditions415c2026, catchUpForAge, employerPlan2026, ira2026 } from '@engine/constants/contributions'
import { blendOf, missingRequiredFacts } from '@intake/intakeMap'
import { formatMoney } from '@intake/moneyFormat'
import { annualAdditionsCeilingFor, contributionCeilingFor } from '@intake/sanity'
import { unsavedBuffersHeld } from '@intake/unsavedBuffer'
import type { AccountKind, EnteredAccount, WhatIfLeverV6 } from '@shared/model'
import type { MemoryModel, ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../../devSeeds'
import { copy, slots } from '../../../../copy'
import { profileStore } from '../../__tests__/profileStore'
import { DrawerFor } from '../../drawerHost'
import type { DrawerTarget } from '../../profileView'
import { accountFormFromDraft, buildAccountEdit, deleteAccount, ownAccountField, type AccountDrawerForm } from '../accountFields'
import { saveEdit } from '../drawerSave'

/**
 * The account's honesty laws, on the code that carries them since Act 6 · RC14 deleted the walk's account entry
 * (`AccountEntry.tsx`, `AllocationEntry.tsx`): the Profile account drawer (`AccountDrawer.tsx`) over its pure half
 * (`accountFields.ts`), which runs the walk's one decision tree (`buildAccount`, `src/intake/accountForm.ts`) and the
 * one leg rule (`classifyLegs`, `src/intake/allocation.ts`), its Save through `drawerSave.ts`.
 *
 * What it guards: a typed split that is not 100% never commits (and never a stale blend under a screen showing another);
 * a blank mix commits no blend and the missing-fact gate names it; a leg typed "60%" is the number shown, and a leg that
 * is not a plain 0–100 number is refused in its own words; a missing kind or balance is named; a field the kind or the
 * owner makes inapplicable never reaches the plan; an HSA's employer money shares the one family ceiling; the C1
 * ceilings fire one dollar over and pass at the boundary, quoting the limit; a brokerage deposit is uncapped; a new
 * account is minted a fresh id and an edit keeps its own. The leg rule's own grammar is `allocation.test.ts`'s; the
 * cross-account backstops are `sanity.test.ts`'s and `drawerSave.test.ts`'s.
 */
afterEach(cleanup)

const date = DEV_SEEDS.date // Alex 58 working (a 401(k) with a match), Sam 60 retired

/** Alex at 61 (the 60–63 super catch-up band), still working, with no accounts yet: every ceiling is this one account's. */
const at61: ScenarioDraft = {
  ...date,
  people: [{ ...date.people[0], currentAge: 61, birthYear: 1965 }, date.people[1]],
  enteredAccounts: [],
}

/** One committed Roth IRA holding 60/30/10, for the edit arms. */
const withRoth: ScenarioDraft = {
  ...at61,
  enteredAccounts: [{ id: 'acct-kept', ownerIndex: 0, kind: 'roth-ira', valueToday: 100_000, manualBlend: { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 } }],
}

/** A new account of `kind` for Alex, its form edited by `over`, built (not saved). */
function buildNew(d: ScenarioDraft, kind: AccountKind | undefined, over: Partial<AccountDrawerForm>) {
  const seed = accountFormFromDraft(d, { kind: kind ?? 'brokerage', ownerIndex: 0 })
  return buildAccountEdit(d, 'new', seed, { ...seed, kind, ...over })
}

/** The account a build added (or put back at `index`). */
function builtAccount(res: ReturnType<typeof buildAccountEdit>, index = -1): EnteredAccount {
  if (!res.ok) throw new Error(`[test setup] refused: ${JSON.stringify(res.fields)}`)
  return res.draft.enteredAccounts.at(index)!
}

/** A new account of `kind` for Alex through the whole Save (the entry form's tree, then every walk rule). */
function saveNew(model: MemoryModel, kind: AccountKind, over: Partial<AccountDrawerForm>) {
  const before = model.getSnapshot().draft
  const seed = accountFormFromDraft(before, { kind, ownerIndex: 0 })
  return saveEdit(model, (d) => buildAccountEdit(d, 'new', seed, { ...seed, ...over }), ownAccountField(before.enteredAccounts.length))
}

describe('the kind and the owner decide which facts an account can carry', () => {
  const every = { valueToday: 100_000, basis: 60_000, annualContribution: 5_000, employerMatchAnnual: 3_000, hsaEmployerAnnual: 1_000 }

  it('a cost basis only on a brokerage account; a match only on an employer plan; employer money only on an HSA', () => {
    expect(builtAccount(buildNew(at61, 'brokerage', every))).toMatchObject({ basis: 60_000 })
    expect(builtAccount(buildNew(at61, 'brokerage', every))).not.toHaveProperty('employerMatchAnnual')
    const plan = builtAccount(buildNew(at61, '401k', every))
    expect(plan).toMatchObject({ employerMatchAnnual: 3_000, annualContribution: 5_000 })
    expect(plan).not.toHaveProperty('basis')
    expect(plan).not.toHaveProperty('hsaEmployerAnnual')
    const hsa = builtAccount(buildNew(at61, 'hsa', every))
    expect(hsa).toMatchObject({ hsaEmployerAnnual: 1_000, annualContribution: 5_000 })
    expect(hsa).not.toHaveProperty('employerMatchAnnual')
  })

  it('a retired owner’s account carries no deposit and no match, whatever the form held (the inapplicable class)', () => {
    const seed = accountFormFromDraft(at61, { kind: '401k', ownerIndex: 1 })
    const res = buildAccountEdit(at61, 'new', seed, { ...seed, ...every })
    const account = builtAccount(res)
    expect(account.ownerIndex).toBe(1)
    expect(account).not.toHaveProperty('annualContribution')
    expect(account).not.toHaveProperty('employerMatchAnnual')
  })

  it('the drawer asks only what the kind and the owner can carry', () => {
    const open = (target: DrawerTarget) => {
      cleanup()
      renderDrawer(target, at61)
      return screen.getByRole('dialog')
    }
    let d = open({ kind: 'new-account', accountKind: 'brokerage', ownerIndex: 0 })
    expect(within(d).getByLabelText(copy.accountBasisLabel)).toBeInTheDocument()
    expect(within(d).queryByLabelText(copy.accountMatchLabel)).toBeNull()
    expect(within(d).queryByLabelText(copy.accountHsaEmployerLabel)).toBeNull()
    expect(within(d).getByLabelText(copy.accountContributionLabel)).toBeInTheDocument()
    d = open({ kind: 'new-account', accountKind: '401k', ownerIndex: 0 })
    expect(within(d).queryByLabelText(copy.accountBasisLabel)).toBeNull()
    expect(within(d).getByLabelText(copy.accountMatchLabel)).toBeInTheDocument()
    expect(within(d).queryByLabelText(copy.accountHsaEmployerLabel)).toBeNull()
    d = open({ kind: 'new-account', accountKind: 'hsa', ownerIndex: 0 })
    expect(within(d).queryByLabelText(copy.accountMatchLabel)).toBeNull()
    expect(within(d).getByLabelText(copy.accountHsaEmployerLabel)).toBeInTheDocument()
    d = open({ kind: 'new-account', accountKind: '401k', ownerIndex: 1 })
    expect(within(d).queryByLabelText(copy.accountContributionLabel)).toBeNull()
    expect(within(d).queryByLabelText(copy.accountMatchLabel)).toBeNull()
    expect(within(d).getByText(copy.profileDepositsRetired)).toBeInTheDocument()
  })

  // Milestone 3's review, X9: "stopped working" only for a person marked retired.
  it('an owner whose work status is blank: no deposit box, and a line saying it is still needed on Family, never "stopped working"', () => {
    const { workStatus: _w, ...sam } = at61.people[1]
    renderDrawer({ kind: 'new-account', accountKind: '401k', ownerIndex: 1 }, { ...at61, people: [at61.people[0], sam] })
    const d = screen.getByRole('dialog')
    expect(within(d).queryByLabelText(copy.accountContributionLabel)).toBeNull()
    expect(within(d).getByText(copy.profileDepositsWorkUnanswered)).toBeInTheDocument()
    expect(within(d).queryByText(copy.profileDepositsRetired)).toBeNull()
  })

  // Milestone 3's review, A7: a new account's title follows the kind picked in the drawer.
  it('a new account’s title names the kind picked in the drawer', async () => {
    renderDrawer({ kind: 'new-account', accountKind: 'brokerage', ownerIndex: 0 }, at61)
    expect(screen.getByRole('dialog', { name: slots.profileNewAccountTitle(copy.kindBrokerage) })).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: copy.profileKindLabel }))
    await user.click(await screen.findByRole('option', { name: copy.kindRothIra }))
    expect(screen.getByRole('dialog', { name: slots.profileNewAccountTitle(copy.kindRothIra) })).toBeInTheDocument()
  })
})

// Milestone 3's review, B4: every leg of an unknown fund's mix cleared lets the household's mix go, as a blank hand mix does.
describe('an unknown fund’s mix cleared', () => {
  it('drops the household’s classification for that fund, never keeping the old mix under blank boxes', () => {
    const blend = { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 } as const
    const held: ScenarioDraft = {
      ...at61,
      enteredAccounts: [{ id: 'acct-fund', ownerIndex: 0, kind: 'roth-ira', valueToday: 100_000, ticker: 'ZZZQX' }],
      tickerClassifications: { ...at61.tickerClassifications, ZZZQX: blend },
    }
    const seed = accountFormFromDraft(held, { index: 0 })
    expect(seed.mixHow, '[test setup] the fund face').toBe('fund')
    const res = buildAccountEdit(held, 0, seed, { ...seed, tickerLegs: { stock: '', bond: '', cash: '' } })
    expect(res.ok && res.draft.tickerClassifications.ZZZQX).toBeUndefined()
    expect(res.ok && res.draft.enteredAccounts[0]!.ticker).toBe('ZZZQX')
  })

  // Milestone 3's review, round 3: the mix is shared by every account holding the fund, and a ticker typed in another
  // account's drawer left its boxes blank, so Save read them as cleared and deleted the first account's mix too.
  it('a second account typing a fund the plan holds a mix for shows that mix in its boxes, and Save keeps it for both', async () => {
    const blend = { kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 } as const
    const held: ScenarioDraft = {
      ...at61,
      enteredAccounts: [{ id: 'acct-fund', ownerIndex: 0, kind: 'roth-ira', valueToday: 100_000, ticker: 'ZZZQX' }],
      tickerClassifications: { ...at61.tickerClassifications, ZZZQX: blend },
    }
    const { model, dialog } = renderDrawer({ kind: 'new-account', accountKind: 'brokerage', ownerIndex: 0 }, held)
    type(within(dialog).getByLabelText(copy.accountValueLabel), '50,000')
    const user = userEvent.setup()
    await user.click(within(dialog).getByRole('combobox', { name: copy.profileMixHow }))
    await user.click(await screen.findByRole('option', { name: copy.profileMixByTicker }))
    type(within(dialog).getByLabelText(copy.profileTickerLabel), 'zzzqx')
    expect(within(dialog).getByLabelText(copy.classifierStockPct)).toHaveValue('60')
    expect(within(dialog).getByLabelText(copy.classifierBondPct)).toHaveValue('30')
    expect(within(dialog).getByLabelText(copy.classifierCashPct)).toHaveValue('10')
    act(() => fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerSave })))
    const after = model.getSnapshot().draft
    expect(after.enteredAccounts.map((a) => a.ticker)).toEqual(['ZZZQX', 'ZZZQX'])
    expect(after.tickerClassifications.ZZZQX).toEqual(blend)
  })
})

describe('the mix', () => {
  it('a committed account carries the typed blend', () => {
    const res = buildNew(at61, 'roth-ira', { valueToday: 100_000, legs: { stock: '70', bond: '25', cash: '5' } })
    expect(builtAccount(res)).toMatchObject({ kind: 'roth-ira', valueToday: 100_000, manualBlend: { kind: 'exact', stockPct: 70, bondPct: 25, cashPct: 5 } })
  })

  it('a TYPED split that is not 100% never commits: refused under the mix in the sum’s words, the store untouched; repaired, the repaired blend commits (never a silent discard)', () => {
    const { model, recompute } = profileStore(at61)
    const before = model.getSnapshot().draft
    const bad = saveNew(model, 'roth-ira', { valueToday: 100_000, legs: { stock: '60', bond: '30', cash: '20' } })
    expect(bad.saved).toBe(false)
    if (bad.saved) return
    expect(bad.check.fields).toEqual({ mix: copy.errClassifierSum })
    expect(model.getSnapshot().draft).toBe(before)
    expect(recompute).not.toHaveBeenCalled()
    const good = saveNew(model, 'roth-ira', { valueToday: 100_000, legs: { stock: '60', bond: '30', cash: '10' } })
    expect(good.saved).toBe(true)
    expect(model.getSnapshot().draft.enteredAccounts.at(-1)!.manualBlend).toEqual({ kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 })
  })

  it('EDITING a committed valid blend into a non-100 split never re-commits the stale valid one', () => {
    const seed = accountFormFromDraft(withRoth, { index: 0 })
    expect(seed.legs, 'the drawer shows the committed split').toEqual({ stock: '60', bond: '30', cash: '10' })
    const res = buildAccountEdit(withRoth, 0, seed, { ...seed, legs: { ...seed.legs, stock: '70' } })
    expect(res).toEqual({ ok: false, fields: { mix: copy.errClassifierSum } })
    const fixed = buildAccountEdit(withRoth, 0, seed, { ...seed, valueToday: 110_000, legs: { stock: '60', bond: '30', cash: '10' } })
    expect(builtAccount(fixed, 0).manualBlend).toEqual({ kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 })
  })

  it('a BLANK mix commits without a blend, and the missing-fact gate names it (the honest not-answered-yet channel)', () => {
    const res = buildNew(at61, 'roth-ira', { valueToday: 100_000 })
    const account = builtAccount(res)
    expect(account).not.toHaveProperty('manualBlend')
    expect(missingRequiredFacts({ ...at61, enteredAccounts: [account] }).map((f) => f.labelKey)).toContain('classifierLegend')
  })

  it('CLEARING every leg of a committed blend is not an error: the blend is gone (never the old one re-committed) and the gate names it', () => {
    const seed = accountFormFromDraft(withRoth, { index: 0 })
    const res = buildAccountEdit(withRoth, 0, seed, { ...seed, legs: { stock: '', bond: '', cash: '' } })
    const account = builtAccount(res, 0)
    expect(account).not.toHaveProperty('manualBlend')
    expect(account.id).toBe('acct-kept')
    expect(missingRequiredFacts(res.ok ? res.draft : at61).map((f) => f.labelKey)).toContain('classifierLegend')
  })

  it('a blank leg reads as zero: 100 / blank / blank is a valid 100/0/0 split', () => {
    const res = buildNew(at61, 'roth-ira', { valueToday: 100_000, legs: { stock: '100', bond: '', cash: '' } })
    expect(builtAccount(res).manualBlend).toEqual({ kind: 'exact', stockPct: 100, bondPct: 0, cashPct: 0 })
  })

  it('a leg typed "60%" is the number it shows; a leg that is not a plain 0–100 number is refused in ITS OWN words, never as the sum’s', () => {
    const ok = buildNew(at61, 'roth-ira', { valueToday: 100_000, legs: { stock: '60%', bond: ' 30 ', cash: '10' } })
    expect(builtAccount(ok).manualBlend).toEqual({ kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 })
    // "1e2" was once valued 100 by a bare Number(); 150 is out of range.
    for (const stock of ['1e2', '150']) {
      expect(buildNew(at61, 'roth-ira', { valueToday: 100_000, legs: { stock, bond: '', cash: '' } }), stock).toEqual({ ok: false, fields: { mix: copy.errClassifierNumber } })
    }
  })

  it('a legacy `simple` blend seeds the legs it means (cash ⇒ 0 / 0 / 100); untouched it stays the household’s own answer, and an edit re-commits that same split', () => {
    const legacy: ScenarioDraft = { ...withRoth, enteredAccounts: [{ ...withRoth.enteredAccounts[0]!, manualBlend: { kind: 'simple', choice: 'cash' } }] }
    const seed = accountFormFromDraft(legacy, { index: 0 })
    expect(seed.legs).toEqual({ stock: '0', bond: '0', cash: '100' })
    const untouched = buildAccountEdit(legacy, 0, seed, seed)
    expect(untouched.ok && untouched.draft).toBe(legacy)
    const edited = builtAccount(buildAccountEdit(legacy, 0, seed, { ...seed, valueToday: 120_000 }), 0)
    expect(blendOf(edited.manualBlend!)).toEqual(blendOf({ kind: 'simple', choice: 'cash' }))
  })
})

describe('a refused Save always names the missing fact, never a silent dead button', () => {
  it('no kind names the kind; no balance names the balance', () => {
    expect(buildNew(at61, undefined, { valueToday: 100_000 })).toEqual({ ok: false, fields: { kind: copy.errAccountKindRequired } })
    expect(buildNew(at61, 'roth-ira', {})).toEqual({ ok: false, fields: { value: copy.errAccountValueRequired } })
  })

  it('in the drawer: a Save with no balance shows the line under the balance, bound to it, and the store is untouched', () => {
    const { model, dialog } = renderDrawer({ kind: 'new-account', accountKind: 'roth-ira', ownerIndex: 0 }, at61)
    const before = model.getSnapshot().draft
    fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerSave }))
    const balance = within(dialog).getByLabelText(copy.accountValueLabel)
    const alert = within(dialog).getByRole('alert')
    expect(alert).toHaveTextContent(copy.errAccountValueRequired)
    expect(balance).toHaveAttribute('aria-invalid', 'true')
    expect(balance.getAttribute('aria-describedby') ?? '').toContain(alert.id)
    expect(model.getSnapshot().draft).toBe(before)
  })
})

describe('in the drawer, a leg typed and never blurred is part of the Save', () => {
  it('a valid split typed with no blur commits the FRESH blend; a valid split changed to 110 with no blur is refused', () => {
    let r = renderDrawer({ kind: 'new-account', accountKind: 'roth-ira', ownerIndex: 0 }, at61)
    type(within(r.dialog).getByLabelText(copy.accountValueLabel), '100000')
    type(within(r.dialog).getByLabelText(copy.classifierStockPct), '60')
    type(within(r.dialog).getByLabelText(copy.classifierBondPct), '30')
    type(within(r.dialog).getByLabelText(copy.classifierCashPct), '10', true)
    fireEvent.click(within(r.dialog).getByRole('button', { name: copy.profileDrawerSave }))
    expect(r.model.getSnapshot().draft.enteredAccounts.at(-1)!.manualBlend).toEqual({ kind: 'exact', stockPct: 60, bondPct: 30, cashPct: 10 })

    cleanup()
    r = renderDrawer({ kind: 'new-account', accountKind: 'roth-ira', ownerIndex: 0 }, at61)
    const before = r.model.getSnapshot().draft
    type(within(r.dialog).getByLabelText(copy.accountValueLabel), '100000')
    type(within(r.dialog).getByLabelText(copy.classifierStockPct), '60')
    type(within(r.dialog).getByLabelText(copy.classifierBondPct), '30')
    type(within(r.dialog).getByLabelText(copy.classifierCashPct), '10')
    type(within(r.dialog).getByLabelText(copy.classifierCashPct), '20', true)
    expect(within(r.dialog).queryByRole('alert'), 'silent while typing').toBeNull()
    fireEvent.click(within(r.dialog).getByRole('button', { name: copy.profileDrawerSave }))
    expect(r.model.getSnapshot().draft).toBe(before)
    expect(within(r.dialog).getByRole('alert')).toHaveTextContent(copy.errClassifierSum)
  })

  // The walk's laws on the mix's refusal (back-nine-design: errors are tied to the field as text, never colour alone;
  // they clear the instant the field is edited again, not on its blur). The drawer's three leg boxes carry neither.
  it('the mix’s refusal is tied to each % box (aria-invalid + aria-describedby) and clears the instant a leg is edited again', () => {
    const { dialog } = renderDrawer({ kind: 'new-account', accountKind: 'roth-ira', ownerIndex: 0 }, at61)
    type(within(dialog).getByLabelText(copy.accountValueLabel), '100000')
    type(within(dialog).getByLabelText(copy.classifierStockPct), '60')
    type(within(dialog).getByLabelText(copy.classifierBondPct), '30')
    type(within(dialog).getByLabelText(copy.classifierCashPct), '20')
    fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerSave }))
    const alert = within(dialog).getByRole('alert')
    expect(alert).toHaveTextContent(copy.errClassifierSum)
    for (const label of [copy.classifierStockPct, copy.classifierBondPct, copy.classifierCashPct]) {
      const leg = within(dialog).getByLabelText(label)
      expect.soft(leg, label).toHaveAttribute('aria-invalid', 'true')
      expect.soft(leg.getAttribute('aria-describedby') ?? '', label).toContain(alert.id)
    }
    type(within(dialog).getByLabelText(copy.classifierCashPct), '10', true)
    expect(within(dialog).queryByRole('alert'), 'forgiven on the first keystroke, not the blur').toBeNull()
  })
})

describe('an HSA’s employer money', () => {
  it('a committed HSA carries both the personal and the employer deposit', () => {
    const res = buildNew(at61, 'hsa', { valueToday: 20_000, annualContribution: 2_000, hsaEmployerAnnual: 1_000 })
    expect(builtAccount(res)).toMatchObject({ kind: 'hsa', annualContribution: 2_000, hsaEmployerAnnual: 1_000 })
  })

  it('shares the ONE family ceiling with the personal deposit: combined one dollar over is refused under both, quoting the limit; exactly at it passes', () => {
    const ceiling = contributionCeilingFor('hsa', 61)!
    const { model } = profileStore(at61)
    const over = saveNew(model, 'hsa', { valueToday: 20_000, annualContribution: ceiling - 1_000, hsaEmployerAnnual: 1_001 })
    expect(over.saved).toBe(false)
    if (over.saved) return
    const words = slots.errContributionCeiling(formatMoney(ceiling))
    expect(over.check.fields).toEqual({ deposit: words, hsaEmployer: words })
    expect(saveNew(model, 'hsa', { valueToday: 20_000, annualContribution: ceiling - 1_000, hsaEmployerAnnual: 1_000 }).saved).toBe(true)
  })
})

describe('the C1 ceilings (fire one dollar over AND pass at the boundary)', () => {
  it('at 61 the deferral plus the 60–63 super band passes; one dollar over is refused, quoting that ceiling', () => {
    const ceiling = contributionCeilingFor('401k', 61)!
    // The composition: the canonical deferral plus the age band (values source-bound in the constants module, never
    // re-typed here). The super band is its own figure, above the regular catch-up and not 150% of it (the C1 trap).
    const superBand = catchUpForAge(61, 'employerPlan')
    expect(ceiling).toBe(employerPlan2026.value.electiveDeferral + superBand)
    expect(superBand).toBeGreaterThan(catchUpForAge(55, 'employerPlan'))
    expect(superBand).not.toBe(1.5 * catchUpForAge(55, 'employerPlan'))

    const { model } = profileStore(at61)
    const over = saveNew(model, '401k', { valueToday: 500_000, annualContribution: ceiling + 1 })
    expect(over.saved || over.check.fields).toEqual({ deposit: slots.errContributionCeiling(formatMoney(ceiling)) })
    expect(saveNew(model, '401k', { valueToday: 500_000, annualContribution: ceiling }).saved).toBe(true)
  })

  it('an IRA’s ceiling is the base plus the age-50 catch-up; under 50 the bare base', () => {
    expect(contributionCeilingFor('roth-ira', 61)).toBe(ira2026.value.contributionLimit + catchUpForAge(61, 'ira'))
    expect(catchUpForAge(61, 'ira')).toBeGreaterThan(0)
    expect(contributionCeilingFor('traditional-ira', 45)).toBe(ira2026.value.contributionLimit)
  })

  it('deposit plus match over the §415(c) cap PLUS the band is refused under the match, quoting it; at it passes', () => {
    const ceiling = annualAdditionsCeilingFor(61)
    // The band sits ON TOP: never the bare cap (the C1 note's explicit trap).
    expect(ceiling).toBe(annualAdditions415c2026.value + catchUpForAge(61, 'employerPlan'))
    expect(ceiling).toBeGreaterThan(annualAdditions415c2026.value)
    const deferral = employerPlan2026.value.electiveDeferral
    const { model } = profileStore(at61)
    const over = saveNew(model, '401k', { valueToday: 500_000, annualContribution: deferral, employerMatchAnnual: ceiling - deferral + 1 })
    expect(over.saved || over.check.fields).toEqual({ match: slots.errAdditionsCeiling(formatMoney(ceiling)) })
    expect(saveNew(model, '401k', { valueToday: 500_000, annualContribution: deferral, employerMatchAnnual: ceiling - deferral }).saved).toBe(true)
  })

  it('a brokerage deposit is uncapped (no statutory ceiling): a deposit far over every plan limit saves', () => {
    expect(contributionCeilingFor('brokerage', 61)).toBeNull()
    const { model } = profileStore(at61)
    expect(saveNew(model, 'brokerage', { valueToday: 500_000, annualContribution: 250_000 }).saved).toBe(true)
  })
})

describe('the stable id (schema version 6)', () => {
  it('a new account is minted a fresh random id, never one an account, a line or a kept what-if holds or names', () => {
    const held: ScenarioDraft = {
      ...at61,
      enteredAccounts: [{ id: 'acct-held', ownerIndex: 1, kind: 'roth-ira', valueToday: 5_000 }],
      budget: [{ id: 'line-held', category: 'food', label: '', annualAmountReal: 1_000, tier: 'essentials', startYear: 0 }],
      keptWhatIfs: [{ id: 'wi-held', name: 'n', levers: [{ kind: 'deposits', accountId: 'acct-named', annualContribution: 1 } as unknown as WhatIfLeverV6] }],
    }
    const id = builtAccount(buildNew(held, 'brokerage', { valueToday: 40_000 })).id
    expect(id).toMatch(/^[0-9a-f]{24}$/)
    expect(['acct-held', 'line-held', 'wi-held', 'acct-named']).not.toContain(id)
  })

  it('an edit keeps the account’s id: the tree rebuilds the account from its fields and carries the id across', () => {
    const initial = { id: 'acct-kept', ownerIndex: 0, kind: 'brokerage', valueToday: 100_000, basis: 60_000 } as const
    const d: ScenarioDraft = { ...at61, enteredAccounts: [initial] }
    const seed = accountFormFromDraft(d, { index: 0 })
    expect(builtAccount(buildAccountEdit(d, 0, seed, { ...seed, valueToday: 120_000 }), 0)).toEqual({ ...initial, valueToday: 120_000 })
  })

  it('on the store: add, edit, add, delete the first, add — every edit keeps its id, and the ids stay unique', () => {
    const { model } = profileStore(at61)
    const ids = () => model.getSnapshot().draft.enteredAccounts.map((a) => a.id)
    expect(saveNew(model, 'roth-ira', { valueToday: 250_000 }).saved).toBe(true)
    const [first] = ids()
    const seed = accountFormFromDraft(model.getSnapshot().draft, { index: 0 })
    expect(saveEdit(model, (d) => buildAccountEdit(d, 0, seed, { ...seed, valueToday: 260_000 }), ownAccountField(0)).saved).toBe(true)
    expect(model.getSnapshot().draft.enteredAccounts[0]).toMatchObject({ id: first, valueToday: 260_000 })
    expect(saveNew(model, 'brokerage', { valueToday: 50_000 }).saved).toBe(true)
    model.update((d) => deleteAccount(d, 0))
    expect(saveNew(model, 'brokerage', { valueToday: 50_000 }).saved).toBe(true) // two accounts with identical facts
    const after = ids()
    expect(after).toHaveLength(2)
    expect(after.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
    expect(new Set(after).size).toBe(2)
    expect(after).not.toContain(first)
  })
})

describe('the open buffer holds the leave-page guard only while it holds work', () => {
  it('a blank new account holds nothing; a committed balance holds; cleared back it releases; unmounted it releases', () => {
    const { dialog, view } = renderDrawer({ kind: 'new-account', accountKind: 'roth-ira', ownerIndex: 0 }, at61)
    expect(unsavedBuffersHeld()).toBe(0)
    const balance = within(dialog).getByLabelText(copy.accountValueLabel)
    type(balance, '100000')
    expect(unsavedBuffersHeld()).toBe(1)
    type(balance, '')
    expect(unsavedBuffersHeld()).toBe(0)
    type(balance, '5000')
    view.unmount()
    expect(unsavedBuffersHeld()).toBe(0)
  })
})

/** The account drawer over the real store, open, as the Profile host mounts it. */
function renderDrawer(target: DrawerTarget, start: ScenarioDraft) {
  const { model, recompute } = profileStore(start)
  const view = render(<DrawerFor target={target} model={model} open readOnly={false} onClose={() => {}} onClosed={() => {}} finalFocus={() => null} />)
  return { model, recompute, view, dialog: screen.getByRole('dialog') }
}

/** Type as a person does: focus, the text, and (unless `keepFocus`) the blur that commits it. */
function type(field: HTMLElement, text: string, keepFocus = false) {
  act(() => field.focus())
  fireEvent.change(field, { target: { value: text } })
  if (!keepFocus) act(() => field.blur())
}

describe('the required choice is announced up front (the walk’s aria-required, kept by the kit’s Select since RC14)', () => {
  it('a new account’s kind says it is required before any Save', () => {
    const { dialog } = renderDrawer({ kind: 'new-account', accountKind: 'roth-ira', ownerIndex: 0 }, at61)
    expect(within(dialog).getByRole('combobox', { name: copy.profileKindLabel })).toHaveAttribute('aria-required', 'true')
    expect(within(dialog).getByRole('combobox', { name: copy.profileOwnerLabel })).not.toHaveAttribute('aria-required')
  })
})

describe('the inherited IRA’s drawer (the Act 5 plan’s U13)', () => {
  const seed = DEV_SEEDS.inherited
  const at = seed.enteredAccounts.findIndex((a) => a.kind === 'inherited-ira')

  it('editing its balance keeps every inherited fact', () => {
    const open = accountFormFromDraft(seed, { index: at })
    const res = buildAccountEdit(seed, at, open, { ...open, valueToday: 123_456 })
    const account = builtAccount(res, at)
    expect(account.valueToday).toBe(123_456)
    expect(account.inherited).toEqual(seed.enteredAccounts[at]!.inherited)
  })

  it('a new one shows its kind locked, “Who inherited it”, its questions, and no deposit field', () => {
    const { dialog } = renderDrawer({ kind: 'new-account', accountKind: 'inherited-ira', ownerIndex: 0 }, seed)
    expect(within(dialog).getByRole('combobox', { name: copy.profileKindLabel })).toHaveAttribute('data-disabled')
    expect(within(dialog).getByRole('combobox', { name: copy.inheritedHeirLabel })).toBeInTheDocument()
    expect(within(dialog).getByRole('group', { name: copy.inheritedTreatmentLegend })).toBeInTheDocument()
    expect(within(dialog).queryByLabelText(copy.accountContributionLabel)).toBeNull()
    expect(dialog.querySelector('[data-profile-section="deposits"]')).toBeNull()
  })

  it('a refused answer shows its words on its question at once, and Save writes no account', async () => {
    const { dialog, model } = renderDrawer({ kind: 'new-account', accountKind: 'inherited-ira', ownerIndex: 0 }, seed)
    await userEvent.click(within(within(dialog).getByRole('group', { name: copy.inheritedTreatmentLegend })).getByLabelText(copy.kindRothIra))
    expect(within(dialog).getByText(copy.inheritedRefuseRoth)).toBeInTheDocument()
    expect(within(dialog).queryByRole('group', { name: slots.inheritedFromSpouseLegend('Alex') })).toBeNull()
    const before = model.getSnapshot().draft
    const form = { ...accountFormFromDraft(before, { kind: 'inherited-ira', ownerIndex: 0 }), valueToday: 50_000 }
    const res = buildAccountEdit(before, 'new', form, { ...form, inherited: { ...form.inherited, treatment: { value: 'roth', key: '' } } })
    expect(res).toEqual({ ok: false, fields: { treatment: copy.inheritedRefuseRoth } })
  })

  it('a Save with any answer blank is refused, naming each blank question, and writes nothing', () => {
    const { model } = profileStore(seed)
    const res = saveNew(model, 'inherited-ira', { valueToday: 50_000, legs: { stock: '60', bond: '40', cash: '0' } })
    expect(res.saved).toBe(false)
    if (res.saved) return
    expect(res.check.fields.treatment).toBe(copy.errInheritedAnswerRequired)
    expect(res.check.fields.leftTo).toBe(copy.errInheritedAnswerRequired)
    expect(model.getSnapshot().draft).toBe(seed)
  })

  it('every question answered on the served side saves the account with the facts the walk built', () => {
    const { model } = profileStore(seed)
    const y = seed.startCalendarYear
    const k = (value: string, key = '') => ({ value, key })
    const res = saveNew(model, 'inherited-ira', {
      valueToday: 80_000,
      legs: { stock: '60', bond: '40', cash: '0' },
      inherited: {
        treatment: k('traditional'), fromSpouse: k('no', '0'), heldAtDeath: k('own-ira'), ownerInherited: k('no'),
        ownerBirthYear: 1945, ownerDeathYear: 2024, disabledAtDeath: k('no', '0'), childUnder21AtDeath: k('no', '0'),
        decemberBalance: 80_000, hasCustodianFigure: k('no'), sharedUnsplit: k('no', '2024'), takenThisYear: 0,
        // A 2024 death after the date: 2025's minimum and the death-year deadline are asked, keyed by the owner's dates.
        minimumsTaken: k('yes', '1945||2024||2025-2025'), deathYearTakenInTime: k('yes', '1945||2024|'), earlier: {}, leftTo: k('other-member', '0'),
      } as never,
    })
    expect(res, JSON.stringify(res)).toMatchObject({ saved: true })
    const added = model.getSnapshot().draft.enteredAccounts.at(-1)!
    expect(added.kind).toBe('inherited-ira')
    expect(added.inherited).toMatchObject({ ownerBirthYear: 1945, ownerDeathYear: 2024, askedYear: y, askedFigure: { kind: 'computed', decemberBalance: 80_000 }, leftTo: 'other-member', pace: { kind: 'law-minimum' } })
    expect(added).not.toHaveProperty('annualContribution')
  })
})
