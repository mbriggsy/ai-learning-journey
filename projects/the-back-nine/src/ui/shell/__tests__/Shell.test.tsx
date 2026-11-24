// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { TableLanes } from '../Shell'
import { RoutedShell, showPage } from './routedShell'
import { tableRunFor } from '../../workbench/tableRun'
import { pinnedLines } from '../../workbench/pinnedLines'
import { composeYearTable, formatTableDollars } from '../../workbench/yearTableChrome'
import { simulate } from '@engine/simulate'
import { buildCandidateParams, DATE_OFFSET_WINDOW_TOP, DATE_SEARCH_PATHS } from '@engine/dateSearch'
import { buildDateInput } from '@intake/intakeMap'
import { DEV_SEEDS } from '../../devSeeds'
import { copy, slots } from '../../copy'
import type { EngineRunRequest, LaneResult } from '@store/runLanes'
import type { MemoryModelSnapshot, ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import type { DateSearchOutcome, DateTrackOutcome, SimulationResult } from '@shared/model'

/**
 * The shell's Cash Flows page, the room's year-by-year table riding as an interim tab (Act 6 · RC2; workbench plan U7):
 * its three named states (first load, updating, error), the withheld words, the steady/rough switch, and the heading's
 * words, with the lanes faked so each state is held; and the settle hook every harness waits on (`main.result`).
 */

afterEach(cleanup)

const DRAFT = DEV_SEEDS.retired
const BUILD_YEAR = DRAFT.startCalendarYear

const snapshotWith = (answer: ModelAnswer, refiguring = false): MemoryModelSnapshot => ({
  draft: DRAFT,
  answer,
  displayed: null,
  solve: { kind: 'idle' },
  spend: { kind: 'idle' },
  refiguring,
  runningInWorker: false,
})

const finalAnswer = (inputKey = 'k1'): ModelAnswer =>
  ({
    kind: 'headline',
    tier: 'final',
    draft: DRAFT,
    inputKey,
    // `distribution` is read by the room's lever sheets (the health readout, `editorSheets.tsx`), as on every real answer.
    result: { headline: { outcomeState: 'on-track', xOfTen: { value: 8, marginToEdge: 0.1 }, stateMarginToEdge: 0.1 }, distribution: {} },
  }) as unknown as ModelAnswer

/** Lanes that hold each request until the test settles it: with the engine's own run, or a calm error. */
function heldLanes() {
  const waiting: { req: EngineRunRequest; resolve: (r: LaneResult<SimulationResult>) => void }[] = []
  const lane = { request: vi.fn((req: EngineRunRequest) => new Promise<LaneResult<SimulationResult>>((resolve) => waiting.push({ req, resolve }))) }
  const lanes: TableLanes = { steady: lane, rough: lane }
  const settleAll = async (how: 'run' | 'error') => {
    await act(async () => {
      for (const w of waiting.splice(0)) {
        if (how === 'error') {
          w.resolve({ kind: 'error', reason: 'the worker died' })
          continue
        }
        const out = simulate(w.req.params, w.req.seed, w.req.options)
        if (out.indeterminate || out.infeasible) throw new Error('the seed’s table run failed')
        w.resolve({ kind: 'ok', value: { distribution: out.distribution } as unknown as SimulationResult })
      }
    })
  }
  return { lanes, lane, settleAll }
}

const renderRoom = (snapshot: MemoryModelSnapshot, lanes: TableLanes, wallCalendarYear = BUILD_YEAR) =>
  render(<RoutedShell save={{ kind: 'none' }} snapshot={snapshot} lanes={lanes} wallCalendarYear={wallCalendarYear} />)
/** The same shell, re-rendered over a new snapshot (the route held in its host). */
const shellOver = (snapshot: MemoryModelSnapshot, lanes: TableLanes) => (
  <RoutedShell save={{ kind: 'none' }} snapshot={snapshot} lanes={lanes} wallCalendarYear={BUILD_YEAR} />
)

describe('Shell — the table’s three states', () => {
  it('first load: a reserved frame with words; then the table lands with its heading, both views asked at once', async () => {
    const { lanes, lane, settleAll } = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), lanes)
    expect(screen.getByText(copy.workbenchTableLoading)).toBeInTheDocument()
    expect(lane.request).toHaveBeenCalledTimes(2)
    await settleAll('run')
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText(copy.workbenchSteadyWhat)).toBeInTheDocument()
    expect(screen.getByText(copy.workbenchKindsMissing)).toBeInTheDocument()
    expect(screen.getByText(copy.recDiscNiit)).toBeInTheDocument()
    expect(screen.queryByText(copy.workbenchTableLoading)).toBeNull()
    expect(screen.getByRole('rowheader', { name: new RegExp(`^${BUILD_YEAR}`) })).toBeInTheDocument()
  })

  it('the switch shows the rough market’s words and rows with no new run', async () => {
    const { lanes, lane, settleAll } = heldLanes()
    const { container } = renderRoom(snapshotWith(finalAnswer()), lanes)
    await settleAll('run')
    const lastRow = () => [...container.querySelectorAll('tr[data-year]')].at(-1)?.textContent ?? ''
    const steadyRow = lastRow()
    fireEvent.click(screen.getByLabelText(copy.workbenchViewRough))
    expect(screen.getByText(/One future, in a rough market: the market runs as history did from 1966 to 1995/)).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(lane.request).toHaveBeenCalledTimes(2)
    // The rows are the rough run's own, not the steady rows under the rough words (the U7 review's T1): the last
    // year's figures move with the market, and each one the rough run's own row prints is on screen.
    const roughRow = lastRow()
    expect(roughRow).not.toBe(steadyRow)
    const run = tableRunFor(finalAnswer())
    if (run.kind !== 'run' || run.views.rough.kind !== 'run') throw new Error('[test setup] no rough run')
    const ask = run.views.rough.request
    const out = simulate(ask.params, ask.seed, ask.options)
    const rows = out.indeterminate || out.infeasible ? [] : (out.distribution.ledgerRows ?? [])
    const own = composeYearTable({ rows, meta: run.meta, view: 'rough', roughEndYear: 1995 }).rows.at(-1)!
    const printed = own.cells.flat().flatMap((f) => (f === null ? [] : [formatTableDollars(f.value)]))
    expect(printed.length).toBeGreaterThan(0)
    for (const figure of printed) expect(roughRow).toContain(figure)
  })

  it('updating: a newer answer keeps the prior rows on screen, marked in words and busy, until its rows land', async () => {
    const { lanes, settleAll } = heldLanes()
    const view = renderRoom(snapshotWith(finalAnswer('k1')), lanes)
    await settleAll('run')
    view.rerender(
      shellOver(snapshotWith(finalAnswer('k2')), lanes),
    )
    expect(screen.getByText(copy.workbenchTableUpdating, { selector: '.wb-updating' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    await settleAll('run')
    expect(screen.queryByText(copy.workbenchTableUpdating, { selector: '.wb-updating' })).toBeNull()
    expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy')
  })

  it('updating while the answer is re-figured: the rows stay, marked', async () => {
    const { lanes, settleAll } = heldLanes()
    const view = renderRoom(snapshotWith(finalAnswer()), lanes)
    await settleAll('run')
    view.rerender(
      shellOver(snapshotWith(finalAnswer(), true), lanes),
    )
    expect(screen.getByText(copy.workbenchTableUpdating, { selector: '.wb-updating' })).toBeInTheDocument()
    // The pinned box's label line says the answer is being worked out again.
    expect(screen.getByText(copy.workbenchPinnedRefiguring, { selector: '.wb-pin__status' })).toBeInTheDocument()
  })

  it('error: one calm sentence, no rows, no retry; the wordmark is the way back', async () => {
    const { lanes, settleAll } = heldLanes()
    const onHome = vi.fn()
    render(<RoutedShell save={{ kind: 'none' }} onHome={onHome} snapshot={snapshotWith(finalAnswer())} lanes={lanes} wallCalendarYear={BUILD_YEAR} />)
    await settleAll('error')
    expect(screen.getByRole('alert')).toHaveTextContent(copy.workbenchTableError)
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('button', { name: copy.exportRetry })).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: copy.shellHomeLabel }))
    expect(onHome).toHaveBeenCalled()
  })
})

