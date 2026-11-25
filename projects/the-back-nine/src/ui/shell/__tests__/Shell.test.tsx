// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { TableLanes } from '../Shell'
import { RoutedShell, showPage } from './routedShell'
import { tableRunFor } from '../../workbench/tableRun'
import { pinnedLines } from '../../workbench/pinnedLines'
import { formatTableDollars, tableDollars } from '../../workbench/yearTableChrome'
import userEvent from '@testing-library/user-event'
import { simulate } from '@engine/simulate'
import { buildCandidateParams, DATE_OFFSET_WINDOW_TOP, DATE_SEARCH_PATHS } from '@engine/dateSearch'
import { buildDateInput } from '@intake/intakeMap'
import { DEV_SEEDS } from '../../devSeeds'
import { copy, slots } from '../../copy'
import type { EngineRunRequest, LaneResult } from '@store/runLanes'
import type { MemoryModelSnapshot, ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import type { DateSearchOutcome, DateTrackOutcome, SimulationResult } from '@shared/model'

/**
 * The shell's Retirement → Cash Flows page (Act 6 · RC6, over the workbench plan U7's runs): its three named states
 * (first load, updating, error), the withheld words, the steady/rough select, and the words around the table, with the lanes faked so each state is held; and the settle hook every harness waits on (`main.result`).
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

  it('the future select shows the rough market’s words and rows with no new run', async () => {
    const user = userEvent.setup()
    const { lanes, lane, settleAll } = heldLanes()
    const { container } = renderRoom(snapshotWith(finalAnswer()), lanes)
    await settleAll('run')
    const lastRow = () => [...container.querySelectorAll('table tbody tr')].at(-1)?.textContent ?? ''
    const steadyRow = lastRow()
    await user.click(screen.getByRole('combobox', { name: copy.workbenchViewLegend }))
    await user.click(await screen.findByRole('option', { name: copy.workbenchViewRough }))
    expect(screen.getByText(/One future, in a rough market: the market runs as history did from 1966 to 1995/)).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(lane.request).toHaveBeenCalledTimes(2)
    // The rows are the rough run's own, not the steady rows under the rough words (the U7 review's T1): the last
    // year's figures move with the market, and each one-field figure the Summary shows from the rough run's own last row
    // is on screen.
    const roughRow = lastRow()
    expect(roughRow).not.toBe(steadyRow)
    const run = tableRunFor(finalAnswer())
    if (run.kind !== 'run' || run.views.rough.kind !== 'run') throw new Error('[test setup] no rough run')
    const ask = run.views.rough.request
    const out = simulate(ask.params, ask.seed, ask.options)
    const own = (out.indeterminate || out.infeasible ? [] : (out.distribution.ledgerRows ?? [])).at(-1)!
    const printed = [own.spending ?? 0, own.taxPaid, own.socialSecurity, own.draw.taxable, own.draw.pretax, own.draw.roth]
      .filter((v) => tableDollars(v) !== 0)
      .map(formatTableDollars)
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
    expect(screen.getByText(copy.workbenchTableUpdating, { selector: '[data-cash-flows-updating]' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    await settleAll('run')
    expect(screen.queryByText(copy.workbenchTableUpdating, { selector: '[data-cash-flows-updating]' })).toBeNull()
    expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy')
  })

  it('updating while the answer is re-figured: the rows stay, marked', async () => {
    const { lanes, settleAll } = heldLanes()
    const view = renderRoom(snapshotWith(finalAnswer()), lanes)
    await settleAll('run')
    view.rerender(
      shellOver(snapshotWith(finalAnswer(), true), lanes),
    )
    expect(screen.getByText(copy.workbenchTableUpdating, { selector: '[data-cash-flows-updating]' })).toBeInTheDocument()
    // The pinned box's label line says the answer is being worked out again.
    expect(screen.getByText(copy.workbenchPinnedRefiguring, { selector: '[data-pinned-status]' })).toBeInTheDocument()
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

  it('a failed answer: the intro says the math hit a snag and the table never claims the answer is untouched; the retry is named where it lives', () => {
    const { lanes, lane } = heldLanes()
    renderRoom(snapshotWith({ kind: 'compute-error' } as unknown as ModelAnswer), lanes)
    expect(lane.request).not.toHaveBeenCalled()
    // The intro's lead (its hidden reserve copy draws it again, so the shown one is read off the intro's first cell).
    expect(document.querySelector('[data-cash-flows-intro] > div:first-child')).toHaveTextContent(copy.answerError)
    expect(screen.getByText(copy.workbenchTableAnswerError)).toBeInTheDocument()
    expect(screen.queryByText(copy.workbenchTableError)).toBeNull()
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
    expect(screen.getByText(copy.workbenchTableUpdating, { selector: '[data-cash-flows-updating]' })).toBeInTheDocument()
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
    for (const page of ['probability', 'table', 'facts'] as const) {
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
    for (const page of ['facts'] as const) {
      showPage(page)
      expect(screen.getAllByText(copy.shellInterimBanner)).toHaveLength(1)
      const interim = document.querySelector('.shell-interim')!
      expect(interim.closest('.rc-root'), `${page}: the interim container sits outside the scoped preflight`).toBeNull()
    }
  })
})

describe('Shell — RC6: Retirement → Cash Flows', () => {
  it('a figured page: no interim banner, one in-frame R13 caveat (the trailing mount hidden), Summary and Accounts tabs', async () => {
    const { lanes, settleAll } = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), lanes)
    await settleAll('run')
    const main = document.querySelector('main.result')!
    expect(main).toHaveAttribute('data-shell-screen', 'cash-flows')
    expect(main).toHaveAttribute('data-inframe-disclaimer')
    expect(main.querySelectorAll('[data-caveat]')).toHaveLength(1)
    expect(screen.queryByText(copy.shellInterimBanner)).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: copy.shellPageCashFlows })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: copy.cashFlowsTabSummary })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: copy.cashFlowsTabAccounts })).toBeInTheDocument()
    // Income tax is a plain header, never a drill.
    expect(screen.queryByRole('button', { name: copy.workbenchColIncomeTax })).toBeNull()
    expect(screen.getByRole('columnheader', { name: copy.workbenchColIncomeTax })).toBeInTheDocument()
  })

  it('a drill and its breadcrumb round-trip: the underlined header opens its columns under "Summary / Expenses", and Summary goes back', async () => {
    const { lanes, settleAll } = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), lanes)
    await settleAll('run')
    const title = () => document.querySelector('[data-cash-flows-title]')!
    expect(title().textContent).toBe(copy.cashFlowsTabSummary)
    const before = screen.getAllByRole('columnheader').map((h) => h.textContent)
    fireEvent.click(screen.getByRole('button', { name: copy.cashFlowsGroupExpenses }))
    expect(title().textContent).toBe(`${copy.cashFlowsTabSummary}/${copy.cashFlowsGroupExpenses}`)
    expect(title()).toHaveFocus()
    expect(screen.getByRole('columnheader', { name: copy.workbenchLineMedicare })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: copy.workbenchColIncomeTax })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: copy.cashFlowsTabSummary }))
    expect(title().textContent).toBe(copy.cashFlowsTabSummary)
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(before)
  })

  it('the StaleBanner rides Cash Flows too, aged line included, beside the table’s row-one line, which names the build year and claims nothing about the balances (round 3 of the milestone-1 review)', async () => {
    for (const saved of [BUILD_YEAR, BUILD_YEAR + 1]) {
      const { lanes, settleAll } = heldLanes()
      render(
        <RoutedShell save={{ kind: 'none' }} snapshot={snapshotWith(finalAnswer())} lanes={lanes} wallCalendarYear={BUILD_YEAR + 2} stalenessNote agedBalancesYear={saved} />,
      )
      expect(screen.getByText(slots.staleAgedBalances(saved)), `saved ${saved}: no table yet, the banner says it`).toBeInTheDocument()
      await settleAll('run')
      expect(document.querySelector('main.result')).toHaveAttribute('data-shell-screen', 'cash-flows')
      expect(screen.getByText(copy.stalenessHeroNote)).toBeInTheDocument()
      expect(screen.getByText(slots.workbenchAged(BUILD_YEAR))).toBeInTheDocument()
      expect(screen.getByText(slots.staleAgedBalances(saved)), `saved ${saved}: the banner keeps the balances’ own year`).toBeInTheDocument()
      expect(slots.workbenchAged(BUILD_YEAR), 'row one claims no balance date (a re-saver entered them later)').not.toMatch(/balance/i)
      cleanup()
    }
  })

  it('Download is off with no rows to save, yet keeps its place in the keyboard order (focus never drops to the page when the table goes busy)', async () => {
    const { lanes, settleAll } = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), lanes)
    const download = () => screen.getByRole('button', { name: copy.cashFlowsDownloadLabel })
    expect(download()).toHaveAttribute('aria-disabled', 'true')
    expect(download(), 'focusable while off').not.toHaveAttribute('disabled')
    await settleAll('run')
    expect(download()).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('the download hands the browser a CSV of the shown cells, built in the page (no request)', async () => {
    const { lanes, settleAll } = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), lanes)
    await settleAll('run')
    const blobs: Blob[] = []
    const create = vi.fn((b: Blob) => {
      blobs.push(b)
      return 'blob:cash-flows'
    })
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(screen.getByRole('button', { name: copy.cashFlowsDownloadLabel }))
    expect(click).toHaveBeenCalledTimes(1)
    const text = await blobs[0]!.text()
    const firstRow = [...document.querySelectorAll('table tbody tr')][0]!
    const cells = [...firstRow.querySelectorAll('th, td')].map((c) => c.textContent ?? '')
    // `Blob.text()` decodes with the mark stripped, so the mark is read off the bytes.
    expect([...new Uint8Array(await blobs[0]!.arrayBuffer()).slice(0, 3)], 'a byte-order mark first').toEqual([0xef, 0xbb, 0xbf])
    const csvRow = text.split('\r\n').find((l) => l.startsWith(cells[0]!))!
    // Split on the commas outside quotes (a figure's grouping commas sit inside them).
    const fields: string[] = ['']
    let quoted = false
    for (const ch of csvRow) {
      if (ch === '"') quoted = !quoted
      else if (ch === ',' && !quoted) fields.push('')
      else fields[fields.length - 1] += ch
    }
    expect(fields).toEqual(cells)
    click.mockRestore()
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
    expect(links).toEqual([
      copy.shellPageSnapshot,
      copy.shellPageAssetAllocation,
      copy.shellPageTaxAllocation,
      copy.shellPageAnalysis,
      copy.shellPageStressTest,
      copy.shellPageSocialSecurity,
      copy.shellPageHealthCare,
      copy.shellPageCashFlows,
      copy.shellPageTaxStrategies,
      copy.shellPageNetWorth,
      copy.shellPageIncome,
      copy.shellPageSavings,
      copy.shellPageFamily,
      copy.workbenchPageFacts,
    ])
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

describe('Shell — RC4: the home’s new pages and the gear', () => {
  it('Retirement → Analysis → Probability: the page, its folder tabs, and its R13 caveat in frame (the trailing mount hidden)', () => {
    const { lanes } = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), lanes)
    showPage('probability')
    const main = document.querySelector('main.result')!
    expect(main).toHaveAttribute('data-shell-screen', 'probability')
    expect(main).toHaveAttribute('data-inframe-disclaimer')
    expect(screen.getByRole('heading', { level: 1, name: copy.analysisTitle })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: copy.probabilityTab })).toHaveAttribute('aria-selected', 'true')
    expect(main.querySelectorAll('[data-caveat]')).toHaveLength(1)
    // The two halves: the alternative on the left, the plan on the right, each named.
    expect(main.querySelector('[data-half="alternative"]')).not.toBeNull()
    expect(main.querySelector('[data-half="compared"]')).not.toBeNull()
  })
  it('RC7: the Confidence tab is a route of the same page: its title over the fan, one R13 caveat, and no ACTION ITEMS handle', () => {
    const { lanes } = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), lanes)
    showPage('probability')
    fireEvent.click(screen.getByRole('tab', { name: copy.confidenceTab }))
    const main = document.querySelector('main.result')!
    expect(main).toHaveAttribute('data-shell-screen', 'confidence')
    expect(main).toHaveAttribute('data-inframe-disclaimer')
    expect(screen.getByRole('heading', { level: 1, name: copy.analysisTitle })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: copy.confidenceTab })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 2, name: copy.confidenceChartTitle })).toBeInTheDocument()
    expect(main.querySelectorAll('[data-caveat]')).toHaveLength(1)
    // The caveat closes the key-metric column, after the charts.
    expect(main.querySelector('[data-metrics] [data-caveat]')).not.toBeNull()
    expect(screen.queryByRole('button', { name: copy.trayHandle })).toBeNull()
    // And back: Probability's tab returns the halves.
    fireEvent.click(screen.getByRole('tab', { name: copy.probabilityTab }))
    expect(main).toHaveAttribute('data-shell-screen', 'probability')
    expect(main.querySelector('[data-half="compared"]')).not.toBeNull()
  })

  it('Retirement → Health Care (RC10): its own page with the in-frame caveat and no interim banner; one folder tab, Cost Analysis', () => {
    const { lanes } = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), lanes)
    showPage('health')
    const main = document.querySelector('main.result')!
    expect(main).toHaveAttribute('data-shell-screen', 'health-care')
    expect(main).toHaveAttribute('data-inframe-disclaimer')
    expect(document.querySelectorAll('main')).toHaveLength(1)
    expect(screen.queryByText(copy.shellInterimBanner)).toBeNull()
    expect(main.querySelectorAll('[data-caveat]')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: copy.shellPageHealthCare })).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([copy.healthTabCost])
  })

  it('Investment (RC12): Asset Allocation with its two folder tabs, the cash line and the in-frame caveat; Tax Allocation lists a picked part’s accounts', () => {
    const { lanes } = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), lanes)
    const modules = screen.getAllByRole('navigation', { name: copy.shellModulesLabel })[0]!
    fireEvent.click(within(modules).getByRole('link', { name: copy.shellModuleInvestment }))
    const main = document.querySelector('main.result')!
    expect(main).toHaveAttribute('data-shell-screen', 'asset-allocation')
    expect(main).toHaveAttribute('data-inframe-disclaimer')
    expect(main.querySelectorAll('[data-caveat]')).toHaveLength(1)
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([copy.assetTabSummary, copy.assetTabDetail])
    expect(main.querySelectorAll('[data-asset-row]')).toHaveLength(3)
    expect(screen.getByText(copy.assetCashLine)).toBeInTheDocument()
    // No what-if open: the words and the door, never a second donut.
    expect(screen.getByText(copy.assetNoWhatIfOpen)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.assetTryMix })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: copy.assetTabDetail }))
    expect(main.querySelectorAll('[data-asset-detail-row]')).toHaveLength(3)
    expect(screen.getByText(copy.assetCashLine)).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('navigation', { name: copy.shellPagesLabel })).getByRole('link', { name: copy.shellPageTaxAllocation }))
    expect(main).toHaveAttribute('data-shell-screen', 'tax-allocation')
    expect(main.querySelectorAll('[data-caveat]')).toHaveLength(1)
    const part = main.querySelector<HTMLButtonElement>('[data-taxalloc-part="pretax"]')!
    expect(part).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(part)
    expect(part).toHaveAttribute('aria-pressed', 'true')
    expect(main.querySelectorAll('[data-taxalloc-account]')).toHaveLength(1)
  })

  it('Tax → Tax Strategies (RC8): its own page with the in-frame caveat and no interim banner; four folder tabs on the retired route, the empty state with Find', () => {
    const { lanes } = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), lanes)
    showPage('strategies')
    const main = document.querySelector('main.result')!
    expect(main).toHaveAttribute('data-shell-screen', 'tax-strategies')
    expect(main).toHaveAttribute('data-inframe-disclaimer')
    expect(document.querySelectorAll('main')).toHaveLength(1)
    expect(screen.queryByText(copy.shellInterimBanner)).toBeNull()
    expect(main.querySelectorAll('[data-caveat]')).toHaveLength(1)
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([copy.taxStratTabStrategies, copy.taxStratTabSummary, copy.taxStratTabComparison, copy.taxStratTabDetails])
    expect(screen.getByRole('button', { name: copy.taxStratFind })).toBeInTheDocument()
    expect(document.querySelector('main.result .result-page')).toBeNull()
  })

  it('the gear opens the assumptions panel (the old answer page’s Assumptions door), on every page', async () => {
    const { lanes } = heldLanes()
    renderRoom(snapshotWith(finalAnswer()), lanes)
    fireEvent.click(screen.getByRole('button', { name: copy.shellGearLabel }))
    expect(await screen.findByRole('heading', { name: copy.assumptionTitle })).toBeInTheDocument()
  })
})

describe('Shell — the pages with no table speak their own words (milestone 2’s fix round)', () => {
  const SS = { module: 'retirement', page: 'social-security' } as const
  const STRESS = { module: 'retirement', page: 'stress-test' } as const
  const pageWords = (screenId: string) => document.querySelector(screenId === 'social-security' ? '[data-claims-page="words"]' : '[data-stress-page="words"]')

  it('a plan missing a fact: Social Security and Stress Test name what is missing (the pinned answer words), never the table’s words', () => {
    const draft = { ...DRAFT, people: [{ ...DRAFT.people[0]!, currentAge: undefined }, DRAFT.people[1]!] } as unknown as ScenarioDraft
    const snap: MemoryModelSnapshot = { ...snapshotWith({ kind: 'inputs-incomplete' }), draft }
    const pinned = pinnedLines(snap, BUILD_YEAR)
    expect(pinned.second, 'the fixture names a missing fact').toBeDefined()
    for (const [route, id] of [
      [SS, 'social-security'],
      [STRESS, 'stress-test'],
    ] as const) {
      const { lanes } = heldLanes()
      render(<RoutedShell save={{ kind: 'none' }} snapshot={snap} lanes={lanes} wallCalendarYear={BUILD_YEAR} initialRoute={route} />)
      expect(pageWords(id)).toHaveTextContent(`${pinned.lead} ${pinned.second!}`)
      expect(pageWords(id)?.textContent ?? '').not.toMatch(/table/i)
      cleanup()
    }
  })

  it('a failed answer: the page points to Analysis’s Try again with no table named; nothing being worked out never says the page fills in', () => {
    const { lanes } = heldLanes()
    render(<RoutedShell save={{ kind: 'none' }} snapshot={snapshotWith({ kind: 'compute-error' } as unknown as ModelAnswer)} lanes={lanes} wallCalendarYear={BUILD_YEAR} initialRoute={STRESS} />)
    expect(pageWords('stress-test')).toHaveTextContent(copy.pageWordsAnswerError)
    expect(copy.pageWordsAnswerError).not.toMatch(/table/i)
    cleanup()
    render(<RoutedShell save={{ kind: 'none' }} snapshot={snapshotWith({ kind: 'idle' })} lanes={heldLanes().lanes} wallCalendarYear={BUILD_YEAR} initialRoute={SS} />)
    expect(pageWords('social-security')?.textContent).not.toBe(copy.claimsWaiting)
  })

  it('Health Care on a committed date answer whose run is withheld (an input failure): the pinned words, never Cash Flows’ table words', () => {
    const answer = { ...(dateAnswer(WORKING, undefined) as object), outcome: { kind: 'input-failure' } } as unknown as ModelAnswer
    const snap = dateSnapshot(WORKING, answer)
    expect(tableRunFor(answer), '[test setup] the run is withheld').toMatchObject({ kind: 'withheld' })
    const pinned = pinnedLines(snap, BUILD_YEAR)
    render(<RoutedShell save={{ kind: 'none' }} snapshot={snap} lanes={heldLanes().lanes} wallCalendarYear={BUILD_YEAR} initialRoute={{ module: 'retirement', page: 'health-care' }} />)
    const words = document.querySelector('[data-health-page="words"]')
    expect(words).toHaveTextContent(pinned.second !== undefined ? `${pinned.lead} ${pinned.second}` : pinned.lead)
    expect(words?.textContent ?? '').not.toMatch(/table/i)
  })

  it('Health Care on an indeterminate answer: the ring’s "not enough to read yet", never "your plan prices no health premiums"', () => {
    const answer = { ...(finalAnswer() as object), result: { headline: { outcomeState: 'indeterminate', xOfTen: { value: 0, marginToEdge: 0 }, stateMarginToEdge: 0 }, distribution: {} } } as unknown as ModelAnswer
    render(<RoutedShell save={{ kind: 'none' }} snapshot={snapshotWith(answer)} lanes={heldLanes().lanes} wallCalendarYear={BUILD_YEAR} initialRoute={{ module: 'retirement', page: 'health-care' }} />)
    expect(document.querySelector('[data-health-page="words"]')).toHaveTextContent(copy.snapshotRingNoReading)
    expect(screen.queryByText(copy.healthNone)).toBeNull()
  })

  it('Stress Test on a retired plan with no yearly ledger (Social Security alone): the page says why, never a stress that "couldn’t run on the same futures"', () => {
    const ssOnly: ScenarioDraft = { ...DRAFT, enteredAccounts: [], incomeStreams: [] }
    const answer = { ...(finalAnswer() as object), draft: ssOnly } as unknown as ModelAnswer
    expect(tableRunFor(answer), '[test setup] no ledger').toEqual({ kind: 'withheld', reason: 'no-ledger' })
    render(<RoutedShell save={{ kind: 'none' }} snapshot={{ ...snapshotWith(answer), draft: ssOnly }} lanes={heldLanes().lanes} wallCalendarYear={BUILD_YEAR} initialRoute={STRESS} />)
    expect(pageWords('stress-test')).toHaveTextContent(copy.pageWordsWithheldNoLedger)
  })

  it('the StaleBanner rides Social Security, Stress Test, Tax Strategies and Health Care, which print figures run from the saved balances; one in-frame R13 caveat still', () => {
    // Tax Strategies and Health Care since milestone 2's review, round 3: an aged plan's Find printed its strategies, and
    // Health Care its lifetime costs, with no aged line there.
    const TAX_STRATEGIES = { module: 'tax', page: 'strategies' } as const
    const HEALTH = { module: 'retirement', page: 'health-care' } as const
    for (const route of [SS, STRESS, TAX_STRATEGIES, HEALTH]) {
      const { lanes } = heldLanes()
      render(<RoutedShell save={{ kind: 'none' }} snapshot={snapshotWith(finalAnswer())} lanes={lanes} wallCalendarYear={BUILD_YEAR + 2} stalenessNote agedBalancesYear={BUILD_YEAR} initialRoute={route} />)
      expect(screen.getByText(copy.stalenessHeroNote)).toBeInTheDocument()
      expect(screen.getByText(slots.staleAgedBalances(BUILD_YEAR))).toBeInTheDocument()
      expect(document.querySelector('main.result')!.querySelectorAll('[data-caveat]')).toHaveLength(1)
      cleanup()
    }
  })
})
