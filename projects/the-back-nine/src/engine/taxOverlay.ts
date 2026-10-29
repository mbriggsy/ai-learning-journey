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
 * computation; they never feed back into the total when tax is OFF — with ONE deliberate,
 * tested M5 exception: when the run starts with a live `hsa` bucket, the LEDGER's
 * general-drawable split drives the general-depletion guard (a year whose gross need
 * exceeds taxable+pretax+roth is unfundable even though the hsa-inclusive total is
 * positive), under ANY config including OFF. That guard is `hsaLive`-gated, so the
 * EXHAUSTIVE OFF condition below — which has no hsa bucket — is untouched. Under
 * the EXHAUSTIVE OFF condition — buckets collapsed to one pool AND conversion = 0 AND
 * tax off AND RMD-inert (AND no hsa bucket) — the total trajectory is BYTE-IDENTICAL
 * (same seed) to the Trinity/Bengen-validated spine. The golden cases are never perturbed.
 *
 * One shared market draw (contract #2): every bucket grows by the SAME blended return
 * `stepYear` applies to the total — buckets differ only in tax treatment, never in
 * return assumption (this is what structurally forecloses asset-location).
 *
 * MILESTONE STATUS — built incrementally. This is M6a: the MFJ→single survivor filing switch
 * (the wire into `simulate.ts` lives there).
 *   - M1 (done): the seam + the reduce-to-spine lock.
 *   - M2 (done): RMD-forced distribution as a pre-tax→taxable ledger relocation. With tax
 *     OFF an active RMD is TOTAL-NEUTRAL (the two buckets grow identically, contract #2).
 *   - M3 (done): ordinary-income tax on the bracket schedule (MFJ/single) + the deduction
 *     stack (standard + age-65 addition + senior bonus with its MAGI phase-out). The cash
 *     a year needs is grossed up to net `spending` AFTER the tax that withdrawal triggers —
 *     a bounded per-year FIXED POINT (gross = net + tax, tax depends on the pre-tax drawn,
 *     which depends on the gross). This is where an RMD finally BITES: the tax leaves the
 *     portfolio, so terminalReal drops BELOW the spine. CRN-safe (the fixed point reads zero draws).
 *   - M4 (done): the Social-Security provisional-income layer (IRS Pub 915 Worksheet 1) folds
 *     INTO the SAME fixed point. Ordinary income = the pre-tax distributed + the taxable portion
 *     of the SS benefit; provisional income (pre-tax distributed + 50% of the benefit) rises with
 *     the gross-up, so the SS inclusion is solved jointly, not bolted on. The ×1.85 "tax torpedo"
 *     raises the contraction factor. Funding a year from Roth/taxable instead of pre-tax keeps
 *     provisional down — the SS-torpedo half of why sequencing is a control (R9).
 *   - M5 (this): Roth CONVERSION (pretax→roth relocation, taxed as ordinary income, RMD-first
 *     legality) + CAP-GAINS/QD STACKING (a taxable-bucket withdrawal realizes a pro-rata capital
 *     gain, taxed at the preferential 0/15/20% schedule STACKED on ordinary taxable income). Both
 *     fold into the SAME fixed point. The realized gain now ALSO enters provisional income (M4's
 *     deferred boundary) and the senior-bonus MAGI — but is taxed at preferential rates, never the
 *     ordinary base, and is sheltered by any unused deduction (the QDCGT-worksheet effect). The
 *     new ledger is the taxable bucket's BASIS (absolute $, NOT scaled by growth — growth is
 *     unrealized gain). Within-year order: RMD → conversion (reserved out of the draw pool) →
 *     spending. QD is subsumed into realization-on-withdrawal in EVERY year (no sourced dividend-yield
 *     constant): the taxable bucket throws off no annual income, so its yield never reaches a year's
 *     ordinary base, gain block or MAGI reads (§86, the senior bonus, IRMAA, ACA, a priced state's
 *     base) — it is taxed only as pro-rata gain when withdrawn, on a basis that never takes the
 *     reinvested yield. The ONE place a yield-like figure is priced is a §7-CLAMPED working year (the
 *     working-year tax floor, 2026-10-20): the household's ENTERED working-year investment income rides
 *     the floor's I ({@link WorkingYearOutsideIncome}`.investmentIncome`), inside the year's tax base at
 *     the costliest of three readings (excluded / ordinary / preferential), never portfolio-funded —
 *     disclosed to the household by the `working-year-tax` METHODOLOGY_DISCLOSURES row
 *     (`src/ui/assumptionRegistry.ts`). Every other year's omission is UNDISCLOSED (CORRECTED
 *     2026-10-20: this line called the yield "an OUT-but-disclosed, optimistic-direction boundary", and
 *     no row had ever disclosed it): the annual MAGI bump is missing in the year it would land
 *     (optimistic in that year's IRMAA / ACA / §86 reads), while the later withdrawal realizes more gain
 *     than an account whose basis took the reinvested yield — so the omission's net direction is
 *     regime-conditional and unmeasured. Filed with the working-year tax floor build (the all-years
 *     yield model with a tax character). Worst-case contraction k ≈ 0.74 (the cap-gains
 *     15→20% straddle × the SS torpedo); GROSS_UP_MAX_PASSES was 128 at M5 — the state-tax unit
 *     re-derived k_total ≈ 0.78 (the flat state term, no SS torpedo) and raised it to 192 (see below).
 *   - M6a (this): the MFJ→single survivor filing switch. The overlay reads a per-year
 *     {@link HouseholdYear} regime ({@link TaxYearInputs.householdYears}) — supplied by
 *     `simulate.ts`, which owns the per-path death timeline — so filing, the 65+ deduction
 *     count, and the RMD-owner age all become survivor-aware. With NO stream the static
 *     household (both alive every year, filing as configured) is used VERBATIM, so every
 *     M1–M5 fixture is byte-identical. The aggregated pre-tax pool passes to the surviving
 *     spouse on the first death (spousal rollover ⇒ RMD on the survivor's own age, which can
 *     pause if they are below their RMD start age).
 *   - M6b·A: the Joint Life & Last Survivor divisor. `selectRmdDivisor` switches off the Uniform
 *     Lifetime Table when the sole-beneficiary spouse is >10yr younger (gap ≥ 11), using the
 *     now-SOURCED Pub 590-B Table II grid (a LARGER divisor → a SMALLER RMD — flat ULT overstates
 *     forced income for an age-gapped couple and can invert a conversion ranking).
 *   - M6b·B (this): per-person pre-tax splitting. When the caller supplies `initialPretaxByPerson`,
 *     each spouse's IRA forces its OWN RMD on its OWN age (+ its own sole-spouse beneficiary), and
 *     a deceased spouse's IRA rolls to the survivor — tracked in a per-person sub-ledger of
 *     `buckets.pretax` (Σ === it). ABSENT ⇒ the M6a aggregate pool (all pre-tax on the owner), the
 *     byte-identical default; the two paths agree when all pre-tax sits on the owner (equivalence golden).
 *
 * PURE: no entropy/clock/environment (the engine-purity lint covers `src/engine/**`).
 */
import { stepYear, totalValue, type DecumulationResult, type PortfolioState } from '@engine/decumulation'
import { allocateWithdrawal, generalDrawableTotal, totalAcrossBuckets, type AccountBuckets, type GeneralBucketKey } from '@engine/sequencing'
import {
  acaApplicablePercentage,
  acaApplicablePercentageEnhanced,
  irmaa,
  isPricedState,
  STATE_TAX_PROFILES,
  stateRateForYear,
  type AcaApplicablePercentageTable,
  type PricedState,
} from '@engine/constants'
// The RMD divisor + start-age are re-homed to `@engine/rmd` (U16 §S1) — the ONE producer shared
// with the live solve-request anchor deriver, so the render-layer builder never re-derives them.
import { rmdStartAgeForBirthYear, selectRmdDivisor } from '@engine/rmd'
import { ordinaryPlusCapitalGainsTax, seniorBonusAvailableIn, seniorBonusFor, taxableSocialSecurity } from '@engine/taxCore'
import { stateIncomeTax } from '@engine/stateTax'
import {
  acaCliffFillHeadroom,
  bracketEdgeFillHeadroom,
  cliffMagiFor,
  irmaaStepFillHeadroom,
  type CommittedYearIncome,
} from '@engine/magiLandscape'
import { solveAcaFundedGross, fplForHousehold, medicareAnnualCharge, acaMagi, irmaaMagi, irmaaScheduleAsCompared, boundPartBPricingSchedule, hsaQualifiedSpend, type GrossUpSolution, type MagiComponents, type PartBYearPricing } from '@engine/healthOverlay'
import { payrollTaxForYear, type PayrollTaxYear } from '@engine/payrollTax'
import { NEVER_DEPLETED, isRetirementState, type DepletionYear, type DrawdownPolicy, type FilingStatus, type RetirementState } from '@shared/model'

// Filing status is shared model vocabulary (the persisted scenario speaks it too). Re-exported
// here so existing `@engine/taxOverlay` importers keep their path.
export type { FilingStatus }

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
   *  is deferred to M6b's schemaVersion-2 shape). */
  readonly owner: OverlayPerson
  readonly spouse?: OverlayPerson
  /** The household's retirement state of residence (the state-tax unit). ABSENT/undefined ⇒ the
   *  disclosed-out posture: the state layer is a STRUCTURAL `+ 0` (byte-identical to the spine).
   *  PRESENT + in `PRICED_STATES` ⇒ that state's income tax folds into the gross-up fixed point +
   *  `totalTaxPaidReal`. A recognised-but-unbuilt roster code or `'elsewhere'` also takes the `+ 0`
   *  branch (never the module — a computed-then-zeroed value would perturb the float lineage). */
  readonly retirementState?: RetirementState
}

/**
 * One simulated year's household regime (M6a) — the survivor-aware override `simulate.ts`
 * supplies per-year (it owns the per-path death timeline). `living` is the people alive that
 * year, in PEOPLE-ORDER, so `living[0]` is the aggregated pre-tax pool's holder: the original
 * owner while alive, else the surviving spouse who inherited it (spousal rollover ⇒ the RMD
 * keys off the survivor's OWN age + RMD-start band, which can pause RMDs if they are younger).
 *
 * Filing is derived: MFJ iff ≥2 are alive, else single — the survivor files single the year
 * AFTER the first death (no QSS grace, §Strand 5: the empty-nest retired couple). The 65+
 * deduction count is the count of living filers ≥ 65 that year. `living[1]` (when present) is
 * the sole-spouse beneficiary whose age drives the JLLS divisor (M6b·A — a >10yr-younger
 * sole spouse switches the owner's RMD off ULT onto the Joint Life & Last Survivor table).
 *
 * Absent (no `householdYears` stream) ⇒ the STATIC household: both people present every year,
 * filing as configured — the verbatim M1–M5 path, so every existing fixture is byte-identical.
 */
export interface HouseholdYear {
  readonly living: readonly OverlayPerson[]
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
 *  the outcome distribution reads), plus the final per-bucket balances + the taxable
 *  bucket's horizon-end cost basis (auxiliary ledger; the latter makes `finalBuckets.taxable`
 *  interpretable as value-vs-embedded-gain). NOTE (M6): `finalTaxableBasis`/`finalBuckets`
 *  are this RUN's horizon-end figures — and `simulate` calls the overlay with each path's
 *  OWN horizon (`min(sampled last death, maxHorizonYears)`), so per-path they ARE the
 *  sampled-death-year snapshot the P4 §1014/IRD leave-more objective needs; `simulate`
 *  collects them onto `Distribution.taxAware` (the solver output contract). */
export interface TaxAwareResult extends DecumulationResult {
  readonly finalBuckets: AccountBuckets
  /** The taxable bucket's cost basis at the end of the horizon (real $, finite per DND/009;
   *  0 when the portfolio depleted). Unscaled by market growth — appreciation is unrealized gain. */
  readonly finalTaxableBasis: number
  /** Σ of every year's federal income tax actually paid (real $; U3 · M6 — the solver output
   *  contract's lifetime-tax surface): the gross-up's ordinary + preferential cap-gains tax,
   *  read off the converged year as `grossWithdrawal − fundingNet − netAcaPremium` (the dollars
   *  that left BEYOND spending, Medicare cost, HSA-paid spend, and the ACA premium — each of
   *  those is its own surface). 0 with tax off. The FOURTH parallel ACCOUNTING surface: it
   *  never perturbs the reduce-to-spine total (the tax already left via the grossed-up
   *  withdrawal) and accrues AFTER the depletion check like its three siblings. PURE
   *  ACCOUNTING, never a solver search variable (insight 013 stays out of every residual). */
  readonly totalTaxPaidReal: number
  /** Σ of every year's pre-65 ACA net premium actually paid (real $; U3 · M3 Slice 4). 0 when the
   *  healthcare overlay is off / inert (healthcare disabled, no enrolled premium, or the age gate
   *  zeroed it). It NEVER perturbs the reduce-to-spine total: `terminalReal` already reflects each
   *  premium via the grossed-up withdrawal that funds it — this is the parallel ACCOUNTING surface. */
  readonly totalNetPremiumReal: number
  /** Σ of every year's post-65 Medicare premium cost actually funded (real $; U3 · M4): the base
   *  Part B premium + the IRMAA Part B/D surcharge, per Medicare-enrolled (≥65) member. 0 when the
   *  healthcare overlay is off / inert or nobody is ≥65. Like `totalNetPremiumReal` it is the parallel
   *  ACCOUNTING surface — `terminalReal` already reflects each cost via the grossed-up withdrawal that
   *  funds it, so this never perturbs the reduce-to-spine total. (The income-sensitive surcharge is the
   *  strategy-relevant slice; the base premium is the income-invariant remainder.) */
  readonly totalMedicareCostReal: number
  /** Σ of every year's QUALIFIED, MAGI-invisible HSA spend actually paid out of the hsa bucket
   *  (real $; U3 · M5). 0 when the hsa bucket is absent/empty or tax is off. The parallel ACCOUNTING
   *  surface, like its two siblings above: the spend already flowed through the year's outflow
   *  (`grossWithdrawal + hsaSpend` → stepYear) and the hsa ledger, so this never perturbs the
   *  reduce-to-spine total; accrued AFTER the depletion check (a year the portfolio could not fund
   *  accrues nothing). */
  readonly totalQualifiedHsaSpendReal: number
}

/**
 * The optional per-year tax-input streams + the taxable cost basis, grouped into ONE object so
 * the two same-typed `number[]` streams (`ssBenefits`, `conversions`) can never be silently
 * transposed at a call site (a positional swap would compile clean and tax conversions as Social
 * Security — calm-but-wrong). The financial streams (`ssBenefits`/`conversions`/`initialTaxableBasis`)
 * are read ONLY when tax is ON; with tax OFF the overlay is a pure pass-through (reduce-to-spine),
 * so an absent object is the EXHAUSTIVE-OFF anchor.
 *
 * The streams are indexed by ABSOLUTE year and aligned to `netWithdrawals`; a missing tail entry
 * defaults to 0 (no benefit / no conversion that year — `?? 0`), NEVER ending the path (the
 * returns/withdrawals arrays govern the horizon). `simulate.ts` (M6a) supplies these alongside
 * `netWithdrawals` as independent per-year inputs.
 */
