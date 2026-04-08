import type { ConnectionStatus } from '@client/connection'
import styles from './ConnectionOverlay.module.css'

interface ConnectionOverlayProps {
  readonly status: ConnectionStatus
}

export function ConnectionOverlay({ status }: ConnectionOverlayProps) {
  if (status === 'connected') return null

  return (
    <div className={styles.overlay}>
      <div className={styles.spinner} />
      <div className={styles.label}>
        {status === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
      </div>
    </div>
  )
}
