// @vitest-environment jsdom
/**
 * The standing note's parts and their block (`noteParts.ts`, `NotePartsBlock.tsx`): the survivor-path build's U2
 * (`docs/plans/features/typed-below-survivor-path-build-spec.md`, KTD6). A note may close on a CODA — the typed-below
 * line's survivor condition — drawn as its own one-item list after the segments' list and before the doorless button, so
 * neither a screen reader nor the eye takes the condition as one more segment of the list the lead introduces. A note
 * with no coda draws exactly as before (every host's existing pins hold).
 */
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { NotePartsBlock } from '../NotePartsBlock'
import { isPlainNote, notePartsText, plainNote, withoutDoor, type NoteParts } from '../noteParts'

afterEach(cleanup)

const SEGMENTS = [
  { label: '2026 through 2028', sentences: ['First sentence.', 'Second sentence.'] },
  { label: '2029 through 2035', sentences: ['Third sentence.'] },
] as const
const CODA = { label: 'If only one of you is alive', sentences: ['In such a working year, a fourth sentence.', 'A fifth.'] } as const
const WITH_CODA: NoteParts = { opening: 'The opening. The lead:', segments: SEGMENTS, door: null, coda: CODA }
const WITHOUT_CODA: NoteParts = { opening: 'The opening. The lead:', segments: SEGMENTS, door: null }
const BUTTON = <button className="band-premise__cta note-parts__cta">Update your figure</button>

describe('the coda (the survivor-path build’s U2, KTD6)', () => {
  it('draws as its own one-item list after the segments’ list and before the doorless button, in the segment’s markup', () => {
    const { container } = render(<NotePartsBlock parts={WITH_CODA} className="fod-note" button={BUTTON} />)
    const block = container.querySelector('div.note-parts')!
    const children = [...block.children].map((c) => `${c.tagName.toLowerCase()}.${[...c.classList].join('.')}`)
    expect(children).toEqual([
      'p.note-parts__opening',
      'dl.note-parts__segments',
      'dl.note-parts__segments.note-parts__coda',
      'button.band-premise__cta.note-parts__cta',
    ])
    const [spans, coda] = block.querySelectorAll('dl')
    expect([...spans!.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual(['2026 through 2028', '2029 through 2035'])
    expect(spans!.textContent, 'the condition is never an item of the spans’ list').not.toContain(CODA.label)
    expect(coda!.querySelectorAll('div.note-parts__segment')).toHaveLength(1)
    expect(coda!.querySelector('dt.note-parts__label')).toHaveTextContent(CODA.label)
    expect(coda!.querySelector('dd.note-parts__body')).toHaveTextContent('In such a working year, a fourth sentence. A fifth.')
  })

  it('the text runs opening, segments, coda (the gate’s React key and every test’s compare)', () => {
    expect(notePartsText(WITH_CODA)).toBe(
      'The opening. The lead: 2026 through 2028 First sentence. Second sentence. 2029 through 2035 Third sentence. If only one of you is alive In such a working year, a fourth sentence. A fifth.',
    )
  })

  it('a note with a coda is never plain, even with no segments; one without draws exactly as before', () => {
    expect(isPlainNote({ opening: 'A.', segments: [], door: null, coda: CODA })).toBe(false)
    expect(isPlainNote(plainNote('A.'))).toBe(true)
    const { container } = render(<NotePartsBlock parts={WITHOUT_CODA} className="fod-note" button={BUTTON} />)
    expect(container.querySelectorAll('dl')).toHaveLength(1)
    expect(container.querySelector('.note-parts__coda')).toBeNull()
    expect(notePartsText(WITHOUT_CODA)).toBe('The opening. The lead: 2026 through 2028 First sentence. Second sentence. 2029 through 2035 Third sentence.')
  })

  it('a read-only tab drops a door and keeps a doorless note (coda and all) as it is', () => {
    expect(withoutDoor(WITH_CODA)).toBe(WITH_CODA)
    const doored: NoteParts = { opening: 'A.', segments: SEGMENTS, door: { label: 'Door', lead: ['L.'], items: [], tail: [] } }
    expect(withoutDoor(doored)).toEqual({ opening: 'A.', segments: SEGMENTS, door: null })
  })

  it('a coda and a door cannot both be set (by type)', () => {
    // Never called: a compile-only arm (a `@ts-expect-error` arm still runs, `docs/landmines.md`).
    const _compileOnly = (): NoteParts =>
      // @ts-expect-error — a note carries a coda or a door, never both (KTD6)
      ({ opening: 'A.', segments: [], door: { label: 'D', lead: [], items: [], tail: [] }, coda: CODA })
    expect(typeof _compileOnly).toBe('function')
  })
})
