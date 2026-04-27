import { useEffect, useRef } from 'react'
import type { ConnectionStatus } from '@client/connection'
import styles from './ConnectionOverlay.module.css'

interface ConnectionOverlayProps {
  readonly status: ConnectionStatus
}

export function ConnectionOverlay({ status }: ConnectionOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const showOverlay = status !== 'connected'

  // Imperatively open/close the native dialog. Always-mounted lets the top
  // layer pick it up once; showModal()/close() toggles visibility.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (showOverlay && !dialog.open) {
      dialog.showModal()
    } else if (!showOverlay && dialog.open) {
      dialog.close()
    }
  }, [showOverlay])

  // Suppress Esc-to-dismiss — reconnection is not user-dismissable.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (e: Event) => e.preventDefault()
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [])

  const isGaveUp = status === 'gave-up'

  return (
    <dialog ref={dialogRef} className={styles.overlay} aria-label="Connection status">
      {isGaveUp ? (
        <>
          <div className={styles.gaveUpHeadline}>// CHANNEL DOWN</div>
          <div className={styles.gaveUpLabel}>Reconnect failed. Refresh to rejoin.</div>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </>
      ) : (
        <>
          <div className={styles.spinner} aria-hidden="true" />
          <div className={styles.label}>
            {status === 'connecting' ? 'Opening channel...' : 'Re-establishing channel...'}
          </div>
        </>
      )}
    </dialog>
  )
}
