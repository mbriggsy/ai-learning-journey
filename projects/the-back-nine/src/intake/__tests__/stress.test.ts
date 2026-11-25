import { describe, expect, it } from 'vitest'
import { budgetYearZeroFullTotal } from '@budget/budgetToSpending'
import { householdBenefits, survivorBenefitAnnual } from '@engine/socialSecurityBenefit'
import { canonicalIdentityToken } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../ui/devSeeds'
import { applyStress, applyStresses, stressOffer, STRESS_RANGES, type StressChoice } from '../stress'
import { isWorkingYearCostStale } from '../workingYearQuote'

/**
 * Act 6 · RC11's stress writers (plan RC11, "Test scenarios"): each changes ONLY its own input on a copy of the plan's
 * draft, compared field by field; the draft handed in is never written; a stress with nothing to act on is refused by
 * name; Combined is every chosen stress at once.
 */

/** Every leaf path where two drafts differ (objects and arrays of objects recursed). */
function diffPaths(a: unknown, b: unknown, path = ''): string[] {
  if (canonicalIdentityToken(a) === canonicalIdentityToken(b)) return []
  const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object'
  if (isObj(a) && isObj(b)) {
    if (Array.isArray(a) !== Array.isArray(b)) return [path]
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...keys].flatMap((k) => diffPaths(a[k], b[k], path === '' ? k : `${path}.${k}`))
  }
  return [path]
}

/** A deep-frozen draft: any write to it throws. */
function frozen<T>(v: T): T {
  if (v !== null && typeof v === 'object') {
    for (const k of Object.keys(v)) frozen((v as Record<string, unknown>)[k])
    Object.freeze(v)
  }
  return v
}

function copyOf(draft: ScenarioDraft, choice: StressChoice): ScenarioDraft {
  const r = applyStress(draft, choice)
  if (!r.ok) throw new Error(`[test setup] refused: ${JSON.stringify(r.refusal)}`)
  return r.draft
}

const health = DEV_SEEDS.health
const enhanced: ScenarioDraft = { ...health, enhancedSubsidies: true }
const datesplit = DEV_SEEDS.datesplit

describe('the Social Security stress: every statement figure scaled, nothing else', () => {
  it('moves each person’s pia alone, by the size, and never writes the draft it was handed', () => {
    const before = JSON.stringify(health)
    const copy = copyOf(frozen(structuredClone(health)), { id: 'social-security', pct: 20 })
    expect(diffPaths(health, copy).sort()).toEqual(['people.0.pia', 'people.1.pia'])
    expect(copy.people.map((p) => p.pia)).toEqual(health.people.map((p) => Math.round(p.pia! * 0.8 * 100) / 100))
    expect(JSON.stringify(health)).toBe(before)
  })

  it('the trace holds in the engine: own, spousal and survivor benefits all scale with pia (dime rounding aside)', () => {
    const copy = copyOf(health, { id: 'social-security', pct: 25 })
    const people = (d: ScenarioDraft) => d.people.map((p) => ({ piaAnnual: p.pia!, claimAge: p.socialSecurityClaimAge!, birthYear: p.birthYear! }))
    const was = householdBenefits(people(health))
    const now = householdBenefits(people(copy))
    // One SSA dime per month per piece, a year of them: $1.20 a year.
    was.forEach((b, i) => {
      expect(Math.abs(now[i]!.ownAnnual - 0.75 * b.ownAnnual)).toBeLessThanOrEqual(1.2)
      expect(Math.abs(now[i]!.spousalExcessAnnual - 0.75 * b.spousalExcessAnnual)).toBeLessThanOrEqual(1.2)
    })
    // A spousal excess, where one exists, scales too: a lower earner under half the higher's figure.
    const spousal: ScenarioDraft = { ...health, people: [health.people[0]!, { ...health.people[1]!, pia: 6_000 }] as unknown as ScenarioDraft['people'] }
    const sWas = householdBenefits(people(spousal))[1]!.spousalExcessAnnual
    const sNow = householdBenefits(people(copyOf(spousal, { id: 'social-security', pct: 25 })))[1]!.spousalExcessAnnual
    expect(sWas).toBeGreaterThan(0)
    expect(Math.abs(sNow - 0.75 * sWas)).toBeLessThanOrEqual(1.2)
    const dead = people(health)[0]!
    const deadNow = people(copy)[0]!
    expect(Math.abs(survivorBenefitAnnual(deadNow, health.people[1]!.birthYear!, 70) - 0.75 * survivorBenefitAnnual(dead, health.people[1]!.birthYear!, 70))).toBeLessThanOrEqual(1.2)
  })

  it('refuses by name where nobody has a benefit, and a size outside its range', () => {
    const none: ScenarioDraft = { ...health, people: health.people.map((p) => ({ ...p, pia: 0 })) as unknown as ScenarioDraft['people'] }
    expect(applyStress(none, { id: 'social-security', pct: 20 })).toEqual({ ok: false, refusal: { kind: 'no-benefit' } })
    expect(applyStress(health, { id: 'social-security', pct: STRESS_RANGES['social-security'].max + 5 })).toEqual({
      ok: false,
      refusal: { kind: 'size-outside-range', id: 'social-security', pct: STRESS_RANGES['social-security'].max + 5 },
    })
  })
})

