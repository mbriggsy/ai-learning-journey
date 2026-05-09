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
import type { AccumulatedEvent } from '@client/shared/gameStore'
import styles from './PlayerAlert.module.css'

type AlertTone = 'urgent' | 'info'
interface Alert {
  readonly id: string
  readonly text: string
  readonly tone: AlertTone
  // For multi-step cards with a human-think gap (Future Peek, Call in a
  // Favor) the 2.8s auto-fade loses the re-attendance use case (bystander
  // grabs a beer, comes back at 45s, still wants context). When set, the
  // alert skips auto-fade and clears on (a) the listed resolve event firing
  // or (b) explicit user dismiss via the X. The next toast-producing event
  // also replaces it as normal — single-slot toast unchanged.
  readonly persistUntil?: ReadonlyArray<GameEvent['type']>
}

/** Walk backward from `feedIdx` looking for the most recent `card-played`
 *  emitted by `playerId`. Returns true if the found event's cardType matches
 *  `cardType`. Bounds the walk at the previous turn-started OR a card-played
 *  by a different player — both indicate we've left the current play's
 *  context. Used by `alertFor`'s `card-drawn` case to detect "this draw is
 *  the resolution of a Back Channel." */
function walkBackForCardPlayed(
  feed: readonly AccumulatedEvent[],
  feedIdx: number,
  playerId: string,
  cardType: string,
): boolean {
  for (let i = feedIdx - 1; i >= 0; i--) {
    const e = feed[i]!.event
    if (e.type === 'turn-started') return false
    if (e.type === 'card-played') {
      return e.playerId === playerId && e.cardType === cardType
    }
  }
  return false
}

/** Format an event into a player-facing alert if it directly affected me.
 *  Null = no alert (event wasn't about this player).
 *
 *  The `feed` + `feedIdx` parameters give the function access to the
 *  preceding accumulated events so cases that depend on context (e.g.
 *  "this nope-window-resolved cancelled the card I just played") can
 *  walk backward without re-deriving identity from each event in
 *  isolation. */
