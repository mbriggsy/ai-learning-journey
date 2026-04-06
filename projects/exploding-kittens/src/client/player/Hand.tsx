import type { CardInstance } from '@shared/types'
import { MinimalCard } from '@client/shared/MinimalCard'
import styles from './Hand.module.css'

interface HandProps {
  readonly hand: readonly CardInstance[]
  readonly selectedIds: ReadonlySet<string>
  readonly disabled: boolean
  readonly onCardClick: (cardId: string) => void
}

export function Hand({ hand, selectedIds, disabled, onCardClick }: HandProps) {
  return (
    <>
      <div className={styles.cardCount}>{hand.length} cards</div>
      <div className={styles.handContainer}>
        {hand.map(card => (
          <div key={card.id} className={styles.cardSlot}>
            <MinimalCard
              id={card.id}
              type={card.type}
              isSelected={selectedIds.has(card.id)}
              disabled={disabled}
              onClick={() => onCardClick(card.id)}
            />
          </div>
        ))}
      </div>
    </>
  )
}
