/**
 * The income-aware healthcare overlay (P1·U3). Like the tax overlay, it is the structural
 * sibling of the earned-income bridge (cross-cutting contract #3): a per-year deterministic
 * transform of the cash-flow term, indexed by absolute year, consuming ZERO random draws, that
 * grosses the withdrawal UP further (net ACA premium pre-65 / IRMAA surcharge post-65 are
 * spending) and reduces byte-identically to the spine when off. The whole unit is PURE — no
 * entropy/clock/environment (the engine-purity lint covers `src/engine/**`).
 *
 * MILESTONE STATUS — built incrementally, mirroring U2's arc; per-milestone detail is in git log.
 *   - M1 (done): the federal constants foundation (`constants/health.ts` — ACA applicable-%,
 *     FPL guidelines, the IRMAA schedule).
 *   - M2 (this): the TWO MAGI calculators. ACA-MAGI and IRMAA-MAGI are deliberately distinct
 *     numbers (research §4a) — the single fact the whole pre-65↔post-65 model rests on. They are
 *     pure functions of the tax overlay's converged per-year quantities; they are NOT yet wired
 *     into `simulate`'s loop and compute NO ACA/IRMAA cost (that is M3/M4). The healthcare
 *     on/off toggle + the cost-input streams + the reduce-to-spine wiring land with their first
 *     consumer (M3), each carrying its own R19 finiteness guard (insights 008/010) — the proven
 *     U2 pattern, rather than locking a guessed input shape three milestones early.
 *   - M3+: the ACA pre-65 fixed-point + explicit 400%-FPL cliff branch; the IRMAA 2-yr-lagged
 *     feed-forward; the HSA 4th bucket; integration into `simulate.ts` on the existing
 *     `living`/`HouseholdYear` loop + the survivor flip (ACA immediate, IRMAA +2yr).
 *   See docs/plans/back-nine-mvp/phase-1-foundation.md (Unit 3) +
 *   docs/research/pre65-healthcare-aca-hsa-2026-06-04.md.
 *
 * M3 WIRING LANDMINES (do not rediscover at runtime — surfaced by the M2 adversarial review):
 *   1. SURFACE THE FLOORED COMPONENTS, don't recompute. The components below are the converged-
 *      gross locals inside `taxOverlay.ts`'s `solveGrossWithdrawal` (~lines 719-727), which today
 *      returns only the scalar gross. M3 must refactor it to EMIT those exact locals — in
 *      particular `realizedGain` AFTER the `Math.max(0, …)` floor at line 720. Re-deriving MAGI
 *      from a raw taxable-bucket gain/loss ledger instead would let a down-market NEGATIVE gain
 *      flow in and UNDERSTATE both MAGIs — the project's named calm-but-wrong sign-inversion
 *      (an understated MAGI makes a conversion look cheaper than it is).
 *   2. THE 400%-FPL CLIFF IS A RELATIONAL BRANCH. When M3 feeds real (float) MAGI into the ACA
 *      cliff test, a value within rounding noise of 4.00×FPL can flip the branch (insight 010 —
 *      a near-edge comparison). Quantize the cliff decision like `confidence.ts` does the headline.
 */
import { federalPovertyGuidelines, type AcaApplicablePercentageTable } from '@engine/constants'

/**
 * The per-year ingredients BOTH MAGIs are built from — the tax overlay's converged-gross
 * quantities (the funded `gross` is solved upstream in `taxOverlay.ts`, then these are read off
 * at convergence). Grouping them into one object means the two calculators read the SAME inputs
 * and can differ ONLY in their documented Social-Security treatment — they can never silently
 * diverge on anything but SS.
 *
 * AGI, as the overlay composes it, is `nonSSordinary + realizedGain + ssBenefitTaxable` — so the
 * two MAGIs below are each that AGI, differing only in whether the SS term is the FULL benefit
 * (ACA) or its TAXABLE portion (IRMAA).
 *
 * STATUTORY-COMPLETENESS NOTE: the full MAGI definition also adds tax-exempt (muni) interest and
 * excluded foreign earned income to BOTH variants. The MVP has NEITHER (no muni bucket, no
 * foreign-income input), so both terms are identically 0 and are OMITTED here rather than carried
 * as dead always-0 fields (the as-we-go discipline — a field lands with its producer). FORWARD
 * LANDMINE if a muni bucket is ever added: muni interest must be added to BOTH MAGIs **and** to
 * §86 provisional income (`taxableSocialSecurity` in `taxOverlay.ts`) in the SAME change — adding
 * it to the MAGIs alone would still understate IRMAA-MAGI, because the taxable-SS that feeds it is
 * computed from a provisional income that (correctly, for the muni-free MVP) omits muni interest.
 */