export interface TaxYearInputs {
  /** Per-year real Social-Security benefit (M4). Drives provisional-income SS taxation. */
  readonly ssBenefits?: readonly number[]
  /** Per-year requested Roth conversion (M5): pretax→roth relocation taxed as ordinary income.
   *  Clamped per year to `[0, priorYearEndPretax − RMD]` (RMD-first legality; the RMD is
   *  non-convertible). The conversion's principal is NOT spent — only its tax joins the gross-up. */
  readonly conversions?: readonly number[]
  /** The taxable bucket's cost basis at year 0 (real $). REQUIRED when tax is ON and the taxable
   *  bucket is non-empty — there is NO safe default (0 over-taxes every realization; the full value
   *  silently makes cap-gains a no-op), so an absent basis FAILS LOUD (burned/062). */
  readonly initialTaxableBasis?: number
  /** Per-year household regime (M6a): the survivor-aware filing / 65+ count / RMD-owner override
   *  {@link HouseholdYear}. Read whenever tax OR RMD is on (the survivor RMD-owner switch matters
   *  even with tax off); ABSENT ⇒ the static household every year (the verbatim M1–M5 path). It
   *  never threatens reduce-to-spine: under the EXHAUSTIVE OFF condition the gross-up is inert
   *  (gross = net) and the RMD is 0, so the regime changes nothing regardless of its contents. */
  readonly householdYears?: readonly HouseholdYear[]
  /** Per-year `bracket-fill` ceiling OVERRIDE (M6a · U11): the max DISCRETIONARY pre-tax draw
   *  that year. Read ONLY when the policy is `bracket-fill`. An EXPLICIT entry wins (the
   *  direct-caller / P4-solver injection seam — and the explicit `+Infinity` recovers
   *  pre-tax-first exactly); a MISSING entry is DERIVED in the year loop from the committed
   *  gross-independent income via `magiLandscape` (min of the bracket-edge / ACA-cliff /
   *  IRMAA-step rail headrooms, each active only where the engine actually prices it) — the
   *  old missing ⇒ +Infinity ⇒ silent pre-tax-first degrade is retired. */
  readonly bracketFillCeilings?: readonly number[]
  /** Per-person INITIAL pre-tax split (M6b·B), aligned by index to the household's canonical
   *  people (owner = 0, spouse = 1). Its sum MUST equal `initialBuckets.pretax` (validated).
   *  PRESENT ⇒ each spouse's IRA computes its OWN RMD on its OWN age (+ its own sole-spouse
   *  beneficiary for the Joint-Life divisor); a deceased spouse's IRA rolls to the survivor.
   *  ABSENT ⇒ the M6a AGGREGATE pool (all pre-tax attributed to the owner) — the verbatim
   *  M1–M6a path, byte-identical. Read only when the overlay is active (tax or RMD on); with
   *  the EXHAUSTIVE OFF condition the aggregate path runs and reduce-to-spine is untouched. */
  readonly initialPretaxByPerson?: readonly number[]
  // --- U3 · M3 Slice 4: the pre-65 ACA premium-funding streams. ABSENT / `healthcareEnabled` false
  //     ⇒ the healthcare-blind path (byte-identical to the M6b overlay). ACA is structurally coupled
  //     to tax (its MAGI comes from the gross-up's components), so `healthcareEnabled` with tax OFF
  //     fails loud (the overlay backstop, mirroring `simulate`'s validateParams). ---
  /** Master switch for the pre-65 ACA overlay. Per year it prices ONLY when ALSO a finite positive
   *  `enrolledPremium[t]` is supplied AND ≥1 living member is pre-65 (the age gate); otherwise the
   *  year is the tax-only gross-up (inert). REQUIRES `config.taxEnabled`. */
  readonly healthcareEnabled?: boolean
  /** Selects the ARPA/IRA ENHANCED applicable-% table (no 400%-FPL cliff; flat 8.5% open top band)
   *  over the statutory cliff regime. ABSENT/false ⇒ the statutory cliff regime. */
  readonly enhancedSubsidies?: boolean
  /** Per-year Second-Lowest-Cost Silver Plan benchmark premium (real $), the §36B PTC basis, indexed
   *  by ABSOLUTE year. In a priced year a MISSING/non-finite entry fails LOUD through the ACA solver's
   *  R19 backstop (burned/062) — `slcsp[t] = 0` is the EXPLICIT no-subsidy value, absent is an error. */
  readonly slcsp?: readonly number[]
  /** Per-year enrolled-plan premium the household pays BEFORE any PTC (real $), indexed by ABSOLUTE
   *  year. A finite positive entry in a pre-65 year triggers the outer ACA fixed point. */
  readonly enrolledPremium?: readonly number[]
  /** The 2 PRE-SIM IRMAA-MAGI values `[MAGI[−2], MAGI[−1]]` (real $), seeding the post-65 IRMAA
   *  feed-forward for sim years 0..lookback−1 (M4). Year t's surcharge keys off IRMAA-MAGI[t−2]; for
   *  t < lookback the lagged MAGI predates the sim, so it comes from here. REQUIRED (fail-loud) iff a
   *  member is Medicare-enrolled (≥65) in such a year — a default 0 would zero the surcharge → understate
   *  cost → overstate survival (burned/062). Read only when healthcare is on (⇒ tax on); inert otherwise. */
  readonly irmaaMagiSeed?: readonly number[]
  // --- C3 §3b: the per-person Medicare onset + the working-year IRMAA-MAGI override + the
  //     bridge-year mask. ALL THREE absent ⇒ the byte-identical pre-C3 overlay (the onset
  //     default IS today's biological predicate; the override write is `+ 0`; the mask arms
  //     are throw-or-nothing). ---
  /** Per-person Medicare-enrollment ONSET (sim-year terms), aligned to the household's CANONICAL
   *  people (owner = 0, spouse = 1 — the M6b alignment): person i is Medicare-enrolled from
   *  sim-year `medicareOnsetSimYear[i]` (≤ 0 = enrolled before the sim). ABSENT ⇒ biological 65
   *  (`ageInSimYear ≥ 65`) — provably today's predicate verbatim. ONLY the IRMAA gate + pricing
   *  count read it (`resolveYear`'s `medicareEnrolledCount`); `count65` stays BIOLOGICAL for the
   *  §63(f)/senior-bonus deduction stack and the ACA `pre65` denominator (a 65+ worker keeps the
   *  age-65 deduction and is not a marketplace member). The enrolled count intersects the LIVING
   *  set (a dead spouse is never billed) — a 4th consumer of OverlayPerson reference identity. */
  readonly medicareOnsetSimYear?: readonly number[]
  /** Per-year ADDITIVE working-year IRMAA-MAGI override (real $, ABSOLUTE-year-indexed): the
   *  recording sites write `irmaaMagiHistory[t] = override[t] + irmaaMagi(components)` — ADDITIVE,
   *  never replacement (a working-year conversion / claimed-while-working SS / a 73+ worker's RMD
   *  lands in the COMPUTED component; replacement or max() would understate; additive errs only
   *  conservative/later, and equals replacement in the common clamped working year whose computed
   *  MAGI is exactly 0). Covers the bridge years a lagged read can land on (the seed covers only
   *  `t < lookback` — structurally the ONLY window it can reach). */
  readonly irmaaMagiOverride?: readonly number[]
  /** Per-person Medicare-EXTRAS monthly premium (the ask-for-Medicare-extras unit — real $,
   *  aligned to the CANONICAL people: owner = 0, spouse = 1). Charged as a per-person
   *  HETEROGENEOUS Σ — each Medicare-priced year adds `Σ over medicareEnrolledIndices of
   *  extras[idx] × 12`, so each person's own premium ends at THEIR death and the surviving
   *  high-premium spouse keeps their FULL premium (count×avg is the forbidden shape — it
   *  reproduces the optimistic survivor under-charge). Gated by the SAME predicate as base Part B
   *  (healthcare on + ≥1 living member enrolled); REAL-FLAT (no sourced trend exists; disclosed);
   *  EXCLUDED from the HSA qualified-spend `medicareCost` arg (Pub 969 — Medigap is not a qualified
   *  premium) while still joining the funding need. ABSENT / all-zero ⇒ byte-identical (Σ 0). */
  readonly medicareExtrasMonthly?: readonly number[]
  /** Per-year bridge-year mask (`bridge[t] = ∃i: t < retireOffset_i && t < deathOffset_i &&
   *  earnedIncomeReal_i > 0` — the bridge's own dead-earner predicate shape), assembled PER-PATH
   *  by `simulate` beside `householdYears` (zero-draw, CRN-safe). The overlay's two C3 fail-loud
   *  arms ride it: (1) the masked LAGGED-READ throw — `lag ≥ 0 && mask[lag]` with no finite
   *  override coverage of `lag` ⇒ throw (the true mirror of the `irmaaMagiSeed` throw: the lagged
   *  read otherwise returns a FINITE ≈$0 clamped-working-year MAGI → lowest tier → understated
   *  surcharge, SILENTLY); (2) the ACA price-gate arm — a PRICED ACA year at a masked `t` is
   *  wage-blind (MagiComponents has no wage component → phantom near-max PTC in the subsidy band,
   *  the OPTIMISTIC direction) ⇒ throw. HONEST LIMITATION (recorded, §3b): both arms are
   *  necessarily MASK-CONDITIONAL for a direct caller — an omitted mask is byte-identity-
   *  indistinguishable from a no-bridge run (`netWithdrawals` arrives pre-collapsed, so "bridge
   *  year" is structurally inexpressible without it); `healthcareStreams.ts` + this mask are what
   *  any bridge-carrying caller supplies. Absent ⇒ byte-identical (throw-or-nothing; burned/062). */
  readonly bridgeYearMask?: readonly boolean[]
  // --- U3 · M5: the HSA spend-side streams. ABSENT / `hsa` 0 ⇒ the 3-bucket path byte-identical. ---
  /** Per-year out-of-pocket QUALIFIED medical cost (real $), indexed by ABSOLUTE year. CAP-ONLY —
   *  PINNED: it sizes the HSA qualified-spend cap and NEVER joins the year's funding need (the
   *  household retirement-spend figure is DEFINED as already including OOP medical — the containment
   *  premise; premiums are the only health cost priced on top). A missing tail entry ⇒ 0 (no OOP that
   *  year). Read only when tax is ON and the run has a live hsa bucket; inert otherwise — at `hsa = 0`
   *  an OOP-bearing year's gross need is UNCHANGED (the falsifiable cap-only contract). */
  readonly oopMedical?: readonly number[]
  /** WHICH canonical person owns the household HSA (0 = owner, 1 = spouse — the `people` index,
   *  M6b alignment). The 65+ Medicare-premium spend privilege keys to the OWNER's age, never the
   *  spouse's (Pub 969 via `hsaFourthBucketRules`), so the identity moves the answer: REQUIRED
   *  (fail-loud, burned/062 — a person-0 default is an in-range default) whenever tax is ON and the
   *  run can ever hold HSA dollars (initial balance OR a positive hsa contribution inflow — the C2
   *  `hsaLive` property). On the owner's death the HSA rolls to the surviving spouse (the
   *  spouse-beneficiary assumption) and the privilege re-keys to the survivor's age IMMEDIATELY
   *  (ownership transfers at death — unlike IRMAA's +2yr billing lag). v1 models ONE household HSA;
   *  the contribution side (C2) routes each person's hsa stream into this one household bucket. */
  readonly hsaOwnerIndex?: number
  // --- C2: the accumulation contribution inflows. ABSENT ⇒ the byte-identical decumulation-only
  //     overlay (every read is `?? 0` and every fold is `x + 0`, exact IEEE no-ops). ---
  /** Per-year, PRE-COLLAPSED per-bucket contribution inflows (C2 §2c), indexed by ABSOLUTE year,
   *  AUXILIARY (a missing/short/holed entry ⇒ a $0-inflow year, never the end of data). The
   *  CALLER assembles these PER-PATH (§7's B×C consequence): person-keyed streams → the
   *  alive∧working filter (`t < deathOffset_i && t < retire_i`) → the HSA owner-enrollment
   *  zeroing → person→bucket aggregation — assembling death-truncation here per-path is what
   *  stops a dead spouse's phantom contributions resurrecting at the overlay layer. Each year's
   *  amounts are credited END-OF-YEAR at face value AFTER the bucket-scale (stepYear owns the
   *  crediting convention, contract #3); they never enter the draw pool, the withdrawal
   *  allocation, the RMD forced-excess base, or the basis pro-rata denominator (an end-of-year
   *  arrival is not drawable, convertible, or RMD-base in its arrival year). */
  readonly contributions?: readonly YearContribution[]
  // --- R40: the ongoing other-income TAXABLE feeds (KTD-9's structural split). ABSENT ⇒ the
  //     byte-identical no-income overlay (every read is `?? 0` and every fold is `x + 0`). ---
  /** Per-year ongoing other-income taxable that enters the GROSS-UP (seam 2; ABSOLUTE-year-indexed,
   *  AUXILIARY — a missing/short entry ⇒ a $0 year). Added to `nonSSordinary` at the single producer
   *  (`solveGrossWithdrawal`), so SS-§86 / ACA-MAGI / IRMAA-MAGI all rise by it ONCE (KTD-1); it ALSO
   *  nets the withdrawal upstream (seam 1, in `simulate`). The UNCLAMPED-year taxable: the income funds
   *  the spend, the portfolio funds its tax. (The clamped working-year taxable rides the IRMAA-only
   *  feed below, never this one — KTD-9.) */
  readonly ongoingTaxableGrossUp?: readonly number[]
  /** Per-year ongoing other-income taxable that lifts IRMAA-MAGI ONLY (KTD-9; ABSOLUTE-year-indexed,
   *  AUXILIARY). The §7-CLAMPED working-year taxable: the wages fund its tax OUTSIDE the portfolio, so
   *  it must NOT mint a phantom gross-up withdrawal — but it STILL belongs in IRMAA-MAGI, where the
   *  wages-only override does not reach (the engine owns each modeled stream's IRMAA-MAGI in ALL years,
   *  clamped and unclamped). Recorded ADDITIVELY at the IRMAA-MAGI history site, counted exactly once;
   *  it never mints a gross-up WITHDRAWAL and never reaches ACA-MAGI (a clamped working year prices no
   *  ACA). It DOES sit in the year's tax base since the working-year tax floor (2026-10-20, KTD2): the
   *  same dollars ride {@link workingYearOutsideIncome}'s `ordinaryBase` — the ordinary base, the §86
   *  provisional, the senior-bonus MAGI, the gain-stacking base and NC's base — as income whose own tax
   *  the household pays outside the portfolio (only what the PORTFOLIO's income adds on top is funded). */
  readonly ongoingTaxableIrmaaOnly?: readonly number[]
  /** The working-year tax floor (2026-10-20 — `docs/plans/features/working-year-tax-floor-build-spec.md`):
   *  per-year OUTSIDE income of each §7-CLAMPED working year, ABSOLUTE-year-indexed, a HOLE in every
   *  unclamped year. A present entry prices that year's tax as what the portfolio's own income adds on
   *  top of the household's pay and investment income, plus SS's own tax ({@link prepareWorkingYearFloor});
   *  a hole is the literal pre-floor year. `simulate` builds it from the SAME `cashTermsForYear` call
   *  that decides the clamp, whenever the accumulation construct rides with tax on. THE CROSS-CHECK
   *  (R8): with tax on, the construct marker (`contributions` present) AND `bridgeYearMask` present,
   *  every masked year must carry an entry and every entry must sit on a masked year — under the
   *  construct the mask IS the clamp (`∃` a living worker), so a mismatch is a wiring fault and throws
   *  (a silently dropped floor re-opens the wage-blind optimistic year). A present entry is finite ≥ 0
   *  in both fields; an entry with no construct marker throws (a floor needs a clamp to describe). */
  readonly workingYearOutsideIncome?: readonly (WorkingYearOutsideIncome | undefined)[]
  /** The working-year pay check (2026-10-21 — `docs/plans/features/working-year-pay-check-build-spec.md`,
   *  KTD6): per-year {@link WorkingYearCheckTerms} of each §7-CLAMPED year, ABSOLUTE-year-indexed, a HOLE
   *  in every unclamped year. `simulate` builds it from the SAME `cashTermsForYear` call as the floor's
   *  stream, and supplies it only when the household answered W. A present entry runs the check: the
   *  year's shortfall ({@link workingYearCashLines}) is added to `fundingNet` and drawn like any other
   *  need. ABSENT ⇒ no year is checked (the pre-check overlay, byte-identical). THE CROSS-CHECK (KTD16,
   *  the floor's R8 mirror): a present entry is finite ≥ 0 in every field; an entry needs tax on and the
   *  construct marker (`contributions`); and a stream that is supplied must carry an entry in EXACTLY the
   *  years the floor's stream does (the floor's own check ties those to the bridge mask) — a check with no
   *  floor would have no tax to read, and a floored year with no check silently drops its shortfall (the
   *  rosy direction). */
  readonly workingYearCheck?: readonly (WorkingYearCheckTerms | undefined)[]
  /** PROBE-ONLY — the pay check's observation hook ({@link WorkingYearProbe}); never set by product code. */
  readonly _workingYearProbe?: WorkingYearProbe
  // --- U6/U7 band fan: an OPTIONAL output sink (not an input). ABSENT ⇒ no observation, the
  //     pre-fan path verbatim. ---
  /** An optional sink the caller passes to OBSERVE the per-year portfolio total: each iterated
   *  year pushes `totalValue(state)` AFTER that year's `stepYear` (index t = the value at the END
   *  of sim-year t; the depletion year pushes exactly $0 — the ruin floor records itself). A PURE
   *  OBSERVATION — writing to an injected array changes no computation, so a run WITH the sink is
   *  byte-identical to one without it (the reduce-to-spine band-fan guard). Years after depletion
   *  are not iterated (the loop breaks); the CALLER fills those alive-but-broke years as $0 from
   *  the path's own horizon (the overlay does not know the couple's death year). Mutable by
   *  contract (the overlay pushes into it), unlike the readonly input streams above. */
  balancesOut?: number[]
  // --- P3·U11 healthcare readout: a second OPTIONAL output sink (the balancesOut twin). ---
  /** An optional sink observing the per-year HEALTHCARE quantities the overlay already computes
   *  and previously discarded. One entry per FUNDED year, pushed at the same after-the-depletion-
   *  check site the Σ accruals use (a year the portfolio could not fund records nothing — the
   *  sibling rule), so each array's length ≤ the funded-year count and the arrays stay index-
   *  aligned with each other. A PURE OBSERVATION — byte-identical with or without the sink. */
  healthOut?: HealthYearSink
}

/** The per-year healthcare observation arrays (P3·U11 — parallel, index-aligned, one entry per
 *  funded year). The overlay PUSHES; the caller aggregates (medians / fractions across paths). */
export interface HealthYearSink {
  /** Net ACA premium paid that year (enrolled − PTC, ≥ 0; 0 in a non-priced year). */
  readonly acaNetPremium: number[]
  /** Base Medicare cost that year (base Part B × enrolled count × 12 — income-invariant). */
  readonly medicareBase: number[]
  /** IRMAA surcharge that year (the income-sensitive step on top of the base, per person
   *  × enrolled count × 12) — SPLIT from the base so the danger-years story is tellable. */
  readonly irmaaSurcharge: number[]
  /** Medicare-EXTRAS cost that year (Σ over living∩enrolled of each person's own premium × 12)
   *  — its OWN line, SPLIT from `medicareBase` so the base-Part-B readout never silently
   *  inflates (and the base − surcharge subtraction stays exact). */
  readonly medicareExtras: number[]
  /** The Medicare-ENROLLED count the base line was billed on that year (`resolveYear`'s
   *  living ∩ enrolled, per-person onset-aware) — index-aligned with `medicareBase`, so the
   *  readout can say WHO the base figure covers (council 2026-09-13: the health sheet's
   *  enrollment frame reads this, never a UI-side biological age-65 proxy). 0 when nobody is
   *  enrolled (a pre-65 year, or a year the regime is absent). */
  readonly medicareEnrolled: number[]
  /** The year's converged ACA-MAGI (full-SS calculator) — the readout's empirical anchor. In a
   *  §7-CLAMPED working year (the working-year tax floor) it is a MIXED figure: the portfolio's own
   *  income, plus a taxable SS computed on a provisional that also carries the household's pay and
   *  investment income (which the components themselves exclude). Unread there: the readout is
   *  spine-only, and the spine has no clamped year. */
  readonly acaMagi: number[]
  /** The year's IRMAA-MAGI (taxable-SS calculator) — the distinct second anchor (mixed in a clamped
   *  working year, exactly as `acaMagi` above). */
  readonly irmaaMagi: number[]
  /** The year's FULL Social Security benefit — the converged `ssBenefitFull` component both MAGIs
   *  read (observed, never consumed): the health sheet prices the benefit taxation a converted
   *  dollar triggers off it, since the two MAGIs' medians cannot be subtracted back into it. */
  readonly ssBenefit: number[]
  /** The year's ACA cliff state: 1 = priced and landed strictly over the 400%-FPL cliff
   *  (PTC 0); 0 = priced, under (or at) the cliff; -1 = not an ACA-priced year. */
  readonly acaCliffState: number[]
}

/** One year's per-person, per-bucket contribution inflow (C2). All real $, finite ≥ 0
 *  (NaN-first-guarded at BOTH validateParams and the overlay backstop — insights 008/010).
 *
 *  EVERY channel is PER-PERSON (aligned to the household's canonical people: owner = 0,
 *  spouse = 1) — deliberately, not just pretax: per-person attribution is what lets the
 *  overlay DEATH-VET every credit (a nonzero slot on a DEAD person fails loud on all four
 *  channels). The C2 boundary review's wave-2 panel proved the alternative untenable both
 *  ways: an unattributable aggregate scalar can NEVER be death-vetted (the phantom dead-
 *  spouse credit lands silently — optimistic), while a blunt "reject any aggregate when
 *  someone is dead" throws on the LEGITIMATE surviving-worker contribution simulate itself
 *  emits. Attribution dissolves the dilemma. The overlay sums each channel internally. */
export interface YearContribution {
  /** → the taxable bucket; each dollar enters at FULL basis (after-tax: basis += Σ, UNSCALED). */
  readonly taxableByPerson: readonly number[]
  /** → the pretax bucket, incl. the employer match (match → pretax even on a Roth 401(k)
   *  deferral — the confirmed default rule). When the per-person pre-tax ledger is active each
   *  slot credits its OWN person's ledger (an aggregate-only credit would desync next year's
   *  per-person RMD — the no-parallel-ledger-drift contract). */
  readonly pretaxByPerson: readonly number[]
  /** → the roth bucket. */
  readonly rothByPerson: readonly number[]
  /** → the hsa bucket (already owner-enrollment-zeroed by the caller's assembly — C2 §3b). */
  readonly hsaByPerson: readonly number[]
}

const EMPTY_BUCKETS: AccountBuckets = { taxable: 0, pretax: 0, roth: 0, hsa: 0 }

// The statutory age threshold for the §63(f) age-65 additional standard deduction AND the
// OBBBA senior bonus. It is structurally embedded in the constant identifiers themselves
// (`age65Addition*`, `seniorBonus.perPerson65Plus`), not a free-floating sourced figure, so
// it is named here rather than added to the curated constants table.
const AGE_65_THRESHOLD = 65

// Gross-up fixed-point controls. The per-year map gross ↦ net + tax(gross) is a monotone,
// continuous, piecewise-linear self-map that starts below its UNIQUE fixed point and converges
// from below at a linear rate set by the worst-case effective marginal rate k = d(tax)/d(gross)
// of a marginal PRE-TAX gross dollar. That dollar lifts ordinary taxable income by (1 +
// ssInclusionSlope) — the Social-Security "tax torpedo" (M4): an extra ordinary dollar pulls up
// to 0.85 of an SS dollar into taxation (income response ≤ ×1.85) — and, with the realized
// capital gain stacked on TOP of ordinary taxable income (M5), pushing ordinary income up also
// shoves that fixed gain block ACROSS a cap-gains rate breakpoint, owing the rate JUMP on the
// shifted dollars.
//
//   k = (m_ord + j) × (1 + ssInclusionSlope) + m_state × (1 + stateSSInclusionSlope)
//
// where m_ord ≤ 0.37 is the ordinary marginal rate and j is the cap-gains rate jump at a
// STRADDLED breakpoint (0.15 at the 0→15% point, 0.05 at the 15→20% point; 0 if the gain block
// straddles neither). M4's worst case was k = 0.37 × 1.85 ≈ 0.685 (top 37% bracket, torpedo
// uncapped). M5's worst REACHABLE corner is HIGHER: ordinary taxable income parked in the 35%
// bracket with a realized-gain block straddling the MFJ 15→20% cap-gains breakpoint while the
// torpedo is still uncapped → k_fed = (0.35 + 0.05) × 1.85 ≈ 0.74. Witness: nonSS pre-tax draw +
// conversion ≈ $150k, a huge SS benefit (~$0.8M, keeping taxable-SS uncapped: 0.85·SS still
// above the inclusion) so ordinary income ≈ $645k → ordinary taxable just under the 15→20%
// breakpoint with the gain on top, senior bonus long gone, marginal dollar pre-tax-sourced.
//
// THE STATE TERM (the state-tax unit — a correctness obligation, insights 006/007). A marginal
// pre-tax gross dollar now ALSO owes the flat state rate m_state on the state's ordinary base. The
// roster's income-tax states (NC ≈0.04, PA ≈0.03) EXEMPT Social Security, so `stateSSInclusionSlope
// = 0` — the state term rides WITHOUT the ×1.85 torpedo — and their FLAT rate has no bracket jump,
// so the term is a constant m_state ADDED UNIFORMLY across every federal regime (it never shifts
// WHICH corner is worst). k_state = m_state × (1 + 0) ≈ 0.04 (NC, the higher of the two). So at the
// federal-worst corner k_total = k_fed + k_state ≈ 0.74 + 0.04 ≈ 0.78 < 1 — still a contraction, and
// the sup is still the SAME self-limiting cap-gains-straddle corner (the state term lifts every
// regime's k equally). FUTURE LANDMINE (S2.8, the standing constraint): a GRADUATED state (SC/GA/DE)
// would add a state marginal rate that VARIES across a STATE bracket edge — a NEW straddle channel
// that could open a k ≥ 1 corner (the exact insight-007 disjointness risk). Re-derive k the instant a
// graduated state joins the roster; a FLAT state can only lift k by a constant, never re-order corners.
//
// The other corners are all LOWER and mutually DISJOINT by income region: the 37% bracket sits
// ABOVE both cap-gains breakpoints (j = 0 → k = 0.685); the 0→15% straddle needs the 12% bracket
// (k ≈ 0.50); the senior-bonus phase-out band sits at ≤ 24% with the torpedo often capped
// (k ≲ 0.61 — re-derived 2026-09-25 for the PER-PERSON phase-out, Schedule 1-A: a both-65+ couple's
// deduction falls 0.12 per MAGI dollar, not 0.06, so the band's worst reachable corner — the 0→15 %
// straddle in the 12 % bracket, torpedo uncapped — is (0.12 + 0.15) × 1.85 × 1.12 + 0.04 ≈ 0.60. The
// band closes at $250k of MAGI; it reaches the 24 % bracket only in its last ~$2.8k (AGI ≈ $247.2k–
// $250k at 2026 figures), where even an uncapped torpedo gives 0.24 × 1.85 × 1.12 + 0.04 ≈ 0.54.
// Both under 0.78.) So k_sup ≈ 0.74. IMPORTANT: the contraction is NOT automatic — the UNCONSTRAINED
// sum of marginal channels (ordinary + torpedo + senior-bonus + cap-gains straddle) exceeds 1, so
// slope < 1 rests entirely on these regimes being unreachable simultaneously. A future constants
// change (a breakpoint shift) could open a k ≥ 1 corner and silently break convergence — re-derive
// k if the breakpoints move (insight 006: a probe that "confirms" the old k is usually sampling
// the wrong regime; the cap-gains corner is invisible to a pre-tax-only / large-net probe).
// THE SUNSET (council 2026-07-09): the senior-bonus phase-out channel exists ONLY in calendar
// years [2025..2028] — in a post-sunset year that corner vanishes entirely, so per-year k can
// only SHRINK below the bound above. The k_total ≈ 0.78 witness never used the bonus channel
// (senior bonus long gone at ~$645k ordinary), so the bound and 192 passes are year-invariant.
//
// THE WORKING-YEAR FLOOR (2026-10-20 — KTD3 / KTD11 of `docs/plans/features/working-year-tax-floor-
// build-spec.md`; the derivation the council's dissent named as a flip condition, "the preferential k
// exceeds about 0.78"). In a §7-clamped year the map is gross ↦ net + max over the readings r of
// [T(base_r + P(gross)) − T(base_r)] + T(0, ss), and each reading is the SAME monotone map with a
// YEAR-CONSTANT base:
//   - EXCLUDED (B) and ORDINARY (B + I): the base sits in the ordinary argument exactly where a year-
//     constant conversion or `ongoingTaxable` sits, so the corners above already range over it;
//   - PREFERENTIAL (ordinary B, gain I): I is a year-constant gain block in the gain argument and in
//     §86's other income, stacked UNDER the draw's own realized gain — the corner algebra never asked
//     where the gain block comes from, so k = (m_ord + j) × (1 + ssInclusionSlope) + m_state is
//     unchanged: the 0→15 % straddle needs ordinary taxable income under the 0 % edge (Rev. Proc.
//     2025-32 §4.03: $98,900 MFJ / $49,450 single), inside the 12 % bracket ($100,800 / $50,400) —
//     k ≲ 0.60 even with the per-person senior-bonus phase-out; the 15→20 % straddle ($613,700 MFJ) sits
//     in the 35 % bracket — k ≲ 0.78, the same sup.
// Subtracting the year-constant T(base_r) (or T(0, ss)) changes no slope; a max of monotone k-Lipschitz
// maps is monotone and k-Lipschitz; and the EXACTNESS branch (`baseTax === zeroTax`) is chosen once per
// year, so each pass evaluates one fixed formula. The state half is ONE increment over a constant base
// (NC takes B + I once, at its flat rate), added beside the federal max, so it adds the same m_state ≈
// 0.04 to the sum's slope whichever reading wins. So k_sup ≈ 0.78 stands, the dissent's flip condition
// does not fire, and 192 passes stand. Measured (the 2026-10-20 review's faithful-copy probe): worst 67
// passes over a 24k-point B × I × SS × NC × filing grid, no non-convergence. FLOAT: at an absurd base the T(base + P) − T(base) cancellation quantizes the
// increment at about ulp(T(base)) — roughly $1e-4 at B = $1e12, above GROSS_UP_EPSILON — but the map
// stays monotone on that staircase, so the iteration still lands on an exact fixed point (|Δ| = 0):
// measured converging to B = $2e12, I = $1e12, a sub-cent quantum, never a throw.
//
// 192 passes SUFFICES at k_total ≈ 0.78 (geometric: n ≈ ln(tax/ε)/ln(1/k), ε = 10^-7). Two corners,
// mirroring the federal derivation: (1) the self-limiting cap-gains-straddle corner k ≈ 0.78 pins a
// bounded ~$0.7M tax → tax/ε = 7·10^12 → ln(7·10^12)/ln(1/0.78) ≈ 119 passes; (2) the UNBOUNDED-tax
// top-37%-bracket tail — where j = 0 (the 37% bracket sits ABOVE both cap-gains breakpoints) so
// k = 0.685 + m_state ≈ 0.725 — bounded CONSERVATIVELY with the sup k = 0.78 at a ~$10^13 tax →
// tax/ε = 10^20 → ln(10^20)/ln(1/0.78) ≈ 185. So 192 (= the prior 128 × 1.5) clears BOTH corners with
// margin — the same headroom 128 held
// over the federal-only 98/122. The early-exit on convergence keeps the common case cheap; MAX_PASSES
// stays a FAIL-LOUD backstop — a non-converged year THROWS, never an in-range default (burned/062).
// The convergence stress sweep in the tests probes the k_total ≈ 0.78 regime directly WITH STATE ON at
// the federal-worst corner (low-basis taxable pool straddling the breakpoints × large SS × NC × SMALL
// net) so the cap can't be silently trimmed toward a value that throws for real gain-straddle inputs.
const GROSS_UP_EPSILON = 1e-7 // dollars
const GROSS_UP_MAX_PASSES = 192

