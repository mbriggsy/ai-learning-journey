/**
 * Sourced reference figures shown as calm INTAKE HINTS — NOT engine inputs.
 *
 * The engine reads NOTHING from here (these never reach `validateParams` or any
 * overlay); they only seed optional-field guidance so a user who genuinely
 * doesn't know a figure gets a grounded reference instead of guessing blind.
 * Each carries its citation + a `directionalUntilPinned` marker, mirroring the
 * `@engine/constants` discipline (burned/062: a SOURCED figure, never a plausible
 * in-range default). This lives in the intake layer — not the engine constants
 * registry — precisely because it is display-only and engine-inert.
 */

/**
 * A calm reference for the OPTIONAL out-of-pocket-medical field (the HSA
 * qualified-cap sizing). HOUSEHOLD/year, EXCLUDING premiums (the field's own
 * semantics — premiums are added on top by the tool).
 *
 * Deliberately set just BELOW the federal average, for two reasons:
 *  1. honesty — the distribution is right-skewed, so the average overstates the
 *     typical household (no median-by-age is separately published);
 *  2. direction — a higher OOP entry sizes a LARGER HSA tax-free cap, which nudges
 *     the survival answer OPTIMISTIC; the cardinal rule is never calm-but-optimistic,
 *     so the hint must not anchor high.
 */
export const OOP_MEDICAL_TYPICAL_HOUSEHOLD = {
  /** Conservative round household anchor ($/yr, real). */
  annual: 3_000,
  citation:
    'BLS Consumer Expenditure Survey 2023 (released 2024-09-25), per consumer unit — out-of-pocket EXCLUDING premiums = medical services + drugs + medical supplies ≈ $3,397 (ages 55–64) / $3,807 (65–74). $3,000 anchors conservatively below that average; no median-by-age is separately published.',
  directionalUntilPinned: true,
  pinTo:
    'BLS CE 2023 "Age of reference person" table — verify the medical-services + drugs + medical-supplies cells before pinning (figures currently grounded-search-sourced, not primary-table-confirmed).',
} as const
