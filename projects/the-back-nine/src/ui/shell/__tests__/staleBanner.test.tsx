// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import { appModel } from '../../appModel'
import { resolvedFocusKey, selectElevatedAnswer } from '../../answerView'
import { composeAnswerNotes } from '../../answerNotes'
import { useEditorSheets } from '../../editorSheets'
import { copy, slots, workingCostExtras } from '@ui/copy'
import { DEV_SEEDS } from '../../devSeeds'
import { DATE_FIXTURES, DATE_WINDOW_TOP } from '../../preview/dateFixtures'
import { composeStaleLines } from '../staleLines'
import { STANDING_DOOR_CLASSES, StaleBannerStack } from '../StaleBannerStack'
import { useDrawerHost } from '../../screens/profile/drawerHost'

/** The door's class attribute as `outerHTML` writes it. */
const DOOR_ATTR = STANDING_DOOR_CLASSES.replace(/&/g, '&amp;')
import { currentEpochDay } from '../../scenarioFromDraft'
import { epochDayToCalendarYear } from '@store/staleness'
import { councilBudgetHousehold } from '@intake/__tests__/typedBelowWitnesses'
import { workingYearCostStaleLine } from '@intake/workingYearLeftOver'
import { buildSpineParams, healthcarePriced, isDateRoute, missingRequiredFacts, spineMedicarePriced } from '@intake/intakeMap'
import type { MemoryModelSnapshot, ModelAnswer, ScenarioDraft } from '@store/memoryModel'

/*
 * PORTED at Act 6 · RC4 from `src/ui/__tests__/resultPayCheckLine.test.tsx`: the old answer page's hero carried these
 * lines; RC4 moved them to the StaleBanner above Snapshot and Probability (`staleLines.ts`, `StaleBannerStack.tsx`),
 * unchanged in what they say, with the same door into the assumptions panel at each cause's seat. The harness below
 * hosts the banner as the shell does (the notes from `composeAnswerNotes`, the panel from `useEditorSheets`, the gear's
 * plain door beside it); every law below is the original's.
 *
 * The pay check's KTD21 standing line, wired through Result (`docs/plans/features/working-year-pay-check-build-spec.md`
 * U8): Result reads the ONE stale predicate off the draft and hands FuckOffDate the line iff W is stale;
 * its door opens the assumptions panel AT the W row; a read-only tab reads the line with no door; and the
 * seat is dropped on close, so the plain Assumptions door never re-lands on W.
 *
 * Harness: the resultAssumptionsDoor precedent — the module appModel is real (drafts reset per test), and
 * the elevated hero is module-mocked to a resolved DATE view (the line lives on the date hero only), with a
 * planted focus key so the quiet doors render. No engine run: the line reads the draft, never the wire.
 */

