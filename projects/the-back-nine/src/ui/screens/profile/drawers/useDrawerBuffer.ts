/**
 * src/ui/screens/profile/drawers/useDrawerBuffer.ts: a Profile drawer's buffered copy of its fields (Act 6 · RC13a).
 *
 * The form is seeded once, when the drawer opens (the caller keys the drawer per open), and edited here only; the store
 * sees nothing until Save (`drawerSave.ts`). Two things the frame needs from it:
 *  - `isDirty()` reads the LATEST form synchronously (a ref written in the same call as the state), so a dismiss that
 *    first blurs the focused field (whose commit lands in that blur's handler) reads the figure just committed, never
 *    the render before it (insight 071's extension: a dying drawer's focused field still holds work);
 *  - the hold on the leave-page guard (`useUnsavedBufferHold`, insight 112) while the form differs from its seed and the
 *    drawer is open, so a reload or a Back press asks first. A closed drawer never holds (its buffer may still differ
 *    after Save, through the exit animation).
 */
import { useCallback, useRef, useState } from 'react'
import { bufferMoved, useUnsavedBufferHold } from '@intake/unsavedBuffer'
import type { EditCheck } from './drawerSave'

export interface DrawerBuffer<F> {
  readonly form: F
  readonly patch: (p: Partial<F>) => void
  /** The latest form, past any state update not rendered yet. */
  readonly read: () => F
  readonly isDirty: () => boolean
}

export function useDrawerBuffer<F extends object>(seed: F, open: boolean): DrawerBuffer<F> {
  const [form, setForm] = useState<F>(seed)
  const ref = useRef<F>(form)
  const patch = useCallback((p: Partial<F>) => {
    const next = { ...ref.current, ...p }
    ref.current = next
    setForm(next)
  }, [])
  const read = useCallback(() => ref.current, [])
  const isDirty = useCallback(() => bufferMoved(ref.current, seed), [seed])
  useUnsavedBufferHold(open && bufferMoved(form, seed))
  return { form, patch, read, isDirty }
}

const NO_REFUSALS = { fields: {}, elsewhere: [] } as const

export interface DrawerEdit<F, K extends string> extends DrawerBuffer<F> {
  /** The last Save's refusals (cleared field by field as each is edited again, and wholly by the next Save). */
  readonly check: EditCheck<K>
  readonly setCheck: (c: EditCheck<K>) => void
  /** Edit a field: the buffer moves and that field's refusal is forgiven (back-nine-design: errors clear on re-edit). */
  readonly set: (field: K, p: Partial<F>) => void
}

/** The buffer plus the last Save's refusals: what every Profile drawer body holds. */
export function useDrawerEdit<F extends object, K extends string>(seed: F, open: boolean): DrawerEdit<F, K> {
  const buffer = useDrawerBuffer(seed, open)
  const { patch } = buffer
  const [check, setCheck] = useState<EditCheck<K>>(NO_REFUSALS)
  const set = useCallback(
    (field: K, p: Partial<F>) => {
      patch(p)
      setCheck((c) => {
        if (c.fields[field] === undefined && c.elsewhere.length === 0) return c
        const fields: Partial<Record<K, string>> = { ...c.fields }
        delete fields[field]
        return { fields, elsewhere: [] }
      })
    },
    [patch],
  )
  return { ...buffer, check, setCheck, set }
}
