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
 *
 * THE TWO-UP (Act 6 · RC5): each side of Probability runs on its own slot, made once (`useSlotRun`): this hook's for the
 * left (the tray's working what-if, a reopened kept one, or the recommendation), the shell's second for the right (your
 * plan, a kept what-if or the recommendation). The left side remembers where its working bundle came from (`source`): a
 * reopened kept what-if that is edited reads "changed, not kept" and holds (a leave asks first) until Keep replaces it.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { applyBundle } from '@intake/whatIf'
import type { MemoryModel, MemoryModelSnapshot, ModelAnswer } from '@store/memoryModel'
import { canonicalIdentityToken, type KeptWhatIfV6, type SavedRecommendationV3, type WhatIfLeverV6 } from '@shared/model'
import { copy } from '../copy'
import { recomputeAfterEdit } from '../recompute'
import { answerKey } from './tableRun'
import { createWhatIfSlot, whatIfRunFor, whatIfSlotView, type ReadingPair, type WhatIfSlot, type WhatIfSlotLanes, type WhatIfSlotSnapshot, type WhatIfSlotView } from './whatIfRun'

/** Where the left side's working bundle came from: a new what-if, or a kept one reopened (by id). */
export type LeftSource = { readonly kind: 'new' } | { readonly kind: 'kept'; readonly id: string }

/** The reopened kept what-if the left side came from, while the list still holds it. */
export function sourceKept(source: LeftSource, kept: readonly KeptWhatIfV6[]): KeptWhatIfV6 | undefined {
  return source.kind === 'kept' ? kept.find((k) => k.id === source.id) : undefined
}
import { applyState, recommendationBundle, refusalWords, withLever } from './railChrome'

/** The saved recommendation as the tray reads it (R22): the record on disk and whether the store reads it as current. */
export interface RailRecommendation {
  readonly record: SavedRecommendationV3
  readonly current: boolean
}

const answerKeyOf = (answer: ModelAnswer): string =>
  answer.kind === 'headline' || answer.kind === 'date' ? answerKey(answer) : answer.kind

/** The newest figure a side showed under one pick (`tag`: the side's pick, so a figure from another pick never stands
 *  in for this one): the plan's own, or a landed reading. */
export type LandedFigure =
  | { readonly tag: string; readonly kind: 'plan' }
  | { readonly tag: string; readonly kind: 'reading'; readonly key: string; readonly pair: ReadingPair }

/** One side's runs (Act 6 · RC5, the two-up): its slot made ONCE, one ask per committed answer and shown bundle, the
 *  slot's view on that bundle, and the newest figure it showed under `tag`. */
export interface SlotRun {
  readonly slot: WhatIfSlot
  readonly view: WhatIfSlotView | null
  readonly landed: LandedFigure | null
}

export function useSlotRun({
  snapshot,
  lanes,
  shown,
  tag,
}: {
  readonly snapshot: MemoryModelSnapshot
  readonly lanes?: WhatIfSlotLanes
  readonly shown: readonly WhatIfLeverV6[]
  readonly tag: string
}): SlotRun {
  const [slot] = useState(() => createWhatIfSlot(lanes))
  const slotSnapshot = useSyncExternalStore(slot.subscribe, slot.getSnapshot)
  const shownKey = canonicalIdentityToken(shown)
  const aKey = answerKeyOf(snapshot.answer)
  const seed = snapshot.draft.seed
  // One ask per committed answer and shown bundle. An empty bundle is the plan itself: nothing to run. A bundle put
  // back while a run for another was in flight is asked again (its key moved twice), so the slot settles on what is
  // shown (insight 159: the skip keys on "never moved", never on equal endpoints).
  useEffect(() => {
    if (shown.length > 0) slot.ask(snapshot.answer, seed, shown)
    // Keyed on the answer's key, the seed and the bundle's key: `snapshot.answer` and `shown` are that key's values.
  }, [aKey, seed, shownKey, slot])
  const view = shown.length > 0 && slotSnapshot.run.bundleKey === shownKey ? whatIfSlotView(slotSnapshot) : null
  // The newest figure this side showed under its tag (derived during render: the plan's own for an empty bundle, or the
  // reading that landed current on the slot's own key).
  const many = slotSnapshot.many
  const nowLanded: LandedFigure | null =
    shown.length === 0
      ? { tag, kind: 'plan' }
      : view?.kind === 'shown' && view.many.kind === 'ready' && !view.many.updating && many?.kind === 'ok'
        ? { tag, kind: 'reading', key: many.key, pair: many.value }
        : null
  const [landed, setLanded] = useState<LandedFigure | null>(null)
  const keyOf = (f: LandedFigure | null) => (f === null ? '' : f.kind === 'plan' ? `${f.tag}|plan` : `${f.tag}|${f.key}`)
  if (nowLanded !== null && keyOf(nowLanded) !== keyOf(landed)) setLanded(nowLanded)
  const shownLanded = (nowLanded ?? landed)?.tag === tag ? (nowLanded ?? landed) : null
  return { slot, view, landed: shownLanded }
}

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
  /** The newest figure the left half showed in the current pick (held under "Loading…" while a run is in flight). */
  readonly landed: LandedFigure | null
  /** Where the working bundle came from: a new what-if, or a kept one reopened (RC5). */
  readonly source: LeftSource
  /** The reopened kept what-if was edited: it is unkept until Keep replaces it. */
  readonly changedFromKept: boolean
  /** The what-if holds work no kept list does: a committed bundle that differs from where it came from (nothing, or the
   *  kept what-if it reopened), or a pending edit not yet run. A leave or another pick that drops it asks first. */
  readonly held: boolean
  /** Bumped by Apply, Reset and an open: the tray's local fields start again from the bundle. */
  readonly epoch: number
  /** The one write. Returns what to say, and whether it wrote (both bundles are then empty: the plan holds them). */
  readonly apply: () => { readonly words: string; readonly applied: boolean }
  /** Reopen a kept what-if on the left: its bundle becomes the working one (committed and pending). */
  readonly openKept: (kept: KeptWhatIfV6) => void
  /** A fresh new what-if on the left (the empty bundle: the plan itself). */
  readonly openNew: () => void
  /** The working bundle was just kept under `id` (Keep): it now reads as that kept what-if, unchanged. */
  readonly markKept: (id: string) => void
}

