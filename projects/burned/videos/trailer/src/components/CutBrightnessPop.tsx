import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'

/**
 * 2-frame brightness pop at scene cuts (Phase 0 Unit 0.3 cold-open).
 *
 * Archer title-sequence convention: hard cuts carry a subtle white-overlay
 * flash at the edit point, reading as edit-impact rather than crossfade.
 * Implemented as a white AbsoluteFill whose opacity ramps 0 → 0.45 → 0
 * across 3 frames at composition-local frame 0 (i.e. the first frame of
 * the new scene). Anything past frame 2 holds at opacity 0.
 *
 * Motion principle (emil): hard cuts are valid when the mood demands
 * them. Don't soften with blur — that breaks the SHARP convention.
 * 0.45 peak opacity stays subliminal; bright enough to register, dim
 * enough not to bleach the underlying portrait.
 *
 * Usage: mount as the last child of a Series.Sequence — it fires at the
 * sequence's local frame 0 (i.e. the moment of the cut) and is invisible
 * past frame 2.
 */
export const CutBrightnessPop: React.FC = () => {
  const frame = useCurrentFrame()

  const opacity = interpolate(frame, [0, 1, 2], [0, 0.45, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  if (opacity <= 0.001) return null

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#ffffff',
        opacity,
        pointerEvents: 'none',
      }}
    />
  )
}
