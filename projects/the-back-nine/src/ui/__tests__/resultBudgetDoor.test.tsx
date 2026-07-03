// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Result } from '../Result'
import { appModel } from '../appModel'
import { resolvedFocusKey } from '../answerView'
import { copy, slots } from '@ui/copy'
import { formatMoney } from '@intake/fields'
import type { BudgetLineItem } from '@shared/model'

/**
 * The Result screen's ONE budget door (U9b — council 2026-07-02 Q1/R8): a quiet
 * affordance on the LANDED answer opens the budget-builder sheet; a governing budget
 * re-words the same door; no resolved reading, no door (an affordance we don't want
 * used on a non-answer shouldn't exist). The door is gated on `resolvedFocusKey`
 * being defined — module-mocked here so the presence arms can plant a resolved
 * reading without standing up the engine worker; the ABSENT arm uses the real
 * implementation against the empty jsdom appModel (fallback ⇒ undefined).
 *
 * The apply/escape arms pin Result's OWN commit wiring: the atomic patch lands in
 * the real appModel (annualSpendingReal === Σactive@0 + M — the OOP figure read from
 * the store's CURRENT draft inside the update, insight 036) and the provisional→final
 * background sharpen is requested (recompute spied — jsdom has no worker).
 */

vi.mock('../answerView', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../answerView')>()
  return { ...actual, resolvedFocusKey: vi.fn(actual.resolvedFocusKey) }
})

// jsdom has no matchMedia (the sheet's useReducedMotion reads it) — benign stub.
vi.stubGlobal(
  'matchMedia',
  (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
)

const mockFocusKey = vi.mocked(resolvedFocusKey)
const pristineDraft = appModel.getSnapshot().draft

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('budget-sheet-open')
  appModel.update(() => pristineDraft) // the module singleton must not leak between tests
  mockFocusKey.mockReset()
  vi.restoreAllMocks()
})

const line = (patch?: Partial<BudgetLineItem>): BudgetLineItem => ({
  category: 'food',
  label: '',
  annualAmountReal: 30_000,
  tier: 'essentials',
  startYear: 0,
  ...patch,
})

const renderResult = (computing = false) =>
  render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={computing} />)

const plantResolved = () => mockFocusKey.mockReturnValue('planted-focus-key')

const commitField = (input: HTMLElement, value: string) => {
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

describe('the budget door — presence + wording', () => {
  it('NO resolved reading (the real gate over the empty model) ⇒ NO door', () => {
    renderResult()
    expect(screen.queryByRole('button', { name: copy.budgetCta })).toBeNull()
    expect(screen.queryByRole('button', { name: copy.budgetEditCta })).toBeNull()
  })

  it('a resolved reading with NO governing budget offers "break down your spending"', () => {
    plantResolved()
    renderResult()
    expect(screen.getByRole('button', { name: copy.budgetCta })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.budgetEditCta })).toBeNull()
  })

  it('a GOVERNING budget re-words the SAME door to edit (one door, two words — never two doors)', () => {
    plantResolved()
    appModel.update((d) => ({ ...d, budget: [line()], annualSpendingReal: 30_000 }))
    renderResult()
    expect(screen.getByRole('button', { name: copy.budgetEditCta })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.budgetCta })).toBeNull()
  })

  it('while the answer is COMPUTING the door is withheld with the whole actions row', () => {
    plantResolved()
    renderResult(true)
    expect(screen.queryByRole('button', { name: copy.budgetCta })).toBeNull()
  })

  it('the door opens the sheet', () => {
    plantResolved()
    renderResult()
    fireEvent.click(screen.getByRole('button', { name: copy.budgetCta }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: copy.budgetSheetTitle })).toBeInTheDocument()
  })
})

describe('the budget door — Result’s commit wiring', () => {
  it('Apply lands the ATOMIC patch in the store (Σactive@0 + M) and requests the provisional→final sharpen', async () => {
    plantResolved()
    const recompute = vi.spyOn(appModel, 'recompute').mockResolvedValue(undefined as never)
    appModel.update((d) => ({
      ...d,
      annualSpendingReal: 40_000,
      health: { ...d.health, oopMedicalAnnual: 5_000 },
    }))
    renderResult()
    fireEvent.click(screen.getByRole('button', { name: copy.budgetCta }))

    fireEvent.click(screen.getByRole('button', { name: copy.budgetAddLine }))
    commitField(screen.getByLabelText(copy.budgetAmountLabel), '35,000')
    fireEvent.click(screen.getByRole('button', { name: copy.budgetApply }))

    const d = appModel.getSnapshot().draft
    expect(d.budget).toHaveLength(1)
    expect(d.budget![0]!.annualAmountReal).toBe(35_000)
    expect(d.annualSpendingReal).toBe(40_000) // 35k lines + 5k injected medical — the reconciled anchor
    await waitFor(() => expect(recompute).toHaveBeenCalledWith('provisional'))
    await waitFor(() => expect(recompute).toHaveBeenCalledWith('final'))
    // The sheet closed; the door now reads EDIT (the store's budget governs).
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: copy.budgetEditCta })).toBeInTheDocument()
  })

  it('the escape clears the budget to strictly-undefined, keeps the last reconciled scalar, and re-words the door back', async () => {
    plantResolved()
    const recompute = vi.spyOn(appModel, 'recompute').mockResolvedValue(undefined as never)
    appModel.update((d) => ({
      ...d,
      budget: [line()],
      annualSpendingReal: 38_000,
      health: { ...d.health, oopMedicalAnnual: 8_000 },
    }))
    renderResult()
    fireEvent.click(screen.getByRole('button', { name: copy.budgetEditCta }))
    fireEvent.click(screen.getByRole('button', { name: copy.budgetBackToSingle }))

    const d = appModel.getSnapshot().draft
    expect(d.budget).toBeUndefined()
    expect(d.annualSpendingReal).toBe(38_000) // untouched — the scalar keeps governing
    await waitFor(() => expect(recompute).toHaveBeenCalledWith('provisional'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: copy.budgetCta })).toBeInTheDocument()
  })

  it('close-without-apply commits NOTHING (the sheet is a scratchpad until Apply)', async () => {
    plantResolved()
    appModel.update((d) => ({ ...d, annualSpendingReal: 40_000 }))
    renderResult()
    fireEvent.click(screen.getByRole('button', { name: copy.budgetCta }))
    fireEvent.click(screen.getByRole('button', { name: copy.budgetAddLine }))
    commitField(screen.getByLabelText(copy.budgetAmountLabel), '22,000')
    fireEvent.click(screen.getByRole('button', { name: copy.budgetCancel }))

    const d = appModel.getSnapshot().draft
    expect(d.budget).toBeUndefined()
    expect(d.annualSpendingReal).toBe(40_000)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('the sheet reads the SAME draft the answer used', () => {
  it('the reconciliation readout quotes the store’s live S and the netted target', () => {
    plantResolved()
    appModel.update((d) => ({
      ...d,
      annualSpendingReal: 90_000,
      health: { ...d.health, oopMedicalAnnual: 12_000 },
    }))
    renderResult()
    fireEvent.click(screen.getByRole('button', { name: copy.budgetCta }))
    expect(screen.getByText(slots.budgetAnchorLead(formatMoney(90_000)))).toBeInTheDocument()
    expect(screen.getByText(slots.budgetLinesTarget(formatMoney(78_000)))).toBeInTheDocument()
    expect(screen.getByText(slots.budgetMedicalCarried(formatMoney(12_000)))).toBeInTheDocument()
  })
})
