import type { GitStats } from '@/types'
import { formatInt, formatShortDate } from '@/lib/format'
import { buildSparklineSeries, buildSparklinePath } from '@/lib/sparkline'
import styles from './CadenceSparkline.module.css'

const VIEW_W = 1000
const VIEW_H = 80

/**
 * Movement 5 — the build rhythm (Phase 5). A full-bleed monotone-cubic shape of daily commit
 * volume (the curve never overshoots a real peak — honesty lock, see sparkline.ts), no axes,
 * no hover/tooltip; three quiet callouts below.
 *
 * The PAGE gates this on isCadenceTrustworthy(timeline) — it is mounted ONLY where the git
 * history is a genuine rhythm, never for the monorepo bulk-import-polluted toys (insight 005).
 * So everything here can trust its timeline.
 */
export function CadenceSparkline({
  timeline,
  largestCommitCaption,
}: {
  timeline: GitStats['timeline']
  largestCommitCaption?: string
}) {
  const series = buildSparklineSeries(timeline.commitsByDay)
  const { line, area } = buildSparklinePath(series, VIEW_W, VIEW_H)
  const peakDate = formatShortDate(timeline.peakDay?.date ?? null)
  const largest = timeline.largestSingleCommit

  return (
    <div className={styles.cadence}>
      <div className={styles.chart}>
        <svg className={styles.svg} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" aria-hidden>
          <path className={styles.area} d={area} />
          <path className={styles.line} d={line} fill="none" />
        </svg>
      </div>

      <p className={styles.callouts}>
        <span className={styles.callout}>
          <span className={`${styles.calloutValue} tabular`}>{formatInt(timeline.activeDays)}</span>
          <span className={styles.calloutLabel}>active days</span>
        </span>
        {peakDate && timeline.peakDay && (
          <span className={styles.callout}>
            <span className={styles.calloutValue}>{peakDate}</span>
            <span className={styles.calloutLabel}>
              peak · <span className="tabular">{formatInt(timeline.peakDay.count)}</span> commits
            </span>
          </span>
        )}
        {largest && (
          <span className={styles.callout}>
            <span className={`${styles.calloutValue} tabular`}>+{formatInt(largest.linesAdded)}</span>
            <span className={styles.calloutLabel}>{largestCommitCaption ?? 'largest commit'}</span>
          </span>
        )}
      </p>
    </div>
  )
}
