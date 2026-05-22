import type { CSSProperties, ReactNode } from 'react'
import styles from './DossierPage.module.css'

interface DossierPageProps {
  children: ReactNode
  /** Subtle paper rotation, in degrees. Use sparingly. Default 0. */
  tilt?: number
  /** Visual variant — `paper` is standard manila, `lit` is the foreground/active page. */
  variant?: 'paper' | 'lit'
  /** Optional tag id, used for aria-labelledby on parent if heading lives inside. */
  id?: string
  className?: string
  /** Override the default top-edge "paperclip" affordance. */
  clip?: 'paperclip' | 'staple' | 'none'
}

/**
 * The reusable "page of the dossier" surface. Every act of the manual sits on
 * one (or several) of these. Renders as warm manila paper with subtle rotation,
 * inner highlight + outer shadow, and an optional paperclip on the top edge.
 */
export function DossierPage({
  children,
  tilt = 0,
  variant = 'paper',
  id,
  className,
  clip = 'paperclip',
}: DossierPageProps) {
  const style: CSSProperties = tilt
    ? { transform: `rotate(${tilt}deg)` }
    : {}

  return (
    <section
      id={id}
      className={[styles.page, styles[variant], className].filter(Boolean).join(' ')}
      style={style}
      data-reveal
    >
      {clip === 'paperclip' ? <span aria-hidden="true" className={styles.paperclip} /> : null}
      {clip === 'staple' ? <span aria-hidden="true" className={styles.staple} /> : null}
      <div className={styles.inner}>{children}</div>
    </section>
  )
}
