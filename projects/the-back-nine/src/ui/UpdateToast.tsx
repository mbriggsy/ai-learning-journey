import { useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { copy } from './copy'
import { readyToApplyUpdate } from './updateGate'

/**
 * 'Update ready' toast — PWA prompt mode (registerType:'prompt').
 *
 * DEFERRED-SKIPWAITING CONTRACT (U0 ↔ U8). Accepting an update applies the waiting service
 * worker, which reloads the tab. A reload that lands mid-vault-WRITE must never fire — so
 * apply() consults the store's real write-in-flight signal via {@link readyToApplyUpdate}
 * (the U0 `noWriteInFlight` stub is retired; the decision lives in that pure, tested seam).
 * The vault session is DYNAMICALLY imported inside apply() — on the user's click — so the
 * crypto/store chain stays OUT of the entry bundle (this toast renders on every page; a
 * static import would pull ~21 KiB of vault code into entry for a rarely-clicked control),
 * and the DB is never opened at render for a user who never saves.
 *
 * The seam decides BOTH clauses: the write-transaction floor ("never skipWaiting mid-write")
 * AND the Fork B save-ceremony hold (commit → mandatory export, where no write is in flight —
 * SaveFlow raises `holdUpdateApply` across securing+export and the gate refuses while it's
 * open). This component stays dumb wiring either way: a false gate leaves the prompt up.
 */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  // Guards the async defer window: a second click while we're awaiting the write tail must
  // not fire a second skipWaiting. A ref (not state) — it must survive across the await
  // without its own re-render, and it is reset if we end up deferring.
  const applyingRef = useRef(false)

  const apply = (): void => {
    if (applyingRef.current) return
    applyingRef.current = true
    void (async () => {
      try {
        const { getVaultSession } = await import('./vaultSession')
        const session = await getVaultSession()
        if (await readyToApplyUpdate(session)) {
          setNeedRefresh(false)
          void updateServiceWorker(true)
        } else {
          // A write is still in flight OR the Save ceremony is mid commit→export — leave the
          // prompt up; the user re-clicks once the ceremony (or write) is done.
          applyingRef.current = false
        }
      } catch {
        applyingRef.current = false // reaching the session must never brick the prompt
      }
    })()
  }

  // The live region is ALWAYS mounted (empty when idle) so the 'update ready' content is
  // ANNOUNCED when it appears — a region that first mounts already-populated may not fire
  // (burned/045; one polite region). Its visible box-reserve + calm positioning is the U8
  // SLICE-2 CSS pass (design loadout + Briggsy's eye), not a blind style guess here.
  return (
    <div className="update-toast" role="status" aria-live="polite">
      {needRefresh && (
        <>
          <span>{copy.updateReady}</span>
          <button type="button" onClick={apply}>
            {copy.updateReload}
          </button>
          <button type="button" onClick={() => setNeedRefresh(false)}>
            {copy.updateLater}
          </button>
        </>
      )}
    </div>
  )
}
