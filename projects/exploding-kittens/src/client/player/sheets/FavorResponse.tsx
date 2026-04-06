import { useState } from 'react'
import type { CardInstance } from '@shared/types'
import { MinimalCard } from '@client/shared/MinimalCard'
import styles from './sheets.module.css'

interface FavorResponseProps {
  readonly requesterName: string
  readonly hand: readonly CardInstance[]
  readonly onGiveCard: (cardId: string) => void
}

export function FavorResponse({ requesterName, hand, onGiveCard }: FavorResponseProps) {
  const [submitted, setSubmitted] = useState(false)
  // Filter out Exploding Kittens — cannot be gifted
  const eligible = hand.filter(c => c.type !== 'exploding-kitten')

  if (eligible.length === 0) {
    return (
      <div>
        <div className={styles.sheetTitle}>Favor</div>
        <div className={styles.sheetSubtitle}>No eligible cards to give.</div>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.sheetTitle}>{requesterName} demands a card</div>
      <div className={styles.sheetSubtitle}>Tap a card to give away</div>
      <div className={styles.optionList}>
        {eligible.map(card => (
          <button key={card.id} onClick={() => { if (!submitted) { setSubmitted(true); onGiveCard(card.id) } }} className={styles.optionBtn} disabled={submitted}>
            <MinimalCard type={card.type} />
          </button>
        ))}
      </div>
    </div>
  )
}
