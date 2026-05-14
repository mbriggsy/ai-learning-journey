import type { ReactNode } from 'react'
import styles from './FileTab.module.css'

interface FileTabProps {
  /** Tab label — short, all-caps. */
  children: ReactNode
  /** Color of the tab marker. */
  tone?: 'red' | 'amber' | 'blue' | 'green'
  /** Vertical position as percent from top of the parent. Default 8%. */
  top?: string
}

/**
 * Manila folder tab — sits on the RIGHT edge of a DossierPage, sticking out.
 * Acts as a tab marker for "this is the X section of the file."
 *
 * Parent MUST have position: relative and overflow: visible for the tab
 * to render correctly.
 */
export function FileTab({ children, tone = 'red', top = '8%' }: FileTabProps) {
  return (
    <span
      className={[styles.tab, styles[tone]].join(' ')}
      style={{ top }}
      aria-hidden="true"
    >
      <span className={styles.marker} />
      <span className={styles.label}>{children}</span>
    </span>
  )
}
