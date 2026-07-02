/*
 * src/ui/twoTier.ts — the two-tier (essentials-floor / full-lifestyle) spine composition
 * gate (P3·U9b, council 2026-07-02).
 *
 * THE PURE HONESTY DECISION (insight 048 — never inline in a render path): does the
 * essentials-floor reading earn a SUBORDINATE relief line under the full-lifestyle hero?
 * The hero is ALWAYS the full-track verdict (word + glyph + count + magnitude — the
 * Honesty-Hawk veto on essentials-as-hero is honored by construction here); the floor
 * renders as a second, quieter statement ONLY when it says something the hero didn't.
 *
 * THE DEGENERATE COLLAPSE (the reduce-to-spine render law): when the floor reading is
 * value-equal to the hero on every field this surface renders — the outcome state and the
 * "X of 10" count — the single-metric statement renders VERBATIM (no subordinate line, DOM
 * identical to the no-budget render). Equality is VALUE equality, never object identity:
 * with a budget the engine always computes two genuine readings (they merely coincide in
 * the degenerate), and identity across the worker wire is not a contract.
 *
 * WORD + COUNT ONLY. `floorReading` is a bare Headline — it carries NO DollarAdjustment,
 * and there is no "trim to make the floor safe" figure. Rendering the full-track dollar
 * against the floor verdict would be the insight-056 mixed-pairing sin, so this gate's
 * output is the reading itself and nothing more; the component renders word + count and
 * NEVER a dollar (test-pinned by a NOT-contains assertion).
 */
import type { Headline } from '@shared/model'

export interface FloorReliefView {
  /** The engine's floor reading, passed through VERBATIM (never re-derived — the U7/D2
   *  honesty contract). */
  readonly reading: Headline
  /** The Kitces action-first trim note ("trimming would start with the extras, not the
   *  basics") is itself a CLAIM — it is only true when the floor actually holds. Gated on
   *  the floor's own state being on-track-or-better; a floor that is itself borderline or
   *  worse renders the honest word + count with NO reassuring rider. */
  readonly showTrimNote: boolean
}

/**
 * The floor-relief gate: the subordinate relief line's view, or `null` when no line is
 * earned (absent floor — no budget rode — or a value-equal degenerate, where the hero
 * already IS the floor statement).
 */
export function floorRelief(
  headline: Headline,
  floorReading: Headline | undefined,
): FloorReliefView | null {
  if (floorReading === undefined) return null
  const equal =
    floorReading.outcomeState === headline.outcomeState &&
    floorReading.xOfTen.value === headline.xOfTen.value
  if (equal) return null
  return {
    reading: floorReading,
    showTrimNote:
      floorReading.outcomeState === 'on-track' || floorReading.outcomeState === 'over-funded',
  }
}
