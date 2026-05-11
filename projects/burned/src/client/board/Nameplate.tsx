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
   *  update in place in the subtext without re-triggering the flip).
   *  Standby is its own key so the first turn-started event flips the
   *  plate from quiet to active instead of hard-swapping the DOM.
   *  Offline gets its own key suffix so the plate re-flips when the
   *  current subject goes off/online mid-turn — room sees the state
   *  change, not a silent swap. */
  readonly key: string
  readonly name: string
  readonly subtext: string
  readonly standby: boolean
  readonly offline: boolean
  /** True when the subject's player differs from the current turn player —
   *  i.e., the prompted player isn't already named by PlayerStrip. Only
   *  favor-response triggers this in practice today (defuse / future-
   *  rearrange / name-card all prompt the active turn player, which the
   *  strip already highlights). When true, the plate shows the player's
   *  codename above the state engraving so observers know WHO is in the
   *  state — critical during favor-response where the active turn player
   *  and the prompted player are different humans. */
  readonly showName: boolean
}

const PROMPT_SUBTEXT: Record<PendingPromptView['type'], string> = {
  'defuse':           'Defusing',
  'favor-response':   'Handing Over',
  'future-rearrange': 'Rearranging Intel',
  'name-card':        'Calling The Shot',
}

const STANDBY_SUBJECT: Subject = {
  key:      'standby',
  name:     '.',
  subtext:  'Standby',
  standby:  true,
  offline:  false,
  showName: false,
}

// Offline overrides the prompt/turn subtext entirely. Room needs to see
// "game is paused because this player went dark" — not what they were
// supposed to be doing. One meaning, clearly. Color-blind-safe: the
// word 'Comms Down' carries the signal, the red tint is accent only.
const OFFLINE_SUBTEXT = 'Comms Down'

export function resolveSubject(
  currentTurn: Props['currentTurn'],
  prompt: Props['prompt'],
  players: readonly BoardPlayer[],
): Subject {
  if (prompt) {
    const p = players.find(x => x.id === prompt.playerId)
    if (!p) return STANDBY_SUBJECT
    const offline = !p.isConnected
    // showName when the prompted player differs from the current turn
    // player. Favor-response is the canonical case: actor plays the favor
    // card from their turn, target is a different human handling the
    // prompt. Defuse / future-rearrange / name-card all prompt the active
    // turn player and the PlayerStrip already names them — no plate-name
    // redundancy needed there.
    const showName = currentTurn !== null && currentTurn.currentPlayerId !== prompt.playerId
    return {
      key:     `prompt:${prompt.playerId}:${prompt.type}${offline ? ':offline' : ''}`,
      name:    p.name,
      subtext: offline ? OFFLINE_SUBTEXT : PROMPT_SUBTEXT[prompt.type],
      standby: false,
      offline,
      showName,
    }
  }

  if (currentTurn) {
    const p = players.find(x => x.id === currentTurn.currentPlayerId)
    if (!p) return STANDBY_SUBJECT
    const offline = !p.isConnected
    const extra = currentTurn.turnsRemaining > 1
      ? ` · ${currentTurn.turnsRemaining} Turns`
      : ''
    return {
      key:      `turn:${currentTurn.currentPlayerId}${offline ? ':offline' : ''}`,
      name:     p.name,
      subtext:  offline ? OFFLINE_SUBTEXT : `On Deck${extra}`,
      standby:  false,
      offline,
      showName: false,
    }
  }

  return STANDBY_SUBJECT
}

/**
 * Brass desk nameplate. Shows the active player's codename engraved on a
 * beveled brass plate sitting on a thin dark-wood stand. Turn handoff and
 * prompt changes flip the plate 180° around its vertical center (rotateY),
 * content swapping at the edge-on moment — reads as a physical coin flip.
 *
 * Standby (no current turn, no prompt) is a keyed variant in the same
 * flip flow — game-start renders standby with no initial flip (thanks to
 * AnimatePresence initial={false}), and the first turn-started event
 * flips the plate from quiet to active instead of hard-swapping DOM.
 */
export function Nameplate({ players, currentTurn, prompt }: Props) {
  const subject = resolveSubject(currentTurn, prompt, players)
  const classes = [styles.nameplate]
  if (subject.standby) classes.push(styles.nameplateStandby)
  if (subject.offline) classes.push(styles.nameplateOffline)
  const wrapperClass = classes.join(' ')

  return (
    <div className={wrapperClass} aria-live="polite" aria-atomic="true">
      <div className={styles.plate}>
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={subject.key}
            className={styles.plateContent}
            // data-standby scopes the name-hide to the plateContent itself
            // so the EXITING standby plate keeps its hidden name through
            // the rotateY exit — without this, the parent className flip
            // briefly reveals the "." during handoff.
            data-standby={subject.standby ? 'true' : undefined}
            data-offline={subject.offline ? 'true' : undefined}
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
            {/* Name span is visually hidden by default (PlayerStrip names
                the active player — duplicating it here was redundant) but
                shows visibly when the subject's player ≠ the current turn
                player. Favor-response is the practical case: the favor
                target is a different human from the actor whose turn it
                is, and the plate is the only surface that can name them.
                Screen readers and tests always read the codename. */}
            <span className={subject.showName ? styles.name : styles.nameSr}>{subject.name}</span>
            <span className={subject.showName ? styles.subtext : styles.subtextSolo}>{subject.subtext}</span>
          </m.div>
        </AnimatePresence>
      </div>
      <div className={styles.stand} />
    </div>
  )
}
