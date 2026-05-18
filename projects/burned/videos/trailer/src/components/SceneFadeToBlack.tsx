import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'

/**
 * Scene-internal fade-to-black overlay component — Phase 4 production
 * pattern per ADR #4 revised. Used as a child of a `<Series.Sequence>`
 * alongside the scene component, NOT as a `<TransitionSeries>`
 * presentation.
 *
 * Reaches opacity 1.0 by `startFrame + durationFrames` so the next
 * `<Series.Sequence>` begins on black.
 */
export const SceneFadeToBlack: React.FC<{
  startFrame: number
  durationFrames: number
}> = ({ startFrame, durationFrames }) => {
  const frame = useCurrentFrame()
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000',
        opacity,
        pointerEvents: 'none',
      }}
    />
  )
}
