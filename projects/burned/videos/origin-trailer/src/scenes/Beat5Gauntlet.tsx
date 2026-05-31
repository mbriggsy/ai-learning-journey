import React from 'react'
import {
  AbsoluteFill,
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

/**
 * BEAT 5 — THE GAUNTLET + IT'S GOOD (short recut, 2026-05-31). The new VO:
 * "Then a swarm of machines tried to break it. It held. Every time. And
 * somehow, the thing is good."
 *
 * NOT the old card-scatter swarm. A swarm of MACHINE agents (reticles + red
 * attack beams) converges on the held game (a tight real-card cluster). The
 * assault peaks; on "it held" an amber shield SNAPS, every beam flips green and
 * is repelled, the breach counter locks at 1407 ATTACKS · 0 BREACHES (the same
 * 1407 tests from beat 4 — the gauntlet IS the test swarm). Then the chaos
 * clears and the cluster settles, warm and lit — the dryness cracks toward
 * respect. Audio-free (ShortCut owns the single VO track). Deterministic motion
 * (angle/sin by index — no Math.random). Local frames; beat 5 ≈ 9.8s.
 */

const FPS = 30
const sec = (s: number) => Math.round(s * FPS)
const CX = 960
const CY = 540

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
}

const T = {
  swarmIn: 0.5, // machines converge + open fire
  peak: 2.4, // assault intensity peak
  held: 3.2, // "It held." — shield snap, beams flip green
  everyTime: 4.3, // "Every time." — reinforced repel
  clear: 5.92, // turn silence — swarm dissolves
  good: 6.57, // "And somehow, the thing is good." — warm settle
  fadeStart: 9.2,
  end: 9.81,
}
export const BEAT5_GAUNTLET_FRAMES = sec(T.end)

const mono = "'JetBrains Mono', monospace"
const display = "'Clash Display', system-ui, sans-serif"

// The held "thing" — a tight real-card cluster (reads as the game, one unit).
const CLUSTER: { type: CardType; dx: number; rot: number; z: number }[] = [
  { type: 'vera-khan', dx: -118, rot: -8, z: 1 },
  { type: 'sable-ashworth', dx: 118, rot: 8, z: 1 },
  { type: 'dash-barlowe', dx: 0, rot: 0, z: 2 },
]

const SWARM_N = 14

