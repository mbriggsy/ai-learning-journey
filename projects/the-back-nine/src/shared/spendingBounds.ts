/**
 * Range bounds for a budget line's two schema-version-8 answers (gap 4's plan,
 * `docs/plans/features/spending-line-repeat-and-rate-build-spec.md`, KTD4 and KTD5): how often the line repeats
 * (`everyYears`) and how its dollars change (`growthRate`). Every gate reads them here and never re-types them (insight
 * 020; the `incomeBounds.ts` pattern): the restore codec, the budget validator and the Living drawer.
 *
 * WHICH SIDE EACH BOUND GUARDS (insights 046 and 050). A rate compiles to a fixed, seedless factor that moves every
 * path the same way, so the confidence fan cannot see a wrong one: the range gate is the only defense. On SPENDING the
 * rosy side is a LOW rate (less spending later), so the floor is the bound that guards the cardinal direction, and it is
 * definitional: a cost that falls in dollars is not offered, so 0 (the same dollar amount every year) is the least a line
 * can say. The ceiling sits on the HARSH side (more spending), so it is a plausibility catch for a gross mis-entry, not a
 * guard against a calm-but-wrong answer. A repeat's rosy side is a LONG repeat (fewer charges), and no bound can tell a
 * typed 50 meant as 5 from a real answer, so the drawer reads the repeat back in the household's own years (U8).
 */

import type { CitedBound } from './incomeBounds'

/** The least yearly rate a line can carry: 0, the same dollar amount every year. Written as the literal so
 *  `parsePercent('0') === 0` exactly. */
export const GROWTH_RATE_MIN: CitedBound = {
  value: 0,
  citation:
    "Gap 4's plan, KTD4 and Assumptions: a cost that falls in dollars is not offered, so a fixed-dollar line (a fixed-rate mortgage payment, a flat subscription) is the floor. Definitional, and it is the bound on the rosy side.",
}

/**
 * The greatest yearly rate a line can carry. WRITTEN AS THE LITERAL `0.15` so `parsePercent('15') === 0.15` exactly
 * (`15/100` is the same IEEE-754 double as the literal), so a typed 15 clears the inclusive `<= 0.15`.
 */
export const GROWTH_RATE_MAX: CitedBound = {
  value: 0.15,
  citation:
    "Gap 4's plan, KTD4 and Assumptions: a plausibility ceiling on the harsh side, several times the price index's own yearly rates (`src/engine/constants/health.ts`) so a real fast-rising cost clears it, low enough to catch a typed whole number meant as a smaller one. It never guards the rosy side; the floor does.",
}

/** The shortest repeat: every 2 years. A repeat of 1 would be a second spelling of "every year", which is written as
 *  the field's absence. */
export const EVERY_YEARS_MIN: CitedBound = {
  value: 2,
  citation: "Gap 4's plan, KTD5: 1 is refused because it would be a second spelling of every year (the field absent).",
}

/** The longest repeat: every 50 years. */
export const EVERY_YEARS_MAX: CitedBound = {
  value: 50,
  citation:
    "Gap 4's plan, KTD5: half a century, longer than any repeating purchase a household plans (a car, a roof, a big trip); it only catches a gross mis-entry. Its rosy side (a long repeat charges less often) is read back in the drawer, not bounded.",
}

/** A line's yearly rate within [GROWTH_RATE_MIN, GROWTH_RATE_MAX], inclusive at both ends. The caller checks finiteness
 *  FIRST (insights 008 and 010: a NaN passes every relational compare). */
export const growthRateInRange = (v: number): boolean => v >= GROWTH_RATE_MIN.value && v <= GROWTH_RATE_MAX.value

/** A line's repeat: a whole number of years within [EVERY_YEARS_MIN, EVERY_YEARS_MAX]. False for a fraction, a NaN or
 *  an infinity (`Number.isInteger` is false for each). */
export const everyYearsInRange = (v: number): boolean =>
  Number.isInteger(v) && v >= EVERY_YEARS_MIN.value && v <= EVERY_YEARS_MAX.value
