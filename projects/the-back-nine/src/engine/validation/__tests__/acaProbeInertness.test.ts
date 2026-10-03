/**
 * PROBE INERTNESS (the solve-time build, 2026-10-03) — the named-driver probe's ACA-regime world is
 * skipped wherever `acaRegimeReachable` (`src/engine/acaRegime.ts`) is false. A FALSE "inert" would
 * skip a world that can flip the crown and ship the sampling-noise sentinel where the ACA driver
 * belongs — calm-but-wrong — so the skip is proven EXACT here, not argued:
 *
 *  1. the rule's truth table, the over-approximation (a premium with no pre-65 member) pinned TRUE;
 *  2. the inert side: on a world the rule calls unreachable, the flipped regime's `simulate` output is
 *     bit-identical to the base's — every drawdown policy plus a conversion, on both solve seeds — on
 *     the real Medicare-only `retired` household AND on `healthnc` with its premiums zeroed (healthcare
 *     on, a quote stream present, nothing priced);
 *  3. non-vacuity: on the real priced household the flip DOES move the output;
 *  4. the driver: the inert skip names exactly what the legacy flip names, with zero crown calls;
 *  5. the census: every read of the regime flag and of the ACA table's contents, pinned — a new one
 *     reds here and forces the rule's soundness to be re-argued (the module's EDIT-TOGETHER warning);
 *  6. the witness: the shipped solve simulates NO enhanced-regime world on a Medicare-only household,
 *     where the legacy guard simulated the whole roster on both seeds there.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { DRAWDOWN_POLICIES, type SimulationParams } from '@shared/model'
import * as sim from '@engine/simulate'
import { acaRegimeReachable } from '@engine/acaRegime'
import { buildSpineParams } from '@intake/intakeMap'
import { buildSolveRequest } from '@intake/solveDispatch'
import { acaEnhancedSubsidyStatus } from '@engine/constants'
import { bitEqual } from '../../solver/__tests__/bitIdentity'
import { applyCandidate, type CandidateStrategy } from '../../solver/candidates'
import { solveWithMint } from '../../solver/solveEntry'
import { ACA_ENHANCED_PROBE, ACA_ENHANCED_PROBE_HEALTHCARE_GUARD, namedDriverProbe } from '../gradeCalibration'
import { deriveSeedB } from '../heldOutSeed'
import { epochDayFromIsoDate } from '../oracleToken'
import { resolveDevSeed } from '../../../ui/devSeeds'

vi.mock('@engine/simulate', async (importOriginal) => {
  const real = await importOriginal<typeof import('@engine/simulate')>()
  return { ...real, simulate: vi.fn(real.simulate) }
})
const simulateMock = vi.mocked(sim.simulate)

const SEED_A = 0xbada55
const SEED_B = deriveSeedB(SEED_A)
const TODAY = epochDayFromIsoDate(acaEnhancedSubsidyStatus.value.verifiedOn) + 5

/** A dev seed's spine params at a small path count — the household the live solve's base is built from. */
const spine = (seed: string, paths = 64): SimulationParams => {
  const p = buildSpineParams(resolveDevSeed(seed)!)
  if (p === null) throw new Error(`${seed}: no spine params`)
  return { ...p, paths }
}
const flip = (p: SimulationParams): SimulationParams => ACA_ENHANCED_PROBE_HEALTHCARE_GUARD.transform(p)

const conversion: CandidateStrategy = {
  policy: 'proportional',
  conversion: { annualAmountReal: 30_000, startYearOffset: 0, years: 5 },
  provenance: 'grid',
}
const strategies: readonly CandidateStrategy[] = [
  ...DRAWDOWN_POLICIES.filter((policy) => policy !== 'custom').map((policy): CandidateStrategy => ({ policy, conversion: null, provenance: 'grid' })),
  conversion,
]

