// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { budgetTierSplitAtZero } from '@intake/steps'
import { formatMoney } from '@intake/moneyFormat'
import type { BudgetLineItem } from '@shared/model'
import { idsInUse } from '@shared/stableIds'
import type { MemoryModel, ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../../devSeeds'
import { copy, slots } from '../../../../copy'
import { profileStore } from '../../__tests__/profileStore'
import { DrawerFor } from '../../drawerHost'
import { expensesView, type DrawerTarget } from '../../profileView'
import { buildLiving, buildMedical, livingFormFrom, medicalFormFrom } from '../expensesFields'

/**
 * The Living expenses and Out-of-pocket medical drawers' budget laws (Act 6 · RC14), ported from the deleted walk's
 * battery (`src/intake/__tests__/budgetBuilder.test.tsx` and `budgetSpendStep.test.tsx`, which pinned them through
 * `BudgetBuilder.tsx` and the walk's spend and out-of-pocket steps): the pure builders (`expensesFields.ts`) and the
 * drawers rendered over the real store (`profileStore`). Guarded here: nothing reaches the store until Save; Save is the
 * ATOMIC reconciliation patch (`annualSpendingReal === Σ lines active at year 0 + M` in the same write); the escape to
 * one figure leaves the budget strictly undefined with the total kept; an empty worksheet over no budget says so and the
 * drawer stays open; a line's errors are its own and show on touch or a refused Save, never while typing; warnings never
 * block; a cleared through-year is lifelong with the `endYear` key ABSENT (DND 009); a new line's id is fresh and an
 * edited line keeps its own; out-of-pocket medical under a governing budget re-reconciles the total in the same write.
 * The worksheet's pure rules (the readout, the Apply outcome, each error's words) are `src/intake/__tests__/budgetForm.test.ts`.
 */
afterEach(cleanup)

const line = (patch?: Partial<BudgetLineItem>): BudgetLineItem => ({
  category: 'food',
  label: '',
  annualAmountReal: 30_000,
  tier: 'essentials',
  startYear: 0,
  ...patch,
})

const M = 8_000
/** A real seed with a GOVERNING budget and an out-of-pocket figure M, the total already reconciled (Σ@0 + M). */
const governed = (budget: readonly BudgetLineItem[], extra?: Partial<ScenarioDraft>): ScenarioDraft => {
  const atZero = budget.filter((l) => l.startYear === 0).reduce((s, l) => s + l.annualAmountReal, 0)
  return {
    ...DEV_SEEDS.retired,
    budget,
    annualSpendingReal: atZero + M,
    health: { ...DEV_SEEDS.retired.health, oopMedicalAnnual: M },
    ...extra,
  }
}
/** Food $30,000 from year 0, Trips $6,000 extras from year 3: the year-0 total is $30,000 + M = $38,000. */
const TWO = governed([line({ id: 'line-food' }), line({ id: 'line-trips', category: 'travel', label: 'Trips', annualAmountReal: 6_000, tier: 'discretionary', startYear: 3 })])

function open(start: ScenarioDraft, target: DrawerTarget = { kind: 'living' }) {
  const store = profileStore(start)
  render(<DrawerFor target={target} model={store.model} open readOnly={false} onClose={() => {}} onClosed={() => {}} finalFocus={() => null} />)
  return { ...store, dialog: screen.getByRole('dialog') }
}

/** Type into a kit box as a person does: focus, the text, blur (the kit commits on blur). */
function typeInto(el: HTMLElement, text: string): void {
  fireEvent.focus(el)
  fireEvent.change(el, { target: { value: text } })
  fireEvent.blur(el)
}

const rows = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('[data-budget-line]'))
const pickBudget = () => fireEvent.click(screen.getByRole('radio', { name: copy.profileLivingApproachBudget }))
const addLine = () => fireEvent.click(screen.getByRole('button', { name: copy.budgetAddLine }))
const save = () => act(() => fireEvent.click(screen.getByRole('button', { name: copy.profileDrawerSave })))
const readout = (): HTMLElement => document.querySelector<HTMLElement>('[data-budget-readout]')!
const refused = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-budget-refused]')
const draftOf = (model: MemoryModel): ScenarioDraft => model.getSnapshot().draft

