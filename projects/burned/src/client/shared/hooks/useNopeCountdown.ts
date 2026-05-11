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
  /** True when the host has called a hold on the intercept window. UI uses
   *  this to swap the dial label and the pause button caption. */
  isPaused: boolean
}

export function useNopeCountdown(
  nopeWindow: NopeWindowView | null,
  stateVersion: number,
): NopeCountdownState {
  const ringRef = useRef<SVGCircleElement | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  // Track prior generation + pause state across renders so the effect can
  // distinguish (a) a fresh window opening, (b) the same window pausing,
  // (c) the same window resuming, (d) the window closing. Without this we
  // can't preserve the drained portion of the ring through a pause cycle.
  const lastGenerationRef = useRef<number | null>(null)
  const wasPausedRef = useRef(false)

  useEffect(() => {
    if (!nopeWindow) {
      setSecondsLeft(0)
      lastGenerationRef.current = null
      wasPausedRef.current = false
      return
    }

    const isPaused = nopeWindow.pausedAtMs !== undefined
    const isNewGeneration = lastGenerationRef.current !== nopeWindow.generation
    const wasPaused = wasPausedRef.current
    const ring = ringRef.current

    if (ring) {
      if (isNewGeneration) {
        // Fresh window — reset to 0 then animate to circumference over
        // the full remaining window. Same shape the pre-pause hook used.
        ring.style.transition = 'none'
        ring.style.strokeDashoffset = '0'
        void ring.getBoundingClientRect() // force reflow
        const remainingMs = nopeWindow.deadlineMs - Date.now()
        ring.style.transition = `stroke-dashoffset ${Math.max(0, remainingMs) / 1000}s linear`
        ring.style.strokeDashoffset = String(NOPE_RING_CIRCUMFERENCE)
      } else if (isPaused && !wasPaused) {
        // Pausing — capture the currently-animated dashoffset and freeze.
        // Reading getComputedStyle locks the live interpolated value in
        // place before we cancel the transition.
        const current = getComputedStyle(ring).strokeDashoffset
        ring.style.transition = 'none'
        ring.style.strokeDashoffset = current
      } else if (!isPaused && wasPaused) {
        // Resuming — continue the drain from wherever pause froze it,
        // over the remaining window. Engine pushed deadlineMs forward by
        // the pause duration, so `deadlineMs - now` equals the pre-pause
        // remainder.
        void ring.getBoundingClientRect() // force reflow before new transition
        const remainingMs = nopeWindow.deadlineMs - Date.now()
        ring.style.transition = `stroke-dashoffset ${Math.max(0, remainingMs) / 1000}s linear`
        ring.style.strokeDashoffset = String(NOPE_RING_CIRCUMFERENCE)
      }
      // Same generation + same pause state → no ring change (engine bumped
      // stateVersion for an unrelated reason).
    }

    lastGenerationRef.current = nopeWindow.generation
    wasPausedRef.current = isPaused

    // Text countdown — frozen value while paused, wall-clock otherwise.
    const update = () => {
      if (nopeWindow.pausedAtMs !== undefined) {
        const remaining = Math.max(0, nopeWindow.deadlineMs - nopeWindow.pausedAtMs)
        setSecondsLeft(Math.ceil(remaining / 1000))
      } else {
        const remaining = Math.max(0, nopeWindow.deadlineMs - Date.now())
        setSecondsLeft(Math.ceil(remaining / 1000))
      }
    }
    update()
    // No interval while paused — display is frozen and the next state
    // change (resume / close) re-runs this effect to re-arm the tick.
    if (isPaused) return
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [nopeWindow, stateVersion])

  return {
    ringRef,
    secondsLeft,
    isActive: nopeWindow !== null,
    isPaused: nopeWindow?.pausedAtMs !== undefined,
  }
}
