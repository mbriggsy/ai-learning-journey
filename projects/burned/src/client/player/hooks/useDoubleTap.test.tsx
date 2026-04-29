// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useDoubleTap } from './useDoubleTap'

// -----------------------------------------------------------------------------
// Pure-logic tests — mirror the discrimination math without React.
// -----------------------------------------------------------------------------

const THRESHOLD_MS = 400
const MOVE_TOLERANCE_PX = 10

interface TapState { id: string; time: number; x: number; y: number }

function detectDoubleTap(
  id: string,
  x: number,
  y: number,
  now: number,
  prev: TapState | null,
): { fired: boolean; nextState: TapState | null } {
  if (
    prev &&
    prev.id === id &&
    now - prev.time < THRESHOLD_MS &&
    Math.abs(x - prev.x) < MOVE_TOLERANCE_PX &&
    Math.abs(y - prev.y) < MOVE_TOLERANCE_PX
  ) {
    return { fired: true, nextState: null }
  }
  return { fired: false, nextState: { id, time: now, x, y } }
}

describe('double-tap detection', () => {
  it('fires on two taps within threshold on same ID', () => {
    const r1 = detectDoubleTap('c1', 100, 100, 1000, null)
    expect(r1.fired).toBe(false)

    const r2 = detectDoubleTap('c1', 100, 100, 1200, r1.nextState)
    expect(r2.fired).toBe(true)
  })

  it('does not fire on single tap', () => {
    const r1 = detectDoubleTap('c1', 100, 100, 1000, null)
    expect(r1.fired).toBe(false)
  })

  it('does not fire on two taps with different IDs', () => {
    const r1 = detectDoubleTap('c1', 100, 100, 1000, null)
    const r2 = detectDoubleTap('c2', 100, 100, 1100, r1.nextState)
    expect(r2.fired).toBe(false)
  })

  it('does not fire when taps exceed threshold', () => {
    const r1 = detectDoubleTap('c1', 100, 100, 1000, null)
    const r2 = detectDoubleTap('c1', 100, 100, 1400, r1.nextState) // 400ms > 300ms
    expect(r2.fired).toBe(false)
  })

  it('does not fire when finger moved too far (scroll gesture)', () => {
    const r1 = detectDoubleTap('c1', 100, 100, 1000, null)
    const r2 = detectDoubleTap('c1', 120, 100, 1100, r1.nextState) // 20px X
    expect(r2.fired).toBe(false)
  })

  it('fires within move tolerance', () => {
    const r1 = detectDoubleTap('c1', 100, 100, 1000, null)
    const r2 = detectDoubleTap('c1', 105, 103, 1100, r1.nextState) // 5px, 3px
    expect(r2.fired).toBe(true)
  })

  it('resets state after successful double-tap', () => {
    const r1 = detectDoubleTap('c1', 100, 100, 1000, null)
    const r2 = detectDoubleTap('c1', 100, 100, 1100, r1.nextState)
    expect(r2.fired).toBe(true)
    expect(r2.nextState).toBeNull()

    // Third tap starts fresh — no fire
    const r3 = detectDoubleTap('c1', 100, 100, 1200, r2.nextState)
    expect(r3.fired).toBe(false)
  })
})

// -----------------------------------------------------------------------------
// Hook-level tests — exercise the real useDoubleTap with fake timers.
// These cover scheduling/cancel behavior the pure-logic tests can't see.
// -----------------------------------------------------------------------------

type Handler = (id: string, e: React.PointerEvent) => void

let capturedHandler: Handler | null = null

function Harness({
  onDouble,
  onSingle,
}: {
  onDouble: (id: string) => void
  onSingle?: (id: string) => void
}) {
  capturedHandler = useDoubleTap(onDouble, onSingle)
  return null
}

function mountHarness(
  onDouble: (id: string) => void,
  onSingle?: (id: string) => void,
): { container: HTMLElement; root: Root } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<Harness onDouble={onDouble} onSingle={onSingle} />)
  })
  return { container, root }
}

function teardown(container: HTMLElement, root: Root): void {
  act(() => {
    root.unmount()
  })
  container.remove()
  capturedHandler = null
}

