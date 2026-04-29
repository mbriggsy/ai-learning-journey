import { useRef, useCallback } from 'react'

const DOUBLE_TAP_THRESHOLD_MS = 400
const MOVE_TOLERANCE_PX = 10

/**
 * Discriminates single-tap vs double-tap on touch devices.
 * - Single tap fires after DOUBLE_TAP_THRESHOLD_MS (delayed to check for second tap)
 * - Double tap fires immediately on the second tap
 * - Move tolerance prevents scroll gestures from triggering
 * - Coexists with long-press (long-press fires on pointerDown, taps fire on pointerUp)
 */
export function useDoubleTap(
  onDoubleTap: (id: string) => void,
  onSingleTap?: (id: string) => void,
) {
  const lastTap = useRef<{ id: string; time: number; x: number; y: number } | null>(null)
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  return useCallback((id: string, e: React.PointerEvent) => {
    const now = Date.now()
    const prev = lastTap.current

    const isSameCardDouble = !!prev &&
      prev.id === id &&
      now - prev.time < DOUBLE_TAP_THRESHOLD_MS &&
      Math.abs(e.clientX - prev.x) < MOVE_TOLERANCE_PX &&
      Math.abs(e.clientY - prev.y) < MOVE_TOLERANCE_PX

    // Cross-card rapid tap — second tap landed on a different id within the
    // double-tap threshold. Most likely a drifted-double-tap (intended A,
    // click 2 missed and hit adjacent B). The pre-fix path cancelled A's
    // pending single-tap and scheduled a NEW single-tap for B, which fired
    // 400ms later and stranded an enlarge backdrop on B — blocking End-turn
    // until the user pressed Escape and manually deselected. Fix is to
    // cancel + reset without rescheduling: ambiguity resolves to "no
    // action," and the user retries cleanly.
    const isCrossCardRapid = !!prev &&
      prev.id !== id &&
      now - prev.time < DOUBLE_TAP_THRESHOLD_MS

    if (isSameCardDouble) {
      lastTap.current = null
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current)
        singleTapTimer.current = null
      }
      onDoubleTap(id)
    } else if (isCrossCardRapid) {
      lastTap.current = null
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current)
        singleTapTimer.current = null
      }
    } else {
      // First tap from a clean state (or stale prev outside threshold) —
      // schedule single-tap, wait for potential second tap.
      lastTap.current = { id, time: now, x: e.clientX, y: e.clientY }
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current)
      if (onSingleTap) {
        singleTapTimer.current = setTimeout(() => {
          singleTapTimer.current = null
          onSingleTap(id)
        }, DOUBLE_TAP_THRESHOLD_MS)
      }
    }
  }, [onDoubleTap, onSingleTap])
}
