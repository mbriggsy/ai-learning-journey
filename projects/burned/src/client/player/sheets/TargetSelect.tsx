import { useState } from 'react'
import type { BoardPlayer } from '@shared/protocol'
import { PlayerIcon } from '@client/shared/PlayerIcon'
import styles from './sheets.module.css'

interface TargetSelectProps {
  readonly eligiblePlayers: readonly BoardPlayer[]
  readonly onSelectTarget: (playerId: string) => void
  readonly onCancel?: () => void
  readonly title?: string
}

export function TargetSelect({ eligiblePlayers, onSelectTarget, onCancel, title }: TargetSelectProps) {
  const [submitted, setSubmitted] = useState(false)
  return (
    <div>
      <div className={styles.sheetTitle}>{title ?? 'Choose a target'}</div>
      <div className={styles.optionList}>
        {eligiblePlayers.map((p, i) => (
          <button
            key={p.id}
            className={styles.optionBtn}
            // 40ms cascade per button lands inside Emil's 30-80ms stagger
            // range. Max 9 buttons (10-player game minus self) = 360ms
            // total reveal, tolerable on top of the sheet slide-up.
            style={{ animationDelay: `${i * 40}ms` }}
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
      {onCancel && (
        <button
          className={styles.cancelBtn}
          onClick={() => { if (!submitted) onCancel() }}
          disabled={submitted}
        >
          Cancel
        </button>
      )}
    </div>
  )
}
