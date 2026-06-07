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
