import { useState } from 'react'
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
  const [submitted, setSubmitted] = useState(false)
  return (
    <div>
      <div className={styles.sheetTitle}>Name a card to steal from {targetName}</div>
      <div className={styles.sheetSubtitle}>One tap — choose wisely</div>
      <div className={styles.cardGrid}>
        {ALL_NAMEABLE.map(def => (
          <button
            key={def.type}
            className={styles.optionBtn}
            onClick={() => { if (!submitted) { setSubmitted(true); onNameCard(def.type as CardType) } }}
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
          onClick={() => { if (!submitted) { setSubmitted(true); onCancel() } }}
          disabled={submitted}
        >
          Call off the raid
        </button>
      )}
    </div>
  )
}
