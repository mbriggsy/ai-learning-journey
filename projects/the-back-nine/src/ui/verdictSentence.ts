/*
 * src/ui/verdictSentence.ts — the ONE verdict-sentence composer (U12 ultramode).
 *
 * The sticky-triple → sentence composition (verdict word + the "X of 10" reading + the
 * $/month clause) previously lived in TWO places — ConfidenceStatement's hero lockup and
 * the AssumptionPanel's echo — and the count half had ALREADY diverged: the hero read the
 * over-funded ceiling through `slots.xOfTenAtCeiling()` ("better than 9 in 10", the
 * 10-of-10 honesty clamp called BY NAME) while the echo rendered `slots.xOfTen(9)` ("9 of
 * 10") for the identical triple — two readings of one answer in one flow. Worse, the
 * duplicated clause ternary was a latent OPTIMISTIC-desync hazard: a future wording change
 * landing in only one copy would show a rosier clause inside the escape hatch than on the
 * hero. One composer makes that desync unrepresentable — BOTH surfaces call it.
 *
 * Takes the display TUPLE rather than a DollarAdjustment so the sticky DISPLAY triple and the
 * raw reading compose through ONE clause path (U12 C2). The tuple carries no dollar figure:
 * the only figure the clause quotes is the spend lane's REAL one, gated in by `spendClauseFor`
 * (the proxy `perMonthDollar` it once carried was deleted in the spend solve's phase C).
 */
import type { DollarAdjustment, OutcomeState } from '@shared/model'
import { copy, slots } from './copy'
import { formatPerMonth, formatSolvedSpend } from './money'
import type { SpendAnswer } from '@store/memoryModel'
import { OUTCOME_PRESENTATION } from './outcomeStates'

/** The displayed verdict tuple — structurally satisfied by the store's `StickyDisplay` and
 *  by a raw-result fallback assembled from `Headline` + `DollarAdjustment` (the preview
 *  harness path). */
export interface VerdictDisplay {
  readonly outcomeState: OutcomeState
  readonly xOfTen: number
  /** The entered spend per month the run scaled its trim from (the clause's other endpoint) —
   *  carried on the tuple so hero and echo quote the SAME base as the delta, from one commit. */
  readonly spendPerMonthReal: number
  readonly direction: DollarAdjustment['direction']
}

export interface VerdictReading {
  /** The verdict WORD ("On track", "More than covered", …). */
  readonly word: string
  /** The count reading — `xOfTenAtCeiling()` for over-funded (the 10-of-10 honesty clamp,
   *  called BY NAME — never the magic `xOfTen(10)`), the plain `xOfTen(n)` slot otherwise. */
  readonly reading: string
  /** The magnitude clause, keyed off the engine DIRECTION (never re-derived here). */
  readonly clause: string
}

/** What the magnitude clause knows about the REAL spend figure (the spend lane):
 *  - `undefined` — unsized: the shipped figure-less sentence ("… doesn't work out how much …");
 *  - `pending`   — the solve is in flight: the first sentence ALONE (the tail would read falsely final);
 *  - `sized`     — the verified figure F, a run AT F passed and a run at F + one step failed. */
export type SpendClause =
  | { readonly kind: 'pending' }
  | { readonly kind: 'sized'; readonly monthlyReal: number; readonly failedAtMonthlyReal: number }

/** THE GATE between the spend lane and the sentence (council wf_faa1af2d-052). A figure rides ONLY
 *  when the SHOWN verdict is the RAW verdict (the sticky seam may hold a previous state for a frame of
 *  hysteresis — a figure solved for the raw state beside a held word would be the mixed-pair sin) and
 *  the solve's direction is the shown direction. Anything else is unsized. */
export function spendClauseFor(
  spend: SpendAnswer | undefined,
  shown: VerdictDisplay,
  rawOutcomeState: OutcomeState,
): SpendClause | undefined {
  if (spend === undefined || shown.outcomeState !== rawOutcomeState) return undefined
  if (shown.direction !== 'room' && shown.direction !== 'trim') return undefined
  if (spend.kind === 'pending') return { kind: 'pending' }
  if (spend.kind === 'resolved' && spend.outcome.kind === 'sized' && spend.outcome.direction === shown.direction) {
    return { kind: 'sized', monthlyReal: spend.outcome.monthlyReal, failedAtMonthlyReal: spend.outcome.failedAtMonthlyReal }
  }
  return undefined
}

