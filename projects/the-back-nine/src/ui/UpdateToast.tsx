import { useRegisterSW } from 'virtual:pwa-register/react'
import { copy } from './copy'

/**
 * 'Update ready' toast — PWA prompt mode (registerType:'prompt').
 *
 * DEFERRED-SKIPWAITING CONTRACT (U0 ↔ U4). A user-accepted update applies the
 * waiting service worker, which reloads the tab. If a reload lands mid-encrypt-
 * write it can tear an IndexedDB write and strand the survivor's vault — exactly
 * what 'prompt' mode (vs 'autoUpdate') and this gate exist to prevent. So the
 * apply is gated on the store's "no write in flight" signal. The signal INTERFACE
 * is defined here; the real store wiring + its integration test land in P2 with
 * the save flow. In U0 no writes exist, so the stub safely returns true.
 */
function noWriteInFlight(): boolean {
  // P2: replace with the store's real "no write in flight" signal.
  return true
}

export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  const apply = () => {
    if (!noWriteInFlight()) return // never skipWaiting mid-write
    void updateServiceWorker(true)
    setNeedRefresh(false)
  }

  return (
    <div role="status" aria-live="polite">
      <span>{copy.updateReady}</span>
      <button type="button" onClick={apply}>
        {copy.updateReload}
      </button>
      <button type="button" onClick={() => setNeedRefresh(false)}>
        {copy.updateLater}
      </button>
    </div>
  )
}
