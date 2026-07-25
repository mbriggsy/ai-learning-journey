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

// The U13 aged surface (council 2026-07-10 — the two-time-bases family's third sibling closed):
// hero, ladder, tradeoff, caveat, and how-close all speak ONE clock on an aged vault.
describe('FuckOffDate — the aged wall-time re-base', () => {
  const anchor = (yearsSincePlanBuilt: number) => ({ startCalendarYear: 2024, yearsSincePlanBuilt })
  const ladderAria = (container: HTMLElement): string[] =>
    [...container.querySelectorAll('.fod-ladder [aria-label]')].map((e) => e.getAttribute('aria-label') ?? '')

  it('the hero and the ladder crown SPEAK ONE CLOCK on an aged vault (the Caddie blocker regression pin)', () => {
    // confirmed crowns plan-4; elapsed 2 → hero "about 2 years out — around 2028" AND the crown
    // aria "Stopping in 2 years … your date" — the exact pair the 2026-07-10 panel caught split.
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} dateAnchor={anchor(2)} />)
    expect(screen.getByRole('heading', { name: slots.dateInYearsAnchored(2, 2028) })).toBeInTheDocument()
    const aria = ladderAria(container)
    expect(aria).toContain(slots.ladderMarkAria(2, slots.xOfTen(9), 'crown', false))
    // the save-relative crown sentence (the old lie) is GONE
    expect(aria).not.toContain(slots.ladderMarkAria(4, slots.xOfTen(9), 'crown', false))
    // the passed plan-0 and plan-1 rungs dropped from every channel (display 0 is plan-2, below-bar)
    expect(aria).toContain(slots.ladderMarkAria(0, slots.xOfTen(8), 'below', false))
    expect(container.querySelectorAll('.fod-ladder .ladder-dot')).toHaveLength(4) // plan 2,3,4,5
  })

  it('the ladder WITHDRAWS when the crown has passed (crown < elapsed) — the hero arrived arm carries the story', () => {
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} dateAnchor={anchor(5)} />)
    expect(screen.getByRole('heading', { name: slots.dateInYearsPast(2028) })).toBeInTheDocument()
    expect(screen.queryByText(copy.ladderDisclosure)).not.toBeInTheDocument()
    expect(container.querySelector('.fod-ladder')).toBeNull() // never a crownless field of dots
  })

  it('the STRICT boundary (crown == elapsed) keeps the ladder with the "stopping today" crown', () => {
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} dateAnchor={anchor(4)} />)
    expect(container.querySelector('.fod-ladder')).not.toBeNull()
    expect(ladderAria(container)).toContain(slots.ladderMarkAria(0, slots.xOfTen(9), 'crown', false))
  })

  it('an aged ladder wears the balances-vintage clause (agedBalancesYear present — the persist machine derived it); absent ⇒ no clause', () => {
    const aged = render(
      <FuckOffDate view={dates(DATE_FIXTURES.confirmed)} dateAnchor={anchor(1)} agedBalancesYear={2024} />,
    )
    expect(aged.container.textContent).toContain(slots.ladderCaveatAgedBalances(2024))
    expect(aged.container.textContent).toContain(copy.ladderPlanCaveat) // the base caveat stays
    aged.unmount()
    // Absent prop = a fresh save, an in-session edit, a re-save, or a legacy vault — the
    // derivation (agedBalancesYearFor) owns that truth; the surface renders no clause.
    const fresh = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} dateAnchor={anchor(1)} />)
    expect(fresh.container.textContent).not.toContain('They also read from your account balances')
  })

  it('the aged tradeoff never offers a passed stop-year (all lower-odds candidates passed → no line)', () => {
    // confirmed's lower-odds candidates are plan 0..3; at elapsed 4 every one has passed.
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} dateAnchor={anchor(4)} />)
    expect(container.textContent).not.toContain('sooner')
  })

  const noDateTrack = {
    kind: 'no-date-in-window',
    nonMonotoneOffsets: [],
    curve: [
      { offsetYears: 0, survivalFraction: 0.81, quantizedLowerBound: 0.78, clears: false },
      { offsetYears: 15, survivalFraction: 0.69, quantizedLowerBound: 0.66, clears: false },
      { offsetYears: 30, survivalFraction: 0.58, quantizedLowerBound: 0.55, clears: false },
    ],
  } as const

  it('the aged how-close line reads the FUTURE offsets only (a passed near-miss is not "how close you are")', () => {
    // best rung sits at plan-0 (0.78 → 8); the future best is 7. Aged, the line must speak 7.
    const { container } = render(<FuckOffDate view={dates(noDateTrack)} dateAnchor={anchor(2)} />)
    expect(container.textContent).toContain(slots.noDateHowClose(slots.xOfTen(7)))
    expect(container.textContent).not.toContain(slots.noDateHowClose(slots.xOfTen(8)))
  })

  it('a no-date vault older than the WHOLE window SUPPRESSES the how-close line — never a fabricated "0 of 10" (review 2026-07-10)', () => {
    // elapsed 31 > every evaluated offset: the aged filter leaves nothing readable, and the
    // reduce's initial 0 must never become a rock-bottom odds claim.
    const { container } = render(<FuckOffDate view={dates(noDateTrack)} dateAnchor={anchor(31)} />)
    expect(container.textContent).not.toContain('The nearest any year came')
    expect(container.textContent).not.toContain('0 of 10')
    // the calm no-date headline still stands — the window claim is anchor-independent.
    expect(container.textContent).toContain(slots.noDateInWindow(DATE_WINDOW_TOP))
  })

  it('an elapsed-0 anchor renders the ladder byte-identically to the un-anchored mount (the fresh identity)', () => {
    const plain = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} />)
    const ladderPlain = plain.container.querySelector('.fod-ladder')?.innerHTML
    plain.unmount()
    const zero = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} dateAnchor={anchor(0)} />)
    expect(zero.container.querySelector('.fod-ladder')?.innerHTML).toBe(ladderPlain)
    expect(ladderPlain).toBeTruthy()
  })
})

