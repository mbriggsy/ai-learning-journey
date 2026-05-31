import React from 'react'
import { AbsoluteFill, Audio, Sequence } from 'remotion'
import { FPS } from './lib/timeline'
import { ColdOpenRoster } from './scenes/ColdOpenRoster'
import { Beat2Man } from './scenes/Beat2Man'
import { BuildHero } from './scenes/BuildHero'
import { Beat5Gauntlet } from './scenes/Beat5Gauntlet'
import { Beat6Wink, BEAT6_WINK_FRAMES } from './scenes/Beat6Wink'
import voMaster from '../out/vo/janet-vo-master.wav'

/**
 * TRAILER — ALTERNATE (roster-at-OPEN). The retired A-cut, SAVED for reference
 * after B (Trailer.tsx, roster-as-finale) won the A/B on 2026-05-31. Render:
 * `pnpm render TrailerAltRosterOpen out/trailer-alt-A.mp4`.
 *
 * Brag-forward recut, full 7-scene assembly to the 70.8s Janet VO. One VO track;
 * scenes sequenced at (VO_START + manifest beat start).
 *
 * The roster cold open runs as a kinetic pre-title; Janet's hook line lands over
 * the BURNED hold (VO_START), then the story drives:
 *   1 hook (cold open tail) · 2 the man → empty editor · 3 hinge "so he didn't"
 *   → 4 the machine builds (BuildHero engine spans 3+4, holding the deck under
 *   the brag). The empty editor from beat 2 EXPLODES into the terminal on the cut.
 *   5 the gauntlet (a swarm of machines attacks → IT HELD → "the thing is good")
 *   6 the button + wink (receipts cascade → "not even me" voiceprint → warmth →
 *   "…Hmph." → quiet BURNED end card). Beat 6 owns a ~2.7s end-card tail past
 *   the VO end.
 */

const sec = (s: number) => Math.round(s * FPS)

// Manifest beat starts (global VO sec) + total — from out/vo/manifest.json.
// (b4 shortened after dropping "Two weeks", the test-attack clause, AND "120
//  cards"; b3 "and he directed" added ~0.3s. Total 73.73 → 70.77.)
const VO_BEAT = [0, 4.2, 22.47, 28.36, 43.75, 53.56, 70.77]
const VO_START = 5.5 // VO master begins here (hook lands over the BURNED hold)

const at = (beat: number) => VO_START + VO_BEAT[beat - 1]

// Full cut: beat 6 begins at at(6) and runs its own length (VO tail + end card).
export const TRAILER_ALT_FRAMES = sec(at(6)) + BEAT6_WINK_FRAMES

export const TrailerAltRosterOpen: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* single VO track */}
      <Sequence from={sec(VO_START)} name="VO">
        <Audio src={voMaster} />
      </Sequence>

      {/* 1 — HOOK: kinetic roster cold open (hook line lands over BURNED hold) */}
      <Sequence from={0} durationInFrames={sec(at(2))} name="1 ColdOpen">
        <ColdOpenRoster />
      </Sequence>

      {/* 2 — THE MAN + THE PROBLEM → empty editor */}
      <Sequence from={sec(at(2))} durationInFrames={sec(at(3)) - sec(at(2))} name="2 TheMan">
        <Beat2Man />
      </Sequence>

      {/* 3 + 4 — THE HINGE → THE MACHINE BUILDS (engine spans the brag).
          Held 0.5s past beat-5 start so Beat5 cross-dissolves in over its final
          frame (slicker than a hard cut). fadeOut={false} → holds, no black. */}
      <Sequence from={sec(at(3))} durationInFrames={sec(at(5)) - sec(at(3)) + sec(0.5)} name="3-4 Build">
        <BuildHero fadeOut={false} />
      </Sequence>

      {/* 5 — THE GAUNTLET: swarm of machines → IT HELD → "the thing is good".
          Declared after Build → fades in (sceneIn) on top during the overlap. */}
      <Sequence from={sec(at(5))} durationInFrames={sec(at(6)) - sec(at(5))} name="5 Gauntlet">
        <Beat5Gauntlet />
      </Sequence>

      {/* 6 — THE BUTTON + WINK: receipts → "not even me" → warmth → Hmph → BURNED */}
      <Sequence from={sec(at(6))} durationInFrames={BEAT6_WINK_FRAMES} name="6 Wink">
        <Beat6Wink />
      </Sequence>
    </AbsoluteFill>
  )
}
