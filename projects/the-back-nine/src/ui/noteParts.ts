/**
 * A standing note as PARTS: an opening, labelled segments, and — on the Result — its door. Its FORM is council
 * `wf_22858e04-f7a`'s (U11 walk 6): two typographic passes inside one `<p>` failed (walk 5's run-in words, 4/4; walk 6's
 * semibold labels on their own lines read "clinical", 5/5), and the one paragraph carried the door inside the last
 * segment's text, so the hosts draw a BLOCK (`NotePartsBlock`): the opening as a `<p>`, the segments as a `<dl>` of
 * `div>dt+dd`, and on the Result the door as the last dt/dd. A note with no segments and no door is drawn exactly as
 * before, a `<p>` (pinned). The composer returns the parts; no host splits a string by pattern, and no label rides
 * `::before`.
 */

/** One labelled part: its label (the `<dt>`) and the sentences under it. */
export interface NoteSegment {
  readonly label: string
  readonly sentences: readonly string[]
}

/** The Result's door, its last dt/dd (council `wf_22858e04-f7a` (4)): the label (the dt — the gate's route heading,
 *  word for word), the sentences before the cost list, the list (`<ul>`; empty: none), the sentences after it; the host
 *  draws its button last, as a block. */
export interface NoteDoor {
  readonly label: string
  readonly lead: readonly string[]
  readonly items: readonly string[]
  readonly tail: readonly string[]
}

export interface NoteParts {
  readonly opening: string
  readonly segments: readonly NoteSegment[]
  /** The Result's door (null: no door — every note but W's stale line for a "saved" answer, and every read-only tab). */
  readonly door: NoteDoor | null
}

/** The re-entry gate's door (council `wf_22858e04-f7a` (2)): `section.reentry-door`, the next sibling after its buttons,
 *  drawn only where the tab can save. The heading (an h3 in the body face), the SCOPE sentence — neither button here
 *  changes the figure; the affirm button's description — and the ROUTE: where each button leads. It names no W-row
 *  button and points neither above nor below. */
export interface GateDoor {
  readonly heading: string
  readonly scope: string
  readonly route: string
}

/** A note with no parts: the opening alone. */
export const plainNote = (text: string): NoteParts => ({ opening: text, segments: [], door: null })

/** No segments and no door: every host draws it as its old single `<p>` (the pinned reduce-to-plain). */
export const isPlainNote = (p: NoteParts): boolean => p.segments.length === 0 && p.door === null

/** The parts in order, one space apart — the gate's React key and the text a test compares; the door's list items ride
 *  in order between its lead and its tail. */
export function notePartsText(p: NoteParts): string {
  const door = p.door === null ? [] : [p.door.label, ...p.door.lead, ...p.door.items, ...p.door.tail]
  return [p.opening, ...p.segments.flatMap((s) => [s.label, ...s.sentences]), ...door].join(' ')
}
