import { memo } from 'react'
import styles from './Arena.module.css'

/**
 * Arena / Staging Zone — center of the board.
 * Cards LAND here when played. During Nope window, card sits visible.
 * Phase 5 dramatic: EK reveal fills this zone full-screen.
 * For now: structural anchor for card play animations.
 */
export const Arena = memo(function Arena({
  children,
}: {
  children?: React.ReactNode
}) {
  return (
    <div className={styles.arena}>
      {children}
    </div>
  )
})
