// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useControlPreview } from '../controlPreview'
import type { Announcer } from '../a11y'
import type { ControlPreview } from '@store/controlPreview'
import type { OutcomeState, TwoArmControl } from '@shared/model'
import type { TwoFuturesView } from '@ui/twoFuturesChrome'
import { copy } from '@ui/copy'

/**
 * The shared what-if preview seam (src/intake/controlPreview.tsx) — the LATEST-WINS guard the two
 * U10 control sheets (SequencingControl + RothLever) fold onto. Each sheet's own battery pins the
 * guard through its rendered surface; this battery pins it DIRECTLY on the hook, so the dedup
 * carries its own guard and neither sheet can silently break the seam for the other.
 *
 * The seam owns three supersession transitions the store's preview ticket cannot see:
 *  - a NEWER run supersedes an older in-flight run (both minted tickets, but the sheet-local
 *    generation is what discards the loser's late resolve UNRENDERED — interpret never runs);
 *  - a WITHDRAW (run(null) — baseline-vs-baseline, a cleared plan) fires no ticket yet must
 *    still supersede an in-flight run;
 *  - resetForOpen (the open-edge) supersedes a run held across a close+reopen.
 */

afterEach(cleanup)

/** A controllable preview seam: hands back promises the test resolves by hand (the guard can only
 *  be exercised out-of-order — a stale resolve landing after a newer transition). */
function deferredPreview() {
  const resolvers: Array<(r: ControlPreview) => void> = []
  const fn = vi.fn(
    (_control: TwoArmControl): Promise<ControlPreview> | null =>
      new Promise<ControlPreview>((resolve) => resolvers.push(resolve)),
  )
  return { fn, resolvers }
}

function recordingAnnouncer() {
  const spoken: string[] = []
  const ref: React.MutableRefObject<Announcer | null> = { current: { announce: (t) => void spoken.push(t) } }
  return { ref, spoken }
}

/** A resolved OK preview — the outcome is inert here (this battery's interpret ignores it; the
 *  compose→view mapping is the sheets' own concern, pinned in their batteries). */
function okPreview(): ControlPreview {
  const arm = (surv: number, state: OutcomeState) => ({
    headline: { xOfTen: { value: surv, marginToEdge: 0.05 }, outcomeState: state, stateMarginToEdge: 0.05 },
    survivorReading: { xOfTen: { value: surv, marginToEdge: 0.05 }, outcomeState: state, incomeStepDownMonthlyReal: 1_000 },
    survivalFraction: surv / 10,
    survivorFraction: surv / 10,
  })
  return {
    kind: 'ok',
    outcome: { kind: 'two-arm', with: arm(8, 'on-track'), without: arm(6, 'on-track'), rawDelta: 0.2, deltaBasis: 'survivor' },
  }
}

const view = (deltaLine: string): TwoFuturesView => ({ deltaLine })
const control: TwoArmControl = { kind: 'sequencing', policy: 'taxable-first' }

describe('useControlPreview — the latest-wins guard', () => {
  it('runs pending → ready, announcing the landed delta', async () => {
    const preview = deferredPreview()
    const { ref, spoken } = recordingAnnouncer()
    const { result } = renderHook(() => useControlPreview({ preview: preview.fn, announcerRef: ref }))

    act(() => result.current.run(control, () => ({ kind: 'ready', view: view('landed') })))
    expect(result.current.previewState.kind).toBe('pending')

    await act(async () => preview.resolvers[0]!(okPreview()))
    expect(result.current.previewState).toEqual({ kind: 'ready', view: view('landed') })
    expect(spoken).toEqual(['landed'])
  })

  it('a NEWER run discards the older run’s late resolve (interpret never runs); the newer one lands', async () => {
    const preview = deferredPreview()
    const { ref, spoken } = recordingAnnouncer()
    const { result } = renderHook(() => useControlPreview({ preview: preview.fn, announcerRef: ref }))

    const interpretA = vi.fn(() => ({ kind: 'ready' as const, view: view('A') }))
    const interpretB = vi.fn(() => ({ kind: 'ready' as const, view: view('B') }))
    act(() => result.current.run(control, interpretA)) // gen 1
    act(() => result.current.run(control, interpretB)) // gen 2 supersedes

    await act(async () => preview.resolvers[0]!(okPreview())) // A lands under a stale generation
    expect(interpretA).not.toHaveBeenCalled() // guarded out BEFORE interpret
    expect(result.current.previewState.kind).toBe('pending') // A never painted

    await act(async () => preview.resolvers[1]!(okPreview())) // B lands current
    expect(interpretB).toHaveBeenCalledTimes(1)
    expect(result.current.previewState).toEqual({ kind: 'ready', view: view('B') })
    expect(spoken).toEqual(['B']) // only the survivor spoke
  })

  it('a WITHDRAW (run(null)) supersedes an in-flight run — the seam the store ticket cannot see', async () => {
    const preview = deferredPreview()
    const { ref, spoken } = recordingAnnouncer()
    const { result } = renderHook(() => useControlPreview({ preview: preview.fn, announcerRef: ref }))

    const interpretA = vi.fn(() => ({ kind: 'ready' as const, view: view('A') }))
    act(() => result.current.run(control, interpretA)) // gen 1, pending
    act(() => result.current.run(null, () => ({ kind: 'ready' as const, view: view('never') }))) // gen 2, withdraw → idle
    expect(result.current.previewState.kind).toBe('idle')

    await act(async () => preview.resolvers[0]!(okPreview())) // A lands under the superseded generation
    expect(interpretA).not.toHaveBeenCalled()
    expect(result.current.previewState.kind).toBe('idle') // NOT clobbered to ready
    expect(spoken).toEqual([])
  })

  it('resetForOpen (the open edge) discards a run held across a close+reopen', async () => {
    const preview = deferredPreview()
    const { ref } = recordingAnnouncer()
    const { result } = renderHook(() => useControlPreview({ preview: preview.fn, announcerRef: ref }))

    const interpretA = vi.fn(() => ({ kind: 'ready' as const, view: view('A') }))
    act(() => result.current.run(control, interpretA)) // gen 1, pending (the run held across the close)
    act(() => result.current.resetForOpen()) // gen 2, idle (the reopen)
    expect(result.current.previewState.kind).toBe('idle')

    await act(async () => preview.resolvers[0]!(okPreview()))
    expect(interpretA).not.toHaveBeenCalled()
    expect(result.current.previewState.kind).toBe('idle')
  })

  it('a transport error resolves to the calm error face and announces leverPreviewError', async () => {
    const preview = deferredPreview()
    const { ref, spoken } = recordingAnnouncer()
    const { result } = renderHook(() => useControlPreview({ preview: preview.fn, announcerRef: ref }))

    act(() => result.current.run(control, () => ({ kind: 'ready', view: view('unused') })))
    await act(async () => preview.resolvers[0]!({ kind: 'error', reason: 'boom' }))
    expect(result.current.previewState).toEqual({ kind: 'error', reason: 'boom' })
    expect(spoken).toEqual([copy.leverPreviewError])
  })

  it('a null runner (no honest anchor) paints the no-anchor face without pending', () => {
    const { ref } = recordingAnnouncer()
    const { result } = renderHook(() =>
      useControlPreview({ preview: () => null, announcerRef: ref }),
    )
    act(() => result.current.run(control, () => ({ kind: 'ready', view: view('unused') })))
    expect(result.current.previewState.kind).toBe('no-anchor')
  })
})
