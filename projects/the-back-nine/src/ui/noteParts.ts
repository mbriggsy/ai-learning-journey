/**
 * A standing note as PARTS (U11 walk 5's (bi), the TODO's prescription from council `wf_7fa86902-35c`'s shape): an
 * opening, labelled segments, and the sentences said beside a door. The Result's standing line and the re-entry gate
 * both draw one `<p>` from it (`NotePartsBody`): mid-line in body weight, every walk-5 cold look read "This answer
 * now:" as a broken sentence or a typo, and found the labels only when told — then all four said the split helps.
 * So each label starts its own line inside the paragraph, in the body's semibold (same size and ink, never color),
 * and the door's sentences start a line of their own, unlabelled. The composer returns the parts; no host splits a
 * string by pattern, and no label rides `::before`.
 */

/** One labelled part: the run-in label and the sentences under it. */
export interface NoteSegment {
  readonly label: string
  readonly sentences: readonly string[]
}

export interface NoteParts {
  readonly opening: string
  readonly segments: readonly NoteSegment[]
  /** What is said beside the door, on a line of its own (empty: nothing, or no door on this tab). */
  readonly door: readonly string[]
}

/** A note with no parts: the opening alone. */
export const plainNote = (text: string): NoteParts => ({ opening: text, segments: [], door: [] })

/** The parts in order, one space apart — exactly the drawn paragraph's `textContent` (the body draws a space before
 *  each line break), so it is the React key on the gate and what a screen reader hears. */
export function notePartsText(p: NoteParts): string {
  return [p.opening, ...p.segments.flatMap((s) => [s.label, ...s.sentences]), ...p.door].join(' ')
}
