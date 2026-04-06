import { memo } from 'react'
import { m } from 'motion/react'
import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import type { CardType } from '@shared/types'
import { cardAccent } from './theme'
import { CardIcon } from './card-icons'
import styles from './MinimalCard.module.css'

export interface CardProps {
  readonly type: CardType
  readonly isSelected?: boolean
  readonly disabled?: boolean
  readonly onClick?: () => void
}

export interface CardVisualProps {
  readonly isFaceDown?: boolean
  readonly layoutId?: string
}

export type PremiumCardProps = CardProps & CardVisualProps

export const MinimalCard = memo(function MinimalCard({
  type, isSelected, disabled, onClick, isFaceDown, layoutId,
}: PremiumCardProps) {
  const def = CARD_DEF_BY_TYPE[type]
  const accent = cardAccent(type)

  if (isFaceDown) {
    return (
      <m.div
        className={styles.cardBack}
        layoutId={layoutId}
        aria-label="Face-down card"
        role="img"
      />
    )
  }

  return (
    <m.div
      className={styles.card}
      style={{
        '--card-accent': accent.fill,
        '--card-glow-color': accent.glow,
      } as React.CSSProperties}
      data-type={type}
      data-selected={isSelected || undefined}
      aria-label={def.name}
      aria-disabled={disabled || undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={disabled ? undefined : (e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      layoutId={layoutId}
    >
      <CardIcon type={type} />
      <span className={styles.cardName}>{def.name}</span>
      <span className={styles.cardDesc}>{def.description}</span>
    </m.div>
  )
})
