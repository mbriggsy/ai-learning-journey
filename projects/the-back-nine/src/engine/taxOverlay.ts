/**
 * The tax-and-accounts overlay (P1·U2) — decumulation that is AWARE of account
 * buckets + tax. It is the structural sibling of the earned-income bridge
 * (cross-cutting contract #3): a per-year deterministic transform of the cash-flow
 * term, indexed by absolute year, consuming ZERO random draws (CRN-safe by the same
 * argument). The bridge nets the withdrawal DOWN; this overlay grosses it UP (tax,
 * RMD-forced distributions, and conversions all increase the cash a year needs).
 *
 * THE LOAD-BEARING SEAM (the reduce-to-spine golden invariant). The authoritative
 * portfolio TOTAL is advanced by the SAME {@link stepYear} the validated spine uses —
 * the overlay never re-implements the growth/rebalance math, so within-year order can
 * never drift. Per-bucket balances are a parallel ledger consumed only by the tax
 * computation; they never feed back into the total when tax is OFF. Therefore under
 * the EXHAUSTIVE OFF condition — buckets collapsed to one pool AND conversion = 0 AND
 * tax off AND RMD-inert — the total trajectory is BYTE-IDENTICAL (same seed) to the
 * Trinity/Bengen-validated spine. The golden cases are never perturbed.
 *
 * One shared market draw (contract #2): every bucket grows by the SAME blended return
 * `stepYear` applies to the total — buckets differ only in tax treatment, never in
 * return assumption (this is what structurally forecloses asset-location).
 *
 * MILESTONE STATUS — built incrementally. This is M3: ordinary-income tax.
 *   - M1 (done): the seam + the reduce-to-spine lock.
 *   - M2 (done): RMD-forced distribution as a pre-tax→taxable ledger relocation. With tax
 *     OFF an active RMD is TOTAL-NEUTRAL (the two buckets grow identically, contract #2).
 *   - M3 (this): ordinary-income tax on the bracket schedule (MFJ/single) + the deduction
 *     stack (standard + age-65 addition + senior bonus with its MAGI phase-out). The cash
 *     a year needs is grossed up to net `spending` AFTER the tax that withdrawal triggers —
 *     a bounded per-year FIXED POINT (gross = net + tax, tax depends on the pre-tax drawn,
 *     which depends on the gross). Ordinary income = the pre-tax actually distributed =
 *     max(alloc.pretax, rmd). Roth + taxable-basis withdrawals are NOT ordinary income here
 *     (cap-gains/QD stacking is M5). This is where an RMD finally BITES: the tax leaves the
 *     portfolio, so terminalReal drops BELOW the spine — the M2 ledger relocation alone was
 *     total-neutral; M3's tax on it is not. CRN-safe (the fixed point reads zero draws).
 *   - M4+ (extend {@link solveGrossWithdrawal}): the SS provisional-income layer folds into
 *     the SAME fixed point; M5 adds Roth conversions + cap-gains/QD stacking; M6 the
 *     MFJ→single survivor filing switch + the wire into `simulate.ts`.
 *
 * PURE: no entropy/clock/environment (the engine-purity lint covers `src/engine/**`).
 */
import { stepYear, totalValue, type DecumulationResult, type PortfolioState } from '@engine/decumulation'
import { allocateWithdrawal, totalAcrossBuckets, type AccountBuckets } from '@engine/sequencing'
import {
  rmdStartAge,
  uniformLifetimeTableDivisors,
  ordinaryBracketsMFJ,
  ordinaryBracketsSingle,
  standardDeductionMFJ,
  standardDeductionSingle,
  age65AdditionMFJ,
  age65AdditionSingle,
  seniorBonus,
  type OrdinaryBracket,
} from '@engine/constants'
import { NEVER_DEPLETED, type DepletionYear, type DrawdownPolicy } from '@shared/model'

export type FilingStatus = 'mfj' | 'single'

/** One person the overlay ages each simulated year. Birth year keys the SECURE-2.0 RMD
 *  start-age band (72/73/75) AND the age-65 deduction additions; age in sim-year `t` =
 *  `startCalendarYear + t − birthYear` (a ±1yr birth-month approximation, sufficient for
 *  the discrete thresholds). */
export interface OverlayPerson {
  readonly birthYear: number
}

/** The household the overlay taxes: the filing status, the calendar anchor, and the people
 *  whose ages drive RMDs + the 65+ deduction additions. M3 uses a fixed `filing`; the
 *  MFJ→single survivor switch (flipping `filing` at the first death) is M6. */
