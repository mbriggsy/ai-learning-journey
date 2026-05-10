import { m, AnimatePresence } from 'motion/react'
import { useNopeWindow, useStateVersion } from '@client/shared/hooks/useSharedSelectors'
import { useNopeCountdown, NOPE_RING_CIRCUMFERENCE } from '@client/shared/hooks/useNopeCountdown'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './NopeCountdownBar.module.css'

export function NopeCountdownBar() {
  const nopeWindow = useNopeWindow()
  const stateVersion = useStateVersion()
  const { ringRef, secondsLeft, isActive } = useNopeCountdown(nopeWindow, stateVersion)

  return (
    <AnimatePresence>
      {isActive && (
        // Inline child of the case-banner aside (2026-05-08): the
        // countdown reads as a live mission update inside the
        // briefing narrative, not a floating overlay below the arena.
        //
        // 2026-05-10 redesign: bar → analog ring. The case-banner is a
        // narrow column (~148-276px content width depending on viewport)
        // and a horizontal bar fought that geometry — header label +
        // timer + bar in stacked rows kept clipping at the column's
        // right edge. A dial reads as a single composed object, doesn't
        // care about column width, and matches the mid-century gauge
        // vocabulary (Pendleton briefing, dossier-era clock face).
        // Stroke-dashoffset drains the foreground arc clockwise from
        // 12 o'clock (CSS rotates the <circle> -90deg so the gap opens
        // at the top, then the gap walks clockwise as offset grows).
        <m.div
          className={styles.wrapper}
          initial={{ opacity: 0, transform: 'translateY(-4px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          exit={{ opacity: 0, transform: 'translateY(-4px)' }}
          transition={MOTION.quickFade}
        >
          <span className={styles.label}>Intercept</span>
          <div className={styles.dial}>
            <svg
              className={styles.dialSvg}
              viewBox="0 0 56 56"
              aria-hidden="true"
            >
              {/* Background ring — subtle teal at low alpha so the
                  draining foreground reads against a calm baseline. */}
              <circle
                className={styles.track}
                cx="28"
                cy="28"
                r="24"
                fill="none"
              />
              {/* Foreground arc — drains clockwise via stroke-dashoffset.
                  dasharray = circumference forces a single dash that walks
                  the perimeter as offset grows. The hook applies the
                  remainingMs-second linear transition. */}
              <circle
                ref={ringRef}
                className={styles.fill}
                cx="28"
                cy="28"
                r="24"
                fill="none"
                strokeDasharray={NOPE_RING_CIRCUMFERENCE}
                strokeDashoffset={0}
              />
            </svg>
            <span className={styles.timer}>{secondsLeft}</span>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
