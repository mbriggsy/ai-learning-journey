import { useEffect, useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useLastError } from '@client/shared/gameStore'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './ErrorToast.module.css'

export function ErrorToast() {
  const error = useLastError()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!error) return
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 2000)
    return () => clearTimeout(timer)
  }, [error])

  return (
    <AnimatePresence>
      {visible && error && (
        <m.div
          className={styles.toast}
          // Transform string keeps the slide GPU-composited under load — toast
          // fires during WS-hot paths (error arrives mid-action). Shorthand
          // `y` runs on main thread via rAF.
          initial={{ transform: 'translateY(-60px)', opacity: 0 }}
          animate={{ transform: 'translateY(0px)', opacity: 1 }}
          exit={{ transform: 'translateY(-60px)', opacity: 0 }}
          transition={MOTION.quickFade}
        >
          {error.code === 'STALE_STATE' ? 'Game state changed — try again' : error.message}
        </m.div>
      )}
    </AnimatePresence>
  )
}
