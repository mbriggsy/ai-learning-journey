/**
 * The income-aware healthcare overlay (P1·U3). Like the tax overlay, it is the structural
 * sibling of the earned-income bridge (cross-cutting contract #3): a per-year deterministic
 * transform of the cash-flow term, indexed by absolute year, consuming ZERO random draws, that
 * grosses the withdrawal UP further (net ACA premium pre-65 / IRMAA surcharge post-65 are
 * spending) and reduces byte-identically to the spine when off. The whole unit is PURE — no
 * entropy/clock/environment (the engine-purity lint covers `src/engine/**`).
 *
 * STATUS (per-milestone detail in git log; the load-bearing tested contracts in CLAUDE.md +
 * docs/insights/): U3 ships M1–M5 — the federal constants (`constants/health.ts`: ACA applicable-%,
 * FPL guidelines, the IRMAA schedule), the TWO MAGI calculators (below; ACA-MAGI and IRMAA-MAGI are
 * deliberately distinct numbers, research §4a — the single fact the whole pre-65↔post-65 model rests
 * on), the pre-65 ACA premium fixed-point + explicit 400%-FPL cliff (`solveAcaFundedGross`, wired
 * into `taxOverlay.ts`/`simulate.ts`), the post-65 IRMAA 2-yr-lagged feed-forward, and M5's HSA 4th
 * bucket SPEND side (`hsaQualifiedSpend` below, wired into `taxOverlay.ts` — the 2026-06-08 reshape
 * moved HSA *contributions* to the accumulation track's C2). M6 (the final cross-overlay
 * integration) remains. Each cost-input stream + its reduce-to-spine wiring lands with its first
 * consumer, carrying a `Number.isFinite`-first R19 guard at BOTH `validateParams` and the overlay
 * backstop (insights 008/010 — the proven U2 as-we-go pattern). See
 * docs/plans/back-nine-mvp/phase-1-foundation.md (Unit 3) +
 * docs/plans/2026-06-08-001-feat-fuck-off-date-accumulation-plan.md (B1) +
 * docs/research/pre65-healthcare-aca-hsa-2026-06-04.md.
 *
 * LOAD-BEARING CONTRACTS (do not regress; each is documented + tested at its implementation site):
 *   1. MAGI is read ONLY off the tax overlay's converged FLOORED components. `taxOverlay.ts`'s
 *      `solveGrossWithdrawal` emits them on a {@link GrossUpSolution} (the `realizedGain` is already
 *      past its `Math.max(0, …)` floor). Re-deriving MAGI from a raw taxable-gain/loss ledger would
 *      let a down-market NEGATIVE gain flow in and UNDERSTATE both MAGIs — the project's named
 *      calm-but-wrong sign-inversion (an understated MAGI makes a conversion look cheaper than it is).
 *   2. The 400%-FPL cliff is a RELATIONAL branch on float MAGI: CEIL-quantize before the compare
 *      (insight 010 — a value within rounding noise of 4.00×FPL must never flip eligible↔ineligible).
 *   FORWARD LANDMINE (not yet built): if a muni bucket is ever added, its tax-exempt interest must
 *   enter BOTH MAGIs AND §86 provisional income (`taxableSocialSecurity`) in the SAME change (see the
 *   MagiComponents note below) — touching the MAGIs alone still understates IRMAA-MAGI.
 */
