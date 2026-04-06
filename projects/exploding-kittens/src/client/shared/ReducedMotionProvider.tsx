import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { PropsWithChildren } from 'react'
import { useReducedMotion } from 'motion/react'

interface ReducedMotionContextValue {
  readonly reducedMotion: boolean
  readonly toggle: () => void
}

const ReducedMotionContext = createContext<ReducedMotionContextValue>({
  reducedMotion: false,
  toggle: () => {},
})

const STORAGE_KEY = 'ek-reduced-motion'

/**
 * Combines OS prefers-reduced-motion with an in-game toggle (localStorage).
 * Components consume via useReducedMotionPreference() hook.
 */
export function ReducedMotionProvider({ children }: PropsWithChildren) {
  const osPrefers = useReducedMotion() ?? false
  const [userOverride, setUserOverride] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const reducedMotion = osPrefers || userOverride

  const toggle = useCallback(() => {
    setUserOverride(prev => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch {}
      return next
    })
  }, [])

  const value = useMemo(() => ({ reducedMotion, toggle }), [reducedMotion, toggle])

  return (
    <ReducedMotionContext value={value}>
      {children}
    </ReducedMotionContext>
  )
}

export function useReducedMotionPreference(): ReducedMotionContextValue {
  return useContext(ReducedMotionContext)
}