describe('acaRegimeReachable — the truth table', () => {
  const on = { healthcareEnabled: true } as const
  it.each([
    ['no overlay', undefined, false],
    ['healthcare off, a premium entered', { enrolledPremium: [5_000] }, false],
    ['healthcare on, no quote stream (the Medicare-only branch)', on, false],
    ['healthcare on, every premium 0', { ...on, enrolledPremium: [0, 0, 0] }, false],
    ['healthcare on, one positive premium', { ...on, enrolledPremium: [0, 4_200, 0] }, true],
    // The deliberate over-approximation: no pre-65 member is ever checked here — "reachable" (the probe
    // runs) is the safe side, and the differential below proves nothing is lost on the unreachable side.
    ['healthcare on, a positive premium (ages not consulted)', { ...on, enrolledPremium: [1] }, true],
  ] as const)('%s → %s', (_label, overlay, expected) => {
    expect(acaRegimeReachable(overlay as SimulationParams['overlay'])).toBe(expected)
  })

  it('binds to the real households: the Medicare-only spine is unreachable, the priced pre-65 spine reachable', () => {
    expect(acaRegimeReachable(spine('retired').overlay)).toBe(false)
    expect(acaRegimeReachable(spine('healthnc').overlay)).toBe(true)
    // The probe's own transform agrees: inapplicable (`=== base`) exactly where the rule says so.
    const retired = spine('retired')
    expect(ACA_ENHANCED_PROBE.transform(retired)).toBe(retired)
    const healthnc = spine('healthnc')
    expect(ACA_ENHANCED_PROBE.transform(healthnc)).not.toBe(healthnc)
  })
})

describe('the inert side — the flipped regime is bit-identical wherever the rule says unreachable', () => {
  const zeroedHealthnc = (): SimulationParams => {
    const p = spine('healthnc')
    const premiums = p.overlay!.enrolledPremium!
    expect(premiums.some((e) => e > 0), 'the fixture must START priced').toBe(true)
    return { ...p, overlay: { ...p.overlay!, enrolledPremium: premiums.map(() => 0) } }
  }
  const worlds: ReadonlyArray<readonly [string, () => SimulationParams]> = [
    ['retired (Medicare-only, no quote stream)', () => spine('retired')],
    ['healthnc with every premium zeroed (healthcare on, a stream, nothing priced)', zeroedHealthnc],
  ]
  for (const [label, build] of worlds) {
    it(`${label}: every policy + a conversion, seedA and seedB`, () => {
      const base = build()
      expect(base.overlay?.healthcareEnabled, 'the flip is only exercised on a healthcare-on world').toBe(true)
      expect(acaRegimeReachable(base.overlay)).toBe(false)
      const flipped = flip(base)
      expect(flipped.overlay?.enhancedSubsidies, 'the legacy flip really flipped').toBe(true)
      for (const c of strategies) {
        for (const seed of [SEED_A, SEED_B]) {
          const d = bitEqual(sim.simulate(applyCandidate(base, c), seed), sim.simulate(applyCandidate(flipped, c), seed))
          expect(d, `${label} · ${c.policy}${c.conversion ? ' + conversion' : ''} · seed ${seed}`).toEqual({ ok: true })
        }
      }
    }, 120_000)
  }

  it('NON-VACUITY: on the real priced household the flip moves the output', () => {
    const base = spine('healthnc')
    const d = bitEqual(sim.simulate(base, SEED_A), sim.simulate(flip(base), SEED_A))
    expect(d.ok, 'the enhanced regime must reach a priced pre-65 household — else the differential above proves nothing').toBe(false)
  }, 60_000)
})

describe('the driver — the skip names exactly what the legacy flip named', () => {
  it('a Medicare-only world: zero crown calls, the same sentinel the legacy flip reached by re-crowning', () => {
    const base = spine('retired')
    const crowns: SimulationParams[] = []
    const crownFor = (p: SimulationParams): string => {
      crowns.push(p)
      return 'the-base-winner' // the inert world re-crowns the base winner (proven bit-identical above)
    }
    const opts = { base, candidates: strategies, goal: 'pay-less-tax' as const, tieTolerance: 0, seed: SEED_A, baselineCrown: 'the-base-winner', crownFor }
    expect(namedDriverProbe(opts)).toEqual({ driver: 'sampling-noise-near-tie' })
    expect(crowns).toHaveLength(0)
    expect(namedDriverProbe({ ...opts, probes: [ACA_ENHANCED_PROBE_HEALTHCARE_GUARD] })).toEqual({ driver: 'sampling-noise-near-tie' })
    expect(crowns, 'the legacy guard re-searched the flipped world').toHaveLength(1)
  })
})

