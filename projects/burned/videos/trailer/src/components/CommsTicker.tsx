import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'

/**
 * Comms ticker — bottom-edge briefing-room set-dressing.
 *
 * Hold-one-line-during-VO behavior per Phase 4 deepening design-lens
 * (Finding 9-ish — rotating chrome pulls eye from VO landings). Each
 * scene passes `holdDuringFrames` arrays describing the windows where
 * Dash (or any) VO is sounding; the ticker freezes its idle-rotation
 * index at the start of each hold window.
 *
 * Idle copy verified against `src/client/board/DossierFeed.tsx:20-25`
 * IDLE_LINES — same vocabulary as the in-game CommsFeed.
 *
 * Bottom strip: dark warm-charcoal band, ochre-9 ink mono caps, with
 * a `// ` prefix matching the chrome's "non-interactive vocabulary"
 * convention (CLAUDE.md ref: `// CAPS LETTERSPACED is non-interactive
 * chrome vocabulary`).
 */

// Idle lines — mirror of DossierFeed.tsx:20-25.
const IDLE_LINES = ['CHANNEL OPEN', 'STANDING BY', 'AWAITING TRANSMISSION', 'INTERCEPT CLEAR'] as const

export const CommsTicker: React.FC<{
  /** Scene-relative frame at which the ticker becomes visible (default 0). */
  fromFrame?: number
  /** Optional override copy (e.g., R15 #2 active state for S04 comms-ticker pulse). */
  text?: string
  /**
   * Scene-relative frame ranges where VO is sounding — ticker freezes
   * its idle-rotation index for each range so the chrome stays static
   * during VO landings. Multiple ranges supported.
   */
  holdDuringFrames?: Array<readonly [number, number]>
  /** Frames per idle-line rotation when not held; default 90 (3s @ 30fps). */
  rotationFrames?: number
}> = ({ fromFrame = 0, text, holdDuringFrames = [], rotationFrames = 90 }) => {
  const frame = useCurrentFrame()
  if (frame < fromFrame) return null

  // Freeze rotation index inside any active hold window.
  let displayFrame = frame
  for (const [start, end] of holdDuringFrames) {
    if (frame >= start && frame <= end) {
      displayFrame = start
      break
    }
  }

  const idleIndex = Math.floor((displayFrame - fromFrame) / rotationFrames) % IDLE_LINES.length
  const display = text ?? IDLE_LINES[idleIndex]

  // 15-frame fade-in on ticker appearance.
  const opacity = interpolate(frame, [fromFrame, fromFrame + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 48,
        backgroundColor: '#1a1812', // charcoal-3 — same as DossierFeed surface
        borderTop: '1px solid #38342b', // charcoal-6 hairline
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 32,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 500,
        fontSize: 22,
        color: '#947226', // ochre-9
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        opacity,
        pointerEvents: 'none',
      }}
    >
      // {display}
    </div>
  )
}
