import { useState } from 'react'
import { CARD_DEFS } from '@shared/card-defs'
import type { CardType } from '@shared/types'
import styles from './sheets.module.css'

interface NameCardProps {
  readonly targetName: string
  readonly onNameCard: (cardType: CardType) => void
}

// Group cards by category for easier selection
const CAT_CARDS = CARD_DEFS.filter(d => d.category === 'cat')
const ACTION_CARDS = CARD_DEFS.filter(d => d.category === 'action')
const SPECIAL_CARDS = CARD_DEFS.filter(d => d.category === 'wild' || d.category === 'defuse')
// Exclude Exploding Kittens — can't be in a player's hand
const ALL_NAMEABLE = [...CAT_CARDS, ...ACTION_CARDS, ...SPECIAL_CARDS]

export function NameCard({ targetName, onNameCard }: NameCardProps) {
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
    </div>
  )
}