describe('the census — every read of the regime and of the ACA table contents, pinned', () => {
  const ENGINE = resolve(import.meta.dirname, '../..')
  const sources = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) return name === '__tests__' ? [] : sources(full)
      return /\.(ts|mts|cts|tsx)$/.test(name) ? [full] : []
    })

  it('the `enhancedSubsidies` file set — a new reader must re-argue acaRegime.ts', () => {
    const readers = sources(ENGINE)
      .filter((f) => readFileSync(f, 'utf-8').includes('enhancedSubsidies'))
      .map((f) => relative(ENGINE, f).replaceAll('\\', '/'))
      .sort()
    expect(readers).toEqual([
      'acaRegime.ts', // the rule
      'roth.ts', // the control preview's regime toggle (builds params; no simulate read)
      'simulate.ts', // forwards the flag into the overlay — its ONE read
      'solver/solveAnchor.ts', // the enumerator's ACA-cliff anchor (the probe never re-enumerates)
      'taxOverlay.ts', // the type, the destructure, the table select
      'validation/consumedConstants.ts', // the token's consumed-set walk (not a simulated quantity)
      'validation/gradeCalibration.ts', // the probe itself
    ])
    const lines = (f: string) => readFileSync(join(ENGINE, f), 'utf-8').split(/\r?\n/).filter((l) => l.includes('enhancedSubsidies')).length
    expect(lines('simulate.ts'), 'simulate forwards the flag on exactly one line').toBe(1)
    expect(lines('taxOverlay.ts'), 'taxOverlay: the type field, the destructure, the table select').toBe(3)
  })

  it('the ACA table CONTENTS are read at exactly three sites, all behind a positive enrolled premium', () => {
    const src = readFileSync(join(ENGINE, 'taxOverlay.ts'), 'utf-8')
    const reads = src
      .split(/\r?\n/)
      .filter((line) => /acaTable\.\w|\(acaTable[,)]|^\s*acaTable,\s*$/.test(line))
      .map((line) => line.trim())
    expect(reads).toEqual([
      'acaTable.cliffFplFraction !== null &&', // the cliff rail's own guard (inside the enrolled > 0 `if`)
      'const cliff = cliffMagiFor(acaTable, fplForHousehold(regime.livingCount))', // the cliff rail
      'acaTable,', // solveAcaFundedGross's argument — the priced ACA year
    ])
    // …and both gates carry the positive-premium conjunct the rule mirrors.
    expect(src).toContain('enrolledForRail > 0 &&')
    expect(src).toContain('enrolledThisYear > 0 &&')
  })
})

describe('the witness — the shipped solve simulates no enhanced-regime world on a Medicare-only household', () => {
  it('legacy guard: the whole rankable roster on both seeds in the flipped world; shipped: none', () => {
    const req = buildSolveRequest({ ...resolveDevSeed('retired')!, chosenGoal: 'pay-less-tax' }, TODAY)
    if (typeof req === 'string') throw new Error(req)
    const small = {
      ...req,
      candidates: [
        ...req.candidates.filter((c) => c.provenance !== 'grid'),
        ...req.candidates.filter((c) => c.provenance === 'grid' && c.conversion !== null).slice(0, 3),
      ],
      base: { ...req.base, paths: 64 },
      _gradeMinPaths: 50,
    }
    const enhancedRuns = () => simulateMock.mock.calls.filter((c) => c[0].overlay?.enhancedSubsidies === true).length

    simulateMock.mockClear()
    expect(solveWithMint({ ...small, _probeEveryHealthcareWorld: true }).kind).toBe('recommended')
    // Red-first: the legacy guard really ran the flipped world (were this 0, the next line proves nothing).
    expect(enhancedRuns()).toBe(2 * small.candidates.length)

    simulateMock.mockClear()
    expect(solveWithMint(small).kind).toBe('recommended')
    expect(enhancedRuns()).toBe(0)
  }, 120_000)
})
