// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import WorkbenchRoom, { type TableLanes } from '../WorkbenchRoom'
import { simulate } from '@engine/simulate'
import { DEV_SEEDS } from '../../devSeeds'
import { copy, slots } from '../../copy'
import type { EngineRunRequest, LaneResult } from '@store/runLanes'
import type { MemoryModelSnapshot, ModelAnswer } from '@store/memoryModel'
import type { SimulationResult } from '@shared/model'

/**
 * The room's year-by-year table (workbench plan U7): its three named states (first load, updating, error), the
 * withheld words, the steady/rough switch, and the heading's words, with the lanes faked so each state is held.
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
    result: { headline: { outcomeState: 'on-track', xOfTen: { value: 8, marginToEdge: 0.1 }, stateMarginToEdge: 0.1 } },
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
  render(<WorkbenchRoom save={{ kind: 'none' }} onBack={vi.fn()} snapshot={snapshot} lanes={lanes} wallCalendarYear={wallCalendarYear} />)

describe('WorkbenchRoom — the table’s three states', () => {
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
    renderRoom(snapshotWith(finalAnswer()), lanes)
    await settleAll('run')
    fireEvent.click(screen.getByLabelText(copy.workbenchViewRough))
    expect(screen.getByText(/One future, in a rough market: the market runs as history did from 1966 to 1995/)).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(lane.request).toHaveBeenCalledTimes(2)
  })

  it('updating: a newer answer keeps the prior rows on screen, marked in words and busy, until its rows land', async () => {
    const { lanes, settleAll } = heldLanes()
    const view = renderRoom(snapshotWith(finalAnswer('k1')), lanes)
    await settleAll('run')
    view.rerender(
      <WorkbenchRoom save={{ kind: 'none' }} onBack={vi.fn()} snapshot={snapshotWith(finalAnswer('k2'))} lanes={lanes} wallCalendarYear={BUILD_YEAR} />,
    )
    expect(screen.getByText(copy.workbenchTableUpdating)).toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    await settleAll('run')
    expect(screen.queryByText(copy.workbenchTableUpdating)).toBeNull()
    expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy')
  })

  it('updating while the answer is re-figured: the rows stay, marked', async () => {
    const { lanes, settleAll } = heldLanes()
    const view = renderRoom(snapshotWith(finalAnswer()), lanes)
    await settleAll('run')
    view.rerender(
      <WorkbenchRoom save={{ kind: 'none' }} onBack={vi.fn()} snapshot={snapshotWith(finalAnswer(), true)} lanes={lanes} wallCalendarYear={BUILD_YEAR} />,
    )
    expect(screen.getByText(copy.workbenchTableUpdating)).toBeInTheDocument()
    // The pinned box's label line says the answer is being worked out again.
    expect(screen.getByText(copy.workbenchPinnedRefiguring)).toBeInTheDocument()
  })

  it('error: one calm sentence, no rows, the way back and no retry', async () => {
    const { lanes, settleAll } = heldLanes()
    const onBack = vi.fn()
    render(<WorkbenchRoom save={{ kind: 'none' }} onBack={onBack} snapshot={snapshotWith(finalAnswer())} lanes={lanes} wallCalendarYear={BUILD_YEAR} />)
    await settleAll('error')
    expect(screen.getByRole('alert')).toHaveTextContent(copy.workbenchTableError)
    expect(screen.queryByRole('table')).toBeNull()
    // The room's own Back is the one way back: the error state adds no second button of the same name.
    fireEvent.click(screen.getByRole('button', { name: copy.workbenchBack }))
    expect(onBack).toHaveBeenCalled()
  })
})

describe('WorkbenchRoom — the answer the table waits on', () => {
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
})
