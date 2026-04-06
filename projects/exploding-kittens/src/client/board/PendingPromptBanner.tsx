import { usePendingPrompt, usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import type { BoardPlayer, PendingPromptView } from '@shared/protocol'
import styles from './PendingPromptBanner.module.css'

function nameOf(players: readonly BoardPlayer[], id: string): string {
  return players.find(p => p.id === id)?.name ?? 'Unknown'
}

function getBannerText(prompt: PendingPromptView, players: readonly BoardPlayer[]): string {
  switch (prompt.type) {
    case 'defuse': return `${nameOf(players, prompt.playerId)} is placing the Kitten...`
    case 'favor-response': return `Waiting for ${nameOf(players, prompt.playerId)} to give a card...`
    case 'future-rearrange': return `${nameOf(players, prompt.playerId)} is rearranging the future...`
    case 'steal-target': return `${nameOf(players, prompt.playerId)} is choosing a target...`
    case 'name-card': return `${nameOf(players, prompt.playerId)} is naming a card...`
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
