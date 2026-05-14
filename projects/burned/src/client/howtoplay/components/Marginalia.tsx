import type { ReactNode } from 'react'
import styles from './Marginalia.module.css'

interface MarginaliaProps {
  /** Content — usually a date stamp, page number, or hand-written note. */
  children: ReactNode
  /** Position on the page. */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inline'
  /** Visual style. */
  style?: 'date-stamp' | 'page-num' | 'handwritten'
  /** Tilt in degrees. Default depends on style. */
  tilt?: number
}

/**
 * Small text artifact in the margins of a dossier page — date stamps,
 * page numbers, hand-written notes. Adds the "lived-in" feel of a real file.
 *
 * Parent MUST be position: relative for absolute positioning to anchor.
 */
export function Marginalia({
  children,
  position = 'top-right',
  style = 'date-stamp',
  tilt,
}: MarginaliaProps) {
  const defaultTilt = style === 'handwritten' ? -2 : -3
  const finalTilt = tilt ?? defaultTilt

  return (
    <span
      className={[styles.marginalia, styles[`pos-${position}`], styles[style]].join(' ')}
      style={{ transform: `rotate(${finalTilt}deg)` }}
      aria-hidden="true"
    >
      {children}
    </span>
  )
}
