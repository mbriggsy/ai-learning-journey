/**
 * THE OPEN ENTRY BUFFERS — the second operand of IntakeApp's unsaved-work guard (the 2026-09-03
 * unit review; four lenses converged on the same hole). `unsavedWorkPending` (ui/resultSave.ts)
 * reads the DRAFT, and the draft is not the only place typed work lives: the atomic entry forms
 * (AccountEntry, OtherIncomeEntry — "committed atomically by Add"), the budget builder's staged
 * rows and the Roth lever's typed plan each hold a whole multi-field answer in component state and
 * write the store only on an explicit commit. Over a saved-and-clean vault — the returning
 * household's entire session — the draft compare reads clean while an eight-field account or an
 * itemized budget sits un-applied, and a reload would lose it with no dialog: the cardinal
 * direction, and materially wider than the one un-blurred field the guard's header accepts.
 *
 * The shape is ui/updateGate.ts's hold counter, NOT a dirty flag: a form HOLDS while its local
 * state differs from what the draft carries — DERIVED each render from its own state through
 * {@link bufferMoved}, never a flag somebody must remember to clear — and the effect cleanup
 * releases on unmount, so a cancelled, committed or crashed form can never leak a hold (StrictMode's
 * raise→release→raise is why it is a counter with an idempotent release, not a boolean). The guard
 * reads the count through useSyncExternalStore; the registry is module-level because the forms
 * live in the intake chunk while the guard lives in IntakeApp (the updateGate precedent). Nothing
 * here persists anything (the D1 no-write-until-Save law): a held buffer only tells the guard to
 * WARN through the browser's own dialog.
 *
 * WHICH SURFACES HOLD: the four that hold TYPED work (AccountEntry, OtherIncomeEntry,
 * BudgetBuilder, RothLever). The single-pick sheets (SequencingControl, HealthcareSheet) do not —
 * a differing radio pick is a one-tap preview, and a leave-page dialog over it would be louder
 * than the loss. That line is a judgment, recorded in the register; flip it here, in one place.
 */
import { useEffect } from 'react'
import { canonicalIdentityToken } from '@shared/model'

let holds = 0
const listeners = new Set<() => void>()
const notify = (): void => {
  for (const listener of listeners) listener()
}

/** Raise a hold on the guard. Returns an IDEMPOTENT release (a double release from StrictMode
 *  effect churn can never credit-away another form's hold). */
export function holdUnsavedBuffer(): () => void {
  holds += 1
  notify()
  let released = false
  return () => {
    if (released) return
    released = true
    holds -= 1
    notify()
  }
}

/** The useSyncExternalStore pair — the guard reads the LIVE count every render, never a closure. */
export const unsavedBuffersHeld = (): number => holds
export function subscribeUnsavedBuffers(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Has a form's local state moved from what it was seeded with? The SAME canonicalizer the disk
 *  compare uses (model.ts `scenarioIdentityKey`), so key order and absent-vs-undefined never read
 *  as typing while a real value change always does. Forms are plain JSON data; the canonicalizer
 *  throws on anything else, which is the honest failure. */
export const bufferMoved = (live: unknown, seeded: unknown): boolean =>
  canonicalIdentityToken(live) !== canonicalIdentityToken(seeded)

/** Hold while `active` — an atomic form passes `bufferMoved(itsState, itsSeed)`, re-derived every
 *  render. Effect-cleanup release: unmount, cancel and commit all release the same way. */
export function useUnsavedBufferHold(active: boolean): void {
  useEffect(() => {
    if (!active) return
    return holdUnsavedBuffer()
  }, [active])
}
