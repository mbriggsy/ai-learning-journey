import { useRef, useEffect } from 'react'
import type { PropsWithChildren } from 'react'
import styles from './BottomSheet.module.css'

interface BottomSheetProps {
  readonly open: boolean
  readonly onDismiss?: () => void
}

export function BottomSheet({ open, onDismiss, children }: PropsWithChildren<BottomSheetProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !onDismiss) return

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onDismiss()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onDismiss])

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      {children}
    </dialog>
  )
}
