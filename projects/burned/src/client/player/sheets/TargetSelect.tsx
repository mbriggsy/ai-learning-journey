import { useRef, useState } from 'react'
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
  // Sync ref guard alongside the state-driven `disabled` prop. Both
  // tracks: target-select and cancel route through the same lock
  // because either one is a terminal action for this sheet. Same
  // race-class fix as B-17 / D-04.
  const submittedRef = useRef(false)
  const guard = (run: () => void) => () => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitted(true)
    run()
  }
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
            onClick={guard(() => onSelectTarget(p.id))}
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
          onClick={guard(onCancel)}
          disabled={submitted}
        >
          Cancel
        </button>
      )}
    </div>
  )
}
