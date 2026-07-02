/*
 * src/ui/dateSplit.ts — the date-route floor/lifestyle split composition (P3·U9b,
 * council 2026-07-02).
 *
 * THE PURE HONESTY DECISIONS (insight 048): given the two independent date-track outcomes,
 * decide (1) whether the surface renders ONE date (the degenerate/value-coincident case —
 * byte-for-byte the shipped single-date composition) or a SPLIT, (2) what the subordinate
 * essentials line says, and (3) whether the R27 floor>lifestyle inversion disclosure rides.
 *
 * THE CLAIM ASSIGNMENT (the council's Q3 ruling — the live answerView.ts:143 fix): the
 * "work-optional / fuck-off" claim attaches ONLY to the FULL-LIFESTYLE track — the hero
 * lead, odds, tradeoff, disclosures, and the odds ladder all read `lifestyle`. The floor
 * is "essentials covered by ~year X", NEVER "work-optional by ~X" — presenting the easier
 * essentials date as the fuck-off date is the calm-but-wrong sin this module exists to
 * prevent (it was the shipped v1 behavior; U9b kills it).
 *
 * VALUE EQUALITY, NEVER IDENTITY (insight 056 discipline): with a budget the engine always
 * emits two genuine track objects — they merely COINCIDE in the degenerate. Object identity
 * only exists on the no-budget path and is not a wire contract, so `single` is decided by
 * comparing every field this surface actually renders: the kind, the crowned offset, the
 * conservative grade bound, and the disclosure fields (the non-monotone offsets; the
 * no-date how-close curve). Two tracks that agree on every rendered field render as one
 * date — anything less than full rendered-field agreement is a split.
 *
 * THE R27 INVERSION (floor > lifestyle — the 100%-FPL/PTC signature): a LOWER spend can
 * mean a lower MAGI, which below the subsidy floor means NO premium tax credit and a
 * HIGHER net health-insurance cost — so the essentials-only plan can clear LATER than the
 * full plan (or not at all, while the full plan clears). Correct, surprising, and it MUST
 * ride an explicit plain-language disclosure — never reordered or hidden to look tidy.
 */
import type { DateTrackOutcome } from '@shared/model'

/** The subordinate essentials line, pre-decided. `covered` = the floor crowned a date
 *  (`unconfirmed` carries the window-edge hedge into the wording); `not-within-window` =
 *  the floor track has no date (rides BOTH the quiet both-no-date arm and the extreme
 *  inversion arm — `inverted` on the parent distinguishes them). */
export type FloorLineView =
  | {
      readonly kind: 'covered'
      readonly offsetYears: number
      readonly quantizedLowerBound: number
      readonly unconfirmed: boolean
    }
  | { readonly kind: 'not-within-window' }

export type DateSplitView =
  | { readonly kind: 'single'; readonly track: DateTrackOutcome }
  | {
      readonly kind: 'split'
      /** The hero track — the work-optional claim. */
      readonly lifestyle: DateTrackOutcome
      readonly floor: FloorLineView
      /** The R27 inversion: the essentials-only track clears LATER than the full track
       *  (both dated, floor offset > lifestyle offset) or not at all while the full track
       *  clears (floor no-date, lifestyle dated). When true the subsidy-cause disclosure
       *  MUST render. */
      readonly inverted: boolean
    }

const dated = (
  t: DateTrackOutcome,
): t is Extract<DateTrackOutcome, { kind: 'confirmed-date' | 'window-edge-unconfirmed' }> =>
  t.kind === 'confirmed-date' || t.kind === 'window-edge-unconfirmed'

const sameOffsets = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i])

/** The no-date "how close" input — the max clearing-odds rung any offset reached. Kept in
 *  sync with the render path's curveMarks-derived best rung by reading the same quantized
 *  lower bound the ladder plots. */
const bestBound = (t: DateTrackOutcome): number =>
  t.curve.reduce((mx, r) => Math.max(mx, r.quantizedLowerBound), 0)

/** Every field the single-date composition renders agrees ⇒ the tracks are (render-)equal. */
function renderEqual(floor: DateTrackOutcome, lifestyle: DateTrackOutcome): boolean {
  if (floor.kind !== lifestyle.kind) return false
  if (!sameOffsets(floor.nonMonotoneOffsets, lifestyle.nonMonotoneOffsets)) return false
  if (dated(floor) && dated(lifestyle)) {
    return (
      floor.offsetYears === lifestyle.offsetYears &&
      floor.grade.quantizedLowerBound === lifestyle.grade.quantizedLowerBound
    )
  }
  // Both no-date: the rendered fields are the how-close line (the best rung) + the
  // non-monotone note (already compared above).
  return bestBound(floor) === bestBound(lifestyle)
}

export function isFloorLifestyleInverted(
  floor: DateTrackOutcome,
  lifestyle: DateTrackOutcome,
): boolean {
  if (dated(floor) && dated(lifestyle)) return floor.offsetYears > lifestyle.offsetYears
  return !dated(floor) && dated(lifestyle)
}

export function composeDateSplit(
  floor: DateTrackOutcome,
  lifestyle: DateTrackOutcome,
): DateSplitView {
  if (renderEqual(floor, lifestyle)) {
    // The degenerate/value-coincident case — ONE date, the shipped composition, rendered
    // off the FLOOR track (continuity with the focus key + the floor-crowned band; the
    // tracks agree on every rendered field, so the choice is invisible by construction).
    return { kind: 'single', track: floor }
  }
  const floorLine: FloorLineView = dated(floor)
    ? {
        kind: 'covered',
        offsetYears: floor.offsetYears,
        quantizedLowerBound: floor.grade.quantizedLowerBound,
        unconfirmed: floor.kind === 'window-edge-unconfirmed',
      }
    : { kind: 'not-within-window' }
  return {
    kind: 'split',
    lifestyle,
    floor: floorLine,
    inverted: isFloorLifestyleInverted(floor, lifestyle),
  }
}
