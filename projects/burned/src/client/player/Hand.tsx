import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { m, AnimatePresence } from 'motion/react'
import type { CardInstance } from '@shared/types'
import { MinimalCard } from '@client/shared/MinimalCard'
import { MOTION } from '@client/shared/tokens/motion'
import { haptic } from '@client/shared/haptics'
import { useDoubleTap } from './hooks/useDoubleTap'
import { useScrollBounce } from './hooks/useScrollBounce'
import styles from './Hand.module.css'

const LONG_PRESS_MS = 600

interface HandProps {
  readonly hand: readonly CardInstance[]
  readonly disabled: boolean
  readonly onStageCard: (cardId: string) => void
  readonly onCardLongPress?: (cardId: string) => void
}

export function Hand({ hand, disabled, onStageCard, onCardLongPress }: HandProps) {
  const handRef = useRef<HTMLDivElement>(null)
  const [dealComplete, setDealComplete] = useState(false)
  const [enlargedId, setEnlargedId] = useState<string | null>(null)
  const hasCards = hand.length > 0

  useScrollBounce(handRef)

  useEffect(() => {
    if (hasCards && !dealComplete) {
      const timer = setTimeout(() => setDealComplete(true), hand.length * 80 + 300)
      return () => clearTimeout(timer)
    }
  }, [hasCards, dealComplete, hand.length])

  // Clear enlargement when card leaves hand (staged or played)
  useEffect(() => {
    if (enlargedId && !hand.some(c => c.id === enlargedId)) {
      setEnlargedId(null)
    }
  }, [hand, enlargedId])

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  // --- Hand card taps: single=enlarge, double=stage ---
  const handleSingleTap = useCallback((id: string) => {
    setEnlargedId(prev => prev === id ? null : id)
  }, [])

  const handleDoubleTapStage = useCallback((id: string) => {
    if (disabled) return
    setEnlargedId(null)
    haptic('light')
    onStageCard(id)
  }, [disabled, onStageCard])

  const handleHandTap = useDoubleTap(handleDoubleTapStage, handleSingleTap)

  // --- Enlarged overlay taps: single=dismiss, double=stage ---
  const handleEnlargedDismiss = useCallback((_id: string) => {
    setEnlargedId(null)
  }, [])

  const handleEnlargedStage = useCallback((id: string) => {
    if (disabled) return
    setEnlargedId(null)
    haptic('light')
    onStageCard(id)
  }, [disabled, onStageCard])

  const handleEnlargedTap = useDoubleTap(handleEnlargedStage, handleEnlargedDismiss)

  const startLongPress = useCallback((cardId: string) => {
    longPressFired.current = false
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      onCardLongPress?.(cardId)
    }, LONG_PRESS_MS)
  }, [onCardLongPress])

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const enlargedCard = enlargedId ? hand.find(c => c.id === enlargedId) : null

  return (
    <>
      <div className={styles.hand} ref={handRef}>
        <AnimatePresence mode="popLayout">
          {hand.map((card, i) => (
            <m.div
              key={card.id}
              className={styles.slot}
              layout={dealComplete ? 'position' : false}
              // Transform string — card deal is a hot path (many cards enter
              // simultaneously). Shorthand would rAF on the main thread while
              // MinimalCard's nested layoutId is also computing deltas.
              initial={{ opacity: 0, transform: 'translateX(40px) scale(0.85)' }}
              animate={{ opacity: 1, transform: 'translateX(0px) scale(1)' }}
              exit={{ opacity: 0, transform: 'scale(0.7)' }}
              transition={{
                ...MOTION.snappy,
                // Emil perceived-speed: drop the 150ms lead-in so the first
                // card lands immediately. 80ms stagger between cards preserves
                // the dealing beat without front-loaded dead air.
                delay: dealComplete ? 0 : i * 0.08,
              }}
              onPointerDown={() => startLongPress(card.id)}
              onPointerUp={(e: React.PointerEvent) => {
                cancelLongPress()
                if (!longPressFired.current) handleHandTap(card.id, e)
              }}
              onPointerCancel={cancelLongPress}
              onPointerLeave={cancelLongPress}
            >
              <MinimalCard
                type={card.type}
                layoutId={card.id}
              />
            </m.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Full-screen enlarge — portalled to body, position:absolute against root */}
      {createPortal(
        <AnimatePresence>
          {enlargedCard && (
            <m.div
              key="enlarge-backdrop"
              className={styles.enlargeBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={MOTION.enter}
              onPointerUp={(e: React.PointerEvent) => {
                handleEnlargedTap(enlargedCard.id, e)
              }}
            >
              <m.div
                key={enlargedCard.id}
                className={styles.enlargeCard}
                // Blur-mask during the scale transition — MinimalCard's
                // container-query layout flips thresholds as it grows from
                // 0.35 to 1, so content rejiggers mid-animation. A 4px blur
                // at the endpoints smooths the swap into a single perceived
                // motion instead of two layouts fighting mid-flight.
                // Keep under 6px — blur is expensive on Safari mobile.
                initial={{ transform: 'translateY(120px) scale(0.35)', filter: 'blur(4px)' }}
                animate={{ transform: 'translateY(0px) scale(1)', filter: 'blur(0px)' }}
                exit={{ transform: 'translateY(120px) scale(0.35)', filter: 'blur(4px)' }}
                transition={MOTION.snappy}
              >
                <MinimalCard type={enlargedCard.type} />
              </m.div>
            </m.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
