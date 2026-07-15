/**
 * The canonical-constants discipline (cross-cutting contract #6; burned/057,061,063).
 *
 * Every dated tax/health figure lives in ONE year-keyed module (this directory) as
 * a `Sourced<T>` — carrying its citation and whether it is still `directional`
 * (not yet pinned to its IRS/CMS/HHS primary). Plan, engine overlays, tests, and
 * the copyGuard allowlist all READ this module; a constant is never re-typed
 * elsewhere (the single-source grep test enforces it).
 *
 * Every tax figure is now SOURCED (the Joint Life & Last Survivor grid — the last gap —
 * landed in U2·M6b). The `Unsourced` sentinel mechanism remains for any FUTURE gap: a
 * figure the research NAMES but does not yet VALUE is an `Unsourced` whose `.value` THROWS,
 * so a missing figure can never be confused with a plausible measurement (burned/062 — no
 * in-range default fallbacks).
 */

/** A dated figure with provenance. */
export interface Sourced<T> {
  readonly value: T
  /** Where the value came from (research strand or, once pinned, the primary). */
  readonly citation: string
  /** True until confirmed against the named primary (`pinTo`). */
  readonly directionalUntilPinned: boolean
  /** The IRS/CMS/HHS primary this figure must be confirmed against. */
  readonly pinTo?: string
  /** Statutory provenance (e.g. OBBBA), so a law change reads as a vintage bump, not drift. */
  readonly legalBasis?: string
  /** Live, possibly-retroactive policy — CI re-verifies at every build (ACA). */
  readonly reVerifyEveryBuild?: true
  /** Tax year after which this figure is guaranteed stale (e.g. senior bonus → 2028). */
  readonly sunsetAfter?: number
  /** Tax year a scheduled change takes effect (e.g. RMD age 75 → 2033). */
  readonly effectiveFrom?: number
  readonly note?: string
}

/**
 * A required figure that the research NAMES but does not yet VALUE. Reading
 * `.value` throws; consumers (U2/U3) must pin it from `pinTo` first. The thrown
 * error — not a silent default — is the whole point (burned/062).
 */
export interface Unsourced {
  readonly requiresSourcing: true
  readonly directionalUntilPinned: true
  readonly citation: string
  readonly pinTo: string
  readonly note?: string
  /** Reading this throws — there is no safe default. */
  readonly value: never
}

/** Any entry in the canonical table — a sourced figure or an unsourced sentinel. */
export type ConstantEntry = Sourced<unknown> | Unsourced

/** Construct a sourced figure. */
export const sourced = <T>(value: T, meta: Omit<Sourced<T>, 'value'>): Sourced<T> => ({
  value,
  ...meta,
})

/** Construct an unsourced sentinel whose `.value` throws until pinned. */
export const unsourced = (pinTo: string, note?: string): Unsourced => ({
  requiresSourcing: true,
  directionalUntilPinned: true,
  citation: 'UNSOURCED — must pin to the primary before use',
  pinTo,
  note,
  get value(): never {
    throw new Error(
      `[constants] a required figure is not yet sourced — pin to ${pinTo} before use. ` +
        `No in-range default (burned/062).${note ? ` ${note}` : ''}`,
    )
  },
})

/** Type guard: is this entry an unsourced sentinel? */
export const isUnsourced = (entry: ConstantEntry): entry is Unsourced =>
  'requiresSourcing' in entry && entry.requiresSourcing === true

// ---- Shared value shapes ----------------------------------------------------

/** One ordinary-income bracket. `upTo` is the upper bound of taxable income for
 *  `rate`; `null` marks the top bracket (no ceiling). */
export interface OrdinaryBracket {
  readonly rate: number
  readonly upTo: number | null
}

/** RMD start-age schedule, keyed by the later of birth-year cohorts (SECURE 2.0). */
export interface RmdAgeBand {
  /** Inclusive upper birth year for this band; `null` = all later births. */
  readonly bornThrough: number | null
  readonly age: number
  /** Tax year the band takes effect, when scheduled in the future. */
  readonly effectiveFrom?: number
}

/** The preferential LTCG / qualified-dividend rate schedule for one filing status.
 *  Thresholds are TOTAL taxable income (the gain stacks on top of ordinary income);
 *  20% applies above `fifteenRateUpTo`. */
