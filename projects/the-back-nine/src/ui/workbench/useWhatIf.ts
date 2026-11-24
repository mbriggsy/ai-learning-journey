/**
 * The shell's one what-if (Act 6 · RC4b, the Action Items tray; U14 and U15's built logic): its slot, the two bundles,
 * the mode, the asks and Apply, the one write. A hook with no JSX, made once by the shell, so the what-if and the tray's
 * edits survive a page move.
 *
 * TWO BUNDLES (plan RC4, "Explicit Refresh"): `pending` is what the tray holds; `own` is the COMMITTED bundle the slot
 * runs and the left half reads. Edits touch `pending` only; Refresh commits the whole pending bundle once and starts one
 * run; Reset drops every lever from both (the what-if returns to the plan, which runs nothing: the empty bundle IS the
 * plan, U14). Refresh and Apply read the bundles through refs written in the same call that changes them (insights 036
 * and 149), so a figure committed by the press's own blur is the one sent.
 *
 * NEVER A SKIP ON "LOOKS THE SAME" (insight 159): a Refresh whose bundle equals the committed one still asks (its last
 * run may have failed, or sampled an older answer); the slot's one-key rule (`whatIfRun.ts`) drops any late result.
 *
 * THE LAST LANDED FIGURE: while a run is in flight the left half keeps its numbers under "Loading…" (ref 2.7's refresh
 * state). `landed` is the newest figure the left half showed in this mode: the plan's own (an empty bundle) or a reading
 * that landed current.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { applyBundle } from '@intake/whatIf'
import type { MemoryModel, MemoryModelSnapshot, ModelAnswer } from '@store/memoryModel'
import { canonicalIdentityToken, type SavedRecommendationV3, type WhatIfLeverV6 } from '@shared/model'
import { copy } from '../copy'
import { recomputeAfterEdit } from '../recompute'
import { answerKey } from './tableRun'
import { createWhatIfSlot, whatIfRunFor, whatIfSlotView, type ReadingPair, type WhatIfSlotLanes, type WhatIfSlotSnapshot, type WhatIfSlotView } from './whatIfRun'
import { applyState, recommendationBundle, refusalWords, withLever } from './railChrome'

/** The saved recommendation as the tray reads it (R22): the record on disk and whether the store reads it as current. */
export interface RailRecommendation {
  readonly record: SavedRecommendationV3
  readonly current: boolean
}

const answerKeyOf = (answer: ModelAnswer): string =>
  answer.kind === 'headline' || answer.kind === 'date' ? answerKey(answer) : answer.kind

/** The newest figure the left half showed in a mode: the plan's own, or a landed reading. */
export type LandedFigure =
  | { readonly mode: 'own' | 'recommendation'; readonly kind: 'plan' }
  | { readonly mode: 'own' | 'recommendation'; readonly kind: 'reading'; readonly key: string; readonly pair: ReadingPair }

export interface WhatIf {
  /** The COMMITTED bundle (the left half's run). */
  readonly own: readonly WhatIfLeverV6[]
  /** The tray's edits, waiting for Refresh. */
  readonly pending: readonly WhatIfLeverV6[]
  /** Set a target's pending lever, or drop it (null). */
  readonly setLever: (target: string, lever: WhatIfLeverV6 | null) => void
  /** Replace the whole pending bundle (the Edit drawer's Save drops a hidden row's lever). */
  readonly setPending: (bundle: readonly WhatIfLeverV6[]) => void
  /** Commit the pending bundle and run it (always one ask, insight 159). */
  readonly refresh: () => void
  /** Drop every lever, pending and committed: the what-if returns to the plan. */
  readonly reset: () => void
  /** Which what-if is shown: the household's own, or the saved recommendation (read-only). */
  readonly mode: 'own' | 'recommendation'
  readonly setMode: (mode: 'own' | 'recommendation') => void
  /** The bundle the slot runs: the recommendation's in its mode, else the committed own. */
  readonly shown: readonly WhatIfLeverV6[]
  readonly shownKey: string
  readonly view: WhatIfSlotView | null
  /** The newest figure the left half showed in the current mode (held under "Loading…" while a run is in flight). */
  readonly landed: LandedFigure | null
  /** The what-if holds work the plan doesn't: a committed lever, or a pending edit not yet run. */
  readonly held: boolean
  /** Bumped by Apply and Reset: the tray's local fields start again from the plan. */
  readonly epoch: number
  /** The one write. Returns what to say, and whether it wrote (both bundles are then empty: the plan holds them). */
  readonly apply: () => { readonly words: string; readonly applied: boolean }
}

