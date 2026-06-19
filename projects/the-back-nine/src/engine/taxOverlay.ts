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
 *     spending. QD is subsumed into realization-on-withdrawal (no sourced dividend-yield constant;
 *     the annual-dividend MAGI bump is an OUT-but-disclosed, optimistic-direction boundary — it
 *     sharpens once U3's ACA/IRMAA cliffs land). Worst-case contraction k ≈ 0.74 (the cap-gains
 *     15→20% straddle × the SS torpedo); GROSS_UP_MAX_PASSES stays 128 (proven, see below).
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
import { allocateWithdrawal, generalDrawableTotal, totalAcrossBuckets, type AccountBuckets } from '@engine/sequencing'
import {
  rmdStartAge,
  uniformLifetimeTableDivisors,
  jointLifeLastSurvivorTable,
  ordinaryBracketsMFJ,
  ordinaryBracketsSingle,
  standardDeductionMFJ,
  standardDeductionSingle,
  age65AdditionMFJ,
  age65AdditionSingle,
  seniorBonus,
  ssProvisionalThresholds,
  capitalGainsBreakpoints,
  acaApplicablePercentage,
  acaApplicablePercentageEnhanced,
  irmaa,
  partB2026,
  type OrdinaryBracket,
  type CapitalGainsRateBreakpoints,
  type AcaApplicablePercentageTable,
} from '@engine/constants'
import { solveAcaFundedGross, fplForHousehold, medicareAnnualCost, irmaaMagi, hsaQualifiedSpend, type GrossUpSolution, type MagiComponents } from '@engine/healthOverlay'
import { NEVER_DEPLETED, type DepletionYear, type DrawdownPolicy, type FilingStatus } from '@shared/model'

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
  /** Per-year `bracket-fill` ceiling (M6a): the max DISCRETIONARY pre-tax draw that year — the
   *  cheap ordinary-income room to the caller's target edge (a tax bracket now, an ACA-MAGI cliff
   *  in U3). Read ONLY when the policy is `bracket-fill`; a missing entry ⇒ `+Infinity` ⇒ the
   *  pre-tax-first fallback, so an absent stream leaves `bracket-fill` reducing to the spine on a
   *  single pool. The caller computes the dollar cap (the engine provides the mechanism, not the
   *  ceiling — the substrate the P3 control + P4 solver drive). */
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
   *  it never touches the gross-up, the §86 base, or ACA-MAGI (a clamped working year prices no ACA). */
  readonly ongoingTaxableIrmaaOnly?: readonly number[]
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

// The Uniform Lifetime Table as an O(1) lookup, derived once from the canonical constant —
// the max age is the published "120 and over" terminal bucket; any older age clamps to it
// (derived from the table, never an inlined 120, so the single-source grep cannot trip).
const ULT_DIVISOR_BY_AGE: ReadonlyMap<number, number> = new Map(
  uniformLifetimeTableDivisors.value.map((row) => [row.age, row.divisor]),
)
const ULT_MAX_AGE = uniformLifetimeTableDivisors.value.reduce((max, row) => Math.max(max, row.age), 0)

