import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { EASE_OUT_EMIL, STAMP_SLAP } from '../lib/animations'
import { PALETTE } from '../lib/colors'

/**
 * R15 chrome classification stamp (Phase 0 Unit 0.3 cold-open).
 *
 * Three-line stamp set in Clash Display, ochre ink on cream-paper
 * background. Lands at composition-local frame 0 with the locked
 * STAMP_SLAP envelope (rotate −8° → −3° + scale 0.95 → 1.04 → 1.0
 * across 12 frames, emil EASE_OUT). All three lines fade together with
 * the wrapper's opacity ramp — no internal stagger; the stamp is ONE
 * impactful unit, internal stagger would fight the single-slap identity.
 *
 * Plan source: docs/plans/origin-trailer/phase-0-gate-resolution.md
 * §Unit 0.3 Step 2 R15 stamp inventory ("OPERATION PENDLETON / CASE
 * FILE 02 / METHOD: AUTONOMOUS", bottom-third placement, BURNED
 * orange/teal, Clash Display).
 *
 * Bottom-third placement = Archer classification-stamp convention.
 * R15 #1 of 4 across the full trailer (Phase 1 owns the rest).
 *
 * Reuses STAMP_SLAP envelope + emil EASE_OUT from Unit 0.5 spike's
 * SpikeStampSlap component — same motion contract, different content.
 */
export const R15ChromeStamp: React.FC = () => {
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

  // 3-frame opacity ramp so the slap arrival reads as impact, not teleport
  const opacity = interpolate(frame, [0, 3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        // Bottom-third placement per plan §Step 2 + Archer convention
        paddingBottom: 144,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          padding: '28px 56px',
          backgroundColor: PALETTE.cream12,
          border: `6px solid ${PALETTE.ochre9}`,
          color: PALETTE.ochre9,
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 700,
          textAlign: 'center',
          letterSpacing: '0.10em',
          // Concentric inner keyline — Archer stencil convention
          boxShadow: `inset 0 0 0 3px ${PALETTE.ochre9}`,
          transformOrigin: 'center',
          transform: `rotate(${rotate}deg) scale(${scale})`,
          opacity,
          lineHeight: 1.1,
        }}
      >
        <div style={{ fontSize: 36 }}>OPERATION PENDLETON</div>
        <div style={{ fontSize: 30, marginTop: 8, opacity: 0.85 }}>CASE FILE 02</div>
        <div
          style={{
            fontSize: 44,
            marginTop: 12,
            paddingTop: 12,
            borderTop: `2px solid ${PALETTE.ochre9}`,
            letterSpacing: '0.14em',
          }}
        >
          METHOD: AUTONOMOUS
        </div>
      </div>
    </AbsoluteFill>
  )
}
