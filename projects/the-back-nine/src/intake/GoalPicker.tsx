/*
 * src/intake/GoalPicker.tsx — Act-4 · U16 §S2: the Tier-2 GOAL choice that PRECEDES the solve.
 *
 * The recommend-second beat optimizes a surplus goal ABOVE the survival floor (R21); which goal is a
 * USER choice, never a silent default (burned/062 — an unset sentinel, never a plausible stand-in).
 * Activating the invited affordance opens THIS dialog first; a confirmed pick writes `chosenGoal` and
 * dispatches the solve (the caller owns the model write + dispatch, the ControlSheet-family discipline).
 * A re-pick reopens with the standing choice pre-selected and VISIBLY re-solves.
 *
 * REUSES the ControlSheet scaffold's focus contract VERBATIM (capture on open, focus the heading,
 * restore on close incl. sheet→sheet, scroll lock, reduced-motion slide→fade) and the proven
 * `control-policy` radio grammar (real labelled radios; the picked row thickens its border — WEIGHT,
 * never hue alone, the color-blind law). It adds NO sheet-shell selectors and copies no grammar.
 *
 * THE GOAL VOCABULARY IS THE ONE CANONICAL ARRAY (RECOMMENDATION_GOALS, model.ts) — the options are
 * derived from it, and the copy maps are `Record<RecommendationGoal, …>` so a goal added to the union
 * cannot silently skip a label/gloss (a compile error until both are authored).
 */
import { useEffect, useRef, useState } from 'react'
import { RECOMMENDATION_GOALS, type RecommendationGoal } from '@shared/model'
import { copy, type CopyKey } from '@ui/copy'
import type { Announcer } from './a11y'
import { ControlSheet } from './controlSheet'

/** Each goal → its label + one-line gloss copy keys. `Record<RecommendationGoal, …>` is EXHAUSTIVE:
 *  a goal added to the shared union breaks the build here until its copy is authored (the model.ts
 *  membership contract — the GoalPicker is one of the three surfaces that must track the array). */
const GOAL_LABEL: Record<RecommendationGoal, CopyKey> = {
  'leave-more': 'goalLeaveMoreLabel',
  'pay-less-tax': 'goalPayLessTaxLabel',
}
const GOAL_GLOSS: Record<RecommendationGoal, CopyKey> = {
  'leave-more': 'goalLeaveMoreGloss',
  'pay-less-tax': 'goalPayLessTaxGloss',
}

export function GoalPicker({
  open,
  current,
  onPick,
  onClose,
  restoreFallback,
}: {
  readonly open: boolean
  /** The standing choice (pre-selected on a RE-pick); `undefined` = never chosen ⇒ the unset sentinel,
   *  no radio pre-selected (never a silent default — burned/062). */
  readonly current: RecommendationGoal | undefined
  /** A CONFIRMED pick. The caller writes `chosenGoal` + dispatches the solve (the ControlSheet Apply
   *  discipline — this sheet never touches the model). */
  readonly onPick: (goal: RecommendationGoal) => void
  readonly onClose: () => void
  /** The via-panel focus-restore fallback (ControlSheet contract). */
  readonly restoreFallback?: () => HTMLElement | null
}) {
  const announcerRef = useRef<Announcer | null>(null)
  // The in-dialog selection — SEEDED from `current` each time the dialog opens (a re-pick shows the
  // standing choice; a first open shows the unset sentinel — nothing checked). Never defaulted.
  const [selected, setSelected] = useState<RecommendationGoal | undefined>(current)
  useEffect(() => {
    if (open) setSelected(current)
  }, [open, current])

  const confirm = () => {
    if (selected !== undefined) onPick(selected)
  }

  return (
    <ControlSheet
      open={open}
      title={copy.goalPickerTitle}
      onClose={onClose}
      announcerRef={announcerRef}
      restoreFallback={restoreFallback}
    >
      <p className="field-help">{copy.goalPickerIntro}</p>
      {/* Real labelled radios (the control-policy grammar): the picked row thickens its border —
          weight, never hue (the color-blind law). One radiogroup; the fieldset/legend names it. */}
      <fieldset className="control-policies">
        <legend className="sr-only">{copy.goalPickerTitle}</legend>
        {RECOMMENDATION_GOALS.map((g) => (
          <label key={g} className="control-policy" data-picked={selected === g || undefined}>
            <input
              type="radio"
              name="recommendation-goal"
              value={g}
              checked={selected === g}
              onChange={() => setSelected(g)}
            />
            <span className="control-policy__body">
              <span className="control-policy__label">{copy[GOAL_LABEL[g]]}</span>
              <span className="control-policy__help">{copy[GOAL_GLOSS[g]]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {/* Disabled until a goal is chosen — the unset sentinel made visible (never a silent default).
          A confirmed pick (not an arrow-key move through the radios) is what dispatches the solve. */}
      <button type="button" className="btn-primary" disabled={selected === undefined} onClick={confirm}>
        {copy.goalPickerConfirmCta}
      </button>
    </ControlSheet>
  )
}
