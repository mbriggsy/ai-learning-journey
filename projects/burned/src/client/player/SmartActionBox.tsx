import { useState, useEffect } from 'react'
import { m, AnimatePresence } from 'motion/react'
import type { CardPlayState } from './hooks/useCardPlay'
import type { CardType, SubPhase } from '@shared/types'
import type { NopeWindowView } from '@shared/protocol'
import { haptic } from '@client/shared/haptics'
import { MOTION } from '@client/shared/tokens/motion'
import styles from './SmartActionBox.module.css'

/** Human-readable action text for the smart action box */
const ACTION_TEXT: Partial<Record<CardType, string>> = {
  'go-dark': 'End turn \u2014 skip drawing',
  'intel-briefing': 'Peek at the top 3 cards',
  'falsify-intel': 'View and rearrange top 3 cards',
  'reassign': 'End turn \u2014 next player draws twice',
  'burn-the-files': 'Shuffle the draw pile',
  'back-channel': 'End turn \u2014 draw from bottom',
  'direct-order': 'End turn \u2014 force someone to draw \u2192',
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
  readonly onConfirm: () => void
  readonly onConfirmWithTarget: () => void
  readonly onDraw: () => void
  readonly onIntercept: () => void
}

export function SmartActionBox({
  cardPlayState, isMyTurn, subPhase, drawPileCount,
  disabled, optimisticPending,
  nopeWindow, hasIntercept, isAlive,
  onConfirm, onConfirmWithTarget, onDraw, onIntercept,
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

  const state = deriveState(cardPlayState, isMyTurn, subPhase, drawPileCount)

  // Intercept is always interactive during the nope window — the outer
  // `disabled` prop (driven by permission.allowed) correctly blocks normal
  // card actions when it's not your turn, but nope-ing IS the legal action
  // for non-actors, so intercept must bypass it.
  const isIntercept = state.key === 'intercept'
  const buttonDisabled = isIntercept ? optimisticPending : (disabled || optimisticPending)

  return (
    <AnimatePresence mode="wait">
      {state.interactive ? (
        <m.button
          key={state.key}
          className={state.className}
          disabled={buttonDisabled}
          onClick={() => { haptic('medium'); state.action!() }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={MOTION.quickFade}
        >
          {state.text}
        </m.button>
      ) : (
        <m.div
          key={state.key}
          className={state.className}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={MOTION.quickFade}
        >
          {state.text}
        </m.div>
      )}
    </AnimatePresence>
  )

  function deriveState(
    cps: CardPlayState, myTurn: boolean, sub: SubPhase | null, pileCount: number,
  ): { key: string; className: string; text: string; interactive: boolean; action?: () => void } {
    // Intercept window takes priority — someone played an action card and a
    // counter-intel window is open. Only render CTA to eligible non-actors.
    // The acting player (myTurn) can't nope their own play.
    if (nopeWindow && !myTurn && isAlive) {
      const urgent = secondsLeft <= 2
      if (hasIntercept) {
        return {
          key: 'intercept',
          className: `${styles.box} ${styles.intercept} ${urgent ? styles.urgent : ''}`,
          text: `Intercept \u00b7 ${secondsLeft}s`,
          interactive: true,
          action: onIntercept,
        }
      }
      return {
        key: 'intercept-waiting',
        className: `${styles.box} ${styles.interceptWaiting}`,
        text: `Intercept window \u00b7 ${secondsLeft}s`,
        interactive: false,
      }
    }

    const hasStaged = cps.status === 'selecting' && cps.selectedCardIds.length > 0

    // No cards staged
    if (!hasStaged) {
      if (myTurn && sub === 'turn-active') {
        const intense = pileCount <= 5
        return {
          key: 'draw',
          className: `${styles.box} ${styles.draw} ${intense ? styles.drawIntense : ''}`,
          text: `End turn \u2014 draw (${pileCount})`,
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
    const actionText = ACTION_TEXT[playType.cardType] ?? 'Play this card'

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