export interface MagiComponents {
  /** Ordinary income excluding Social Security: the pre-tax distribution actually taxed
   *  (`max(spending pre-tax draw, RMD)`) + any Roth conversion. (Roth / taxable-basis
   *  withdrawals are NOT ordinary income, so they never enter here — the MAGI-invisible lever.) */
  readonly nonSSordinary: number
  /** Realized long-term capital gain / qualified dividends for the year (in AGI; floored at 0 by
   *  the producer — a down-market loss must not become negative MAGI; see M3 landmine #1). */
  readonly realizedGain: number
  /** The FULL Social-Security benefit (gross), before the provisional-income haircut — the figure
   *  ACA-MAGI effectively counts in full. */
  readonly ssBenefitFull: number
  /** The TAXABLE portion of the SS benefit (IRS Pub 915 Worksheet 1 result) — the part that lands
   *  in AGI, and therefore the only SS that IRMAA-MAGI sees. */
  readonly ssBenefitTaxable: number
}

/**
 * A solved per-year gross-up (M3): the converged gross withdrawal PLUS the floored MAGI ingredients
 * read off the converging pass. Surfacing the components HERE — instead of recomputing MAGI off a
 * raw taxable-gain ledger — is the load-bearing fix for the named sign-inversion (a down-market
 * negative gain would understate MAGI; see the M3 wiring landmines above). `taxOverlay.ts`'s
 * `solveGrossWithdrawal` produces this; the ACA solver consumes `acaMagi(components)` off it.
 */
export interface GrossUpSolution {
  readonly gross: number
  readonly components: MagiComponents
}

/**
 * ACA-MAGI (pre-65 premium-tax-credit basis): `AGI + non-taxable SS` (+ muni interest + excluded
 * foreign income, both 0 in the MVP), so the FULL Social-Security benefit effectively counts (the
 * non-taxable portion is added back on top of the taxable portion already in AGI). Drives the
 * §36B PTC and the 400% FPL cliff. (research §4a; IRS Pub 974 / Form 8962.)
 */
export function acaMagi(c: MagiComponents): number {
  return c.nonSSordinary + c.realizedGain + c.ssBenefitFull
}

/**
 * IRMAA-MAGI (post-65 Medicare Part B/D surcharge basis): `AGI` (+ muni interest, 0 in the MVP),
 * with NO Social-Security add-back — so only the TAXABLE portion of SS (already in AGI) counts.
 * Distinct from {@link acaMagi} by exactly the non-taxable SS portion; the IRMAA bill keys off
 * this value two years in arrears (the lag is M4). (research §4a; IRMAA-MAGI per SSA / Form 1040.)
 */
export function irmaaMagi(c: MagiComponents): number {
  return c.nonSSordinary + c.realizedGain + c.ssBenefitTaxable
}

// =========================================================================
// The pre-65 ACA premium-funding fixed-point (M3 · Slice 2).
//
// Pre-65, the household funds spending PLUS a marketplace health premium that is offset by a
// §36B Premium Tax Credit. The PTC depends on ACA-MAGI, which depends on the withdrawal, which
// depends on the net premium — a same-year circular reference (the IRS resolves the identical
// SEHI↔PTC circularity iteratively, Pub 974 / Rev. Proc. 2014-41). We solve it as a BISECTION
// over the net premium P ∈ [0, enrolled], because the map gains a DISCONTINUITY at the 400%-FPL
// cliff: rather than let an iterator oscillate across it, we hoist the cliff OUT into an explicit
// two-candidate branch (under-cliff bisection vs over-cliff PTC=0) and pick the cheaper feasible.
//
// PURE: a function of (cash inputs, the constants, an injected `fundNet` closure). Reads ZERO draws
// (CRN-safe). The two MAGI calculators above are the only way MAGI is obtained — never recomputed
// off a raw-gain ledger (the named sign-inversion; M2 landmine #1).
// =========================================================================

