import { useState, useEffect } from 'react'
import { getStatus, onStatusChange } from '@client/connection'
import type { ConnectionStatus } from '@client/connection'
import { useMyPlayer } from './hooks/usePlayerSelectors'
import styles from './TitleBar.module.css'

interface TitleBarProps {
  readonly roomCode: string
}

export function TitleBar({ roomCode }: TitleBarProps) {
  const [status, setStatus] = useState<ConnectionStatus>(getStatus)
  const myPlayer = useMyPlayer()

  useEffect(() => onStatusChange(setStatus), [])

  const dotClass =
    status === 'connected' ? styles.dotConnected :
    status === 'connecting' ? styles.dotConnecting :
    styles.dotDisconnected

  return (
    <div className={styles.titleBar}>
      <span className={styles.left}>
        <span className={`${styles.dot} ${dotClass}`} />
        <span className={styles.name}>{myPlayer?.name ?? '...'}</span>
      </span>
      <span className={styles.code}>#{roomCode}</span>
    </div>
  )
}
