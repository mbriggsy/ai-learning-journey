import { useRef, useState, useCallback, useEffect } from 'react'

export function useWakeLock(): boolean {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const [isActive, setIsActive] = useState(false)

  const request = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
      setIsActive(true)
      wakeLockRef.current.addEventListener('release', () => {
        setIsActive(false)
        wakeLockRef.current = null
      })
    } catch { /* low battery or user preference -- silent fail */ }
  }, [])

  useEffect(() => {
    request()
    const onVisible = () => {
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      wakeLockRef.current?.release()
    }
  }, [request])

  return isActive
}
