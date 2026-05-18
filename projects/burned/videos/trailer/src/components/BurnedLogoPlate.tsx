import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { EASE_OUT_EMIL } from '../lib/animations'
import { PALETTE } from '../lib/colors'

/**
 * BURNED title plate placeholder (Phase 0 Unit 0.3 cold-open).
 *
 * Typeset BURNED in Clash Display 700, wide letterspacing (~0.14em),
 * cream on dark-teal ground. Structural placeholder for the Phase 3
 * final title-SVG; the spike validates LAYOUT + SCALE + TYPE WEIGHT,
 * not final mark.
 *
 * Mid-century geometric vocabulary (Bass / Ferro lineage per plan):
 * heavy weight + wide tracking + cream/teal contrast carries the
 * structural shape Phase 3 will refine into a custom mark.
 *
 * Entry motion (emil-aligned): scale 0.92 → 1.0 + opacity 0 → 1 across
 * 20 frames, emil EASE_OUT. Settles at frame 20 — BEFORE the R15 stamp
 * lands at frame ~27 of the held card window (composition frame 75).
 * Never `scale(0)`; floor at 0.92 matches the stamp-slap floor for
 * cohesion of motion vocabulary.
 *
 * Subtle keyline border around the plate at low opacity — reads as
 * "this is a title plate, not just text on a background."
 */
const ENTRY_FRAMES = 20
const SCALE_START = 0.92

export const BurnedLogoPlate: React.FC = () => {
  const frame = useCurrentFrame()

  const scale = interpolate(frame, [0, ENTRY_FRAMES], [SCALE_START, 1], {
    easing: EASE_OUT_EMIL,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const opacity = interpolate(frame, [0, ENTRY_FRAMES], [0, 1], {
    easing: EASE_OUT_EMIL,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        backgroundColor: PALETTE.teal2,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          transformOrigin: 'center',
          transform: `scale(${scale})`,
          opacity,
          // Thin keyline frame for "title plate" reading
          padding: '80px 120px',
          border: `2px solid ${PALETTE.cream11}`,
          boxShadow: `inset 0 0 0 1px ${PALETTE.teal4}`,
          backgroundColor: PALETTE.teal2,
        }}
      >
        <div
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 700,
            fontSize: 220,
            letterSpacing: '0.14em',
            color: PALETTE.cream12,
            lineHeight: 1,
            // Slight optical-shift compensation for wide tracking trailing edge
            paddingRight: '0.14em',
          }}
        >
          BURNED
        </div>
        <div
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 200,
            fontSize: 24,
            letterSpacing: '0.30em',
            color: PALETTE.cream11,
            textAlign: 'center',
            marginTop: 24,
            paddingRight: '0.30em',
          }}
        >
          A PENDLETON DOSSIER
        </div>
      </div>
    </AbsoluteFill>
  )
}
