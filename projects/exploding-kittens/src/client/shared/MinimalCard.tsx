import { memo } from 'react'
import { m } from 'motion/react'
import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import type { CardType } from '@shared/types'
import styles from './MinimalCard.module.css'

export interface CardProps {
  readonly id: string
  readonly type: CardType
  readonly isSelected?: boolean
  readonly disabled?: boolean
  readonly onClick?: () => void
}

export const MinimalCard = memo(function MinimalCard({ type, isSelected, disabled, onClick }: CardProps) {
  return (
    <m.div
      className={styles.card}
      data-type={type}
      data-selected={isSelected || undefined}
      aria-label={CARD_DEF_BY_TYPE[type].name}
      aria-disabled={disabled || undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
    >
      {CARD_DEF_BY_TYPE[type].name}
    </m.div>
  )
})
