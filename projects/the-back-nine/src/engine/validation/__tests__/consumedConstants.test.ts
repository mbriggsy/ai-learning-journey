/**
 * U14 S0.2 — the per-run consumed-constant derivation (the council's Attack-5 fold).
 *
 * Two batteries:
 *  1. DERIVATION — the run's own built params/overlay select the families/entries (never a
 *     whole-registry read, never a sibling state's entries).
 *  2. SOURCE-BIND — every mapping row is asserted against the LIVE src tree: each includable
 *     entry carries a named consumption witness (file + symbol) that must still import it, and
 *     each excluded (doc/meta/parked) entry must have NO run-layer consumer. A mapping row that
 *     drifts from the engine's actual reads goes red HERE, so the derivation can never rot
 *     into a hand list (insights 080/081 — the mirror must track the producer).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { OverlayParams, PersonInputs, SimulationParams } from '@shared/model'
import { ALL_CONSTANTS } from '@engine/constants'
import { productionMarket, survivorSpendingRatio } from '../../reference/methodology'
import { consumedConstantEntries } from '../consumedConstants'

const P65: PersonInputs = {
  sex: 'male', currentAge: 65, birthYear: 1961, retirementAge: 65,
  earnedIncomeReal: 0, pia: 0, socialSecurityClaimAge: 65,
}

function makeParams(over: Partial<SimulationParams> = {}): SimulationParams {
  return {
    initialPortfolio: 1000,
    annualSpendingReal: 40,
    stockWeight: 0.5,
    people: [P65],
    survivorSpendingRatio: 0.75,
    drawdownPolicy: 'proportional',
    market: productionMarket.value,
    paths: 100,
    maxHorizonYears: 30,
    longevityMode: 'fixed-horizon',
    ...over,
  }
}

const baseOverlay: OverlayParams = {
  taxEnabled: true,
  rmdEnabled: true,
  startCalendarYear: 2026,
  buckets: { taxable: 0, pretax: 1000, roth: 0 },
  filing: 'mfj',
}

const keysOf = (params: SimulationParams): string[] =>
  consumedConstantEntries(params).map((c) => c.key)

describe('consumedConstantEntries — the derivation is the run, not the registry', () => {
  it('a spine-only run (no overlay) consumes NO registry family — only the methodology defaults it still carries', () => {
    const keys = keysOf(makeParams())
    expect(keys.filter((k) => !k.startsWith('methodology.'))).toEqual([])
    // The default market + ratio are the constants' own bytes → consumed.
    expect(keys).toContain('methodology.productionMarket')
    expect(keys).toContain('methodology.survivorSpendingRatio')
  })

  it('a user override severs a methodology default from the run (the deep-equal producer read)', () => {
    const overridden = makeParams({
      market: { ...productionMarket.value, stock: { mean: 0.06, stdDev: 0.17 } },
      survivorSpendingRatio: 0.8,
    })
    const keys = keysOf(overridden)
    expect(keys).not.toContain('methodology.productionMarket')
    expect(keys).not.toContain('methodology.survivorSpendingRatio')
    expect(survivorSpendingRatio.value, 'the default the override severed').toBe(0.75)
  })

  it('tax ON pulls the federal family — priced entries only, never the doc/meta rows', () => {
    const keys = keysOf(makeParams({ overlay: baseOverlay }))
    expect(keys).toContain('tax.ordinaryBracketsMFJ')
    expect(keys).toContain('tax.uniformLifetimeTableDivisors')
    expect(keys).toContain('tax.seniorBonus')
    // Doc/meta/parked rows price nothing in a run — a directional flip on one must never
    // block a household (the NOT_RUN_CONSUMED contract, import-audited + source-bound below).
    expect(keys).not.toContain('tax.niit')
    expect(keys).not.toContain('tax.inOutRule')
    expect(keys).not.toContain('tax.mfjToSingleTransition')
    expect(keys).not.toContain('tax.legalBasis')
    // No state named ⇒ no state rows; no healthcare ⇒ no health rows.
    expect(keys.some((k) => k.startsWith('state.'))).toBe(false)
    expect(keys.some((k) => k.startsWith('health.'))).toBe(false)
  })

  it('an NC household consumes NC entries ONLY — a sibling state never rides along', () => {
    const keys = keysOf(makeParams({ overlay: { ...baseOverlay, retirementState: 'NC' } }))
    expect(keys).toContain('state.ncRateSchedule')
    expect(keys).toContain('state.ncStandardDeduction')
    expect(keys.filter((k) => k.startsWith('state.nc'))).toHaveLength(7)
    expect(keys.some((k) => k.startsWith('state.pa'))).toBe(false)
    expect(keys.some((k) => k.startsWith('state.fl'))).toBe(false)
  })

  it("an 'elsewhere' / unpriced household consumes NO state entries (the disclosed-out posture)", () => {
    const keys = keysOf(makeParams({ overlay: { ...baseOverlay, retirementState: 'elsewhere' } }))
    expect(keys.some((k) => k.startsWith('state.'))).toBe(false)
  })

  it('the ACA regime flag selects EXACTLY one applicable-% table (one regime per run)', () => {
    const health: OverlayParams = { ...baseOverlay, healthcareEnabled: true }
    const statutory = keysOf(makeParams({ overlay: health }))
    expect(statutory).toContain('health.acaApplicablePercentage')
    expect(statutory).not.toContain('health.acaApplicablePercentageEnhanced')
    const enhanced = keysOf(makeParams({ overlay: { ...health, enhancedSubsidies: true } }))
    expect(enhanced).toContain('health.acaApplicablePercentageEnhanced')
    expect(enhanced).not.toContain('health.acaApplicablePercentage')
  })

  it('the extras typical is consumed iff the priced extras stream is present (intake-baked)', () => {
    const health: OverlayParams = { ...baseOverlay, healthcareEnabled: true }
    expect(keysOf(makeParams({ overlay: health }))).not.toContain('health.medicareExtrasTypical')
    expect(
      keysOf(makeParams({ overlay: { ...health, medicareExtrasMonthly: [244] } })),
    ).toContain('health.medicareExtrasTypical')
  })

  it('healthcare ON never pulls the doc/parked health rows (and DOES pull the now-sourced trend)', () => {
    const keys = keysOf(
      makeParams({ overlay: { ...baseOverlay, healthcareEnabled: true, medicareExtrasMonthly: [244] } }),
    )
    for (const doc of [
      'health.acaPtc',
      'health.partA2026',
      'health.magiDefinitions',
      'health.hsaFourthBucketRules',
      'health.obbbaHsa2026',
      'health.acaEnhancedSubsidyStatus', // its OWN clause (aca-freshness) owns it
    ]) {
      expect(keys, `${doc} must not join the pinning walk`).not.toContain(doc)
    }
    // The trend sourcing unit: `medicareCostTrend` is SOURCED and the per-year Part-B pricing
    // consumes it (buildPartBPricingSchedule in runTaxAwareDecumulation), so a healthcare-ON run
    // genuinely consumes the entry — it JOINS the pinning walk (pinned, so it neither blocks nor
    // discloses; presence here is the consumption record, insight 074).
    expect(keys).toContain('health.medicareCostTrend')
  })

  it('a positive PIA pulls the Social Security family (FRA tables ride via their accessor)', () => {
    const none = keysOf(makeParams())
    expect(none.some((k) => k.startsWith('socialSecurity.'))).toBe(false)
    const withPia = keysOf(makeParams({ people: [{ ...P65, pia: 24_000 }] }))
    expect(withPia).toContain('socialSecurity.fullRetirementAge')
    expect(withPia).toContain('socialSecurity.workerReduction')
    expect(withPia).not.toContain('socialSecurity.deemedFilingDobCutoff') // code-embodied doc row
  })

  it('the accumulation construct pulls the contribution-ceiling family (intake-baked streams)', () => {
    const acc: OverlayParams = {
      ...baseOverlay,
      accumulation: { contributionsByPerson: [[]] },
    } as unknown as OverlayParams
    expect(keysOf(makeParams({ overlay: acc }))).toContain('contributions.employerPlan2026')
    expect(keysOf(makeParams({ overlay: baseOverlay }))).not.toContain('contributions.employerPlan2026')
  })

  it('solver.* calibration entries NEVER join the walk (their enforcement is the ε clause)', () => {
    const everything = makeParams({
      people: [{ ...P65, pia: 24_000 }],
      overlay: { ...baseOverlay, retirementState: 'NC', healthcareEnabled: true, medicareExtrasMonthly: [244] },
    })
    expect(keysOf(everything).some((k) => k.startsWith('solver.'))).toBe(false)
  })
})

// ---- SOURCE-BIND: the mapping rows against the live tree ------------------------------------

/** The consumption WITNESS for every includable family/entry whose read is not the plain
 *  entry-name import: {file, symbol}. A row here going red means the engine dropped or moved
 *  the read — the mapping (and this table) must move in the same change. */
