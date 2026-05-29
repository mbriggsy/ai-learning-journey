import React from 'react'
import { Img, staticFile } from 'remotion'
import cardStyles from '@client/shared/MinimalCard.module.css'
import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import { cardAccent } from '@client/shared/card-accents'
import { CardIcon } from '@client/shared/card-icons'
import type { CardType } from '@shared/types'

/**
 * Real BURNED-deck card for the trailer — the FoundationProof borrow path:
 * real art (.webp) + real treatment CSS + real token legend + real data.
 * Single source for every beat so card fidelity never diverges. Token CSS
 * (primitives/semantic) is imported once by the consuming scene.
 */
export const TrailerCard: React.FC<{ type: CardType; width?: number }> = ({ type, width = 360 }) => {
  const def = CARD_DEF_BY_TYPE[type]
  const accent = cardAccent(type)
  return (
    <div style={{ width }}>
      <div
        className={cardStyles.card}
        style={{ '--card-accent': accent.fill, '--card-glow-color': accent.glow } as React.CSSProperties}
      >
        <div className={cardStyles.cardHeader}>
          <CardIcon type={type} />
          <span className={cardStyles.cardName}>{def.name}</span>
        </div>
        <span className="cardIllustration">
          <Img src={staticFile(`assets/cards/${type}.webp`)} alt="" />
        </span>
        <span className={cardStyles.cardDesc}>{def.description}</span>
      </div>
    </div>
  )
}
