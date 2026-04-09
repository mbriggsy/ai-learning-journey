import { usePlayerList, useCurrentTurn, usePendingPrompt } from '@client/shared/hooks/useSharedSelectors'
import { playerName } from './playerName'
import type { BoardPlayer, PendingPromptView } from '@shared/protocol'
import { PlayerIcon } from '@client/shared/PlayerIcon'
import styles from './StatusBar.module.css'

function getStatusText(
  currentTurn: { currentPlayerId: string; turnsRemaining: number } | null,
  prompt: PendingPromptView | null,
  players: readonly BoardPlayer[],
): string {
  // Pending prompt takes priority
  if (prompt) {
    const name = playerName(players, prompt.playerId)
    switch (prompt.type) {
      case 'defuse': return `${name} is placing the Burned card...`
      case 'favor-response': return `Waiting on ${name} to give a card`
      case 'future-rearrange': return `${name} is rearranging the future`
      case 'steal-target': return `${name} is choosing a target`
      case 'name-card': return `${name} is naming a card`
    }
  }

  if (currentTurn) {
    const name = playerName(players, currentTurn.currentPlayerId)
    const extra = currentTurn.turnsRemaining > 1
      ? ` (${currentTurn.turnsRemaining} turns)`
      : ''
    return `Waiting on ${name}${extra}`
  }

  return ''
}

export function StatusBar() {
  const players = usePlayerList()
  const currentTurn = useCurrentTurn()
  const prompt = usePendingPrompt()

  const text = getStatusText(currentTurn, prompt, players)
  if (!text) return null

  // Find the active player's color for the accent
  const activeColor = currentTurn
    ? players.find(p => p.id === currentTurn.currentPlayerId)?.color
    : undefined

  return (
    <div className={styles.bar}>
      {activeColor && (
        <PlayerIcon color={activeColor} size={14} />
      )}
      <span className={styles.text}>{text}</span>
    </div>
  )
}