/** The shell's one what-if: its slot (made once), the bundles, the mode, the asks, and Apply. */
export function useWhatIf({
  snapshot,
  model,
  lanes,
  recommendation,
  initialKept,
}: {
  readonly snapshot: MemoryModelSnapshot
  readonly model: MemoryModel
  readonly lanes?: WhatIfSlotLanes
  readonly recommendation?: RailRecommendation
  /** A kept what-if to open on the left when the shell mounts (the one Keep just kept through the save ceremony). */
  readonly initialKept?: KeptWhatIfV6
}): WhatIf {
  const [own, setOwnState] = useState<readonly WhatIfLeverV6[]>(() => initialKept?.levers ?? [])
  const [pending, setPendingState] = useState<readonly WhatIfLeverV6[]>(() => initialKept?.levers ?? [])
  // The bundles' truth for a press (insight 036): written in the same call that changes them, read by Refresh and Apply.
  const ownRef = useRef(own)
  const pendingRef = useRef(pending)
  const [mode, setModeState] = useState<'own' | 'recommendation'>('own')
  const modeRef = useRef(mode)
  const [epoch, setEpoch] = useState(0)
  const [source, setSource] = useState<LeftSource>(() => (initialKept !== undefined ? { kind: 'kept', id: initialKept.id } : { kind: 'new' }))
  const recBundle = useMemo(
    () => (recommendation !== undefined && recommendation.current ? recommendationBundle(recommendation.record) : null),
    [recommendation],
  )
  // The recommendation's mode holds only while its record can run (current, version 6): otherwise the household's own.
  const effectiveMode = mode === 'recommendation' && recBundle !== null ? 'recommendation' : 'own'
  const shown = effectiveMode === 'recommendation' && recBundle !== null ? recBundle : own
  const shownKey = canonicalIdentityToken(shown)
  // The committed answer as last rendered, for the presses. A store commit notifies synchronously and its re-render
  // flushes before the next input task, so at a press this is the store's committed answer.
  const answerRef = useRef(snapshot.answer)
  answerRef.current = snapshot.answer
  const tag = effectiveMode === 'recommendation' ? 'recommendation' : source.kind === 'kept' ? `kept:${source.id}` : 'new'
  const { slot, view, landed } = useSlotRun({ snapshot, ...(lanes !== undefined ? { lanes } : {}), shown, tag })

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
    // household's own mode sends exactly one ask. The mode is the one SHOWN: a recommendation pick whose record can no
    // longer run (gone stale) shows the household's own, and its Refresh asks like any other.
    const inRec = modeRef.current === 'recommendation' && recBundle !== null
    if (same && next.length > 0 && !inRec) slot.ask(answerRef.current, model.getSnapshot().draft.seed, next)
  }, [model, slot, recBundle])
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
    // The plan now holds what was applied: the left side starts a new what-if (a kept one stays in the list).
    setSource({ kind: 'new' })
    setEpoch((e) => e + 1)
    return { words: [copy.workbenchRailApplyDone, ...(state.leftOverNote !== undefined ? [state.leftOverNote] : [])].join(' '), applied: true }
  }, [model, recBundle, slot])

  const load = useCallback((bundle: readonly WhatIfLeverV6[], next: LeftSource) => {
    ownRef.current = bundle
    pendingRef.current = bundle
    setOwnState(bundle)
    setPendingState(bundle)
    modeRef.current = 'own'
    setModeState('own')
    setSource(next)
    setEpoch((e) => e + 1)
  }, [])
  const openKept = useCallback((kept: KeptWhatIfV6) => load(kept.levers, { kind: 'kept', id: kept.id }), [load])
  const openNew = useCallback(() => load([], { kind: 'new' }), [load])
  const markKept = useCallback((id: string) => setSource({ kind: 'kept', id }), [])

  // What the working bundle came from: the kept what-if it reopened (while the list still holds it), else nothing.
  const from = sourceKept(source, snapshot.draft.keptWhatIfs ?? [])
  const base = from?.levers ?? []
  const changedFromKept = from !== undefined && canonicalIdentityToken(own) !== canonicalIdentityToken(base)
  const held = canonicalIdentityToken(own) !== canonicalIdentityToken(base) || canonicalIdentityToken(pending) !== canonicalIdentityToken(own)
  return {
    own,
    pending,
    setLever,
    setPending,
    refresh,
    reset,
    mode: effectiveMode,
    setMode,
    shown,
    shownKey,
    view,
    landed,
    source,
    changedFromKept,
    held,
    epoch,
    apply,
    openKept,
    openNew,
    markKept,
  }
}

/** Is the slot's many-futures reading worked out on this key (the answer and bundle Apply would write)? */
function isCurrent(s: WhatIfSlotSnapshot, key: string, refiguring: boolean): boolean {
  return !refiguring && s.run.key === key && s.many?.key === key && s.many.kind === 'ok'
}