function tap(id: string, x = 100, y = 100): void {
  const fakeEvent = { clientX: x, clientY: y } as React.PointerEvent
  act(() => {
    capturedHandler!(id, fakeEvent)
  })
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('useDoubleTap hook (timer scheduling)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires onSingleTap after threshold elapses with no second tap', () => {
    const onDouble = vi.fn()
    const onSingle = vi.fn()
    const { container, root } = mountHarness(onDouble, onSingle)
    try {
      tap('A')
      expect(onSingle).not.toHaveBeenCalled()
      advance(500)
      expect(onSingle).toHaveBeenCalledExactlyOnceWith('A')
      expect(onDouble).not.toHaveBeenCalled()
    } finally {
      teardown(container, root)
    }
  })

  it('fires onDoubleTap immediately on second tap of same card within threshold', () => {
    const onDouble = vi.fn()
    const onSingle = vi.fn()
    const { container, root } = mountHarness(onDouble, onSingle)
    try {
      tap('A')
      advance(50)
      tap('A')
      expect(onDouble).toHaveBeenCalledExactlyOnceWith('A')
      // Subsequent passage of time must not also fire onSingleTap.
      advance(500)
      expect(onSingle).not.toHaveBeenCalled()
    } finally {
      teardown(container, root)
    }
  })

  // ---------------------------------------------------------------------------
  // The bug — TODO #9 stray card selection (run 2026-04-26-1303-3p, seat-1 v1).
  //
  // Reported failure mode: agent attempted to double-tap card A; the second
  // click landed on adjacent card B. Old behavior cancelled A's pending
  // single-tap timer and scheduled a NEW timer for B; 400ms later B's
  // single-tap fired and B got enlarged, blocking the End-turn button until
  // the user pressed Escape + manually deselected.
  //
  // Fix: when a second tap arrives on a DIFFERENT id within the
  // double-tap threshold, the user's intent is ambiguous (drifted-double-tap
  // OR rapid sequential single-taps — both rare, both better served by a
  // clean reset). Cancel the pending timer and reset state without
  // scheduling a replacement. The user retries; nothing is stranded.
  // ---------------------------------------------------------------------------
  it('does NOT enlarge adjacent card when second tap drifts to different id within threshold', () => {
    const onDouble = vi.fn()
    const onSingle = vi.fn()
    const { container, root } = mountHarness(onDouble, onSingle)
    try {
      // Drift scenario: intended double-tap on A; click 2 lands on B.
      tap('A', 100, 100)
      advance(50)
      tap('B', 200, 100) // adjacent card, within threshold

      // Pre-fix: B's single-tap timer fires after 400ms, enlarging B.
      // Post-fix: timer is cancelled and not rescheduled — nothing fires.
      advance(500)
      expect(onSingle).not.toHaveBeenCalled()
      expect(onDouble).not.toHaveBeenCalled()
    } finally {
      teardown(container, root)
    }
  })

  it('preserves recovery: drifted attempt followed by a clean double-tap stages the intended card', () => {
    const onDouble = vi.fn()
    const onSingle = vi.fn()
    const { container, root } = mountHarness(onDouble, onSingle)
    try {
      // Drift: A then B (cancel + reset, no fire).
      tap('A', 100, 100)
      advance(50)
      tap('B', 200, 100)
      // User retries — clean double-tap on A.
      advance(50)
      tap('A', 100, 100)
      advance(50)
      tap('A', 100, 100)

      expect(onDouble).toHaveBeenCalledExactlyOnceWith('A')
      advance(500)
      expect(onSingle).not.toHaveBeenCalled()
    } finally {
      teardown(container, root)
    }
  })

  it('two slow taps on different cards each fire onSingleTap separately', () => {
    const onDouble = vi.fn()
    const onSingle = vi.fn()
    const { container, root } = mountHarness(onDouble, onSingle)
    try {
      tap('A')
      advance(500) // A's single-tap fires here
      expect(onSingle).toHaveBeenCalledExactlyOnceWith('A')

      tap('B')
      advance(500) // B's single-tap fires here
      expect(onSingle).toHaveBeenCalledTimes(2)
      expect(onSingle).toHaveBeenLastCalledWith('B')

      expect(onDouble).not.toHaveBeenCalled()
    } finally {
      teardown(container, root)
    }
  })

  it('same-card drift outside move tolerance schedules a fresh single-tap (existing behavior)', () => {
    // Documenting current behavior: if the second tap is on the SAME card
    // but moves more than MOVE_TOLERANCE_PX, the gesture is treated as
    // a new single-tap (not a double-tap, not the cross-card cancel).
    // This preserves the scroll-gesture filter and is unchanged by the
    // cross-card fix.
    const onDouble = vi.fn()
    const onSingle = vi.fn()
    const { container, root } = mountHarness(onDouble, onSingle)
    try {
      tap('A', 100, 100)
      advance(50)
      tap('A', 130, 100) // 30px drift — beyond MOVE_TOLERANCE_PX
      advance(500)
      expect(onSingle).toHaveBeenCalledExactlyOnceWith('A')
      expect(onDouble).not.toHaveBeenCalled()
    } finally {
      teardown(container, root)
    }
  })

  it('omitted onSingleTap means no timer is scheduled (enlarged-backdrop callsite)', () => {
    // The enlarged-backdrop variant (handleEnlargedTap) DOES pass an
    // onSingleTap (dismiss). This test covers the documented optionality.
    const onDouble = vi.fn()
    const { container, root } = mountHarness(onDouble) // no onSingle
    try {
      tap('A')
      advance(500)
      // No callbacks should fire — single tap with no onSingleTap is a no-op.
      expect(onDouble).not.toHaveBeenCalled()
    } finally {
      teardown(container, root)
    }
  })
})
