// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Result } from '../Result'
import { appModel } from '../appModel'
import { resolvedFocusKey, selectElevatedAnswer } from '../answerView'
import { copy, slots, workingCostExtras } from '@ui/copy'
import { DEV_SEEDS } from '../devSeeds'
import { DATE_FIXTURES, DATE_WINDOW_TOP } from '../preview/dateFixtures'

/*
 * The pay check's KTD21 standing line, wired through Result (`docs/plans/features/working-year-pay-check-build-spec.md`
 * U8): Result reads the ONE stale predicate off the draft and hands FuckOffDate the line iff W is stale;
 * its door opens the assumptions panel AT the W row; a read-only tab reads the line with no door; and the
 * seat is dropped on close, so the plain Assumptions door never re-lands on W.
 *
 * Harness: the resultAssumptionsDoor precedent — the module appModel is real (drafts reset per test), and
 * the elevated hero is module-mocked to a resolved DATE view (the line lives on the date hero only), with a
 * planted focus key so the quiet doors render. No engine run: the line reads the draft, never the wire.
 */

vi.mock('../answerView', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../answerView')>()
  return { ...actual, resolvedFocusKey: vi.fn(actual.resolvedFocusKey), selectElevatedAnswer: vi.fn(actual.selectElevatedAnswer) }
})

vi.stubGlobal(
  'matchMedia',
  (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
)

const pristineDraft = appModel.getSnapshot().draft
const confirmedDate = { kind: 'dates', floor: DATE_FIXTURES.confirmed, lifestyle: DATE_FIXTURES.confirmed, windowTopYears: DATE_WINDOW_TOP } as const

afterEach(() => {
  cleanup()
  appModel.update(() => pristineDraft)
  vi.mocked(resolvedFocusKey).mockReset()
  vi.mocked(selectElevatedAnswer).mockReset()
  document.documentElement.classList.remove('control-sheet-open')
})

function plantDateHero() {
  vi.mocked(resolvedFocusKey).mockReturnValue('planted-focus-key')
  vi.mocked(selectElevatedAnswer).mockReturnValue({ kind: 'date', view: confirmedDate })
}

const line = () => document.querySelector('.cs-paycheck-note')
const lineDoor = () => screen.queryByRole('button', { name: copy.stalenessPayCheckCta })
const wRowName = () =>
  document.querySelector('[data-assumption-seat="working-year-cost"] .ap-row__name') as HTMLElement | null

describe('the pay check’s standing line through Result (KTD21)', () => {
  it('a STALE W puts the line on the date hero; its door opens the panel and lands on the W row', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datecoststale)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(line()?.textContent).toContain(copy.stalenessPayCheckNote)
    fireEvent.click(lineDoor()!)
    expect(screen.getByRole('heading', { name: copy.assumptionTitle })).toBeInTheDocument()
    expect(document.activeElement).toBe(wRowName())
  })

  it('a W that still matches reads no line', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.dateshort)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(line()).toBeNull()
  })

  it('a READ-ONLY tab states the fact with no door', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datecoststale)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} readOnly />)
    // The lead, then the W step's own stale sentence: both figures and the cause that moved ($84,000 held
    // above $78,000 now — the safe side, so no lean is said).
    expect(line()?.textContent).toBe(`${copy.stalenessPayCheckNote} ${slots.workingCostStaleQuote('84,000', '78,000')}`)
    expect(lineDoor()).toBeNull()
  })

  it('the seat drops on close: the plain Assumptions door afterwards keeps the sheet’s own landing', async () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datecoststale)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    fireEvent.click(lineDoor()!)
    expect(document.activeElement).toBe(wRowName())
    // Close through the panel's own quiet Close (the sheet animates out, so wait for it to go).
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: copy.leverCancel }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: copy.assumptionTitle })).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: copy.assumptionDoorCta }))
    expect(screen.getByRole('heading', { name: copy.assumptionTitle })).toBeInTheDocument()
    expect(document.activeElement).not.toBe(wRowName())
  })
})

// Build 2's U14 (R12): the same slot, keyed by cause. A moved left over speaks in the slot with its own lead
// and door (opening the left-over seat), unless a rules line hosted it at unlock (`leftOverClauseHost`), when
// the two figures ride the hero's rules note instead; a "saved" answer waiting on W adds its clause to W's line.
const leftOverDoor = () => screen.queryByRole('button', { name: copy.stalenessLeftOverCta })
const leftOverSeatName = () =>
  document.querySelector('[data-assumption-seat="working-year-left-over"] .ap-row__name') as HTMLElement | null
