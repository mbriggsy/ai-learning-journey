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

// Drama event config — only the BIG moments get overlays. Three variants:
//   - 'text' — big title-card word (EXTRACTED, ELIMINATED, INTERCEPTED, WINS).
//   - 'card' — the actual game card fills the screen as the reveal. Used
//     for the DRAWER's own burned-drawn moment: you drew it, the card IS
//     the drama. Single face-up reveal, no flip — you already know.
//   - 'card-flip' — physical card flip from face-down to face-up for
//     NON-DRAWERS / BOARD on burned-drawn. Party-reveal cinematic: the
//     room watches the card rotate and land, then the victim's name
//     surfaces underneath. Cinematic Arc #2.
//
/**
 * Append HOLD + dual EXIT tweens to a beat timeline. Extracted as a pure
 * helper because this exact block carried a position-parameter bug from
 * 2026-04-22 → 2026-05-01: the exit tweens were `'<'`-anchored to the
 * hold tween, which GSAP reads as "start at the START of the previous
 * tween." That collapsed every drama beat's visible duration to
 * enter+fade (~800ms) regardless of holdMs — Briggsy's "camera flash"
 * report 2026-05-01 + instrumented timing pinned the cause.
 *
 * Contract:
 *   - HOLD runs first (duration: holdSec) — keeps the beat on screen
 *   - BLUR exit runs SEQUENTIALLY after the hold (no position param)
 *   - OPACITY exit runs IN PARALLEL with the blur ('<' anchored to blur)
 *
 * Total duration: holdSec + exitDurationSec. If anyone re-introduces
 * `'<'` on the blur tween, total collapses to max(holdSec, exitDurationSec)
 * and `DramaOverlay.test.ts` catches it.
 *
 * Emil's rule: exits use power2.out (ease-out), NOT power2.in — the user
 * watches the element most closely at the START of the exit; ease-in
 * delays that initial movement and reads as sluggish.
 *
 * Blur magnitude held under 6px — blur is expensive on Safari mobile.
 * The 4px end-state stays applied across beat handoff so the NEXT beat's
 * entry can "focus in" from blurred — Emil's crossfade-mask trick.
 */
export function appendHoldAndExit(
  tl: gsap.core.Timeline,
  target: HTMLElement,
  overlay: HTMLElement,
  holdSec: number,
  exitDurationSec: number,
): void {
  tl.to({}, { duration: holdSec })
  tl.to(target, {
    filter: 'blur(4px)',
    duration: exitDurationSec,
    ease: 'power2.out',
  })
  tl.to(overlay, {
    opacity: 0,
    duration: exitDurationSec,
    ease: 'power2.out',
  }, '<')
}

