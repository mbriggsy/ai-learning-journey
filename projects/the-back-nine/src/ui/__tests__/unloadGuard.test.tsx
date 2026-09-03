// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { useUnloadGuard, warnBeforeUnload } from '../unloadGuard'
import { readyToApplyUpdate } from '../updateGate'

/**
 * The leave-page guard's two facts, pinned SEPARATELY. jsdom folds the dialog's two channels
 * (assigning the legacy `returnValue` alone marks the event canceled), so the integration probe
 * every consumer uses — dispatch a cancelable `beforeunload`, read `defaultPrevented` — cannot see
 * a dropped `preventDefault()`. The handler is exported so the first describe can. The second pins
 * the pairing with the update-apply hold: an armed dialog with an open gate is the half-applied
 * update the 2026-09-03 review traced (skipWaiting lands, the dialog cancels the reload after it).
 */

const idleGate = { isWriteInFlight: () => false, whenNoWriteInFlight: async () => {} }
const wouldWarn = (): boolean => {
  const ev = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(ev)
  return ev.defaultPrevented
}
function Probe({ active }: { active: boolean }) {
  useUnloadGuard(active)
  return null
}

afterEach(cleanup)

describe('warnBeforeUnload — both dialog channels, each pinned on its own', () => {
  it('calls preventDefault() (the modern trigger) AND sets the legacy returnValue', () => {
    const e = { preventDefault: vi.fn(), returnValue: undefined as unknown }
    warnBeforeUnload(e as unknown as BeforeUnloadEvent)
    expect(e.preventDefault).toHaveBeenCalledTimes(1)
    expect(e.returnValue).toBe('')
  })
})

describe('useUnloadGuard — the dialog and the update-apply hold are ONE fact', () => {
  it('inactive: no dialog, and the update gate is open', async () => {
    render(<Probe active={false} />)
    expect(wouldWarn()).toBe(false)
    expect(await readyToApplyUpdate(idleGate)).toBe(true)
  })

  it('active: the dialog is armed AND "Refresh now" refuses; flipping inactive releases both together', async () => {
    const { rerender } = render(<Probe active />)
    expect(wouldWarn()).toBe(true)
    expect(await readyToApplyUpdate(idleGate)).toBe(false)
    rerender(<Probe active={false} />)
    expect(wouldWarn()).toBe(false)
    expect(await readyToApplyUpdate(idleGate)).toBe(true)
  })

  it('unmount while active releases both — a crash screen or a route change can never leak a hold', async () => {
    const { unmount } = render(<Probe active />)
    expect(wouldWarn()).toBe(true)
    unmount()
    expect(wouldWarn()).toBe(false)
    expect(await readyToApplyUpdate(idleGate)).toBe(true)
  })
})
