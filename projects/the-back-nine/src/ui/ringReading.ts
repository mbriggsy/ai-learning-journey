/**
 * src/ui/ringReading.ts: the ONE composer every ring reads (plan docs/plans/6-rightcapital-ui-plan.md, 4.0 "The ring";
 * RC3). It turns a many-futures reading (the plan's, through `planReadingFor`, or a what-if's) into the ring's face, and
 * an elevated answer (`selectElevatedAnswer`) into the ring card's view. Pure; every word through `copy.ts`'s slots.
 *
 * THE HONESTY LAWS IT HOLDS (insight 089, and insight 048: an honesty rule inline in a render is untested):
 * - the centre is never `${n} of 10`: a count below the ceiling is `slots.xOfTen`, the ceiling is the proportion
 *   `slots.xOfTenAtCeiling()` ("better than 9 in 10"), which is a bound and wears no second hedge, and "10 of 10" can
 *   never print (the spine's count is 9-capped by the engine; the date route's rung 10 routes to the ceiling words);
 * - the arc fills to the count out of 10 (the ceiling draws the full-less-one arc, 9);
 * - `indeterminate` draws no number and no arc; `already-failing` draws its count (0) and an empty arc;
 * - on the date route the caption names the stop year the reading is taken at ("if you stop in 2031"), from the
 *   reading's own offset, never a re-derived one; on an aged plan whose stop year has passed (`offsetHasPassed`, the odds
 *   chart's own test) it keeps the count (the plan's own reading, the one "Stopping then" prints) and speaks of the year
 *   in the past ("if you’d stopped in 2025");
 * - on the essentials-only pass (the reading's `track`, a floor-keyed band) the line under the ring says so, on every
 *   ring alike, plan and what-if, so a floor count never reads as the full budget's (under the ring, since its caption
 *   box holds two lines: a third ran into the arc, measured on `datemixed`).
 */
import type { MemoryModelSnapshot } from '@store/memoryModel'
import { offsetHasPassed } from '@viz/curveMarks'
import type { ElevatedAnswer } from './answerView'
import type { BandPlanClockAnchor } from './bandAnnotations'
import { copy, slots } from './copy'
import { floorLineText, heroLead } from './dateHero'
import { composeDateSplit } from './dateSplit'
import { OUTCOME_PRESENTATION } from './outcomeStates'
import { verdictReadingText } from './verdictSentence'
import type { WhatIfReading } from './workbench/whatIfRun'

/** The highest count the X-of-10 frame prints as a count; a reading at or past 10 is the ceiling. */
const CEILING_RUNG = 10
/** The ceiling's arc: full less one, never a full circle (a full ring would read as "10 of 10"). */
const CEILING_ARC = 9

/** What the ring itself draws. */
export interface RingFace {
  /** The count out of 10 the arc fills to; undefined draws no arc. */
  readonly arc: number | undefined
  /** The big words in the middle; undefined prints none. */
  readonly centre: string | undefined
  /** The words under them: the outcome word, or the stop year on the date route. */
  readonly caption: string
  /** The line under the ring where the reading is the essentials-only pass (`track` 'floor'). */
  readonly note?: string
}

/**
 * The face for one many-futures reading. `startCalendarYear` names the stop year on the date route (the plan's build
 * year; an offset is years from it); without it the caption falls back to the no-reading words, never a guessed year.
 * `planClockYears` is the plan's age in years (`yearsSincePlanBuilt`): a stop year it has passed reads in the past.
 */
export function ringFace(reading: WhatIfReading, startCalendarYear?: number, planClockYears = 0): RingFace {
  if (reading.kind === 'headline') {
    const { outcomeState, xOfTen } = reading.headline
    const wordKey = OUTCOME_PRESENTATION[outcomeState].verdictWordKey
    if (wordKey === null) return { arc: undefined, centre: undefined, caption: copy.snapshotRingNoReading }
    const n = xOfTen.value
    return {
      arc: outcomeState === 'over-funded' ? CEILING_ARC : Math.min(n, CEILING_ARC),
      centre: verdictReadingText(outcomeState, n),
      caption: copy[wordKey],
    }
  }
  const { offsetYears, quantizedLowerBound } = reading.reading
  // The same mapping the odds ladder and the date hero's odds read (curveMarks.ts): one number, plot ≡ text.
  const rung = Math.round(quantizedLowerBound * 10)
  const atCeiling = rung >= CEILING_RUNG
  return {
    arc: atCeiling ? CEILING_ARC : Math.max(0, rung),
    centre: atCeiling ? slots.xOfTenAtCeiling() : slots.xOfTen(Math.max(0, rung)),
    caption:
      startCalendarYear === undefined
        ? copy.snapshotRingNoReading
        : offsetHasPassed(offsetYears, planClockYears)
          ? slots.snapshotRingStoppedIn(startCalendarYear + offsetYears)
          : slots.snapshotRingStopIn(startCalendarYear + offsetYears),
    ...(reading.track === 'floor' ? { note: copy.snapshotRingEssentialsNote } : {}),
  }
}

