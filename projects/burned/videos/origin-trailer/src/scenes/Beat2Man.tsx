import React from 'react'
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion'
import { TrailerCard } from '../lib/TrailerCard'
import type { CardType } from '@shared/types'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'
import anchor from '../assets/briggsy-anchor.png'

/**
 * BEAT 2 — THE MAN + THE PROBLEM (short recut, 2026-05-31). The bridge from the
 * hook to the engine. Kinetic throughout — NO static anchor hold (the original
 * sin). The "quiet machinery" (data pipelines) flows alive → his favorite card
 * game deals in (real cards) → it "deserves a screen" → an EMPTY editor (he has
 * no idea how to build it). That empty editor is the same panel the engine
 * explodes to life on the hinge cut. Setup → payoff.
 *
 * Silent — ShortCut owns the single VO track. Local frames; landmarks below are
 * beat-2-relative (manifest beat 2 = 4.20s; b2-problem starts 12.79s local).
 */

const FPS = 30
const sec = (s: number) => Math.round(s * FPS)

const C = {
  cream: '#e8ddc6',
  amber: '#ffb000',
  teal: '#45b3b3',
  chrome: '#5f8b8f',
  panel: '#0a1c20',
  panelEdge: '#1b3a3e',
}

const T = {
  pipeIn: 0.3,
  cardsIn: 5.6, // "his favorite card game"
  cardsOut: 10.8,
  screenRise: 11.0, // "deserved a screen"
  editorAt: 12.79, // b2-problem — "no idea how to build it himself"
  end: 18.27,
}
export const BEAT2_MAN_FRAMES = sec(T.end)

// Real cards he loved — a quick deal (mix of action + operative)
const HAND: CardType[] = ['dash-barlowe', 'intercepted', 'call-in-a-favor', 'vera-khan']
const LANES = 7

