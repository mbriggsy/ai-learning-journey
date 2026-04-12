import { useState, useCallback, useRef, useEffect } from 'react'
import { m, AnimatePresence } from 'motion/react'
import type { CardInstance, SubPhase } from '@shared/types'
import type { CardPlayState } from './hooks/useCardPlay'
import { MinimalCard } from '@client/shared/MinimalCard'
import { MOTION } from '@client/shared/tokens/motion'
import { haptic } from '@client/shared/haptics'
import { useDoubleTap } from './hooks/useDoubleTap'
import { useSendAction } from '@client/shared/hooks/useSendAction'
import { useScrollBounce } from './hooks/useScrollBounce'
import { SmartActionBox } from './SmartActionBox'
import styles from './StagingArea.module.css'
import handStyles from './Hand.module.css'

interface StagingAreaProps {
  readonly hand: readonly CardInstance[]
  readonly cardPlayState: CardPlayState
  readonly isMyTurn: boolean
  readonly subPhase: SubPhase | null
  readonly drawPileCount: number
  readonly disabled: boolean
  readonly optimisticPending: boolean
  readonly onUnstageCard: (cardId: string) => void
  readonly onConfirm: () => void
  readonly onConfirmWithTarget: () => void
  readonly onCardLongPress: (cardId: string) => void
}

export function StagingArea({
  hand, cardPlayState, isMyTurn, subPhase, drawPileCount,
  disabled, optimisticPending,
  onUnstageCard, onConfirm, onConfirmWithTarget, onCardLongPress,
}: StagingAreaProps) {
  const sendAction = useSendAction()
  const stagedCardsRef = useRef<HTMLDivElement>(null)
  useScrollBounce(stagedCardsRef)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)
  const [enlargedId, setEnlargedId] = useState<string | null>(null)

  const handleSingleTap = useCallback((id: string) => {
    setEnlargedId(prev => prev === id ? null : id)
  }, [])

  const handleDoubleTap = useDoubleTap(useCallback((id: string) => {
    haptic('light')
    onUnstageCard(id)
  }, [onUnstageCard]), handleSingleTap)

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

  // Clear enlargement when card leaves staging (unstaged or played)
  useEffect(() => {
    if (enlargedId && !stagedCards.some(c => c.id === enlargedId)) {
      setEnlargedId(null)
    }
  }, [stagedCards, enlargedId])

  // Center scroll when cards overflow
  useEffect(() => {
    const el = stagedCardsRef.current
    if (el && el.scrollWidth > el.clientWidth) {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
    }
  }, [stagedCards.length])

  return (
    <div className={styles.staging}>
      {/* Staged cards */}
      {stagedCards.length > 0 && (
        <div className={styles.stagedRow} ref={stagedCardsRef}>
          <AnimatePresence mode="popLayout">
            {stagedCards.map(card => (
              <m.div
                key={card.id}
                className={styles.stagedSlot}
                layout="position"
                transition={MOTION.snappy}
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
                />
              </m.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Smart action box — always present, adapts to context */}
      <SmartActionBox
        cardPlayState={cardPlayState}
        isMyTurn={isMyTurn}
        subPhase={subPhase}
        drawPileCount={drawPileCount}
        disabled={disabled}
        optimisticPending={optimisticPending}
        onConfirm={onConfirm}
        onConfirmWithTarget={onConfirmWithTarget}
        onDraw={handleDraw}
      />

      {/* Full-screen enlarge overlay — same as hand */}
      <AnimatePresence>
        {enlargedId && stagedCards.find(c => c.id === enlargedId) && (
          <m.div
            key="enlarge-backdrop"
            className={handStyles.enlargeBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION.enter}
            onPointerUp={() => setEnlargedId(null)}
          >
            <m.div
              className={handStyles.enlargeCard}
              initial={{ scale: 0.35, y: -80 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.35, y: -80 }}
              transition={MOTION.snappy}
            >
              <MinimalCard type={stagedCards.find(c => c.id === enlargedId)!.type} />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
