import React from 'react'
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { EASE_OUT_EMIL } from '../lib/animations'
import { PALETTE } from '../lib/colors'

/**
 * Phase 0 Unit 0.5(d) — HTP dossier scroll cascade.
 *
 * Render-validates the Playwright-captured BURNED HTP fullpage PNG
 * resolving via `staticFile()` and animating via translateY interpolation.
 * Phase 3 Unit 3.1 owns production scroll math; the spike's 800-px
 * scroll over the duration is a viability check, not the final cadence.
 *
 * Image path: `public/trailer/htp-fullpage.png` per ADR #15 (Phase 3
 * deepening) — trailer-only assets land at `public/trailer/...` so the
 * single `setPublicDir('../../public')` ADR #8 resolution serves both
 * game assets (`staticFile('assets/...')`) and trailer assets
 * (`staticFile('trailer/...')`).
 */
const SCROLL_PX = 800

export const SpikeHtpCascade: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame()
  const translateY = interpolate(frame, [0, durationFrames], [0, -SCROLL_PX], {
    easing: EASE_OUT_EMIL,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.cream12, overflow: 'hidden' }}>
      <Img
        src={staticFile('trailer/htp-fullpage.png')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1920,
          transform: `translateY(${translateY}px)`,
        }}
      />

      {/* Top edge gradient — softens the cropped page top */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(246,235,206,0.0) 70%, rgba(246,235,206,0.85) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 60,
          bottom: 60,
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 200,
          fontSize: 28,
          color: PALETTE.cream5,
          letterSpacing: '0.32em',
        }}
      >
        // OPERATIONS MANUAL
      </div>
    </AbsoluteFill>
  )
}
