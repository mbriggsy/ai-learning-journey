/**
 * src/ui/shell/lockMenu.ts: the top bar's lock menu, composed from the one save machine (plan
 * docs/plans/6-rightcapital-ui-plan.md, section 3.1, "The lock menu"). Pure: it reads `deriveResultSave`'s view
 * (`src/ui/resultSave.ts`), never the disk, so the menu, the answer page's save slot and the unload guard can never
 * disagree about what is saved.
 *
 * The lock's own word is the plan's save state, on the bar at all times (a state is never hidden inside a menu); the
 * menu adds the state's sentence and the actions that state allows:
 * - no vault yet: Keep, which opens the save ceremony;
 * - saved: nothing to save (Back up where the tab can write);
 * - unsaved changes: Save your changes;
 * - saving: nothing (the write is in flight);
 * - save failed: the failure's sentence, as an alert, and Try again (or Reload, where the refusal says only a reload
 *   can save here: a retry would re-refuse, insight 054);
 * - read-only (a second tab holds the plan): the reason, and no Save, no Back up (plan 4.0's read-only rule);
 * - not saveable (an answer missing facts): the reason, and no Save.
 * Lock itself is left out: the app has no in-session lock today, and a dead control is never drawn.
 */
import { copy } from '../copy'
import type { ResultSaveView } from '../resultSave'

export type LockMenuAction = 'keep' | 'save' | 'retry' | 'reload' | 'backup'

export interface LockMenuItem {
  readonly action: LockMenuAction
  readonly label: string
}

export interface LockMenuView {
  /** The state the bar names, for tests and the e2e harness (`data-save-state`). */
  readonly state: ResultSaveView['kind'] | 'view-only'
  /** The lock's own word on the bar. */
  readonly word: string
  /** The state's sentence, first in the menu. */
  readonly sentence: string
  /** The sentence is a failure: it is spoken as an alert. */
  readonly alert: boolean
  readonly items: readonly LockMenuItem[]
}

export interface LockMenuInput {
  readonly save: ResultSaveView
  readonly readOnly: boolean
  /** A vault exists in this session and the tab can write: the existing backup step can run. */
  readonly canBackUp: boolean
}

export function composeLockMenu({ save, readOnly, canBackUp }: LockMenuInput): LockMenuView {
  const backup: readonly LockMenuItem[] = canBackUp && !readOnly ? [{ action: 'backup', label: copy.backupDoorCta }] : []
  // A read-only tab derives `none` (resultSave.ts), the same as an answer that can't be saved: the reason differs.
  if (readOnly) return { state: 'view-only', word: copy.lockWordViewOnly, sentence: copy.saveErrorReadOnly, alert: false, items: [] }
  switch (save.kind) {
    case 'none':
      return { state: 'none', word: copy.lockWordNotSaved, sentence: copy.lockNoneNote, alert: false, items: [] }
    case 'first':
      return { state: 'first', word: copy.lockWordNotSaved, sentence: copy.saveCtaHint, alert: false, items: [{ action: 'keep', label: copy.saveCta }] }
    case 'clean':
      return { state: 'clean', word: copy.lockWordSaved, sentence: copy.savedBadge, alert: false, items: backup }
    case 'dirty':
      return { state: 'dirty', word: copy.lockWordUnsaved, sentence: copy.resaveHint, alert: false, items: [{ action: 'save', label: copy.resaveCta }, ...backup] }
    case 'saving':
      return { state: 'saving', word: copy.lockWordSaving, sentence: copy.resavePending, alert: false, items: [] }
    case 'failed':
      return {
        state: 'failed',
        word: copy.lockWordNotSaved,
        sentence: copy[save.errorKey],
        alert: true,
        items: [save.errorKey === 'saveErrorReadOnly' ? { action: 'reload', label: copy.restoreRetry } : { action: 'retry', label: copy.exportRetry }],
      }
    default: {
      const _exhaustive: never = save
      throw new Error(`composeLockMenu: unmapped save view ${String(_exhaustive)}`)
    }
  }
}
