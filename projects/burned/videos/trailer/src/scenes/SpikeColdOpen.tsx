import React from 'react'
import { Sequence, Series } from 'remotion'
import { BurnedLogoPlate } from '../components/BurnedLogoPlate'
import { CutBrightnessPop } from '../components/CutBrightnessPop'
import { OperativePortraitFlash } from '../components/OperativePortraitFlash'
import { R15ChromeStamp } from '../components/R15ChromeStamp'
import { SceneFadeToBlack } from '../components/SceneFadeToBlack'
import { COLD_OPEN_SPEAKER } from '../../scripts/cold-open-prototype'

/**
 * Phase 0 Unit 0.3 — R14 cold-open spike scene.
 *
 * 8-second composition validating the binary autonomy hook: does a
 * no-context viewer decode "AI / agent / autonomous / built itself"
 * from the cold open ALONE?
 *
 * **Frame budget (240 frames @ 30fps):**
 *
 * | Frames    | Time        | Beat                                                |
 * |-----------|-------------|-----------------------------------------------------|
 * | 0–30      | 0.0–1.0s    | Cold-open speaker portrait (Janet) — hard cut       |
 * | 30–60     | 1.0–2.0s    | Dash portrait — hard cut + 2-frame brightness pop   |
 * | 60–240    | 2.0–8.0s    | Held BURNED landing card (180 frames)               |
 * |  └ 60–80  | 2.0–2.67s   |    Logo plate enters (scale 0.92→1, opacity 0→1)    |
 * |  └ 75–87  | 2.5–2.9s    |    R15 chrome stamp slap (12-frame STAMP_SLAP)      |
 * |  └ 230–240| 7.67–8.0s   |    Fade-to-black (last 10 frames of held landing)   |
 *
 * **Rhythm: two fast cuts → one held card** is the Archer
 * title-sequence convention per plan §Step 2. Even pacing reads as
 * slideshow (fail mode).
 *
 * **Audio drop at frame 30** is wired in SpikeColdOpenComposition.tsx,
 * not here — the scene is visual-timeline-only so the composition
 * wrapper can swap candidate audio without touching this file.
 *
 * **R15 chrome stamp** lands at composition frame 75 (local frame 15 of
 * the 180-frame held landing) — viewer has settled on the landing card
 * after the logo entry, then the stamp slaps in reinforcing the autonomy
 * signal at the same moment the audio line is delivering "He's a
 * machine" / "Briggsy didn't write this one either."
 */

const FLASH_FRAMES = 30
const HELD_LANDING_FRAMES = 180
const R15_STAMP_LOCAL_OFFSET = 15 // composition frame 75
const FADE_LOCAL_OFFSET = HELD_LANDING_FRAMES - 10 // composition frame 230

export const SpikeColdOpen: React.FC = () => {
  return (
    <Series>
      {/* 0–30: cold-open speaker (Janet) — hard cut in */}
      <Series.Sequence durationInFrames={FLASH_FRAMES}>
        <OperativePortraitFlash cardAsset={COLD_OPEN_SPEAKER.cardAsset} />
        <CutBrightnessPop />
      </Series.Sequence>

      {/* 30–60: Dash (the briefer) — hard cut + brightness pop */}
      <Series.Sequence durationInFrames={FLASH_FRAMES}>
        <OperativePortraitFlash cardAsset="dash-barlowe.webp" />
        <CutBrightnessPop />
      </Series.Sequence>

      {/* 60–240: held landing card with logo entry, R15 stamp slap, and tail fade */}
      <Series.Sequence durationInFrames={HELD_LANDING_FRAMES}>
        <BurnedLogoPlate />
        <Sequence from={R15_STAMP_LOCAL_OFFSET}>
          <R15ChromeStamp />
        </Sequence>
        <SceneFadeToBlack
          startFrame={FADE_LOCAL_OFFSET}
          durationFrames={10}
        />
      </Series.Sequence>
    </Series>
  )
}