// =========================================================================
// Pure federal-tax primitives (M3–M5) — EXTRACTED VERBATIM to `taxCore.ts` (U11 pre-work)
// so the U11 MAGI-landscape module can consume them without an import cycle. Re-exported
// here so every existing `@engine/taxOverlay` import path holds (burned/063 single source:
// there is still exactly ONE implementation — taxCore).
// =========================================================================

export { ordinaryIncomeTax, taxableSocialSecurity, capitalGainsTax, ordinaryPlusCapitalGainsTax } from '@engine/taxCore'

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

/** Sim-year `t`'s resolved tax identity: the filing status, the 65+ deduction count, and the
 *  RMD pool-holder (+ the JLLS sole-spouse arg, M6b). */
export interface ResolvedYear {
  readonly filing: FilingStatus
  readonly count65: number
  /** The Medicare-ENROLLED living count (C3 §3b): `|living ∩ {i : t ≥ onset_i}|`. With no onset
   *  signal it EQUALS `count65` (the biological default — today's predicate verbatim, byte-
   *  identical). ONLY the IRMAA gate + pricing count read this; everything else (the deduction
   *  stack, the ACA `pre65` denominator) stays on the biological `count65` — a 65+ member working
   *  past 65 (onset > their 65th sim-year) keeps the age-65 deduction and stays out of the
   *  marketplace count while accruing ZERO Medicare cost (base Part B included — the pricing
   *  count gates both). */
  readonly medicareEnrolledCount: number
  /** The CANONICAL indices (owner = 0, spouse = 1) of the living∩enrolled set — the per-person
   *  companion of `medicareEnrolledCount` (the ask-for-Medicare-extras unit): the extras Σ reads
   *  each enrolled person's OWN premium off `OverlayParams.medicareExtrasMonthly[idx]`, so the
   *  heterogeneous vector charges exactly the living-enrolled members and each person's extras
   *  END at their death (count×avg is forbidden — it under-charges the surviving high-premium
   *  spouse). Holds only IDENTITY-MATCHED members (a stranger living ref has no canonical index),
   *  so `length ≤ medicareEnrolledCount` in general and `===` exactly when reference identity
   *  holds — which the year loop's identity guard ENFORCES for every extras-carrying run (the
   *  FIFTH identity consumer): a stranger ref must throw there, never silently drop a member's
   *  premium from the Σ (the cost-understating direction). The COUNT keeps the verbatim legacy
   *  semantics (a stranger ref on the no-onset path still bills base Part B biologically). */
  readonly medicareEnrolledIndices: readonly number[]
  /** People alive this year = the ACA FPL household size (U3 · M3 Slice 4). The pre-65 count the
   *  age gate reads is `livingCount − count65` (living members under 65). */
  readonly livingCount: number
  /** The aggregated pre-tax pool's holder this year — the survivor after the first death.
   *  `undefined` only if nobody is alive (defensive; the horizon guarantees ≥1 living). */
  readonly rmdOwner: OverlayPerson | undefined
  /** The sole-spouse beneficiary whose age selects the JLLS divisor (M6b·A) when >10yr younger. */
  readonly rmdSpouse: OverlayPerson | undefined
}

/**
 * Resolve sim-year `t`'s filing / 65+ count / RMD-owner (M6a). With an injected per-year
 * {@link HouseholdYear} stream (supplied by `simulate.ts`, which owns the death timeline) the
 * LIVING set drives all three: filing is MFJ iff ≥2 alive else single, the 65+ count is the
 * living filers ≥ 65, and the pool holder is `living[0]` (people-order ⇒ the original owner
 * while alive, else the surviving spouse who inherited it). WITHOUT a stream entry it falls back
 * to the static household — both people present every year, filing as configured — VERBATIM the
 * M1–M5 behaviour (so every existing fixture is byte-identical). Reads ZERO draws (CRN-safe).
 */
function resolveYear(
  household: Household,
  householdYears: readonly HouseholdYear[],
  t: number,
  medicareOnsetSimYear?: readonly number[],
): ResolvedYear {
  // The per-person Medicare-enrollment predicate (C3 §3b). With NO onset signal it is the
  // biological-65 predicate VERBATIM (`ageInSimYear ≥ 65` — the same compare count65 makes), so
  // medicareEnrolledCount === count65 by construction and every pre-C3 run is byte-identical.
  // With a signal, the canonical INDEX keys the lookup (owner = 0, spouse = 1 — the M6b
  // alignment); a living ref matching NEITHER canonical person is a reference-identity breach
  // the up-front guard in the year loop rejects loudly (insight 020 — the onset consumer is in
  // its gate), so the defensive biological fallback here is never the silent answer.
  const enrolledAt = (p: OverlayPerson, canonicalIdx: number): boolean => {
    const onset = canonicalIdx >= 0 ? medicareOnsetSimYear?.[canonicalIdx] : undefined
    if (onset !== undefined) return t >= onset
    return ageInSimYear(p, household.startCalendarYear, t) >= AGE_65_THRESHOLD
  }
  const canonicalIndexOf = (p: OverlayPerson): number =>
    p === household.owner ? 0 : p === household.spouse ? 1 : -1
  const injected = householdYears[t]
  if (injected !== undefined) {
    const living = injected.living
    const filing: FilingStatus = living.length >= 2 ? 'mfj' : 'single'
    let count65 = 0
    let medicareEnrolledCount = 0
    const medicareEnrolledIndices: number[] = []
    for (const p of living) {
      if (ageInSimYear(p, household.startCalendarYear, t) >= AGE_65_THRESHOLD) count65++
      // The enrolled COUNT intersects the living set (C3 §3b) — computed here, the sibling of
      // count65, so a dead spouse is never billed (a count over all entered persons would bill
      // a dead member's Part B forever). VERBATIM legacy semantics: a stranger living ref (no
      // canonical identity — legal on the aggregate no-onset path) still counts biologically.
      // The canonical INDEX list rides along for the extras Σ (the extras unit) and holds only
      // identity-matched members — the year loop's identity guard throws for any stranger ref
      // on an extras-carrying run, so the idx ≥ 0 filter can never silently drop a premium.
      const idx = canonicalIndexOf(p)
      if (enrolledAt(p, idx)) {
        medicareEnrolledCount++
        if (idx >= 0) medicareEnrolledIndices.push(idx)
      }
    }
    return {
      filing,
      count65,
      medicareEnrolledCount,
      medicareEnrolledIndices,
      livingCount: living.length,
      rmdOwner: living[0],
      rmdSpouse: living[1],
    }
  }
  // Static (M5): both people present every year, filing as configured — verbatim M1–M5.
  const staticIndices: number[] = []
  if (enrolledAt(household.owner, 0)) staticIndices.push(0)
  if (household.spouse && enrolledAt(household.spouse, 1)) staticIndices.push(1)
  return {
    filing: household.filing,
    count65: count65PlusInSimYear(household, t),
    medicareEnrolledCount: staticIndices.length,
    medicareEnrolledIndices: staticIndices,
    livingCount: household.spouse ? 2 : 1,
    rmdOwner: household.owner,
    rmdSpouse: household.spouse,
  }
}

/** Sim-year `t`'s household context — see {@link overlayYearContext}. */
export interface OverlayYearContext extends ResolvedYear {
  /** The sim year's calendar year, `household.startCalendarYear + t`. */
  readonly calendarYear: number
  /** The household's retirement state when it is PRICED (`isPricedState` membership); absent for an
   *  absent state, `'elsewhere'` or an unbuilt roster code — the structural `+ 0` state branch. */
  readonly pricedState?: PricedState
  /** The MIN integer age among this year's LIVING members — the household-granularity qualified-age
   *  gate of a class-based age-gated state (PA 59½). +Infinity when nobody is alive (defensive; the
   *  horizon guarantees one), which reads as "qualified". */
  readonly minLivingAge: number
}

/**
 * Sim-year `t`'s household context — the one producer of the year's tax identity: {@link ResolvedYear}
 * (filing, the 65+ count, who is Medicare-enrolled, the living count, the RMD holder) plus the calendar
 * year, the priced state and the living-age floor. The year loop reads it, and so will the working-year
 * money picture (the pay check's KTD12), so the two can never disagree on a year's household. The living
 * set is resolveYear's (`householdYears[t]`, else the static household). Reads ZERO draws (CRN-safe).
 */
export function overlayYearContext(
  household: Household,
  householdYears: readonly HouseholdYear[],
  t: number,
  medicareOnsetSimYear?: readonly number[],
): OverlayYearContext {
  const resolved = resolveYear(household, householdYears, t, medicareOnsetSimYear)
  // The living set is resolveYear's rmdOwner/rmdSpouse (living[0]/living[1]); the aggregate draw and
  // conversion are NOT per-person-attributable, so the state's age gate is household-granularity
  // conservative (all-living-must-be-qualified — see stateIncomeTax).
  const livingPeople = [resolved.rmdOwner, resolved.rmdSpouse].filter((p): p is OverlayPerson => p !== undefined)
  const minLivingAge =
    livingPeople.length > 0
      ? Math.min(...livingPeople.map((p) => ageInSimYear(p, household.startCalendarYear, t)))
      : Number.POSITIVE_INFINITY
  const state = household.retirementState
  return {
    ...resolved,
    calendarYear: household.startCalendarYear + t,
    ...(state !== undefined && isPricedState(state) ? { pricedState: state } : {}),
    minLivingAge,
  }
}

/** One sim year's Medicare charge — see {@link medicareChargeForYear}. */
export interface MedicareYearCharge {
  /** Base Part B + the IRMAA surcharge for every living enrolled member, as billed — the only Medicare
   *  premium the HSA may pay (Pub 969). */
  readonly cost: number
  /** The IRMAA surcharge slice of `cost`, from the same tier lookup (the base is `cost − surcharge`). */
  readonly surcharge: number
  /** The entered Part D / Medigap / Medicare Advantage premiums of the living enrolled members, × 12 —
   *  kept apart from `cost` (Medigap is Pub 969's named exclusion; the readout's base reads `cost`). */
  readonly extras: number
}

/** What {@link medicareChargeForYear} reads — the year loop's own streams; the IRMAA schedule and the
 *  Part B pricing are the engine's one binding of the sourced constants, bound inside. */
export interface MedicareChargeInputs {
  readonly household: Household
  /** The per-year living stream (survivor-aware); empty = the static household. */
  readonly householdYears: readonly HouseholdYear[]
  readonly medicareOnsetSimYear?: readonly number[]
  readonly t: number
  /** Sim-year `t`'s enrolled members: the pricing count and their canonical indices. */
  readonly year: Pick<ResolvedYear, 'medicareEnrolledCount' | 'medicareEnrolledIndices'>
  /** IRMAA-MAGI recorded for every earlier sim year (the lagged bill reads index t − lookback). */
  readonly irmaaMagiHistory: readonly number[]
  /** The MAGI of a bill whose look-back year predates the sim, by sim year. */
  readonly irmaaMagiSeed: readonly number[]
  readonly irmaaMagiOverride: readonly number[]
  readonly bridgeYearMask: readonly boolean[]
  readonly medicareExtrasMonthly?: readonly number[]
  /** The run's per-sim-year Part B pricing, when the caller has already bound it (the year loop does,
   *  once per path). Absent, the year's own slot is bound here through the same binding — every value
   *  of its walk is keyed on the calendar year alone, so a one-year slice IS the run schedule's slot
   *  (the identity `irmaaBillScalesFor` reads; test-pinned). */
  readonly partBPricing?: readonly PartBYearPricing[]
}

const NO_MEDICARE_YEAR_CHARGE: MedicareYearCharge = Object.freeze({ cost: 0, surcharge: 0, extras: 0 })

/**
 * Sim-year `t`'s Medicare charge (M4 + the extras unit): the base Part B and IRMAA surcharge of every
 * living Medicare-enrolled member, and their entered extras. The year loop funds it, and the
 * working-year money picture's "also paid from savings" group will read the same function (the pay
 * check's KTD7). Nothing is charged in a year nobody is enrolled.
 *
 * The surcharge is a 2-year-LAGGED feed-forward (research §4c), never a fixed point: the bill of year t
 * reads IRMAA-MAGI[t − lookback] (the seed when that year predates the sim) against the lines of that
 * MAGI year's price frame, at the filing status of that lagged year (so the survivor MFJ→single flip is
 * itself lagged). The extras are each enrolled member's OWN premium, by canonical index, so a person's
 * extras end at their death (count × average is the forbidden shape — it under-charges the surviving
 * high-premium spouse), held real-flat (no sourced trend; the disclosed residual names it).
 *
 * THROWS (burned/062, insight 010) when the lagged read lands on a bridge year with no finite working-
 * year override (a clamped year's computed MAGI is ≈$0 — a silent lowest tier), or when the MAGI it
 * needs is missing or non-finite.
 */
export function medicareChargeForYear(inputs: MedicareChargeInputs): MedicareYearCharge {
  const { household, t, year } = inputs
  if (!(year.medicareEnrolledCount > 0)) return NO_MEDICARE_YEAR_CHARGE
  const irmaaSchedule = irmaa.value
  const lookback = irmaaSchedule.magiLookbackYears
  const lag = t - lookback
  // The masked LAGGED-READ arm (C3 §3b — the true mirror of the seed throw below, which cannot fire
  // here: a lagged read landing on a clamped WORKING year returns a FINITE ≈$0 computed MAGI → lowest
  // tier → understated surcharge → a falsely-early date, SILENTLY). A bridge year at the lagged index
  // demands finite override coverage of that index — the additive write is what recorded it into
  // history, so absent coverage means the recorded value was computed-only ≈$0. Mask-conditional for a
  // direct caller (recorded limitation, §3b).
  if (lag >= 0 && inputs.bridgeYearMask[lag] === true && !Number.isFinite(inputs.irmaaMagiOverride[lag])) {
    throw new Error(
      `[taxOverlay] IRMAA's lagged read lands on BRIDGE year ${lag} with no finite irmaaMagiOverride[${lag}] — ` +
        `a clamped working year's computed IRMAA-MAGI is ≈$0, silently pricing the lowest tier (understated cost, ` +
        `the falsely-early-date direction); supply the working-year override (C3 §3b; burned/062)`,
    )
  }
  const magiForBill = lag >= 0 ? inputs.irmaaMagiHistory[lag] : inputs.irmaaMagiSeed[t]
  // Finiteness FIRST (insight 010): a missing seed for a near-65 start, or a NaN, must FAIL LOUD — never
  // default 0 (a phantom $0 surcharge → understated cost → overstated survival, the cardinal
  // calm-but-wrong sin; burned/062). validateParams shields `simulate`; this is the direct-caller backstop.
  if (magiForBill === undefined || !Number.isFinite(magiForBill)) {
    throw new Error(
      `[taxOverlay] IRMAA needs a finite IRMAA-MAGI[t−${lookback}] for sim year ${t} (a Medicare-enrolled member) — ` +
        `supply irmaaMagiSeed[${t}] for a sim starting within ${lookback}yr of age 65 (no default 0; burned/062, insight 010)`,
    )
  }
  const filingForBill =
    lag >= 0 ? resolveYear(household, inputs.householdYears, lag, inputs.medicareOnsetSimYear).filing : household.filing
  // THE PRICE FRAME: the bill of calendar year start + t compares the MAGI of start + lag (a seed year
  // when lag < 0) against that bill year's lines, in the MAGI year's real dollars.
  const billSchedule = irmaaScheduleAsCompared(irmaaSchedule, household.startCalendarYear + lag)
  const partBYear =
    inputs.partBPricing !== undefined
      ? inputs.partBPricing[t]
      : boundPartBPricingSchedule(household.startCalendarYear + t, 1)[0]
  if (partBYear === undefined) {
    throw new Error(`[taxOverlay] the Part B pricing schedule does not cover sim year ${t} — it is built for the run's whole horizon`)
  }
  // One tier lookup prices the bill and its surcharge slice, at the year's own trend scales — the
  // readout's base = cost − surcharge is exact by construction.
  const bill = medicareAnnualCharge(
    magiForBill,
    filingForBill,
    year.medicareEnrolledCount,
    billSchedule,
    partBYear.baseMonthlyReal,
    partBYear.scales,
  )
  let extras = 0
  if (inputs.medicareExtrasMonthly !== undefined) {
    for (const idx of year.medicareEnrolledIndices) extras += (inputs.medicareExtrasMonthly[idx] ?? 0) * 12
  }
  return { cost: bill.cost, surcharge: bill.surcharge, extras }
}

// =========================================================================
// RMD (M2) — `rmdStartAgeForBirthYear` + `selectRmdDivisor` are re-homed to `@engine/rmd`
// (imported above; the ONE producer shared with the live solve anchor deriver, U16 §S1).
// =========================================================================

/**
 * The forced RMD for sim-year `t`: the prior-year-end pre-tax balance ÷ the (resolved) owner's
 * divisor, once that owner reaches their birth-year RMD age (else 0). The owner is the year's
 * pool holder — the survivor after the first death (spousal rollover), so post-death the RMD
 * keys off the SURVIVOR's own age + RMD-start band (and pauses if they are younger than it).
 * NON-CONVERTIBLE — distributed as ordinary income FIRST. Reads ZERO draws (CRN-safe).
 */
function rmdForYear(priorYearEndPretax: number, config: TaxOverlayConfig, resolved: ResolvedYear, t: number): number {
  if (!config.rmdEnabled) return 0
  const owner = resolved.rmdOwner
  if (owner === undefined) return 0 // nobody alive to force-distribute (defensive)
  const { startCalendarYear } = config.household
  const ownerAge = startCalendarYear + t - owner.birthYear
  if (ownerAge < rmdStartAgeForBirthYear(owner.birthYear)) return 0
  const spouse = resolved.rmdSpouse
  const spouseAge = spouse ? startCalendarYear + t - spouse.birthYear : undefined
  return priorYearEndPretax / selectRmdDivisor(ownerAge, spouseAge)
}

// =========================================================================
// Per-person pre-tax splitting (M6b·B)
// =========================================================================
// M6a tracked ONE aggregated pre-tax pool RMD'd on the holder's age. M6b·B splits pre-tax PER
// PERSON so each spouse's IRA is forced on its OWN age + its OWN sole-spouse beneficiary (the
// Joint-Life divisor). The per-person ledger is a sub-ledger of `buckets.pretax` (Σ === it); it
// is active ONLY when the caller supplies `initialPretaxByPerson`. With it ABSENT the aggregate
// M6a path runs verbatim (byte-identical). The two paths AGREE when all pre-tax sits on the owner
// (the equivalence golden) — x/x = 1 and 0/x = 0 are exact, so the pro-rata splits reduce cleanly.

/** The household's canonical people in owner→spouse order — the per-person ledger's index basis. */
function canonicalPeople(household: Household): readonly OverlayPerson[] {
  return household.spouse ? [household.owner, household.spouse] : [household.owner]
}

/** Per-canonical-person alive-ness for sim-year `t`. With an injected living set a canonical
 *  person is alive iff present BY REFERENCE — `simulate` threads the SAME `OverlayPerson` objects
 *  through `household.owner`/`spouse` and the `living` array, so identity is stable across years.
 *  With no stream the static household keeps both alive every year (the no-death per-person case). */
function aliveCanonical(
  people: readonly OverlayPerson[],
  householdYears: readonly HouseholdYear[],
  t: number,
): boolean[] {
  const injected = householdYears[t]
  if (injected === undefined) return people.map(() => true)
  return people.map((p) => injected.living.includes(p))
}

/** Each LIVING person's forced RMD on THEIR OWN prior-year-end pre-tax ÷ THEIR OWN divisor (own
 *  age + own sole-spouse beneficiary), once past their birth-year RMD age (else 0). A deceased
 *  person's pre-tax has already rolled to the survivor (see the loop), so only living holders
 *  distribute. The sole-spouse beneficiary is the OTHER living canonical person (the couple model). */
function perPersonRmd(
  ledger: readonly number[],
  people: readonly OverlayPerson[],
  alive: readonly boolean[],
  startCalendarYear: number,
  rmdEnabled: boolean,
  t: number,
): number[] {
  return people.map((person, i) => {
    if (!rmdEnabled || !alive[i]) return 0
    const pretax = ledger[i] ?? 0
    if (pretax <= 0) return 0
    const age = startCalendarYear + t - person.birthYear
    if (age < rmdStartAgeForBirthYear(person.birthYear)) return 0
    const otherIdx = i === 0 ? 1 : 0
    const other = people[otherIdx]
    const spouseAge = other && alive[otherIdx] ? startCalendarYear + t - other.birthYear : undefined
    return pretax / selectRmdDivisor(age, spouseAge)
  })
}

/**
 * Advance the per-person pre-tax ledger one year and return the AGGREGATE forced excess (Σ
 * per-person), which the aggregate bucket update consumes too — so `Σ ledger_post` reconciles to
 * `buckets.pretax_post`. The aggregate spending pre-tax draw and the (already aggregate-clamped)
 * conversion are split pro-rata across living holders: the conversion by per-person CONVERTIBLE
 * room (`pretax − rmd`, RMD-first legality), the spending draw by draw-time balance. Each person's
 * RMD excess beyond their own spending draw relocates to (aggregate) taxable; survivors grow by
 * the one shared factor (contract #2 — no asset-location). `ledger` is MUTATED to post-growth.
 */
