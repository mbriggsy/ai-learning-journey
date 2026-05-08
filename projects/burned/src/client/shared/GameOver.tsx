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
      {/* Case Closed header strip — frames the entire screen as an
          after-action report. Mirrors the JoinScreen / case-banner /
          dossier vocabulary so the climax slots into the agency layer
          rather than reading as an out-of-universe game-over screen.
          E2E audit C-17. */}
      <m.header
        className={styles.caseClosedBar}
        initial={{ opacity: 0, transform: 'translateY(-12px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ ...MOTION.enter, delay: 0.05 }}
      >
        <span className={styles.caseClosedLabel}>// Case 47-B · Closed</span>
        <span className={styles.classifiedTag}>[ Classified ]</span>
      </m.header>

      {/* Winner — dramatic entrance. NAME huge + agency-status caption
          beneath so the hero reads as a closed-case verdict, not a
          context-free name floating alone. */}
      <m.div
        className={styles.winner}
        // Transform string — winner reveal is a dramatic moment and must stay
        // smooth even while confetti / rankings animate in parallel.
        initial={{ opacity: 0, transform: 'translateY(-20px) scale(1.4)' }}
        animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
        transition={{ ...MOTION.gentle, delay: 0.2 }}
      >
        <span className={styles.winnerName}>{winner?.name ?? 'Unknown'}</span>
        <span className={styles.winnerStatus}>// Operative Status: Survived</span>
      </m.div>

      <m.div
        className={styles.subtitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...MOTION.enter, delay: 0.6 }}
      >
        {myResult?.rank === 1
          ? 'You closed the case.'
          : myResult
            ? `You placed #${myResult.rank} of ${players.length}`
            : pickMessage(winnerId)}
      </m.div>

      {/* Rankings — staggered reveal. Each row carries a status tag
          (SURVIVED / ELIMINATED) so the roster reads as an after-action
          report on the operatives, not just a numbered list. */}
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
            <span className={styles.rankStatus}>
              {rank === 1 ? 'Survived' : 'Eliminated'}
            </span>
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
          // New Case
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