import { federalPovertyGuidelines, type AcaApplicablePercentageTable, type IrmaaSchedule } from '@engine/constants'
import type { FilingStatus } from '@shared/model'

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
// The residual r(P) = impliedNetPremium(P) − P is monotone DECREASING WITHIN a single applicable-% band
// (the outer ACA loop is a gentle contraction there, slope ≈ applicable% ≤ ~0.10 — research §4b), but it
// is NOT globally monotone: the reverted table's applicable % JUMPS UP at 133% FPL (2.10→3.14), so r jumps
// UP where MAGI crosses 1.33×FPL and TWO self-consistent roots can bracket it (an under-133% one at 2.10%,
// an over-133% one at 3.14%). solveAcaFundedGross therefore SPLITS [0, enrolled] at the net premium where
// MAGI crosses each applicable-% discontinuity, bisects each (now-monotone) segment, and picks the CHEAPEST
// feasible self-consistent root — the rational household's equilibrium, and the same "pick cheaper" rule the
// cliff branch already uses. 64 halvings shrink any realistic premium far below a cent; a non-converged
// segment solve THROWS (fail-loud, never a default, burned/062). (Globally-unique-root was the M3 assumption
// the U3-exit code-review pilot corrected — the 133% kink was previously unhandled.)
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
  // An EMPTY bands array is a MALFORMED table, not a 0%-contribution household: returning 0 here would
  // mean PTC = SLCSP (a phantom FULL subsidy) for everyone — the calm-but-wrong, survival-overstating
  // direction. Fail loud rather than default a figure the table failed to provide (burned/062). Dead for
  // the shipped 6-band tables; guards a future/corrupt vintage across the untyped boundary. (U3-exit pilot.)
  if (last === undefined) throw new Error('[healthOverlay] applicableContributionFraction: table has no bands (burned/062)')
  return last.applicablePctHigh / 100
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
 * The FPL-fraction thresholds where the applicable-% schedule JUMPS — a band whose low % differs from the
 * previous band's high %. The ACA residual netPremium(P)−P is monotone WITHIN a band but jumps UP at such a
 * threshold, so {@link solveAcaFundedGross} splits its bracket there to keep each segment monotone. The
 * reverted table has exactly ONE (133% FPL: 2.10→3.14); the enhanced table has none (every band joins
 * continuously). Continuous KINKS (slope changes with matching endpoints) need no split — only true jumps.
 */
