/*
 * src/ui/SurvivorReadout.tsx — the U7 "as the survivor" statement (item e2; R2/R17).
 *
 * THE SECOND, QUIETER STATEMENT. The joint confidence statement answers "where do we stand?"; this
 * one answers the question it can hide: "and if one of you is on your own?" The survivor phase is
 * the FRAGILE one — at the first death one Social Security benefit ends, filing flips MFJ→single,
 * and spending only steps part-way down — so the survivor-conditioned reading is typically WORSE
 * than the calm joint headline. Surfacing that, calmly and honestly, is the exact calm-but-wrong
 * sin this readout exists to prevent (the cardinal rule). It is set off as a distinct, subordinate
 * statement (a hairline rule, a smaller verdict word), never an alarm and never a competing face.
 *
 * RENDERS WHAT IT IS GIVEN. The engine's `SurvivorReading` already carries the survivor-conditioned
 * "X of 10", the outcome word's state, and the pre-tax income step-down; this surface re-derives no
 * threshold or clamp — it speaks the SAME vocabulary as the joint statement (slots.xOfTen, the
 * OUTCOME_PRESENTATION word), so the two readings read as one voice.
 *
 * THE COLOR-BLIND LAW (back-nine-design §2): the signal is the WORD (text, the a11y-tree signal) +
 * the "X of 10" count + the income magnitude + the SILHOUETTE glyph — never hue. The word renders in
 * --ink (uniform across states); the glyph is decorative (aria-hidden) beside its visible word.
 *
 * CALM RENDERING (back-nine-design §3): figures are STATIC — no count-up. The statement fades in
 * once (opacity only — subtler than the joint's magic-moment rise, so the two don't compete); the
 * final rendered state is identical with motion on or off (prefers-reduced-motion honored).
 *
 * STRING-FREE inline (cross-cutting #4): every user-facing string comes from copy.ts (gated by the
 * survivor-scoped copyGuard); every numeral enters through a typed slot. CSP-clean: class-driven.
 */
import { useId } from 'react'
import { copy, slots } from './copy'
import { OUTCOME_PRESENTATION } from './outcomeStates'
import { VerdictIcon } from './verdictSignal'
import { formatPerMonth } from './money'
import type { SurvivorReading } from '@shared/model'
import './styles/survivor.css'

export interface SurvivorReadoutProps {
  /** The survivor-conditioned reading. PRESENT on a SimulationResult only when the run carried a
   *  survivor phase, so the PARENT decides whether to render this surface at all — by the time it
   *  mounts, the reading exists. */
  readonly reading: SurvivorReading
}

export function SurvivorReadout({ reading }: SurvivorReadoutProps) {
  const eyebrowId = useId()
  const state = reading.outcomeState
  const pres = OUTCOME_PRESENTATION[state]

  // Defensive ABSENCE, not a blank word. `selectOutcomeState` never tags a survivor reading
  // 'indeterminate' (the degenerate-input path early-returns BEFORE any survivor reading is built),
  // so verdictWordKey is non-null in every reading the engine emits. If that ever changes, render
  // nothing rather than a wordless survivor verdict — insight 044: a "can't happen" is a claim about
  // the gate, not a fact, so fail to absent, never to a confident-looking blank.
  if (pres.verdictWordKey === null) return null
  const word = copy[pres.verdictWordKey]

  // The "X of 10 as the survivor" count — the over-funded near-ceiling reads the PROPORTION "better
  // than 9 in 10" via xOfTenAtCeiling (the 10-of-10 honesty clamp, called BY NAME), exactly as the
  // joint surface does; every other state reads its engine count through the slot.
  const countText =
    state === 'over-funded' ? slots.xOfTenAtCeiling() : slots.xOfTen(reading.xOfTen.value)

  // The income cliff — suppressed when it rounds to nothing. The engine floors the step-down at ≥ 0
  // and a residual edge (the survivor dying before the steady-state anchor) can land at ~$0; a
  // "steps down about $0" line would be nonsense, so the clause shows only for a real drop. The
  // check rides the SAME formatter the slot renders, so "shown" and "non-zero" can never disagree.
  const stepDownText = formatPerMonth(reading.incomeStepDownMonthlyReal)
  const showStepDown = stepDownText !== '0'

  return (
    <section className="survivor" aria-labelledby={eyebrowId}>
      <div className="survivor-reveal">
        <p className="survivor__eyebrow" id={eyebrowId}>
          {copy.survivorReadoutEyebrow}
        </p>
        <div className="survivor__verdict">
          <VerdictIcon state={state} className="survivor__glyph" />
          <p className="survivor__word">{word}</p>
        </div>
        <p className="survivor__reading">
          <span className="survivor__count">{countText}</span>{' '}
          <span className="survivor__frame">{copy.survivorReadoutCoverage}</span>
        </p>
        {showStepDown && (
          <p className="survivor__stepdown">{slots.verdictSurvivorStepDown(stepDownText)}</p>
        )}
      </div>
    </section>
  )
}
