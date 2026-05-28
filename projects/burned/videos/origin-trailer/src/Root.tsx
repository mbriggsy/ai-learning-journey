import React from 'react'
import { Composition } from 'remotion'
import { useFonts } from './hooks/useFonts'
import { FoundationProof, FOUNDATION_PROOF_FRAMES } from './scenes/FoundationProof'

const WIDTH = 1920
const HEIGHT = 1080
const FPS = 30

export const Root: React.FC = () => {
  useFonts()

  return (
    <>
      <Composition
        id="FoundationProof"
        component={FoundationProof}
        durationInFrames={FOUNDATION_PROOF_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  )
}
