import { useState, useEffect } from 'react'
import { m, AnimatePresence } from 'motion/react'
import type { CardInstance } from '@shared/types'
import { MinimalCard } from '@client/shared/MinimalCard'
import { MOTION } from '@client/shared/animation-config'
import styles from './Hand.module.css'

interface HandProps {
  readonly hand: readonly CardInstance[]
  readonly selectedIds: ReadonlySet<string>
  readonly disabled: boolean
  readonly onCardClick: (cardId: string) => void
}

export function Hand({ hand, selectedIds, disabled, onCardClick }: HandProps) {
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

  return (
    <>
      <div className={styles.cardCount}>{hand.length} cards</div>
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
            >
              <MinimalCard
                type={card.type}
                isSelected={selectedIds.has(card.id)}
                disabled={disabled}
                onClick={() => onCardClick(card.id)}
              />
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}
