import type { BoardPlayer } from '@shared/protocol'
import styles from './PlayerList.module.css'

interface PlayerListProps {
  readonly players: readonly BoardPlayer[]
  readonly currentPlayerId: string | null
}

export function PlayerList({ players, currentPlayerId }: PlayerListProps) {
  return (
    <div className={styles.list}>
      {players.map(p => (
        <div
          key={p.id}
          className={styles.player}
          data-active={p.id === currentPlayerId || undefined}
          data-eliminated={!p.isAlive || undefined}
        >
          <span className={styles.dot} style={{ backgroundColor: p.color }} />
          <span>{p.name}</span>
          {p.isAlive && <span className={styles.count}>{p.cardCount}</span>}
        </div>
      ))}
    </div>
  )
}
