/**
 * The PURE per-state income-tax primitive (the state-tax unit) — a SECOND, parallel income-tax
 * system that folds into the SAME per-year gross-up fixed point as the federal `taxCore` family
 * ({@link taxOverlay.solveGrossWithdrawal}, a second addend INSIDE the fixed point, never bolted on
 * after convergence). It is the structural sibling of `taxCore.ts`: a deterministic function of the
 * year's already-converged income channels + filing + calendar year + household age context, reading
 * ONLY the canonical year-keyed state constants (architecture §8 — a dated figure is never re-typed;
 * the copyGuard greps for the bare rate/deduction tokens, so this module references them ONLY through
 * the S1 lookups {@link stateRateForYear} / {@link stateStandardDeductionFor}, never as literals).
 *
 * THE STATE BASE IS NOT THE FEDERAL BASE (the correctness trap the broad brush ignored, recon §4):
 * the roster's income-tax states EXEMPT Social Security entirely and tax long-term capital gains as
 * ORDINARY income (no 0/15/20 preferential schedule), so a state rate can NEVER be applied to the
 * federal taxable figure. Each state assembles its OWN base from the converged channels, per its
 * per-figure treatment flags:
 *   - NC (`federal-agi-derived`): (pre-tax distribution + conversion + ongoing other-income + realized
 *     gain) − the NC standard deduction for the year's filing status, floored at 0, × the flat rate.
 *     SS never enters (the (b)(3) subtraction ⇒ `ssTreatment: 'exempt'`), so the NC state term rides
 *     WITHOUT the ×1.85 federal SS-torpedo (the k-invariant, insights 006/007).
 *   - PA (`class-based`): NEVER a rate on the federal AGI. At/above the qualified age (59½) the
 *     retirement-plan distribution AND the Roth conversion are EXEMPT — only the taxable-account
 *     income (ongoing other-income + realized gain) is taxed at the flat rate, no standard deduction.
 *     BELOW the qualified age the conservative arm taxes the distribution + conversion too (the
 *     under-59½ conversion exemption could not be primary-pinned; the date route can reach those ages).
 *   - FL (`no-income-tax`): a STRUCTURAL literal 0 — no base arithmetic at all, so a priced-$0 state is
 *     byte-identical to an absent state (the FL honesty demonstration; never a computed-then-zeroed
 *     value that would perturb the reduce-to-spine float lineage).
 *
 * PURE: no entropy/clock/environment (the engine-purity lint covers `src/engine/**`); zero draws
 * (CRN-safe). Its fixtures are DND-012 externally derived (hand-computed from each state DOR worksheet
 * + the canonical constants, NEVER from this function's own output).
 */
import {
  STATE_TAX_PROFILES,
  stateRateForYear,
  stateStandardDeductionFor,
  type PricedState,
  type StateIncomeTreatment,
} from '@engine/constants'
import type { FilingStatus, RetirementState } from '@shared/model'

// Compile-time guard: every PRICED state is a member of the shared persistable roster vocabulary
// (model.ts owns the vocab; the engine owns the priced subset — they must not drift). A future
// deferred state added to PRICED_STATES that was never added to STATE_ROSTER fails to compile here.
type _PricedInRoster = PricedState extends RetirementState ? true : never
const _pricedInRoster: _PricedInRoster = true
void _pricedInRoster

/**
 * The year's already-converged income channels + household context the state tax reads. Bundled into
 * ONE named object so the several same-typed scalars can never be silently transposed at the call site
 * (the {@link GrossUpContext} / {@link TaxYearInputs} discipline — a positional swap would compile
 * clean and mis-tax the year, the calm-but-wrong class). Every channel is the SAME floored value the
 * federal primitive reads on the converging pass, so the state term stays inside the one 1-D fixed point.
 */
