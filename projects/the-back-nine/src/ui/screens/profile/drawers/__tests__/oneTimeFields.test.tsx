// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { buildDateInput } from '@intake/intakeMap'
import { nominalDeflator } from '@intake/priceFrame'
import { formatMoney } from '@intake/moneyFormat'
import type { OneTimeInflow } from '@shared/model'
import type { MemoryModel, ScenarioDraft } from '@store/memoryModel'
import { deriveStaleness } from '@store/staleness'
import { DEV_SEEDS, SEED_BUILD_YEAR } from '../../../../devSeeds'
import { copy, slots } from '../../../../copy'
import { composeReentry } from '../../../../reentryChrome'
import type { BalancesYear } from '../../../../resultSave'
import { scenarioFromDraft } from '../../../../scenarioFromDraft'
import { exposureForDraft } from '../../../../stalenessExposure'
import { profileStore } from '../../__tests__/profileStore'
import { blueprintView, type BlueprintInput } from '../../blueprintView'
import { DrawerFor } from '../../drawerHost'
import { incomeView } from '../../profileView'
import type { DrawerTarget } from '../../profileView'

/**
 * Gap 5's U4 (the plan's U4 test scenarios), on the real store and the real composers: an inheritance or gift added,
 * edited and deleted through its drawer; every R3 problem refused under its field; a couple asked whose it is and, for
 * one person's, whether it still comes to the other; the read-back equal to the params the draft builds; R15's flag on
 * the card, in the drawer and at the re-entry gate, keyed on the persisted save year; R17 asked for an item in that year;
 * Blueprint's Goals tile at its calendar year with both ages and its Income tile in its owner's cell or the household's
 * row. Every expected figure is read from the fixture's own facts and the plan's own price frame, never typed.
 */
afterEach(cleanup)

const INHERIT = DEV_SEEDS.dateinherit // dip's working household, $250,000 in SEED_BUILD_YEAR + 4, both people's
const RETIRED = DEV_SEEDS.retired
const Y = SEED_BUILD_YEAR
const gift = (over: Partial<OneTimeInflow> = {}): OneTimeInflow => ({ id: 'g1', kind: 'gift', name: 'Mom’s estate', year: Y + 3, amountReal: 200_000, ...over })
const withGifts = (d: ScenarioDraft, items: readonly OneTimeInflow[]): ScenarioDraft => ({ ...d, oneTimeInflows: items })
/** An epoch-day in the middle of `year` (`epochDayToCalendarYear` reads it as that year). */
const dayIn = (year: number): number => Math.floor(Date.UTC(year, 6, 1) / 86_400_000)

function open(model: MemoryModel, target: DrawerTarget, balancesYear?: BalancesYear) {
  render(
    <DrawerFor
      target={target}
      model={model}
      open
      readOnly={false}
      onClose={() => {}}
      onClosed={() => {}}
      finalFocus={() => null}
      {...(balancesYear !== undefined ? { balancesYear } : {})}
    />,
  )
  return screen.getByRole('dialog')
}
function type(box: HTMLElement, text: string) {
  act(() => box.focus())
  fireEvent.change(box, { target: { value: text } })
  act(() => box.blur())
}
const box = (dialog: HTMLElement, label: string) => within(dialog).getByRole('textbox', { name: label })
const pick = (dialog: HTMLElement, label: string) => act(() => fireEvent.click(within(dialog).getByRole('radio', { name: label })))
const save = (dialog: HTMLElement) => act(() => fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerSave })))

