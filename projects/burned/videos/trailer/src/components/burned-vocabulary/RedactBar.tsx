import type { CSSProperties, ReactNode } from 'react'
import styles from './RedactBar.module.css'

interface RedactBarProps {
  /** Optional content shown UNDER the redaction — visible only on hover/tap. */
  children?: ReactNode
  /** Width — accepts CSS length or a number of em. */
  width?: string
  /** Reveal on hover/tap (default true). When false, redaction is permanent. */
  reveal?: boolean
  /** Tilt in degrees for hand-stamped vibe. Default 0. */
  tilt?: number
  /** Aria label for screen readers (e.g., "Redacted: classified codename"). */
  label?: string
}

/**
 * The black censorship bar. Optionally reveals content on hover/tap.
 *
 * Two modes:
 *   - Inline: hides text. `<RedactBar>SECRET</RedactBar>` shows a black bar
 *     the width of the hidden text; hovering peels the bar back to reveal.
 *   - Static: no children → just a decorative black bar at the given width.
 */
export function RedactBar({ children, width, reveal = true, tilt = 0, label }: RedactBarProps) {
  const style: CSSProperties = {
    transform: tilt ? `rotate(${tilt}deg)` : undefined,
    width,
  }

  // No children — render as a decorative bar.
  if (!children) {
    return (
      <span
        aria-hidden="true"
        className={[styles.bar, styles.standalone].join(' ')}
        style={style}
      />
    )
  }

  return (
    <span
      className={[styles.host, reveal ? styles.reveal : null].filter(Boolean).join(' ')}
      aria-label={label}
    >
      <span className={styles.text}>{children}</span>
      <span aria-hidden="true" className={[styles.bar, styles.overlay].join(' ')} style={style} />
    </span>
  )
}
