import React from 'react'
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { EASE_DRAWER_FN } from '../lib/animations'

/**
 * Dossier folder with closed → open transition. Phase 3 Unit 3.3
 * shipped two SVGs (`dossier-folder-closed.svg` + `dossier-folder-
 * open.svg`); this component crossfades between them over a 60-frame
 * window using `EASE_DRAWER_FN` (cubic-bezier(0.32, 0.72, 0, 1)) per
 * Phase 1 Unit 1.4 lock — iOS drawer feel, NOT linear.
 *
 * The 60-frame open window matches the plan's S02 timing
 * (openStart=30, fully open by openStart+60 = scene-relative 90).
 *
 * Closing (`closeStart` prop) is the inverse — used when a scene
 * needs to re-close the folder (S03 transition reveal). Pass -1 to
 * disable the closing arc; default disables.
 */
export const DossierFolder: React.FC<{
  /** Scene-relative frame the open animation begins (fully open at openStart+60). */
  openStart: number
  /** Optional close-back frame; -1 disables. */
  closeStart?: number
  /** Centered placement; pixel size of the folder. */
  width?: number
  height?: number
}> = ({ openStart, closeStart = -1, width = 1000, height = 1300 }) => {
  const frame = useCurrentFrame()

  const opening = interpolate(frame, [openStart, openStart + 60], [0, 1], {
    easing: EASE_DRAWER_FN,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const closing =
    closeStart > 0
      ? interpolate(frame, [closeStart, closeStart + 30], [0, 1], {
          easing: EASE_DRAWER_FN,
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0

  const openProgress = Math.max(0, opening - closing)

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width,
        height,
      }}
    >
      <Img
        src={staticFile('trailer/briefing-room/dossier-folder-closed.svg')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 1 - openProgress,
        }}
      />
      <Img
        src={staticFile('trailer/briefing-room/dossier-folder-open.svg')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: openProgress,
        }}
      />
    </div>
  )
}