vi.mock('../../answerView', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../answerView')>()
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

/*
 * W9-R7 (KTD5): the hero's lines describe the draft the SHOWN answer was figured from, so a planted hero needs a
 * planted answer. The store's answer only resolves through the real worker, so it is planted by wrapping
 * `getSnapshot` (the recommendationSaveGesture precedent; cached on its inputs, since `useSyncExternalStore` throws
 * on a snapshot whose identity changes on every read). `answeredAt: null` is a settled page: the answer was figured
 * from whatever draft is on screen. A draft is an answer committed THERE, with every later edit not yet re-figured.
 */
const realGetSnapshot = appModel.getSnapshot.bind(appModel)
interface Planted {
  readonly answeredAt: ScenarioDraft | null
}
let planted: Planted | null = null
let cached: { readonly base: MemoryModelSnapshot; readonly planted: Planted; readonly snap: MemoryModelSnapshot } | null = null
vi.spyOn(appModel, 'getSnapshot').mockImplementation((): MemoryModelSnapshot => {
  const base = realGetSnapshot()
  if (planted === null) return base
  if (cached !== null && cached.base === base && cached.planted === planted) return cached.snap
  const answer: ModelAnswer = {
    kind: 'date',
    outcome: { ...confirmedDate, tier: 'final', seed: 1 },
    tier: 'final',
    draft: planted.answeredAt ?? base.draft,
    inputKey: 'planted',
  }
  const snap: MemoryModelSnapshot = { ...base, answer }
  cached = { base, planted, snap }
  return snap
})

afterEach(() => {
  cleanup()
  planted = null
  cached = null
  appModel.update(() => pristineDraft)
  vi.mocked(resolvedFocusKey).mockReset()
  vi.mocked(selectElevatedAnswer).mockReset()
  document.documentElement.classList.remove('control-sheet-open')
})

/** A resolved date hero over a planted answer: settled at the draft on screen, or committed at `answeredAt`. */
function plantDateHero(answeredAt: ScenarioDraft | null = null) {
  vi.mocked(resolvedFocusKey).mockReturnValue('planted-focus-key')
  vi.mocked(selectElevatedAnswer).mockReturnValue({ kind: 'date', view: confirmedDate })
  planted = { answeredAt }
}


/** The shell's StaleBanner host, alone: the notes for the store's answer, the banner, the gear's plain door, the panel. */
function StaleHarness({ readOnly = false, stalenessNote = false, leftOverClauseHost = false }: { readonly readOnly?: boolean; readonly stalenessNote?: boolean; readonly leftOverClauseHost?: boolean }) {
  const snapshot = useSyncExternalStore(appModel.subscribe, appModel.getSnapshot)
  const wallCalendarYear = epochDayToCalendarYear(currentEpochDay())
  const notes = composeAnswerNotes(snapshot, { readOnly, stalenessNote, leftOverClauseHost, wallCalendarYear })
  // The shell's outside doors (RC13b): the pay check's two seats open the Pre-retirement living expenses drawer over the
  // page; any other seat, the panel's.
  const drawers = useDrawerHost(() => null)
  const editors = useEditorSheets({
    model: appModel,
    snapshot,
    missing: missingRequiredFacts(snapshot.draft),
    savedAnchor: notes.planClock,
    restoreFallback: () => null,
    onOpenSequencing: () => {},
    onOpenRoth: () => {},
    onOpenHealth: () => {},
    onOpenBudget: () => drawers.open({ kind: 'living' }, null),
  })
  return (
    <>
      <button type="button" onClick={() => editors.openAssumptions()}>
        {copy.shellGearLabel}
      </button>
      {/* The panel opened at the W row's seat (the gear's drawer still lands on a seat until RC18 replaces it). */}
      <button type="button" data-open-w-seat="" onClick={() => editors.openAssumptions('working-year-cost')} />
      <div data-hero-text="">
        <StaleBannerStack
          lines={composeStaleLines(notes, !readOnly)}
          onOpenSeat={(seat) => (seat === 'working-year-cost' || seat === 'working-year-left-over' ? drawers.open({ kind: 'working-cost' }, null) : editors.openAssumptions(seat))}
        />
        {/* The note lines Probability prints from the same notes (its key-metric column and footnote row). */}
        {[notes.stateNote, notes.medicarePriced?.affirmation, notes.medicarePriced?.residual, notes.medicarePricedNote ? notes.medicareExtrasTypicalNote : undefined]
          .filter((l): l is string => typeof l === 'string')
          .map((l) => (
            <p key={l}>{l}</p>
          ))}
      </div>
      {editors.node}
      {drawers.render({ model: appModel, readOnly })}
    </>
  )
}

const line = () => document.querySelector('.cs-paycheck-note')
/** The door's landing since RC13b: the Pre-retirement living expenses drawer, its title holding focus (it names the
 *  drawer and pops no phone keyboard), its W question inside. */
const wDrawerOpened = (): boolean =>
  document.activeElement?.textContent === copy.profileWorkingCostName && document.querySelector('[data-working-cost-face]') !== null
const lineDoor = () => screen.queryByRole('button', { name: copy.stalenessPayCheckCta })
const wRowName = () =>
  document.querySelector('[data-assumption-seat="working-year-cost"] .ap-row__name') as HTMLElement | null

describe('the pay check’s standing line through Result (KTD21)', () => {
  it('a STALE W puts the line on the date hero; its door opens the Pre-retirement living expenses drawer (RC13b)', async () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datecoststale)
    render(<StaleHarness />)
    expect(line()?.textContent).toContain(copy.stalenessPayCheckNote)
    fireEvent.click(lineDoor()!)
    await waitFor(() => expect(wDrawerOpened()).toBe(true))
  })

  it('W9-R7 (KTD5): a W fixed but not yet re-figured KEEPS the line — the shown date still runs on the old figure — and its door still opens the W drawer; once the answer is figured at the fix, the line goes', async () => {
    appModel.update(() => DEV_SEEDS.datecoststale)
    plantDateHero(realGetSnapshot().draft) // the shown answer, committed at the stale yes
    // The household types the quote in: a fresh entered figure (a typed figure is never staled on a quote, KTD10).
    appModel.update((d) => {
      const w = d.workingYearCost
      if (w === undefined) throw new Error('the seed carries a W')
      return { ...d, workingYearCost: { kind: 'entered', amountReal: 78_000, entryPeriod: 'year', stateTaxReading: w.stateTaxReading } }
    })
    expect(workingYearCostStaleLine(realGetSnapshot().draft), 'the LIVE draft has no stale W').toBeNull()
    const view = render(<StaleHarness />)
    expect(line()?.textContent).toContain(copy.stalenessPayCheckNote)
    fireEvent.click(lineDoor()!)
    await waitFor(() => expect(wDrawerOpened()).toBe(true))
    view.unmount()
    plantDateHero() // the re-figured answer lands, at the draft on screen
    render(<StaleHarness />)
    expect(line()).toBeNull()
  })

  it('a W that still matches reads no line', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.dateshort)
    render(<StaleHarness />)
    expect(line()).toBeNull()
  })

  it('a READ-ONLY tab states the fact with no door', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datecoststale)
    render(<StaleHarness readOnly />)
    // The lead, then the W step's own stale sentence: both figures and the cause that moved ($84,000 held
    // above $78,000 now — the safe side, so no lean is said).
    expect(line()?.textContent).toBe(`${copy.stalenessPayCheckNote} ${slots.workingCostStaleQuote('84,000', '78,000')}`)
    expect(lineDoor()).toBeNull()
  })

  it('the seat drops on close: the plain Assumptions door afterwards keeps the sheet’s own landing', async () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datecoststale)
    render(<StaleHarness />)
    fireEvent.click(document.querySelector<HTMLElement>('[data-open-w-seat]')!)
    expect(document.activeElement).toBe(wRowName())
    // Close through the panel's own quiet Close (the sheet animates out, so wait for it to go).
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: copy.leverCancel }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: copy.assumptionTitle })).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: copy.shellGearLabel }))
    expect(screen.getByRole('heading', { name: copy.assumptionTitle })).toBeInTheDocument()
    expect(document.activeElement).not.toBe(wRowName())
  })
})

