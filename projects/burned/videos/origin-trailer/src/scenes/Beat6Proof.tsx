import React from 'react'
import { AbsoluteFill, Audio, Img, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'
import voMaster from '../../out/vo/janet-vo-master.wav'
import anchor from '../assets/briggsy-anchor.png'

/**
 * BEAT 6 — THE PROOF + COST (2026-05-29). Two halves. PROOF: a counter races to
 * 1,326, then locks 1326/1326 — "it held." COST/HEART: crossfade to the anchor
 * (the lone 2 a.m. desk), warm and intimate, as Janet softens — "the specific
 * madness of a man who'll tell a machine, no, make it beautiful." Beat 6 lives
 * at 119.95s in master. 1,326 is the canonical published test count.
 */

const FPS = 30
const sec = (s: number) => Math.round(s * FPS)
const BEAT6_START_SEC = 119.95

const T = {
  countStart: 0.3, // "1326 attempts to break it"
  countEnd: 3.0,
  held: 3.67, // "1326 times, it didn't" — lock
  cost: 8.0, // "What did it cost him?" — crossfade to the heart
  anchorFull: 10.5,
  machineRest: 26.31, // "The machine did the rest."
  fadeStart: 27.9,
  end: 28.67,
}
export const BEAT6_FRAMES = sec(T.end)

export const Beat6Proof: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // counter 0 → 1326
  const count = Math.round(interpolate(frame, [sec(T.countStart), sec(T.countEnd)], [0, 1326], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
  const held = frame >= sec(T.held)
  const heldS = spring({ frame: frame - sec(T.held), fps, config: { damping: 13, stiffness: 160, mass: 0.7 } })
  const heldPunch = held ? interpolate(heldS, [0, 1], [1.15, 1]) : 1
  const proofOpacity = interpolate(frame, [sec(T.cost - 0.8), sec(T.cost + 0.6)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const proofColor = held ? '#f0b240' : '#d9544f'

  // heart — anchor, warm slow push
  const heartOpacity = interpolate(frame, [sec(T.cost), sec(T.cost + 1.4)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const kb = interpolate(frame, [sec(T.cost), sec(T.end)], [1.02, 1.12], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const warmGlow = interpolate(frame, [sec(T.anchorFull), sec(T.machineRest)], [0.2, 0.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const fade = interpolate(frame, [sec(T.fadeStart), sec(T.end)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(125% 95% at 50% 46%, #14302f 0%, #0a1a1b 58%, #06100f 100%)' }}>
      <Audio src={voMaster} startFrom={sec(BEAT6_START_SEC)} />

      {/* PROOF — the counter */}
      {frame < sec(T.cost + 0.7) && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: proofOpacity }}>
          <div style={{ transform: `scale(${heldPunch})`, textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, letterSpacing: '0.42em', color: '#7fa0a0', marginBottom: 24 }}>
              {held ? 'ATTEMPTS TO BREAK IT · IT HELD' : 'ATTEMPTS TO BREAK IT'}
            </div>
            <div style={{ fontFamily: "'Clash Display', system-ui, sans-serif", fontWeight: 900, fontSize: 280, lineHeight: 1, color: proofColor, textShadow: `0 0 80px ${proofColor}88` }}>
              {held ? '1326' : count}
              {held && <span style={{ fontSize: 110, color: '#5f8b8f' }}> / 1326</span>}
            </div>
          </div>
          <AbsoluteFill style={{ background: `radial-gradient(40% 40% at 50% 46%, ${proofColor}22 0%, transparent 70%)`, opacity: held ? 1 : 0.5, pointerEvents: 'none' }} />
        </AbsoluteFill>
      )}

      {/* COST / HEART — the anchor, warm */}
      {frame >= sec(T.cost) && (
        <AbsoluteFill style={{ opacity: heartOpacity }}>
          <Img src={anchor} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 42%', transform: `scale(${kb})`, transformOrigin: '50% 46%' }} />
          {/* warm wash growing — Janet softening */}
          <AbsoluteFill style={{ background: 'radial-gradient(55% 50% at 50% 46%, #e0921f33 0%, transparent 72%)', opacity: warmGlow, mixBlendMode: 'screen' }} />
          <AbsoluteFill style={{ background: 'radial-gradient(120% 82% at 50% 48%, transparent 36%, #06100fdd 100%)' }} />
        </AbsoluteFill>
      )}

      <AbsoluteFill style={{ background: 'radial-gradient(130% 100% at 50% 48%, transparent 54%, #04080899 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ opacity: 0.05, pointerEvents: 'none', backgroundImage: GRAIN_URI, backgroundSize: '220px 220px' }} />
      <AbsoluteFill style={{ background: '#000', opacity: fade }} />
    </AbsoluteFill>
  )
}

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
