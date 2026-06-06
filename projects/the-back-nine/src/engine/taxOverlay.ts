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
 * MILESTONE STATUS — built incrementally. This is M2: the RMD forced distribution.
 *   - M1 (done): the seam + the reduce-to-spine lock.
 *   - M2 (this): RMD-forced distribution. Past the birth-year RMD age (`rmdStartAge`),
 *     the prior-year-end pre-tax balance ÷ the Uniform Lifetime divisor must leave
 *     pre-tax. RMD is NON-CONVERTIBLE (distributed as ordinary income first). KEY
 *     PROPERTY (corrected from the locked plan's original framing): with tax OFF an
 *     active RMD is TOTAL-NEUTRAL — it relocates pre-tax→taxable, and contract #2 makes
 *     those two buckets grow identically, so the relocation never moves the portfolio
 *     TOTAL. `terminalReal`/`depletionYear` come from `stepYear` on the gross withdrawal,
 *     which the RMD never touches when tax is off → byte-identical to the spine. Only the
 *     ordinary-income TAX on the RMD (M3) makes it bite (cash actually leaves to the IRS).
 *   - M3+ (the marked `grossUpForYear` seam): ordinary-income tax on the bracket schedule,
 *     the Social-Security provisional-income fixed-point, Roth conversions, capital-gains/
 *     qualified-dividend stacking, and the MFJ→single survivor filing switch. Each lands
 *     with its own externally-derived golden fixture (DND/012) and its CRN test.
 *
 * PURE: no entropy/clock/environment (the engine-purity lint covers `src/engine/**`).
 */
import { stepYear, totalValue, type DecumulationResult, type PortfolioState } from '@engine/decumulation'
import { allocateWithdrawal, totalAcrossBuckets, type AccountBuckets } from '@engine/sequencing'
import { rmdStartAge, uniformLifetimeTableDivisors } from '@engine/constants'
import { NEVER_DEPLETED, type DepletionYear, type DrawdownPolicy } from '@shared/model'

/** One person the overlay ages each simulated year. Birth year keys the SECURE-2.0 RMD
 *  start-age band (72/73/75); age in sim-year `t` = `startCalendarYear + t − birthYear`
 *  (a ±1yr birth-month approximation, sufficient for the discrete threshold). */
export interface OverlayPerson {
  readonly birthYear: number
}

/**
 * Overlay configuration. `taxEnabled` and `rmdEnabled` are INDEPENDENT switches: an RMD is
 * a forced-distribution mechanic, not a tax, so "taxes off" alone does not silence it — the
 * EXHAUSTIVE OFF condition (the reduce-to-spine golden anchor) requires BOTH off (plus
 * buckets collapsed + conversion 0). The RMD parameters live only in the `rmdEnabled: true`
 * branch (a discriminated union) so an OFF config cannot carry a meaningless owner age.
 *
 * M3+ extends this with per-year filing status, the conversion schedule, and the tax-year
 * vintage the bracket schedule reads.
 */
export type TaxOverlayConfig = { readonly taxEnabled: boolean } & (
  | { readonly rmdEnabled: false }
  | {
      readonly rmdEnabled: true
      /** Calendar year of sim-year `t = 0`, so `age(t) = startCalendarYear + t − birthYear`. */
      readonly startCalendarYear: number
      /** The pre-tax pool's owner, whose age drives the pool RMD in M2. Per-person pre-tax
       *  splitting (each spouse's own IRA + own RMD) is deferred to M6's schemaVersion-2
       *  bucket/birth-year shape — M2 attributes the single pooled pre-tax to one owner. */
      readonly owner: OverlayPerson
      /** Carried for the {@link selectRmdDivisor} JLLS seam (the >10yr-younger sole-spouse
       *  path); ignored by the M2 Uniform-Lifetime stub. */
      readonly spouse?: OverlayPerson
    }
)

/** A tax-aware decumulation result: the spine's total-trajectory result (the only thing
 *  the outcome distribution reads), plus the final per-bucket balances (auxiliary). */
export interface TaxAwareResult extends DecumulationResult {
  readonly finalBuckets: AccountBuckets
}

const EMPTY_BUCKETS: AccountBuckets = { taxable: 0, pretax: 0, roth: 0 }

// The Uniform Lifetime Table as an O(1) lookup, derived once from the canonical constant —
// the max age is the published "120 and over" terminal bucket; any older age clamps to it
// (derived from the table, never an inlined 120, so the single-source grep cannot trip).
const ULT_DIVISOR_BY_AGE: ReadonlyMap<number, number> = new Map(
  uniformLifetimeTableDivisors.value.map((row) => [row.age, row.divisor]),
)
const ULT_MAX_AGE = uniformLifetimeTableDivisors.value.reduce((max, row) => Math.max(max, row.age), 0)

/** The SECURE-2.0 RMD start age for a birth-year cohort (72 / 73 / 75), read from the
 *  canonical band table. The age-75 band carries `effectiveFrom 2033`, but anyone born
 *  1960+ reaches 75 in 2035+, so the date is always satisfied for the reachable population
 *  — no branch on it (a branch with no reachable effect would be dead code). */
function rmdStartAgeForBirthYear(birthYear: number): number {
  for (const band of rmdStartAge.value) {
    if (band.bornThrough === null || birthYear <= band.bornThrough) return band.age
  }
  // The canonical table's terminal band has `bornThrough: null`, so a match is guaranteed.
  throw new Error('rmdStartAge has no open-ended terminal band')
}

/** The Uniform Lifetime Table divisor for a distribution-year age (Pub 590-B Table III).
 *  Age ≥ the terminal bucket clamps to it (2.0). Below the table's first row (72) throws —
 *  an RMD is not due there, so the lookup is never reached for a real distribution year
 *  (fail loud rather than fabricate a default, burned/062). */
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
 * throws on read), so this milestone stubs to ULT. exactly-10-younger stays on ULT (Table
 * III already bakes in a hypothetical 10-yr-younger beneficiary). `spouseAge` is threaded
 * now so the signature is stable when the grid lands.
 */
