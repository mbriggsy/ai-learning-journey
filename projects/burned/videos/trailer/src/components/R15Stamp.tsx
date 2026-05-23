import React from 'react'
import { Img, staticFile, useCurrentFrame } from 'remotion'
import { archerStampSlap } from '../lib/animations'

/**
 * R15 chrome classification stamp — Phase 4 production component
 * (split-layer SVG architecture per Phase 3 Unit 3.4 + plan amendment
 * MA-5). Renders two `<Img>` layers (frame.svg + text.svg) inside an
 * outer wrapper that applies a SINGLE `transform: scale() rotate()` so
 * the layers stay locked together during the slap overshoot.
 *
 * Explicit `width` + `height` props (per amendment TIER 1 #4) are
 * REQUIRED — both children use `position: absolute, inset: 0`, which
 * collapses to 0×0 if the parent has no measurable dimensions. The
 * SVGs' natural viewBox values are the authoritative source for these
 * (e.g., stamp #1 frame.svg is 800×240; pass `width: 800, height: 240`).
 *
 * The legacy CSS-rendered `R15ChromeStamp.tsx` (Phase 0 spike artifact)
 * stays in place for Phase 0 regression-render compositions. Production
 * scenes (Unit 4.2+) consume this `R15Stamp` component instead.
 */
export const R15Stamp: React.FC<{
  /** Trailer-only asset path resolving under `<BURNED>/public/trailer/...`. */
  frameSvg: string
  textSvg: string
  anchor: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'center'
  offsetPx?: { x: number; y: number }
  /** Outer wrapper dimensions — MUST match the SVG's natural viewBox. */
  width: number
  height: number
  /** Per-stamp tilt baseline (typical range -15° → 0°). */
  tiltDeg?: number
  /** Absolute composition frame at which the stamp lands. */
  landFrame: number
  /** `'payoff'` selects the heavier STAMP_SLAP_PAYOFF envelope for the S04 R3 stamp. */
  variant?: 'standard' | 'payoff'
  /**
   * Optional cream-paper backing for stamps that BEAT-SHEET specifies
   * with a paper plate (R15 #1 OPERATION PENDLETON: "ochre-9 ink on
   * cream-12 stamp paper" per BEAT-SHEET line 144). The Phase 3 SVG
   * split-layers are transparent — the paper plate is layered in at the
   * component level so different stamps can opt in or out. Undefined →
   * no plate (transparent — used for ticker pulses + overprint stamps).
   */
  paperBg?: string
}> = ({
  frameSvg,
  textSvg,
  anchor,
  offsetPx = { x: 0, y: 0 },
  width,
  height,
  tiltDeg = -12,
  landFrame,
  variant = 'standard',
  paperBg,
}) => {
  const frame = useCurrentFrame()
  const { scale, rotate, opacity } = archerStampSlap({ frame, landFrame, tiltDeg, variant })

  const anchorStyle: React.CSSProperties = (() => {
    switch (anchor) {
      case 'bottom-left':
        return { position: 'absolute', bottom: offsetPx.y, left: offsetPx.x }
      case 'bottom-right':
        return { position: 'absolute', bottom: offsetPx.y, right: offsetPx.x }
      case 'top-left':
        return { position: 'absolute', top: offsetPx.y, left: offsetPx.x }
      case 'top-right':
        return { position: 'absolute', top: offsetPx.y, right: offsetPx.x }
      case 'center':
        return { position: 'absolute', top: '50%', left: '50%' }
    }
  })()

  return (
    <div
      style={{
        ...anchorStyle,
        width,
        height,
        opacity,
        backgroundColor: paperBg,
        transformOrigin: 'center',
        transform:
          anchor === 'center'
            ? `translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`
            : `scale(${scale}) rotate(${rotate}deg)`,
        pointerEvents: 'none',
      }}
    >
      <Img src={staticFile(frameSvg)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <Img src={staticFile(textSvg)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  )
}
