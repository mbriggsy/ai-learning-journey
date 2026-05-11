import { useEffect, useRef, useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useNopeWindow, usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import { useMyPlayerId } from './hooks/usePlayerSelectors'
import { haptic } from '@client/shared/haptics'
import { announce } from '@client/shared/announce'
import { MOTION } from '@client/shared/tokens/motion'
import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import styles from './IncomingSteal.module.css'

/**
 * Phone-side banner that rises on the TARGET's phone when a 3-of-a-kind
 * named steal's intercept window is open AND the stealer has named a
 * specific card. Tells Mittens: "Johnny is lifting your Dash Barlowe" so
 * she can decide whether to burn an Intercept before the window closes.
 *
 * Pre-fix, the target only learned what was named after the steal resolved
 * — by then the card had already moved and the Intercept opportunity was
 * gone. Fix lives in projection: `nopeWindow.namedSteal.namedCardType` is
 * now populated for stealer + target only (RULES-REFERENCE.md §13.8) so
 * bystanders still can't card-count from bluff attempts.
 *
 * The actual intercept button is owned by SmartActionBox — this banner
 * only supplies the CONTEXT (who, what) that makes the CTA actionable.
 */
export function IncomingSteal() {
  const nopeWindow = useNopeWindow()
  const myId = useMyPlayerId()
  const players = usePlayerList()

  const namedSteal = nopeWindow?.namedSteal
  const isTargetOfNamedSteal =
    namedSteal !== undefined &&
    namedSteal.targetPlayerId === myId &&
    namedSteal.namedCardType !== undefined

  // Buzz once when the banner first opens so Mittens feels the alarm even
  // if she's not looking at the screen. Keyed by nopeWindow.generation so
  // a chained Nope that re-opens the window against the same target buzzes
  // again — each distinct window is its own alarm beat.
  const lastBuzzGenRef = useRef<number | null>(null)
  useEffect(() => {
    if (!isTargetOfNamedSteal || !nopeWindow) return
    if (lastBuzzGenRef.current === nopeWindow.generation) return
    lastBuzzGenRef.current = nopeWindow.generation
    haptic('medium')
  }, [isTargetOfNamedSteal, nopeWindow])

  // Countdown tick. Matches SmartActionBox's 100ms cadence so the two stay
  // visually synced (same "0s" frame lands at the same instant). Freezes
  // when the host paused the window — same logic as SmartActionBox so the
  // two phone surfaces don't disagree on remaining time.
  const [secondsLeft, setSecondsLeft] = useState(0)
  useEffect(() => {
    if (!isTargetOfNamedSteal || !nopeWindow) { setSecondsLeft(0); return }
    const pausedAt = nopeWindow.pausedAtMs
    const update = () => {
      const base = pausedAt !== undefined ? pausedAt : Date.now()
      setSecondsLeft(Math.max(0, Math.ceil((nopeWindow.deadlineMs - base) / 1000)))
    }
    update()
    if (pausedAt !== undefined) return
    const timer = setInterval(update, 100)
    return () => clearInterval(timer)
  }, [isTargetOfNamedSteal, nopeWindow])

  // One-shot SR announcement per window — repeating the assertive message
  // each second would spam a screen reader. Keyed on generation so chained
  // re-opens re-announce.
  const lastAnnounceGenRef = useRef<number | null>(null)
  const stealerName =
    namedSteal !== undefined
      ? players.find(p => p.id === namedSteal.stealerId)?.name ?? 'Someone'
      : null
  const cardName =
    namedSteal?.namedCardType !== undefined
      ? CARD_DEF_BY_TYPE[namedSteal.namedCardType]?.name ?? 'a card'
      : null

  useEffect(() => {
    if (!isTargetOfNamedSteal || !nopeWindow || !stealerName || !cardName) return
    if (lastAnnounceGenRef.current === nopeWindow.generation) return
    lastAnnounceGenRef.current = nopeWindow.generation
    announce(
      `${stealerName} is attempting to lift your ${cardName}. Intercept window open.`,
      'assertive',
    )
  }, [isTargetOfNamedSteal, nopeWindow, stealerName, cardName])

  const urgent = secondsLeft <= 2

  return (
    <AnimatePresence>
      {isTargetOfNamedSteal && stealerName && cardName && (
        <m.div
          key={nopeWindow?.generation ?? 'incoming-steal'}
          className={styles.banner}
          data-urgent={urgent || undefined}
          role="status"
          aria-live="off"
          // SR speech handled via the one-shot `announce` above — aria-live
          // on the banner itself would re-announce each re-render.
          initial={{ transform: 'translateY(-80px) scale(0.96)', opacity: 0 }}
          animate={{ transform: 'translateY(0px) scale(1)', opacity: 1 }}
          exit={{ transform: 'translateY(-80px) scale(0.96)', opacity: 0 }}
          transition={MOTION.snappy}
        >
          <div className={styles.header}>
            <span className={styles.tag}>// Incoming lift</span>
            <span className={styles.timer}>{secondsLeft}s</span>
          </div>
          <div className={styles.rule} aria-hidden="true" />
          <div className={styles.body}>
            <span className={styles.stealer}>{stealerName}</span>
            <span className={styles.verb}>is lifting your</span>
            <span className={styles.card}>{cardName}</span>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
