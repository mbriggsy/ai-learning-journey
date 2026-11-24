/*
 * src/intake/whatIf.ts — a what-if: a bundle of lever values applied to a COPY of the plan's draft (the workbench plan's
 * KTD10, U14), and the lever writers the front-room sheets share, so U15's Apply writes exactly what was compared.
 *
 * ONE FUNCTION APPLIES A BUNDLE ({@link applyBundle}), with one arm per lever kind in a mapped-type table, so a kind
 * added to `WHAT_IF_LEVER_KINDS` fails to compile here (insight 147). It returns the copy, or a refusal by name; it
 * never throws on a lever and never writes the draft it was handed. The copy is then compiled by the plan's OWN
 * builders (`buildControlPreviewParams`, `buildTableBase`), never a second composer (insight 081).
 *
 * The arms:
 *  - stop year: writes NOTHING to the draft. It turns the calendar year into the date search's offset (the year less
 *    `startCalendarYear`) and refuses an offset outside the date window, and any stop year on an all-retired household,
 *    before any run (the engine itself accepts the window top plus one, so this is the guard).
 *  - spending: adds, replaces or removes a whole line by id (the line in `BudgetLineItem`'s own shape, years counted
 *    from the stop exactly as the plan's lines are, KTD18), then re-reconciles the copy's total ONCE through the plan's
 *    own budget writer (`commitBudgetPatch`, insight 058), so the order of a bundle's line levers never matters; or sets
 *    the one-figure total on a draft with no itemized budget. A bundle that would remove every line is refused: the
 *    budget writer's empty list is the builder's "back to a single number" escape, which keeps the old total (so the
 *    what-if would read as if nothing were removed), and on a floor-track plan `simulate` has no floor pass without
 *    the budget construct.
 *  - deposits: the yearly deposit on the account with that id, and the employer match or the employer's HSA dollar
 *    only where the lever holds an override (absent = the plan's own fact). Then the family-wide draft rule
 *    (`validateDraft`'s contribution ceilings) runs on the copy: an owner's deposits share one ceiling across a family's
 *    accounts, so two accounts can each pass alone and still be trimmed together by `familyScaleAt`; a copy over any
 *    ceiling is a refusal by name, never a silent trim.
 *  - mix: the household split written as every account's hand mix on the copy, each ticker cleared (`blendSourceOf`
 *    reads a ticker first), so `householdStockWeight` over `resolveBlend` stays the one producer of the household mix.
 *  - Roth plan, withdrawal order, the ACA regime: the shared writers below.
 *  - claim age: refused when the person's claim is already in effect, or when the lever's age is already past (a claim
 *    cannot start in a year gone by); both in the run's own frame (claimed at t = 0 when the current age has reached
 *    the claim age, the engine's own test).
 * A lever whose line or account is gone is refused by name, never re-targeted (R21). A bundle holding two levers of one
 * kind on one target is refused (the codec refuses it in a kept what-if; a live bundle is checked here).
 */
import { commitBudgetPatch } from '@budget/budgetToSpending'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import type { ScenarioDraft } from '@store/memoryModel'
import type {
  BudgetLineItem,
  DrawdownOrderKey,
  DrawdownPolicy,
  EnteredAccount,
  KeptWhatIfV6,
  RothConversionPlan,
  WhatIfLeverKind,
  WhatIfLeverV6,
} from '@shared/model'
import { isDateRoute, isWorkingOwner } from './intakeMap'
import { accountField, isEmployerPlanKind, validateDraft } from './sanity'

// ---------------------------------------------------------------------------
// The lever writers — the one write of each lever, shared by the front-room sheets (`src/ui/editorSheets.tsx`),
// `applyBundle` and U15's Apply. Each is the expression the sheet held inline, moved here byte-identical.
// ---------------------------------------------------------------------------

/** The budget's commit: the items and the reconciled total in ONE write (insight 058). The OOP figure is the draft's
 *  own, so a caller inside `model.update` reads the store's CURRENT draft (insight 036). */
export function withBudgetItems(d: ScenarioDraft, items: readonly BudgetLineItem[]): ScenarioDraft {
  return { ...d, ...commitBudgetPatch(items, d.health.oopMedicalAnnual) }
}

