/** The Roth lever's plan mid-entry and the blocked Apply's missing field (`RothLever.tsx` renders them). Moved out
 *  of `RothLever.tsx` by Act 6's RC0, unchanged. */

/** The draft plan mid-entry: fields optional until committed (the intake hole-tolerance rule).
 *  `startYear` is the CALENDAR year as typed (U17 §S1) — the commit converts it to the
 *  sim-year-0 offset the engine prices; the calendar never persists (no persisted re-base). */
export interface PlanDraft {
  readonly amount?: number
  readonly startYear?: number
  readonly years?: number
}

/** The three field arms of a complete plan, ONE predicate each — `complete()` and the blocked
 *  Apply's reason (`rothPlanMissingField`) read the same three, so the sentence that names an
 *  empty field can never disagree with the candidate that refuses it. */
const amountSet = (p: PlanDraft): boolean => p.amount !== undefined && Number.isFinite(p.amount) && p.amount > 0
const startSet = (p: PlanDraft): boolean => p.startYear !== undefined && Number.isInteger(p.startYear)
const yearsSet = (p: PlanDraft): boolean => p.years !== undefined && Number.isInteger(p.years) && p.years >= 1
/** The FIRST field, in field order, that keeps the plan from completing — the one the blocked
 *  Apply's reason names (2026-09-13). `null` when every field arm holds; a PASSED start is not a
 *  missing field (it has its own two faces — the typed refusal and the applied note). Exported
 *  for the unit battery. */
export const rothPlanMissingField = (p: PlanDraft): 'amount' | 'start' | 'years' | null =>
  !amountSet(p) ? 'amount' : !startSet(p) ? 'start' : !yearsSet(p) ? 'years' : null
