/**
 * THE LEAVE-PAGE GUARD — the one hook behind both `beforeunload` registrations in the repo
 * (IntakeApp's unsaved-work guard and SaveFlow's export-step guard), so the two facts an armed
 * guard implies can never diverge:
 *
 *  1. the browser's own leave-page dialog is armed (a reload / tab close / navigation asks first);
 *  2. the PWA update-apply gate is HELD (updateGate.ts clause 2) for exactly the same window.
 *
 * Why (2) is not optional (the 2026-09-03 unit review, four lenses converged): in prompt mode
 * "Refresh now" sends skipWaiting FIRST and the reload arrives LATER from the new worker's
 * `controlling` event. An armed dialog that the household answers "Stay" — the choice anyone
 * protecting typed work makes — cancels that reload AFTER the new worker has taken the page and
 * dropped the old build's chunks: a version-skewed page, the toast already gone, the apply latched.
 * SaveFlow.tsx states the law in one line — "beforeunload deliberately does NOT stop the
 * intentional reload; the hold is what makes the toast refuse instead" — and this hook is what
 * makes it structural instead of a discipline every registration must remember. With the hold up,
 * `readyToApplyUpdate` refuses, nothing is skipWaiting'd, and the toast says so (UpdateToast's held
 * line); the household re-taps after they save.
 *
 * Effect-cleanup release: an unmount can never leak the listener or the hold.
 */
import { useEffect } from 'react'
import { holdUpdateApply } from './updateGate'

/**
 * The handler both guards register — exported so a unit test can pin BOTH channels.
 * `preventDefault()` is the modern trigger; `returnValue = ''` is the legacy channel. jsdom folds
 * them (assigning the legacy property alone marks the event canceled), so an integration probe
 * that reads `defaultPrevented` cannot see a dropped `preventDefault()` — the unit test on this
 * function can. This exact pair is what the witnessed Chromium dialog (2026-09-03, 1536×791)
 * fired with; do not thin it on a spec argument alone.
 */
export function warnBeforeUnload(e: BeforeUnloadEvent): void {
  e.preventDefault()
  e.returnValue = ''
}

/** Arm the leave-page dialog AND hold the update-apply gate while `active`. */
export function useUnloadGuard(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const release = holdUpdateApply()
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload)
      release()
    }
  }, [active])
}