function advancePerPersonLedger(
  ledger: number[],
  perRmd: readonly number[],
  conversion: number,
  allocPretax: number,
  scale: number,
): number {
  const convertible = ledger.map((p, i) => Math.max(0, p - (perRmd[i] ?? 0)))
  const totalConvertible = convertible.reduce((a, b) => a + b, 0)
  const drawPretax = ledger.map(
    (p, i) => p - (totalConvertible > 0 ? conversion * (convertible[i]! / totalConvertible) : 0),
  )
  const totalDraw = drawPretax.reduce((a, b) => a + b, 0)
  let forcedExcessTotal = 0
  for (let i = 0; i < ledger.length; i++) {
    const dp = drawPretax[i]!
    const ap = totalDraw > 0 ? allocPretax * (dp / totalDraw) : 0
    const fe = Math.min(Math.max(0, (perRmd[i] ?? 0) - ap), dp - ap)
    forcedExcessTotal += fe
    ledger[i] = (dp - ap - fe) * scale
  }
  return forcedExcessTotal
}

// =========================================================================
// The gross-up fixed point (M3)
// =========================================================================

/**
 * Solve the per-year gross withdrawal as a bounded fixed point: withdraw enough to net `net`
 * of spending AFTER the tax that withdrawal itself triggers.
 *
 * `drawPool` is the bucket state the spending draw allocates against — the Roth `conversion` has
 * ALREADY been relocated out of pre-tax into Roth by the caller (so the draw can never re-claim
 * the converted pre-tax). Each pass:
 *   - The taxable draw realizes a pro-rata share of embedded capital gain
 *     (`alloc.taxable × (1 − basis/value)`, floored at 0 for down-market losses).
 *   - Ordinary income = the pre-tax distributed (`max(alloc.pretax, rmd)`) + the `conversion`
 *     (ordinary income; it does NOT satisfy the non-convertible RMD) + the taxable portion of SS.
 *   - Provisional income — selecting that SS portion via {@link taxableSocialSecurity} — now
 *     includes the realized gain in its "other income" (M5: cap gains are in AGI), so the SS layer
 *     and the cap-gains realization both fold into the SAME fixed point rather than sitting outside.
 *   - The tax is {@link ordinaryPlusCapitalGainsTax}: progressive ordinary tax on the deduction-
 *     reduced ordinary income + the preferential cap-gains tax on the gain stacked on top, with the
 *     senior-bonus deduction phased on the gain-inclusive MAGI and any unused deduction sheltering
 *     the gain.
 *
 * Monotone-increasing and bounded (a contraction — worst-case effective marginal rate k ≈ 0.74,
 * see {@link GROSS_UP_MAX_PASSES}) → converges from below. THROWS if it has not converged within
 * {@link GROSS_UP_MAX_PASSES} (no in-range default, burned/062).
 *
 * Returns the converged gross AND the floored MAGI ingredients read off the converging pass (M3 —
 * a {@link GrossUpSolution}): the ACA solver derives `acaMagi(components)` from these EXACT floored
 * locals (realizedGain after its Math.max(0,·)) rather than recomputing MAGI off a raw-gain ledger
 * (the named sign-inversion). The `gross` scalar is byte-identical to the pre-M3 scalar return, so
 * the reduce-to-spine golden is untouched.
 */
/**
 * The year-constant inputs to {@link solveGrossWithdrawal}, bundled into ONE named object so the
 * seven same-typed scalars (rmd, conversion, taxableBasis, count65, ssBenefit, bracketFillCeiling …)
 * can never be silently TRANSPOSED at a call site — a positional swap would compile clean and
 * mis-tax the year (the calm-but-wrong class). This mirrors the exact discipline {@link TaxYearInputs}
 * already applies to the per-year streams. `net` stays a separate leading argument because the ACA
 * solver's `fundNet` closure VARIES it (baseNet + a candidate premium) while this context is fixed.
 * (U3-exit code-review pilot — ts-idiom.)
 */
interface GrossUpContext {
  readonly drawPool: AccountBuckets
  readonly policy: DrawdownPolicy
  /** The user's own bucket order (P3·U10) — read only when `policy === 'custom'` (the
   *  allocateWithdrawal pairing; validated upstream, fail-loud below it). */
  readonly customOrder?: readonly GeneralBucketKey[]
  readonly rmd: number
  readonly conversion: number
  readonly taxableBasis: number
  readonly filing: FilingStatus
  readonly count65: number
  /** The sim year's CALENDAR year (`household.startCalendarYear + t`) — windows the OBBBA
   *  senior bonus inside the deduction stack (the sunset unit, council 2026-07-09), deflating its
   *  frozen per-person amount and phase-out start inside that window (`taxCore.seniorBonusFor`,
   *  2026-09-25), AND deflates the frozen §86 provisional-income thresholds
   *  (`taxCore.taxableSocialSecurity`, 2026-09-24) and a priced state's frozen standard deduction
   *  (`stateIncomeTax`, 2026-09-25 — the same year keys the state's dated rate) via
   *  `cumulativePriceIndex` in EVERY year, not only 2025–2028 — never clamp it or pass the anchor
   *  year. Year-constant like everything else here, so the fixed point stays 1-D. */
  readonly calendarYear: number
  readonly ssBenefit: number
  readonly bracketFillCeiling: number
  /** R40 — this year's ongoing other-income TAXABLE that enters ordinary income (seam 2; KTD-1):
   *  a pension/rental/annuity/pre-2019-alimony's taxable portion. Folded into `nonSSordinary` at the
   *  SINGLE producer below, so the §86 SS provisional, ACA-MAGI, and IRMAA-MAGI all rise by it ONCE
   *  (seams 3/4/5 ride the one `nonSSordinary` term). 0 in a no-income run (the `?? 0` default keeps
   *  every fold an exact IEEE no-op — reduce-to-spine byte-identical). This is the gross-up feed; the
   *  KTD-9 clamped-working-year IRMAA-only taxable is recorded separately at the history site. */
  readonly ongoingTaxable: number
  /** The household's retirement state (the state-tax unit). READ only inside the `isPricedState`
   *  MEMBERSHIP branch below — absent / `'elsewhere'` / an unbuilt roster code take the structural
   *  `+ 0` no-op (the state module is NEVER called for them; a computed-then-zeroed value would
   *  perturb the reduce-to-spine float lineage). Year-constant like everything else here. */
  readonly retirementState?: RetirementState
  /** The MIN integer age among this year's LIVING members — the household-granularity qualified-age
   *  gate for a class-based age-gated state (PA 59½). Year-constant; consumed only by the state term. */
  readonly minLivingAge: number
  /** The working-year tax floor (2026-10-20): this §7-CLAMPED year's outside income — the
   *  household's taxable pay + clamped ongoing taxable (B) and its entered working-year investment
   *  income (I) — and the floor the year loop prepared from it ONCE ({@link prepareWorkingYearFloor};
   *  the pay check's KTD7 hoist). PRESENT only in a clamped year under the accumulation construct (the
   *  caller's `workingYearOutsideIncome[t]`); ABSENT ⇒ the literal pre-floor expression below, so every
   *  unclamped, construct-absent and retired-route year is byte-identical. Year-constant, so the fixed
   *  point stays 1-D. */
  readonly workingYear?: {
    readonly outside: WorkingYearOutsideIncome
    readonly floor: PreparedWorkingYearFloor
  }
}

// =========================================================================
// The working-year tax floor (2026-10-20 — `docs/plans/features/working-year-tax-floor-build-spec.md`)
// =========================================================================
//
// In a §7-CLAMPED working year (the accumulation construct present AND a living member still
// working — `simulate.cashTermsForYear`) the household lives on its pay: the spending net is 0 and
// the wages fund their OWN tax outside the portfolio (under the pay check, W, a year whose pay falls
// short draws that shortfall — which carries the pay's payroll and income tax — from the portfolio, as
// part of the year's need; see the pay check's section below). The portfolio still supplies money in
// that year — a forced RMD, the household's own Roth conversion, the draw that pays a retired spouse's
// Medicare, a pay-check shortfall — and the tax return that money lands on also carries the pay. Pricing that portfolio money as if
// it were the household's only income lets the standard deduction and the bottom brackets the wages
// already fill shelter it a second time (the register's Tier 0 *A working-year Roth conversion or RMD
// on the date route is taxed as if the household had no pay…*: `dip`'s year-4 $34,000 conversion
// charged $180 where $4,380 is owed on top of its wages — the optimistic direction).
//
// THE CHARGE (KTD1). For one base, the portfolio funds T(base + P, ss) − T(base, ss) + T(0, ss):
//   - T(base + P) − T(base) is what the portfolio's own income P adds ON TOP of the outside income;
//   - T(0, ss) is the tax Social Security alone carries, which today's engine already funds from
//     the portfolio (a working household's SS is not pay; the NEGATIVE keeps today's figure there).
// So the tax the outside income adds BY ITSELF, T(base, ss) − T(0, ss), is never portfolio-funded
// (the §7 law), and at base = 0 the charge is today's T(P, ss) exactly. Rejected (recorded in the
// plan): the base with no subtraction (funds the wages' tax); the register's T(base + P) − T(base)
// with no T(0, ss) term (charges $0 where SS alone is taxable — falsifies its own NEGATIVE); a
// baseline without SS (charges the portfolio SS's tax on cash it never receives).
//
// THE THREE READINGS OF I (KTD11, council wf_ef6cf7c5-a2b, 7/10). The entered working-year
// investment income has no tax character on the wire, so the federal charge is the COSTLIEST of
// three readings' increments, plus T(0, ss) once: I EXCLUDED (base B), I as ORDINARY income (base
// B + I), I as PREFERENTIAL income (I stacked in the gain argument and in §86's other income). Never
// max-of-totals minus max-of-baselines; the excluded arm is what keeps the max honest in the concave
// §86 regime, where a larger base LOWERS the increment. At I = 0 the three coincide bit for bit, so
// only the excluded arm is evaluated there — an exact shortcut, never a semantic key on I > 0.
//
// EXACTNESS (R3). Where the base adds no tax of its own (T(base) === T(0)) the charge is evaluated as
// T(base + P) directly — algebraically the same quantity, bit-exact at base = 0 even when SS alone is
// taxable; elsewhere the evaluation order (T(base + P) − T(base)) + T(0) is bit-exact at P = 0. Both
// corners therefore return today's figure exactly.

/** One §7-clamped working year's OUTSIDE income — what the household's pay and its own entered
 *  working-year investment income bring to the year's return, which no modeled cash in the engine
 *  pays (the clamp: wages fund their own tax). Built by `simulate.cashTermsForYear` and supplied
 *  per year as {@link TaxYearInputs.workingYearOutsideIncome}; both fields are real $, finite ≥ 0. */
export interface WorkingYearOutsideIncome {
  /** B (KTD2/KTD4) — Σ over the LIVING workers of max(0, `earnedIncomeReal_i` − that person's own
   *  pre-tax deferral this year), plus the year's clamped ongoing other-income taxable (R40 KTD-9's
   *  IRMAA-only feed). Ordinary income on the return; never portfolio-funded. */
  readonly ordinaryBase: number
  /** I (KTD11) — the household sum of the entered working-year investment income of the members
   *  working this year. Priced at the costliest of three readings (excluded / ordinary / preferential). */
  readonly investmentIncome: number
}

/** The tax a reading's base adds may not fall below this when portfolio income is added on top —
 *  every channel in `taxCore.ts` is non-decreasing in income, so a NEGATIVE increment is a defect,
 *  never rounding dust (a sub-cent tolerance; the increment is a difference of two converged sums). */
const WORKING_YEAR_INCREMENT_FLOOR = -1e-6

/** T(ordinaryOther, gainOther; ss): the year's federal tax on the given non-SS ordinary income and
 *  realized gain beside the year's Social Security — the gross-up's OWN order of operations (the
 *  §86 provisional reads ordinary + gain; the ordinary base adds the taxable SS; the gain stacks on
 *  top), so a zero base reproduces the pre-floor expression bit for bit. */
function federalTaxBesideSs(
  ordinaryOther: number,
  gainOther: number,
  ssBenefit: number,
  filing: FilingStatus,
  count65: number,
  calendarYear: number,
): { readonly tax: number; readonly ssTaxable: number } {
  const ssTaxable = taxableSocialSecurity(ordinaryOther + gainOther, ssBenefit, filing, calendarYear)
  return {
    tax: ordinaryPlusCapitalGainsTax(ordinaryOther + ssTaxable, gainOther, filing, count65, calendarYear),
    ssTaxable,
  }
}

/** One reading of the outside income: its ordinary and preferential halves and the federal tax that
 *  base carries by itself beside the year's SS (portfolio income zero). */
interface WorkingYearReading {
  readonly ordinaryBase: number
  readonly gainBase: number
  readonly baseTax: number
}

/** The year-constant state half of a prepared floor — present iff the household's state is priced. */
interface WorkingYearStateFloor {
  readonly state: PricedState
  readonly minLivingAge: number
  /** B + I — the state takes the outside income ONCE, as ordinary (KTD7, council). */
  readonly ordinaryBase: number
  /** The state tax the outside income carries by itself (portfolio channels zero, SS at its B + I value). */
  readonly baseTax: number
  /** The state tax at zero outside and zero portfolio income — the state's T(0, ss). */
  readonly zeroTax: number
}

/** A clamped year's floor, prepared ONCE per clamped year by the year loop (every baseline is
 *  gross-independent, so it is a constant inside the fixed point). Exported with {@link workingYearFederalCharge} /
 *  {@link workingYearStateCharge} so the pricing witness probes the exact helpers the gross-up calls. */
export interface PreparedWorkingYearFloor {
  readonly ssBenefit: number
  readonly filing: FilingStatus
  readonly count65: number
  readonly calendarYear: number
  /** T(0, ss) — the tax SS alone carries, funded from the portfolio exactly as before the floor. */
  readonly zeroTax: number
  /** [excluded] when I = 0, else [excluded, ordinary, preferential] (KTD11). */
  readonly readings: readonly WorkingYearReading[]
  readonly stateFloor?: WorkingYearStateFloor
}

/** The year's household context a prepared floor needs (every field year-constant). */
export interface WorkingYearFloorContext {
  readonly ssBenefit: number
  readonly filing: FilingStatus
  readonly count65: number
  readonly calendarYear: number
  /** Present ⇒ the state half is prepared (the caller keys on `isPricedState` membership first). */
  readonly pricedState?: PricedState
  readonly minLivingAge: number
}

/**
 * Prepare one clamped year's floor: T(0, ss), each reading's base tax, and the priced state's two
 * baselines. THROWS on a non-finite or negative B or I (burned/062 — an in-range default for a figure
 * that moves the answer is the calm-but-wrong sin, and a NaN would sail through every compare below).
 */
export function prepareWorkingYearFloor(
  outside: WorkingYearOutsideIncome,
  ctx: WorkingYearFloorContext,
): PreparedWorkingYearFloor {
  const b = outside.ordinaryBase
  const i = outside.investmentIncome
  if (!(Number.isFinite(b) && b >= 0) || !(Number.isFinite(i) && i >= 0)) {
    throw new Error(
      `[taxOverlay] a working-year outside income must be finite and ≥ 0 (ordinaryBase=${b}, investmentIncome=${i}) — insights 008/010; burned/062`,
    )
  }
  const { ssBenefit, filing, count65, calendarYear } = ctx
  const taxAt = (ordinary: number, gain: number) =>
    federalTaxBesideSs(ordinary, gain, ssBenefit, filing, count65, calendarYear)
  const zero = taxAt(0, 0)
  const shapes: ReadonlyArray<readonly [ordinaryBase: number, gainBase: number]> =
    i === 0
      ? [[b, 0]]
      : [
          [b, 0], // I excluded
          [b + i, 0], // I as ordinary income
          [b, i], // I as preferential income (the gain argument and §86's other income)
        ]
  const readings = shapes.map(([ordinaryBase, gainBase]) => ({
    ordinaryBase,
    gainBase,
    baseTax: taxAt(ordinaryBase, gainBase).tax,
  }))
  let stateFloor: WorkingYearStateFloor | undefined
  if (ctx.pricedState !== undefined) {
    const stateBase = b + i
    const zeroChannels = { pretaxDistribution: 0, conversion: 0, ongoingTaxable: 0, realizedGain: 0 }
    const common = { state: ctx.pricedState, filing, calendarYear, minLivingAge: ctx.minLivingAge }
    stateFloor = {
      state: ctx.pricedState,
      minLivingAge: ctx.minLivingAge,
      ordinaryBase: stateBase,
      baseTax: stateIncomeTax({
        ...common,
        ...zeroChannels,
        ssBenefitTaxable: taxAt(stateBase, 0).ssTaxable,
        clampedOrdinaryBase: stateBase,
      }),
      zeroTax: stateIncomeTax({ ...common, ...zeroChannels, ssBenefitTaxable: zero.ssTaxable }),
    }
  }
  return {
    ssBenefit,
    filing,
    count65,
    calendarYear,
    zeroTax: zero.tax,
    readings,
    ...(stateFloor !== undefined ? { stateFloor } : {}),
  }
}

/**
 * One pass's federal charge in a clamped year (KTD1 × KTD11): max over the readings of
 * T(base + P) − T(base), plus T(0, ss) once — `portfolioOrdinary` / `portfolioGain` are everything the
 * portfolio supplies this pass (the RMD-or-draw pre-tax distribution, the conversion, the funding
 * draw's realized gain). `ssTaxable` is the year's taxable SS on the provisional that carries ALL of
 * the year's AGI — B + I + the portfolio income (I is in AGI under either character, §86(b)(2)) — the
 * figure the returned `MagiComponents` carry. THROWS when a reading's increment is negative beyond
 * dust (a monotonicity breach is a defect, never a silent negative tax).
 */
export function workingYearFederalCharge(
  floor: PreparedWorkingYearFloor,
  portfolioOrdinary: number,
  portfolioGain: number,
): { readonly tax: number; readonly ssTaxable: number } {
  const { ssBenefit, filing, count65, calendarYear, zeroTax, readings } = floor
  let tax = Number.NEGATIVE_INFINITY
  let ssTaxable = 0
  for (let r = 0; r < readings.length; r++) {
    const reading = readings[r]!
    const full = federalTaxBesideSs(
      portfolioOrdinary + reading.ordinaryBase,
      portfolioGain + reading.gainBase,
      ssBenefit,
      filing,
      count65,
      calendarYear,
    )
    const increment = full.tax - reading.baseTax
    if (increment < WORKING_YEAR_INCREMENT_FLOOR) {
      throw new Error(
        `[taxOverlay] a working-year reading's increment is negative (${increment}) — every federal channel is non-decreasing in income, so this is a defect, never dust`,
      )
    }
    const charge = reading.baseTax === zeroTax ? full.tax : increment + zeroTax
    if (charge > tax) tax = charge
    // The ordinary reading (index 1 when I > 0) carries B + I + P on its provisional; at I = 0 the
    // single reading carries B + P, which IS B + I + P.
    if (r === (readings.length > 1 ? 1 : 0)) ssTaxable = full.ssTaxable
  }
  return { tax, ssTaxable }
}

/** The portfolio-sourced state channels of one pass (the same floored values the federal charge reads). */
export interface WorkingYearStateChannels {
  readonly pretaxDistribution: number
  readonly conversion: number
  readonly ongoingTaxable: number
  readonly realizedGain: number
  readonly ssBenefitTaxable: number
}

/**
 * One pass's priced-state charge in a clamped year (KTD7): state(B + I + P) − state(B + I) +
 * state(0), evaluated as state(B + I + P) where the outside income adds no state tax by itself (PA and
 * FL structurally; NC inside its deduction). THROWS on a negative increment beyond dust. 0 when the
 * floor carries no state half (the household's state is unpriced — the structural `+ 0`).
 */
export function workingYearStateCharge(floor: PreparedWorkingYearFloor, channels: WorkingYearStateChannels): number {
  const sf = floor.stateFloor
  if (sf === undefined) return 0
  const full = stateIncomeTax({
    state: sf.state,
    filing: floor.filing,
    calendarYear: floor.calendarYear,
    minLivingAge: sf.minLivingAge,
    ...channels,
    clampedOrdinaryBase: sf.ordinaryBase,
  })
  const increment = full - sf.baseTax
  if (increment < WORKING_YEAR_INCREMENT_FLOOR) {
    throw new Error(
      `[taxOverlay] a working-year state increment is negative (${increment}) — the state base is non-decreasing in income, so this is a defect, never dust`,
    )
  }
  return sf.baseTax === sf.zeroTax ? full : increment + sf.zeroTax
}

// =========================================================================
// The working-year pay check (2026-10-21 — `docs/plans/features/working-year-pay-check-build-spec.md`)
// =========================================================================
//
// The §7 clamp assumes a working year's pay covers what the year costs, the tax on that pay and every
// deposit, and before this check nothing tested it. With the household's answer W (what a year costs
// while anyone works) present, each clamped year runs the check (R5):
//   cash = the living workers' gross pay + Social Security PAID + ongoing income (gross)
//          − federal payroll tax − the tax on the outside income − the household's own deposits − W_t
//   shortfall = max(0, −cash), added to `fundingNet` and drawn through the withdrawal order.
// `simulate.cashTermsForYear` gathers the year's terms ({@link WorkingYearCheckTerms}); this module adds
// what only the overlay knows — the payroll tax (`payrollTaxForYear`, on the year's filing status and
// calendar year) and the tax on the outside income, read off the ONE prepared floor the charge also reads
// (R6, KTD7/KTD8) — in {@link workingYearCashLines}, which the year loop calls (and A7's money picture will).
// The entered investment income I is never money in (the portfolio's total return already includes it),
// but its tax is money out (R5) — federally through the floor, and for a class-based state (PA), whose
// floor ignores the clamped base because its tax on pay rides in W, through the check itself
// (`stateTaxOnOutsideIncome`, the A6 review's catch: the floor alone charged PA nothing on I or a
// pension). Never in the shortfall: the Medicare draw (its own `fundingNet` term) and T(0, ss)
// (`zeroTax` — savings funds SS's own tax exactly as before the floor).

/** One §7-clamped working year's pay-check terms (KTD6) — what `simulate.cashTermsForYear` knows of the
 *  year, carried per year on {@link TaxYearInputs.workingYearCheck} beside the floor's
 *  {@link WorkingYearOutsideIncome}. Every figure is real $, finite ≥ 0. Social Security is NOT here: the
 *  year's one paid figure reaches the check through the prepared floor's `ssBenefit` (R11 — no second
 *  Social Security field). */
export interface WorkingYearCheckTerms {
  /** Each person's GROSS pay this year (aligned to the household's people), 0 for anyone not alive and
   *  working — the payroll-tax wages (deferrals stay in, KTD9) and the pay line. */
  readonly wagesByPerson: readonly number[]
  /** The year's ongoing other-income GROSS (pensions and the like, R40's select) — money in. */
  readonly ongoingGross: number
  /** The household's OWN deposits this year (`simulate.ownDepositsForYear`): the match and the employer's
   *  HSA dollar taken out (R7). */
  readonly ownDeposits: number
  /** W_t (R9): W while everyone lives; s + r·(W − s) on a survivor path. */
  readonly workingYearCost: number
  /** The NON-PAY outside income, by part — the clamped ongoing other-income taxable (inside the floor's B)
   *  and the entered investment income I (the floor's I). Read only for a class-based priced state (PA),
   *  whose floor ignores the whole clamped base because its tax on PAY rides in W (R1, KTD18): the check
   *  charges that state's tax on these two itself, since nothing else would. */
  readonly ongoingTaxable: number
  readonly investmentIncome: number
}

