/**
 * The save slot's prop and its transition announcer (`SaveSlot.tsx` draws the slot; the result screen and the
 * workbench room both bind the announcer). Moved out of `SaveSlot.tsx` by Act 6's RC0, unchanged.
 */
import { useEffect, useRef } from 'react'
import { useLiveAnnouncer, type LiveAnnouncer } from '@intake/a11y'
import { copy } from './copy'
import type { ResaveCopyKey } from './unlockCopy'

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
