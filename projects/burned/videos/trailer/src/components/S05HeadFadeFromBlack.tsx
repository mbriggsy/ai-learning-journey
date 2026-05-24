import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { EASE_IN_OUT_FN } from '../lib/animations'

/**
 * S05-internal full-screen black overlay that fades OUT on head frames
 * (scene-relative 0-15 by default). The closing brace of the through-
 * black chapter-break grammar that S04TailFadeToBlack opens.
 *
 * S04TailFadeToBlack lands at full opacity-1 black at scene-rel 990 of
 * S04 (= absolute frame 2370 = S05_START). Without this matching head
 * overlay, S05 frame 0 = the gameplay clip's first frame — almost
 * certainly a bright BURNED-board UI frame. Frame 2369 = full black →
 * frame 2370 = bright UI is EXACTLY the perceptual jump the tail fade
 * was designed to mask in the first place. The fade-through-black
 * grammar only works if BOTH sides go through black.
 *
 * MANDATORY per Phase 4 Unit 4.6 amendment TIER 1 #5 (adversarial
 * conf 0.88). `pnpm verify:s05-head-fade` greps the scene file to
 * confirm the overlay is wired (anti-regression CI gate).
 *
 * Symmetric duration with S04TailFadeToBlack (15 frames each side) is
 * intentional — emil's asymmetric enter/exit rule prefers fast-exit
 * for UI feedback, but this is NOT a UI press; it's a deliberate
 * cinematic chapter break. Symmetric is the Archer grammar.
 */
export const S05HeadFadeFromBlack: React.FC<{
  /** Last frame at which the overlay is non-zero; opacity reaches 0 here. Default 15 = 0.5s @ 30fps. */
  endFrame?: number
}> = ({ endFrame = 15 }) => {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, endFrame], [1, 0], {
    easing: EASE_IN_OUT_FN,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  if (opacity <= 0) return null

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000',
        opacity,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    />
  )
}
