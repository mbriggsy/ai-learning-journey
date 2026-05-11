import { m, AnimatePresence } from 'motion/react'
import { useNopeWindow, useStateVersion } from '@client/shared/hooks/useSharedSelectors'
import { useNopeCountdown, NOPE_RING_CIRCUMFERENCE } from '@client/shared/hooks/useNopeCountdown'
import { MOTION } from '@client/shared/tokens/motion'
import { send } from '@client/connection'
import styles from './NopeCountdownBar.module.css'

export function NopeCountdownBar() {
  const nopeWindow = useNopeWindow()
  const stateVersion = useStateVersion()
  const { ringRef, secondsLeft, isActive, isPaused } = useNopeCountdown(nopeWindow, stateVersion)

  function handleTogglePause() {
    if (!nopeWindow) return
    send({
      type: 'host-action',
      payload: {
        type: isPaused ? 'resume-nope-window' : 'pause-nope-window',
        windowGeneration: nopeWindow.generation,
      },
    })
  }

  return (
    <AnimatePresence>
      {isActive && (
        // Inline child of the case-banner aside (2026-05-08, moved below
        // the briefer footer 2026-05-10): the countdown reads as a live
        // mission update inside the briefing narrative, not a floating
        // overlay below the arena.
        //
        // 2026-05-10 redesign: bar → analog ring + pause control. A dial
        // reads as a single composed object, doesn't fight the narrow
        // case-banner column, and matches the mid-century gauge vocabulary
        // (Pendleton briefing, dossier-era clock face). The pause button
        // lets the table call a hold so a player can weigh the intercept
        // decision without the timer running out — physical-play parity.
        // Stroke-dashoffset drains the foreground arc clockwise from 12
        // o'clock (CSS rotates the <circle> -90deg so the gap opens at
        // the top, then the gap walks clockwise as offset grows).
        <m.div
          className={styles.wrapper}
          data-paused={isPaused || undefined}
          initial={{ opacity: 0, transform: 'translateY(-4px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          exit={{ opacity: 0, transform: 'translateY(-4px)' }}
          transition={MOTION.quickFade}
        >
          <span className={styles.label}>{isPaused ? 'Paused' : 'Intercept'}</span>
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
                  remainingMs-second linear transition (and freezes it on
                  pause). */}
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
          <button
            type="button"
            className={styles.pauseButton}
            onClick={handleTogglePause}
            aria-label={isPaused ? 'Resume intercept window' : 'Pause intercept window'}
          >
            {isPaused ? 'Resume' : 'Hold'}
          </button>
        </m.div>
      )}
    </AnimatePresence>
  )
}
