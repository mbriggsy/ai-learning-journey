/*
 * src/intake/controlSheet.tsx — the shared portal-sheet scaffold for the U10 control surfaces
 * (SequencingControl + RothLever). Lifted verbatim from BudgetBuilder's PROVEN overlay contract
 * (its third co-sibling — a fold of all three onto this scaffold is the filed follow-up; the
 * shipped budget sheet is deliberately untouched in this unit):
 *   - portaled to document.body (no transform ancestor can trap the fixed backdrop),
 *   - focus trapped, Escape closes, focus restored to the trigger after exit,
 *   - focus-to-heading on open (never an input — the phone-keyboard law),
 *   - a calm 24px rise + fade (transform/opacity only, CSP-clean); reduced motion drops the
 *     movement — final state identical,
 *   - one sr-only clear-after-announce live region, bound via CALLBACK ref (the node lives
 *     inside the open-gated portal — a mount effect would bind null in the app's real
 *     closed-at-mount shape and stay dead; insight 060).
 */
import { useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { createAnnouncer, focusHeading, type Announcer } from './a11y'
import './controls.css'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function ControlSheet({
  open,
  title,
  onClose,
  announcerRef,
  children,
}: {
  readonly open: boolean
  readonly title: string
  readonly onClose: () => void
  /** The sheet's clear-after-announce channel — the caller speaks through it (blocked applies,
   *  preview landings). Bound exactly while the sheet's live region exists. */
  readonly announcerRef: React.MutableRefObject<Announcer | null>
  readonly children: React.ReactNode
}) {
  const reduce = useReducedMotion() ?? false
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  const bindLiveRegion = useCallback(
    (node: HTMLDivElement | null) => {
      announcerRef.current = node === null ? null : createAnnouncer(node)
    },
    [announcerRef],
  )

  useEffect(() => {
    if (!open) return
    restoreRef.current = (document.activeElement as HTMLElement) ?? null
    // Body scroll lock while the sheet is up (the BudgetBuilder/BandEnlargeModal precedent —
    // its absence left the background scrolling behind the open modal; ultramode 2026-07-03).
    document.documentElement.classList.add('control-sheet-open')
    focusHeading(headingRef.current)
    return () => {
      document.documentElement.classList.remove('control-sheet-open')
    }
  }, [open])

  const restoreFocus = useCallback(() => {
    const owner = restoreRef.current
    restoreRef.current = null
    if (owner !== null && owner.isConnected) owner.focus()
  }, [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const root = dialogRef.current
      if (root === null) return
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (focusables.length === 0) return
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence onExitComplete={restoreFocus}>
      {open && (
        <motion.div
          className="control-sheet__backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
          initial={{ opacity: reduce ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.16, ease: EASE_OUT }}
        >
          <motion.div
            ref={dialogRef}
            className="control-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={onKeyDown}
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(24px)' }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE_OUT }}
          >
            <div ref={bindLiveRegion} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
            <h2 className="control-sheet__title" id={titleId} tabIndex={-1} ref={headingRef}>
              {title}
            </h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
