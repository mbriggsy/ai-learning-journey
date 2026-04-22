import { m } from 'motion/react'
import { MOTION } from '@client/shared/tokens/motion'
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
  'survived the agency!',
  'is the last one standing!',
  'never got burned!',
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
        // Transform string — winner reveal is a dramatic moment and must stay
        // smooth even while confetti / rankings animate in parallel.
        initial={{ opacity: 0, transform: 'translateY(-20px) scale(1.4)' }}
        animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
        transition={{ ...MOTION.gentle, delay: 0.2 }}
      >
        {winner?.name ?? 'Unknown'}
      </m.div>

      <m.div
        className={styles.subtitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...MOTION.enter, delay: 0.6 }}
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
            // Transform string keeps the staggered ranking reveal smooth even
            // if the browser is still painting the winner drama above.
            // Stagger 80ms — top of Emil's 30-80ms window. 120ms was above
            // range and blew out total ceremony time at 10-player count.
            initial={{ opacity: 0, transform: 'translateX(-30px)' }}
            animate={{ opacity: 1, transform: 'translateX(0px)' }}
            transition={{ ...MOTION.snappy, delay: 0.8 + i * 0.08 }}
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
          // Transform string — button appears last after the staggered rankings.
          initial={{ opacity: 0, transform: 'translateY(20px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{
            ...MOTION.deliberate,
            // Tracks the rankings stagger above (80ms/row) + 0.3s pause.
            delay: 0.8 + rankings.length * 0.08 + 0.3,
          }}
        >
          Run It Back
        </m.button>
      ) : myPlayerId ? (
        <m.div
          className={styles.waiting}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...MOTION.enter, delay: 1.5 }}
        >
          Stand by for next briefing&hellip;
        </m.div>
      ) : null}
    </div>
  )
}
