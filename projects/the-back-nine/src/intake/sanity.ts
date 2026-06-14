/**
 * R19 sanity — the UI half, decomposed per rule (phase-2 U5 contract, built by
 * D1). Each rule is a discrete, testable predicate that blocks ONLY true
 * impossibilities; coherent-but-dire input ($0 portfolio + positive spend)
 * flows through to an honest "0 of 10". The engine's `validateParams` is the
 * numeric-domain BACKSTOP — these rules exist so no impossible combination
 * even reaches it, with a calm message at the field that caused it.
 *
 * THE STATUS-CONDITIONAL AGE RULE (D1 supersession of U5's unconditional
 * "retirement age before current age"): for an already-RETIRED person,
 * `retirementAge ≤ currentAge` is the LEGITIMATE entry (the stop age) — the
 * contradiction to catch is status-vs-age DISAGREEMENT (retired + a stop age in
 * the future). A still-working person is never asked the question at all (the
 * placeholder is intakeMap-constructed, strictly > currentAge).
 *
 * DIRECTIONAL RE-VALIDATION IS A PURE RECOMPUTE: `validateDraft(draft, touched)`
 * derives every firing from the CURRENT draft each call — no imperative
 * "mark dirty" state. A rule fires iff (1) every input it needs is present,
 * and (2) its TARGET field has been touched (committed at least once), so an
 * upstream Back-edit automatically re-fires downstream rules at the point of
 * edit while never flagging questions the user hasn't reached. Downstream
 * answers are KEPT (the draft is never wiped) — exactly the contract's
 * "keeps answers, re-validates dependents".
 *
 * VALIDATION TIMING is the flow's job (blur / attempt-to-advance, never per
 * keystroke; clear on re-edit) — these predicates are timing-free.
 */
import type { CopyKey } from '@ui/copy'
import type { ScenarioDraft } from '@store/memoryModel'
import type { AccountKind } from '@shared/model'
import {
  annualAdditions415c2026,
  catchUpForAge,
  employerPlan2026,
  hsa2026,
  ira2026,
  type CatchUpAccountKind,
} from '@engine/constants/contributions'

/** Engine longevity-table ceiling (SSA snapshot support, P1-exit pin pass). */
const MAX_MODEL_AGE = 119
const SS_CLAIM_MIN = 62
const SS_CLAIM_MAX = 70

/** The period-confirm floor (R19 period defense, line one): while the spend
 *  unit is still the UNCONFIRMED default, an entered figure at or above this
 *  MONTH-view amount forces an explicit $/month-vs-$/year answer — the engine
 *  can never run on 1/12× or 12× the real figure. NO upper bound: a figure above
 *  a plausible monthly spend, left under the 'month' default (e.g. 55000 → the
 *  engine sees $660k/yr), is exactly the 12× silent misentry this line exists to
 *  catch; an honest $55k/MONTH household taps the unit once and is never nagged
 *  again (the explicit-declaration disarm). Below the floor a spend is
 *  unambiguously monthly (an annual figure under $8k is implausibly low). */
const SPEND_AMBIGUOUS_MIN = 8_000

/** Field paths — the violation↔field association targets (aria-describedby ids
 *  derive from these). */
export type FieldPath = string
export const personField = (index: number, field: string): FieldPath =>
  `people.${index}.${field}`
export const accountField = (index: number, field: string): FieldPath =>
  `enteredAccounts.${index}.${field}`

// ---------------------------------------------------------------------------
// Contribution ceilings (R19 via C1) — ONE source for both the AccountEntry
// form's pre-add check and the advance-time rules below. "You can't contribute
// more than today's limit": ceilings key to the CURRENT age (the per-runway-
// year step-down is intakeMap's stream expansion, slice (e)).
// ---------------------------------------------------------------------------

const KIND_TO_CATCHUP: Readonly<Record<AccountKind, CatchUpAccountKind | null>> = {
  '401k': 'employerPlan',
  '403b': 'employerPlan',
  'roth-401k': 'employerPlan',
  'traditional-ira': 'ira',
  'roth-ira': 'ira',
  hsa: 'hsa',
  brokerage: null, // no statutory ceiling
}

export const isEmployerPlanKind = (kind: AccountKind): boolean =>
  KIND_TO_CATCHUP[kind] === 'employerPlan'

/** The per-PERSON statutory employee-contribution ceiling for an account kind at
 *  an age (combined across that person's accounts of the same family — §402(g)
 *  is per person across plans; the IRA limit is traditional+Roth combined).
 *  HSA uses the FAMILY figure (coverage tier is unasked — block only the true
 *  impossibility). Brokerage → null (uncapped). */
