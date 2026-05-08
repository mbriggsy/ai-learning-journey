import { m, AnimatePresence } from 'motion/react'
import { useNopeWindow, useStateVersion } from '@client/shared/hooks/useSharedSelectors'
import { useNopeCountdown } from '@client/shared/hooks/useNopeCountdown'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './NopeCountdownBar.module.css'

export function NopeCountdownBar() {
  const nopeWindow = useNopeWindow()
  const stateVersion = useStateVersion()
  const { barRef, secondsLeft, isActive } = useNopeCountdown(nopeWindow, stateVersion)

  return (
    <AnimatePresence>
      {isActive && (
        // Anchored below the arena (where the played card sits) so the
        // countdown reads as a transmission window for the moment in play —
        // not a system-style banner floating at the top of the viewport.
        // Enter/exit crossfade keeps it from hard-popping during the most
        // time-critical board affordance. quickFade = 150ms, well under the
        // 5s intercept window so the appearance never feels delayed.
        <m.div
          className={styles.wrapper}
          initial={{ opacity: 0, transform: 'translate(-50%, -6px) scale(0.97)' }}
          animate={{ opacity: 1, transform: 'translate(-50%, 0px) scale(1)' }}
          exit={{ opacity: 0, transform: 'translate(-50%, -6px) scale(0.97)' }}
          transition={MOTION.quickFade}
        >
          <div className={styles.headerRow}>
            <span className={styles.label}>Intercept Window</span>
            <span className={styles.timer}>{secondsLeft}s</span>
          </div>
          <div className={styles.container}>
            <div ref={barRef} className={styles.fill} />
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
