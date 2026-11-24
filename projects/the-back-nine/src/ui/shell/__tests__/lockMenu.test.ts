import { describe, expect, it } from 'vitest'
import { composeLockMenu } from '../lockMenu'
import { copy } from '../../copy'
import type { ResultSaveView } from '../../resultSave'

/**
 * The lock menu (Act 6 · RC2; plan 6, section 3.1): each state of the one save machine (`deriveResultSave`) gives its
 * word, its sentence and the actions it allows. Read-only gives no Save; a failed save offers retry; no vault yet opens
 * the save ceremony.
 */

const VIEWS: readonly ResultSaveView[] = [
  { kind: 'none' },
  { kind: 'first' },
  { kind: 'clean' },
  { kind: 'dirty' },
  { kind: 'saving' },
  { kind: 'failed', errorKey: 'saveErrorFailed' },
]
const actions = (save: ResultSaveView, readOnly = false, canBackUp = false) => composeLockMenu({ save, readOnly, canBackUp }).items.map((i) => i.action)

describe('lockMenu — each save state', () => {
  it('names the state on the bar, every state a word', () => {
    expect(VIEWS.map((save) => composeLockMenu({ save, readOnly: false, canBackUp: false }).word)).toEqual([
      copy.lockWordNotSaved,
      copy.lockWordNotSaved,
      copy.lockWordSaved,
      copy.lockWordUnsaved,
      copy.lockWordSaving,
      copy.lockWordNotSaved,
    ])
  })

  it('no vault yet: Keep, which opens the save ceremony', () => {
    const view = composeLockMenu({ save: { kind: 'first' }, readOnly: false, canBackUp: false })
    expect(view.items).toEqual([{ action: 'keep', label: copy.saveCta }])
    expect(view.sentence).toBe(copy.saveCtaHint)
  })

  it('saved: nothing to save, and Back up where the tab can write', () => {
    expect(actions({ kind: 'clean' })).toEqual([])
    expect(actions({ kind: 'clean' }, false, true)).toEqual(['backup'])
    expect(composeLockMenu({ save: { kind: 'clean' }, readOnly: false, canBackUp: false }).sentence).toBe(copy.savedBadge)
  })

  it('unsaved changes: Save your changes', () => {
    expect(composeLockMenu({ save: { kind: 'dirty' }, readOnly: false, canBackUp: true }).items).toEqual([
      { action: 'save', label: copy.resaveCta },
      { action: 'backup', label: copy.backupDoorCta },
    ])
  })

  it('saving: no action while the write is in flight', () => {
    expect(actions({ kind: 'saving' }, false, true)).toEqual([])
    expect(composeLockMenu({ save: { kind: 'saving' }, readOnly: false, canBackUp: false }).sentence).toBe(copy.resavePending)
  })

  it('a failed save says why, as an alert, and offers retry; the read-only refusal offers the reload a retry can’t replace', () => {
    const failed = composeLockMenu({ save: { kind: 'failed', errorKey: 'saveErrorFailed' }, readOnly: false, canBackUp: true })
    expect(failed.alert).toBe(true)
    expect(failed.sentence).toBe(copy.saveErrorFailed)
    expect(failed.items).toEqual([{ action: 'retry', label: copy.exportRetry }])
    expect(actions({ kind: 'failed', errorKey: 'saveErrorReadOnly' })).toEqual(['reload'])
  })

  it('read-only gives no Save and no Back up, in every state, and says why', () => {
    for (const save of VIEWS) {
      const view = composeLockMenu({ save, readOnly: true, canBackUp: true })
      expect(view.items, save.kind).toEqual([])
      expect(view.word).toBe(copy.lockWordViewOnly)
      expect(view.sentence).toBe(copy.saveErrorReadOnly)
    }
  })

  it('an answer that can’t be saved yet: no Save, and the reason', () => {
    const view = composeLockMenu({ save: { kind: 'none' }, readOnly: false, canBackUp: true })
    expect(view.items).toEqual([])
    expect(view.sentence).toBe(copy.lockNoneNote)
  })

  it('only a failure is an alert', () => {
    for (const save of VIEWS) expect(composeLockMenu({ save, readOnly: false, canBackUp: false }).alert, save.kind).toBe(save.kind === 'failed')
  })
})
