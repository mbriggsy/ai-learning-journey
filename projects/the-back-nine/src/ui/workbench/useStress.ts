/**
 * src/ui/workbench/useStress.ts — Retirement → Stress Test's runs and its tray's state (Act 6 · RC11): a hook with no JSX,
 * made once by the shell, so the bars and the tray's edits survive a page move. One slot per bar (`stressRun.ts`), made
 * here once.
 *
 * TWO SETTINGS, AS PROBABILITY'S TRAY (RC4b, "nothing runs until Refresh"): `pending` is what the tray holds; `committed` is
 * what the bars ran. A slider or the Edit drawer touches `pending` only; Refresh commits it and asks every bar at once.
 *
 * NEVER A SKIP ON "LOOKS THE SAME" (insight 159): a Refresh always asks, even when the sizes ended where they started (a
 * run in flight may have read the middle). The bars ask on their own only when something MOVED since their last ask: a
 * new committed answer, a new seed, a Refresh, or the page first shown (the token below), and only while the page shows
 * (a final-tier run per bar on a working plan is not spent on a page nobody is reading). A page left and come back to
 * with nothing moved keeps the bars it ran.
 *
 * THE LAST LANDED COUNT: while a bar's run is in flight it keeps its last landed count under the chart's "Loading…" (ref
 * 2.13's refresh frame), never a blank and never a count from another bar.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { STRESS_IDS, STRESS_RANGES, stressOffer, type StressChoice, type StressId, type StressRefusal } from '@intake/stress'
import { canonicalIdentityToken } from '@shared/model'
import type { MemoryModelSnapshot } from '@store/memoryModel'
import type { CopySlotLanes, CopySlotView, RunnerRefusal, WhatIfReading } from './whatIfRun'
import { whatIfSlotView } from './whatIfRun'
import { createStressSlot, stressKey, type StressAsk, type StressSlot } from './stressRun'
import { answerKey } from './tableRun'

/** A bar of the chart that runs: each stress, and Combined. */
export type StressBarId = StressId | 'combined'
export const STRESS_BAR_IDS: readonly StressBarId[] = [...STRESS_IDS, 'combined']

/** What the tray holds: which stresses are on (the Edit drawer) and each sized stress's size. */
export interface StressSettings {
  readonly on: Readonly<Record<StressId, boolean>>
  readonly pct: Readonly<Record<keyof typeof STRESS_RANGES, number>>
}

/** Every stress on, each at its starting size. */
export const START_SETTINGS: StressSettings = {
  on: { 'social-security': true, 'out-of-pocket': true, 'subsidy-rules': true },
  pct: { 'social-security': STRESS_RANGES['social-security'].start, 'out-of-pocket': STRESS_RANGES['out-of-pocket'].start },
}

/** The stresses a plan offers: each id, and its refusal by name where it has nothing to act on. */
export type StressOffers = Readonly<Record<StressId, StressRefusal | null>>

export function stressOffers(draft: Parameters<typeof stressOffer>[0]): StressOffers {
  return { 'social-security': stressOffer(draft, 'social-security'), 'out-of-pocket': stressOffer(draft, 'out-of-pocket'), 'subsidy-rules': stressOffer(draft, 'subsidy-rules') }
}

/** The chosen stresses (on and offered), in the page's order. */
export function chosenStresses(settings: StressSettings, offers: StressOffers): readonly StressChoice[] {
  const out: StressChoice[] = []
  for (const id of STRESS_IDS) {
    if (!settings.on[id] || offers[id] !== null) continue
    out.push(id === 'subsidy-rules' ? { id } : { id, pct: settings.pct[id] })
  }
  return out
}

/** Each bar's ask: one per chosen stress, and Combined where two or more are chosen (with one, Combined IS that bar). */
export function stressAsks(chosen: readonly StressChoice[]): ReadonlyMap<StressBarId, StressAsk> {
  const asks = new Map<StressBarId, StressAsk>(chosen.map((c) => [c.id, { kind: 'one', choice: c }]))
  if (chosen.length >= 2) asks.set('combined', { kind: 'combined', choices: chosen })
  return asks
}

/** One bar's run as the page may show it. */
export type StressBarRun =
  | { readonly kind: 'ready'; readonly reading: WhatIfReading; readonly updating: boolean }
  /** In flight: the bar's last landed count, where it has one. */
  | { readonly kind: 'loading'; readonly held?: WhatIfReading }
  | { readonly kind: 'error' }
  | { readonly kind: 'refused'; readonly refusal: StressRefusal | RunnerRefusal }
  | { readonly kind: 'withheld' }
  | { readonly kind: 'answer-error' }

/** A bar's run from its slot's view on its own ask (null: the slot holds another ask, or none yet). `answerKey` is the
 *  committed answer's (`answerKey`): a reading landed on another answer is updating, never current. The slot learns of a
 *  new answer only at its next ask (an effect, after paint), so on a return to the page after the answer moved its view
 *  still reads current on the first frame; the key catches it. */