// The Joint Life & Last Survivor grid (Pub 590-B Table II), read once from the canonical
// constant. Used only for the >10yr-younger sole-spouse RMD (gap ≥ 11) — see selectRmdDivisor.
const JLLS = jointLifeLastSurvivorTable.value

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
//   k = (m_ord + j) × (1 + ssInclusionSlope)
//
// where m_ord ≤ 0.37 is the ordinary marginal rate and j is the cap-gains rate jump at a
// STRADDLED breakpoint (0.15 at the 0→15% point, 0.05 at the 15→20% point; 0 if the gain block
// straddles neither). M4's worst case was k = 0.37 × 1.85 ≈ 0.685 (top 37% bracket, torpedo
// uncapped). M5's worst REACHABLE corner is HIGHER: ordinary taxable income parked in the 35%
// bracket with a realized-gain block straddling the MFJ 15→20% cap-gains breakpoint while the
// torpedo is still uncapped → k = (0.35 + 0.05) × 1.85 ≈ 0.74. Witness: nonSS pre-tax draw +
// conversion ≈ $150k, a huge SS benefit (~$0.8M, keeping taxable-SS uncapped: 0.85·SS still
// above the inclusion) so ordinary income ≈ $645k → ordinary taxable just under the 15→20%
// breakpoint with the gain on top, senior bonus long gone, marginal dollar pre-tax-sourced.
//
// The other corners are all LOWER and mutually DISJOINT by income region: the 37% bracket sits
// ABOVE both cap-gains breakpoints (j = 0 → k = 0.685); the 0→15% straddle needs the 12% bracket
// (k ≈ 0.50); the senior-bonus phase-out band sits at ≤ 24% with the torpedo often capped
// (k ≲ 0.61). So k_sup ≈ 0.74. IMPORTANT: the contraction is NOT automatic — the UNCONSTRAINED
// sum of marginal channels (ordinary + torpedo + senior-bonus + cap-gains straddle) exceeds 1, so
// slope < 1 rests entirely on these regimes being unreachable simultaneously. A future constants
// change (a breakpoint shift) could open a k ≥ 1 corner and silently break convergence — re-derive
// k if the breakpoints move (insight 006: a probe that "confirms" the old k is usually sampling
// the wrong regime; the cap-gains corner is invisible to a pre-tax-only / large-net probe).
//
// 128 passes SUFFICES at k ≈ 0.74 (geometric: ~ln(tax/ε)/ln(1/0.74) ≈ 98 passes even at the
// self-limiting ~$0.7M tax that corner pins; the unbounded-tax tail sits at the milder k = 0.685
// → ~122 passes only at a ~$10^13 tax, far beyond any input). The early-exit on convergence keeps
// the common case cheap; MAX_PASSES stays a FAIL-LOUD backstop — a non-converged year THROWS,
// never an in-range default (burned/062). The convergence stress sweep in the tests probes the
// k ≈ 0.74 regime directly (low-basis taxable pool straddling the breakpoints × large SS ×
// conversions × SMALL net) so the cap can't be silently trimmed toward a value that throws in
// production for real gain-straddle inputs.
const GROSS_UP_EPSILON = 1e-7 // dollars
const GROSS_UP_MAX_PASSES = 128

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
// Social Security provisional-income taxation (M4) — IRS Pub 915 Worksheet 1.
// A CONTINUOUS, non-decreasing, piecewise-linear function of provisional income;
// that smoothness is what keeps the gross-up fixed point (below) well-behaved when
// the SS layer is folded in. Reads the FROZEN, un-indexed thresholds from the
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
interface ResolvedYear {
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
    for (const p of living) {
      if (ageInSimYear(p, household.startCalendarYear, t) >= AGE_65_THRESHOLD) count65++
      // The enrolled count INTERSECTS the living set (C3 §3b) — computed here, the sibling of
      // count65, so a dead spouse is never billed (a count over all entered persons would bill
      // a dead member's Part B forever).
      if (enrolledAt(p, canonicalIndexOf(p))) medicareEnrolledCount++
    }
    return { filing, count65, medicareEnrolledCount, livingCount: living.length, rmdOwner: living[0], rmdSpouse: living[1] }
  }
  // Static (M5): both people present every year, filing as configured — verbatim M1–M5.
  let staticEnrolled = enrolledAt(household.owner, 0) ? 1 : 0
  if (household.spouse && enrolledAt(household.spouse, 1)) staticEnrolled++
  return {
    filing: household.filing,
    count65: count65PlusInSimYear(household, t),
    medicareEnrolledCount: staticEnrolled,
    livingCount: household.spouse ? 2 : 1,
    rmdOwner: household.owner,
    rmdSpouse: household.spouse,
  }
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
 * The Joint Life & Last Survivor distribution period (Pub 590-B Table II) for an owner aged
 * `ownerAge` whose sole-beneficiary spouse is aged `spouseAge` (>10yr younger, gap ≥ 11).
 * Both ages clamp into the stored owner-72..120 × younger-spouse rectangle: ages ≥ 120 hit
 * the "120 and over" terminal bucket (DND/009), and the spouse is clamped to the gap-11
 * rectangle boundary for the sim-unreachable >120 owner tail (where a clamped owner would
 * otherwise narrow the gap below 11) — at those terminal ages the divisor is ~2.0 either way.
 */
