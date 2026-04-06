import type { BoardPlayer } from '@shared/protocol'
import styles from './GameOver.module.css'

interface GameOverProps {
  readonly players: readonly BoardPlayer[]
  readonly winnerId: string
  readonly eliminationOrder: readonly string[]
  readonly myPlayerId?: string
}

export function GameOver({ players, winnerId, eliminationOrder, myPlayerId }: GameOverProps) {
  const winner = players.find(p => p.id === winnerId)

  // Build ranking: winner first, then eliminated in reverse order (last eliminated = 2nd place)
  const rankings: { player: BoardPlayer; rank: number }[] = []
  if (winner) rankings.push({ player: winner, rank: 1 })

  for (let i = eliminationOrder.length - 1; i >= 0; i--) {
    const p = players.find(pl => pl.id === eliminationOrder[i])
    if (p) rankings.push({ player: p, rank: rankings.length + 1 })
  }

  const myResult = myPlayerId
    ? rankings.find(r => r.player.id === myPlayerId)
    : null

  return (
    <div className={styles.container}>
      <div className={styles.winner}>{winner?.name ?? 'Unknown'} Wins!</div>
      {myResult && (
        <div className={styles.subtitle}>
          {myResult.rank === 1
            ? 'You won!'
            : `You placed #${myResult.rank} of ${players.length}`}
        </div>
      )}

      <div className={styles.rankings}>
        {rankings.map(({ player, rank }) => (
          <div
            key={player.id}
            className={styles.rank}
            data-winner={rank === 1 || undefined}
            data-me={player.id === myPlayerId || undefined}
          >
            <span className={styles.rankNum}>#{rank}</span>
            <span className={styles.dot} style={{ backgroundColor: player.color }} />
            <span className={styles.rankName}>{player.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
