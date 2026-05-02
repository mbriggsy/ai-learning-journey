/**
 * Screen reader announcements via persistent aria-live regions.
 * Regions are mounted in HTML (never dynamically) to ensure browser compatibility.
 *
 * Live-region content is cleared after a delay (longer than any plausible SR
 * read time) so stale text does not linger in the accessibility tree across
 * unrelated game events. Without the cleanup, an old message remains
 * navigable as standalone text — and calibration agents reading aria
 * snapshots conflate it with currently-visible UI (triage #003 root cause).
 * Screen readers re-announce on textContent change; the persistent text
 * after that is just cruft.
 */

const STALE_CLEAR_MS = 5_000

const clearTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const id = priority === 'assertive' ? 'sr-assertive' : 'sr-polite'
  const el = document.getElementById(id)
  if (!el) return

  // Cancel any pending stale-clear from a prior announcement at this priority,
  // so a new message isn't wiped early by the previous announce's cleanup.
  const prev = clearTimers.get(id)
  if (prev !== undefined) clearTimeout(prev)

  // Clear and re-set to ensure announcement even with same text.
  el.textContent = ''
  requestAnimationFrame(() => {
    el.textContent = message
    const timer = setTimeout(() => {
      el.textContent = ''
      clearTimers.delete(id)
    }, STALE_CLEAR_MS)
    clearTimers.set(id, timer)
  })
}
