import { useSyncExternalStore } from 'react'
import { gameStore } from '../gameStore'
import type { AccumulatedEvent } from '../gameStore'

export function useEventFeed(): readonly AccumulatedEvent[] {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getAccumulatedEvents)
}
