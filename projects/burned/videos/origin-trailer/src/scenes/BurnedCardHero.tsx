import React from 'react'
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import cardStyles from '@client/shared/MinimalCard.module.css'
import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import { cardAccent } from '@client/shared/card-accents'
import { CardIcon } from '@client/shared/card-icons'
import type { CardType } from '@shared/types'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'

/**
 * BURNED CARD HERO — the real `burned` card (real art + treatment CSS + token
 * legend), the FoundationProof borrow path with HERO='burned'. Replaces the
 * Imagen-hallucinated explosion emblem: when a card appears in the trailer it
 * must be the REAL deck, never a generic playing card (Briggsy note 2026-05-29).
 */
const HERO: CardType = 'burned'
const SLOT_W = 520

export const BURNED_CARD_HERO_FRAMES = 90

export const BurnedCardHero: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const def = CARD_DEF_BY_TYPE[HERO]
  const accent = cardAccent(HERO)

  const s = spring({ frame, fps, config: { mass: 0.6, damping: 13, stiffness: 140 } })
  const y = interpolate(s, [0, 1], [560, 0])
  const scale = interpolate(s, [0, 1], [0.72, 1])
  const rot = interpolate(s, [0, 1], [10, 0])
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(120% 90% at 50% 42%, rgba(22,51,56,0.55) 0%, #0c2024 55%, #08181a 100%)' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: SLOT_W,
          transform: `translate(-50%, -50%) translateY(${y}px) rotate(${rot}deg) scale(${scale})`,
          transformOrigin: 'center bottom',
          opacity,
        }}
      >
        <div
          className={cardStyles.card}
          style={{ '--card-accent': accent.fill, '--card-glow-color': accent.glow } as React.CSSProperties}
        >
          <div className={cardStyles.cardHeader}>
            <CardIcon type={HERO} />
            <span className={cardStyles.cardName}>{def.name}</span>
          </div>
          <span className="cardIllustration">
            <Img src={staticFile(`assets/cards/${HERO}.webp`)} alt="" />
          </span>
          <span className={cardStyles.cardDesc}>{def.description}</span>
        </div>
      </div>
    </AbsoluteFill>
  )
}