// U17 §S2.5 — the de-mudded arrived idiom: the STRICT three-way split (past / this-year / future),
// one idiom across hero, floor, and ladder, each line naming its own date.
describe('FuckOffDate — the arrived idiom speaks strictly (U17 §S2.5)', () => {
  const anchor = (yearsSincePlanBuilt: number) => ({ startCalendarYear: 2024, yearsSincePlanBuilt })

  it('crown == plan clock: the heading reads the NOW arm ("about now") — agreeing with the ladder’s "stopping today" crown on the same screen', () => {
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} dateAnchor={anchor(4)} />)
    expect(screen.getByRole('heading', { name: slots.dateInYearsNow(2028) })).toBeInTheDocument()
    expect(container.querySelector('.fod-headline')!.textContent).toContain('about now')
    expect(container.querySelector('.fod-ladder')).not.toBeNull() // the agreeing crown stays
  })

  it('crown < plan clock: the heading reads the PAST arm ("come and gone") and NEVER "about now" — the literal mud pin', () => {
    // The old non-strict `<= 0` collapsed a genuinely passed year into "that's about now" —
    // a false statement three years on. This literal pin is what kills a re-collapsed arm
    // (asserting the slot alone would be the 081 tautology).
    const { container } = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} dateAnchor={anchor(5)} />)
    const heading = container.querySelector('.fod-headline')!
    expect(heading.textContent).toContain('come and gone')
    expect(heading.textContent).not.toContain('about now')
  })

  it('the FLOOR line rides the same three-way split (one idiom per screen, each naming its date)', () => {
    const splitView = (floor: (typeof DATE_FIXTURES)[keyof typeof DATE_FIXTURES], lifestyle: (typeof DATE_FIXTURES)[keyof typeof DATE_FIXTURES]) =>
      ({ kind: 'dates', floor, lifestyle, windowTopYears: DATE_WINDOW_TOP }) as const
    const odds = dateOddsText(DATE_FIXTURES.confirmed.grade.quantizedLowerBound)
    // floor offset 4 == clock 4 → the NOW arm, naming 2028
    const now = render(
      <FuckOffDate view={splitView(DATE_FIXTURES.confirmed, DATE_FIXTURES.confirmedLater)} dateAnchor={anchor(4)} />,
    )
    expect(now.container.textContent).toContain(slots.dateFloorCoveredNow(2028, odds, false))
    now.unmount()
    // floor offset 4 < clock 5 → the PAST arm — "a year already behind you", never "about now"
    const past = render(
      <FuckOffDate view={splitView(DATE_FIXTURES.confirmed, DATE_FIXTURES.confirmedLater)} dateAnchor={anchor(5)} />,
    )
    expect(past.container.textContent).toContain(slots.dateFloorCoveredPast(2028, odds, false))
    expect(past.container.querySelector('.fod-floor')!.textContent).not.toContain('about now')
  })
})

