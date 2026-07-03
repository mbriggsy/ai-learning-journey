/**
 * The PURE federal-tax primitives (U2 · M3–M5) — extracted VERBATIM from `taxOverlay.ts`
 * (U11 pre-work) so that BOTH the overlay's gross-up fixed point AND the U11 MAGI-landscape
 * module (`magiLandscape.ts` — the bracket-fill rail translation + the shadow-rate readout's
 * marginal decomposition) can consume one set of primitives without an import cycle
 * (`taxOverlay` → `magiLandscape` → here; `taxOverlay` → here).
 *
 * NOTHING here changed in the extraction — the functions, constants, and comments moved
 * byte-for-byte (the reduce-to-spine + every M3–M6 fixture is byte-identical by construction;
 * `taxOverlay.ts` re-exports the four public names so every existing import path holds).
 *
 * PURE: no entropy/clock/environment (the engine-purity lint covers `src/engine/**`); reads
 * ONLY the canonical year-keyed constants (architecture §8 — a dated figure is never re-typed).
 */
import {
  ordinaryBracketsMFJ,
  ordinaryBracketsSingle,
  standardDeductionMFJ,
  standardDeductionSingle,
  age65AdditionMFJ,
  age65AdditionSingle,
  seniorBonus,
  ssProvisionalThresholds,
  capitalGainsBreakpoints,
  type OrdinaryBracket,
  type CapitalGainsRateBreakpoints,
} from '@engine/constants'
import type { FilingStatus } from '@shared/model'

// =========================================================================
// Ordinary-income tax (M3) — the bracket schedule + the deduction stack.
// =========================================================================

/** The filing status's ordinary bracket schedule (canonical constants — never inlined).
 *  Exported for the U11 MAGI-landscape module (the bracket-edge rail + the marginal-rate
 *  readout read the same schedule the tax math uses — single producer, burned/063). */
export function bracketsFor(filing: FilingStatus): readonly OrdinaryBracket[] {
  return filing === 'mfj' ? ordinaryBracketsMFJ.value : ordinaryBracketsSingle.value
}

/** The layered progressive tax on `taxableIncome` over a filing status's bracket schedule.
 *  Each band taxes the income that falls into `(prevEdge, upTo]` at its marginal rate; the
 *  open top band (`upTo === null`) taxes everything above the last edge. */
export function progressiveOrdinaryTax(taxableIncome: number, brackets: readonly OrdinaryBracket[]): number {
  if (taxableIncome <= 0) return 0
  let tax = 0
  let prevEdge = 0
  for (const band of brackets) {
    const top = band.upTo === null ? taxableIncome : Math.min(taxableIncome, band.upTo)
    if (top > prevEdge) tax += (top - prevEdge) * band.rate
    if (band.upTo === null || taxableIncome <= band.upTo) break
    prevEdge = band.upTo
  }
  return tax
}

/** The OBBBA senior bonus for a filing status, count of 65+ filers, and MAGI: the base
 *  (`perPerson65Plus` × count) reduced linearly at `phaseOutRatePerDollar` above the
 *  filing-status phase-out start, floored at 0. The linear form is authoritative; the
 *  count-specific `fullyGoneAbove` ceilings are consistent with it (and 0 below the start). */
function seniorBonusFor(filing: FilingStatus, count65: number, magi: number): number {
  if (count65 === 0) return 0
  const sb = seniorBonus.value
  const base = sb.perPerson65Plus * count65
  const start = filing === 'mfj' ? sb.phaseOutStart.mfj : sb.phaseOutStart.single
  return Math.max(0, base - sb.phaseOutRatePerDollar * Math.max(0, magi - start))
}

/** The full M3 deduction stack: standard deduction + age-65 addition × (65+ filers) +
 *  the senior bonus. Every figure is read from the canonical constants module.
 *  Exported for the U11 MAGI-landscape module (the bracket-edge rail translates a
 *  TAXABLE-income edge back to MAGI space through the same stack the tax math uses). */
