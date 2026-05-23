import React from 'react'
import { Composition } from 'remotion'
import { useFonts } from './hooks/useFonts'
import { TrailerComposition } from './TrailerComposition'
import {
  FPS,
  S01_END,
  S01_START,
  S02_END,
  S02_START,
  S03_END,
  S03_START,
  S04_END,
  S04_PEAK_END,
  S04_PEAK_START,
  S04_START,
  S05_END,
  S05_START,
  S06_END,
  S06_START,
  TOTAL_FRAMES,
} from './lib/timing'
import { S01_ColdOpen } from './scenes/S01_ColdOpen'
import { S02_BriefingSetup } from './scenes/S02_BriefingSetup'
import { S03_MissionBackground } from './scenes/S03_MissionBackground'
import { S04_ReceiptsCascade } from './scenes/S04_ReceiptsCascade'
import { S05_GameplayDissolve } from './scenes/S05_GameplayDissolve'
import { S06_ClosingDirective } from './scenes/S06_ClosingDirective'

// Phase 0 / Phase 4 spike registrations preserved for regression rendering.
// `render:spike`, `render:cold-open-4`, `render:cold-open-5` consume these.
import { SpikeCompositionMain, SPIKE_TOTAL_FRAMES } from './SpikeCompositionMain'
import {
  SpikeColdOpenCandidate4,
  SpikeColdOpenCandidate5,
  SPIKE_COLD_OPEN_TOTAL_FRAMES,
} from './SpikeColdOpenComposition'

const WIDTH = 1920
const HEIGHT = 1080

export const Root: React.FC = () => {
  useFonts()

  return (
    <>
      {/* === Phase 4 Unit 4.1 — Composition wiring ===
          Master + 6 standalone scene previews + S04 peak fast-iteration window.
          See videos/trailer/sample-eval/composite-build/scaffold.md. */}

      <Composition
        id="BurnedTrailer"
        component={TrailerComposition}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Remotion's composition-id validator (4.0.438) allows only a-zA-Z0-9 and dash.
          The plan body's `Preview_S0N_…` form is illegal — we use camelCase to match
          the existing `SpikeColdOpenCandidate4` precedent. */}
      <Composition
        id="PreviewS01ColdOpen"
        component={S01_ColdOpen}
        durationInFrames={S01_END - S01_START}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="PreviewS02BriefingSetup"
        component={S02_BriefingSetup}
        durationInFrames={S02_END - S02_START}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="PreviewS03MissionBackground"
        component={S03_MissionBackground}
        durationInFrames={S03_END - S03_START}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="PreviewS04ReceiptsCascade"
        component={S04_ReceiptsCascade}
        durationInFrames={S04_END - S04_START}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="PreviewS05GameplayDissolve"
        component={S05_GameplayDissolve}
        durationInFrames={S05_END - S05_START}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="PreviewS06ClosingDirective"
        component={S06_ClosingDirective}
        durationInFrames={S06_END - S06_START}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Fast-iteration window for the S04 load-bearing payoff (amendment SA-2).
          Frames S04_PEAK_START..S04_PEAK_END absolute = scene-relative 600..990
          within S04 (cascade-build tail + peak + STACKED_PAYOFF_FRAME stamp
          slap + payoff hold + tail fade overlay window). The
          `scenePreviewStartFrame` prop is plumbing for Unit 4.5 — skeletal S04
          accepts but does not yet honor it. */}
      <Composition
        id="PreviewS04Peak"
        component={S04_ReceiptsCascade}
        durationInFrames={S04_PEAK_END - S04_PEAK_START}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ scenePreviewStartFrame: S04_PEAK_START }}
      />

      {/* === Phase 0/4 spike compositions — regression registrations ===
          Consumed by `render:spike`, `render:cold-open-4`, `render:cold-open-5`. */}

      <Composition
        id="SpikeFrameTest"
        component={SpikeCompositionMain}
        durationInFrames={SPIKE_TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="SpikeColdOpenCandidate4"
        component={SpikeColdOpenCandidate4}
        durationInFrames={SPIKE_COLD_OPEN_TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="SpikeColdOpenCandidate5"
        component={SpikeColdOpenCandidate5}
        durationInFrames={SPIKE_COLD_OPEN_TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  )
}
