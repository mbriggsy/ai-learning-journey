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
        // Enter/exit crossfade so the countdown doesn't hard-pop — this is the
        // most time-critical board affordance and a hard appear reads as a bug.
        // Fast enough (quickFade = 150ms) not to delay the intercept window itself.
        <m.div
          initial={{ opacity: 0, transform: 'scale(0.98)' }}
          animate={{ opacity: 1, transform: 'scale(1)' }}
          exit={{ opacity: 0, transform: 'scale(0.98)' }}
          transition={MOTION.quickFade}
        >
          <div className={styles.container}>
            <div ref={barRef} className={styles.fill} />
          </div>
          <div className={styles.text}>INTERCEPT? {secondsLeft}s</div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
