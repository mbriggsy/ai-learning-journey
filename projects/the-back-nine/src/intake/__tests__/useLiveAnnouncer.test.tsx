// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { useLiveAnnouncer, type LiveAnnouncer } from '../a11y'

/**
 * useLiveAnnouncer — the one live-region idiom, callback-ref bound.
 *
 * The load-bearing case is insight 060: a live region inside an open-gated subtree mounts
 * AFTER the component, so a `[]`-deps mount effect binds null at first render and never
 * retries — a dead announcer green in every always-open test. This battery drives the app's
 * real closed→open sequence and pins that the hook binds on the LATE mount, is a safe no-op
 * before its node attaches, clears after speaking, and returns a referentially STABLE handle
 * (the reason a child can hold it as an `announcer` prop without churning its effects).
 */

afterEach(cleanup)

// The announcer is stable across renders, so capturing it during render lands the same object.
let captured: LiveAnnouncer | null = null
function Harness({ open }: { open: boolean }) {
  const announcer = useLiveAnnouncer()
  captured = announcer
  return open ? <div ref={announcer.ref} role="status" aria-live="polite" data-testid="region" /> : null
}

describe('useLiveAnnouncer', () => {
  it('binds on the LATE mount of a gated region — dead-safe before, live after (insight 060)', () => {
    const { rerender } = render(<Harness open={false} />)
    // The app's real shape: the region node does not exist at first render.
    expect(screen.queryByTestId('region')).toBeNull()
    // An announce before the node attaches must be a safe no-op — never a throw.
    expect(() => captured!.announce('before')).not.toThrow()

    // Open: the region mounts and the callback ref binds the announcer to it.
    rerender(<Harness open />)
    const region = screen.getByTestId('region')
    act(() => captured!.announce('after'))
    expect(region.textContent).toBe('after')
  })

  it('clears after the announce delay so no stale text lingers (burned/045)', () => {
    vi.useFakeTimers()
    try {
      render(<Harness open />)
      const region = screen.getByTestId('region')
      act(() => captured!.announce('working'))
      expect(region.textContent).toBe('working')
      act(() => vi.advanceTimersByTime(1100))
      expect(region.textContent).toBe('')
    } finally {
      vi.useRealTimers()
    }
  })

  it('unbinds on unmount — an announce after the region leaves is a no-op, never a throw', () => {
    const { rerender } = render(<Harness open />)
    act(() => captured!.announce('live'))
    rerender(<Harness open={false} />)
    expect(screen.queryByTestId('region')).toBeNull()
    expect(() => captured!.announce('gone')).not.toThrow()
  })

  it('returns a STABLE handle across renders — a child prop that never churns', () => {
    const seen: LiveAnnouncer[] = []
    function Capture() {
      const a = useLiveAnnouncer()
      seen.push(a)
      return <div ref={a.ref} role="status" aria-live="polite" />
    }
    const { rerender } = render(<Capture />)
    rerender(<Capture />)
    expect(seen.length).toBeGreaterThanOrEqual(2)
    expect(seen[0]).toBe(seen[1]) // same object identity
    expect(seen[0]!.announce).toBe(seen[1]!.announce)
    expect(seen[0]!.ref).toBe(seen[1]!.ref)
  })
})
