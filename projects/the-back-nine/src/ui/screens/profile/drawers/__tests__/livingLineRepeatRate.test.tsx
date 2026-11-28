// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { medicareCostTrend } from '@engine/constants'
import { buildSpineParams, isDateRoute } from '@intake/intakeMap'
import type { MemoryModel, ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../../devSeeds'
import { copy, slots } from '../../../../copy'
import { GOVERNED } from '../../../../workbench/__tests__/factDrafts'
import { profileStore } from '../../__tests__/profileStore'
import { DrawerFor } from '../../drawerHost'

/**
 * Gap 4's U8, the Living drawer's repeat and rate (the plan's U8 test scenarios), on the real store: each choice of how a
 * line's cost changes writes the field the engine reads (with prices removes it, the same dollar amount writes 0, up by
 * writes the fraction typed), a blank or out-of-range percent holds the Save with words and is never saved as "with
 * prices" (insight 059), a typed 5 reaches the run as the factor U4 prices, a repeat writes its count and reads its
 * years back, the rate reads back a later year's cost, and the date route's note sits only where a fixed line's last year
 * moves with each stop tested. Every expected price figure is the closed form from the constants (DND 012).
 */
afterEach(cleanup)

const RETIRED = DEV_SEEDS.budget // all retired, built 2026, seven lifelong lines from year 0
const PRICES_2026_TO_2036 = Math.pow(1 + medicareCostTrend.value.cpiNearTermAvg, 9) * Math.pow(1 + medicareCostTrend.value.cpiUltimate, 1)

function openLiving(model: MemoryModel) {
  render(<DrawerFor target={{ kind: 'living' }} model={model} open readOnly={false} onClose={() => {}} onClosed={() => {}} finalFocus={() => null} />)
  const dialog = screen.getByRole('dialog', { name: copy.profileKindLiving })
  const row = dialog.querySelector<HTMLElement>('[data-budget-line]')!
  return { dialog, row }
}
function type(box: HTMLElement, text: string) {
  act(() => box.focus())
  fireEvent.change(box, { target: { value: text } })
  act(() => box.blur())
}
const pick = (row: HTMLElement, label: string) => act(() => fireEvent.click(within(row).getByRole('radio', { name: label })))
const save = (dialog: HTMLElement) => act(() => fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerSave })))
const firstLine = (model: MemoryModel) => model.getSnapshot().draft.budget![0]!

