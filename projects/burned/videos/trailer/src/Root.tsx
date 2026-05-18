import React from 'react'
import { AbsoluteFill, Composition } from 'remotion'
import { useFonts } from './hooks/useFonts'
import { SpikeCompositionMain, SPIKE_TOTAL_FRAMES } from './SpikeCompositionMain'
import {
  SpikeColdOpenCandidate4,
  SpikeColdOpenCandidate5,
  SPIKE_COLD_OPEN_TOTAL_FRAMES,
} from './SpikeColdOpenComposition'

const Placeholder: React.FC = () => {
  return <AbsoluteFill style={{ backgroundColor: '#000' }} />
}

export const Root: React.FC = () => {
  useFonts()

  return (
    <>
      <Composition
        id="BurnedTrailer"
        component={Placeholder}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />

      {/* Phase 0 Unit 0.5 composite-viability spike — validates 5 Remotion
          integration points BEFORE Phase 4 composition shape commits. */}
      <Composition
        id="SpikeFrameTest"
        component={SpikeCompositionMain}
        durationInFrames={SPIKE_TOTAL_FRAMES}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />

      {/* Phase 0 Unit 0.3 R14 cold-open decode — A/B audition stimuli for
          binary autonomy hook gate. Two candidates × one composition shape. */}
      <Composition
        id="SpikeColdOpenCandidate4"
        component={SpikeColdOpenCandidate4}
        durationInFrames={SPIKE_COLD_OPEN_TOTAL_FRAMES}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="SpikeColdOpenCandidate5"
        component={SpikeColdOpenCandidate5}
        durationInFrames={SPIKE_COLD_OPEN_TOTAL_FRAMES}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  )
}
