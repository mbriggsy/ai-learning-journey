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
        // Inline child of the case-banner aside (2026-05-08): the
        // countdown reads as a live mission update inside the
        // briefing narrative, not a floating overlay below the arena.
        // Pre-2026-05-08 it sat as a dark-surface band centered below
        // the arena (E2E audit C-10 fix), but the dark chrome made it
        // read as a notification stripe rather than a board element.
        // Enter/exit fade keeps it from hard-popping during the most
        // time-critical board affordance. quickFade = 150ms, well under
        // the 10s intercept window so appearance never feels delayed.
        <m.div
          className={styles.wrapper}
          initial={{ opacity: 0, transform: 'translateY(-4px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          exit={{ opacity: 0, transform: 'translateY(-4px)' }}
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
