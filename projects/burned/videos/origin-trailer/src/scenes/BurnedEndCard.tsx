import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'

/**
 * BURNED END CARD — the locked "fucking good" closing title (extracted from
 * Beat6Wink so the ShortCutFinale A/B can land on it after the roster slam).
 * Quiet BURNED + the machine-made thesis + "ONE HUMAN DIRECTED". Slams in,
 * holds, fades to black. Silent.
 */

const FPS = 30
const sec = (s: number) => Math.round(s * FPS)
export const BURNED_END_CARD_FRAMES = sec(4.8)

const C = { cream: '#e8ddc6', burn: '#e0431f', chrome: '#5f8b8f', amber: '#ffb000' }
const mono = "'JetBrains Mono', monospace"
const display = "'Clash Display', system-ui, sans-serif"

const T = { thesis: 0.5, fadeStart: 3.7, end: 4.8 }

export const BurnedEndCard: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const s = spring({ frame, fps, config: { damping: 18, stiffness: 120, mass: 0.9 } })
  const scale = interpolate(s, [0, 1], [1.08, 1])
  const op = interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' })
  const thesisOp = interpolate(frame, [sec(T.thesis), sec(T.thesis + 0.7)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const fade = interpolate(frame, [sec(T.fadeStart), sec(T.end)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: '#06100f', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', transform: `scale(${scale})`, opacity: op }}>
        <div style={{ fontFamily: display, fontWeight: 900, fontSize: 150, lineHeight: 0.9, letterSpacing: '-0.02em', color: C.cream, textShadow: `0 0 70px ${C.burn}77` }}>
          BURNED
        </div>
        <div style={{ opacity: thesisOp, marginTop: 26, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <span style={{ fontFamily: mono, fontSize: 19, letterSpacing: '0.32em', color: C.chrome }}>
            WRITTEN · DESIGNED · CODED · SCORED · NARRATED BY MACHINES
          </span>
          <span style={{ fontFamily: mono, fontSize: 19, letterSpacing: '0.42em', color: C.amber }}>
            ONE HUMAN DIRECTED.
          </span>
        </div>
      </div>
      <AbsoluteFill style={{ background: '#000', opacity: fade, pointerEvents: 'none' }} />
    </AbsoluteFill>
  )
}
