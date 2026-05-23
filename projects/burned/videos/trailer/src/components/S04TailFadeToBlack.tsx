import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { EASE_IN_OUT_FN } from '../lib/animations'

/**
 * S04-internal full-screen black overlay that fades in on tail frames
 * (scene-relative 975-990 by default). Masks the visual palette jump
 * from briefing-room S04 → BURNED-board S05 at the hard cut to
 * gameplay clip at absolute frame 2370 (= scene-rel 990).
 *
 * Per amendment MA-1 + adversarial Finding 3: a pure hard cut at the
 * S04→S05 boundary produces a visible palette jump that even a
 * 0.5 dB music dip can't fully mask. ADR #11 endorses scene-internal
 * overlays as the transition tool.
 *
 * **REQUIRED PAIRING** with `S05HeadFadeFromBlack` (Unit 4.6) — opacity
 * 1 → 0 over S05 frames 0-15 — for a 15+15 = 30-frame "fade through
 * black" Archer chapter-break. Without the matching S05 head, frame
 * 2369 = black → frame 2370 = bright UI is the exact perceptual
 * glitch this overlay was designed to mask.
 */
export const S04TailFadeToBlack: React.FC<{
  /** Scene-relative start frame. Default 975 (15f before scene end at 990). */
  startFrame?: number
  /** Total fade duration in frames. Default 15. */
  durationFrames?: number
}> = ({ startFrame = 975, durationFrames = 15 }) => {
  const frame = useCurrentFrame()
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    {
      easing: EASE_IN_OUT_FN,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  )

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
