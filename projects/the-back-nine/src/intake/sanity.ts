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
 * "keeps answers, re-validates dependents". A third argument, `provenance`,
 * carries the one confirmation `touched` cannot express: a draft hydrated from a
 * persisted vault / dev seed answered the spend-period force-confirm in a PRIOR
 * session, and a fresh IntakeFlow mount starts `touched` empty (see
 * {@link SanityProvenance}).
 *
 * VALIDATION TIMING is the flow's job (blur / attempt-to-advance, never per
 * keystroke; clear on re-edit) — these predicates are timing-free.
 */
import type { CopyKey } from '@ui/copy'
import type { ScenarioDraft } from '@store/memoryModel'
import type { AccountKind } from '@shared/model'
import { colaRateInRange } from '@shared/incomeBounds'
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
export const SS_CLAIM_MIN = 62
export const SS_CLAIM_MAX = 70

/** The PIA magnitude ceiling (R19 period defense, the SS sibling of the spend
 *  force-confirm): the model stores ANNUAL pia but the field enters the MONTHLY
 *  statement figure (×12 on commit), so a yearly figure fat-fingered into the
 *  monthly box stores 12× the real benefit. This is a deliberately GENEROUS
 *  impossibility bound, NOT a tight COLA figure: the SSA maximum monthly benefit
 *  is $4,152 at full retirement age and $5,181 at age 70 in 2026 (ssa.gov;
 *  grounding-confirmed 2026-06-14) → ~$62,172/yr absolute max. $100,000/yr is
 *  ~1.6× that ceiling, so it never false-rejects a real high earner (with ~17
 *  years of COLA headroom — no annual re-verify burden) while it catches the
 *  consequential 12× misentries (any benefit ≳ $700/mo entered as the yearly
 *  total). A real benefit under the bound that is still wrong is the second-line
 *  case the magnitude check is explicitly NOT the first defense for. */
const PIA_CEILING_ANNUAL = 100_000

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
export const incomeField = (index: number, field: string): FieldPath =>
  `incomeStreams.${index}.${field}`

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

/** Sums a person's entered contributions across accounts of one ceiling family.
 *  For the HSA family the EMPLOYER contribution counts too (employer + employee
 *  share one statutory HSA limit); `hsaEmployerAnnual` is set on HSA accounts only,
 *  so it is 0 for the employerPlan/ira families and never perturbs them. */
const combinedContribution = (
  d: ScenarioDraft,
  ownerIndex: number,
  family: CatchUpAccountKind,
): number =>
  d.enteredAccounts.reduce((sum, a) => {
    if (a.ownerIndex !== ownerIndex) return sum
    if (KIND_TO_CATCHUP[a.kind] !== family) return sum
    return (
      sum +
      (Number.isFinite(a.annualContribution ?? NaN) ? a.annualContribution! : 0) +
      (Number.isFinite(a.hsaEmployerAnnual ?? NaN) ? a.hsaEmployerAnnual! : 0)
    )
  }, 0)

export interface SanityViolation {
  readonly rule: string
  /** The field the calm inline message attaches to (role="alert" +
   *  aria-invalid + aria-describedby — the error grammar). */
  readonly field: FieldPath
  readonly messageKey: CopyKey
}

/** Session provenance a PURE rule cannot derive from the draft alone — the draft
 *  is byte-identical whether freshly typed or restored, so a "was this answered
 *  in a PRIOR session?" fact must be threaded in by the caller.
 *
 *  `periodConfirmed` — the spend entry period was explicitly answered before
 *  this session. A draft hydrated from a persisted vault (draftFromScenario) or
 *  a complete dev seed necessarily cleared the flow's force-confirm gate before
 *  it was ever written (the codec keeps `spendEntryPeriod` as an authored unit,
 *  not a default). A fresh IntakeFlow mount starts `touched` EMPTY, so that
 *  prior confirmation cannot survive as a touched entry — provenance is the only
 *  channel it has. With it set, revisiting the spend AMOUNT (touching
 *  `annualSpendingReal` without re-tapping the period) must NOT re-fire the nag.
 *  A fresh draft leaves this false/absent, so the first-session honesty affordance
 *  (a silent 'month' default misread as 'year' is a 12× error) is unchanged. */
