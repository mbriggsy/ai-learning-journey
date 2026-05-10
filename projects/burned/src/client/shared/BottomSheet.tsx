import { useRef, useEffect, useCallback } from 'react'
import type { PropsWithChildren } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './BottomSheet.module.css'

interface BottomSheetProps {
  readonly open: boolean
  readonly onDismiss?: () => void
  /**
   * Bump the sheet to ~94vh so the content can dominate the screen rather
   * than read as a modal cap. Used for Falsify Intel rearrange where the
   * dossier UX wants the file to fill the field of view. Default false
   * keeps the existing 80vh cap for prompts (Defuse / TargetSelect).
   */
  readonly tall?: boolean
  /**
   * Bump the sheet to ~88vh — between the default 80vh and tall 94vh.
   * Used by NameCard where 16 button rows + chrome (title/subtitle/cancel)
   * under the default cap left the bottom row crowding the cancel button.
   * Keeps the top border-radius (still reads as a sheet, not a takeover).
   * Mutually exclusive with `tall` — if both are set, `tall` wins.
   */
  readonly medium?: boolean
}

export function BottomSheet({ open, onDismiss, tall, medium, children }: PropsWithChildren<BottomSheetProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Only open the dialog — closing is deferred to onExitComplete to preserve exit animation
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
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

  const dialogClass = tall
    ? `${styles.dialog} ${styles.dialogTall}`
    : medium
    ? `${styles.dialog} ${styles.dialogMedium}`
    : styles.dialog
  const contentClass = tall
    ? `${styles.content} ${styles.contentTall}`
    : medium
    ? `${styles.content} ${styles.contentMedium}`
    : styles.content

  return (
    <dialog
      ref={dialogRef}
      className={dialogClass}
    >
      <AnimatePresence onExitComplete={() => { dialogRef.current?.close() }}>
        {open && (
          <m.div
            className={contentClass}
            // Transform string — sheet slide is the most common interruptible
            // motion on phone (open/close rapidly during combo picks). Keeping
            // it GPU-composited matters during WS-hot paths.
            initial={{ transform: 'translateY(100%)' }}
            animate={{ transform: 'translateY(0%)' }}
            exit={{ transform: 'translateY(100%)' }}
            transition={MOTION.snappy}
          >
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </dialog>
  )
}
