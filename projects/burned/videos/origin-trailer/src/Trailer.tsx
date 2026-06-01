import React from 'react'
import { AbsoluteFill, Audio, Sequence, interpolate } from 'remotion'
import { FPS } from './lib/timeline'
import { ColdHook } from './scenes/ColdHook'
import { Beat2Man } from './scenes/Beat2Man'
import { BuildHero } from './scenes/BuildHero'
import { Beat5Gauntlet } from './scenes/Beat5Gauntlet'
import { Beat6Wink } from './scenes/Beat6Wink'
import { ColdOpenRoster } from './scenes/ColdOpenRoster'
import { BurnedEndCard, BURNED_END_CARD_FRAMES } from './scenes/BurnedEndCard'
import voMaster from '../out/vo/janet-vo-master.wav'
import slamHit from './assets/audio/slam-hit.wav'
import burnedBoom from './assets/audio/burned-boom.wav'
import musicBed from './assets/audio/trailer-bed.mp3'
import introBed from './assets/audio/trailer-bed-intro.mp3'
import executionBed from './assets/audio/trailer-bed-execution.mp3'

/**
 * TRAILER — THE CANONICAL CUT (chosen 2026-05-31, B won the A/B). Render:
 * `pnpm render Trailer out/trailer.mp4`. ~84s.
 *
 * Tight briefing-room cold open (VO starts ~2s in, no dead air) → the story
 * (beats 2-6) → Beat 6 ends on the warm "…Hmph" (no card) → the roster operatives
 * slam in as the cast reveal (slam SFX) → a deep boom lands the LOCKED BURNED end
 * card (…NARRATED BY MACHINES / ONE HUMAN DIRECTED) → fade.
 *
 * The roster-at-OPEN structure is preserved as the alternate in
 * TrailerAltRosterOpen.tsx (comp id "TrailerAltRosterOpen").
 */

const sec = (s: number) => Math.round(s * FPS)
const VO_BEAT = [0, 4.2, 22.47, 28.36, 44.31, 54.12, 71.33]
const VO_START = 2.0 // tight cold open — ~2s before Janet's hook (was 5.5)
const at = (beat: number) => VO_START + VO_BEAT[beat - 1]

const BEAT6_DUR = sec(18.4) // ends on black just after "…Hmph" (no end card)
const ROSTER_FROM = sec(at(6)) + BEAT6_DUR
const ROSTER_SLAM_DUR = sec(6.6) // reticle + 1s stamp breath + operative slams + flurry (end card covers the handoff)
const CARD_FROM = ROSTER_FROM + sec(6.0) // end card slams in as the flurry peaks — lands on the music's brass-slam downbeat (~80.5s)
export const TRAILER_FRAMES = CARD_FROM + BURNED_END_CARD_FRAMES

// Operative-slam impact times (roster-local sec): INTRO 1.85 + i*CARD_STEP 0.68.
const SLAM_LOCAL = [1.85, 2.53, 3.21, 3.89, 4.57, 5.25]

// The music is THREE layered cues, hard-cut on Janet's dramatic turns (each cut
// is a SEPARATE recording slamming in — new texture appearing is what reads as a
// gear-change; the EL model won't deliver that inside one continuous cue):
//
//   introBed      → SETUP + CURIOUS, 0–24.5s, then killed
//   executionBed  → hard-cut in on "So he didn't" (24.5s), driving to the seam
//   musicBed      → the Briggsy-approved ATTACK → WINK → FINALE → TITLE, 45.6–84s
//
// Cuts land on "So he didn't" (24.5s) and "swarm"+brass-crash (45.6s) — both
// dramatic beats that mask the key change between cues.
const EXEC_FROM = 24.5
const SEAM = 45.6

/**
 * INTRO envelope — SETUP + CURIOUS only, then dies at 24.5s where the execution
 * cue hard-cuts in. Present SETUP (0.30) → duck CURIOUS down (0.19; it's a
 * delicate "spark of an idea," and the pullback makes the execution cut hit
 * harder by contrast) → fast fade to 0 by 24.6s so the cut is clean.
 */
