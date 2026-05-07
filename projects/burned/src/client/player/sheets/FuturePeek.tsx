import { useState, useCallback } from 'react'
import type { CardInstance } from '@shared/types'
import { MinimalCard } from '@client/shared/MinimalCard'
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

  const tappedSet = new Set(tapOrder)

  // Clear resets the tap selection so the user can re-pick. NOT an exit
  // from the action — the Falsify Intel card already resolved, Nope
  // window is closed, player must commit an order to advance. 'Cancel'
  // was the wrong verb: the action can't be cancelled at this stage.
  const handleClearOrder = useCallback(() => {
    if (submitted) return
    setTapOrder([])
  }, [submitted])

  return (
    <div>
      <div className={styles.sheetTitle}>
        {canRearrange ? 'Falsify Intel' : 'Intel Briefing'}
      </div>
      {canRearrange && (
        <div className={styles.sheetSubtitle}>
          Tap cards in desired order — top card first
        </div>
      )}

      <div className={styles.peekScroll}>
        {cards.map((card, i) => {
          const orderIndex = tapOrder.indexOf(card.id)
          const isTapped = tappedSet.has(card.id)
          return (
            <div
              key={card.id}
              className={styles.peekSlot}
              data-tapped={isTapped || undefined}
            >
              <div className={styles.peekCard}>
                <MinimalCard
                  type={card.type}
                  disabled={!canRearrange || isTapped || submitted}
                  onClick={canRearrange ? () => handleTap(card.id) : undefined}
                />
              </div>
              <span className={styles.peekBadge}>
                {canRearrange
                  ? (orderIndex >= 0 ? `#${orderIndex + 1}` : `Card ${i + 1}`)
                  : `Draw ${i + 1}${i === 0 ? ' · next' : ''}`}
              </span>
            </div>
          )
        })}
      </div>

      {!canRearrange && (
        <button className={styles.confirmBtn} onClick={onDismiss}>
          Got it
        </button>
      )}

      {/* canRearrange = Falsify Intel. At this point the user has already
          passed the Intercept window — the action resolved, the game is
          waiting on them to commit an order. There's no way back out.
          The only buttons the sheet needs are:
          - Clear: reset tap selection, re-pick from scratch. Enabled once
            at least one card is tapped.
          - Confirm Order: submit the full order. Enabled once all cards
            are tapped. Only valid exit from this sheet. */}
      {canRearrange && (
        <div className={styles.actionRow}>
          <button
            className={styles.cancelBtn}
            disabled={submitted || tapOrder.length === 0}
            onClick={handleClearOrder}
          >
            Clear
          </button>
          {tapOrder.length === cards.length && (
            <button
              className={styles.confirmBtn}
              disabled={submitted}
              onClick={handleConfirmOrder}
            >
              Confirm Order
            </button>
          )}
        </div>
      )}
    </div>
  )
}