describe('the drawer: add, edit, delete (R1 to R3)', () => {
  it('adds a gift from Add income: the list gains the item as typed, both people’s, with a fresh id, and the card reads it back', () => {
    const { model, recompute } = profileStore(RETIRED)
    const dialog = open(model, { kind: 'new-one-time' })
    expect(within(dialog).getByRole('heading', { name: copy.oneTimeNewTitle })).toBeInTheDocument()
    type(box(dialog, copy.oneTimeNameLabel), 'Mom’s estate')
    type(box(dialog, copy.oneTimeYearFieldLabel), String(Y + 3))
    type(box(dialog, copy.oneTimeAmountLabel), '200000')
    pick(dialog, copy.blueprintBothOfYou)
    save(dialog)
    const items = model.getSnapshot().draft.oneTimeInflows!
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'gift', name: 'Mom’s estate', year: Y + 3, amountReal: 200_000 })
    expect('heirIndex' in items[0]! || 'leftTo' in items[0]!, 'both people’s carries no heir').toBe(false)
    expect(items[0]!.id).toMatch(/^[0-9a-f]{24}$/)
    expect(recompute).toHaveBeenCalledTimes(1)
    const card = incomeView(model.getSnapshot().draft, false).cards.find((c) => c.id === 'one-time-0')!
    expect(card.kind).toBe(copy.oneTimeKind)
    expect(card.rows).toEqual([
      { label: copy.profileRowComesIn, value: slots.oneTimeComesIn('200,000', Y + 3) },
      { label: copy.profileRowFor, value: copy.blueprintBothOfYou },
    ])
    expect(card.target).toEqual({ kind: 'one-time', index: 0 })
  })

  it('Save refuses each problem under its own field, in the tree’s order, and writes nothing', () => {
    const { model } = profileStore(RETIRED)
    const dialog = open(model, { kind: 'new-one-time' })
    const shows = (words: string) => expect(within(dialog).getByText(words)).toBeInTheDocument()
    save(dialog)
    shows(copy.errOneTimeNameRequired)
    type(box(dialog, copy.oneTimeNameLabel), 'Gift from Dad')
    save(dialog)
    shows(copy.errOneTimeYearRequired)
    type(box(dialog, copy.oneTimeYearFieldLabel), String(Y - 1))
    save(dialog)
    expect(within(dialog).getAllByText(/the years this plan covers\.$/).length).toBeGreaterThan(0)
    type(box(dialog, copy.oneTimeYearFieldLabel), String(Y + 2))
    type(box(dialog, copy.oneTimeAmountLabel), '0')
    save(dialog)
    shows(copy.errOneTimeAmountZero)
    type(box(dialog, copy.oneTimeAmountLabel), '50000')
    save(dialog)
    shows(copy.errOneTimeWhoseRequired)
    expect(model.getSnapshot().draft.oneTimeInflows).toBeUndefined()
  })

  it('a couple’s one-person item asks whether it still comes to the other, naming both, and saves the heir with the answer', () => {
    const { model } = profileStore(RETIRED)
    const dialog = open(model, { kind: 'new-one-time' })
    type(box(dialog, copy.oneTimeNameLabel), 'Aunt’s estate')
    type(box(dialog, copy.oneTimeYearFieldLabel), String(Y + 5))
    type(box(dialog, copy.oneTimeAmountLabel), '100000')
    expect(within(dialog).queryByRole('group', { name: /before it comes/ }), 'not asked before whose is answered').toBeNull()
    pick(dialog, 'Sam')
    expect(within(dialog).getByRole('group', { name: slots.oneTimeLeftToLegend('Sam', false, 'Alex') })).toBeInTheDocument()
    save(dialog)
    expect(within(dialog).getByText(copy.errOneTimeLeftToRequired)).toBeInTheDocument()
    pick(dialog, copy.oneTimeLeftToNo)
    save(dialog)
    expect(model.getSnapshot().draft.oneTimeInflows![0]).toMatchObject({ heirIndex: 1, leftTo: 'someone-else' })
  })

  it('an edit replaces the item in place with its own id; Delete (twice) takes the last item and the key with it', () => {
    const { model } = profileStore(withGifts(RETIRED, [gift({ id: 'keep-me' })]))
    let dialog = open(model, { kind: 'one-time', index: 0 })
    pick(dialog, copy.blueprintBothOfYou)
    type(box(dialog, copy.oneTimeAmountLabel), '275000')
    save(dialog)
    expect(model.getSnapshot().draft.oneTimeInflows).toEqual([gift({ id: 'keep-me', amountReal: 275_000 })])
    cleanup()
    dialog = open(model, { kind: 'one-time', index: 0 })
    const del = () => act(() => fireEvent.click(within(dialog).getByRole('button', { name: /delete/i })))
    del()
    del()
    expect('oneTimeInflows' in model.getSnapshot().draft, 'the last item deleted removes the key (KTD2)').toBe(false)
  })
})