describe('the builders: Save writes the walk’s atomic patch', () => {
  it('the approach seeds from whether a budget governs (strictly present), never from its length', () => {
    expect(livingFormFrom(DEV_SEEDS.retired).approach).toBe('one')
    expect(livingFormFrom(TWO).approach).toBe('budget')
  })

  it('a worksheet saved from one figure lands Σ lines active at year 0 + M and the lines in ONE draft', () => {
    const start = { ...DEV_SEEDS.retired, health: { ...DEV_SEEDS.retired.health, oopMedicalAnnual: M } }
    const seed = livingFormFrom(start)
    const built = buildLiving(start, seed, { ...seed, approach: 'budget', lines: [line({ id: 'n1' }), line({ id: 'n2', annualAmountReal: 5_000, startYear: 4 })] })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.draft.budget).toHaveLength(2)
    expect(built.draft.annualSpendingReal, 'the year-4 line is not in the anchor').toBe(30_000 + M)
  })

  it('back to one figure: the budget strictly undefined (never []), the total keeps its last reconciled value', () => {
    const seed = livingFormFrom(TWO)
    const built = buildLiving(TWO, seed, { ...seed, approach: 'one' })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.draft.budget).toBeUndefined()
    expect(built.draft.annualSpendingReal).toBe(38_000)
  })

  it('out-of-pocket medical under a governing budget re-reconciles the total in the same write: Σ@0 + the new M', () => {
    const built = buildMedical(TWO, medicalFormFrom(TWO), { oop: 20_000 })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.draft.health.oopMedicalAnnual).toBe(20_000)
    expect(built.draft.budget, 'the budget still governs, untouched').toBe(TWO.budget)
    expect(built.draft.annualSpendingReal).toBe(30_000 + 20_000)
  })

  it('with NO budget governing, out-of-pocket medical leaves the total alone (M is a plain input again)', () => {
    const start = { ...DEV_SEEDS.retired, annualSpendingReal: 60_000 }
    const built = buildMedical(start, medicalFormFrom(start), { oop: 9_000 })
    expect(built.ok && built.draft.health.oopMedicalAnnual).toBe(9_000)
    expect(built.ok && built.draft.annualSpendingReal).toBe(60_000)
  })
})

describe('the Living expenses drawer: nothing reaches the store until Save, and Save is the atomic patch', () => {
  it('raising the year-0 line $30,000 to $40,000: the store waits for Save, then holds 2 lines and $40,000 + M = $48,000', () => {
    const { model } = open(TWO)
    typeInto(within(rows()[0]!).getByLabelText(copy.budgetAmountLabel), '40,000')
    expect(draftOf(model).budget![0]!.annualAmountReal, 'an edit alone moves nothing').toBe(30_000)
    expect(readout()).toHaveTextContent(slots.budgetAnchorLead(formatMoney(38_000)))
    expect(readout()).toHaveTextContent(slots.budgetMedicalCarried(formatMoney(M)))
    expect(readout()).toHaveTextContent(slots.budgetLinesTarget(formatMoney(30_000)))
    save()
    const d = draftOf(model)
    expect(d.budget!.map((l) => l.annualAmountReal)).toEqual([40_000, 6_000])
    expect(d.annualSpendingReal).toBe(48_000)
  })

  it('"One figure" from a governing budget is the escape: the budget strictly undefined, the total kept', () => {
    const { model } = open(TWO)
    fireEvent.click(screen.getByRole('radio', { name: copy.profileLivingApproachOne }))
    save()
    expect(draftOf(model).budget).toBeUndefined()
    expect(draftOf(model).annualSpendingReal).toBe(38_000)
  })

  it('an empty worksheet over NO budget says so under the lines and stays open; the store untouched (never a silent close)', () => {
    const { model, recompute } = open(DEV_SEEDS.retired)
    const before = draftOf(model)
    pickBudget()
    expect(rows()).toHaveLength(0)
    save()
    expect(refused()).toHaveTextContent(copy.budgetApplyEmpty)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(draftOf(model)).toBe(before)
    expect(recompute).not.toHaveBeenCalled()
  })

  it('a fresh line defaults to other + essentials with NO amount, and is silent until touched', () => {
    open(DEV_SEEDS.retired)
    pickBudget()
    addLine()
    const row = rows()[0]!
    expect(row).toHaveTextContent(copy.budgetCatOther)
    expect(within(row).getByRole('radio', { name: copy.budgetTierEssentials })).toBeChecked()
    expect(within(row).getByLabelText(copy.budgetAmountLabel)).toHaveValue('')
    expect(within(row).queryByRole('alert')).toBeNull()
    // Typing, not yet left: still silent.
    const amount = within(row).getByLabelText(copy.budgetAmountLabel)
    fireEvent.focus(amount)
    fireEvent.change(amount, { target: { value: '12' } })
    expect(within(row).queryByRole('alert')).toBeNull()
  })

  it('a fresh untouched line keeps the running total and tier split absent; the first real dollar starts them', () => {
    open(DEV_SEEDS.retired)
    pickBudget()
    addLine()
    expect(readout()).not.toHaveTextContent(slots.budgetRunningTotal(formatMoney(0)))
    typeInto(within(rows()[0]!).getByLabelText(copy.budgetAmountLabel), '12,000')
    expect(readout()).toHaveTextContent(slots.budgetRunningTotal(formatMoney(12_000)))
    expect(readout()).toHaveTextContent(slots.budgetTierSplit(formatMoney(12_000), formatMoney(0)))
  })
})

