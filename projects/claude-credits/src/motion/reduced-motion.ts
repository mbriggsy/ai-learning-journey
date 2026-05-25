// Single source of truth for the reduced-motion check. Components import this and
// skip/instant-complete motion when it returns true. CSS net in global.css backstops.
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
