import { useState, useCallback, useEffect } from 'react'
import type { CardInstance } from '@shared/types'
import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import { TIMING } from '@shared/constants'
import styles from './sheets.module.css'

interface FuturePeekProps {
  readonly cards: readonly CardInstance[]
  readonly canRearrange: boolean
  readonly onDismiss: () => void
  readonly onRearrange?: (order: string[]) => void
}

export function FuturePeek({ cards, canRearrange, onDismiss, onRearrange }: FuturePeekProps) {
  const [tapOrder, setTapOrder] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  const handleTap = useCallback((cardId: string) => {
    if (!canRearrange || submitted) return
    setTapOrder(prev => {
      if (prev.includes(cardId)) return prev
      return [...prev, cardId]
    })
  }, [canRearrange, submitted])

  const handleConfirmOrder = useCallback(() => {
    if (submitted || tapOrder.length !== cards.length) return
    setSubmitted(true)
    onRearrange?.(tapOrder)
  }, [submitted, tapOrder, cards.length, onRearrange])

  // Auto-close See the Future (read-only) after 10s
  const [countdown, setCountdown] = useState(
    canRearrange ? 0 : Math.ceil(TIMING.SEE_FUTURE_AUTO_CLOSE_MS / 1000)
  )
  const isCountingDown = !canRearrange && countdown > 0

  useEffect(() => {
    if (!isCountingDown) return
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onDismiss()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isCountingDown, onDismiss])

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
              disabled={(tappedSet.has(card.id) && canRearrange) || submitted}
            >
              {orderIndex >= 0 && (
                <span className={styles.orderBadge}>#{orderIndex + 1}</span>
              )}
              <span>{CARD_DEF_BY_TYPE[card.type].name}</span>
              {!canRearrange && (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  #{i + 1}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {!canRearrange && (
        <button className={styles.confirmBtn} onClick={onDismiss}>
          Got it{countdown > 0 ? ` (${countdown}s)` : ''}
        </button>
      )}

      {canRearrange && tapOrder.length === cards.length && (
        <button
          className={styles.confirmBtn}
          disabled={submitted}
          onClick={handleConfirmOrder}
        >
          Confirm Order
        </button>
      )}
    </div>
  )
}