/** The ring card's view, one arm per answer state (plan 4.0, "Answer states every figured screen shows"). */
export type RingView =
  | {
      readonly kind: 'reading'
      readonly face: RingFace
      /** The work-optional date sentence above the ring (the date route only). */
      readonly lead?: string
      /** The re-figuring line, else the provisional tag: one slot, one line. */
      readonly eyebrow?: string
      /** The lines under the lead (the date route): the essentials date line where the ring reads the essentials-only
       *  pass, the line Probability's intro prints (`floorLineText`), so the ring's count is never read beside the
       *  no-date lead alone. */
      readonly lines?: readonly string[]
    }
  /** The date route's answer resolved but the table builder withholds the reading's base: the date sentence, no ring
   *  number (never a number from another offset). */
  | { readonly kind: 'no-reading'; readonly lead?: string; readonly eyebrow?: string }
  | { readonly kind: 'pending' }
  | { readonly kind: 'compute-error'; readonly onRetry: () => void }
  /** No figure: the missing facts are named by the caller (`missingFactLines`). */
  | { readonly kind: 'fallback' }

/**
 * The ring card's view for the store's answer. `plan` is `planReadingFor(snapshot.answer)` (the one plan reading);
 * `anchor` is the plan clock (`planClockAnchor`), which the date sentence and the stop year read.
 */
export function ringReading(
  elevated: ElevatedAnswer,
  plan: WhatIfReading | null,
  snapshot: Pick<MemoryModelSnapshot, 'answer'>,
  anchor: BandPlanClockAnchor,
): RingView {
  if (elevated.kind === 'fallback') return { kind: 'fallback' }
  const view = elevated.view
  if (view.kind === 'pending') return { kind: 'pending' }
  if (view.kind === 'compute-error') return { kind: 'compute-error', onRetry: view.onRetry }
  if (elevated.kind === 'spine' && view.kind === 'reading') {
    const eyebrow = view.refiguring === true ? copy.answerRefiguringVerdict : undefined
    if (plan === null) return { kind: 'no-reading', ...(eyebrow !== undefined ? { eyebrow } : {}) }
    return { kind: 'reading', face: ringFace(plan), ...(eyebrow !== undefined ? { eyebrow } : {}) }
  }
  if (elevated.kind === 'date' && view.kind === 'dates') {
    const refiguring = view.refiguring === true
    const split = composeDateSplit(view.floor, view.lifestyle)
    const hero = split.kind === 'single' ? split.track : split.lifestyle
    const lead = heroLead(hero, view.windowTopYears, anchor, refiguring)
    const eyebrow = refiguring
      ? hero.kind === 'no-date-in-window'
        ? copy.answerRefiguringVerdict
        : copy.answerRefiguringDate
      : view.provisional === true
        ? copy.answerProvisionalTag
        : undefined
    const extra = { lead, ...(eyebrow !== undefined ? { eyebrow } : {}) }
    // The stop year is the ANSWER's build year plus the reading's offset (the calendar-stable claim heroLead speaks).
    const start = snapshot.answer.kind === 'date' ? snapshot.answer.draft.startCalendarYear : anchor.startCalendarYear
    if (plan === null || plan.kind !== 'offset') return { kind: 'no-reading', ...extra }
    const lines = plan.track === 'floor' && split.kind === 'split' ? [floorLineText(split, view.windowTopYears, anchor, refiguring)] : []
    return { kind: 'reading', face: ringFace(plan, start, anchor.yearsSincePlanBuilt), ...extra, ...(lines.length > 0 ? { lines } : {}) }
  }
  return { kind: 'fallback' }
}
