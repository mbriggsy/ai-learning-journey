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
 * COLD OPEN — THE ROSTER (prototype 2026-05-31). The fix for the dead 14s open.
 *
 * Archer-title-sequence energy: a reticle snap, then the operative cast SLAMS in
 * one after another — real card art + bold name + dry epithet + dossier chrome —
 * accelerating into the BURNED wordmark hit. Relentless motion, never a held
 * frame. Real cards only (TrailerCard borrow path). Silent prototype — rhythm
 * will marry a brass hook / Janet's first line later.
 *
 * NOTE: epithets ("THE FACE", etc.) are PLACEHOLDER flavor — Briggsy owns canon.
 */

const FPS = 30
const sec = (s: number) => Math.round(s * FPS)

const C = {
  bg: '#06100f',
  cream: '#e8ddc6',
  amber: '#ffb000',
  burn: '#e0431f',
  teal: '#45b3b3',
  chrome: '#5f8b8f',
}

type Op = { type: CardType; name: string; epithet: string }
const ROSTER: Op[] = [
  { type: 'dash-barlowe', name: 'DASH BARLOWE', epithet: 'THE FACE' },
  { type: 'vera-khan', name: 'VERA KHAN', epithet: 'THE CLOSER' },
  { type: 'sable-ashworth', name: 'SABLE ASHWORTH', epithet: 'THE GHOST' },
  { type: 'janet-broadside', name: 'JANET BROADSIDE', epithet: 'THE BOSS' },
  { type: 'neal-proctor', name: 'NEAL PROCTOR', epithet: 'THE NEW GUY' },
  { type: 'agent-x', name: 'AGENT X', epithet: '[ REDACTED ]' },
]

const INTRO = 1.85 // PENDLETON AGENCY classification stamp gets a full second to breathe before the operatives slam (Briggsy note 2026-06-01)
const CARD_STEP = 0.68 // hard handoff cadence — Archer-title rhythm
const FIRST = INTRO
const FLURRY = FIRST + ROSTER.length * CARD_STEP // 1.85 + 6*0.68 = 5.93
const BURNED_IN = FLURRY + 0.55
const END = BURNED_IN + 4.2 // hold the wordmark long enough for Janet's hook line

export const COLD_OPEN_ROSTER_FRAMES = sec(END)

const mono = "'JetBrains Mono', monospace"
const display = "'Clash Display', system-ui, sans-serif"

/** One operative slam — card + name + epithet + corner brackets. */
const OperativeSlam: React.FC<{ op: Op; startSec: number; index: number }> = ({ op, startSec, index }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - sec(startSec)
  const winEnd = sec(CARD_STEP) // hard cut at handoff
  if (local < 0 || local > winEnd + 2) return null

  const s = spring({ frame: local, fps, config: { damping: 13, stiffness: 220, mass: 0.7 } })
  const enter = interpolate(s, [0, 1], [0, 1])
  const scale = interpolate(s, [0, 1], [1.35, 1])
  const op0 = interpolate(local, [0, 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // hard cut out at the very end of the window (next card slams over)
  const out = interpolate(local, [winEnd - 1, winEnd], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const opacity = op0 * out

  const left = index % 2 === 0
  const cardX = left ? -360 : 360
  const rot = left ? -3 : 3
  const nameSide: React.CSSProperties = left
    ? { left: '54%', textAlign: 'left', alignItems: 'flex-start' }
    : { right: '54%', textAlign: 'right', alignItems: 'flex-end' }

  // name clip-in
  const nameClip = interpolate(s, [0.1, 0.7], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* color block accent behind card */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            position: 'absolute',
            transform: `translateX(${cardX}px) translateY(18px) rotate(${rot}deg) scale(${interpolate(s, [0, 1], [1.2, 1.06])})`,
            width: 300,
            height: 420,
            background: index % 3 === 0 ? C.burn : index % 3 === 1 ? C.teal : C.amber,
            opacity: 0.16,
            borderRadius: 12,
          }}
        />
      </AbsoluteFill>

      {/* the real card */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ transform: `translateX(${cardX}px) rotate(${rot}deg) scale(${scale})`, filter: 'drop-shadow(0 24px 60px rgba(0,0,0,0.55))' }}>
          <TrailerCard type={op.type} width={300} />
        </div>
      </AbsoluteFill>

      {/* name block */}
      <AbsoluteFill style={{ justifyContent: 'center' }}>
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', gap: 10, ...nameSide, top: '34%', maxWidth: 620 }}>
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontFamily: display,
                fontWeight: 900,
                fontSize: 84,
                lineHeight: 0.96,
                letterSpacing: '-0.01em',
                color: C.cream,
                clipPath: `inset(0 ${left ? 100 - nameClip : 0}% 0 ${left ? 0 : 100 - nameClip}%)`,
                textShadow: '0 4px 24px rgba(0,0,0,0.5)',
              }}
            >
              {op.name}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexDirection: left ? 'row' : 'row-reverse', opacity: enter }}>
            <span style={{ width: 38, height: 2, background: C.amber }} />
            <span style={{ fontFamily: mono, fontSize: 26, letterSpacing: '0.34em', color: C.amber }}>{op.epithet}</span>
          </div>
          <span style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.3em', color: C.chrome, opacity: enter * 0.8 }}>
            PENDLETON AGENCY // OP-{String(index + 1).padStart(2, '0')}
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

