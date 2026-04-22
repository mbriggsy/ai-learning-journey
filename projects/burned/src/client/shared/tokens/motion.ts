/**
 * Motion tokens — TypeScript source of truth for Framer Motion.
 *
 * CSS custom properties in primitives.css mirror these values for plain-CSS
 * consumers (@keyframes, transition declarations). motion-token-sync.test.ts
 * enforces that TS and CSS surfaces never drift.
 */

import type { Transition, Easing } from 'motion/react'

// Key unions — single source of truth.
export const DURATION_NAMES = [
  'fast', 'base', 'slow', 'dramatic',
  'dots', 'ambient', 'pulse', 'pulseSlow',
  'essentialPulse', 'essentialSpin', 'essentialFlash',
] as const
export type DurationName = typeof DURATION_NAMES[number]

export const EASING_NAMES = [
  'base', 'emphasized', 'decelerate', 'accelerate', 'anticipate',
] as const
export type EasingName = typeof EASING_NAMES[number]

export const SPRING_NAMES = [
  'snappy', 'deliberate', 'punchy', 'gentle', 'dragMomentum',
] as const
export type SpringName = typeof SPRING_NAMES[number]

export const PRESET_NAMES = [
  'quickFade', 'enter', 'exit', 'dramatic',
  'snappy', 'deliberate', 'punchy', 'gentle', 'dragMomentum',
] as const
export type PresetName = typeof PRESET_NAMES[number]

// Durations in seconds (Framer Motion unit).
export const MOTION_DURATIONS = {
  // Decorative — zeroed under prefers-reduced-motion.
  fast:           0.15,
  base:           0.25,
  slow:           0.4,
  dramatic:       0.8,

  // Named durations for specific Phase 3-4 consumers.
  dots:           1.5,
  ambient:        4.0,
  pulse:          1.4,
  pulseSlow:      2.5,

  // Essential — survives prefers-reduced-motion. Spinners tuned to 0.7s
  // (Emil's perceived-speed rule: faster spin = faster-feeling app).
  essentialPulse: 1.4,
  essentialSpin:  0.7,
  essentialFlash: 0.2,
} as const satisfies Record<DurationName, number>

// Cubic-bezier easings. BezierDefinition = readonly [number, number, number, number]
// which is exactly what `as const` produces — no inline cast needed.
export const MOTION_EASINGS = {
  base:        [0.32, 0.72, 0, 1],
  emphasized:  [0.2, 0, 0, 1],
  decelerate:  [0.23, 1, 0.32, 1],
  accelerate:  [0.4, 0, 1, 1],
  anticipate:  [0.68, -0.55, 0.265, 1.55],
} as const satisfies Record<EasingName, Easing>

// Springs — type: 'spring' + stiffness + damping.
export const MOTION_SPRINGS = {
  /** Snappy — button presses, small UI state changes */
  snappy:     { type: 'spring', stiffness: 300, damping: 24 },
  /** Deliberate — card plays, panel transitions, mid-size movement */
  deliberate: { type: 'spring', stiffness: 250, damping: 25 },
  /** Punchy — dramatic pops (EliminatedView skull, DramaOverlay entrances).
      Crisp arrival with minimal overshoot. Archer is deadpan — not cartoonish. */
  punchy:     { type: 'spring', stiffness: 280, damping: 24 },
  /** Gentle — large-scale welcomes (GameOver winner reveal) */
  gentle:     { type: 'spring', stiffness: 200, damping: 20 },
  /** Drag momentum — interruptible drag/gesture release. Apple-style: duration
      + subtle bounce. Maintains velocity if interrupted mid-motion. */
  dragMomentum: { type: 'spring', duration: 0.5, bounce: 0.15 },
} as const satisfies Record<SpringName, Transition>

/** Named presets combining duration + easing for common cases */
export const MOTION = {
  /** Quick CSS transition equivalent */
  quickFade:   { duration: MOTION_DURATIONS.fast,     ease: MOTION_EASINGS.base },
  /** Standard enter transition */
  enter:       { duration: MOTION_DURATIONS.base,     ease: MOTION_EASINGS.decelerate },
  /** Standard exit transition — strong ease-out, not ease-in. ease-in on UI exits
      delays the moment the user sees the element leave, which reads as sluggish. */
  exit:        { duration: MOTION_DURATIONS.fast,     ease: MOTION_EASINGS.decelerate },
  /** Full attention — use sparingly for high-drama moments */
  dramatic:    { duration: MOTION_DURATIONS.dramatic, ease: MOTION_EASINGS.emphasized },

  /** Spring-based — consume directly */
  snappy:       MOTION_SPRINGS.snappy,
  deliberate:   MOTION_SPRINGS.deliberate,
  punchy:       MOTION_SPRINGS.punchy,
  gentle:       MOTION_SPRINGS.gentle,
  dragMomentum: MOTION_SPRINGS.dragMomentum,
} as const satisfies Record<PresetName, Transition>
