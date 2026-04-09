/**
 * Screen reader announcements via persistent aria-live regions.
 * Regions are mounted in HTML (never dynamically) to ensure browser compatibility.
 */

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const el = document.getElementById(priority === 'assertive' ? 'sr-assertive' : 'sr-polite')
  if (el) {
    // Clear and re-set to ensure announcement even with same text
    el.textContent = ''
    requestAnimationFrame(() => {
      el.textContent = message
    })
  }
}