const MOVED = slots.stalenessLeftOverMoved('16,985', '27,537', '16,985')

describe('build 2’s left-over lines through Result (U14, R12)', () => {
  it('`datesavedmoved`: the slot names both figures under its OWN lead — never W’s — and its door lands on the left-over seat', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedmoved)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(line()?.textContent).toContain(`${copy.stalenessLeftOverNote} ${MOVED}`)
    expect(line()?.textContent).not.toContain(copy.stalenessPayCheckNote)
    expect(lineDoor(), 'no W door').toBeNull()
    fireEvent.click(leftOverDoor()!)
    expect(screen.getByRole('heading', { name: copy.assumptionTitle })).toBeInTheDocument()
    expect(document.activeElement).toBe(leftOverSeatName())
  })

  it('a READ-ONLY tab states the moved left over with no door', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedmoved)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} readOnly />)
    expect(line()?.textContent).toBe(`${copy.stalenessLeftOverNote} ${MOVED}`)
    expect(leftOverDoor()).toBeNull()
  })

  it('where a rules line hosted it at unlock, the two figures ride the hero’s rules note, and the slot says nothing (one cause, one line)', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedmoved)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} stalenessNote leftOverClauseHost />)
    expect(document.querySelector('.cs-staleness-note')?.textContent).toBe(
      `${copy.stalenessHeroNote} ${slots.stalenessLeftOverClause('16,985', '27,537', '16,985')}`,
    )
    expect(line()).toBeNull()
  })

  // W's line as a BLOCK on the Result (council `wf_22858e04-f7a` (1), (4), amending KTD21's element only): the opening
  // as a <p>, the labelled parts as a <dl>, and — where the tab can save — the door as the last dt/dd. Read off the DOM.
  const block = () => {
    const l = line()!
    return {
      opening: l.querySelector(':scope > p.note-parts__opening')?.textContent,
      labels: Array.from(l.querySelectorAll(':scope > dl > div > dt')).map((dt) => dt.textContent),
      bodies: Array.from(l.querySelectorAll(':scope > dl > div:not(.note-parts__door) > dd')).map((dd) => dd.textContent),
      door: l.querySelector(':scope > dl > div.note-parts__door'),
    }
  }

  it('`datesavedstale`: W’s one line leads with the either-way sentence in "confirm or change", then "This answer now" — after work it already uses $78,000, the $16,985 dated, none of it added until they confirm or change it, and no amount guessed at; no moved line speaks', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedstale)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} readOnly />)
    expect(block()).toEqual({
      opening: [copy.stalenessPayCheckNote, slots.workingCostStaleQuote('84,000', '78,000'), copy.workingCostStaleEitherWayConfirm].join(' '),
      labels: [copy.workingCostStaleLabelNow],
      bodies: [
        [
          slots.workingCostStaleAfterWork('78,000', true),
          slots.workingCostStaleLeftOverAnswered('16,985'),
          slots.workingCostStaleLeftOverNoneConfirm('16,985', '84,000'),
          copy.workingCostStaleNoGuess,
        ].join(' '),
      ],
      door: null,
    })
    expect(document.body.textContent).not.toContain(copy.stalenessLeftOverNote)
  })

  // The U11 walk's (ae), in council `wf_7fa86902-35c`'s shape: where the spending ROSE past the yes, the Result's line
  // carries the lean (R2's gap where no year at the quote runs short), the lead, "This answer now", then "If a working
  // year costs $X" and what updating does there (year 0 at $90,000, hand-derived: 150,000 − 11,475 − 17,540 − 20,000 −
  // 90,000 = $10,985) — and where year 0 at the quote is short (at $105,000: −$4,015), the short-year lead, "This answer
  // now" ending on today (R3), and that updating brings none of it back.
  it('`datesavedrisen` and `datesavedrisenshort`: W’s line carries its lean, the arm’s lead, "This answer now", then what updating to the quote does — at most $10,985 and what lowers it, or none of the $16,985 back — and what a lower figure does', () => {
    const NOW = (spending: string, tail: readonly string[]) =>
      [slots.workingCostStaleAfterWork(spending, true), slots.workingCostStaleLeftOverAnswered('16,985'), ...tail].join(' ')
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedrisen)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} readOnly />)
    expect(block()).toEqual({
      opening: [
        copy.stalenessPayCheckNote,
        slots.workingCostStaleQuote('84,000', '90,000'),
        slots.workingCostStaleLeftOverInflated('84,000', '6,000', '90,000'),
        copy.workingCostStaleEitherWayUpdate,
      ].join(' '),
      labels: [copy.workingCostStaleLabelNow, slots.workingCostStaleLabelIf('90,000')],
      bodies: [
        NOW('90,000', [slots.workingCostStaleLeftOverNoneUpdate('16,985', '84,000'), slots.workingCostStaleNoSmallerAmount('90,000')]),
        [
          slots.workingCostStaleLeftOverIfCapped('10,985', 2026, '90,000', false),
          slots.workingCostStaleEachDollar('90,000', '10,985'),
          slots.workingCostStaleLowerAddsMore('90,000', '16,985'),
        ].join(' '),
      ],
      door: null,
    })
    cleanup()
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedrisenshort)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} readOnly />)
    expect(block()).toEqual({
      opening: [
        copy.stalenessPayCheckNote,
        slots.workingCostStaleQuote('84,000', '105,000'),
        slots.workingCostStaleLeftOverYearsCheaper('84,000'),
        slots.workingCostStaleShortUntilUpdated('84,000'),
      ].join(' '),
      labels: [copy.workingCostStaleLabelNow, slots.workingCostStaleLabelIf('105,000')],
      bodies: [
        NOW('105,000', [slots.workingCostStaleLeftOverNoneNow('16,985', '84,000')]),
        [slots.workingCostStaleLeftOverIfFirstShortRun(2026, 2032, '3,652', '4,015', '105,000', '84,000', '16,985'), copy.workingCostStaleLowerCounts].join(' '),
      ],
      door: null,
    })
  })

  // THE DOOR (council `wf_7fa86902-35c`; its form, council `wf_22858e04-f7a` (4)): the last dt/dd — the act's heading,
  // the condition, the W help's own cost items as a list, the "Yes" sentence, then the button as a block — only where
  // the tab can save (a read-only tab, above, is told no buttons to press).
  it('a writable tab: the risen door — its heading, "To update it, press … below." and the condition, the list, "Yes", then "Update your figure for a working year" as a block, which lands on the W row; the fallen door names its Keep with the room it leaves and keeps "Confirm or change your figure"', () => {
    const updateDoor = () => screen.queryByRole('button', { name: copy.stalenessPayCheckCtaUpdate })
    const doorParts = () => {
      const d = block().door!
      const dd = d.querySelector('dd')!
      return {
        label: d.querySelector('dt')?.textContent,
        children: Array.from(dd.children).map((c) => c.tagName),
        paras: Array.from(dd.querySelectorAll(':scope > p')).map((p) => p.textContent),
        items: Array.from(dd.querySelectorAll(':scope > ul > li')).map((li) => li.textContent),
        button: dd.lastElementChild?.matches('button.band-premise__cta.note-parts__cta') ? dd.lastElementChild.textContent : null,
      }
    }
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedrisen)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(doorParts()).toEqual({
      label: slots.workingCostStaleDoorHeadingUpdate('84,000'),
      children: ['P', 'UL', 'P', 'BUTTON'],
      paras: [
        [slots.workingCostStaleResultDoorUpdate(copy.stalenessPayCheckCtaUpdate), slots.workingCostStaleDoorIfUpdate('90,000', false)].join(' '),
        [copy.workingCostStaleDoorCounted, slots.workingCostStaleDoorYes('90,000')].join(' '),
      ],
      items: workingCostExtras(true),
      button: copy.stalenessPayCheckCtaUpdate,
    })
    expect(lineDoor(), 'no "confirm or change" below the quote: the W row offers no Keep door').toBeNull()
    fireEvent.click(updateDoor()!)
    expect(document.activeElement).toBe(wRowName())
    cleanup()
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedstale)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(doorParts()).toEqual({
      label: slots.workingCostStaleDoorHeadingConfirm('84,000'),
      children: ['P', 'UL', 'P', 'BUTTON'],
      paras: [
        copy.workingCostStaleDoorHold,
        [
          slots.workingCostStaleDoorMore('84,000', '6,000', '78,000'),
          slots.workingCostStaleResultDoorConfirm(copy.stalenessPayCheckCta),
          slots.workingCostStaleDoorKeepUpTo('Keep $84,000 a year', '6,000'),
          slots.workingCostStaleDoorYes('78,000'),
          slots.workingCostStaleDoorNoPlus('78,000', false),
        ].join(' '),
      ],
      items: workingCostExtras(true),
      button: copy.stalenessPayCheckCta,
    })
    expect(updateDoor()).toBeNull()
    expect(lineDoor()).not.toBeNull()
  })

  it('the block’s form on the Result: div.note-parts in the slot’s register (no <p> holding a <dl>), p then dl, each part a div>dt+dd, the door last, no heading and no run-in label inside; read-only keeps the parts and drops the door and its button', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedrisenlater)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    const l = line()!
    expect(l.tagName).toBe('DIV')
    expect(Array.from(l.classList).sort()).toEqual(['cs-paycheck-note', 'fod-note', 'note-parts'])
    expect(Array.from(l.children).map((c) => c.tagName)).toEqual(['P', 'DL'])
    const groups = Array.from(l.querySelectorAll(':scope > dl > div'))
    expect(groups.map((g) => Array.from(g.children).map((c) => c.tagName))).toEqual([
      ['DT', 'DD'],
      ['DT', 'DD'],
      ['DT', 'DD'],
    ])
    expect(groups.map((g) => g.querySelector('dt')?.textContent)).toEqual([
      'This answer now',
      'If a working year costs $105,000',
      'To update your $84,000 figure',
    ])
    expect(groups[2]!.classList.contains('note-parts__door')).toBe(true)
    expect(l.querySelector('h1, h2, h3, h4, strong, br'), 'no heading, no run-in label, no line break').toBeNull()
    expect(l.querySelectorAll('button')).toHaveLength(1)
    cleanup()
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedrisenlater)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} readOnly />)
    expect(block().labels).toEqual(['This answer now', 'If a working year costs $105,000'])
    expect(block().door).toBeNull()
    expect(line()!.querySelector('button')).toBeNull()
  })

  it('a note with no parts keeps the slot’s old <p>, byte for byte, its button inline (the reduce-to-plain): W stale with no answer stored, and the moved left over', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datecoststale)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(line()!.outerHTML).toBe(
      `<p class="fod-note cs-paycheck-note"><span>${copy.stalenessPayCheckNote} ${slots.workingCostStaleQuote('84,000', '78,000')}</span> ` +
        `<button type="button" class="band-premise__cta">${copy.stalenessPayCheckCta}</button></p>`,
    )
    cleanup()
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedmoved)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(line()!.outerHTML).toBe(
      `<p class="fod-note cs-paycheck-note"><span>${copy.stalenessLeftOverNote} ${MOVED}</span> ` +
        `<button type="button" class="band-premise__cta">${copy.stalenessLeftOverCta}</button></p>`,
    )
  })

  it('an absent, spent or not-sure answer shows no left-over line or clause — fresh or with W stale', () => {
    for (const answer of [undefined, { kind: 'spent' }, { kind: 'not-sure' }] as const) {
      for (const base of [DEV_SEEDS.date, DEV_SEEDS.datecoststale]) {
        plantDateHero()
        appModel.update(() => ({ ...base, workingYearLeftOver: answer }))
        render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} stalenessNote leftOverClauseHost />)
        const text = document.body.textContent ?? ''
        expect(text, `${answer?.kind ?? 'absent'}`).not.toContain(copy.stalenessLeftOverNote)
        // Aimed at the clause's live lead (insight 086: a negative on a phrase no string says passes vacuously —
        // this one read 'left over a year is added', which neither the old clause nor the new one says). U11 walk 3
        // (b9-4) re-aimed it at the clause's two live sentences: the dated figure and what the stale W withholds.
        expect(text).not.toContain('When you answered, $')
        expect(text).not.toContain('none of it is added to your savings')
        expect(document.querySelector('.cs-staleness-note')?.textContent).toBe(copy.stalenessHeroNote)
        cleanup()
      }
    }
  })
})

