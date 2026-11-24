/**
 * The pinned answer's words (`PinnedAnswer.tsx` draws the box; its header holds the why): the lines for the store's
 * current answer, and the forms the box reserves room for. Moved out of `PinnedAnswer.tsx` by Act 6's RC0, unchanged.
 */
import { composeDateSplit } from '../dateSplit'
import { dateOddsText } from '../dateOdds'
import { floorLineText, heroLead } from '../dateHero'
import { verdictReadingText } from '../verdictSentence'
import { planClockAnchor } from '../bandAnnotations'
import { copy, slots } from '../copy'
import type { MemoryModelSnapshot } from '@store/memoryModel'
import type { OutcomeState } from '@shared/model'

const OUTCOME_WORDS: Readonly<Record<Exclude<OutcomeState, 'indeterminate'>, string>> = {
  'on-track': copy.outcomeOnTrack,
  borderline: copy.outcomeBorderline,
  'off-track': copy.outcomeOffTrack,
  'over-funded': copy.outcomeOverFunded,
  'already-failing': copy.outcomeAlreadyFailing,
}

interface PinnedLines {
  readonly lead: string
  readonly second?: string
  readonly status?: string
}

/** The pinned box's words for the store's current answer. Exported for its tests. */
export function pinnedLines(snapshot: MemoryModelSnapshot, wallCalendarYear: number): PinnedLines {
  const { answer } = snapshot
  // The status beside the label: worked out again, else a provisional answer says so (the hero's own tag), on either
  // route. A split date's second line is its floor line, so the tag never rides there (the U8 review's C NEW-1).
  const resolved = answer.kind === 'date' || answer.kind === 'headline'
  const status = snapshot.refiguring
    ? copy.workbenchPinnedRefiguring
    : resolved && answer.tier === 'provisional'
      ? copy.answerProvisionalTag
      : undefined
  if (answer.kind === 'pending') return { lead: copy.workbenchPinnedWorking }
  if (answer.kind === 'date' && answer.outcome.kind === 'dates') {
    const { floor, lifestyle, windowTopYears } = answer.outcome
    const anchor = planClockAnchor(answer.draft.startCalendarYear, wallCalendarYear)
    const split = composeDateSplit(floor, lifestyle)
    const hero = split.kind === 'single' ? split.track : split.lifestyle
    const lead = heroLead(hero, windowTopYears, anchor, snapshot.refiguring)
    const odds = hero.kind === 'no-date-in-window' ? '' : ` (${dateOddsText(hero.grade.quantizedLowerBound)})`
    const second = split.kind === 'split' ? floorLineText(split, windowTopYears, anchor, snapshot.refiguring) : undefined
    return { lead: `${lead}${odds}`, ...(second !== undefined ? { second } : {}), ...(status !== undefined ? { status } : {}) }
  }
  if (answer.kind === 'headline' && answer.result.headline.outcomeState !== 'indeterminate') {
    const state = answer.result.headline.outcomeState
    const lead = `${OUTCOME_WORDS[state]}: ${verdictReadingText(state, answer.result.headline.xOfTen.value)}`
    return { lead, ...(status !== undefined ? { status } : {}) }
  }
  return { lead: copy.workbenchPinnedNone }
}

/** The forms the box can take before its next answer lands, beside the current one (the hidden copy holds the tallest).
 *  The date route: a lead with no date in the window (settled, and while worked out again) and a dated lead at the
 *  window's top with the ceiling's odds (and, on a plan opened after its build year, the dated lead's "now" and "come
 *  and gone" forms: the U8 review's F8c); a second line as each no-date floor line and a dated floor line at the
 *  window's top (and its aged forms). The spine: each verdict word with its reading. Exported for its tests. */
export function reserveForms(snapshot: MemoryModelSnapshot, wallCalendarYear: number): { readonly leads: readonly string[]; readonly seconds: readonly string[] } {
  const { answer } = snapshot
  if (answer.kind === 'date' && answer.outcome.kind === 'dates') {
    const top = answer.outcome.windowTopYears
    const anchor = planClockAnchor(answer.draft.startCalendarYear, wallCalendarYear)
    const ahead = Math.max(1, top - anchor.yearsSincePlanBuilt)
    const topYear = anchor.startCalendarYear + top
    return {
      leads: [
        slots.noDateInWindow(top),
        slots.noDateInWindowRefiguring(top),
        `${slots.dateInYearsAnchored(ahead, topYear)} (${slots.withOddsAtCeiling()})`,
        `${slots.dateInYearsAnchored(ahead, topYear)} (${slots.withOdds(slots.xOfTen(9))})`,
        ...(anchor.yearsSincePlanBuilt > 0
          ? [`${slots.dateInYearsPast(topYear)} (${slots.withOddsAtCeiling()})`, `${slots.dateInYearsNow(topYear)} (${slots.withOddsAtCeiling()})`]
          : []),
      ],
      seconds: [
        slots.dateFloorNotWithinEither(top),
        slots.dateFloorNotWithin(top),
        slots.dateFloorNotWithinRefiguring(top),
        slots.dateFloorCoveredAnchored(ahead, topYear, slots.withOddsAtCeiling(), true),
        slots.dateFloorCoveredAnchored(ahead, topYear, slots.withOdds(slots.xOfTen(9)), true),
        ...(anchor.yearsSincePlanBuilt > 0
          ? [
              slots.dateFloorCoveredPast(topYear, slots.withOddsAtCeiling(), true),
              slots.dateFloorCoveredNow(topYear, slots.withOddsAtCeiling(), true),
            ]
          : []),
      ],
    }
  }
  if (answer.kind === 'headline') {
    const states = Object.keys(OUTCOME_WORDS) as (keyof typeof OUTCOME_WORDS)[]
    return { leads: states.map((state) => `${OUTCOME_WORDS[state]}: ${verdictReadingText(state, 9)}`), seconds: [] }
  }
  return { leads: [], seconds: [] }
}
