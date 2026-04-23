import { useEffect, useRef, useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './EndGameControl.module.css'

interface Props {
  readonly onEndGame: () => void
}

/**
 * Top-right board control that lets the party rage-quit a stalled game
 * and return everyone to the lobby for a fresh deal. Small button,
 * confirm modal to prevent a shoulder-brush on the iPad from nuking the
 * room. Designed around the shared-screen ergonomic — anyone at the
 * table can reach it; no "host" identity required (spec §3.4: board
 * is the authority).
 */
export function EndGameControl({ onEndGame }: Props) {
  const [open, setOpen] = useState(false)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  // Escape closes modal; focus the destructive action so keyboard users
  // aren't auto-confirming. Backdrop click also closes.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    confirmBtnRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const handleConfirm = () => {
    setOpen(false)
    onEndGame()
  }

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label="End game and return all operatives to the lobby"
      >
        <span className={styles.triggerGlyph} aria-hidden="true">✕</span>
        <span className={styles.triggerLabel}>End Game</span>
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION.quickFade}
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <m.div
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="end-game-title"
              aria-describedby="end-game-body"
              initial={{ opacity: 0, transform: 'translateY(12px) scale(0.98)' }}
              animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
              exit={{ opacity: 0, transform: 'translateY(12px) scale(0.98)' }}
              transition={MOTION.enter}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.modalStamp} aria-hidden="true">Classified</div>
              <h2 id="end-game-title" className={styles.modalTitle}>Scratch The Op?</h2>
              <p id="end-game-body" className={styles.modalBody}>
                This ends the mission and returns every operative to the briefing room.
                You can deal again from the lobby.
              </p>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setOpen(false)}
                >
                  Stand Down
                </button>
                <button
                  ref={confirmBtnRef}
                  type="button"
                  className={styles.confirmBtn}
                  onClick={handleConfirm}
                >
                  End It
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