const introVolume = (f: number): number =>
  interpolate(
    f,
    [0, sec(1), sec(2), sec(12), sec(14), sec(23.5), sec(24.3), sec(24.6)],
    [0, 0.34, 0.30, 0.30, 0.19, 0.19, 0.19, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

/**
 * EXECUTION envelope — RELATIVE to the Sequence that starts at EXEC_FROM (24.5s).
 * A near-instant fade-in (0.15s, click-free) so the cut SLAMS, holds at 0.24
 * (a touch lower than the other beds — it's a dense drums+brass cue that masks
 * Janet, so it sits back to keep her clear), then fades OUT across "Measure
 * twice" (~42→45s comp): the music recedes so her kicker lands clean, leaving a
 * beat of breath before the attack slams in at the seam.
 */
const executionVolume = (f: number): number =>
  interpolate(
    f,
    [0, sec(0.15), sec(42 - EXEC_FROM), sec(45 - EXEC_FROM)],
    [0, 0.24, 0.24, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

/**
 * MAIN-bed envelope — silent until the seam, then EXACTLY the dynamics Briggsy
 * approved: a low 0.16 bed under the gauntlet + wink, swelling to 0.38 as the
 * roster slams in and the VO ends, peaking under the BURNED title before a fade.
 */
const mainVolume = (f: number): number =>
  interpolate(
    f,
    [0, sec(SEAM), sec(46.0), ROSTER_FROM, CARD_FROM, TRAILER_FRAMES - sec(0.8), TRAILER_FRAMES],
    [0, 0, 0.16, 0.16, 0.38, 0.38, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

export const Trailer: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* MUSIC — three layered cues, hard-cut on Janet's turns (see notes above) */}
      <Audio src={introBed} volume={introVolume} />
      <Sequence from={sec(EXEC_FROM)} name="Execution cut">
        <Audio src={executionBed} trimBefore={sec(2)} volume={executionVolume} />
      </Sequence>
      <Audio src={musicBed} volume={mainVolume} />

      {/* single VO track */}
      <Sequence from={sec(VO_START)} name="VO">
        <Audio src={voMaster} />
      </Sequence>

      {/* FINALE SFX — a slam hit per operative, a deep boom on BURNED */}
      {SLAM_LOCAL.map((s, i) => (
        <Sequence key={i} from={ROSTER_FROM + sec(s)} durationInFrames={sec(0.5)} name={`slam ${i + 1}`}>
          <Audio src={slamHit} volume={0.55} />
        </Sequence>
      ))}
      <Sequence from={CARD_FROM} durationInFrames={BURNED_END_CARD_FRAMES} name="boom">
        <Audio src={burnedBoom} volume={0.85} />
      </Sequence>

      {/* 1 — HOOK: tight briefing-room cold open (roster moved to the finale) */}
      <Sequence from={0} durationInFrames={sec(at(2))} name="1 ColdHook">
        <ColdHook />
      </Sequence>

      {/* 2 — THE MAN + THE PROBLEM → empty editor */}
      <Sequence from={sec(at(2))} durationInFrames={sec(at(3)) - sec(at(2))} name="2 TheMan">
        <Beat2Man />
      </Sequence>

      {/* 3 + 4 — THE MACHINE BUILDS (held 0.5s past beat-5 for the cross-dissolve) */}
      <Sequence from={sec(at(3))} durationInFrames={sec(at(5)) - sec(at(3)) + sec(0.5)} name="3-4 Build">
        <BuildHero fadeOut={false} />
      </Sequence>

      {/* 5 — THE GAUNTLET */}
      <Sequence from={sec(at(5))} durationInFrames={sec(at(6)) - sec(at(5))} name="5 Gauntlet">
        <Beat5Gauntlet />
      </Sequence>

      {/* 6 — THE WINK: ends on the warm "…Hmph", fades to black (NO BURNED card) */}
      <Sequence from={sec(at(6))} durationInFrames={BEAT6_DUR} name="6 Wink">
        <Beat6Wink showEndCard={false} />
      </Sequence>

      {/* FINALE — roster operatives slam in (silent cast reveal), cut before their BURNED */}
      <Sequence from={ROSTER_FROM} durationInFrames={ROSTER_SLAM_DUR} name="Finale Roster">
        <ColdOpenRoster />
      </Sequence>

      {/* …then land on the LOCKED BURNED end card */}
      <Sequence from={CARD_FROM} durationInFrames={BURNED_END_CARD_FRAMES} name="Finale BURNED">
        <BurnedEndCard />
      </Sequence>
    </AbsoluteFill>
  )
}
