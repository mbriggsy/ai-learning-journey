import type { CardPlayState } from './hooks/useCardPlay'
import { CARD_DEF_BY_TYPE } from '@shared/card-defs'
import { haptic } from '@client/shared/haptics'
import styles from './CardConfirmBar.module.css'

function getConfirmLabel(state: CardPlayState): string {
  if (state.status !== 'selecting' || !state.validation.valid) return 'Select cards'
  const pt = state.validation.playType
  switch (pt.kind) {
    case 'single': return `Play ${CARD_DEF_BY_TYPE[pt.cardType].name}`
    case 'pair': return 'Play Pair — Steal random card'
    case 'triple': return 'Play Triple — Name a card'
  }
}

function getDescription(state: CardPlayState): string | null {
  if (state.status !== 'selecting' || !state.validation.valid) return null
  const pt = state.validation.playType
  switch (pt.kind) {
    case 'single': return CARD_DEF_BY_TYPE[pt.cardType].description
    case 'pair': return 'Take a random card from the target player.'
    case 'triple': return 'Name a card type — if target has it, steal it.'
  }
}

interface CardConfirmBarProps {
  readonly state: CardPlayState
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export function CardConfirmBar({ state, onConfirm, onCancel }: CardConfirmBarProps) {
  if (state.status === 'idle') return null

  const isValid = state.status === 'selecting' && state.validation.valid
  const needsTarget = isValid && state.validation.valid &&
    state.validation.playType.kind === 'single' && state.validation.playType.requiresTarget
  const description = getDescription(state)

  return (
    <div className={styles.bar}>
      {description && <div className={styles.description}>{description}</div>}
      <div className={styles.actions}>
        <button
          className={styles.confirmBtn}
          disabled={!isValid}
          onClick={() => {
            haptic('light')
            onConfirm()
          }}
        >
          {needsTarget ? `${getConfirmLabel(state)} →` : getConfirmLabel(state)}
        </button>
        <button className={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
