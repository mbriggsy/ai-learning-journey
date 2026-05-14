import type { ReactNode } from 'react'
import styles from './EyebrowLabel.module.css'

interface EyebrowLabelProps {
  children: ReactNode
  /** Optional trailing rule line — extends the eyebrow horizontally. */
  rule?: boolean
  /** Color of the rule + text. Defaults to ochre. */
  tone?: 'ochre' | 'cream' | 'teal'
  className?: string
}

/**
 * Small mono uppercase label, usually preceding a heading.
 * Example: `// CLASSIFIED — CASE 47-B`
 */
export function EyebrowLabel({ children, rule = false, tone = 'ochre', className }: EyebrowLabelProps) {
  return (
    <p className={[styles.eyebrow, styles[tone], className].filter(Boolean).join(' ')}>
      <span aria-hidden="true" className={styles.slash}>//</span>
      <span className={styles.text}>{children}</span>
      {rule ? <span aria-hidden="true" className={styles.rule} /> : null}
    </p>
  )
}
