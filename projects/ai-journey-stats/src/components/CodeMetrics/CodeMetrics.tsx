import clsx from 'clsx'
import type { CodeMetric } from '@/lib/composition'
import { formatInt } from '@/lib/format'
import styles from './CodeMetrics.module.css'

/**
 * Movement 4a — the code-metrics quadrant (Phase 9 reframe of "what got built"). Four
 * authored buckets, each a LINES headline with a supporting FILE count: application LOC,
 * testing, implementation planning, config. Generated media is the separate AssetDonut
 * ("Audio & visuals") that follows. The page omits this section when metrics is empty.
 */
export function CodeMetrics({ metrics }: { metrics: CodeMetric[] }) {
  if (metrics.length === 0) return null
  return (
    <section className={styles.section} aria-label="Code metrics">
      <p className={styles.label}>Code &amp; planning</p>
      <ul className={styles.grid}>
        {metrics.map((m) => (
          <li key={m.key} className={styles.item}>
            <span className={clsx(styles.lines, 'tabular')}>{formatInt(m.lines)}</span>
            <span className={styles.itemLabel}>{m.label}</span>
            <span className={clsx(styles.files, 'tabular')}>
              {formatInt(m.files)} {m.files === 1 ? 'file' : 'files'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