/** Back to a single number: the budget returns to strictly-undefined and the total keeps its last reconciled value
 *  (build-gate 2 — never `budget: []`). */
export function withoutBudget(d: ScenarioDraft): ScenarioDraft {
  return { ...d, budget: undefined }
}

/** The withdrawal order: ONE atomic write keeps the 'custom' ⟺ order biconditional (the codec re-proves it at Save;
 *  validateParams re-proves it at every run — the two-gate rule's write half). */
export function withDrawdownPolicy(
  d: ScenarioDraft,
  policy: DrawdownPolicy,
  order: readonly DrawdownOrderKey[] | undefined,
): ScenarioDraft {
  const { drawdownOrder: _order, ...rest } = d
  return { ...rest, drawdownPolicy: policy, ...(order !== undefined ? { drawdownOrder: order } : {}) }
}

/** The Roth plan: set it, or strip the KEY (absence ≡ no conversions ≡ reduce-to-spine — never an undefined-valued
 *  slot a JSON write would null, DND/009). */
export function withRothConversion(d: ScenarioDraft, plan: RothConversionPlan | undefined): ScenarioDraft {
  if (plan !== undefined) return { ...d, rothConversion: plan }
  const { rothConversion: _plan, ...rest } = d
  return rest
}

/** THE SINGLE-KEY WRITE FENCE (insight 058): exactly one key moves — the literal `true`, or the key STRIPPED (absence ≡
 *  the statutory reverted regime — never `false`, DND/009). */
export function withEnhancedSubsidies(d: ScenarioDraft, enhanced: boolean): ScenarioDraft {
  const { enhancedSubsidies: _regime, ...rest } = d
  return enhanced ? { ...rest, enhancedSubsidies: true } : rest
}

/** The kept what-ifs list (Act 6 · RC5, the plan list): set it, or strip the KEY when empty (absence ≡ none kept, the
 *  codec's own reading; never `[]` beside an absent list, which would read as an edit to the disk compare). */
export function withKeptWhatIfs(d: ScenarioDraft, list: readonly KeptWhatIfV6[]): ScenarioDraft {
  if (list.length > 0) return { ...d, keptWhatIfs: list }
  const { keptWhatIfs: _list, ...rest } = d
  return rest
}

// ---------------------------------------------------------------------------
// applyBundle
// ---------------------------------------------------------------------------

/** Why a bundle cannot run on this plan, by name (the rail says it in words, U15; a kept what-if says it, U16). */
export type WhatIfRefusal =
  | { readonly kind: 'duplicate-target'; readonly lever: WhatIfLeverKind; readonly target: string }
  | { readonly kind: 'stop-year-all-retired' }
  | { readonly kind: 'stop-year-outside-window'; readonly calendarYear: number; readonly offsetYears: number }
  | { readonly kind: 'line-gone'; readonly lineId: string }
  | { readonly kind: 'line-already-there'; readonly lineId: string }
  | { readonly kind: 'spending-no-budget' }
  | { readonly kind: 'spending-total-on-budget' }
  | { readonly kind: 'budget-dropped' }
  | { readonly kind: 'account-gone'; readonly accountId: string }
  | { readonly kind: 'deposits-owner-not-working'; readonly accountId: string }
  | { readonly kind: 'deposits-field-not-on-kind'; readonly accountId: string; readonly field: 'employerMatchAnnual' | 'hsaEmployerAnnual' }
  | { readonly kind: 'deposits-over-limit'; readonly accountId: string; readonly rule: string }
  | { readonly kind: 'person-gone'; readonly personIndex: number }
  | { readonly kind: 'claim-age-already-claimed'; readonly personIndex: number }
  | { readonly kind: 'claim-age-in-the-past'; readonly personIndex: number; readonly claimAge: number }

/** An applied bundle: the copy, and the stop-year lever's offset (absent with no stop lever: the run uses the plan's
 *  own base offset). */
export type AppliedBundle =
  | { readonly ok: true; readonly draft: ScenarioDraft; readonly stopOffsetYears?: number }
  | { readonly ok: false; readonly refusal: WhatIfRefusal }

type LeverOf<K extends WhatIfLeverKind> = Extract<WhatIfLeverV6, { readonly kind: K }>

