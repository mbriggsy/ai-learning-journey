/**
 * Safe sessionStorage wrappers.
 * sessionStorage.getItem / setItem throw in Safari private browsing mode.
 * These helpers swallow the error and return sensible defaults.
 */

export function safeGetSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetSession(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable — silently ignore */
  }
}
