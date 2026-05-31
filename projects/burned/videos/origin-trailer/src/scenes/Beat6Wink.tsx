import React from 'react'
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from 'remotion'
import { TrailerCard } from '../lib/TrailerCard'
import type { CardType } from '@shared/types'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'
import anchor from '../assets/briggsy-anchor.png'

/**
 * BEAT 6 — THE BUTTON + THE WINK (short recut, 2026-05-31). The closer. New VO:
 * "He bet a machine could build something worth playing. He was right. / Not one
 * piece of this was made by him. Not an image. Not a sound. Not even me. / This
 * kid is starting to impress me. …Hmph."
 *
 * Flow: a warm hand-fan beauty shot ("worth playing — he was right") → the
 * RECEIPTS cascade (IMAGE·GENERATED, AUDIO·GENERATED, NARRATION·SYNTHETIC),
 * dossier-stamped to the three clauses; on "not even me" the voiceprint pulses
 * live and NOT EVEN ME stamps over it — the narrator points at her own waveform
 * (the wink, played straight) → the guard drops, warm: the kid (anchor) → dry
 * "…Hmph." button → a quiet BURNED end card + the thesis bookend.
 *
 * COPY FLAG: the end-card thesis lines are PLACEHOLDER — Briggsy owns canon.
 * Audio-free (ShortCut owns the single VO track). Deterministic motion. Local
 * frames; beat 6 ≈ 17.2s VO + ~2.7s end-card tail.
 */

const FPS = 30
const sec = (s: number) => Math.round(s * FPS)

const C = {
  bg: '#06100f',
  cream: '#e8ddc6',
  amber: '#ffb000',
  burn: '#e0431f',
  red: '#ff3b1f',
  teal: '#45b3b3',
  chrome: '#5f8b8f',
  green: '#54d6a0',
  text: '#cfe3e3',
  panel: '#0a1c20',
  panelEdge: '#1b3a3e',
}

const T = {
  betIn: 0.2, // "He bet a machine could build something worth playing."
  right: 2.7, // "He was right." — confirm glow
  revealHead: 4.88, // "Not one piece of this was made by him."
  image: 7.2, // "Not an image."
  sound: 8.3, // "Not a sound."
  me: 9.4, // "Not even me." — the wink; voiceprint pulses
  handOut: 5.4, // hand-fan recedes as receipts take over
  warmth: 13.7, // "This kid is starting to impress me." — guard drops
  hmph: 16.17, // "…Hmph."
  endCard: 17.4, // quiet BURNED + thesis
  fadeStart: 19.2,
  end: 19.9,
}
export const BEAT6_WINK_FRAMES = sec(T.end)

const mono = "'JetBrains Mono', monospace"
const display = "'Clash Display', system-ui, sans-serif"

// "Something worth playing" — a player's hand, fanned, warm.
const HAND: CardType[] = ['dash-barlowe', 'intercepted', 'janet-broadside', 'call-in-a-favor', 'vera-khan']

type Receipt = { at: number; label: string; sub: string; stamp: string }
const RECEIPTS: Receipt[] = [
  { at: T.image, label: 'IMAGE', sub: 'every card · every frame', stamp: 'GENERATED' },
  { at: T.sound, label: 'AUDIO', sub: 'every cue · every note', stamp: 'GENERATED' },
  { at: T.me, label: 'NARRATION', sub: 'this voice — right now', stamp: 'SYNTHETIC' },
]

/** Deterministic voiceprint — N bars; pulses live when `live`. */
const Voiceprint: React.FC<{ frame: number; live: boolean; color: string; w?: number }> = ({ frame, live, color, w = 150 }) => {
  const N = 22
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, width: w, height: 44, justifyContent: 'center' }}>
      {Array.from({ length: N }).map((_, i) => {
        const base = 0.3 + 0.7 * Math.abs(Math.sin(i * 0.7) + 0.5 * Math.sin(i * 0.31 + 1.3))
        const pulse = live ? 0.5 + 0.5 * Math.abs(Math.sin(frame * 0.5 + i * 0.9)) : 0.45
        const h = Math.min(1, base * pulse) * 44
        return <div key={i} style={{ width: 3, height: Math.max(3, h), background: color, borderRadius: 2, opacity: 0.9 }} />
      })}
    </div>
  )
}

