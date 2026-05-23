import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import { EASE_OUT_EMIL } from '../lib/animations'

/**
 * S04 dossier page shell — a single piece of cream paper tossed onto the
 * briefing-room desk. Lands like a card in S03's cascade (same EASE_OUT_EMIL
 * settle + entry-tilt-resolves-to-final-tilt grammar), then chrome-decays
 * to ~55% so the next page is focal. The lower-band caption layer is gone;
 * each page IS its own punchline.
 *
 * Settle physics:
 *   frame ∈ [landFrame, landFrame+ENTRY]:
 *     scale  0.78 → 1.05 → 1.0     (overshoot land)
 *     opacity 0 → 1                  (linear over first 8f)
 *     Y       -180 → 0               (drops onto desk)
 *     X       drift +18px → 0        (slight settle slide)
 *     rotate  rot+12° → rot           (tossed-in entry over-tilt resolves to anchored rot)
 *
 * Chrome-decay:
 *   frame ∈ [chromeDecayFromFrame, chromeDecayFromFrame+30]:
 *     opacity 1.0 → 0.55
 *     scale   1.0 → 0.98
 *   This lets the landed page persist as the "evidence pile growing"
 *   while the newest arrival is focal. By the payoff stamp the desk is
 *   covered in dimmed receipts.
 *
 * Geometry: 400×520 (4:5 portrait, real-document feel). cream-12 paper +
 * ochre-9 hairline outer + inset hairline at 50% (same chrome family as
 * DeckStack + OperativeCardFrame).
 */
const PAGE_W = 400
const PAGE_H = 520
const ENTRY_FRAMES = 24

export const DossierPage: React.FC<{
  anchor: { cx: number; cy: number; rot: number }
  landFrame: number
  /** Frame at which the page starts chrome-decaying (typically when the next page lands). */
  chromeDecayFromFrame?: number
  /** Opacity floor after chrome decay (default 0.55). */
  chromeDecayToOpacity?: number
  /** Total decay duration in frames (default 30). */
  chromeDecayFrames?: number
  /** Optional width override (default 400). Some pages want to be wider/taller. */
  width?: number
  height?: number
  children: React.ReactNode
}> = ({
  anchor,
  landFrame,
  chromeDecayFromFrame,
  chromeDecayToOpacity = 0.55,
  chromeDecayFrames = 30,
  width = PAGE_W,
  height = PAGE_H,
  children,
}) => {
  const frame = useCurrentFrame()

  if (frame < landFrame - 1) return null

  // Land envelope — scale 0.78 → 1.05 → 1.0 (overshoot), opacity 0 → 1, drop from above.
  const landScale = interpolate(
    frame,
    [landFrame, landFrame + 10, landFrame + ENTRY_FRAMES],
    [0.78, 1.05, 1.0],
    { easing: EASE_OUT_EMIL, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )
  const landOpacity = interpolate(frame, [landFrame, landFrame + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const dropY = interpolate(
    frame,
    [landFrame, landFrame + ENTRY_FRAMES],
    [-180, 0],
    { easing: EASE_OUT_EMIL, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )
  const driftX = interpolate(
    frame,
    [landFrame, landFrame + ENTRY_FRAMES],
    [18, 0],
    { easing: EASE_OUT_EMIL, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )
  const entryRot = interpolate(
    frame,
    [landFrame, landFrame + ENTRY_FRAMES],
    [anchor.rot + 12, anchor.rot],
    { easing: EASE_OUT_EMIL, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  // Chrome decay — opacity + scale ease down once the next page starts landing.
  const decayOpacity =
    chromeDecayFromFrame !== undefined
      ? interpolate(
          frame,
          [chromeDecayFromFrame, chromeDecayFromFrame + chromeDecayFrames],
          [1, chromeDecayToOpacity],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )
      : 1
  const decayScale =
    chromeDecayFromFrame !== undefined
      ? interpolate(
          frame,
          [chromeDecayFromFrame, chromeDecayFromFrame + chromeDecayFrames],
          [1.0, 0.98],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )
      : 1

  const finalOpacity = landOpacity * decayOpacity
  const finalScale = landScale * decayScale

  return (
    <div
      style={{
        position: 'absolute',
        left: anchor.cx - width / 2,
        top: anchor.cy - height / 2,
        width,
        height,
        transform: `translate(${driftX}px, ${dropY}px) rotate(${entryRot}deg) scale(${finalScale})`,
        transformOrigin: 'center center',
        opacity: finalOpacity,
        // Paper substrate: cream-12 with subtle warmer-cream gradient + ochre-9 hairline border + inset secondary
        backgroundColor: '#f6ebce', // cream-12
        backgroundImage:
          'linear-gradient(180deg, rgba(255, 250, 230, 0.55) 0%, rgba(246, 235, 206, 0) 18%, rgba(246, 235, 206, 0) 82%, rgba(230, 215, 180, 0.35) 100%)',
        border: '2px solid #947226', // ochre-9
        borderRadius: 2,
        // Paper edge depth — outer drop, inner micro-shadow for "page on desk"
        boxShadow:
          '0 12px 24px rgba(0, 0, 0, 0.45), 0 4px 8px rgba(0, 0, 0, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Inset hairline at 50% — concentric chrome consistent with DeckStack + OperativeCardFrame. */}
      <div
        style={{
          position: 'absolute',
          inset: 8,
          border: '1px solid rgba(148, 114, 38, 0.45)', // ochre-9 45%
          borderRadius: 1,
          pointerEvents: 'none',
        }}
      />
      {/* Content slot — caller composes header / focal / footer zones inside */}
      <div
        style={{
          position: 'absolute',
          inset: 24,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </div>
  )
}
