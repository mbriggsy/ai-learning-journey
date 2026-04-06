import { createPortal } from 'react-dom'
import { m, AnimatePresence } from 'motion/react'
import { useNopeWindow } from '@client/shared/hooks/useSharedSelectors'
import { useHand, useMyPlayer } from './hooks/usePlayerSelectors'
import { useSendAction } from '@client/shared/hooks/useSendAction'
import { haptic } from '@client/shared/haptics'
import { MOTION } from '@client/shared/animation-config'
import styles from './NopeButton.module.css'

const nopeRoot = document.getElementById('nope-root')

export function NopeButton() {
  const nopeWindow = useNopeWindow()
  const hand = useHand()
  const myPlayer = useMyPlayer()
  const sendAction = useSendAction()

  const hasNope = hand.some(c => c.type === 'nope')
  const isAlive = myPlayer?.isAlive ?? false
  const show = !!nopeWindow && isAlive

  if (!nopeRoot) return null

  return createPortal(
    <AnimatePresence>
      {show && (
        <m.button
          className={styles.nopeFab}
          disabled={!hasNope}
          onClick={() => {
            haptic('medium')
            sendAction({ type: 'nope' })
          }}
          aria-label="Play Nope card"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={MOTION.SNAPPY}
        >
          NOPE
        </m.button>
      )}
    </AnimatePresence>,
    nopeRoot,
  )
}