// `transient: true` marks beats that should be aborted (or skipped pre-queue)
// when a `turn-started` event arrives in the same batch or while the beat
// is mid-animation. INTERCEPTED is the only transient beat today: the action
// got cancelled, the active player can immediately end turn, and a 1.4s hold
// would otherwise overlay the next player's first ~2s of their turn.
// Critical beats (BURNED, EXTRACTED, ELIMINATED, WINS) intentionally play
// out fully because they communicate state changes the room MUST register.
type DramaConfig =
  | { variant: 'text'; text: string; className: string; holdMs: number; transient?: boolean }
  | { variant: 'card'; cardType: 'burned'; className: string; holdMs: number; transient?: boolean }
  | { variant: 'card-flip'; cardType: 'burned'; victimName: string; className: string; holdMs: number; transient?: boolean }

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
      // Non-drawer / board — cinematic Arc #2. Physical card flip from
      // face-down to face-up, then victim's name surfaces underneath.
      // Card flip IS the reveal — more dramatic than a text slam.
      // Hold spans the flip animation + a settled beat for recognition:
      // ~450ms slam-in, ~300ms face-down pause, ~500ms flip, ~1400ms
      // settled hold with name caption, then fadeout.
      return [{
        variant:    'card-flip',
        cardType:   'burned',
        victimName: name(event.playerId).toUpperCase(),
        className:  styles.burned ?? '',
        holdMs:     1400,
      }]
    }
    case 'extraction-played':
      return [{
        variant:   'text',
        text:      'EXTRACTED',
        className: styles.extracted ?? '',
        // 1000 → 1600: couch-to-TV recognition latency is ~1200ms.
        // Anything under that clips the beat. E2E audit 2026-04-23 C-14.
        holdMs:    1600,
      }]
    case 'player-eliminated':
      return [{
        variant:   'text',
        text:      `${name(event.playerId).toUpperCase()} ELIMINATED`,
        className: styles.eliminated ?? '',
        // 1200 → 1500: elimination is a ceremonial beat deserving more
        // dwell than the narrator can give at 1200. E2E audit C-14.
        holdMs:    1500,
      }]
    case 'nope-played':
      return [{
        variant:   'text',
        text:      'INTERCEPTED',
        className: styles.intercepted ?? '',
        // 800 → 1400: the Intercept moment is peak tension. Previously
        // the word was already fading by the time a couch viewer could
        // focus on it. E2E audit C-14.
        holdMs:    1400,
        // Aborts on `turn-started` arrival — see DramaConfig docstring.
        // Calibration finding: action gets noped, active player ends turn
        // fast, and the 1.4s hold otherwise obscures the next player's
        // first ~2s of their turn ("INTERCEPTED toast leaks across turn
        // boundaries"). Critical beats play out; this one steps aside.
        transient: true,
      }]
    case 'game-over':
      return [{
        variant:   'text',
        text:      `${name(event.winnerId).toUpperCase()} WINS`,
        className: styles.victory ?? '',
        holdMs:    2000,
      }]
    case 'card-played': {
      // Drama-overlay rule (Briggsy 2026-05-02): one-shot moments where
      // ambient feedback is too weak for the table to register what
      // happened get a beat. Multi-step interactions (favor / combo-steal)
      // with resolution cinematics use the cinematic — no opener.
      // Solo-actor cards (go-dark, back-channel) intentionally don't get
      // a beat: Go Dark's narrative IS sneaking out of sight; an overlay
      // would fight the card's tonal intent.

      // Burn the Files — "destroy the evidence" ember beat. Phones have no
      // discard view and no shuffle animation surface, so without a drama
      // beat the play feels like the card vanished into nothing (TODO #3,
      // calibration seed 007). Transient so a fast turn handoff doesn't
      // get obscured.
      if (event.cardType === 'burn-the-files' && event.comboSize === undefined) {
        const isActor = myPlayerId === event.playerId
        return [{
          variant:   'text',
          text:      isActor ? 'FILES BURNED' : `${name(event.playerId).toUpperCase()} BURNED THE FILES`,
          className: styles.burnedfiles ?? '',
          holdMs:    1200,
          transient: true,
        }]
      }
      // Falsify Intel — same effect-shape as Burn the Files (deck mutation,
      // weak ambient feedback). The actor's NEW order is private knowledge,
      // but the deck-state change is public — same as a shuffle. Cool ink-
      // stained-dossier vibe to contrast Files Burned's hot ember.
      if (event.cardType === 'falsify-intel' && event.comboSize === undefined) {
        const isActor = myPlayerId === event.playerId
        return [{
          variant:   'text',
          text:      isActor ? 'INTEL FALSIFIED' : `${name(event.playerId).toUpperCase()} FALSIFIED INTEL`,
          className: styles.falsifyintel ?? '',
          holdMs:    1200,
          transient: true,
        }]
      }
      return []
    }
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
  const flipContainerRef = useRef<HTMLDivElement>(null)
  const flipNameRef = useRef<HTMLDivElement>(null)
  const lastProcessedRef = useRef<string | null>(null)
  const animatingRef = useRef(false)
  const queueRef = useRef<Array<{ config: DramaConfig; id: string }>>([])
  // Active GSAP timeline + transient flag for the currently-animating beat.
  // Lets a `turn-started` event abort an in-flight transient beat (today
  // only INTERCEPTED) so the next player's turn isn't obscured for ~2s.
  const currentTimelineRef = useRef<gsap.core.Timeline | null>(null)
  const currentBeatTransientRef = useRef(false)

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

    // Detect turn rotation in this batch. If present, transient beats
    // (e.g. INTERCEPTED) are obsolete — skip queueing them, and abort any
    // in-flight transient animation. Critical beats still queue + play.
    const turnRotates = newEvents.some(e => e.event.type === 'turn-started')
    if (turnRotates && animatingRef.current && currentBeatTransientRef.current) {
      abortCurrentBeat()
    }

    // Queue drama events. playerId is stable post-join so a plain read off
    // gameStore at queueing time is fine — no subscription needed.
    const myPlayerId = gameStore.getPlayerId()
    for (const entry of newEvents) {
      const beats = getDramaBeats(entry.event, players, myPlayerId)
      for (let i = 0; i < beats.length; i++) {
        const beat = beats[i]!
        // Same-batch turn rotation supersedes a fresh transient beat —
        // queueing it would just animate, then immediately get cancelled.
        if (beat.transient && turnRotates) continue
        queueRef.current.push({ config: beat, id: `${entry.id}-${i}` })
      }
    }

    processQueue()
  }, [events, players])

  // Kills the in-flight GSAP timeline, snaps the overlay to its post-anim
  // state, and advances the queue. Called when a `turn-started` event
  // arrives while a transient beat is mid-animation. Mirrors the cleanup
  // GSAP's onComplete would have done, just earlier.
  function abortCurrentBeat(): void {
    const tl = currentTimelineRef.current
    if (tl) tl.kill()
    currentTimelineRef.current = null
    currentBeatTransientRef.current = false
    animatingRef.current = false
    const overlay = overlayRef.current
    const text = textRef.current
    const flipName = flipNameRef.current
    if (overlay) {
      gsap.set(overlay, { opacity: 0, pointerEvents: 'none' })
      // a11y leak fix: opacity:0 hides visually but keeps text in the
      // accessibility tree. Flip aria-hidden + clear textContent so screen
      // readers don't re-announce stale beats across subsequent turns.
      overlay.setAttribute('aria-hidden', 'true')
    }
    if (text) {
      gsap.set(text, { opacity: 0, filter: 'blur(4px)' })
      text.textContent = ''
    }
    if (flipName) flipName.textContent = ''
    processQueue()
  }

  function processQueue() {
    if (animatingRef.current || queueRef.current.length === 0) {
      if (!animatingRef.current && queueRef.current.length === 0) {
        setDramaActive(false)
      }
      return
    }

    const { config } = queueRef.current.shift()!
    animatingRef.current = true
    currentBeatTransientRef.current = config.transient === true
    setDramaActive(true)

    const overlay = overlayRef.current
    const text = textRef.current
    const card = cardRef.current
    const flipContainer = flipContainerRef.current
    const flipName = flipNameRef.current
    if (!overlay || !text || !card || !flipContainer || !flipName) {
      animatingRef.current = false
      return
    }

    overlay.className = `${styles.overlay ?? ''} ${config.className}`
    // Beat is starting — expose to assistive tech (default state in JSX is
    // aria-hidden="true" so screen readers skip the dormant overlay).
    overlay.setAttribute('aria-hidden', 'false')

    // Pick the target element based on variant. The other slots stay
    // hidden (display: none) so layout isn't fighting for space and the
    // GSAP set/fromTo calls below don't accidentally animate a stale
    // element. Flip has an inner rotator driven separately from the
    // outer target.
    let target: HTMLDivElement
    if (config.variant === 'text') {
      text.textContent = config.text
      target = text
      gsap.set(card, { display: 'none' })
      gsap.set(flipContainer, { display: 'none' })
      gsap.set(text, { display: 'block' })
    } else if (config.variant === 'card') {
      target = card
      gsap.set(text, { display: 'none' })
      gsap.set(flipContainer, { display: 'none' })
      gsap.set(card, { display: 'flex' })
    } else {
      // card-flip — the outer slam-in targets flipContainer, the inner
      // rotator animates within. Victim name caption is inside the
      // same slot, fades in after the flip lands.
      target = flipContainer
      flipName.textContent = config.victimName
      gsap.set(text, { display: 'none' })
      gsap.set(card, { display: 'none' })
      gsap.set(flipContainer, { display: 'flex' })
    }

    const tl = gsap.timeline({
      onComplete: () => {
        animatingRef.current = false
        currentTimelineRef.current = null
        currentBeatTransientRef.current = false
        // Reset — blur stays defocused so the NEXT beat's fromTo starts from
        // a blurred state and can "focus in," bridging beat-to-beat handoff
        // into one perceived motion (Emil's crossfade-mask trick).
        gsap.set(overlay, { opacity: 0, pointerEvents: 'none' })
        gsap.set(target, { opacity: 0, filter: 'blur(4px)' })
        // a11y leak fix: opacity:0 hides visually but textContent stays
        // exposed to assistive tech. Flip aria-hidden back to true and
        // clear the text refs so screen readers don't re-announce stale
        // EXTRACTED / FILES BURNED across the next several turns.
        overlay.setAttribute('aria-hidden', 'true')
        text.textContent = ''
        flipName.textContent = ''
        // Process next in queue
        processQueue()
      },
    })
    currentTimelineRef.current = tl

    // SLAM IN: scale + opacity + refocus from blur. Starting at blur(4px)
    // bridges multi-beat sequences as one perceived morph instead of a
    // harsh blink between states. Word ('text') variants slam at 2.5x;
    // card-weighted variants ('card' + 'card-flip') use 1.6x because a
    // card has more visual weight than a word and 2.5x reads cartoon-huge.
    // Card/flip also get a longer entry (slow vs base) so viewers can
    // read header+illustration+name; 250ms scale-down landed as "flash
    // and gone" in playtest.
    const initialScale = config.variant === 'text' ? 2.5 : 1.6
    const enterDuration = config.variant === 'text'
      ? MOTION_DURATIONS.base
      : MOTION_DURATIONS.slow
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

    // CARD-FLIP: after slam-in, hold face-down briefly for suspense,
    // rotate the inner flipRotator 180° to reveal the Burned face, then
    // fade the victim's name in beneath.
    //
    // Rather than relying on CSS backface-visibility (which Chrome
    // disables whenever it optimizes a rotateY(0deg) child to a 2D
    // matrix — see DramaOverlay.module.css), we drive the face swap
    // with opacity keyed off the rotator's progress. Back fades out
    // while front fades in across a narrow edge-on window around 90°,
    // so neither paints on top of the other at the settled states.
    // Same cinematic result, works in every browser.
    if (config.variant === 'card-flip') {
      const rotator = flipContainer.querySelector(`.${styles.flipRotator}`) as HTMLElement | null
      const back = flipContainer.querySelector(`.${styles.flipBack}`) as HTMLElement | null
      const front = flipContainer.querySelector(`.${styles.flipFront}`) as HTMLElement | null
      const nameEl = flipName
      // Reset flip state — rotator returns to 0°, back visible, front
      // hidden, so consecutive Burned draws reveal correctly each time.
      gsap.set(rotator, { rotateY: 0 })
      gsap.set(back, { opacity: 1 })
      gsap.set(front, { opacity: 0 })
      gsap.set(nameEl, { opacity: 0, y: 8 })
      // Face-down pause before the flip kicks in. Short — the room has
      // already seen the slam-in, longer would feel dead. 300ms lets
      // the brain register "something's about to happen."
      tl.to({}, { duration: 0.3 })
      // Flip: 500ms with power2.inOut so the pivot accelerates through
      // the edge-on frame instead of dwelling there. Edge-on is the
      // ugliest moment; we want to pass through it, not linger.
      tl.to(rotator, {
        rotateY: 180,
        duration: 0.5,
        ease: 'power2.inOut',
      })
      // Face swap at the edge-on midpoint. The beat timeline so far:
      //   t=0       slam-in starts (duration MOTION_DURATIONS.slow)
      //   t=slow    slam-in done, face-down pause starts (duration 0.3s)
      //   t=slow+.3 face-down pause done, flip starts (duration 0.5s)
      //   t=slow+.8 flip done
      // Midpoint of flip is t=slow+.3+.25. Crossfade is 80ms wide,
      // imperceptible because the card is edge-on (near zero visible
      // area) during that frame — the eye can't see which face is
      // rendering when the card is rotated to 90°.
      const slow = MOTION_DURATIONS.slow
      const flipMidpoint = slow + 0.3 + 0.25
      tl.to(back, { opacity: 0, duration: 0.08, ease: 'none' }, flipMidpoint)
      tl.to(front, { opacity: 1, duration: 0.08, ease: 'none' }, flipMidpoint)
      // Name caption fades in as the flip settles. Slight Y lift
      // (8px→0) so it reads as "surfacing from beneath the card."
      // Positioned at flip-end so the name surfaces right as the card
      // lands face-up — not during the flip itself.
      tl.to(nameEl, {
        opacity: 1,
        y: 0,
        duration: MOTION_DURATIONS.base,
        ease: 'power2.out',
      }, slow + 0.3 + 0.5)
    }

    appendHoldAndExit(tl, target, overlay, config.holdMs / 1000, MOTION_DURATIONS.slow)
  }

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      style={{ opacity: 0 }}
      // a11y: aria-hidden defaults to true so a dormant overlay isn't read.
      // Flipped to false during active beats; flipped back on completion +
      // textContent cleared so stale text doesn't persist across turns.
      // role="status" makes the announcement automatic when text appears
      // — screen readers don't otherwise visit a fixed-position visual
      // overlay unless focus passes over it.
      aria-hidden="true"
      role="status"
    >
      <div ref={textRef} className={styles.text} />
      {/* Card slot — always mounted so the ref is stable for GSAP. Hidden
          via display:none when the active beat is a text variant. Only the
          drawer's own burned-drawn event uses the card variant today. */}
      <div ref={cardRef} className={styles.cardSlot} style={{ display: 'none' }}>
        <MinimalCard type="burned" disabled />
      </div>
      {/* Card-flip slot — non-drawer/board burned-drawn reveal (Arc #2).
          preserve-3d container wraps a rotator div with two faces:
          back (shown at rotateY 0°) and front (rotateY 180°). GSAP
          animates the rotator from 0 → 180 to flip face-down → face-up.
          Name caption sits beneath the card and fades in after the flip
          settles, telling the room WHO just burned. */}
      <div ref={flipContainerRef} className={styles.flipSlot} style={{ display: 'none' }}>
        <div className={styles.flipRotator}>
          <div className={`${styles.flipFace} ${styles.flipBack}`}>
            <MinimalCard type="burned" isFaceDown />
          </div>
          <div className={`${styles.flipFace} ${styles.flipFront}`}>
            <MinimalCard type="burned" disabled />
          </div>
        </div>
        <div ref={flipNameRef} className={styles.flipName} />
      </div>
    </div>
  )
}
