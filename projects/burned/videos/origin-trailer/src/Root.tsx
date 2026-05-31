import React from 'react'
import { Composition } from 'remotion'
import { useFonts } from './hooks/useFonts'
import { FoundationProof, FOUNDATION_PROOF_FRAMES } from './scenes/FoundationProof'
import { WinnerProof, WINNER_PROOF_FRAMES } from './scenes/WinnerProof'
import { BurnedCardHero, BURNED_CARD_HERO_FRAMES } from './scenes/BurnedCardHero'
import { Beat1ColdOpen, BEAT1_FRAMES } from './scenes/Beat1ColdOpen'
import { Beat7Payoff, BEAT7_FRAMES } from './scenes/Beat7Payoff'
import { Beat3DoubleDown, BEAT3_FRAMES } from './scenes/Beat3DoubleDown'
import { Beat2TheBet, BEAT2_FRAMES } from './scenes/Beat2TheBet'
import { Beat4TheNumbers, BEAT4_FRAMES } from './scenes/Beat4TheNumbers'
import { Beat5TheSwarm, BEAT5_FRAMES } from './scenes/Beat5TheSwarm'
import { Beat6Proof, BEAT6_FRAMES } from './scenes/Beat6Proof'
import { BuildHero, BUILD_HERO_FRAMES } from './scenes/BuildHero'
import { ColdOpenRoster, COLD_OPEN_ROSTER_FRAMES } from './scenes/ColdOpenRoster'
import { Beat2Man, BEAT2_MAN_FRAMES } from './scenes/Beat2Man'
import { Beat5Gauntlet, BEAT5_GAUNTLET_FRAMES } from './scenes/Beat5Gauntlet'
import { Beat6Wink, BEAT6_WINK_FRAMES } from './scenes/Beat6Wink'
import { ShortCut, SHORT_CUT_FRAMES } from './ShortCut'
import { OriginTrailer } from './OriginTrailer'
import { FPS, WIDTH, HEIGHT, TOTAL_FRAMES } from './lib/timeline'

export const Root: React.FC = () => {
  useFonts()

  return (
    <>
      <Composition
        id="OriginTrailer"
        component={OriginTrailer}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="FoundationProof"
        component={FoundationProof}
        durationInFrames={FOUNDATION_PROOF_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="WinnerProof"
        component={WinnerProof}
        durationInFrames={WINNER_PROOF_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="BurnedCardHero"
        component={BurnedCardHero}
        durationInFrames={BURNED_CARD_HERO_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Beat1ColdOpen"
        component={Beat1ColdOpen}
        durationInFrames={BEAT1_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Beat7Payoff"
        component={Beat7Payoff}
        durationInFrames={BEAT7_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Beat3DoubleDown"
        component={Beat3DoubleDown}
        durationInFrames={BEAT3_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Beat2TheBet"
        component={Beat2TheBet}
        durationInFrames={BEAT2_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Beat4TheNumbers"
        component={Beat4TheNumbers}
        durationInFrames={BEAT4_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Beat5TheSwarm"
        component={Beat5TheSwarm}
        durationInFrames={BEAT5_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Beat6Proof"
        component={Beat6Proof}
        durationInFrames={BEAT6_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="BuildHero"
        component={BuildHero}
        durationInFrames={BUILD_HERO_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="ColdOpenRoster"
        component={ColdOpenRoster}
        durationInFrames={COLD_OPEN_ROSTER_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Beat2Man"
        component={Beat2Man}
        durationInFrames={BEAT2_MAN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Beat5Gauntlet"
        component={Beat5Gauntlet}
        durationInFrames={BEAT5_GAUNTLET_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Beat6Wink"
        component={Beat6Wink}
        durationInFrames={BEAT6_WINK_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="ShortCut"
        component={ShortCut}
        durationInFrames={SHORT_CUT_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  )
}
