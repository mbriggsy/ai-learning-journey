/**
 * src/ui/screens/retirement/planListView.ts: the plan list's one pure composer (plan docs/plans/6-rightcapital-ui-plan.md,
 * RC5; ref 2.8's plan list; `rc-analysis/FRAME_add-or-remove-plans-drawer.png`). `PlanListDrawer.tsx` draws what this
 * returns and decides nothing (insight 048: a rule inline in a render is untested).
 *
 * THE LIST. Your plan and Recommended pinned on top (Recommended only where the left picker can run it), a divider, then
 * the kept what-ifs by name, in the list's own order (that order is what is saved: `keptWhatIfs` on the plan record,
 * schema v6, `KeptWhatIfV6`). Each kept row opens on the left side; where the tab can write, it also offers Copy, Rename,
 * Delete and its drag handle.
 *
 * THE WRITES (KTD19, RC5's decisions). Every change to the list writes through the plan's one save path, and only on a
 * clean draft: with unsaved changes, a save in flight, a failed save or an answer that can't be saved, the write
 * controls are not offered and the drawer says why (the vault stays as it was). With no vault yet, Keep opens the save
 * ceremony (the list rides that first save); a rename, copy, delete or move there changes the unsaved plan only, which
 * the ceremony then saves whole. A read-only tab lists and opens kept what-ifs and offers no write at all.
 *
 * KEEP. Keep names the tray's COMMITTED bundle (what the left half shows): not on the recommendation's side, not on an
 * empty bundle (it changes nothing), not while the tray holds edits Refresh hasn't run. A reopened kept what-if that was
 * edited is "changed, not kept" until Keep, which replaces the kept one under its id (its name offered again).
 */
import type { KeptWhatIfV6, WhatIfLeverV6 } from '@shared/model'
import { canonicalIdentityToken } from '@shared/model'
import { freshStableId } from '@shared/stableIds'
import type { ResultSaveView } from '../../resultSave'
import { copy, slots } from '../../copy'
import { sourceKept, type LeftSource } from '../../workbench/useWhatIf'

/** A kept what-if's name may hold up to this many characters (the pickers print it whole: it wraps, never cuts). */
export const KEPT_NAME_MAX = 60

/** Can the list be written, and how (the plan's save machine's view decides, KTD19)? */
export type ListWrites =
  | { readonly kind: 'hidden' }
  /** Not offered now: the words say why. */
  | { readonly kind: 'withheld'; readonly words: string }
  /** `ceremony`: no vault yet (Keep opens the save ceremony; the other writes change the unsaved plan). `busy`: a save
   *  is in flight (the controls stay where they are, so a keyboard move keeps its focus; a press meanwhile is refused
   *  with its words by the write itself). */
  | { readonly kind: 'open'; readonly ceremony: boolean; readonly busy?: boolean }

export function listWrites(save: ResultSaveView['kind'], readOnly: boolean): ListWrites {
  if (readOnly) return { kind: 'hidden' }
  switch (save) {
    case 'first':
      return { kind: 'open', ceremony: true }
    case 'clean':
      return { kind: 'open', ceremony: false }
    case 'dirty':
      return { kind: 'withheld', words: copy.planListWritesDirty }
    case 'saving':
      return { kind: 'open', ceremony: false, busy: true }
    case 'failed':
      return { kind: 'withheld', words: copy.planListWritesFailed }
    case 'none':
      return { kind: 'withheld', words: copy.planListWritesNone }
  }
}

export type KeepState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'withheld'; readonly words: string }
  /** Keep is offered. `replaces`: a reopened kept what-if that was changed (Keep replaces it, its name offered). */
  | { readonly kind: 'open'; readonly replaces?: { readonly id: string; readonly name: string } }

export interface KeepInput {
  readonly writes: ListWrites
  /** The left side shows the saved recommendation. */
  readonly recommendation: boolean
  readonly source: LeftSource
  /** The committed bundle (what the left half shows) and the tray's pending one. */
  readonly own: readonly WhatIfLeverV6[]
  readonly pending: readonly WhatIfLeverV6[]
  readonly kept: readonly KeptWhatIfV6[]
}

