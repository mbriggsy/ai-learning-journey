import { usePendingPrompt, usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import { playerName } from './playerName'
import type { BoardPlayer, PendingPromptView } from '@shared/protocol'
import styles from './PendingPromptBanner.module.css'

function getBannerText(prompt: PendingPromptView, players: readonly BoardPlayer[]): string {
  switch (prompt.type) {
    case 'defuse': return `${playerName(players, prompt.playerId)} is hiding the Burned card...`
    case 'favor-response': return `Waiting for ${playerName(players, prompt.playerId)} to give a card...`
    case 'future-rearrange': return `${playerName(players, prompt.playerId)} is rearranging the future...`
    case 'steal-target': return `${playerName(players, prompt.playerId)} is choosing a target...`
    case 'name-card': return `${playerName(players, prompt.playerId)} is naming a card...`
  }
}

export function PendingPromptBanner() {
  const prompt = usePendingPrompt()
  const players = usePlayerList()

  if (!prompt) return null

  return (
    <div className={styles.banner}>
      {getBannerText(prompt, players)}
    </div>
  )
}
