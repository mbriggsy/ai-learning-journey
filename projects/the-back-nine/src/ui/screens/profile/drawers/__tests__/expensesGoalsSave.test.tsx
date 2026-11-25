// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { applyBundle } from '@intake/whatIf'
import { workingYearCostStaleness } from '@intake/workingYearQuote'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../../devSeeds'
import { copy, slots } from '../../../../copy'
import { refusalWords } from '../../../../workbench/railChrome'
import { FULL, GOVERNED } from '../../../../workbench/__tests__/factDrafts'
import { profileStore } from '../../__tests__/profileStore'
import { DrawerFor } from '../../drawerHost'
import { saveEdit } from '../drawerSave'
import { buildLiving, livingFormFrom, ownLivingField } from '../expensesFields'
import { buildWorkingCost, ownWorkingCostField, workingCostFormFrom, workingCostTouches, applyWrite } from '../workingCostFields'
import { writeEnteredWorkingYearCost } from '@intake/workingYearQuote'

/**
 * Expenses' and Goals' Saves (Act 6 · RC13b), on the real store: the worksheet's refusals and its delete, the survivor's
 * share, and the Pre-retirement living expenses drawer as the W step's one home after the walk (its gate, its period, its
 * stale face and Keep, the pay check spec's laws on `?seed=datecoststale` and `?seed=datesaved`). Nothing refused reaches
 * the store and no recompute is sent.
 */
afterEach(cleanup)

describe('the budget worksheet', () => {
  it('deleting a budget line a kept what-if names: Save passes, and the what-if then refuses by name, never aimed at another line', () => {
    const lever = FULL.keptWhatIfs![0]!.levers.find((l) => l.kind === 'spending')!
    expect(applyBundle(GOVERNED, [lever]).ok, '[test setup] the what-if runs while the line stands').toBe(true)
    const { model, recompute } = profileStore(GOVERNED)
    const seed = livingFormFrom(GOVERNED)
    const res = saveEdit(model, (d) => buildLiving(d, seed, { ...seed, lines: seed.lines.filter((l) => l.id !== 'line-travel') }), ownLivingField)
    expect(res.saved).toBe(true)
    expect(recompute).toHaveBeenCalledTimes(1)
    const after = model.getSnapshot().draft
    expect(after.budget?.map((l) => l.id)).toEqual(['line-housing', 'line-food'])
    const applied = applyBundle(after, [lever])
    expect(applied.ok).toBe(false)
    if (applied.ok) return
    expect(applied.refusal).toEqual({ kind: 'line-gone', lineId: 'line-travel' })
    expect(refusalWords(applied.refusal, after.startCalendarYear)).toBe(copy.workbenchRailRefusedLineGone)
  })

  it('a worksheet with nothing in it over no budget says so, and a line in error blocks: under the lines, the store untouched', () => {
    const retired = DEV_SEEDS.retired
    const { model, recompute } = profileStore(retired)
    const before = model.getSnapshot().draft
    const seed = livingFormFrom(retired)
    const empty = saveEdit(model, (d) => buildLiving(d, seed, { ...seed, approach: 'budget' }), ownLivingField)
    expect(empty.saved || empty.check.fields.lines).toBe(copy.budgetApplyEmpty)
    const blank = { id: 'x', category: 'food', label: '', annualAmountReal: Number.NaN, tier: 'essentials', startYear: 0 } as const
    const blocked = saveEdit(model, (d) => buildLiving(d, seed, { ...seed, approach: 'budget', lines: [blank] }), ownLivingField)
    expect(blocked.saved || blocked.check.fields.lines).toBe(copy.budgetApplyBlocked)
    expect(model.getSnapshot().draft).toBe(before)
    expect(recompute).not.toHaveBeenCalled()
  })

  it('every line removed over a governing budget is the way back to one figure: the total kept, the budget gone (never `budget: []`)', () => {
    const { model } = profileStore(GOVERNED)
    const seed = livingFormFrom(GOVERNED)
    const res = saveEdit(model, (d) => buildLiving(d, seed, { ...seed, lines: [] }), ownLivingField)
    expect(res.saved).toBe(true)
    expect(model.getSnapshot().draft.budget).toBeUndefined()
    expect(model.getSnapshot().draft.annualSpendingReal).toBe(GOVERNED.annualSpendingReal)
  })
})

describe('the survivor’s share', () => {
  it('a blank share and one over 100% refuse under its field, in the panel’s own words', () => {
    const { model } = profileStore(DEV_SEEDS.retired)
    const seed = livingFormFrom(DEV_SEEDS.retired)
    const blank = saveEdit(model, (d) => buildLiving(d, seed, { ...seed, survivor: undefined }), ownLivingField)
    expect(blank.saved || blank.check.fields.survivor).toBe(copy.errSurvivorRatioBlank)
    const over = saveEdit(model, (d) => buildLiving(d, seed, { ...seed, survivor: 1.2 }), ownLivingField)
    expect(over.saved || over.check.fields.survivor).toBe(copy.errSurvivorRatio)
  })
})

