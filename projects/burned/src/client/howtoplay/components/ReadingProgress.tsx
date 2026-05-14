import { useEffect, useState } from 'react'
import styles from './ReadingProgress.module.css'

/**
 * Reading-progress indicator — a brass file-tab strip at the right edge of
 * the viewport that fills as you scroll through the manual. Pure visual,
 * non-interactive. Hidden on phones (vertical strip steals room).
 */
export function ReadingProgress() {
  const [pct, setPct] = useState(0)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        const total = document.documentElement.scrollHeight - window.innerHeight
        const next = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0
        setPct(next)
        setHidden(next < 0.02)
        ticking = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <aside
      aria-hidden="true"
      className={[styles.progress, hidden ? styles.hidden : null].filter(Boolean).join(' ')}
    >
      <span className={styles.label}>Briefing · Progress</span>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ height: `${Math.round(pct * 100)}%` }} />
      </div>
      <span className={styles.percent}>{Math.round(pct * 100)}%</span>
    </aside>
  )
}