export interface CapitalGainsRateBreakpoints {
  /** Top of the 0% band (the "maximum zero rate amount"). */
  readonly zeroRateUpTo: number
  /** Top of the 15% band (the "maximum 15-percent rate amount"); 20% applies above. */
  readonly fifteenRateUpTo: number
}

/** 0/15/20% LTCG / qualified-dividend breakpoints by filing status (§1(h)). */
export interface CapitalGainsBreakpoints {
  readonly single: CapitalGainsRateBreakpoints
  readonly mfj: CapitalGainsRateBreakpoints
}

/** One row of the IRS Uniform Lifetime Table (Pub 590-B Table III). `divisor` is the
 *  distribution period (RMD = prior-year-end pre-tax balance ÷ divisor). Age 120 is the
 *  published "120 and over" terminal bucket — the consumer clamps any age ≥ 120 to it. */
export interface UniformLifetimeDivisor {
  readonly age: number
  readonly divisor: number
}

/** The IRS Joint Life & Last Survivor Table (Pub 590-B Table II / Treas. Reg.
 *  § 1.401(a)(9)-9(d)) — the owner × younger-spouse rectangle used for an owner's
 *  lifetime RMD when the SOLE beneficiary spouse is MORE THAN 10 years younger
 *  (gap ≥ 11). A LARGER divisor than the Uniform Lifetime Table → a SMALLER forced
 *  distribution (the age-gap relief). The grid is symmetric in the reg; only the
 *  reachable rectangle is stored. Lookup: `byOwnerThenSpouse[ownerAge][spouseAge −
 *  minSpouseAge]`. Ages ≥ {@link maxAge} clamp to the "120 and over" terminal bucket. */
export interface JointLifeLastSurvivorTable {
  /** Smallest owner age present — the earliest SECURE-2.0 RMD start age (72). */
  readonly minOwnerAge: number
  /** The published "120 and over" terminal age; older ages clamp to it (DND/009). */
  readonly maxAge: number
  /** Smallest spouse age present (1 — the full reachable rectangle, so no validated
   *  input ever falls below the table). */
  readonly minSpouseAge: number
  /** Divisor rows keyed by owner age: `byOwnerThenSpouse[ownerAge][spouseAge −
   *  minSpouseAge]` for spouse ages `minSpouseAge..(ownerAge − 11)`. Finite 1-decimals. */
  readonly byOwnerThenSpouse: Readonly<Record<number, readonly number[]>>
}

// ---- State income-tax value shapes (the state-tax unit) ---------------------

/** How a state assembles its taxable base — the trap the broad brush ignored. NC starts
 *  from FEDERAL AGI and applies its own standard deduction (`federal-agi-derived`); PA is a
 *  stand-alone EIGHT-CLASS system with NO linkage to federal AGI (`class-based` — the engine
 *  assembles PA's base from its own converged channels, never a rate on the federal figure);
 *  FL levies NO income tax at all (`no-income-tax`). */
export type StateBaseSystem = 'federal-agi-derived' | 'class-based' | 'no-income-tax'

/** How a state taxes ONE decumulation income stream (SS, pre-tax withdrawals/RMDs,
 *  Roth-conversion income, taxable-account gains). `taxed-ordinary` folds the stream into
 *  the state's ordinary base at the flat rate; `exempt` never enters the base;
 *  `taxed-if-under-qualified-age` is EXEMPT at/after the qualified age but TAXED before it
 *  (PA's 59½ retirement-plan gate — the conservative arm below the gate); `none` is the
 *  no-income-tax state (FL). Never a bare boolean — the age-gated case is a third state. */
export type StateIncomeTreatment =
  | 'taxed-ordinary'
  | 'exempt'
  | 'taxed-if-under-qualified-age'
  | 'none'

/** One flat-rate step: the `rate` takes effect in tax year `fromYear` and is HELD FORWARD
 *  until a later step supersedes it. */
export interface StateRateStep {
  readonly fromYear: number
  readonly rate: number
}

/** A flat state income-tax rate schedule — ASCENDING `steps`, HELD FORWARD (the latest step
 *  whose `fromYear` ≤ the query year wins; a query BEFORE the earliest step is fail-loud,
 *  never a silent 0 — burned/062). A flat-forever state carries ONE step. A legislated or
 *  revenue-triggered step-down is added ONLY once it is primary-pinned — the NC hawk-veto
 *  posture: hold the HIGHER rate (conservative: overstates tax) until a lower rate pins.
 *  The year is CONSUMED at lookup (insight 074) so a future pinned step-down actually
 *  prices instead of being a dead narration note. */
