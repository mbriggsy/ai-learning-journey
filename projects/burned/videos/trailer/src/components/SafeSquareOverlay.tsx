import React from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'

/**
 * SafeSquareOverlay — debug visualizer for Phase 4 Unit 4.9 §R8 mobile
 * safe-square audit + Unit 4.10 anti-regression eyeball pass.
 *
 * Draws a dashed 1080×1080 center guide on top of any scene so the
 * operator can verify that critical text + focal hero sit inside the
 * central safe-square. Distribution surfaces (X / Twitter / IG feed
 * previews) crop the 1920×1080 master to ~1:1 on mobile feed; anything
 * outside the central square may be clipped. The overlay is NOT
 * shipped — it's a studio-preview-only chrome.
 *
 * Toggle via env var so the component compiles unconditionally but
 * draws nothing in production renders:
 *
 *   REMOTION_SAFE_SQUARE=1 pnpm studio          # show guide
 *   REMOTION_SAFE_SQUARE=1 pnpm render:s06      # also works for stills/renders
 *
 * Default (no env) → returns null, zero render cost. Scene files can
 * mount this once at the bottom of their JSX without conditional
 * gating; the component handles its own visibility decision.
 *
 * Vite exposes process.env to the studio bundle so this works from
 * the trailer subpackage. For Phase 6 final renders the env is left
 * unset; the overlay paints nothing.
 */

const SAFE_SQUARE_PX = 1080
const CHROME_WHITE = '#fdf9ee' // matches `cream-12` paper tone; reads against any mahogany/blue band

export const SafeSquareOverlay: React.FC<{
  /** Border color override. Default = cream-12. */
  color?: string
  /** Show pixel-coordinate labels at corners. Default true (useful for layout debugging). */
  showLabels?: boolean
  /** Override toggle — explicitly force on/off, bypassing the env var. */
  enabled?: boolean
}> = ({ color = CHROME_WHITE, showLabels = true, enabled }) => {
  const { width, height } = useVideoConfig()

  const envFlag =
    typeof process !== 'undefined' && process.env?.REMOTION_SAFE_SQUARE === '1'
  const isOn = enabled ?? envFlag
  if (!isOn) return null

  const left = Math.round((width - SAFE_SQUARE_PX) / 2)
  const top = Math.round((height - SAFE_SQUARE_PX) / 2)
  const right = left + SAFE_SQUARE_PX
  const bottom = top + SAFE_SQUARE_PX

  return (
    <AbsoluteFill style={{ zIndex: 2000, pointerEvents: 'none' }}>
      {/* Square guide */}
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: SAFE_SQUARE_PX,
          height: SAFE_SQUARE_PX,
          border: `1px dashed ${color}`,
          borderRadius: 0,
          boxSizing: 'border-box',
          opacity: 0.85,
        }}
      />
      {/* Center crosshairs (10px each direction at canvas center) */}
      <div
        style={{
          position: 'absolute',
          left: width / 2 - 10,
          top: height / 2,
          width: 20,
          height: 1,
          backgroundColor: color,
          opacity: 0.85,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: width / 2,
          top: height / 2 - 10,
          width: 1,
          height: 20,
          backgroundColor: color,
          opacity: 0.85,
        }}
      />
      {/* Corner labels */}
      {showLabels && (
        <>
          <Label x={left + 8} y={top + 8} text={`(${left}, ${top})`} color={color} />
          <Label x={right - 96} y={top + 8} text={`(${right}, ${top})`} color={color} />
          <Label x={left + 8} y={bottom - 24} text={`(${left}, ${bottom})`} color={color} />
          <Label x={right - 96} y={bottom - 24} text={`(${right}, ${bottom})`} color={color} />
          <Label
            x={left + SAFE_SQUARE_PX / 2 - 40}
            y={top - 24}
            text="SAFE 1080²"
            color={color}
          />
        </>
      )}
    </AbsoluteFill>
  )
}

const Label: React.FC<{ x: number; y: number; text: string; color: string }> = ({
  x,
  y,
  text,
  color,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12,
      fontWeight: 500,
      color,
      opacity: 0.85,
      letterSpacing: '0.05em',
      textShadow: '0 1px 2px rgba(0,0,0,0.6)',
      whiteSpace: 'nowrap',
    }}
  >
    {text}
  </div>
)
