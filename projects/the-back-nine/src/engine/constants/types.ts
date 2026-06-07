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
  /** Upper bound of the band, as a fraction of FPL (e.g. 1.5 = 150% FPL). */
  readonly fplFractionHigh: number
  /** Applicable percentage (of income) at the band's lower bound. */
  readonly applicablePctLow: number
  /** Applicable percentage at the band's upper bound; interpolated linearly within. */
  readonly applicablePctHigh: number
}

/** The ACA applicable-percentage sliding scale + the PTC eligibility window.
 *  `cliffFplFraction` is the 400%-FPL "subsidy cliff" — PTC → $0 strictly above it
 *  under the 2026 reverted/pre-ARPA regime; `eligibilityFloorFplFraction` is the
 *  100%-FPL PTC floor (below it is Medicaid territory — OUT-but-disclosed,
 *  state-dependent). Bands are ascending and contiguous up to the cliff. */
export interface AcaApplicablePercentageTable {
  readonly bands: readonly AcaApplicablePercentageBand[]
  /** PTC drops to $0 strictly above this FPL fraction (the 2026 cliff = 4.0). */
  readonly cliffFplFraction: number
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
