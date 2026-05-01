import { m, AnimatePresence } from 'motion/react'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './StatusBar.module.css'

interface StatusBarProps {
  readonly isMyTurn: boolean
  readonly currentPlayerName: string | null
  readonly drawPileCount: number
  /**
   * Forced-draw count from the active turn's `currentTurn.turnsRemaining`,
   * relevant only on `isMyTurn`. When `>1`, an opponent's Direct Order or
   * Reassign has stacked draws on this seat — surface "Under attack" copy
   * so the player isn't surprised when the first draw doesn't end the
   * turn (triage #022). Pass `1` (or omit) for normal turns.
   */
  readonly myTurnsRemaining?: number
}

export function StatusBar({ isMyTurn, currentPlayerName, drawPileCount, myTurnsRemaining }: StatusBarProps) {
  const outerClass = `${styles.statusBar} ${isMyTurn ? styles.yourTurn : styles.waiting}`
  const { key, body } = bodyFor(isMyTurn, currentPlayerName, drawPileCount, myTurnsRemaining ?? 1)

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
  myTurnsRemaining: number,
): { key: string; body: React.ReactNode } {
  if (isMyTurn) {
    if (myTurnsRemaining > 1) {
      return {
        key: `attacked-${myTurnsRemaining}`,
        body: (
          <>
            Under attack
            <span className={styles.pileCount}> &middot; {myTurnsRemaining} draws</span>
          </>
        ),
      }
    }
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
