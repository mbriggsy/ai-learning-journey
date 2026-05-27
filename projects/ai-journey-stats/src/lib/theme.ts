export type Theme = 'light' | 'dark'

function isTheme(v: string | null | undefined): v is Theme {
  return v === 'light' || v === 'dark'
}

/**
 * Resolve the theme to apply BEFORE first paint (no FOUC). Precedence:
 *   1. `?theme=` URL override (dev / sharing a specific mode) — wins, not persisted.
 *   2. localStorage choice (the user toggled on a previous visit).
 *   3. null → leave NO data-theme attr → the @media (prefers-color-scheme) block follows the OS.
 *
 * Returning null (not a hard default) is deliberate: it hands the OS-default path to the CSS
 * @media query, so an unconfigured visitor always gets their system preference, never a guess.
 */
export function resolveInitialTheme(forced: string | null, stored: string | null): Theme | null {
  if (isTheme(forced)) return forced
  if (isTheme(stored)) return stored
  return null
}

export function nextTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark'
}
