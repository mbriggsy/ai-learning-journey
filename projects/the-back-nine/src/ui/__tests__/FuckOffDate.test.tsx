// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FuckOffDate } from '../FuckOffDate'
import { copy, slots } from '../copy'
import { dateOddsText } from '../dateOdds'
import { deriveDateBandAnnotations } from '../bandAnnotations'
import { DATE_FIXTURES, DATE_WINDOW_TOP } from '../preview/dateFixtures'
import type { DateBand } from '@shared/model'

/*
 * The D2 elevated fuck-off-date surface. The honesty pins: the three first-class outcomes each read
 * correctly (confirmed / window-edge / no-date), free-today is its own lead, the odds come from the
 * conservative grade, the window-edge + non-monotone disclosures are never dropped, and a crowned date
 * MOUNTS its projection band (slice 2) while a no-date never does.
 */

// The band (mounted for a crowned date) reads useReducedMotion() → matchMedia; jsdom lacks it.
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

// A minimal crowned band: a positive-p90 fan (resolveBandData accepts it) + the engine tag + offset.
const BAND: DateBand = {
  fan: {
    byYear: Array.from({ length: 41 }, (_, t) => ({
      yearsFromNow: t,
      p10: 0,
      p25: 0,
      p50: 500_000,
      p75: 700_000,
      p90: 1_000_000,
      cohortFraction: 1,
    })),
  },
  outcomeState: 'on-track',
  offsetYears: 6,
}

afterEach(cleanup)

// U9b: the view carries BOTH tracks. Aliasing one fixture into both is the value-coincident
// degenerate — composeDateSplit renders the single-date composition, byte-for-byte the pre-split
// surface these assertions were written against.
const dates = (track: (typeof DATE_FIXTURES)[keyof typeof DATE_FIXTURES]) =>
  ({ kind: 'dates', floor: track, lifestyle: track, windowTopYears: DATE_WINDOW_TOP }) as const

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

  it('focusSignal lands focus on the date headline ONCE on landing — a tier sharpen does NOT re-steal it', () => {
    const { rerender, unmount } = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} focusSignal={1} />)
    const heading = screen.getByRole('heading', { name: slots.dateInYears(4) })
    expect(document.activeElement).toBe(heading) // first landing announces
    heading.blur()
    // the provisional→final sharpen can crown a different offset → focusSignal changes, but the announce
    // is once-per-landing: focus must NOT be yanked back from a user who tabbed into the range.
    rerender(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} focusSignal={2} />)
    expect(document.activeElement).not.toBe(heading)
    // a fresh completion (the surface remounts on a Review round-trip) re-announces
    unmount()
    render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} focusSignal={3} />)
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: slots.dateInYears(4) }))
  })

  it('a crowned date MOUNTS the projection band (the slice-2 deliverable) under the date headline', () => {
    const view = {
      kind: 'dates' as const,
      floor: DATE_FIXTURES.confirmed,
      lifestyle: DATE_FIXTURES.confirmed,
      windowTopYears: DATE_WINDOW_TOP,
      band: BAND,
      bandAnnotations: deriveDateBandAnnotations(58, 60, 6, 40),
    }
    render(<FuckOffDate view={view} />)
    // the band drawer mounts: its graph-as-enlarge-button is the affordance (the sibling spine pin)
    expect(screen.getByRole('button', { name: copy.bandStudyRange })).toBeInTheDocument()
  })

  it('a no-date outcome mounts NO band (nothing to plot — the verdict stands alone)', () => {
    render(<FuckOffDate view={dates(DATE_FIXTURES.noDate)} />)
    expect(screen.queryByRole('button', { name: copy.bandStudyRange })).not.toBeInTheDocument()
  })

  it('a crowned date mounts the odds ladder ALWAYS ON DISPLAY (cold-read 2026-07-03) + the R28 plan caveat', () => {
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} />)
    expect(screen.getByText(copy.ladderDisclosure)).toBeInTheDocument() // the section title — always on display
    expect(screen.getByRole('img', { name: copy.ladderCaption })).toBeInTheDocument() // the ladder graphic
    expect(container.textContent).toContain(copy.ladderPlanCaveat)
  })

  it('a NO-DATE outcome plots NO odds-ladder (the Honesty Hawk veto) but DOES name how close it came', () => {
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.noDate)} />)
    expect(screen.queryByText(copy.ladderDisclosure)).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: copy.ladderCaption })).not.toBeInTheDocument()
    // the worded "how close" line stands in for the plot — close-vs-far, no pickable above-line dot
    expect(container.textContent).toContain('The nearest any year came was about')
  })
})

