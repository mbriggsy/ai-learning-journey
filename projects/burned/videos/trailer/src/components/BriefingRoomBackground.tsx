import React from 'react'
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { EASE_OUT_EMIL } from '../lib/animations'

/**
 * Briefing-room establishing background — shared across S02 + S03 + S06.
 *
 * Layers (bottom-up):
 *   1. Mahogany horizontal desk (existing BURNED asset per amendment MA-4 +
 *      Phase 3 deepening repo-research Finding 6). Full-bleed.
 *   2. Venetian-blind shadow (Phase 3 Unit 3.3 NEW asset). Translates
 *      horizontally at 1.5-2px/frame (Phase 1 deepening lock — survives
 *      H.264 encoding) simulating sun arcing across blinds. Opacity 0.6
 *      so the warm mahogany reads through.
 *
 * The slow translateX is scene-relative, not absolute composition frame —
 * each consuming scene gets a fresh 0-frame start. EASE_OUT_EMIL applies
 * to the first ~half of the pan so the motion has subtle deceleration
 * rather than pure linear (avoids the "screensaver pan" tell per emil).
 *
 * Scale of the blind layer is slightly oversized (105%) so the
 * translateX drift doesn't reveal the SVG's left edge mid-pan.
 */

const PAN_PX_PER_SCENE = 60 // total drift over the scene duration

export const BriefingRoomBackground: React.FC = () => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  // Drift across the full scene duration. EASE_OUT_EMIL on the front half
  // gives an organic "sun moving" feel — fast initial then slowing.
  const shadowOffset = interpolate(frame, [0, durationInFrames - 1], [0, PAN_PX_PER_SCENE], {
    easing: EASE_OUT_EMIL,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill>
      {/* Mahogany desk surface — warm base */}
      <Img
        src={staticFile('assets/arena/mahogany-horizontal.png')}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* Venetian-blind shadow — drifts left-to-right as the sun arcs */}
      <Img
        src={staticFile('trailer/briefing-room/venetian-blinds.svg')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '105%',
          height: '105%',
          transform: `translateX(${shadowOffset}px)`,
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  )
}
