import React from 'react'
import { Audio } from '@remotion/media'
import { AbsoluteFill, interpolate, Sequence, Series, staticFile } from 'remotion'
import { SceneFadeToBlack } from './components/SceneFadeToBlack'
import { SpikeS01_Cascade } from './scenes/SpikeS01_Cascade'
import { SpikeS02_Gameplay } from './scenes/SpikeS02_Gameplay'

/**
 * Phase 0 Unit 0.5 — Composite Viability Spike composition.
 *
 * Validates five Remotion integration points in one rendered MP4 BEFORE
 * Phase 4 commits to the production composition shape:
 *   (a) Bare `<Series>` of `<Series.Sequence>` blocks with a
 *       scene-internal fade-to-black overlay reaching opacity 1.0 at
 *       the boundary frame (ADR #4 revised — no `<TransitionSeries>`).
 *   (b) `@remotion/media` `<Audio>` crossfade — music bed ducks under
 *       VO via a volume callback; VO offset is via `<Sequence from>`
 *       NOT a (non-existent) `from` prop on `<Audio>`.
 *   (c) `@remotion/fonts.loadFont` with variable-axis weight range
 *       (`weight: '200 700'`) rendering three weights from one woff2.
 *   (d) Playwright-captured BURNED HTP fullpage PNG resolving via
 *       `setPublicDir('../../public')` + `staticFile('trailer/...')`.
 *   (e) Three Archer-grammar transition primitives (stamp-slap, iris
 *       wipe, kinetic typography) all rendering in pure Remotion.
 *
 * Frame budget @ 30fps:
 *   - S01 cascade: 180f (6s) — visual sub-clip ladder
 *   - S01 tail fade: last 10f of S01 (170-180f) — point (a) overlay
 *   - S02 gameplay placeholder: 60f (2s)
 * Total: 240f = 8 seconds
 */
export const SPIKE_TOTAL_FRAMES = 240
const S01_FRAMES = 180
const S02_FRAMES = 60
const S01_FADE_START_LOCAL = 170 // last 10 frames of S01
const S01_FADE_DURATION = 10

const VO_START_FRAME = 30
const VO_DURATION_FRAMES = 75

export const SpikeCompositionMain: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Visual timeline — bare <Series> per ADR #4 revised */}
      <Series>
        <Series.Sequence durationInFrames={S01_FRAMES}>
          <SpikeS01_Cascade />
          <SceneFadeToBlack
            startFrame={S01_FADE_START_LOCAL}
            durationFrames={S01_FADE_DURATION}
          />
        </Series.Sequence>

        <Series.Sequence durationInFrames={S02_FRAMES}>
          <SpikeS02_Gameplay />
        </Series.Sequence>
      </Series>

      {/* Audio — composition-level placement per ADR #16, @remotion/media per ADR #17 */}
      <Audio
        src={staticFile('trailer/spike/music-bed.mp3')}
        volume={(f) =>
          interpolate(
            f,
            [0, 15, 25, 105, 130, SPIKE_TOTAL_FRAMES],
            [0, 0.65, 0.25, 0.25, 0.65, 0.65],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          )
        }
      />

      {/* VO drops in at frame 30 via <Sequence from>; <Audio> has no `from` prop */}
      <Sequence from={VO_START_FRAME} durationInFrames={VO_DURATION_FRAMES}>
        <Audio
          src={staticFile('trailer/spike/vo.wav')}
          volume={(f) =>
            interpolate(f, [0, 3, 70, VO_DURATION_FRAMES], [0, 0.9, 0.9, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      </Sequence>
    </AbsoluteFill>
  )
}