/** The working state one bundle threads through its arms. The spending lines are collected and committed once after
 *  every arm has run. */
interface Working {
  draft: ScenarioDraft
  stopOffsetYears?: number
  /** The copy's lines while line levers apply; `undefined` until the first line lever. */
  lines?: BudgetLineItem[]
  /** Account indices a deposits lever wrote (the fields the ceiling rule then judges). */
  readonly depositIndices: number[]
}

type Arm<K extends WhatIfLeverKind> = (w: Working, lever: LeverOf<K>) => WhatIfRefusal | null

/** Each lever's target inside a bundle: two levers of one kind on one target is a refusal. */
const TARGET: { readonly [K in WhatIfLeverKind]: (lever: LeverOf<K>) => string } = {
  'stop-year': () => 'household',
  spending: (l) => (l.op === 'total' ? 'total' : `line:${l.op === 'remove' ? l.lineId : l.line.id}`),
  deposits: (l) => `account:${l.accountId}`,
  mix: () => 'household',
  roth: () => 'household',
  'withdrawal-order': () => 'household',
  'claim-age': (l) => `person:${l.personIndex}`,
  'aca-subsidy': () => 'household',
}

const ARMS: { readonly [K in WhatIfLeverKind]: Arm<K> } = {
  'stop-year': (w, l) => {
    if (!isDateRoute(w.draft)) return { kind: 'stop-year-all-retired' }
    const offsetYears = l.calendarYear - w.draft.startCalendarYear
    if (!Number.isInteger(offsetYears) || offsetYears < 0 || offsetYears > DATE_OFFSET_WINDOW_TOP) {
      return { kind: 'stop-year-outside-window', calendarYear: l.calendarYear, offsetYears }
    }
    w.stopOffsetYears = offsetYears
    return null
  },
  spending: (w, l) => {
    const budget = w.draft.budget
    if (l.op === 'total') {
      if (budget !== undefined) return { kind: 'spending-total-on-budget' }
      w.draft = { ...w.draft, annualSpendingReal: l.annualSpendingReal }
      return null
    }
    if (budget === undefined) return l.op === 'add' ? { kind: 'spending-no-budget' } : { kind: 'line-gone', lineId: l.op === 'remove' ? l.lineId : l.line.id }
    const lines = (w.lines ??= [...budget])
    const id = l.op === 'remove' ? l.lineId : l.line.id
    const at = lines.findIndex((line) => line.id === id)
    if (l.op === 'add') {
      if (at !== -1) return { kind: 'line-already-there', lineId: id }
      lines.push(l.line)
      return null
    }
    if (at === -1) return { kind: 'line-gone', lineId: id }
    if (l.op === 'replace') lines[at] = l.line
    else lines.splice(at, 1)
    return null
  },
  deposits: (w, l) => {
    const at = w.draft.enteredAccounts.findIndex((a) => a.id === l.accountId)
    if (at === -1) return { kind: 'account-gone', accountId: l.accountId }
    const account = w.draft.enteredAccounts[at]!
    // KTD15: a retired owner's deposits compile to nothing, so no deposits lever applies to their accounts.
    if (!isWorkingOwner(w.draft, account.ownerIndex)) return { kind: 'deposits-owner-not-working', accountId: l.accountId }
    // An override the account's kind cannot carry would be silently inert in the run (the builder reads the match on
    // employer plans only, the employer's HSA dollar on an HSA only).
    if (l.employerMatchAnnual !== undefined && !isEmployerPlanKind(account.kind)) {
      return { kind: 'deposits-field-not-on-kind', accountId: l.accountId, field: 'employerMatchAnnual' }
    }
    if (l.hsaEmployerAnnual !== undefined && account.kind !== 'hsa') {
      return { kind: 'deposits-field-not-on-kind', accountId: l.accountId, field: 'hsaEmployerAnnual' }
    }
    const next: EnteredAccount = {
      ...account,
      annualContribution: l.annualContribution,
      ...(l.employerMatchAnnual !== undefined ? { employerMatchAnnual: l.employerMatchAnnual } : {}),
      ...(l.hsaEmployerAnnual !== undefined ? { hsaEmployerAnnual: l.hsaEmployerAnnual } : {}),
    }
    w.draft = { ...w.draft, enteredAccounts: w.draft.enteredAccounts.map((a, i) => (i === at ? next : a)) }
    w.depositIndices.push(at)
    return null
  },
  mix: (w, l) => {
    const manualBlend = { kind: 'exact', stockPct: l.stockPct, bondPct: l.bondPct, cashPct: l.cashPct } as const
    w.draft = {
      ...w.draft,
      enteredAccounts: w.draft.enteredAccounts.map((a) => {
        const { ticker: _ticker, ...rest } = a
        return { ...rest, manualBlend }
      }),
    }
    return null
  },
  roth: (w, l) => {
    w.draft = withRothConversion(w.draft, l.conversion.kind === 'plan' ? l.conversion.plan : undefined)
    return null
  },
  'withdrawal-order': (w, l) => {
    w.draft = withDrawdownPolicy(w.draft, l.policy, l.policy === 'custom' ? l.drawdownOrder : undefined)
    return null
  },
  'claim-age': (w, l) => {
    const person = w.draft.people[l.personIndex]
    if (person === undefined) return { kind: 'person-gone', personIndex: l.personIndex }
    const age = person.currentAge
    if (age !== undefined && person.socialSecurityClaimAge !== undefined && age >= person.socialSecurityClaimAge) {
      return { kind: 'claim-age-already-claimed', personIndex: l.personIndex }
    }
    if (age !== undefined && l.claimAge < age) return { kind: 'claim-age-in-the-past', personIndex: l.personIndex, claimAge: l.claimAge }
    const people = w.draft.people.map((p, i) => (i === l.personIndex ? { ...p, socialSecurityClaimAge: l.claimAge } : p))
    w.draft = { ...w.draft, people: people as unknown as ScenarioDraft['people'] }
    return null
  },
  'aca-subsidy': (w, l) => {
    w.draft = withEnhancedSubsidies(w.draft, l.enhanced)
    return null
  },
}

