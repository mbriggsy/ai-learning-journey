import { m, AnimatePresence } from 'motion/react'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './StatusBar.module.css'

interface StatusBarProps {
  readonly isMyTurn: boolean
  readonly currentPlayerName: string | null
  readonly drawPileCount: number
}

export function StatusBar({ isMyTurn, currentPlayerName, drawPileCount }: StatusBarProps) {
  const outerClass = `${styles.statusBar} ${isMyTurn ? styles.yourTurn : styles.waiting}`
  const { key, body } = bodyFor(isMyTurn, currentPlayerName, drawPileCount)

  return (
    <div className={outerClass} data-diag="statusbar">
      {/* AnimatePresence with mode="wait" punches the text in/out on state
          change — flipping from "Sable is on deck" to "You're up" is the
          most important transition on the phone, so it gets dedicated motion
          instead of a silent class swap. initial={false} means the mount
          animation is owned by .statusBar's @starting-style, not Framer. */}
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={key}
          className={styles.inner}
          initial={{ transform: 'translateY(6px) scale(0.96)', opacity: 0 }}
          animate={{ transform: 'translateY(0px) scale(1)', opacity: 1 }}
          exit={{ transform: 'translateY(-4px) scale(1)', opacity: 0 }}
          transition={MOTION.snappy}
        >
          {body}
        </m.span>
      </AnimatePresence>
    </div>
  )
}

function bodyFor(
  isMyTurn: boolean,
  currentPlayerName: string | null,
  drawPileCount: number,
): { key: string; body: React.ReactNode } {
  if (isMyTurn) {
    return { key: 'me', body: <>You&rsquo;re up</> }
  }
  if (currentPlayerName) {
    return {
      key: `wait-${currentPlayerName}`,
      body: (
        <>
          {currentPlayerName} is on deck
          <span className={styles.pileCount}> &middot; {drawPileCount} in the pile</span>
        </>
      ),
    }
  }
  return { key: 'standby', body: 'Standing by...' }
}
