/**
 * The edit-and-re-save DECISION as a pure seam (insight 048 — IntakeApp's render path is not
 * drivable in jsdom, so the honesty-critical state machine lives here, planted-fail tested).
 *
 * This retires the U8-review finding ②'s interim sticky-`saved` guard. The old shape had ONE
 * boolean and ONE save path (the firstSave ceremony), so a saved-then-edited plan either
 * re-offered the ceremony — which `firstSave` refuses with 'not-locked', mapped to a lying
 * "Saving didn't finish. Try again." — or hid the edit behind a stale badge. The machine below
 * makes both dead-ends UNREPRESENTABLE: once a vault exists (`persist.kind !== 'unsaved'`) the
 * derived view can never be 'first', so the ceremony is unreachable; and 'clean' is not a
 * sticky flag but a LIVE comparison of the current answer against what is actually on disk.
 *
 * DIRTY IS COMPUTED, NEVER TRACKED: both scenarios come out of `scenarioFromDraft` (which
 * round-trips the codec, so key order is construction-stable — decodeScenario builds every
 * object) and are compared by JSON identity. An edit that changes nothing, or is edited back,
 * reads clean — the badge tells the truth about the DISK, not about mouse activity. That law
 * holds from the 'save-failed' state too: editing back to the on-disk answer clears the
 * failure alert (nothing is unfinished once the disk matches — alarm-when-fine is a lie in
 * the safe direction, still a lie).
 */
import type { ScenarioV3 } from '@shared/model'
import type { SaveReady } from './scenarioFromDraft'
import type { ResaveCopyKey } from './unlockCopy'

/** What is on disk, as IntakeApp tracks it. `scenario` is always the LAST COMMITTED model
 *  (during 'saving' and after 'save-failed' the disk still holds the previous commit). */
export type PersistState =
  | { readonly kind: 'unsaved' }
  | { readonly kind: 'saved'; readonly scenario: ScenarioV3 }
  | { readonly kind: 'saving'; readonly scenario: ScenarioV3 }
  | { readonly kind: 'save-failed'; readonly scenario: ScenarioV3; readonly errorKey: ResaveCopyKey }

/** The Result screen's save slot, handler-free (IntakeApp attaches the callbacks). */
export type ResultSaveView =
  | { readonly kind: 'none' } // not persistable (incomplete answer) — no claim either way
  | { readonly kind: 'first' } // no vault yet — the firstSave ceremony CTA
  | { readonly kind: 'clean' } // disk matches the current answer — the saved badge
  | { readonly kind: 'dirty' } // disk is BEHIND the current answer — the re-save CTA
  | { readonly kind: 'saving' } // update write in flight
  | { readonly kind: 'failed'; readonly errorKey: ResaveCopyKey } // last re-save refused — alert + retry

export function deriveResultSave(persist: PersistState, ready: SaveReady, readOnly = false): ResultSaveView {
  // A READ-ONLY session (a 2nd tab holds the writer — captured ONCE at unlock, session.ts) has no
  // functioning save surface: `session.save()` REFUSES (not-writable → "reload to edit"), so a
  // 'dirty' CTA here is the same lying dead-end the edit-and-re-save machine exists to retire, and a
  // 'clean' badge would claim a save THIS tab never made. Make no claim at all — App's standing
  // View-only banner is the whole disclosure. This overrides every disk state, so an edit in a
  // read-only session can NEVER derive the dirty CTA (the U8-review read-only-verdict fix).
  if (readOnly) return { kind: 'none' }
  // An incomplete answer can't be compared OR saved: make no claim (never a stale "Saved"
  // badge over an answer that no longer matches the disk, never a CTA that can't build a
  // scenario). The intact vault is untouched; completing the answer re-derives honestly.
  if (!ready.ready) return { kind: 'none' }
  switch (persist.kind) {
    case 'unsaved':
      return { kind: 'first' }
    case 'saving':
      return { kind: 'saving' }
    case 'save-failed':
      // An edit BACK to what is on disk clears the failure honestly: `persist.scenario` is
      // provably the on-disk model (session.save installs it only on {ok:true}), so a matching
      // answer has nothing unfinished to report — keeping the alert would be alarm-when-fine
      // (ultramode 2026-07-02). A STILL-different draft stays 'failed': its retry IS the CTA,
      // so surfacing 'dirty' there would just duplicate the affordance under a vaguer label.
      return JSON.stringify(ready.scenario) === JSON.stringify(persist.scenario)
        ? { kind: 'clean' }
        : { kind: 'failed', errorKey: persist.errorKey }
    case 'saved':
      return JSON.stringify(ready.scenario) === JSON.stringify(persist.scenario)
        ? { kind: 'clean' }
        : { kind: 'dirty' }
    default: {
      const _exhaustive: never = persist
      throw new Error(`deriveResultSave: unmapped persist state ${String(_exhaustive)}`)
    }
  }
}
