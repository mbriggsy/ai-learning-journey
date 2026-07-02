/*
 * src/ui/TwoTierHeadline.tsx — the U9b two-tier essentials-relief statement (R20/R21's
 * lexicographic reading, council 2026-07-02).
 *
 * WHAT "TWO-TIER" MEANS HERE. The headline composes TWO engine-tagged readings over the
 * same six-state enum — never a 7th state. Tier 1 (the full-lifestyle verdict) stays the
 * HERO exactly as shipped: word + glyph + count + magnitude, all full-track, rendered by
 * ConfidenceStatement (the Honesty-Hawk veto on essentials-as-hero is honored by this
 * arrangement — a no-finance spouse must never read the easier floor number as the
 * headline answer). THIS component is Tier 2: the SUBORDINATE essentials-floor relief
 * line, in the SurvivorReadout choreography (eyebrow, smaller word, same vocabulary), so
 * the two tiers read as one voice, never two competing faces.
 *
 * WORD + COUNT ONLY. `floorReading` is a bare Headline — no DollarAdjustment exists for
 * the floor, and there is no "trim to make the floor safe" figure. Borrowing the
 * full-track dollar here would be the insight-056 mixed-pairing sin; this surface renders
 * NO dollar (test-pinned NOT-contains). The optional Kitces trim rider is gated in the
 * PURE helper (twoTier.ts — insight 048): it is a claim, only honest when the floor holds.
 *
 * THE DEGENERATE COLLAPSE lives upstream (floorRelief): when the floor reading is
 * value-equal to the hero, the parent renders NOTHING here — the single-metric statement
 * verbatim. By the time this mounts, the relief is earned.
 *
 * COLOR-BLIND LAW (back-nine-design §2): WORD (text) + count + SILHOUETTE glyph — hue
 * never carries the signal. CALM (§3): static figures, opacity-only reveal (survivor.css's
 * subtler family), reduced-motion identical. STRING-FREE: copy.ts + slots only.
 */
import { useId } from 'react'
import { copy, slots } from './copy'
import { OUTCOME_PRESENTATION } from './outcomeStates'
import { VerdictIcon } from './verdictSignal'
import type { FloorReliefView } from './twoTier'
import './styles/survivor.css'

export interface TwoTierHeadlineProps {
  /** The earned relief view (the parent runs the floorRelief gate — null never mounts). */
  readonly relief: FloorReliefView
}

export function TwoTierHeadline({ relief }: TwoTierHeadlineProps) {
  const eyebrowId = useId()
  const state = relief.reading.outcomeState
  const pres = OUTCOME_PRESENTATION[state]

  // Defensive ABSENCE, not a blank word (insight 044): the engine never tags a floor
  // reading 'indeterminate' (the degenerate-input path early-returns before any floor
  // reading is built) — but a "can't happen" is a claim about the gate, not a fact.
  if (pres.verdictWordKey === null) return null
  const word = copy[pres.verdictWordKey]

  // The over-funded near-ceiling reads the PROPORTION via xOfTenAtCeiling BY NAME — the
  // same 10-of-10 honesty clamp every other count surface rides.
  const countText =
    state === 'over-funded' ? slots.xOfTenAtCeiling() : slots.xOfTen(relief.reading.xOfTen.value)

  return (
    <section className="survivor floor-readout" aria-labelledby={eyebrowId}>
      <div className="survivor-reveal">
        <p className="survivor__eyebrow" id={eyebrowId}>
          {copy.floorReadoutEyebrow}
        </p>
        <div className="survivor__verdict">
          <VerdictIcon state={state} className="survivor__glyph" />
          <p className="survivor__word">{word}</p>
        </div>
        <p className="survivor__reading">
          <span className="survivor__count">{countText}</span>{' '}
          <span className="survivor__frame">{copy.floorReadoutCoverage}</span>
        </p>
        {relief.showTrimNote && <p className="survivor__stepdown">{copy.floorReadoutTrimNote}</p>}
      </div>
    </section>
  )
}
