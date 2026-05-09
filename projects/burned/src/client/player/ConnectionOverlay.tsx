import { useEffect, useRef } from 'react'
import type { ConnectionStatus } from '@client/connection'
import styles from './ConnectionOverlay.module.css'

interface ConnectionOverlayProps {
  readonly status: ConnectionStatus
}

export function ConnectionOverlay({ status }: ConnectionOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isGaveUp = status === 'gave-up'
  const isTransient = status === 'connecting' || status === 'disconnected'

  // showModal() is reserved for the terminal 'gave-up' state. The HTML
  // dialog API promotes the element to the browser's top layer, which
  // captures all pointer events for the viewport regardless of CSS — that
  // is correct when the player MUST take Refresh to continue, but a P1
  // game-blocker if applied to brief mid-game reconnects: a sub-second
  // packet drop during a 7s nope window silently swallowed the player's
  // Intercept tap (triage 001 + 023, run 2026-05-08-2022-5p). Transient
  // states render below as a non-blocking <div> at --z-overlay.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isGaveUp && !dialog.open) {
      dialog.showModal()
    } else if (!isGaveUp && dialog.open) {
      dialog.close()
    }
  }, [isGaveUp])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (e: Event) => e.preventDefault()
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [])

  return (
    <>
      <dialog ref={dialogRef} className={styles.overlay} aria-label="Connection status">
        {isGaveUp && (
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
        )}
      </dialog>
      {isTransient && (
        <div
          className={styles.transient}
          role="status"
          aria-live="polite"
          aria-label="Connection status"
        >
          <div className={styles.spinner} aria-hidden="true" />
          <div className={styles.label}>
            {status === 'connecting' ? 'Opening channel...' : 'Re-establishing channel...'}
          </div>
        </div>
      )}
    </>
  )
}
