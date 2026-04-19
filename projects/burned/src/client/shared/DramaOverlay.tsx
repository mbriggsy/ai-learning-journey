import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { MOTION_DURATIONS } from '@client/shared/tokens/motion'
import { useEventFeed } from './hooks/useEventFeed'
import { usePlayerList } from './hooks/useSharedSelectors'
import { setDramaActive } from './dramaState'
import { gameStore } from './gameStore'
import type { GameEvent } from '@shared/types'
import type { BoardPlayer } from '@shared/protocol'
import styles from './DramaOverlay.module.css'

// Drama event config — only the BIG moments get overlays
interface DramaConfig {
  text: string
  className: string
  holdMs: number
}

// Returns 0..N beats to queue for a given event. burned-drawn is the only
// current two-beat sequence: non-drawers (and the board) get a "{NAME} IS…"
// suspense beat before the "BURNED" payoff; the drawer skips the buildup
// because they don't need to be told who it is.
function getDramaBeats(
  event: GameEvent,
  players: readonly BoardPlayer[],
  myPlayerId: string | null,
): readonly DramaConfig[] {
  const name = (id: string) => players.find(p => p.id === id)?.name ?? 'Unknown'

  switch (event.type) {
    case 'burned-drawn': {
      const payoff: DramaConfig = {
        text: 'BURNED',
        className: styles.burned ?? '',
        holdMs: 1400,
      }
      if (myPlayerId === event.playerId) return [payoff]
      const buildup: DramaConfig = {
        text: `${name(event.playerId).toUpperCase()} IS\u2026`,
        className: styles.burned ?? '',
        holdMs: 700,
      }
      return [buildup, payoff]
    }
    case 'extraction-played':
      return [{
        text: 'EXTRACTED',
        className: styles.extracted ?? '',
        holdMs: 1000,
      }]
    case 'player-eliminated':
      return [{
        text: `${name(event.playerId).toUpperCase()} ELIMINATED`,
        className: styles.eliminated ?? '',
        holdMs: 1200,
      }]
    case 'nope-played':
      return [{
        text: 'INTERCEPTED',
        className: styles.intercepted ?? '',
        holdMs: 800,
      }]
    case 'game-over':
      return [{
        text: `${name(event.winnerId).toUpperCase()} WINS`,
        className: styles.victory ?? '',
        holdMs: 2000,
      }]
    default:
      return []
  }
}

export function DramaOverlay() {
  const events = useEventFeed()
  const players = usePlayerList()
  const overlayRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const lastProcessedRef = useRef<string | null>(null)
  const animatingRef = useRef(false)
  const queueRef = useRef<Array<{ config: DramaConfig; id: string }>>([])

  useEffect(() => {
    if (events.length === 0) return

    // Find new events we haven't processed
    const lastIdx = lastProcessedRef.current
      ? events.findIndex(e => e.id === lastProcessedRef.current)
      : -1
    const newEvents = events.slice(lastIdx + 1)
    if (newEvents.length === 0) return

    lastProcessedRef.current = newEvents[newEvents.length - 1]!.id

    // Queue drama events. playerId is stable post-join so a plain read off
    // gameStore at queueing time is fine — no subscription needed.
    const myPlayerId = gameStore.getPlayerId()
    for (const entry of newEvents) {
      const beats = getDramaBeats(entry.event, players, myPlayerId)
      for (let i = 0; i < beats.length; i++) {
        queueRef.current.push({ config: beats[i]!, id: `${entry.id}-${i}` })
      }
    }

    processQueue()
  }, [events, players])

  function processQueue() {
    if (animatingRef.current || queueRef.current.length === 0) {
      if (!animatingRef.current && queueRef.current.length === 0) {
        setDramaActive(false)
      }
      return
    }

    const { config } = queueRef.current.shift()!
    animatingRef.current = true
    setDramaActive(true)

    const overlay = overlayRef.current
    const text = textRef.current
    if (!overlay || !text) {
      animatingRef.current = false
      return
    }

    // Set the text and class
    text.textContent = config.text
    overlay.className = `${styles.overlay ?? ''} ${config.className}`

    const tl = gsap.timeline({
      onComplete: () => {
        animatingRef.current = false
        // Reset
        gsap.set(overlay, { opacity: 0, pointerEvents: 'none' })
        gsap.set(text, { opacity: 0 })
        // Process next in queue
        processQueue()
      },
    })

    // SLAM IN: fast scale + opacity, dramatic entrance
    tl.set(overlay, { opacity: 1, pointerEvents: 'none' })
    tl.fromTo(
      text,
      { scale: 2.5, opacity: 0, y: 20 },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        // GSAP ease: 'back.out(1.4)' is overshoot-and-settle; no cubic-bezier
        // equivalent. Duration consolidated; ease string stays as literal.
        duration: MOTION_DURATIONS.base,
        ease: 'back.out(1.4)',
      },
    )
    // HOLD: dynamic — config.holdMs is runtime-derived, not a literal
    tl.to({}, { duration: config.holdMs / 1000 })
    // FADE OUT: graceful exit
    tl.to(overlay, {
      opacity: 0,
      // GSAP ease: 'power2.in' is an accelerate curve; no cubic-bezier equivalent
      duration: MOTION_DURATIONS.slow,
      ease: 'power2.in',
    })
  }

  return (
    <div ref={overlayRef} className={styles.overlay} style={{ opacity: 0 }}>
      <div ref={textRef} className={styles.text} />
    </div>
  )
}