const same = (a: readonly WhatIfLeverV6[], b: readonly WhatIfLeverV6[]): boolean => canonicalIdentityToken(a) === canonicalIdentityToken(b)

export function keepState(input: KeepInput): KeepState {
  const { writes, recommendation, source, own, pending, kept } = input
  if (writes.kind === 'hidden') return { kind: 'hidden' }
  if (writes.kind === 'withheld') return writes
  if (recommendation) return { kind: 'withheld', words: copy.planListKeepRecommended }
  if (!same(own, pending)) return { kind: 'withheld', words: copy.planListKeepRefreshFirst }
  const from = sourceKept(source, kept)
  if (from !== undefined) {
    if (same(from.levers, own)) return { kind: 'withheld', words: slots.planListKeepAlready(from.name) }
    return { kind: 'open', replaces: { id: from.id, name: from.name } }
  }
  if (own.length === 0) return { kind: 'withheld', words: copy.planListKeepEmpty }
  return { kind: 'open' }
}

/** What a write to the list came to (IntakeApp's `onWriteKept`, through the plan's one save path). */
export type KeptWriteOutcome =
  /** Written to the vault. */
  | { readonly kind: 'saved' }
  /** No vault yet: the unsaved plan holds it (the first save carries it). */
  | { readonly kind: 'draft' }
  /** No vault yet and a Keep: the save ceremony opened (the shell unmounts). */
  | { readonly kind: 'ceremony' }
  /** In the plan, but the save didn't finish (the lock menu has Try again). */
  | { readonly kind: 'failed' }
  /** Nothing changed: the plan's save state refused it (the words of `listWrites`), or the list moved on before the press
   *  landed (`stale`), or the plan could not carry it (`invalid`). */
  | { readonly kind: 'refused'; readonly reason: ResultSaveView['kind'] | 'read-only' | 'stale' | 'invalid' }

/** An outcome's words (none where the list itself shows what happened). */
export function outcomeWords(outcome: KeptWriteOutcome): string | null {
  switch (outcome.kind) {
    case 'saved':
    case 'draft':
    case 'ceremony':
      return null
    case 'failed':
      return copy.planListSaveFailed
    case 'refused': {
      if (outcome.reason === 'stale' || outcome.reason === 'invalid') return copy.planListRefused
      if (outcome.reason === 'saving') return copy.planListWritesSaving
      const w = listWrites(outcome.reason === 'read-only' ? 'none' : outcome.reason, outcome.reason === 'read-only')
      return w.kind === 'withheld' ? w.words : copy.planListRefused
    }
  }
}

/** Why a typed name can't be used, or null. Trimmed; unique among the other kept what-ifs (case-blind), so the pickers
 *  never print two choices alike. */
export function nameError(typed: string, kept: readonly KeptWhatIfV6[], exceptId?: string): string | null {
  const name = typed.trim()
  if (name.length === 0) return copy.planListNameEmpty
  if (name.length > KEPT_NAME_MAX) return slots.planListNameLong(KEPT_NAME_MAX)
  const lower = name.toLocaleLowerCase()
  if (kept.some((k) => k.id !== exceptId && k.name.trim().toLocaleLowerCase() === lower)) return copy.planListNameTaken
  return null
}

// ── The list's writes, as pure edits of the CURRENT list (IntakeApp applies each to the store's own draft at the press,
// insight 036, so two writes never build on a stale render) ────────────────────────────────────────────────────────

export type KeptEdit = (list: readonly KeptWhatIfV6[], idsInUse: ReadonlySet<string>) => readonly KeptWhatIfV6[] | null

/** Keep: the changed one in its place under its own id (`replaces`), or a new kept what-if at the end of the list under
 *  `id` (minted by the caller with `freshStableId`; refused if the plan holds that id by the press). */