export interface StateFlatRateSchedule {
  readonly steps: readonly StateRateStep[]
}

/** A state standard deduction by filing status (fixed-dollar per the state statute). NC is
 *  fixed / not-indexed / no 65+ add-on; PA is $0 both (its guide's "No provision"); a
 *  no-income-tax state (FL) carries `null` in the profile (not applicable, not $0). */
export interface StateStandardDeduction {
  readonly mfj: number
  readonly single: number
}

// ---- Healthcare value shapes (U3) -------------------------------------------

/** One band of the ACA premium-tax-credit applicable-percentage schedule (IRC
 *  § 36B(b)(3)(A); the year's IRS Rev. Proc.). WITHIN a band the "applicable
 *  percentage" — the share of income a household is expected to contribute toward
 *  the benchmark plan — is LINEARLY interpolated between `applicablePctLow` (at
 *  `fplFractionLow`) and `applicablePctHigh` (at `fplFractionHigh`). Bands are
 *  contiguous; income is a fraction of the Federal Poverty Line. */
export interface AcaApplicablePercentageBand {
  /** Lower bound of the band, as a fraction of FPL (e.g. 1.33 = 133% FPL). */
  readonly fplFractionLow: number
  /** Upper bound of the band, as a fraction of FPL (e.g. 1.5 = 150% FPL). `null` marks the
   *  OPEN-ENDED top band — the enhanced regime's "400% and higher" tier (IRC §36B(b)(3)(A)(iii)),
   *  which is FLAT (applicablePctLow === applicablePctHigh), mirroring {@link OrdinaryBracket.upTo}.
   *  In the 2026 reverted regime there is no open band — the cliff handles above-400%. */
  readonly fplFractionHigh: number | null
  /** Applicable percentage (of income) at the band's lower bound. */
  readonly applicablePctLow: number
  /** Applicable percentage at the band's upper bound; interpolated linearly within. */
  readonly applicablePctHigh: number
}

/** The ACA applicable-percentage sliding scale + the PTC eligibility window. Two regimes share
 *  this shape: the 2026 REVERTED table (`cliffFplFraction` = 4.0, a hard 400%-FPL cliff) and the
 *  ARPA/IRA ENHANCED table (`cliffFplFraction` = null, NO cliff — an open top band caps the
 *  contribution at a flat % above 400% FPL). `eligibilityFloorFplFraction` is the 100%-FPL PTC
 *  floor (below it is Medicaid territory — OUT-but-disclosed, state-dependent). Bands are ascending
 *  and contiguous; the top band ends exactly where the cliff begins (or both are open/null). */
export interface AcaApplicablePercentageTable {
  readonly bands: readonly AcaApplicablePercentageBand[]
  /** PTC drops to $0 strictly above this FPL fraction (the 2026 reverted cliff = 4.0). `null`
   *  marks the ARPA/IRA ENHANCED regime — NO cliff; above 400% FPL the contribution is capped at
   *  the open top band's flat percentage (8.5%) instead of the credit zeroing. */
  readonly cliffFplFraction: number | null
  /** PTC eligibility floor as an FPL fraction (1.0); below it, generally Medicaid. */
  readonly eligibilityFloorFplFraction: number
}

/** The HHS Federal Poverty Guidelines for the 48 contiguous states + DC. A household
 *  of N = `base + (N − 1) × perAdditionalPerson`. ACA uses the PRIOR year's guidelines
 *  for a coverage year (the 2025 guidelines drive the 2026 coverage year). Alaska &
 *  Hawaii have separate, higher tables (OUT-but-disclosed for the MVP). The 400%-cliff
 *  DOLLAR is derived (4.0 × FPL(householdSize)), never stored. */
export interface FederalPovertyGuidelines {
  /** The guideline year (2025 guidelines → 2026 ACA coverage year). */
  readonly guidelineYear: number
  /** Household-of-1 dollar amount. */
  readonly base: number
  /** Per-additional-person increment. */
  readonly perAdditionalPerson: number
}

