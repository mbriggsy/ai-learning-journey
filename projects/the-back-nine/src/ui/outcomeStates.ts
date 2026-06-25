/*
 * src/ui/outcomeStates.ts — the outcome-state PRESENTATION lookup (U7).
 *
 * A pure, exhaustive map from the engine-tagged {@link OutcomeState} to how the U7 confidence
 * statement is SHAPED for that state — the verdict word, the statement framing, and the coarse
 * in-tool next action. It is presentation ONLY: it re-derives NO threshold, band edge, or clamp.
 * `confidence.ts` already tagged the distribution (`selectOutcomeState` owns the `BANDS`); this
 * file must never second-guess that tag, or a screenshot could disagree with its own verdict
 * word. The `Record<OutcomeState, …>` makes it compile-error exhaustive: a 7th state (the enum is
 * closed — model.ts §OutcomeState) would fail to build HERE, never render a blank.
 *
 * THE SIXTH-STATE ASYMMETRY (verified 2026-06-24 — do not "fix" it): there are SIX glyphs
 * (verdictSignal) but only FIVE outcome WORDS (copy.ts has no `outcomeIndeterminate`).
 * `indeterminate` is not a verdict — it is range/incomplete — so it carries `verdictWordKey: null`
 * and `framing: 'range'`, and the surface sources its text from the provisional-answer strip
 * (`answerIncomplete` / `answerPending` / `answerNotYet`), chosen by the surface's OWN mode
 * (pending vs incomplete vs not-yet). The asymmetry is intentional; it is encoded here so it can
 * never be mistaken for a gap.
 */
import type { OutcomeState } from '@shared/model'
import type { CopyKey } from './copy'

/** How the verdict statement LEADS for a state.
 *  - `outcome-first` — the verdict WORD leads (the plan is covered: over-funded / on-track).
 *  - `action-first` — the magnitude / what-moves-it leads (the plan needs steadying:
 *    borderline / off-track / already-failing).
 *  - `range` — there is no verdict yet (`indeterminate`); the surface shows the incompleteness
 *    copy, never an outcome word. */
export type VerdictFraming = 'outcome-first' | 'action-first' | 'range'

/** The coarse in-tool affordance a state INVITES — a SEMANTIC intent the surface maps to a
 *  control + label. The user-facing label is deliberately NOT authored here: it is the cold-read's
 *  / D2's call, and the Act-3 controls it ultimately points at are not built yet. This is NOT the
 *  dollar DIRECTION (that is engine-computed per run on {@link DollarAdjustment} — and `on-track`
 *  can be either `'room'` or `'on-the-line'`); the finer money nuance rides the magnitude clause
 *  (`copy.slots.verdict*`). This is the per-STATE coarse intent only. */
export type NextAction =
  | 'explore-room' // covered — using any surplus is optional exploration
  | 'steady-the-plan' // on or below the line — what would bring it onto solid ground
  | 'rethink-inputs' // unfundable from the start — a bigger rethink than a tweak
  | 'keep-going' // not enough entered yet — finish the questions

export interface OutcomePresentation {
  /** The verdict WORD's copy key. `null` ONLY for `indeterminate` (no verdict — range). Typed as
   *  `CopyKey`, so a typo'd or stale key is a compile error, not a blank verdict at runtime. */
  readonly verdictWordKey: CopyKey | null
  readonly framing: VerdictFraming
  readonly nextAction: NextAction
}

/** The exhaustive lookup. `Record<OutcomeState, …>` ⇒ a new or removed engine state breaks the
 *  build right here, never silently renders an empty verdict. */
export const OUTCOME_PRESENTATION: Record<OutcomeState, OutcomePresentation> = {
  'over-funded': { verdictWordKey: 'outcomeOverFunded', framing: 'outcome-first', nextAction: 'explore-room' },
  'on-track': { verdictWordKey: 'outcomeOnTrack', framing: 'outcome-first', nextAction: 'explore-room' },
  borderline: { verdictWordKey: 'outcomeBorderline', framing: 'action-first', nextAction: 'steady-the-plan' },
  'off-track': { verdictWordKey: 'outcomeOffTrack', framing: 'action-first', nextAction: 'steady-the-plan' },
  'already-failing': { verdictWordKey: 'outcomeAlreadyFailing', framing: 'action-first', nextAction: 'rethink-inputs' },
  indeterminate: { verdictWordKey: null, framing: 'range', nextAction: 'keep-going' },
} as const