/** Solve the inner tax gross-up for a given net-of-health spending target, returning the converged
 *  gross AND its floored MAGI components (a {@link GrossUpSolution}). `taxOverlay.ts`'s
 *  `solveGrossWithdrawal` is wrapped in this shape (Slice 4); a synthetic closure stands in for it
 *  in this slice's unit tests. The ACA solver calls it ONCE per probe and reads `acaMagi(.components)`. */
export type FundNet = (netTotal: number) => GrossUpSolution

/** The resolved pre-65 ACA outcome for one year: the gross withdrawal to fund (feeds `stepYear`),
 *  the net premium actually paid (the presence companion + `totalNetPremiumReal`), the PTC, the
 *  converged ACA-MAGI + its components, and two disclosure flags. */
export interface AcaSolution {
  /** The gross withdrawal that self-consistently funds baseNet + tax + the net health premium. */
  readonly gross: number
  /** The ACA net premium paid this year (enrolled − PTC, floored at 0). */
  readonly netPremium: number
  /** The §36B Premium Tax Credit applied (≥ 0; 0 over the cliff or below the 100%-FPL floor). */
  readonly ptc: number
  /** The converged ACA-MAGI (full SS counts) — the value the cliff/floor branches key off. */
  readonly magi: number
  readonly components: MagiComponents
  /** TRUE iff MAGI < 100% FPL (Medicaid territory): PTC forced to 0 (the ratified CONSERVATIVE
   *  direction — never an optimistic phantom marketplace credit), disclosed to the caller. */
  readonly belowFloor: boolean
  /** TRUE iff the cliff regime priced PTC = 0 because MAGI is strictly above the 400%-FPL cliff. */
  readonly overCliff: boolean
}

// Bisection controls. The bracket [0, enrolled] is STRUCTURAL (net premium is physically bounded:
// PTC ≥ 0 ⇒ net ≤ enrolled; net = max(0, enrolled − PTC) ⇒ net ≥ 0), so it needs no probing/expansion.
// The residual r(P) = impliedNetPremium(P) − P is monotone DECREASING (the outer ACA loop is a gentle
// contraction, slope ≈ applicable% ≤ ~0.10 — research §4b), with r(0) ≥ 0 and r(enrolled) ≤ 0, so a
// unique root exists and bisection is unconditionally convergent. 64 halvings shrink any realistic
// enrolled premium far below a cent; a non-converged solve THROWS (fail-loud, never a default, burned/062).
const ACA_MAX_PASSES = 64
const ACA_EPSILON = 1e-6 // dollars (net-premium / bracket-width precision)

/** The household's Federal Poverty Line dollar for `size` people (`base + (size−1)×increment`),
 *  read from the canonical 2025 HHS guidelines. Slice 4 passes `livingCount` as the size; the
 *  cliff dollar is DERIVED (`cliffFplFraction × fplForHousehold`), never re-typed. */
export function fplForHousehold(size: number): number {
  const g = federalPovertyGuidelines.value
  return g.base + Math.max(0, size - 1) * g.perAdditionalPerson
}

/**
 * The applicable contribution percentage (as a FRACTION, e.g. 0.0844) for a household at
 * `fplFraction` of the poverty line, LINEARLY interpolated within its band. The caller gates the
 * 100%-FPL floor (below it there is no marketplace credit), so this is reached only for
 * `fplFraction ≥ eligibilityFloor`. The OPEN top band (`fplFractionHigh === null`, the enhanced
 * regime's "400% and higher") is FLAT. Above the last FINITE band with no open band (the reverted
 * regime above 400% FPL) the cliff-removed residual flat-extends the last band's high % — the cliff
 * itself is applied SEPARATELY as a feasibility gate, never folded in here.
 */
