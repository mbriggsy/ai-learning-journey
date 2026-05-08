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
  readonly kind: 'lifted' | 'whiffed-guess' | 'dry-bag'
  readonly viewerRole: 'target' | 'stealer'
  // The OTHER party's name — target's view shows the stealer; stealer's view
  // shows the target. Rendered through `.stealerName` (legacy class — kept
  // stable to avoid a CSS module churn for what is purely a copy split).
  readonly otherName: string
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

  const isTarget = event.targetId === myId
  const isStealer = event.stealerId === myId
  if (!isTarget && !isStealer) return null

  const viewerRole: 'target' | 'stealer' = isStealer ? 'stealer' : 'target'
  const otherId = isStealer ? event.targetId : event.stealerId
  const otherName = players.find(p => p.id === otherId)?.name ?? 'Unknown'
  const cardName = event.cardType ? CARD_DEF_BY_TYPE[event.cardType]?.name ?? null : null

  if (event.found) {
    return { id: eventId, kind: 'lifted', viewerRole, otherName, cardType: event.cardType ?? null, cardName }
  }

  // Whiff branches:
  //  - cardType present → named-triple miss (target was named; engine sets cardType).
  //    Both sides care: target learns what was guessed, stealer learns the guess missed.
  //  - cardType absent → pair-against-empty-bag random steal.
  //    Stealer needs the dispatch; target already knew their bag was empty
  //    (their hand badge is 0), so we suppress on target side.
  if (event.cardType) {
    return { id: eventId, kind: 'whiffed-guess', viewerRole, otherName, cardType: event.cardType, cardName }
  }
  if (isStealer) {
    return { id: eventId, kind: 'dry-bag', viewerRole, otherName, cardType: null, cardName: null }
  }
  return null
}

// Copy split by (viewerRole, kind). Subject-verb-asset-verdict structure
// preserved across all variants so the paper layout reads identical.
function copyFor(report: Report): {
  readonly verb: string
  readonly assetName: string
  readonly verdict: string
  readonly stamp: string
} {
  const { kind, viewerRole, cardName } = report
  if (viewerRole === 'target') {
    if (kind === 'lifted') {
      return { verb: 'has lifted', assetName: cardName ?? 'Unknown file', verdict: 'from your burn bag.', stamp: 'Intercepted' }
    }
    return { verb: 'attempted to lift', assetName: cardName ?? 'Unknown file', verdict: '— none in your bag.', stamp: 'Misfire' }
  }
  if (kind === 'lifted') {
    return { verb: 'surrendered', assetName: cardName ?? 'Unknown file', verdict: 'to your burn bag.', stamp: 'Lifted' }
  }
  if (kind === 'whiffed-guess') {
    return { verb: 'had no', assetName: cardName ?? 'Unknown file', verdict: 'in their burn bag.', stamp: 'Misfire' }
  }
  return { verb: 'carried', assetName: 'No assets', verdict: 'in their burn bag.', stamp: 'Misfire' }
}

function announcementFor(report: Report): string {
  const { viewerRole, kind, otherName, cardName } = report
  if (viewerRole === 'target') {
    if (kind === 'lifted') return `${otherName} stole your ${cardName ?? 'card'}.`
    return `${otherName} guessed ${cardName} — nothing in your bag.`
  }
  if (kind === 'lifted') return `You lifted ${cardName ?? 'a card'} from ${otherName}.`
  if (kind === 'whiffed-guess') return `${otherName} did not have ${cardName}.`
  return `${otherName}'s bag was empty — nothing lifted.`
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
      announce(announcementFor(latest), 'assertive')
      haptic('medium')
    }
    lastSeenIdRef.current = newEntries[newEntries.length - 1]!.id
  }, [events, myId, players])

  const current = !dramaActive && queue.length > 0 ? queue[0]! : null
  const currentCopy = current ? copyFor(current) : null

  // Debounce acknowledge taps. Without this, panic-tapping Acknowledge
  // on a queued report (e.g. user returned to phone, saw "+2 more"
  // chip, reflex-tapped three times) dismissed 3 reports in ~200ms,
  // losing intel — the player never actually read reports 2 or 3.
  // React re-renders the button beneath the same finger position so
  // every tap lands on the next queued report. 350ms gate forces a
  // brief reset per report. E2E audit 2026-04-23 D-05.
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
      {current && currentCopy && (
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
            data-viewer-role={current.viewerRole}
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
                {current.otherName}
              </p>

              <p className={styles.verb}>{currentCopy.verb}</p>

              <div className={styles.cardFrame}>
                <span className={styles.cardLabel}>// Asset</span>
                <span className={styles.cardName}>{currentCopy.assetName}</span>
              </div>

              <p className={styles.verdict}>{currentCopy.verdict}</p>
            </div>

            {/* Red rubber stamp — thunks in after the paper arrives */}
            <div className={styles.stamp} aria-hidden="true">
              {currentCopy.stamp}
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
