/**
 * The PWA deferred-skipWaiting DECISION as a pure seam (insight 048) — extracted from
 * UpdateToast so the honesty-critical "never skipWaiting mid-WRITE" logic is unit-testable
 * WITHOUT the service-worker / `virtual:pwa-register` render path (which the test env can't
 * drive). UpdateToast becomes dumb wiring that consults this.
 *
 * THE DECISION HAS TWO CLAUSES, both read at the moment of truth:
 *
 * 1. THE WRITE FLOOR (session.ts:149-152): `whenNoWriteInFlight()` resolves the write tail
 *    that existed AT CALL TIME only — a write enqueued DURING the await is not covered. So a
 *    single await is not enough: we MUST re-check `isWriteInFlight()` afterward.
 * 2. THE SAVE-CEREMONY HOLD (Fork B, council 2026-06-30): the ceremony's commit→export window
 *    is invisible to the write signal — the export step is a pure READ (the vault is committed
 *    but the off-device backup isn't saved yet), and the securing step's ~1s KDF derive runs
 *    BEFORE its write is enqueued. A reload landing there strands the user believing the save
 *    finished without their backup artifact. SaveFlow raises {@link holdUpdateApply} across
 *    that window; the gate refuses while any hold is open. Unlike the write tail, a hold is
 *    NOT awaited — the export step is user-paced (minutes, not milliseconds), and auto-applying
 *    the moment it clears would fire a surprise reload right at "Your plan is saved". Refusal
 *    leaves the prompt up; the user re-clicks after the ceremony.
 *
 * Returns true iff it is safe to apply the update (skipWaiting + reload) right now; false
 * means the caller leaves the prompt up rather than reload over a live write or mid-ceremony.
 */
import type { VaultSession } from '@store/session'

/** Just the two write-accounting signals the gate needs — so a fake session in the test is
 *  two functions, and a change to either signal's shape breaks here at compile time. */
export type WriteGate = Pick<VaultSession, 'isWriteInFlight' | 'whenNoWriteInFlight'>

/** Open holds on the apply gate. Module-level (not React state): UpdateToast mounts at the App
 *  root while SaveFlow lives in the lazy intake chunk — the signal crosses that boundary as a
 *  module singleton, read fresh at each decision (insight 036: gates read CURRENT truth, never
 *  a render-captured closure). */
let ceremonyHolds = 0

/**
 * Hold the update-apply gate across the Save ceremony's commit→export window. Returns an
 * IDEMPOTENT release. A counter, not a boolean: StrictMode double-invokes effects (raise →
 * release → raise), and a second holder's window must survive the first holder's release.
 */
export function holdUpdateApply(): () => void {
  ceremonyHolds += 1
  let released = false
  return () => {
    if (released) return
    released = true
    ceremonyHolds -= 1
  }
}

export async function readyToApplyUpdate(session: WriteGate): Promise<boolean> {
  if (session.isWriteInFlight()) await session.whenNoWriteInFlight()
  // Re-check BOTH clauses at the decision instant: the tail awaited above covered only writes
  // in flight at CALL time (a write enqueued during the await is uncovered), and the ceremony
  // hold may have been raised while we waited — this second read is load-bearing, not paranoia.
  return !session.isWriteInFlight() && ceremonyHolds === 0
}