function applicablePctDiscontinuityFractions(table: AcaApplicablePercentageTable): number[] {
  const out: number[] = []
  for (let i = 1; i < table.bands.length; i++) {
    const prev = table.bands[i - 1]
    const cur = table.bands[i]
    if (prev !== undefined && cur !== undefined && cur.applicablePctLow !== prev.applicablePctHigh) {
      out.push(cur.fplFractionLow)
    }
  }
  return out
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
 *  3. SPLIT [0, enrolled] at the net premiums where MAGI crosses an applicable-% DISCONTINUITY (the
 *     133%-FPL kink in the reverted table), so the residual is monotone within each segment. Without
 *     this the residual jumps UP at the kink → two self-consistent roots → a bracketing-dependent
 *     converge. No discontinuity in range (incl. the enhanced table) ⇒ one segment ⇒ the prior path.
 *  4. Bisect each monotone segment for a self-consistent under-cliff root; quantize MAGI by CEIL
 *     (conservative: never admit a strictly-over household as eligible; insight 010 near-edge flip)
 *     and drop any root over the cliff. STRICT cliff: 400% FPL EXACTLY is eligible (IRC §36B 100–400%).
 *  5. Among the feasible roots pick the CHEAPEST (least net premium ⇒ least withdrawal ⇒ smallest gross
 *     — `fundNet` is monotone): the rational household's equilibrium, and consistent with preferring
 *     under-cliff over over-cliff. None feasible ⇒ the over-cliff (PTC=0) solve.
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

  // Solve the cliff-removed residual r(P) = netPremium(P) − P over a SINGLE monotone segment [lo, hi]
  // (r is strictly decreasing there). Returns the converged probe, or null when the segment holds no root
  // (r has the same sign at both ends ⇒ the root lives in another segment). Finiteness-gated (insight 010).
  const bisectSegment = (lo: number, hi: number): ReturnType<typeof probeAt> | null => {
    const loProbe = probeAt(lo)
    const hiProbe = probeAt(hi)
    const rLo = loProbe.netPremium - lo
    const rHi = hiProbe.netPremium - hi
    if (!Number.isFinite(rLo) || !Number.isFinite(rHi)) {
      throw new Error('[healthOverlay] non-finite ACA residual (insight 010)')
    }
    if (Math.abs(rLo) < ACA_EPSILON) return loProbe
    if (Math.abs(rHi) < ACA_EPSILON) return hiProbe
    if (rLo < 0 || rHi > 0) return null // no sign change ⇒ the root is outside this segment
    let a = lo
    let b = hi
    for (let pass = 0; pass < ACA_MAX_PASSES; pass++) {
      const mid = (a + b) / 2
      const e = probeAt(mid)
      const r = e.netPremium - mid
      if (!Number.isFinite(r)) throw new Error('[healthOverlay] non-finite ACA residual (insight 010)')
      if (Math.abs(r) < ACA_EPSILON || b - a < ACA_EPSILON) return e
      if (r > 0) a = mid
      else b = mid
    }
    throw new Error(
      `[healthOverlay] ACA net-premium bisection did not converge in ${ACA_MAX_PASSES} passes ` +
        `(baseNet=${baseNet}, slcsp=${slcsp}, enrolled=${enrolled}) — refusing an unconverged premium (burned/062)`,
    )
  }

  // (2) probe-at-0: if even the lowest-withdrawal assumption is over the cliff, no under-cliff solution can
  // exist (MAGI rises monotonically with the withdrawal). Ceil-quantize (conservative; insight 010).
  const at0 = probeAt(0)
  if (cliffMagi !== null && Math.ceil(at0.magi) > cliffMagi) return overCliffSolution()

  // (3) Partition [0, enrolled] at the net premiums where MAGI crosses an applicable-% DISCONTINUITY so each
  // segment's residual is monotone. r jumps UP at such a threshold (the 133%-FPL kink, 2.10→3.14), which
  // would otherwise admit TWO self-consistent roots and let a single bisection converge to a bracketing-
  // dependent one. MAGI is monotone-increasing in P (via fundNet), so each crossing maps to ONE net premium,
  // found by an inner bisection. (No discontinuity in range — incl. the whole enhanced table — ⇒ no split ⇒
  // identical to the prior single-bisection path, so every existing fixture is byte-identical.)
  const atEnrolled = probeAt(enrolled)
  const findPForMagi = (targetMagi: number): number => {
    let a = 0
    let b = enrolled
    for (let pass = 0; pass < ACA_MAX_PASSES; pass++) {
      const mid = (a + b) / 2
      if (probeAt(mid).magi < targetMagi) a = mid
      else b = mid
      if (b - a < ACA_EPSILON) return (a + b) / 2 // converged — the located split net premium
    }
    // Fail-loud SYMMETRY with bisectSegment (burned/062): 64 halvings of [0, enrolled] shrink the
    // bracket far below ACA_EPSILON, so this is unreachable in practice — but a SILENT (a+b)/2 on an
    // unconverged bracket is a MIS-LOCATED split point (a wrong segment boundary → the wrong, more-
    // expensive root, no thrown error). Refuse it rather than default. (U3-exit code-review-pilot
    // follow-up — the inner split-locator was the one iterative solve here that did NOT fail loud.)
    throw new Error(
      `[healthOverlay] findPForMagi (MAGI-discontinuity split) did not converge in ${ACA_MAX_PASSES} ` +
        `passes (targetMagi=${targetMagi}, enrolled=${enrolled}) — refusing a mis-split premium (burned/062)`,
    )
  }
  const splitPs = applicablePctDiscontinuityFractions(table)
    .map((frac) => frac * fplDollar)
    .filter((tau) => tau > at0.magi && tau < atEnrolled.magi)
    .map(findPForMagi)
    .sort((x, y) => x - y)
  const bounds = [0, ...splitPs, enrolled]

  // (4) Bisect each monotone segment; among the FEASIBLE (under-cliff) self-consistent roots keep the
  // CHEAPEST (lowest net premium ⇒ lowest gross — the rational household's equilibrium, and the same
  // "pick cheaper" rule the cliff branch uses).
  let best: ReturnType<typeof probeAt> | null = null
  for (let s = 0; s < bounds.length - 1; s++) {
    const lo = bounds[s] ?? 0
    const hiRaw = bounds[s + 1] ?? enrolled
    // An interior upper bound IS a discontinuity (MAGI = threshold there evaluates with the NEXT band);
    // sample the sign just inside it so this segment stays on its own monotone branch (insight 010 near-edge).
    const interiorRight = s + 1 < bounds.length - 1
    const hi = interiorRight ? Math.max(lo, hiRaw - ACA_EPSILON) : hiRaw
    const root = bisectSegment(lo, hi)
    if (root === null) continue
    if (cliffMagi !== null && Math.ceil(root.magi) > cliffMagi) continue // infeasible — over the 400% cliff
    if (best === null || root.netPremium < best.netPremium) best = root
  }

  // (5) No feasible under-cliff root in any segment ⇒ over the cliff: fund the full enrolled premium at
  // PTC = 0 (the cliff regime). Enhanced/no-cliff always yields a feasible root, so best ≠ null there.
  if (best === null) {
    if (cliffMagi !== null) return overCliffSolution()
    throw new Error(
      `[healthOverlay] ACA net-premium solve found no feasible root in any segment ` +
        `(baseNet=${baseNet}, slcsp=${slcsp}, enrolled=${enrolled}) — refusing an unconverged premium (burned/062)`,
    )
  }

  // (6) Feasible (or enhanced/no-cliff). Below the 100%-FPL floor the PTC was forced to 0 inside
  // slidingScalePtc (conservative); surface the disclosure flag.
  const belowFloor = best.magi / fplDollar < table.eligibilityFloorFplFraction
  return {
    gross: best.sol.gross,
    netPremium: best.netPremium,
    ptc: best.ptc,
    magi: best.magi,
    components: best.sol.components,
    belowFloor,
    overCliff: false,
  }
}