describe('Pre-retirement living expenses: Save is the W step’s Continue', () => {
  const save = (start: ScenarioDraft, write: ((d: ScenarioDraft) => ScenarioDraft) | null, periodAnswered: boolean) => {
    const { model, recompute } = profileStore(start)
    const seed = workingCostFormFrom(start)
    const form = write === null ? seed : applyWrite(start, seed, write)
    return { res: saveEdit(model, (d) => buildWorkingCost(d, seed, form), ownWorkingCostField, workingCostTouches(periodAnswered)), model, recompute }
  }

  it('a stale W saved untouched is refused at the fork, as the walk’s Continue refuses it; the store untouched', () => {
    const { res, model, recompute } = save(DEV_SEEDS.datecoststale, null, false)
    expect(res.saved).toBe(false)
    if (res.saved) return
    expect(res.check.fields.answer, 'the gate’s own words, at the fork').toBeDefined()
    expect(model.getSnapshot().draft).toBe(DEV_SEEDS.datecoststale)
    expect(recompute).not.toHaveBeenCalled()
  })

  it('THE W GAP: a working household with no W cannot Save without one (the drawer asks, as the W step does)', () => {
    const { workingYearCost: _w, workingYearLeftOver: _l, ...noW } = DEV_SEEDS.date
    const { res } = save(noW, null, false)
    expect(res.saved || res.check.fields.answer).toBeDefined()
    expect(res.saved).toBe(false)
  })

  it('a figure typed in the month view and its unit never answered asks the unit (ruling 38); answered, it saves', () => {
    // 12,000 in the month view: as likely a year's figure typed in the wrong box as a month's (the floor's own case).
    const monthly = (d: ScenarioDraft) => writeEnteredWorkingYearCost(d, 12_000 * 12, 'month')
    const unasked = save(DEV_SEEDS.date, monthly, false)
    expect(unasked.res.saved || unasked.res.check.fields.figure).toBe(copy.periodConfirmPrompt)
    expect(unasked.model.getSnapshot().draft).toBe(DEV_SEEDS.date)
    const asked = save(DEV_SEEDS.date, monthly, true)
    expect(asked.res.saved).toBe(true)
    expect(asked.model.getSnapshot().draft.workingYearCost).toMatchObject({ kind: 'entered', amountReal: 144_000, entryPeriod: 'month' })
  })
})

describe('the W face in its drawer (the pay check spec’s laws)', () => {
  function open(start: ScenarioDraft) {
    const store = profileStore(start)
    render(<DrawerFor target={{ kind: 'working-cost' }} model={store.model} open readOnly={false} onClose={() => {}} onClosed={() => {}} finalFocus={() => null} />)
    return { ...store, dialog: screen.getByRole('dialog', { name: copy.profileWorkingCostName }) }
  }

  it('?seed=datecoststale: the calm stale note before any tap, no answer checked, no alert; Keep keeps the figure it names and the answer stands fresh', async () => {
    const { model, dialog } = open(DEV_SEEDS.datecoststale)
    const note = dialog.querySelector<HTMLElement>('[data-working-cost-note]')!
    expect(note).toHaveAttribute('role', 'note')
    expect(note).toHaveTextContent(slots.workingCostStaleQuote('84,000', '78,000'))
    expect(within(dialog).queryByRole('alert')).toBeNull()
    expect(within(dialog).getByRole('radio', { name: copy.workingCostYes })).not.toBeChecked()
    expect(within(dialog).getByRole('radio', { name: copy.workingCostDifferent })).not.toBeChecked()
    act(() => fireEvent.click(within(note).getByRole('button', { name: slots.workingCostKeepYearly('84,000') })))
    await waitFor(() => expect(dialog.querySelector('[data-working-cost-note]')).toBeNull())
    // Focus never falls to the page: it lands on the answer that now stands.
    expect(document.activeElement).toBeInstanceOf(HTMLInputElement)
    expect((document.activeElement as HTMLInputElement).checked).toBe(true)
    act(() => fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerSave })))
    const w = model.getSnapshot().draft.workingYearCost
    expect(w).toMatchObject({ kind: 'entered', amountReal: 84_000, keptOverQuoteReal: 78_000 })
    expect(workingYearCostStaleness(model.getSnapshot().draft), 'the kept answer is fresh').toBeNull()
  })

  it('?seed=datesaved: no stale note; the money picture and the left-over question below it, "All of it" checked at its figure', () => {
    const { dialog } = open(DEV_SEEDS.datesaved)
    expect(within(dialog).queryByRole('note')).toBeNull()
    expect(within(dialog).getByRole('radio', { name: copy.workingCostYes })).toBeChecked()
    const picture = dialog.querySelector('[data-money-picture]')!
    const seat = dialog.querySelector('[data-left-over-seat]')!
    expect(picture).not.toBeNull()
    expect(picture.compareDocumentPosition(seat) & Node.DOCUMENT_POSITION_FOLLOWING, 'the question sits below the whole picture').toBeTruthy()
    expect(within(seat as HTMLElement).getByRole('radio', { name: copy.workingLedgerLeftOverSaved })).toBeChecked()
    expect(seat.querySelector('[data-left-over-figure]')).toHaveTextContent(slots.workingLedgerLeftOverFigure('16,985'))
    expect(seat.querySelector('[data-left-over-line]')).toHaveTextContent(slots.workingLedgerLeftOverSavedLine('16,985'))
  })

  it('a stale W draws the left-over question’s calm waiting line, no replies, so no "saved" is stored against it', () => {
    const { dialog } = open(DEV_SEEDS.datesavedstale)
    const seat = dialog.querySelector('[data-left-over-seat]') as HTMLElement
    expect(within(seat).queryAllByRole('radio')).toHaveLength(0)
    expect(within(seat).getByRole('note')).toBeInTheDocument()
  })
})
