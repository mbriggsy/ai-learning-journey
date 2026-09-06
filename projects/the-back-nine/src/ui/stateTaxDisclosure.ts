/*
 * src/ui/stateTaxDisclosure.ts — the S5 state-tax disclosure composition (the state-tax unit).
 *
 * PURE chrome (insight 048): the honesty decision — which state clause a household reads — lives
 * HERE and is tested HERE, never in a render path. Every consumer (the verdict hero, the Roth
 * lever, the Healthcare door sheet, the recommendation's R7 disclosure rail) reads a
 * boolean/`PricedState` off the ONE producer's-output predicate (`pricedStateForRun`, intakeMap)
 * and calls a compose function below — so the disclosure homes swap their state clause by the SAME
 * rule (insight 078 — a defect-class sweep by meaning, not by string), each gated independently at
 * its own home.
 *
 * FIVE HOMES. The build spec's S5 section (state-tax-build-spec.md, rewritten 2026-09-06 to name all five;
 * it pinned "×4 homes" until then) — the three composed
 * below plus the spend-help branch (`spendHelpKeyFor`, intakeMap:981). The RECOMMENDATION surface's
 * disclosure rail is the FIFTH, and it was born unguarded: `recDiscStateTax` shipped as the only
 * household-DEPENDENT builder with no condition, so an NC household read "this compares federal tax
 * only" three inches under a spine that had just named their state. Before the 2026-08-02 NC lift no
 * priced-state household could reach a committed recommendation, so it had never co-rendered — the
 * contradiction was newly reachable, not a regression.
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
 *  and the pre-65 clause rides a THREE-state axis (O9 closed 2026-07-17; O16 council
 *  2026-07-17, wf_fd7f75cb-916 — the hawk's veto shaped the middle state):
 *
 *    - all-65+ (`householdAll65` — `medicareOnlyPriced(draft)`, draft ages; an unknown age is
 *      FALSE, conservatively keeping a clause): the clause DROPS — no pre-65 years exist.
 *    - ACA-priced run (`acaPriced` — `acaPricedForRun`, the producer's-output read, insight
 *      080/081): the blanket "pre-65 health-plan side effects" clause is FALSE (the engine
 *      prices the conversion→MAGI→discount coupling in both preview arms), so the variant
 *      NARROWS it to the true residual — plan cost-sharing — and affirms the discount coupling
 *      is in. Routing this household to the All65 words instead was VETOED: it would silently
 *      drop the cost-sharing omission, the one-way-optimistic direction on the conversion delta
 *      (converting past an income line can forfeit cost-sharing help the tool never models).
 *    - pre-65, no ACA priced: the original clause stays — it is true there (no health model).
 *
 *  Age wins over ACA by construction (an all-65+ run builds no quote stream, so `acaPriced` is
 *  false for it — the guard order below just makes the precedence explicit). Six static catalog
 *  keys so every arm rides the require-hedge sweep. */
export function composeRothOmissionsNote(
  statePriced: boolean,
  householdAll65: boolean,
  acaPriced: boolean,
): string {
  if (householdAll65) {
    return statePriced ? copy.rothOmissionsNoteStatePricedAll65 : copy.rothOmissionsNoteAll65
  }
  if (acaPriced) {
    return statePriced ? copy.rothOmissionsNoteStatePricedAcaPriced : copy.rothOmissionsNoteAcaPriced
  }
  return statePriced ? copy.rothOmissionsNoteStatePriced : copy.rothOmissionsNote
}

/** The Healthcare door sheet's omissions note (home #3): the state-tax item drops when priced,
 *  gated INDEPENDENTLY of the verdict + Roth homes (insight 078 — different population, own
 *  chrome). */
export function composeControlHealthOmissionsNote(statePriced: boolean): string {
  return statePriced ? copy.controlHealthOmissionsNoteStatePriced : copy.controlHealthOmissionsNote
}

/** The recommendation surface's state-tax disclosure (home #5): the shipped scope note, or `null`
 *  when THIS run priced the household's state. A DROP, not a swap — matching homes #2/#3 (both
 *  omission LISTS, as the R7 disclosure rail is) rather than home #1's affirm+narrow, so it needs no
 *  new copy and no new require-hedge sweep. `recDiscStateTax` says the delta "compares federal tax
 *  only"; for a priced household `lifetimeTaxPaidReal` carries the state layer, so the sentence is
 *  simply false there and the honest move is to stop saying it.
 *
 *  EXHAUSTIVE by construction, for the reason {@link composeVerdictMedicareResidual} is: the drop is
 *  honest only because the v1 roster is FLAT-or-zero, which makes the federal-only bracket-fill rails
 *  provably neutral — no state term can move the optimal fill point when the state rate is the same
 *  on every marginal dollar. A GRADUATED state (SC) joining `PricedState` breaks that proof and owes
 *  a replacement caveat naming the residual, NOT this silence. Widening `PricedState` fails tsc here
 *  until someone answers that.
 *
 *  ⚠️ KNOWN RESIDUAL, deliberately not covered here: neutrality is CROSS-SECTIONAL. NC's flat rate
 *  STEPS DOWN by schedule (3.49 → 3.24 → 2.99), so converting later is cheaper in state tax — a
 *  TIMING signal the federal-only rails cannot see. That is a ranking gap, not a disclosure gap, and
 *  a scope note has never been the honest instrument for a mis-ranking (oracleToken.ts:112-133).
 *  Filed in the register; do not "fix" it by restoring this sentence. */
export function composeRecStateTaxDisclosure(pricedState: PricedState | undefined): string | null {
  if (pricedState === undefined) return copy.recDiscStateTax
  switch (pricedState) {
    case 'NC':
    case 'PA':
    case 'FL':
      return null
    default: {
      const never: never = pricedState
      throw new Error(`unhandled priced state ${String(never)}`)
    }
  }
}
