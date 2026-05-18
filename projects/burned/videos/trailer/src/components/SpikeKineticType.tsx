import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { EASE_OUT_EMIL } from '../lib/animations'
import { PALETTE } from '../lib/colors'

/**
 * Kinetic typography — Phase 0 Unit 0.5(e) sub-clip 3.
 *
 * Per ADR table: kinetic typography is **constrained** to goofy-stat
 * overlays (R11), NOT scene-to-scene transitions. The cliché-avoidance
 * is intentional — scene-to-scene kinetic-type reads as "another AI
 * startup trailer" (Anthropic / Cursor launch shape). Spike validates
 * pure-Remotion render of the goofy-stat motion grammar so Phase 4
 * inherits a working pattern.
 *
 * Pattern: each word fades in + translateY from 24px → 0 over 6 frames,
 * staggered 4 frames apart. Last word holds.
 */
const WORDS = ['120', 'cards.', 'Ten', 'operatives.', "Don't", 'ask.']
const STAGGER = 4
const PER_WORD_DURATION = 6

export const SpikeKineticType: React.FC = () => {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill
      style={{
        backgroundColor: PALETTE.teal2,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 200,
          fontSize: 28,
          color: PALETTE.ochre10,
          letterSpacing: '0.32em',
          marginBottom: 40,
        }}
      >
        // FIELD REPORT
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          justifyContent: 'center',
          maxWidth: 1400,
        }}
      >
        {WORDS.map((word, i) => {
          const wordStart = i * STAGGER
          const wordEnd = wordStart + PER_WORD_DURATION

          const opacity = interpolate(frame, [wordStart, wordEnd], [0, 1], {
            easing: EASE_OUT_EMIL,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })

          const translateY = interpolate(frame, [wordStart, wordEnd], [24, 0], {
            easing: EASE_OUT_EMIL,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })

          return (
            <span
              key={`${word}-${i}`}
              style={{
                fontFamily: 'Clash Display, sans-serif',
                fontWeight: 700,
                fontSize: 112,
                letterSpacing: '-0.01em',
                color: PALETTE.cream12,
                opacity,
                transform: `translateY(${translateY}px)`,
                display: 'inline-block',
              }}
            >
              {word}
            </span>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