export const Beat6Wink: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // ── BET beauty shot — hand fan ──
  const handIn = spring({ frame: frame - sec(T.betIn), fps, config: { damping: 16, stiffness: 110, mass: 0.8 } })
  const handOut = interpolate(frame, [sec(T.handOut), sec(T.revealHead + 0.6)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) })
  const rightGlow = interpolate(frame, [sec(T.right), sec(T.right + 0.8)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * handOut

  // ── REVEAL — receipts cascade ──
  const revealActive = frame >= sec(T.revealHead)
  const headOp = interpolate(frame, [sec(T.revealHead), sec(T.revealHead + 0.5)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) *
    interpolate(frame, [sec(T.warmth - 0.4), sec(T.warmth + 0.6)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // ── WARMTH — guard drops ──
  const warmth = interpolate(frame, [sec(T.warmth), sec(T.warmth + 1.2)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const warmthOut = interpolate(frame, [sec(T.endCard - 0.6), sec(T.endCard + 0.5)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const anchorKb = interpolate(frame, [sec(T.warmth), sec(T.endCard)], [1.06, 1.13], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // ── END CARD ──
  const endS = spring({ frame: frame - sec(T.endCard), fps, config: { damping: 18, stiffness: 120, mass: 0.9 } })
  const endVisible = frame >= sec(T.endCard)
  const endScale = interpolate(endS, [0, 1], [1.08, 1])
  const endOp = endVisible ? interpolate(endS, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }) : 0
  const thesisOp = interpolate(frame, [sec(T.endCard + 0.5), sec(T.endCard + 1.2)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const fade = interpolate(frame, [sec(T.fadeStart), sec(T.end)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const bgWarm = warmth * warmthOut

  return (
    <AbsoluteFill style={{ background: `radial-gradient(125% 95% at 50% 46%, ${bgWarm > 0.3 ? '#1c3330' : '#14302f'} 0%, #0a1a1b 58%, ${C.bg} 100%)`, overflow: 'hidden' }}>
      {/* ===== BET — the hand fan ("something worth playing") ===== */}
      {handOut > 0 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: handOut }}>
          {HAND.map((type, i) => {
            const spread = i - (HAND.length - 1) / 2
            const rot = interpolate(handIn, [0, 1], [0, spread * 9])
            const x = interpolate(handIn, [0, 1], [0, spread * 198])
            const y = interpolate(handIn, [0, 1], [200, Math.abs(spread) * 26]) // arc up
            const op = interpolate(frame - sec(T.betIn) - i * 3, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            return (
              <div
                key={type}
                style={{
                  position: 'absolute',
                  transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
                  transformOrigin: 'center bottom',
                  opacity: op,
                  filter: 'drop-shadow(0 20px 44px rgba(0,0,0,0.55))',
                }}
              >
                <TrailerCard type={type} width={236} />
              </div>
            )
          })}
          {/* "he was right" confirm glow */}
          <AbsoluteFill style={{ background: `radial-gradient(46% 44% at 50% 50%, ${C.amber}30 0%, transparent 70%)`, opacity: rightGlow, mixBlendMode: 'screen', pointerEvents: 'none' }} />
        </AbsoluteFill>
      )}

      {/* ===== REVEAL — the receipts ===== */}
      {revealActive && headOp > 0 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: headOp }}>
          <div style={{ width: 880, display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* header */}
            <div style={{ fontFamily: mono, fontSize: 22, letterSpacing: '0.42em', color: C.chrome, textAlign: 'center', marginBottom: 8 }}>
              NONE OF THIS WAS HIS HAND
            </div>

            {RECEIPTS.map((r, i) => {
              const rowS = spring({ frame: frame - sec(r.at), fps, config: { damping: 15, stiffness: 150, mass: 0.7 } })
              const visible = frame >= sec(r.at)
              if (!visible) return null
              const rowOp = interpolate(rowS, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' })
              const rowX = interpolate(rowS, [0, 1], [-34, 0])
              const isMe = i === 2
              // stamp slams a beat after the row
              const stampS = spring({ frame: frame - sec(r.at + 0.35), fps, config: { damping: 9, stiffness: 200, mass: 0.7 } })
              const stamped = frame >= sec(r.at + 0.35)
              const stampScale = interpolate(stampS, [0, 1], [1.7, 1])
              const stampOp = stamped ? interpolate(stampS, [0, 0.25], [0, 1], { extrapolateRight: 'clamp' }) : 0

              return (
                <div
                  key={r.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 26,
                    opacity: rowOp,
                    transform: `translateX(${rowX}px)`,
                    padding: '16px 24px',
                    borderRadius: 10,
                    background: `linear-gradient(160deg, ${C.panel}, #060f11)`,
                    border: `1px solid ${isMe ? C.amber + '66' : C.panelEdge}`,
                    boxShadow: isMe ? `0 0 30px ${C.amber}22` : '0 18px 50px rgba(0,0,0,0.45)',
                  }}
                >
                  {/* evidence thumb */}
                  <div style={{ width: 72, height: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#08171a', border: `1px solid ${C.panelEdge}`, overflow: 'hidden' }}>
                    {i === 0 ? (
                      <div style={{ transform: 'scale(0.92)' }}><TrailerCard type="agent-x" width={58} /></div>
                    ) : (
                      <Voiceprint frame={frame} live={isMe} color={isMe ? C.amber : C.teal} w={58} />
                    )}
                  </div>
                  {/* label */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                    <span style={{ fontFamily: display, fontWeight: 800, fontSize: 38, color: C.cream, letterSpacing: '0.01em' }}>{r.label}</span>
                    <span style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.2em', color: C.chrome }}>{r.sub}</span>
                  </div>
                  {/* stamp */}
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      color: isMe ? C.amber : C.red,
                      border: `2px solid ${isMe ? C.amber : C.red}`,
                      borderRadius: 6,
                      padding: '8px 16px',
                      transform: `rotate(-7deg) scale(${stampScale})`,
                      opacity: stampOp,
                      boxShadow: `0 0 18px ${(isMe ? C.amber : C.red)}44`,
                    }}
                  >
                    {r.stamp}
                  </div>
                </div>
              )
            })}
          </div>

          {/* "NOT EVEN ME" — the wink, over the live voiceprint row */}
          {frame >= sec(T.me + 0.5) && (
            <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 110, pointerEvents: 'none' }}>
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 900,
                  fontSize: 76,
                  letterSpacing: '0.02em',
                  color: C.amber,
                  textShadow: `0 0 50px ${C.amber}66`,
                  opacity: interpolate(frame, [sec(T.me + 0.5), sec(T.me + 1.1)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * headOp,
                  transform: `scale(${interpolate(frame, [sec(T.me + 0.5), sec(T.me + 1.0)], [1.12, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
                }}
              >
                NOT EVEN ME.
              </div>
            </AbsoluteFill>
          )}
        </AbsoluteFill>
      )}

      {/* ===== WARMTH — the kid (anchor), guard drops ===== */}
      {warmth > 0 && warmthOut > 0 && (
        <AbsoluteFill style={{ opacity: warmth * warmthOut }}>
          <Img src={anchor} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 40%', transform: `scale(${anchorKb})`, transformOrigin: '50% 45%' }} />
          <AbsoluteFill style={{ background: `radial-gradient(55% 50% at 50% 46%, ${C.amber}33 0%, transparent 72%)`, mixBlendMode: 'screen' }} />
          <AbsoluteFill style={{ background: 'radial-gradient(120% 82% at 50% 48%, transparent 34%, #06100fdd 100%)' }} />
        </AbsoluteFill>
      )}

      {/* ===== END CARD — quiet BURNED + thesis bookend ===== */}
      {endVisible && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: endOp }}>
          <div style={{ textAlign: 'center', transform: `scale(${endScale})` }}>
            <div style={{ fontFamily: display, fontWeight: 900, fontSize: 150, lineHeight: 0.9, letterSpacing: '-0.02em', color: C.cream, textShadow: `0 0 70px ${C.burn}77` }}>
              BURNED
            </div>
            <div style={{ opacity: thesisOp, marginTop: 26, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <span style={{ fontFamily: mono, fontSize: 19, letterSpacing: '0.32em', color: C.chrome }}>
                WRITTEN · DESIGNED · CODED · SCORED · NARRATED BY MACHINES
              </span>
              <span style={{ fontFamily: mono, fontSize: 19, letterSpacing: '0.42em', color: C.amber }}>
                ONE HUMAN POINTED.
              </span>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* cinematic overlays */}
      <AbsoluteFill style={{ background: 'radial-gradient(130% 100% at 50% 48%, transparent 52%, #04080899 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ opacity: 0.05, pointerEvents: 'none', backgroundImage: GRAIN_URI, backgroundSize: '220px 220px' }} />
      <AbsoluteFill style={{ background: '#000', opacity: fade }} />
    </AbsoluteFill>
  )
}

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
