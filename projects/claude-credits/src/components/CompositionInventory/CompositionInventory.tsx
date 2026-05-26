import clsx from 'clsx'
import type { CompositionItem } from '@/lib/composition'
import { formatInt } from '@/lib/format'
import styles from './CompositionInventory.module.css'

/**
 * Movement 4 (lower) — "WHAT GOT BUILT" (Phase 5 Decision 3). The BREADTH of an autonomous
 * build as bare count-callouts, each in its natural unit (the label carries the unit). NOT a
 * chart, NOT a provenance split, NOT boxed cards — type on background.
 *
 * Layout floor (Decision 12): ≤3 items render as a centered row (no empty grid columns);
 * ≥4 use the auto-fit grid. The page omits the section when items is empty.
 */
export function CompositionInventory({ items }: { items: CompositionItem[] }) {
  if (items.length === 0) return null
  const isRow = items.length <= 3

  return (
    <section className={styles.inventory} aria-label="What got built">
      <p className={styles.label}>What got built</p>
      <ul className={clsx(styles.items, isRow ? styles.row : styles.grid)}>
        {items.map((item) => (
          <li key={item.key} className={styles.item} data-inventory-item>
            <span className={clsx(styles.value, 'tabular')}>{formatInt(item.value)}</span>
            <span className={styles.itemLabel}>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
