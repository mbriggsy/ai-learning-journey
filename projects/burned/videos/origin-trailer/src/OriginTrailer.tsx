import React from 'react'
import { AbsoluteFill, Sequence } from 'remotion'
import { FPS } from './lib/timeline'
import { Beat1ColdOpen } from './scenes/Beat1ColdOpen'
import { Beat2TheBet } from './scenes/Beat2TheBet'
import { Beat3DoubleDown } from './scenes/Beat3DoubleDown'
import { Beat4TheNumbers } from './scenes/Beat4TheNumbers'
import { Beat5TheSwarm } from './scenes/Beat5TheSwarm'
import { Beat6Proof } from './scenes/Beat6Proof'
import { Beat7Payoff } from './scenes/Beat7Payoff'

/**
 * ORIGIN TRAILER v2 — full assembly.
 *
 * The 7 real beat scenes sequenced at their manifest beat-start frames. Each
 * beat owns its own audio slice (master WAV trimmed via startFrom to that
 * beat's start), so placing each Sequence at the beat's global start frame
 * reconstructs Janet's continuous VO with the visuals locked to it. Sequence
 * boundaries are contiguous (each beat's window = next beat start − this start),
 * so the audio is gapless across the whole ~3-minute cut.
 */

const sec = (s: number) => Math.round(s * FPS)

// Manifest beat-start seconds (last entry = totalSec). Source: out/vo/manifest.json.
const BEAT_STARTS = [0, 30.52, 56.0, 82.43, 108.07, 119.95, 148.62, 181.25]
const SCENES = [
  Beat1ColdOpen,
  Beat2TheBet,
  Beat3DoubleDown,
  Beat4TheNumbers,
  Beat5TheSwarm,
  Beat6Proof,
  Beat7Payoff,
]

export const OriginTrailer: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {SCENES.map((Scene, i) => (
        <Sequence
          key={i}
          from={sec(BEAT_STARTS[i])}
          durationInFrames={sec(BEAT_STARTS[i + 1]) - sec(BEAT_STARTS[i])}
          name={`Beat ${i + 1}`}
        >
          <Scene />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
