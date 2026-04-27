import { useState, useEffect } from 'react'
import { m, AnimatePresence } from 'motion/react'
import type { CardPlayState } from './hooks/useCardPlay'
import type { CardType, SubPhase } from '@shared/types'
import type { NopeWindowView } from '@shared/protocol'
import { haptic } from '@client/shared/haptics'
import { MOTION } from '@client/shared/tokens/motion'
import { useCurrentTurn } from '@client/shared/hooks/useSharedSelectors'
import styles from './SmartActionBox.module.css'

/** Human-readable action text for the smart action box.
 *  Two-line entries stack "End turn" (primary) over the effect (secondary);
 *  single-line entries render alone. Newline is the split sentinel. */
const ACTION_TEXT: Partial<Record<CardType, string>> = {
  'go-dark': 'End turn\nskip drawing',
  'intel-briefing': 'Peek at the top 3 cards',
  'falsify-intel': 'View and rearrange top 3 cards',
  // 'reassign' + 'direct-order' computed dynamically — they stack with pending
  // turns (N+2), so copy must reflect the real count at play-time.
  'burn-the-files': 'Shuffle the draw pile',
  'back-channel': 'End turn\ndraw from bottom',
  'call-in-a-favor': 'Take a card from someone \u2192',
}

const INVALID_LABELS: Record<string, string> = {
  'mismatched-types': 'Cards must match',
  'invalid-count': 'Invalid selection',
  'contains-extraction': "Can't play Extraction",
  'contains-burned': "Can't play Burned",
  'wild-with-non-operative': 'Wild only pairs with operatives',
  'single-operative': 'Needs a pair or triple',
  'single-intercepted': "Can't play Intercepted",
}


interface SmartActionBoxProps {
  readonly cardPlayState: CardPlayState
  readonly isMyTurn: boolean
  readonly subPhase: SubPhase | null
  readonly drawPileCount: number
  readonly disabled: boolean
  readonly optimisticPending: boolean
  readonly nopeWindow: NopeWindowView | null
  readonly hasIntercept: boolean
  readonly isAlive: boolean
  readonly favorMode: { requesterName: string } | null
  readonly onConfirm: () => void
  readonly onConfirmWithTarget: () => void
  readonly onDraw: () => void
  readonly onIntercept: () => void
  readonly onSurrender: () => void
}

