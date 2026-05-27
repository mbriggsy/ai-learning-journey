import { useCallback, useEffect, useState } from 'react'
import { nextTheme, type Theme } from '@/lib/theme'

const systemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

// The LIVE effective theme: the explicit data-theme override if one is set (by main.tsx's
// pre-paint resolve, or a prior toggle this session), else whatever the OS currently prefers.
const effectiveTheme = (): Theme => {
  const attr = document.documentElement.dataset.theme
  return attr === 'light' || attr === 'dark' ? attr : systemTheme()
}

/**
 * Theme state for the toggle. `theme` is the effective mode (for the button's icon/label);
 * `toggle()` flips it, writes data-theme on <html> (the [data-theme] block wins over @media),
 * and persists the choice. Initial paint is handled FOUC-free in main.tsx — this hook only
 * reflects + mutates from here.
 */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(effectiveTheme)

  // Until the user makes an explicit choice (no stored pref AND no override attr), keep the
  // button in sync if the OS theme flips under us — the @media block already repaints the
  // colours; this just keeps the icon honest. Once they toggle, the attr is set and we stop.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (!localStorage.getItem('theme') && !document.documentElement.dataset.theme) {
        setTheme(systemTheme())
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    const next = nextTheme(effectiveTheme())
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // private mode / storage blocked — the attr still applies for this session
    }
    setTheme(next)
  }, [])

  return { theme, toggle }
}