/** One clamped year's composed check — every R5 line, the bottom line and the shortfall (real $). */
export interface WorkingYearCashLines {
  /** Σ the living workers' gross pay. */
  readonly pay: number
  /** The year's Social Security as PAID (the floor's `ssBenefit`, the earnings test's figure under W). */
  readonly socialSecurity: number
  /** The ongoing other-income gross. */
  readonly ongoingIncome: number
  /** The year's federal payroll tax, by its three parts (`payrollTaxForYear`). */
  readonly payroll: PayrollTaxYear
  /** The tax the outside income carries by itself: the costliest reading's `baseTax − zeroTax`, plus the
   *  priced state's own — `baseTax − zeroTax` for a state that taxes the clamped base (NC), or a class-based
   *  state's tax on the non-pay outside income (PA; its tax on pay is in W) — never `zeroTax` itself (R6, KTD8). */
  readonly taxOnOutsideIncome: number
  /** `taxOnOutsideIncome` by government — the money picture reads which side a law step can move (A7). */
  readonly taxOnOutsideIncomeParts: { readonly federal: number; readonly state: number }
  readonly ownDeposits: number
  /** W_t. */
  readonly workingYearCost: number
  /** Money in less money out — negative when the year runs short. */
  readonly cash: number
  /** max(0, −cash): added to the year's need (`fundingNet`) and drawn from savings. */
  readonly shortfall: number
}

/** The reading whose base carries the most federal tax by itself — R6's costliest reading (the first, on a
 *  tie). A prepared floor always holds at least one reading. */
function costliestReading(floor: PreparedWorkingYearFloor): WorkingYearReading {
  let costliest = floor.readings[0]!
  for (const reading of floor.readings) if (reading.baseTax > costliest.baseTax) costliest = reading
  return costliest
}

/**
 * The priced state's tax on a clamped year's outside income, BY ITSELF (R6's state pair). A state that
 * prices the clamped base (NC, `federal-agi-derived`: pay, the clamped ongoing taxable and I all sit in
 * its AGI) carries it in the floor already: `baseTax − zeroTax`. A `class-based` state (PA) is different:
 * the floor ignores its whole clamped base, because PA's tax on PAY is the household's to put in W (R1,
 * KTD18; the increment over pay is pay-invariant), so the floor's pair is 0 — and with it PA's tax on the
 * NON-pay outside income, which nothing else charges. Here PA prices that part itself, through the one
 * state primitive: the clamped ongoing taxable and I on its flat, ungated ongoing-income channel (I has no
 * tax character on the wire, and PA taxes interest, dividends and gains alike — the costliest reading). A
 * no-income-tax state is 0. The floor and the gross-up's charge are untouched, so a run without W prices
 * exactly as before.
 */
function stateTaxOnOutsideIncome(terms: WorkingYearCheckTerms, floor: PreparedWorkingYearFloor): number {
  const sf = floor.stateFloor
  if (sf === undefined) return 0
  if (STATE_TAX_PROFILES[sf.state].baseSystem !== 'class-based') return sf.baseTax - sf.zeroTax
  const onNonPay = stateIncomeTax({
    state: sf.state,
    filing: floor.filing,
    calendarYear: floor.calendarYear,
    minLivingAge: sf.minLivingAge,
    pretaxDistribution: 0,
    conversion: 0,
    ongoingTaxable: terms.ongoingTaxable + terms.investmentIncome,
    realizedGain: 0,
    ssBenefitTaxable: 0,
  })
  return onNonPay - sf.zeroTax
}

/**
 * Compose one clamped year's check (R5–R8, KTD6–KTD8) from its terms and the floor the year loop
 * prepared ONCE for it — the same object the gross-up's charge reads, so the take-home and the charge can
 * never disagree on the tax. The payroll tax rides the floor's own filing status and calendar year; the
 * Social Security line is the floor's `ssBenefit` (the year's one paid figure). THROWS when the
 * outside-income tax reads negative beyond dust (every federal and state channel is non-decreasing in
 * income, so a negative is a defect, never a silent credit to the household's cash).
 *
 * The bottom line sums money in, then takes money out in the order R5 lists, so whole-dollar inputs
 * compose exactly; the shortfall is 0 whenever cash ≥ 0 (a −0 never escapes).
 */
export function workingYearCashLines(terms: WorkingYearCheckTerms, floor: PreparedWorkingYearFloor): WorkingYearCashLines {
  let pay = 0
  for (const wages of terms.wagesByPerson) pay += wages
  const payroll = payrollTaxForYear(terms.wagesByPerson, floor.filing, floor.calendarYear)
  const federalOnOutside = costliestReading(floor).baseTax - floor.zeroTax
  const stateOnOutside = stateTaxOnOutsideIncome(terms, floor)
  if (federalOnOutside < WORKING_YEAR_INCREMENT_FLOOR || stateOnOutside < WORKING_YEAR_INCREMENT_FLOOR) {
    throw new Error(
      `[taxOverlay] the tax on a working year's outside income reads negative (federal ${federalOnOutside}, state ${stateOnOutside}) — every channel is non-decreasing in income, so this is a defect, never dust`,
    )
  }
  const taxOnOutsideIncome = federalOnOutside + stateOnOutside
  const socialSecurity = floor.ssBenefit
  const cash =
    pay + socialSecurity + terms.ongoingGross - payroll.total - taxOnOutsideIncome - terms.ownDeposits - terms.workingYearCost
  return {
    pay,
    socialSecurity,
    ongoingIncome: terms.ongoingGross,
    payroll,
    taxOnOutsideIncome,
    taxOnOutsideIncomeParts: { federal: federalOnOutside, state: stateOnOutside },
    ownDeposits: terms.ownDeposits,
    workingYearCost: terms.workingYearCost,
    cash,
    shortfall: cash < 0 ? -cash : 0,
  }
}

/** The pinned law steps between two consecutive working years — see {@link workingYearLawSteps}. */
export interface WorkingYearLawSteps {
  /** The household's priced state taxes at a different flat rate this calendar year than the year before. */
  readonly stateRateStep: boolean
  /** This is the first year past the OBBBA senior bonus's window, and the year before carried a bonus. */
  readonly seniorBonusSunset: boolean
}

/**
 * The pinned law steps that land between two consecutive working years of one household (the working-year
 * money picture's later-year events — the pay check's KTD12, ruled before A7): the one place the picture
 * learns a law's dated step, read from the tables this overlay prices with, never re-typed (the
 * single-source gate holds no years, so a re-typed 2027 would go unseen).
 *  - `stateRateStep`: the floor's priced state takes a different flat rate this calendar year than the year
 *    before (`stateRateForYear`, the schedule the state charge reads: NC's S.L. 2026-41 steps). False for an
 *    unpriced state and for a state without a rate (FL).
 *  - `seniorBonusSunset`: this year sits past the OBBBA senior bonus's window, and the prior year's costliest
 *    reading carried a bonus (so the prior year was inside it) — evaluated at that reading's own MAGI (its
 *    ordinary base, the taxable Social Security beside it and its gain: the MAGI the deduction stack read),
 *    on the return's 65+ count.
 * Whether a step MOVES the household's tax is the caller's to read off the composed lines
 * ({@link WorkingYearCashLines}`.taxOnOutsideIncomeParts`). THROWS when the floors are not consecutive years.
 */
export function workingYearLawSteps(prior: PreparedWorkingYearFloor, floor: PreparedWorkingYearFloor): WorkingYearLawSteps {
  if (floor.calendarYear !== prior.calendarYear + 1) {
    throw new Error(
      `[taxOverlay] workingYearLawSteps compares consecutive years (got ${prior.calendarYear} then ${floor.calendarYear})`,
    )
  }
  const state = floor.stateFloor?.state
  const stateRateStep =
    state !== undefined && stateRateForYear(state, floor.calendarYear) !== stateRateForYear(state, prior.calendarYear)
  let seniorBonusSunset = false
  if (!seniorBonusAvailableIn(floor.calendarYear)) {
    const costliest = costliestReading(prior)
    const { ssTaxable } = federalTaxBesideSs(
      costliest.ordinaryBase,
      costliest.gainBase,
      prior.ssBenefit,
      prior.filing,
      prior.count65,
      prior.calendarYear,
    )
    const magi = costliest.ordinaryBase + ssTaxable + costliest.gainBase
    seniorBonusSunset = seniorBonusFor(prior.filing, prior.count65, magi, prior.calendarYear) > 0
  }
  return { stateRateStep, seniorBonusSunset }
}

/**
 * The pay check's PROBE-ONLY observation hook (KTD7's "prepared exactly once", KTD20's pre-59½ count):
 * optional callbacks the year loop calls as it runs — the first three in §7-clamped years only, the
 * IRMAA one in every year it records. A pure observation — every callback
 * receives values already computed, and a run with the hook is byte-identical to one without. Supplied
 * only by tests and measurement scripts (through `simulate`'s `_workingYearProbe` option or
 * {@link TaxYearInputs._workingYearProbe}); never by product code.
 */
export interface WorkingYearProbe {
  /** The year's floor, the moment it is prepared (once per clamped year per pass). */
  readonly floorPrepared?: (t: number, floor: PreparedWorkingYearFloor) => void
  /** A year carrying the check: the floor its composition read (`===` the one prepared) and its lines. */
  readonly checkComposed?: (t: number, floor: PreparedWorkingYearFloor, lines: WorkingYearCashLines) => void
  /** A checked year's draw, after the allocation: what savings funded and what the pre-tax bucket paid. */
  readonly checkDrawn?: (
    t: number,
    drawn: { readonly shortfall: number; readonly fundingNet: number; readonly grossWithdrawal: number; readonly pretaxDrawn: number },
  ) => void
  /** Every year's IRMAA-MAGI as recorded into the lagged history (healthcare on). */
  readonly irmaaMagiRecorded?: (t: number, irmaaMagi: number) => void
}

function solveGrossWithdrawal(net: number, ctx: GrossUpContext): GrossUpSolution {
  const { drawPool, policy, customOrder, rmd, conversion, taxableBasis, filing, count65, calendarYear, ssBenefit, bracketFillCeiling, ongoingTaxable, retirementState, minLivingAge, workingYear } = ctx
  const taxableValue = drawPool.taxable
  // The working-year floor (2026-10-20), as the year loop prepared it — every baseline is
  // gross-independent. ABSENT (every unclamped / construct-absent / retired-route year) ⇒ undefined ⇒
  // the literal pre-floor branch below, byte-identical.
  const floor = workingYear?.floor
  let gross = net
  for (let pass = 0; pass < GROSS_UP_MAX_PASSES; pass++) {
    const alloc = allocateWithdrawal(drawPool, gross, policy, bracketFillCeiling, customOrder)
    // Cap-gains realization (M5): the taxable draw realizes a pro-rata share of embedded gain.
    // A down-market loss (basis > value) floors at 0 — never a negative gain feeding the tax or
    // provisional income (the §1211 loss offset is OUT-but-disclosed).
    const realizedGain =
      taxableValue > 0 ? Math.max(0, alloc.taxable * (1 - taxableBasis / taxableValue)) : 0
    // Ordinary income = pre-tax distributed (spending-or-RMD, whichever binds) + the conversion
    // (ordinary income, non-RMD-satisfying) + the ongoing other-income taxable (R40 seam 2 — the
    // ONE producer SS-§86 / ACA-MAGI / IRMAA-MAGI all ride, KTD-1) + the taxable portion of SS. The
    // realized gain joins provisional's "other income" (lifting taxable SS) but is taxed at
    // preferential rates inside ordinaryPlusCapitalGainsTax — never folded into the ordinary base.
    const pretaxDistribution = Math.max(alloc.pretax, rmd)
    // Everything the PORTFOLIO supplies as ordinary income this pass. In a clamped working year the
    // outside income (B, I) is never folded in here — it rides the floor below and stays OUT of the
    // returned MagiComponents (KTD6: the IRMAA override already carries pay + investment income, and
    // the KTD-9 feed (3) carries the clamped pension — folding them in would double-count).
    const nonSSordinary = pretaxDistribution + conversion + ongoingTaxable
    let ssBenefitTaxable: number
    let nextGross: number
    if (floor === undefined) {
      // Surface the taxable-SS local (M3): the identical value + call as before, so `nextGross` stays
      // byte-identical — now also fed to the returned MagiComponents so acaMagi reads the FLOORED
      // converged locals (never recomputed off a raw-gain ledger; the named sign-inversion).
      ssBenefitTaxable = taxableSocialSecurity(nonSSordinary + realizedGain, ssBenefit, filing, calendarYear)
      const ordinaryIncome = nonSSordinary + ssBenefitTaxable
      // The state income tax (the state-tax unit) folds in as a SECOND ADDEND beside the federal tax —
      // INSIDE the fixed point, so the gross is solved to net `net` AFTER both taxes jointly, never
      // bolted on after convergence. MEMBERSHIP-keyed on `isPricedState` (the red-team fold): absent /
      // `'elsewhere'` / an unbuilt roster code take the LITERAL `+ 0` STRUCTURALLY (the module is never
      // called), so the non-state path is byte-identical to the pre-state expression `net + federalTax`
      // and the reduce-to-spine float lineage is untouched. A priced state's own base is assembled from
      // these converged channels (NC folds SS out + gains into ordinary; PA age-gates the distribution +
      // conversion; FL is a structural 0) — the state term rides WITHOUT the SS torpedo (k re-derivation
      // above). The k_total ≈ 0.78 contraction still converges within GROSS_UP_MAX_PASSES.
      const federalTax = ordinaryPlusCapitalGainsTax(ordinaryIncome, realizedGain, filing, count65, calendarYear)
      nextGross = net + federalTax
      if (retirementState !== undefined && isPricedState(retirementState)) {
        nextGross += stateIncomeTax({
          state: retirementState,
          filing,
          calendarYear,
          pretaxDistribution,
          conversion,
          ongoingTaxable,
          realizedGain,
          ssBenefitTaxable,
          minLivingAge,
        })
      }
    } else {
      // A clamped working year: the portfolio funds what its own income adds on top of the outside
      // income, plus SS's own tax (KTD1 × KTD11), federal and priced-state alike (KTD7). The taxable SS
      // the components carry rides the provisional that holds the year's whole AGI (KTD6).
      const federal = workingYearFederalCharge(floor, nonSSordinary, realizedGain)
      ssBenefitTaxable = federal.ssTaxable
      nextGross = net + federal.tax
      if (floor.stateFloor !== undefined) {
        nextGross += workingYearStateCharge(floor, {
          pretaxDistribution,
          conversion,
          ongoingTaxable,
          realizedGain,
          ssBenefitTaxable,
        })
      }
    }
    if (Math.abs(nextGross - gross) < GROSS_UP_EPSILON) {
      // Components key off THIS converging pass's gross (pre-update); the |nextGross − gross| < 1e-7
      // lag is sub-penny — far below the dollar grid the M3 cliff branch quantizes to. Do NOT
      // recompute at nextGross (an extra pass whose .gross could be returned by mistake — byte risk).
      return {
        gross: nextGross,
        components: { nonSSordinary, realizedGain, ssBenefitFull: ssBenefit, ssBenefitTaxable },
      }
    }
    gross = nextGross
  }
  throw new Error(
    `tax gross-up did not converge in ${GROSS_UP_MAX_PASSES} passes (net=${net}, rmd=${rmd}, ss=${ssBenefit}, conversion=${conversion}` +
      (workingYear !== undefined
        ? `, working-year ordinaryBase=${workingYear.outside.ordinaryBase}, investmentIncome=${workingYear.outside.investmentIncome}`
        : '') +
      `) — refusing an unconverged tax (burned/062)`,
  )
}

/**
 * HOW THIS ENGINE PRICES THE PART-B PREMIUM ACROSS YEARS — the U14 trend-consumption witness.
 *
 * `'trended'` (the trend sourcing unit, 2026-07-19 — council wf_c673339e-257): the base Part B
 * premium is a PER-YEAR real dollar — `buildPartBPricingSchedule(medicareCostTrend.value, …)`
 * through healthOverlay's ONE binding (`boundPartBPricingSchedule`), built once per run inside
 * {@link runTaxAwareDecumulation} (the bill; the step card reads a later bill's scales through the
 * same binding — `irmaaBillScalesFor`), V.E2's nominal
 * premiums deflated horizon-matched with the ultimate real escalator beyond the table. The IRMAA
 * Part B surcharges scale with the trended base (the statutory cost-share identity); Part D
 * surcharges are trended PER TIER from Table V.E4 through the 2035 edge and HOLD their edge-year
 * real level beyond it, DISCLOSED (never Part B's ratio). Real-flat under-penalized late-year IRMAA cliff-crossing — the exact payoff channel
 * of Roth-conversion candidates (architecture §7.2; the Act-4 reconciliation supersession item 4).
 *
 * The U14 oracle token reads THIS value as the consumption half of its Medicare-trend block:
 * the conversion ranking was withheld until `health.medicareCostTrend` was SOURCED **and** the
 * pricing here actually consumed it (insight 074 — a stamp nothing reads prices nothing). This
 * flip landed in the SAME change that threads the sourced trend into the per-year premium —
 * flipping the label without the pricing change is the lying-mirror shape (insight 081) and the
 * token's planted-witness test (a fake-sourced entry with an unmoved mode must still block)
 * guards the pair in both directions.
 */
export const PART_B_PRICING_MODE: 'real-flat' | 'trended' = 'trended'

/**
 * Run a tax-aware decumulation path. Tracks per-bucket balances + the taxable cost basis for the
 * tax computation while advancing the authoritative TOTAL through the shared {@link stepYear}, so
 * the total trajectory matches the spine byte-for-byte under the OFF condition.
 *
 * The return/withdrawal arrays are indexed by ABSOLUTE year and the net-withdrawal length is the
 * horizon (the aligned-length contract `runDecumulation` uses). `taxInputs` carries the per-year SS
 * + conversion streams and the initial taxable basis (see {@link TaxYearInputs}) — read ONLY when
 * tax is ON, so with tax OFF the overlay reduces byte-identically to the spine regardless of them.
 *
 * WITHIN-YEAR ORDER (M5): RMD → conversion → spending draw.
 *   1. RMD (M2): forced, non-convertible, from the prior-year-end pre-tax balance.
 *   2. Conversion (M5): clamped to `[0, priorYearEndPretax − rmd]` (RMD reserved first — the RMD is
 *      non-convertible) and relocated pre-tax→roth in the DRAW-TIME buckets BEFORE the spending
 *      allocation, so the spending draw can never re-claim the converted pre-tax (no double-spend).
 *      The clamp uses the prior-year-end pre-tax (gross-independent) so the conversion is a CONSTANT
 *      inside the fixed point — it never couples the iteration into 2-D.
 *   3. Spending draw (M3/M4): the gross-up fixed point over the conversion-reduced pool.
 * Both the RMD relocation and the conversion are intra-portfolio, so the only money that LEAVES is
 * the grossed-up spending+tax `drawn` (via stepYear); the bucket sum always reconciles to the total.
 *
 * (When M6 wires the overlay into `simulate.ts`, the spine supplies `netWithdrawals` — spending net
 * of SS — alongside these inputs as independent per-year streams.)
 */
