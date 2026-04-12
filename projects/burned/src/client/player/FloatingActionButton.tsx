import { useState, useEffect } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useNopeWindow } from '@client/shared/hooks/useSharedSelectors'
import { useHand, useMyPlayer } from './hooks/usePlayerSelectors'
import { useSendAction } from '@client/shared/hooks/useSendAction'
import { haptic } from '@client/shared/haptics'
import { MOTION } from '@client/shared/animation-config'
import styles from './FloatingActionButton.module.css'

export function FloatingActionButton() {
  const nopeWindow = useNopeWindow()
  const hand = useHand()
  const myPlayer = useMyPlayer()
  const sendAction = useSendAction()

  const hasIntercept = hand.some(c => c.type === 'intercepted')
  const isAlive = myPlayer?.isAlive ?? false
  const show = !!nopeWindow && isAlive

  // Countdown seconds remaining (preserved from InterceptButton.tsx pattern)
  const [secondsLeft, setSecondsLeft] = useState(0)
  useEffect(() => {
    if (!nopeWindow) { setSecondsLeft(0); return }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((nopeWindow.deadlineMs - Date.now()) / 1000))
      setSecondsLeft(remaining)
    }
    update()
    const timer = setInterval(update, 250)
    return () => clearInterval(timer)
  }, [nopeWindow?.deadlineMs, nopeWindow?.generation])

  return (
    <AnimatePresence>
      {show && (
        <m.button
          className={`${styles.fab} ${styles.intercept} ${secondsLeft <= 2 ? styles.urgent : ''}`}
          disabled={!hasIntercept}
          onClick={() => {
            haptic('medium')
            sendAction({ type: 'nope' })
          }}
          aria-label="Play Intercepted card"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={MOTION.SNAPPY}
        >
          INTERCEPT{secondsLeft > 0 ? ` ${secondsLeft}s` : ''}
        </m.button>
      )}
    </AnimatePresence>
  )
}
