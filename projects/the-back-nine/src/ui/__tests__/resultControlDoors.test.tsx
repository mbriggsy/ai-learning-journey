// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Result } from '../Result'
import { appModel } from '../appModel'
import { resolvedFocusKey } from '../answerView'
import { copy } from '@ui/copy'
import type { EnteredAccount } from '@shared/model'

/**
 * The Result screen's two U10 control doors (P3·U10, R9/R11 — quiet, invited, never a badge).
 *
 * The GATING LAW under test (the door predicates read the DRAFT, never re-derive the answer):
 *  - sequencing: a resolved reading + ≥1 entered account (an order over zero accounts is inert).
 *  - Roth: a resolved reading + a CATEGORICAL fact only — filing status. It reads NO financial
 *    field: an mfj household with zero pre-tax money STILL gets the door (the lever's own closed
 *    face handles $0-pre-tax), and a single filer never does. Both doors re-word when already tuned.
 *
 * resolvedFocusKey is module-mocked (the resultBudgetDoor.test precedent) so the presence arms can
 * plant a resolved reading without standing up the engine worker.
 */

vi.mock('../answerView', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../answerView')>()
  return { ...actual, resolvedFocusKey: vi.fn(actual.resolvedFocusKey) }
})

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
  appModel.update(() => pristineDraft) // the module singleton must not leak between tests
  mockFocusKey.mockReset()
  vi.restoreAllMocks()
})

const renderResult = () => render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
const plantResolved = () => mockFocusKey.mockReturnValue('planted-focus-key')

const pretaxAccount: EnteredAccount = { ownerIndex: 0, kind: 'traditional-ira', valueToday: 500_000 }
const brokerageAccount: EnteredAccount = { ownerIndex: 0, kind: 'brokerage', valueToday: 200_000 }

const seqDoor = () => screen.queryByRole('button', { name: copy.leverSequencingCta })
const seqEditDoor = () => screen.queryByRole('button', { name: copy.leverSequencingEditCta })
const rothDoor = () => screen.queryByRole('button', { name: copy.leverRothDoorCta })
const rothEditDoor = () => screen.queryByRole('button', { name: copy.leverRothDoorEditCta })

describe('the sequencing door — a resolved reading AND at least one entered account', () => {
  it('present with ≥1 account', () => {
    plantResolved()
    appModel.update((d) => ({ ...d, enteredAccounts: [pretaxAccount] }))
    renderResult()
    expect(seqDoor()).toBeInTheDocument()
  })

  it('GONE when there are no entered accounts (an order over zero buckets is inert)', () => {
    plantResolved()
    appModel.update((d) => ({ ...d, enteredAccounts: [] }))
    renderResult()
    expect(seqDoor()).toBeNull()
    expect(seqEditDoor()).toBeNull()
  })

  it('re-words to "revisit" when a non-proportional policy already governs', () => {
    plantResolved()
    appModel.update((d) => ({ ...d, enteredAccounts: [pretaxAccount], drawdownPolicy: 'taxable-first' }))
    renderResult()
    expect(seqEditDoor()).toBeInTheDocument()
    expect(seqDoor()).toBeNull()
  })

  it('absent with no resolved reading, even with accounts (the real gate over the empty model)', () => {
    appModel.update((d) => ({ ...d, enteredAccounts: [pretaxAccount] }))
    renderResult()
    expect(seqDoor()).toBeNull()
  })
})

describe('the Roth door — categorical on filing status alone', () => {
  it('present for an mfj household + a resolved reading', () => {
    plantResolved()
    appModel.update((d) => ({ ...d, filing: 'mfj' }))
    renderResult()
    expect(rothDoor()).toBeInTheDocument()
  })

  it('ABSENT for a single filer', () => {
    plantResolved()
    appModel.update((d) => ({ ...d, filing: 'single' }))
    renderResult()
    expect(rothDoor()).toBeNull()
    expect(rothEditDoor()).toBeNull()
  })

  it('STILL present for an mfj household with money but ZERO pre-tax (the door reads no financial field)', () => {
    plantResolved()
    appModel.update((d) => ({ ...d, filing: 'mfj', enteredAccounts: [brokerageAccount] }))
    renderResult()
    expect(rothDoor()).toBeInTheDocument()
  })

  it('re-words to "revisit" when a conversion is already applied', () => {
    plantResolved()
    appModel.update((d) => ({
      ...d,
      filing: 'mfj',
      rothConversion: { annualAmountReal: 40_000, startYearOffset: 2, years: 5 },
    }))
    renderResult()
    expect(rothEditDoor()).toBeInTheDocument()
    expect(rothDoor()).toBeNull()
  })

  it('absent with no resolved reading, even for an mfj household', () => {
    appModel.update((d) => ({ ...d, filing: 'mfj' }))
    renderResult()
    expect(rothDoor()).toBeNull()
  })
})
