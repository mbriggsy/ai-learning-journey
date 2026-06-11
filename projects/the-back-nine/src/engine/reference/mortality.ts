/**
 * Sex-specific COHORT survival table — P(alive at age | alive at 65) — derived
 * from the SSA 2024 Trustees Report cohort life tables (Alternative 2 /
 * intermediate assumptions): the P1-exit PIN replacing the Gompertz directional
 * fit (2026-06-11).
 *
 * SOURCE (committed snapshot, DND/012 — the values come straight from SSA's
 * published l(x), never an engine formula): reference/ssa-snapshot/
 * CohLifeTables_{M,F}_Alt2_TR2024.csv + SHA256SUMS, fetched 2026-06-11 from
 * ssa.gov/oact/HistEst/CohLifeTables/2024/ (the WAF wants a full browser header
 * set + a retry loop — plain curl 403s intermittently). S(age|65) = l(age)/l(65).
 *
 * COHORT CHOICE (Briggsy-ratified 2026-06-11): male = the 1969 birth
 * cohort, female = the 1972 birth cohort — the primary household of
 * this personal tool. l(65): male 78,885 / female 87,002 per 100,000
 * births. Anchors: S(90|65) male 0.3209 / female 0.4348 → couple
 * at-least-one-to-90 0.6162. The retired Gompertz fit said 0.2799 /
 * 0.3800 / 0.554 — it UNDERSTATED longevity, i.e. was OPTIMISTIC about portfolio
 * survival; this swap moves every headline the honest (conservative) direction.
 * For households born in other years the baked curve errs: older cohorts →
 * longevity slightly overstated (conservative); younger → slightly understated.
 * Per-person birth-year keying is the P2-intake forward item; the committed
 * snapshot holds every cohort 1900–2100, so it re-derives with no re-fetch.
 *
 * NAMING CORRECTION (was wrong here + in three plan docs): there is NO
 * `table4c7.html` on ssa.gov — "4.C7" is Trustees-Report TABLE numbering, not a
 * filename. The period table at /STATS/table4c6.html is real; its cohort
 * sibling lives only in the HistEst downloadables used here.
 *
 * The table runs 65..119 (full SSA support; the integer l(x) reaches 0 at male
 * 117 / female 119 for these cohorts — the terminal row is the data's own zero,
 * and survival past 119 is clamped to 0). Women survive materially longer at
 * every age — the reason the engine MUST key on sex, never one blended rate.
 */
import type { Sex } from '@shared/model'

export interface SurvivalRow {
  readonly age: number
  /** P(a 65-year-old MALE is alive at this age) — the 1969 birth cohort. */
  readonly male: number
  /** P(a 65-year-old FEMALE is alive at this age) — the 1972 birth cohort. */
  readonly female: number
}

/** Base age the conditional survival is measured from (S(65)=1). */
export const SURVIVAL_BASE_AGE = 65
/** Oldest age in the table (the end of SSA's published support); survival past it
 *  is treated as 0 (a hard cap). Extended 115→119 at the pin (2026-06-11): the
 *  sampler is inverse-CDF on one uniform per person, so the extension changes the
 *  tail mapping only — never the draw schedule (CRN-safe, verified). */
export const SURVIVAL_MAX_AGE = 119

/** Ascending by age, 65..119. S(65)=1 for both sexes, monotone decreasing to 0. */
export const COHORT_SURVIVAL: readonly SurvivalRow[] = [
  { age: 65, male: 1.000000, female: 1.000000 },
  { age: 66, male: 0.985511, female: 0.991701 },
  { age: 67, male: 0.970527, female: 0.982977 },
  { age: 68, male: 0.955112, female: 0.973771 },
  { age: 69, male: 0.939241, female: 0.963978 },
  { age: 70, male: 0.922824, female: 0.953438 },
  { age: 71, male: 0.905673, female: 0.942047 },
  { age: 72, male: 0.887583, female: 0.929634 },
  { age: 73, male: 0.868340, female: 0.916082 },
  { age: 74, male: 0.847804, female: 0.901336 },
  { age: 75, male: 0.825936, female: 0.885370 },
  { age: 76, male: 0.802725, female: 0.868175 },
  { age: 77, male: 0.778158, female: 0.849682 },
  { age: 78, male: 0.752184, female: 0.829774 },
  { age: 79, male: 0.724777, female: 0.808280 },
  { age: 80, male: 0.695886, female: 0.785062 },
  { age: 81, male: 0.665475, female: 0.759937 },
  { age: 82, male: 0.633555, female: 0.732799 },
  { age: 83, male: 0.600038, female: 0.703501 },
  { age: 84, male: 0.564746, female: 0.671893 },
  { age: 85, male: 0.527413, female: 0.637732 },
  { age: 86, male: 0.487862, female: 0.600802 },
  { age: 87, male: 0.446752, female: 0.561596 },
  { age: 88, male: 0.404804, female: 0.520609 },
  { age: 89, male: 0.362654, female: 0.478230 },
  { age: 90, male: 0.320872, female: 0.434841 },
  { age: 91, male: 0.280041, female: 0.390922 },
  { age: 92, male: 0.240768, female: 0.347038 },
  { age: 93, male: 0.203638, female: 0.303855 },
  { age: 94, male: 0.169272, female: 0.262132 },
  { age: 95, male: 0.138239, female: 0.222696 },
  { age: 96, male: 0.110934, female: 0.186260 },
  { age: 97, male: 0.087494, female: 0.153376 },
  { age: 98, male: 0.067884, female: 0.124376 },
  { age: 99, male: 0.051860, female: 0.099377 },
  { age: 100, male: 0.039082, female: 0.078320 },
  { age: 101, male: 0.029030, female: 0.060815 },
  { age: 102, male: 0.021221, female: 0.046470 },
  { age: 103, male: 0.015263, female: 0.034919 },
  { age: 104, male: 0.010788, female: 0.025758 },
  { age: 105, male: 0.007492, female: 0.018632 },
  { age: 106, male: 0.005096, female: 0.013195 },
  { age: 107, male: 0.003397, female: 0.009138 },
  { age: 108, male: 0.002206, female: 0.006172 },
  { age: 109, male: 0.001407, female: 0.004057 },
  { age: 110, male: 0.000875, female: 0.002586 },
  { age: 111, male: 0.000520, female: 0.001598 },
  { age: 112, male: 0.000304, female: 0.000954 },
  { age: 113, male: 0.000177, female: 0.000552 },
  { age: 114, male: 0.000089, female: 0.000310 },
  { age: 115, male: 0.000051, female: 0.000161 },
  { age: 116, male: 0.000025, female: 0.000080 },
  { age: 117, male: 0.000013, female: 0.000046 },
  { age: 118, male: 0.000000, female: 0.000023 },
  { age: 119, male: 0.000000, female: 0.000011 },
]

export const MORTALITY_SOURCE =
  'SSA 2024 Trustees Report cohort life tables (Alt2/intermediate), committed sha256-pinned snapshot at reference/ssa-snapshot/; male 1969 / female 1972 birth cohorts (the primary household), S(age|65)=l(age)/l(65); PINNED 2026-06-11 — a TR-vintage bump is a deliberate re-pin, never a silent refresh'

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
