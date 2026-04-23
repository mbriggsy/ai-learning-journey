import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { MOTION_DURATIONS } from '@client/shared/tokens/motion'
import { MinimalCard } from './MinimalCard'
import { useEventFeed } from './hooks/useEventFeed'
import { usePlayerList } from './hooks/useSharedSelectors'
import { setDramaActive } from './dramaState'
import { gameStore } from './gameStore'
import type { GameEvent } from '@shared/types'
import type { BoardPlayer } from '@shared/protocol'
import styles from './DramaOverlay.module.css'

// Drama event config — only the BIG moments get overlays. Two variants:
//   - 'text' — big title-card word (BURNED, EXTRACTED, etc.)
//   - 'card' — the actual game card fills the screen as the reveal. Used
//     for the drawer's own burned-drawn moment: you drew it, the card IS
//     the drama. Non-drawers/board keep the text variant (they need to
//     be told WHO, and suspense→payoff serves them better).
type DramaConfig =
  | { variant: 'text'; text: string; className: string; holdMs: number }
  | { variant: 'card'; cardType: 'burned'; className: string; holdMs: number }

// Returns 0..N beats to queue for a given event. burned-drawn splits by
// audience: the DRAWER sees the Burned card itself fill their phone
// screen (one beat — the card is the reveal, no text needed); non-drawers
// and the board get the two-beat "{NAME} IS…" suspense → "BURNED" payoff
// as before (they need to learn who got hit).
function getDramaBeats(
  event: GameEvent,
  players: readonly BoardPlayer[],
  myPlayerId: string | null,
): readonly DramaConfig[] {
  const name = (id: string) => players.find(p => p.id === id)?.name ?? 'Unknown'

  switch (event.type) {
    case 'burned-drawn': {
      if (myPlayerId === event.playerId) {
        // Drawer-only card reveal. 2400ms hold so the drawer gets enough
        // time to actually read and absorb the card — 1600ms (first cut)
        // was "flash and gone" per playtest. Card has more to read than
        // a single word (header, illustration, name, description), and
        // this is the emotional peak of the draw moment.
        return [{
          variant:   'card',
          cardType:  'burned',
          className: styles.burned ?? '',
          holdMs:    2400,
        }]
      }
      // Non-drawer single beat. Previously split into "{NAME} IS…" buildup
      // (700ms) + "BURNED" payoff (1400ms); playtest said three sequential
      // overlays (buildup, payoff, extraction) fragmented the moment. The
      // combined form matches the "{NAME} ELIMINATED" vocabulary pattern
      // and hands off cleanly to the extraction-played beat that follows.
      return [{
        variant:   'text',
        text:      `${name(event.playerId).toUpperCase()} BURNED`,
        className: styles.burned ?? '',
        holdMs:    1800,
      }]
    }
    case 'extraction-played':
      return [{
        variant:   'text',
        text:      'EXTRACTED',
        className: styles.extracted ?? '',
        holdMs:    1000,
      }]
    case 'player-eliminated':
      return [{
        variant:   'text',
        text:      `${name(event.playerId).toUpperCase()} ELIMINATED`,
        className: styles.eliminated ?? '',
        holdMs:    1200,
      }]
    case 'nope-played':
      return [{
        variant:   'text',
        text:      'INTERCEPTED',
        className: styles.intercepted ?? '',
        holdMs:    800,
      }]
    case 'game-over':
      return [{
        variant:   'text',
        text:      `${name(event.winnerId).toUpperCase()} WINS`,
        className: styles.victory ?? '',
        holdMs:    2000,
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
  const cardRef = useRef<HTMLDivElement>(null)
  const lastProcessedRef = useRef<string | null>(null)
  const animatingRef = useRef(false)
  const queueRef = useRef<Array<{ config: DramaConfig; id: string }>>([])

  useEffect(() => {
    if (events.length === 0) return

    // First-mount: seed lastProcessed to the current tail so historical
    // events (from a cumulative server buffer on page load or late join)
    // DON'T re-fire every drama beat in sequence. Without this, reloading
    // mid-game would replay every BURNED / EXTRACTED / WINS from the
    // session. Matches the pattern in PlayerAlert / StealReport.
    if (lastProcessedRef.current === null) {
      lastProcessedRef.current = events[events.length - 1]!.id
      return
    }

    // Find new events we haven't processed
    const lastIdx = events.findIndex(e => e.id === lastProcessedRef.current)
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
    const card = cardRef.current
    if (!overlay || !text || !card) {
      animatingRef.current = false
      return
    }

    overlay.className = `${styles.overlay ?? ''} ${config.className}`

    // Pick the target element based on variant. The other stays hidden
    // (display: none) so layout isn't fighting for space and the GSAP
    // set/fromTo calls below don't accidentally animate a stale element.
    let target: HTMLDivElement
    if (config.variant === 'text') {
      text.textContent = config.text
      target = text
      gsap.set(card, { display: 'none' })
      gsap.set(text, { display: 'block' })
    } else {
      target = card
      gsap.set(text, { display: 'none' })
      gsap.set(card, { display: 'flex' })
    }

    const tl = gsap.timeline({
      onComplete: () => {
        animatingRef.current = false
        // Reset — blur stays defocused so the NEXT beat's fromTo starts from
        // a blurred state and can "focus in," bridging beat-to-beat handoff
        // into one perceived motion (Emil's crossfade-mask trick).
        gsap.set(overlay, { opacity: 0, pointerEvents: 'none' })
        gsap.set(target, { opacity: 0, filter: 'blur(4px)' })
        // Process next in queue
        processQueue()
      },
    })

    // SLAM IN: scale + opacity + refocus from blur. Starting at blur(4px)
    // bridges multi-beat sequences as one perceived morph instead of a
    // harsh blink between states. Card variant uses a less aggressive
    // initial scale (1.6 vs 2.5) because a card has more visual weight
    // than a word — 2.5x-sized card is cartoon-huge, 1.6 reads as
    // "slammed onto the table" without overshoot. Card also gets a
    // longer entry (slow vs base) because the drawer needs time to
    // read header+illustration+name; a 250ms scale-down landed as
    // "flash and gone" in playtest.
    const initialScale = config.variant === 'card' ? 1.6 : 2.5
    const enterDuration = config.variant === 'card'
      ? MOTION_DURATIONS.slow
      : MOTION_DURATIONS.base
    tl.set(overlay, { opacity: 1, pointerEvents: 'none' })
    tl.fromTo(
      target,
      { scale: initialScale, opacity: 0, y: 20, filter: 'blur(4px)' },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        // GSAP ease: 'back.out(1.1)' is subtle overshoot — Archer-deadpan
        // crisp arrival without cartoon bounce.
        duration: enterDuration,
        ease: 'back.out(1.1)',
      },
    )
    // HOLD: dynamic — config.holdMs is runtime-derived, not a literal
    tl.to({}, { duration: config.holdMs / 1000 })
    // FADE OUT: graceful exit with blur ramp. The blur defocus during fadeout
    // is what the NEXT beat's entry leverages to read as a continuous morph.
    // Keep under 6px — blur is expensive on Safari mobile.
    // Fade-out uses power2.out (ease-out), NOT power2.in. Emil's rule:
    // exits still use ease-out because the user is watching the element
    // most closely at the START of the exit — ease-in delays that initial
    // movement and reads as sluggish. power2.in was here in the first cut;
    // swapped 2026-04-23 per full-repo audit.
    tl.to(target, {
      filter: 'blur(4px)',
      duration: MOTION_DURATIONS.slow,
      ease: 'power2.out',
    }, '<')  // start in parallel with the overlay fade below
    tl.to(overlay, {
      opacity: 0,
      duration: MOTION_DURATIONS.slow,
      ease: 'power2.out',
    }, '<')
  }

  return (
    <div ref={overlayRef} className={styles.overlay} style={{ opacity: 0 }}>
      <div ref={textRef} className={styles.text} />
      {/* Card slot — always mounted so the ref is stable for GSAP. Hidden
          via display:none when the active beat is a text variant. Only the
          drawer's own burned-drawn event uses the card variant today. */}
      <div ref={cardRef} className={styles.cardSlot} style={{ display: 'none' }}>
        <MinimalCard type="burned" disabled />
      </div>
    </div>
  )
}
