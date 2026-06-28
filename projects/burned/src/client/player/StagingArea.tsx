import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { m, AnimatePresence } from 'motion/react'
import type { CardInstance, SubPhase } from '@shared/types'
import type { NopeWindowView } from '@shared/protocol'
import type { CardPlayState } from './hooks/useCardPlay'
import { MinimalCard } from '@client/shared/MinimalCard'
import { MOTION } from '@client/shared/tokens/motion'
import { haptic } from '@client/shared/haptics'
import { useDoubleTap } from './hooks/useDoubleTap'
import { useSendAction } from '@client/shared/hooks/useSendAction'
import { gameStore } from '@client/shared/gameStore'
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
  readonly nopeWindow: NopeWindowView | null
  readonly hasIntercept: boolean
  readonly isAlive: boolean
  readonly favorMode: { requesterName: string } | null
  readonly favorWaitingFor: { targetName: string } | null
  readonly onUnstageCard: (cardId: string) => void
  readonly onConfirm: () => void
  readonly onConfirmWithTarget: () => void
  readonly onCardLongPress: (cardId: string) => void
  readonly onIntercept: () => void
  readonly onSurrender: () => void
}

export function StagingArea({
  hand, cardPlayState, isMyTurn, subPhase, drawPileCount,
  disabled, optimisticPending,
  nopeWindow, hasIntercept, isAlive, favorMode, favorWaitingFor,
  onUnstageCard, onConfirm, onConfirmWithTarget, onCardLongPress, onIntercept, onSurrender,
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

  // Explicit recall affordance for the enlarge preview — the symmetric
  // partner of Hand's Stage button. Unstaging is always legal (it's a local,
  // pre-commit move), so unlike Stage this has no disabled gate.
  const handleRecall = useCallback((id: string) => {
    haptic('light')
    onUnstageCard(id)
    setEnlargedId(null)
  }, [onUnstageCard])

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
    // Flip optimisticPending → true so the button locks until the
    // next state-update arrives. Without this, rapid taps all send
    // draw-card actions (stateVersion exempts draw-card on the server
    // for the active player until the state advances), producing a
    // cascade of STALE_STATE errors the user sees as error-toast spam.
    // No hand change yet — state-update decides what card was drawn.
    // E2E audit 2026-04-23 D-02.
    gameStore.applyOptimistic(s => s)
  }, [sendAction])

  const stagedCards = cardPlayState.status === 'selecting'
    ? cardPlayState.selectedCardIds
        .map(id => hand.find(c => c.id === id))
        .filter((c): c is CardInstance => c !== undefined)
    : []

  const enlargedStagedCard = enlargedId
    ? stagedCards.find(c => c.id === enlargedId) ?? null
    : null

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
      <div className={styles.smartActionBox}>
        <SmartActionBox
          cardPlayState={cardPlayState}
          isMyTurn={isMyTurn}
          subPhase={subPhase}
          drawPileCount={drawPileCount}
          disabled={disabled}
          optimisticPending={optimisticPending}
          nopeWindow={nopeWindow}
          hasIntercept={hasIntercept}
          isAlive={isAlive}
          favorMode={favorMode}
          favorWaitingFor={favorWaitingFor}
          onConfirm={onConfirm}
          onConfirmWithTarget={onConfirmWithTarget}
          onDraw={handleDraw}
          onIntercept={onIntercept}
          onSurrender={onSurrender}
        />
      </div>

      {/* Full-screen enlarge overlay — portalled to <body>, same pattern
          as Hand.tsx. The shared `handStyles.enlargeBackdrop` class uses
          `position: absolute; inset: 0` against <body> (which is
          position:relative) — rendering inline as a child of `.staging`
          would resolve `inset:0` against the nearest positioned ancestor,
          breaking the full-viewport coverage if any ancestor in the
          render tree later picks up `position: relative` or `contain`.
          Portalling matches Hand.tsx and dodges WebKit bug 297779 on
          iOS 26 the same way (close 05-08-2022-5p #039). */}
      {createPortal(
        <AnimatePresence>
          {enlargedStagedCard && (
            <m.div
              key="enlarge-backdrop"
              className={handStyles.enlargeBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={MOTION.enter}
              onPointerUp={() => setEnlargedId(null)}
            >
              <div className={handStyles.enlargeStack}>
                <m.div
                  className={handStyles.enlargeCard}
                  // Blur-mask during the scale transition — MinimalCard's
                  // container-query layout flips thresholds as it grows from
                  // 0.35 to 1, so content rejiggers mid-animation. A 4px blur
                  // at the endpoints smooths the swap into a single perceived
                  // motion instead of two layouts fighting mid-flight. Mirrors
                  // the pattern in Hand.tsx. Keep under 6px — blur is expensive
                  // on Safari mobile.
                  initial={{ transform: 'translateY(-80px) scale(0.35)', filter: 'blur(4px)' }}
                  animate={{ transform: 'translateY(0px) scale(1)', filter: 'blur(0px)' }}
                  exit={{ transform: 'translateY(-80px) scale(0.35)', filter: 'blur(4px)' }}
                  transition={MOTION.snappy}
                >
                  <MinimalCard type={enlargedStagedCard.type} />
                </m.div>
                {/* Recall — symmetric partner of Hand's Stage button. Pulls
                    the card back down to the hand. stopPropagation keeps the
                    tap off the backdrop's dismiss handler. The staged-card
                    double-tap-to-unstage gesture above is untouched; this only
                    ADDS the discoverable path. Always available — unstaging is
                    a local pre-commit move. */}
                <m.button
                  type="button"
                  className={handStyles.enlargeAction}
                  onPointerUp={(e: React.PointerEvent) => {
                    e.stopPropagation()
                    handleRecall(enlargedStagedCard.id)
                  }}
                  initial={{ opacity: 0, transform: 'translateY(14px) scale(0.96)' }}
                  animate={{ opacity: 1, transform: 'translateY(0px) scale(1)', transition: { ...MOTION.snappy, delay: 0.08 } }}
                  exit={{ opacity: 0, transform: 'translateY(10px) scale(0.96)', transition: MOTION.exit }}
                  transition={MOTION.snappy}
                  whileTap={{ transform: 'translateY(0px) scale(0.97)' }}
                >
                  Recall
                  <svg
                    className={handStyles.enlargeActionArrow}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 4v16M12 20l-7-7M12 20l7-7" />
                  </svg>
                </m.button>
              </div>
            </m.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
