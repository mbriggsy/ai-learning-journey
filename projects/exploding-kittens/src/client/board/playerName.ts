import type { BoardPlayer } from '@shared/protocol'

export function playerName(players: readonly BoardPlayer[], id: string): string {
  return players.find(p => p.id === id)?.name ?? 'Unknown'
}
