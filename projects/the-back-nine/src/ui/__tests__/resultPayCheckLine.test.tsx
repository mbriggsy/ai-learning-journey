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
    // The lead, then the W step's own stale sentence: both figures and the cause that moved ($84,000 held
    // above $78,000 now — the safe side, so no lean is said).
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

// Build 2's U14 (R12): the same slot, keyed by cause. A moved left over speaks in the slot with its own lead
// and door (opening the left-over seat), unless a rules line hosted it at unlock (`leftOverClauseHost`), when
// the two figures ride the hero's rules note instead; a "saved" answer waiting on W adds its clause to W's line.
const leftOverDoor = () => screen.queryByRole('button', { name: copy.stalenessLeftOverCta })
const leftOverSeatName = () =>
  document.querySelector('[data-assumption-seat="working-year-left-over"] .ap-row__name') as HTMLElement | null
const MOVED = slots.stalenessLeftOverMoved('16,985', '27,537', '16,985')

describe('build 2’s left-over lines through Result (U14, R12)', () => {
  it('`datesavedmoved`: the slot names both figures under its OWN lead — never W’s — and its door lands on the left-over seat', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedmoved)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(line()?.textContent).toContain(`${copy.stalenessLeftOverNote} ${MOVED}`)
    expect(line()?.textContent).not.toContain(copy.stalenessPayCheckNote)
    expect(lineDoor(), 'no W door').toBeNull()
    fireEvent.click(leftOverDoor()!)
    expect(screen.getByRole('heading', { name: copy.assumptionTitle })).toBeInTheDocument()
    expect(document.activeElement).toBe(leftOverSeatName())
  })

  it('a READ-ONLY tab states the moved left over with no door', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedmoved)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} readOnly />)
    expect(line()?.textContent).toBe(`${copy.stalenessLeftOverNote} ${MOVED}`)
    expect(leftOverDoor()).toBeNull()
  })

  it('where a rules line hosted it at unlock, the two figures ride the hero’s rules note, and the slot says nothing (one cause, one line)', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedmoved)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} stalenessNote leftOverClauseHost />)
    expect(document.querySelector('.cs-staleness-note')?.textContent).toBe(
      `${copy.stalenessHeroNote} ${slots.stalenessLeftOverClause('16,985', '27,537', '16,985')}`,
    )
    expect(line()).toBeNull()
  })

  it('`datesavedstale`: W’s one line carries the clause naming the $16,985 not added; no moved line speaks', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedstale)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} readOnly />)
    expect(line()?.textContent).toBe(
      `${copy.stalenessPayCheckNote} ${slots.workingCostStaleQuote('84,000', '78,000')} ${slots.workingCostStaleLeftOverClause('16,985')}`,
    )
  })

  // The U11 walk's (ae): where the spending ROSE past the yes, the Result's line carries the year-level lean, the
  // clause and the most a check at the quote adds (year 0 at $90,000, hand-derived: 150,000 − 11,475 − 17,540 −
  // 20,000 − 90,000 = $10,985) — and where year 0 at the quote is short, that a check adds none of it and the
  // short-year lean (at $105,000: −$4,015).
  it('`datesavedrisen` and `datesavedrisenshort`: W’s line carries the year-level lean, then what a check at the quote adds — at most $10,985, or none of the $16,985', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedrisen)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} readOnly />)
    expect(line()?.textContent).toBe(
      [
        copy.stalenessPayCheckNote,
        slots.workingCostStaleQuote('84,000', '90,000'),
        slots.workingCostStaleLeftOverYearsCheaper('84,000'),
        slots.workingCostStaleLeftOverClause('16,985'),
        slots.workingCostStaleLeftOverAtMost('90,000', '10,985'),
      ].join(' '),
    )
    cleanup()
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedrisenshort)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} readOnly />)
    expect(line()?.textContent).toBe(
      [
        copy.stalenessPayCheckNote,
        slots.workingCostStaleQuote('84,000', '105,000'),
        slots.workingCostStaleLeftOverYearsCheaper('84,000'),
        slots.workingCostStaleLeftOverFirstShort('105,000', '4,015', '16,985'),
        copy.workingCostStaleShortUntilChecked,
      ].join(' '),
    )
  })

  it('an absent, spent or not-sure answer shows no left-over line or clause — fresh or with W stale', () => {
    for (const answer of [undefined, { kind: 'spent' }, { kind: 'not-sure' }] as const) {
      for (const base of [DEV_SEEDS.date, DEV_SEEDS.datecoststale]) {
        plantDateHero()
        appModel.update(() => ({ ...base, workingYearLeftOver: answer }))
        render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} stalenessNote leftOverClauseHost />)
        const text = document.body.textContent ?? ''
        expect(text, `${answer?.kind ?? 'absent'}`).not.toContain(copy.stalenessLeftOverNote)
        // Aimed at the clause's live lead (insight 086: a negative on a phrase no string says passes vacuously —
        // this one read 'left over a year is added', which neither the old clause nor the new one says).
        expect(text).not.toContain('Until that figure is checked')
        expect(document.querySelector('.cs-staleness-note')?.textContent).toBe(copy.stalenessHeroNote)
        cleanup()
      }
    }
  })
})
