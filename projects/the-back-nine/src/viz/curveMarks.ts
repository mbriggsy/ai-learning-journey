/*
 * src/viz/curveMarks.ts — the D2c odds-ladder marks, PURE (council-decided 2026-06-28; see
 * docs/council-log.md). The producer that feeds the OddsLadder renderer, sited in @viz beside it
 * (like bandData's resolveBandData beside ConfidenceBand) — it imports ONLY @shared/model, so the
 * viz layer can consume it without reaching up into @ui. The date route's secondary "how your
 * work-optional odds shift by WHEN you stop" reads as a DISCRETE integer-rung odds-ladder, NEVER a
 * smooth curve — a spline would manufacture precision the engine (quantized to X-of-10) does not
 * have. This maps each evaluated offset's reading to one ladder mark; the renderer draws
 * dots/lollipops from these, re-deriving nothing (the "UI re-derives nothing" law).
 *
 * THE HONESTY INVARIANTS (each a calm-but-wrong guard the council named; all swept in
 * curveMarks.test.ts across every offset, not just endpoints — insight 029):
 *  - rung = round(qlb·10): the SAME mapping the headline odds use (dateOdds.ts) → the plotted
 *    height and the spoken "X of 10" read ONE number, so plot ≡ text by construction.
 *  - clears (qlb ≥ BANDS.onTrack = 0.85) ⟺ rung ≥ 9, by arithmetic (round(8.5) = 9). The bar is
 *    drawn at the TRUE midpoint {@link BAR_RUNG} = 8.5 (between the highest failing rung 8 and the
 *    lowest clearing rung 9), so "clears vs. dips" reads by POSITION, never by hue (the N=1 reader
 *    is color-blind). The test BINDS 8.5 ≡ BANDS.onTrack·10 so a bar change that broke the
 *    integer-rung "above ⟺ clears" arithmetic fails loudly (insight 033).
 *  - the crown is the engine's DURABLE date (longest clearing suffix, bound to track.offsetYears),
 *    NEVER max(rung): a lucky peak is not a plan (the optimizer's-curse guard, §3c).
 *  - a cleared-then-dipped offset (the non-monotone ACA-cliff signature, R26) is flagged isDip —
 *    it plots ABOVE the bar (it genuinely clears) carrying a worded "doesn't hold" tell: true
 *    geometry, neither hidden/smoothed nor alarmed.
 *  - atCeiling (rung ≥ 10, a ≥ 0.95 bound) must render "better than 9 in 10", NEVER "10 of 10"
 *    (the same defensive clamp the headline odds ride — slots.xOfTen, injected by @ui).
 */
import type { DateTrackOutcome } from '@shared/model'

/** The odds ladder spans rungs 0..10 (the X-of-10 frame). */
export const LADDER_MAX_RUNG = 10

/** The on-track bar's y, drawn at the TRUE midpoint of the highest failing rung (8) and the lowest
 *  clearing rung (9) — NEVER on the rung-9 gridline, so a clearing dot reads visibly ABOVE it and a
 *  failing dot visibly below. Equals BANDS.onTrack·10; the test binds the two so the integer-rung
 *  honesty (clears ⟺ rung ≥ 9) cannot silently drift if the bar moves (insight 033). */
export const BAR_RUNG = 8.5

/** One offset's ladder mark — the honest reading of one evaluated stop-date. The renderer reads
 *  these and re-derives no threshold (clears, the crown, and the non-monotone flags are all the
 *  engine's authority, carried through). */
export interface CurveMark {
  /** The candidate offset (whole sim-years from today; the date = today + offsetYears). */
  readonly offsetYears: number
  /** round(quantizedLowerBound·10) — the published X-of-10 count; the plotted rung and the spoken
   *  odds read this same number (plot ≡ text, dateOdds.ts). */
  readonly rung: number
  /** rung ≥ {@link LADDER_MAX_RUNG} (a ≥ 0.95 bound): render "better than 9 in 10", NEVER a
   *  "10 of 10" certainty mark — the drawer plots it at the top honest rung, not the certainty line. */
  readonly atCeiling: boolean
  /** The engine's per-offset clear/fail (quantized lower bound ≥ the bar). Above {@link BAR_RUNG}
   *  ⟺ this is true, by construction. */
  readonly clears: boolean
  /** A clearing offset that DOESN'T HOLD through the window — the non-monotone ACA-cliff signature
   *  (R26). Plots above the bar (it clears) and wears the "doesn't hold" tell; isDip ⟹ clears. */
  readonly isDip: boolean
  /** This offset is the crowned DURABLE date (the start of the longest clearing suffix). At most
   *  one per track; FALSE for every mark on a no-date result. Bound to the engine's crown
   *  (track.offsetYears), never to max(rung). */
  readonly isCrown: boolean
}

/** Map a track's per-offset curve to ladder marks — one per evaluated offset, in engine order
 *  (ascending offset). Pure: reads the engine's outputs (clears, the quantized lower bound, the
 *  crown, the non-monotone flags) and derives no threshold of its own. A no-date track carries no
 *  crown, so every mark's isCrown is false. */
export function curveMarks(track: DateTrackOutcome): readonly CurveMark[] {
  // no-date-in-window carries no crowned offset; the other two kinds crown track.offsetYears.
  const crownedOffset = track.kind === 'no-date-in-window' ? null : track.offsetYears
  const dipped = new Set(track.nonMonotoneOffsets)
  return track.curve.map((r) => {
    const rung = Math.round(r.quantizedLowerBound * 10)
    return {
      offsetYears: r.offsetYears,
      rung,
      atCeiling: rung >= LADDER_MAX_RUNG,
      clears: r.clears,
      isDip: dipped.has(r.offsetYears),
      isCrown: crownedOffset !== null && r.offsetYears === crownedOffset,
    }
  })
}
