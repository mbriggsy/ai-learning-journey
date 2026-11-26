/**
 * src/ui/kit/useLaptop.ts: whether the window is at the laptop tier (the `--bp-laptop` seam, `--breakpoint-laptop` in
 * theme.css), the sibling of `useWide.ts`. CSS decides every layout by itself; this hook exists only for a part that
 * changes WHAT it renders, not how: Cash Flows → Maps draws its flow only here (a Sankey narrower than the seam prints
 * its names over each other; the RC20 review measured it at 820 and 900 px) and its tiles below. The query is the
 * tier's own rem width (scripts/__tests__/breakpoint-mirrors.test.ts binds it). With no `matchMedia` (jsdom) it reads
 * laptop, as `useWide` reads wide.
 */
import { useSyncExternalStore } from 'react'

export const LAPTOP_QUERY = '(min-width: 68rem)'

function mediaList(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(LAPTOP_QUERY) : null
}

function subscribe(onChange: () => void): () => void {
  const list = mediaList()
  if (list === null) return () => {}
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

const read = (): boolean => mediaList()?.matches ?? true

export function useLaptop(): boolean {
  return useSyncExternalStore(subscribe, read, () => true)
}
