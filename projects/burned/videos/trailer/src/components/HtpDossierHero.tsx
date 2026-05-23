import React from 'react'
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { EASE_DRAWER_FN } from '../lib/animations'

/**
 * S04 load-bearing dossier scroll. Slides up from below over rel 0-60
 * (EASE_DRAWER_FN drawer feel), then scrolls htp-fullpage.png upward
 * from rel 60-630 (linear, ~33 px/frame). Opacity drops 1.0 → 0.5
 * over rel 870-900 per Phase 1 design-lens focal hierarchy hand-off
 * — the payoff stamp at rel 900 owns the visual weight; HTP recedes
 * to half so the anti-pattern guard ("no frame except payoff has >2
 * elements at full visual weight") holds at the stamp moment.
 *
 * htp-fullpage.png native dims: 1920×19848 PNG (verified on disk).
 * Viewport: 900×1080 centered — wider than 720 so the HTP body copy
 * stays readable, narrow enough to leave room for the right-edge
 * card halo (x=1560-1880) and the lower-band stat captions.
 *
 * Scroll math: image renders at `width: 100%` of the 900-wide
 * viewport (scaled to 900×9304, preserving 1920:19848 aspect). The
 * effective scroll range is the rendered height minus the viewport
 * height (= 9304 - 1080 = 8224). NOT the native PNG height minus
 * the viewport — that'd overshoot by ~3× and scroll past the image
 * into empty space. (Phase 3 promised an `htp-capture-metadata.json`
 * with scrollRangePx — never shipped; computed here instead.)
 *
 * Pure visual — no Audio (composition-level cues per ADR #16).
 */
const HTP_NATIVE_W = 1920
const HTP_NATIVE_H = 19848
const VIEWPORT_W = 900
const VIEWPORT_H = 1080
const RENDERED_H = (VIEWPORT_W / HTP_NATIVE_W) * HTP_NATIVE_H // 9304
const SCROLL_RANGE_PX = RENDERED_H - VIEWPORT_H // 8224

export const HtpDossierHero: React.FC<{
  slideInFrom: number
  scrollFrom: number
  scrollTo: number
  /** When provided, hero opacity drops from 1.0 to `opacityDropToValue` between `opacityDropFromFrame` and `opacityDropToFrame`. */
  opacityDropFromFrame?: number
  opacityDropToFrame?: number
  opacityDropToValue?: number
}> = ({
  slideInFrom,
  scrollFrom,
  scrollTo,
  opacityDropFromFrame,
  opacityDropToFrame,
  opacityDropToValue = 0.5,
}) => {
  const frame = useCurrentFrame()

  // Slide-in: 60 frames, translate Y 200 → 0, EASE_DRAWER drawer feel
  const slideY = interpolate(frame, [slideInFrom, slideInFrom + 60], [200, 0], {
    easing: EASE_DRAWER_FN,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const slideOpacity = interpolate(frame, [slideInFrom, slideInFrom + 60], [0, 1], {
    easing: EASE_DRAWER_FN,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Linear scroll across the long PNG. 18768 px / (scrollTo-scrollFrom) frames.
  const scrollY = interpolate(frame, [scrollFrom, scrollTo], [0, -SCROLL_RANGE_PX], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Focal-hierarchy opacity drop per design-lens — hand-off to payoff stamp.
  // Default ramp is 30 frames ending at opacityDropToFrame, but the caller can
  // pass `opacityDropFromFrame` to start the recede earlier (e.g., right after
  // scroll completes) so the hero doesn't dwell at full opacity during the
  // post-scroll dead time.
  const focalOpacity =
    opacityDropToFrame !== undefined
      ? interpolate(
          frame,
          [opacityDropFromFrame ?? opacityDropToFrame - 30, opacityDropToFrame],
          [1, opacityDropToValue],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )
      : 1

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: VIEWPORT_W,
        height: VIEWPORT_H,
        transform: `translate(-50%, -50%) translateY(${slideY}px)`,
        opacity: slideOpacity * focalOpacity,
        overflow: 'hidden',
        // Subtle chrome treatment so the dossier reads as a "page on the desk"
        // not a floating screenshot.
        boxShadow:
          '0 4px 14px rgba(0, 0, 0, 0.45), 0 0 0 2px rgba(148, 114, 38, 0.45)',
        borderRadius: 2,
      }}
    >
      <Img
        src={staticFile('trailer/htp-fullpage.png')}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          transform: `translateY(${scrollY}px)`,
        }}
      />
    </div>
  )
}
