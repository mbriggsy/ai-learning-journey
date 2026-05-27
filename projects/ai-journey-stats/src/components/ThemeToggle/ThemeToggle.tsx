import { useTheme } from '@/hooks/useTheme'
import styles from './ThemeToggle.module.css'

/**
 * The site's one piece of interactive chrome: a light/dark switch. Both palettes are
 * first-class (ideation §10), so the switch is too — promoted from the v1.1 deferral once
 * real use showed that hiding a whole mode behind OS settings / a ?theme= URL was the gap.
 *
 * Shows the mode you'll switch TO (sun in dark, moon in light). The SHAPE carries the meaning,
 * never colour — the author is colour-blind. Rendered outside the route-transition wrapper so
 * position:fixed anchors to the viewport (no transform ancestor → no containing-block trap) and
 * it doesn't cross-fade/remount on navigation.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const target = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={`Switch to ${target} mode`}
      title={`Switch to ${target} mode`}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

// Feather-style geometric glyphs (MIT). Stroke = currentColor so they inherit --text-primary.
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" />
      <line x1="12" y1="1.5" x2="12" y2="3.5" />
      <line x1="12" y1="20.5" x2="12" y2="22.5" />
      <line x1="3.9" y1="3.9" x2="5.3" y2="5.3" />
      <line x1="18.7" y1="18.7" x2="20.1" y2="20.1" />
      <line x1="1.5" y1="12" x2="3.5" y2="12" />
      <line x1="20.5" y1="12" x2="22.5" y2="12" />
      <line x1="3.9" y1="20.1" x2="5.3" y2="18.7" />
      <line x1="18.7" y1="5.3" x2="20.1" y2="3.9" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