const WITNESSES: ReadonlyArray<readonly [key: string, file: string, symbol: string]> = [
  ['tax.ordinaryBracketsMFJ', 'src/engine/taxCore.ts', 'ordinaryBracketsMFJ'],
  // U16 §S1 — the RMD divisor + start-age reads re-homed to @engine/rmd (the ONE producer shared with
  // the live solve anchor deriver); the mapping's witness moves with the consumption (source-bind law).
  ['tax.uniformLifetimeTableDivisors', 'src/engine/rmd.ts', 'uniformLifetimeTableDivisors'],
  ['tax.jointLifeLastSurvivorTable', 'src/engine/rmd.ts', 'jointLifeLastSurvivorTable'],
  ['tax.seniorBonus', 'src/engine/taxCore.ts', 'seniorBonus'],
  ['tax.capitalGainsBreakpoints', 'src/engine/taxCore.ts', 'capitalGainsBreakpoints'],
  ['tax.ssProvisionalThresholds', 'src/engine/taxCore.ts', 'ssProvisionalThresholds'],
  ['tax.rmdStartAge', 'src/engine/rmd.ts', 'rmdStartAge'],
  ['state.* (the whole priced-profile family)', 'src/engine/stateTax.ts', 'STATE_TAX_PROFILES'],
  ['health.acaApplicablePercentage', 'src/engine/taxOverlay.ts', 'acaApplicablePercentage'],
  ['health.acaApplicablePercentageEnhanced', 'src/engine/taxOverlay.ts', 'acaApplicablePercentageEnhanced'],
  ['health.federalPovertyGuidelines', 'src/engine/healthOverlay.ts', 'federalPovertyGuidelines'],
  ['health.irmaa', 'src/engine/taxOverlay.ts', 'irmaa'],
  ['health.partB2026', 'src/engine/taxOverlay.ts', 'partB2026'],
  ['health.medicareCostTrend', 'src/engine/taxOverlay.ts', 'medicareCostTrend'], // the trend unit's consumption half (074)
  ['health.acaAgeRatingCurve', 'src/intake/intakeMap.ts', 'acaAgeRatingCurve'],
  ['health.medicareExtrasTypical', 'src/intake/intakeMap.ts', 'medicareExtrasTypicalMonthly'],
  ['socialSecurity.fullRetirementAge', 'src/engine/socialSecurityBenefit.ts', 'fraMonthsForBirthYear'],
  ['socialSecurity.survivorFullRetirementAge', 'src/engine/socialSecurityBenefit.ts', 'fraMonthsForBirthYear'],
  ['socialSecurity.workerReduction', 'src/engine/socialSecurityBenefit.ts', 'workerReduction'],
  ['socialSecurity.spousalRate', 'src/engine/socialSecurityBenefit.ts', 'spousalRate'],
  ['contributions.employerPlan2026', 'src/intake/sanity.ts', 'employerPlan2026'],
  ['contributions.hsa2026', 'src/intake/sanity.ts', 'hsa2026'],
] as const

