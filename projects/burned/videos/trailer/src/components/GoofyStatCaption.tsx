import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import { EASE_OUT_EMIL } from '../lib/animations'

/**
 * S04 stat caption — typographic punchline laid over the cascade. Lands
 * during the dossier-scroll buildup, holds through its read, then
 * decays to 30% chrome (NOT fade to 0) per Phase 1 design-lens
 * F-001 — preserves cascade history visual so by frame 870 the
 * lower band reads as a "stack of receipts" landing.
 *
 * Asymmetric envelope per emil/Phase 1 lock:
 *   land → land+6f: opacity 0 → 1.0 (entry ramp)
 *   land+6f → exit-12f: hold at 1.0
 *   exit-12f → exit: 1.0 → 0.30 (chrome decay; NOT to 0)
 *   exit → ∞: hold at 0.30
 * Implemented as a single 4-point interpolate with clamp on both ends.
 *
 * Visual register:
 *   - Outer wrapper: position based on anchor (lower-left/center/right) + optional verticalOffsetPx
 *   - Backdrop: semi-transparent charcoal-1 (rgba) + burned-fire left border
 *   - dryStat: Clash Display 700 uppercase 36px cream-12 (the punchline)
 *   - absurdCompanion: Clash Display 500 italic 28px cream-12 80% (the smirk)
 *
 * Anti-pattern guard: chrome-decay at 30% (not full opacity, not 0)
 * means at any frame, this caption contributes ≤ 0.3 visual weight
 * after its exit window — so at most ONE caption + HTP = 2 elements
 * at full weight at any frame (until the payoff at rel 900 where
 * HTP drops to 0.5 and the stamp owns the focal slot).
 */
export const GoofyStatCaption: React.FC<{
  dryStat: string
  absurdCompanion: string
  landFrame: number
  exitFrame: number
  anchor: 'lower-left' | 'lower-center' | 'lower-right'
  /** Lifts the caption vertically from the anchor baseline by N px (for stacking; e.g., Stat 4 over Stat 1 chrome residual). Default 0. */
  verticalOffsetPx?: number
}> = ({
  dryStat,
  absurdCompanion,
  landFrame,
  exitFrame,
  anchor,
  verticalOffsetPx = 0,
}) => {
  const frame = useCurrentFrame()

  // 4-point envelope: 0 → 1 → 1 → 0.30, holds at 0.30 after exit.
  const opacity = interpolate(
    frame,
    [landFrame, landFrame + 6, exitFrame - 12, exitFrame],
    [0, 1, 1, 0.3],
    {
      easing: EASE_OUT_EMIL,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  )

  // Subtle entry pop: scale 0.95 → 1.02 → 1.0 over the entry window.
  const entryScale = interpolate(
    frame,
    [landFrame, landFrame + 4, landFrame + 8],
    [0.95, 1.02, 1.0],
    {
      easing: EASE_OUT_EMIL,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  )

  const bottomPx = 80 + verticalOffsetPx
  const positionStyle: React.CSSProperties = (() => {
    switch (anchor) {
      case 'lower-left':
        return { position: 'absolute', bottom: bottomPx, left: 80 }
      case 'lower-center':
        return { position: 'absolute', bottom: bottomPx, left: '50%' }
      case 'lower-right':
        return { position: 'absolute', bottom: bottomPx, right: 80 }
    }
  })()

  // The lower-center variant uses translateX(-50%) for true horizontal centering;
  // left/right anchors use their own offset.
  const transform =
    anchor === 'lower-center'
      ? `translateX(-50%) scale(${entryScale})`
      : `scale(${entryScale})`

  return (
    <div
      style={{
        ...positionStyle,
        transform,
        transformOrigin: anchor === 'lower-center' ? 'center bottom' : 'left bottom',
        opacity,
        maxWidth: 640,
        pointerEvents: 'none',
      }}
    >
      {/* Classification-bar backdrop — semi-transparent charcoal with burned-fire left border */}
      <div
        style={{
          backgroundColor: 'rgba(10, 9, 6, 0.78)', // charcoal-1 78%
          padding: '14px 22px',
          borderLeft: '4px solid #be2e27', // burned-fire
          // Subtle paper-shadow lift so the caption reads as "stamped onto the desk"
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Dry stat — Clash Display 700 uppercase, the load-bearing punchline */}
        <div
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 700,
            fontSize: 36,
            color: '#f6ebce', // cream-12
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.05,
          }}
        >
          {dryStat}
        </div>
        {/* Absurd companion — Clash Display 500 italic, the smirk */}
        <div
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 500,
            fontStyle: 'italic',
            fontSize: 26,
            color: '#f6ebce', // cream-12
            opacity: 0.8,
            marginTop: 8,
            letterSpacing: '0.02em',
            lineHeight: 1.15,
          }}
        >
          {absurdCompanion}
        </div>
      </div>
    </div>
  )
}