// =========================================================================
// The post-65 IRMAA surcharge + full Medicare cost (M4).
//
// Post-65 the household enrolls in Medicare and (premium-free Part A assumed) loses the ACA PTC —
// income-sensitivity switches OFF the ACA cliff and ON the IRMAA step (research §76). IRMAA is a
// 2-year-LAGGED FEED-FORWARD, NOT a fixed point (research §4c): the surcharge for year t keys off
// IRMAA-MAGI[t−2], which is already known, so within year t it is a CONSTANT addend to the spending
// the gross-up funds — never a search variable, so the step-discontinuity hazard (insight 013) cannot
// reach a root-finder here (it would only bite if a solver searched over an IRMAA-affected quantity).
// These two functions are the pure pieces; the per-year IRMAA-MAGI history, the 2yr lag, the seed for
// a sim starting near 65, and the survivor MFJ→single threshold flip (lagged +2yr, since year t's
// threshold uses filing[t−2]) all live in taxOverlay.ts's runTaxAwareDecumulation.
//
// PURE: a function of (the IRMAA-MAGI scalar, filing, the constants). Reads ZERO draws (CRN-safe).
// =========================================================================

/**
 * The per-person MONTHLY IRMAA surcharge (Part B + Part D combined) for an IRMAA-MAGI + filing
 * status: the highest tier whose threshold IRMAA-MAGI STRICTLY EXCEEDS, else 0 (the implicit base
 * tier — no surcharge). A PURE STEP function: $1 over a threshold owes the FULL tier (research §4c).
 *
 * The thresholds are lower-bound-EXCLUSIVE INTEGER dollars, so the raw `magi > threshold` compare is
 * used directly — NO ceil/round "for noise" (insight 012: `ceil(x) > N ⟺ x > N` for integer N, a
 * provable no-op on the branch; an exact-threshold MAGI is measure-zero and the conservative
 * cost-overstating direction is inherent in the step's lower-exclusivity).
 *
 * Finiteness FIRST (insight 010): a NaN MAGI sails through every `>` comparison as false and would
 * silently return 0 — a phantom no-surcharge → understated cost → overstated survival, the cardinal
 * calm-but-wrong sin. Reject it loudly before any compare (burned/062), never coerce.
 */