function jointLifeLastSurvivorDivisor(ownerAge: number, spouseAge: number): number {
  const owner = Math.min(Math.max(ownerAge, JLLS.minOwnerAge), JLLS.maxAge)
  const spouse = Math.min(Math.max(spouseAge, JLLS.minSpouseAge), owner - 11)
  const divisor = JLLS.byOwnerThenSpouse[owner]?.[spouse - JLLS.minSpouseAge]
  if (divisor === undefined) {
    throw new Error(`no Joint Life & Last Survivor divisor for owner ${ownerAge}, spouse ${spouseAge}`)
  }
  return divisor
}

/**
 * SEAM — the divisor for an owner's lifetime RMD (M6b). The Uniform Lifetime Table is the
 * default, EXCEPT when the sole beneficiary is a spouse MORE THAN 10 years younger (gap ≥
 * 11): then the IRS Joint Life & Last Survivor table (Pub 590-B Table II) applies and yields
 * a LARGER divisor → a SMALLER RMD (the age-gap relief this product exists to model — flat
 * ULT OVERSTATES forced income for an age-gapped couple and can invert a conversion ranking).
 * Exactly-10-younger stays on ULT (which already bakes in a hypothetical 10-yr-younger
 * beneficiary). In the couple model the spouse is the sole IRA beneficiary by assumption; the
 * caller passes the living spouse's age (or `undefined` for a single owner / no surviving
 * spouse → ULT).
 */
function selectRmdDivisor(ownerAge: number, spouseAge?: number): number {
  if (spouseAge !== undefined && ownerAge - spouseAge > 10) {
    return jointLifeLastSurvivorDivisor(ownerAge, spouseAge)
  }
  return uniformLifetimeDivisor(ownerAge)
}

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
  readonly rmd: number
  readonly conversion: number
  readonly taxableBasis: number
  readonly filing: FilingStatus
  readonly count65: number
  readonly ssBenefit: number
  readonly bracketFillCeiling: number
  /** R40 — this year's ongoing other-income TAXABLE that enters ordinary income (seam 2; KTD-1):
   *  a pension/rental/annuity/pre-2019-alimony's taxable portion. Folded into `nonSSordinary` at the
   *  SINGLE producer below, so the §86 SS provisional, ACA-MAGI, and IRMAA-MAGI all rise by it ONCE
   *  (seams 3/4/5 ride the one `nonSSordinary` term). 0 in a no-income run (the `?? 0` default keeps
   *  every fold an exact IEEE no-op — reduce-to-spine byte-identical). This is the gross-up feed; the
   *  KTD-9 clamped-working-year IRMAA-only taxable is recorded separately at the history site. */
  readonly ongoingTaxable: number
}