describe('a line’s errors: its own, on touch or a refused Save, never while typing', () => {
  it('a Save over a line with no amount is refused: the reason under the lines, the line’s own rule under its amount, the store untouched', () => {
    const { model } = open(DEV_SEEDS.retired)
    const before = draftOf(model)
    pickBudget()
    addLine()
    save()
    expect(refused()).toHaveTextContent(copy.budgetApplyBlocked)
    expect(within(rows()[0]!).getByText(copy.errBudgetAmountNonFinite)).toBeInTheDocument()
    expect(draftOf(model)).toBe(before)
  })

  it('an edit to any field marks its LINE touched: the missing amount shows on leave, not at the next Save', () => {
    open(DEV_SEEDS.retired)
    pickBudget()
    addLine()
    typeInto(within(rows()[0]!).getByLabelText(copy.budgetLineLabelLabel), 'Groceries')
    expect(within(rows()[0]!).getByText(copy.errBudgetAmountNonFinite)).toBeInTheDocument()
  })

  it('an amount that does not read as dollars names it on leave', () => {
    open(DEV_SEEDS.retired)
    pickBudget()
    addLine()
    const amount = within(rows()[0]!).getByLabelText(copy.budgetAmountLabel)
    typeInto(amount, 'garbage')
    expect(amount).toHaveAttribute('aria-invalid', 'true')
    expect(within(rows()[0]!).getByRole('alert')).toBeInTheDocument()
  })

  it('one bad line does not leak its error onto a clean sibling: untouched it is silent, after a refused Save only it speaks', () => {
    const { model } = open(governed([line({ id: 'a' }), line({ id: 'b', category: 'travel', label: 'Trips', annualAmountReal: -1 })]))
    typeInto(within(rows()[0]!).getByLabelText(copy.budgetLineLabelLabel), 'Food')
    expect(within(rows()[1]!).queryByRole('alert'), 'the bad line was never touched').toBeNull()
    save()
    expect(refused()).toHaveTextContent(copy.budgetApplyBlocked)
    expect(within(rows()[0]!).queryByRole('alert')).toBeNull()
    expect(within(rows()[1]!).getAllByRole('alert').map((a) => a.textContent)).toEqual([copy.errBudgetAmountNegative])
    expect(draftOf(model).budget![0]!.label, 'nothing refused reaches the store').toBe('')
  })

  it.each([
    ['a negative start year', { startYear: -2 }, copy.errBudgetWindowNegativeStart],
    ['a non-integer start year', { startYear: 2.5 }, copy.errBudgetWindowNonInteger],
  ] as const)('%s a stored line carries names its own rule once the line is touched', (_name, patch, words) => {
    open(governed([line({ id: 'a', ...patch })]))
    typeInto(within(rows()[0]!).getByLabelText(copy.budgetLineLabelLabel), 'Food')
    expect(within(rows()[0]!).getByText(words)).toBeInTheDocument()
  })

  it('a reversed window (through before from) names the swap on leave, and Save is refused', () => {
    const { model } = open(DEV_SEEDS.retired)
    pickBudget()
    addLine()
    const row = rows()[0]!
    typeInto(within(row).getByLabelText(copy.budgetAmountLabel), '12,000')
    typeInto(within(row).getByLabelText(copy.budgetWindowFromLabel), '5')
    typeInto(within(row).getByLabelText(copy.budgetWindowThroughLabel), '2')
    expect(within(row).getByText(copy.errBudgetWindowReversed)).toBeInTheDocument()
    save()
    expect(draftOf(model).budget).toBeUndefined()
  })

  // ultramode 2026-07-02 (P2/P3): the through-year must NOT silently swallow an invalid non-empty entry as lifelong.
  // Empty is lifelong (valid); "2.5" or "-3" is a typo every other field surfaces, and Save must not commit past it.
  it.each(['2.5', '-3'])('a through-year typed as %s names the whole-years rule on leave, and Save does not commit the line as lifelong', (typed) => {
    const { model } = open(DEV_SEEDS.retired)
    pickBudget()
    addLine()
    const row = rows()[0]!
    typeInto(within(row).getByLabelText(copy.budgetAmountLabel), '12,000')
    const through = within(row).getByLabelText(copy.budgetWindowThroughLabel)
    typeInto(through, typed)
    expect(through).toHaveAttribute('aria-invalid', 'true')
    expect(within(row).getByRole('alert')).toBeInTheDocument()
    save()
    expect(draftOf(model).budget, 'never committed as a lifelong line past the typo on screen').toBeUndefined()
  })
})

