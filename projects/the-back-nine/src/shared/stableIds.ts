/**
 * Stable ids for entered accounts and budget lines (schema version 6; the workbench plan's KTD16, U9).
 *
 * A kept what-if names the accounts and lines it changes by id, so an id must outlive every edit and
 * every reorder. Ids are minted in exactly two places, and nowhere else (never per encode, never in the
 * store, never in the codec — its 5 → 6 step is a relabel that mints nothing):
 *
 *  - WHERE A DRAFT ENTERS WITHOUT ONE: {@link withMissingIds}, called by `draftFromScenario` before
 *    anything compares the draft for unsaved changes. DETERMINISTIC (the kind and the position at
 *    open), so two opens of one plan mint the same ids, the re-entry chain's persist seed and the live
 *    draft agree, and a freshly opened version-5 plan reads as saved.
 *  - AN EDITOR'S ADD: {@link freshStableId}, RANDOM, never one a live account or line holds or that any
 *    kept what-if names ({@link idsInUse}). It reads `crypto.getRandomValues`, never `randomUUID`: the
 *    plain-HTTP LAN dev server is not a secure context, and `randomUUID` is absent there.
 *
 * NO ID EVER REACHES THE ENGINE. No params builder reads one, so the solver's run fingerprint, every
 * saved recommendation's "still current" check and the golden cases are untouched by any id
 * (`src/ui/__tests__/draftFromScenario.test.ts` pins the built params byte-identical across the mint).
 * Not imported by `src/engine` (it reads entropy, which engine purity bans).
 */
import type { BudgetLineItem, EnteredAccount, KeptWhatIfV6, WhatIfLeverKind, WhatIfLeverV6 } from './model'

/** The plan fields ids live in or name — a structural slice both the persisted plan and the draft fit
 *  (`src/shared` may not import the store's draft type). */
export interface IdBearingPlan {
  readonly enteredAccounts: readonly EnteredAccount[]
  readonly budget?: readonly BudgetLineItem[]
  readonly keptWhatIfs?: readonly KeptWhatIfV6[]
}

/** The ids each lever kind points at. Exhaustive over the kinds (insight 147): a kind added later names its ids
 *  here, or fails to compile, never left out by omission (the inherited-IRA pace's account id was, gap 3's review). */
const LEVER_IDS: { readonly [K in WhatIfLeverKind]: (lever: Extract<WhatIfLeverV6, { kind: K }>) => readonly string[] } = {
  'stop-year': () => [],
  spending: (l) => (l.op === 'remove' ? [l.lineId] : l.op === 'add' || l.op === 'replace' ? [l.line.id] : []),
  deposits: (l) => [l.accountId],
  mix: () => [],
  roth: () => [],
  'withdrawal-order': () => [],
  'claim-age': () => [],
  'aca-subsidy': () => [],
  'inherited-pace': (l) => [l.accountId],
}

/** Every id the plan holds or names: each account's and line's, each kept what-if's own, and each id a
 *  kept what-if's levers point at (an account, a removed or replaced line, an added line). An Add must
 *  avoid all of them — a fresh line taking an id a kept what-if names would silently re-target it. */
export function idsInUse(plan: IdBearingPlan): Set<string> {
  const out = new Set<string>()
  for (const a of plan.enteredAccounts) if (a.id !== undefined) out.add(a.id)
  for (const l of plan.budget ?? []) if (l.id !== undefined) out.add(l.id)
  for (const k of plan.keptWhatIfs ?? []) {
    out.add(k.id)
    for (const lever of k.levers) {
      for (const id of (LEVER_IDS[lever.kind] as (l: WhatIfLeverV6) => readonly string[])(lever)) out.add(id)
    }
  }
  return out
}

/** The default entropy: the platform CSPRNG (present on an insecure context, unlike `randomUUID`). */
function cryptoRandomBytes(n: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(n))
}

/** A random id no entry of `taken` holds: 12 random bytes as 24 hex characters, re-drawn on the
 *  (astronomically unlikely) collision. `randomBytes` is injectable for tests only. */
export function freshStableId(
  taken: ReadonlySet<string>,
  randomBytes: (n: number) => Uint8Array = cryptoRandomBytes,
): string {
  for (;;) {
    const id = Array.from(randomBytes(12), (b) => b.toString(16).padStart(2, '0')).join('')
    if (!taken.has(id)) return id
  }
}

/** The deterministic open-time id for the entry at `index` of its kind: `<kind>-<index>`, or, if the
 *  plan already holds that, `<kind>-<index>-<n>` for the first free n — a pure function of the plan,
 *  so two opens agree. */
function openTimeId(kind: 'account' | 'line', index: number, taken: Set<string>): string {
  const base = `${kind}-${index}`
  let id = base
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
  taken.add(id)
  return id
}

/**
 * The plan with an id on every entered account and budget line: each one missing gets its
 * deterministic open-time id; every id already present is kept. Returns the SAME object when nothing
 * is missing (a version-6 plan opens unchanged). The id leads each entry's keys, as the editors write it.
 */
export function withMissingIds<P extends IdBearingPlan>(plan: P): P {
  const accountsMissing = plan.enteredAccounts.some((a) => a.id === undefined)
  const linesMissing = (plan.budget ?? []).some((l) => l.id === undefined)
  if (!accountsMissing && !linesMissing) return plan
  const taken = idsInUse(plan)
  const enteredAccounts = accountsMissing
    ? plan.enteredAccounts.map((a, i) => (a.id === undefined ? withId(openTimeId('account', i, taken), a) : a))
    : plan.enteredAccounts
  const budget =
    plan.budget !== undefined && linesMissing
      ? plan.budget.map((l, i) => (l.id === undefined ? withId(openTimeId('line', i, taken), l) : l))
      : plan.budget
  return { ...plan, enteredAccounts, ...(budget !== undefined ? { budget } : {}) }
}

/** The entry with `id` leading its keys (an `id: undefined` key on a draft entry is dropped, never
 *  spread over the new id). */
function withId<T extends { readonly id?: string }>(id: string, entry: T): T {
  const { id: _absent, ...rest } = entry
  return { id, ...rest } as T
}
