import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  survivalToYear,
  coupleSurvivalToYear,
  sampleDeathYearOffset,
  sampleCouplePath,
  type LongevityPerson,
} from '@engine/longevity'
import { survivalProbability, COHORT_SURVIVAL } from '@engine/reference/mortality'
import { mulberry32 } from '@engine/rng'

const MALE_65: LongevityPerson = { sex: 'male', currentAge: 65 }
const FEMALE_65: LongevityPerson = { sex: 'female', currentAge: 65 }

describe('cohort survival table — shape', () => {
  it('S(65)=1, monotone decreasing, female > male at every age past 65', () => {
    const first = COHORT_SURVIVAL[0]
    expect(first?.age).toBe(65)
    expect(first?.male).toBe(1)
    expect(first?.female).toBe(1)
    for (let i = 1; i < COHORT_SURVIVAL.length; i++) {
      const prev = COHORT_SURVIVAL[i - 1]!
      const cur = COHORT_SURVIVAL[i]!
      expect(cur.male).toBeLessThanOrEqual(prev.male)
      expect(cur.female).toBeLessThanOrEqual(prev.female)
      expect(cur.female).toBeGreaterThan(cur.male) // women survive longer — the reason sex matters
    }
  })

  it('the SSA-pinned anchors hold: male S(90)=0.320872 (1969 cohort), female S(90)=0.434841 (1972 cohort)', () => {
    // EXTERNALLY derived (DND/012): l(90)/l(65) computed straight from the committed
    // SSA TR2024 CSVs (reference/ssa-snapshot/), independent of the engine's table read.
    expect(survivalProbability('male', 90)).toBeCloseTo(0.320872, 5)
    expect(survivalProbability('female', 90)).toBeCloseTo(0.434841, 5)
  })
})

describe('the full-vector source bind (insight 021 — review fold 2026-06-11)', () => {
  // The adversary lens proved the prior guard set (shape + two S(90) anchors) admits a
  // SMOOTH interior corruption — including the optimistic-direction one (a 0.99-scaled
  // male curve shortens sampled horizons → inflates the headline). The bind below kills
  // the whole class: EVERY baked value must re-derive from the committed SSA CSVs.
  const parseLx = (file: string, birthYear: number): Map<number, number> => {
    const text = readFileSync(
      fileURLToPath(new URL(`../reference/ssa-snapshot/${file}`, import.meta.url)),
      'utf8',
    )
    const lines = text.split(/\r?\n/)
    const start = lines.findIndex((l) => l.startsWith('Year,x,'))
    expect(start, `${file} carries the Year,x,q(x),l(x) header`).toBeGreaterThan(-1)
    const lx = new Map<number, number>()
    for (const line of lines.slice(start + 1)) {
      const parts = line.split(',')
      if (Number(parts[0]) !== birthYear) continue
      lx.set(Number(parts[1]), Number(parts[3]))
    }
    return lx
  }

  it('every COHORT_SURVIVAL value re-derives as l(age)/l(65) from the committed CSVs (male 1969 / female 1972)', () => {
    const m = parseLx('CohLifeTables_M_Alt2_TR2024.csv', 1969)
    const f = parseLx('CohLifeTables_F_Alt2_TR2024.csv', 1972)
    const m65 = m.get(65)
    const f65 = f.get(65)
    expect(m65, 'male cohort 1969 present with l(65) > 0').toBeGreaterThan(0)
    expect(f65, 'female cohort 1972 present with l(65) > 0').toBeGreaterThan(0)
    expect(COHORT_SURVIVAL, 'ages 65..119 inclusive').toHaveLength(55)
    for (const row of COHORT_SURVIVAL) {
      const lm = m.get(row.age)
      const lf = f.get(row.age)
      expect(lm !== undefined && lf !== undefined, `age ${row.age} present in both CSVs`).toBe(true)
      // toBe-exact: the generator stored Number(x.toFixed(6)); the same rounding here
      // reproduces it bit-for-bit, so ANY divergence — however smooth — fails loud.
      expect(row.male, `male S(${row.age}|65) binds to the CSV`).toBe(Number((lm! / (m65 ?? 1)).toFixed(6)))
      expect(row.female, `female S(${row.age}|65) binds to the CSV`).toBe(Number((lf! / (f65 ?? 1)).toFixed(6)))
    }
  })
})

