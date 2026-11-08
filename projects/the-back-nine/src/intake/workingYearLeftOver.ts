/**
 * Build 2's left-over answer on the intake side (`docs/plans/features/working-year-surplus-build-spec.md`
 * R1–R7, R12, KTD8, KTD9): the ONE write the question's two homes call, and the ONE core the stale lines
 * read. Pure functions of the draft. The shown state itself is `intakeMap.workingYearLeftOverShownState`
 * (the carriage needs it, so it lives beside the money picture it reads); this module imports it one way.
 *
 * THE WRITE (R2, R5, KTD8). A reply is written on the store's CURRENT draft (insight 036), and only while
 * that draft still passes R5's gate — a fresh W and a printed year-0 Left over of $1 or more (the shown
 * state is neither "not asked" nor "waiting on W"). A press that lands after a commit closed the gate
 * stores nothing. "All of it" stores the figure the FACE showed (`shownFigure`: in the panel, the figure
 * the gesture hold drew at the press), never a figure read here: one answer consents to one figure (Key
 * Decisions). Where that differs from the live figure, the answer reads "moved" at once (KTD8). "Spent"
 * and "not sure" store no figure. Nothing ever writes a token for "unanswered": that state is the key's
 * absence (R1). Idempotent: the house's segmented control calls a first tap twice.
 *
 * THE MOVED CORE (R12, U14's obligation (f)). `workingYearLeftOverMoved` returns both figures exactly when
 * the shown state is "saved, moved", or `null`. The re-entry gate's predicate and its sentence both read
 * it, so the two can never disagree — `composeReentry` throws on the fact without its sentence, and its one
 * caller turns that throw into the restore-failed face on every reload.
 */
import type { WorkingYearLeftOverKind, WorkingYearLeftOverV5 } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { slots } from '@ui/copy'
import { formatMoney } from './fields'
import { workingYearLeftOverLive, workingYearLeftOverShownState } from './intakeMap'
import { workingYearCostStaleText } from './workingYearQuote'
import { LEFT_OVER_FACE, LEFT_OVER_MOVED, LEFT_OVER_W_CLAUSE } from './workingYearLeftOverState'

/** The reply as the question's radios name it, written onto `d` — or `d` unchanged where the live draft no
 *  longer passes R5's gate. `shownFigure` is the whole-dollar year-0 Left over the face showed (≥ 1 by
 *  the face's own gate). */
export function writeWorkingYearLeftOver(
  d: ScenarioDraft,
  kind: WorkingYearLeftOverKind,
  shownFigure: number,
): ScenarioDraft {
  // R5's gate: a reply lands only where the question is drawn (the leaf's one face Record).
  if (LEFT_OVER_FACE[workingYearLeftOverShownState(d)] !== 'question') return d
  const answer: WorkingYearLeftOverV5 = kind === 'saved' ? { kind, quotedReal: shownFigure } : { kind }
  return { ...d, workingYearLeftOver: answer }
}

/** The two figures of a "saved, moved" answer — what the household chose against, and today's printed
 *  year-0 Left over — or `null` in every other shown state. The ONE core the moved fact and its words
 *  read (obligation (f)). */
export interface WorkingYearLeftOverMoved {
  readonly stored: number
  readonly live: number
}

export function workingYearLeftOverMoved(d: ScenarioDraft): WorkingYearLeftOverMoved | null {
  const answer = d.workingYearLeftOver
  // The answer first: a draft that is not "saved" never composes the money picture here (the Result reads
  // this on every draft).
  if (answer?.kind !== 'saved' || !LEFT_OVER_MOVED[workingYearLeftOverShownState(d)]) return null
  const live = workingYearLeftOverLive(d)
  return live === null ? null : { stored: answer.quotedReal, live }
}

/** The moved line's sentence (after `copy.stalenessLeftOverNote`), and the clause a fired tax, state-tax or
 *  working-years line carries instead (R12) — both read off the moved core's ONE value, so the gate's fact
 *  and its words can never disagree (obligation (f)). Each names the smaller of the two as the most a year adds
 *  (R8 caps every credit at both). */
export function workingYearLeftOverMovedText(m: WorkingYearLeftOverMoved): string {
  return slots.stalenessLeftOverMoved(formatMoney(m.stored), formatMoney(m.live), formatMoney(Math.min(m.stored, m.live)))
}

export function workingYearLeftOverMovedClause(m: WorkingYearLeftOverMoved): string {
  return slots.stalenessLeftOverClause(formatMoney(m.stored), formatMoney(m.live), formatMoney(Math.min(m.stored, m.live)))
}

/** W's ONE stale line as the Result and the re-entry gate say it (R12): the W step's own sentence
 *  (`workingYearCostStaleText`, which stays pure W — it also draws the walk's W note and the panel's W row,
 *  and importing this module there would close the loop KTD2 removed), then, for a "saved" answer waiting on
 *  W, the clause naming in dollars what is not added until W is checked. `null` while W is not stale.
 *  Under any other answer W's line gains no clause; under "not asked" (no picture, or below a printed $1)
 *  neither. The clause follows W's lean where that rides: both are true at once.
 *
 *  The clause names the figure the household ANSWERED at (`quotedReal`), never the live print (KTD7's
 *  review, `wf_1b3d4a9f-f3f`): the live print is read on the stale W, and once a raise lifts it above the
 *  stored figure it would name money no checked W can credit — R8 caps every credit at the stored figure. */
export function workingYearCostStaleLine(d: ScenarioDraft): string | null {
  const base = workingYearCostStaleText(d)
  const answer = d.workingYearLeftOver
  if (base === null || answer?.kind !== 'saved') return base
  return LEFT_OVER_W_CLAUSE[workingYearLeftOverShownState(d)]
    ? `${base} ${slots.workingCostStaleLeftOverClause(formatMoney(answer.quotedReal))}`
    : base
}
