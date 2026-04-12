import { useState } from 'react'
import type { BoardPlayer } from '@shared/protocol'
import { PlayerIcon } from '@client/shared/PlayerIcon'
import styles from './sheets.module.css'

interface TargetSelectProps {
  readonly eligiblePlayers: readonly BoardPlayer[]
  readonly onSelectTarget: (playerId: string) => void
  readonly title?: string
}

export function TargetSelect({ eligiblePlayers, onSelectTarget, title }: TargetSelectProps) {
  const [submitted, setSubmitted] = useState(false)
  return (
    <div>
      <div className={styles.sheetTitle}>{title ?? 'Choose a target'}</div>
      <div className={styles.optionList}>
        {eligiblePlayers.map(p => (
          <button
            key={p.id}
            className={styles.optionBtn}
            onClick={() => { if (!submitted) { setSubmitted(true); onSelectTarget(p.id) } }}
            disabled={submitted}
          >
            <PlayerIcon color={p.color} size={16} />
            <span>{p.name}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--color-fg-secondary)', fontSize: 'var(--text-caption)' }}>
              {p.cardCount} cards
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
