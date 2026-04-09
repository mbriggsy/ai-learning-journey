import { useState, useCallback, useRef, useEffect } from 'react'
import { m, AnimatePresence } from 'motion/react'
import type { CardInstance } from '@shared/types'
import type { CardPlayState } from './hooks/useCardPlay'
import { MinimalCard } from '@client/shared/MinimalCard'
import { MOTION } from '@client/shared/animation-config'
import { haptic } from '@client/shared/haptics'
import { useDoubleTap } from './hooks/useDoubleTap'
import { useSendAction } from '@client/shared/hooks/useSendAction'
import { useScrollBounce } from './hooks/useScrollBounce'
import styles from './StagingArea.module.css'
import handStyles from './Hand.module.css'

const INVALID_LABELS: Record<string, string> = {
  'mismatched-types': 'Invalid combo',
  'invalid-count': 'Invalid selection',
  'contains-extraction': "Can't play Extraction",
  'contains-burned': "Can't play Burned",
  'wild-with-non-operative': 'Wild only pairs with operatives',
  'single-operative': 'Needs a pair or triple',
}

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

  const isValid = cardPlayState.status === 'selecting' && cardPlayState.validation.valid
  const needsTarget = isValid && cardPlayState.validation.valid &&
    cardPlayState.validation.playType.kind === 'single' &&
    cardPlayState.validation.playType.requiresTarget

  const invalidReason = cardPlayState.status === 'selecting' && !cardPlayState.validation.valid
    ? cardPlayState.validation.reason
    : null

  // Center scroll when cards overflow
  useEffect(() => {
    const el = stagedCardsRef.current
    if (el && el.scrollWidth > el.clientWidth) {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
    }
  }, [stagedCards.length])

  const showDraw = stagedCards.length === 0 && isMyTurn && subPhase === 'turn-active'
  const showWaiting = stagedCards.length === 0 && !isMyTurn
  const intense = drawPileCount <= 5

  return (
    <div className={styles.staging}>
      {/* Staged cards + play button */}
      {stagedCards.length > 0 && (
        <>
          <div className={styles.stagedCards} ref={stagedCardsRef}>
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
          {invalidReason && (
            <div className={styles.invalidMsg}>{INVALID_LABELS[invalidReason]}</div>
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

      {/* Full-screen enlarge overlay — same as hand */}
      <AnimatePresence>
        {enlargedId && stagedCards.find(c => c.id === enlargedId) && (
          <m.div
            key="enlarge-backdrop"
            className={handStyles.enlargeBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onPointerUp={() => setEnlargedId(null)}
          >
            <m.div
              className={handStyles.enlargeCard}
              initial={{ scale: 0.35, y: -80 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.35, y: -80 }}
              transition={MOTION.SNAPPY}
            >
              <MinimalCard type={stagedCards.find(c => c.id === enlargedId)!.type} />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
