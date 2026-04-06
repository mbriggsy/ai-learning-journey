import { memo } from 'react'
import styles from './DrawPile.module.css'

interface DrawPileProps {
  readonly count: number
}

/**
 * Draw pile visual — 3-4 stacked card edges with count badge.
 * Individual Card components are NEVER rendered (information leak + perf).
 * CSS breathing animation on compositor thread.
 */
export const DrawPile = memo(function DrawPile({ count }: DrawPileProps) {
  // Show 3 layers for visual depth, fewer when deck is thin
  const layers = Math.min(3, count)

  return (
    <div className={styles.pile}>
      <div className={styles.stack}>
        {Array.from({ length: layers }, (_, i) => (
          <div
            key={i}
            className={styles.layer}
            style={{
              transform: `translate(${i * 2}px, ${-i * 2}px)`,
              zIndex: layers - i,
            }}
          />
        ))}
        {count > 0 && (
          <div className={styles.topCard} />
        )}
      </div>
      <span className={styles.countBadge}>{count}</span>
    </div>
  )
})
