// @vitest-environment jsdom
/**
 * The standing note's parts and their block (`noteParts.ts`, `NotePartsBlock.tsx`), in its two forms, each pinned as the
 * exact DOM, typed by hand:
 * - The typed-below line's RUNS (the walk-8 form spec's U2, `docs/plans/features/typed-below-walk8-form-build-spec.md`,
 *   KD7 and KD8): an `<ol role="list">`, one `<li>` per run holding its label and then each of its sentences as its own
 *   `<p>`; after the list, the closing `<p>` (the survivor part: a condition over the runs, never one more of them) where
 *   there is one; the host's button last. No `<dl>`, no coda list, no heading, no table.
 * - W's stale line (segments and, on the Result, the door): unchanged by U2, byte for byte. These pins were run green
 *   against the renderer as it stood before U2 (`git show f51be29a:src/ui/NotePartsBlock.tsx`), where the runs arms
 *   redded, and then against U2's.
 */
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, within } from '@testing-library/react'
import { NotePartsBlock } from '../NotePartsBlock'
import { isPlainNote, notePartsText, plainNote, withoutDoor, type NoteParts } from '../noteParts'

afterEach(cleanup)

const RUN_ITEMS = [
  { label: '2026 through 2028, while you’re still working', sentences: ['Run one, sentence one.', 'Run one, sentence two.', 'Run one, sentence three.'] },
  {
    label: '2029 through 2032, while you’re still working',
    sentences: ['Run two, sentence one.', 'Run two, sentence two.', 'Run two, sentence three.'],
  },
  {
    label: '2033 through 2035, while you’re still working',
    sentences: ['Run three, sentence one.', 'Run three, sentence two.', 'Run three, sentence three.'],
  },
] as const
const CLOSING = ['In a working year with only one of you alive, the closing’s first sentence.', 'The closing’s second.'] as const
const OPENING = 'The opening. The lead:'
const WITH_CLOSING: NoteParts = { opening: OPENING, segments: [], door: null, runs: { items: RUN_ITEMS, closing: CLOSING } }
const NO_CLOSING: NoteParts = { opening: OPENING, segments: [], door: null, runs: { items: RUN_ITEMS, closing: null } }
const BUTTON = (
  <button type="button" className="band-premise__cta note-parts__cta">
    Update your figure
  </button>
)

// The DOM, typed by hand (never composed from the fixtures above: a renderer that reorders, joins or drops a part reds).
const OPENING_HTML = '<p class="note-parts__opening">The opening. The lead:</p>'
const RUNS_HTML =
  '<ol role="list" class="note-parts__runs">' +
  '<li class="note-parts__run"><p class="note-parts__label">2026 through 2028, while you’re still working</p>' +
  '<p class="note-parts__para">Run one, sentence one.</p><p class="note-parts__para">Run one, sentence two.</p>' +
  '<p class="note-parts__para">Run one, sentence three.</p></li>' +
  '<li class="note-parts__run"><p class="note-parts__label">2029 through 2032, while you’re still working</p>' +
  '<p class="note-parts__para">Run two, sentence one.</p><p class="note-parts__para">Run two, sentence two.</p>' +
  '<p class="note-parts__para">Run two, sentence three.</p></li>' +
  '<li class="note-parts__run"><p class="note-parts__label">2033 through 2035, while you’re still working</p>' +
  '<p class="note-parts__para">Run three, sentence one.</p><p class="note-parts__para">Run three, sentence two.</p>' +
  '<p class="note-parts__para">Run three, sentence three.</p></li>' +
  '</ol>'
const CLOSING_HTML =
  '<p class="note-parts__closing">In a working year with only one of you alive, the closing’s first sentence. The closing’s second.</p>'
const BUTTON_HTML = '<button type="button" class="band-premise__cta note-parts__cta">Update your figure</button>'

