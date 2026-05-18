import React from 'react'
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { EASE_OUT_EMIL } from '../lib/animations'
import { PALETTE } from '../lib/colors'

/**
 * Iris wipe — Phase 0 Unit 0.5(e) sub-clip 2.
 *
 * Genre-classical 60s spy-film grammar. Pure Remotion via inline SVG
 * `<clipPath>` with an interpolated `r` radius on a `<circle>`.
 * Iris OPENS over 24 frames (point → cover the diagonal), holds 6f.
 *
 * Spike validates RENDER in MP4 export — Phase 4 may revisit if the
 * SVG mask compositing produces edge artifacts at 1080p.
 */
export const SpikeIrisWipe: React.FC = () => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const diag = Math.hypot(width, height) / 2 + 8 // cover full frame plus 8px overshoot

  const r = interpolate(frame, [0, 24], [0, diag], {
    easing: EASE_OUT_EMIL,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Each browser SVG needs a stable id; tie it to this composition mount.
  const clipId = 'spike-iris-clip'

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.black }}>
      {/* SVG clipPath consumed by the revealed image */}
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <clipPath id={clipId}>
            <circle cx={width / 2} cy={height / 2} r={r} />
          </clipPath>
        </defs>
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: `url(#${clipId})`,
        }}
      >
        <Img
          src={staticFile('assets/arena/mahogany-horizontal.png')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(12, 32, 36, 0.4)',
            mixBlendMode: 'multiply',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '8%',
            textAlign: 'center',
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 600,
            fontSize: 80,
            letterSpacing: '0.16em',
            color: PALETTE.cream12,
            textShadow: '0 4px 24px rgba(0,0,0,0.6)',
          }}
        >
          THE PENDLETON AGENCY
        </div>
      </div>
    </AbsoluteFill>
  )
}
