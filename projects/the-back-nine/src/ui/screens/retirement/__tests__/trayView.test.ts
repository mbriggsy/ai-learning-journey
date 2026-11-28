import { describe, expect, it } from 'vitest'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import type { WhatIfLeverV6 } from '@shared/model'
import { applyBundle } from '@intake/whatIf'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy, slots } from '../../../copy'
import { planClockAnchor } from '../../../bandAnnotations'
import { leverTarget, railOffers, stopWords, withLever } from '../../../workbench/railChrome'
import { composeRothOmissionsNote } from '../../../stateTaxDisclosure'
import { acaPricedForRun, draftPretaxTotal, healthcarePriced, medicareOnlyPriced, pricedStateForRun } from '@intake/intakeMap'
import {
  acaCommit,
  claimCommit,
  depositCommit,
  employerCommit,
  lineAmountLine,
  lineCommit,
  addedLineWords,
  drawerLine,
  mixCommit,
  moveBucket,
  orderCommit,
  paceCommit,
  rothCommit,
  rothNotes,
  stopCommit,
  totalCommit,
  trayApply,
  trayView,
  withoutHidden,
  awaitingWithoutHidden,
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

describe('a line that repeats or changes at its own rate, carried (gap 4’s U9; the tray offers neither)', () => {
  const car = { id: 'line-car', category: 'transportation', label: 'A new car', annualAmountReal: 40_000, tier: 'essentials', startYear: 0, everyYears: 5 } as const

  it('a repeat line’s row compares "$40,000 every 5 years", never "a year"; a line without one compares its dollars', () => {
    const v = trayView(input(DEV_SEEDS.daterepeat))
    expect(row(v, 'spending:line:line-car')!.compared).toBe(slots.trayLineEvery('40,000', 5))
    expect(slots.trayLineEvery('40,000', 5)).toBe('$40,000 every\u00a05\u00a0years') // "every 5 years" held on one line
    expect(row(v, 'spending:line:line-food')!.compared).toBe(slots.trayDollars('16,000'))
  })

  it('a tray edit of a line keeps its repeat and rate: the replace carries both, and a change to them alone is no change', () => {
    const rated = { ...car, growthRate: 0.03 }
    expect(lineCommit(rated, { ...rated, annualAmountReal: 45_000 })).toEqual({ kind: 'spending', op: 'replace', line: { ...rated, annualAmountReal: 45_000 } })
    expect(lineCommit(rated, { ...rated })).toBeNull()
    // KTD13: `sameLine` compares only what the tray can edit, so a repeat or rate that differs alone is no change (the
    // review of gap 4's line half: the arm above compared two identical lines and pinned nothing).
    expect(lineCommit(rated, { ...rated, growthRate: 0.07, everyYears: 3 })).toBeNull()
    expect(lineCommit({ ...car, growthRate: 0 }, car)).toBeNull()
  })

  it('an amount typed in the row takes the plan line’s repeat, and its start where it repeats; the rest is the shown line’s (gap 4’s leftover (b))', () => {
    const live = { ...car, everyYears: 4, startYear: 1 }
    const kept = { ...car, growthRate: 0.03, tier: 'discretionary' as const, startYear: 3, endYear: 20 }
    expect(lineAmountLine(live, kept, 35_000)).toEqual({ ...kept, everyYears: 4, startYear: 1, annualAmountReal: 35_000 })
    // A plan line that no longer repeats: the repeat goes, and the stored window stays (gap 2's stale window, phase moot).
    const { everyYears: _gone, ...flat } = live
    const got = lineAmountLine(flat, kept, 35_000)
    expect('everyYears' in got).toBe(false)
    expect(got.startYear).toBe(3)
    expect(got.endYear).toBe(20)
    // A plan line that never repeated, under a replace that never did: only the amount moves.
    const { everyYears: _none, ...plain } = car
    expect(lineAmountLine(plain, { ...plain, startYear: 2 }, 9_000)).toEqual({ ...plain, startYear: 2, annualAmountReal: 9_000 })
  })

  it('an added line that repeats reads "$40,000 every 5 years" on its row too; one without reads "a year"', () => {
    const v = trayView(input(dip, { pending: [{ kind: 'spending', op: 'add', line: car }] }))
    expect(row(v, 'spending:line:line-car')!.control).toMatchObject({ kind: 'added', line: car })
    expect(addedLineWords(car)).toBe(slots.trayLineEvery('40,000', 5))
    const { everyYears: _e, ...yearly } = car
    expect(addedLineWords(yearly)).toBe(slots.workbenchRailPerYear('40,000'))
  })

  it('the line drawer’s Save keeps an edited line’s repeat, rate and category; a blank Through year drops its key; a new line is "other" with no extra key', () => {
    const edited = { ...car, endYear: 20, growthRate: 0.03 }
    expect(drawerLine(edited, 'line-car', { label: 'A new car', amount: 45_000, tier: 'essentials', startYear: 1 })).toEqual({
      id: 'line-car', category: 'transportation', label: 'A new car', annualAmountReal: 45_000, tier: 'essentials', startYear: 1, everyYears: 5, growthRate: 0.03,
    })
    expect(drawerLine(edited, 'line-car', { label: 'A new car', amount: 45_000, tier: 'essentials', startYear: 1, endYear: 25 }).endYear).toBe(25)
    const fresh = drawerLine(undefined, 'line-new', { label: 'Boat', amount: 9_000, tier: 'discretionary', startYear: 0 })
    expect(fresh).toEqual({ id: 'line-new', category: 'other', label: 'Boat', annualAmountReal: 9_000, tier: 'discretionary', startYear: 0 })
    expect(Object.keys(fresh)).toEqual(['id', 'category', 'label', 'annualAmountReal', 'tier', 'startYear'])
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

  it('hiding a lowered deposit’s row drops its wait for the employer’s figure (it would hold the what-if with nothing on screen); other waits stay', () => {
    const awaiting = new Map([
      ['acct-a', 6_000],
      ['acct-b', 4_000],
    ])
    expect([...awaitingWithoutHidden(awaiting, new Set(['deposits:acct-a', 'mix']))]).toEqual([['acct-b', 4_000]])
    // Nothing it holds was hidden: the same map back (no needless write).
    expect(awaitingWithoutHidden(awaiting, new Set(['mix']))).toBe(awaiting)
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
    expect(employer.notes, 'its waiting words are the row’s held words, drawn by the tray').toEqual([])
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

  it('the mix: a lever only when all three parts are typed, each 0 to 100, and add to 100, words otherwise', () => {
    expect(mixCommit({}, false), 'nothing typed and no lever held: no choice at all').toEqual({})
    expect(mixCommit({ stock: 60 }, false)).toEqual({ error: copy.workbenchRailMixNeedsAll })
    // A part cleared beside an earlier mix lever waits with words, so Refresh and Apply never run that lever under it.
    expect(mixCommit({ stock: 60, bond: 30 }, true)).toEqual({ error: copy.workbenchRailMixNeedsAll })
    expect(mixCommit({}, true)).toEqual({ error: copy.workbenchRailMixNeedsAll })
    expect(mixCommit({ stock: 120, bond: 0, cash: 0 }, false), 'a part over 100 is refused in words, never blanked').toEqual({ error: copy.workbenchRailMixPartRange })
    expect(mixCommit({ stock: 60, bond: 30, cash: 5 }, false)).toEqual({ error: slots.workbenchRailMixSum('95') })
    expect(mixCommit({ stock: 60, bond: 30, cash: 10 }, true)).toEqual({ lever: { kind: 'mix', stockPct: 60, bondPct: 30, cashPct: 10 } })
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

describe('an inherited IRA is never pre-tax money to the tray (the Act 5 plan’s U13, R24)', () => {
  it('a household whose only pre-tax money is inherited gets no Roth row and no “Pre-tax first” order', () => {
    const inherited = DEV_SEEDS.inherited.enteredAccounts.find((a) => a.kind === 'inherited-ira')!
    const d: ScenarioDraft = { ...DEV_SEEDS.steer, enteredAccounts: [...DEV_SEEDS.steer.enteredAccounts, { ...inherited, ownerIndex: 0 }] }
    expect(draftPretaxTotal(DEV_SEEDS.steer), '[test setup] the steer household holds no pre-tax money of its own').toBe(0)
    expect(draftPretaxTotal(d)).toBe(0)
    expect(railOffers(d, undefined).roth).toBeUndefined()
    const order = row(trayView(input(d)), 'withdrawal-order')
    expect(order, '[test setup] the order row is drawn').toBeDefined()
    expect(order!.control.kind === 'order' && order!.control.offered).not.toContain('pre-tax-first')
  })
})

describe('the inherited-IRA pace (U17, KTD21)', () => {
  const inh = DEV_SEEDS.inherited
  const A = 'acct-0-inherited-ira-2023' // the plan's pace: only what the law requires; the law empties it in 2033
  const B = 'acct-0-inherited-ira-2021' // the plan's pace: even amounts; the law empties it in 2031
  const offerOf = (id: string) => railOffers(inh, undefined).paces.find((p) => p.accountId === id)!

  it('Strategies holds the pace group over one indented row per inherited IRA, named by its account, after the withdrawal order', () => {
    const v = trayView(input(inh))
    const ids = v.right[0]!.rows.map((r) => r.id)
    expect(ids.slice(ids.indexOf('withdrawal-order') + 1, ids.indexOf('withdrawal-order') + 4)).toEqual(['inherited-pace', `inherited-pace:${A}`, `inherited-pace:${B}`])
    expect(row(v, 'inherited-pace')).toMatchObject({ label: copy.trayPaceTitle, control: { kind: 'group' }, notes: [copy.trayPaceNote] })
    expect(row(v, `inherited-pace:${A}`)).toMatchObject({ label: 'Alex’s IRA inherited in 2023', compared: copy.trayPaceLawMinimum, indent: true, changed: false })
    expect(row(v, `inherited-pace:${B}`)).toMatchObject({ label: 'Alex’s IRA inherited in 2021', compared: slots.trayPaceEven(2031), indent: true })
    expect(v.editSections.find((s) => s.title === copy.traySectionStrategies)!.items.map((i) => i.id)).toContain('inherited-pace')
    // No inherited IRA, no pace row.
    expect(rowsOf(trayView(input(retired))).some((r) => r.lever === 'inherited-pace')).toBe(false)
  })

  it('an account the law empties in its asked year takes everything whatever the pace, so it offers no row', () => {
    const lastYear = inh.enteredAccounts.map((a) => (a.id === A && a.inherited !== undefined ? { ...a, inherited: { ...a.inherited, askedYear: 2033 } } : a))
    expect(railOffers({ ...inh, enteredAccounts: lastYear }, undefined).paces.map((p) => p.accountId)).toEqual([B])
  })

  /** The pace's year checks on a fresh plan: built this year, opened this year. */
  const FRESH = [inh.startCalendarYear, planClockAnchor(inh.startCalendarYear, inh.startCalendarYear), inh.startCalendarYear] as const
  it('a rule picked: the plan’s own is no lever; another is the lever on that account alone', () => {
    expect(paceCommit(offerOf(A), 'law-minimum', undefined, ...FRESH)).toEqual({ kind: 'lever', lever: null })
    expect(paceCommit(offerOf(B), 'even', undefined, ...FRESH)).toEqual({ kind: 'lever', lever: null })
    expect(paceCommit(offerOf(A), 'even', undefined, ...FRESH)).toEqual({ kind: 'lever', lever: { kind: 'inherited-pace', accountId: A, pace: { kind: 'even' } } })
    expect(paceCommit(offerOf(B), 'law-minimum', undefined, ...FRESH)).toEqual({ kind: 'lever', lever: { kind: 'inherited-pace', accountId: B, pace: { kind: 'law-minimum' } } })
  })

  it('"ending in a chosen year" waits for a year, and refuses in words a year outside the asked year to the law’s last, before any run', () => {
    const a = offerOf(A)
    expect([a.firstYear, a.lastYear]).toEqual([inh.startCalendarYear, 2033])
    expect(paceCommit(a, 'even-to-year', undefined, ...FRESH)).toEqual({ kind: 'wait', words: slots.trayPaceNeedsYear(a.firstYear, 2033) })
    for (const year of [2034, a.firstYear - 1, 2029.5]) {
      expect(paceCommit(a, 'even-to-year', year, ...FRESH), String(year)).toEqual({ kind: 'wait', words: slots.trayPaceYearRange(a.firstYear, 2033) })
    }
    // The ends are in: the asked year and the law's last year.
    for (const year of [a.firstYear, 2033]) {
      expect(paceCommit(a, 'even-to-year', year, ...FRESH)).toEqual({ kind: 'lever', lever: { kind: 'inherited-pace', accountId: A, pace: { kind: 'even-to-year', lastYear: year } } })
    }
    // The same bounds as the writer's own (`applyBundle`): what the tray lets through, the writer runs.
    const ok = paceCommit(a, 'even-to-year', 2033, ...FRESH)
    if (ok.kind !== 'lever' || ok.lever === null) throw new Error('[test setup]')
    expect(applyBundle(inh, [ok.lever]).ok).toBe(true)
    expect(applyBundle(inh, [{ kind: 'inherited-pace', accountId: A, pace: { kind: 'even-to-year', lastYear: 2034 } }])).toMatchObject({ ok: false, refusal: { kind: 'pace-year-outside' } })
  })

  it('on a plan opened a year after it was built, a last year already gone is refused in words before any run', () => {
    const a = offerOf(A)
    const aged = [inh.startCalendarYear, planClockAnchor(inh.startCalendarYear, inh.startCalendarYear + 1), inh.startCalendarYear + 1] as const
    expect(paceCommit(a, 'even-to-year', a.firstYear, ...aged)).toEqual({ kind: 'wait', words: slots.trayPaceYearPast(inh.startCalendarYear + 1) })
    expect(paceCommit(a, 'even-to-year', a.firstYear + 1, ...aged)).toMatchObject({ kind: 'lever' })
    // The waiting and range words start at this year, never naming the gone asked year the row would then refuse.
    expect(paceCommit(a, 'even-to-year', undefined, ...aged)).toEqual({ kind: 'wait', words: slots.trayPaceNeedsYear(inh.startCalendarYear + 1, 2033) })
    expect(paceCommit(a, 'even-to-year', 2034, ...aged)).toEqual({ kind: 'wait', words: slots.trayPaceYearRange(inh.startCalendarYear + 1, 2033) })
  })

  it('two accounts’ pace levers hold two targets: pulling one leaves the other', () => {
    const onA: WhatIfLeverV6 = { kind: 'inherited-pace', accountId: A, pace: { kind: 'even' } }
    const onB: WhatIfLeverV6 = { kind: 'inherited-pace', accountId: B, pace: { kind: 'law-minimum' } }
    expect(leverTarget(onA)).not.toBe(leverTarget(onB))
    const both = withLever(withLever([], leverTarget(onA), onA), leverTarget(onB), onB)
    expect(both).toEqual([onA, onB])
    const v = trayView(input(inh, { pending: both }))
    expect([row(v, `inherited-pace:${A}`)!.changed, row(v, `inherited-pace:${B}`)!.changed]).toEqual([true, true])
    expect(row(v, `inherited-pace:${A}`)!.control).toMatchObject({ value: { kind: 'even' } })
    const pulled = withLever(both, leverTarget(onA), null)
    expect(pulled).toEqual([onB])
    const after = trayView(input(inh, { pending: pulled }))
    expect([row(after, `inherited-pace:${A}`)!.changed, row(after, `inherited-pace:${B}`)!.changed]).toEqual([false, true])
  })

  it('the Edit drawer hiding the pace group drops every pace lever, and nothing else', () => {
    const order: WhatIfLeverV6 = { kind: 'withdrawal-order', policy: 'taxable-first' }
    const bundle: WhatIfLeverV6[] = [{ kind: 'inherited-pace', accountId: A, pace: { kind: 'even' } }, order, { kind: 'inherited-pace', accountId: B, pace: { kind: 'law-minimum' } }]
    expect(withoutHidden(bundle, new Set(['inherited-pace']))).toEqual([order])
    expect(withoutHidden(bundle, new Set(['claim-age']))).toEqual(bundle)
  })
})
