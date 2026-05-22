import type { ReactNode } from 'react'
import styles from './ClassificationBanner.module.css'

interface ClassificationBannerProps {
  /** Banner text — gets uppercased automatically. */
  children?: ReactNode
  /** Position on the page. Top sits above content, bottom sits below. */
  position?: 'top' | 'bottom'
  /** Tone — red is highest-classification, amber is warning, none is informational. */
  tone?: 'red' | 'amber' | 'navy'
}

/**
 * Full-width classification stripe — the bar you see at the top and bottom of
 * real declassified documents. "TOP SECRET // SCI // EYES ONLY".
 *
 * Repeats the text across the bar so it reads even on widescreen layouts.
 */
export function ClassificationBanner({
  children = 'Top Secret // SCI // Operative Eyes Only // No Foreign Nationals',
  position = 'top',
  tone = 'red',
}: ClassificationBannerProps) {
  const text = typeof children === 'string' ? children : ''
  return (
    <div className={[styles.banner, styles[tone], styles[position]].join(' ')} role="presentation">
      <span className={styles.text}>{text}</span>
      <span aria-hidden="true" className={styles.text}>{text}</span>
      <span aria-hidden="true" className={styles.text}>{text}</span>
    </div>
  )
}
