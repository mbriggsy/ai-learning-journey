import type { Transition } from 'motion/react'

// ---------------------------------------------------------------------------
// Named Motion Presets — starting points, tuned during execution
// ---------------------------------------------------------------------------

export const MOTION = {
  // Tier 2 — Action animations
  DELIBERATE: { type: 'spring', stiffness: 250, damping: 25 } as const,  // placing a bet
  IMPACT: { duration: 0.15, ease: [0.22, 1, 0.36, 1] as const } as const,  // Nope SLAM — hard stop
  SNAPPY: { type: 'spring', stiffness: 300, damping: 24 } as const,       // hand entry/exit

  // Tier 3 — Theatrical animations
  TENSION: { type: 'spring', stiffness: 100, damping: 12 } as const,      // EK flip — heavy, inevitable
  RELIEF: { type: 'spring', stiffness: 200, damping: 30 } as const,       // Defuse — overdamped exhale
  ANTICIPATION: { type: 'spring', stiffness: 400, damping: 15 } as const, // EK lift — taut

  // Utility
  INSTANT: { duration: 0 } as const,  // reduced motion / reconnection
} as const satisfies Record<string, Transition>
