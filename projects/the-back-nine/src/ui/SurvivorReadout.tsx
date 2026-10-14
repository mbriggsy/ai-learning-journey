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
 * "X of 10", the outcome word's state, the pre-tax income step-down, and the spending basis; this
 * surface re-derives no threshold, clamp or share — it speaks the SAME vocabulary as the joint statement
 * (slots.xOfTen, the OUTCOME_PRESENTATION word), so the two readings read as one voice.
 *
 * READING ORDER: eyebrow → verdict lockup → the "X of 10 … still covers you" reading → THE SPENDING
 * BASIS → the income step-down. The basis line (Briggsy's sentence, RULED 2026-10-14, b9-toronto1 — the
 * register's Tier 1 *The survivor card's "still covers you" never says what spending it assumes…*):
 * "This assumes about $X a month of spending on your own (today: $Y together)." It sits DIRECTLY after
 * the coverage claim it qualifies — "This" binds to the nearest claim above it, and below the step-down
 * it would bind to the income sentence instead (back-nine-design: a referenced quantity is quoted in
 * dollars in the same breath, and a same-named quantity quoted twice wears its scope on EACH mention —
 * "on your own" / "today … together"). X and Y are the engine's year-0 spend (`spendingBasis`, read off
 * `cashTermsForYear` itself — never "75 %", false on an itemized household), through the same
 * `formatPerMonth` as the step-down. Plain text in the a11y tree (never aria-hidden); muted ink like the
 * step-down (context, not a call to act); no new color, no motion of its own (it rides the reveal's
 * one opacity settle). In the FOLDED host it lives in the body beside the count, so the closed fold's
 * first frame is unchanged (build-gate 7). FAIL TO ABSENT: a reading without the basis, a basis that is
 * not `steady` (a budget window moves the spend inside the horizon — year 0 is then an anchor, not THE
 * spend), or a figure that is non-finite or rounds to "$0", renders the card without the line (insight 044).
 *
 * ONE CONTEXT PARAGRAPH (`.survivor__context`): the basis sentence OPENS the same muted paragraph as the
 * income step-down — what the survivor spends, then what the survivor's income does — two sentences,
 * one fact each, words untouched (each still its own slot, its own span). As two paragraphs the basis
 * cost 68px at his 1536×791 window (two lines + a stack gap; its second line held only "$6,500
 * together).") and broke the one-frame law on six arms (pa, the stale + statestale echoes, the surplus
 * sized frame, the rec/recold record cards' standing line). Measured 2026-10-14 (b9-toronto1) in real
 * Chromium: one paragraph costs one line (+28px), and survivor.css's short-laptop density step reclaims
 * the rest from whitespace, so no arm grows more than 4px over its pre-line frame (and the floor-relief
 * card, sharing the classes, tightens: budget's frame 28px). "This" still opens under the claim it qualifies.
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
import type { SurvivorReading, SurvivorSpendingBasis } from '@shared/model'
import './styles/survivor.css'

export interface SurvivorReadoutProps {
  /** The survivor-conditioned reading. PRESENT on a SimulationResult only when the run carried a
   *  survivor phase, so the PARENT decides whether to render this surface at all — by the time it
   *  mounts, the reading exists. */
  readonly reading: SurvivorReading
  /** U9b (build-gate 7): when this readout is folded behind a <details> whose summary already
   *  speaks the eyebrow line AND the verdict lockup (glyph + word — the 2026-07-02 rework: the
   *  closed fold reads as a real subordinate statement, not a bare disclosure row), rendering
   *  either again inside would double the words — render the COUNT + step-down body only and
   *  label the section directly instead (the a11y name survives; every word renders once). The
   *  spending-basis line renders in BOTH variants (it qualifies the count, which the body carries). */
  readonly foldBody?: boolean
}

/** The basis line's text, or null when it must not render (absent / not steady / non-finite / either figure "$0"). */
function spendingBasisLine(basis: SurvivorSpendingBasis | undefined): string | null {
  if (basis === undefined || basis.steady !== true) return null
  const { survivorMonthlyReal, coupleMonthlyReal } = basis
  if (!Number.isFinite(survivorMonthlyReal) || !Number.isFinite(coupleMonthlyReal)) return null
  const survivor = formatPerMonth(survivorMonthlyReal)
  const couple = formatPerMonth(coupleMonthlyReal)
  if (survivor === '0' || couple === '0') return null
  return slots.verdictSurvivorSpendBasis(survivor, couple)
}

export function SurvivorReadout({ reading, foldBody = false }: SurvivorReadoutProps) {
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

  // The spending basis (ruled 2026-10-14) — the spend "still covers you" assumes, beside the couple's.
  // FAIL TO ABSENT (insight 044): no basis on the reading, a basis that is not steady (a window moves it), a
  // non-finite figure, or either figure rounding to "$0" renders NO line — never "$0", "NaN" or "∞" on the card. Same formatter as every other figure
  // here, so "shown" and "non-zero" can never disagree (the step-down's own guard, above).
  const basisText = spendingBasisLine(reading.spendingBasis)

  return (
    <section
      className="survivor"
      {...(foldBody
        ? { 'aria-label': copy.survivorReadoutEyebrow }
        : { 'aria-labelledby': eyebrowId })}
    >
      <div className="survivor-reveal">
        {!foldBody && (
          <p className="survivor__eyebrow" id={eyebrowId}>
            {copy.survivorReadoutEyebrow}
          </p>
        )}
        {!foldBody && (
          <div className="survivor__verdict">
            <VerdictIcon state={state} className="survivor__glyph" />
            <p className="survivor__word">{word}</p>
          </div>
        )}
        <p className="survivor__reading">
          <span className="survivor__count">{countText}</span>{' '}
          <span className="survivor__frame">{copy.survivorReadoutCoverage}</span>
        </p>
        {(basisText !== null || showStepDown) && (
          <p className="survivor__context">
            {basisText !== null && <span className="survivor__basis">{basisText}</span>}
            {basisText !== null && showStepDown && ' '}
            {showStepDown && (
              <span className="survivor__stepdown">{slots.verdictSurvivorStepDown(stepDownText)}</span>
            )}
          </p>
        )}
      </div>
    </section>
  )
}
