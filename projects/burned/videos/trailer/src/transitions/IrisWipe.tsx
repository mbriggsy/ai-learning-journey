import React, { useId } from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { EASE_IN_OUT_FN } from '../lib/animations'

/**
 * Iris wipe — Phase 4 Unit 4.8 single source per amendment SA-5.
 * S06 imports this; NO inline duplicate per the deepening lock.
 *
 * Genre-classical 60s spy-film closing grammar. SVG mask with
 * interpolated circle radius. `'opening'` reveals scene from a
 * pinhole at center (radius 0 → diagonal); `'closing'` collapses
 * the visible frame to a pinhole (diagonal → 0).
 *
 * `useId()` ensures a unique `mask` id per mount so multiple
 * iris-wipes can co-exist (S04 cascade / S06 closing) without
 * SVG-id collisions.
 *
 * Z-index sits ABOVE scene content (`zIndex: 1000`) so the iris
 * mask paints the black surround on top of scene chrome — the
 * underlying scene isn't dimmed, just framed by the iris.
 *
 * Diagonal radius uses `useVideoConfig` (NOT hard-coded 960/540)
 * so the same component works in 1080p preview and 4K master
 * renders without recomputing the pinhole reach.
 */
export const IrisWipe: React.FC<{
  /** Scene-relative frame the wipe begins. */
  fromFrame: number
  /** Scene-relative frame the wipe completes. */
  toFrame: number
  /** `'opening'`: black → visible. `'closing'`: visible → black. */
  direction: 'opening' | 'closing'
}> = ({ fromFrame, toFrame, direction }) => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const maxRadius = Math.hypot(width, height) / 2 + 8 // +8 px overshoot to clear corner antialiasing
  const maskId = `iris-${useId().replace(/:/g, '')}` // useId returns ":r0:" which is invalid in SVG id attrs

  const radius =
    direction === 'opening'
      ? interpolate(frame, [fromFrame, toFrame], [0, maxRadius], {
          easing: EASE_IN_OUT_FN,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : interpolate(frame, [fromFrame, toFrame], [maxRadius, 0], {
          easing: EASE_IN_OUT_FN,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })

  return (
    <AbsoluteFill style={{ zIndex: 1000, pointerEvents: 'none' }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            {/* White = visible black surround. Black = transparent (scene shows through). */}
            <rect width="100%" height="100%" fill="white" />
            <circle cx={width / 2} cy={height / 2} r={radius} fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="#000" mask={`url(#${maskId})`} />
      </svg>
    </AbsoluteFill>
  )
}
