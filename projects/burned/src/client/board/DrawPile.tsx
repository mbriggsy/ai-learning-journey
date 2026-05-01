import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useEventFeed } from '@client/shared/hooks/useEventFeed'
import styles from './DrawPile.module.css'

interface DrawPileProps {
  readonly count: number
}

/**
 * Draw pile visual — 3-4 stacked card edges with count badge.
 * Individual Card components are NEVER rendered (information leak + perf).
 * CSS breathing animation on compositor thread.
 *
 * On every `deck-shuffled` event (Burn the Files), the pile fires a one-shot
 * tumble — layers riff left-right with staggered delays, the parent stack
 * scale-pops, and the burned-glow rim flashes hot. Closes the catalog
 * `ui-assertion` for SCN-BURN-FILES-NORMAL-01: "cards visibly tumble."
 * The COMMS ticker still narrates; this gives the eye something to track
 * before the text scrolls (TODO #3 phase 2).
 */
export const DrawPile = memo(function DrawPile({ count }: DrawPileProps) {
  // Show 3 layers for visual depth, fewer when deck is thin
  const layers = Math.min(3, count)

  const shuffleNonce = useDeckShuffledNonce()
  const isShuffling = useShuffleFlash(shuffleNonce, 720)

  return (
    <div className={styles.pile}>
      <div className={styles.stack} data-shuffling={isShuffling || undefined}>
        {Array.from({ length: layers }, (_, i) => (
          <div
            key={i}
            className={styles.layer}
            style={{
              // CSS variables carry the per-layer offset so the shuffle
              // keyframes can compose against them via calc() — without this,
              // the animation's transform would clobber the offset and all
              // layers would snap to identical positions during the tumble.
              ['--layer-x' as string]: `${i * 3}px`,
              ['--layer-y' as string]: `${-i * 3}px`,
              zIndex: layers - i,
            }}
          />
        ))}
        {count > 0 && (
          // Wrapper isolates the one-shot shuffle rotation from .topCard's
          // entrance animation. Without the wrapper, overriding .topCard's
          // `animation` during shuffle would cause the entrance keyframes to
          // re-trigger when data-shuffling flips off — the dossier would
          // re-drop after every Burn the Files. Wrapper carries the shuffle
          // motion; .topCard keeps its briefing-cascade drop-in.
          <div className={styles.topCardWrap}>
            <div className={styles.topCard}>
              <span className={styles.topSecretLabel}>TOP SECRET</span>
              <span className={styles.fileNumber}>FILE-47B</span>
            </div>
          </div>
        )}
      </div>
      <span className={styles.countBadge}>{count}</span>
    </div>
  )
})

/**
 * Counts `deck-shuffled` events in the cumulative event feed. The count
 * monotonically increases as Burn the Files cards resolve; consumers use
 * the change as a trigger, not the absolute value.
 */
function useDeckShuffledNonce(): number {
  const events = useEventFeed()
  return useMemo(
    () => events.reduce((n, e) => (e.event.type === 'deck-shuffled' ? n + 1 : n), 0),
    [events],
  )
}

/**
 * Returns true for `holdMs` after `nonce` increments. First mount returns
 * false (we don't replay shuffle effects on page reload — the cumulative
 * server log seeds the count from history). Same first-mount-skip pattern
 * as `DramaOverlay`'s `lastProcessedRef`.
 */
function useShuffleFlash(nonce: number, holdMs: number): boolean {
  const [active, setActive] = useState(false)
  const seededRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true
      return
    }
    setActive(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setActive(false), holdMs)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [nonce, holdMs])

  return active
}