export function applicableContributionFraction(fplFraction: number, table: AcaApplicablePercentageTable): number {
  for (const band of table.bands) {
    if (band.fplFractionHigh === null) {
      if (fplFraction >= band.fplFractionLow) return band.applicablePctLow / 100
    } else if (fplFraction >= band.fplFractionLow && fplFraction < band.fplFractionHigh) {
      const span = band.fplFractionHigh - band.fplFractionLow
      const w = span > 0 ? (fplFraction - band.fplFractionLow) / span : 0
      return (band.applicablePctLow + w * (band.applicablePctHigh - band.applicablePctLow)) / 100
    }
  }
  // Reverted regime, above the top finite band: flat-extend the last band's high % (cliff-removed).
  const last = table.bands[table.bands.length - 1]
  return (last ? last.applicablePctHigh : 0) / 100
}

/**
 * The CLIFF-REMOVED §36B PTC: `max(0, SLCSP − applicable% × MAGI)`. The 400%-FPL cliff is NOT
 * applied here (the solver branches on it explicitly); below the 100%-FPL eligibility floor the
 * credit is 0 (the ratified CONSERVATIVE direction — Medicaid territory, never an optimistic
 * phantom subsidy). Caller floors `netPremium = max(0, enrolled − min(ptc, enrolled))`.
 */
export function slidingScalePtc(
  magi: number,
  slcsp: number,
  fplDollar: number,
  table: AcaApplicablePercentageTable,
): number {
  const fplFraction = magi / fplDollar
  if (fplFraction < table.eligibilityFloorFplFraction) return 0
  const contribution = applicableContributionFraction(fplFraction, table) * magi
  return Math.max(0, slcsp - contribution)
}

/**
 * Solve the self-consistent gross withdrawal that funds `baseNet` of spending PLUS the year's net
 * ACA premium, given the benchmark `slcsp`, the actual `enrolled` premium, the household's
 * `fplDollar`, the applicable-% `table` (reverted = cliff regime; enhanced = no cliff), and the
 * inner-gross-up `fundNet` closure.
 *
 * STRUCTURE (cliff regime):
 *  1. R19 backstop — finiteness FIRST on every external input (insight 008/010); fail loud, never coerce.
 *  2. probe-at-0 — if even net-premium 0 (the most generous, lowest-withdrawal assumption) lands
 *     quantized-OVER the cliff, no under-cliff solution can exist (MAGI rises with the withdrawal),
 *     so go straight to the over-cliff (PTC=0) solve — skipping the bisection (the plan's named
 *     "high-spend, no feasible under-cliff" case).
 *  3. Bisect the cliff-removed residual over [0, enrolled] for the under-cliff candidate.
 *  4. Feasibility — quantize MAGI by CEIL (conservative: never admit a strictly-over household as
 *     eligible; insight 010 near-edge flip) and compare to the cliff dollar. If over ⇒ infeasible ⇒
 *     over-cliff solve. STRICT cliff: 400% FPL EXACTLY is eligible (IRC §36B 100–400% inclusive).
 *  5. The under-cliff candidate is provably CHEAPER than over-cliff when feasible (less premium ⇒
 *     less withdrawal ⇒ smaller gross — `fundNet` is monotone), so "pick cheaper" = use it. The
 *     monotonicity is asserted in the tests rather than paying an extra `fundNet` call here.
 *
 * Enhanced regime (`cliffFplFraction === null`): no cliff branch — the bisection's sliding scale
 * already includes the flat-8.5% open top band above 400% FPL, so it is always feasible.
 */