export const Beat5Gauntlet: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Assault intensity 0→1 (in), holds, then repelled at "held".
  const assault =
    interpolate(frame, [sec(T.swarmIn), sec(T.peak)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) *
    interpolate(frame, [sec(T.held), sec(T.held + 0.5)], [1, 0.18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Shield snap on "it held".
  const shield = spring({ frame: frame - sec(T.held), fps, config: { damping: 11, stiffness: 220, mass: 0.7 } })
  const held = frame >= sec(T.held)
  const shieldScale = interpolate(shield, [0, 1], [1.4, 1])
  const shieldOp =
    (held ? interpolate(shield, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }) : 0) *
    interpolate(frame, [sec(T.clear), sec(T.good)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Breach counter → locks at 1407 (= the 1407 tests; the swarm IS the gauntlet).
  const attempts = Math.round(
    interpolate(frame, [sec(T.swarmIn), sec(T.held)], [0, 1407], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  )
  const counterOp = interpolate(frame, [sec(T.swarmIn), sec(T.swarmIn + 0.4)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) *
    interpolate(frame, [sec(T.clear - 0.2), sec(T.clear + 0.5)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Warm "good" bloom.
  const good = interpolate(frame, [sec(T.good), sec(T.good + 1.3)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Cluster jitter under assault; settles bright on "good".
  const jitterAmp = assault * 9
  const jx = Math.sin(frame * 0.9) * jitterAmp
  const jy = Math.cos(frame * 1.13) * jitterAmp
  const clusterScale = interpolate(frame, [sec(T.good), sec(T.good + 1.1)], [1, 1.06], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const clusterBright = 0.78 + good * 0.34

  const fade = interpolate(frame, [sec(T.fadeStart), sec(T.end)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: `radial-gradient(125% 95% at 50% 46%, ${good > 0 ? '#16302e' : '#1a2b2c'} 0%, #0c1719 58%, ${C.bg} 100%)`, overflow: 'hidden' }}>
      {/* ===== SWARM — machine agents converge + fire red attack beams ===== */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {Array.from({ length: SWARM_N }).map((_, i) => {
          const ang = (i / SWARM_N) * Math.PI * 2 + i * 0.7
          // converge: radius shrinks in, pushed back out after "held"
          const inR = interpolate(frame, [sec(T.swarmIn - 0.3 + i * 0.03), sec(T.peak)], [980, 430], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          const repel = interpolate(frame, [sec(T.held), sec(T.clear)], [0, 620], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          const r = inR + repel
          // tiny orbital wobble keeps them alive
          const wob = Math.sin(frame * 0.18 + i) * 14 * assault
          const rx = CX + Math.cos(ang) * r + Math.cos(ang + 1.57) * wob
          const ry = CY + Math.sin(ang) * r + Math.sin(ang + 1.57) * wob
          const appear = interpolate(frame, [sec(T.swarmIn - 0.3 + i * 0.03), sec(T.swarmIn + 0.3 + i * 0.03)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          const dissolve = interpolate(frame, [sec(T.clear - 0.3), sec(T.clear + 0.6)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          const op = appear * dissolve
          if (op <= 0) return null

          // beam from reticle → center
          const beamLen = r
          const beamAng = (Math.atan2(CY - ry, CX - rx) * 180) / Math.PI
          // fire pulse — staggered, faster at peak
          const fire = (Math.sin(frame * 0.9 + i * 1.3) + 1) / 2
          const beamColor = held ? C.green : C.red
          const beamOp = (held ? 0.5 : (0.25 + assault * 0.55)) * fire * op

          return (
            <React.Fragment key={i}>
              {/* attack beam */}
              <div
                style={{
                  position: 'absolute',
                  left: rx,
                  top: ry,
                  width: beamLen,
                  height: 2.5,
                  transformOrigin: '0 50%',
                  transform: `rotate(${beamAng}deg)`,
                  background: `linear-gradient(90deg, ${beamColor}00, ${beamColor}, ${beamColor}00)`,
                  boxShadow: `0 0 12px ${beamColor}`,
                  opacity: beamOp,
                }}
              />
              {/* machine reticle */}
              <div style={{ position: 'absolute', left: rx - 13, top: ry - 13, width: 26, height: 26, opacity: op }}>
                <div style={{ position: 'absolute', inset: 0, border: `1.5px solid ${held ? C.green : C.chrome}`, borderRadius: '50%', opacity: 0.8 }} />
                <div style={{ position: 'absolute', left: 12, top: -6, width: 2, height: 38, background: held ? C.green : C.red, opacity: 0.35 }} />
                <div style={{ position: 'absolute', top: 12, left: -6, width: 38, height: 2, background: held ? C.green : C.red, opacity: 0.35 }} />
              </div>
            </React.Fragment>
          )
        })}
      </AbsoluteFill>

      {/* ===== THE HELD THING — tight real-card cluster ===== */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ position: 'relative', transform: `translate(${jx}px, ${jy}px) scale(${clusterScale})` }}>
          {CLUSTER.map((c) => (
            <div
              key={c.type}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translateX(${c.dx}px) rotate(${c.rot}deg)`,
                zIndex: c.z,
                filter: `brightness(${clusterBright}) drop-shadow(0 22px 50px rgba(0,0,0,0.55))`,
              }}
            >
              <TrailerCard type={c.type} width={250} />
            </div>
          ))}
        </div>
      </AbsoluteFill>

      {/* ===== SHIELD SNAP on "it held" ===== */}
      {shieldOp > 0 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 560 * shieldScale, height: 560 * shieldScale, borderRadius: '50%', border: `2.5px solid ${C.amber}`, boxShadow: `0 0 50px ${C.amber}66, inset 0 0 70px ${C.amber}22`, opacity: shieldOp }} />
          <div style={{ position: 'absolute', width: 640 * shieldScale, height: 640 * shieldScale, borderRadius: '50%', border: `1px solid ${C.amber}`, opacity: shieldOp * 0.4 }} />
        </AbsoluteFill>
      )}

      {/* ===== BREACH COUNTER (mono HUD) ===== */}
      {counterOp > 0 && (
        <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 96, opacity: counterOp }}>
          <div style={{ textAlign: 'center', fontFamily: mono }}>
            <div style={{ fontSize: 18, letterSpacing: '0.42em', color: held ? C.green : C.red, marginBottom: 10 }}>
              {held ? 'ATTACK WITHSTOOD' : 'INCOMING — BREACH ATTEMPTS'}
            </div>
            <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: '0.05em', color: held ? C.green : C.cream }}>
              {held ? '1407' : attempts}
              <span style={{ fontSize: 26, color: C.chrome }}> {held ? 'ATTACKS · 0 BREACHES' : 'AND COUNTING'}</span>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* "HELD" stamp */}
      {held && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              bottom: 150,
              fontFamily: display,
              fontWeight: 900,
              fontSize: 64,
              letterSpacing: '0.04em',
              color: C.amber,
              textShadow: `0 0 40px ${C.amber}66`,
              opacity: interpolate(shield, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }) * interpolate(frame, [sec(T.clear), sec(T.good)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              transform: `scale(${interpolate(shield, [0, 1], [1.2, 1])})`,
            }}
          >
            IT HELD.
          </div>
        </AbsoluteFill>
      )}

      {/* warm "good" bloom */}
      <AbsoluteFill style={{ background: `radial-gradient(48% 46% at 50% 48%, ${C.amber}2e 0%, transparent 70%)`, opacity: good, mixBlendMode: 'screen', pointerEvents: 'none' }} />
      {/* red chaos wash under assault */}
      <AbsoluteFill style={{ background: `radial-gradient(80% 70% at 50% 50%, ${C.red}22 0%, transparent 70%)`, opacity: assault * 0.6, mixBlendMode: 'screen', pointerEvents: 'none' }} />

      {/* cinematic overlays */}
      <AbsoluteFill style={{ background: 'radial-gradient(130% 100% at 50% 48%, transparent 50%, #04080899 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ opacity: 0.05, pointerEvents: 'none', backgroundImage: GRAIN_URI, backgroundSize: '220px 220px' }} />
      <AbsoluteFill style={{ background: '#000', opacity: fade }} />
    </AbsoluteFill>
  )
}

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