export function SmartActionBox({
  cardPlayState, isMyTurn, subPhase, drawPileCount,
  disabled, optimisticPending,
  nopeWindow, hasIntercept, isAlive, favorMode,
  onConfirm, onConfirmWithTarget, onDraw, onIntercept, onSurrender,
}: SmartActionBoxProps) {
  // Intercept window countdown — ticks fast enough to catch the "0s" frame
  // before the server's 300ms grace period resolves the window. At 3s windows
  // a coarser tick can skip "0s" entirely, which reads as "timer disappeared".
  const [secondsLeft, setSecondsLeft] = useState(0)
  useEffect(() => {
    if (!nopeWindow) { setSecondsLeft(0); return }
    const update = () => {
      setSecondsLeft(Math.max(0, Math.ceil((nopeWindow.deadlineMs - Date.now()) / 1000)))
    }
    update()
    const timer = setInterval(update, 100)
    return () => clearInterval(timer)
  }, [nopeWindow?.deadlineMs, nopeWindow?.generation])

  // Attack stacking: target receives (turnsRemaining - 1) + 2 = turnsRemaining + 1
  // turns. Normal turn (turnsRemaining=1) → 2. Under an existing attack
  // (turnsRemaining=2) → 3. Etc. Copy reflects the real count so stacking reads
  // honestly. Fallback to 2 when turn data is missing (pre-playing phase).
  const currentTurn = useCurrentTurn()
  const attackTurns = (currentTurn?.turnsRemaining ?? 1) + 1

  const state = deriveState(cardPlayState, isMyTurn, subPhase, drawPileCount)

  // Intercept is always interactive during the nope window — the outer
  // `disabled` prop (driven by permission.allowed) correctly blocks normal
  // card actions when it's not your turn, but nope-ing IS the legal action
  // for non-actors, so intercept must bypass it.
  const isIntercept = state.key === 'intercept'
  const buttonDisabled = isIntercept ? optimisticPending : (disabled || optimisticPending)

  const [primary, ...rest] = state.text.split('\n')
  const secondary = rest.join(' ') || null
  const content = secondary ? (
    <>
      <span className={styles.primaryLine}>{primary}</span>
      <span className={styles.hintText}>{secondary}</span>
    </>
  ) : state.text

  // Stable button DOM across state swaps (insight 037). The button element
  // never unmounts when state.key changes — only the inner content span swaps
  // via AnimatePresence. This prevents Playwright ref-stale errors when an
  // automation tool's click triggers a state transition mid-click.
  //
  // For non-interactive states (standby / invalid / interceptWaiting / hint /
  // favor-empty), the button is `disabled` — `:disabled` fires the not-allowed
  // cursor and disables press feedback. Variant classes use compound
  // `.box.invalid` etc. selectors in CSS to win specificity over `.box:disabled`
  // so each non-interactive variant keeps its own colors instead of inheriting
  // the muted disabled defaults.
  return (
    <button
      className={state.className}
      disabled={!state.interactive || buttonDisabled}
      onClick={state.interactive && state.action
        ? () => { haptic('medium'); state.action!() }
        : undefined
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={state.key}
          className={styles.content}
          initial={{ opacity: 0, transform: 'scale(0.96)' }}
          animate={{ opacity: 1, transform: 'scale(1)' }}
          exit={{ opacity: 0, transform: 'scale(0.96)' }}
          transition={MOTION.quickFade}
        >
          {content}
        </m.span>
      </AnimatePresence>
    </button>
  )

  function deriveState(
    cps: CardPlayState, myTurn: boolean, sub: SubPhase | null, pileCount: number,
  ): { key: string; className: string; text: string; interactive: boolean; action?: () => void } {
    // Intercept window takes priority — someone played an action card and a
    // counter-intel window is open. Only render CTA to eligible non-actors.
    // The acting player (myTurn) can't nope their own play.
    if (nopeWindow && !myTurn && isAlive) {
      const urgent = secondsLeft <= 2
      // chainDepth 0 = first Nope, you're cancelling the action.
      // chainDepth > 0 = someone already Noped. Counter-tap flips it back.
      // Different word tells the room which side of the chain you're on.
      const counter = nopeWindow.chainDepth > 0
      const verb = counter ? 'Counter' : 'Intercept'
      if (hasIntercept) {
        return {
          key: counter ? 'counter' : 'intercept',
          className: `${styles.box} ${styles.intercept} ${urgent ? styles.urgent : ''}`,
          text: `${verb} \u00b7 ${secondsLeft}s`,
          interactive: true,
          action: onIntercept,
        }
      }
      return {
        key: counter ? 'counter-waiting' : 'intercept-waiting',
        className: `${styles.box} ${styles.interceptWaiting}`,
        text: `${verb} window \u00b7 ${secondsLeft}s`,
        interactive: false,
      }
    }

    const hasStaged = cps.status === 'selecting' && cps.selectedCardIds.length > 0

    // Favor-target mode — you owe the requester a card. Bypass normal turn /
    // combo logic entirely; the only legal action here is "surrender this".
    // A favor target's hand can never contain Burned (defuse-pending is
    // mutually exclusive with favor-pending), so no "can't surrender Burned"
    // branch is needed.
    if (favorMode) {
      if (!hasStaged || cps.status !== 'selecting') {
        return {
          key: 'favor-empty',
          className: `${styles.box} ${styles.standby}`,
          text: `Stage a card\nto surrender to ${favorMode.requesterName}`,
          interactive: false,
        }
      }
      return {
        key: 'favor-surrender',
        className: `${styles.box} ${styles.action}`,
        text: `Surrender this card\nto ${favorMode.requesterName} \u2192`,
        interactive: true,
        action: onSurrender,
      }
    }

    // No cards staged
    if (!hasStaged) {
      if (myTurn && sub === 'turn-active') {
        const intense = pileCount <= 5
        return {
          key: 'draw',
          className: `${styles.box} ${styles.draw} ${intense ? styles.drawIntense : ''}`,
          text: `End turn\ndraw (${pileCount})`,
          interactive: true,
          action: onDraw,
        }
      }
      return {
        key: myTurn ? 'hint' : 'standby',
        className: `${styles.box} ${styles.standby}`,
        text: myTurn ? 'Double-tap a card to stage it' : 'Stand by, operative',
        interactive: false,
      }
    }

    // Cards staged — validate
    const { validation } = cps

    if (!validation.valid) {
      const label = INVALID_LABELS[validation.reason] ?? 'Invalid selection'
      return {
        key: `invalid-${validation.reason}`,
        className: `${styles.box} ${styles.invalid}`,
        text: label,
        interactive: false,
      }
    }

    const { playType } = validation

    if (playType.kind === 'pair') {
      return {
        key: 'pair',
        className: `${styles.box} ${styles.comboPair}`,
        text: 'Steal a random card \u2192',
        interactive: true,
        action: onConfirmWithTarget,
      }
    }

    if (playType.kind === 'triple') {
      return {
        key: 'triple',
        className: `${styles.box} ${styles.comboTriple}`,
        text: 'Name & steal a specific card \u2192',
        interactive: true,
        action: onConfirmWithTarget,
      }
    }

    // Single card
    const actionText = playType.cardType === 'reassign'
      ? `End turn\nnext player takes ${attackTurns} turns`
      : playType.cardType === 'direct-order'
        ? `End turn\nforce ${attackTurns} turns on someone \u2192`
        : ACTION_TEXT[playType.cardType] ?? 'Play this card'

    if (playType.requiresTarget) {
      return {
        key: `target-${playType.cardType}`,
        className: `${styles.box} ${styles.action}`,
        text: actionText,
        interactive: true,
        action: onConfirmWithTarget,
      }
    }

    return {
      key: `ready-${playType.cardType}`,
      className: `${styles.box} ${styles.action}`,
      text: actionText,
      interactive: true,
      action: onConfirm,
    }
  }
}
