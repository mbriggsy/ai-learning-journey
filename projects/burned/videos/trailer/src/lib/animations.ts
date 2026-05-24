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
import { Easing, interpolate, type SpringConfig } from 'remotion'

// emil EASE_OUT — cubic-bezier(0.16, 1, 0.3, 1)
// MUST match `timing.ts`'s `EASE_OUT` CSS string (sync invariant pinned by
// `timing.test.ts`). See insight #057 — spike-wins on the coefficient lock.
export const EASE_OUT_EMIL = Easing.bezier(0.16, 1, 0.3, 1)

// Standard CSS ease-out for fade ramps
export const EASE_OUT_QUAD = Easing.bezier(0.25, 0.1, 0.25, 1)

// Drawer feel for surface reveals (folder open, dossier wipe). Function
// form of `timing.ts`'s `EASE_DRAWER` CSS string — same coefficients.
// Used by interpolate({ easing: EASE_DRAWER_FN, ... }) consumers.
export const EASE_DRAWER_FN = Easing.bezier(0.32, 0.72, 0, 1)

// Page-wipe / iris feel. Function form of `timing.ts`'s `EASE_IN_OUT`.
export const EASE_IN_OUT_FN = Easing.bezier(0.77, 0, 0.175, 1)

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

/**
 * Heavy stamp-slap envelope — variant for the R3 stacked-payoff stamp
 * (S04 frame 2280). Deeper start scale (0.85 vs 0.95) + higher overshoot
 * (1.06 vs 1.04) carry more dramatic weight at the trailer's load-bearing
 * moment. 16-frame envelope (vs 12 standard) per `transitions.ts`
 * `STAMP_SLAP_HEAVY_FRAMES` Phase 1 lock.
 *
 * Same shape (scaleStart → scalePeak → scaleSettle) — heavier values.
 */
export const STAMP_SLAP_PAYOFF = {
  durationFrames: 16,
  scaleStart: 0.85,
  scalePeak: 1.06,
  scaleSettle: 1.0,
  rotateStart: -8,
  rotateEnd: -3,
  keyframes: {
    scaleInEnd: 8, // 0 → 8: scale 0.85 → 1.06
    settleEnd: 13, // 8 → 13: scale 1.06 → 1.0
    holdEnd: 16, // 13 → 16: hold at 1.0
  },
} as const

/**
 * Spring config for the S01 cold-open BURNED-card reveal at frame 180.
 *
 * Snappy by design — distinct vocabulary from S06's closing card
 * (which lands settled, not snappy, per the wordmark-final-bookend
 * grammar). Cold-open BURNED card reveal IS the cold-open hook
 * payoff; LOGO_SPRING_COLD spring overshoots ~6% then settles fast
 * (~0.5s perceived). Pairs with LOGO_SPRING_CLOSING below — the
 * cold-open vocabulary is the snap, the closing-card vocabulary is
 * the settle.
 */
export const LOGO_SPRING_COLD: SpringConfig = {
  mass: 0.5,
  damping: 11,
  stiffness: 200,
  overshootClamping: false,
}

/**
 * Spring config for the S06 closing BURNED wordmark land at scene-
 * relative frame 200 (= absolute 3110).
 *
 * SETTLED, NOT snappy per Phase 4 plan amendment SA-9. Heavier mass
 * + much higher damping + lower stiffness vs LOGO_SPRING_COLD —
 * reads as the wordmark "arriving with weight" rather than "popping
 * in." Spring reaches ~0.6 progress around frame 8 and lands settled
 * by frame ~20, giving the cinematic feel emil calls "match motion
 * to mood — closing should breathe."
 *
 * Used as the temporal driver for a manual scale interpolation
 * 0.95 → 1.04 → 1.0 (Phase 1 lock) in S06_ClosingDirective.tsx.
 * `overshootClamping: false` so the spring can still kiss the 1.04
 * peak; the manual scale envelope shapes the actual peak/settle
 * geometry on top of the spring's temporal curve.
 */
export const LOGO_SPRING_CLOSING: SpringConfig = {
  mass: 0.9,
  damping: 18,
  stiffness: 110,
  overshootClamping: false,
}

/**
 * Archer-grammar stamp-slap motion helper. Returns scale + rotate +
 * opacity per local frame for a stamp that lands at `landFrame`.
 *
 * The wrapper component applies these to a SINGLE
 * `transform: scale() rotate()` so split-layer SVGs (frame.svg +
 * text.svg) stay locked together through the overshoot. `tiltDeg`
 * adds a per-stamp baseline tilt to the envelope's rotateStart/End
 * (typical R15 tilts: -12, -8, -10, -6).
 *
 * Variant 'payoff' selects the heavier `STAMP_SLAP_PAYOFF` envelope —
 * used for the S04 R3 stacked-payoff stamp. Standard variant covers
 * R15 #1 (S01), R15 #2 (S04 comms ticker), R15 #4 (S06 closing).
 */
export function archerStampSlap({
  frame,
  landFrame,
  tiltDeg = 0,
  variant = 'standard',
}: {
  frame: number
  landFrame: number
  tiltDeg?: number
  variant?: 'standard' | 'payoff'
}): { scale: number; rotate: number; opacity: number } {
  const local = frame - landFrame
  const env = variant === 'payoff' ? STAMP_SLAP_PAYOFF : STAMP_SLAP

  const scale = interpolate(
    local,
    [0, env.keyframes.scaleInEnd, env.keyframes.settleEnd, env.keyframes.holdEnd],
    [env.scaleStart, env.scalePeak, env.scaleSettle, env.scaleSettle],
    { easing: EASE_OUT_EMIL, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  const rotate = interpolate(
    local,
    [0, env.keyframes.holdEnd],
    [env.rotateStart + tiltDeg, env.rotateEnd + tiltDeg],
    { easing: EASE_OUT_EMIL, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  // 3-frame opacity ramp so the slap reads as impact, not teleport.
  const opacity = interpolate(local, [0, 3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return { scale, rotate, opacity }
}
