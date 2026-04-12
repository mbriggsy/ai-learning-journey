import { useEffect, useRef } from 'react'
import type { ConnectionStatus } from '@client/connection'
import styles from './ConnectionOverlay.module.css'

interface ConnectionOverlayProps {
  readonly status: ConnectionStatus
}

export function ConnectionOverlay({ status }: ConnectionOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isConnecting = status !== 'connected'

  // Imperatively open/close the native dialog. Always-mounted lets the top
  // layer pick it up once; showModal()/close() toggles visibility.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isConnecting && !dialog.open) {
      dialog.showModal()
    } else if (!isConnecting && dialog.open) {
      dialog.close()
    }
  }, [isConnecting])

  // Suppress Esc-to-dismiss — reconnection is not user-dismissable.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (e: Event) => e.preventDefault()
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [])

  return (
    <dialog ref={dialogRef} className={styles.overlay} aria-label="Connection status">
      <div className={styles.spinner} aria-hidden="true" />
      <div className={styles.label}>
        {status === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
      </div>
    </dialog>
  )
}