describe('how a line’s cost changes', () => {
  it('"Stays the same dollar amount" writes 0; "Goes up with prices" removes the key', () => {
    const { model, recompute } = profileStore(RETIRED)
    expect('growthRate' in RETIRED.budget![0]!, '[test setup] the line goes up with prices').toBe(false)
    let { dialog, row } = openLiving(model)
    expect(within(row).getByRole('radio', { name: copy.budgetChangePrices })).toBeChecked()
    pick(row, copy.budgetChangeSame)
    save(dialog)
    expect(firstLine(model).growthRate).toBe(0)
    expect(recompute).toHaveBeenCalledTimes(1)
    cleanup()
    ;({ dialog, row } = openLiving(model))
    expect(within(row).getByRole('radio', { name: copy.budgetChangeSame })).toBeChecked()
    pick(row, copy.budgetChangePrices)
    save(dialog)
    expect('growthRate' in firstLine(model)).toBe(false)
  })

  it('"Goes up by" moves focus into its box, says nothing until the box is left, and a blank box or 16 holds the Save with words, never saved as with prices', () => {
    const { model, recompute } = profileStore(RETIRED)
    const before = model.getSnapshot().draft
    const { dialog, row } = openLiving(model)
    pick(row, copy.budgetChangeRate)
    const box = within(row).getByLabelText(copy.budgetRateLabel)
    expect(box, 'the choice moves focus into the box').toHaveFocus()
    expect(within(row).queryByText(copy.errBudgetRateRange), 'silent before the box is left').toBeNull()
    save(dialog)
    expect(within(dialog).getByText(copy.budgetApplyBlocked)).toBeInTheDocument()
    expect(within(row).getByText(copy.errBudgetRateRange)).toBeInTheDocument()
    expect(box).toHaveAttribute('aria-invalid', 'true')
    type(box, '16')
    save(dialog)
    expect(within(row).getByText(copy.errBudgetRateRange)).toBeInTheDocument()
    expect(model.getSnapshot().draft, 'nothing refused reaches the store').toBe(before)
    expect(recompute).not.toHaveBeenCalled()
  })

  it('a typed 5 is stored as 0.05 and reaches the run as 1.05^10 ÷ prices’ growth at sim year 10 (U4’s factor)', () => {
    const { model } = profileStore(RETIRED)
    const { dialog, row } = openLiving(model)
    pick(row, copy.budgetChangeRate)
    type(within(row).getByLabelText(copy.budgetRateLabel), '5')
    save(dialog)
    const after = model.getSnapshot().draft
    expect(after.budget![0]!.growthRate).toBe(0.05)
    expect(isDateRoute(after), '[test setup] the spine route').toBe(false)
    const factor = buildSpineParams(after)!.budget!.rated![0]!.factorByT[10]!
    const expected = Math.pow(1.05, 10) / PRICES_2026_TO_2036
    expect(Math.abs(factor - expected) / expected).toBeLessThan(1e-12)
  })

  it('"Stays the same" and back keeps the percent typed (a figure is never re-asked)', () => {
    const { model } = profileStore(RETIRED)
    const { row } = openLiving(model)
    pick(row, copy.budgetChangeRate)
    type(within(row).getByLabelText(copy.budgetRateLabel), '4.5')
    pick(row, copy.budgetChangeSame)
    expect(within(row).queryByLabelText(copy.budgetRateLabel)).toBeNull()
    pick(row, copy.budgetChangeRate)
    expect(within(row).getByLabelText(copy.budgetRateLabel)).toHaveValue('4.5')
  })

  it('the read-back for a $10,000 line that stays the same dollar amount on a 2026 plan names 2036 and about $7,355, slower than prices (AE2), tied to the choice', () => {
    expect(RETIRED.startCalendarYear, '[test setup] built 2026').toBe(2026)
    expect(Math.round(10_000 / PRICES_2026_TO_2036), '[test setup] the hand-worked figure').toBe(7_355)
    const { row } = openLiving(profileStore(RETIRED).model)
    type(within(row).getByLabelText(copy.budgetAmountLabel), '10,000')
    expect(row.querySelector('[data-budget-rate-readback]'), 'with prices: no read-back').toBeNull()
    pick(row, copy.budgetChangeSame)
    const words = slots.budgetRateReadBack('slower', 2036, '7,355', false)
    expect(row.querySelector('[data-budget-rate-readback]')).toHaveTextContent(words)
    expect(within(row).getByRole('group', { name: copy.budgetChangeLegend })).toHaveAccessibleDescription(words)
  })
})

describe('a line’s repeat', () => {
  it('a repeat of 5 writes 5, the amount reads "each time" and the years it is charged show; clearing it removes the key', () => {
    const { model } = profileStore(RETIRED)
    let { dialog, row } = openLiving(model)
    const repeat = within(row).getByLabelText(copy.budgetRepeatLabel)
    expect(repeat).toHaveAccessibleDescription(copy.budgetRepeatBlankHelp)
    type(repeat, '5')
    expect(within(row).getByLabelText(copy.budgetAmountLabelEach)).toBeInTheDocument()
    expect(repeat).toHaveAccessibleDescription('Charged in 2026, 2031, 2036 and so on.')
    save(dialog)
    expect(firstLine(model).everyYears).toBe(5)
    cleanup()
    ;({ dialog, row } = openLiving(model))
    type(within(row).getByLabelText(copy.budgetRepeatLabel), '')
    save(dialog)
    expect('everyYears' in firstLine(model)).toBe(false)
  })

  it('a repeat of 1 holds the Save with the repeat’s own words, under its own box', () => {
    const { model } = profileStore(RETIRED)
    const before = model.getSnapshot().draft
    const { dialog, row } = openLiving(model)
    const repeat = within(row).getByLabelText(copy.budgetRepeatLabel)
    type(repeat, '1')
    save(dialog)
    expect(repeat).toHaveAccessibleDescription(expect.stringContaining(copy.errBudgetRepeatRange))
    expect(model.getSnapshot().draft).toBe(before)
  })
})

