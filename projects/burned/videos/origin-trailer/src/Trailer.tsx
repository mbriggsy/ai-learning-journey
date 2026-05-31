import React from 'react'
import { AbsoluteFill, Audio, Sequence } from 'remotion'
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
const VO_BEAT = [0, 4.2, 22.47, 28.36, 43.75, 53.56, 70.77]
const VO_START = 2.0 // tight cold open — ~2s before Janet's hook (was 5.5)
const at = (beat: number) => VO_START + VO_BEAT[beat - 1]

const BEAT6_DUR = sec(18.4) // ends on black just after "…Hmph" (no end card)
const ROSTER_FROM = sec(at(6)) + BEAT6_DUR
const ROSTER_SLAM_DUR = sec(5.6) // reticle + operative slams + flurry, cut before the roster's own BURNED
const CARD_FROM = ROSTER_FROM + sec(5.0) // locked end card slams in as the flurry peaks
export const TRAILER_FRAMES = CARD_FROM + BURNED_END_CARD_FRAMES

// Operative-slam impact times (roster-local sec): INTRO 0.85 + i*CARD_STEP 0.68.
const SLAM_LOCAL = [0.85, 1.53, 2.21, 2.89, 3.57, 4.25]

export const Trailer: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#000' }}>
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
