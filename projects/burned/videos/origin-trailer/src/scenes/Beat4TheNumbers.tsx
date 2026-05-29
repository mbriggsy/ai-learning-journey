import React from 'react'
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion'
import type { CardType } from '@shared/types'
import { TrailerCard } from '../lib/TrailerCard'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'
import voMaster from '../../out/vo/janet-vo-master.wav'

/**
 * BEAT 4 — THE NUMBERS (2026-05-29). "He pointed and the machine built" — a
 * flurry of real cards assembles (the machine building), then the SCALE as an
 * honest native bar chart: CODE 43,357 · TESTS 29,033 · PLANNING 62,082 — with
 * planning the TALLEST bar (the true flex: more planning than code; NOT a
 * monotone staircase). Numbers are Remotion text overlays, never image-gen.
 * Beat 4 lives at 82.43s in master. Canonical stats per the beat sheet.
 */

const FPS = 30
const sec = (s: number) => Math.round(s * FPS)
const BEAT4_START_SEC = 82.43

const T = {
  build: 0.4, // "He pointed and the machine built"
  buildOut: 5.0,
  code: 5.6, // "43,000 lines of code"
  tests: 9.8, // "29,000 more"
  planning: 14.6, // "62,000 lines of planning"
  punch: 21.0, // "More planning than code"
  measure: 23.3, // "'Measure twice,' they say"
  fadeStart: 24.9,
  end: 25.64,
}
export const BEAT4_FRAMES = sec(T.end)

const FLURRY: CardType[] = ['dash-barlowe', 'go-dark', 'vera-khan', 'intercepted', 'burned', 'agent-x', 'reassign', 'sable-ashworth']

const BARS = [
  { key: 'code', label: 'CODE', value: '43,357', spoken: 'Forty-three thousand', h: 0.7, color: '#1f8a8a', t: 5.6 },
  { key: 'tests', label: 'TESTS', value: '29,033', spoken: 'Twenty-nine thousand', h: 0.47, color: '#c4561f', t: 9.8 },
  { key: 'planning', label: 'PLANNING', value: '62,082', spoken: 'Sixty-two thousand', h: 1.0, color: '#f0b240', t: 14.6 },
]
const MAX_BAR = 600

export const Beat4TheNumbers: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const center: React.CSSProperties = { position: 'absolute', left: '50%', top: '50%', transformOrigin: 'center center' }

  const buildOut = interpolate(frame, [sec(T.buildOut - 0.5), sec(T.buildOut + 0.3)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const chartIn = interpolate(frame, [sec(T.code - 0.6), sec(T.code)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const planningPunch = interpolate(frame, [sec(T.punch), sec(T.punch + 0.3), sec(T.punch + 1.2)], [1, 1.06, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const fade = interpolate(frame, [sec(T.fadeStart), sec(T.end)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(125% 95% at 50% 46%, #16333855 0%, #0c2024 58%, #06100f 100%)' }}>
      <Audio src={voMaster} startFrom={sec(BEAT4_START_SEC)} />

      {/* "the machine built" — card flurry assembling */}
      {frame < sec(T.buildOut + 0.4) && (
        <AbsoluteFill style={{ opacity: buildOut }}>
          {FLURRY.map((type, i) => {
            const bs = spring({ frame: frame - sec(T.build) - i * 2, fps, config: { damping: 14, stiffness: 160, mass: 0.6 } })
            const col = i % 4
            const row = Math.floor(i / 4)
            const tx = (col - 1.5) * 210
            const ty = (row - 0.5) * 280
            const fromX = (i % 2 === 0 ? -1 : 1) * 900
            const x = interpolate(bs, [0, 1], [fromX, tx])
            const rot = interpolate(bs, [0, 1], [i % 2 === 0 ? -20 : 20, (col - 1.5) * 3])
            const op = interpolate(bs, [0, 0.35], [0, 1], { extrapolateRight: 'clamp' })
            return (
              <div key={type} style={{ ...center, transform: `translate(-50%, -50%) translate(${x}px, ${ty}px) rotate(${rot}deg)`, opacity: op, zIndex: i }}>
                <TrailerCard type={type} width={180} />
              </div>
            )
          })}
        </AbsoluteFill>
      )}

      {/* the chart */}
      {frame >= sec(T.code - 0.8) && (
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 200, opacity: chartIn }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 90, height: MAX_BAR }}>
            {BARS.map((bar) => {
              const grow = spring({ frame: frame - sec(bar.t), fps, config: { damping: 18, stiffness: 90, mass: 0.9 } })
              const h = interpolate(grow, [0, 1], [0, MAX_BAR * bar.h]) * (bar.key === 'planning' ? planningPunch : 1)
              const labelOp = interpolate(frame, [sec(bar.t + 0.3), sec(bar.t + 0.8)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              return (
                <div key={bar.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <div style={{ fontFamily: "'Clash Display', system-ui, sans-serif", fontWeight: 800, fontSize: 52, color: bar.color, opacity: labelOp, marginBottom: 14, textShadow: `0 0 30px ${bar.color}66` }}>{bar.value}</div>
                  <div style={{ width: 180, height: h, background: `linear-gradient(180deg, ${bar.color}, ${bar.color}aa)`, borderRadius: '6px 6px 0 0', boxShadow: `0 0 40px ${bar.color}55, inset 0 0 30px rgba(255,255,255,0.08)` }} />
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, letterSpacing: '0.3em', color: '#9fc0c0', opacity: labelOp, marginTop: 18 }}>{bar.label}</div>
                </div>
              )
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* "More planning than code" caption */}
      {frame >= sec(T.punch) && (
        <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 150, opacity: interpolate(frame, [sec(T.punch), sec(T.punch + 0.5)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          <div style={{ fontFamily: "'Clash Display', system-ui, sans-serif", fontWeight: 800, fontSize: 46, color: '#f0b240', letterSpacing: '0.01em', textShadow: '0 0 40px rgba(240,178,64,0.4)' }}>MORE PLANNING THAN CODE</div>
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
