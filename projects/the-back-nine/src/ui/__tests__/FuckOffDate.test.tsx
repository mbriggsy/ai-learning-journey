// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FuckOffDate } from '../FuckOffDate'
import { copy, slots } from '../copy'
import { dateOddsText } from '../dateOdds'
import { DATE_FIXTURES, DATE_WINDOW_TOP } from '../preview/dateFixtures'

/*
 * The D2 elevated fuck-off-date surface. The honesty pins: the three first-class outcomes each read
 * correctly (confirmed / window-edge / no-date), free-today is its own lead, the odds come from the
 * conservative grade, and the window-edge + non-monotone disclosures are never dropped.
 */
afterEach(cleanup)

const dates = (track: (typeof DATE_FIXTURES)[keyof typeof DATE_FIXTURES]) =>
  ({ kind: 'dates', track, windowTopYears: DATE_WINDOW_TOP }) as const

describe('FuckOffDate — the D2 landed date surface', () => {
  it('confirmed-date reads "your fuck-off date is about N years out" + the conservative odds', () => {
    const f = DATE_FIXTURES.confirmed // offsetYears 4
    const { container } = render(<FuckOffDate view={dates(f)} />)
    expect(screen.getByRole('heading', { name: slots.dateInYears(4) })).toBeInTheDocument()
    expect(container.textContent).toContain(dateOddsText(f.grade.quantizedLowerBound))
  })

  it('a clean confirmed date carries the date↔confidence tradeoff line (R28)', () => {
    // the confirmed fixture's curve crowns at 4 (9 of 10) with an earlier 8-of-10 point at offset 3
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} />)
    expect(container.textContent).toContain(slots.dateTradeoff(1, slots.xOfTen(8)))
  })

  it('the window-edge and non-monotone cases SUPPRESS the tradeoff (their disclosure is the priority)', () => {
    const edge = render(<FuckOffDate view={dates(DATE_FIXTURES.windowEdge)} />)
    expect(edge.container.textContent).not.toContain('sooner')
    expect(edge.container.textContent).toContain(copy.dateWindowEdgeNote)
    edge.unmount()

    const nm = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmedNonMonotone)} />)
    expect(nm.container.textContent).not.toContain('sooner')
    expect(nm.container.textContent).toContain(copy.dateNonMonotoneNote)
  })

  it('free-today (Y=0) leads with the "today" headline, not an N-years line', () => {
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.freeToday)} />)
    expect(screen.getByRole('heading', { name: copy.dateFreeToday })).toBeInTheDocument()
    expect(container.textContent).not.toContain('years out')
  })

  it('no-date-in-window is a calm first-class answer naming its window, with no odds', () => {
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.noDate)} />)
    expect(container.textContent).toContain(slots.noDateInWindow(DATE_WINDOW_TOP))
    expect(container.textContent).not.toContain('odds')
  })

  it('window-edge renders its edge-of-window disclosure (never silently crowned as confirmed)', () => {
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.windowEdge)} />)
    expect(container.textContent).toContain(copy.dateWindowEdgeNote)
  })

  it('a non-monotone (ACA-cliff) result renders the non-monotone disclosure', () => {
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmedNonMonotone)} />)
    expect(container.textContent).toContain(copy.dateNonMonotoneNote)
  })

  it('a clean confirmed date carries NO non-monotone disclosure (the disclosure is conditional)', () => {
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} />)
    expect(container.textContent).not.toContain(copy.dateNonMonotoneNote)
  })

  it('pending shows the working line; compute-error shows the snag line + a retry that fires', () => {
    const pending = render(<FuckOffDate view={{ kind: 'pending' }} />)
    expect(pending.container.textContent).toContain(copy.answerPending)
    pending.unmount()

    const onRetry = vi.fn()
    render(<FuckOffDate view={{ kind: 'compute-error', onRetry }} />)
    expect(screen.getByText(copy.answerError, { exact: false })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.answerRetry }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('labels the region and exposes the date as a heading (the a11y landing target)', () => {
    render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} />)
    expect(screen.getByRole('region', { name: copy.dateRegionLabel })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: slots.dateInYears(4) })).toBeInTheDocument()
  })

  it('focusSignal lands focus on the date headline (the magic-moment announce)', () => {
    const { rerender } = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} focusSignal={1} />)
    const heading = screen.getByRole('heading', { name: slots.dateInYears(4) })
    expect(document.activeElement).toBe(heading)
    heading.blur()
    rerender(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} focusSignal={2} />)
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: slots.dateInYears(4) }))
  })
})
