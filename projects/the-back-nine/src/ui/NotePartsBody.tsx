import { Fragment } from 'react'
import type { NoteParts } from './noteParts'
import './styles/noteParts.css'

/**
 * The inside of a standing note's one `<p>`, drawn from its parts (`noteParts.ts`; U11 walk 5's (bi)): the opening;
 * for each segment, a line break, its label in a `<strong>` (the body's semibold — `noteParts.css` — same size and
 * ink, never color) and its sentences; then, where a door rides, a line break and the door's sentences in normal
 * weight. A space goes before each break, so the paragraph's text reads exactly `notePartsText` (a trailing space
 * before a break is never drawn). The host owns the `<p>` and anything after it (the Result's button).
 */
export function NotePartsBody({ parts }: { readonly parts: NoteParts }) {
  return (
    <>
      {parts.opening}
      {parts.segments.map((s) => (
        <Fragment key={s.label}>
          {' '}
          <br />
          <strong className="note-parts__label">{s.label}</strong>
          {s.sentences.length > 0 && ` ${s.sentences.join(' ')}`}
        </Fragment>
      ))}
      {parts.door.length > 0 && (
        <>
          {' '}
          <br />
          {parts.door.join(' ')}
        </>
      )}
    </>
  )
}
