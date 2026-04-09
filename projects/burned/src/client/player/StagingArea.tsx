import { useCallback, useRef } from 'react'
import { m, AnimatePresence } from 'motion/react'
import type { CardInstance } from '@shared/types'
import type { CardPlayState } from './hooks/useCardPlay'
import { MinimalCard } from '@client/shared/MinimalCard'
import { MOTION } from '@client/shared/animation-config'
import { haptic } from '@client/shared/haptics'
import { useDoubleTap } from './hooks/useDoubleTap'
import { useSendAction } from '@client/shared/hooks/useSendAction'
import styles from './StagingArea.module.css'

interface StagingAreaProps {
  readonly hand: readonly CardInstance[]
  readonly cardPlayState: CardPlayState
  readonly isMyTurn: boolean
  readonly subPhase: string | null
  readonly drawPileCount: number
  readonly currentPlayerName: string | null
  readonly disabled: boolean
  readonly optimisticPending: boolean
  readonly onUnstageCard: (cardId: string) => void
  readonly onConfirm: () => void
  readonly onConfirmWithTarget: () => void
  readonly onCardLongPress: (cardId: string) => void
}

export function StagingArea({
  hand, cardPlayState, isMyTurn, subPhase, drawPileCount,
  currentPlayerName, disabled, optimisticPending,
  onUnstageCard, onConfirm, onConfirmWithTarget, onCardLongPress,
}: StagingAreaProps) {
  const sendAction = useSendAction()
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  const handleDoubleTap = useDoubleTap(useCallback((id: string) => {
    haptic('light')
    onUnstageCard(id)
  }, [onUnstageCard]))

  const startLongPress = useCallback((cardId: string) => {
    longPressFired.current = false
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      onCardLongPress(cardId)
    }, 600)
  }, [onCardLongPress])

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleDraw = useCallback(() => {
    haptic('medium')
    sendAction({ type: 'draw-card' })
  }, [sendAction])

  const stagedCards = cardPlayState.status === 'selecting'
    ? cardPlayState.selectedCardIds
        .map(id => hand.find(c => c.id === id))
        .filter((c): c is CardInstance => c !== undefined)
    : []

  const isValid = cardPlayState.status === 'selecting' && cardPlayState.validation.valid
  const needsTarget = isValid && cardPlayState.validation.valid &&
    cardPlayState.validation.playType.kind === 'single' &&
    cardPlayState.validation.playType.requiresTarget

  const showDraw = stagedCards.length === 0 && isMyTurn && subPhase === 'turn-active'
  const showWaiting = stagedCards.length === 0 && !isMyTurn
  const intense = drawPileCount <= 5

  return (
    <div className={styles.staging}>
      {/* Staged cards + play button */}
      {stagedCards.length > 0 && (
        <>
          <div className={styles.stagedCards}>
            <AnimatePresence mode="popLayout">
              {stagedCards.map(card => (
                <m.div
                  key={card.id}
                  className={styles.stagedSlot}
                  layout="position"
                  transition={MOTION.SNAPPY}
                  onPointerDown={() => startLongPress(card.id)}
                  onPointerUp={(e: React.PointerEvent) => {
                    cancelLongPress()
                    if (!longPressFired.current) handleDoubleTap(card.id, e)
                  }}
                  onPointerCancel={cancelLongPress}
                  onPointerLeave={cancelLongPress}
                >
                  <MinimalCard
                    type={card.type}
                    isSelected
                    layoutId={card.id}
                  />
                </m.div>
              ))}
            </AnimatePresence>
          </div>
          {isValid && (
            <button
              className={styles.playBtn}
              disabled={disabled || optimisticPending}
              onClick={() => {
                haptic('medium')
                if (needsTarget) onConfirmWithTarget(); else onConfirm()
              }}
            >
              {needsTarget ? 'Play \u2192' : 'Play'}
            </button>
          )}
        </>
      )}

      {/* Draw button */}
      {showDraw && (
        <button
          className={`${styles.drawBtn} ${intense ? styles.intense : ''}`}
          disabled={disabled || optimisticPending}
          onClick={handleDraw}
        >
          Draw ({drawPileCount})
        </button>
      )}

      {/* Waiting */}
      {showWaiting && (
        <div className={styles.waiting}>
          Waiting for {currentPlayerName ?? '...'}
          <span className={styles.pileCount}>{drawPileCount} in pile</span>
        </div>
      )}

      {/* Empty staging hint */}
      {stagedCards.length === 0 && !showDraw && !showWaiting && (
        <div className={styles.hint}>Double-tap a card to stage it</div>
      )}
    </div>
  )
}
