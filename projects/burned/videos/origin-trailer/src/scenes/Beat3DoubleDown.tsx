import React from 'react'
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion'
import type { CardType } from '@shared/types'
import { TrailerCard } from '../lib/TrailerCard'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'
import voMaster from '../../out/vo/janet-vo-master.wav'

/**
 * BEAT 3 — THE DOUBLE-DOWN + IMAGERY SHOWCASE (2026-05-29). Briggsy: "show off
 * more of our amazing imagery." Janet's line "it had to look like a real studio
 * made it" is the cue — the form factors assemble (phones with real hands),
 * then a GALLERY of the real card art floods in (the deck is the crown jewel),
 * then the cards rise "out of his own reach." Beat 3 lives at 56.0s in master.
 */

const FPS = 30
const sec = (s: number) => Math.round(s * FPS)
const BEAT3_START_SEC = 56.0

const T = {
  small: 0, // "a sensible man builds something small"
  opposite: 4.07, // "He did the opposite."
  phonesIn: 5.4, // "up to ten of you in the same room / ten phones, secret hands"
  studio: 14.5, // "look like a real studio made it" — GALLERY reveal
  bar: 21.35, // "He kept moving it out of his own reach"
  fadeStart: 25.6,
  end: 26.43,
}
export const BEAT3_FRAMES = sec(T.end)

// 12-card gallery — character + action cards + the BURNED card.
const GALLERY: CardType[] = [
  'dash-barlowe', 'vera-khan', 'burned', 'intercepted',
  'sable-ashworth', 'go-dark', 'neal-proctor', 'call-in-a-favor',
  'agent-x', 'falsify-intel', 'janet-broadside', 'extraction',
]
const PHONE_HANDS: CardType[][] = [
  ['back-channel', 'dash-barlowe', 'reassign'],
  ['vera-khan', 'burned', 'go-dark'],
  ['sable-ashworth', 'intel-briefing', 'direct-order'],
  ['neal-proctor', 'extraction', 'agent-x'],
  ['janet-broadside', 'falsify-intel', 'intercepted'],
]