export const keepEdit = (id: string, name: string, levers: readonly WhatIfLeverV6[], replaces: boolean): KeptEdit => (list, ids) => {
  const kept: KeptWhatIfV6 = { id, name: name.trim(), levers }
  if (replaces) return list.some((k) => k.id === id) ? list.map((k) => (k.id === id ? kept : k)) : null
  return ids.has(id) ? null : [...list, kept]
}

export const renameEdit = (id: string, name: string): KeptEdit => (list) =>
  list.some((k) => k.id === id) ? list.map((k) => (k.id === id ? { ...k, name: name.trim() } : k)) : null

export const deleteEdit = (id: string): KeptEdit => (list) => (list.some((k) => k.id === id) ? list.filter((k) => k.id !== id) : null)

/** A copy right after its original, named "Copy of …" (numbered past the first copy so no two names match). */
export const copyEdit = (id: string): KeptEdit => (list, ids) => {
  const at = list.findIndex((k) => k.id === id)
  if (at === -1) return null
  const from = list[at]!
  const names = new Set(list.map((k) => k.name.trim().toLocaleLowerCase()))
  let n = 1
  while (names.has(slots.planListCopyName(from.name, n).toLocaleLowerCase())) n++
  const copied: KeptWhatIfV6 = { id: freshStableId(ids), name: slots.planListCopyName(from.name, n).slice(0, KEPT_NAME_MAX), levers: from.levers }
  return [...list.slice(0, at + 1), copied, ...list.slice(at + 1)]
}

/** The list in a new order (ids in their new places); null when the ids are not exactly the list's. */
export const orderEdit = (ids: readonly string[]): KeptEdit => (list) => {
  if (ids.length !== list.length || !ids.every((id) => list.some((k) => k.id === id))) return null
  return ids.map((id) => list.find((k) => k.id === id)!)
}

/** An id moved one place up (-1) or down (+1); the same order at an end. */
export function moved(ids: readonly string[], id: string, dir: -1 | 1): readonly string[] {
  const at = ids.indexOf(id)
  const to = at + dir
  if (at === -1 || to < 0 || to >= ids.length) return ids
  const next = [...ids]
  next[at] = ids[to]!
  next[to] = id
  return next
}

// ── The drawer's view ──────────────────────────────────────────────────────────────────────────────────────────────

export interface PlanListRow {
  readonly id: string
  readonly name: string
  /** The row opens on the left side (the one the left picker shows now is marked). */
  readonly shownLeft: boolean
  readonly shownRight: boolean
}

export interface PlanListView {
  readonly title: string
  readonly pinned: readonly string[]
  readonly rows: readonly PlanListRow[]
  readonly empty?: string
  /** The rows carry Copy, Rename, Delete and the drag handle. */
  readonly canWrite: boolean
  /** Why the list can't be changed now (the words in place of the controls). */
  readonly withheld?: string
  /** No vault yet: what the list's writes do. */
  readonly ceremonyNote?: string
  readonly keep: KeepState
}

export interface PlanListInput extends KeepInput {
  /** Recommended pinned on top (the left picker can run it). */
  readonly recommendedOffered: boolean
  /** The kept id each picker shows (if any). */
  readonly leftKept?: string
  readonly rightKept?: string
}

export function planListView(input: PlanListInput): PlanListView {
  const { writes, kept } = input
  const pinned = [copy.probabilityPlanTitle, ...(input.recommendedOffered ? [copy.probabilityPickRecommended] : [])]
  return {
    title: copy.planListTitle,
    pinned,
    rows: kept.map((k) => ({ id: k.id, name: k.name, shownLeft: k.id === input.leftKept, shownRight: k.id === input.rightKept })),
    ...(kept.length === 0 ? { empty: copy.planListEmpty } : {}),
    canWrite: writes.kind === 'open',
    ...(writes.kind === 'withheld' ? { withheld: writes.words } : {}),
    ...(writes.kind === 'open' && writes.ceremony ? { ceremonyNote: kept.length > 0 ? copy.planListFirstListNote : copy.planListFirstNote } : {}),
    keep: keepState(input),
  }
}
