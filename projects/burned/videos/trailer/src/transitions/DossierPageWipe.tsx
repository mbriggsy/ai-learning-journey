import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { EASE_IN_OUT_FN } from '../lib/animations'
import { DOSSIER_WIPE_FRAMES } from '../lib/transitions'

/**
 * Mid-scene dossier-page wipe — scene-internal transition overlay for
 * S03's "S03-roster" → "S03-deck" content split (between the two Dash
 * VO segments per Phase 2 audio-manifest).
 *
 * Per Phase 1 Unit 1.4 lock: 16-frame duration (0.53 s at 30 fps; below
 * 10 frames reads as a flicker, not a physical page turn). Page-peel
 * metaphor: left-to-right horizontal sweep via a moving cream-12 panel
 * with subtle warm shadow at its trailing edge.
 *
 * The wipe sits ABOVE the scene's existing content during its active
 * frames and leaves a clean slate underneath when complete. Consumers
 * place this overlay AFTER the content layers in the JSX tree so the
 * panel paints on top.
 */
export const DossierPageWipe: React.FC<{
  startFrame: number
  durationFrames?: number
}> = ({ startFrame, durationFrames = DOSSIER_WIPE_FRAMES }) => {
  const frame = useCurrentFrame()

  // 0 → 1 progress through the wipe window. clamp before/after so the
  // panel sits off-screen left at idle and off-screen right after settle.
  const progress = interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    easing: EASE_IN_OUT_FN,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Panel spans 120% canvas width; translateX from -120% to +120% so
  // both the entry and exit edges are off-screen at the endpoints.
  // The visible window (when the trailing edge crosses center) is the
  // ~4 frames around progress=0.5.
  const translatePct = interpolate(progress, [0, 1], [-120, 120])

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '120%',
          height: '100%',
          backgroundColor: '#f6ebce', // cream-12 paper face
          // Warm ochre shadow on the trailing (left) edge as the panel sweeps right.
          boxShadow: '-24px 0 48px rgba(148, 114, 38, 0.45)',
          transform: `translateX(${translatePct}%)`,
        }}
      />
    </AbsoluteFill>
  )
}
