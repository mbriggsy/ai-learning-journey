import { m } from 'motion/react'
import type { BoardPlayer } from '@shared/protocol'
import { PlayerIcon } from '@client/shared/PlayerIcon'
import styles from './GameOver.module.css'

interface GameOverProps {
  readonly players: readonly BoardPlayer[]
  readonly winnerId: string
  readonly eliminationOrder: readonly string[]
  readonly myPlayerId?: string
  readonly onPlayAgain?: () => void
}

const WINNER_MESSAGES = [
  'survived the kittens!',
  'is the last one standing!',
  'dodged every explosion!',
  'outlasted them all!',
]

function pickMessage(winnerId: string): string {
  let hash = 0
  for (let i = 0; i < winnerId.length; i++) {
    hash = ((hash << 5) - hash + winnerId.charCodeAt(i)) | 0
  }
  return WINNER_MESSAGES[Math.abs(hash) % WINNER_MESSAGES.length]!
}

export function GameOver({ players, winnerId, eliminationOrder, myPlayerId, onPlayAgain }: GameOverProps) {
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
      {/* Winner — dramatic entrance */}
      <m.div
        className={styles.winner}
        initial={{ opacity: 0, scale: 1.4, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
      >
        {winner?.name ?? 'Unknown'}
      </m.div>

      <m.div
        className={styles.subtitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        {myResult?.rank === 1
          ? 'You won!'
          : myResult
            ? `You placed #${myResult.rank} of ${players.length}`
            : pickMessage(winnerId)}
      </m.div>

      {/* Rankings — staggered reveal */}
      <div className={styles.rankings}>
        {rankings.map(({ player, rank }, i) => (
          <m.div
            key={player.id}
            className={styles.rank}
            data-winner={rank === 1 || undefined}
            data-me={player.id === myPlayerId || undefined}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 24,
              delay: 0.8 + i * 0.12,
            }}
          >
            <span className={styles.rankNum}>#{rank}</span>
            <PlayerIcon color={player.color} size={14} />
            <span className={styles.rankName}>{player.name}</span>
          </m.div>
        ))}
      </div>

      {/* Play Again — appears after rankings */}
      {onPlayAgain ? (
        <m.button
          className={styles.playAgain}
          onClick={onPlayAgain}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 250,
            damping: 25,
            delay: 0.8 + rankings.length * 0.12 + 0.3,
          }}
        >
          Run It Back
        </m.button>
      ) : myPlayerId ? (
        <m.div
          className={styles.waiting}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          Waiting for host...
        </m.div>
      ) : null}
    </div>
  )
}
