/*
 * src/viz/BandEnlargeModal.tsx — the deliberate, opt-in "study the range" lightbox (direction B
 * click-to-enlarge). A modal that dismisses back to the calm drawer — NEVER a permanent big
 * chart (R2 anti-dashboard).
 *
 * OVERLAY CONTRACT (phase-2 / burned/013): PORTALED to document.body so no transform/filter
 * ancestor can capture the fixed-position backdrop (the containing-block trap). Keyboard +
 * Escape close; focus is trapped inside the dialog and RESTORED to the trigger on close; the
 * non-color signal survives enlarged (it renders the SAME ConfidenceBand, same encoding); the
 * zoom respects prefers-reduced-motion (final state identical — opacity-only when reduced).
 *
 * STRING-FREE: title + close-button label arrive as props (src/ui supplies them via copy.ts).
 */

import { useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ConfidenceBand } from './ConfidenceBand'
import { BandLegend } from './BandLegend'
import type { BandViewData, BandLabels } from './bandData'
import './band.css'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

export interface BandEnlargeModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly data: BandViewData
  readonly labels: BandLabels
  /** The dialog title (e.g. "The range, up close"). */
  readonly title: string
  /** Accessible label for the close control (e.g. "Close"). */
  readonly closeLabel: string
}

/** Focusable elements inside the dialog, for the focus trap. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function BandEnlargeModal({
  open,
  onClose,
  data,
  labels,
  title,
  closeLabel,
}: BandEnlargeModalProps) {
  const reduce = useReducedMotion() ?? false
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  // Remember what had focus before open so we can RESTORE it on close (a11y).
  const restoreRef = useRef<HTMLElement | null>(null)

  // While OPEN: capture the outgoing focus owner, lock body scroll, move focus into the dialog.
  useEffect(() => {
    if (!open) return
    restoreRef.current = (document.activeElement as HTMLElement) ?? null
    document.documentElement.classList.add('band-modal-open')
    closeBtnRef.current?.focus()
    return () => {
      document.documentElement.classList.remove('band-modal-open')
    }
  }, [open])

  // Restore focus to the trigger once the dialog has fully LEFT the DOM (AnimatePresence's exit
  // completes) — restoring while it is still mounted/exiting lets the unmount drop focus to
  // <body>. Guarded on the captured owner still being connected.
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
      // Focus trap: wrap Tab / Shift+Tab within the dialog's focusables.
      const root = dialogRef.current
      if (root === null) return
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (items.length === 0) {
        e.preventDefault()
        closeBtnRef.current?.focus()
        return
      }
      const first = items[0]!
      const last = items[items.length - 1]!
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
          className="band-modal__backdrop"
          // mousedown on the backdrop (not a child) dismisses — calm dismiss-to-rest.
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
            className="band-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={onKeyDown}
            // modals scale from CENTER (emil: not origin-aware). Reduced motion → opacity only,
            // so the FINAL state is identical with motion on or off.
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE_OUT }}
          >
            <div className="band-modal__head">
              <h2 className="band-modal__title" id={titleId}>
                {title}
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                className="band-modal__close"
                aria-label={closeLabel}
                onClick={onClose}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            {/* the SAME band, enlarged — non-color encoding preserved verbatim. */}
            <ConfidenceBand data={data} labels={labels} variant="enlarged" />
            {/* the legend rides the lightbox too — horizontal here (the modal has the width to
                span the three tiers across one line, vs the drawer's vertical stack). */}
            <BandLegend labels={labels} layout="row" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