/** The federal default age-rating curve for ACA individual-market premiums (45 CFR
 *  147.102(e) — the standard 3:1 adult curve most states use). D1's today's-quote →
 *  per-age premium escalator consumes it: an entered ACA quote at the current age is
 *  scaled along the curve to price the retired pre-65 window at each age. Ages 0–14
 *  share one child factor; 15..64 are single-year factors; 65+ is Medicare territory
 *  (the curve is never read there). Age 21 is the reference (factor 1.000); age 64
 *  carries the 3.000 cap. */
export interface AcaAgeRatingCurve {
  /** The single factor for ages 0–14 (the post-2018 child band). */
  readonly childFactorThrough14: number
  /** One row per single year of age, 15..64 inclusive, contiguous ascending. */
  readonly factors: readonly AgeRatingFactor[]
}

/** One single-year age-rating factor. */
export interface AgeRatingFactor {
  readonly age: number
  readonly factor: number
}

// ---- Contribution-limit value shapes (C1) ------------------------------------

/** One age-band catch-up tier. A band applies when the contributor's year-end age
 *  falls in [fromAge, toAge] (both inclusive; `toAge: null` = open-ended). Bands are
 *  ascending and NON-OVERLAPPING, so a per-runway-year lookup steps down automatically
 *  when a band expires (the SECURE 2.0 §109 60–63 "super" band ends at 64 — encoding
 *  the step-down IN the data is what lets intakeMap apply the ceiling per runway year
 *  instead of flat-projecting a today-legal amount through 64+, the calm-but-wrong-
 *  optimistic direction the C1 spec names). */
export interface CatchUpBand {
  readonly fromAge: number
  readonly toAge: number | null
  readonly amount: number
  /** Statutory provenance for a band that exists by a specific section (e.g. §109). */
  readonly legalBasis?: string
}

/** Employer-plan (401(k)/403(b)) elective-deferral limit + age-banded catch-ups.
 *  These are INTAKE SANITY CEILINGS (R19) + the per-runway-year expansion rule —
 *  never a per-year engine formula (the engine consumes the user's entered amounts;
 *  C1 unit, plan §5). */
export interface EmployerPlanLimits {
  /** IRC §402(g) elective-deferral limit (employee salary deferral, all plans combined). */
  readonly electiveDeferral: number
  /** Ascending non-overlapping catch-up bands; the 60–63 §109 band REPLACES the
   *  age-50 band for those ages (in lieu of, not additive) and expires at 64. */
  readonly catchUpBands: readonly CatchUpBand[]
}

/** IRA contribution limit + the (SECURE 2.0 §108, now-indexed) age-50 catch-up. */
export interface IraLimits {
  readonly contributionLimit: number
  readonly catchUpBands: readonly CatchUpBand[]
}

/** One IRMAA SURCHARGE tier (Medicare Part B + Part D income-related adjustment). A
 *  tier applies when MAGI STRICTLY EXCEEDS its threshold (lower-bound-exclusive: $1
 *  over → the full tier); the consumer selects the highest tier whose threshold is
 *  exceeded, else no surcharge. Surcharges are PER ENROLLED PERSON and ADD to the
 *  standard Part B premium (Part D has no modeled base — only the surcharge). */
export interface IrmaaTier {
  /** MAGI threshold for SINGLE filers; the tier applies when MAGI > this. */
  readonly singleMagiThreshold: number
  /** MAGI threshold for MARRIED-FILING-JOINTLY; the tier applies when MAGI > this. */
  readonly mfjMagiThreshold: number
  /** Monthly Part B IRMAA surcharge (on top of the standard premium), per person. */
  readonly partBSurchargeMonthly: number
  /** Monthly Part D IRMAA surcharge, per person. */
  readonly partDSurchargeMonthly: number
}

/** The IRMAA schedule. IRMAA uses a `magiLookbackYears`-year-lagged MAGI (2026 IRMAA
 *  is set by 2024 MAGI). `tiers` are the SURCHARGE tiers in ascending MAGI order; the
 *  base/standard tier (no surcharge) is IMPLICIT — return 0 below the first threshold.
 *  The standard Part B premium lives in `partB2026` (single-sourced); per-tier TOTALS
 *  are derived (base + surcharge), never re-typed here. */
