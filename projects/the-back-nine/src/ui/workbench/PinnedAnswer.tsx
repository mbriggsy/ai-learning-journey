/*
 * src/ui/workbench/PinnedAnswer.tsx — the many-futures answer, pinned beside the year-by-year table (workbench plan
 * R9, U7).
 *
 * The table shows ONE future; the answer comes from the many. So the store's own committed answer stays in view above
 * the table while it scrolls, and the table never stands alone as the answer. Nothing here is worked out again: the
 * date words are the hero's own composers (`heroLead`, `floorLineText`, `composeDateSplit`), anchored on the plan's
 * clock as the hero anchors them, and the spine's reading is the strip's (`verdictReadingText`).
 *
 * THE RESERVED BOX (insights 035, 065): the box stacks its real lines over a hidden copy of its tallest form (the
 * label, the lead, a second line and the status line) in one grid cell, so a status line arriving or leaving, or a
 * date splitting into two lines, never moves the table below it. Since the facts page (U8) an edit in the room can
 * re-figure the answer under the box, and the next answer's words can be longer than the current ones (a dated lead
 * becoming "No fuck-off date within the next 10 years…" wrapped to a second line at his laptop and moved the page
 * switch 16 px: U8's landing walk). So the hidden copy reserves the tallest of the forms the next answer can take on
 * this route (`reserveForms`): every lead candidate in one hidden cell, every second-line candidate in another.
 */
import { composeDateSplit } from '../dateSplit'
import { dateOddsText } from '../dateOdds'
import { floorLineText, heroLead } from '../FuckOffDate'
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

export function PinnedAnswer({ snapshot, wallCalendarYear }: { readonly snapshot: MemoryModelSnapshot; readonly wallCalendarYear: number }) {
  const lines = pinnedLines(snapshot, wallCalendarYear)
  const reserve = reserveForms(snapshot, wallCalendarYear)
  return (
    <section className="wb-pin" aria-labelledby="wb-pin-label">
      <div className="wb-pin__stack">
        <div className="wb-pin__real">
          <p className="wb-pin__label">
            <span id="wb-pin-label">{copy.workbenchPinnedLabel}</span>
            {/* Spoken through the room's one live region on the change (WorkbenchRoom): no role of its own. */}
            {lines.status !== undefined && (
              <span className="wb-pin__status">
                {' '}
                {lines.status}
              </span>
            )}
          </p>
          <p className="wb-pin__lead">{lines.lead}</p>
          {lines.second !== undefined && <p className="wb-pin__second">{lines.second}</p>}
        </div>
        {/* The box's tallest form, never seen or read: it holds the height so nothing below moves. Each cell stacks
            its candidates in one grid area, so the cell is as tall as the tallest of them. */}
        <div className="wb-pin__ghost" aria-hidden="true">
          {/* The label line with each status it can carry: worked out again, or provisional. */}
          <div className="wb-pin__cell">
            {[copy.workbenchPinnedRefiguring, copy.answerProvisionalTag].map((status) => (
              <p key={status} className="wb-pin__label">
                {copy.workbenchPinnedLabel} {status}
              </p>
            ))}
          </div>
          <div className="wb-pin__cell">
            {[lines.lead, ...reserve.leads].map((lead, i) => (
              <p key={i} className="wb-pin__lead">
                {lead}
              </p>
            ))}
          </div>
          {/* Only the date route ever draws a second line (a split date's floor line). */}
          {snapshot.answer.kind === 'date' && (
            <div className="wb-pin__cell">
              {[...(lines.second !== undefined ? [lines.second] : []), ...reserve.seconds].map((second, i) => (
                <p key={i} className="wb-pin__second">
                  {second}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
