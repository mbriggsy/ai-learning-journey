/*
 * src/ui/stateTaxDisclosure.ts — the S5 state-tax disclosure composition (the state-tax unit).
 *
 * PURE chrome (insight 048): the honesty decision — which state clause a household reads — lives
 * HERE and is tested HERE, never in a render path. Every consumer (the verdict hero, the Roth
 * lever, the Healthcare door sheet) reads a boolean/`PricedState` off the ONE producer's-output
 * predicate (`pricedStateForRun`, intakeMap) and calls a compose function below — so the four
 * disclosure homes swap their state clause by the SAME rule (insight 078 — a defect-class sweep by
 * meaning, not by string), each gated independently at its own home.
 *
 * THE MONOLITHIC-STRING TRAP (the spec's named landmine): the state-tax mention was embedded
 * mid-sentence (`verdictMedicareResidual`) and mid-comma-list (`rothOmissionsNote`,
 * `controlHealthOmissionsNote`). A static string can't drop one clause — so the copy is SPLIT into
 * clause-parts and RE-COMPOSED here. The UNPRICED composition is byte-identical to the shipped
 * monolith (a copyGuard drift-pin proves it), so a non-priced / 'elsewhere' / unbuilt-state
 * household reads today's words verbatim.
 *
 * NEVER AN OPTIMIZATION CLAIM (§V / S2.8 twin constraint): the affirmation says the state tax is
 * REFLECTED in the numbers (an outcome fact), never that the conversion/sequencing recommendation
 * was state-OPTIMIZED — the bracket-fill rails stay FEDERAL in v1, provably neutral for a
 * flat-or-zero roster. The caveat becomes mandatory the moment a graduated state joins the roster.
 */

import type { PricedState } from '@engine/constants/stateTax'
import { copy } from './copy'

/** The verdict residual (the all-65+/Medicare hero's subordinate line), composed with the
 *  household's state-tax clause SWAPPED in place. `undefined` (not priced / 'elsewhere' / unbuilt /
 *  degenerate-overlay) ⇒ the shipped monolith VERBATIM. A `PricedState` ⇒ the outcome-scoped
 *  affirmation naming the state + the narrowed residual (the `…Tail` premiums-flat clause) — an
 *  affirm+narrowed-residual SET, never affirm-alone. Same paragraph, wrap-driven height only. */
export function composeVerdictMedicareResidual(pricedState: PricedState | undefined): string {
  if (pricedState === undefined) return copy.verdictMedicareResidual
  // EXHAUSTIVE by construction (the ultramode review fold, 2026-07-15): a catch-all arm would
  // silently dress a FUTURE priced state (SC) in Florida's "no state income tax" words — the
  // calm-but-wrong sentence for a state that DOES tax. Widening PricedState fails tsc here
  // until the new state's own affirmation ships.
  const affirm = ((): string => {
    switch (pricedState) {
      case 'NC':
        return copy.verdictResidualStateNC
      case 'PA':
        return copy.verdictResidualStatePA
      case 'FL':
        return copy.verdictResidualStateFL
      default: {
        const never: never = pricedState
        throw new Error(`unhandled priced state ${String(never)}`)
      }
    }
  })()
  return `${copy.verdictResidualLead} ${affirm}${copy.verdictResidualTail}`
}

/** The Roth lever's omissions note (home #2): the state-tax item drops for a priced household,
 *  and the pre-65 clause drops for an all-65+ household (O9, closed 2026-07-17 — age is that
 *  clause's display domain; the caller passes `medicareOnlyPriced(draft)`, whose unknown-age
 *  arm is FALSE, so an unanswered age conservatively keeps the clause). Two independent axes,
 *  four variants — each a static catalog key so every arm rides the require-hedge sweep. */
export function composeRothOmissionsNote(statePriced: boolean, householdAll65: boolean): string {
  if (statePriced) {
    return householdAll65 ? copy.rothOmissionsNoteStatePricedAll65 : copy.rothOmissionsNoteStatePriced
  }
  return householdAll65 ? copy.rothOmissionsNoteAll65 : copy.rothOmissionsNote
}

/** The Healthcare door sheet's omissions note (home #3): the state-tax item drops when priced,
 *  gated INDEPENDENTLY of the verdict + Roth homes (insight 078 — different population, own
 *  chrome). */
export function composeControlHealthOmissionsNote(statePriced: boolean): string {
  return statePriced ? copy.controlHealthOmissionsNoteStatePriced : copy.controlHealthOmissionsNote
}
