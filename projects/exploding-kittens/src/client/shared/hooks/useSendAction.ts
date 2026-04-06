import { useCallback } from 'react'
import { send } from '@client/connection'
import { gameStore } from '@client/shared/gameStore'
import type { ClientGameAction } from '@shared/actions'

export function useSendAction(): (action: ClientGameAction) => void {
  return useCallback((action: ClientGameAction) => {
    // Read stateVersion at SEND-TIME, not at render-time
    const snapshot = gameStore.getSnapshot()
    const stateVersion = (snapshot && snapshot.phase !== 'lobby')
      ? snapshot.stateVersion
      : 0

    send({
      type: 'action',
      payload: { ...action, stateVersion },
    })
  }, [])
}