export function runTaxAwareDecumulation(
  initialBuckets: AccountBuckets,
  realStockReturns: readonly number[],
  realBondReturns: readonly number[],
  netWithdrawals: readonly number[],
  stockWeight: number,
  policy: DrawdownPolicy,
  config: TaxOverlayConfig,
  taxInputs: TaxYearInputs = {},
  /** P3·U10 — the user's own bucket order, REQUIRED iff `policy === 'custom'` (validated at
   *  `validateParams`; allocateWithdrawal fail-louds for a direct caller). Trails the optional
   *  `taxInputs` so every existing call site is byte-identical untouched; read by BOTH
   *  allocation sites (the gross-up loop AND the tax-off ledger — the ledger allocates under
   *  every config, so this cannot live in the tax-ON-only `TaxYearInputs`). */
  customOrder?: readonly GeneralBucketKey[],
): TaxAwareResult {
  const {
    ssBenefits = [],
    conversions = [],
    initialTaxableBasis,
    householdYears = [],
    bracketFillCeilings = [],
    initialPretaxByPerson,
    healthcareEnabled = false,
    enhancedSubsidies = false,
    slcsp = [],
    enrolledPremium = [],
    irmaaMagiSeed = [],
    medicareOnsetSimYear,
    irmaaMagiOverride = [],
    medicareExtrasMonthly,
    bridgeYearMask = [],
    oopMedical = [],
    hsaOwnerIndex,
    contributions = [],
    ongoingTaxableGrossUp = [],
    ongoingTaxableIrmaaOnly = [],
    workingYearOutsideIncome = [],
    workingYearCheck = [],
    _workingYearProbe: probe,
    balancesOut,
    healthOut,
  } = taxInputs

  // Healthcare requires tax (U3 · M3 Slice 4): the ACA PTC keys off ACA-MAGI, which this engine
  // derives ONLY from the tax gross-up's converged components — so pricing ACA with tax OFF is
  // incoherent (there is no gross-up to read MAGI from). validateParams shields `simulate`; this is
  // the overlay's own fail-loud backstop for a direct caller — a silent premium drop is the unsafe,
  // survival-overstating direction, never the calm-but-wrong sin (burned/062).
  if (healthcareEnabled && !config.taxEnabled) {
    throw new Error(
      '[taxOverlay] healthcareEnabled requires taxEnabled — the ACA PTC is MAGI-driven and MAGI comes from the tax solver',
    )
  }

  // The state-tax unit's overlay fail-loud backstop (the "BOTH validateParams AND the overlay
  // backstop" discipline). validateParams shields `simulate`; THIS protects a direct P3/P4 caller.
  // An out-of-vocabulary retirementState crossing the boundary must THROW — NOT silently take the
  // unpriced `+ 0` branch: a corrupted `'NC'` that arrived as garbage would silently drop the state
  // tax, UNDERSTATING tax for a household that meant a priced state (the survival-overstating,
  // calm-but-wrong direction; burned/062). A recognised roster code (including an unbuilt one) and
  // `'elsewhere'` pass — they are legitimately unpriced (the byte-identical `+ 0` branch); ABSENT is
  // the disclosed-out default. Only the ON config carries a household (the OFF anchor has none).
  if (config.taxEnabled || config.rmdEnabled) {
    const sc = config.household.retirementState
    if (sc !== undefined && !isRetirementState(sc)) {
      throw new Error(
        `[taxOverlay] household.retirementState "${sc}" is not a known roster state or "elsewhere" — an out-of-vocabulary value would silently take the unpriced +0 branch, understating tax for a household that meant a priced state (burned/062)`,
      )
    }
  }

  // Overlay fail-loud backstop for the health cost streams (the "BOTH validateParams AND the overlay
  // backstop" discipline — mirroring initialPretaxByPerson/initialTaxableBasis below). validateParams
  // shields `simulate`; THIS protects a direct caller (a future P3 control / P4 solver). A PRESENT
  // non-finite / negative entry is a misconfiguration → throw, never let the per-year `> 0` predicate
  // silently route it to the no-ACA branch — an un-priced premium UNDERSTATES cost → overstates
  // survival (the calm-but-wrong sin); and for +Infinity the predicate would otherwise SUPPRESS the
  // ACA solver's own R19 throw. An ABSENT / short entry stays legitimate (no marketplace coverage that
  // year — employer / COBRA / spouse plan), so `.every` (which skips holes) is exactly the right shape.
  if (healthcareEnabled) {
    if (!enrolledPremium.every((x) => Number.isFinite(x) && x >= 0)) {
      throw new Error(
        '[taxOverlay] enrolledPremium entries must be finite and ≥ 0 — a non-finite premium is silently un-priced by the per-year predicate (the cost-understating, survival-overstating direction; burned/062, insight 010)',
      )
    }
    if (!slcsp.every((x) => Number.isFinite(x) && x >= 0)) {
      throw new Error('[taxOverlay] slcsp entries must be finite and ≥ 0 (burned/062)')
    }
    // The extras vector (the ask-for-Medicare-extras unit): finite ≥ 0 per entry — a negative
    // entry inside the funding Σ silently shrinks a sibling's charge (insight 046's netted-away
    // class, the optimistic direction); a NaN would silently un-price a member's extras.
    if (medicareExtrasMonthly !== undefined && !medicareExtrasMonthly.every((x) => Number.isFinite(x) && x >= 0)) {
      throw new Error('[taxOverlay] medicareExtrasMonthly entries must be finite and ≥ 0 (insights 008/010/046; burned/062)')
    }
    // COVERAGE (mirror validateParams' frontline gate — the "fail-loud at BOTH layers" discipline):
    // a PRICED year (finite enrolled > 0) needs a finite §36B benchmark. `.every` above SKIPS holes, so
    // it does NOT catch a missing slcsp[t] in a priced year — without this loop a direct caller (P3/P4)
    // hits the per-year `slcsp[t] ?? NaN` → the solver's mid-path R19 throw instead of this descriptive
    // up-front backstop. (slcsp[t] = 0 stays the EXPLICIT no-subsidy value; ABSENT is the error.) U3-exit pilot.
    for (let t = 0; t < enrolledPremium.length; t++) {
      const e = enrolledPremium[t]
      if (e !== undefined && Number.isFinite(e) && e > 0 && !Number.isFinite(slcsp[t]))
        throw new Error('[taxOverlay] slcsp must cover every enrolled-premium year — a priced year needs a finite §36B benchmark (burned/062)')
    }
  }

  // C3 §3b — the onset / override / mask streams, guarded like their siblings (the "BOTH
  // validateParams AND the overlay backstop" discipline; insights 008/010 finiteness-FIRST).
  // The onset is a SIM-YEAR index: finite INTEGER, any sign (≤ 0 = enrolled pre-sim); a NaN
  // would make `t >= onset` false forever — a silently never-enrolled member (zero Medicare
  // cost, the optimistic direction). The override is a real-dollar MAGI: finite ≥ 0, holes
  // legal (`.every` skips them — coverage is the validateParams arms' job). The mask is
  // booleans (holes legal = not a bridge year).
  if (medicareOnsetSimYear !== undefined && !medicareOnsetSimYear.every((x) => Number.isInteger(x))) {
    throw new Error(
      '[taxOverlay] medicareOnsetSimYear entries must be finite integers (sim-year indices) — a NaN onset silently never-enrolls a member (insight 010)',
    )
  }
  if (!irmaaMagiOverride.every((x) => Number.isFinite(x) && x >= 0)) {
    throw new Error('[taxOverlay] irmaaMagiOverride entries must be finite and ≥ 0 (insights 008/010; burned/062)')
  }
  if (!bridgeYearMask.every((x) => typeof x === 'boolean')) {
    throw new Error('[taxOverlay] bridgeYearMask entries must be booleans (a truthy non-boolean is a mis-built mask)')
  }
  // R40 — the two ongoing-income taxable feeds, guarded like their siblings (the "BOTH validateParams
  // AND the overlay backstop" discipline; insights 008/010 finiteness-FIRST). Both are real-dollar
  // taxable amounts: finite ≥ 0, NO +Infinity sentinel; holes legal (`.every` skips them — a $0 year).
  // A PRESENT NaN/Infinity/negative is a misconfiguration → throw: a NaN in the gross-up feed would
  // poison `nonSSordinary` and never converge (an uncaught throw), and a NaN in the IRMAA-only feed
  // would poison the surcharge tier compare (a relational guard a NaN sails through silently).
  // validateParams shields `simulate`; this protects a direct caller (a future P3 control / P4 solver).
  if (!ongoingTaxableGrossUp.every((x) => Number.isFinite(x) && x >= 0)) {
    throw new Error('[taxOverlay] ongoingTaxableGrossUp entries must be finite and ≥ 0 (insights 008/010; burned/062)')
  }
  if (!ongoingTaxableIrmaaOnly.every((x) => Number.isFinite(x) && x >= 0)) {
    throw new Error('[taxOverlay] ongoingTaxableIrmaaOnly entries must be finite and ≥ 0 (insights 008/010; burned/062)')
  }
  // The working-year tax floor (2026-10-20, R8) — the overlay's own backstop, finiteness FIRST
  // (insights 008/010: a NaN sails through every compare and `?? 0`). A hole is an unclamped year
  // (`.every` skips it, and an explicit `undefined` is the same reading); a PRESENT entry is two
  // finite ≥ 0 dollars. Then the wiring cross-check: under the construct the bridge mask IS the §7
  // clamp (`∃` a living worker — `simulate`'s mask predicate is `(earned > 0 || accumulating) && t <
  // retire && alive`), so an entry off the mask or a masked year with no entry is a wiring fault —
  // and a silently missing entry is the wage-blind, optimistic year this floor exists to close.
  if (
    !workingYearOutsideIncome.every(
      (e) =>
        e === undefined ||
        (Number.isFinite(e.ordinaryBase) && e.ordinaryBase >= 0 && Number.isFinite(e.investmentIncome) && e.investmentIncome >= 0),
    )
  ) {
    throw new Error('[taxOverlay] workingYearOutsideIncome entries must be finite and ≥ 0 in both fields (insights 008/010; burned/062)')
  }
  if (config.taxEnabled) {
    const constructMarker = taxInputs.contributions !== undefined
    if (!constructMarker && workingYearOutsideIncome.some((e) => e !== undefined)) {
      throw new Error(
        '[taxOverlay] a workingYearOutsideIncome entry needs the accumulation construct (contributions) — the floor describes a §7-clamped year, and there is no clamp without the construct',
      )
    }
    if (constructMarker && taxInputs.bridgeYearMask !== undefined) {
      for (let t = 0; t < netWithdrawals.length; t++) {
        const masked = bridgeYearMask[t] === true
        const floored = workingYearOutsideIncome[t] !== undefined
        if (masked !== floored) {
          throw new Error(
            `[taxOverlay] sim year ${t} is ${masked ? 'a clamped working year with no' : 'not a clamped working year but carries a'} workingYearOutsideIncome entry — under the construct the bridge mask is the §7 clamp, so this is a wiring fault (a dropped floor prices the year wage-blind, the optimistic direction; R8)`,
          )
        }
      }
    }
  }
  // The pay check's backstop (KTD16 — the floor's R8 arms, mirrored; finiteness FIRST, insights 008/010).
  // A present entry is finite ≥ 0 in every field — a NaN would sail through the `cash < 0` compare and
  // silently zero the shortfall. Then the wiring: an entry needs tax on (no tax, no payroll or income tax
  // to charge) and the construct marker (no clamp to describe), and a SUPPLIED stream must carry an entry
  // in exactly the floor's years (the floor's own check ties those to the bridge mask). A floored year with
  // no entry silently drops its shortfall; an entry with no floor has no tax to read.
  if (
    !workingYearCheck.every(
      (e) =>
        e === undefined ||
        (e.wagesByPerson.every((w) => Number.isFinite(w) && w >= 0) &&
          [e.ongoingGross, e.ownDeposits, e.workingYearCost, e.ongoingTaxable, e.investmentIncome].every((x) => Number.isFinite(x) && x >= 0)),
    )
  ) {
    throw new Error('[taxOverlay] workingYearCheck entries must be finite and ≥ 0 in every field (insights 008/010; burned/062)')
  }
  if (taxInputs.workingYearCheck !== undefined) {
    const checkedSomewhere = workingYearCheck.some((e) => e !== undefined)
    if (checkedSomewhere && !config.taxEnabled) {
      throw new Error(
        '[taxOverlay] a workingYearCheck entry needs tax on — the check charges the payroll tax and the tax on the outside income, so a tax-off run cannot run it',
      )
    }
    if (checkedSomewhere && taxInputs.contributions === undefined) {
      throw new Error(
        '[taxOverlay] a workingYearCheck entry needs the accumulation construct (contributions) — the check describes a §7-clamped year, and there is no clamp without the construct',
      )
    }
    for (let t = 0; t < netWithdrawals.length; t++) {
      const floored = workingYearOutsideIncome[t] !== undefined
      const checked = workingYearCheck[t] !== undefined
      if (floored !== checked) {
        throw new Error(
          `[taxOverlay] sim year ${t} ${floored ? 'is a clamped working year with no' : 'is not a clamped working year but carries a'} workingYearCheck entry — the check runs in exactly the floor's years, so this is a wiring fault (a dropped check silently skips the year's shortfall, the rosy direction; KTD16)`,
        )
      }
    }
  }

  // The ACA applicable-% table is year-invariant; select it ONCE per run. `enhanced` = the ARPA/IRA
  // no-cliff regime (flat 8.5% open top band), absent/false = the statutory 400%-FPL cliff regime.
  // `undefined` when healthcare is off — which doubles as the per-year "price ACA this year?" gate
  // (and narrows the table type at the solver call site).
  const acaTable: AcaApplicablePercentageTable | undefined = healthcareEnabled
    ? enhancedSubsidies
      ? acaApplicablePercentageEnhanced.value
      : acaApplicablePercentage.value
    : undefined
  let totalNetPremiumReal = 0

  // IRMAA (M4): the post-65 Medicare cost is a 2-year-LAGGED feed-forward (research §4c), NOT a fixed
  // point. The schedule + the lookback length are run-invariant; bind them once. The lookback is READ
  // from the constant (never a hard-coded 2). `irmaaMagiHistory[t]` records this engine's IRMAA-MAGI at
  // every healthcare-on year's converged gross — EVEN pre-65 years, whose MAGI feeds a later Medicare
  // year's surcharge (the lagged feed-forward); for t < lookback the lagged year predates the sim, so
  // the surcharge reads `irmaaMagiSeed` instead. acaTable !== undefined IS the healthcare gate, so when
  // healthcare is off none of this runs and reduce-to-spine is untouched.
  //
  // THE PART-B TREND (the trend sourcing unit — PART_B_PRICING_MODE 'trended'): the base premium is
  // NO LONGER one run-invariant scalar — `partBPricingByT[t]` carries each sim year's REAL premium +
  // the disaggregated IRMAA surcharge scales, derived from the sourced `medicareCostTrend` table
  // (V.E2 verbatim, horizon-matched deflation, ultimate tail; healthOverlay owns the derivation).
  // The anchor is STILL `partB2026.standardPremiumMonthly` (one home; V.E2[2026] identity pinned).
  // The billed total and the readout split's surcharge come from ONE tier lookup at the SAME per-year
  // entry (`medicareChargeForYear` → `medicareAnnualCharge`) — base = cost − surcharge is exact by construction.
  const irmaaSchedule = irmaa.value
  const irmaaLookback = irmaaSchedule.magiLookbackYears
  // Bound ONLY on the healthcare-priced arm: the tax-off / healthcare-off runs never touch the
  // trend (reduce-to-spine byte-identity untouched), and `config.household` only exists on the
  // tax-on config member. Reachability of the `!` at the use site is guaranteed by the
  // `healthcareEnabled requires taxEnabled` throw above (taxOverlay's own M3-Slice-4 gate).
  // The ONE binding (`boundPartBPricingSchedule`) — the step card prices a later bill's crossing
  // through the same one (`irmaaBillScalesFor`), so the readout and this bill never disagree.
  const partBPricingByT =
    healthcareEnabled && config.taxEnabled
      ? boundPartBPricingSchedule(config.household.startCalendarYear, netWithdrawals.length)
      : undefined
  const irmaaMagiHistory: number[] = []
  let totalMedicareCostReal = 0
  let totalQualifiedHsaSpendReal = 0
  let totalTaxPaidReal = 0

  // Initial taxable basis is REQUIRED when tax is on and the taxable bucket is non-empty — there
  // is no safe default (0 over-taxes every realization; the full value silently no-ops cap-gains),
  // so an absent basis fails loud (burned/062). When the taxable bucket starts empty, basis is 0
  // and only RMD relocations (already-taxed, full-basis dollars) can build it.
  // Finiteness UNCONDITIONALLY when present (mirror of validateParams) — NOT gated on taxable > 0. A NaN
  // basis with an EMPTY starting taxable bucket otherwise slips both gates, sits dormant (year 0's
  // realizedGain short-circuits on taxableValue === 0), then poisons the gross-up once an RMD relocation
  // rebuilds the taxable bucket (`?? 0` below does not coalesce NaN — insight 008/010). (U3-exit pilot.)
  if (initialTaxableBasis !== undefined && !(Number.isFinite(initialTaxableBasis) && initialTaxableBasis >= 0)) {
    throw new Error('[taxOverlay] initialTaxableBasis must be finite and ≥ 0 (a NaN survives `?? 0` — insight 008/010)')
  }
  if (config.taxEnabled && initialBuckets.taxable > 0 && initialTaxableBasis === undefined) {
    throw new Error(
      '[taxOverlay] initialTaxableBasis is required when tax is on and the taxable bucket is ' +
        'non-empty — no in-range default for a figure that moves the answer (burned/062)',
    )
  }

  // The hsa bucket (U3 · M5): finiteness UNCONDITIONALLY when present (the same mirror-of-
  // validateParams footing as the basis guard above) — a NaN hsa poisons the hsa-inclusive
  // total AND the general-depletion compare, both relational guards a NaN sails through
  // (insights 008/010). validateParams shields `simulate`; this is the direct-caller backstop.
  if (initialBuckets.hsa !== undefined && !(Number.isFinite(initialBuckets.hsa) && initialBuckets.hsa >= 0)) {
    throw new Error('[taxOverlay] buckets.hsa must be finite and ≥ 0 (a NaN survives every relational guard — insight 010)')
  }
  // The oopMedical stream (U3 · M5): finite ≥ 0 when present — a NaN/Infinity entry would poison the
  // qualified-spend cap's Math.min (NaN propagates; +Infinity would un-cap it). A real dollar cost has
  // NO +Infinity sentinel (mirror slcsp/enrolledPremium, NOT bracketFillCeilings). `.every` skips holes
  // — an absent/short stream is the legitimate no-OOP default (cap-only; burned/062's absent-⇒-default).
  if (!oopMedical.every((x) => Number.isFinite(x) && x >= 0)) {
    throw new Error('[taxOverlay] oopMedical entries must be finite and ≥ 0 (insights 008/010; burned/062)')
  }
  // bracketFillCeilings (M5 boundary review): the one stream the per-year loop consumes UNCONDITIONALLY
  // (even tax OFF), yet it had a frontline guard only (validateParams) — no overlay backstop. A PRESENT
  // NaN survives `?? +Infinity`, NaN-poisons the allocation, and with tax OFF silently zeroes the ledger
  // (`NaN > 0` is false → the EMPTY else-branch); with a live hsa the general-depletion guard then reads
  // that zeroed ledger as a real shortfall → a FALSE depletion (terminal 0) on a healthy portfolio — a
  // wrong HEADLINE, not just a cosmetic ledger. Same rule as validateParams: finite ≥ 0 OR the explicit
  // +Infinity no-ceiling sentinel; `.every` skips holes (an absent year IS the no-ceiling default).
  if (!bracketFillCeilings.every((c) => (Number.isFinite(c) && c >= 0) || c === Number.POSITIVE_INFINITY)) {
    throw new Error(
      '[taxOverlay] bracketFillCeilings entries must be finite ≥ 0 or +Infinity (the no-ceiling sentinel) — a NaN silently zeroes the ledger and falsifies the headline under a live hsa (insights 008/010)',
    )
  }
  // netWithdrawals (M5 boundary review): the draw stream itself was the ONE caller-supplied input with
  // no overlay backstop. A negative entry is silently MINTED INTO the portfolio (stepYear adds it; the
  // scale then smears the phantom inflow pro-rata into every bucket — the medical-earmarked hsa
  // included); a NaN sails to a NaN terminal with NEVER_DEPLETED (survival overstated, the cardinal
  // direction). simulate can never produce either — `cashTermsForYear` clamps the household net at 0
  // ("never a contribution back"); contributions land as an explicit modeled feature (the accumulation
  // plan's §2/§7 signed inflow term), never as a negative draw. Guard the direct caller loudly.
  if (!netWithdrawals.every((x) => Number.isFinite(x) && x >= 0)) {
    throw new Error(
      '[taxOverlay] netWithdrawals entries must be finite and ≥ 0 — a negative draw would mint money into the portfolio (simulate clamps at 0 in cashTermsForYear; contributions are the accumulation plan’s explicit signed term, never a negative withdrawal)',
    )
  }
  // C2: the contribution inflow stream — the overlay's own fail-loud backstop (the "BOTH
  // validateParams AND the overlay backstop" discipline). Finiteness FIRST on every entry
  // (insights 008/010 — a NaN sails through `?? 0`, every relational compare, AND the
  // hsa-liveness `> 0` below, then poisons the stepYear credit / the ledger / the basis).
  // A NEGATIVE entry would be a disguised withdrawal that bypasses the draw allocation —
  // rejected, never coerced (burned/062). Holes/short entries stay legitimate ($0 years).
  // The assembled SUMS are checked too (the wave-2 numerical adversary's catch): two finite
  // per-slot entries can sum to +Infinity (1.5e308 + 1.5e308), and an Infinity that reaches
  // stepYear rides to a non-finite terminal reported as SURVIVED — per-entry finiteness alone
  // does not bound the credit.
  const finiteNonNegC = (x: number) => Number.isFinite(x) && x >= 0
  for (const c of contributions) {
    if (c === undefined) continue
    const channels = [c.taxableByPerson, c.pretaxByPerson, c.rothByPerson, c.hsaByPerson]
    if (!channels.every((ch) => ch.every(finiteNonNegC))) {
      throw new Error(
        '[taxOverlay] contributions entries must be finite and ≥ 0 in every channel — a NaN poisons the end-of-year credit and a negative is a disguised withdrawal bypassing the draw allocation (insights 008/010; burned/062)',
      )
    }
    const yearTotal = channels.reduce((acc, ch) => acc + ch.reduce((a, b) => a + b, 0), 0)
    if (!Number.isFinite(yearTotal)) {
      throw new Error(
        '[taxOverlay] a year’s ASSEMBLED contribution total is non-finite — finite entries can still overflow their sum, and an Infinity credit would ride to a non-finite terminal reported as survived (the calm-but-wrong-optimistic escape; insights 008/010)',
      )
    }
  }

  // HSA liveness is a RUN-level constant (U3 · M5): the 4th-bucket semantics (the owner requirement,
  // the general-depletion check, the qualified-spend mechanics) exist only when the run can EVER
  // hold HSA dollars. C2 RE-DERIVED the property (the M5 forward landmine, resolved here): the M5
  // premise "the hsa has no inflows, so the initial balance covers every year" breaks once the
  // accumulation construct can land HSA CONTRIBUTIONS mid-run — a run starting at hsa = 0 with a
  // positive hsa inflow would otherwise leave the spend mechanics + the general-depletion guard
  // dark (silent, optimistic). The gate is on the PROPERTY — "can the run ever hold hsa dollars"
  // — not on any one consumer (insight 020): initial balance > 0 OR any year's hsa inflow > 0.
  // A zero-valued/absent contribution stream leaves the M5 derivation verbatim (no inflow can
  // arrive ⇒ monotone non-increasing balance ⇒ initial-balance gating still covers every year),
  // so hsa absent/0 with no inflow stays byte-identical to the 3-bucket overlay by construction.
  const hsaLive =
    (initialBuckets.hsa ?? 0) > 0 ||
    contributions.some((c) => c !== undefined && c.hsaByPerson.some((x) => x > 0))

  // Per-person pre-tax sub-ledger (M6b·B). Active ONLY when the caller supplies the per-person
  // split AND the overlay does work (tax or RMD on) — otherwise null, and the aggregate M6a path
  // runs verbatim (reduce-to-spine + every M1–M6a fixture byte-identical). The split must sum to
  // the aggregate pre-tax (no silent reconciliation; burned/062 fail-loud) and align to the
  // household's canonical people.
  // Narrow the config union to its `household` once (the ON variant carries it; OFF does not).
  const household = config.taxEnabled || config.rmdEnabled ? config.household : undefined
  const people = household ? canonicalPeople(household) : []

  // The HSA owner identity (U3 · M5): the 65+ Medicare-premium spend privilege keys to the OWNER's
  // age (never the spouse's), so with a live hsa under tax the identity MOVES THE ANSWER — REQUIRED,
  // never defaulted to person 0 (an in-range default is exactly burned/062's sin: a spouse-owned HSA
  // would borrow the older owner's age and turn the privilege on early — the optimistic direction).
  // Membership is validated whenever checkable (a household exists); the index aligns to the
  // canonical people (owner = 0, spouse = 1 — the M6b convention). validateParams mirrors both.
  if (hsaOwnerIndex !== undefined && household) {
    if (!Number.isInteger(hsaOwnerIndex) || hsaOwnerIndex < 0 || hsaOwnerIndex >= people.length) {
      throw new Error(
        `[taxOverlay] hsaOwnerIndex must be an integer index into the household's canonical people (got ${hsaOwnerIndex}, people: ${people.length})`,
      )
    }
  }
  // The onset aligns to the CANONICAL people (owner = 0, spouse = 1 — the M6b alignment, the
  // same rule as initialPretaxByPerson): a short array silently never-enrolls the spouse, a
  // long one carries slots no person owns — reject, never re-index (burned/062).
  if (medicareOnsetSimYear !== undefined && household && medicareOnsetSimYear.length !== people.length) {
    throw new Error(
      `[taxOverlay] medicareOnsetSimYear has ${medicareOnsetSimYear.length} entries but the household has ${people.length} people — never silently re-indexed`,
    )
  }
  // The extras vector aligns to the SAME canonical people (the F3 heterogeneous vector — its
  // consumer indexes it by enrolled person): `.every` skips holes, so a SHORT vector passes the
  // finiteness backstop above while silently $0-ing the missing member's extras — the
  // cost-understating, survival-overstating direction. validateParams already gates this at the
  // frontline (R19); this is the onset/pretax siblings' fail-loud second layer for direct
  // callers, folded by the extras ultramode review (2026-07-12) as the one sibling stream
  // missing it. Purely downstream of the existing gate — no insight-076 contract narrowing.
  if (medicareExtrasMonthly !== undefined && household && medicareExtrasMonthly.length !== people.length) {
    throw new Error(
      `[taxOverlay] medicareExtrasMonthly has ${medicareExtrasMonthly.length} entries but the household has ${people.length} people — never silently re-indexed`,
    )
  }
  if (config.taxEnabled && hsaLive && hsaOwnerIndex === undefined) {
    throw new Error(
      '[taxOverlay] hsaOwnerIndex is required when tax is on and the hsa bucket is non-empty — ' +
        'the 65+ Medicare-premium privilege keys to the OWNER’s age, no in-range default (burned/062)',
    )
  }
  const hsaOwnerPerson = hsaOwnerIndex !== undefined ? people[hsaOwnerIndex] : undefined

  let pretaxLedger: number[] | null = null
  if (initialPretaxByPerson !== undefined && household) {
    // Finiteness FIRST (insight 008): a NaN entry survives the sum guard below —
    // `Math.abs(NaN − x) > tol` is `false`, so the throw would NOT fire and the NaN would poison
    // the per-person ledger (tax off → NaN buckets) or run the gross-up to its fail-loud pass-cap throw (tax
    // on). validateParams shields `simulate`, but this is the engine's own fail-loud backstop for a
    // direct caller (a future P3 control / P4 solver computing a split by arithmetic). Reject
    // non-finite / negative entries loudly — never coerce (burned/062).
    if (!initialPretaxByPerson.every((x) => Number.isFinite(x) && x >= 0)) {
      throw new Error('[taxOverlay] initialPretaxByPerson entries must be finite and ≥ 0 (a NaN survives the sum guard — insight 008)')
    }
    if (initialPretaxByPerson.length !== people.length) {
      throw new Error(
        `[taxOverlay] initialPretaxByPerson has ${initialPretaxByPerson.length} entries but the household has ${people.length} people`,
      )
    }
    const sum = initialPretaxByPerson.reduce((a, b) => a + b, 0)
    if (Math.abs(sum - initialBuckets.pretax) > 1e-6 * Math.max(1, Math.abs(initialBuckets.pretax))) {
      throw new Error(
        `[taxOverlay] initialPretaxByPerson must sum to the aggregate pre-tax ${initialBuckets.pretax} (got ${sum}) — no silent reconciliation (burned/062)`,
      )
    }
    pretaxLedger = [...initialPretaxByPerson]
  }

  let buckets = initialBuckets
  let basis = initialTaxableBasis ?? 0
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

    // C2: this year's contribution inflow (auxiliary stream — a missing entry is a $0 year).
    // Each per-person channel collapses once here; every downstream read is a plain local, and
    // with no contributions all five are EXACTLY 0, so every `x + 0` fold below is an IEEE
    // no-op (reduce-to-spine). The up-front backstop has already proven every entry and every
    // assembled sum finite.
    const sumC = (xs: readonly number[] | undefined) =>
      xs === undefined ? 0 : xs.reduce((a, b) => a + b, 0)
    const yearC = contributions[t]
    const cTaxable = sumC(yearC?.taxableByPerson)
    const cPretaxTotal = sumC(yearC?.pretaxByPerson)
    const cRoth = sumC(yearC?.rothByPerson)
    const cHsa = sumC(yearC?.hsaByPerson)
    const contributionTotal = cTaxable + cPretaxTotal + cRoth + cHsa

    // Per-year household regime (M6a): the survivor-aware filing / 65+ count / RMD-owner, from the
    // injected stream when present, else the static household (verbatim M1–M5) — plus the calendar
    // year, the priced state and the living-age floor, all from the one context producer. Resolved only
    // when the overlay is active (tax or RMD on ⇒ the ON config carries `household`); under the
    // EXHAUSTIVE OFF condition it is never consulted (gross = net, rmd = 0).
    const regime =
      config.taxEnabled || config.rmdEnabled
        ? overlayYearContext(config.household, householdYears, t, medicareOnsetSimYear)
        : undefined

    // Spousal rollover (M6b·B): a deceased canonical person's pre-tax IRA passes to the surviving
    // spouse, so the survivor's RMD keys off the COMBINED balance + their OWN age. Idempotent (a
    // dead person holds 0 after the first roll). Per-person path only; the aggregate M6a path
    // already routes the single pool to the survivor via resolveYear (rmdOwner = living[0]).
    let alive: boolean[] | null = null
    let perRmd: number[] | null = null
    // Reference-identity integrity (R19): aliveCanonical matches the living set to the canonical
    // people BY REFERENCE. THREE consumers depend on that identity: the per-person pre-tax ledger
    // (rollover + per-person RMD), the M5 hsa OWNER-alive resolution below (`rmdOwner ===
    // hsaOwnerPerson` — the 65+ Medicare-premium privilege re-key), AND the C2 per-person
    // contribution credit (the dead-slot validation just below — live on the AGGREGATE pre-tax
    // path too, not only the ledger path). A caller threading distinct-but-equal objects instead
    // of the household's own would silently mark everyone dead (zero RMD forever) on the ledger
    // path, silently re-key a spouse-owned HSA to living[0]'s age on the hsa path, or read every
    // contribution slot as a dead-slot violation on the credit path. Fail loud for ALL consumers —
    // the production caller (simulate) threads identical references so this never fires; it guards
    // the future P3/P4 DIRECT caller the backstop discipline exists for. (U3-exit pilot caught the
    // ledger half; the M5 boundary review caught the unguarded hsa half; the C2 boundary review
    // caught the credit half gated on its first consumer — insight 020, recurring in the unit
    // that cited it. C3 adds the FOURTH consumer: the Medicare-enrolled count keys each living
    // member's onset by canonical INDEX via reference match, so a stranger ref would silently
    // fall back to the biological predicate — un-delaying a 65+ worker's Medicare, the
    // cost-understating direction. The extras unit adds the FIFTH: the Medicare-extras Σ
    // attributes each premium by canonical INDEX, so a stranger ref would silently drop that
    // member's Part D/Medigap from every bill — the same cost-understating direction.)
    if (
      pretaxLedger ||
      (hsaLive && hsaOwnerPerson !== undefined) ||
      (yearC !== undefined && household !== undefined) ||
      (medicareOnsetSimYear !== undefined && household !== undefined) ||
      (medicareExtrasMonthly !== undefined && household !== undefined)
    ) {
      alive = aliveCanonical(people, householdYears, t)
      const injected = householdYears[t]
      // ANY mismatch — TOTAL (marks everyone dead) or PARTIAL (one good ref + one stranger →
      // wrong rollover target / wrong RMD age / wrong hsa owner) — is rejected. (U3-exit
      // code-review pilot — the prior `!alive.some` check caught only the TOTAL mismatch.)
      if (injected !== undefined && alive.filter((a) => a).length !== injected.living.length) {
        throw new Error(
          '[taxOverlay] householdYears living set has a member that is not one of the household canonical people (the per-person ledger, the hsa owner resolution, AND the contribution credit require the SAME OverlayPerson references as the household)',
        )
      }
    }
    if (pretaxLedger && alive) {
      const survivor = alive.findIndex((a) => a)
      for (let i = 0; i < pretaxLedger.length; i++) {
        if (!alive[i] && pretaxLedger[i]! > 0 && survivor >= 0) {
          pretaxLedger[survivor]! += pretaxLedger[i]!
          pretaxLedger[i] = 0
        }
      }
    }
    // C2 §7: a nonzero contribution credited to a DEAD person's slot — on ANY of the four
    // channels — is incoherent input: the caller assembles the per-year amounts death-truncated
    // PER-PATH (the B×C consequence), so a violation means a phantom dead-spouse contribution is
    // about to overstate the nest egg (the calm-but-wrong-OPTIMISTIC direction). Validated on the
    // PROPERTY — a per-person credit meeting a death signal — NOT on the ledger consumer (insight
    // 020, caught twice by the C2 boundary review: round 1 found the guard nested inside the
    // ledger path; round 2 found it covering only the pretax channel while taxable/roth/hsa were
    // unattributable aggregates — fixed by making EVERY channel per-person, which is also what
    // lets this guard be precise instead of rejecting a legitimate surviving worker's credit).
    // With no householdYears stream aliveCanonical reads all-alive and the guard is inert
    // (throw-or-nothing — it never changes a value, so presence-keyed byte-identity holds). The
    // alignment guard is the overlay mirror of validateParams' length check (two-layer rule):
    // a channel longer than the canonical people carries slots no death signal can vet.
    if (yearC !== undefined && alive !== null && household !== undefined) {
      const channels: ReadonlyArray<readonly number[]> = [
        yearC.taxableByPerson,
        yearC.pretaxByPerson,
        yearC.rothByPerson,
        yearC.hsaByPerson,
      ]
      for (const ch of channels) {
        if (ch.length > people.length) {
          throw new Error(
            `[taxOverlay] a contributions channel has ${ch.length} slots but the household has ${people.length} canonical people — excess slots cannot be death-vetted (burned/062)`,
          )
        }
        for (let i = 0; i < alive.length; i++) {
          if ((ch[i] ?? 0) > 0 && !alive[i]) {
            throw new Error(
              '[taxOverlay] a contribution credited to a DEAD person’s slot — the caller owns per-path death truncation (C2 §7); a phantom dead-spouse contribution overstates the nest egg',
            )
          }
        }
      }
    }

    // Prior-year-end pre-tax balance: at the top of the iteration `buckets` holds last year's
    // post-growth state (at t = 0, the initial balance) — exactly the RMD's basis. The per-person
    // path sums each living spouse's own-age forced distribution (M6b·B); the aggregate path keys
    // the single pool off the resolved holder (M6a). Both feed the gross-up as one total `rmd`.
    let rmd: number
    if (pretaxLedger && alive && household) {
      perRmd = perPersonRmd(pretaxLedger, people, alive, household.startCalendarYear, config.rmdEnabled, t)
      rmd = perRmd.reduce((a, b) => a + b, 0)
    } else {
      rmd = regime ? rmdForYear(buckets.pretax, config, regime, t) : 0
    }

    // Roth conversion (M5): clamp to feasibility AFTER reserving the non-convertible RMD, using the
    // prior-year-end pre-tax (gross-independent ⇒ constant inside the fixed point). Apply it to the
    // DRAW-TIME buckets (pre-tax→roth) so the spending allocation runs against the conversion-reduced
    // pre-tax and can never double-spend it. Read only when tax is ON (so a conversion stream with
    // tax OFF is a no-op — the reduce-to-spine anchor stays clean).
    const conversion = config.taxEnabled ? Math.max(0, Math.min(conversions[t] ?? 0, buckets.pretax - rmd)) : 0
    const drawPool: AccountBuckets =
      conversion > 0
        ? { taxable: buckets.taxable, pretax: buckets.pretax - conversion, roth: buckets.roth + conversion, hsa: buckets.hsa }
        : buckets

    // bracket-fill ceiling (M6a · U11): the year's max discretionary pre-tax draw. Used by BOTH the
    // gross-up fixed point and the ledger allocation so they agree. An EXPLICIT per-year entry wins
    // (the direct-caller / future-solver injection seam — every pre-U11 fixture is byte-identical);
    // an ABSENT entry under the `bracket-fill` policy is ENGINE-DERIVED from the year's committed,
    // gross-independent income (magiLandscape — U11): the minimum of the ACTIVE rails' fill headrooms
    //   · the next federal bracket edge (always active — the policy's tax half),
    //   · the 400%-FPL ACA cliff (only a year the overlay actually PRICES ACA under a cliff regime —
    //     the predicate mirrors the pricing gate below verbatim; insight 027),
    //   · the next IRMAA step (only when the year's recorded MAGI is actually BILLED — someone is
    //     Medicare-enrolled at t+lookback AND that bill year is inside the horizon; the threshold
    //     column is THIS year's filing, matching the engine's own lagged filingForBill rule).
    // This kills the old "missing entry ⇒ +Infinity ⇒ silent pre-tax-first" degrade — the reason
    // bracket-fill was withheld from the U10 picker. A caller who WANTS the uncapped shape passes
    // an explicit +Infinity. Derivation is gated on the same `taxEnabled && regime` the tax block
    // uses (tax off ⇒ the ceiling is meaningless ⇒ the prior +Infinity shape, reduce-to-spine clean).
    let bracketFillCeiling = bracketFillCeilings[t] ?? Number.POSITIVE_INFINITY
    if (bracketFillCeilings[t] === undefined && policy === 'bracket-fill' && config.taxEnabled && regime) {
      const committed: CommittedYearIncome = {
        rmd,
        conversion,
        ongoingTaxable: ongoingTaxableGrossUp[t] ?? 0,
        ssBenefit: ssBenefits[t] ?? 0,
        filing: regime.filing,
        count65: regime.count65,
        calendarYear: regime.calendarYear,
      }
      // The tax-bracket rail — always active under bracket-fill.
      let ceiling = bracketEdgeFillHeadroom(committed)
      // The ACA-cliff rail — active iff THIS year prices ACA under a cliff regime (the exact
      // pricing predicate below: table present + cliff exists + a positive enrolled premium +
      // a living pre-65 member). Enhanced regime (cliffFplFraction null) has no cliff rail.
      const enrolledForRail = enrolledPremium[t]
      if (
        acaTable !== undefined &&
        acaTable.cliffFplFraction !== null &&
        enrolledForRail !== undefined &&
        Number.isFinite(enrolledForRail) &&
        enrolledForRail > 0 &&
        regime.livingCount - regime.count65 > 0
      ) {
        const cliff = cliffMagiFor(acaTable, fplForHousehold(regime.livingCount))
        if (cliff !== null) ceiling = Math.min(ceiling, acaCliffFillHeadroom(committed, cliff))
      }
      // The IRMAA-step rail — active iff the MAGI this year records is actually billed: healthcare
      // on, the bill year inside the horizon, and someone Medicare-enrolled THEN (the path's own
      // death/enrollment timeline — resolveYear reads the injected per-path stream).
      if (acaTable !== undefined && t + irmaaLookback < horizon) {
        const billRegime = resolveYear(config.household, householdYears, t + irmaaLookback, medicareOnsetSimYear)
        if (billRegime.medicareEnrolledCount > 0) {
          // THIS year's MAGI meets the lines of the bill two years on, in THIS year's price frame.
          ceiling = Math.min(ceiling, irmaaStepFillHeadroom(committed, irmaaScheduleAsCompared(irmaaSchedule, committed.calendarYear)))
        }
      }
      bracketFillCeiling = ceiling
    }

    // Gross up for tax (M3–M5), then fold in the income-aware HEALTHCARE cost: the post-65 IRMAA
    // Medicare cost (M4 — a known constant, added to the funded net) AND, when a member is pre-65 this
    // year, the OUTER pre-65 ACA premium-funding fixed point (U3 · M3 Slice 4) wrapping the gross-up.
    // When tax is off, grossWithdrawal === net EXACTLY (spine recurrence); when healthcare is off /
    // inert (no Medicare cost, no priced premium) fundingNet === net (`net + 0`) and grossWithdrawal is
    // the tax-only gross — so reduce-to-spine + every M1–M6b + every pre-65 M3 fixture stays
    // byte-identical. When healthcare prices, the cost is funded INSIDE grossWithdrawal (terminalReal
    // drops — the presence companion) and accrues to the parallel accounting surfaces.
    let grossWithdrawal: number
    // Captured here, ACCRUED after the depletion check — never inline, so a year the portfolio cannot
    // fund does not over-count a premium/surcharge it failed to pay.
    let acaNetPremiumThisYear = 0
    let medicareCostThisYear = 0
    // The extras unit: kept SEPARATE from medicareCostThisYear for the whole year — the HSA
    // qualified-spend `medicareCost` arg (Pub 969 excludes Medigap) and the readout's
    // base − surcharge split both consume medicareCostThisYear and must NEVER see extras;
    // only the funding need and the Σ accrual add the two together.
    let medicareExtrasThisYear = 0
    let hsaSpendThisYear = 0
    let taxPaidThisYear = 0
    // The pay check (KTD6): a checked year's shortfall (undefined in every unchecked year) and the
    // year's funded need — set in the tax block, read by the probe-only draw observation after the
    // allocation (never by any arithmetic outside the tax block).
    let checkShortfallThisYear: number | undefined
    let fundingNetThisYear = 0
    // P3·U11 — the healthcare readout's year-locals (observed, never consumed): the IRMAA
    // surcharge slice of medicareCostThisYear, the two converged MAGIs, and the ACA cliff
    // state (-1 = not priced / 0 = priced under / 1 = priced over). Set at the pricing sites
    // below, pushed into the optional healthOut sink at the after-depletion accrual site.
    let irmaaSurchargeThisYear = 0
    let acaMagiThisYear = 0
    let irmaaMagiThisYear = 0
    let ssBenefitThisYear = 0
    let acaCliffStateThisYear = -1
    if (config.taxEnabled && regime) {
      // IRMAA (M4): the year's post-65 Medicare cost is a CONSTANT addend to the spending the gross-up
      // funds — keyed off IRMAA-MAGI[t−lookback] (already known), so it is NEVER a fixed point and NEVER
      // a search variable (the step discontinuity, insight 013, cannot reach a root-finder here). Priced
      // when ≥1 member is Medicare-ENROLLED (per-person onset-aware, C3 §3b; the absent-signal default is
      // biological 65 — the post-65 mirror of the ACA pre-65 gate) AND healthcare is on (the `acaTable`
      // gate). A member working past 65 (onset > their 65th sim-year) accrues ZERO Medicare cost during
      // the working years — base Part B included, the pricing count gates both — while `count65` stays
      // biological for the deduction stack + the ACA pre65 denominator. The bill, its surcharge slice and
      // the extras vector are {@link medicareChargeForYear}'s (the money picture reads the same function).
      if (acaTable !== undefined) {
        const charge = medicareChargeForYear({
          household: config.household,
          householdYears,
          medicareOnsetSimYear,
          t,
          year: regime,
          irmaaMagiHistory,
          irmaaMagiSeed,
          irmaaMagiOverride,
          bridgeYearMask,
          // Non-null by construction: this block runs under the healthcare gate, and healthcare-on
          // without tax-on threw at entry — exactly the arm the schedule was bound for.
          partBPricing: partBPricingByT!,
          medicareExtrasMonthly,
        })
        medicareCostThisYear = charge.cost
        medicareExtrasThisYear = charge.extras
        // P3·U11 — the readout's base-vs-surcharge SPLIT (observed, never consumed): the same tier
        // lookup the bill used, so base = cost − surcharge exactly, by construction.
        irmaaSurchargeThisYear = charge.surcharge
      }
      // HSA qualified spend (U3 · M5): the MAGI-invisible dollars the hsa bucket pays this year —
      // capped at the qualified set (OOP medical + the owner-65+ Medicare premiums; the ACA premium
      // is structurally NOT in the cap — the trap) and at the year's funding need. Every input is
      // year-known and gross-INDEPENDENT (prior-year-end hsa balance, the exogenous OOP stream, the
      // lagged-constant Medicare cost), so the spend is a CONSTANT inside both the gross-up fixed
      // point and the ACA bisection — never a search variable (insight 013 stays out of the residual).
      // Owner resolution: the entered owner while alive (living refs are exposed as rmdOwner/rmdSpouse,
      // people-order), else the surviving spouse — the spousal rollover transfers OWNERSHIP at death,
      // so the privilege re-keys to the survivor's age IMMEDIATELY (ACA-FPL-style, not IRMAA-lagged).
      if (hsaLive) {
        const ownerAlive =
          hsaOwnerPerson !== undefined && (regime.rmdOwner === hsaOwnerPerson || regime.rmdSpouse === hsaOwnerPerson)
        const effectiveOwner = ownerAlive ? hsaOwnerPerson : regime.rmdOwner
        const ownerIs65Plus =
          effectiveOwner !== undefined &&
          ageInSimYear(effectiveOwner, config.household.startCalendarYear, t) >= AGE_65_THRESHOLD
        hsaSpendThisYear = hsaQualifiedSpend({
          hsaBalance: drawPool.hsa ?? 0,
          oopMedical: oopMedical[t] ?? 0,
          // Base + surcharge ONLY — extras (Part D / Medigap / MA) are NOT a Pub 969 qualified
          // premium (Medigap is the named exclusion), so they must never widen the cap.
          medicareCost: medicareCostThisYear,
          ownerIs65Plus,
          // The TRUE funding need (incl. extras) — the clamp's job is "never overdraw beyond
          // the year's need"; the qualified set above still bounds WHAT the HSA may pay.
          fundingNeed: net + medicareCostThisYear + medicareExtrasThisYear,
        })
      }
      // AGE GATE (red-team blocker): ACA prices ONLY when ≥1 living member is pre-65. With every living
      // member ≥ 65 (all on Medicare) there is no marketplace household — zero the ACA cost (post-65 is
      // IRMAA's job above), never a phantom subsidy. pre65 = livingCount − living-65+.
      const pre65 = regime.livingCount - regime.count65
      const enrolledThisYear = enrolledPremium[t]
      // The per-year ACA price/skip gate (`acaTable !== undefined` IS the healthcareEnabled gate; the
      // up-front backstop already rejected any PRESENT non-finite/negative enrolled/slcsp). A priced year
      // funds fundingNet (spending + Medicare) PLUS the net ACA premium; a non-priced year just grosses
      // up fundingNet for tax. BOTH record this year's IRMAA-MAGI (the lagged feed-forward source for
      // year t+lookback) off the converged FLOORED components — never a raw-gain ledger (the sign-inversion).
      // Decided ONCE here, before the floor is prepared, so a malformed priced year fails on its own
      // guards below before any floor arithmetic can throw first (the A5 review's throw-order finding).
      const acaPricedThisYear =
        acaTable !== undefined &&
        enrolledThisYear !== undefined &&
        Number.isFinite(enrolledThisYear) &&
        enrolledThisYear > 0 &&
        pre65 > 0
      if (acaPricedThisYear) {
        // §6 EMPTY-OVERLAP INVARIANT (C2): a priced ACA year can NEVER carry a contribution. In
        // the v1 model contributions occupy the working years and ACA pricing the retired pre-65
        // window — the same boundary `Y` (R31 + R33), so the overlap is structurally empty; an
        // input carrying both is incoherent (the model does not price the HSA-contribution MAGI
        // deduction, so the year would be priced WRONG, not conservatively). FAIL LOUD — this is
        // the falsifiable structural guard that replaces the vacuous date==date comparison (§6);
        // the "may be slightly earlier" one-directional reading is D2's disclosure copy, not code.
        if (contributionTotal > 0) {
          throw new Error(
            '[taxOverlay] a priced ACA year cannot carry a contribution inflow — contributions and ACA pricing are temporally disjoint in the v1 model (C2 §6; the HSA-contribution MAGI deduction is unmodeled, so the year would price wrong)',
          )
        }
        // The masked ACA arm (C3 §3b — the wage-blind sibling): a PRICED ACA year on a BRIDGE year
        // computes ACA-MAGI with no wage component (`earnedIncomeReal` is netted away upstream;
        // MagiComponents has no wage term) — wage-blind in BOTH directions, OPTIMISTIC in the
        // subsidy band (wages shrink the net withdrawal → computed MAGI ≈ withdrawals only →
        // phantom near-max PTC → understated cost), so the year is UNPRICEABLE, not boundable —
        // rejection beats disclosure. validateParams' sibling arm shields `simulate`; this is the
        // mask-conditional direct-caller backstop (recorded limitation, §3b).
        if (bridgeYearMask[t] === true) {
          throw new Error(
            `[taxOverlay] a priced ACA year cannot land on BRIDGE year ${t} — ACA-MAGI is wage-blind ` +
              `(phantom near-max PTC in the subsidy band, the cost-understating direction), so the year is ` +
              `unpriceable (C3 §3b; burned/062)`,
          )
        }
      }

      // The working-year tax floor (2026-10-20), prepared ONCE per clamped year (the pay check's KTD7):
      // every baseline is year-constant — never a function of the gross — so one preparation per pass is
      // exact, and every gross-up solve this year reads it (each ACA probe too, for a direct caller with no
      // bridge mask; under simulate a clamped year never prices ACA), as does the year's pay check below.
      // Presence-keyed on this year's entry: a hole (every unclamped year) prepares nothing, and the
      // gross-up takes its literal pre-floor branch.
      const workingYearOutsideThisYear = workingYearOutsideIncome[t]
      const workingYear =
        workingYearOutsideThisYear === undefined
          ? undefined
          : {
              outside: workingYearOutsideThisYear,
              floor: prepareWorkingYearFloor(workingYearOutsideThisYear, {
                ssBenefit: ssBenefits[t] ?? 0,
                filing: regime.filing,
                count65: regime.count65,
                calendarYear: regime.calendarYear,
                ...(regime.pricedState !== undefined ? { pricedState: regime.pricedState } : {}),
                minLivingAge: regime.minLivingAge,
              }),
            }
      if (workingYear !== undefined) probe?.floorPrepared?.(t, workingYear.floor)

      // The pay check (KTD6/KTD7): a checked year composes its lines from its terms and THE floor just
      // prepared — the object the gross-up's charge reads too — and its shortfall joins what savings
      // funds. The backstop above ties every checked year to a floored one.
      const checkTerms = workingYearCheck[t]
      if (checkTerms !== undefined) {
        if (workingYear === undefined) {
          throw new Error(`[taxOverlay] sim year ${t} carries a workingYearCheck entry but no floor — the backstop admits neither alone (KTD16)`)
        }
        const lines = workingYearCashLines(checkTerms, workingYear.floor)
        probe?.checkComposed?.(t, workingYear.floor, lines)
        checkShortfallThisYear = lines.shortfall
      }

      // The cash this year must fund = base spending + the (known) Medicare cost + the extras
      // vector − the qualified HSA-paid portion (U3 · M5: the hsa bucket pays its share OUTSIDE
      // the gross-up, so the taxable withdrawal — and through it both MAGIs — genuinely DROPS:
      // the loop-breaking lever). With no Medicare cost, no extras, and no live hsa,
      // fundingNet === net EXACTLY (`net + 0 + 0 − 0`), so the pre-65 / pre-M5 paths are
      // untouched. ≥ 0 by the cap's fundingNeed clamp. A checked year that runs short adds its
      // shortfall on top (the pay check, R5 — the HSA spend above stays sized on the need WITHOUT it:
      // the HSA pays only qualified medical, KTD7); with no shortfall the addend is skipped, so the
      // expression is today's bit for bit.
      const fundingNetBeforeCheck = net + medicareCostThisYear + medicareExtrasThisYear - hsaSpendThisYear
      const fundingNet =
        checkShortfallThisYear !== undefined && checkShortfallThisYear > 0
          ? fundingNetBeforeCheck + checkShortfallThisYear
          : fundingNetBeforeCheck
      fundingNetThisYear = fundingNet

      // The inner tax gross-up as a closure the ACA solver probes at (fundingNet + a candidate premium).
      // The year-constant inputs are bundled into one NAMED context (no positional transposition risk).
      const grossUpCtx: GrossUpContext = {
        drawPool,
        policy,
        ...(customOrder !== undefined ? { customOrder } : {}),
        rmd,
        conversion,
        taxableBasis: basis,
        filing: regime.filing,
        count65: regime.count65,
        calendarYear: regime.calendarYear,
        ssBenefit: ssBenefits[t] ?? 0,
        bracketFillCeiling,
        // R40 seam 2 (KTD-1): the UNCLAMPED-year ongoing taxable enters `nonSSordinary` ONCE — the
        // clamped working-year taxable rides `ongoingTaxableIrmaaOnly` and lands at the history site
        // below, never here (no phantom gross-up withdrawal, KTD-9). Absent ⇒ `?? 0`, an IEEE no-op.
        ongoingTaxable: ongoingTaxableGrossUp[t] ?? 0,
        // The state-tax unit: presence-keyed (the membership check lives in solveGrossWithdrawal —
        // absent ⇒ the field is omitted ⇒ the structural `+ 0` no-op path, reduce-to-spine clean).
        ...(config.household.retirementState !== undefined
          ? { retirementState: config.household.retirementState }
          : {}),
        // The household's LIVING-age floor for the class-based qualified-age gate (PA 59½) — the year
        // context's (household-granularity conservative); consumed ONLY inside the priced-state branch.
        minLivingAge: regime.minLivingAge,
        ...(workingYear !== undefined ? { workingYear } : {}),
      }
      const fundNet = (netTotal: number): GrossUpSolution => solveGrossWithdrawal(netTotal, grossUpCtx)
      let magiComponentsThisYear: MagiComponents
      if (acaPricedThisYear) {
        // A missing benchmark in a priced year fails LOUD via the solver's own R19 backstop
        // (NaN → throw → the worker's calm-error), never a silent phantom subsidy. burned/062.
        const aca = solveAcaFundedGross(
          fundingNet,
          slcsp[t] ?? Number.NaN,
          enrolledThisYear,
          fplForHousehold(regime.livingCount),
          acaTable,
          fundNet,
        )
        grossWithdrawal = aca.gross
        acaNetPremiumThisYear = aca.netPremium
        magiComponentsThisYear = aca.components
        // P3·U11 — the readout's cliff state: observed off the solver's OWN disclosure flag
        // (never re-derived from a second compare that could drift from the CEIL-quantized
        // branch — single producer, insight 012).
        acaCliffStateThisYear = aca.overCliff ? 1 : 0
      } else {
        const sol = fundNet(fundingNet)
        grossWithdrawal = sol.gross
        magiComponentsThisYear = sol.components
      }
      // P3·U11 — the readout's empirical MAGI anchors, read off the SAME converged floored
      // components both calculators contract on (never a raw-gain ledger — the sign-inversion).
      if (healthOut) {
        acaMagiThisYear = acaMagi(magiComponentsThisYear)
        irmaaMagiThisYear = irmaaMagi(magiComponentsThisYear)
        ssBenefitThisYear = magiComponentsThisYear.ssBenefitFull
      }
      // Record this year's IRMAA-MAGI — ONE post-branch write covering BOTH recording sites (C3
      // §3b), only when healthcare is on (acaTable !== undefined; a healthcare-off tax-only year
      // keeps the history empty — no IRMAA, reduce-to-spine untouched). The working-year override
      // is ADDITIVE, never replacement: a working-year Roth conversion / claimed-while-working SS
      // / a 73+ worker's RMD lands in the COMPUTED component (replacement or max() would
      // understate the sum; additive errs only conservative/later, and equals replacement in the
      // common clamped working year whose computed MAGI is exactly 0). Override absent ⇒ `0 + x`,
      // an exact IEEE no-op (byte-identical). The one-pass components lag (< 1e-7) is far below
      // one NOMINAL dollar of the MAGI year (`oneNominalDollarReal` — a compared IRMAA line is a
      // real-dollar integer only through the anchor year; the raw `>` / `>=` compare, never a ceil:
      // insight 012, `healthOverlay.irmaaTierApplies`), so a lag-induced tier flip is measure-zero
      // (the same residual the ACA cliff already accepts).
      if (acaTable !== undefined) {
        // R40 · KTD-9 — the IRMAA decouple. Three feeds, each counted EXACTLY ONCE:
        //  (1) `irmaaMagiOverride[t]` — the wages / non-modeled-MAGI working-year component;
        //  (2) `irmaaMagi(components)` — the computed gross-up MAGI, which ALREADY includes the
        //      UNCLAMPED ongoing taxable (it rode `nonSSordinary` via `ongoingTaxableGrossUp`);
        //  (3) `ongoingTaxableIrmaaOnly[t]` — the §7-CLAMPED working-year ongoing taxable, which was
        //      kept OUT of the gross-up (the wages fund its tax — no phantom withdrawal) but STILL
        //      belongs in IRMAA-MAGI (the engine owns each modeled stream's IRMAA-MAGI in ALL years).
        // In a clamped working year feed (2)'s ongoing component is 0 and feed (3) carries it; in an
        // unclamped year feed (3) is 0 and feed (2) carries it — never both, so the stream's taxable
        // hits IRMAA-MAGI exactly once. Absent income ⇒ both `?? 0` ⇒ byte-identical to pre-R40.
        const recordedIrmaaMagi =
          (irmaaMagiOverride[t] ?? 0) + irmaaMagi(magiComponentsThisYear) + (ongoingTaxableIrmaaOnly[t] ?? 0)
        irmaaMagiHistory[t] = recordedIrmaaMagi
        probe?.irmaaMagiRecorded?.(t, recordedIrmaaMagi)
      }
      // The year's federal tax, read off the converged identities (U3 · M6 — the lifetime-tax
      // surface): the gross funds EXACTLY fundingNet + netAcaPremium + tax in both branches (the ACA
      // solve's gross is fundNet(fundingNet + P*).gross = that sum; the else branch is the P* = 0
      // case), so the difference IS the tax — no solver plumbing, no recompute (objective ≡ headline:
      // a re-derived tax could drift from the converged one). Sub-cent residual (1e-6) only where a
      // root EXISTS (the register's Tier 0 *The ACA solve finds no root at the 100 %-FPL line…*).
      // In a CLAMPED working year (the working-year tax floor) this is the PORTFOLIO-FUNDED tax — what
      // the portfolio's own income adds on top of the household's pay, plus SS's own tax — never the
      // household's whole return (the pay's own tax is funded outside the portfolio, the §7 law). Under
      // the pay check the payroll tax and the tax on the outside income ride INSIDE the shortfall, which
      // is part of `fundingNet`, so they never land here either (KTD7, by design).
      taxPaidThisYear = grossWithdrawal - fundingNet - acaNetPremiumThisYear
    } else {
      grossWithdrawal = net
    }

    // Per-bucket ledger: which buckets fund this withdrawal (consumed by the tax math). Allocated
    // against the CONVERSION-REDUCED drawPool, capped at what exists — exactly like the spine.
    const totalBefore = totalAcrossBuckets(buckets) // === totalAcrossBuckets(drawPool)
    const alloc = allocateWithdrawal(drawPool, grossWithdrawal, policy, bracketFillCeiling, customOrder)
    const drawn = alloc.taxable + alloc.pretax + alloc.roth
    // The pay check's probe-only draw observation (KTD20's pre-59½ count reads it): a checked year's
    // shortfall, its funded need, the converged gross and what the pre-tax bucket paid.
    if (checkShortfallThisYear !== undefined) {
      probe?.checkDrawn?.(t, { shortfall: checkShortfallThisYear, fundingNet: fundingNetThisYear, grossWithdrawal, pretaxDrawn: alloc.pretax })
    }

    // GENERAL-DEPLETION (U3 · M5): with a live HSA the authoritative total (which `stepYear`'s own
    // depletion predicate reads) includes MEDICAL-EARMARKED dollars a spending withdrawal may not
    // touch — so a year whose gross need exceeds the GENERAL-drawable pool is unfundable even while
    // the hsa-inclusive total is positive. Without this check the shortfall would silently ride the
    // total — HSA dollars laundered into general spending (the M5 laundering bug). Declared depleted
    // with the stranded HSA forfeited (terminal 0, the existing depleted-path convention) — the
    // CONSERVATIVE direction (understates survival; post-65 HSA-as-ordinary-income last resort is a
    // DISCLOSED non-feature, the survivor-SS class). Strict `>` on validated-finite quantities: the
    // exact-exhaustion year is fundable; ledger-vs-state float dust can only deplete a knife-edge
    // path one year EARLY (conservative, measure-zero — the stepYear `<= 0` knife-edge class).
    // Gated on `hsaLive`, NEVER on the per-year balance: at hsa = 0 this branch does not exist, so
    // reduce-to-spine is untouched (the ledger and state totals are different float lineages, and an
    // ungated compare could disagree with stepYear's predicate by one ulp on a knife-edge path).
    if (hsaLive && grossWithdrawal > generalDrawableTotal(drawPool)) {
      state = { stock: 0, bond: 0 }
      buckets = EMPTY_BUCKETS
      basis = 0
      if (pretaxLedger) pretaxLedger.fill(0)
      depletionYear = t
      break
    }

    // Advance the AUTHORITATIVE total via the shared stepYear (byte-identical to spine). The year's
    // total outflow = the general-bucket gross withdrawal + the hsa-paid qualified spend (U3 · M5 —
    // `+ 0` exactly when no hsa is live, so the spine recurrence is untouched). The year's
    // contribution inflow rides the SAME call (C2 — stepYear is the ONE crediting owner, contract
    // #3): credited end-of-year, after the return step, `+ 0` exactly when nothing is contributed.
    const step = stepYear(state, rs, rb, grossWithdrawal + hsaSpendThisYear, stockWeight, contributionTotal)
    state = step.state
    // Band fan (U6/U7): observe the post-step total — $0 exactly on the depletion year. Pure
    // observation; never perturbs the result (the reduce-to-spine fan byte-identity guard).
    balancesOut?.push(totalValue(state))

    if (step.depleted) {
      buckets = EMPTY_BUCKETS
      basis = 0
      if (pretaxLedger) pretaxLedger.fill(0)
      depletionYear = t
      break
    }

    // ACA net premium accrues ONLY for a year the portfolio actually funded — AFTER the depletion check,
    // so a year that could not fund its grossed-up withdrawal (the premium is inside it) never over-accrues
    // a premium the plan failed to pay. terminalReal / depletionYear are unaffected (the premium already
    // flowed through grossWithdrawal → stepYear); this keeps totalNetPremiumReal — the parallel accounting
    // surface — internally consistent with the depletion the same withdrawal caused. (U3-exit pilot.)
    totalNetPremiumReal += acaNetPremiumThisYear
    // IRMAA Medicare cost accrues on the SAME after-depletion footing (the parallel post-65 accounting
    // surface) — a year that could not fund its grossed-up withdrawal never over-counts the surcharge.
    // The extras Σ joins the lifetime Medicare total here (the honest all-in figure the Healthcare
    // sheet's lifetime delta reads) — `+ 0` exactly when no extras vector rides.
    totalMedicareCostReal += medicareCostThisYear + medicareExtrasThisYear
    // The qualified HSA spend accrues on the SAME footing (U3 · M5, the third parallel surface).
    totalQualifiedHsaSpendReal += hsaSpendThisYear
    // The year's federal tax accrues on the SAME footing (U3 · M6, the fourth parallel surface).
    totalTaxPaidReal += taxPaidThisYear
    // P3·U11 — the healthcare readout sink records on the SAME after-depletion footing (one
    // entry per FUNDED year, index-aligned across its arrays): a year the portfolio could not
    // fund observed nothing, exactly like the Σ accruals above. base = billed − surcharge, by
    // construction (the split and the bill are one tier lookup, `medicareAnnualCharge`).
    if (healthOut) {
      healthOut.acaNetPremium.push(acaNetPremiumThisYear)
      healthOut.medicareBase.push(medicareCostThisYear - irmaaSurchargeThisYear)
      healthOut.irmaaSurcharge.push(irmaaSurchargeThisYear)
      healthOut.medicareExtras.push(medicareExtrasThisYear)
      // WHO the base line covers: the pricing count (living ∩ enrolled, onset-aware) — 0 when the
      // year has no regime (tax + RMD both off) or nobody is enrolled. Observed, never consumed.
      healthOut.medicareEnrolled.push(regime?.medicareEnrolledCount ?? 0)
      healthOut.acaMagi.push(acaMagiThisYear)
      healthOut.irmaaMagi.push(irmaaMagiThisYear)
      healthOut.ssBenefit.push(ssBenefitThisYear)
      healthOut.acaCliffState.push(acaCliffStateThisYear)
    }

    // Re-derive the buckets as fractions of the authoritative new total: each bucket's
    // post-withdrawal share grown by the one shared factor (no asset-location). The total
    // is stepYear's output; the buckets are scaled to sum to it. The hsa outflow leaves the
    // ledger here too (U3 · M5): afterWithdrawal = totalBefore − general drawn − hsa spend,
    // matching stepYear's outflow exactly (`− 0` when no hsa is live — the spine recurrence).
    // The scale reads stepYear's GROWTH-ONLY total (C2 §2c), never `totalValue(state)`: with a
    // contribution credited end-of-year the state total includes it, and a credit-inclusive
    // scale would SMEAR the contribution pro-rata across every bucket (asset-location) instead
    // of crediting its named destination below. At contribution = 0 the two are byte-identical.
    const afterWithdrawal = totalBefore - drawn - hsaSpendThisYear
    if (afterWithdrawal > 0) {
      const scale = step.growthOnlyTotal / afterWithdrawal
      const taxableValue = drawPool.taxable

      // RMD-forced distribution: spending/tax already pulled `alloc.pretax` from pre-tax; the RMD
      // forces a MINIMUM pre-tax distribution, so only the EXCESS beyond that is force-relocated to
      // taxable (unspent, reinvested). The RMD relocation AND the conversion are both intra-portfolio
      // (pre-tax↔taxable, pre-tax↔roth), so their ± pairs cancel in the bucket sum: pretaxPost +
      // taxablePost + rothPost = totalBefore − drawn = afterWithdrawal exactly. Allocating on drawPool
      // guarantees alloc.pretax ≤ drawPool.pretax, so every bucket stays ≥ 0.
      let forcedExcess: number
      let pretaxPostScaled: number
      if (pretaxLedger && perRmd) {
        // Per-person (M6b·B): split the conversion (by convertible room) + the spending pre-tax draw
        // (by balance) pro-rata across living holders, relocate each spouse's own RMD excess, and grow
        // survivors by the shared factor. The aggregate forced excess is the per-person SUM, and the
        // aggregate pre-tax IS the ledger sum — kept exactly reconciled (no parallel-ledger drift).
        forcedExcess = advancePerPersonLedger(pretaxLedger, perRmd, conversion, alloc.pretax, scale)
        // C2 §2c: credit each person's pretax contribution (incl. match) to THEIR OWN ledger slot,
        // AFTER the growth scale, at face value — `buckets.pretax` is DEFINED as the ledger sum
        // under perRmd, so an aggregate-only credit would desync next year's per-person RMD (the
        // no-parallel-ledger-drift contract). Dead-slot credits were already rejected loud at the
        // rollover block above (the caller owns per-path death truncation, §7's B×C).
        if (yearC !== undefined) {
          for (let i = 0; i < pretaxLedger.length; i++) {
            pretaxLedger[i]! += yearC.pretaxByPerson[i] ?? 0
          }
        }
        pretaxPostScaled = pretaxLedger.reduce((a, b) => a + b, 0)
      } else {
        forcedExcess = Math.min(Math.max(0, rmd - alloc.pretax), drawPool.pretax - alloc.pretax)
        // C2 §2c (aggregate path): the pretax credit lands after the scale, at face value.
        pretaxPostScaled = (drawPool.pretax - alloc.pretax - forcedExcess) * scale + cPretaxTotal
      }
      const taxablePost = drawPool.taxable - alloc.taxable + forcedExcess
      const rothPost = drawPool.roth - alloc.roth

      // Taxable basis (M5): the draw removes basis pro-rata to the taxable value; the RMD-relocated
      // dollars enter at FULL basis (already ordinary-taxed → after-tax money). Basis is NOT scaled by
      // growth — market appreciation is unrealized gain (scaling basis would zero all future gain).
      // C2: a taxable CONTRIBUTION also enters at FULL basis (after-tax dollars: basis += the
      // contribution, UNSCALED), applied AFTER the pro-rata reduction — whose denominator
      // (`taxableValue` = the draw-time balance) correctly excludes the end-of-year arrival.
      basis = (taxableValue > 0 ? basis * (1 - alloc.taxable / taxableValue) : basis) + forcedExcess + cTaxable

      buckets = {
        // C2 §2c: each destination bucket takes its contribution AFTER the growth scale, at face
        // value (the end-of-year credit earns no arrival-year growth — the pinned conservative
        // convention; a before-the-scale fold would either grant phantom growth or smear the
        // inflow pro-rata across every bucket). `+ 0` exactly when nothing is contributed.
        taxable: taxablePost * scale + cTaxable,
        pretax: pretaxPostScaled,
        roth: rothPost * scale + cRoth,
        // The MEDICAL-EARMARKED 4th bucket (U3 · M5): the year's qualified spend leaves it, then it
        // grows by the SAME shared factor as every other bucket (contract #2 — one market draw, no
        // per-bucket return). General draws never touch it (`alloc` cannot even name it —
        // `GeneralBucketKey`); ≥ 0 because the spend is capped at the balance. The C2 hsa
        // contribution (already owner-enrollment-zeroed by the caller) credits in last.
        hsa: ((drawPool.hsa ?? 0) - hsaSpendThisYear) * scale + cHsa,
      }
    } else {
      // Knife-edge: the ledger lineage read ≤ 0 while stepYear's state lineage stayed positive
      // (float-dust divergence — the pre-C2 behavior zeroes the buckets and lets the state dust
      // ride). C2: stepYear still credited this year's contribution into the state, so the
      // buckets must carry it too — fresh buckets holding exactly the year's inflow (and the
      // taxable basis = the taxable inflow), else Σbuckets would diverge from the authoritative
      // total by the whole contribution, not dust. With no contribution this is byte-identical
      // to the pre-C2 zeroing (EMPTY_BUCKETS / 0 / fill(0)).
      basis = cTaxable
      if (pretaxLedger) {
        pretaxLedger.fill(0)
        // Dead-slot credits were already rejected loud at the rollover block above (C2 §7).
        if (yearC !== undefined) {
          for (let i = 0; i < pretaxLedger.length; i++) {
            pretaxLedger[i]! += yearC.pretaxByPerson[i] ?? 0
          }
        }
      }
      buckets =
        yearC === undefined
          ? EMPTY_BUCKETS
          : { taxable: cTaxable, pretax: cPretaxTotal, roth: cRoth, hsa: cHsa }
    }
  }

  return {
    terminalReal: totalValue(state),
    depletionYear,
    finalBuckets: buckets,
    finalTaxableBasis: basis,
    totalNetPremiumReal,
    totalMedicareCostReal,
    totalQualifiedHsaSpendReal,
    totalTaxPaidReal,
  }
}
