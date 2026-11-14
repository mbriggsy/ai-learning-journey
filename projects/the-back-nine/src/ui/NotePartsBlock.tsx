import type { ReactNode } from 'react'
import type { NoteParts } from './noteParts'
import './styles/noteParts.css'

/**
 * A standing note drawn as a BLOCK (council `wf_22858e04-f7a`, U11 walk 6; the parts are `noteParts.ts`'s): a wrapper
 * `div.note-parts` holding the opening as a `<p>`, then a `<dl>` with one `div>dt+dd` per segment — each label on its own
 * line, a size step above the note in the body face (`noteParts.css`; never color) — and, on the Result, the door as
 * the last dt/dd: its lead, its cost `<ul>`, its tail, then the host's `button` as a block. A block with NO door (the
 * typed-below line's spans, the whole-window rebuild's KTD6) still draws the host's `button`, last in the block, where the
 * tab can act on it. No heading element rides
 * inside (an h3 would pull the Result's graphs under "If a working year costs…" in the outline, and on the gate the
 * budget lines push after W's line). The HOST draws a note with no segments and no door as its old `<p>` instead
 * (`isPlainNote`; the pinned reduce-to-plain), so this renders only the block. `className` — the host's note classes
 * on the wrapper, so the text inherits the host's size and ink.
 */
export function NotePartsBlock({
  parts,
  className,
  button,
}: {
  readonly parts: NoteParts
  readonly className: string
  /** The Result's button: drawn last in the door's dd beside a door, and last in the block where there is none (the
   *  typed-below line's spans). */
  readonly button?: ReactNode
}) {
  const { door } = parts
  return (
    <div className={`note-parts ${className}`}>
      <p className="note-parts__opening">{parts.opening}</p>
      {(parts.segments.length > 0 || door !== null) && (
        <dl className="note-parts__segments">
          {parts.segments.map((s) => (
            <div key={s.label} className="note-parts__segment">
              <dt className="note-parts__label">{s.label}</dt>
              <dd className="note-parts__body">{s.sentences.join(' ')}</dd>
            </div>
          ))}
          {door !== null && (
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
          )}
        </dl>
      )}
      {/* No door to carry it (the typed-below line's spans on the Result): the button is the block's last child. */}
      {door === null && button}
    </div>
  )
}