describe('the typed-below line’s runs (the walk-8 form spec’s U2, KD7 and KD8)', () => {
  it('draws the opening, the ordered list of runs (each its label, then each sentence its own paragraph), the closing paragraph, then the button', () => {
    const { container } = render(<NotePartsBlock parts={WITH_CLOSING} className="fod-note cs-paycheck-note" button={BUTTON} />)
    expect(container.innerHTML).toBe(`<div class="note-parts fod-note cs-paycheck-note">${OPENING_HTML}${RUNS_HTML}${CLOSING_HTML}${BUTTON_HTML}</div>`)
  })

  it('the list is a list in the accessibility tree, one item per run, and the closing is never one of its items', () => {
    const { container } = render(<NotePartsBlock parts={WITH_CLOSING} className="save-step__note" />)
    const block = container.querySelector('div.note-parts')!
    const list = within(block as HTMLElement).getByRole('list')
    expect(list).toHaveAttribute('role', 'list')
    const items = within(list).getAllByRole('listitem')
    expect(items.map((li) => li.querySelector(':scope > p.note-parts__label')?.textContent)).toEqual([
      '2026 through 2028, while you’re still working',
      '2029 through 2032, while you’re still working',
      '2033 through 2035, while you’re still working',
    ])
    expect(list.textContent, 'the survivor part sits outside the list').not.toContain('In a working year with only one of you alive')
    expect(block.lastElementChild?.matches('p.note-parts__closing')).toBe(true)
    expect(container.querySelector('dl'), 'no description list: the coda list is gone').toBeNull()
    expect(container.querySelector('.note-parts__coda')).toBeNull()
    expect(container.querySelector('h1, h2, h3, h4, h5, h6, table'), 'no heading and no table inside').toBeNull()
  })

  it('every host’s mix of closing and button: the closing follows the list where there is one, and the button is always last', () => {
    const tails: [NoteParts, boolean, string][] = [
      [WITH_CLOSING, false, `${RUNS_HTML}${CLOSING_HTML}`],
      [NO_CLOSING, true, `${RUNS_HTML}${BUTTON_HTML}`],
      [NO_CLOSING, false, RUNS_HTML],
    ]
    for (const [parts, withButton, tail] of tails) {
      const { container, unmount } = render(<NotePartsBlock parts={parts} className="field-help left-over__at-quote" button={withButton ? BUTTON : undefined} />)
      expect(container.innerHTML).toBe(`<div class="note-parts field-help left-over__at-quote">${OPENING_HTML}${tail}</div>`)
      unmount()
    }
  })

  it('the text runs opening, each run’s label then its sentences, the closing (the gate’s React key and every test’s compare)', () => {
    expect(notePartsText(WITH_CLOSING)).toBe(
      'The opening. The lead: 2026 through 2028, while you’re still working Run one, sentence one. Run one, sentence two. Run one, sentence three. ' +
        '2029 through 2032, while you’re still working Run two, sentence one. Run two, sentence two. Run two, sentence three. ' +
        '2033 through 2035, while you’re still working Run three, sentence one. Run three, sentence two. Run three, sentence three. ' +
        'In a working year with only one of you alive, the closing’s first sentence. The closing’s second.',
    )
    expect(notePartsText(NO_CLOSING).endsWith('Run three, sentence three.')).toBe(true)
  })

  it('a note with runs is never plain, and a read-only tab keeps it as it is (it has no door to drop)', () => {
    expect(isPlainNote(WITH_CLOSING)).toBe(false)
    expect(isPlainNote(NO_CLOSING)).toBe(false)
    expect(isPlainNote(plainNote('A.'))).toBe(true)
    expect(withoutDoor(WITH_CLOSING)).toBe(WITH_CLOSING)
  })

  it('a note with runs carries no segments and no door (by type)', () => {
    // Never called: a compile-only arm (a `@ts-expect-error` arm still runs, `docs/landmines.md`).
    const _compileOnly = (): NoteParts[] => [
      // @ts-expect-error — runs and a door never ride together (KD8: the typed-below line has no door)
      { opening: 'A.', segments: [], door: { label: 'D', lead: [], items: [], tail: [] }, runs: { items: RUN_ITEMS, closing: null } },
      // @ts-expect-error — runs and segments never ride together (one list per block)
      { opening: 'A.', segments: RUN_ITEMS, door: null, runs: { items: RUN_ITEMS, closing: null } },
    ]
    expect(typeof _compileOnly).toBe('function')
  })
})