describe('warnings never block', () => {
  const start = { ...DEV_SEEDS.retired, health: { ...DEV_SEEDS.retired.health, oopMedicalAnnual: M } }

  it('an all-extras budget warns about the empty floor, never as an alert, and still saves', () => {
    const { model } = open(start)
    pickBudget()
    addLine()
    const row = rows()[0]!
    fireEvent.click(within(row).getByRole('radio', { name: copy.budgetTierDiscretionary }))
    typeInto(within(row).getByLabelText(copy.budgetAmountLabel), '9,000')
    expect(readout()).toHaveTextContent(copy.budgetWarnZeroEssentials)
    expect(within(row).queryByRole('alert')).toBeNull()
    save()
    expect(draftOf(model).budget).toHaveLength(1)
    expect(draftOf(model).annualSpendingReal).toBe(9_000 + M)
  })

  it('a budget with no line active at year 0 warns about the silent anchor and still saves', () => {
    const { model } = open(start)
    pickBudget()
    addLine()
    const row = rows()[0]!
    typeInto(within(row).getByLabelText(copy.budgetAmountLabel), '9,000')
    typeInto(within(row).getByLabelText(copy.budgetWindowFromLabel), '3')
    expect(readout()).toHaveTextContent(copy.budgetWarnNoYearZero)
    save()
    expect(draftOf(model).budget).toHaveLength(1)
    expect(draftOf(model).annualSpendingReal, 'nothing at year 0: the total is M alone').toBe(M)
  })
})