// Build 2's U14 (R12): the same slot, keyed by cause. A moved left over speaks in the slot with its own lead
// and door (opening the left-over seat), unless a rules line hosted it at unlock (`leftOverClauseHost`), when
// the two figures ride the hero's rules note instead; a "saved" answer waiting on W adds its clause to W's line.
const leftOverDoor = () => screen.queryByRole('button', { name: copy.stalenessLeftOverCta })
const MOVED = slots.stalenessLeftOverMoved('16,985', '27,537', '16,985')

describe('build 2’s left-over lines through Result (U14, R12)', () => {
  it('`datesavedmoved`: the slot names both figures under its OWN lead — never W’s — and its door opens the W drawer, the left-over seat inside', async () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedmoved)
    render(<StaleHarness />)
    expect(line()?.textContent).toContain(`${copy.stalenessLeftOverNote} ${MOVED}`)
    expect(line()?.textContent).not.toContain(copy.stalenessPayCheckNote)
    expect(lineDoor(), 'no W door').toBeNull()
    fireEvent.click(leftOverDoor()!)
    await waitFor(() => expect(wDrawerOpened()).toBe(true))
    expect(document.querySelector('[data-left-over-seat]'), 'the left-over question sits in the drawer').not.toBeNull()
  })

  it('a READ-ONLY tab states the moved left over with no door', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedmoved)
    render(<StaleHarness readOnly />)
    expect(line()?.textContent).toBe(`${copy.stalenessLeftOverNote} ${MOVED}`)
    expect(leftOverDoor()).toBeNull()
  })

  it('where a rules line hosted it at unlock, the two figures ride the hero’s rules note, and the slot says nothing (one cause, one line)', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedmoved)
    render(<StaleHarness stalenessNote leftOverClauseHost />)
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
      // The survivor part (U11 walk 8's W8-R12 (a)): the line's closing paragraph after its segments, before any door.
      closing: l.querySelector(':scope > p.note-parts__closing')?.textContent ?? null,
      door: l.querySelector(':scope > dl > div.note-parts__door'),
    }
  }
  /** The survivor part's words on the stale line, typed by hand (W8-R12 (a)): the survivor rule counts 75 % of each
   *  figure on these witnesses (no budget, no medical held whole), each charge beside its answer (the out-of-date family
   *  names the answers: the walk-9 form council's call (4)), its close the line's first rider, so glossed (call (5)). */
  const STALE_SURVIVOR = (quote: string, atQuote: string, most: string): string =>
    `In a working year with only one of you alive, that year’s costs count as $63,000 in this answer at your figure of $84,000 a year, and $${atQuote} in the answer at your spending of $${quote} a year. ` +
    `At your spending, that’s at most $${most} a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge, the extra Medicare premium you pay when your income two years before was high.`

  it('`datesavedstale`: W’s one line leads with the either-way sentence in "confirm or change", then "This answer now" — after work it already uses $78,000, the $16,985 dated, none of it added until they confirm or change it, and no amount guessed at; no moved line speaks', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedstale)
    render(<StaleHarness readOnly />)
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
      closing: null,
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
    render(<StaleHarness readOnly />)
    expect(block()).toEqual({
      opening: [
        copy.stalenessPayCheckNote,
        slots.workingCostStaleQuote('84,000', '90,000'),
        slots.workingCostStaleLeftOverInflated('84,000', '6,000', '90,000', true),
        copy.workingCostStaleEitherWayUpdate,
      ].join(' '),
      labels: [copy.workingCostStaleLabelNow, slots.workingCostStaleLabelIf('90,000')],
      bodies: [
        NOW('90,000', [slots.workingCostStaleLeftOverNoneUpdate('16,985', '84,000'), slots.workingCostStaleNoSmallerAmount('90,000')]),
        [
          slots.workingCostStaleLeftOverIfCapped('10,985', 2026, '90,000', false),
          slots.workingCostStaleEachDollar('90,000', '10,985'),
          slots.workingCostStaleLowerAddsMore('90,000', '10,985', '6,000', '16,985'),
        ].join(' '),
      ],
      closing: STALE_SURVIVOR('90,000', '67,500', '4,500'),
      door: null,
    })
    cleanup()
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedrisenshort)
    render(<StaleHarness readOnly />)
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
        [
          // The run's shortfall in the one amount rule (the walk-9 form council's call (1)): $4,015 in 2026 through 2030, then
          // $3,652 in 2031 through 2032, each figure beside its own years.
          slots.workingCostStaleLeftOverIfFirstShortRun(
            2026,
            2032,
            { kind: 'two', groups: [{ figure: '4,015', firstYear: 2026, lastYear: 2030 }, { figure: '3,652', firstYear: 2031, lastYear: 2032 }] },
            '105,000',
            '84,000',
            '16,985',
            true,
          ),
          copy.workingCostStaleLowerCounts,
        ].join(' '),
      ],
      closing: STALE_SURVIVOR('105,000', '78,750', '15,750'),
      door: null,
    })
  })

  // THE DOOR (council `wf_7fa86902-35c`; its form, council `wf_22858e04-f7a` (4)): the last dt/dd — the act's heading,
  // the condition, the W help's own cost items as a list, the "Yes" sentence, then the button as a block — only where
  // the tab can save (a read-only tab, above, is told no buttons to press).
  it('a writable tab: the risen door — its heading, "To update it, press … below." and the condition, the list, "Yes", then "Update your figure for a working year" as a block, which opens the W drawer; the fallen door names its Keep with the room it leaves and keeps "Confirm or change your figure"', async () => {
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
    render(<StaleHarness />)
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
    await waitFor(() => expect(wDrawerOpened()).toBe(true))
    cleanup()
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedstale)
    render(<StaleHarness />)
    expect(doorParts()).toEqual({
      label: slots.workingCostStaleDoorHeadingConfirm('84,000'),
      children: ['P', 'UL', 'P', 'BUTTON'],
      paras: [
        copy.workingCostStaleDoorHold,
        [
          slots.workingCostStaleDoorMore('84,000', '6,000', '78,000'),
          slots.workingCostStaleResultDoorConfirm(copy.stalenessPayCheckCta),
          // W8-R12 (c): the none choice first, then Keep for some costs within the room.
          slots.workingCostStaleDoorYesFirst('78,000'),
          slots.workingCostStaleDoorKeepUpTo('Keep $84,000 a year', '6,000'),
          slots.workingCostStaleDoorNoPlus('78,000', false),
        ].join(' '),
      ],
      items: workingCostExtras(true),
      button: copy.stalenessPayCheckCta,
    })
    expect(updateDoor()).toBeNull()
    expect(lineDoor()).not.toBeNull()
  })

  it('the block’s form on the Result: div.note-parts in the slot’s register (no <p> holding a <dl>), p then dl, each part a div>dt+dd, then the survivor part’s paragraph, then the door last in a dl of its own, no heading and no run-in label inside; read-only keeps the parts and the survivor part and drops the door and its button', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedrisenlater)
    render(<StaleHarness />)
    const l = line()!
    expect(l.tagName).toBe('DIV')
    expect(Array.from(l.classList).sort()).toEqual(['cs-paycheck-note', 'note-parts'])
    // The survivor part (U11 walk 8's W8-R12 (a)) after the segments and before the door: a <p> cannot sit inside a <dl>,
    // so the door takes a dl of its own after it, still a dt/dd and still the block's last part.
    expect(Array.from(l.children).map((c) => `${c.tagName}.${c.className}`)).toEqual([
      'P.note-parts__opening',
      'DL.note-parts__segments',
      'P.note-parts__closing',
      'DL.note-parts__segments',
    ])
    expect(l.children[3]!.children, 'the second dl holds the door alone').toHaveLength(1)
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
    render(<StaleHarness readOnly />)
    expect(block().labels).toEqual(['This answer now', 'If a working year costs $105,000'])
    expect(block().closing, 'read-only keeps the survivor part: a fact, never a door').toBe(STALE_SURVIVOR('105,000', '78,750', '15,750'))
    expect(Array.from(line()!.children).map((c) => c.tagName), 'with no door, nothing follows the survivor part').toEqual(['P', 'DL', 'P'])
    expect(block().door).toBeNull()
    expect(line()!.querySelector('button')).toBeNull()
  })

  it('a note with no parts keeps the slot’s old <p>, byte for byte, its button inline (the reduce-to-plain): W stale with no answer stored, and the moved left over', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datecoststale)
    render(<StaleHarness />)
    expect(line()!.outerHTML).toBe(
      `<p class="cs-paycheck-note"><span>${copy.stalenessPayCheckNote} ${slots.workingCostStaleQuote('84,000', '78,000')}</span> ` +
        `<button type="button" class="${DOOR_ATTR}">${copy.stalenessPayCheckCta}</button></p>`,
    )
    cleanup()
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedmoved)
    render(<StaleHarness />)
    expect(line()!.outerHTML).toBe(
      `<p class="cs-paycheck-note"><span>${copy.stalenessLeftOverNote} ${MOVED}</span> ` +
        `<button type="button" class="${DOOR_ATTR}">${copy.stalenessLeftOverCta}</button></p>`,
    )
  })

  it('an absent, spent or not-sure answer shows no left-over line or clause — fresh or with W stale', () => {
    for (const answer of [undefined, { kind: 'spent' }, { kind: 'not-sure' }] as const) {
      for (const base of [DEV_SEEDS.date, DEV_SEEDS.datecoststale]) {
        plantDateHero()
        appModel.update(() => ({ ...base, workingYearLeftOver: answer }))
        render(<StaleHarness stalenessNote leftOverClauseHost />)
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

// U11 walk 6's R1, rebuilt over the whole working window (the rebuild's KTD6, host 1): a FRESH typed W below today's
// quote — no stale line ever names it (a typed figure is never staled on a quote, KTD10) — takes the standing slot, the
// update act's button with it. One run is the slot's plain <p>, the button inline; two or more are the block (the walk-8
// form council's KD7 and KD8: an ordered list of runs, then the survivor part's paragraph), its button drawn last as a
// block of its own (the block carries no door, so `FuckOffDate`'s parts branch passes the button wherever the tab can
// act). Every sentence typed by hand from the seeds' documented figures (`datesavedtyped`: $84,000 typed under a $90,000
// spending figure, "All of it" stored at $16,985, the quote answer's $10,985 in every year).
describe('U11 walk 6’s R1 — the typed-below line through Result', () => {
  // Every seed here opens the survivor gate (Sam, 60 and retired, can die from 66, in 2032, while Alex works through 2035):
  // the survivor part's two sentences close the paragraph (0.75 of each figure, $63,000 and $67,500, X $4,500). The walk-9
  // form council's order (call (1)): the counts sentence, the lean naming the quote in dollars (call (2)), then the cap
  // sentence with no dollars of the quote and no floor aside. This is T's twin (one run, the cap sentence drawn, the
  // answer at the spending adding the cap's $10,985 in every year: call (2)), so no first beat, and the both-alive scope
  // rides the close's own claim; the gloss rides the line's first rider alone (call (5)).
  const TYPED_LINE =
    'This answer counts a working year at your own figure of $84,000 a year, below your spending of $90,000 a year. ' +
    'A working year almost always costs at least your spending of $90,000 a year, so this answer can look better than it really is. ' +
    'At your spending, your first working year would have $10,985 left over, so the answer at that spending would add at most $10,985 in any working year. ' +
    'This answer adds at most $16,985 a year to your savings. ' +
    'At your spending, that’s $6,000 less in your savings in each working year you’re both alive, except for any difference between the two answers in income tax and Medicare’s income surcharge, the extra Medicare premium you pay when your income two years before was high. ' +
    'In a working year with only one of you alive, that year’s costs count as $63,000 at your figure of $84,000 a year and $67,500 at your spending of $90,000 a year. ' +
    'At your spending, that’s at most $4,500 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.'
  const updateDoor = () => screen.queryByRole('button', { name: 'Update your figure for a working year' })

  it('`datesavedtyped` (one run): the line in the slot’s plain <p>, byte for byte — no lead before it, its own first sentence names the answer and both figures, the survivor part’s sentences last inside it — and the update door inline, which opens the W drawer', async () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedtyped)
    render(<StaleHarness />)
    expect(line()!.outerHTML).toBe(
      `<p class="cs-paycheck-note"><span>${TYPED_LINE}</span> <button type="button" class="${DOOR_ATTR}">Update your figure for a working year</button></p>`,
    )
    expect(document.body.textContent, 'no W lead: W is fresh').not.toContain(copy.stalenessPayCheckNote)
    fireEvent.click(updateDoor()!)
    await waitFor(() => expect(wDrawerOpened()).toBe(true))
  })

  it('a READ-ONLY tab states the line with no door', () => {
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedtyped)
    render(<StaleHarness readOnly />)
    expect(line()!.outerHTML).toBe(`<p class="cs-paycheck-note"><span>${TYPED_LINE}</span></p>`)
    expect(updateDoor()).toBeNull()
  })

  // TM (`datesavedtypedmoved`: $26,985 at $84,000 against the stored $16,985, $105,000 of spending): three runs.
  /** The counts sentence alone (the walk-9 form council's call (2) split the lean out of it). */
  const COUNTS = 'This answer counts a working year at your own figure of $84,000 a year, below your spending of $105,000 a year.'
  // The moved clause in W8-R5 (b)'s words: "all the money left over in a working year", never the referent-less "all of it".
  const MOVED_AT_TYPED =
    'You said all the money left over in a working year goes into your savings, when your first working year had $16,985 left over. At your figure of $84,000 a year, it has $26,985 left over now. So each working year adds at most $16,985 of its left over to your savings, the smaller of the two.'
  /** The lean, its own sentence naming the quote in dollars, after the clause (call (2); call (1a)'s order). */
  const LEAN = 'A working year almost always costs at least your spending of $105,000 a year, so this answer can look better than it really is.'
  /** The cap sentence: year 0 at the $105,000 leaves $5,985, below the stored $16,985; the lean said the quote's dollars,
   *  so it drops them and the floor aside (call (2)). */
  const CAP =
    'At your spending, your first working year would have $5,985 left over, so the answer at that spending would add at most $5,985 in any working year.'
  /** A credit run in a multi-run list (call (1b)): its two beats one paragraph, the quote's dollars and "to your savings"
   *  not restated (the lean and the lead said them), then the close; the line's first rider alone carries the gloss. */
  const credit = (gloss: string): readonly string[] => [
    'The answer at your spending would add at most $5,985 a year. This answer adds at most $16,985 a year.',
    `At your spending, that’s $11,000 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge${gloss}.`,
  ]
  // Every run labelled "…, while you’re still working" (call (3)); the short run's figures each beside their own years
  // (call (1)'s amount rule), and the typed figure's dollars said once, in the counts sentence.
  const TM_RUNS: readonly (readonly [string, readonly string[]])[] = [
    ['2026 through 2028, while you’re still working', credit(', the extra Medicare premium you pay when your income two years before was high')],
    [
      '2029 through 2032, while you’re still working',
      [
        'At your spending, each working year you’re both alive comes up $4,015 short in 2029 through 2030 and $3,652 short in 2031 through 2032, which would be taken from your savings, and the answer at that spending would add nothing.',
        'Your figure leaves those shortfalls out of this answer, which adds at most $16,985 a year.',
        'At your spending, that’s at most $21,000 less in your savings in 2029 through 2030 and $20,637 less in 2031 through 2032, except for any difference between the two answers in income tax and Medicare’s income surcharge.',
      ],
    ],
    ['2033 through 2035, while you’re still working', credit('')],
  ]
  /** The Result's scoped lead, last in the opening above two or more runs under the survivor gate. */
  const LEAD = 'What each answer adds to your savings in each working year you’re both alive:'
  /** TM's survivor part (KD7): the two survivor charges, 0.75 of $84,000 and of $105,000, then X $15,750. */
  const TM_SURVIVOR =
    'In a working year with only one of you alive, that year’s costs count as $63,000 at your figure of $84,000 a year and $78,750 at your spending of $105,000 a year. ' +
    'At your spending, that’s at most $15,750 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.'
  const block = (opening: string, button: boolean): string =>
    '<div class="note-parts cs-paycheck-note">' +
    `<p class="note-parts__opening">${opening}</p>` +
    '<ol role="list" class="note-parts__runs">' +
    TM_RUNS.map(
      ([label, sentences]) =>
        `<li class="note-parts__run"><p class="note-parts__label">${label}</p>${sentences.map((s) => `<p class="note-parts__para">${s}</p>`).join('')}</li>`,
    ).join('') +
    '</ol>' +
    `<p class="note-parts__closing">${TM_SURVIVOR}</p>` +
    (button ? `<button type="button" class="${DOOR_ATTR} note-parts__cta">Update your figure for a working year</button>` : '') +
    '</div>'

  it('TM (three runs, the left over ALSO moved): the typed-below line holds the one slot as a BLOCK — the counts sentence, the moved clause, the lean, the cap sentence and the scoped lead, then the ordered list of three runs, then the survivor part’s paragraph — its update button drawn last; no moved line of its own; where a rules line hosts the clause at unlock, the block opens on the counts sentence, the lean, the cap sentence and the lead alone and the clause rides the rules note', async () => {
    expect(DEV_SEEDS.datesavedtypedmoved.workingYearCost).toMatchObject({ kind: 'entered', amountReal: 84_000 })
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedtypedmoved)
    render(<StaleHarness />)
    expect(document.querySelectorAll('.cs-paycheck-note')).toHaveLength(1)
    expect(line()!.outerHTML).toBe(block(`${COUNTS} ${MOVED_AT_TYPED} ${LEAN} ${CAP} ${LEAD}`, true))
    expect(document.body.textContent, 'no moved line of its own').not.toContain(copy.stalenessLeftOverNote)
    expect(line()!.lastElementChild, 'the button is the block’s last child').toBe(updateDoor())
    fireEvent.click(updateDoor()!)
    await waitFor(() => expect(wDrawerOpened(), 'the button opens the W drawer').toBe(true))
    cleanup()
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedtypedmoved)
    render(<StaleHarness stalenessNote leftOverClauseHost />)
    expect(line()!.outerHTML).toBe(block(`${COUNTS} ${LEAN} ${CAP} ${LEAD}`, true))
    expect(document.querySelector('.cs-staleness-note')?.textContent, 'the moved clause rides the rules note, its figure named there too').toBe(
      `${copy.stalenessHeroNote} ${MOVED_AT_TYPED}`,
    )
    cleanup()
    // A read-only tab draws the block with no button.
    plantDateHero()
    appModel.update(() => DEV_SEEDS.datesavedtypedmoved)
    render(<StaleHarness readOnly />)
    expect(line()!.outerHTML).toBe(block(`${COUNTS} ${MOVED_AT_TYPED} ${LEAN} ${CAP} ${LEAD}`, false))
    expect(updateDoor()).toBeNull()
  })

  // AE1 and the council's reading-order check (R3): the council's C — $105,000 all-sticky budget, "All of it" at $5,985,
  // $90,000 typed — on the Result. The runs' sentences with no year noun of their own take their scope from the lead, so
  // the lead must come BEFORE the runs' list in the DOM a screen reader walks, and the survivor part's paragraph after
  // it, outside it (KD7).
  it('AE1 through the Result: C at 100 % sticky — the scoped lead ends the opening <p>, which precedes the runs’ list; the two `same` runs sit in it, their figure stated in one sentence for both answers (W8-R5 (a); the walk-9 form council’s call (1b)); the short run’s year subject is scoped; the whole-gap survivor part is the paragraph after the list, before the button', () => {
    plantDateHero()
    appModel.update(() => councilBudgetHousehold(1))
    render(<StaleHarness />)
    const block = line()!
    const opening = block.querySelector(':scope > p.note-parts__opening')!
    const runs = block.querySelector(':scope > ol.note-parts__runs')!
    const survivor = block.querySelector(':scope > p.note-parts__closing')!
    expect(opening.textContent!.endsWith(` ${LEAD}`), 'the scoped lead ends the opening').toBe(true)
    const follows = (a: Element, b: Element): boolean => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    expect(follows(opening, runs), 'the lead’s text before the runs’ list').toBe(true)
    expect(follows(runs, survivor), 'the survivor part after the runs’ list').toBe(true)
    expect(follows(survivor, updateDoor()!), 'the button after the survivor part').toBe(true)
    expect(runs.contains(survivor), 'the survivor part is never one more item of the runs’ list').toBe(false)
    expect([...runs.querySelectorAll(':scope > li')].map((li) => [...li.querySelectorAll('p')].map((p) => p.textContent))).toEqual([
      [
        '2026 through 2028, while you’re still working',
        'Both answers add at most $5,985 a year.',
        'At your budget, that’s the same in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge, the extra Medicare premium you pay when your income two years before was high.',
      ],
      [
        '2029 through 2032, while you’re still working',
        'At your budget, each working year you’re both alive comes up $4,015 short in 2029 through 2030 and $3,652 short in 2031 through 2032, which would be taken from your savings, and the answer at that budget would add nothing.',
        'Your figure leaves those shortfalls out of this answer, which adds at most $5,985 a year.',
        'At your budget, that’s at most $10,000 less in your savings in 2029 through 2030 and $9,637 less in 2031 through 2032, except for any difference between the two answers in income tax and Medicare’s income surcharge.',
      ],
      [
        '2033 through 2035, while you’re still working',
        'Both answers add at most $5,985 a year.',
        'At your budget, that’s the same in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.',
      ],
    ])
    expect(survivor.textContent).toBe(
      'In a working year with only one of you alive, that year’s costs still count in full: your figure of $90,000 a year and your budget’s $105,000 a year. ' +
        'At your budget, that’s at most $15,000 a year less in your savings, except for any difference between the two answers in income tax and Medicare’s income surcharge.',
    )
  })

  it('W stale wins the slot over a typed figure stale on its reading (Florida picked after typing): W’s own stale line speaks, never the typed-below line', () => {
    plantDateHero()
    appModel.update(() => ({ ...DEV_SEEDS.datesavedtyped, retirementState: 'FL' }))
    render(<StaleHarness />)
    expect(document.querySelectorAll('.cs-paycheck-note')).toHaveLength(1)
    expect(line()!.textContent).toContain(copy.stalenessPayCheckNote)
    expect(line()!.textContent).not.toContain('answer counts a working year at your own figure')
  })
})