export interface IrmaaSchedule {
  /** Years of MAGI lookback (2 — 2026 IRMAA keys off 2024 MAGI). */
  readonly magiLookbackYears: number
  /** Surcharge tiers, ascending; selection = the highest tier whose threshold MAGI exceeds. */
  readonly tiers: readonly IrmaaTier[]
  /** Surcharge is charged per enrolled person (a couple both enrolled pays it twice). */
  readonly perPerson: boolean
  /** The top tier's threshold is inflation-frozen through this year (then re-indexes). */
  readonly topTierFrozenThrough: number
  /** A voluntary Roth conversion is NOT an SSA-44 life-changing event (cannot appeal it away). */
  readonly rothConversionIsSsa44LifeChangingEvent: boolean
}

// ---- Social Security value shapes (the PIA-driven benefit sub-engine) ---------

/** A reduction/credit rate stated the SSA way: "numerator/denominator of 1% per
 *  month" (e.g. 5/9 of 1%). The per-month fraction OF PIA is `numerator /
 *  (denominator × 100)`; the sub-engine keeps the arithmetic INTEGER so the
 *  published factors (exactly 0.7000 at 62/FRA67) fall out — never a stored decimal. */
export interface PerMonthRate {
  readonly numerator: number
  readonly denominator: number
}

/** A two-segment actuarial-reduction schedule for claiming BEFORE FRA. The first
 *  `firstMonths` months reduce at `firstRate`; each later month at `laterRate`. The
 *  WORKER (POMS RS 00615.101) and SPOUSE (RS 00615.201) schedules DIFFER in the
 *  first segment (5/9 vs 25/36 of 1%) and converge beyond it (both 5/12). */
export interface ReductionSchedule {
  readonly firstMonths: number
  readonly firstRate: PerMonthRate
  readonly laterRate: PerMonthRate
}

/** The delayed-retirement-credit schedule for claiming AFTER FRA (POMS RS
 *  00615.690/.692). A flat `ratePerMonth` accrues from FRA through the month before
 *  `throughAge`; the per-person month cap is DERIVED = `throughAge×12 − fraMonths`
 *  (= 36 at FRA 67), never a literal. Sourced ONLY for the `bornFromYear`+ cohort —
 *  an older birth year (step-down rates) must fail loud, never default to 8%. */
export interface DelayedRetirementCredit {
  readonly ratePerMonth: PerMonthRate
  readonly throughAge: number
  /** Earliest birth year this flat rate covers (1943 — the 8%/yr cohort). */
  readonly bornFromYear: number
}

/** One full-retirement-age (or survivor-FRA) band: births through `bornThrough`
 *  (inclusive; `null` = all later) attain FRA at `fraMonths` (age-in-MONTHS — the
 *  graduated 1955–59 band is fractional, so a bare year silently breaks it). */
export interface FraBand {
  readonly bornThrough: number | null
  readonly fraMonths: number
}

/** The survivor (widow/er) age-reduction rule (POMS RS 00615.301/.310). The
 *  reduction grows from 0 at survivor-FRA to `maxReductionPct` at `earliestAge`; the
 *  per-month fraction is DERIVED from the 60→survivor-FRA span (so it holds 28.5%
 *  across cohorts — never hardcode 19/40). A disabled survivor (DWB) takes the flat
 *  `maxReductionPct` from `disabledEarliestAge`. */
export interface SurvivorReduction {
  readonly earliestAge: number
  readonly disabledEarliestAge: number
  readonly maxReductionPct: number
}

/** The Retirement-Insurance-Benefit limit on a survivor benefit when the deceased
 *  claimed reduced RIB before death (POMS RS 00615.320): the survivor benefit is
 *  capped at the GREATER of `floorPctOfDeathPia` × the death PIA or the deceased's
 *  actual reduced benefit — a "larger-of", with 82.5% a FLOOR within the cap, never
 *  a flat haircut. */
export interface RibLim {
  readonly floorPctOfDeathPia: number
}

/** The deemed-filing DOB cutoff (POMS GN 00204.035; BBA-2015 §831): DOB on/after
 *  this date ⇒ filing for own-retirement OR spousal deems BOTH (restricted
 *  application gone). Survivor benefits are exempt. */
export interface DeemedFilingCutoff {
  readonly year: number
  readonly month: number
  readonly day: number
}
