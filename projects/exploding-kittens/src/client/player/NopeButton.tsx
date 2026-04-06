import { createPortal } from 'react-dom'
import { useNopeWindow } from '@client/shared/hooks/useSharedSelectors'
import { useHand, useMyPlayer } from './hooks/usePlayerSelectors'
import { useSendAction } from '@client/shared/hooks/useSendAction'
import styles from './NopeButton.module.css'

const nopeRoot = document.getElementById('nope-root')

export function NopeButton() {
  const nopeWindow = useNopeWindow()
  const hand = useHand()
  const myPlayer = useMyPlayer()
  const sendAction = useSendAction()

  const hasNope = hand.some(c => c.type === 'nope')
  const isAlive = myPlayer?.isAlive ?? false

  if (!nopeWindow || !isAlive || !nopeRoot) return null

  return createPortal(
    <button
      className={styles.nopeFab}
      disabled={!hasNope}
      onClick={() => sendAction({ type: 'nope' })}
      aria-label="Play Nope card"
    >
      NOPE
    </button>,
    nopeRoot,
  )
}