export function deductionStack(filing: FilingStatus, count65: number, magi: number): number {
  const std = filing === 'mfj' ? standardDeductionMFJ.value : standardDeductionSingle.value
  const age65 = (filing === 'mfj' ? age65AdditionMFJ.value : age65AdditionSingle.value) * count65
  return std + age65 + seniorBonusFor(filing, count65, magi)
}

/**
 * Ordinary-income tax (M3): the deduction stack subtracted from ordinary income, then the
 * progressive brackets. In M3 MAGI = ordinary income (Social-Security inclusion, cap-gains,
 * and tax-exempt interest enter MAGI in M4/M5). Roth and taxable-basis withdrawals are NOT
 * ordinary income here — only the pre-tax distribution (withdrawals + RMD) is taxed.
 */
export function ordinaryIncomeTax(ordinaryIncome: number, filing: FilingStatus, count65: number): number {
  const taxable = Math.max(0, ordinaryIncome - deductionStack(filing, count65, ordinaryIncome))
  return progressiveOrdinaryTax(taxable, bracketsFor(filing))
}

// =========================================================================
// Social Security provisional-income taxation (M4) — IRS Pub 915 Worksheet 1.
// A CONTINUOUS, non-decreasing, piecewise-linear function of provisional income;
// that smoothness is what keeps the gross-up fixed point (taxOverlay.ts) well-behaved
// when the SS layer is folded in. Reads the FROZEN, un-indexed thresholds from the
// canonical constants (MFJ 32k/44k, single 25k/34k) — never inlined here.
// =========================================================================

/**
 * The taxable portion of a Social-Security benefit (IRS Pub 915 Worksheet 1).
 *
 * `otherIncomeExclSS` is AGI EXCLUDING Social Security (plus tax-exempt interest — 0 in
 * M4 scope); provisional income = that + 50% of the benefit. The result is the LESSER of
 * the worksheet's tiered inclusion (50% of the excess over the first threshold, then 85%
 * of the excess over the second) and the hard 85%-of-benefit ceiling. It is monotone
 * non-decreasing AND continuous in `otherIncomeExclSS` (the band kinks at the two
 * thresholds and the two `Math.min` caps are continuous joins) — the property the
 * gross-up contraction rests on.
 *
 * SCOPE (M4): "other income" is the pre-tax distribution only; capital-gains / taxable-
 * basis realizations enter provisional in M5. The MFS-lived-with-spouse flat-85% rule is
 * out of scope — this couple files MFJ, then single after the first death (M6).
 *
 * Verified against the published Pub 915 Worksheet 1 filled-in example to the dollar
 * (DND/012): MFJ provisional 87k on a 40k benefit → 34,000 taxable (the 85% cap binds).
 */
export function taxableSocialSecurity(
  otherIncomeExclSS: number,
  ssBenefit: number,
  filing: FilingStatus,
): number {
  if (ssBenefit <= 0) return 0
  const half = ssBenefit * 0.5
  const provisional = otherIncomeExclSS + half
  const { fiftyPctOver: base1, eightyFivePctOver: base2 } =
    filing === 'mfj' ? ssProvisionalThresholds.value.mfj : ssProvisionalThresholds.value.single
  if (provisional <= base1) return 0
  if (provisional <= base2) return Math.min(half, 0.5 * (provisional - base1))
  // 85% tier: the 50%-band contribution is capped at 50% of the band width (base2 − base1),
  // then 85% of the excess over base2 — all bounded by the 85%-of-benefit ceiling.
  const fiftyBand = Math.min(half, 0.5 * (base2 - base1))
  return Math.min(0.85 * ssBenefit, fiftyBand + 0.85 * (provisional - base2))
}

// =========================================================================
// Long-term capital-gains / qualified-dividend taxation (M5) — IRS §1(h).
// The preferential 0/15/20% schedule STACKED on ordinary taxable income: the ordinary
// brackets fill first, then the gain sits on top, so the gain's rate keys off TOTAL
// taxable income (ordinary + gain), never the gain alone. The two band ceilings come
// from the canonical constant; the 0/15/20 RATES are STRUCTURAL §1(h) — the same role
// the `rate` field plays in the ordinary bracket table — and are part of
// CapitalGainsRateBreakpoints' documented contract ("20% applies above fifteenRateUpTo"),
// so they live here as structural law, not as separate dated figures (they are not
// inflation-indexed; only the breakpoints are the directional-until-pinned dated values).
// =========================================================================