export function irmaaTierSurchargeMonthly(magi: number, filing: FilingStatus, schedule: IrmaaSchedule): number {
  if (!Number.isFinite(magi)) {
    throw new Error(
      `[healthOverlay] irmaaTierSurchargeMonthly: IRMAA-MAGI must be finite (got ${magi}) — a NaN passes every > compare (insight 010)`,
    )
  }
  // tiers are ascending (constants.shape pins it); the LAST one strictly exceeded is the highest.
  let surchargeMonthly = 0
  for (const tier of schedule.tiers) {
    const threshold = filing === 'mfj' ? tier.mfjMagiThreshold : tier.singleMagiThreshold
    if (magi > threshold) surchargeMonthly = tier.partBSurchargeMonthly + tier.partDSurchargeMonthly
  }
  return surchargeMonthly
}

/**
 * The full post-65 Medicare premium cost for one year (real $): the income-INVARIANT base Part B
 * premium PLUS the income-sensitive IRMAA surcharge (Part B + Part D), per Medicare-enrolled person,
 * annualized (×12). `enrolledCount` is the household's Medicare-ENROLLED living count that year
 * (C3 §3b: per-person onset-aware — `|living ∩ {i : t ≥ onset_i}|`, with biological 65 the
 * absent-signal default; a member working past 65 is NOT enrolled, so their base Part B never
 * prices — the mirror of the ACA pre-65 gate); a couple both enrolled pays ×2 BY THE COUNT,
 * never a hard-coded ×2 (research §44/§4c).
 *
 * The overlay funds this whole cost (the post-65 analog of funding the full pre-65 net ACA premium),
 * so terminalReal drops by the grossed-up withdrawal that pays it. SCOPE — disclosed boundaries,
 * never silent omissions (the cardinal rule):
 *   - Part D BASE plan premium is NOT modeled (plan-specific, no sourced constant; the user budgets
 *     their chosen Part D plan). Only the income-related Part D SURCHARGE is here.
 *   - The Part B deductible / OOP cost-sharing is not a premium — it is HSA / OOP-medical (M5).
 *   - Premium-free Part A is assumed (a retired couple with a 40-quarter history, §Strand 5);
 *     purchased Part A premiums (partA2026) are out of scope.
 *
 * `irmaaMagiForBill` is IRMAA-MAGI[t−2] (the 2-year lag) and `filing` is the filing status of THAT
 * lagged year (so the survivor MFJ→single threshold flip is itself lagged +2yr) — both from the caller.
 */
export function medicareAnnualCost(
  irmaaMagiForBill: number,
  filing: FilingStatus,
  enrolledCount: number,
  schedule: IrmaaSchedule,
  partBBaseMonthly: number,
): number {
  if (enrolledCount <= 0) return 0
  const surchargeMonthly = irmaaTierSurchargeMonthly(irmaaMagiForBill, filing, schedule)
  return enrolledCount * (partBBaseMonthly + surchargeMonthly) * 12
}

// =========================================================================
// The HSA 4th bucket — qualified spend (U3 · M5, SPEND side; contributions are
// the accumulation track's C2). Pub 969 rules ship verbatim in
// `constants/health.ts` (`hsaFourthBucketRules`); this is their engine.
// =========================================================================

