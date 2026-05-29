import React from 'react'
import { Composition } from 'remotion'
import { useFonts } from './hooks/useFonts'
import { FoundationProof, FOUNDATION_PROOF_FRAMES } from './scenes/FoundationProof'
import { WinnerProof, WINNER_PROOF_FRAMES } from './scenes/WinnerProof'
import { BurnedCardHero, BURNED_CARD_HERO_FRAMES } from './scenes/BurnedCardHero'
import { Beat1ColdOpen, BEAT1_FRAMES } from './scenes/Beat1ColdOpen'
import { Beat7Payoff, BEAT7_FRAMES } from './scenes/Beat7Payoff'
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
    </>
  )
}
