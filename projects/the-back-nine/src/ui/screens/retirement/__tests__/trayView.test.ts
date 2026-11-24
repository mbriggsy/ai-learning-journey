import { describe, expect, it } from 'vitest'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import type { WhatIfLeverV6 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { planClockAnchor } from '../../../bandAnnotations'
import { railOffers, stopWords } from '../../../workbench/railChrome'
import { composeRothOmissionsNote } from '../../../stateTaxDisclosure'
import { acaPricedForRun, healthcarePriced, medicareOnlyPriced, pricedStateForRun } from '@intake/intakeMap'
import {
  acaCommit,
  claimCommit,
  depositCommit,
  employerCommit,
  lineCommit,
  mixCommit,
  moveBucket,
  orderCommit,
  rothCommit,
  rothNotes,
  stopCommit,
  totalCommit,
  trayApply,
  trayView,
  withoutHidden,
  type TrayInput,
  type TrayRowView,
} from '../trayView'

/**
 * The Action Items tray's composer (plan 6, RC4, "The Action Items tray"): which rows show in which column group, the
 * compared values, the changed marks, how a typed value becomes a lever, the pending bundle's refusal by name, and
 * Apply's face. Everything U15's tests proved about the levers carries over here: deposits checked by the family-wide
 * rule (`applyBundle`'s `validateDraft`), the employer figure asked again on a lowered deposit, refusals by name, the
 * stop-year words for two earners, no lean words.
 */

const dip = DEV_SEEDS.dip
const retired = DEV_SEEDS.retired
const ANCHOR = planClockAnchor(dip.startCalendarYear, dip.startCalendarYear)

function input(draft: ScenarioDraft, over: Partial<TrayInput> = {}): TrayInput {
  const planStop = draft.people.some((p) => p.workStatus === 'working') ? draft.startCalendarYear + 5 : undefined
  return {
    draft,
    offers: railOffers(draft, planStop),
    pending: [],
    committed: [],
    hidden: new Set(),
    awaitingEmployer: new Map(),
    anchor: planClockAnchor(draft.startCalendarYear, draft.startCalendarYear),
    ...over,
  }
}
const rowsOf = (v: ReturnType<typeof trayView>): TrayRowView[] => [...v.left, ...v.right].flatMap((s) => s.rows)
const row = (v: ReturnType<typeof trayView>, id: string) => rowsOf(v).find((r) => r.id === id)

describe('the column groups (ref 2.8’s table)', () => {
  it('a working household: Financial goals, Savings, Expenses on the left; Strategies on the right; the stop year offers the window only', () => {
    const v = trayView(input(dip))
    expect(v.left.map((s) => s.title)).toEqual([copy.traySectionGoals, copy.traySectionSavings, copy.traySectionExpenses])
    expect(v.right.map((s) => s.title)).toEqual([copy.traySectionStrategies])
    const stop = row(v, 'stop-year')!
    expect(stop.control).toMatchObject({ kind: 'stop', value: dip.startCalendarYear + 5, min: dip.startCalendarYear, max: dip.startCalendarYear + DATE_OFFSET_WINDOW_TOP })
    expect(stop.compared).toBe(String(dip.startCalendarYear + 5))
    // Two earners: "both of you" stop together (KTD15), and the stop year can be tried, never applied.
    expect(stop.notes).toEqual([stopWords(dip, railOffers(dip, dip.startCalendarYear + 5).stop!.working, dip.startCalendarYear + 5), copy.workbenchRailStopNote])
    // What a deposit change means rides the Savings group.
    expect(v.left.find((s) => s.id === 'savings')!.notes).toEqual([copy.workbenchRailDepositsSpent])
  })

  it('an all-retired household: no stop year and no deposits, so the left holds Expenses alone', () => {
    const v = trayView(input(retired))
    expect(v.left.map((s) => s.id)).toEqual(['expenses'])
    expect(row(v, 'stop-year')).toBeUndefined()
    expect(rowsOf(v).some((r) => r.lever === 'deposits')).toBe(false)
  })

  it('Social Security: its own row, then one indented row per person not yet claimed, by name, each compared as an age', () => {
    const v = trayView(input(dip))
    const group = row(v, 'claim-age')!
    expect(group).toMatchObject({ label: copy.traySocialSecurity, control: { kind: 'group' }, compared: '' })
    const claims = rowsOf(v).filter((r) => r.lever === 'claim-age' && r.control.kind === 'claim')
    expect(claims.length).toBe(railOffers(dip, dip.startCalendarYear + 5).claims.length)
    for (const c of claims) {
      expect(c.indent).toBe(true)
      expect(c.compared).toMatch(/^Age \d+$/)
    }
  })

  it('a budget household’s expenses are its lines by id, and can take a new line; one without has the one figure', () => {
    const budgeted = Object.values(DEV_SEEDS).find((d) => (d.budget ?? []).some((l) => l.id !== undefined))!
    const v = trayView(input(budgeted))
    expect(v.canAddLine).toBe(true)
    expect(rowsOf(v).filter((r) => r.control.kind === 'line').length).toBe(budgeted.budget!.filter((l) => l.id !== undefined).length)
    const plain = trayView(input(retired))
    expect(plain.canAddLine).toBe(false)
    expect(row(plain, 'spending:total')!.compared).toBe(slots.trayDollars(retired.annualSpendingReal!.toLocaleString('en-US')))
  })
})

describe('pending until Refresh: the changed marks and the pending compare', () => {
  it('a row is changed only while the PENDING bundle holds its lever; pending and committed differing is Refresh’s work', () => {
    const lever: WhatIfLeverV6 = { kind: 'spending', op: 'total', annualSpendingReal: 60_000 }
    const before = trayView(input(retired))
    expect(row(before, 'spending:total')!.changed).toBe(false)
    expect(before.pendingDiffers).toBe(false)
    const after = trayView(input(retired, { pending: [lever] }))
    expect(row(after, 'spending:total')!.changed).toBe(true)
    expect(row(after, 'spending:total')!.control).toMatchObject({ kind: 'total', value: 60_000 })
    expect(after.pendingDiffers).toBe(true)
    expect(trayView(input(retired, { pending: [lever], committed: [lever] })).pendingDiffers).toBe(false)
  })

  it('a value put back to the plan’s own is no lever at all (no lever that changes nothing is held)', () => {
    expect(totalCommit(80_000, 80_000)).toBeNull()
    expect(totalCommit(80_000, undefined)).toBeNull()
    expect(totalCommit(80_000, 60_000)).toEqual({ kind: 'spending', op: 'total', annualSpendingReal: 60_000 })
    expect(stopCommit(2031, 2031)).toBeNull()
    expect(stopCommit(2031, 2033)).toEqual({ kind: 'stop-year', calendarYear: 2033 })
    expect(acaCommit(false, false)).toBeNull()
    expect(acaCommit(false, true)).toEqual({ kind: 'aca-subsidy', enhanced: true })
    const line = { id: 'l1', category: 'travel', label: 'Trips', annualAmountReal: 9_000, tier: 'discretionary', startYear: 0 } as const
    expect(lineCommit(line, { ...line })).toBeNull()
    expect(lineCommit(line, { ...line, annualAmountReal: 5_000 })).toEqual({ kind: 'spending', op: 'replace', line: { ...line, annualAmountReal: 5_000 } })
  })

  it('a row the Edit drawer hides is gone from the tray and its lever leaves the pending bundle (it goes back to the plan)', () => {
    const levers: WhatIfLeverV6[] = [
      { kind: 'aca-subsidy', enhanced: true },
      { kind: 'claim-age', personIndex: 0, claimAge: 70 },
      { kind: 'mix', stockPct: 60, bondPct: 30, cashPct: 10 },
    ]
    expect(withoutHidden(levers, new Set(['claim-age', 'mix']))).toEqual([{ kind: 'aca-subsidy', enhanced: true }])
    expect(row(trayView(input(dip, { hidden: new Set(['mix']) })), 'mix')).toBeUndefined()
    // The checklist still names it, so it can be shown again.
    expect(trayView(input(dip, { hidden: new Set(['mix']) })).editSections.flatMap((s) => s.items.map((i) => i.id))).toContain('mix')
  })
})

describe('deposits (D7; the plan’s U15): the employer figure at a lower deposit', () => {
  const offers = railOffers(dip, dip.startCalendarYear + 5)
  const withEmployer = offers.deposits.find((d) => d.employer !== undefined)!

  it('[test setup] the working seed has an account carrying an employer dollar', () => {
    expect(withEmployer).toBeDefined()
    expect(withEmployer.planDeposit).toBeGreaterThan(1_000)
  })

  it('lowering the own deposit sends nothing and waits for the employer’s figure; the sub-row asks for it, blank', () => {
    const lowered = withEmployer.planDeposit - 1_000
    const out = depositCommit(withEmployer, undefined, lowered)
    expect(out).toEqual({ lever: null, awaiting: lowered })
    const v = trayView(input(dip, { awaitingEmployer: new Map([[withEmployer.accountId, lowered]]) }))
    const employer = row(v, `deposits:${withEmployer.accountId}:employer`)!
    expect(employer.control).toMatchObject({ kind: 'employer', value: undefined, deposit: lowered })
    expect(employer.notes).toEqual([copy.workbenchRailEmployerWaiting])
    expect(row(v, `deposits:${withEmployer.accountId}`)!.changed).toBe(true)
    // The figure given: the lever, whole, carrying both.
    const lever = employerCommit(withEmployer, lowered, 500)!
    expect(lever).toMatchObject({ kind: 'deposits', accountId: withEmployer.accountId, annualContribution: lowered, [withEmployer.employer!.field]: 500 })
    // Lowered again, a lever already holding a figure keeps it.
    expect(depositCommit(withEmployer, lever, lowered - 500).lever).toMatchObject({ annualContribution: lowered - 500, [withEmployer.employer!.field]: 500 })
  })

  it('raising it asks nothing: the plan’s employer figure stands, and no sub-row shows', () => {
    const out = depositCommit(withEmployer, undefined, withEmployer.planDeposit + 1_000)
    expect(out.awaiting).toBeUndefined()
    expect(out.lever).toEqual({ kind: 'deposits', accountId: withEmployer.accountId, annualContribution: withEmployer.planDeposit + 1_000 })
    const v = trayView(input(dip, { pending: [out.lever!] }))
    expect(row(v, `deposits:${withEmployer.accountId}:employer`)).toBeUndefined()
  })

  it('deposits over the family-wide yearly ceiling are refused by name before any Refresh (the writers’ own check)', () => {
    const over: WhatIfLeverV6 = { kind: 'deposits', accountId: withEmployer.accountId, annualContribution: 500_000, [withEmployer.employer!.field]: withEmployer.employer!.plan }
    const v = trayView(input(dip, { pending: [over] }))
    expect(v.refusal).toBe(copy.workbenchRailRefusedOverLimit)
  })
})

describe('the other levers’ commits', () => {
  it('a claim age outside the window is refused with words; the plan’s own age is no lever', () => {
    const claim = railOffers(dip, dip.startCalendarYear + 5).claims[0]!
    const from = Math.max(62, claim.currentAge)
    expect(claimCommit(claim, from - 1)).toEqual({ error: slots.workbenchRailClaimRange(from) })
    expect(claimCommit(claim, 71)).toEqual({ error: slots.workbenchRailClaimRange(from) })
    expect(claimCommit(claim, claim.planAge)).toEqual({ lever: null })
    const other = claim.planAge === 70 ? 69 : 70
    expect(claimCommit(claim, other)).toEqual({ lever: { kind: 'claim-age', personIndex: claim.personIndex, claimAge: other } })
  })

  it('the withdrawal order: the plan’s own policy is no lever; a custom order moves one bucket a step', () => {
    const offer = { policy: 'proportional' as const, order: undefined }
    expect(orderCommit(offer, 'proportional', ['taxable', 'pretax', 'roth'])).toBeNull()
    expect(orderCommit(offer, 'pre-tax-first', ['taxable', 'pretax', 'roth'])).toEqual({ kind: 'withdrawal-order', policy: 'pre-tax-first' })
    expect(moveBucket(['taxable', 'pretax', 'roth'], 'roth', -1)).toEqual(['taxable', 'roth', 'pretax'])
    expect(moveBucket(['taxable', 'pretax', 'roth'], 'taxable', -1)).toEqual(['taxable', 'pretax', 'roth'])
    expect(orderCommit(offer, 'custom', ['roth', 'taxable', 'pretax'])).toEqual({ kind: 'withdrawal-order', policy: 'custom', drawdownOrder: ['roth', 'taxable', 'pretax'] })
  })

  it('the mix: a lever only when all three parts are typed and add to 100, words otherwise', () => {
    expect(mixCommit({ stock: 60 })).toEqual({})
    expect(mixCommit({ stock: 60, bond: 30, cash: 5 })).toEqual({ error: slots.workbenchRailMixSum('95') })
    expect(mixCommit({ stock: 60, bond: 30, cash: 10 })).toEqual({ lever: { kind: 'mix', stockPct: 60, bondPct: 30, cashPct: 10 } })
  })

  it('Roth conversions: none, or a plan whole in all three fields; a missing field and a passed first year each wait with words', () => {
    const start = dip.startCalendarYear
    expect(rothCommit(undefined, 'none', {}, start, ANCHOR, start)).toEqual({ kind: 'lever', lever: null })
    expect(rothCommit({ annualAmountReal: 1, startYearOffset: 0, years: 1 }, 'none', {}, start, ANCHOR, start)).toEqual({ kind: 'lever', lever: { kind: 'roth', conversion: { kind: 'none' } } })
    expect(rothCommit(undefined, 'amount', { startYear: start, years: 5 }, start, ANCHOR, start)).toEqual({ kind: 'wait', words: copy.trayRothNeedsAmount })
    expect(rothCommit(undefined, 'amount', { amount: 20_000, years: 5 }, start, ANCHOR, start)).toEqual({ kind: 'wait', words: copy.trayRothNeedsStart })
    expect(rothCommit(undefined, 'amount', { amount: 20_000, startYear: start }, start, ANCHOR, start)).toEqual({ kind: 'wait', words: copy.trayRothNeedsYears })
    // A plan opened two years after it was built: the build year has passed (the ONE plan-clock producer decides).
    const aged = planClockAnchor(start, start + 2)
    expect(rothCommit(undefined, 'amount', { amount: 20_000, startYear: start + 1, years: 5 }, start, aged, start + 2)).toEqual({ kind: 'wait', words: slots.workbenchRailRothStartPast(start + 2) })
    expect(rothCommit(undefined, 'amount', { amount: 20_000, startYear: start + 2, years: 5 }, start, aged, start + 2)).toEqual({
      kind: 'lever',
      lever: { kind: 'roth', conversion: { kind: 'plan', plan: { annualAmountReal: 20_000, startYearOffset: 2, years: 5 } } },
    })
  })
})

describe('the Roth row’s honesty lines (the deleted Roth sheet’s, ported with their surface: plan 5.2)', () => {
  const plan = { annualAmountReal: 20_000, startYearOffset: 1, years: 5 }
  const rothRow = (v: ReturnType<typeof trayView>) => row(v, 'roth')!

  it('[test setup] the retired seed is offered the Roth row and holds no conversion of its own', () => {
    expect(railOffers(retired, undefined).roth).toEqual({ plan: undefined })
  })

  it('a what-if holding a conversion plan carries the funding note and the omissions note, through the sheet’s own composer', () => {
    const notes = rothRow(trayView(input(retired, { pending: [{ kind: 'roth', conversion: { kind: 'plan', plan } }] }))).notes
    expect(notes).toEqual(rothNotes(retired, undefined))
    expect(notes).toContain(copy.rothFundingNote)
    expect(notes).toContain(composeRothOmissionsNote(pricedStateForRun(retired) !== undefined, medicareOnlyPriced(retired), acaPricedForRun(retired, undefined)))
  })

  it('no plan in either column (the row on None): no Roth lines at all', () => {
    expect(rothRow(trayView(input(retired))).notes).toEqual([])
    expect(rothRow(trayView(input(retired, { pending: [{ kind: 'roth', conversion: { kind: 'none' } }] }))).notes).toEqual([])
  })

  it('the plan’s own conversion keeps the lines even while the what-if tries none (its column still holds a plan)', () => {
    const converting: ScenarioDraft = { ...retired, rothConversion: plan }
    expect(rothRow(trayView(input(converting, { pending: [{ kind: 'roth', conversion: { kind: 'none' } }] }))).notes).toEqual(rothNotes(converting, undefined))
  })

  it('the Medicare residual rides only where no health door is reached (the sheet’s own gate), and some seed carries it', () => {
    const seeds = Object.values(DEV_SEEDS)
    const carrying = seeds.filter((d) => rothNotes(d, undefined).includes(copy.rothMedicareResidualNote))
    expect(carrying.length, 'non-vacuity: a seed whose run priced Medicare with no health door').toBeGreaterThan(0)
    for (const d of seeds.filter((x) => healthcarePriced(x))) expect(rothNotes(d, undefined)).not.toContain(copy.rothMedicareResidualNote)
  })
})

describe('the pending bundle’s refusals, by name', () => {
  it('a stop year outside the window, a spending total on a budget household, a line already gone: each in its own words', () => {
    const outside: WhatIfLeverV6 = { kind: 'stop-year', calendarYear: dip.startCalendarYear + DATE_OFFSET_WINDOW_TOP + 3 }
    expect(trayView(input(dip, { pending: [outside] })).refusal).toBe(slots.workbenchRailRefusedStopWindow(dip.startCalendarYear, dip.startCalendarYear + DATE_OFFSET_WINDOW_TOP))
    const budgeted = Object.values(DEV_SEEDS).find((d) => (d.budget ?? []).some((l) => l.id !== undefined))!
    expect(trayView(input(budgeted, { pending: [{ kind: 'spending', op: 'total', annualSpendingReal: 1 }] })).refusal).toBe(copy.workbenchRailRefusedTotalOnBudget)
    expect(trayView(input(budgeted, { pending: [{ kind: 'spending', op: 'remove', lineId: 'no-such-line' }] })).refusal).toBe(copy.workbenchRailRefusedLineGone)
    expect(trayView(input(dip)).refusal).toBeUndefined()
  })
})

describe('Apply’s face', () => {
  const spend: WhatIfLeverV6 = { kind: 'spending', op: 'total', annualSpendingReal: 60_000 }
  const stop: WhatIfLeverV6 = { kind: 'stop-year', calendarYear: dip.startCalendarYear + 7 }
  const mix: WhatIfLeverV6 = { kind: 'mix', stockPct: 50, bondPct: 50, cashPct: 0 }

  it('a read-only tab has no Apply, only its words', () => {
    expect(trayApply({ draft: retired, committed: [spend], pendingDiffers: false, current: true, readOnly: true })).toEqual({ kind: 'hidden', words: copy.workbenchRailApplyReadOnly })
  })

  it('withheld for a stop year, the mix, or both, with each reason; waiting while the tray holds changes not yet run', () => {
    expect(trayApply({ draft: dip, committed: [stop], pendingDiffers: false, current: true, readOnly: false })).toEqual({ kind: 'shut', words: copy.workbenchRailApplyWithheldStop })
    expect(trayApply({ draft: dip, committed: [mix], pendingDiffers: false, current: true, readOnly: false })).toEqual({ kind: 'shut', words: copy.workbenchRailApplyWithheldMix })
    expect(trayApply({ draft: dip, committed: [stop, mix], pendingDiffers: false, current: true, readOnly: false })).toEqual({ kind: 'shut', words: copy.workbenchRailApplyWithheldBoth })
    expect(trayApply({ draft: retired, committed: [spend], pendingDiffers: true, current: true, readOnly: false })).toEqual({ kind: 'shut', words: copy.trayApplyRefreshFirst })
    expect(trayApply({ draft: retired, committed: [spend], pendingDiffers: false, current: false, readOnly: false })).toEqual({ kind: 'shut', words: copy.workbenchRailApplyWaiting })
    expect(trayApply({ draft: retired, committed: [], pendingDiffers: false, current: true, readOnly: false })).toEqual({ kind: 'shut' })
    expect(trayApply({ draft: retired, committed: [spend], pendingDiffers: false, current: true, readOnly: false })).toEqual({ kind: 'open' })
  })

  it('a spending what-if on a confirmed working-year cost says the cost must be confirmed again', () => {
    const draft = DEV_SEEDS.datesaved
    const lever: WhatIfLeverV6 =
      draft.budget !== undefined
        ? (() => {
            const line = draft.budget.find((x) => x.id !== undefined)!
            return { kind: 'spending', op: 'replace', line: { ...line, id: line.id!, annualAmountReal: line.annualAmountReal - 6_000 } }
          })()
        : { kind: 'spending', op: 'total', annualSpendingReal: (draft.annualSpendingReal ?? 0) - 6_000 }
    expect(trayApply({ draft, committed: [lever], pendingDiffers: false, current: true, readOnly: false })).toEqual({ kind: 'open', words: copy.workbenchRailApplyLeftOver })
  })
})

describe('the tray’s words never lean (R20)', () => {
  const LEAN = [/\bhelps? you\b/i, /\bcosts? you\b/i, /\bbetter\b/i, /\bworse\b/i, /\bsafer\b/i]
  it('no row label, compared value, note or section note on any seed leans (the Roth sheet’s ported disclosures aside)', () => {
    for (const draft of Object.values(DEV_SEEDS)) {
      const v = trayView(input(draft))
      // The Roth row's lines are the deleted sheet's disclosures, ported verbatim and swept by copyGuard's own roth*
      // gates: the funding note says which way a modelling choice leans ("could make converting look a little better
      // than shown"), a disclosure, never the tray's word on a lever.
      const ported = new Set(rothNotes(draft, undefined))
      const texts = [...v.left, ...v.right].flatMap((s) => [s.title, ...s.notes, ...s.rows.flatMap((r) => [r.label, r.compared, ...r.notes.filter((n) => !ported.has(n))])])
      for (const t of texts) expect(LEAN.some((re) => re.test(t)), t).toBe(false)
    }
  })
})
