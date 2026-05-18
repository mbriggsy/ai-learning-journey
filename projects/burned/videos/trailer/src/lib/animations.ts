/**
 * Animation primitives — emil curves + envelopes.
 *
 * Locked at Phase 0 Unit 0.5 spike per Phase 1 deepening + plan §Approach
 * "Stamp-slap mechanical shape contract". Phase 4 inherits these
 * primitives so the spike-validated motion shape transfers to production
 * without re-decoding.
 *
 * EASE_OUT_EMIL is the Vercel/emil "snappy" curve — fast departure, soft
 * settle. Used for stamp-slap landing, iris-wipe close, kinetic-type
 * word reveal. Matches BURNED's `MOTION_EASINGS.decelerate` family but
 * with sharper early slope (0.16 vs 0.23) for the "slap" feel.
 */
import { Easing } from 'remotion'

// emil EASE_OUT — cubic-bezier(0.16, 1, 0.3, 1)
export const EASE_OUT_EMIL = Easing.bezier(0.16, 1, 0.3, 1)

// Standard CSS ease-out for fade ramps
export const EASE_OUT_QUAD = Easing.bezier(0.25, 0.1, 0.25, 1)

/**
 * Stamp-slap envelope (Phase 1 Unit 1.4 lock, Phase 0 §Approach contract).
 *
 * 12 frames total — 6f scale-in (0.95 → 1.04 = overshoot), 4f settle
 * (1.04 → 1.0), 2f hold. Rotation animates -8° → -3° across the same
 * window. transform-origin: center.
 *
 * Reads as snap-and-settle at 30fps (0.4s total), not gradual.
 */
export const STAMP_SLAP = {
  /** Total animation frames (excluding pre-hold) */
  durationFrames: 12,
  scaleStart: 0.95,
  scalePeak: 1.04,
  scaleSettle: 1.0,
  rotateStart: -8, // degrees
  rotateEnd: -3,
  /** Frame breakpoints — see plan stamp-slap mechanical shape contract */
  keyframes: {
    scaleInEnd: 6, // 0 → 6: scale 0.95 → 1.04
    settleEnd: 10, // 6 → 10: scale 1.04 → 1.0
    holdEnd: 12, // 10 → 12: hold at 1.0
  },
} as const
