import React from 'react'
import { AbsoluteFill, Sequence, Series, staticFile } from 'remotion'
import { Audio } from '@remotion/media' // per ADR #17 — NOT from 'remotion' core
import {
  S01_END,
  S01_START,
  S02_END,
  S02_START,
  S03_END,
  S03_START,
  S04_END,
  S04_START,
  S05_END,
  S05_START,
  S06_END,
  S06_START,
} from './lib/timing'
import { AUDIO_ASSETS } from './lib/audio-manifest'
import { MusicBed } from './components/MusicBed'
import { S01_ColdOpen } from './scenes/S01_ColdOpen'
import { S02_BriefingSetup } from './scenes/S02_BriefingSetup'
import { S03_MissionBackground } from './scenes/S03_MissionBackground'
import { S04_ReceiptsCascade } from './scenes/S04_ReceiptsCascade'
import { S05_GameplayDissolve } from './scenes/S05_GameplayDissolve'
import { S06_ClosingDirective } from './scenes/S06_ClosingDirective'

/**
 * Top-level orchestrator. Wires all 6 scenes via a bare `<Series>`
 * (NOT `<TransitionSeries>` per roadmap ADR #11 revised — every scene
 * boundary is a hard cut; transition reads come from scene-internal
 * overlay components). Audio lives at composition level per ADR #16
 * (single placement site, scene files pure-visual).
 *
 * Scene durations come from `timing.ts` — they sum to TOTAL_FRAMES
 * exactly (asserted in `timing.test.ts`). Audio cues come from the
 * Phase 2 generated manifest — each cue gets its own `<Sequence>`
 * positioned at `startFrame - leadFramesHint` with the asset's
 * `actualFrames` length.
 *
 * `<Audio>` MUST come from `@remotion/media` (not `'remotion'` core).
 * The core `<Audio>` is the legacy `<Html5Audio>` wrapper; mixing
 * backends produces sample-rate drift across the 106s composition.
 * `.eslintrc.cjs` `no-restricted-imports` enforces.
 */
export const TrailerComposition: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#000' }}>
    {/* Music bed spans full runtime; envelope continuous across the S04→S05 hard cut */}
    <MusicBed />

    {/* Visual: bare Series — hard cuts at every boundary per ADR #11 revised.
        Scene-internal overlays (S04TailFadeToBlack, S05HeadFadeFromBlack, IrisWipe,
        DossierPageWipe) land in later units; not present at scaffold time. */}
    <Series>
      <Series.Sequence durationInFrames={S01_END - S01_START}>
        <S01_ColdOpen />
      </Series.Sequence>
      <Series.Sequence durationInFrames={S02_END - S02_START}>
        <S02_BriefingSetup />
      </Series.Sequence>
      <Series.Sequence durationInFrames={S03_END - S03_START}>
        <S03_MissionBackground />
      </Series.Sequence>
      <Series.Sequence durationInFrames={S04_END - S04_START}>
        <S04_ReceiptsCascade />
      </Series.Sequence>
      <Series.Sequence durationInFrames={S05_END - S05_START}>
        <S05_GameplayDissolve />
      </Series.Sequence>
      <Series.Sequence durationInFrames={S06_END - S06_START}>
        <S06_ClosingDirective />
      </Series.Sequence>
    </Series>

    {/* Audio: composition-level VO timeline per ADR #16. ALL Phase 2 voice
        cues live here; scene files do NOT mount <Audio>. Phase 2 manifest
        is the single source of truth — Phase 2 contract changes absorbed
        via import, no scene-file edits required. */}
    {AUDIO_ASSETS.map((asset) => (
      <Sequence
        key={asset.filename}
        from={asset.startFrame - (asset.leadFramesHint ?? 0)}
        durationInFrames={asset.actualFrames}
      >
        <Audio src={staticFile(asset.staticPath)} />
      </Sequence>
    ))}
  </AbsoluteFill>
)
