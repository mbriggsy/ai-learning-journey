import { useState, useEffect, useRef, useCallback } from 'react'
import { m, AnimatePresence } from 'motion/react'
import type { CardInstance } from '@shared/types'
import { MinimalCard } from '@client/shared/MinimalCard'
import { MOTION } from '@client/shared/animation-config'
import styles from './Hand.module.css'

const LONG_PRESS_MS = 500

interface HandProps {
  readonly hand: readonly CardInstance[]
  readonly selectedIds: ReadonlySet<string>
  readonly disabled: boolean
  readonly onCardClick: (cardId: string) => void
  readonly onCardLongPress?: (cardId: string) => void
}

export function Hand({ hand, selectedIds, disabled, onCardClick, onCardLongPress }: HandProps) {
  // Deal guard: disable layout="position" during initial stagger.
  // After deal completes, enable so reorder/removal animates correctly.
  const [dealComplete, setDealComplete] = useState(false)
  const hasCards = hand.length > 0

  useEffect(() => {
    if (hasCards && !dealComplete) {
      const timer = setTimeout(() => setDealComplete(true), hand.length * 100 + 400)
      return () => clearTimeout(timer)
    }
  }, [hasCards, dealComplete, hand.length])

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

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

  const handleClick = useCallback((cardId: string) => {
    // If long press already fired, swallow the click
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    onCardClick(cardId)
  }, [onCardClick])

  return (
    <>
      <div className={styles.cardCount}>{hand.length} card{hand.length !== 1 ? 's' : ''}</div>
      <div className={styles.handContainer} {...(dealComplete ? { 'data-layout-scroll': true } : {})}>
        <AnimatePresence mode="popLayout">
          {hand.map((card, i) => (
            <m.div
              key={card.id}
              className={styles.cardSlot}
              layout={dealComplete ? 'position' : false}
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{
                opacity: 1,
                y: selectedIds.has(card.id) ? -20 : 0,
                scale: 1,
              }}
              exit={{ opacity: 0, y: -200 }}
              transition={{
                ...MOTION.SNAPPY,
                // Stagger on initial deal only
                delay: dealComplete ? 0 : i * 0.1 + 0.3,
              }}
              onPointerDown={() => startLongPress(card.id)}
              onPointerUp={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onPointerLeave={cancelLongPress}
            >
              <MinimalCard
                type={card.type}
                isSelected={selectedIds.has(card.id)}
                disabled={disabled}
                onClick={() => handleClick(card.id)}
              />
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}