describe('Shell — the answer the table waits on', () => {
  it('a provisional answer asks no run; the table waits in its first-load frame', () => {
    const { lanes, lane } = heldLanes()
    renderRoom(snapshotWith({ ...(finalAnswer() as object), tier: 'provisional' } as ModelAnswer), lanes)
    expect(lane.request).not.toHaveBeenCalled()
    expect(screen.getByText(copy.workbenchTableLoading)).toBeInTheDocument()
  })

  it('an answer missing facts holds the table back and says why', () => {
    const { lanes } = heldLanes()
    renderRoom(snapshotWith({ kind: 'inputs-incomplete' }), lanes)
    expect(screen.getByText(copy.workbenchWithheldNoRun)).toBeInTheDocument()
  })

  it('a plan opened a year after it was built names row one’s year (R10, AE2)', async () => {
    const { lanes, settleAll } = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), lanes, BUILD_YEAR + 1)
    await settleAll('run')
    expect(screen.getByText(slots.workbenchAged(BUILD_YEAR))).toBeInTheDocument()
  })

  it('where the run prices no state income tax the heading says so, in the hero’s words; a priced state drops the line (W6)', async () => {
    const unpriced = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), unpriced.lanes)
    await unpriced.settleAll('run')
    expect(screen.getByText(copy.verdictStateUnpricedNote)).toBeInTheDocument()
    cleanup()
    const priced = heldLanes()
    const nc = DEV_SEEDS.nc
    renderRoom(
      { ...snapshotWith(finalAnswer()), draft: nc, answer: { ...(finalAnswer() as object), draft: nc } as ModelAnswer },
      priced.lanes,
    )
    await priced.settleAll('run')
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.queryByText(copy.verdictStateUnpricedNote)).toBeNull()
  })
})