/** The shell's one what-if: its slot (made once), the bundles, the mode, the asks, and Apply. */
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
  const [pending, setPendingState] = useState<readonly WhatIfLeverV6[]>([])
  // The bundles' truth for a press (insight 036): written in the same call that changes them, read by Refresh and Apply.
  const ownRef = useRef(own)
  const pendingRef = useRef(pending)
  const [mode, setModeState] = useState<'own' | 'recommendation'>('own')
  const modeRef = useRef(mode)
  const [epoch, setEpoch] = useState(0)
  const recBundle = useMemo(
    () => (recommendation !== undefined && recommendation.current ? recommendationBundle(recommendation.record) : null),
    [recommendation],
  )
  // The recommendation's mode holds only while its record can run (current, version 6): otherwise the household's own.
  const effectiveMode = mode === 'recommendation' && recBundle !== null ? 'recommendation' : 'own'
  const shown = effectiveMode === 'recommendation' && recBundle !== null ? recBundle : own
  const shownKey = canonicalIdentityToken(shown)
  const aKey = answerKeyOf(snapshot.answer)
  // The committed answer as last rendered, for the presses. A store commit notifies synchronously and its re-render
  // flushes before the next input task, so at a press this is the store's committed answer.
  const answerRef = useRef(snapshot.answer)
  answerRef.current = snapshot.answer
  const seed = snapshot.draft.seed
  // One ask per committed answer and shown bundle. An empty bundle is the plan itself: nothing to run.
  useEffect(() => {
    if (shown.length > 0) slot.ask(snapshot.answer, seed, shown)
    // Keyed on the answer's key, the seed and the bundle's key: `snapshot.answer` and `shown` are that key's values.
  }, [aKey, seed, shownKey, slot])

  const setLever = useCallback((target: string, lever: WhatIfLeverV6 | null) => {
    const next = withLever(pendingRef.current, target, lever)
    pendingRef.current = next
    setPendingState(next)
  }, [])
  const setPending = useCallback((bundle: readonly WhatIfLeverV6[]) => {
    pendingRef.current = bundle
    setPendingState(bundle)
  }, [])
  const refresh = useCallback(() => {
    const next = pendingRef.current
    const same = canonicalIdentityToken(next) === canonicalIdentityToken(ownRef.current)
    ownRef.current = next
    setOwnState(next)
    // A new bundle is asked by the effect above (its key moved); the same bundle is asked here, so every Refresh in the
    // household's own mode sends exactly one ask.
    if (same && next.length > 0 && modeRef.current === 'own') slot.ask(answerRef.current, model.getSnapshot().draft.seed, next)
  }, [model, slot])
  const reset = useCallback(() => {
    ownRef.current = []
    pendingRef.current = []
    setOwnState([])
    setPendingState([])
    setEpoch((e) => e + 1)
  }, [])
  const setMode = useCallback((m: 'own' | 'recommendation') => {
    modeRef.current = m
    setModeState(m)
  }, [])

  const apply = useCallback((): { readonly words: string; readonly applied: boolean } => {
    const not = (words: string) => ({ words, applied: false })
    // The store's CURRENT draft and the bundles as just committed (insight 036), never the render's: a figure the
    // press's own blur committed is in `pendingRef` before this runs.
    const now = model.getSnapshot()
    const inRec = modeRef.current === 'recommendation' && recBundle !== null
    if (!inRec && canonicalIdentityToken(pendingRef.current) !== canonicalIdentityToken(ownRef.current)) return not(copy.trayApplyRefreshFirst)
    const bundle = inRec ? recBundle : ownRef.current
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
    pendingRef.current = []
    setOwnState([])
    setPendingState([])
    modeRef.current = 'own'
    setModeState('own')
    setEpoch((e) => e + 1)
    return { words: [copy.workbenchRailApplyDone, ...(state.leftOverNote !== undefined ? [state.leftOverNote] : [])].join(' '), applied: true }
  }, [model, recBundle, slot])

  const view = shown.length > 0 && slotSnapshot.run.bundleKey === shownKey ? whatIfSlotView(slotSnapshot) : null

  // The newest figure the left half showed in this mode (derived during render: the plan's own for an empty bundle, or
  // the reading that landed current on the slot's own key).
  const many = slotSnapshot.many
  const nowLanded: LandedFigure | null =
    shown.length === 0
      ? { mode: effectiveMode, kind: 'plan' }
      : view?.kind === 'shown' && view.many.kind === 'ready' && !view.many.updating && many?.kind === 'ok'
        ? { mode: effectiveMode, kind: 'reading', key: many.key, pair: many.value }
        : null
  const [landed, setLanded] = useState<LandedFigure | null>(null)
  const keyOf = (f: LandedFigure | null) => (f === null ? '' : f.kind === 'plan' ? `${f.mode}|plan` : `${f.mode}|${f.key}`)
  if (nowLanded !== null && keyOf(nowLanded) !== keyOf(landed)) setLanded(nowLanded)
  const shownLanded = (nowLanded ?? landed)?.mode === effectiveMode ? (nowLanded ?? landed) : null

  const held = own.length > 0 || canonicalIdentityToken(pending) !== canonicalIdentityToken(own)
  return { own, pending, setLever, setPending, refresh, reset, mode: effectiveMode, setMode, shown, shownKey, view, landed: shownLanded, held, epoch, apply }
}

/** Is the slot's many-futures reading worked out on this key (the answer and bundle Apply would write)? */
function isCurrent(s: WhatIfSlotSnapshot, key: string, refiguring: boolean): boolean {
  return !refiguring && s.run.key === key && s.many?.key === key && s.many.kind === 'ok'
}
