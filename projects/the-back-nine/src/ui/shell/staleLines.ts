/**
 * src/ui/shell/staleLines.ts: what the StaleBanner says on the figured pages (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC4 "Interim homes"; section 4.0's disclosure map). Pure. The old answer page carried these three in its hero; RC4
 * moved each to the StaleBanner above Snapshot and Probability, unchanged in what it says (fix round 1 of the milestone-1
 * review put it above Cash Flows too; round 3 gave it the aged line there as well, since that page's row-one line names
 * the build year and claims nothing about the balances):
 * - the staleness note (P3·U13: a rules clock fired at unlock), with build 2's moved left over as its clause where a
 *   rules line hosts it (`composeReentry` decided the host once; insight 101: one cause, one line);
 * - the aged-balances line (the save is at least one calendar year old, `agedBalancesYearFor`), its door the guided
 *   re-walk (re-confirm your numbers) where the tab can write;
 * - the ONE standing line (`composeAnswerNotes`: W stale first, then the typed-below line, then the moved left over),
 *   its door opening the assumption panel at that cause's seat (the gear's drawer until RC13), drawn only where the tab
 *   can save (a read-only tab reads the fact alone: the composer drops the seat and the parts' `door`).
 * Each cause names its own lead and door label (insight 147), moved here from the deleted date hero.
 */
import type { AnswerNotes, StandingNoteCause } from '../answerNotes'
import type { AssumptionLandingSeat } from '../assumptionRegistry'
import { WORKING_COST_ACT_COPY, copy, slots, type CopyKey } from '../copy'
import type { NoteParts } from '../noteParts'

/** Each cause's lead and door label, exhaustive (insight 147): W's line never borrows the left over's words, nor the
 *  reverse, and its door is the act's own. The typed-below line has no digit-free lead (its first sentence names the
 *  answer and both figures itself), so `null`. */
export const STANDING_DOOR_COPY: Readonly<Record<StandingNoteCause, { readonly lead: CopyKey | null; readonly cta: CopyKey }>> = {
  'w-stale-update': { lead: 'stalenessPayCheckNote', cta: WORKING_COST_ACT_COPY.update.resultDoor },
  'w-stale-confirm-or-change': { lead: 'stalenessPayCheckNote', cta: WORKING_COST_ACT_COPY.confirmOrChange.resultDoor },
  'w-typed-below': { lead: null, cta: WORKING_COST_ACT_COPY.update.resultDoor },
  'left-over-moved': { lead: 'stalenessLeftOverNote', cta: 'stalenessLeftOverCta' },
}

export type StaleLine =
  | { readonly kind: 'staleness'; readonly text: string }
  | { readonly kind: 'aged'; readonly text: string; readonly door?: { readonly label: string } }
  | {
      readonly kind: 'standing'
      readonly cause: StandingNoteCause
      /** The line's parts, its opening carrying the cause's lead. */
      readonly parts: NoteParts
      /** The door into the panel at the cause's seat; absent on a read-only tab. */
      readonly door?: { readonly label: string; readonly seat: AssumptionLandingSeat }
    }

/** The StaleBanner's lines for the shown answer, in order. `canReconfirm`: the tab can write, so the aged line carries
 *  the re-walk's door. */
export function composeStaleLines(notes: AnswerNotes, canReconfirm: boolean): readonly StaleLine[] {
  const out: StaleLine[] = []
  if (notes.stalenessNote) {
    out.push({ kind: 'staleness', text: notes.stalenessClause === undefined ? copy.stalenessHeroNote : `${copy.stalenessHeroNote} ${notes.stalenessClause}` })
  }
  if (notes.agedBalancesYear !== undefined) {
    out.push({ kind: 'aged', text: slots.staleAgedBalances(notes.agedBalancesYear), ...(canReconfirm ? { door: { label: copy.bandPremiseReconfirmCta } } : {}) })
  }
  const standing = notes.standing
  if (standing !== undefined) {
    const lead = STANDING_DOOR_COPY[standing.cause].lead
    const parts: NoteParts = { ...standing.parts, opening: lead === null ? standing.parts.opening : `${copy[lead]} ${standing.parts.opening}` }
    out.push({
      kind: 'standing',
      cause: standing.cause,
      parts,
      ...(standing.seat !== undefined ? { door: { label: copy[STANDING_DOOR_COPY[standing.cause].cta], seat: standing.seat } } : {}),
    })
  }
  return out
}