export interface StateTaxYearContext {
  /** A PRICED state (the caller keys on `isPricedState` membership BEFORE constructing this — an
   *  unbuilt/absent state takes the structural `+ 0` branch and never reaches here). */
  readonly state: PricedState
  /** The year's resolved filing status (survivor-aware; selects the NC standard deduction). */
  readonly filing: FilingStatus
  /** The sim year's CALENDAR year (`startCalendarYear + t`) — CONSUMED at the rate lookup (insight
   *  074) so a future pinned NC step-down actually prices instead of being a dead narration note. */
  readonly calendarYear: number
  /** Pre-tax distribution this year = `max(spending pre-tax draw, RMD)` — the ordinary retirement-plan
   *  income. NC taxes it; PA taxes it only BELOW the qualified age. */
  readonly pretaxDistribution: number
  /** The Roth-conversion taxable amount (the ranking-relevant lever). NC taxes it in full at the flat
   *  rate; PA at the qualified age costs $0 (the key PA-vs-NC asymmetry). */
  readonly conversion: number
  /** R40 ongoing other taxable income (pension / rental / annuity / pre-2019 alimony taxable portion).
   *  Taxed flat by BOTH NC (in AGI) and PA (as a taxable class — conservative: an eligible-plan pension
   *  would be PA-exempt at the qualified age, but the generic stream can't distinguish, so it is taxed;
   *  the constants note names this). No per-figure treatment flag — always in the flat base for a
   *  priced income-tax state, regardless of age. */
  readonly ongoingTaxable: number
  /** The realized long-term capital gain — folded into the flat ORDINARY base (no LTCG preference in
   *  NC/PA; `capGainsTreatment: 'taxed-ordinary'`). */
  readonly realizedGain: number
  /** The FEDERALLY-taxable Social-Security portion — EXEMPT for the whole v1 roster (`ssTreatment`),
   *  so it contributes 0 and the state term rides WITHOUT the federal ×1.85 torpedo. Passed (not
   *  dropped at the call site) so the treatment flag is the single home of the exemption + a future
   *  SS-taxing state would need only the flag flipped (and a k re-derivation — see the overlay comment). */
  readonly ssBenefitTaxable: number
  /** The MINIMUM integer age among the household's LIVING members this year — the household-granularity
   *  qualified-age gate for a `taxed-if-under-qualified-age` (class-based) state. The aggregate pre-tax
   *  draw + the conversion are NOT per-person-attributable at the coupling point (recon §5: the
   *  conversion is an AGGREGATE scalar; the spending pre-tax draw is aggregate too), so PA grants the
   *  retirement/conversion exemption ONLY when EVERY living member has attained the qualified age
   *  (min ≥ qualifiedAge). A mixed-age household is TAXED — OVERSTATES PA tax, the conservative
   *  direction, never the optimistic understatement sin. NC/FL ignore it (`qualifiedAge` is null).
   *  Integer-age proxy for 59½ (the engine's ±1yr age is integral): the gate fires at age 60, one year
   *  conservative vs the true mid-year 59½ crossing — overstating PA tax in the boundary year. */
  readonly minLivingAge: number
}

/** How much of a channel enters the state's flat ordinary base under its per-figure treatment flag.
 *  `taxed-if-under-qualified-age` is the ONLY age-gated case (PA's 59½ retirement-plan gate — EXEMPT
 *  at/after the qualified age, TAXED below it, the conservative arm). */
function includeByTreatment(amount: number, treatment: StateIncomeTreatment, qualified: boolean): number {
  switch (treatment) {
    case 'exempt':
    case 'none':
      return 0
    case 'taxed-ordinary':
      return amount
    case 'taxed-if-under-qualified-age':
      return qualified ? 0 : amount
    default: {
      // Exhaustive by construction: a new StateIncomeTreatment member (a future graduated or
      // partially-excluded regime) must pick its inclusion rule HERE, never fall to a silent 0
      // (the optimistic direction) — tsc holds the door (the ultramode review fold, 2026-07-15).
      const never: never = treatment
      throw new Error(`unhandled state income treatment ${String(never)}`)
    }
  }
}

/**
 * The household's state income tax for one converged year (real $). Folds into the gross-up fixed
 * point as a second addend beside the federal `ordinaryPlusCapitalGainsTax` — so the cash a year needs
 * is grossed up to net spending AFTER the state tax the withdrawal triggers, jointly with federal.
 *
 * A no-income-tax state (FL) is a STRUCTURAL literal 0 (early return, no base arithmetic) so a
 * priced-$0 state is byte-identical to an absent state. Never a negative tax (the base floors at 0).
 */
export function stateIncomeTax(ctx: StateTaxYearContext): number {
  const profile = STATE_TAX_PROFILES[ctx.state]
  // A no-income-tax state (FL): a literal, structural 0 — NO base arithmetic, so `+ 0` is an exact
  // IEEE no-op and FL is byte-identical to an absent state (the honesty demonstration, not a
  // computed-then-zeroed value).
  if (profile.rateSchedule === null) return 0
  // Household-granularity qualified-age gate: qualified iff EVERY living member has attained the
  // state's qualified age (min living age ≥ it). NC has no gate (qualifiedAge null ⇒ always "qualified",
  // but NC's treatments are `taxed-ordinary`, which ignores the flag).
  const qualified = profile.qualifiedAge === null || ctx.minLivingAge >= profile.qualifiedAge
  const base =
    includeByTreatment(ctx.pretaxDistribution, profile.retirementIncomeTreatment, qualified) +
    includeByTreatment(ctx.conversion, profile.conversionTreatment, qualified) +
    includeByTreatment(ctx.realizedGain, profile.capGainsTreatment, qualified) +
    includeByTreatment(ctx.ssBenefitTaxable, profile.ssTreatment, qualified) +
    // Ongoing other-income has no per-figure flag — both NC (AGI) and PA (taxable class) tax it flat,
    // regardless of age. It sits INSIDE the base the standard deduction reduces (matters only for NC;
    // PA's deduction is $0).
    ctx.ongoingTaxable
  const standardDeduction = stateStandardDeductionFor(ctx.state, ctx.filing)
  const rate = stateRateForYear(ctx.state, ctx.calendarYear)
  return Math.max(0, base - standardDeduction) * rate
}
