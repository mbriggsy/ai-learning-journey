/**
 * The canonical-constants discipline (cross-cutting contract #6; burned/057,061,063).
 *
 * Every dated tax/health figure lives in ONE year-keyed module (this directory) as
 * a `Sourced<T>` — carrying its citation and whether it is still `directional`
 * (not yet pinned to its IRS/CMS/HHS primary). Plan, engine overlays, tests, and
 * the copyGuard allowlist all READ this module; a constant is never re-typed
 * elsewhere (the single-source grep test enforces it).
 *
 * A figure named by the research but with NO value yet (single-filer brackets,
 * the Uniform Lifetime divisors, the cap-gains breakpoints) is an `Unsourced`
 * sentinel: reading `.value` THROWS, so a missing figure can never be confused
 * with a plausible measurement (burned/062 — no in-range default fallbacks).
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
