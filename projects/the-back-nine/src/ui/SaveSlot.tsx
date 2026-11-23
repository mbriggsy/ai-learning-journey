/*
 * src/ui/SaveSlot.tsx — the plan's save control, drawn from the one save machine (`resultSave.ts`).
 *
 * The result screen and the workbench room (Act 5, U6) both show it, so a household can save from either
 * and the two can never disagree about what is on disk: IntakeApp derives the one view
 * (`deriveResultSave`) and hands each screen the same prop.
 */
import { useEffect, useRef } from 'react'
import { useLiveAnnouncer, type LiveAnnouncer } from '@intake/a11y'
import { copy } from './copy'
import type { ResaveCopyKey } from './unlockCopy'
// No stylesheet import here, on purpose: the slot's classes live in `styles/result.css`, which Result.tsx
// imports. Importing it here too moved it into a chunk shared with the room and so could move its place in
// the cascade (the fit gate reads that cascade); the room is only reachable from the answer, whose chunk
// has already loaded it.

/** The save slot's view + handlers — IntakeApp derives the view (resultSave.ts, the tested
 *  machine) and attaches the callbacks; the screens are dumb wiring over the six states. */
export type ResultSaveProp =
  | { readonly kind: 'none' }
  | { readonly kind: 'first'; readonly onKeep: () => void }
  | { readonly kind: 'clean' }
  | { readonly kind: 'dirty'; readonly onSave: () => void }
  | { readonly kind: 'saving' }
  | { readonly kind: 'failed'; readonly errorKey: ResaveCopyKey; readonly onRetry: () => void }

/**
 * The save slot's TRANSITION announcements (ultramode 2026-07-02). The slot swaps whole nodes per
 * state, so a `role='status'` that mounts already-populated may never announce (burned/045), and the
 * success badge is plain text. The caller binds the returned announcer's `ref` to one persistent,
 * always-mounted polite region: →saving announces the pending line, and saving→clean announces the
 * badge. The FAILED arm keeps its own role='alert' (an alert announces on insertion — routing it here
 * too would double-speak it). Edit-back clean (failed→clean with no save) is deliberately silent.
 */
export function useSaveAnnouncer(kind: ResultSaveProp['kind']): LiveAnnouncer {
  const announcer = useLiveAnnouncer()
  const prevKind = useRef(kind)
  useEffect(() => {
    const prev = prevKind.current
    prevKind.current = kind
    if (kind === prev) return
    if (kind === 'saving') announcer.announce(copy.resavePending)
    else if (kind === 'clean' && prev === 'saving') announcer.announce(copy.savedBadge)
  }, [kind, announcer])
  return announcer
}

/** The slot: one reserved box across all five populated states (insight 035 — a control below must
 *  never shift under a pointer when a click swaps CTA→pending→badge). 'none' renders no slot at all: no
 *  claim about a disk state that can't be compared, and no reserved emptiness on the never-saveable
 *  answer. */
export function SaveSlot({ save }: { readonly save: ResultSaveProp }) {
  if (save.kind === 'none') return null
  return (
    <div className="result-save-slot">
      {save.kind === 'first' && (
        <div className="result-keep">
          <button type="button" className="btn-primary" onClick={save.onKeep}>
            {copy.saveCta}
          </button>
          <p className="result-keep__hint">{copy.saveCtaHint}</p>
        </div>
      )}
      {save.kind === 'dirty' && (
        <div className="result-keep">
          <button type="button" className="btn-primary" onClick={save.onSave}>
            {copy.resaveCta}
          </button>
          <p className="result-keep__hint">{copy.resaveHint}</p>
        </div>
      )}
      {save.kind === 'saving' && (
        // Announced by the persistent region (a status inserted already-populated may not fire,
        // burned/045) — this node is the VISIBLE pending line only.
        <p className="result-save-pending">{copy.resavePending}</p>
      )}
      {save.kind === 'failed' && (
        <div className="result-keep">
          <p className="result-save-error" role="alert">
            {copy[save.errorKey]}
          </p>
          {save.errorKey === 'saveErrorReadOnly' ? (
            // The read-only refusal is NON-transient: `secondTab` is captured once at unlock
            // and never re-probed, so a retry deterministically re-refuses — the primary
            // action must match the copy's own instruction (RELOAD), never a "Try again"
            // that can't succeed (insight 054).
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              {copy.restoreRetry}
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={save.onRetry}>
              {copy.exportRetry}
            </button>
          )}
        </div>
      )}
      {save.kind === 'clean' && (
        <p className="result-saved">
          <span className="result-saved__mark" aria-hidden="true" />
          {copy.savedBadge}
        </p>
      )}
    </div>
  )
}