function solveGrossWithdrawal(net: number, ctx: GrossUpContext): GrossUpSolution {
  const { drawPool, policy, rmd, conversion, taxableBasis, filing, count65, ssBenefit, bracketFillCeiling, ongoingTaxable } = ctx
  const taxableValue = drawPool.taxable
  let gross = net
  for (let pass = 0; pass < GROSS_UP_MAX_PASSES; pass++) {
    const alloc = allocateWithdrawal(drawPool, gross, policy, bracketFillCeiling)
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
    const nonSSordinary = Math.max(alloc.pretax, rmd) + conversion + ongoingTaxable
    // Surface the taxable-SS local (M3): the identical value + call as before, so `nextGross` stays
    // byte-identical — now also fed to the returned MagiComponents so acaMagi reads the FLOORED
    // converged locals (never recomputed off a raw-gain ledger; the named sign-inversion).
    const ssBenefitTaxable = taxableSocialSecurity(nonSSordinary + realizedGain, ssBenefit, filing)
    const ordinaryIncome = nonSSordinary + ssBenefitTaxable
    const nextGross = net + ordinaryPlusCapitalGainsTax(ordinaryIncome, realizedGain, filing, count65)
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
    `tax gross-up did not converge in ${GROSS_UP_MAX_PASSES} passes (net=${net}, rmd=${rmd}, ss=${ssBenefit}, conversion=${conversion}) — refusing an unconverged tax (burned/062)`,
  )
}

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
    bridgeYearMask = [],
    oopMedical = [],
    hsaOwnerIndex,
    contributions = [],
    ongoingTaxableGrossUp = [],
    ongoingTaxableIrmaaOnly = [],
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
  // point. The schedule + base Part B premium + the lookback length are run-invariant; bind them once.
  // The lookback is READ from the constant (never a hard-coded 2). `irmaaMagiHistory[t]` records this
  // engine's IRMAA-MAGI at every healthcare-on year's converged gross — EVEN pre-65 years, whose MAGI
  // feeds a later Medicare year's surcharge (the lagged feed-forward); for t < lookback the lagged year
  // predates the sim, so the surcharge reads `irmaaMagiSeed` instead. acaTable !== undefined IS the
  // healthcare gate, so when healthcare is off none of this runs and reduce-to-spine is untouched.
  const irmaaSchedule = irmaa.value
  const irmaaLookback = irmaaSchedule.magiLookbackYears
  const partBBaseMonthly = partB2026.value.standardPremiumMonthly
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
    // the per-person ledger (tax off → NaN buckets) or run the gross-up to its 128-pass throw (tax
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
    // injected stream when present, else the static household (verbatim M1–M5). Resolved only when
    // the overlay is active (tax or RMD on ⇒ the ON config carries `household`); under the
    // EXHAUSTIVE OFF condition it is never consulted (gross = net, rmd = 0).
    const regime =
      config.taxEnabled || config.rmdEnabled
        ? resolveYear(config.household, householdYears, t, medicareOnsetSimYear)
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
    // cost-understating direction.)
    if (
      pretaxLedger ||
      (hsaLive && hsaOwnerPerson !== undefined) ||
      (yearC !== undefined && household !== undefined) ||
      (medicareOnsetSimYear !== undefined && household !== undefined)
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

    // bracket-fill ceiling (M6a): the year's max discretionary pre-tax draw. Used by BOTH the
    // gross-up fixed point and the ledger allocation so they agree. A missing entry ⇒ +Infinity ⇒
    // the pre-tax-first fallback (so an absent stream / non-bracket-fill policy is unaffected).
    const bracketFillCeiling = bracketFillCeilings[t] ?? Number.POSITIVE_INFINITY

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
    let hsaSpendThisYear = 0
    let taxPaidThisYear = 0
    if (config.taxEnabled && regime) {
      // IRMAA (M4): the year's post-65 Medicare cost is a CONSTANT addend to the spending the gross-up
      // funds — keyed off IRMAA-MAGI[t−lookback] (already known), so it is NEVER a fixed point and NEVER
      // a search variable (the step discontinuity, insight 013, cannot reach a root-finder here). Priced
      // when ≥1 member is Medicare-ENROLLED (regime.medicareEnrolledCount > 0 — per-person onset-aware,
      // C3 §3b; the absent-signal default is biological 65, today's predicate verbatim — the post-65
      // mirror of the ACA pre-65 gate) AND healthcare is on (acaTable !== undefined). A member working
      // past 65 (onset > their 65th sim-year) accrues ZERO Medicare cost ENTIRELY during the working
      // years — base Part B included, the pricing count gates both — while `count65` stays biological
      // for the deduction stack + the ACA pre65 denominator. `filing[t−lookback]` is the threshold
      // column, so the survivor MFJ→single flip is itself lagged +2yr; for t < lookback the lagged MAGI
      // + filing predate the sim, supplied via irmaaMagiSeed + the initial household filing.
      if (acaTable !== undefined && regime.medicareEnrolledCount > 0) {
        const lag = t - irmaaLookback
        // The masked LAGGED-READ arm (C3 §3b — the true mirror of the seed throw below, which cannot
        // fire here: a lagged read landing on a clamped WORKING year returns a FINITE ≈$0 computed
        // MAGI → lowest tier → understated surcharge → a falsely-early date, SILENTLY). A bridge year
        // at the lagged index demands finite override coverage of that index — the additive write
        // below is what recorded it into history, so absent coverage means the recorded value was
        // computed-only ≈$0. Mask-conditional for a direct caller (recorded limitation, §3b).
        if (lag >= 0 && bridgeYearMask[lag] === true && !Number.isFinite(irmaaMagiOverride[lag])) {
          throw new Error(
            `[taxOverlay] IRMAA's lagged read lands on BRIDGE year ${lag} with no finite irmaaMagiOverride[${lag}] — ` +
              `a clamped working year's computed IRMAA-MAGI is ≈$0, silently pricing the lowest tier (understated cost, ` +
              `the falsely-early-date direction); supply the working-year override (C3 §3b; burned/062)`,
          )
        }
        const magiForBill = lag >= 0 ? irmaaMagiHistory[lag] : irmaaMagiSeed[t]
        // Finiteness FIRST (insight 010): a missing seed for a near-65 start, or a NaN, must FAIL LOUD —
        // never default 0 (a phantom $0 surcharge → understated cost → overstated survival, the cardinal
        // calm-but-wrong sin; burned/062). validateParams shields `simulate`; this is the direct-caller backstop.
        if (magiForBill === undefined || !Number.isFinite(magiForBill)) {
          throw new Error(
            `[taxOverlay] IRMAA needs a finite IRMAA-MAGI[t−${irmaaLookback}] for sim year ${t} (a Medicare-enrolled member) — ` +
              `supply irmaaMagiSeed[${t}] for a sim starting within ${irmaaLookback}yr of age 65 (no default 0; burned/062, insight 010)`,
          )
        }
        const filingForBill =
          lag >= 0
            ? resolveYear(config.household, householdYears, lag, medicareOnsetSimYear).filing
            : config.household.filing
        medicareCostThisYear = medicareAnnualCost(
          magiForBill,
          filingForBill,
          regime.medicareEnrolledCount,
          irmaaSchedule,
          partBBaseMonthly,
        )
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
          medicareCost: medicareCostThisYear,
          ownerIs65Plus,
          fundingNeed: net + medicareCostThisYear,
        })
      }
      // The cash this year must fund = base spending + the (known) Medicare cost − the qualified
      // HSA-paid portion (U3 · M5: the hsa bucket pays its share OUTSIDE the gross-up, so the
      // taxable withdrawal — and through it both MAGIs — genuinely DROPS: the loop-breaking lever).
      // With no Medicare cost and no live hsa, fundingNet === net EXACTLY (`net + 0 − 0`), so the
      // pre-65 / pre-M5 paths are untouched. ≥ 0 by the cap's fundingNeed clamp.
      const fundingNet = net + medicareCostThisYear - hsaSpendThisYear

      // The inner tax gross-up as a closure the ACA solver probes at (fundingNet + a candidate premium).
      // The year-constant inputs are bundled into one NAMED context (no positional transposition risk).
      const grossUpCtx: GrossUpContext = {
        drawPool,
        policy,
        rmd,
        conversion,
        taxableBasis: basis,
        filing: regime.filing,
        count65: regime.count65,
        ssBenefit: ssBenefits[t] ?? 0,
        bracketFillCeiling,
        // R40 seam 2 (KTD-1): the UNCLAMPED-year ongoing taxable enters `nonSSordinary` ONCE — the
        // clamped working-year taxable rides `ongoingTaxableIrmaaOnly` and lands at the history site
        // below, never here (no phantom gross-up withdrawal, KTD-9). Absent ⇒ `?? 0`, an IEEE no-op.
        ongoingTaxable: ongoingTaxableGrossUp[t] ?? 0,
      }
      const fundNet = (netTotal: number): GrossUpSolution => solveGrossWithdrawal(netTotal, grossUpCtx)
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
      let magiComponentsThisYear: MagiComponents
      if (
        acaTable !== undefined &&
        enrolledThisYear !== undefined &&
        Number.isFinite(enrolledThisYear) &&
        enrolledThisYear > 0 &&
        pre65 > 0
      ) {
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
      } else {
        const sol = fundNet(fundingNet)
        grossWithdrawal = sol.gross
        magiComponentsThisYear = sol.components
      }
      // Record this year's IRMAA-MAGI — ONE post-branch write covering BOTH recording sites (C3
      // §3b), only when healthcare is on (acaTable !== undefined; a healthcare-off tax-only year
      // keeps the history empty — no IRMAA, reduce-to-spine untouched). The working-year override
      // is ADDITIVE, never replacement: a working-year Roth conversion / claimed-while-working SS
      // / a 73+ worker's RMD lands in the COMPUTED component (replacement or max() would
      // understate the sum; additive errs only conservative/later, and equals replacement in the
      // common clamped working year whose computed MAGI is exactly 0). Override absent ⇒ `0 + x`,
      // an exact IEEE no-op (byte-identical). The one-pass components lag (< 1e-7) is far below
      // the $1 INTEGER IRMAA grid (insight 012 — no ceil helps on a `> N` branch), so a
      // lag-induced tier flip is measure-zero (the same residual the ACA cliff already accepts).
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
        irmaaMagiHistory[t] =
          (irmaaMagiOverride[t] ?? 0) + irmaaMagi(magiComponentsThisYear) + (ongoingTaxableIrmaaOnly[t] ?? 0)
      }
      // The year's federal tax, read off the converged identities (U3 · M6 — the lifetime-tax
      // surface): the gross funds EXACTLY fundingNet + netAcaPremium + tax in both branches
      // (the ACA solve's gross is fundNet(fundingNet + P*).gross = that sum; the else branch
      // is the P* = 0 case), so the difference IS the tax — no solver plumbing, no recompute
      // (objective ≡ headline: a re-derived tax could drift from the converged one). Sub-cent
      // residual only: the ACA root's |impliedNet − P*| < 1e-6 bisection tolerance.
      taxPaidThisYear = grossWithdrawal - fundingNet - acaNetPremiumThisYear
    } else {
      grossWithdrawal = net
    }

    // Per-bucket ledger: which buckets fund this withdrawal (consumed by the tax math). Allocated
    // against the CONVERSION-REDUCED drawPool, capped at what exists — exactly like the spine.
    const totalBefore = totalAcrossBuckets(buckets) // === totalAcrossBuckets(drawPool)
    const alloc = allocateWithdrawal(drawPool, grossWithdrawal, policy, bracketFillCeiling)
    const drawn = alloc.taxable + alloc.pretax + alloc.roth

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
    totalMedicareCostReal += medicareCostThisYear
    // The qualified HSA spend accrues on the SAME footing (U3 · M5, the third parallel surface).
    totalQualifiedHsaSpendReal += hsaSpendThisYear
    // The year's federal tax accrues on the SAME footing (U3 · M6, the fourth parallel surface).
    totalTaxPaidReal += taxPaidThisYear

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
