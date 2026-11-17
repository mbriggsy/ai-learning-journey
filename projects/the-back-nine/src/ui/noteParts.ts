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

/** The typed-below line's runs of years (the walk-8 form council `wf_98d8bc0e-e0a`, KD7 and KD8;
 *  `docs/plans/features/typed-below-walk8-form-build-spec.md`): an ORDERED list, one item per run — its label, then each of
 *  its sentences its own paragraph — and, after the list, the closing paragraph: the survivor part ("If only one of you is
 *  alive in a working year, …"), a condition over the runs, never one more of them, so it sits outside the list (as a
 *  fourth term under "each working year you’re both alive" it failed WCAG 1.3.1), or `null` where there is none. */
export interface NoteRuns {
  readonly items: readonly NoteSegment[]
  readonly closing: readonly string[] | null
}

/** The parts: the opening, then EITHER labelled segments (W's stale line, a description list) with the Result's door,
 *  OR the typed-below line's runs (an ordered list and its closing paragraph), never both. Only the typed-below line sets
 *  `runs`, and then its `segments` is empty and it has no door; `runs` is absent everywhere else (never written as
 *  `undefined`). */
export type NoteParts =
  | {
      readonly opening: string
      readonly segments: readonly NoteSegment[]
      /** The Result's door (W's stale line for a "saved" answer, on a tab that can act), or none. */
      readonly door: NoteDoor | null
      readonly runs?: never
    }
  | {
      readonly opening: string
      readonly segments: readonly []
      readonly door: null
      readonly runs: NoteRuns
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

/** The note without its door (a read-only tab reads the fact alone). A note with runs never has a door, so a note with a
 *  door has no runs to keep; a doorless note comes back as it is. */
export const withoutDoor = (p: NoteParts): NoteParts =>
  p.door === null ? p : { opening: p.opening, segments: p.segments, door: null }

/** No segments, no door and no runs: every host draws it as its old single `<p>` (the pinned reduce-to-plain). */
export const isPlainNote = (p: NoteParts): boolean => p.segments.length === 0 && p.door === null && p.runs === undefined

/** The parts in order, one space apart — the gate's React key and the text a test compares: the opening, the segments,
 *  the runs and their closing paragraph, the door (a note carries runs or a door, never both); the door's list items
 *  ride in order between its lead and its tail. */
export function notePartsText(p: NoteParts): string {
  const part = (s: NoteSegment): string[] => [s.label, ...s.sentences]
  const runs = p.runs === undefined ? [] : [...p.runs.items.flatMap(part), ...(p.runs.closing ?? [])]
  const door = p.door === null ? [] : [p.door.label, ...p.door.lead, ...p.door.items, ...p.door.tail]
  return [p.opening, ...p.segments.flatMap(part), ...runs, ...door].join(' ')
}
