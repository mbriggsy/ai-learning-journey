import { useEffect, useState, useCallback, useRef } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useEventFeed } from '@client/shared/hooks/useEventFeed'
import { usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import { useMyPlayerId } from './hooks/usePlayerSelectors'
import { useDramaActive } from '@client/shared/dramaState'
import { haptic } from '@client/shared/haptics'
import { announce } from '@client/shared/announce'
import { MOTION } from '@client/shared/tokens/motion'
import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import type { BoardPlayer } from '@shared/protocol'
import type { GameEvent, CardType } from '@shared/types'
import styles from './StealReport.module.css'

interface Report {
  readonly id: string
  readonly kind: 'lifted' | 'whiffed-guess'
  readonly stealerName: string
  readonly cardType: CardType | null
  readonly cardName: string | null
}

function reportFor(
  event: GameEvent,
  eventId: string,
  myId: string,
  players: readonly BoardPlayer[],
): Report | null {
  if (event.type !== 'combo-steal') return null
  if (event.targetId !== myId) return null

  const stealerName = players.find(p => p.id === event.stealerId)?.name ?? 'Unknown'
  const cardName = event.cardType ? CARD_DEF_BY_TYPE[event.cardType]?.name ?? null : null

  if (event.found) {
    return { id: eventId, kind: 'lifted', stealerName, cardType: event.cardType ?? null, cardName }
  }

  // Named guess that missed — Johnny should know WHAT was guessed. Intel.
  // Random-pair whiff with no cardType = your hand was empty; Johnny already
  // knew that; no dispatch generated.
  if (event.cardType) {
    return { id: eventId, kind: 'whiffed-guess', stealerName, cardType: event.cardType, cardName }
  }
  return null
}

/**
 * Classified-dispatch overlay fired on the VICTIM's phone when a combo
 * steal resolves against them (hit) or a named triple-steal misses against
 * them (intel leak). Does NOT auto-dismiss — explicit ACKNOWLEDGE required.
 *
 * Designed for the "Johnny stepped away for beers" case: when he returns,
 * the dispatch is waiting. Multiple reports queue so a run of steals while
 * he was away all surface in order on return.
 *
 * Gated behind useDramaActive() so a concurrent BURNED → EXTRACTED sequence
 * plays cleanly before the dispatch rises.
 */
export function StealReport() {
  const events = useEventFeed()
  const myId = useMyPlayerId()
  const players = usePlayerList()
  const dramaActive = useDramaActive()

  const [queue, setQueue] = useState<readonly Report[]>([])
  const lastSeenIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!myId || events.length === 0) return

    // Seed on first pass so pre-mount events don't replay as dispatches.
    if (lastSeenIdRef.current === null) {
      lastSeenIdRef.current = events[events.length - 1]!.id
      return
    }

    const lastSeenIdx = events.findIndex(e => e.id === lastSeenIdRef.current)
    const newEntries = lastSeenIdx === -1 ? events : events.slice(lastSeenIdx + 1)
    if (newEntries.length === 0) return

    const additions: Report[] = []
    for (const entry of newEntries) {
      const r = reportFor(entry.event, entry.id, myId, players)
      if (r) additions.push(r)
    }

    if (additions.length > 0) {
      setQueue(q => [...q, ...additions])
      const latest = additions[additions.length - 1]!
      announce(
        latest.kind === 'lifted'
          ? `${latest.stealerName} stole your ${latest.cardName ?? 'card'}.`
          : `${latest.stealerName} guessed ${latest.cardName} — nothing in your bag.`,
        'assertive',
      )
      haptic('medium')
    }
    lastSeenIdRef.current = newEntries[newEntries.length - 1]!.id
  }, [events, myId, players])

  const current = !dramaActive && queue.length > 0 ? queue[0]! : null

  const dismiss = useCallback(() => {
    setQueue(q => q.slice(1))
    haptic('light')
  }, [])

  return (
    <AnimatePresence>
      {current && (
        <m.div
          key={current.id}
          className={styles.shell}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`steal-${current.id}-title`}
        >
          <div className={styles.scrim} />

          <m.div
            className={styles.paper}
            data-kind={current.kind}
            // Transform string — the incident-report paper slamming in is a
            // high-drama beat that must not stutter. Multiple axes (y, rotate,
            // scale) on shorthand is exactly where shorthand drops frames
            // hardest per Emil's guide.
            initial={{ transform: 'translateY(-120px) rotate(-9deg) scale(0.9)', opacity: 0 }}
            animate={{ transform: 'translateY(0px) rotate(-2deg) scale(1)', opacity: 1 }}
            exit={{ transform: 'translateY(60px) rotate(-4deg) scale(0.94)', opacity: 0 }}
            transition={MOTION.deliberate}
          >
            {/* Header bar — typewriter mono */}
            <div className={styles.header}>
              <span className={styles.headerTag}>// Incident Report</span>
              <span className={styles.caseNum}>Case 47-B</span>
            </div>
            <div className={styles.rule} aria-hidden="true" />

            {/* Body */}
            <div className={styles.body}>
              <p className={styles.label}>Operative</p>
              <p id={`steal-${current.id}-title`} className={styles.stealerName}>
                {current.stealerName}
              </p>

              <p className={styles.verb}>
                {current.kind === 'lifted' ? 'has lifted' : 'attempted to lift'}
              </p>

              <div className={styles.cardFrame}>
                <span className={styles.cardLabel}>// Asset</span>
                <span className={styles.cardName}>
                  {current.cardName ?? 'Unknown file'}
                </span>
              </div>

              <p className={styles.verdict}>
                {current.kind === 'lifted'
                  ? 'from your burn bag.'
                  : '— none in your bag.'}
              </p>
            </div>

            {/* Red rubber stamp — thunks in after the paper arrives */}
            <div className={styles.stamp} aria-hidden="true">
              {current.kind === 'lifted' ? 'Intercepted' : 'Misfire'}
            </div>

            {/* Footer — eyes-only + carriage-return dismiss */}
            <div className={styles.footerRule} aria-hidden="true" />
            <div className={styles.footer}>
              <span className={styles.footerText}>// Eyes Only · M.</span>
              <button
                type="button"
                className={styles.ackBtn}
                onClick={dismiss}
                autoFocus
              >
                Acknowledge
              </button>
            </div>

            {/* Queued-count chip — if more reports waiting, hint at them */}
            {queue.length > 1 && (
              <div className={styles.queuedChip} aria-hidden="true">
                +{queue.length - 1} more
              </div>
            )}

            {/* Dog-ear paper flip — matches blotter vocabulary */}
            <span className={styles.dogEar} aria-hidden="true" />
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
