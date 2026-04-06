import { useState, useEffect } from 'react'

export function useOrientationWarning(): boolean {
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia('(orientation: landscape)')
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches)
    setIsLandscape(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isLandscape
}
