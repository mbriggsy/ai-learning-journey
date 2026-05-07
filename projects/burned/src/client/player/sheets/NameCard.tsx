import { useRef, useState } from 'react'
import { CARD_DEFS } from '@shared/card-defs'
import type { CardType } from '@shared/types'
import styles from './sheets.module.css'

interface NameCardProps {
  readonly targetName: string
  readonly onNameCard: (cardType: CardType) => void
  readonly onCancel?: () => void
}

// Group cards by category for easier selection
const OPERATIVE_CARDS = CARD_DEFS.filter(d => d.category === 'operative')
const ACTION_CARDS = CARD_DEFS.filter(d => d.category === 'action')
const SPECIAL_CARDS = CARD_DEFS.filter(d => d.category === 'wild' || d.category === 'extraction')
// Exclude Burned cards — can't be in a player's hand
const ALL_NAMEABLE = [...OPERATIVE_CARDS, ...ACTION_CARDS, ...SPECIAL_CARDS]

export function NameCard({ targetName, onNameCard, onCancel }: NameCardProps) {
  // Two-track guard: the ref blocks rapid double-taps within a single
  // event tick (React hasn't re-rendered yet, so the closure's `submitted`
  // is still false, and `disabled={submitted}` hasn't applied). The state
  // is what actually disables the button after re-render. B-17.
  const submittedRef = useRef(false)
  const [submitted, setSubmitted] = useState(false)
  const guard = (run: () => void) => () => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitted(true)
    run()
  }
  return (
    <div>
      <div className={styles.sheetTitle}>Name a card to steal from {targetName}</div>
      <div className={styles.sheetSubtitle}>One tap — choose wisely</div>
      <div className={styles.cardGrid}>
        {ALL_NAMEABLE.map(def => (
          <button
            key={def.type}
            className={styles.optionBtn}
            onClick={guard(() => onNameCard(def.type as CardType))}
            disabled={submitted}
            style={{ justifyContent: 'center' }}
          >
            {def.name}
          </button>
        ))}
      </div>
      {onCancel && (
        <button
          className={styles.cancelBtn}
          onClick={guard(onCancel)}
          disabled={submitted}
        >
          Call off the raid
        </button>
      )}
    </div>
  )
}
