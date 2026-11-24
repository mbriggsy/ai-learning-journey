/**
 * The date hero's two claim lines (`FuckOffDate.tsx` renders them; the pinned answer and the sharpen announce speak
 * them): the hero claim's heading text and the subordinate essentials line, both anchored on the plan clock. Moved
 * out of `FuckOffDate.tsx` by Act 6's RC0, unchanged.
 */
import { copy, slots } from './copy'
import { dateOddsText } from './dateOdds'
import type { DateSplitView } from './dateSplit'
import type { BandPlanClockAnchor } from './bandAnnotations'
import { offsetHasPassed } from '@viz/curveMarks'
import type { DateTrackOutcome } from '@shared/model'

/** The hero claim's heading text — shared by the render and the polite sharpen announce, so what
 *  is spoken is exactly what is shown. With an anchor (P3·U13): the calendar label is the
 *  wall-time-STABLE claim (startCalendarYear + offset — byte-identical however old the plan)
 *  and the relative count re-derives from today (offset − years since the plan was BUILT). The
 *  engine's own offset is NEVER mutated — this is presentation arithmetic only. `refiguring`
 *  (W9-R7, KTD6): the no-date claim drops its entered-so-far tail, which the re-figuring line
 *  above it makes false. */
export function heroLead(
  hero: DateTrackOutcome,
  windowTopYears: number,
  anchor?: BandPlanClockAnchor,
  refiguring = false,
): string {
  if (hero.kind === 'no-date-in-window') {
    return refiguring ? slots.noDateInWindowRefiguring(windowTopYears) : slots.noDateInWindow(windowTopYears)
  }
  if (hero.offsetYears === 0) return copy.dateFreeToday
  if (anchor === undefined) return slots.dateInYears(hero.offsetYears)
  const calendarYear = anchor.startCalendarYear + hero.offsetYears
  // U17 §S2.5 — the STRICT three-way split (the de-mudded arrived idiom): strictly-past speaks
  // "come and gone", exactly-this-year speaks "about now" (agreeing with the ladder's "stopping
  // today" crown at the same boundary), future speaks the anchored count. The old non-strict
  // `<= 0` collapsed the first two into one "about now" sentence — false for a genuinely passed
  // year. The past test is the §S0.1 predicate, never a re-typed compare.
  if (offsetHasPassed(hero.offsetYears, anchor.yearsSincePlanBuilt)) {
    return slots.dateInYearsPast(calendarYear)
  }
  if (hero.offsetYears === anchor.yearsSincePlanBuilt) return slots.dateInYearsNow(calendarYear)
  return slots.dateInYearsAnchored(hero.offsetYears - anchor.yearsSincePlanBuilt, calendarYear)
}

/** The subordinate essentials line (split only) — the floor's claim in its own register.
 *  Anchored EXACTLY like `heroLead` (ultramode 2026-07-09): both lines share one screen, so
 *  an aged plan must never show a wall-time-corrected hero beside a floor replaying its
 *  build-day count — two time bases can even invert the true floor<lifestyle ordering.
 *  Exported for the anchor battery (the heroLead precedent). `refiguring`: heroLead's tail rule. */
export function floorLineText(
  split: Extract<DateSplitView, { kind: 'split' }>,
  windowTopYears: number,
  anchor?: BandPlanClockAnchor,
  refiguring = false,
): string {
  const fl = split.floor
  if (fl.kind === 'not-within-window') {
    // Lifestyle no-date too ⇒ the quiet severity disclosure ("either" — the hero line above
    // already names the window); lifestyle dated ⇒ the extreme-inversion statement of fact
    // (the inversion note carries the why). Both name their own years (audit 2026-07-03).
    if (split.lifestyle.kind === 'no-date-in-window') return slots.dateFloorNotWithinEither(windowTopYears)
    return refiguring ? slots.dateFloorNotWithinRefiguring(windowTopYears) : slots.dateFloorNotWithin(windowTopYears)
  }
  const odds = dateOddsText(fl.quantizedLowerBound)
  // Offset 0 mirrors heroLead's free-today precedence: "covered from today" holds under any
  // anchor (covered from the plan's own start ⇒ still covered now — no arithmetic to do).
  if (anchor === undefined || fl.offsetYears === 0) {
    return slots.dateFloorCovered(fl.offsetYears, odds, fl.unconfirmed)
  }
  const calendarYear = anchor.startCalendarYear + fl.offsetYears
  // U17 §S2.5 — the same strict three-way split as heroLead (one idiom, each line naming its
  // own date); the past test is the §S0.1 predicate.
  if (offsetHasPassed(fl.offsetYears, anchor.yearsSincePlanBuilt)) {
    return slots.dateFloorCoveredPast(calendarYear, odds, fl.unconfirmed)
  }
  if (fl.offsetYears === anchor.yearsSincePlanBuilt) {
    return slots.dateFloorCoveredNow(calendarYear, odds, fl.unconfirmed)
  }
  return slots.dateFloorCoveredAnchored(fl.offsetYears - anchor.yearsSincePlanBuilt, calendarYear, odds, fl.unconfirmed)
}
