import React from 'react'
import { AbsoluteFill, Audio, Img, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { TrailerCard } from '../lib/TrailerCard'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'
import voMaster from '../../out/vo/janet-vo-master.wav'
import anchor from '../assets/briggsy-anchor.png'

/**
 * BEAT 2 — THE BET (2026-05-29). Quiet, moody. The anchor establishes the
 * unglamorous everyman ("builds data pipelines, the quiet machinery"), then the
 * bet: a dark screen + a lone blinking cursor ("no idea how to build it
 * himself"), a warm spark as he bets on the machine ("not a flicker of doubt"),
 * and Janet's dry "I gave it two weeks." Beat 2 lives at 30.52s in master.
 */

const FPS = 30
const sec = (s: number) => Math.round(s * FPS)
const BEAT2_START_SEC = 30.52

const T = {
  anchorIn: 0.4,
  anchorOut: 7.5, // "decided that card game deserved a screen"
  cardToScreen: 8.0,
  betDark: 11.0, // "no idea how to build it himself"
  spark: 18.0, // "He knew the machine could. Not a flicker of doubt." (machine cue 48.43 → 17.91 local)
  twoWeeks: 22.4, // "I gave it two weeks." (janet-doubt 52.68 → 22.16 local)
  fadeStart: 24.6,
  end: 25.48,
}
export const BEAT2_FRAMES = sec(T.end)

export const Beat2TheBet: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const center: React.CSSProperties = { position: 'absolute', left: '50%', top: '50%', transformOrigin: 'center center' }

  // anchor establishing (push-in, crossfade out)
  const kb = interpolate(frame, [0, sec(T.anchorOut)], [1.04, 1.12], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const anchorOpacity =
    interpolate(frame, [sec(T.anchorIn), sec(T.anchorIn + 1.4)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) *
    interpolate(frame, [sec(T.anchorOut - 1.2), sec(T.anchorOut + 0.4)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // drifting data-pipeline lines (the "quiet machinery")
  const pipeOpacity = interpolate(frame, [sec(1), sec(3), sec(T.anchorOut)], [0, 0.5, 0.6], { extrapolateRight: 'clamp' }) *
    interpolate(frame, [sec(T.anchorOut - 0.5), sec(T.anchorOut + 0.5)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // the card → a screen
  const cs = spring({ frame: frame - sec(T.cardToScreen), fps, config: { damping: 15, stiffness: 130, mass: 0.7 } })
  const cardOut = interpolate(frame, [sec(T.betDark - 0.6), sec(T.betDark)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const cardVisible = frame >= sec(T.cardToScreen) && frame < sec(T.betDark)
  const cardY = interpolate(cs, [0, 1], [120, 0])
  const cardOpacity = interpolate(cs, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }) * cardOut

  // the bet — dark screen + blinking cursor
  const screenOpacity = interpolate(frame, [sec(T.betDark), sec(T.betDark + 1)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const cursorBlink = Math.sin((frame - sec(T.betDark)) * 0.5) > 0 ? 1 : 0.15
  // warm spark on "the machine could"
  const spark = interpolate(frame, [sec(T.spark), sec(T.spark + 0.6), sec(T.spark + 2.2)], [0, 0.8, 0.45], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const screenWarm = interpolate(frame, [sec(T.spark), sec(T.spark + 1.5)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // "TWO WEEKS" dry stamp
  const tw = spring({ frame: frame - sec(T.twoWeeks), fps, config: { damping: 14, stiffness: 180, mass: 0.7 } })
  const twVisible = frame >= sec(T.twoWeeks)
  const twOpacity = twVisible ? interpolate(tw, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }) : 0
  const twScale = twVisible ? interpolate(tw, [0, 1], [0.86, 1]) : 0.86

  const fade = interpolate(frame, [sec(T.fadeStart), sec(T.end)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(125% 95% at 50% 44%, #122a2e 0%, #0a1a1d 58%, #06100f 100%)' }}>
      <Audio src={voMaster} startFrom={sec(BEAT2_START_SEC)} />

      {/* anchor */}
      <AbsoluteFill style={{ opacity: anchorOpacity }}>
        <Img src={anchor} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 42%', transform: `scale(${kb})`, transformOrigin: '50% 45%' }} />
        <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 50% 48%, transparent 38%, #06100fcc 100%)' }} />
      </AbsoluteFill>

      {/* data-pipeline lines */}
      <AbsoluteFill style={{ opacity: pipeOpacity, pointerEvents: 'none' }}>
        {Array.from({ length: 7 }).map((_, i) => {
          const y = 90 + i * 130
          const dx = ((frame * (0.6 + i * 0.12)) % 300) - 150
          return (
            <div key={i} style={{ position: 'absolute', top: y, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #2f6b6f88 40%, #45b3b366 50%, #2f6b6f88 60%, transparent)', transform: `translateX(${dx}px)` }} />
          )
        })}
      </AbsoluteFill>

      {/* card → screen */}
      {cardVisible && (
        <div style={{ ...center, transform: `translate(-50%, -50%) translateY(${cardY}px)`, opacity: cardOpacity }}>
          <TrailerCard type="dash-barlowe" width={340} />
        </div>
      )}

      {/* the bet — dark screen + cursor + spark */}
      {frame >= sec(T.betDark) && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: screenOpacity }}>
          <div style={{ width: 880, height: 480, borderRadius: 10, background: `linear-gradient(160deg, #0a1c20, #060f11)`, border: '1px solid #1b3a3e', boxShadow: `0 30px 90px rgba(0,0,0,0.6), inset 0 0 120px rgba(${Math.round(224 * screenWarm)},${Math.round(67 * screenWarm)},${Math.round(31 * screenWarm)},${0.18 * screenWarm})`, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 60, top: 64, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, color: '#5f8b8f' }}>{'>'}</span>
              <span style={{ display: 'inline-block', width: 16, height: 34, background: spark > 0 ? '#ffb000' : '#7fd1d1', opacity: cursorBlink, boxShadow: spark > 0 ? `0 0 ${30 * spark}px #ffb000` : 'none' }} />
            </div>
            {/* spark glow */}
            <AbsoluteFill style={{ background: 'radial-gradient(40% 50% at 12% 24%, #ffb00066 0%, transparent 60%)', opacity: spark, borderRadius: 10 }} />
          </div>
        </AbsoluteFill>
      )}

      {/* TWO WEEKS */}
      {twVisible && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: twOpacity }}>
          <div style={{ transform: `scale(${twScale})`, textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, letterSpacing: '0.5em', color: '#5f8b8f', marginBottom: 14 }}>SHE GAVE IT</div>
            <div style={{ fontFamily: "'Clash Display', system-ui, sans-serif", fontWeight: 900, fontSize: 150, letterSpacing: '-0.01em', textTransform: 'uppercase', color: '#e8ddc6', textShadow: '0 0 60px rgba(120,200,200,0.25)' }}>TWO WEEKS</div>
          </div>
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