const PhoneWithHand: React.FC<{ w: number; hand: CardType[] }> = ({ w, hand }) => (
  <div
    style={{
      width: w,
      height: w * 2,
      borderRadius: w * 0.16,
      background: 'linear-gradient(160deg, #0e262b, #081416)',
      border: `${Math.max(2, w * 0.018)}px solid #1f3f44`,
      boxShadow: '0 14px 40px rgba(0,0,0,0.55), inset 0 0 30px rgba(0,0,0,0.4)',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div style={{ position: 'absolute', bottom: -w * 0.42, left: '50%', transform: 'translateX(-50%)', display: 'flex' }}>
      {hand.map((t, i) => (
        <div key={i} style={{ transform: `rotate(${(i - 1) * 11}deg) translateY(${Math.abs(i - 1) * 10}px)`, margin: `0 ${-w * 0.14}px` }}>
          <TrailerCard type={t} width={w * 0.52} />
        </div>
      ))}
    </div>
  </div>
)

export const Beat3DoubleDown: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const center: React.CSSProperties = { position: 'absolute', left: '50%', top: '50%', transformOrigin: 'center center' }

  // --- "something small" : one modest phone ---
  const smallS = spring({ frame: frame - sec(T.small + 0.3), fps, config: { damping: 18, stiffness: 110, mass: 0.8 } })
  const smallOut = interpolate(frame, [sec(T.opposite), sec(T.opposite + 0.5)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const smallScale = interpolate(smallS, [0, 1], [0.7, 0.62]) // deliberately small
  const smallOpacity = interpolate(smallS, [0, 1], [0, 1]) * smallOut

  // --- phone arc : "up to ten of you / ten phones, secret hands" ---
  const phonesOut = interpolate(frame, [sec(T.studio - 0.6), sec(T.studio + 0.4)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // --- gallery : "look like a real studio made it" ---
  const galleryOpacity = interpolate(frame, [sec(T.studio), sec(T.studio + 0.8)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // overall rise "out of his own reach"
  const reachRise = interpolate(frame, [sec(T.bar), sec(T.end)], [0, -460], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) })
  const reachFade = interpolate(frame, [sec(T.bar + 1.2), sec(T.end)], [1, 0.25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const fade = interpolate(frame, [sec(T.fadeStart), sec(T.end)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const showSmall = frame < sec(T.opposite + 0.6)
  const showPhones = frame >= sec(T.phonesIn) && frame < sec(T.studio + 0.5)
  const showGallery = frame >= sec(T.studio)

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(125% 95% at 50% 44%, #16333855 0%, #0c2024 58%, #06100f 100%)' }}>
      <Audio src={voMaster} startFrom={sec(BEAT3_START_SEC)} />

      {/* something small */}
      {showSmall && (
        <div style={{ ...center, transform: `translate(-50%, -50%) scale(${smallScale})`, opacity: smallOpacity }}>
          <PhoneWithHand w={150} hand={['dash-barlowe', 'vera-khan', 'go-dark']} />
        </div>
      )}

      {/* phone arc */}
      {showPhones && (
        <AbsoluteFill style={{ opacity: phonesOut }}>
          {PHONE_HANDS.map((hand, i) => {
            const mid = (PHONE_HANDS.length - 1) / 2
            const off = i - mid
            const ps = spring({ frame: frame - sec(T.phonesIn) - i * 4, fps, config: { damping: 16, stiffness: 130, mass: 0.7 } })
            const x = interpolate(ps, [0, 1], [0, off * 330])
            const y = interpolate(ps, [0, 1], [60, Math.abs(off) * 34 - 30])
            const rot = interpolate(ps, [0, 1], [0, off * 6])
            const op = interpolate(ps, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' })
            return (
              <div key={i} style={{ ...center, transform: `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) rotate(${rot}deg)`, opacity: op, zIndex: 10 - Math.abs(off) }}>
                <PhoneWithHand w={150} hand={hand} />
              </div>
            )
          })}
        </AbsoluteFill>
      )}

      {/* the gallery — real card art floods in */}
      {showGallery && (
        <AbsoluteFill style={{ opacity: galleryOpacity }}>
          {/* hero warm light behind the deck */}
          <AbsoluteFill style={{ background: 'radial-gradient(58% 54% at 50% 48%, #16333866 0%, transparent 72%)' }} />
          <AbsoluteFill style={{ transform: `translateY(${reachRise}px)`, opacity: reachFade }}>
            {GALLERY.map((type, i) => {
              const col = i % 4
              const row = Math.floor(i / 4)
              const x = (col - 1.5) * 224
              const y = (row - 1) * 296
              const gs = spring({ frame: frame - sec(T.studio) - i * 2.5, fps, config: { damping: 17, stiffness: 120, mass: 0.7 } })
              const tilt = ((i % 3) - 1) * 4
              const drift = interpolate(frame, [sec(T.studio), sec(T.bar)], [0, (col - 1.5) * 8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              const ix = interpolate(gs, [0, 1], [x * 0.6, x + drift])
              const iy = interpolate(gs, [0, 1], [y + 80, y])
              const sc = interpolate(gs, [0, 1], [0.8, 1])
              const op = interpolate(gs, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' })
              return (
                <div key={type} style={{ ...center, transform: `translate(-50%, -50%) translate(${ix}px, ${iy}px) rotate(${tilt}deg) scale(${sc})`, opacity: op, zIndex: 10 - row }}>
                  <TrailerCard type={type} width={200} />
                </div>
              )
            })}
          </AbsoluteFill>
        </AbsoluteFill>
      )}

      {/* cinematic overlays */}
      <AbsoluteFill style={{ background: 'radial-gradient(130% 100% at 50% 48%, transparent 54%, #04080899 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ opacity: 0.05, pointerEvents: 'none', backgroundImage: GRAIN_URI, backgroundSize: '220px 220px' }} />
      <AbsoluteFill style={{ background: '#000', opacity: fade }} />
    </AbsoluteFill>
  )
}

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