export const ColdOpenRoster: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // intro reticle + classification stamp
  const reticle = interpolate(frame, [0, sec(0.4)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const reticleOut = interpolate(frame, [sec(INTRO - 0.2), sec(INTRO + 0.3)], [1, 0.25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const stampOpacity =
    interpolate(frame, [sec(0.15), sec(0.5)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) *
    interpolate(frame, [sec(INTRO - 0.1), sec(INTRO + 0.25)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // flurry — all cards flash-stack toward center
  const flurry = frame >= sec(FLURRY) && frame < sec(BURNED_IN)
  const flurryT = interpolate(frame, [sec(FLURRY), sec(BURNED_IN)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // BURNED wordmark slam
  const bs = spring({ frame: frame - sec(BURNED_IN), fps, config: { damping: 12, stiffness: 200, mass: 0.9 } })
  const burnedVisible = frame >= sec(BURNED_IN)
  const burnedScale = interpolate(bs, [0, 1], [1.5, 1]) * interpolate(frame, [sec(BURNED_IN), sec(BURNED_IN + 0.16), sec(BURNED_IN + 0.5)], [1.06, 1.0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) })
  const burnedOpacity = burnedVisible ? interpolate(bs, [0, 0.25], [0, 1], { extrapolateRight: 'clamp' }) : 0
  const burnFlash = interpolate(frame, [sec(BURNED_IN), sec(BURNED_IN + 0.1), sec(BURNED_IN + 0.55)], [0, 0.7, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // moving blueprint grid (always-on Archer-coded motion)
  const gridShift = (frame * 0.5) % 80

  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 46%, #11272b 0%, #0a1a1d 55%, ${C.bg} 100%)`, overflow: 'hidden' }}>
      {/* blueprint grid */}
      <AbsoluteFill style={{ opacity: 0.08, backgroundImage: `linear-gradient(${C.teal} 1px, transparent 1px), linear-gradient(90deg, ${C.teal} 1px, transparent 1px)`, backgroundSize: '80px 80px', transform: `translate(${gridShift}px, ${gridShift}px)` }} />

      {/* intro reticle */}
      {frame < sec(INTRO + 0.4) && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: reticle * reticleOut }}>
          <div style={{ position: 'absolute', width: 360, height: 360, border: `2px solid ${C.amber}`, borderRadius: '50%', opacity: 0.5 }} />
          <div style={{ position: 'absolute', width: 480, height: 1, background: C.amber, opacity: 0.4 }} />
          <div style={{ position: 'absolute', width: 1, height: 480, background: C.amber, opacity: 0.4 }} />
          <div style={{ position: 'absolute', width: 24, height: 24, border: `2px solid ${C.amber}`, borderRadius: '50%' }} />
        </AbsoluteFill>
      )}

      {/* classification stamp */}
      {stampOpacity > 0 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: stampOpacity }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: mono, fontSize: 22, letterSpacing: '0.42em', color: C.chrome }}>PENDLETON AGENCY</div>
            <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.36em', color: C.amber, marginTop: 10 }}>CASE FILE — OPERATION BURNED</div>
          </div>
        </AbsoluteFill>
      )}

      {/* operative slams */}
      {ROSTER.map((op, i) => (
        <OperativeSlam key={op.type} op={op} index={i} startSec={FIRST + i * CARD_STEP} />
      ))}

      {/* flurry — quick stacked flashes */}
      {flurry && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          {ROSTER.map((op, i) => {
            const t = (flurryT * ROSTER.length) - i
            const vis = t > 0 && t < 1.2
            if (!vis) return null
            const sc = interpolate(t, [0, 1.2], [1.1, 0.7])
            return (
              <div key={op.type} style={{ position: 'absolute', transform: `translateX(${(i - 2.5) * 36}px) rotate(${(i - 2.5) * 4}deg) scale(${sc})`, opacity: 0.85 }}>
                <TrailerCard type={op.type} width={240} />
              </div>
            )
          })}
        </AbsoluteFill>
      )}

      {/* BURNED wordmark slam */}
      {burnedVisible && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ transform: `scale(${burnedScale})`, textAlign: 'center' }}>
            <div style={{ fontFamily: mono, fontSize: 22, letterSpacing: '0.5em', color: C.chrome, marginBottom: 18 }}>THE AGENCY PRESENTS</div>
            <div style={{ fontFamily: display, fontWeight: 900, fontSize: 220, lineHeight: 0.9, letterSpacing: '-0.02em', color: C.cream, textShadow: `0 0 80px ${C.burn}88` }}>
              BURNED
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* burn flash on the slam */}
      <AbsoluteFill style={{ background: `radial-gradient(60% 50% at 50% 50%, ${C.burn} 0%, transparent 70%)`, opacity: burnFlash, mixBlendMode: 'screen', pointerEvents: 'none' }} />

      {/* cinematic overlays */}
      <AbsoluteFill style={{ background: 'radial-gradient(130% 100% at 50% 48%, transparent 50%, #04080899 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ opacity: 0.05, pointerEvents: 'none', backgroundImage: GRAIN_URI, backgroundSize: '220px 220px' }} />
    </AbsoluteFill>
  )
}

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
