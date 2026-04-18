import { useSyncExternalStore } from 'react'

/** Shared drama-activity state. `DramaOverlay` flips this true while it
 *  is playing an overlay (e.g. BURNED → EXTRACTED) and false when the
 *  queue empties. Bottom-sheet consumers gate their appearance on this
 *  so prompts don't cover an in-flight drama moment.
 *
 *  Kept in its own module so consumers can read the flag without pulling
 *  GSAP in eagerly — `DramaOverlay` itself remains lazy-loaded. */

let dramaActive = false
const listeners = new Set<() => void>()

export function setDramaActive(next: boolean): void {
  if (dramaActive === next) return
  dramaActive = next
  for (const l of listeners) l()
}

export function useDramaActive(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    () => dramaActive,
    () => false,
  )
}
