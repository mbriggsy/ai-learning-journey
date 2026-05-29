import React from 'react'
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import type { CardType } from '@shared/types'
import { TrailerCard } from '../lib/TrailerCard'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'
import voMaster from '../../out/vo/janet-vo-master.wav'

/**
 * BEAT 5 — THE GAUNTLET / SWARM (2026-05-29). Short, kinetic, the comedy-engine
 * chaos. One calm hand → a swarm of adversaries hammers it: real cards jitter
 * and scatter, red attack shards slash in, BURNED cards rain. "agents whose
 * only job was to hunt the game's weak points and break them." Beat 5 lives at
 * 108.07s in master (~12s). Deterministic motion (sin by index — no Math.random).
 */

const FPS = 30
const sec = (s: number) => Math.round(s * FPS)
const BEAT5_START_SEC = 108.07

const T = {
  calm: 0,
  swarm: 2.6, // "unleashed a swarm of adversaries"
  break: 5.2, // "hunt the weak points and break them"
  fadeStart: 11.0,
  end: 11.88,
}
export const BEAT5_FRAMES = sec(T.end)

const SWARM_CARDS: CardType[] = [
  'dash-barlowe', 'vera-khan', 'go-dark', 'intercepted', 'sable-ashworth',
  'neal-proctor', 'agent-x', 'falsify-intel', 'reassign', 'extraction',
]
// Deterministic scatter targets (vw/vh fractions) + phase, keyed by index.
const POS = SWARM_CARDS.map((_, i) => ({
  x: (((i * 137) % 100) - 50) / 50, // -1..1
  y: (((i * 91) % 100) - 50) / 50,
  ph: (i * 1.7) % 6.28,
  sp: 0.6 + (i % 4) * 0.18,
}))

export const Beat5TheSwarm: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const center: React.CSSProperties = { position: 'absolute', left: '50%', top: '50%', transformOrigin: 'center center' }

  const swarmProg = interpolate(frame, [sec(T.swarm), sec(T.swarm + 1.5)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const chaos = interpolate(frame, [sec(T.break), sec(T.break + 1)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const fade = interpolate(frame, [sec(T.fadeStart), sec(T.end)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(125% 95% at 50% 46%, #1a2b2c 0%, #0c1719 58%, #060f0f 100%)' }}>
      <Audio src={voMaster} startFrom={sec(BEAT5_START_SEC)} />

      {/* the calm hand → swarmed cards */}
      {SWARM_CARDS.map((type, i) => {
        const p = POS[i]
        const appear = spring({ frame: frame - sec(T.swarm) - i * 1.5, fps, config: { damping: 13, stiffness: 150, mass: 0.6 } })
        // jitter intensifies with chaos
        const jit = (10 + chaos * 36)
        const jx = Math.sin(frame * p.sp + p.ph) * jit
        const jy = Math.cos(frame * p.sp * 1.3 + p.ph) * jit
        const x = p.x * 640 * swarmProg + jx
        const y = p.y * 320 * swarmProg + jy
        const rot = (p.x * 16) + Math.sin(frame * p.sp + p.ph) * (4 + chaos * 10)
        const isCalm = i === 0
        const op = isCalm
          ? interpolate(frame, [sec(0), sec(1)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          : interpolate(appear, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' })
        const baseX = isCalm ? jx * chaos : x
        const baseY = isCalm ? jy * chaos : y
        return (
          <div key={type + i} style={{ ...center, transform: `translate(-50%, -50%) translate(${baseX}px, ${baseY}px) rotate(${rot}deg)`, opacity: op, zIndex: i }}>
            <TrailerCard type={type} width={isCalm ? 240 : 190} />
          </div>
        )
      })}

      {/* red attack shards slashing in */}
      {frame >= sec(T.swarm) && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {Array.from({ length: 6 }).map((_, i) => {
            const start = T.swarm + i * 0.4
            const life = ((frame - sec(start)) % sec(1.4)) / sec(1.4)
            if (frame < sec(start)) return null
            const op = (interpolate(life, [0, 0.15, 0.5, 1], [0, 0.8, 0.5, 0]) * (0.4 + chaos * 0.6))
            const fromLeft = i % 2 === 0
            const yy = (i * 17) % 90
            return (
              <div key={i} style={{ position: 'absolute', top: `${yy}%`, left: fromLeft ? `${-20 + life * 80}%` : `${120 - life * 80}%`, width: '38%', height: 5, background: 'linear-gradient(90deg, transparent, #ff3b1f, #ffae00, transparent)', transform: `rotate(${fromLeft ? -12 : 12}deg)`, opacity: op, boxShadow: '0 0 24px #ff3b1f' }} />
            )
          })}
        </AbsoluteFill>
      )}

      {/* BURNED cards raining on the break */}
      {frame >= sec(T.break) && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {Array.from({ length: 4 }).map((_, i) => {
            const start = T.break + i * 0.5
            if (frame < sec(start)) return null
            const t = (frame - sec(start)) / sec(2.2)
            const x = ((i * 270) % 1600) - 700
            const y = interpolate(t, [0, 1], [-400, 500], { extrapolateRight: 'clamp' })
            const op = interpolate(t, [0, 0.15, 0.85, 1], [0, 1, 1, 0]) * chaos
            const rot = -20 + i * 12 + t * 40
            return (
              <div key={i} style={{ ...center, transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rot}deg)`, opacity: op, zIndex: 50 }}>
                <TrailerCard type="burned" width={170} />
              </div>
            )
          })}
        </AbsoluteFill>
      )}

      {/* red chaos wash */}
      <AbsoluteFill style={{ background: 'radial-gradient(80% 70% at 50% 50%, #ff2e1a22 0%, transparent 70%)', opacity: chaos * 0.7, mixBlendMode: 'screen', pointerEvents: 'none' }} />

      <AbsoluteFill style={{ background: 'radial-gradient(130% 100% at 50% 48%, transparent 50%, #04080899 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ opacity: 0.06, pointerEvents: 'none', backgroundImage: GRAIN_URI, backgroundSize: '220px 220px' }} />
      <AbsoluteFill style={{ background: '#000', opacity: fade }} />
    </AbsoluteFill>
  )
}

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
