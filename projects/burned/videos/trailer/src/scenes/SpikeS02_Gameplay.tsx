import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { PALETTE } from '../lib/colors'

/**
 * Phase 0 Unit 0.5 — placeholder gameplay closer scene.
 *
 * The spike's job is RENDER VALIDATION. Phase 5 owns the production
 * gameplay-capture harness; this placeholder simulates the
 * post-fade-to-black gameplay reveal so the composition shape exercises
 * the second `<Series.Sequence>` slot.
 */
export const SpikeS02_Gameplay: React.FC = () => {
  const frame = useCurrentFrame()

  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        backgroundColor: PALETTE.teal2,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 200,
          fontSize: 32,
          color: PALETTE.ochre10,
          letterSpacing: '0.32em',
          marginBottom: 32,
        }}
      >
        // LIVE FOOTAGE
      </div>
      <div
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 700,
          fontSize: 144,
          color: PALETTE.cream12,
          letterSpacing: '-0.01em',
        }}
      >
        GAMEPLAY
      </div>
      <div
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 400,
          fontSize: 28,
          color: PALETTE.cream11,
          letterSpacing: '0.24em',
          marginTop: 36,
        }}
      >
        PHASE 5 INHERITS THIS SLOT
      </div>
    </AbsoluteFill>
  )
}