export const Beat2Man: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // ── the quiet machinery: data pipelines, always flowing ──
  const pipeIn = interpolate(frame, [sec(T.pipeIn), sec(T.pipeIn + 1.6)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const pipeOut = interpolate(frame, [sec(T.cardsIn - 0.6), sec(T.cardsIn + 1.4)], [1, 0.18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const pipeOp = pipeIn * pipeOut

  // ── anchor (the man) — small, brief, never the whole frame ──
  const anchorOp =
    interpolate(frame, [sec(0.6), sec(2.2)], [0, 0.7], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) *
    interpolate(frame, [sec(T.cardsIn - 0.4), sec(T.cardsIn + 1.0)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const anchorKb = interpolate(frame, [0, sec(T.cardsIn)], [1.05, 1.12], { extrapolateRight: 'clamp' })

  // ── the card game deals in ──
  const cardsOut = interpolate(frame, [sec(T.cardsOut), sec(T.screenRise + 0.4)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // ── the screen rises (one card lifts onto it) ──
  const screenS = spring({ frame: frame - sec(T.screenRise), fps, config: { damping: 16, stiffness: 120, mass: 0.8 } })
  const screenVisible = frame >= sec(T.screenRise)
  const screenY = interpolate(screenS, [0, 1], [160, 0])
  const screenOp = interpolate(frame, [sec(T.screenRise), sec(T.screenRise + 0.7)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // ── the screen becomes an EMPTY editor (he can't build it) ──
  const toEditor = interpolate(frame, [sec(T.editorAt), sec(T.editorAt + 1.0)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) })
  const cursorOn = Math.floor(frame / 8) % 2 === 0
  const dim = interpolate(frame, [sec(T.editorAt + 1.5), sec(T.end)], [1, 0.78], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(125% 95% at 50% 44%, #11272b 0%, #0a1a1d 58%, #06100f 100%)', overflow: 'hidden' }}>
      {/* anchor (the man at his quiet machinery) */}
      <AbsoluteFill style={{ opacity: anchorOp }}>
        <Img src={anchor} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 40%', transform: `scale(${anchorKb})`, transformOrigin: '50% 45%' }} />
        <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 50% 48%, transparent 30%, #06100fdd 100%)' }} />
      </AbsoluteFill>

      {/* data-pipeline machinery — flowing packets */}
      <AbsoluteFill style={{ opacity: pipeOp, pointerEvents: 'none' }}>
        {Array.from({ length: LANES }).map((_, i) => {
          const y = 120 + i * 130
          return (
            <div key={i} style={{ position: 'absolute', top: y, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.teal}33 20%, ${C.teal}55 50%, ${C.teal}33 80%, transparent)` }}>
              {/* travelling data packets */}
              {Array.from({ length: 3 }).map((__, k) => {
                const speed = 3.2 + i * 0.5 + k * 1.1
                const x = ((frame * speed + k * 640 + i * 220) % 2100) - 100
                return <div key={k} style={{ position: 'absolute', left: x, top: -3, width: 22, height: 8, borderRadius: 2, background: k % 2 ? C.amber : C.teal, boxShadow: `0 0 12px ${k % 2 ? C.amber : C.teal}`, opacity: 0.9 }} />
              })}
            </div>
          )
        })}
      </AbsoluteFill>

      {/* the card game deals in */}
      {frame >= sec(T.cardsIn) && cardsOut > 0 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: cardsOut }}>
          {HAND.map((type, i) => {
            const s = spring({ frame: frame - sec(T.cardsIn) - i * 4, fps, config: { damping: 15, stiffness: 130, mass: 0.7 } })
            const spread = (i - (HAND.length - 1) / 2)
            const x = interpolate(s, [0, 1], [0, spread * 220])
            const rot = interpolate(s, [0, 1], [0, spread * 7])
            const yIn = interpolate(s, [0, 1], [340, 0])
            const op = interpolate(s, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' })
            return (
              <div key={type} style={{ position: 'absolute', transform: `translate(${x}px, ${yIn + Math.abs(spread) * 18}px) rotate(${rot}deg)`, opacity: op, filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.5))' }}>
                <TrailerCard type={type} width={230} />
              </div>
            )
          })}
        </AbsoluteFill>
      )}

      {/* the screen rises → becomes an empty editor */}
      {screenVisible && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: screenOp * dim }}>
          <div style={{ transform: `translateY(${screenY}px)`, width: 900, borderRadius: 14, background: `linear-gradient(160deg, ${C.panel}, #060f11)`, border: `1px solid ${C.panelEdge}`, boxShadow: '0 40px 110px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
            {/* chrome */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px', borderBottom: `1px solid ${C.panelEdge}`, background: '#08171a' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#e0431f' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffb000' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#54d6a0' }} />
              <span style={{ marginLeft: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, color: C.chrome }}>
                {toEditor > 0.5 ? 'untitled — 0 lines' : 'BURNED'}
              </span>
            </div>
            <div style={{ height: 360, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {/* before editor: a card on the screen */}
              <div style={{ opacity: 1 - toEditor, transform: `scale(${interpolate(toEditor, [0, 1], [1, 0.7])})`, position: 'absolute' }}>
                <TrailerCard type="dash-barlowe" width={200} />
              </div>
              {/* editor: empty, blinking cursor — "no idea how to build it" */}
              <div style={{ opacity: toEditor, position: 'absolute', inset: 0, padding: '24px 28px', fontFamily: "'JetBrains Mono', monospace", fontSize: 22 }}>
                <span style={{ color: '#2c5256', marginRight: 16 }}>1</span>
                <span style={{ display: 'inline-block', width: 11, height: 24, background: C.chrome, opacity: cursorOn ? 0.8 : 0.15, verticalAlign: 'text-bottom' }} />
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* cinematic overlays */}
      <AbsoluteFill style={{ background: 'radial-gradient(130% 100% at 50% 48%, transparent 52%, #04080899 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ opacity: 0.05, pointerEvents: 'none', backgroundImage: GRAIN_URI, backgroundSize: '220px 220px' }} />
    </AbsoluteFill>
  )
}

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