describe('the out-of-pocket stress: the figure scaled, and the spending that holds it raised by the same dollars', () => {
  it('no budget: the figure and the one spending figure, nothing else', () => {
    const copy = copyOf(frozen(structuredClone(health)), { id: 'out-of-pocket', pct: 50 })
    expect(diffPaths(health, copy).sort()).toEqual(['annualSpendingReal', 'health.oopMedicalAnnual'])
    expect(copy.health.oopMedicalAnnual).toBe(health.health.oopMedicalAnnual! * 1.5)
    expect(copy.annualSpendingReal! - health.annualSpendingReal!).toBeCloseTo(health.health.oopMedicalAnnual! * 0.5, 6)
  })

  it('under a budget: the total re-reconciles to the lines plus the new figure (the plan’s own OOP write)', () => {
    const budgeted: ScenarioDraft = { ...DEV_SEEDS.budget, health: { ...DEV_SEEDS.budget.health, oopMedicalAnnual: 5_000 } }
    const reconciled: ScenarioDraft = { ...budgeted, annualSpendingReal: budgetYearZeroFullTotal(budgeted.budget!, 5_000) }
    const copy = copyOf(reconciled, { id: 'out-of-pocket', pct: 100 })
    expect(diffPaths(reconciled, copy).sort()).toEqual(['annualSpendingReal', 'health.oopMedicalAnnual'])
    expect(copy.annualSpendingReal).toBe(budgetYearZeroFullTotal(budgeted.budget!, 10_000))
    expect(copy.annualSpendingReal! - reconciled.annualSpendingReal!).toBeCloseTo(5_000, 6)
  })

  it('a working plan: the pay check’s yearly cost rises by the same dollars, and stays as fresh as it was', () => {
    const copy = copyOf(datesplit, { id: 'out-of-pocket', pct: 50 })
    const paths = diffPaths(datesplit, copy).sort()
    expect(paths.filter((p) => !p.startsWith('workingYearCost.'))).toEqual(['annualSpendingReal', 'health.oopMedicalAnnual'])
    expect(paths.filter((p) => p.startsWith('workingYearCost.'))).toHaveLength(1)
    const figure = (d: ScenarioDraft) => (d.workingYearCost!.kind === 'confirmed' ? d.workingYearCost!.quotedReal : d.workingYearCost!.amountReal)
    expect(figure(copy) - figure(datesplit)).toBeCloseTo(datesplit.health.oopMedicalAnnual! * 0.5, 6)
    expect(isWorkingYearCostStale(copy)).toBe(isWorkingYearCostStale(datesplit))
  })

  it('refuses by name where the plan has no out-of-pocket figure', () => {
    expect(DEV_SEEDS.retired.health.oopMedicalAnnual).toBeUndefined()
    expect(applyStress(DEV_SEEDS.retired, { id: 'out-of-pocket', pct: 50 })).toEqual({ ok: false, refusal: { kind: 'no-out-of-pocket' } })
  })
})

describe('the subsidy-rules stress: the aca-subsidy lever to current law, where it is a stress at all', () => {
  it('moves the one regime key (the lever’s own write), and nothing else', () => {
    const copy = copyOf(frozen(structuredClone(enhanced)), { id: 'subsidy-rules' })
    expect(diffPaths(enhanced, copy)).toEqual(['enhancedSubsidies'])
    expect('enhancedSubsidies' in copy).toBe(false)
  })

  it('is absent with no years before 65, and refused on a plan already on current law (it could only help there)', () => {
    expect(stressOffer({ ...DEV_SEEDS.retired, enhancedSubsidies: true }, 'subsidy-rules')).toEqual({ kind: 'no-marketplace-years' })
    expect(stressOffer({ ...DEV_SEEDS.date65, enhancedSubsidies: true }, 'subsidy-rules')).toEqual({ kind: 'no-marketplace-years' })
    expect(stressOffer(health, 'subsidy-rules')).toEqual({ kind: 'already-current-law' })
    expect(stressOffer(enhanced, 'subsidy-rules')).toBeNull()
  })
})

describe('Combined: every chosen stress at once', () => {
  it('is the writers composed, each field its own writer’s', () => {
    const choices: StressChoice[] = [{ id: 'subsidy-rules' }, { id: 'out-of-pocket', pct: 50 }, { id: 'social-security', pct: 20 }]
    const r = applyStresses(frozen(structuredClone(enhanced)), choices)
    if (!r.ok) throw new Error('[test setup] refused')
    const each = copyOf(copyOf(copyOf(enhanced, choices[2]!), choices[1]!), choices[0]!)
    expect(r.draft).toEqual(each)
    expect(diffPaths(enhanced, r.draft).sort()).toEqual(['annualSpendingReal', 'enhancedSubsidies', 'health.oopMedicalAnnual', 'people.0.pia', 'people.1.pia'])
  })

  it('refuses by name when one chosen stress cannot run', () => {
    expect(applyStresses(health, [{ id: 'social-security', pct: 20 }, { id: 'subsidy-rules' }])).toEqual({ ok: false, refusal: { kind: 'already-current-law' } })
  })
})