// --- the date route: the heading's stop words and the run the table is built on ---

const WORKING = DEV_SEEDS.date
const noDate: DateTrackOutcome = { kind: 'no-date-in-window', nonMonotoneOffsets: [], curve: [] }
const dateAnswer = (
  draft: ScenarioDraft,
  band: { readonly offsetYears: number; readonly track: 'lifestyle' | 'floor' } | undefined,
  tier: 'final' | 'provisional' = 'final',
  inputKey = 'k1',
): ModelAnswer =>
  ({
    kind: 'date',
    tier,
    draft,
    inputKey,
    outcome: {
      kind: 'dates',
      tier,
      floor: noDate,
      lifestyle: noDate,
      windowTopYears: DATE_OFFSET_WINDOW_TOP,
      seed: 1,
      ...(band !== undefined ? { band } : {}),
    } as unknown as DateSearchOutcome,
  }) as unknown as ModelAnswer
const dateSnapshot = (draft: ScenarioDraft, answer: ModelAnswer, refiguring = false): MemoryModelSnapshot => ({
  ...snapshotWith(answer, refiguring),
  draft,
})

describe('Shell — the date route', () => {
  it('a working household whose search crowned no date: the window top’s year, and the heading says no date was found (T4)', async () => {
    const { lanes, lane, settleAll } = heldLanes()
    renderRoom(dateSnapshot(WORKING, dateAnswer(WORKING, undefined)), lanes)
    expect(lane.request.mock.calls[0]![0].params).toEqual({
      ...buildCandidateParams(buildDateInput(WORKING)!, DATE_OFFSET_WINDOW_TOP, DATE_SEARCH_PATHS.final),
      paths: 1,
    })
    await settleAll('run')
    const topYear = WORKING.startCalendarYear + DATE_OFFSET_WINDOW_TOP
    expect(screen.getByText(slots.workbenchNoDate(topYear))).toBeInTheDocument()
    expect(screen.queryByText(slots.workbenchStopsIn(topYear))).toBeNull()
  })

  it('its dated twin names the band’s year as the answer’s date, and never says no date was found (T4)', async () => {
    const { lanes, settleAll } = heldLanes()
    renderRoom(dateSnapshot(WORKING, dateAnswer(WORKING, { offsetYears: 4, track: 'lifestyle' })), lanes)
    await settleAll('run')
    const year = WORKING.startCalendarYear + 4
    expect(screen.getByText(slots.workbenchStopsIn(year))).toBeInTheDocument()
    expect(screen.queryByText(slots.workbenchNoDate(year))).toBeNull()
    expect(screen.queryByText(slots.workbenchFloorTrack())).toBeNull()
  })

  it('a floor-only date: both views record the essentials pass and the heading says so (T3)', async () => {
    const draft = DEV_SEEDS.datemixed
    const { lanes, lane, settleAll } = heldLanes()
    renderRoom(dateSnapshot(draft, dateAnswer(draft, { offsetYears: 7, track: 'floor' })), lanes)
    expect(lane.request.mock.calls.map(([req]) => req.options?.ledgerTrack)).toEqual(['floor', 'floor'])
    await settleAll('run')
    expect(screen.getByText(slots.workbenchFloorTrack())).toBeInTheDocument()
  })

  it('an edit during a pending date search never shows new facts at the old date’s offset (T5)', async () => {
    // The store keeps the last committed answer (on draft A, its band at offset 4) while the edit (draft B) is
    // re-figured: the table is built from the answer's own draft, never the live one.
    const edited: ScenarioDraft = { ...WORKING, annualSpendingReal: WORKING.annualSpendingReal! + 12_000 }
    const committed = dateAnswer(WORKING, { offsetYears: 4, track: 'lifestyle' })
    const { lanes, lane, settleAll } = heldLanes()
    const view = renderRoom(dateSnapshot(edited, committed, true), lanes)
    const atOffset = (d: ScenarioDraft) => ({ ...buildCandidateParams(buildDateInput(d)!, 4, DATE_SEARCH_PATHS.final), paths: 1 })
    expect(atOffset(edited), '[test setup] the edit moves the run').not.toEqual(atOffset(WORKING))
    for (const [req] of lane.request.mock.calls) expect(req.params).toEqual(atOffset(WORKING))
    await settleAll('run')
    // The edit's provisional answer lands: no run is asked for it, and the rows on screen stay, marked as updating.
    view.rerender(
      shellOver(dateSnapshot(edited, dateAnswer(edited, { offsetYears: 5, track: 'lifestyle' }, 'provisional', 'k2')), lanes),
    )
    expect(lane.request).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText(copy.workbenchTableUpdating, { selector: '.wb-updating' })).toBeInTheDocument()
  })
})

