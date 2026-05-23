import React from 'react'
import { Img, staticFile, useCurrentFrame } from 'remotion'
import { archerStampSlap } from '../lib/animations'

/**
 * S03 VO #2 beat 1 — "Mission: a deck of one hundred and twenty operations."
 *
 * Renders a stack-of-card-backs + giant "120" badge + subtitle, in the
 * lower-left area of the desk (the empty wood between the cascade's
 * lower edge and the Otto-aside marginalia). Spatially this is "where
 * the deck of mission cards sits on the briefing-room desk." The
 * cascade is dealt operatives; this is the closed deck.
 *
 * Composition: stack on the LEFT, big "120" number on the RIGHT of the
 * stack, "// OPERATIONS" subtitle beneath. Reads like a count badge
 * with vocabulary chrome.
 *
 * Card-back vocabulary: 5:7 portrait rectangles, charcoal-3 (#1a1812) fill,
 * ochre-9 (#947226) hairline border + center Pendleton crest. Stack
 * offset peels up-and-left from the front for "deck depth."
 *
 * Entry: archerStampSlap('payoff') variant — 16-frame envelope with
 * overshoot 1.06 → settle 1.0. Same vocabulary as S01 R15 stamps.
 */
const FRONT_CARD_W = 130
const FRONT_CARD_H = 182 // 5:7 portrait
const STACK_OFFSET = 10
const BASELINE_TILT_DEG = -8

export const DeckStack: React.FC<{ landFrame: number }> = ({ landFrame }) => {
  const frame = useCurrentFrame()
  const { scale, rotate, opacity } = archerStampSlap({
    frame,
    landFrame,
    tiltDeg: BASELINE_TILT_DEG,
    variant: 'payoff',
  })

  if (frame < landFrame) return null

  // Composition bounds: stack 150×202 (with offset peel) + 30px gap +
  // ~180w "120" number + subtitle below.
  const STACK_BLOCK_W = FRONT_CARD_W + STACK_OFFSET * 2
  const STACK_BLOCK_H = FRONT_CARD_H + STACK_OFFSET * 2

  return (
    <div
      style={{
        position: 'absolute',
        left: 100,
        top: 620,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        transformOrigin: 'center center',
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
    >
      {/* Row: card stack + big "120" badge side-by-side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div
          style={{
            position: 'relative',
            width: STACK_BLOCK_W,
            height: STACK_BLOCK_H,
          }}
        >
          {/* Back cards peek UP-AND-LEFT from behind the front (front offset
              equals max back offset). Render order: back-most first, front
              last, so DOM z-order puts the front on top with back cards
              visible at their top-left peel edges. */}
          <DeckCardBack offsetX={0} offsetY={0} depth={2} />
          <DeckCardBack offsetX={STACK_OFFSET} offsetY={STACK_OFFSET} depth={1} />
          <DeckCardBack offsetX={STACK_OFFSET * 2} offsetY={STACK_OFFSET * 2} depth={0} />
        </div>

        {/* The "120" itself — big Clash Display number, ochre-9 */}
        <div
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 700,
            fontSize: 112,
            color: '#947226', // ochre-9
            letterSpacing: '0.02em',
            lineHeight: 1,
            textShadow: '0 2px 6px rgba(0, 0, 0, 0.5)',
          }}
        >
          120
        </div>
      </div>

      {/* "// OPERATIONS" subtitle beneath the whole block */}
      <div
        style={{
          marginTop: 12,
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 500,
          fontSize: 20,
          color: '#edb182', // ochre-11
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        // OPERATIONS
      </div>
    </div>
  )
}

const DeckCardBack: React.FC<{ offsetX: number; offsetY: number; depth: number }> = ({
  offsetX,
  offsetY,
  depth,
}) => {
  // Back cards darker so the stack reads as depth.
  const fillByDepth = ['#1a1812', '#141210', '#0e0c0a'] // charcoal-3 → darker
  const fill = fillByDepth[depth] ?? '#0e0c0a'

  return (
    <div
      style={{
        position: 'absolute',
        left: offsetX,
        top: offsetY,
        width: FRONT_CARD_W,
        height: FRONT_CARD_H,
        backgroundColor: fill,
        border: '2px solid #947226', // ochre-9
        borderRadius: 4,
        boxShadow: depth === 0 ? '0 4px 8px rgba(0, 0, 0, 0.4)' : 'none',
      }}
    >
      {/* Pendleton crest centered on the front card — BURNED brand mark */}
      {depth === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 10,
            border: '1px solid rgba(148, 114, 38, 0.5)', // ochre-9 50%
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Img
            src={staticFile('assets/howtoplay/pendleton-crest.png')}
            style={{
              width: '70%',
              height: '70%',
              objectFit: 'contain',
              opacity: 0.7,
              filter: 'sepia(0.3) hue-rotate(-15deg) saturate(1.2)',
            }}
          />
        </div>
      )}
    </div>
  )
}
