import type { Transition } from 'motion/react'

// ---------------------------------------------------------------------------
// Named Motion Presets — starting points, tuned during execution
// ---------------------------------------------------------------------------

export const MOTION = {
  DELIBERATE: { type: 'spring', stiffness: 250, damping: 25 } as const,
  SNAPPY: { type: 'spring', stiffness: 300, damping: 24 } as const,
} as const satisfies Record<string, Transition>