export function contributionCeilingFor(kind: AccountKind, age: number): number | null {
  const catchUpKind = KIND_TO_CATCHUP[kind]
  if (catchUpKind === null) return null
  const catchUp = catchUpForAge(age, catchUpKind)
  if (catchUpKind === 'employerPlan') return employerPlan2026.value.electiveDeferral + catchUp
  if (catchUpKind === 'ira') return ira2026.value.contributionLimit + catchUp
  return hsa2026.value.contributionFamily + catchUp
}

/** The per-PLAN employee+employer annual-additions ceiling (§415(c)). Catch-up
 *  dollars sit ON TOP of the $72,000 — the ceiling is the figure PLUS the
 *  applicable band, never the bare cap (the C1 note's explicit trap). */
export function annualAdditionsCeilingFor(age: number): number {
  return annualAdditions415c2026.value + catchUpForAge(age, 'employerPlan')
}

/** Sums a person's entered contributions across accounts of one ceiling family. */
const combinedContribution = (
  d: ScenarioDraft,
  ownerIndex: number,
  family: CatchUpAccountKind,
): number =>
  d.enteredAccounts.reduce((sum, a) => {
    if (a.ownerIndex !== ownerIndex) return sum
    if (KIND_TO_CATCHUP[a.kind] !== family) return sum
    return sum + (Number.isFinite(a.annualContribution ?? NaN) ? a.annualContribution! : 0)
  }, 0)

export interface SanityViolation {
  readonly rule: string
  /** The field the calm inline message attaches to (role="alert" +
   *  aria-invalid + aria-describedby — the error grammar). */
  readonly field: FieldPath
  readonly messageKey: CopyKey
}

interface SanityRule {
  readonly id: string
  /** The field this rule guards (the firing site — must be touched to fire). */
  readonly target: (draft: ScenarioDraft) => readonly FieldPath[]
  /** Returns violations given EVERY input it needs is present; absent inputs ⇒
   *  the rule simply does not fire (never a default — burned/062). `touched`
   *  is available for confirmation-class rules (the period force-confirm
   *  clears the instant its control is explicitly answered). */
  readonly check: (draft: ScenarioDraft, touched: ReadonlySet<FieldPath>) => readonly SanityViolation[]
}

const perPerson = (
  draft: ScenarioDraft,
  fn: (p: ScenarioDraft['people'][number], i: number) => SanityViolation | null,
): SanityViolation[] =>
  draft.people.map(fn).filter((v): v is SanityViolation => v !== null)

