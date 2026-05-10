import { useRef, useEffect, useState } from 'react'
import type { NopeWindowView } from '@shared/protocol'

/** Circumference of the foreground arc circle in NopeCountdownBar's SVG
 *  (r=24 → 2π·24 ≈ 150.7964). Exported so the SVG renderer pins the same
 *  dasharray value the hook drives via dashoffset. Recompute if the ring
 *  geometry changes. */
export const NOPE_RING_CIRCUMFERENCE = 2 * Math.PI * 24

export interface NopeCountdownState {
  /** Attach to the SVG <circle class="fill"> — the foreground arc. The hook
   *  drives `stroke-dashoffset` from 0 (full) to NOPE_RING_CIRCUMFERENCE
   *  (drained) over the remaining window via CSS transition. */
  ringRef: React.RefObject<SVGCircleElement | null>
  secondsLeft: number
  isActive: boolean
}

export function useNopeCountdown(
  nopeWindow: NopeWindowView | null,
  stateVersion: number,
): NopeCountdownState {
  const ringRef = useRef<SVGCircleElement | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (!nopeWindow) {
      setSecondsLeft(0)
      return
    }

    const ring = ringRef.current
    if (ring) {
      // Force reflow pattern: reset → reflow → animate. Same shape the bar
      // version used (transform: scaleX 1→0). Now driving stroke-dashoffset
      // 0 → circumference so the foreground arc drains clockwise from 12
      // o'clock (the SVG <circle> is rotated -90deg in CSS to anchor the
      // drain start at the top).
      ring.style.transition = 'none'
      ring.style.strokeDashoffset = '0'
      void ring.getBoundingClientRect() // force reflow
      const remainingMs = nopeWindow.deadlineMs - Date.now()
      ring.style.transition = `stroke-dashoffset ${Math.max(0, remainingMs) / 1000}s linear`
      ring.style.strokeDashoffset = String(NOPE_RING_CIRCUMFERENCE)
    }

    // Text countdown at 1Hz
    const update = () => {
      const remaining = Math.max(0, nopeWindow.deadlineMs - Date.now())
      setSecondsLeft(Math.ceil(remaining / 1000))
    }
    update()
    const interval = setInterval(update, 1000)

    return () => clearInterval(interval)
  }, [nopeWindow, stateVersion])

  return { ringRef, secondsLeft, isActive: nopeWindow !== null }
}
