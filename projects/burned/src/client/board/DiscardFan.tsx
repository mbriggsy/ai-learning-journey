import { memo } from 'react'
import { MinimalCard } from '@client/shared/MinimalCard'
import type { CardInstance } from '@shared/types'
import styles from './DiscardFan.module.css'

interface DiscardFanProps {
  readonly topCard: CardInstance | null
}

/**
 * Discard fan — top card face-up + 1 peek card behind at slight rotation.
 * Under-card shows card BACK (information leak prevention).
 */
export const DiscardFan = memo(function DiscardFan({ topCard }: DiscardFanProps) {
  if (!topCard) {
    return (
      <div className={styles.fan}>
        <div className={styles.empty}>
          <span className={styles.emptyStamp}>EMPTY</span>
          <span className={styles.emptyLabel}>NO PLAY YET</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.fan}>
      {/* Peek card behind — face down, slight rotation */}
      <div className={styles.peekCard}>
        <MinimalCard type={topCard.type} isFaceDown disabled />
      </div>
      {/* Top card — face up */}
      <div className={styles.topCard}>
        <MinimalCard type={topCard.type} disabled />
      </div>
    </div>
  )
})