/**
 * The year's QUALIFIED, MAGI-INVISIBLE HSA spend (U3 · M5) — the dollars the HSA bucket may pay
 * out tax-free this year. The cap is the year's HSA-payable medical outlay:
 *
 *     min( hsaBalance,                                  — you cannot spend what you do not have
 *          oopMedical + (ownerIs65Plus ? medicareCost : 0),  — the QUALIFIED set (Pub 969)
 *          fundingNeed )                                — never more than the year actually spends
 *
 * THE QUALIFIED SET, verbatim from `hsaFourthBucketRules` (Pub 969 / IRC §223):
 *   - Out-of-pocket medical (`oopMedical[t]`, the modeled stream) — qualified at ANY age.
 *   - Medicare premiums (base Part B + the IRMAA surcharge — a premium surcharge is still a
 *     premium under exception (4) "Medicare and other health coverage if you were 65 or older";
 *     Medigap is excluded and is NOT modeled) — qualified ONLY when the HSA OWNER (the account
 *     beneficiary) is 65+. The privilege keys to the OWNER's age, NEVER the spouse's: a 65+
 *     spouse's premiums are unqualified while the owner is under 65 (`ownerIs65Plus` is the
 *     caller-resolved owner gate, spousal-rollover aware).
 *   - THE TRAP (structural): the ACA marketplace premium is NOT in the formula — it is never
 *     HSA-payable in the normal case (COBRA / unemployment-comp exceptions are out of the MVP,
 *     disclosed). A cap that included the enrolled/net premium would overstate "HSA covers
 *     healthcare" — the calm-but-wrong-optimistic direction.
 *
 * `fundingNeed` is the year's total non-ACA-premium cash need (`net + medicareCost`): clamping at
 * it keeps an incoherent `oopMedical > spending` input well-defined (the HSA pays at most what
 * the household actually spends; the excess stays in the bucket) and guarantees the caller's
 * `fundingNet = fundingNeed − spend ≥ 0` (the gross-up never receives a negative need).
 *
 * MAGI-INVISIBILITY is BY CONSTRUCTION: the returned spend reduces what the portfolio must fund
 * BEFORE the gross-up, and never enters `MagiComponents` (not `nonSSordinary`, not
 * `realizedGain`) — so both MAGIs genuinely DROP when medical is HSA-funded instead of
 * IRA-funded (the loop-breaking lever, research §4a).
 *
 * THE LAUNDERING CONTRACT (the post-65 NON-qualified path — NOT routed in M5): a post-65
 * non-qualified HSA withdrawal is ORDINARY INCOME (the 20% penalty is waived at 65, the income
 * inclusion is not — `hsaFourthBucketRules.penaltyWaivedAt65`); it would enter
 * `MagiComponents.nonSSordinary` at its producer (`solveGrossWithdrawal`), raising BOTH MAGIs.
 * The M5 engine never produces one — HSA outflow is qualified-only (this cap) and the general
 * drawdown structurally cannot reach the bucket (`GeneralBucketKey`); the engine instead
 * declares general-depletion with a stranded HSA (conservative, disclosed). FORWARD LANDMINE:
 * any future consumer that routes non-qualified HSA spend (the P4 solver's last-resort draw)
 * MUST add it to `nonSSordinary` in the SAME change — an MAGI-free general draw from the HSA is
 * the named income-laundering bug.
 *
 * Finiteness FIRST (insight 010): every argument is validated before any compare — a NaN sails
 * through `Math.min` (NaN propagates) into the funding arithmetic and would poison the year.
 */
export function hsaQualifiedSpend(args: {
  readonly hsaBalance: number
  readonly oopMedical: number
  readonly medicareCost: number
  readonly ownerIs65Plus: boolean
  readonly fundingNeed: number
}): number {
  const { hsaBalance, oopMedical, medicareCost, ownerIs65Plus, fundingNeed } = args
  if (!Number.isFinite(hsaBalance) || hsaBalance < 0)
    throw new Error(`[healthOverlay] hsaQualifiedSpend: hsaBalance must be finite and ≥ 0 (got ${hsaBalance}) — insight 010`)
  if (!Number.isFinite(oopMedical) || oopMedical < 0)
    throw new Error(`[healthOverlay] hsaQualifiedSpend: oopMedical must be finite and ≥ 0 (got ${oopMedical}) — insight 010`)
  if (!Number.isFinite(medicareCost) || medicareCost < 0)
    throw new Error(`[healthOverlay] hsaQualifiedSpend: medicareCost must be finite and ≥ 0 (got ${medicareCost}) — insight 010`)
  if (!Number.isFinite(fundingNeed) || fundingNeed < 0)
    throw new Error(`[healthOverlay] hsaQualifiedSpend: fundingNeed must be finite and ≥ 0 (got ${fundingNeed}) — insight 010`)
  const qualifiedCap = oopMedical + (ownerIs65Plus ? medicareCost : 0)
  return Math.min(hsaBalance, qualifiedCap, fundingNeed)
}
