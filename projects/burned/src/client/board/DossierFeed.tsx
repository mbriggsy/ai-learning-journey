import { useEffect, useRef, useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useEventFeed } from '@client/shared/hooks/useEventFeed'
import { formatEvent } from './events'
import { announce } from '@client/shared/announce'
import { MOTION, MOTION_DURATIONS, MOTION_EASINGS } from '@client/shared/tokens/motion'
import type { BoardPlayer } from '@shared/protocol'
import styles from './DossierFeed.module.css'

const MAX_VISIBLE_STRIPS = 8

// Radio-channel ambient chatter — rotates slowly whether events are landing
// or not, so the dossier always reads as a LIVE intercept feed rather than
// a closed folder. Pairs with the blinking cursor on the ticker to sell
// "channel open, transmitter warm" even during dead air.
const IDLE_LINES = [
  'CHANNEL OPEN',
  'STANDING BY',
  'AWAITING TRANSMISSION',
  'INTERCEPT CLEAR',
] as const

function ChannelTicker() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i => (i + 1) % IDLE_LINES.length)
    }, 2500)
    return () => clearInterval(id)
  }, [])
  return (
    <div className={styles.ticker} aria-hidden="true">
      <AnimatePresence mode="wait">
        <m.span
          key={IDLE_LINES[idx]}
          className={styles.tickerLine}
          initial={{ opacity: 0, transform: 'translateY(3px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          exit={{ opacity: 0, transform: 'translateY(-3px)' }}
          transition={MOTION.quickFade}
        >
          // {IDLE_LINES[idx]}
        </m.span>
      </AnimatePresence>
      <span className={styles.tickerCursor}>_</span>
    </div>
  )
}

interface Props {
  players: readonly BoardPlayer[]
}

/**
 * COMMS feed rendered as a manila dossier folder sitting on the desk.
 *
 * Idle: classified-stamped cover. First event hinges the cover open
 * (rotateX around the top-edge spine) and strips slide in from the left
 * with a subtle scale overshoot ("new intel being slid across the desk").
 *
 * Owns the event stream + screen-reader announcements for the COMMS zone.
 * The parent (BlotterContent) passes the player roster for name resolution;
 * everything else — filtering, a11y, stacking — lives here.
 */
export function DossierFeed({ players }: Props) {
  const events = useEventFeed()
  const lastAnnouncedIdRef = useRef<string | null>(null)

  // formatEvent returns null for event types that are silent in the feed.
  const rendered = events
    .map(entry => ({ entry, text: formatEvent(entry.event, players, entry.id) }))
    .filter((r): r is { entry: typeof events[number]; text: string } => r.text != null)

  // Live-region announcements — mirror the AnnouncementFeed logic that used
  // to live in BlotterContent. Only announce events we haven't announced yet
  // across renders (lastAnnouncedIdRef tracks the high-water mark).
  useEffect(() => {
    if (events.length === 0) return
    const lastIdx = lastAnnouncedIdRef.current
      ? events.findIndex(e => e.id === lastAnnouncedIdRef.current)
      : -1
    const newEvents = events.slice(lastIdx + 1)
    if (newEvents.length === 0) return
    lastAnnouncedIdRef.current = newEvents[newEvents.length - 1]!.id
    for (const entry of newEvents) {
      const text = formatEvent(entry.event, players, entry.id)
      if (!text) continue
      const isUrgent = entry.event.type === 'burned-drawn' ||
        entry.event.type === 'player-eliminated' || entry.event.type === 'game-over'
      announce(text, isUrgent ? 'assertive' : 'polite')
    }
  }, [events, players])

  // Newest-first — .slice(-N) takes the tail (oldest-to-newest), .reverse()
  // flips so index 0 = newest = top of stack.
  const visibleStrips = rendered.slice(-MAX_VISIBLE_STRIPS).reverse()
  const hasEvents = rendered.length > 0

  return (
    <div className={styles.folder} aria-hidden="true">
      <div className={styles.tab}>Comms · Intercepted</div>

      <AnimatePresence>
        {!hasEvents && (
          <m.div
            key="cover"
            className={styles.cover}
            initial={{ opacity: 1, transform: 'rotateX(0deg)' }}
            exit={{ opacity: 0, transform: 'rotateX(-95deg)' }}
            transition={{
              duration: MOTION_DURATIONS.slow,
              ease: MOTION_EASINGS.base,
            }}
          >
            <span className={styles.coverHeader}>Comms · Intercepted</span>
            <div className={styles.coverStamp} />
            <span className={styles.coverCaseId}>Case #47-B</span>
            <span className={styles.coverFooter}>
              Eyes Only · Pendleton Agency · Declassify 50YR
            </span>
          </m.div>
        )}
      </AnimatePresence>

      <div className={styles.strips}>
        <AnimatePresence mode="popLayout">
          {visibleStrips.map(({ entry, text }, index) => {
            // Per-strip resting style — computed not hardcoded, so bumping
            // MAX_VISIBLE_STRIPS doesn't require adding new [data-index="N"]
            // CSS rules. Alternating drift direction (index even = left drift,
            // odd = right drift) gives the stack a natural tossed-on-desk
            // variance instead of a tidy single-axis spiral.
            const dir = index % 2 === 0 ? 1 : -1
            const restingStyle = {
              '--strip-tilt': `${index * 1.2 * -dir}deg`,
              '--strip-offset-x': `${index * 2 * dir}px`,
              '--strip-offset-y': `${index * 7}px`,
              '--strip-opacity': String(Math.max(0.18, 1 - index * 0.12)),
              zIndex: MAX_VISIBLE_STRIPS - index,
            } as React.CSSProperties
            return (
            <m.div
              key={entry.id}
              className={styles.strip}
              data-index={index}
              style={restingStyle}
              // Enter: slid-across-the-desk reveal from the left (clip-path
              // inset eats from the right back to 0) + scale overshoot. Uses
              // transform STRING (not shorthand x/scale) for hardware-accel
              // per the hot-path frame-drop rule — events can land during WS
              // traffic while the main thread is busy.
              initial={{
                opacity: 0,
                clipPath: 'inset(0 100% 0 0)',
                transform: 'scale(0.95)',
              }}
              animate={{
                opacity: 1,
                clipPath: 'inset(0 0 0 0)',
                // Keyframe overshoot: 0.95 → 1.02 → 1.0. Beat of stamp impact.
                transform: ['scale(0.95)', 'scale(1.02)', 'scale(1)'],
              }}
              exit={{
                opacity: 0,
                transform: 'scale(0.97)',
              }}
              transition={{
                opacity: {
                  duration: MOTION_DURATIONS.base,
                  ease: MOTION_EASINGS.decelerate,
                },
                clipPath: {
                  duration: MOTION_DURATIONS.slow,
                  ease: MOTION_EASINGS.base,
                },
                transform: {
                  duration: MOTION_DURATIONS.slow,
                  ease: MOTION_EASINGS.base,
                  times: [0, 0.6, 1],
                },
              }}
            >
              {text}
            </m.div>
            )
          })}
        </AnimatePresence>
      </div>

      <ChannelTicker />
    </div>
  )
}