describe('the date route’s note under a fixed line with a last year', () => {
  it('shows on the date route under a fixed line with a Through year; not without one, not under a line that goes up with prices, never on the all-retired route', () => {
    expect(isDateRoute(GOVERNED), '[test setup] a working household').toBe(true)
    let { row } = openLiving(profileStore(GOVERNED).model)
    const note = () => within(row).queryByText(copy.budgetDateRouteEndNote)
    const through = () => within(row).getByLabelText(copy.budgetWindowThroughLabel)
    type(through(), '')
    pick(row, copy.budgetChangeSame)
    expect(note(), 'no last year: nothing moves').toBeNull()
    type(through(), '5')
    expect(note()).toBeInTheDocument()
    pick(row, copy.budgetChangePrices)
    expect(note(), 'with prices: no note').toBeNull()
    cleanup()
    ;({ row } = openLiving(profileStore(RETIRED).model))
    type(through(), '5')
    pick(row, copy.budgetChangeSame)
    expect(note(), 'all retired: the years never move').toBeNull()
  })
})

describe('back to one figure from lines that repeat or change at their own rate', () => {
  it('says the first year’s figure becomes every year’s; a plain budget keeps the plain words', () => {
    const fixed: ScenarioDraft = DEV_SEEDS.datefixed
    let { dialog } = openLiving(profileStore(fixed).model)
    act(() => fireEvent.click(within(dialog).getByRole('radio', { name: copy.profileLivingApproachOne })))
    expect(within(dialog).getByRole('group', { name: copy.profileLivingApproachLegend })).toHaveAccessibleDescription(
      `${copy.budgetBackToSingleHint} ${slots.budgetBackToSingleKeeps('78,000')}`,
    )
    cleanup()
    ;({ dialog } = openLiving(profileStore(RETIRED).model))
    act(() => fireEvent.click(within(dialog).getByRole('radio', { name: copy.profileLivingApproachOne })))
    expect(within(dialog).getByRole('group', { name: copy.profileLivingApproachLegend })).toHaveAccessibleDescription(copy.budgetBackToSingleHint)
  })

  // The line half's review (insight 180's sibling host): removing every line goes back to one figure too, so it says so.
  it('removing every line says the same words as the switch over a budget that departs; nothing over a plain one', () => {
    const removeAll = (dialog: HTMLElement) => {
      for (const b of within(dialog).getAllByRole('button', { name: /^Remove / })) act(() => fireEvent.click(b))
    }
    let { dialog } = openLiving(profileStore(DEV_SEEDS.datefixed).model)
    removeAll(dialog)
    expect(dialog.querySelector('[data-budget-line]'), '[test setup] every line removed').toBeNull()
    expect(dialog.querySelector('[data-budget-back-to-single]')).toHaveTextContent(`${copy.budgetBackToSingleHint} ${slots.budgetBackToSingleKeeps('78,000')}`)
    cleanup()
    ;({ dialog } = openLiving(profileStore(RETIRED).model))
    removeAll(dialog)
    expect(dialog.querySelector('[data-budget-back-to-single]'), 'a plain budget: nothing departs').toBeNull()
  })
})

describe('the change choice’s description', () => {
  it('on the date route a fixed line’s end note joins the choice’s description, beside the rate’s read-back when both show', () => {
    const { row } = openLiving(profileStore(GOVERNED).model)
    const group = () => within(row).getByRole('group', { name: copy.budgetChangeLegend })
    type(within(row).getByLabelText(copy.budgetWindowThroughLabel), '5')
    pick(row, copy.budgetChangeSame)
    expect(group()).toHaveAccessibleDescription(expect.stringContaining(copy.budgetDateRouteEndNote))
    expect(group().getAttribute('aria-describedby'), 'never a "null" or an empty id').not.toMatch(/null|\s{2}|^\s|\s$/)
  })
})
