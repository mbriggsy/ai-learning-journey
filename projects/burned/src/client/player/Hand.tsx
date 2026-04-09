import { useState, useEffect, useRef, useCallback } from 'react'
import { m, AnimatePresence } from 'motion/react'
import type { CardInstance } from '@shared/types'
import { MinimalCard } from '@client/shared/MinimalCard'
import { MOTION } from '@client/shared/animation-config'
import { haptic } from '@client/shared/haptics'
import { useDoubleTap } from './hooks/useDoubleTap'
import styles from './Hand.module.css'

const LONG_PRESS_MS = 600

interface HandProps {
  readonly hand: readonly CardInstance[]
  readonly disabled: boolean
  readonly onStageCard: (cardId: string) => void
  readonly onCardLongPress?: (cardId: string) => void
}

export function Hand({ hand, disabled, onStageCard, onCardLongPress }: HandProps) {
  const [dealComplete, setDealComplete] = useState(false)
  const [enlargedId, setEnlargedId] = useState<string | null>(null)
  const hasCards = hand.length > 0

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
      <div className={styles.hand}>
        <AnimatePresence mode="popLayout">
          {hand.map((card, i) => (
            <m.div
              key={card.id}
              className={styles.cardSlot}
              layout={dealComplete ? 'position' : false}
              initial={{ opacity: 0, x: 40, scale: 0.85 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{
                ...MOTION.SNAPPY,
                delay: dealComplete ? 0 : i * 0.08 + 0.15,
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
                disabled={disabled}
                layoutId={card.id}
              />
            </m.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Full-screen enlarge — spring scale, no layoutId z-index fight */}
      <AnimatePresence>
        {enlargedCard && (
          <m.div
            key="enlarge-backdrop"
            className={styles.enlargeBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onPointerUp={(e: React.PointerEvent) => {
              handleEnlargedTap(enlargedCard.id, e)
            }}
          >
            <m.div
              key={enlargedCard.id}
              className={styles.enlargeCard}
              initial={{ scale: 0.35, y: 120 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.35, y: 120 }}
              transition={MOTION.SNAPPY}
            >
              <MinimalCard type={enlargedCard.type} />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