export function barRun(view: CopySlotView<StressRefusal> | null, held: WhatIfReading | undefined, answerKey: string): StressBarRun {
  const loading: StressBarRun = held !== undefined ? { kind: 'loading', held } : { kind: 'loading' }
  if (view === null) return loading
  if (view.kind === 'refused') return { kind: 'refused', refusal: view.refusal }
  if (view.kind === 'withheld') return { kind: 'withheld' }
  if (view.kind === 'answer-error') return { kind: 'answer-error' }
  const m = view.many
  if (m.kind === 'loading') return loading
  if (m.kind === 'error') return { kind: 'error' }
  return { kind: 'ready', reading: m.value.whatIf, updating: m.updating || m.answerKey !== answerKey }
}

export interface Stress {
  readonly committed: StressSettings
  readonly pending: StressSettings
  readonly setPending: (next: StressSettings) => void
  /** Commit the pending settings and ask every bar (always, insight 159). */
  readonly refresh: () => void
  /** The tray back to every stress on at its starting size (it runs at the next Refresh). */
  readonly reset: () => void
  /** The stresses the committed answer's plan offers. */
  readonly offers: StressOffers | null
  /** Each asked bar's run, by bar (a bar the committed settings do not ask is absent). */
  readonly bars: ReadonlyMap<StressBarId, StressBarRun>
}

export function useStress({ snapshot, active, lanes }: { readonly snapshot: MemoryModelSnapshot; readonly active: boolean; readonly lanes?: Partial<Record<StressBarId, CopySlotLanes>> }): Stress {
  const [slots] = useState(() => new Map<StressBarId, StressSlot>(STRESS_BAR_IDS.map((id) => [id, createStressSlot(lanes?.[id])])))
  const slot = (id: StressBarId) => slots.get(id)!
  // One subscription per slot (a fixed four, so the hooks' order never moves).
  const s0 = useSyncExternalStore(slot('social-security').subscribe, slot('social-security').getSnapshot)
  const s1 = useSyncExternalStore(slot('out-of-pocket').subscribe, slot('out-of-pocket').getSnapshot)
  const s2 = useSyncExternalStore(slot('subsidy-rules').subscribe, slot('subsidy-rules').getSnapshot)
  const s3 = useSyncExternalStore(slot('combined').subscribe, slot('combined').getSnapshot)
  const snaps = { 'social-security': s0, 'out-of-pocket': s1, 'subsidy-rules': s2, combined: s3 } as const

  const [committed, setCommitted] = useState<StressSettings>(START_SETTINGS)
  const [pending, setPendingState] = useState<StressSettings>(START_SETTINGS)
  const pendingRef = useRef(pending)
  const setPending = useCallback((next: StressSettings) => {
    pendingRef.current = next
    setPendingState(next)
  }, [])
  const [refreshes, setRefreshes] = useState(0)
  const refresh = useCallback(() => {
    setCommitted(pendingRef.current)
    setRefreshes((n) => n + 1)
  }, [])
  const reset = useCallback(() => setPending(START_SETTINGS), [setPending])

  const answer = snapshot.answer
  const committedDraft = answer.kind === 'headline' || answer.kind === 'date' ? answer.draft : null
  const offers = useMemo(() => (committedDraft === null ? null : stressOffers(committedDraft)), [committedDraft])
  const asks = useMemo(() => (offers === null ? new Map<StressBarId, StressAsk>() : stressAsks(chosenStresses(committed, offers))), [committed, offers])
  const aKey = answer.kind === 'headline' || answer.kind === 'date' ? answerKey(answer) : answer.kind
  const seed = snapshot.draft.seed
  const asksKey = canonicalIdentityToken([...asks].map(([id, ask]) => [id, stressKey(ask)]))
  // The last ask's token: the bars ask again only when one of its parts moved (never because the sizes look alike).
  const lastAsked = useRef<string | null>(null)
  useEffect(() => {
    if (!active) return
    const token = `${aKey}|${String(seed)}|${asksKey}|${refreshes}`
    if (lastAsked.current === token) return
    lastAsked.current = token
    for (const [id, ask] of asks) slots.get(id)!.ask(answer, seed, ask)
    // Keyed on the token's parts: `answer` and `asks` are those keys' values.
  }, [active, aKey, seed, asksKey, refreshes, slots])

  // Each bar's last landed count (derived during render: the newest current reading on its own ask).
  const [landed, setLanded] = useState<ReadonlyMap<StressBarId, { readonly key: string; readonly reading: WhatIfReading }>>(() => new Map())
  const bars = new Map<StressBarId, StressBarRun>()
  let nextLanded: Map<StressBarId, { readonly key: string; readonly reading: WhatIfReading }> | null = null
  for (const [id, ask] of asks) {
    const snap = snaps[id]
    const view = snap.run.bundleKey === stressKey(ask) ? whatIfSlotView(snap) : null
    const run = barRun(view, landed.get(id)?.reading, aKey)
    bars.set(id, run)
    const many = snap.many
    if (run.kind === 'ready' && !run.updating && many?.kind === 'ok' && landed.get(id)?.key !== many.key) {
      nextLanded ??= new Map(landed)
      nextLanded.set(id, { key: many.key, reading: run.reading })
    }
  }
  if (nextLanded !== null) setLanded(nextLanded)

  return { committed, pending, setPending, refresh, reset, offers, bars }
}
