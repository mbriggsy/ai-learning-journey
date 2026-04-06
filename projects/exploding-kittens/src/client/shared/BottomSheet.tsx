import { useRef, useEffect, useCallback } from 'react'
import type { PropsWithChildren } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { MOTION } from './animation-config'
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

  const handleCancel = useCallback((e: Event) => {
    e.preventDefault()
    onDismiss?.()
  }, [onDismiss])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !onDismiss) return
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [handleCancel, onDismiss])

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <AnimatePresence>
        {open && (
          <m.div
            className={styles.content}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={MOTION.SNAPPY}
          >
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </dialog>
  )
}