const CG_FIFTEEN_RATE = 0.15
const CG_TWENTY_RATE = 0.2

function capitalGainsBreakpointsFor(filing: FilingStatus): CapitalGainsRateBreakpoints {
  return filing === 'mfj' ? capitalGainsBreakpoints.value.mfj : capitalGainsBreakpoints.value.single
}

/**
 * The preferential tax on `gainSubjectToTax` of long-term capital gain / qualified dividends,
 * STACKED on `ordinaryTaxableIncome` (§1(h)). The gain occupies the band
 * `(ordinaryTaxableIncome, ordinaryTaxableIncome + gain]`: the portion up to the 0%-band ceiling
 * is untaxed, the portion up to the 15%-band ceiling is 15%, the rest 20%. The rate is a function
 * of TOTAL taxable income, never the gain in isolation — large RMDs + SS + conversions can push a
 * small gain past the 0% ceiling.
 *
 * `gainSubjectToTax` is the gain AFTER any unused deduction has sheltered it (see
 * {@link ordinaryPlusCapitalGainsTax}). It is floored at 0: a realized LOSS is not a negative tax
 * — MVP forgoes the §1211 $3k ordinary offset + carryforward (an OUT-but-disclosed conservatism).
 */
export function capitalGainsTax(
  gainSubjectToTax: number,
  ordinaryTaxableIncome: number,
  filing: FilingStatus,
): number {
  const gain = Math.max(0, gainSubjectToTax)
  if (gain <= 0) return 0
  const base = Math.max(0, ordinaryTaxableIncome)
  const { zeroRateUpTo, fifteenRateUpTo } = capitalGainsBreakpointsFor(filing)
  const top = base + gain
  // The gain dollars sitting in each preferential band (stacked above ordinary taxable income).
  const at15 = Math.max(0, Math.min(top, fifteenRateUpTo) - Math.max(base, zeroRateUpTo))
  const at20 = Math.max(0, top - Math.max(base, fifteenRateUpTo))
  return CG_FIFTEEN_RATE * at15 + CG_TWENTY_RATE * at20
}

/**
 * The full per-year federal tax (M5): progressive ordinary tax on the deduction-reduced ordinary
 * income PLUS the preferential cap-gains tax on the realized gain stacked on top.
 *
 * Two subtleties the naive form gets wrong (both calm-but-wrong in this tool's CENTRAL regimes):
 *   1. The deduction stack is computed on the gain-INCLUSIVE MAGI — a realized gain is in AGI, so
 *      it phases out the senior bonus. (The gain is still taxed at preferential rates, never folded
 *      into the ordinary bracket base.)
 *   2. Any deduction left UNUSED by ordinary income shelters the gain (the QDCGT-worksheet effect):
 *      a low-ordinary-income retiree living off a brokerage realizes gain into the 0% band. So the
 *      gain's taxable portion is `max(0, realizedGain − max(0, deduction − ordinaryIncome))`.
 *
 * With `realizedGain = 0` this is byte-identical to {@link ordinaryIncomeTax} (MAGI = ordinary
 * income, nothing to shelter or stack), so an overlay year with no taxable-bucket realization
 * reduces EXACTLY to the M3/M4 fixed point.
 */
export function ordinaryPlusCapitalGainsTax(
  ordinaryIncome: number,
  realizedGain: number,
  filing: FilingStatus,
  count65: number,
): number {
  const gain = Math.max(0, realizedGain)
  const magi = ordinaryIncome + gain
  const deduction = deductionStack(filing, count65, magi)
  const ordinaryTaxable = Math.max(0, ordinaryIncome - deduction)
  const leftoverDeduction = Math.max(0, deduction - ordinaryIncome)
  const gainTaxable = Math.max(0, gain - leftoverDeduction)
  return (
    progressiveOrdinaryTax(ordinaryTaxable, bracketsFor(filing)) +
    capitalGainsTax(gainTaxable, ordinaryTaxable, filing)
  )
}
