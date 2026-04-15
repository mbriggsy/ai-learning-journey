import { usePendingPrompt, usePlayerList } from '@client/shared/hooks/useSharedSelectors'
import { playerName } from './playerName'
import type { BoardPlayer, PendingPromptView } from '@shared/protocol'
import styles from './PendingPromptBanner.module.css'

function getBannerText(prompt: PendingPromptView, players: readonly BoardPlayer[]): string {
  const name = playerName(players, prompt.playerId)
  switch (prompt.type) {
    case 'defuse': return `${name} is reinserting the Burned file\u2026`
    case 'favor-response': return `${name} is handing over a card\u2026`
    case 'future-rearrange': return `${name} is rearranging the intel\u2026`
    case 'steal-target': return `${name} is picking a mark\u2026`
    case 'name-card': return `${name} is calling the shot\u2026`
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
