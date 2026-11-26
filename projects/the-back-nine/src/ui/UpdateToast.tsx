import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { entryCopy } from './entryCopy'
import { readyToApplyUpdate } from './updateGate'
import { ToastProvider, useToast } from './kit/Toast'

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
 *
 * Act 6 · RC19: drawn on the kit's Toast (Base UI's Toast under the app's `CSPProvider disableStyleElements`: no runtime
 * `<style>`, no style attribute string). The toast stays until a press (`timeout: 0`); its action is "Refresh now" (the
 * same `apply`, the same gate, insight 112: the leave-page guard's hold still stands before every reload this can
 * cause); its dismiss is "Later", and a swipe away is "Later" too (`onClose`). The stack's region is always mounted
 * (Base UI's viewport, a polite live region), so the prompt is announced when it lands (burned/045).
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
  // A refused tap SAYS so (2026-09-03): the gate now also holds across the whole unsaved-work
  // window (unloadGuard.ts), which can be a long intake — a live-looking "Refresh now" that does
  // nothing and says nothing is the silent dead-button shape the account form was just cured of.
  // The held line replaces the ready line until the next tap; "Later" resets it with the prompt.
  const [held, setHeld] = useState(false)

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
          // A write is still in flight, the Save ceremony is mid commit→export, OR typed work is
          // unsaved (the leave-page guard is armed) — leave the prompt up, say why, and let the
          // user re-tap once it is saved.
          setHeld(true)
          applyingRef.current = false
        }
      } catch {
        applyingRef.current = false // reaching the session must never brick the prompt
      }
    })()
  }

  const later = (): void => {
    setHeld(false)
    setNeedRefresh(false)
  }

  return (
    <ToastProvider dismissLabel={entryCopy.updateLater} regionLabel={entryCopy.updateRegionLabel}>
      <UpdatePrompt open={needRefresh} text={held ? entryCopy.updateHeld : entryCopy.updateReady} onApply={apply} onLater={later} />
    </ToastProvider>
  )
}

/** Shows the one update toast while `open`, keeps its words current, and closes it when the prompt goes. */
function UpdatePrompt({
  open,
  text,
  onApply,
  onLater,
}: {
  readonly open: boolean
  readonly text: string
  readonly onApply: () => void
  readonly onLater: () => void
}) {
  const toast = useToast()
  const idRef = useRef<string | null>(null)
  // The latest handlers, read at the press (the toast object holds the closures it was shown with).
  const handlers = useRef({ onApply, onLater })
  handlers.current = { onApply, onLater }

  useEffect(() => {
    if (open && idRef.current === null) {
      idRef.current = toast.show({
        id: 'b9-update',
        title: text,
        timeout: 0,
        action: { label: entryCopy.updateReload, onSelect: () => handlers.current.onApply() },
        // Every way the toast closes that is not the prompt going away (the dismiss, a swipe) is "Later".
        onClose: () => {
          if (idRef.current === null) return
          idRef.current = null
          handlers.current.onLater()
        },
      })
    } else if (!open && idRef.current !== null) {
      const id = idRef.current
      idRef.current = null
      toast.close(id)
    }
    // `text` is read only when the toast is first shown; the effect below keeps it current.
  }, [open])

  useEffect(() => {
    if (idRef.current !== null) toast.update(idRef.current, { title: text })
  }, [text])

  return null
}