describe('the read-back (R11) and the save-year flag (R15, R17)', () => {
  it('on `dateinherit` the read-back names the params the draft builds: the cash, its year, and that year’s dollars from the plan’s own price frame', () => {
    const item = INHERIT.oneTimeInflows![0]!
    const built = buildDateInput(INHERIT)!.params.overlay!.oneTimeInflows![0]!
    expect(built).toEqual({ year: item.year, cashReal: item.amountReal })
    const { model } = profileStore(INHERIT)
    const dialog = open(model, { kind: 'one-time', index: 0 })
    const nominal = formatMoney(Math.round(built.cashReal * nominalDeflator(INHERIT.startCalendarYear, built.year - INHERIT.startCalendarYear)))
    expect(nominal, '[non-vacuity] a later year’s dollars differ from today’s').not.toBe(formatMoney(built.cashReal))
    expect(dialog.querySelector('[data-one-time-readback]')).toHaveTextContent(slots.oneTimeReadBack(formatMoney(built.cashReal), built.year, nominal, null, false))
    // R6 in words, typed out (the slot above is the renderer under test): a future where both died first is never credited.
    expect(dialog.querySelector('[data-one-time-readback]')?.textContent).toMatch(/last through \d{4} and one of you is living that year\./)
    expect(dialog.querySelector('[data-one-time-estimate]')).toHaveTextContent(copy.oneTimeEstimateNote)
  })

  it('an item left to someone else reads back the heir’s condition; a spine plan with $0 saved says none of it counts', () => {
    const { model } = profileStore(withGifts(RETIRED, [gift({ heirIndex: 1, leftTo: 'someone-else' })]))
    const dialog = open(model, { kind: 'one-time', index: 0 })
    expect(dialog.querySelector('[data-one-time-readback]')?.textContent).toMatch(/and Sam is living that year\./)
    cleanup()
    const broke = { ...RETIRED, enteredAccounts: RETIRED.enteredAccounts.map((a) => ({ ...a, valueToday: 0 })) }
    const { model: m2 } = profileStore(withGifts(broke, [gift()]))
    expect(open(m2, { kind: 'one-time', index: 0 }).querySelector('[data-one-time-readback]')).toHaveTextContent(copy.oneTimeNoSavings)
  })

  it('the card flags an item dated before the persisted save year and one in it, never one after; the persisted year wins over the draft’s stale stamp', () => {
    // The draft was loaded from a 2026 save (its own stamp); the household re-saved in Y + 3 this session.
    const d = withGifts({ ...RETIRED, savedAt: dayIn(Y) }, [gift({ year: Y + 2 }), gift({ id: 'g2', year: Y + 3 }), gift({ id: 'g3', year: Y + 4 })])
    const notes = (balances?: BalancesYear) => incomeView(d, false, balances).cards.filter((c) => c.id.startsWith('one-time-')).map((c) => c.note)
    expect(notes({ year: Y + 3, enteredNow: false })).toEqual([slots.oneTimeFlagBefore(Y + 3), slots.oneTimeFlagInYear(Y + 3), undefined])
    // Balances changed this session are this year's: the in-year words name no year (review round 1, the yearly update).
    expect(notes({ year: Y + 3, enteredNow: true })).toEqual([slots.oneTimeFlagBefore(Y + 3), copy.oneTimeFlagInYearNow, undefined])
    // With no persisted year handed down the draft's own stamp is the reading (here the older save: nothing flagged).
    expect(notes()).toEqual([undefined, undefined, undefined])
  })

  it('the drawer flags a year before the save year, and asks R17 for the save year itself, refusing a yes', () => {
    const { model } = profileStore(withGifts(RETIRED, [gift({ year: Y + 2 })]))
    let dialog = open(model, { kind: 'one-time', index: 0 }, { year: Y + 3, enteredNow: false })
    expect(dialog.querySelector('[data-one-time-flag]')).toHaveTextContent(slots.oneTimeFlagBefore(Y + 3))
    expect(within(dialog).queryByRole('group', { name: slots.oneTimeArrivedLegend(Y + 3) })).toBeNull()
    type(box(dialog, copy.oneTimeYearFieldLabel), String(Y + 3))
    expect(dialog.querySelector('[data-one-time-flag]'), 'the save year itself draws the question instead').toBeNull()
    expect(within(dialog).getByRole('group', { name: slots.oneTimeArrivedLegend(Y + 3) })).toBeInTheDocument()
    pick(dialog, copy.blueprintBothOfYou)
    pick(dialog, copy.oneTimeArrivedYes)
    save(dialog)
    expect(within(dialog).getByText(copy.errOneTimeArrivedGift)).toBeInTheDocument()
    pick(dialog, copy.oneTimeArrivedNo)
    save(dialog)
    expect(model.getSnapshot().draft.oneTimeInflows![0]!.year).toBe(Y + 3)
    cleanup()
    // A plan never saved: its first year is the save year, so an item dated then is asked R17 too, in the present tense
    // (its balances are this session's, or on the stepper's Income step not entered yet: review round 1).
    dialog = open(profileStore(RETIRED).model, { kind: 'new-one-time' })
    type(box(dialog, copy.oneTimeYearFieldLabel), String(RETIRED.startCalendarYear))
    expect(within(dialog).getByRole('group', { name: copy.oneTimeArrivedLegendNow })).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: copy.oneTimeArrivedYesNow })).toBeInTheDocument()
    cleanup()
    // Balances changed since the save (the yearly update): today's year, asked in the present tense too.
    dialog = open(profileStore(withGifts(RETIRED, [gift({ year: Y + 5 })])).model, { kind: 'one-time', index: 0 }, { year: Y + 5, enteredNow: true })
    expect(within(dialog).getByRole('group', { name: copy.oneTimeArrivedLegendNow })).toBeInTheDocument()
  })

  it('the re-entry gate names each flagged item with its amount and year, in its before or in-year words; an item after the save says nothing', () => {
    const draft = withGifts(RETIRED, [gift({ year: Y + 1 }), gift({ id: 'g2', name: 'Gift from Dad', year: Y + 2, amountReal: 30_000 }), gift({ id: 'g3', year: Y + 3 })])
    const r = scenarioFromDraft(draft)
    if (!r.ready) throw new Error('[test setup] the draft must be save-ready')
    const scenario = { ...r.scenario, savedAt: dayIn(Y + 2) }
    const report = deriveStaleness(scenario, dayIn(Y + 2), exposureForDraft(draft), { costStale: false, leftOverStale: false })
    const lines = composeReentry(scenario, report, { costStale: null, leftOverStale: null, typedBelow: null }).noteLines
    expect(report.anyStale).toBe(true)
    expect(lines).toContain(slots.stalenessOneTimeLine('Mom’s estate', '200,000', Y + 1, Y + 2, false))
    expect(lines).toContain(slots.stalenessOneTimeLine('Gift from Dad', '30,000', Y + 2, Y + 2, true))
    expect(lines.filter((l) => typeof l === 'string' && l.includes('“Mom’s estate”'))).toHaveLength(1)
  })
})