// U17 §S2 — the aged band ships ONLY beside its premise line + the RENDERED re-confirm control
// (insight 100); without a re-confirm route the fan structurally withdraws.
describe('FuckOffDate — the aged band premise + the structural fan withdraw (U17 §S2)', () => {
  const anchor = (yearsSincePlanBuilt: number) => ({ startCalendarYear: 2024, yearsSincePlanBuilt })
  const agedBandView = {
    ...dates(DATE_FIXTURES.confirmed),
    band: BAND,
    bandAnnotations: deriveDateBandAnnotations(58, 60, 6, 40, anchor(2)),
  }

  it('AGED + a re-confirm route: the fan renders WITH the vintage premise + the control, and the control fires', () => {
    const onReconfirm = vi.fn()
    render(
      <FuckOffDate view={agedBandView} dateAnchor={anchor(2)} agedBalancesYear={2024} onReconfirm={onReconfirm} />,
    )
    expect(screen.getByRole('button', { name: copy.bandStudyRange })).toBeInTheDocument() // the fan
    expect(screen.getByText(slots.bandAgedPremiseSaved(2024))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.bandPremiseReconfirmCta }))
    expect(onReconfirm).toHaveBeenCalledTimes(1)
  })

  it('AGED, fresh save (a re-saver — no agedBalancesYear): the premise reads the build-anchor arm', () => {
    render(<FuckOffDate view={agedBandView} dateAnchor={anchor(2)} onReconfirm={vi.fn()} />)
    expect(screen.getByText(slots.bandAgedPremiseFresh(2024))).toBeInTheDocument()
    expect(screen.queryByText(/balances you saved in/)).toBeNull()
  })

  it('AGED with NO re-confirm route: the fan WITHDRAWS ENTIRELY — never an aged projection with an unstated premise', () => {
    render(<FuckOffDate view={agedBandView} dateAnchor={anchor(2)} />)
    expect(screen.queryByRole('button', { name: copy.bandStudyRange })).toBeNull()
    expect(screen.queryByText(/undetermined/)).toBeNull() // no premise either — the whole block is gone
  })

  it('FRESH (plan clock 0): no premise, no control — the band mounts as before (byte-identity)', () => {
    const freshView = { ...dates(DATE_FIXTURES.confirmed), band: BAND, bandAnnotations: deriveDateBandAnnotations(58, 60, 6, 40) }
    render(<FuckOffDate view={freshView} dateAnchor={anchor(0)} onReconfirm={vi.fn()} />)
    expect(screen.getByRole('button', { name: copy.bandStudyRange })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.bandPremiseReconfirmCta })).toBeNull()
    expect(screen.queryByText(/undetermined/)).toBeNull()
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
      Math.round(DATE_FIXTURES.confirmedLater.grade.quantizedLowerBound * 10) >= 10,
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

describe('P3-U11 follow-up — the priced-Medicare disclosure on the date claim', () => {
  it('renders the affirmation AND the residual among the lead notes when priced with no door; absent by default', () => {
    const withNote = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} medicarePricedNote />)
    expect(withNote.getByText(copy.verdictMedicarePriced)).toBeInTheDocument()
    expect(withNote.getByText(copy.verdictMedicareResidual)).toBeInTheDocument()
    withNote.unmount()
    const without = render(<FuckOffDate view={dates(DATE_FIXTURES.confirmed)} />)
    expect(without.queryByText(copy.verdictMedicarePriced)).toBeNull()
    expect(without.queryByText(copy.verdictMedicareResidual)).toBeNull()
  })

  // S5 — the state affirmation swaps the residual clause in place on the date surface too (the
  // .fod-note render block; same paragraph, no new row).
  it('a PRICED state (FL) swaps the residual clause to the affirmation naming the state', () => {
    const { container } = render(
      <FuckOffDate view={dates(DATE_FIXTURES.confirmed)} medicarePricedNote statePricedNote="FL" />,
    )
    const notes = Array.from(container.querySelectorAll('.fod-note')).map((n) => n.textContent ?? '')
    const residual = notes.find((t) => t.includes('Florida'))
    expect(residual, 'the residual note names Florida').toBeDefined()
    expect(residual, 'FL names the genuinely-zero fact').toContain('no state income tax')
    expect(residual).not.toContain('isn’t priced yet')
  })

  // O12/F6(ii) (council 2026-07-17): on the DATE route the on-typical extras appendix gets its
  // OWN paragraph (this surface scrolls by design — the spine's no-new-row fold law doesn't bind
  // here). Order preserved: affirmation → residual → appendix. The spine's same-<p> concat is
  // pinned in ConfidenceStatement.test.tsx — the two routes deliberately differ on this.
  it('the on-typical appendix renders as its OWN note on the date route, AFTER the residual', () => {
    const note = 'Craig’s coverage is figured at a typical ~$203 a month.'
    const { container } = render(
      <FuckOffDate view={dates(DATE_FIXTURES.confirmed)} medicarePricedNote medicareExtrasTypicalNote={note} />,
    )
    const notes = Array.from(container.querySelectorAll('.fod-note')).map((n) => n.textContent ?? '')
    const residualIdx = notes.findIndex((t) => t.includes('held flat in today’s dollars'))
    const appendixIdx = notes.findIndex((t) => t === note)
    expect(residualIdx, 'the residual renders').toBeGreaterThanOrEqual(0)
    expect(appendixIdx, 'the appendix is its OWN note (never concatenated into the residual)').toBeGreaterThan(residualIdx)
    expect(notes[residualIdx], 'the residual does not swallow the appendix').not.toContain(note)
  })
})
