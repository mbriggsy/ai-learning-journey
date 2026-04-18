import { useRef, useEffect } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useEventFeed } from '@client/shared/hooks/useEventFeed'
import { usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './BlotterTicker.module.css'

// Duplicate of AnnouncementFeed's formatter — kept inline here so the prototype
// can be ripped out cleanly if the side-panel wins the A/B. If this wins,
// merge the formatter into a shared helper and both consumers import it.
import { formatEvent } from './AnnouncementFeed'

/**
 * Horizontal teletype chyron pinned to the bottom of the briefing blotter.
 * Prototype for moving the COMMS ticker out of the side panel (which we need
 * to free up for dossiers at 8-10 player counts). Runs in parallel with
 * AnnouncementFeed for A/B comparison.
 *
 * Visual: newest event full-bright on the right, older events fade as chips
 * to the left. CRT-flicker on the newest entry matches the side-panel feel.
 */
export function BlotterTicker() {
  const events = useEventFeed()
  const players = usePlayerList()

  type Rendered = { entry: typeof events[number]; text: string }
  const rendered: Rendered[] = events
    .map(entry => ({ entry, text: formatEvent(entry.event, players, entry.id) }))
    .filter((r): r is Rendered => r.text != null)
    .slice(-4) // last 4, room for roughly one line of chyron at 1920px

  const listRef = useRef<HTMLDivElement>(null)

  // Scroll the chyron so the newest item is always aligned to the right edge
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollLeft = el.scrollWidth
  }, [rendered.length, rendered[rendered.length - 1]?.entry.id])

  return (
    <div className={styles.ticker} aria-hidden="true">
      <div className={styles.header}>// COMMS</div>
      <div className={styles.list} ref={listRef}>
        <AnimatePresence initial={false}>
          {rendered.map(({ entry, text }: Rendered, i: number) => {
            const isNewest = i === rendered.length - 1
            return (
              <m.span
                key={entry.id}
                className={`${styles.entry} ${isNewest ? styles.entryNew : ''}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={MOTION.snappy}
              >
                <span className={styles.sep}>//</span>
                <span className={styles.text}>{text}</span>
              </m.span>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
