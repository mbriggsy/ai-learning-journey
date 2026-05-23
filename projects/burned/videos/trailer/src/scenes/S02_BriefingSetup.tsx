import React from 'react'
import { AbsoluteFill, Img, staticFile } from 'remotion'
import { BriefingRoomBackground } from '../components/BriefingRoomBackground'
import { CommsTicker } from '../components/CommsTicker'
import { DossierFolder } from '../components/DossierFolder'

/**
 * S02 — Briefing Setup. 12-second briefing-room establishing shot.
 * S02 spans composition frames 210-570 (scene-relative 0-360).
 *
 *   0          mahogany desk + venetian-blind shadow base
 *   30-90      dossier folder opens via EASE_DRAWER (Phase 1 Unit 1.4 lock)
 *   60-       Pendleton crest watermark visible top-left (existing BURNED asset
 *              per amendment MA-4; inlined per amendment SA-5)
 *   60-       depth-plane brass nameplate (Phase 3 Unit 3.3 Option A) bottom-right
 *              with subtle drift parallax against the blind shadow plate
 *   0-360     comms ticker bottom strip — HOLDS during the Dash VO window
 *              (scene-relative 30-330; composition-level VO is mounted in
 *              TrailerComposition.tsx per ADR #16, NOT inside this file).
 *
 * Pure visual — no `<Audio>` per ADR #16. The Dash briefing-room cue at
 * absolute frame 219 (s02-cue-219-dash.wav, ~12 s actualFrames) plays via
 * the composition-level AUDIO_ASSETS map; standalone-render of this scene
 * is silent.
 *
 * Plan body's `brass-nameplate.svg` reference is stale per insight #057 —
 * Phase 3 Unit 3.3 shipped the Option A brass-nameplate as `depth-plane.svg`.
 */

const PENDLETON_CREST_SIZE = 140

export const S02_BriefingSetup: React.FC = () => {
  return (
    <AbsoluteFill>
      <BriefingRoomBackground />

      {/* Dossier opens at scene-relative frame 30 — same moment Dash VO
          starts at absolute frame 219 (scene-relative 9 in S02). The folder-
          opens-as-briefer-begins choreography is the BEAT-SHEET cue. */}
      <DossierFolder openStart={30} />

      {/* Inlined Pendleton crest watermark — existing BURNED asset, ADR #15
          `assets/...` prefix. Top-left at 0.3 opacity — institutional chrome,
          not hero. */}
      <Img
        src={staticFile('assets/howtoplay/pendleton-crest.png')}
        style={{
          position: 'absolute',
          top: 60,
          left: 60,
          width: PENDLETON_CREST_SIZE,
          height: PENDLETON_CREST_SIZE,
          opacity: 0.3,
          pointerEvents: 'none',
        }}
      />

      {/* Depth-plane brass nameplate (Phase 3 Unit 3.3 Option A — depth-plane.svg,
          NOT brass-nameplate.svg per the actual on-disk filename). Bottom-right
          foreground, native viewBox 600×160 — render at 540×144 (10% downscale)
          to leave breathing room above the comms ticker. */}
      <Img
        src={staticFile('trailer/briefing-room/depth-plane.svg')}
        style={{
          position: 'absolute',
          bottom: 100, // above the 48px ticker + 52px breathing
          right: 80,
          width: 540,
          height: 144,
          pointerEvents: 'none',
        }}
      />

      {/* Comms ticker — holds one line during Dash VO window (scene-relative
          30-330). Per design-lens guidance, rotating ticker chrome during
          VO pulls eye from the landing; freeze the line at hold-start. */}
      <CommsTicker fromFrame={0} holdDuringFrames={[[30, 330]]} />
    </AbsoluteFill>
  )
}
