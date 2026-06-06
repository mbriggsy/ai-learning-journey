/**
 * Joint-and-survivor longevity from sex-specific COHORT curves.
 *
 * The HARD requirement (contract #1): sample per-path, per-spouse death years AND
 * retain which spouse dies first per path. The closed-form last-survivor mixture
 * `P = pₓ + pᵧ − pₓpᵧ` alone does NOT retain survivor identity — and the death-order
 * conditional filter (P3·U10 / P4) is unbuildable without it. So this module SAMPLES
 * each spouse's death year (inverse-transform on the survival curve) and reports the
 * first-death year + the survivor's index per path. The couple last-survivor figure
 * is DERIVED from the two shipped sex-specific curves through the formula — never a
 * hardcoded constant (a single blended rate is arithmetically inconsistent: a sex-
 * differentiated pair yields ~0.55 to age 90, not the 0.4375 a symmetric 0.25 gives).
 *
 * Independence is assumed (real spousal mortality is positively correlated), which
 * mildly OVERSTATES last-survivor probability — acceptable because it errs SAFE for a
 * survival floor (a longer planning horizon is the conservative direction), documented
 * so it isn't mistaken for precision. Pure: consumes injected uniforms, no entropy.
 */
import type { Sex } from '@shared/model'
import { survivalProbability, SURVIVAL_BASE_AGE, SURVIVAL_MAX_AGE } from '@engine/reference/mortality'

/** One person's longevity inputs. */
export interface LongevityPerson {
  readonly sex: Sex
  /** Whole-year age at simulation year 0. */
  readonly currentAge: number
}

/**
 * P(this person is alive `years` from now | alive now), from the cohort curve:
 * S(currentAge + years) / S(currentAge), clamped to [0, 1].
 */
export function survivalToYear(person: LongevityPerson, years: number): number {
  const base = survivalProbability(person.sex, person.currentAge)
  if (base <= 0) return 0
  const ahead = survivalProbability(person.sex, person.currentAge + years)
  return Math.min(1, ahead / base)
}

/**
 * P(AT LEAST ONE of the couple is alive `years` from now), DERIVED from the two
 * sex-specific curves: pₐ + p_b − pₐ·p_b (independence). Never a hardcoded couple
 * number — the longevity test asserts the sampled couple survival matches THIS.
 */
export function coupleSurvivalToYear(a: LongevityPerson, b: LongevityPerson, years: number): number {
  const pa = survivalToYear(a, years)
  const pb = survivalToYear(b, years)
  return pa + pb - pa * pb
}

/**
 * Sample the death-year offset (whole years from now until death) for one person,
 * via inverse-transform on the conditional survival curve. `u` ∈ [0, 1): small u →
 * long life (the person outlives a high survival quantile), u near 1 → dies young.
 * The returned offset is ≥ 1 (death is at least next year). Survival past
 * {@link SURVIVAL_MAX_AGE} is capped there.
 *
 * (The cohort table starts at age 65; for a person currently < 65 the conditional
 * survival is ~1 until 65, so pre-65 deaths are not sampled — a directional
 * limitation acceptable for a retirement tool where pre-65 mortality is low.)
 */
export function sampleDeathYearOffset(person: LongevityPerson, u: number): number {
  const base = survivalProbability(person.sex, person.currentAge)
  if (base <= 0) return 1
  const startAge = Math.max(person.currentAge, SURVIVAL_BASE_AGE)
  for (let age = startAge + 1; age <= SURVIVAL_MAX_AGE; age++) {
    const conditionalSurvival = survivalProbability(person.sex, age) / base
    if (conditionalSurvival <= u) {
      return age - person.currentAge // alive through age-1, dies at `age`
    }
  }
  return SURVIVAL_MAX_AGE - person.currentAge
}

/** Per-path longevity outcome — retains survivor identity. */
export interface CouplePathLongevity {
  /** Death-year offset (years from now) for each person, index-aligned to the input. */
  readonly deathYearOffsets: readonly number[]
  /** The first death (min offset) — the joint→survivor two-regime boundary. */
  readonly firstDeathYear: number
  /** The last death (max offset) — the couple's planning horizon on this path. */
  readonly lastDeathYear: number
  /** Index of the SURVIVOR (the later-dying person); for a tie or a single person,
   *  the lower index. This is the death-order filter's precondition. */
  readonly survivorIndex: number
  /** Index of the FIRST to die (the complement of the survivor on a 2-person couple). */
  readonly firstToDieIndex: number
}

/**
 * Sample one path's couple longevity from per-person uniforms (one uniform per
 * person, index-aligned). Deterministic in the uniforms (so a fixed seed reproduces
 * identical death years — CRN: the boundary is at the same place for two candidates
 * under one seed, so they consume identical market draws for the overlapping years).
 */
export function sampleCouplePath(
  people: readonly LongevityPerson[],
  uniforms: readonly number[],
): CouplePathLongevity {
  const deathYearOffsets: number[] = []
  for (let i = 0; i < people.length; i++) {
    const person = people[i]
    const u = uniforms[i]
    if (person === undefined || u === undefined) {
      deathYearOffsets.push(SURVIVAL_MAX_AGE) // defensive; caller aligns lengths
      continue
    }
    deathYearOffsets.push(sampleDeathYearOffset(person, u))
  }

  let firstDeathYear = Infinity
  let lastDeathYear = -Infinity
  let survivorIndex = 0
  let firstToDieIndex = 0
  for (let i = 0; i < deathYearOffsets.length; i++) {
    const d = deathYearOffsets[i] ?? SURVIVAL_MAX_AGE
    if (d < firstDeathYear) {
      firstDeathYear = d
      firstToDieIndex = i
    }
    if (d > lastDeathYear) {
      lastDeathYear = d
      survivorIndex = i
    }
  }

  return {
    deathYearOffsets,
    firstDeathYear: Number.isFinite(firstDeathYear) ? firstDeathYear : 0,
    lastDeathYear: Number.isFinite(lastDeathYear) ? lastDeathYear : 0,
    survivorIndex,
    firstToDieIndex,
  }
}
