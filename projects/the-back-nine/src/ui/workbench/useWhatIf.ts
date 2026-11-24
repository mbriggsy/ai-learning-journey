/**
 * The room's one what-if (`WhatIfPage.tsx`'s header holds the why): its slot, the bundle, the mode, the asks and
 * Apply, the one write. A hook with no JSX, moved out of `WhatIfPage.tsx` by Act 6's RC0, unchanged.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { applyBundle } from '@intake/whatIf'
import type { MemoryModel, MemoryModelSnapshot, ModelAnswer } from '@store/memoryModel'
import { canonicalIdentityToken, type SavedRecommendationV3, type WhatIfLeverV6 } from '@shared/model'
import { copy } from '../copy'
import { recomputeAfterEdit } from '../recompute'
import { answerKey } from './tableRun'
import { createWhatIfSlot, whatIfRunFor, whatIfSlotView, type WhatIfSlotLanes, type WhatIfSlotSnapshot, type WhatIfSlotView } from './whatIfRun'
import { applyState, recommendationBundle, refusalWords, withLever } from './railChrome'

/** The saved recommendation as the rail reads it (R22): the record on disk and whether the store reads it as current. */
export interface RailRecommendation {
  readonly record: SavedRecommendationV3
  readonly current: boolean
}

const answerKeyOf = (answer: ModelAnswer): string =>
  answer.kind === 'headline' || answer.kind === 'date' ? answerKey(answer) : answer.kind

export interface WhatIf {
  /** The household's own bundle (the editable what-if). */
  readonly own: readonly WhatIfLeverV6[]
  readonly setLever: (target: string, lever: WhatIfLeverV6 | null) => void
  /** Which what-if is shown: the household's own, or the saved recommendation (read-only). */
  readonly mode: 'own' | 'recommendation'
  readonly setMode: (mode: 'own' | 'recommendation') => void
  /** The bundle the slot runs and the page pairs: the recommendation's in its mode, else the household's own. */
  readonly shown: readonly WhatIfLeverV6[]
  readonly shownKey: string
  readonly view: WhatIfSlotView | null
  /** Bumped by Apply: the levers' local fields start again from the plan. */
  readonly epoch: number
  /** The one write. Returns what to say, and whether it wrote (the bundle is then empty: the plan holds it). */
  readonly apply: () => { readonly words: string; readonly applied: boolean }
}

/** The room's one what-if: its slot (made once), the bundle, the mode, the asks, and Apply. */
export function useWhatIf({
  snapshot,
  model,
  lanes,
  recommendation,
}: {
  readonly snapshot: MemoryModelSnapshot
  readonly model: MemoryModel
  readonly lanes?: WhatIfSlotLanes
  readonly recommendation?: RailRecommendation
}): WhatIf {
  const [slot] = useState(() => createWhatIfSlot(lanes))
  const slotSnapshot = useSyncExternalStore(slot.subscribe, slot.getSnapshot)
  const [own, setOwnState] = useState<readonly WhatIfLeverV6[]>([])
  // The bundle's truth for a press (insight 036): written in the same call that commits a lever, read by Apply.
  const ownRef = useRef(own)
  const [mode, setModeState] = useState<'own' | 'recommendation'>('own')
  const modeRef = useRef(mode)
  const [epoch, setEpoch] = useState(0)
  const recBundle = useMemo(
    () => (recommendation !== undefined && recommendation.current ? recommendationBundle(recommendation.record) : null),
    [recommendation],
  )
  // The recommendation's mode holds only while its row can run (current, version 6): otherwise the household's own.
  const effectiveMode = mode === 'recommendation' && recBundle !== null ? 'recommendation' : 'own'
  const shown = effectiveMode === 'recommendation' && recBundle !== null ? recBundle : own
  const shownKey = canonicalIdentityToken(shown)
  const aKey = answerKeyOf(snapshot.answer)
  // The committed answer as last rendered, for Apply's check. A store commit notifies synchronously and its re-render
  // flushes before the next input task, so at a press this is the store's committed answer.
  const answerRef = useRef(snapshot.answer)
  answerRef.current = snapshot.answer
  const seed = snapshot.draft.seed
  // One ask per committed answer and bundle. An empty bundle is the plan itself: nothing to run.
  useEffect(() => {
    if (shown.length > 0) slot.ask(snapshot.answer, seed, shown)
    // Keyed on the answer's key, the seed and the bundle's key: `snapshot.answer` and `shown` are that key's values.
  }, [aKey, seed, shownKey, slot])
  // NOT HELD as an unsaved buffer: the open entries' leave ask says "changes you finished stay in your plan", false for
  // a what-if. Since Act 6 · RC2 the shell tells IntakeApp when `own` holds a change, and a leave past the shell asks
  // first in the what-if's own words (`shellLeaveWhatIf`); Keep is RC5's (gap 2's U16).

  const setLever = useCallback((target: string, lever: WhatIfLeverV6 | null) => {
    const next = withLever(ownRef.current, target, lever)
    ownRef.current = next
    setOwnState(next)
  }, [])
  const setMode = useCallback((m: 'own' | 'recommendation') => {
    modeRef.current = m
    setModeState(m)
  }, [])

  const apply = useCallback((): { readonly words: string; readonly applied: boolean } => {
    const not = (words: string) => ({ words, applied: false })
    // The store's CURRENT draft and the bundle as just committed (insight 036), never the render's: a figure the press's
    // own blur committed is in `ownRef` before this runs.
    const now = model.getSnapshot()
    const bundle = modeRef.current === 'recommendation' && recBundle !== null ? recBundle : ownRef.current
    const answer = answerRef.current
    if (answer.kind !== 'headline' && answer.kind !== 'date') return not(copy.workbenchRailApplyWaiting)
    const state = applyState(answer.draft, bundle, isCurrent(slot.getSnapshot(), whatIfRunFor(answer, now.draft.seed, bundle).key, now.refiguring))
    if (state.kind === 'empty') return not(copy.workbenchRailApplyEmpty)
    if (state.kind === 'withheld') return not(state.words)
    if (state.kind === 'waiting') return not(copy.workbenchRailApplyWaiting)
    // The writers' own checks, on the draft Apply writes (insight 158): a refusal applies nothing.
    const applied = applyBundle(now.draft, bundle)
    if (!applied.ok) return not(refusalWords(applied.refusal, now.draft.startCalendarYear))
    model.update((d) => {
      const again = applyBundle(d, bundle)
      return again.ok ? again.draft : d
    })
    recomputeAfterEdit(model)
    ownRef.current = []
    setOwnState([])
    modeRef.current = 'own'
    setModeState('own')
    setEpoch((e) => e + 1)
    return { words: [copy.workbenchRailApplyDone, ...(state.leftOverNote !== undefined ? [state.leftOverNote] : [])].join(' '), applied: true }
  }, [model, recBundle, slot])

  const view = shown.length > 0 && slotSnapshot.run.bundleKey === shownKey ? whatIfSlotView(slotSnapshot) : null
  return { own, setLever, mode: effectiveMode, setMode, shown, shownKey, view, epoch, apply }
}

/** Is the slot's many-futures reading worked out on this key (the answer and bundle Apply would write)? */
function isCurrent(s: WhatIfSlotSnapshot, key: string, refiguring: boolean): boolean {
  return !refiguring && s.run.key === key && s.many?.key === key && s.many.kind === 'ok'
}
