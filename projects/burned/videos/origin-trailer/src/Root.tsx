import React from 'react'
import { Composition } from 'remotion'
import { useFonts } from './hooks/useFonts'
import { FPS, WIDTH, HEIGHT, TOTAL_FRAMES } from './lib/timeline'

// ── THE TRAILER (canonical cut) + the saved alternate ──
import { Trailer, TRAILER_FRAMES } from './Trailer'
import { TrailerAltRosterOpen, TRAILER_ALT_FRAMES } from './TrailerAltRosterOpen'

// ── SCENES — the building blocks of the canonical cut (standalone previews) ──
import { ColdHook, COLD_HOOK_FRAMES } from './scenes/ColdHook'
import { Beat2Man, BEAT2_MAN_FRAMES } from './scenes/Beat2Man'
import { BuildHero, BUILD_HERO_FRAMES } from './scenes/BuildHero'
import { Beat5Gauntlet, BEAT5_GAUNTLET_FRAMES } from './scenes/Beat5Gauntlet'
import { Beat6Wink, BEAT6_WINK_FRAMES } from './scenes/Beat6Wink'
import { BurnedEndCard, BURNED_END_CARD_FRAMES } from './scenes/BurnedEndCard'
import { ColdOpenRoster, COLD_OPEN_ROSTER_FRAMES } from './scenes/ColdOpenRoster'

// ── ARCHIVE — the superseded 3:01 narrated cut + its old-VO beats (kept for
//    reference only; NOT part of the canonical trailer) ──
import { OriginTrailer } from './OriginTrailer'
import { FoundationProof, FOUNDATION_PROOF_FRAMES } from './scenes/FoundationProof'
import { WinnerProof, WINNER_PROOF_FRAMES } from './scenes/WinnerProof'
import { BurnedCardHero, BURNED_CARD_HERO_FRAMES } from './scenes/BurnedCardHero'
import { Beat1ColdOpen, BEAT1_FRAMES } from './scenes/Beat1ColdOpen'
import { Beat2TheBet, BEAT2_FRAMES } from './scenes/Beat2TheBet'
import { Beat3DoubleDown, BEAT3_FRAMES } from './scenes/Beat3DoubleDown'
import { Beat4TheNumbers, BEAT4_FRAMES } from './scenes/Beat4TheNumbers'
import { Beat5TheSwarm, BEAT5_FRAMES } from './scenes/Beat5TheSwarm'
import { Beat6Proof, BEAT6_FRAMES } from './scenes/Beat6Proof'
import { Beat7Payoff, BEAT7_FRAMES } from './scenes/Beat7Payoff'

/**
 * Composition registry. Read top→bottom: the canonical Trailer first, then the
 * saved alternate, then the scene previews, then the archived 3:01 cut. See
 * README.md for the full cut map.
 */
export const Root: React.FC = () => {
  useFonts()

  return (
    <>
      {/* ═══════════ THE TRAILER (canonical) ═══════════ */}
      <Composition id="Trailer" component={Trailer} durationInFrames={TRAILER_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />

      {/* ═══════════ SAVED ALTERNATE (roster-at-open; B beat this) ═══════════ */}
      <Composition id="TrailerAltRosterOpen" component={TrailerAltRosterOpen} durationInFrames={TRAILER_ALT_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />

      {/* ═══════════ SCENES (building blocks of the canonical cut) ═══════════ */}
      <Composition id="ColdHook" component={ColdHook} durationInFrames={COLD_HOOK_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="Beat2Man" component={Beat2Man} durationInFrames={BEAT2_MAN_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="BuildHero" component={BuildHero} durationInFrames={BUILD_HERO_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="Beat5Gauntlet" component={Beat5Gauntlet} durationInFrames={BEAT5_GAUNTLET_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="Beat6Wink" component={Beat6Wink} durationInFrames={BEAT6_WINK_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="BurnedEndCard" component={BurnedEndCard} durationInFrames={BURNED_END_CARD_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="ColdOpenRoster" component={ColdOpenRoster} durationInFrames={COLD_OPEN_ROSTER_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />

      {/* ═══════════ ARCHIVE — superseded 3:01 cut (reference only) ═══════════ */}
      <Composition id="archive-OriginTrailer3min" component={OriginTrailer} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="archive-FoundationProof" component={FoundationProof} durationInFrames={FOUNDATION_PROOF_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="archive-WinnerProof" component={WinnerProof} durationInFrames={WINNER_PROOF_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="archive-BurnedCardHero" component={BurnedCardHero} durationInFrames={BURNED_CARD_HERO_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="archive-Beat1ColdOpen" component={Beat1ColdOpen} durationInFrames={BEAT1_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="archive-Beat2TheBet" component={Beat2TheBet} durationInFrames={BEAT2_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="archive-Beat3DoubleDown" component={Beat3DoubleDown} durationInFrames={BEAT3_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="archive-Beat4TheNumbers" component={Beat4TheNumbers} durationInFrames={BEAT4_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="archive-Beat5TheSwarm" component={Beat5TheSwarm} durationInFrames={BEAT5_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="archive-Beat6Proof" component={Beat6Proof} durationInFrames={BEAT6_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="archive-Beat7Payoff" component={Beat7Payoff} durationInFrames={BEAT7_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
    </>
  )
}
