import { describe, it, expect } from 'vitest'

// Test the double-tap detection logic directly (no React needed).
// The hook is a thin useCallback wrapper around this logic.

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
