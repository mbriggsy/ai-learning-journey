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
