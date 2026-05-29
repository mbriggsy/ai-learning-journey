import React from 'react'
import {
  AbsoluteFill,
  Audio,
  Img,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from 'remotion'
import { TrailerCard } from '../lib/TrailerCard'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'
// Trailer-own assets:
import voMaster from '../../out/vo/janet-vo-master.wav'
import anchor from '../assets/briggsy-anchor.png'

/**
 * BEAT 1 — COLD OPEN (2026-05-29). The first REAL trailer beat (not a proof).
 *
 * Approved anchor establishes the warmth (Janet: "bourbon, a folding table, a
 * card game"); then real BURNED-deck cards carry the rules line — a draw, the
 * BURNED card slamming in on the word "burned", the betrayal shove, last card
 * standing. All cut to Janet's real VO (master WAV, beat 1 = frames 0..end).
 * Illustration for mood; REAL cards for the game. No Imagen cards, no hands.
 */

const FPS = 30
const sec = (s: number) => Math.round(s * FPS)

// Beat-1 VO landmarks (sec), from out/vo/manifest.json word-proportional timing.
const T = {
  anchorIn: 0.6,
  anchorOutStart: 13.5,
  anchorOutEnd: 15.2,
  stageIn: 13.8,
  draw: 16.3, // "Draw a card"
  burned: 19.0, // "...gets you burned" — the hit
  victim: 21.3,
  shove: 22.6, // "person next to you draws it first"
  clear: 26.3,
  stand: 26.8, // "Last cover standing wins"
  fadeOut: 29.6,
  end: 30.4,
}

export const BEAT1_FRAMES = sec(T.end)

/** Damped camera shake — a brief jolt with weight, decaying to zero. */
const shake = (frame: number, startF: number, durF: number, mag: number) => {
  if (frame < startF || frame > startF + durF) return { x: 0, y: 0 }
  const t = (frame - startF) / durF
  const decay = 1 - t
  return {
    x: Math.sin((frame - startF) * 1.7) * mag * decay,
    y: Math.cos((frame - startF) * 2.3) * mag * decay * 0.6,
  }
}

export const Beat1ColdOpen: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // --- Establishing anchor: slow Ken Burns push-in + crossfade out ---
  const kb = interpolate(frame, [sec(T.anchorIn), sec(T.anchorOutEnd)], [1.04, 1.14], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const anchorOpacity =
    interpolate(frame, [sec(T.anchorIn), sec(T.anchorIn + 1.4)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) *
    interpolate(frame, [sec(T.anchorOutStart), sec(T.anchorOutEnd)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // --- Card stage fades up as the anchor recedes ---
  const stageOpacity = interpolate(frame, [sec(T.stageIn), sec(T.stageIn + 1.6)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // --- Draw card (Dash): springs up from below, presents, then exits on the hit ---
  const drawS = spring({ frame: frame - sec(T.draw), fps, config: { damping: 14, stiffness: 130, mass: 0.7 } })
  const drawExit = interpolate(frame, [sec(T.burned - 0.25), sec(T.burned + 0.15)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const drawY = interpolate(drawS, [0, 1], [620, 0]) + drawExit * -90
  const drawScale = interpolate(drawS, [0, 1], [0.7, 1]) * (1 - drawExit * 0.5)
  const drawRot = interpolate(drawS, [0, 1], [-8, -3])
  const drawOpacity = interpolate(drawS, [0, 1], [0, 1]) * (1 - drawExit)

  // --- BURNED card: hard, heavy slam on "burned" ---
  const burnS = spring({ frame: frame - sec(T.burned), fps, config: { damping: 11, stiffness: 220, mass: 0.9 } })
  const burnPunch = interpolate(frame, [sec(T.burned), sec(T.burned + 0.18), sec(T.burned + 0.5)], [1.35, 1.06, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  })
  // Betrayal shove: BURNED card slides toward the victim, then off.
  const shoveX = interpolate(frame, [sec(T.shove), sec(T.shove + 1.6)], [0, -360], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  })
  const burnExit = interpolate(frame, [sec(T.clear - 0.6), sec(T.clear)], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const burnY = interpolate(burnS, [0, 1], [-560, 0])
  const burnScale = interpolate(burnS, [0, 1], [1.7, 1]) * burnPunch
  const burnVisible = frame >= sec(T.burned)
  const burnOpacity = burnVisible ? interpolate(burnS, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }) * burnExit : 0

  // Red/amber flash on the hit
  const flash = interpolate(frame, [sec(T.burned), sec(T.burned + 0.12), sec(T.burned + 0.55)], [0, 0.62, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // --- Victim card (Vera): slides in, gets shoved, knocked away ---
  const vicS = spring({ frame: frame - sec(T.victim), fps, config: { damping: 16, stiffness: 120, mass: 0.7 } })
  const vicKnock = interpolate(frame, [sec(T.shove + 1.2), sec(T.shove + 1.9)], [0, -260], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  })
  const vicExit = interpolate(frame, [sec(T.clear - 0.4), sec(T.clear)], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const vicX = interpolate(vicS, [0, 1], [-820, -300]) + vicKnock
  const vicOpacity = interpolate(vicS, [0, 1], [0, 1]) * vicExit

  // --- Last card standing (Dash returns, centered, calm) ---
  const standS = spring({ frame: frame - sec(T.stand), fps, config: { damping: 18, stiffness: 110, mass: 0.8 } })
  const standY = interpolate(standS, [0, 1], [70, 0])
  const standScale = interpolate(standS, [0, 1], [0.86, 1.04])
  const standGlow = interpolate(frame, [sec(T.stand), sec(T.stand + 1.2)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // --- Global jolt on the BURNED hit ---
  const j = shake(frame, sec(T.burned), sec(0.45), 14)

  // --- End fade ---
  const fade = interpolate(frame, [sec(T.fadeOut), sec(T.end)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const centerWrap: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transformOrigin: 'center center',
  }

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(125% 95% at 50% 42%, #16333855 0%, #0c2024 58%, #06141600 100%), #06100f' }}>
      <Audio src={voMaster} />

      {/* Camera-jolt wrapper */}
      <AbsoluteFill style={{ transform: `translate(${j.x}px, ${j.y}px)` }}>
        {/* Establishing anchor */}
        <AbsoluteFill style={{ opacity: anchorOpacity }}>
          <Img
            src={anchor}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: '50% 42%',
              transform: `scale(${kb})`,
              transformOrigin: '50% 45%',
            }}
          />
          {/* warm-to-dark vignette over the anchor for depth */}
          <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 50% 48%, transparent 38%, #06100fcc 100%)' }} />
        </AbsoluteFill>

        {/* Card stage */}
        <AbsoluteFill style={{ opacity: stageOpacity }}>
          {/* Last-card-standing glow halo */}
          {frame >= sec(T.stand) && (
            <AbsoluteFill
              style={{
                background: 'radial-gradient(46% 42% at 50% 50%, #f0b24055 0%, transparent 72%)',
                opacity: standGlow,
              }}
            />
          )}

          {/* Victim card (Vera) */}
          {frame >= sec(T.victim) && (
            <div style={{ ...centerWrap, transform: `translate(-50%, -50%) translateX(${vicX}px) rotate(-6deg)`, opacity: vicOpacity }}>
              <TrailerCard type="vera-khan" width={360} />
            </div>
          )}

          {/* Draw card (Dash) — also the last one standing */}
          {frame >= sec(T.draw) && frame < sec(T.burned + 0.2) && (
            <div
              style={{ ...centerWrap, transform: `translate(-50%, -50%) translateY(${drawY}px) rotate(${drawRot}deg) scale(${drawScale})`, opacity: drawOpacity }}
            >
              <TrailerCard type="dash-barlowe" width={420} />
            </div>
          )}
          {frame >= sec(T.stand) && (
            <div
              style={{ ...centerWrap, transform: `translate(-50%, -50%) translateY(${standY}px) scale(${standScale})`, opacity: vicExit < 1 ? 1 : 1 }}
            >
              <TrailerCard type="dash-barlowe" width={440} />
            </div>
          )}

          {/* BURNED card — the hit */}
          {burnVisible && frame < sec(T.clear) && (
            <div
              style={{ ...centerWrap, transform: `translate(-50%, -50%) translateX(${shoveX}px) translateY(${burnY}px) scale(${burnScale}) rotate(4deg)`, opacity: burnOpacity }}
            >
              <TrailerCard type="burned" width={460} />
            </div>
          )}
        </AbsoluteFill>

        {/* Hit flash */}
        <AbsoluteFill style={{ background: 'radial-gradient(60% 50% at 50% 50%, #ff5a2e 0%, #e0431f00 70%)', opacity: flash, mixBlendMode: 'screen' }} />
      </AbsoluteFill>

      {/* Cinematic overlays (outside the jolt so they stay locked) */}
      <AbsoluteFill style={{ background: 'radial-gradient(130% 100% at 50% 48%, transparent 52%, #04080899 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ opacity: 0.05, pointerEvents: 'none', backgroundImage: GRAIN_URI, backgroundSize: '220px 220px' }} />

      {/* Beat-end fade to black */}
      <AbsoluteFill style={{ background: '#000', opacity: fade }} />
    </AbsoluteFill>
  )
}

// Static film grain (inline SVG turbulence) — subtle texture, no asset needed.
const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