describe('Shell — the facts page’s stop year through a provisional answer (U8 review: C1, A6, F7)', () => {
  it('holds the last delivered stop year while a newer answer is worked out, marked in words in its reserved note cell', async () => {
    const { lanes, settleAll } = heldLanes()
    const year = WORKING.startCalendarYear + 4
    const view = renderRoom(dateSnapshot(WORKING, dateAnswer(WORKING, { offsetYears: 4, track: 'lifestyle' })), lanes)
    await settleAll('run')
    showPage('facts')
    const stopLine = () => screen.getByText(copy.workbenchFactStop).closest('.wb-facts__line')!
    const shownNote = () => stopLine().querySelector('.wb-facts__note:not(.wb-facts__note--reserve)')?.textContent
    expect(stopLine()).toHaveTextContent(slots.workbenchFactStopYear(year))
    expect(shownNote()).toBe(copy.workbenchFactStopNote)
    // An edit's provisional answer: no table run is asked for it, and the line keeps its year, marked.
    view.rerender(
      shellOver(dateSnapshot(WORKING, dateAnswer(WORKING, { offsetYears: 5, track: 'lifestyle' }, 'provisional', 'k2')), lanes),
    )
    expect(stopLine()).toHaveTextContent(slots.workbenchFactStopYear(year))
    expect(shownNote()).toBe(copy.workbenchPinnedRefiguring)
    // Both notes are drawn in the cell (one hidden), so the mark changes no height.
    expect(stopLine().querySelectorAll('.wb-facts__note--reserve')).toHaveLength(2)
  })
})

describe('Shell — the shell’s one live region speaks the new answer (U8 review: C12)', () => {
  it('when the pinned answer’s words change and nothing is being worked out again, the region says them', () => {
    const { lanes } = heldLanes()
    const view = renderRoom(snapshotWith(finalAnswer('k1')), lanes)
    const region = view.container.querySelector('main > [role="status"][aria-live="polite"]')!
    expect(region.textContent, 'the first answer is the shell’s own arrival, not news').toBe('')
    const borderline = {
      ...(finalAnswer('k2') as object),
      result: { headline: { outcomeState: 'borderline', xOfTen: { value: 5, marginToEdge: 0.1 }, stateMarginToEdge: 0.1 }, distribution: {} },
    } as unknown as ModelAnswer
    view.rerender(
      shellOver(snapshotWith(borderline), lanes),
    )
    expect(region.textContent).toBe(pinnedLines(snapshotWith(borderline), BUILD_YEAR).lead)
    expect(region.textContent).toMatch(new RegExp(`^${copy.outcomeBorderline}:`))
  })
})