export function solveAcaFundedGross(
  baseNet: number,
  slcsp: number,
  enrolled: number,
  fplDollar: number,
  table: AcaApplicablePercentageTable,
  fundNet: FundNet,
): AcaSolution {
  // (1) R19 backstop — finiteness FIRST (a NaN sails through every relational guard; insight 010).
  // validateParams shields `simulate`; this is the engine's own fail-loud backstop for a direct
  // caller (a future P3 control / P4 solver). Reject, never coerce (burned/062).
  if (!Number.isFinite(baseNet) || baseNet < 0) throw new Error(`[healthOverlay] baseNet must be finite ≥ 0 (got ${baseNet})`)
  if (!Number.isFinite(slcsp) || slcsp < 0) throw new Error(`[healthOverlay] slcsp must be finite ≥ 0 (got ${slcsp})`)
  if (!Number.isFinite(enrolled) || enrolled < 0) throw new Error(`[healthOverlay] enrolledPremium must be finite ≥ 0 (got ${enrolled})`)
  if (!Number.isFinite(fplDollar) || fplDollar <= 0) throw new Error(`[healthOverlay] fplDollar must be finite > 0 (got ${fplDollar})`)

  const cliffMagi = table.cliffFplFraction !== null ? table.cliffFplFraction * fplDollar : null

  // Evaluate the cliff-removed self-consistent quantities at a candidate net premium P.
  const probeAt = (p: number) => {
    const sol = fundNet(baseNet + p)
    const magi = acaMagi(sol.components)
    if (!Number.isFinite(magi)) throw new Error('[healthOverlay] non-finite ACA-MAGI in the ACA solve (insight 010 — finiteness before any compare)')
    const ptc = slidingScalePtc(magi, slcsp, fplDollar, table)
    const netPremium = Math.max(0, enrolled - Math.min(ptc, enrolled))
    return { sol, magi, ptc, netPremium }
  }

  // The over-cliff / no-subsidy candidate: PTC = 0, the full enrolled premium funded (one call).
  const overCliffSolution = (): AcaSolution => {
    const sol = fundNet(baseNet + enrolled)
    const magi = acaMagi(sol.components)
    if (!Number.isFinite(magi)) throw new Error('[healthOverlay] non-finite ACA-MAGI (over-cliff solve, insight 010)')
    return { gross: sol.gross, netPremium: enrolled, ptc: 0, magi, components: sol.components, belowFloor: false, overCliff: true }
  }

  // (2) probe-at-0 short-circuit: even the lowest-withdrawal assumption is over the cliff ⇒ no feasible
  // under-cliff solution (MAGI is monotone in the withdrawal). Ceil-quantize (conservative).
  if (cliffMagi !== null) {
    const at0 = probeAt(0)
    if (Math.ceil(at0.magi) > cliffMagi) return overCliffSolution()
  }

  // (3) Bisect the cliff-removed residual r(P) = netPremium(P) − P over [0, enrolled]. Monotone
  // decreasing; r(0) ≥ 0, r(enrolled) ≤ 0. Finiteness-gated termination (insight 010).
  let lo = 0
  let hi = enrolled
  let converged: ReturnType<typeof probeAt> | null = null
  for (let pass = 0; pass < ACA_MAX_PASSES; pass++) {
    const mid = (lo + hi) / 2
    const e = probeAt(mid)
    const r = e.netPremium - mid
    if (!Number.isFinite(r)) throw new Error('[healthOverlay] non-finite ACA residual (insight 010)')
    if (Math.abs(r) < ACA_EPSILON || hi - lo < ACA_EPSILON) {
      converged = e
      break
    }
    if (r > 0) lo = mid
    else hi = mid
  }
  if (converged === null) {
    throw new Error(
      `[healthOverlay] ACA net-premium bisection did not converge in ${ACA_MAX_PASSES} passes ` +
        `(baseNet=${baseNet}, slcsp=${slcsp}, enrolled=${enrolled}) — refusing an unconverged premium (burned/062)`,
    )
  }

  // (4) Feasibility: is the under-cliff candidate actually under the cliff? CEIL-quantize MAGI so a
  // value within rounding noise of the cliff is treated CONSERVATIVELY as over (insight 010). STRICT
  // cliff — 400% FPL exactly (ceil(magi) === cliffMagi) stays eligible.
  if (cliffMagi !== null && Math.ceil(converged.magi) > cliffMagi) {
    return overCliffSolution()
  }

  // (5) Feasible (or enhanced/no-cliff). Below the 100%-FPL floor the PTC was forced to 0 inside
  // slidingScalePtc (conservative); surface the disclosure flag.
  const belowFloor = converged.magi / fplDollar < table.eligibilityFloorFplFraction
  return {
    gross: converged.sol.gross,
    netPremium: converged.netPremium,
    ptc: converged.ptc,
    magi: converged.magi,
    components: converged.sol.components,
    belowFloor,
    overCliff: false,
  }
}
