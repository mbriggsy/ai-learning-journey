// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Result } from '../Result'
import { appModel } from '../appModel'
import { resolvedFocusKey, selectElevatedAnswer } from '../answerView'
import { copy, slots } from '@ui/copy'
import { DEV_SEEDS } from '../devSeeds'
import { DATE_FIXTURES, DATE_WINDOW_TOP } from '../preview/dateFixtures'

/*
 * The pay check's KTD21 standing line, wired through Result (`docs/plans/features/working-year-pay-check-build-spec.md`
 * U8): Result reads the ONE stale predicate off the draft and hands FuckOffDate the line iff W is stale;
 * its door opens the assumptions panel AT the W row; a read-only tab reads the line with no door; and the
 * seat is dropped on close, so the plain Assumptions door never re-lands on W.
 *
 * Harness: the resultAssumptionsDoor precedent — the module appModel is real (drafts reset per test), and
 * the elevated hero is module-mocked to a resolved DATE view (the line lives on the date hero only), with a
 * planted focus key so the quiet doors render. No engine run: the line reads the draft, never the wire.
 */

vi.mock('../answerView', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../answerView')>()
  return { ...actual, resolvedFocusKey: vi.fn(actual.resolvedFocusKey), selectElevatedAnswer: vi.fn(actual.selectElevatedAnswer) }
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

const pristineDraft = appModel.getSnapshot().draft
const confirmedDate = { kind: 'dates', floor: DATE_FIXTURES.confirmed, lifestyle: DATE_FIXTURES.confirmed, windowTopYears: DATE_WINDOW_TOP } as const

afterEach(() => {
  cleanup()
  appModel.update(() => pristineDraft)
  vi.mocked(resolvedFocusKey).mockReset()
  vi.mocked(selectElevatedAnswer).mockReset()
  document.documentElement.classList.remove('control-sheet-open')
})

function plantDateHero() {
  vi.mocked(resolvedFocusKey).mockReturnValue('planted-focus-key')
  vi.mocked(selectElevatedAnswer).mockReturnValue({ kind: 'date', view: confirmedDate })
}

const line = () => document.querySelector('.cs-paycheck-note')
const lineDoor = () => screen.queryByRole('button', { name: copy.stalenessPayCheckCta })
const wRowName = () =>
  document.querySelector('[data-assumption-seat="working-year-cost"] .ap-row__name') as HTMLElement | null

describe('the pay check’s standing line through Result (KTD21)', () => {
  it('a STALE W puts the line on the date hero; its door opens the panel and lands on the W row', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datecoststale)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(line()?.textContent).toContain(copy.stalenessPayCheckNote)
    fireEvent.click(lineDoor()!)
    expect(screen.getByRole('heading', { name: copy.assumptionTitle })).toBeInTheDocument()
    expect(document.activeElement).toBe(wRowName())
  })

  it('a W that still matches reads no line', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.dateshort)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(line()).toBeNull()
  })

  it('a READ-ONLY tab states the fact with no door', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datecoststale)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} readOnly />)
    // The lead, then the W step's own stale sentence: both figures and the cause that moved.
    expect(line()?.textContent).toBe(`${copy.stalenessPayCheckNote} ${slots.workingCostStaleQuote('84,000', '78,000')}`)
    expect(lineDoor()).toBeNull()
  })

  it('the seat drops on close: the plain Assumptions door afterwards keeps the sheet’s own landing', async () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datecoststale)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    fireEvent.click(lineDoor()!)
    expect(document.activeElement).toBe(wRowName())
    // Close through the panel's own quiet Close (the sheet animates out, so wait for it to go).
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: copy.leverCancel }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: copy.assumptionTitle })).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: copy.assumptionDoorCta }))
    expect(screen.getByRole('heading', { name: copy.assumptionTitle })).toBeInTheDocument()
    expect(document.activeElement).not.toBe(wRowName())
  })
})
