import { useState, useCallback } from 'react'
import type { CardInstance } from '@shared/types'
import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import styles from './sheets.module.css'

interface FuturePeekProps {
  readonly cards: readonly CardInstance[]
  readonly canRearrange: boolean
  readonly onDismiss: () => void
  readonly onRearrange?: (order: string[]) => void
}

export function FuturePeek({ cards, canRearrange, onDismiss, onRearrange }: FuturePeekProps) {
  const [tapOrder, setTapOrder] = useState<string[]>([])

  const handleTap = useCallback((cardId: string) => {
    if (!canRearrange) return
    setTapOrder(prev => {
      if (prev.includes(cardId)) return prev
      const next = [...prev, cardId]
      if (next.length === cards.length && onRearrange) {
        // Schedule to avoid state-during-render
        setTimeout(() => onRearrange(next), 0)
      }
      return next
    })
  }, [canRearrange, cards.length, onRearrange])

  const tappedSet = new Set(tapOrder)

  return (
    <div>
      <div className={styles.sheetTitle}>
        {canRearrange ? 'Alter the Future' : 'See the Future'}
      </div>
      {canRearrange && (
        <div className={styles.sheetSubtitle}>
          Tap cards in desired order — top card first
        </div>
      )}

      <div className={styles.tapOrder}>
        {cards.map((card, i) => {
          const orderIndex = tapOrder.indexOf(card.id)
          return (
            <button
              key={card.id}
              className={styles.tapCard}
              data-tapped={tappedSet.has(card.id) || undefined}
              onClick={() => handleTap(card.id)}
              disabled={tappedSet.has(card.id) && canRearrange}
            >
              {orderIndex >= 0 && (
                <span className={styles.orderBadge}>#{orderIndex + 1}</span>
              )}
              <span>{CARD_DEF_BY_TYPE[card.type].name}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {canRearrange ? '' : `#${i + 1}`}
              </span>
            </button>
          )
        })}
      </div>

      {!canRearrange && (
        <button className={styles.confirmBtn} onClick={onDismiss}>
          Got it
        </button>
      )}

      {canRearrange && tapOrder.length === cards.length && (
        <button
          className={styles.confirmBtn}
          onClick={() => onRearrange?.(tapOrder)}
        >
          Confirm Order
        </button>
      )}
    </div>
  )
}
