import type { ReactNode } from 'react'
import type { NoteParts } from './noteParts'

/**
 * A standing note drawn as a BLOCK (council `wf_22858e04-f7a`, U11 walk 6; the parts are `noteParts.ts`'s): a wrapper
 * `div.note-parts` holding the opening as a `<p>`, then ONE of two lists, never both.
 * - W's stale line: a `<dl>` with one `div>dt+dd` per segment — each label on its own line, a size step above the note
 *   in the text's own face (`theme.css`'s note-parts rules since Act 6 · RC21; never color) — and, on the Result, the door as the last dt/dd: its lead, its cost
 *   `<ul>`, its tail, then the host's `button` as a block. Where the line carries a closing paragraph (the survivor part,
 *   the walk-8 form spec's U4), it follows the segments' `<dl>` as `p.note-parts__closing`, and the door, where there is
 *   one, follows it in a `<dl>` of its own.
 * - The typed-below line's runs (the walk-8 form council `wf_98d8bc0e-e0a`, KD7 and KD8;
 *   `docs/plans/features/typed-below-walk8-form-build-spec.md`): an `<ol role="list">`, one `<li>` per run — its label
 *   as a `<p>` in the segment label's place and face, then each of its sentences its own `<p>` — and, after the list,
 *   the closing `<p>` where there is one: the survivor part, a condition over the runs and never one more of them (as a
 *   fourth item under "each working year you’re both alive" it failed WCAG 1.3.1). `role="list"` because WebKit drops
 *   the list semantics of a list drawn with no markers. No table (a rider in a header is heard once), no motion, the
 *   same DOM at every width.
 * A block with NO door (the typed-below line's runs) still draws the host's `button`, last in the block, where the tab
 * can act on it. No heading element rides inside (an h3 would pull the Result's graphs under "If a working year costs…"
 * in the outline, and on the gate the budget lines push after W's line). The HOST draws a note with no segments, no door
 * and no runs as its old `<p>` instead (`isPlainNote`; the pinned reduce-to-plain), so this renders only the block.
 * `className` — the host's note classes on the wrapper, so the text inherits the host's size and ink.
 */
export function NotePartsBlock({
  parts,
  className,
  button,
}: {
  readonly parts: NoteParts
  readonly className: string
  /** The Result's button: drawn last in the door's dd beside a door, and last in the block where there is none (the
   *  typed-below line's runs). */
  readonly button?: ReactNode
}) {
  const { door, runs } = parts
  // W's stale line's closing paragraph (the walk-8 form spec's U4: the survivor part), after its segments and before its
  // door. A `<p>` cannot sit inside a `<dl>`, so where both are drawn the door takes a `<dl>` of its own after it — still
  // a dt/dd, still the block's last part; with no closing the door stays the segments' last dt/dd, as ruled.
  const closing = parts.closing ?? null
  const doorPart =
    door === null ? null : (
      <div className="note-parts__segment note-parts__door">
        <dt className="note-parts__label">{door.label}</dt>
        <dd className="note-parts__body">
          {door.lead.length > 0 && <p className="note-parts__para">{door.lead.join(' ')}</p>}
          {door.items.length > 0 && (
            <ul className="note-parts__list">
              {door.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {door.tail.length > 0 && <p className="note-parts__para">{door.tail.join(' ')}</p>}
          {button}
        </dd>
      </div>
    )
  return (
    <div className={`note-parts ${className}`}>
      <p className="note-parts__opening">{parts.opening}</p>
      {(parts.segments.length > 0 || (doorPart !== null && closing === null)) && (
        <dl className="note-parts__segments">
          {parts.segments.map((s) => (
            <div key={s.label} className="note-parts__segment">
              <dt className="note-parts__label">{s.label}</dt>
              <dd className="note-parts__body">{s.sentences.join(' ')}</dd>
            </div>
          ))}
          {closing === null && doorPart}
        </dl>
      )}
      {closing !== null && <p className="note-parts__closing">{closing.join(' ')}</p>}
      {closing !== null && doorPart !== null && <dl className="note-parts__segments">{doorPart}</dl>}
      {/* The runs (KD8): the years run in order, so an ordered list; each sentence is its own paragraph (KD4's three
          beats). A run's years are its label and never repeat on a line; its sentences keep their place (index keys). */}
      {runs !== undefined && (
        <ol role="list" className="note-parts__runs">
          {runs.items.map((run) => (
            <li key={run.label} className="note-parts__run">
              <p className="note-parts__label">{run.label}</p>
              {run.sentences.map((sentence, i) => (
                <p key={i} className="note-parts__para">
                  {sentence}
                </p>
              ))}
            </li>
          ))}
        </ol>
      )}
      {/* The closing (KD7): the survivor part, a condition over the runs, after the list and outside it — one paragraph,
          its sentences one space apart. */}
      {runs !== undefined && runs.closing !== null && <p className="note-parts__closing">{runs.closing.join(' ')}</p>}
      {/* No door to carry it (the typed-below line's runs on the Result): the button is the block's last child. */}
      {door === null && button}
    </div>
  )
}
