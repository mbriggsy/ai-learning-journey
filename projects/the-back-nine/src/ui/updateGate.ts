/**
 * The PWA deferred-skipWaiting DECISION as a pure seam (insight 048) — extracted from
 * UpdateToast so the honesty-critical "never skipWaiting mid-WRITE" logic is unit-testable
 * WITHOUT the service-worker / `virtual:pwa-register` render path (which the test env can't
 * drive). UpdateToast becomes dumb wiring that consults this.
 *
 * THE CONTRACT (session.ts:149-152): `whenNoWriteInFlight()` resolves the write tail that
 * existed AT CALL TIME only — a write enqueued DURING the await is not covered. So a single
 * await is not enough: we MUST re-check `isWriteInFlight()` afterward. Returns true iff it is
 * safe to apply the update (skipWaiting + reload) right now; false means a write is still in
 * flight, so the caller leaves the prompt up rather than reload over a live vault write.
 */
import type { VaultSession } from '@store/session'

/** Just the two write-accounting signals the gate needs — so a fake session in the test is
 *  two functions, and a change to either signal's shape breaks here at compile time. */
export type WriteGate = Pick<VaultSession, 'isWriteInFlight' | 'whenNoWriteInFlight'>

export async function readyToApplyUpdate(session: WriteGate): Promise<boolean> {
  if (session.isWriteInFlight()) await session.whenNoWriteInFlight()
  // Re-check: the tail awaited above covered only writes in flight at CALL time; a write
  // enqueued during the await is uncovered, so this second read is load-bearing, not paranoia.
  return !session.isWriteInFlight()
}