describe('W’s stale line (segments and the Result’s door): unchanged by U2', () => {
  const SEGMENTS = [
    { label: 'This answer now', sentences: ['First sentence.', 'Second sentence.'] },
    { label: 'If a working year costs $105,000', sentences: ['Third sentence.'] },
  ] as const
  const DOOR = { label: 'To update your figure', lead: ['The door’s lead.', 'Its second.'], items: ['A cost.', 'Another cost.'], tail: ['The tail.'] }
  const SEGMENTS_HTML =
    '<div class="note-parts__segment"><dt class="note-parts__label">This answer now</dt>' +
    '<dd class="note-parts__body">First sentence. Second sentence.</dd></div>' +
    '<div class="note-parts__segment"><dt class="note-parts__label">If a working year costs $105,000</dt>' +
    '<dd class="note-parts__body">Third sentence.</dd></div>'

  it('with the door: one dl, a div>dt+dd per segment, the door last with its lead, its cost list, its tail and the button inside its dd', () => {
    const doored: NoteParts = { opening: 'The note.', segments: SEGMENTS, door: DOOR }
    const { container } = render(<NotePartsBlock parts={doored} className="fod-note cs-paycheck-note" button={BUTTON} />)
    expect(container.innerHTML).toBe(
      '<div class="note-parts fod-note cs-paycheck-note">' +
        '<p class="note-parts__opening">The note.</p>' +
        '<dl class="note-parts__segments">' +
        SEGMENTS_HTML +
        '<div class="note-parts__segment note-parts__door"><dt class="note-parts__label">To update your figure</dt>' +
        '<dd class="note-parts__body"><p class="note-parts__para">The door’s lead. Its second.</p>' +
        '<ul class="note-parts__list"><li>A cost.</li><li>Another cost.</li></ul>' +
        '<p class="note-parts__para">The tail.</p>' +
        BUTTON_HTML +
        '</dd></div>' +
        '</dl></div>',
    )
  })

  it('a read-only tab: the door and its button drop, the segments stay; a door with no list or tail draws its lead alone', () => {
    const doored: NoteParts = { opening: 'The note.', segments: SEGMENTS, door: DOOR }
    const readOnly = withoutDoor(doored)
    expect(readOnly).toEqual({ opening: 'The note.', segments: SEGMENTS, door: null })
    const { container, unmount } = render(<NotePartsBlock parts={readOnly} className="save-step__note save-field__note--block" />)
    expect(container.innerHTML).toBe(
      '<div class="note-parts save-step__note save-field__note--block"><p class="note-parts__opening">The note.</p>' +
        `<dl class="note-parts__segments">${SEGMENTS_HTML}</dl></div>`,
    )
    unmount()
    const bare: NoteParts = { opening: 'A.', segments: [], door: { label: 'Door', lead: ['L.'], items: [], tail: [] } }
    const { container: bareContainer } = render(<NotePartsBlock parts={bare} className="fod-note" />)
    expect(bareContainer.innerHTML).toBe(
      '<div class="note-parts fod-note"><p class="note-parts__opening">A.</p><dl class="note-parts__segments">' +
        '<div class="note-parts__segment note-parts__door"><dt class="note-parts__label">Door</dt>' +
        '<dd class="note-parts__body"><p class="note-parts__para">L.</p></dd></div></dl></div>',
    )
    expect(notePartsText(doored)).toBe(
      'The note. This answer now First sentence. Second sentence. If a working year costs $105,000 Third sentence. ' +
        'To update your figure The door’s lead. Its second. A cost. Another cost. The tail.',
    )
  })
})
