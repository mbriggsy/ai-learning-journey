/**
 * DIRECTIONAL sex-specific cohort survival table — P(alive at age | alive at 65).
 *
 * Generated via a documented Gompertz force of mortality
 *   S(age) = exp(-(R0/alpha)(e^(alpha*(age-65)) - 1)),  alpha=0.090,
 *   R0_male=0.0135, R0_female=0.01026,
 * calibrated to the grounded anchors (gemini-grounding 2026-06-05; findings Strand 4):
 * male S(90)≈0.28, female S(90)≈0.38 → couple last-survivor to 90 ≈ 0.55 (sex-
 * differentiated; errs slightly ABOVE the cited ~53%, i.e. SAFE for a survival floor).
 *
 * This is a COMMITTED TABLE on purpose (not a parametric fit baked into the engine):
 * the SSA cohort table4c7 snapshot replaces it 1:1 at the P1 exit gate (SSA bot-blocks
 * automated fetch, so the real curves are grounded-search-verified directional until a
 * manual table4c7 snapshot is committed). Women survive materially longer (female >
 * male at every age) — the reason the engine MUST key on sex, never one blended rate.
 */
import type { Sex } from '@shared/model'

export interface SurvivalRow {
  readonly age: number
  /** P(a 65-year-old MALE is alive at this age). */
  readonly male: number
  /** P(a 65-year-old FEMALE is alive at this age). */
  readonly female: number
}

/** Base age the conditional survival is measured from (S(65)=1). */
export const SURVIVAL_BASE_AGE = 65
/** Oldest age in the table; survival past it is treated as 0 (a hard cap). */
export const SURVIVAL_MAX_AGE = 115

/** Ascending by age, 65..115. S(65)=1 for both sexes, monotone decreasing to ~0. */
export const COHORT_SURVIVAL: readonly SurvivalRow[] = [
  { age: 65, male: 1.000000, female: 1.000000 },
  { age: 66, male: 0.985973, female: 0.989322 },
  { age: 67, male: 0.970851, female: 0.977768 },
  { age: 68, male: 0.954570, female: 0.965281 },
  { age: 69, male: 0.937068, female: 0.951801 },
  { age: 70, male: 0.918286, female: 0.937267 },
  { age: 71, male: 0.898165, female: 0.921618 },
  { age: 72, male: 0.876655, female: 0.904794 },
  { age: 73, male: 0.853709, female: 0.886738 },
  { age: 74, male: 0.829289, female: 0.867394 },
  { age: 75, male: 0.803370, female: 0.846712 },
  { age: 76, male: 0.775936, female: 0.824646 },
  { age: 77, male: 0.746991, female: 0.801161 },
  { age: 78, male: 0.716556, female: 0.776229 },
  { age: 79, male: 0.684673, female: 0.749838 },
  { age: 80, male: 0.651411, female: 0.721988 },
  { age: 81, male: 0.616865, female: 0.692699 },
  { age: 82, male: 0.581162, female: 0.662012 },
  { age: 83, male: 0.544459, female: 0.629989 },
  { age: 84, male: 0.506949, female: 0.596723 },
  { age: 85, male: 0.468862, female: 0.562334 },
  { age: 86, male: 0.430458, female: 0.526972 },
  { age: 87, male: 0.392032, female: 0.490823 },
  { age: 88, male: 0.353906, female: 0.454104 },
  { age: 89, male: 0.316424, female: 0.417066 },
  { age: 90, male: 0.279945, female: 0.379993 },
  { age: 91, male: 0.244831, female: 0.343193 },
  { age: 92, male: 0.211436, female: 0.306998 },
  { age: 93, male: 0.180092, female: 0.271753 },
  { age: 94, male: 0.151093, female: 0.237808 },
  { age: 95, male: 0.124686, female: 0.205504 },
  { age: 96, male: 0.101049, female: 0.175163 },
  { age: 97, male: 0.080288, female: 0.147073 },
  { age: 98, male: 0.062425, female: 0.121471 },
  { age: 99, male: 0.047400, female: 0.098535 },
  { age: 100, male: 0.035070, female: 0.078370 },
  { age: 101, male: 0.025222, female: 0.061002 },
  { age: 102, male: 0.017584, female: 0.046376 },
  { age: 103, male: 0.011850, female: 0.034358 },
  { age: 104, male: 0.007695, female: 0.024746 },
  { age: 105, male: 0.004797, female: 0.017280 },
  { age: 106, male: 0.002861, female: 0.011666 },
  { age: 107, male: 0.001625, female: 0.007589 },
  { age: 108, male: 0.000875, female: 0.004741 },
  { age: 109, male: 0.000444, female: 0.002834 },
  { age: 110, male: 0.000212, female: 0.001614 },
  { age: 111, male: 0.000094, female: 0.000871 },
  { age: 112, male: 0.000039, female: 0.000444 },
  { age: 113, male: 0.000015, female: 0.000212 },
  { age: 114, male: 0.000005, female: 0.000095 },
  { age: 115, male: 0.000002, female: 0.000039 },
]

export const MORTALITY_SOURCE =
  'Gompertz directional curve calibrated to grounded anchors (couple ~0.55 to 90, female>male); replace 1:1 with the SSA cohort table4c7 snapshot at the P1 exit gate'

/** Helper for the curve as a function of (sex, age) — clamps below 65 to 1 and above
 *  the table to 0; linearly interpolates between integer ages (whole-year ages are
 *  the common case, so interpolation is a convenience, not a precision claim). */
export function survivalProbability(sex: Sex, age: number): number {
  if (age <= SURVIVAL_BASE_AGE) return 1
  if (age >= SURVIVAL_MAX_AGE) return 0
  const lowerIdx = Math.floor(age) - SURVIVAL_BASE_AGE
  const lower = COHORT_SURVIVAL[lowerIdx]
  const upper = COHORT_SURVIVAL[lowerIdx + 1]
  if (lower === undefined || upper === undefined) return 0
  const frac = age - Math.floor(age)
  const s = (r: SurvivalRow) => r[sex]
  return s(lower) + (s(upper) - s(lower)) * frac
}
