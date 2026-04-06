import { useEffect, useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { useLastError } from '@client/shared/gameStore'
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
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {error.code === 'STALE_STATE' ? 'Game state changed — try again' : error.message}
        </m.div>
      )}
    </AnimatePresence>
  )
}
