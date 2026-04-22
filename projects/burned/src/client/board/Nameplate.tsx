import { m, AnimatePresence } from 'motion/react'
import { MOTION_DURATIONS, MOTION_EASINGS } from '@client/shared/tokens/motion'
import type { BoardPlayer, PendingPromptView } from '@shared/protocol'
import styles from './Nameplate.module.css'

interface Props {
  readonly players: readonly BoardPlayer[]
  readonly currentTurn: { currentPlayerId: string; turnsRemaining: number } | null
  readonly prompt: PendingPromptView | null
}

interface Subject {
  /** Identity key — when this changes, the plate flips. Composite of
   *  "prompt:id:type" or "turn:id" so the flip fires on player change AND
   *  on prompt-type change, but NOT on turns-remaining count ticks (those
   *  update in place in the subtext without re-triggering the flip). */
  readonly key: string
  readonly name: string
  readonly subtext: string
}

const PROMPT_SUBTEXT: Record<PendingPromptView['type'], string> = {
  'defuse':           'Defusing',
  'favor-response':   'Handing Over',
  'future-rearrange': 'Rearranging Intel',
  'name-card':        'Calling The Shot',
}

function resolveSubject(
  currentTurn: Props['currentTurn'],
  prompt: Props['prompt'],
  players: readonly BoardPlayer[],
): Subject | null {
  if (prompt) {
    const p = players.find(x => x.id === prompt.playerId)
    if (!p) return null
    return {
      key:     `prompt:${prompt.playerId}:${prompt.type}`,
      name:    p.name,
      subtext: PROMPT_SUBTEXT[prompt.type],
    }
  }

  if (currentTurn) {
    const p = players.find(x => x.id === currentTurn.currentPlayerId)
    if (!p) return null
    const extra = currentTurn.turnsRemaining > 1
      ? ` · ${currentTurn.turnsRemaining} Turns`
      : ''
    return {
      key:     `turn:${currentTurn.currentPlayerId}`,
      name:    p.name,
      subtext: `On Deck${extra}`,
    }
  }

  return null
}

/**
 * Brass desk nameplate. Shows the active player's codename engraved on a
 * beveled brass plate sitting on a thin dark-wood stand. Turn handoff and
 * prompt changes flip the plate 180° around its vertical center (rotateY),
 * content swapping at the edge-on moment — reads as a physical coin flip.
 *
 * Standby state (no current turn, no prompt) renders a muted empty plate
 * as an anchor rather than collapsing layout.
 */
export function Nameplate({ players, currentTurn, prompt }: Props) {
  const subject = resolveSubject(currentTurn, prompt, players)

  if (!subject) {
    return (
      <div className={`${styles.nameplate} ${styles.nameplateStandby}`} aria-hidden="true">
        <div className={styles.plate}>
          <div className={styles.plateContent}>
            <span className={styles.name}>.</span>
            <span className={styles.subtext}>Standby</span>
          </div>
        </div>
        <div className={styles.stand} />
      </div>
    )
  }

  return (
    <div className={styles.nameplate} aria-live="polite" aria-atomic="true">
      <div className={styles.plate}>
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={subject.key}
            className={styles.plateContent}
            // Coin-flip: enter from +90° (edge-on, rotating in), exit to
            // -90° (rotating out the same way). Transform string (not
            // shorthand rotateY) so the animation stays hardware-accel.
            initial={{ transform: 'rotateY(90deg)', opacity: 0 }}
            animate={{ transform: 'rotateY(0deg)', opacity: 1 }}
            exit={{ transform: 'rotateY(-90deg)', opacity: 0 }}
            transition={{
              duration: MOTION_DURATIONS.slow,
              ease: MOTION_EASINGS.emphasized,
            }}
          >
            <span className={styles.name}>{subject.name}</span>
            <span className={styles.subtext}>{subject.subtext}</span>
          </m.div>
        </AnimatePresence>
      </div>
      <div className={styles.stand} />
    </div>
  )
}
