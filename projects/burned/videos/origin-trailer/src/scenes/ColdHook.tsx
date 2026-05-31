import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'

/**
 * COLD HOOK (kinetic, 2026-05-31) — the open for the ShortCutFinale A/B where the
 * roster slam moves to the END. A spy CASE-FILE assembling itself under the hook
 * ("every great operation has an origin story"): classified stamps slam in on an
 * Archer-title cadence, redaction bars sweep, a comms ticker types, the reticle
 * locks onto OPERATION BURNED, ORIGIN — DECLASSIFIED stamps. Energetic but does
 * NOT spend the operative cast (saved for the finale) or the BURNED wordmark.
 * Silent (the cut owns the VO).
 */

const FPS = 30
const sec = (s: number) => Math.round(s * FPS)
export const COLD_HOOK_FRAMES = sec(6.4)

const C = { bg: '#06100f', cream: '#e8ddc6', amber: '#ffb000', burn: '#e0431f', teal: '#45b3b3', chrome: '#5f8b8f' }
const mono = "'JetBrains Mono', monospace"
const display = "'Clash Display', system-ui, sans-serif"

// Classified stamps that slam in on a briefing cadence (staggered).
type Stamp = { text: string; at: number; topPct: number; size: number; color: string; rot: number; track: string }
const STAMPS: Stamp[] = [
  { text: 'PENDLETON AGENCY', at: 0.15, topPct: 22, size: 30, color: C.chrome, rot: 0, track: '0.46em' },
  { text: 'CLASSIFIED // EYES ONLY', at: 0.5, topPct: 72, size: 22, color: C.burn, rot: -7, track: '0.28em' },
  { text: 'CASE No. 0-BURNED-01', at: 0.85, topPct: 30, size: 17, color: C.chrome, rot: 0, track: '0.34em' },
]

// Redaction bars that sweep across (censor-reveal).
const REDACTIONS = [
  { y: 41, at: 0.35, w: 0.5, dur: 0.9 },
  { y: 47, at: 0.55, w: 0.62, dur: 1.0 },
  { y: 53, at: 0.75, w: 0.44, dur: 0.9 },
]

const TICKER = '▸ INTERCEPT // SUBJECT: ONE OPERATIVE, ONE MACHINE // ORIGIN OF OPERATION BURNED // PRIORITY: EYES ONLY //'

