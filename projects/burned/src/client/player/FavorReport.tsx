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
import styles from './FavorReport.module.css'

type ReportKind = 'extracted' | 'surrendered'
interface Report {
  readonly id: string
  readonly kind: ReportKind
  readonly otherName: string
  readonly cardType: CardType
  readonly cardName: string
}

function reportFor(
  event: GameEvent,
  eventId: string,
  myId: string,
  players: readonly BoardPlayer[],
): Report | null {
  if (event.type !== 'favor-given') return null
  // Empty-hand / Burned-only auto-resolve emits favor-given with no cardType
  // (no card moved). Skip the report entirely — there's nothing to dramatize.
  if (!event.cardType) return null

  const cardName = CARD_DEF_BY_TYPE[event.cardType]?.name ?? 'Unknown file'

  if (event.receiverId === myId) {
    const otherName = players.find(p => p.id === event.giverId)?.name ?? 'Unknown'
    return { id: eventId, kind: 'extracted', otherName, cardType: event.cardType, cardName }
  }
  if (event.giverId === myId) {
    const otherName = players.find(p => p.id === event.receiverId)?.name ?? 'Unknown'
    return { id: eventId, kind: 'surrendered', otherName, cardType: event.cardType, cardName }
  }
  return null
}

/**
 * Coercion-report overlay fired on BOTH the ACTOR's and TARGET's phones when
 * a Call in a Favor exchange resolves. Same paper vocabulary as StealReport
 * (manila dispatch on cream paper, typewriter header, ochre asset strip,
 * rubber stamp, dog-ear flip) — different case number, different stamp text,
 * different stamp color per kind.
 *
 * - kind='extracted' (ACTOR / receiver POV): "[TARGET] has surrendered [card]
 *   under coercion." Crimson EXTRACTED stamp.
 * - kind='surrendered' (TARGET / giver POV): "[ACTOR] has extracted [card]
 *   from your bag." Amber SURRENDERED stamp.
 *
 * Closes triage #010 Gap C — favor exchange used to read as a silent database
 * transaction on both phones; this beat is the cinematic counterpart to
 * StealReport's combo-steal incident report. Persistent until ACKNOWLEDGE,
 * gated behind useDramaActive() so a concurrent BURNED → EXTRACTED plays
 * cleanly before the dispatch rises.
 */
export function FavorReport() {
  const events = useEventFeed()
  const myId = useMyPlayerId()
  const players = usePlayerList()
  const dramaActive = useDramaActive()

  const [queue, setQueue] = useState<readonly Report[]>([])
  const lastSeenIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!myId || events.length === 0) return

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
        latest.kind === 'extracted'
          ? `You squeezed ${latest.cardName} from ${latest.otherName}.`
          : `You surrendered ${latest.cardName} to ${latest.otherName}.`,
        'assertive',
      )
      haptic('medium')
    }
    lastSeenIdRef.current = newEntries[newEntries.length - 1]!.id
  }, [events, myId, players])

  const current = !dramaActive && queue.length > 0 ? queue[0]! : null

  // Mirrors StealReport's panic-tap debounce (D-05): React re-renders the
  // button under the same finger position so a double-tap on Acknowledge
  // would dismiss the next queued report before it was read. 350ms gate.
  const lastDismissAtRef = useRef<number>(0)
  const DISMISS_COOLDOWN_MS = 350
  const dismiss = useCallback(() => {
    const now = Date.now()
    if (now - lastDismissAtRef.current < DISMISS_COOLDOWN_MS) return
    lastDismissAtRef.current = now
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
          aria-labelledby={`favor-${current.id}-title`}
        >
          <div className={styles.scrim} />

          <m.div
            className={styles.paper}
            data-kind={current.kind}
            initial={{ transform: 'translateY(-120px) rotate(-9deg) scale(0.9)', opacity: 0 }}
            animate={{ transform: 'translateY(0px) rotate(-2deg) scale(1)', opacity: 1 }}
            exit={{ transform: 'translateY(60px) rotate(-4deg) scale(0.94)', opacity: 0 }}
            transition={MOTION.deliberate}
          >
            <div className={styles.header}>
              <span className={styles.headerTag}>// Coercion Report</span>
              <span className={styles.caseNum}>Case 47-D</span>
            </div>
            <div className={styles.rule} aria-hidden="true" />

            <div className={styles.body}>
              <p className={styles.label}>Operative</p>
              <p id={`favor-${current.id}-title`} className={styles.otherName}>
                {current.otherName}
              </p>

              <p className={styles.verb}>
                {current.kind === 'extracted' ? 'has surrendered' : 'has extracted'}
              </p>

              <div className={styles.cardFrame}>
                <span className={styles.cardLabel}>// Asset</span>
                <span className={styles.cardName}>{current.cardName}</span>
              </div>

              <p className={styles.verdict}>
                {current.kind === 'extracted'
                  ? 'under coercion.'
                  : 'from your bag.'}
              </p>
            </div>

            <div className={styles.stamp} aria-hidden="true">
              {current.kind === 'extracted' ? 'Extracted' : 'Surrendered'}
            </div>

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

            {queue.length > 1 && (
              <div className={styles.queuedChip} aria-hidden="true">
                +{queue.length - 1} more
              </div>
            )}

            <span className={styles.dogEar} aria-hidden="true" />
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
