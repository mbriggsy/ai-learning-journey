import { memo } from 'react'
import { m } from 'motion/react'
import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import type { CardType } from '@shared/types'
import { cardAccent } from './card-accents'
import { CardIcon } from './card-icons'
import { CardIllustration } from './CardIllustration'
import styles from './MinimalCard.module.css'

export interface CardProps {
  readonly type: CardType
  readonly isSelected?: boolean
  readonly disabled?: boolean
  readonly onClick?: () => void
}

interface CardVisualProps {
  readonly isFaceDown?: boolean
  readonly layoutId?: string
  /**
   * Tighter internal padding (4px vs default 12px). Used in space-
   * constrained surfaces like the Falsify Intel rearrange dossier where
   * 3 cards share vertical viewport. Same chrome composition (icon + name
   * + illustration) — just less padding inside the card frame, which
   * shifts MinimalCard's container-query thresholds down so name chrome
   * remains visible at smaller border-box widths. Default consumers
   * (hand, staging, board) keep the standard padding.
   */
  readonly compact?: boolean
}

type PremiumCardProps = CardProps & CardVisualProps

export const MinimalCard = memo(function MinimalCard({
  type, isSelected, disabled, onClick, isFaceDown, layoutId, compact,
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
      className={compact ? `${styles.card} ${styles.cardCompact}` : styles.card}
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
      <div className={styles.cardHeader}>
        <CardIcon type={type} />
        <span className={styles.cardName}>{def.name}</span>
      </div>
      <CardIllustration type={type} />
      <span className={styles.cardDesc}>{def.description}</span>
    </m.div>
  )
})