describe('Blueprint (R13) and the Add menus', () => {
  const ANCHOR = (d: ScenarioDraft) => ({ startCalendarYear: d.startCalendarYear, yearsSincePlanBuilt: 0 })
  const input = (draft: ScenarioDraft, over: Partial<BlueprintInput>): BlueprintInput => ({
    draft,
    tab: 'goals',
    readOnly: false,
    agedBalancesYear: undefined,
    answer: { kind: 'pending' },
    refiguring: false,
    anchor: ANCHOR(draft),
    ...over,
  })

  it('the Goals tile sits at its calendar year with both ages, under its own legend entry, on both routes; the entry is drawn only on a plan with one', () => {
    for (const d of [withGifts(RETIRED, [gift()]), INHERIT]) {
      const item = d.oneTimeInflows![0]!
      const v = blueprintView(input(d, { tab: 'goals' }))
      if (v.body.kind !== 'goals') throw new Error('goals body')
      const group = v.body.groups.find((g) => g.key === `year-${item.year}`)!
      const tile = group.tiles.find((t) => t.id === 'one-time-0')!
      expect(tile).toMatchObject({ category: copy.oneTimeKind, name: item.name, legend: 'one-time', tone: 'orange', target: { kind: 'one-time', index: 0 } })
      expect(group.ages).toBe(
        slots.bpAges([0, 1].map((i) => slots.bpAgeOf(d.people[i]!.name!, d.people[i]!.currentAge! + (item.year - d.startCalendarYear)))),
      )
      expect(v.legend.map((l) => l.id)).toContain('one-time')
    }
    expect(blueprintView(input(RETIRED, { tab: 'goals' })).legend.map((l) => l.id)).not.toContain('one-time')
  })

  it('the Income lane holds a one-person item in its owner’s cell and a both-people item in a “Both of you” row; both Add menus offer the entry', () => {
    const d = withGifts(RETIRED, [gift({ heirIndex: 1, leftTo: 'other-member' }), gift({ id: 'g2', name: 'Lottery', year: Y + 6 })])
    const v = blueprintView(input(d, { tab: 'ise' }))
    if (v.body.kind !== 'ise') throw new Error('ise body')
    const lane = v.body.lanes.find((l) => l.id === 'income')!
    expect(lane.cells![1]!.tiles.map((t) => t.id)).toContain('one-time-0')
    expect(lane.shared).toEqual({ label: copy.blueprintBothOfYou, tiles: [expect.objectContaining({ id: 'one-time-1', value: slots.bpRowValue(copy.profileRowComesIn, slots.oneTimeComesIn('200,000', Y + 6)) })] })
    const noShared = blueprintView(input(RETIRED, { tab: 'ise' }))
    if (noShared.body.kind !== 'ise') throw new Error('ise body')
    expect(noShared.body.lanes.find((l) => l.id === 'income')!.shared, 'no row while there is none').toBeUndefined()
    const leaves = (items: NonNullable<typeof v.add>['items']) => items.flatMap((i) => ('items' in i ? i.items.map((l) => l.target) : [i.target]))
    expect(leaves(v.add!.items)).toContainEqual({ kind: 'new-one-time' })
    expect(leaves(incomeView(RETIRED, false).add!.items)).toContainEqual({ kind: 'new-one-time' })
  })

  it('the Income page’s empty line names the new entry, and with a gift but no ongoing income says no ongoing income is entered', () => {
    const none = { ...RETIRED, incomeStreams: [] }
    expect(incomeView(none, false).lines).toContain(copy.profileIncomeOtherNone)
    expect(incomeView(withGifts(none, [gift()]), false).lines).toContain(copy.profileIncomeOngoingNone)
    expect(incomeView(withGifts(none, [gift()]), true).lines).toContain(copy.profileIncomeOngoingNoneReadOnly)
  })
})
