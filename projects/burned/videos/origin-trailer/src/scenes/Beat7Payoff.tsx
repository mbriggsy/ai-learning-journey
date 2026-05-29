import React from 'react'
import {
  AbsoluteFill,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from 'remotion'
import type { CardType } from '@shared/types'
import { TrailerCard } from '../lib/TrailerCard'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'
import voMaster from '../../out/vo/janet-vo-master.wav'

/**
 * BEAT 7 — PAYOFF (2026-05-29). The other tentpole. Not the "boring rankings
 * screen" — the winning MOMENT: the BURNED card takes out the last opponent,
 * the winner rises, the real roster fans out ("a real one · 120 cards · no
 * honor"), then the real BURNED wordmark stamps in on "He was right," and a
 * warm button under Janet's "This kid is starting to impress me. …Hmph."
 *
 * Beat 7 lives at 148.62s in the master WAV → Audio is trimmed there so the
 * clip plays beat 7 from frame 0. Title card is built natively (real Clash
 * Display wordmark) — the only Imagen illustration in the trailer is the anchor.
 */

const FPS = 30
const sec = (s: number) => Math.round(s * FPS)
const BEAT7_START_SEC = 148.62 // manifest: b7-return-q.startSec

// Local landmarks (sec, offset from beat-7 start) — word-proportional from manifest.
const T = {
  oppIn: 2.0, // "A game."
  kill: 3.0, // "A real one." — BURNED slams the last opponent
  oppOut: 3.5,
  winnerRise: 3.8,
  rosterIn: 5.6, // "120 cards, up to ten of your closest friends"
  rosterHold: 8.4,
  rosterOut: 11.4, // "no honor among them" resolves
  titleDark: 12.4, // "He bet a machine could build something worth playing"
  titleStamp: 16.54, // "He was right." — the brand hit
  warm: 29.12, // "This kid is starting to impress me."
  fadeStart: 31.8, // after "…Hmph."
  end: 32.63,
}

export const BEAT7_FRAMES = sec(T.end)

const ROSTER: CardType[] = ['vera-khan', 'neal-proctor', 'dash-barlowe', 'sable-ashworth', 'agent-x', 'janet-broadside']

const shake = (frame: number, startF: number, durF: number, mag: number) => {
  if (frame < startF || frame > startF + durF) return { x: 0, y: 0 }
  const t = (frame - startF) / durF
  const d = 1 - t
  return { x: Math.sin((frame - startF) * 1.7) * mag * d, y: Math.cos((frame - startF) * 2.3) * mag * d * 0.6 }
}

export const Beat7Payoff: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const centerWrap: React.CSSProperties = { position: 'absolute', left: '50%', top: '50%', transformOrigin: 'center center' }

  // --- Opponent (Neal) sits, then is taken out by the BURNED slam ---
  const oppS = spring({ frame: frame - sec(T.oppIn), fps, config: { damping: 16, stiffness: 120, mass: 0.7 } })
  const oppBurn = interpolate(frame, [sec(T.kill), sec(T.oppOut)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const oppY = interpolate(oppS, [0, 1], [60, 0]) + oppBurn * 120
  const oppScale = interpolate(oppS, [0, 1], [0.86, 1]) * (1 - oppBurn * 0.35)
  const oppOpacity = interpolate(oppS, [0, 1], [0, 1]) * (1 - oppBurn)

  // --- BURNED card: the kill slam ---
  const burnS = spring({ frame: frame - sec(T.kill), fps, config: { damping: 11, stiffness: 220, mass: 0.9 } })
  const burnPunch = interpolate(frame, [sec(T.kill), sec(T.kill + 0.18), sec(T.kill + 0.5)], [1.4, 1.06, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad),
  })
  const burnExit = interpolate(frame, [sec(T.winnerRise - 0.2), sec(T.winnerRise + 0.3)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const burnY = interpolate(burnS, [0, 1], [-560, 0])
  const burnScale = interpolate(burnS, [0, 1], [1.7, 1]) * burnPunch
  const burnVisible = frame >= sec(T.kill) && frame < sec(T.winnerRise + 0.4)
  const burnOpacity = burnVisible ? interpolate(burnS, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }) * burnExit : 0
  const flash = interpolate(frame, [sec(T.kill), sec(T.kill + 0.12), sec(T.kill + 0.55)], [0, 0.62, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // --- Winner (Dash) rises triumphant, then recedes into the roster ---
  const winS = spring({ frame: frame - sec(T.winnerRise), fps, config: { damping: 15, stiffness: 130, mass: 0.7 } })
  const winToRoster = interpolate(frame, [sec(T.rosterIn - 0.3), sec(T.rosterIn + 0.6)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const winY = interpolate(winS, [0, 1], [80, 0])
  const winScale = interpolate(winS, [0, 1], [0.8, 1.05]) * (1 - winToRoster * 0.28)
  const winGlow = interpolate(frame, [sec(T.winnerRise), sec(T.winnerRise + 1)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * (1 - winToRoster)
  const winVisible = frame >= sec(T.winnerRise) && frame < sec(T.rosterIn + 0.6)
  const winOpacity = winVisible ? interpolate(winS, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }) * (1 - winToRoster) : 0

  // --- Roster fan: the real characters spread out ("a real one · 120 cards") ---
  const rosterOut = interpolate(frame, [sec(T.rosterOut), sec(T.rosterOut + 1)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // --- Title stamp ---
  const titleS = spring({ frame: frame - sec(T.titleStamp), fps, config: { damping: 12, stiffness: 200, mass: 0.8 } })
  const titlePunch = interpolate(frame, [sec(T.titleStamp), sec(T.titleStamp + 0.16), sec(T.titleStamp + 0.5)], [1.25, 1.04, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad),
  })
  const titleVisible = frame >= sec(T.titleStamp)
  const titleOpacity = titleVisible ? interpolate(titleS, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }) : 0
  const titleScale = (titleVisible ? interpolate(titleS, [0, 1], [0.8, 1]) : 0.8) * titlePunch
  const titlePush = interpolate(frame, [sec(T.titleStamp), sec(T.end)], [1, 1.05], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const accentW = titleVisible ? interpolate(titleS, [0, 1], [0, 1]) : 0
  const warmWash = interpolate(frame, [sec(T.warm), sec(T.warm + 1.6)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const jKill = shake(frame, sec(T.kill), sec(0.45), 14)
  const jTitle = shake(frame, sec(T.titleStamp), sec(0.4), 10)
  const j = { x: jKill.x + jTitle.x, y: jKill.y + jTitle.y }

  const fade = interpolate(frame, [sec(T.fadeStart), sec(T.end)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(125% 95% at 50% 44%, #16333855 0%, #0c2024 58%, #06100f 100%)' }}>
      <Audio src={voMaster} startFrom={sec(BEAT7_START_SEC)} />

      <AbsoluteFill style={{ transform: `translate(${j.x}px, ${j.y}px)` }}>
        {/* Winner glow halo */}
        {frame >= sec(T.winnerRise) && frame < sec(T.rosterIn + 0.6) && (
          <AbsoluteFill style={{ background: 'radial-gradient(44% 40% at 50% 50%, #f0b24055 0%, transparent 72%)', opacity: winGlow }} />
        )}

        {/* Opponent (Neal) — taken out */}
        {frame >= sec(T.oppIn) && frame < sec(T.oppOut + 0.3) && (
          <div style={{ ...centerWrap, transform: `translate(-50%, -50%) translateY(${oppY}px) scale(${oppScale})`, opacity: oppOpacity, filter: oppBurn > 0 ? `brightness(${1 - oppBurn * 0.5})` : undefined }}>
            <TrailerCard type="neal-proctor" width={360} />
          </div>
        )}

        {/* Winner (Dash) */}
        {winVisible && (
          <div style={{ ...centerWrap, transform: `translate(-50%, -50%) translateY(${winY}px) scale(${winScale})`, opacity: winOpacity }}>
            <TrailerCard type="dash-barlowe" width={400} />
          </div>
        )}

        {/* BURNED kill slam */}
        {burnVisible && (
          <div style={{ ...centerWrap, transform: `translate(-50%, -50%) translateY(${burnY}px) scale(${burnScale}) rotate(4deg)`, opacity: burnOpacity }}>
            <TrailerCard type="burned" width={420} />
          </div>
        )}

        {/* Roster fan */}
        {frame >= sec(T.rosterIn) && frame < sec(T.rosterOut + 1) && (
          <AbsoluteFill style={{ opacity: rosterOut }}>
            {ROSTER.map((type, i) => {
              const mid = (ROSTER.length - 1) / 2
              const off = i - mid
              const rs = spring({ frame: frame - sec(T.rosterIn) - i * 3, fps, config: { damping: 18, stiffness: 120, mass: 0.7 } })
              const x = interpolate(rs, [0, 1], [0, off * 250])
              const y = interpolate(rs, [0, 1], [40, Math.abs(off) * 26 - 10]) // gentle arc
              const rot = interpolate(rs, [0, 1], [0, off * 7])
              const op = interpolate(rs, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' })
              return (
                <div key={type} style={{ ...centerWrap, transform: `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) rotate(${rot}deg)`, opacity: op, zIndex: 10 - Math.abs(off) }}>
                  <TrailerCard type={type} width={232} />
                </div>
              )
            })}
          </AbsoluteFill>
        )}

        {/* Hit flash */}
        <AbsoluteFill style={{ background: 'radial-gradient(60% 50% at 50% 50%, #ff5a2e 0%, #e0431f00 70%)', opacity: flash, mixBlendMode: 'screen' }} />

        {/* BURNED title card */}
        {titleVisible && (
          <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: titleOpacity }}>
            {/* warm glow behind the wordmark, grows on the button */}
            <AbsoluteFill style={{ background: 'radial-gradient(40% 34% at 50% 50%, #e0431f44 0%, transparent 70%)', opacity: 0.5 + warmWash * 0.5 }} />
            <div style={{ transform: `scale(${titleScale * titlePush})`, textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: "'Clash Display', system-ui, sans-serif",
                  fontWeight: 900,
                  fontSize: 240,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.015em',
                  color: 'var(--color-accent-burned, #e0431f)',
                  textShadow:
                    '0 2px 0 rgba(245,228,193,0.18), 0 0 60px rgba(224,67,31,0.5), 0 0 130px rgba(224,67,31,0.28)',
                }}
              >
                BURNED
              </div>
              {/* notched orange classified bar */}
              <div
                style={{
                  width: `${accentW * 360}px`,
                  height: 7,
                  margin: '26px auto 0',
                  background: 'var(--color-accent-burned, #e0431f)',
                  clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
                  boxShadow: '0 0 24px rgba(224,67,31,0.45)',
                }}
              />
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>

      {/* Cinematic overlays */}
      <AbsoluteFill style={{ background: 'radial-gradient(130% 100% at 50% 48%, transparent 52%, #04080899 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ opacity: 0.05, pointerEvents: 'none', backgroundImage: GRAIN_URI, backgroundSize: '220px 220px' }} />

      {/* Fade to black */}
      <AbsoluteFill style={{ background: '#000', opacity: fade }} />
    </AbsoluteFill>
  )
}

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
