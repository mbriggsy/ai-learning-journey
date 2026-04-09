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

    if (
      prev &&
      prev.id === id &&
      now - prev.time < DOUBLE_TAP_THRESHOLD_MS &&
      Math.abs(e.clientX - prev.x) < MOVE_TOLERANCE_PX &&
      Math.abs(e.clientY - prev.y) < MOVE_TOLERANCE_PX
    ) {
      // Double-tap — cancel pending single-tap, fire immediately
      lastTap.current = null
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current)
        singleTapTimer.current = null
      }
      onDoubleTap(id)
    } else {
      // First tap — schedule single-tap, wait for potential second tap
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