export interface Household {
  readonly startCalendarYear: number
  readonly filing: FilingStatus
  /** The pre-tax pool's owner, whose age drives the pool RMD (per-person pre-tax splitting
   *  is deferred to M6's schemaVersion-2 shape). */
  readonly owner: OverlayPerson
  readonly spouse?: OverlayPerson
}

/**
 * Overlay configuration. `taxEnabled` and `rmdEnabled` are INDEPENDENT switches — RMD is a
 * forced-distribution mechanic, not a tax, and tax can apply with no RMD (a 60-year-old's
 * pre-tax withdrawals). Any ON config carries the `household` (tax needs ages + filing even
 * when RMD is off); the bare `{ taxEnabled: false, rmdEnabled: false }` is the EXHAUSTIVE-OFF
 * golden anchor (no household, a pure pass-through that reduces byte-identically to the spine).
 */
export type TaxOverlayConfig =
  | { readonly taxEnabled: false; readonly rmdEnabled: false }
  | { readonly taxEnabled: boolean; readonly rmdEnabled: boolean; readonly household: Household }

/** A tax-aware decumulation result: the spine's total-trajectory result (the only thing
 *  the outcome distribution reads), plus the final per-bucket balances (auxiliary). */
export interface TaxAwareResult extends DecumulationResult {
  readonly finalBuckets: AccountBuckets
}

const EMPTY_BUCKETS: AccountBuckets = { taxable: 0, pretax: 0, roth: 0 }

// The statutory age threshold for the §63(f) age-65 additional standard deduction AND the
// OBBBA senior bonus. It is structurally embedded in the constant identifiers themselves
// (`age65Addition*`, `seniorBonus.perPerson65Plus`), not a free-floating sourced figure, so
// it is named here rather than added to the curated constants table.
const AGE_65_THRESHOLD = 65

// The Uniform Lifetime Table as an O(1) lookup, derived once from the canonical constant —
// the max age is the published "120 and over" terminal bucket; any older age clamps to it
// (derived from the table, never an inlined 120, so the single-source grep cannot trip).
const ULT_DIVISOR_BY_AGE: ReadonlyMap<number, number> = new Map(
  uniformLifetimeTableDivisors.value.map((row) => [row.age, row.divisor]),
)
const ULT_MAX_AGE = uniformLifetimeTableDivisors.value.reduce((max, row) => Math.max(max, row.age), 0)

// Gross-up fixed-point controls. The iteration is a geometric contraction (the effective
// marginal rate — bracket rate, inflated ≤ ×1.06 inside the senior-bonus phase-out band — is
// < 1), so a handful of passes converge to the cent. MAX_PASSES is a FAIL-LOUD backstop, not
// an in-range default (burned/062): a year that has not converged THROWS rather than ship a
// silently-wrong tax.
const GROSS_UP_EPSILON = 1e-7 // dollars
const GROSS_UP_MAX_PASSES = 64

// =========================================================================
// Pure ordinary-income tax (M3). Reads ONLY the canonical constants — no dated
// figure is inlined (the bracket edges live in `@engine/constants`).
// =========================================================================

function bracketsFor(filing: FilingStatus): readonly OrdinaryBracket[] {
  return filing === 'mfj' ? ordinaryBracketsMFJ.value : ordinaryBracketsSingle.value
}

/** The layered progressive tax on `taxableIncome` over a filing status's bracket schedule.
 *  Each band taxes the income that falls into `(prevEdge, upTo]` at its marginal rate; the
 *  open top band (`upTo === null`) taxes everything above the last edge. */
