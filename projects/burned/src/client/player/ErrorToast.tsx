import { useEffect, useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useLastError, gameStore } from '@client/shared/gameStore'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './ErrorToast.module.css'

export function ErrorToast() {
  const error = useLastError()
  const [visible, setVisible] = useState(false)

  // Suppress on the JoinScreen — pre-join errors (GAME_ALREADY_STARTED,
  // NAME_TAKEN, NAME_INVALID, ROOM_FULL, ...) already render inline below
  // the join input via JoinScreen's own useLastError consumer. Without
  // this gate the same message renders TWICE for the toast's 2s window:
  // once at the top of the viewport (toast) and once below the input
  // (inline). `playerId` is set on the first `joined` message and
  // persists for the session, so this gate isolates the no-color-yet
  // pre-join window precisely.
  const playerId = gameStore.getPlayerId()
  const isPreJoin = playerId === null

  useEffect(() => {
    if (!error || isPreJoin) return
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 2000)
    return () => clearTimeout(timer)
  }, [error, isPreJoin])

  return (
    <AnimatePresence>
      {visible && error && (
        <m.div
          className={styles.toast}
          // Transform string keeps the slide GPU-composited under load — toast
          // fires during WS-hot paths (error arrives mid-action). Shorthand
          // `y` runs on main thread via rAF.
          initial={{ transform: 'translateY(-60px)', opacity: 0 }}
          animate={{ transform: 'translateY(0px)', opacity: 1 }}
          exit={{ transform: 'translateY(-60px)', opacity: 0 }}
          transition={MOTION.quickFade}
        >
          {
            error.code === 'STALE_STATE' ? 'Game state changed — try again'
            : error.code === 'NOPE_TOO_LATE' ? 'Too late — someone intercepted first'
            : error.message
          }
        </m.div>
      )}
    </AnimatePresence>
  )
}