describe('couple last-survivor is DERIVED, never hardcoded', () => {
  it('to age 90 ≈ 0.62 (SSA 1969/1972 cohorts), and materially exceeds either single life', () => {
    const couple = coupleSurvivalToYear(MALE_65, FEMALE_65, 25) // both reach 90
    const male = survivalToYear(MALE_65, 25)
    const female = survivalToYear(FEMALE_65, 25)
    expect(couple).toBeCloseTo(0.6162, 3)
    expect(couple).toBeGreaterThan(male)
    expect(couple).toBeGreaterThan(female)
    // exactly the formula on the two curves (not a constant)
    expect(couple).toBeCloseTo(male + female - male * female, 12)
  })

  it('is NOT the symmetric-rate fallacy (0.25+0.25−0.0625=0.4375 is wrong)', () => {
    // A symmetric 0.25-each toy rate applied to both would give 0.4375; the
    // sex-differentiated SSA pair gives ~0.62 — proving the engine uses two curves.
    expect(coupleSurvivalToYear(MALE_65, FEMALE_65, 25)).toBeGreaterThan(0.5)
  })
})

describe('sampling reproduces the curve (internal consistency, law of large numbers)', () => {
  it('a sampled person’s survival-to-90 matches survivalToYear (the curve)', () => {
    const rand = mulberry32(4242)
    const n = 50_000
    let aliveAt90 = 0
    for (let i = 0; i < n; i++) {
      if (sampleDeathYearOffset(MALE_65, rand()) > 25) aliveAt90++
    }
    expect(aliveAt90 / n).toBeCloseTo(survivalToYear(MALE_65, 25), 2) // ≈ 0.32
  })

  it('the sampled COUPLE survival-to-90 equals the FORMULA on the two curves', () => {
    const rand = mulberry32(99)
    const n = 50_000
    const people = [MALE_65, FEMALE_65]
    let atLeastOneAt90 = 0
    for (let i = 0; i < n; i++) {
      const path = sampleCouplePath(people, [rand(), rand()])
      if (path.lastDeathYear > 25) atLeastOneAt90++
    }
    // The KEY assertion (plan): empirical couple survival ≈ the formula, not a constant.
    expect(atLeastOneAt90 / n).toBeCloseTo(coupleSurvivalToYear(MALE_65, FEMALE_65, 25), 2)
  })
})

describe('per-path survivor identity is retained (the death-order precondition)', () => {
  it('queries "paths where person 0 died first" → non-empty and deterministic', () => {
    const people = [MALE_65, FEMALE_65]
    const run = () => {
      const rand = mulberry32(7)
      const firstToDie0: number[] = []
      for (let i = 0; i < 5_000; i++) {
        const path = sampleCouplePath(people, [rand(), rand()])
        if (path.firstToDieIndex === 0) firstToDie0.push(i)
      }
      return firstToDie0
    }
    const a = run()
    const b = run()
    expect(a.length).toBeGreaterThan(0) // non-empty sub-population
    expect(a.length).toBeLessThan(5_000) // not everyone (the wife often outlives)
    expect(a).toEqual(b) // deterministic for a fixed seed
  })

  it('the male (shorter-lived) dies first MORE often than the female', () => {
    const rand = mulberry32(2025)
    const people = [MALE_65, FEMALE_65]
    let maleFirst = 0
    const n = 20_000
    for (let i = 0; i < n; i++) {
      const path = sampleCouplePath(people, [rand(), rand()])
      if (path.firstToDieIndex === 0) maleFirst++
    }
    expect(maleFirst / n).toBeGreaterThan(0.5) // the husband predeceases more often
  })

  it('survivor is the later-dying spouse; first-to-die is the complement', () => {
    const path = sampleCouplePath([MALE_65, FEMALE_65], [0.99, 0.01]) // male dies young, female old
    expect(path.firstToDieIndex).toBe(0)
    expect(path.survivorIndex).toBe(1)
    expect(path.firstDeathYear).toBeLessThan(path.lastDeathYear)
  })
})