describe('Shell — the settle hook every harness waits on (plan 3.1)', () => {
  it('one `main.result` on every page, mirroring the store’s tier and refiguring flag through a provisional, a final and an edit’s re-figuring', () => {
    const { lanes } = heldLanes()
    const mains = () => document.querySelectorAll('main.result')
    const view = renderRoom(snapshotWith({ kind: 'pending' }), lanes)
    expect(mains()).toHaveLength(1)
    expect(mains()[0], 'nothing has committed: no tier').not.toHaveAttribute('data-answer-tier')
    view.rerender(shellOver(snapshotWith({ ...(finalAnswer() as object), tier: 'provisional' } as ModelAnswer), lanes))
    expect(mains()[0]).toHaveAttribute('data-answer-tier', 'provisional')
    expect(mains()[0]).not.toHaveAttribute('data-answer-refiguring')
    view.rerender(shellOver(snapshotWith(finalAnswer()), lanes))
    expect(mains()[0]).toHaveAttribute('data-answer-tier', 'final')
    expect(mains()[0]).not.toHaveAttribute('data-answer-refiguring')
    view.rerender(shellOver(snapshotWith(finalAnswer(), true), lanes))
    expect(mains()[0]).toHaveAttribute('data-answer-tier', 'final')
    expect(mains()[0]).toHaveAttribute('data-answer-refiguring')
    for (const page of ['whatif', 'facts', 'table'] as const) {
      showPage(page)
      expect(mains(), `${page}: exactly one main.result`).toHaveLength(1)
      expect(mains()[0]).toHaveAttribute('data-answer-refiguring')
    }
    // No interim page carries the in-frame caveat, so App's trailing disclaimer stays the one mount (app.css's swap).
    expect(mains()[0]).not.toHaveAttribute('data-inframe-disclaimer')
    // The legacy answer frame's layout class is the old page's alone.
    expect(mains()[0]).not.toHaveClass('result-page')
  })

  it('every interim page wears the banner, outside any `.rc-root`, and its page sits outside one too', () => {
    const { lanes } = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), lanes)
    for (const page of ['table', 'whatif', 'facts'] as const) {
      showPage(page)
      expect(screen.getAllByText(copy.shellInterimBanner)).toHaveLength(1)
      const interim = document.querySelector('.shell-interim')!
      expect(interim.closest('.rc-root'), `${page}: the interim container sits outside the scoped preflight`).toBeNull()
    }
  })
})

describe('Shell — the phone menu (plan 3.1, "The phone shape")', () => {
  it('opens every module and its pages, closes on a choice and moves the page', async () => {
    const { lanes } = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), lanes)
    const button = screen.getByRole('button', { name: copy.shellMenuOpen })
    fireEvent.click(button)
    const sheet = await screen.findByRole('dialog', { name: copy.shellMenuTitle })
    const links = within(sheet).getAllByRole('link').map((a) => a.textContent)
    expect(links).toEqual([copy.shellPageSnapshot, copy.shellPageAnalysis, copy.shellPageCashFlows, copy.workbenchPageFacts])
    expect(within(sheet).getByRole('heading', { name: copy.shellModuleDashboard })).toBeInTheDocument()
    expect(within(sheet).getByRole('heading', { name: copy.shellModuleRetirement })).toBeInTheDocument()
    expect(within(sheet).getByRole('heading', { name: copy.shellModuleProfile })).toBeInTheDocument()
    expect(within(sheet).getByRole('link', { name: copy.shellPageCashFlows })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(within(sheet).getByRole('link', { name: copy.workbenchPageFacts }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: copy.shellMenuTitle })).toBeNull())
    expect(document.querySelector('main.result')).toHaveAttribute('data-shell-screen', 'interim-facts')
    // Focus back on the button is read in a real browser (`e2e/rc-screens.spec.ts`'s phone arm): Base UI hands it back
    // after the sheet's exit, whose timing jsdom (no layout, no animations) does not keep, so a read here flakes
    // (insight 071: a real browser's teardown order is the authority).
  })
})
