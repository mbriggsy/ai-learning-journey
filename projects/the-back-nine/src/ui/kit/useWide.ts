/**
 * src/ui/kit/useWide.ts: whether the window is past the phone shape (plan 3.1's phone tier, `--breakpoint-wide` in
 * theme.css). CSS decides every layout by itself; this hook exists only for the one part that changes WHAT it
 * renders, not how: the Action Items tray, a panel under the frame on a wide window and a full-height bottom sheet on
 * the phone (ref 2.21). The query is the tier's own rem width (scripts/__tests__/breakpoint-mirrors.test.ts binds it).
 * With no `matchMedia` (jsdom) it reads wide, the laptop shape.
 */
import { useSyncExternalStore } from 'react'

export const WIDE_QUERY = '(min-width: 48rem)'

function mediaList(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(WIDE_QUERY) : null
}

function subscribe(onChange: () => void): () => void {
  const list = mediaList()
  if (list === null) return () => {}
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

const read = (): boolean => mediaList()?.matches ?? true

export function useWide(): boolean {
  return useSyncExternalStore(subscribe, read, () => true)
}