// W9-R7 (KTD5): every hero sentence describes the shown answer, so the hero's whole text, answered at draft A with
// the live draft already moved to B, must equal the hero settled at A — and settled at B it must differ (the
// control: the edit really moves what the hero says, so the equality is not vacuous). One arm guards every hero
// describer at once: the standing slot, the moved left over, the typed-below line, the state, Medicare and extras notes.
// THE W GAP (Act 6 · RC13b): a person moved to "still working" after the walk puts the household on the date route with no
// W, and a W-absent run takes nothing from savings in a working year (pay covering every cost). No figured page may read
// as settled then: the standing slot says so, its door the W drawer, whose Save is the W step's gate.
describe('the W gap: a date answer with no figure for a working year (RC13b)', () => {
  const { workingYearCost: _w, workingYearLeftOver: _l, ...noW } = DEV_SEEDS.date
  const gap: ScenarioDraft = noW

  it('the slot says the working years are figured as if pay covers every cost, its door opens the W drawer', async () => {
    expect(isDateRoute(gap) && gap.workingYearCost === undefined, '[test setup] a working household with no W').toBe(true)
    plantDateHero()
    appModel.update(() => gap)
    render(<StaleHarness />)
    expect(line()?.textContent).toBe(`${copy.stalenessWUnansweredNote} ${copy.stalenessWUnansweredCta}`)
    fireEvent.click(screen.getByRole('button', { name: copy.stalenessWUnansweredCta }))
    await waitFor(() => expect(wDrawerOpened()).toBe(true))
  })

  it('a READ-ONLY tab states it with no door; a W given leaves no such line', () => {
    plantDateHero()
    appModel.update(() => gap)
    render(<StaleHarness readOnly />)
    expect(line()?.textContent).toBe(copy.stalenessWUnansweredNote)
    expect(screen.queryByRole('button', { name: copy.stalenessWUnansweredCta })).toBeNull()
    cleanup()
    appModel.update(() => DEV_SEEDS.date)
    render(<StaleHarness />)
    expect(document.body.textContent).not.toContain(copy.stalenessWUnansweredNote)
  })
})

