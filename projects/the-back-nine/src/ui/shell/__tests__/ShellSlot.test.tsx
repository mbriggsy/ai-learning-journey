// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ShellSlot } from '../ShellSlot'
import { LANDING } from '../routes'
import { copy } from '../../copy'
import type { MemoryModelSnapshot, ModelAnswer } from '@store/memoryModel'
import { DEV_SEEDS } from '../../devSeeds'
import { pinnedLines } from '../../workbench/pinnedLines'

/**
 * The shell's loader (Act 6 · RC2, the room's `RoomSlot` pattern kept; KTD31, insights 053 and 054): a failed chunk load
 * shows its own retry inside the intake app, the retry loads the shell with no page reload, and only a failure after a
 * retry offers the reload. On every failure the answer stays readable (U25's rule): its lead on the failure page, and
 * "Back to your answer" to the whole of it.
 */

afterEach(cleanup)

const draft = DEV_SEEDS.retired
const answer = {
  kind: 'headline',
  tier: 'final',
  draft,
  inputKey: 'k1',
  result: { headline: { outcomeState: 'on-track', xOfTen: { value: 8, marginToEdge: 0.1 }, stateMarginToEdge: 0.1 }, distribution: {} },
} as unknown as ModelAnswer
const SNAPSHOT = {
  draft,
  answer,
  displayed: null,
  solve: { kind: 'idle' },
  spend: { kind: 'idle' },
  refiguring: false,
  runningInWorker: false,
} satisfies MemoryModelSnapshot
// Lanes that never answer: the shell draws its first-load frame and asks no engine.
const never = { request: () => new Promise<never>(() => {}) }
const shell = (onHome = vi.fn()) => ({
  save: { kind: 'none' } as const,
  route: LANDING,
  onNavigate: vi.fn(),
  onHome,
  snapshot: SNAPSHOT,
  lanes: { steady: never, rough: never },
  whatIfLanes: { many: never, steady: never, rough: never },
  wallCalendarYear: draft.startCalendarYear,
})
const realShell = () => import('../Shell')
const chunkMiss = () => Promise.reject(new TypeError('Failed to fetch dynamically imported module'))

// React logs every error a boundary catches; the boundary is the thing under test.
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('ShellSlot — the shell loads on demand behind its own boundary', () => {
  it('a failed load shows the retry, the answer’s lead and the way back; the retry loads the shell with no reload', async () => {
    const load = vi.fn().mockImplementationOnce(chunkMiss).mockImplementation(realShell)
    render(<ShellSlot shell={shell()} load={load} />)
    expect(await screen.findByText(copy.workbenchLoadFailed)).toBeInTheDocument()
    expect(screen.getByText(pinnedLines(SNAPSHOT, draft.startCalendarYear).lead)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.workbenchBack })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.restoreRetry })).toBeNull()
    expect(document.querySelector('main.result'), 'the failure page is never the settle hook').toBeNull()

    fireEvent.click(screen.getByRole('button', { name: copy.exportRetry }))
    // The shell itself, in the same mounted tree: a fresh import, never a page reload. A real import of the shell's
    // whole module graph (the table's engine pieces ride it): give it time to transform.
    expect(await screen.findByRole('heading', { name: copy.workbenchPageTable }, { timeout: 15_000 })).toBeInTheDocument()
    expect(screen.queryByText(copy.workbenchLoadFailed)).toBeNull()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('a failure after a retry offers the reload and still reads the answer; Back to your answer leaves', async () => {
    const onHome = vi.fn()
    const load = vi.fn().mockImplementation(chunkMiss)
    render(<ShellSlot shell={shell(onHome)} load={load} />)
    fireEvent.click(await screen.findByRole('button', { name: copy.exportRetry }))
    expect(await screen.findByText(copy.workbenchLoadFailedAgain)).toBeInTheDocument()
    expect(screen.getByText(pinnedLines(SNAPSHOT, draft.startCalendarYear).lead)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.restoreRetry })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.exportRetry })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: copy.workbenchBack }))
    expect(onHome).toHaveBeenCalledTimes(1)
  })
})
