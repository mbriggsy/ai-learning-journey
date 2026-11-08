/**
 * Build 2's shown state — what every surface of the left-over question reads (R3 of
 * `docs/plans/features/working-year-surplus-build-spec.md`): one of seven states, decided in R3's order.
 * A PURE LEAF: it takes the three facts and imports no intake module, so `intakeMap` (the carriage in
 * `buildDateInput`, which must know the state) and `workingYearLeftOver` (the writes, the moved line)
 * both read it with no import cycle. The draft-level read, the ONE every surface calls, is
 * `workingYearLeftOverShownState` in `intakeMap`, which supplies the facts from the draft.
 *
 *  1. `not-asked` — no picture to ask under: W absent or $0, the picture unknown, or a printed year-0
 *     Left over below $1 (R5), whatever is stored. The question is hidden and nothing is carried.
 *  2. `waiting-on-w` — W is stale (build 1's R4 staleness), whatever is stored. Nothing is carried (R7),
 *     and the panel seat shows its waiting line instead of the radios (R5).
 *  3. Then the stored answer: `absent` (unanswered), `saved` (carried), `saved-moved` (carried; the
 *     live figure differs from the stored one, so the engine credits under the smaller — R8, R12),
 *     `spent`, `not-sure`.
 *
 * Every surface maps the state through an exhaustive `Record<LeftOverShownState, …>` (insight 147),
 * never a Set, a ternary chain or a default arm. The rules more than one surface reads live HERE, once
 * (insight 081): what a face draws (`LEFT_OVER_FACE`: the question, the panel seat's row and the write's
 * gate), what the engine hears (`LEFT_OVER_CARRIES`), which state is "moved" (`LEFT_OVER_MOVED`: the
 * moved core) and which state lets W's stale line carry the dollars clause (`LEFT_OVER_W_CLAUSE`).
 */
import type { WorkingYearLeftOverKind, WorkingYearLeftOverV5 } from '@shared/model'

export const LEFT_OVER_SHOWN_STATES = [
  'not-asked',
  'waiting-on-w',
  'absent',
  'saved',
  'saved-moved',
  'spent',
  'not-sure',
] as const
export type LeftOverShownState = (typeof LEFT_OVER_SHOWN_STATES)[number]

/** The three facts R3 decides on. `liveYear0` is the money picture's PRINTED year-0 bottom line (signed
 *  whole dollars, `WorkingYearLedgerYear0.bottomLine`), or `null` when there is no picture (W absent or
 *  $0, a refused or unbuildable run). Never the raw cash: the grain is the printed figure (insight 146). */
export interface LeftOverFacts {
  readonly answer: WorkingYearLeftOverV5 | undefined
  readonly wStale: boolean
  readonly liveYear0: number | null
}

/** The two replies that carry no figure, each to its own state. */
const FIGURELESS_STATE: Readonly<Record<Exclude<WorkingYearLeftOverKind, 'saved'>, LeftOverShownState>> = {
  spent: 'spent',
  'not-sure': 'not-sure',
}

export function leftOverShownState(f: LeftOverFacts): LeftOverShownState {
  if (f.liveYear0 === null || f.liveYear0 < 1) return 'not-asked'
  if (f.wStale) return 'waiting-on-w'
  const a = f.answer
  if (a === undefined) return 'absent'
  // Both figures are whole dollars, so the exact compare is the right one (never against the raw cash).
  if (a.kind === 'saved') return a.quotedReal === f.liveYear0 ? 'saved' : 'saved-moved'
  return FIGURELESS_STATE[a.kind]
}

/** Which states carry the stored figure into the engine (R7, and the Phase A review's obligation (a)):
 *  the two saved states only — a fresh W, a KNOWN picture, a printed year-0 Left over of $1 or more. The
 *  engine caps every credit at the run's OWN year-0 print, so a figure carried under an unknown picture
 *  could still credit; under "not asked" and "waiting on W" nothing rides, and the run is HEAD's. */
export const LEFT_OVER_CARRIES: Readonly<Record<LeftOverShownState, boolean>> = {
  'not-asked': false,
  'waiting-on-w': false,
  absent: false,
  saved: true,
  'saved-moved': true,
  spent: false,
  'not-sure': false,
}

/** What a surface draws in each shown state (R3, R5): nothing ("not asked": no picture to ask under), the
 *  waiting line with no radios (W stale), or the question. ONE home: the question's face, the panel seat's
 *  row (no row where the face is none) and the write's gate (a reply lands only where the question is
 *  drawn) all read it, so the three can never split (insight 081). */
export type LeftOverFace = 'none' | 'waiting' | 'question'
export const LEFT_OVER_FACE: Readonly<Record<LeftOverShownState, LeftOverFace>> = {
  'not-asked': 'none',
  'waiting-on-w': 'waiting',
  absent: 'question',
  saved: 'question',
  'saved-moved': 'question',
  spent: 'question',
  'not-sure': 'question',
}

/** Which state is R12's "moved" — the moved core's one read (the re-entry gate's fact and sentence, the
 *  Result's standing line). */
export const LEFT_OVER_MOVED: Readonly<Record<LeftOverShownState, boolean>> = {
  'not-asked': false,
  'waiting-on-w': false,
  absent: false,
  saved: false,
  'saved-moved': true,
  spent: false,
  'not-sure': false,
}

/** Which state lets W's one stale line carry R12's dollars clause, for a "saved" answer: "waiting on W" only.
 *  Under "not asked" (a year 0 below a printed $1, or no picture) W's line gains no clause (R12's quiet arm). */
export const LEFT_OVER_W_CLAUSE: Readonly<Record<LeftOverShownState, boolean>> = {
  'not-asked': false,
  'waiting-on-w': true,
  absent: false,
  saved: false,
  'saved-moved': false,
  spent: false,
  'not-sure': false,
}