/*
 * U9b — the floor/lifestyle SPLIT arms (council 2026-07-02). The claim assignment is the honesty
 * spine: the hero (work-optional) claim reads the LIFESTYLE track; the floor renders as the
 * subordinate "essentials covered" line, never as the fuck-off date (the shipped v1 gap).
 */
describe('FuckOffDate — the U9b two-track split', () => {
  const split = (
    floor: (typeof DATE_FIXTURES)[keyof typeof DATE_FIXTURES],
    lifestyle: (typeof DATE_FIXTURES)[keyof typeof DATE_FIXTURES],
  ) => ({ kind: 'dates', floor, lifestyle, windowTopYears: DATE_WINDOW_TOP }) as const

  it('the normal split: the HERO is the lifestyle date; the floor reads "essentials covered", never "fuck-off date"', () => {
    const floor = DATE_FIXTURES.confirmed // offset 4
    const { container } = render(<FuckOffDate view={split(floor, DATE_FIXTURES.confirmedLater)} />)
    // The heading claim is the LIFESTYLE date — presenting the easier essentials date as the
    // fuck-off date is the calm-but-wrong sin this arm pins closed.
    expect(screen.getByRole('heading', { name: slots.dateInYears(9) })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: slots.dateInYears(4) })).not.toBeInTheDocument()
    expect(container.textContent).toContain(
      slots.dateFloorCovered(4, dateOddsText(floor.grade.quantizedLowerBound), false),
    )
    // Not inverted — the disclosure must NOT cry wolf on the expected ordering.
    expect(container.textContent).not.toContain(copy.dateFloorInversionNote)
  })

  it('the R27 inversion (floor LATER than lifestyle) renders the floor line AFTER the hero WITH the subsidy-cause disclosure', () => {
    const { container } = render(<FuckOffDate view={split(DATE_FIXTURES.confirmedLater, DATE_FIXTURES.confirmed)} />)
    expect(screen.getByRole('heading', { name: slots.dateInYears(4) })).toBeInTheDocument()
    expect(container.textContent).toContain(
      slots.dateFloorCovered(9, dateOddsText(DATE_FIXTURES.confirmedLater.grade.quantizedLowerBound), false),
    )
    expect(container.textContent).toContain(copy.dateFloorInversionNote)
  })

  it('the EXTREME inversion (floor no-date, lifestyle dated) states the floor fact + the why — never reordered away', () => {
    const { container } = render(<FuckOffDate view={split(DATE_FIXTURES.noDate, DATE_FIXTURES.confirmed)} />)
    expect(screen.getByRole('heading', { name: slots.dateInYears(4) })).toBeInTheDocument()
    expect(container.textContent).toContain(slots.dateFloorNotWithin(DATE_WINDOW_TOP))
    expect(container.textContent).not.toContain(slots.dateFloorNotWithinEither(DATE_WINDOW_TOP))
    expect(container.textContent).toContain(copy.dateFloorInversionNote)
  })

  it('the MIXED arm (floor dated, lifestyle no-date): the no-date hero reads the LIFESTYLE window + how-close, the floor line still relieves, and the FLOOR-crowned band mounts WITH its track note', () => {
    const view = {
      kind: 'dates' as const,
      floor: DATE_FIXTURES.confirmed,
      lifestyle: DATE_FIXTURES.noDate,
      windowTopYears: DATE_WINDOW_TOP,
      band: BAND,
      bandAnnotations: deriveDateBandAnnotations(58, 60, 4, 40),
    }
    const { container } = render(<FuckOffDate view={view} />)
    expect(screen.getByRole('heading', { name: slots.noDateInWindow(DATE_WINDOW_TOP) })).toBeInTheDocument()
    expect(container.textContent).toContain('The nearest any year came was about')
    expect(container.textContent).toContain(
      slots.dateFloorCovered(4, dateOddsText(DATE_FIXTURES.confirmed.grade.quantizedLowerBound), false),
    )
    // The single FLOOR-crowned band still draws (the engine emitted it — the floor crowned), and
    // the track note names what the range follows so it can never contradict the no-date hero.
    expect(screen.getByRole('button', { name: copy.bandStudyRange })).toBeInTheDocument()
    expect(container.textContent).toContain(copy.bandFollowsFloorNote)
    // A no-date HERO still plots no ladder (the Hawk veto rides the claim, not the band).
    expect(screen.queryByText(copy.ladderDisclosure)).not.toBeInTheDocument()
  })

  it('BOTH no-date with different how-close curves: the quiet severity line ("either"), no inversion note', () => {
    // A second no-date track whose curve peaks differently — value-inequality forces the split.
    const worseNoDate = {
      ...DATE_FIXTURES.noDate,
      curve: DATE_FIXTURES.noDate.curve.map((r) => ({
        ...r,
        quantizedLowerBound: Math.max(0, r.quantizedLowerBound - 0.2),
        survivalFraction: Math.max(0, r.survivalFraction - 0.2),
      })),
    }
    const { container } = render(<FuckOffDate view={split(worseNoDate, DATE_FIXTURES.noDate)} />)
    expect(container.textContent).toContain(slots.dateFloorNotWithinEither(DATE_WINDOW_TOP))
    expect(container.textContent).not.toContain(copy.dateFloorInversionNote)
  })

  it('the degenerate (value-coincident tracks) renders NO floor line and NO track note — the single composition verbatim', () => {
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} />)
    expect(container.textContent).not.toContain('essentials')
    expect(container.textContent).not.toContain(copy.bandFollowsFloorNote)
  })

  it('the SPLIT ladder reads the LIFESTYLE track (it explains the work-optional claim), not the floor', () => {
    // floor crowns at 4; lifestyle at 9 — the ladder's crown aria names the lifestyle offset.
    const { container } = render(<FuckOffDate view={split(DATE_FIXTURES.confirmed, DATE_FIXTURES.confirmedLater)} />)
    expect(container.textContent).toContain(copy.ladderDisclosure)
    const crownAria = slots.ladderMarkAria(
      9,
      slots.xOfTen(Math.round(DATE_FIXTURES.confirmedLater.grade.quantizedLowerBound * 10)),
      'crown',
    )
    expect(screen.getByLabelText(crownAria)).toBeInTheDocument()
  })

  it('a HERO-claim change across a tier sharpen reaches AT through the polite live region (focus never re-fires)', () => {
    const { container, rerender } = render(
      <FuckOffDate view={split(DATE_FIXTURES.confirmed, DATE_FIXTURES.confirmed)} focusSignal={1} />,
    )
    const live = container.querySelector('[aria-live="polite"]')!
    expect(live.textContent).toBe('') // mount-empty — a region born populated may never speak
    // Release the first-landing focus (the same DOM node persists across the rerender) so the
    // assertion below genuinely tests "not RE-focused", not "never blurred".
    screen.getByRole('heading', { name: slots.dateInYears(4) }).blur()
    // The final tier crowns a LATER lifestyle date: the heading swaps; AT hears the new claim.
    rerender(<FuckOffDate view={split(DATE_FIXTURES.confirmed, DATE_FIXTURES.confirmedLater)} focusSignal={2} />)
    expect(live.textContent).toBe(slots.dateInYears(9))
    // ...and focus was NOT yanked back to the heading (the once-per-mount latch held).
    expect(document.activeElement).not.toBe(screen.getByRole('heading', { name: slots.dateInYears(9) }))
  })

  it('a floor-only sharpen (hero claim unchanged) announces NOTHING — the region stays silent', () => {
    const { container, rerender } = render(
      <FuckOffDate view={split(DATE_FIXTURES.confirmed, DATE_FIXTURES.confirmedLater)} />,
    )
    const live = container.querySelector('[aria-live="polite"]')!
    rerender(<FuckOffDate view={split(DATE_FIXTURES.confirmedLater, DATE_FIXTURES.confirmedLater)} />)
    expect(live.textContent).toBe('')
  })
})

describe('P3-U11 — the unpriced-Medicare disclosure on the date claim (the council veto condition)', () => {
  it('renders among the lead notes when the household is in the unpriced domain; absent by default', () => {
    const withNote = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} medicareUnpricedNote />)
    expect(withNote.getByText(copy.verdictMedicareUnpriced)).toBeInTheDocument()
    withNote.unmount()
    const without = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} />)
    expect(without.queryByText(copy.verdictMedicareUnpriced)).toBeNull()
  })
})
