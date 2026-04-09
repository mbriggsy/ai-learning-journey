import { useRef, useEffect, useState } from 'react'
import type { NopeWindowView } from '@shared/protocol'

export interface NopeCountdownState {
  barRef: React.RefObject<HTMLDivElement | null>
  secondsLeft: number
  isActive: boolean
}

export function useNopeCountdown(
  nopeWindow: NopeWindowView | null,
  stateVersion: number,
): NopeCountdownState {
  const barRef = useRef<HTMLDivElement | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (!nopeWindow) {
      setSecondsLeft(0)
      return
    }

    const bar = barRef.current
    if (bar) {
      // Force reflow pattern: reset → reflow → animate
      bar.style.transition = 'none'
      bar.style.transform = 'scaleX(1)'
      void bar.offsetWidth // force reflow
      const remainingMs = nopeWindow.deadlineMs - Date.now()
      bar.style.transition = `transform ${Math.max(0, remainingMs) / 1000}s linear`
      bar.style.transform = 'scaleX(0)'
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

  return { barRef, secondsLeft, isActive: nopeWindow !== null }
}
