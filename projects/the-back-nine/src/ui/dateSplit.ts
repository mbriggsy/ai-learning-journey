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
 * conservative grade bound, the non-monotone offsets, and the FULL per-offset curve (the
 * odds ladder, the tradeoff point, and the no-date how-close line all read it — a
 * coincident-crown pair whose curves differ would otherwise collapse to one date rendering
 * the FLOOR's ladder as if it were both tracks'; filed 2026-07-02, closed as the F10
 * carry-in once U10 broke the v1 coupling that made it unreachable). Two tracks that agree
 * on every rendered field render as one date — anything less is a split.
 *
 * THE R27 INVERSION (floor > lifestyle — the 100%-FPL/PTC signature): a LOWER spend can
 * mean a lower MAGI, which below the subsidy floor means NO premium tax credit and a
 * HIGHER net health-insurance cost — so the essentials-only plan can clear LATER than the
 * full plan (or not at all, while the full plan clears). Correct, surprising, and it MUST
 * ride an explicit plain-language disclosure — never reordered or hidden to look tidy.
 */
import type { DateOffsetReading, DateTrackOutcome } from '@shared/model'

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

/** Element-wise equality over the per-offset curves, on the fields the render path reads:
 *  the odds ladder plots `offsetYears` + round(quantizedLowerBound·10) + `clears`
 *  (curveMarks.ts) and the tradeoff point reads `offsetYears` + `quantizedLowerBound`
 *  (dateTradeoff.ts); the no-date how-close rung is a maximum over `quantizedLowerBound`.
 *  `clears` is compared as the ENGINE's authority bit (the "UI re-derives nothing" law),
 *  never re-derived from the bound here. `survivalFraction` is rendered by no surface —
 *  excluded on exactly the render-field doctrine the grade comparison below follows. */
const sameCurve = (a: readonly DateOffsetReading[], b: readonly DateOffsetReading[]): boolean =>
  a.length === b.length &&
  a.every((r, i) => {
    const o = b[i]!
    return (
      r.offsetYears === o.offsetYears &&
      r.quantizedLowerBound === o.quantizedLowerBound &&
      r.clears === o.clears
    )
  })

/** Every field the single-date composition renders agrees ⇒ the tracks are (render-)equal. */
function renderEqual(floor: DateTrackOutcome, lifestyle: DateTrackOutcome): boolean {
  if (floor.kind !== lifestyle.kind) return false
  if (!sameOffsets(floor.nonMonotoneOffsets, lifestyle.nonMonotoneOffsets)) return false
  // The curve-equality clause (the F10 carry-in): the single composition renders the FLOOR's
  // ladder, so a coincident crown with a diverging curve would silently misrepresent the
  // lifestyle track's per-offset story — curve disagreement is ALWAYS a split, on both the
  // dated and the no-date arms.
  if (!sameCurve(floor.curve, lifestyle.curve)) return false
  if (dated(floor) && dated(lifestyle)) {
    return (
      floor.offsetYears === lifestyle.offsetYears &&
      floor.grade.quantizedLowerBound === lifestyle.grade.quantizedLowerBound
    )
  }
  // Both no-date: the rendered fields are the ladder + the how-close line (the best rung —
  // a maximum over the now-equal curves) + the non-monotone note, all compared above.
  return true
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
