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
 * date splitting into two lines, never moves the table below it.
 */
import { composeDateSplit } from '../dateSplit'
import { dateOddsText } from '../dateOdds'
import { floorLineText, heroLead } from '../FuckOffDate'
import { verdictReadingText } from '../verdictSentence'
import { planClockAnchor } from '../bandAnnotations'
import { copy } from '../copy'
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
  const status = snapshot.refiguring ? copy.workbenchPinnedRefiguring : undefined
  if (answer.kind === 'pending') return { lead: copy.workbenchPinnedWorking }
  if (answer.kind === 'date' && answer.outcome.kind === 'dates') {
    const { floor, lifestyle, windowTopYears } = answer.outcome
    const anchor = planClockAnchor(answer.draft.startCalendarYear, wallCalendarYear)
    const split = composeDateSplit(floor, lifestyle)
    const hero = split.kind === 'single' ? split.track : split.lifestyle
    const lead = heroLead(hero, windowTopYears, anchor, snapshot.refiguring)
    const odds = hero.kind === 'no-date-in-window' ? '' : ` (${dateOddsText(hero.grade.quantizedLowerBound)})`
    const second =
      split.kind === 'split'
        ? floorLineText(split, windowTopYears, anchor, snapshot.refiguring)
        : answer.tier === 'provisional' && !snapshot.refiguring
          ? copy.answerProvisionalTag
          : undefined
    return { lead: `${lead}${odds}`, ...(second !== undefined ? { second } : {}), ...(status !== undefined ? { status } : {}) }
  }
  if (answer.kind === 'headline' && answer.result.headline.outcomeState !== 'indeterminate') {
    const state = answer.result.headline.outcomeState
    const lead = `${OUTCOME_WORDS[state]}: ${verdictReadingText(state, answer.result.headline.xOfTen.value)}`
    return { lead, ...(status !== undefined ? { status } : {}) }
  }
  return { lead: copy.workbenchPinnedNone }
}

export function PinnedAnswer({ snapshot, wallCalendarYear }: { readonly snapshot: MemoryModelSnapshot; readonly wallCalendarYear: number }) {
  const lines = pinnedLines(snapshot, wallCalendarYear)
  return (
    <section className="wb-pin" aria-labelledby="wb-pin-label">
      <div className="wb-pin__stack">
        <div className="wb-pin__real">
          <p className="wb-pin__label">
            <span id="wb-pin-label">{copy.workbenchPinnedLabel}</span>
            {lines.status !== undefined && (
              <span className="wb-pin__status" role="status">
                {' '}
                {lines.status}
              </span>
            )}
          </p>
          <p className="wb-pin__lead">{lines.lead}</p>
          {lines.second !== undefined && <p className="wb-pin__second">{lines.second}</p>}
        </div>
        {/* The box's tallest form, never seen or read: it holds the height so nothing below moves. */}
        <div className="wb-pin__ghost" aria-hidden="true">
          <p className="wb-pin__label">
            {copy.workbenchPinnedLabel} {copy.workbenchPinnedRefiguring}
          </p>
          <p className="wb-pin__lead">{lines.lead}</p>
          {/* Only the date route ever draws a second line (the floor date, or the provisional tag). */}
          {snapshot.answer.kind === 'date' && <p className="wb-pin__second">{lines.second ?? copy.answerProvisionalTag}</p>}
        </div>
      </div>
    </section>
  )
}
