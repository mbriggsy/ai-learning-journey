import type { PropsWithChildren } from 'react'

/**
 * Placeholder for reduced-motion context. Currently a passthrough.
 * Will wrap children with context when consumer hook is wired.
 */
export function ReducedMotionProvider({ children }: PropsWithChildren) {
  return children
}
