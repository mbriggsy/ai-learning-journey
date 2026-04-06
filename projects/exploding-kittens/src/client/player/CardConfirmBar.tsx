import type { CardPlayState } from './hooks/useCardPlay'
import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import styles from './CardConfirmBar.module.css'

interface CardConfirmBarProps {
  readonly state: CardPlayState
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

function getConfirmLabel(state: CardPlayState): string {
  if (state.status !== 'selecting' || !state.validation.valid) return 'Select cards'
  const pt = state.validation.playType
  switch (pt.kind) {
    case 'single': return `Play ${CARD_DEF_BY_TYPE[pt.cardType].name}`
    case 'pair': return 'Play Pair — Steal random card'
    case 'triple': return 'Play Triple — Name a card'
  }
}

export function CardConfirmBar({ state, onConfirm, onCancel }: CardConfirmBarProps) {
  if (state.status === 'idle') return null

  const isValid = state.status === 'selecting' && state.validation.valid
  const needsTarget = isValid && state.validation.valid &&
    state.validation.playType.kind === 'single' && state.validation.playType.requiresTarget

  return (
    <div className={styles.bar}>
      <button
        className={styles.confirmBtn}
        disabled={!isValid}
        onClick={onConfirm}
      >
        {needsTarget ? `${getConfirmLabel(state)} →` : getConfirmLabel(state)}
      </button>
      <button className={styles.cancelBtn} onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