/** Doc/meta/parked rows: NO run-layer (engine outside constants, or intake) file may import
 *  one. If a run-layer consumer appears, the NOT_RUN_CONSUMED set must shrink in that change. */
const EXCLUDED_ROWS = [
  'legalBasis',
  'mfjToSingleTransition',
  'niit',
  'inOutRule',
  'deemedFilingDobCutoff',
  'acaPtc',
  'partA2026',
  'magiDefinitions',
  'hsaFourthBucketRules',
  'obbbaHsa2026',
] as const

/** Crude but sufficient: strip block + line comments so doc mentions can't fake consumption. */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

const importLinesOf = (src: string): string =>
  stripComments(src)
    .split('\n')
    .filter((l) => /^\s*(import\b|[A-Za-z0-9_$]+,?\s*$|\{|\})/.test(l))
    .join('\n')

describe('consumedConstants — SOURCE-BIND (the mapping tracks the live tree, never a hand list)', () => {
  const root = process.cwd()

  it('every includable row has its named consumption witness in place', () => {
    for (const [key, file, symbol] of WITNESSES) {
      const src = stripComments(readFileSync(join(root, file), 'utf8'))
      expect(new RegExp(`\\b${symbol}\\b`).test(src), `${key}: ${file} must still read ${symbol}`).toBe(true)
    }
  })

  it('every excluded (doc/meta/parked) row has NO run-layer consumer', async () => {
    const { readdirSync, statSync } = await import('node:fs')
    const files: string[] = []
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) {
          if (name === '__tests__' || full.includes(join('engine', 'constants'))) continue
          walk(full)
        } else if (/\.tsx?$/.test(name)) files.push(full)
      }
    }
    walk(join(root, 'src', 'engine'))
    walk(join(root, 'src', 'intake'))
    for (const name of EXCLUDED_ROWS) {
      const consumers = files.filter((f) =>
        new RegExp(`\\b${name}\\b`).test(importLinesOf(readFileSync(f, 'utf8'))),
      )
      expect(consumers, `${name} is excluded as doc/meta — no run-layer import may exist`).toEqual([])
    }
  })

  it('every NON-excluded registry entry in a walkable family is either witnessed here or a regime/presence-refined sibling', () => {
    // Completeness backstop: a NEW priced entry added to a walkable family must either gain a
    // witness row above (it will be consumed → include) or join NOT_RUN_CONSUMED (doc) — this
    // test names the unclassified stragglers so the classification is a conscious act.
    const witnessed = new Set(WITNESSES.map(([k]) => k.split(' ')[0]))
    const excluded = new Set<string>(EXCLUDED_ROWS)
    const stragglers = Object.keys(ALL_CONSTANTS).filter((key) => {
      const [family, name] = key.split('.') as [string, string]
      if (family === 'solver') return false // never walked — the ε clause owns them
      if (excluded.has(name)) return false
      if (witnessed.has(key)) return false
      if (family === 'state') return false // family-witnessed via STATE_TAX_PROFILES
      // Regime/presence-refined or sibling-witnessed rows (one witness per consumer file+symbol
      // family is enough to bind the read pattern):
      const siblingWitnessed = [
        'tax.ordinaryBracketsSingle',
        'tax.standardDeductionMFJ',
        'tax.standardDeductionSingle',
        'tax.age65AdditionMFJ',
        'tax.age65AdditionSingle',
        'tax.stateIncomeTax',
        'socialSecurity.spouseReduction',
        'socialSecurity.delayedRetirementCredit',
        'socialSecurity.survivorReduction',
        'socialSecurity.ribLim',
        'contributions.ira2026',
        'contributions.annualAdditions415c2026',
        'health.acaEnhancedSubsidyStatus', // enforced by the token's OWN aca-freshness clause
      ]
      return !siblingWitnessed.includes(key)
    })
    expect(stragglers, 'unclassified registry entries — classify each (witness or doc-exclude)').toEqual([])
  })
})