export const ColdHook: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps

  const inOp = interpolate(frame, [0, sec(0.4)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const gridShift = (frame * 0.6) % 80

  // reticle: snaps in, then LOCKS at ~2.0 (as the hook lands)
  const retS = spring({ frame: frame - sec(0.1), fps, config: { damping: 12, stiffness: 200, mass: 0.8 } })
  const retScale = interpolate(retS, [0, 1], [1.7, 1])
  const lock = interpolate(frame, [sec(2.0), sec(2.45)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const retRing = 360 - lock * 60 // contracts on lock
  const lockPulse = interpolate(frame, [sec(2.0), sec(2.2), sec(2.7)], [0, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // central CASE-FILE title resolves on the hook (NOT the BURNED wordmark)
  const titleOp = interpolate(frame, [sec(2.0), sec(2.5)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const declassS = spring({ frame: frame - sec(2.6), fps, config: { damping: 9, stiffness: 210, mass: 0.7 } })
  const declassVisible = frame >= sec(2.6)
  const declassScale = interpolate(declassS, [0, 1], [1.6, 1])
  const declassOp = declassVisible ? interpolate(declassS, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }) : 0

  // comms ticker types in
  const tickerChars = Math.max(0, Math.floor((t - 0.4) * 26))
  const blink = Math.floor(frame / 14) % 2 === 0

  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 46%, #11272b 0%, #0a1a1d 55%, ${C.bg} 100%)`, overflow: 'hidden', opacity: inOp }}>
      {/* drifting blueprint grid */}
      <AbsoluteFill style={{ opacity: 0.08, backgroundImage: `linear-gradient(${C.teal} 1px, transparent 1px), linear-gradient(90deg, ${C.teal} 1px, transparent 1px)`, backgroundSize: '80px 80px', transform: `translate(${gridShift}px, ${gridShift}px)` }} />

      {/* reticle (snaps in, locks on the hook) */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ position: 'absolute', width: retRing, height: retRing, border: `2px solid ${C.amber}`, borderRadius: '50%', opacity: 0.4 * retScale, transform: `scale(${retScale})` }} />
        <div style={{ position: 'absolute', width: 560, height: 1, background: C.amber, opacity: 0.28 }} />
        <div style={{ position: 'absolute', width: 1, height: 560, background: C.amber, opacity: 0.28 }} />
        {/* lock brackets */}
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
          <div key={i} style={{ position: 'absolute', width: 26, height: 26, borderLeft: sx < 0 ? `2px solid ${C.amber}` : 'none', borderRight: sx > 0 ? `2px solid ${C.amber}` : 'none', borderTop: sy < 0 ? `2px solid ${C.amber}` : 'none', borderBottom: sy > 0 ? `2px solid ${C.amber}` : 'none', transform: `translate(${sx * (150 - lock * 30)}px, ${sy * (150 - lock * 30)}px)`, opacity: lock }} />
        ))}
      </AbsoluteFill>

      {/* redaction bars sweeping */}
      {REDACTIONS.map((r, i) => {
        const p = interpolate(frame, [sec(r.at), sec(r.at + r.dur)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) })
        if (p <= 0) return null
        return (
          <div key={i} style={{ position: 'absolute', top: `${r.y}%`, left: `${20 + i * 6}%`, width: `${r.w * 100 * (1 - Math.abs(0.5 - p) * 0.4)}%`, height: 10, background: '#05100f', boxShadow: `0 0 0 1px ${C.chrome}55`, transform: `translateX(${(1 - p) * -40}px)`, opacity: interpolate(p, [0, 0.1, 0.85, 1], [0, 1, 1, 0.2]) }} />
        )
      })}

      {/* classified stamps slamming in */}
      {STAMPS.map((s, i) => {
        const sp = spring({ frame: frame - sec(s.at), fps, config: { damping: 8, stiffness: 220, mass: 0.7 } })
        const vis = frame >= sec(s.at)
        if (!vis) return null
        const sc = interpolate(sp, [0, 1], [1.8, 1])
        const op = interpolate(sp, [0, 0.25], [0, 1], { extrapolateRight: 'clamp' })
        const boxed = s.color === C.burn
        return (
          <AbsoluteFill key={i} style={{ justifyContent: 'flex-start', alignItems: 'center' }}>
            <div style={{ position: 'absolute', top: `${s.topPct}%`, transform: `rotate(${s.rot}deg) scale(${sc})`, opacity: op, fontFamily: mono, fontSize: s.size, letterSpacing: s.track, color: s.color, padding: boxed ? '6px 14px' : 0, border: boxed ? `2px solid ${s.color}` : 'none', borderRadius: boxed ? 4 : 0 }}>
              {s.text}
            </div>
          </AbsoluteFill>
        )
      })}

      {/* central CASE-FILE title (resolves on the hook) */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', transform: 'translateY(2px)' }}>
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 64, letterSpacing: '0.04em', color: C.cream, opacity: titleOp, textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
            OPERATION BURNED
          </div>
          {declassVisible && (
            <div style={{ marginTop: 16, display: 'inline-block', fontFamily: mono, fontSize: 18, letterSpacing: '0.4em', color: C.burn, border: `2px solid ${C.burn}`, borderRadius: 5, padding: '6px 16px', transform: `rotate(-4deg) scale(${declassScale})`, opacity: declassOp, boxShadow: `0 0 18px ${C.burn}44` }}>
              ORIGIN — DECLASSIFIED
            </div>
          )}
        </div>
      </AbsoluteFill>

      {/* lock flash */}
      <AbsoluteFill style={{ background: `radial-gradient(50% 40% at 50% 50%, ${C.amber} 0%, transparent 70%)`, opacity: lockPulse * 0.4, mixBlendMode: 'screen', pointerEvents: 'none' }} />

      {/* comms ticker */}
      <div style={{ position: 'absolute', bottom: 54, left: 0, right: 0, textAlign: 'center', fontFamily: mono, fontSize: 15, letterSpacing: '0.22em', color: C.teal, opacity: 0.8 }}>
        {TICKER.slice(0, tickerChars)}<span style={{ opacity: blink ? 1 : 0 }}>▮</span>
      </div>

      {/* cinematic overlays */}
      <AbsoluteFill style={{ background: 'radial-gradient(130% 100% at 50% 48%, transparent 50%, #04080899 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ opacity: 0.05, pointerEvents: 'none', backgroundImage: GRAIN_URI, backgroundSize: '220px 220px' }} />
    </AbsoluteFill>
  )
}

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
