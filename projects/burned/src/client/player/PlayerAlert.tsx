import { useEffect, useRef, useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useEventFeed } from '@client/shared/hooks/useEventFeed'
import { usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import { useMyPlayerId } from './hooks/usePlayerSelectors'
import { haptic } from '@client/shared/haptics'
import { announce } from '@client/shared/announce'
import { MOTION } from '@client/shared/tokens/motion'
import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import type { BoardPlayer } from '@shared/protocol'
import type { GameEvent } from '@shared/types'
import styles from './PlayerAlert.module.css'

type AlertTone = 'urgent' | 'info'
interface Alert {
  readonly id: string
  readonly text: string
  readonly tone: AlertTone
}

/** Format an event into a player-facing alert if it directly affected me.
 *  Null = no alert (event wasn't about this player). */
function alertFor(
  event: GameEvent,
  eventId: string,
  myId: string,
  players: readonly BoardPlayer[],
): Alert | null {
  const nameOf = (id: string): string =>
    players.find(p => p.id === id)?.name ?? 'Someone'

  switch (event.type) {
    case 'combo-steal': {
      // Target-side notification is handled by StealReport (persistent
      // classified-dispatch overlay) — the "Johnny left for beers" case
      // can't be served by a disappearing toast. This branch only surfaces
      // stealer-side alerts: you just played a combo, you're at the phone.
      const cardName = event.cardType
        ? CARD_DEF_BY_TYPE[event.cardType]?.name ?? 'a card'
        : null

      if (event.stealerId === myId) {
        if (event.found) {
          return {
            id: eventId,
            text: `You lifted ${cardName ?? 'a card'} from ${nameOf(event.targetId)}.`,
            tone: 'urgent',
          }
        }
        if (cardName) {
          return {
            id: eventId,
            text: `Whiffed — ${nameOf(event.targetId)} had no ${cardName}.`,
            tone: 'info',
          }
        }
        return {
          id: eventId,
          text: `${nameOf(event.targetId)} had nothing to take.`,
          tone: 'info',
        }
      }
      break
    }

    case 'card-drawn':
      // Confirmation toast for end-of-turn draw — player tapped "End turn ·
      // draw" and needs to see what landed in their hand without squinting
      // at the discard fan. Burned draws intentionally skip this: the drama
      // overlay (BURNED → EXTRACTED / ELIMINATED) already owns that moment.
      if (event.playerId === myId && event.safe) {
        const name = CARD_DEF_BY_TYPE[event.cardType]?.name ?? 'a card'
        return {
          id: eventId,
          text: `You drew ${name}.`,
          tone: 'info',
        }
      }
      break

    case 'favor-given':
      // I just handed over a card (after choosing it on the FavorResponse sheet).
      // Soft acknowledgement so the player has visible feedback that their
      // pick landed.
      if (event.giverId === myId) {
        return {
          id: eventId,
          text: `Card sent to ${nameOf(event.receiverId)}.`,
          tone: 'info',
        }
      }
      break

    case 'nope-played':
      // Someone intercepted. Noisy if they intercept their own card's chain,
      // but only interesting to the originator of the action. Skipped for now
      // — the StagingArea's optimistic UI already snaps back when an action
      // is rejected server-side.
      break
  }

  return null
}

/**
 * Top-edge toast that fires when something happens TO the player (card
 * stolen, tribute paid, etc.). Board-side COMMS feed already announces
 * these events publicly — this gives the affected phone a dedicated,
 * tactile heads-up since the player isn't looking at the TV.
 */
export function PlayerAlert() {
  const events = useEventFeed()
  const myId = useMyPlayerId()
  const players = usePlayerList()
  const [alert, setAlert] = useState<Alert | null>(null)
  // Ref tracks the latest event ID we've already considered — prevents a
  // stale alert from re-firing if the feed array identity changes without
  // new entries.
  const lastSeenIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!myId || events.length === 0) return

    // On the very first pass, seed lastSeenId to the current tail so we
    // don't fire alerts for events accumulated before the component mounted.
    if (lastSeenIdRef.current === null) {
      lastSeenIdRef.current = events[events.length - 1]!.id
      return
    }

    // Walk newest-first, stop at the last event we already processed.
    const lastSeenIdx = events.findIndex(e => e.id === lastSeenIdRef.current)
    const newEntries = lastSeenIdx === -1 ? events : events.slice(lastSeenIdx + 1)
    if (newEntries.length === 0) return

    // Find the newest entry that produces an alert for me. Walk from the
    // tail so the latest wins if multiple fire in the same batch.
    for (let i = newEntries.length - 1; i >= 0; i--) {
      const entry = newEntries[i]!
      const next = alertFor(entry.event, entry.id, myId, players)
      if (!next) continue
      setAlert(next)
      announce(next.text, next.tone === 'urgent' ? 'assertive' : 'polite')
      haptic(next.tone === 'urgent' ? 'medium' : 'light')
      break
    }
    lastSeenIdRef.current = newEntries[newEntries.length - 1]!.id
  }, [events, myId, players])

  useEffect(() => {
    if (!alert) return
    const t = setTimeout(() => setAlert(null), 2800)
    return () => clearTimeout(t)
  }, [alert])

  return (
    <AnimatePresence>
      {alert && (
        <m.div
          key={alert.id}
          className={styles.alert}
          data-tone={alert.tone}
          // Full transform strings (not shorthand y/scale) — Framer's shorthand
          // x/y/scale props run on the main thread via rAF and drop frames under
          // load. Transform strings go through the compositor. See Emil's guide.
          initial={{ transform: 'translateY(-80px) scale(0.96)', opacity: 0 }}
          animate={{ transform: 'translateY(0px) scale(1)', opacity: 1 }}
          exit={{ transform: 'translateY(-80px) scale(0.96)', opacity: 0 }}
          transition={MOTION.snappy}
        >
          {alert.text}
        </m.div>
      )}
    </AnimatePresence>
  )
}