describe('line identity (schema version 6)', () => {
  it('each Add mints a fresh id, two identical lines two ids, never one the plan holds or a kept what-if names', () => {
    const start = governed([line({ id: 'line-held' })], {
      keptWhatIfs: [{ id: 'wi-held', name: 'n', levers: [{ kind: 'spending', op: 'remove', lineId: 'line-named' }] }],
    })
    const held = idsInUse(start)
    expect([...held], '[test setup] the plan holds and names ids').toEqual(expect.arrayContaining(['line-held', 'wi-held', 'line-named']))
    const { model } = open(start)
    addLine()
    addLine()
    typeInto(within(rows()[1]!).getByLabelText(copy.budgetAmountLabel), '1,000')
    typeInto(within(rows()[2]!).getByLabelText(copy.budgetAmountLabel), '1,000')
    save()
    const items = draftOf(model).budget!
    expect(items).toHaveLength(3)
    expect(items[0]!.id).toBe('line-held')
    const [a, b] = [items[1]!.id!, items[2]!.id!]
    expect(a).toMatch(/^[0-9a-f]{24}$/)
    expect(b).toMatch(/^[0-9a-f]{24}$/)
    expect(a).not.toBe(b)
    for (const id of held) expect([a, b]).not.toContain(id)
  })

  it('an edit keeps the line’s id; a cleared through-year is lifelong with the endYear key ABSENT (DND 009), and empty is no error', () => {
    const { model } = open(governed([line({ id: 'line-kept', endYear: 12 })]))
    const row = rows()[0]!
    typeInto(within(row).getByLabelText(copy.budgetAmountLabel), '45,000')
    typeInto(within(row).getByLabelText(copy.budgetWindowThroughLabel), '')
    expect(within(row).queryByRole('alert')).toBeNull()
    save()
    const items = draftOf(model).budget!
    expect(items).toEqual([line({ id: 'line-kept', annualAmountReal: 45_000 })])
    expect('endYear' in items[0]!, 'absent, never an undefined-valued key').toBe(false)
    expect(draftOf(model).annualSpendingReal).toBe(45_000 + M)
  })

  it('removing a middle row keeps its neighbours’ values', () => {
    const { model } = open(
      governed([
        line({ id: 'g', label: 'Groceries', annualAmountReal: 18_000 }),
        line({ id: 't', category: 'travel', label: 'Trips', annualAmountReal: 6_000, tier: 'discretionary' }),
        line({ id: 'f', category: 'gifts', label: 'Gifts', annualAmountReal: 3_000, tier: 'discretionary' }),
      ]),
    )
    fireEvent.click(screen.getByRole('button', { name: slots.budgetRemoveLine('Trips') }))
    expect(rows().map((r) => within(r).getByLabelText<HTMLInputElement>(copy.budgetAmountLabel).value)).toEqual(['18,000', '3,000'])
    save()
    const items = draftOf(model).budget!
    expect(items.map((i) => i.label)).toEqual(['Groceries', 'Gifts'])
    expect(items.map((i) => i.annualAmountReal)).toEqual([18_000, 3_000])
  })
})

describe('the Out-of-pocket medical drawer', () => {
  it('under a governing budget, Save re-reconciles the total in the same write ($30,000 at year 0 + $20,000)', () => {
    const { model } = open(TWO, { kind: 'medical' })
    typeInto(screen.getByLabelText(copy.oopLabel), '20,000')
    save()
    expect(draftOf(model).health.oopMedicalAnnual).toBe(20_000)
    expect(draftOf(model).budget).toHaveLength(2)
    expect(draftOf(model).annualSpendingReal).toBe(50_000)
  })
})

describe('the Expenses card’s tier readback and ramp note (the governed face, after the walk)', () => {
  it('reads essentials vs extras from the lines active at year 0 only (M rides its own card); a ramped budget carries the anchor note', () => {
    const d = governed([
      line({ id: 'a' }),
      line({ id: 'b', category: 'travel', annualAmountReal: 12_000, tier: 'discretionary' }),
      line({ id: 'c', category: 'gifts', annualAmountReal: 5_000, tier: 'discretionary', startYear: 2 }),
    ])
    expect(budgetTierSplitAtZero(d.budget)).toEqual({ essentials: 30_000, extras: 12_000 })
    const note = expensesView(d).cards.find((c) => c.id === 'living')!.note
    expect(note).toContain(slots.budgetTierSplit(formatMoney(30_000), formatMoney(12_000)))
    expect(note).toContain(copy.budgetAnchorRampNote)
  })

  it('a lifelong-at-0 budget carries no ramp note', () => {
    const note = expensesView(governed([line({ id: 'a' })])).cards.find((c) => c.id === 'living')!.note
    expect(note).not.toContain(copy.budgetAnchorRampNote)
  })
})
