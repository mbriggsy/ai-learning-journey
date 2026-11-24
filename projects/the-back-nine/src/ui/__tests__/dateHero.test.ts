// The date hero's two claim lines, moved out of `reentry.test.tsx` with their functions by Act 6's RC0, unchanged.
import { describe, expect, it } from 'vitest'
import type { DateTrackOutcome } from '@shared/model'
import { copy, slots } from '../copy'
import { dateOddsText } from '../dateOdds'
import type { DateSplitView } from '../dateSplit'
import { floorLineText, heroLead } from '../dateHero'

describe('heroLead — the U13 wall-time anchor (the date answer must not decay silently)', () => {
  const dated: DateTrackOutcome = {
    kind: 'date',
    offsetYears: 7,
    grade: { quantizedLowerBound: 0.9 },
    unconfirmed: false,
  } as unknown as DateTrackOutcome

  it('un-anchored (the preview harness): the legacy relative framing, unchanged', () => {
    expect(heroLead(dated, 30)).toBe(slots.dateInYears(7))
  })

  it('anchored at elapsed 0 (every fresh session): the relative count is UNCHANGED and the calendar label rides along', () => {
    expect(heroLead(dated, 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 0 })).toBe(
      slots.dateInYearsAnchored(7, 2033),
    )
  })

  it('anchored on an AGED plan: the count re-derives from TODAY while the calendar label holds (never a replayed build-day count)', () => {
    expect(heroLead(dated, 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 3 })).toBe(
      slots.dateInYearsAnchored(4, 2033),
    )
  })

  it('the arrived arms are STRICT (U17 §S2.5 rewrote this pin): AT the clock speaks "about now"; PAST it speaks "come and gone"', () => {
    // The predecessor expected dateInYearsPast for BOTH — the non-strict collapse §S2.5 killed:
    // a date exactly this year and a date two years gone are different facts, and only the first
    // may read "about now" (agreeing with the ladder's "stopping today" crown at the boundary).
    expect(heroLead(dated, 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 7 })).toBe(
      slots.dateInYearsNow(2033),
    )
    expect(heroLead(dated, 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 9 })).toBe(
      slots.dateInYearsPast(2033),
    )
  })

  it('offset 0 stays the free-today claim regardless of anchor (the engine crowned NOW — no arithmetic to do)', () => {
    const now = { ...dated, offsetYears: 0 } as DateTrackOutcome
    expect(heroLead(now, 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 2 })).toBe(copy.dateFreeToday)
  })
})

describe('floorLineText — the SAME anchor as the hero (ultramode 2026-07-09: one screen, one time base)', () => {
  // The floor and hero share a screen; an anchored hero beside an un-anchored floor could
  // even invert the true floor<lifestyle ordering on an aged vault.
  const split = (floorOffset: number): Extract<DateSplitView, { kind: 'split' }> =>
    ({
      kind: 'split',
      lifestyle: { kind: 'confirmed-date', offsetYears: 7 } as unknown as DateSplitView & object,
      floor: { kind: 'covered', offsetYears: floorOffset, quantizedLowerBound: 0.8, unconfirmed: false },
      inverted: false,
    }) as unknown as Extract<DateSplitView, { kind: 'split' }>
  // The same conservative register the render composes — the render's own producer,
  // never a re-typed odds string.
  const odds = () => dateOddsText(0.8)

  it('un-anchored (the preview harness): the legacy relative framing, unchanged', () => {
    expect(floorLineText(split(5), 30)).toBe(slots.dateFloorCovered(5, odds(), false))
  })

  it('anchored at elapsed 0 (every fresh session): count unchanged, calendar label rides along', () => {
    expect(floorLineText(split(5), 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 0 })).toBe(
      slots.dateFloorCoveredAnchored(5, 2031, odds(), false),
    )
  })

  it('anchored on an AGED vault: the count re-derives from TODAY while the calendar label holds', () => {
    expect(floorLineText(split(5), 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 3 })).toBe(
      slots.dateFloorCoveredAnchored(2, 2031, odds(), false),
    )
  })

  it('the arrived arms are STRICT (U17 §S2.5 rewrote this pin): AT the clock "about now"; PAST it "already behind you"', () => {
    // Mirrors heroLead's rewritten pin — one idiom per screen, each line naming its own date.
    expect(floorLineText(split(5), 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 5 })).toBe(
      slots.dateFloorCoveredNow(2031, odds(), false),
    )
    expect(floorLineText(split(5), 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 8 })).toBe(
      slots.dateFloorCoveredPast(2031, odds(), false),
    )
  })

  it('offset 0 keeps the covered-from-today claim under any anchor (covered from the plan start ⇒ still covered now)', () => {
    expect(floorLineText(split(0), 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 4 })).toBe(
      slots.dateFloorCovered(0, odds(), false),
    )
  })

  it('the no-date arms are anchor-independent (they name the window, not a count)', () => {
    const noFloor = {
      ...split(5),
      floor: { kind: 'not-within-window' },
    } as unknown as Extract<DateSplitView, { kind: 'split' }>
    expect(floorLineText(noFloor, 30, { startCalendarYear: 2026, yearsSincePlanBuilt: 3 })).toBe(
      slots.dateFloorNotWithin(30),
    )
  })
})
