import React from 'react'
import { Composition } from 'remotion'
import { useFonts } from './hooks/useFonts'
import { FoundationProof, FOUNDATION_PROOF_FRAMES } from './scenes/FoundationProof'
import { WinnerProof, WINNER_PROOF_FRAMES } from './scenes/WinnerProof'
import { BurnedCardHero, BURNED_CARD_HERO_FRAMES } from './scenes/BurnedCardHero'
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
    </>
  )
}
