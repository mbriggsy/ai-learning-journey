import React from 'react'
import { Audio } from '@remotion/media'
import { AbsoluteFill, interpolate, Sequence, staticFile } from 'remotion'
import { SpikeColdOpen } from './scenes/SpikeColdOpen'
import { type CandidateId } from '../scripts/cold-open-prototype'

/**
 * Phase 0 Unit 0.3 — R14 cold-open spike composition wrapper.
 *
 * Mounts the SpikeColdOpen visual scene + the candidate VO audio track.
 * Same scene for both candidates; audio swaps via the `candidate` prop.
 *
 * Audio drops at frame 30 (on the cut to Dash) per plan §Step 2
 * audio-visual sync rhythm: visual change registers FIRST, then VO
 * delivers the autonomy line over the held landing card.
 *
 * Plan-aligned exclusion: music bed ABSENT for the spike. The decode
 * test is purer with VO + visual only — a sine-tone music placeholder
 * (the only available bed from Unit 0.5 spike) would confound the
 * decode signal. Phase 3 sources brass-jazz hook for production trailer.
 *
 * Output (per candidate):
 *   - `SpikeColdOpenCandidate4` composition → `out/cold-open-candidate-4.mp4`
 *   - `SpikeColdOpenCandidate5` composition → `out/cold-open-candidate-5.mp4`
 */

export const SPIKE_COLD_OPEN_TOTAL_FRAMES = 240
const VO_START_FRAME = 30
const VO_DURATION_FRAMES = SPIKE_COLD_OPEN_TOTAL_FRAMES - VO_START_FRAME

type Props = {
  candidate: CandidateId
}

export const SpikeColdOpenComposition: React.FC<Props> = ({ candidate }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Visual timeline */}
      <SpikeColdOpen />

      {/* VO drops at frame 30 — placed via Sequence offset (no `from` prop on @remotion/media Audio) */}
      <Sequence from={VO_START_FRAME} durationInFrames={VO_DURATION_FRAMES}>
        <Audio
          src={staticFile(`trailer/cold-open/candidate-${candidate}.mp3`)}
          volume={(f) =>
            interpolate(f, [0, 3, VO_DURATION_FRAMES - 8, VO_DURATION_FRAMES], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      </Sequence>
    </AbsoluteFill>
  )
}

export const SpikeColdOpenCandidate4: React.FC = () => (
  <SpikeColdOpenComposition candidate={4} />
)

export const SpikeColdOpenCandidate5: React.FC = () => (
  <SpikeColdOpenComposition candidate={5} />
)