function progressiveOrdinaryTax(taxableIncome: number, brackets: readonly OrdinaryBracket[]): number {
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
 *  the senior bonus. Every figure is read from the canonical constants module. */
function deductionStack(filing: FilingStatus, count65: number, magi: number): number {
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
// Ages
// =========================================================================

function ageInSimYear(person: OverlayPerson, startCalendarYear: number, t: number): number {
  return startCalendarYear + t - person.birthYear
}

/** The count of the household's filers who are ≥ 65 in sim-year `t` (drives the age-65
 *  addition multiplier and the senior-bonus base). */
function count65PlusInSimYear(household: Household, t: number): number {
  let count = 0
  if (ageInSimYear(household.owner, household.startCalendarYear, t) >= AGE_65_THRESHOLD) count++
  if (household.spouse && ageInSimYear(household.spouse, household.startCalendarYear, t) >= AGE_65_THRESHOLD) count++
  return count
}

// =========================================================================
// RMD (M2)
// =========================================================================

/** The SECURE-2.0 RMD start age for a birth-year cohort (72 / 73 / 75), read from the
 *  canonical band table. The age-75 band carries `effectiveFrom 2033`, but anyone born
 *  1960+ reaches 75 in 2035+, so the date is always satisfied for the reachable population. */
function rmdStartAgeForBirthYear(birthYear: number): number {
  for (const band of rmdStartAge.value) {
    if (band.bornThrough === null || birthYear <= band.bornThrough) return band.age
  }
  throw new Error('rmdStartAge has no open-ended terminal band')
}

/** The Uniform Lifetime Table divisor for a distribution-year age (Pub 590-B Table III).
 *  Age ≥ the terminal bucket clamps to it (2.0). Below the table's first row (72) throws —
 *  an RMD is not due there, so the lookup is never reached for a real distribution year. */
function uniformLifetimeDivisor(age: number): number {
  const divisor = ULT_DIVISOR_BY_AGE.get(Math.min(age, ULT_MAX_AGE))
  if (divisor === undefined) {
    throw new Error(`no Uniform Lifetime divisor for age ${age} (table starts at 72)`)
  }
  return divisor
}

/**
 * SEAM — the divisor for an owner's lifetime RMD. M2 STUB: always the Uniform Lifetime
 * Table. When the sole beneficiary is a spouse MORE THAN 10 years younger (gap ≥ 11), the
 * IRS Joint-Life & Last-Survivor table (Pub 590-B Table II) applies and yields a SMALLER
 * RMD — but its ~3,000-cell grid is the open constants gap (`jointLifeLastSurvivorTable`
 * throws on read), so this milestone stubs to ULT. `spouseAge` is threaded for the JLLS
 * landing.
 */
function selectRmdDivisor(ownerAge: number, _spouseAge?: number): number {
  return uniformLifetimeDivisor(ownerAge)
}

/**
 * The forced RMD for sim-year `t`: the prior-year-end pre-tax balance ÷ the owner's divisor,
 * once the owner reaches their birth-year RMD age (else 0). NON-CONVERTIBLE — distributed as
 * ordinary income FIRST. Reads ZERO draws (CRN-safe).
 */
function rmdForYear(priorYearEndPretax: number, config: TaxOverlayConfig, t: number): number {
  if (!config.rmdEnabled) return 0
  const { owner, spouse, startCalendarYear } = config.household
  const ownerAge = startCalendarYear + t - owner.birthYear
  if (ownerAge < rmdStartAgeForBirthYear(owner.birthYear)) return 0
  const spouseAge = spouse ? startCalendarYear + t - spouse.birthYear : undefined
  return priorYearEndPretax / selectRmdDivisor(ownerAge, spouseAge)
}

// =========================================================================
// The gross-up fixed point (M3)
// =========================================================================

/**
 * Solve the per-year gross withdrawal as a bounded fixed point: withdraw enough to net `net`
 * of spending AFTER the ordinary tax that withdrawal itself triggers. Ordinary income = the
 * pre-tax actually distributed = `max(alloc.pretax, rmd)` (spending/tax-funded pre-tax, or the
 * forced RMD, whichever is larger). Monotone-increasing and bounded (a geometric contraction,
 * effective marginal rate < 1) → converges in a few passes. THROWS if it has not converged
 * within {@link GROSS_UP_MAX_PASSES} (no in-range default for an unconverged value, burned/062).
 */
function solveGrossWithdrawal(
  net: number,
  buckets: AccountBuckets,
  policy: DrawdownPolicy,
  rmd: number,
  filing: FilingStatus,
  count65: number,
): number {
  let gross = net
  for (let pass = 0; pass < GROSS_UP_MAX_PASSES; pass++) {
    const alloc = allocateWithdrawal(buckets, gross, policy)
    const ordinaryIncome = Math.max(alloc.pretax, rmd)
    const nextGross = net + ordinaryIncomeTax(ordinaryIncome, filing, count65)
    if (Math.abs(nextGross - gross) < GROSS_UP_EPSILON) return nextGross
    gross = nextGross
  }
  throw new Error(
    `tax gross-up did not converge in ${GROSS_UP_MAX_PASSES} passes (net=${net}, rmd=${rmd}) — refusing an unconverged tax (burned/062)`,
  )
}

/**
 * Run a tax-aware decumulation path. Tracks per-bucket balances for the tax computation
 * while advancing the authoritative TOTAL through the shared {@link stepYear}, so the
 * total trajectory matches the spine byte-for-byte under the OFF condition.
 *
 * The three return/withdrawal arrays are indexed by ABSOLUTE year and the net-withdrawal
 * length is the horizon (the aligned-length contract `runDecumulation` uses).
 */
export function runTaxAwareDecumulation(
  initialBuckets: AccountBuckets,
  realStockReturns: readonly number[],
  realBondReturns: readonly number[],
  netWithdrawals: readonly number[],
  stockWeight: number,
  policy: DrawdownPolicy,
  config: TaxOverlayConfig,
): TaxAwareResult {
  let buckets = initialBuckets
  const total0 = totalAcrossBuckets(initialBuckets)
  // Construct the initial state with the SAME formula simulate.ts uses (stock = w·P,
  // bond = (1−w)·P) so a collapsed-pool run is byte-identical to the spine's
  // runDecumulation — stepYear only reads the sum, but matching the construction makes
  // the reduction unconditional rather than dependent on a float identity.
  let state: PortfolioState = { stock: stockWeight * total0, bond: (1 - stockWeight) * total0 }
  let depletionYear: DepletionYear = NEVER_DEPLETED
  const horizon = netWithdrawals.length

  for (let t = 0; t < horizon; t++) {
    const rs = realStockReturns[t]
    const rb = realBondReturns[t]
    const net = netWithdrawals[t]
    // Aligned-length contract: a missing entry is the end of data, not a 0 year.
    if (rs === undefined || rb === undefined || net === undefined) break

    // Prior-year-end pre-tax balance: at the top of the iteration `buckets` holds last
    // year's post-growth state (at t = 0, the initial balance) — exactly the RMD's basis.
    const rmd = rmdForYear(buckets.pretax, config, t)

    // Gross up for tax. When off, grossWithdrawal === net EXACTLY (no float op added), so the
    // stepYear recurrence is identical to the spine's. When on, solve the fixed point: withdraw
    // enough to net `net` after the ordinary tax on the pre-tax distributed; the tax dollars
    // LEAVE the portfolio, so terminalReal drops below the spine (the M3 presence companion).
    const grossWithdrawal =
      config.taxEnabled
        ? solveGrossWithdrawal(net, buckets, policy, rmd, config.household.filing, count65PlusInSimYear(config.household, t))
        : net

    // Per-bucket ledger: which buckets fund this withdrawal (consumed by the tax math).
    // Capped at what exists, exactly like the spine.
    const totalBefore = totalAcrossBuckets(buckets)
    const alloc = allocateWithdrawal(buckets, grossWithdrawal, policy)
    const drawn = alloc.taxable + alloc.pretax + alloc.roth

    // Advance the AUTHORITATIVE total via the shared stepYear (byte-identical to spine).
    const step = stepYear(state, rs, rb, grossWithdrawal, stockWeight)
    state = step.state

    if (step.depleted) {
      buckets = EMPTY_BUCKETS
      depletionYear = t
      break
    }

    // Re-derive the buckets as fractions of the authoritative new total: each bucket's
    // post-withdrawal share grown by the one shared factor (no asset-location). The total
    // is stepYear's output; the buckets are scaled to sum to it.
    const afterWithdrawal = totalBefore - drawn
    if (afterWithdrawal > 0) {
      const scale = totalValue(state) / afterWithdrawal
      let pretaxPost = Math.max(0, buckets.pretax - alloc.pretax)
      let taxablePost = Math.max(0, buckets.taxable - alloc.taxable)
      const rothPost = Math.max(0, buckets.roth - alloc.roth)

      // RMD-forced distribution: spending/tax already pulled `alloc.pretax` from pre-tax; the
      // RMD forces a MINIMUM pre-tax distribution, so only the EXCESS beyond that is force-
      // relocated to taxable (unspent, reinvested). This moves money BETWEEN two buckets — it
      // never changes `pretaxPost + taxablePost`, so the bucket sum still reconciles to the
      // authoritative total. (With tax off the whole step is total-neutral; with tax on the
      // total already dropped via the grossed-up withdrawal through stepYear.)
      const forcedExcess = Math.min(Math.max(0, rmd - alloc.pretax), pretaxPost)
      pretaxPost -= forcedExcess
      taxablePost += forcedExcess

      buckets = {
        taxable: taxablePost * scale,
        pretax: pretaxPost * scale,
        roth: rothPost * scale,
      }
    } else {
      buckets = EMPTY_BUCKETS
    }
  }

  return { terminalReal: totalValue(state), depletionYear, finalBuckets: buckets }
}
