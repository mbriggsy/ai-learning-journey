import { useGameSelector } from '@client/shared/gameStore'
import type { ViewState } from '@client/shared/gameStore'
import type { BoardPlayer, PlayerView, PlayingPlayerView, PrivateData } from '@shared/protocol'
import type { CardInstance, SubPhase } from '@shared/types'
import { useSyncExternalStore } from 'react'
import { gameStore } from '@client/shared/gameStore'

const EMPTY_HAND: readonly CardInstance[] = []
const EMPTY_PRIVATE: PrivateData = {}

function isPlayerView(s: ViewState | null): s is PlayerView {
  return s !== null && s.phase !== 'lobby' && 'myPlayerId' in s
}

function isPlayingPlayerView(s: ViewState | null): s is PlayingPlayerView {
  return isPlayerView(s) && s.phase === 'playing'
}

export function useHand(): readonly CardInstance[] {
  return useGameSelector(s => {
    if (!isPlayerView(s)) return EMPTY_HAND
    return s.myHand
  })
}

export function useIsMyTurn(): boolean {
  return useGameSelector(s => {
    if (!isPlayingPlayerView(s)) return false
    return s.isMyTurn
  })
}

export function useSubPhase(): SubPhase | null {
  return useGameSelector(s => {
    if (!isPlayingPlayerView(s)) return null
    return s.subPhase
  })
}

export function useMyPlayerId(): string | null {
  return useGameSelector(s => {
    if (!isPlayerView(s)) return null
    return s.myPlayerId
  })
}

export function useMyPlayer(): BoardPlayer | null {
  return useGameSelector(s => {
    if (!isPlayerView(s)) return null
    return s.players.find(p => p.id === s.myPlayerId) ?? null
  })
}

export function usePrivateData(): PrivateData {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getPrivateData) ?? EMPTY_PRIVATE
}