// U11 walk 6's R1: a FRESH typed W below today's quote — no stale line ever names it (a typed figure is never staled on a
// quote, KTD10) — takes the standing slot in W's plain form, the update act's button inline after it. Every sentence is
// typed by hand from the seeds' documented figures (`datesavedtyped`: $84,000 typed under a $90,000 spending figure,
// "All of it" stored at $16,985, year 0 at the quote $10,985).
describe('U11 walk 6’s R1 — the typed-below line through Result', () => {
  const TYPED_LINE =
    'This answer counts a working year at your own figure of $84,000 a year, below your spending of $90,000 a year. ' +
    'A working year almost always costs at least what you spend, so this answer can look better than it really is. ' +
    'It adds up to $16,985 a year to your savings. At $90,000 a year, your first working year, 2026, has $10,985 left over.'
  const updateDoor = () => screen.queryByRole('button', { name: 'Update your figure for a working year' })

  it('`datesavedtyped`: the line in the slot’s plain <p>, byte for byte — no lead before it, its own first sentence names the answer and both figures — and the update door inline, which lands on the W row', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedtyped)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(line()!.outerHTML).toBe(
      `<p class="fod-note cs-paycheck-note"><span>${TYPED_LINE}</span> <button type="button" class="band-premise__cta">Update your figure for a working year</button></p>`,
    )
    expect(document.body.textContent, 'no W lead: W is fresh').not.toContain(copy.stalenessPayCheckNote)
    fireEvent.click(updateDoor()!)
    expect(screen.getByRole('heading', { name: copy.assumptionTitle })).toBeInTheDocument()
    expect(document.activeElement).toBe(wRowName())
  })

  it('a READ-ONLY tab states the line with no door', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedtyped)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} readOnly />)
    expect(line()!.outerHTML).toBe(`<p class="fod-note cs-paycheck-note"><span>${TYPED_LINE}</span></p>`)
    expect(updateDoor()).toBeNull()
  })

  it('the left over ALSO moved (`datesavedrisenlater` retyped: $26,985 at $84,000 against the stored $16,985): the typed-below line holds the one slot and carries the moved clause in place of its credit sentence — no moved line of its own; where a rules line hosts that clause at unlock, the line keeps its credit sentence', () => {
    const later = DEV_SEEDS.datesavedrisenlater
    const w = later.workingYearCost
    if (w === undefined) throw new Error('[test setup] the witness holds a W')
    const retyped = { ...later, workingYearCost: { kind: 'entered' as const, amountReal: 84_000, entryPeriod: 'year' as const, stateTaxReading: w.stateTaxReading } }
    const COUNTS =
      'This answer counts a working year at your own figure of $84,000 a year, below your spending of $105,000 a year. ' +
      'A working year almost always costs at least what you spend, so this answer can look better than it really is.'
    const AT_QUOTE =
      'At $105,000 a year, your first working year, 2026, has $5,985 left over. At that cost, each working year from 2029 through 2032 comes up $3,652 to $4,015 short.'
    plantDateHero()
    appModel.update(() => retyped)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(document.querySelectorAll('.cs-paycheck-note')).toHaveLength(1)
    expect(line()!.querySelector('span')!.textContent).toBe(
      `${COUNTS} The money left over in your first working year is $26,985 now, not the $16,985 you answered at, so each working year adds at most $16,985 of its left over to your savings, the smaller of the two. ${AT_QUOTE}`,
    )
    expect(document.body.textContent, 'no moved line of its own').not.toContain(copy.stalenessLeftOverNote)
    expect(updateDoor()).not.toBeNull()
    cleanup()
    plantDateHero()
    appModel.update(() => retyped)
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} stalenessNote leftOverClauseHost />)
    expect(line()!.querySelector('span')!.textContent).toBe(`${COUNTS} It adds up to $16,985 a year to your savings. ${AT_QUOTE}`)
    expect(document.querySelector('.cs-staleness-note')?.textContent, 'the moved clause rides the rules note').toContain('$26,985 now, not the $16,985 you answered at')
  })

  it('W stale wins the slot over a typed figure stale on its reading (Florida picked after typing): W’s own stale line speaks, never the typed-below line', () => {
    plantDateHero()
    appModel.update(() => ({ ...DEV_SEEDS.datesavedtyped, retirementState: 'FL' }))
    render(<Result onReview={vi.fn()} save={{ kind: 'none' }} computing={false} />)
    expect(document.querySelectorAll('.cs-paycheck-note')).toHaveLength(1)
    expect(line()!.textContent).toContain(copy.stalenessPayCheckNote)
    expect(line()!.textContent).not.toContain('answer counts a working year at your own figure')
  })
})
