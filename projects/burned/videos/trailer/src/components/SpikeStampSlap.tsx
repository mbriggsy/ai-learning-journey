import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { EASE_OUT_EMIL, STAMP_SLAP } from '../lib/animations'
import { PALETTE } from '../lib/colors'

/**
 * Classification-stamp slap — Phase 0 Unit 0.5(e) sub-clip 1.
 *
 * Mechanical shape per plan §Approach "Stamp-slap mechanical shape
 * contract":
 *   - rotate -8° → -3° + scale 0.95 → 1.04 → 1.0 across 12 frames
 *   - transform-origin center, emil EASE_OUT
 *   - 6f scale-in / 4f settle / 2f hold
 *
 * Spike validates RENDER (no artifacts, transform composes correctly);
 * Phase 4 owns ranking + audio thunk + final stamp SVG sourcing.
 */
export const SpikeStampSlap: React.FC = () => {
  const frame = useCurrentFrame()

  const scale = interpolate(
    frame,
    [0, STAMP_SLAP.keyframes.scaleInEnd, STAMP_SLAP.keyframes.settleEnd, STAMP_SLAP.keyframes.holdEnd],
    [STAMP_SLAP.scaleStart, STAMP_SLAP.scalePeak, STAMP_SLAP.scaleSettle, STAMP_SLAP.scaleSettle],
    { easing: EASE_OUT_EMIL, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  const rotate = interpolate(
    frame,
    [0, STAMP_SLAP.keyframes.holdEnd],
    [STAMP_SLAP.rotateStart, STAMP_SLAP.rotateEnd],
    { easing: EASE_OUT_EMIL, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  // Stamp appears at frame 0 then holds; opacity ramps in over first 3 frames
  // so the slap arrival reads as an impact, not a teleport.
  const opacity = interpolate(frame, [0, 3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        backgroundColor: PALETTE.cream12,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Background paper grain — flat for spike */}
      <div
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 200,
          fontSize: 36,
          color: PALETTE.cream5,
          position: 'absolute',
          top: 60,
          letterSpacing: '0.18em',
        }}
      >
        // PENDLETON BRIEFING
      </div>

      {/* Stamp */}
      <div
        style={{
          padding: '36px 72px',
          border: `8px solid ${PALETTE.ochre9}`,
          color: PALETTE.ochre9,
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 700,
          fontSize: 96,
          letterSpacing: '0.06em',
          transformOrigin: 'center',
          transform: `rotate(${rotate}deg) scale(${scale})`,
          opacity,
          boxShadow: `inset 0 0 0 4px ${PALETTE.ochre9}`,
          // Slight off-print stencil feel — two-tone outer/inner ring
        }}
      >
        CLASSIFIED
      </div>
    </AbsoluteFill>
  )
}
