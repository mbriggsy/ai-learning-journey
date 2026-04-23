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

  const handleKeepOrder = useCallback(() => {
    if (submitted) return
    setSubmitted(true)
    onRearrange?.(cards.map(c => c.id))
  }, [submitted, cards, onRearrange])

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
              <MinimalCard
                type={card.type}
                disabled={!canRearrange || isTapped || submitted}
                onClick={canRearrange ? () => handleTap(card.id) : undefined}
              />
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

      {/* canRearrange = Falsify Intel. Cancel is ALWAYS visible — persistent
          exit. It submits the current card order unchanged (no-op rearrange),
          clears the pending prompt, turn advances. Same server action as
          Confirm Order; the label just tells the user which intent they're
          acting on. Confirm appears alongside Cancel once all cards are tapped.
          "Cancel" chosen over earlier "Keep Order" because the user's mental
          model is "I want to bail" — explicit verb beats cute phrasing. */}
      {canRearrange && (
        <div className={styles.actionRow}>
          <button
            className={styles.cancelBtn}
            disabled={submitted}
            onClick={handleKeepOrder}
          >
            Cancel
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