function alertFor(
  event: GameEvent,
  eventId: string,
  myId: string,
  players: readonly BoardPlayer[],
  feed: readonly AccumulatedEvent[],
  feedIdx: number,
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

    case 'card-drawn': {
      // ACTOR draw confirmation — player tapped "End turn · draw" and needs
      // to see what landed in their hand without squinting at the discard
      // fan. Burned draws intentionally skip: DramaOverlay (BURNED →
      // EXTRACTED / ELIMINATED) owns those moments.
      //
      // `cardType` is PRIVATE to the drawer (stripped by
      // `stripPrivateEventFields` for opponents + board, projection.ts:238-244).
      // ACTOR side branches on the preceding card-played: a Back Channel
      // resolution gets Archer-tone "// BACK CHANNEL — X extracted." instead
      // of the generic "You drew X." (close 05-08-2022-5p #012). Observer
      // side fires a quiet "<Name> went off-channel." resolution beat after
      // their persistent card-played toast clears at nope-window-resolved
      // (close 05-08-2022-5p #008 + #013 + #014).
      const wasBackChannel = walkBackForCardPlayed(feed, feedIdx, event.playerId, 'back-channel')
      if (event.playerId === myId && event.safe && event.cardType) {
        const name = CARD_DEF_BY_TYPE[event.cardType]?.name ?? 'a card'
        return wasBackChannel
          ? { id: eventId, text: `// BACK CHANNEL — ${name} extracted.`, tone: 'urgent' }
          : { id: eventId, text: `You drew ${name}.`, tone: 'info' }
      }
      if (event.playerId !== myId && event.safe && wasBackChannel) {
        return {
          id: eventId,
          text: `${nameOf(event.playerId)} went off-channel.`,
          tone: 'info',
        }
      }
      break
    }

    case 'favor-given':
      // Favor resolution is owned by FavorReport (cinematic incident-report
      // overlay on both phones, named card asset, persistent until ACK).
      // PlayerAlert intentionally stays silent here — a transient toast
      // alongside the dispatch would compete for attention. Triage #010
      // Gap C; the morning's two small toasts (giver "Card sent to X." and
      // receiver "Coerced a card from X.") were superseded by the hero beat.
      break

    case 'card-played': {
      // Observer-side announcement when an opponent plays a card. Triage
      // #015: seat-2 saw the nope window open and close on Seat-3's turn but
      // had no idea what was played — the phone never surfaced the cardType
      // and the only signal was the turn indicator flipping. Brief info-tone
      // toast lets observers track the action across the table.
      //
      // Four filters keep the toast from competing with richer surfaces:
      // - own play: actor's staging area already showed what they did
      // - extraction / burn-the-files / falsify-intel: DramaOverlay text
      //   beats own those moments (EXTRACTED / FILES BURNED / INTEL
      //   FALSIFIED); a redundant toast would queue under the overlay
      // - combos (comboSize set): combo-steal event carries the meaningful
      //   payload (stealerId/targetId/found); the bare card-played would
      //   over-announce a 3-of-a-kind as just "[Name] played Vera"
      // - go-dark intentionally falls THROUGH and shows the toast — the
      //   card's narrative is sneaking out of sight, so the quiet "X
      //   played Go Dark." text matches the tone better than silence
      //   (drama overlay was removed 2026-05-02 for the same reason).
      if (event.playerId === myId) break
      if (event.cardType === 'extraction') break
      if (event.cardType === 'burn-the-files') break
      if (event.cardType === 'falsify-intel') break
      if (event.comboSize !== undefined) break
      const cardName = CARD_DEF_BY_TYPE[event.cardType]?.name
      if (!cardName) break
      // Persistence by card kind:
      //
      // - call-in-a-favor: persist until `favor-given`. Has a human-think
      //   gap between play and resolution (target picks which card to
      //   surrender — can take 30-60s). A re-attending bystander still
      //   has context. X dismisses early if they're already caught up.
      //
      // - everything else (reassign, direct-order, go-dark, back-channel,
      //   intel-briefing): persist until `nope-window-resolved`. Closes
      //   the §2.2 observer-info gap (Briggsy 2026-05-08): observers need
      //   the full 10s nope window to read what was played and decide
      //   whether to Intercept. The 2.8s auto-fade misses 7s of the
      //   decision window. nope-window-resolved fires at window close
      //   (intercepted or not), at which point the action is committed
      //   and the toast has done its job. The board's DiscardFan also
      //   shows the played card during the window — the toast is the
      //   phone-side mirror.
      //
      // Falsify Intel (the other multi-step card in BURNED) is filtered
      // above — DramaOverlay's INTEL FALSIFIED beat owns that moment.
      // Pair-steal and triple-steal name-commit also have human-think
      // gaps but their observer surfaces are StealReport / comboSize
      // filter, not this toast.
      const persistUntil: ReadonlyArray<GameEvent['type']> | undefined =
        event.cardType === 'call-in-a-favor'
          ? ['favor-given']
          : ['nope-window-resolved']
      // Direct Order's narrative beat is "chosen, not defaulted" — when the
      // event carries a target the toast surfaces it so observers know
      // immediately who was directed (close §1.1 Cluster E). Self-reference
      // resolves to the receiver's name "you"; same-player target ("Dash
      // played Direct Order — targeting Dash") keeps the §13.8 self-target
      // comedy beat readable on observer phones.
      const target = event.targetId
      const targetSuffix =
        target === undefined ? ''
        : target === myId ? ' — targeting you'
        : ` — targeting ${nameOf(target)}`
      return {
        id: eventId,
        text: `${nameOf(event.playerId)} played ${cardName}${targetSuffix}.`,
        tone: 'info',
        persistUntil,
      }
    }

    case 'nope-played':
      // Silent for the bare nope — the resolution beat (`nope-window-resolved`
      // with cancelled:true) carries the meaningful "your card was blocked"
      // narration. A standalone nope toast would compete with that resolution
      // moment without adding information.
      break

    case 'nope-window-resolved': {
      // ACTOR-side narration when YOUR card was intercepted. Pre-fix the
      // staging area silently snapped back with no text, no interceptor
      // identity, and no Archer-tone narration of the block — observers
      // knew more than the actor at the moment that mattered most to the
      // actor (close 05-08-2022-5p #025 Gap 1 + #028).
      //
      // Walk backward from this resolve to:
      //   (1) the most-recent `card-played` — the card whose window just
      //       closed. If it's mine and `cancelled === true`, my card was
      //       blocked.
      //   (2) the most-recent `nope-played` BEFORE that card-played is the
      //       interceptor we credit in the toast. (We stop accepting nope-
      //       played candidates once we've passed the card-played, because
      //       any nope-played further back belongs to a prior chain.)
      if (!event.cancelled) break
      let cardPlayed: GameEvent | null = null
      let interceptorId: string | null = null
      for (let i = feedIdx - 1; i >= 0; i--) {
        const e = feed[i]!.event
        if (e.type === 'nope-played' && cardPlayed === null && interceptorId === null) {
          // Most recent nope before we've found the card-played — this is
          // the interceptor whose nope cancelled the card.
          interceptorId = e.playerId
          continue
        }
        if (e.type === 'card-played') {
          cardPlayed = e
          break
        }
        if (e.type === 'nope-window-resolved') {
          // Walked past a prior window — current window's card-played
          // would have appeared between that resolve and this one.
          break
        }
      }
      if (cardPlayed === null || cardPlayed.type !== 'card-played') break
      if (cardPlayed.playerId !== myId) break
      const cardName = CARD_DEF_BY_TYPE[cardPlayed.cardType]?.name ?? 'a card'
      const text = interceptorId !== null
        ? `${nameOf(interceptorId)} intercepted your ${cardName}.`
        : `Your ${cardName} was intercepted.`
      return { id: eventId, text, tone: 'urgent' }
    }
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
      const feedIdx = events.indexOf(entry)
      const next = alertFor(entry.event, entry.id, myId, players, events, feedIdx)
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
    if (alert.persistUntil) return // persistent alerts opt out of auto-fade
    const t = setTimeout(() => setAlert(null), 2800)
    return () => clearTimeout(t)
  }, [alert])

  // Persistent alerts clear when their resolve event fires anywhere in the
  // event feed AFTER the alert's source event. The slice keeps us from
  // misreading a resolve event that pre-dated the play (e.g. a previous
  // turn's favor-given still in the feed when this turn's call-in-a-favor
  // toast fires).
  useEffect(() => {
    if (!alert?.persistUntil) return
    const sourceIdx = events.findIndex(e => e.id === alert.id)
    if (sourceIdx === -1) return
    const since = events.slice(sourceIdx + 1)
    const resolved = since.some(e => alert.persistUntil!.includes(e.event.type))
    if (resolved) setAlert(null)
  }, [events, alert])

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
          <span className={styles.alertText}>{alert.text}</span>
          {alert.persistUntil && (
            <button
              type="button"
              className={styles.dismissBtn}
              onClick={() => setAlert(null)}
              aria-label="Dismiss alert"
            >
              ×
            </button>
          )}
        </m.div>
      )}
    </AnimatePresence>
  )
}
