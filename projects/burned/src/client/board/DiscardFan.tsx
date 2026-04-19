import { memo } from 'react'
import { MinimalCard } from '@client/shared/MinimalCard'
import type { CardInstance } from '@shared/types'
import styles from './DiscardFan.module.css'

interface DiscardFanProps {
  readonly recentCards: readonly CardInstance[]
}

/**
 * Discard fan — hero pile on the blotter. Shows up to 3 recent discards
 * face-up, newest on top, older cards tilted left/right behind at reduced
 * opacity to read as an accumulating history. Discard contents are public in
 * canonical EK, so face-up older cards are legal information (not a leak).
 */
export const DiscardFan = memo(function DiscardFan({ recentCards }: DiscardFanProps) {
  if (recentCards.length === 0) {
    return (
      <div className={styles.fan}>
        <div className={styles.empty}>
          <span className={styles.emptyStamp}>EMPTY</span>
          <span className={styles.emptyLabel}>NO PLAY YET</span>
        </div>
      </div>
    )
  }

  // Stack painted back-to-front (oldest at the bottom of the fan, newest on
  // top). Positional offsets telegraph recency without needing timestamps.
  const ordered = [...recentCards].reverse()
  const topIdx = ordered.length - 1

  return (
    <div className={styles.fan}>
      {ordered.map((card, i) => {
        const depth = topIdx - i
        const isTop = depth === 0
        const cls = [
          styles.layer,
          isTop ? styles.top : '',
          depth === 1 ? styles.behind1 : '',
          depth === 2 ? styles.behind2 : '',
        ].filter(Boolean).join(' ')
        return (
          <div key={`${card.id}-${i}`} className={cls}>
            <MinimalCard type={card.type} disabled />
          </div>
        )
      })}
    </div>
  )
})