describe('W9-R7 (KTD5): the hero reads the ANSWERED draft whole', () => {
  // The hero's DESCRIBING text: the actions row can seat inside the hero's lead, and its doors are controls, which
  // rightly follow the live draft (a spouse turned 60 brings the Healthcare door at once), so it is left out.
  const heroText = (): string => {
    // Since RC4: the StaleBanner's text and the note lines the figured pages print from the same notes.
    const hero = document.querySelector('[data-hero-text]')
    if (hero === null) return ''
    const copyOf = hero.cloneNode(true) as Element
    copyOf.querySelectorAll('button').forEach((n) => n.remove())
    return copyOf.textContent ?? ''
  }
  const heroAt = (answeredAt: ScenarioDraft | null): string => {
    plantDateHero(answeredAt)
    const view = render(<StaleHarness readOnly />)
    const text = heroText()
    view.unmount()
    return text
  }
  // U3's one unguarded describer (the register's W9-R7 entry, "Still open here"): the hero Medicare note's PRICED term.
  // Every other case keeps a member working, so both drafts stay on the date route and the term reads true in each: no
  // arm could see the hero read it off the live draft. Here both members retire with no accounts and Social Security
  // only, a spine household whose builder makes no overlay (insight 081's divergence household), so the term turns
  // false, while the door's reach stays false in both drafts (all 65 or older): the term alone moves the note.
  const medicareRetiredEdit = (d: ScenarioDraft): ScenarioDraft => ({
    ...d,
    people: [{ ...d.people[0], workStatus: 'retired', retirementAge: 65, earnedIncomeReal: 0 }, d.people[1]],
    enteredAccounts: [],
  })
  it('the Medicare case’s B is a whole spine household whose builder makes no overlay: the degenerate early return, never a null builder', () => {
    const b = medicareRetiredEdit(DEV_SEEDS.date65)
    expect(isDateRoute(b), 'B is on the spine route').toBe(false)
    expect(missingRequiredFacts(b), 'B asks for nothing, so its builder runs').toEqual([])
    expect(buildSpineParams(b), 'the builder runs').not.toBeNull()
    expect(spineMedicarePriced(b), 'and builds no overlay, so Medicare reads not priced').toBe(false)
    expect(healthcarePriced(b) || healthcarePriced(DEV_SEEDS.date65), 'neither draft reaches the Healthcare door').toBe(false)
  })
  // The fourth member, where given, is a sentence the case exists to guard: said settled at A and not at B, so the
  // equality can see the hero read it off the live draft, and a seed change that stops the edit moving it reds here.
  const cases: ReadonlyArray<readonly [string, ScenarioDraft, (d: ScenarioDraft) => ScenarioDraft, string?]> = [
    [
      'TM (typed below, the left over moved)',
      DEV_SEEDS.datesavedtypedmoved,
      (d) => ({ ...d, workingYearCost: undefined, workingYearLeftOver: undefined }),
    ],
    [
      'the moved left over in the slot',
      DEV_SEEDS.datesavedmoved,
      (d) => ({ ...d, workingYearLeftOver: undefined }),
    ],
    [
      'the all-65+ still-working household in North Carolina (then a spouse under 65 with a quote pair, so the Healthcare door reaches)',
      { ...DEV_SEEDS.date65, retirementState: 'NC' },
      (d) => ({
        ...d,
        retirementState: 'elsewhere',
        medicareExtrasByPerson: undefined,
        people: [d.people[0], { ...d.people[1], currentAge: 60, birthYear: d.startCalendarYear - 60 }],
        health: { ...d.health, slcspMonthlyToday: 1_400, enrolledPremiumMonthlyToday: 1_100 },
      }),
    ],
    [
      'the all-65+ still-working household (then both retired on Social Security alone, no accounts: Medicare priced turns false)',
      DEV_SEEDS.date65,
      medicareRetiredEdit,
      copy.verdictMedicarePriced,
    ],
  ]
  for (const [name, a, edit, moves] of cases) {
    it(`${name}: answered at A with the live draft moved, the hero says exactly what it says settled at A`, () => {
      appModel.update(() => a)
      const atA = heroAt(null)
      const answeredDraft = realGetSnapshot().draft
      appModel.update(edit)
      const answeredAtA = heroAt(answeredDraft)
      const atB = heroAt(null)
      expect(atB, 'the control: settled at B, the hero says something else').not.toBe(atA)
      if (moves !== undefined) {
        expect(atA, 'the guarded sentence is said settled at A').toContain(moves)
        expect(atB, 'and not settled at B').not.toContain(moves)
      }
      expect(answeredAtA).toBe(atA)
    })
  }
})