/** The SIZED sentence's widest plausible form, for the pending clause to RESERVE its height (insight
 *  035 — the `.ladder-readout` precedent: a line that grows under the reader must hold its box so the
 *  band below never jumps when the figure lands). The figure is the widest the solve can return on
 *  this side: the room cap (3× the entered spend) for room, the entered spend itself for trim. Null
 *  for a direction that is never sized. Presentation only — never rendered visibly, never announced. */
export function reserveClauseFor(shown: VerdictDisplay): string | null {
  const entered = formatPerMonth(shown.spendPerMonthReal)
  const grid = (m: number) => formatPerMonth(Math.floor(m / 100) * 100)
  if (shown.direction === 'room') return slots.verdictRoomSized(entered, grid(shown.spendPerMonthReal * 3))
  if (shown.direction === 'trim') return slots.verdictTrimSized(entered, grid(shown.spendPerMonthReal))
  return null
}

/** The verdict's second line — the dollar grammar. The $/month enters through the slot
 *  pre-formatted, so the rendered clause carries no hardcoded numeral (copyGuard
 *  slot-discipline). Room AND trim quote ONLY the spend they entered and name the size as unworked
 *  (council 2026-09-25; room 2026-09-26): the engine's magnitudes are unsolved heuristics — the trim
 *  over-cut ~2× on the `retired` frame and read as sufficiency (Briggsy's cold read, E17); the room
 *  oversold `surplus` onto borderline. The engine's `perMonthReal` renders nowhere and rides no display
 *  tuple (phase C deleted the sticky copy). The REAL figure arrives through `spend` (the spend lane, spendSolve.ts):
 *  sized ⇒ the verified F with its edge named; pending ⇒ the first sentence alone; else figure-less. */
function magnitudeClause(
  direction: DollarAdjustment['direction'],
  spendPerMonthReal: number,
  spend: SpendClause | undefined,
): string {
  const entered = formatPerMonth(spendPerMonthReal)
  const solved = spend?.kind === 'sized' ? formatSolvedSpend(spend.monthlyReal, spend.failedAtMonthlyReal - spend.monthlyReal) : null
  switch (direction) {
    case 'room':
      if (solved !== null) return slots.verdictRoomSized(entered, solved)
      return spend?.kind === 'pending' ? slots.verdictRoomLead(entered) : slots.verdictRoomClause(entered)
    case 'trim':
      if (solved !== null) return slots.verdictTrimSized(entered, solved)
      return spend?.kind === 'pending' ? slots.verdictTrimLead(entered) : slots.verdictTrimClause(entered)
    case 'on-the-line':
      return slots.verdictHoldClause()
    case 'rethink':
      // already-failing (0 of 10, unfundable from the start): the engine drops the figure — no single
      // trim is a solve — so the clause is figure-less + lever-agnostic. (Council 2026-06-29.)
      return slots.verdictRethinkClause()
  }
}

/** The count READING alone — the over-funded ceiling BY NAME (`xOfTenAtCeiling`, never the
 *  magic `xOfTen(10)`), the plain count otherwise. The ONE home for the state→reading branch:
 *  the hero + panel echo consume it through {@link composeVerdictReading}, and the provisional
 *  AnswerStrip calls it directly (the strip renders no clause, so composing the full triple
 *  there would fabricate arguments — council 2026-07-18 Q4a: the strip was the un-folded
 *  sibling of the U12 echo desync, reading "9 of 10" where the hero read the ceiling). */
export function verdictReadingText(outcomeState: OutcomeState, xOfTen: number): string {
  return outcomeState === 'over-funded' ? slots.xOfTenAtCeiling() : slots.xOfTen(xOfTen)
}

/** Compose the rendered verdict sentence pieces for a displayed triple. Returns `null` only
 *  for `indeterminate` (not a verdict — the surface shows its own incompleteness copy; the
 *  sixth-state asymmetry, outcomeStates.ts). */
export function composeVerdictReading(shown: VerdictDisplay, spend?: SpendClause): VerdictReading | null {
  const wordKey = OUTCOME_PRESENTATION[shown.outcomeState].verdictWordKey
  if (wordKey === null) return null
  return {
    word: copy[wordKey],
    reading: verdictReadingText(shown.outcomeState, shown.xOfTen),
    clause: magnitudeClause(shown.direction, shown.spendPerMonthReal, spend),
  }
}
