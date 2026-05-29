import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import type { BoardPlayer } from '@shared/protocol'
import { PlayerIcon } from '@client/shared/PlayerIcon'
import { pick } from '@client/shared/pick'
import { WINNER_MESSAGES } from '@client/shared/GameOver'
// Real game UI, borrowed across the wall — the SAME CSS module + token legend
// the live GameOver screen uses, so this is pixel-identical to the product:
import styles from '@client/shared/GameOver.module.css'
import '@client/shared/tokens/primitives.css'
import '@client/shared/tokens/semantic.css'

/**
 * WINNER SCENE (plan-B payoff proof, 2026-05-29).
 *
 * GameOver itself uses Framer `m`, which captures at its hidden `initial` state
 * under Remotion's single-frame model (verified: only the non-motion chrome
 * rendered). DOCTRINE: borrow the INERT real UI (this CSS module, PlayerIcon,
 * the winner-message pool, tokens) and reconstruct the animated shell with
 * plain divs, letting REMOTION drive the entrance off useCurrentFrame. Same
 * pixels as the product; fully frame-deterministic. Every Framer-coupled
 * payoff piece (Hand, board) follows this same pattern.
 */

const PLAYERS: readonly BoardPlayer[] = [
  { id: 'p1', name: 'Dash', color: '#FE6100', cardCount: 4, isAlive: true, isConnected: true },
  { id: 'p2', name: 'Vera', color: '#648FFF', cardCount: 0, isAlive: false, isConnected: true },
  { id: 'p3', name: 'Otto', color: '#FFB000', cardCount: 0, isAlive: false, isConnected: true },
  { id: 'p4', name: 'Janet', color: '#DC267F', cardCount: 0, isAlive: false, isConnected: false },
  { id: 'p5', name: 'Neal', color: '#785EF0', cardCount: 0, isAlive: false, isConnected: true },
]
const WINNER_ID = 'p1'
const ELIM_ORDER = ['p2', 'p3', 'p5', 'p4'] // last eliminated = 2nd place

export const WINNER_PROOF_FRAMES = 120

export const WinnerProof: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Remotion-driven staggered entrance (mirrors GameOver's Framer timing,
  // converted to frames at this fps): header → winner → subtitle → ranks.
  const entrance = (delaySec: number, fromY = 12) => {
    const s = spring({
      frame: frame - Math.round(delaySec * fps),
      fps,
      config: { damping: 18, stiffness: 120, mass: 0.6 },
    })
    return {
      opacity: interpolate(s, [0, 1], [0, 1]),
      transform: `translateY(${interpolate(s, [0, 1], [fromY, 0])}px)`,
    }
  }

  const winner = PLAYERS.find((p) => p.id === WINNER_ID)!
  const rankings = [
    { player: winner, rank: 1 },
    ...[...ELIM_ORDER].reverse().map((id, i) => ({
      player: PLAYERS.find((p) => p.id === id)!,
      rank: i + 2,
    })),
  ]

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(120% 90% at 50% 40%, #163338 0%, #0c2024 55%, #08181a 100%)' }}>
      <div className={styles.container}>
        <header className={styles.caseClosedBar} style={entrance(0.05, -12)}>
          <span className={styles.caseClosedLabel}>// Case 47-B · Closed</span>
          <span className={styles.classifiedTag}>[ Classified ]</span>
        </header>

        <div className={styles.winner} style={entrance(0.2, -20)}>
          <span className={styles.winnerName}>{winner.name}</span>
          <span className={styles.winnerStatus}>// Operative Status: Survived</span>
        </div>

        <div className={styles.subtitle} style={entrance(0.6)}>
          {pick(WINNER_MESSAGES, WINNER_ID)}
        </div>

        <div className={styles.rankings}>
          {rankings.map(({ player, rank }, i) => (
            <div
              key={player.id}
              className={styles.rank}
              data-winner={rank === 1 || undefined}
              style={entrance(0.8 + i * 0.08)}
            >
              <span className={styles.rankNum}>#{rank}</span>
              <PlayerIcon color={player.color} size={14} />
              <span className={styles.rankName}>{player.name}</span>
              <span className={styles.rankStatus}>{rank === 1 ? 'Survived' : 'Eliminated'}</span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  )
}
