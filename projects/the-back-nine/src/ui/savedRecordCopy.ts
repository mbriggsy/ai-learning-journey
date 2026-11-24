/**
 * The saved-recommendation record card's copy (`savedRecordCardView` takes its strings as a parameter: its own header
 * says why), assembled ONCE from the swept catalog and read by every card that shows the record: the answer page's
 * strategy slot (`Result.tsx`) and Snapshot's Recommendations card (Act 6 · RC3). Moved out of `Result.tsx` so the two
 * can never word one record differently.
 *
 * The cause map is typed `Record<SavedRecommendationSupersededCause, string>`, EXHAUSTIVE: the day the store adds a
 * fifth supersession cause THIS literal fails to compile (TS2741) instead of a card silently missing a clause.
 */
import { copy, slots } from './copy'
import type { SavedRecordCopy } from './recommendationSaveView'

export const SAVED_RECORD_COPY: SavedRecordCopy = {
  heading: copy.recommendRecordHeading,
  stillHolds: copy.recommendRecordHolds,
  causes: {
    'inputs-changed': copy.recommendRecordSupersededInputs,
    'inputs-unavailable': copy.recommendRecordSupersededUnavailable,
    'solver-changed': copy.recommendRecordSupersededSolver,
    'rules-changed': copy.recommendRecordSupersededRules,
  },
  savedIn: slots.recommendRecordSavedIn,
  reopenLabel: copy.recommendRecordReopenCta,
  reopenCostLine: copy.recommendRecordReopenCost,
}