function selectRmdDivisor(ownerAge: number, _spouseAge?: number): number {
  return uniformLifetimeDivisor(ownerAge)
}

/**
 * The forced RMD for sim-year `t`: the prior-year-end pre-tax balance ÷ the owner's divisor,
 * once the owner reaches their birth-year RMD age (else 0). NON-CONVERTIBLE — distributed as
 * ordinary income FIRST (the manual control P3·U10 + the solver P4·U15 consume this as a hard
 * legality constraint). Reads ZERO draws (CRN-safe). The ordinary-income TAX on this lands in
 * {@link grossUpForYear} at M3; here the result only relocates pre-tax→taxable (total-neutral
 * with tax off).
 */
function rmdForYear(priorYearEndPretax: number, config: TaxOverlayConfig, t: number): number {
  if (!config.rmdEnabled) return 0
  const ownerAge = config.startCalendarYear + t - config.owner.birthYear
  if (ownerAge < rmdStartAgeForBirthYear(config.owner.birthYear)) return 0
  const spouseAge = config.spouse ? config.startCalendarYear + t - config.spouse.birthYear : undefined
  return priorYearEndPretax / selectRmdDivisor(ownerAge, spouseAge)
}

/**
 * The per-year gross-up: the extra cash (tax + conversion tax) a year's withdrawal must
 * cover beyond the net spending need. ZERO when the overlay is off — the byte-identical-
 * reduction clause.
 *
 * M2 placeholder: returns 0. The RMD-forced distribution is handled as a ledger relocation
 * in the loop below (total-neutral with tax off); the ordinary-income tax ON that RMD, plus
 * the SS-fixed-point / conversion / cap-gains math, lands HERE in M3+, reading the sourced
 * constants from `@engine/constants`.
 */
function grossUpForYear(_year: number, _buckets: AccountBuckets, _config: TaxOverlayConfig): number {
  // M3+ insertion point. Intentionally inert in M2 so the seam is proven first.
  return 0
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

    // Gross up for tax. When off, grossWithdrawal === net EXACTLY (no float op added),
    // so the stepYear recurrence is identical to the spine's. The RMD does NOT enter the
    // gross withdrawal with tax off — it relocates within the portfolio, it is not spent.
    const grossWithdrawal = config.taxEnabled ? net + grossUpForYear(t, buckets, config) : net

    // Per-bucket ledger: which buckets fund this withdrawal (consumed by the tax math in
    // M3+; inert on the total). Capped at what exists, exactly like the spine.
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

      // RMD-forced distribution: spending already pulled `alloc.pretax` from pre-tax; the
      // RMD forces a MINIMUM pre-tax distribution, so only the EXCESS beyond spending is
      // force-relocated to taxable (unspent, reinvested). This moves money BETWEEN two
      // buckets — it never changes `pretaxPost + taxablePost`, so `afterWithdrawal`/`scale`/
      // the authoritative total are all untouched and terminalReal stays byte-identical to
      // the spine. Only the M3 ordinary-income tax (via grossWithdrawal) makes it bite.
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
