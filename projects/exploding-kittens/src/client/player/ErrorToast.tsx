import { useEffect, useState } from 'react'
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

  if (!visible || !error) return null

  return (
    <div className={styles.toast}>
      Game state changed — try again
    </div>
  )
}
