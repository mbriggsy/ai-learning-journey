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
 * Takes the display TUPLE rather than a DollarAdjustment so the sticky DISPLAY figure and
 * the raw figure compose through ONE clause path (U12 C2) — the sticky `perMonthDollar` is
 * already a $10 multiple, so `formatPerMonth`'s humane rounding is a no-op on it (both
 * steps are $10; see money.ts).
 */
import type { DollarAdjustment, OutcomeState } from '@shared/model'
import { copy, slots } from './copy'
import { formatPerMonth } from './money'
import { OUTCOME_PRESENTATION } from './outcomeStates'

/** The displayed verdict tuple — structurally satisfied by the store's `StickyDisplay` and
 *  by a raw-result fallback assembled from `Headline` + `DollarAdjustment` (the preview
 *  harness path). */
export interface VerdictDisplay {
  readonly outcomeState: OutcomeState
  readonly xOfTen: number
  readonly perMonthDollar: number
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

/** The verdict's second line — the dollar grammar. The $/month enters through the slot
 *  pre-formatted, so the rendered clause carries no hardcoded numeral (copyGuard
 *  slot-discipline). */
function magnitudeClause(direction: DollarAdjustment['direction'], perMonth: number): string {
  switch (direction) {
    case 'room':
      return slots.verdictRoomClause(formatPerMonth(perMonth))
    case 'trim':
      return slots.verdictTrimClause(formatPerMonth(perMonth))
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
export function composeVerdictReading(shown: VerdictDisplay): VerdictReading | null {
  const wordKey = OUTCOME_PRESENTATION[shown.outcomeState].verdictWordKey
  if (wordKey === null) return null
  return {
    word: copy[wordKey],
    reading: verdictReadingText(shown.outcomeState, shown.xOfTen),
    clause: magnitudeClause(shown.direction, shown.perMonthDollar),
  }
}