export interface SanityProvenance {
  readonly periodConfirmed?: boolean
}

interface SanityRule {
  readonly id: string
  /** The field this rule guards (the firing site — must be touched to fire). */
  readonly target: (draft: ScenarioDraft) => readonly FieldPath[]
  /** Returns violations given EVERY input it needs is present; absent inputs ⇒
   *  the rule simply does not fire (never a default — burned/062). `touched`
   *  is available for confirmation-class rules (the period force-confirm clears
   *  the instant its control is explicitly answered THIS session); `provenance`
   *  carries the equivalent PRIOR-session confirmation a hydrated draft can't
   *  express through `touched` (a fresh mount starts it empty). */
  readonly check: (
    draft: ScenarioDraft,
    touched: ReadonlySet<FieldPath>,
    provenance: SanityProvenance,
  ) => readonly SanityViolation[]
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
    // The PIA magnitude ceiling: the MONTHLY statement figure is stored ×12, so a
    // yearly total fat-fingered into the monthly box stores an impossible benefit
    // (the 12× misentry the spend force-confirm guards on the spend side). Compare
    // the stored ANNUAL pia against the generous impossibility bound.
    id: 'pia-over-ceiling',
    target: (d) => d.people.map((_, i) => personField(i, 'pia')),
    check: (d) =>
      perPerson(d, (p, i) =>
        p.pia !== undefined && Number.isFinite(p.pia) && p.pia > PIA_CEILING_ANNUAL
          ? { rule: 'pia-over-ceiling', field: personField(i, 'pia'), messageKey: 'errPiaCeiling' }
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
    check: (d, touched, provenance) => {
      if (d.annualSpendingReal === undefined || !Number.isFinite(d.annualSpendingReal)) return []
      // Disarmed by an explicit answer THIS session (touched gains
      // 'spendEntryPeriod' the instant the segment is tapped) OR the equivalent
      // PRIOR-session answer a hydrated/restored draft carries as provenance:
      // its period cleared this same gate before the vault was written, and a
      // fresh IntakeFlow mount starts `touched` empty, so provenance is the only
      // way that confirmation survives the round-trip (the restored-draft revisit
      // false-fire this closes).
      if (provenance.periodConfirmed === true || touched.has('spendEntryPeriod')) return []
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
  // ── R40 other-income ENTITY-SCALAR ranges (the entity-side gate KTD-4 names) ──
  // `survivorPct` / `taxableFraction` / `exclusionFraction` are multiplied away at
  // compile, so the engine's `validateParams` never sees them to range-check — the
  // ONLY guards are the intake form's own controls AND these rules (the U8 restore
  // codec is the third). Each must land in [0,1]; an out-of-range scalar is a true
  // impossibility (a survivor can't keep 120% of a benefit). The OtherIncomeEntry
  // form is the in-flow gate (it commits atomically); these fire on a directly
  // mutated draft / a restored blob — the same calm grammar, amount-free.
  {
    id: 'income-survivor-range',
    target: (d) => d.incomeStreams.map((_, i) => incomeField(i, 'survivorPct')),
    check: (d) => {
      const out: SanityViolation[] = []
      d.incomeStreams.forEach((s, i) => {
        if (Number.isFinite(s.survivorPct) && (s.survivorPct < 0 || s.survivorPct > 1)) {
          out.push({ rule: 'income-survivor-range', field: incomeField(i, 'survivorPct'), messageKey: 'errIncomeSurvivorRange' })
        }
      })
      return out
    },
  },
  {
    id: 'income-taxable-range',
    target: (d) => d.incomeStreams.map((_, i) => incomeField(i, 'taxableFraction')),
    check: (d) => {
      const out: SanityViolation[] = []
      d.incomeStreams.forEach((s, i) => {
        // The direct `taxableFraction` exists only on the pension/rental/other arm
        // (KTD-6 union); the annuity non-qual arm carries `exclusionFraction`, checked
        // by its own rule. A present-but-out-of-range fraction is the impossibility.
        if (
          (s.type === 'pension' || s.type === 'rental' || s.type === 'other') &&
          s.taxableFraction !== undefined &&
          Number.isFinite(s.taxableFraction) &&
          (s.taxableFraction < 0 || s.taxableFraction > 1)
        ) {
          out.push({ rule: 'income-taxable-range', field: incomeField(i, 'taxableFraction'), messageKey: 'errIncomeTaxableRange' })
        }
      })
      return out
    },
  },
  {
    id: 'income-exclusion-range',
    target: (d) => d.incomeStreams.map((_, i) => incomeField(i, 'exclusionFraction')),
    check: (d) => {
      const out: SanityViolation[] = []
      d.incomeStreams.forEach((s, i) => {
        if (
          s.type === 'annuity' &&
          s.qualified === false &&
          Number.isFinite(s.exclusionFraction) &&
          (s.exclusionFraction < 0 || s.exclusionFraction > 1)
        ) {
          out.push({ rule: 'income-exclusion-range', field: incomeField(i, 'exclusionFraction'), messageKey: 'errIncomeExclusionRange' })
        }
      })
      return out
    },
  },
  {
    // `colaPct` is REQUIRED-and-finite when colaMode is 'fixed-pct' (absent/null is
    // corruption — never coerced to 0, the optimistic-erosion direction; KTD-2 / the
    // U8 codec mirrors this). The compile already fails LOUD as NaN at every year, but
    // the calm form/restore message lands here at the field.
    id: 'income-cola-pct-required',
    target: (d) => d.incomeStreams.map((_, i) => incomeField(i, 'colaPct')),
    check: (d) => {
      const out: SanityViolation[] = []
      d.incomeStreams.forEach((s, i) => {
        if (s.colaMode === 'fixed-pct' && (s.colaPct === undefined || !Number.isFinite(s.colaPct))) {
          out.push({ rule: 'income-cola-pct-required', field: incomeField(i, 'colaPct'), messageKey: 'errIncomeColaPct' })
        }
      })
      return out
    },
  },
  {
    // A present-and-finite `fixed-pct` colaPct OUTSIDE the GROUNDED band [COLA_PCT_MIN, COLA_PCT_MAX]
    // is a gross mis-entry (a 30%/yr COLA compounds to fantasy real income). Unlike the [0,1] shares
    // above, a COLA is a RATE with no definitional bound, so the ceiling is a cited constant
    // (@shared/incomeBounds, council 2026-07-01) — the SOLE defense, since the deterministic seedless
    // overlay is invisible to the confidence fan. HARD refuse (mirrors the codec's needColaRate), same
    // 0.05 as the form's refuse-to-commit, so intake and the restore codec cannot desync.
    id: 'income-cola-pct-range',
    target: (d) => d.incomeStreams.map((_, i) => incomeField(i, 'colaPct')),
    check: (d) => {
      const out: SanityViolation[] = []
      d.incomeStreams.forEach((s, i) => {
        if (s.colaMode === 'fixed-pct' && s.colaPct !== undefined && Number.isFinite(s.colaPct) && !colaRateInRange(s.colaPct)) {
          out.push({ rule: 'income-cola-pct-range', field: incomeField(i, 'colaPct'), messageKey: 'errIncomeColaRange' })
        }
      })
      return out
    },
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
  provenance: SanityProvenance = {},
): readonly SanityViolation[] {
  return RULES.flatMap((rule) => rule.check(draft, touched, provenance)).filter((v) =>
    touched.has(v.field),
  )
}

/** Violations for ONE field (the blur-time per-field check). */
export function validateField(
  draft: ScenarioDraft,
  field: FieldPath,
  touched: ReadonlySet<FieldPath> = new Set(),
  provenance: SanityProvenance = {},
): readonly SanityViolation[] {
  return RULES.flatMap((rule) => rule.check(draft, touched, provenance)).filter((v) => v.field === field)
}