const RULES: readonly SanityRule[] = [
  {
    // Status-vs-age disagreement — the ONLY age-direction rule (status-conditional).
    id: 'retired-stop-age-in-future',
    target: (d) => d.people.map((_, i) => personField(i, 'retirementAge')),
    check: (d) =>
      perPerson(d, (p, i) =>
        p.workStatus === 'retired' &&
        p.retirementAge !== undefined &&
        p.currentAge !== undefined &&
        Number.isFinite(p.retirementAge) &&
        Number.isFinite(p.currentAge) &&
        p.retirementAge > p.currentAge
          ? { rule: 'retired-stop-age-in-future', field: personField(i, 'retirementAge'), messageKey: 'errStopAgeInFuture' }
          : null,
      ),
  },
  {
    id: 'ss-claim-window',
    target: (d) => d.people.map((_, i) => personField(i, 'socialSecurityClaimAge')),
    check: (d) =>
      perPerson(d, (p, i) =>
        p.socialSecurityClaimAge !== undefined &&
        Number.isFinite(p.socialSecurityClaimAge) &&
        (p.socialSecurityClaimAge < SS_CLAIM_MIN || p.socialSecurityClaimAge > SS_CLAIM_MAX)
          ? { rule: 'ss-claim-window', field: personField(i, 'socialSecurityClaimAge'), messageKey: 'errSsClaimWindow' }
          : null,
      ),
  },
  {
    id: 'survivor-ratio-ceiling',
    target: () => ['survivorSpendingRatio'],
    check: (d) =>
      Number.isFinite(d.survivorSpendingRatio) && d.survivorSpendingRatio > 1
        ? [{ rule: 'survivor-ratio-ceiling', field: 'survivorSpendingRatio', messageKey: 'errSurvivorRatio' }]
        : [],
  },
  {
    id: 'birth-year-in-future',
    target: (d) => d.people.map((_, i) => personField(i, 'birthYear')),
    check: (d) =>
      perPerson(d, (p, i) =>
        p.birthYear !== undefined &&
        Number.isFinite(p.birthYear) &&
        p.birthYear > d.startCalendarYear
          ? { rule: 'birth-year-in-future', field: personField(i, 'birthYear'), messageKey: 'errBirthYearFuture' }
          : null,
      ),
  },
  {
    // The period force-confirm (R19, line one of the monthly-vs-annual
    // defense): a spend figure coherent BOTH ways blocks advance until the
    // user explicitly answers the period control — never silently computed on
    // the entry default. Renders through the same calm grammar; clears the
    // instant the segment is tapped (touched gains 'spendEntryPeriod').
    id: 'spend-period-unconfirmed',
    target: () => ['annualSpendingReal'],
    check: (d, touched) => {
      if (d.annualSpendingReal === undefined || !Number.isFinite(d.annualSpendingReal)) return []
      if (touched.has('spendEntryPeriod')) return []
      const entered =
        d.spendEntryPeriod === 'month' ? d.annualSpendingReal / 12 : d.annualSpendingReal
      // No upper bound (the named second line of defense): a figure ABOVE a
      // plausible monthly spend, left under the unconfirmed 'month' default, is
      // the 12× misentry ($55k typed as monthly = $660k/yr) the old [MIN,MAX]
      // band let sail straight through to a confident-but-wrong verdict.
      return entered >= SPEND_AMBIGUOUS_MIN
        ? [
            {
              rule: 'spend-period-unconfirmed',
              field: 'annualSpendingReal',
              messageKey: 'periodConfirmPrompt',
            },
          ]
        : []
    },
  },
  {
    // The C1 contribution ceiling (R19): a person's combined contributions to
    // one ceiling family above today's statutory limit is a true impossibility.
    // Violations attach to EVERY contributing account field of that family so
    // the message lands where the user is looking.
    id: 'contribution-over-ceiling',
    target: (d) => d.enteredAccounts.map((_, i) => accountField(i, 'annualContribution')),
    check: (d) => {
      const out: SanityViolation[] = []
      d.enteredAccounts.forEach((a, i) => {
        const owner = d.people[a.ownerIndex]
        if (owner?.currentAge === undefined || !Number.isFinite(owner.currentAge)) return
        if (!Number.isInteger(owner.currentAge) || owner.currentAge < 0 || owner.currentAge > 120) return
        const family = KIND_TO_CATCHUP[a.kind]
        if (family === null) return
        const ceiling = contributionCeilingFor(a.kind, owner.currentAge)
        if (ceiling !== null && combinedContribution(d, a.ownerIndex, family) > ceiling) {
          out.push({
            rule: 'contribution-over-ceiling',
            field: accountField(i, 'annualContribution'),
            messageKey: 'errContributionCeiling',
          })
        }
      })
      return out
    },
  },
  {
    // §415(c) annual additions per plan: employee + employer match above the
    // cap PLUS the catch-up band (the band sits on top — never the bare cap).
    id: 'additions-over-415c',
    target: (d) => d.enteredAccounts.map((_, i) => accountField(i, 'employerMatchAnnual')),
    check: (d) => {
      const out: SanityViolation[] = []
      d.enteredAccounts.forEach((a, i) => {
        if (!isEmployerPlanKind(a.kind)) return
        const owner = d.people[a.ownerIndex]
        if (owner?.currentAge === undefined || !Number.isInteger(owner.currentAge)) return
        if (owner.currentAge < 0 || owner.currentAge > 120) return
        const total = (a.annualContribution ?? 0) + (a.employerMatchAnnual ?? 0)
        if (
          Number.isFinite(total) &&
          total > annualAdditionsCeilingFor(owner.currentAge)
        ) {
          out.push({
            rule: 'additions-over-415c',
            field: accountField(i, 'employerMatchAnnual'),
            messageKey: 'errAdditionsCeiling',
          })
        }
      })
      return out
    },
  },
  {
    // The engine's longevity table tops out at 119 (SSA snapshot support) — an
    // age past it is a model-domain impossibility, not an implausibility.
    id: 'age-beyond-model',
    target: (d) => d.people.map((_, i) => personField(i, 'birthYear')),
    check: (d) =>
      perPerson(d, (p, i) =>
        p.currentAge !== undefined &&
        Number.isFinite(p.currentAge) &&
        p.currentAge > MAX_MODEL_AGE
          ? { rule: 'age-beyond-model', field: personField(i, 'birthYear'), messageKey: 'errAgeBeyondModel' }
          : null,
      ),
  },
]

/**
 * The pure validation surface. A violation appears iff its rule fires on the
 * current draft AND its field has been touched (committed) — so back-nav
 * upstream edits re-fire dependents at the point of edit, and untouched
 * downstream questions are never pre-flagged.
 */
export function validateDraft(
  draft: ScenarioDraft,
  touched: ReadonlySet<FieldPath>,
): readonly SanityViolation[] {
  return RULES.flatMap((rule) => rule.check(draft, touched)).filter((v) => touched.has(v.field))
}

/** Violations for ONE field (the blur-time per-field check). */
export function validateField(
  draft: ScenarioDraft,
  field: FieldPath,
  touched: ReadonlySet<FieldPath> = new Set(),
): readonly SanityViolation[] {
  return RULES.flatMap((rule) => rule.check(draft, touched)).filter((v) => v.field === field)
}