/** The deposits-ceiling rules of the family-wide draft rule (`validateDraft`). */
const CEILING_RULES: ReadonlySet<string> = new Set(['contribution-over-ceiling', 'additions-over-415c'])

/**
 * Apply a bundle to a copy of `draft`: the copy, or the first refusal by name. Never writes `draft`. An empty bundle
 * returns `draft` itself (the plan's own bytes for every build).
 */
export function applyBundle(draft: ScenarioDraft, bundle: readonly WhatIfLeverV6[]): AppliedBundle {
  const targets = new Set<string>()
  for (const lever of bundle) {
    const target = (TARGET[lever.kind] as (l: WhatIfLeverV6) => string)(lever)
    const key = `${lever.kind} ${target}`
    if (targets.has(key)) return { ok: false, refusal: { kind: 'duplicate-target', lever: lever.kind, target } }
    targets.add(key)
  }
  const w: Working = { draft, depositIndices: [] }
  for (const lever of bundle) {
    const refusal = (ARMS[lever.kind] as Arm<WhatIfLeverKind>)(w, lever as never)
    if (refusal !== null) return { ok: false, refusal }
  }
  if (w.lines !== undefined) {
    if (w.lines.length === 0) return { ok: false, refusal: { kind: 'budget-dropped' } }
    w.draft = withBudgetItems(w.draft, w.lines)
  }
  if (w.depositIndices.length > 0) {
    const touched = new Set(w.depositIndices.flatMap((i) => [accountField(i, 'annualContribution'), accountField(i, 'employerMatchAnnual')]))
    const over = validateDraft(w.draft, touched).find((v) => CEILING_RULES.has(v.rule))
    if (over !== undefined) {
      const index = w.depositIndices.find((i) => over.field.startsWith(accountField(i, '')))
      const accountId = (index !== undefined ? w.draft.enteredAccounts[index]?.id : undefined) ?? ''
      return { ok: false, refusal: { kind: 'deposits-over-limit', accountId, rule: over.rule } }
    }
  }
  return { ok: true, draft: w.draft, ...(w.stopOffsetYears !== undefined ? { stopOffsetYears: w.stopOffsetYears } : {}) }
}
