/**
 * U14 S2 — the optimality oracle: the five hand-derived known-best cases + the two
 * state-dimension companions, each judged against its OWN closed-form re-derivation from
 * the canonical constants (DND-012 + insight 032), with the planted-wrong-best control arm
 * proving the oracle can FAIL (insights 016/070, burned/070) and the precondition-refusal
 * arms proving a known-best never grades a world it wasn't derived for (insight 023).
 *
 * Tolerance discipline: the engine converges each year's gross within 1e-7 (tax fixed
 * point) / 1e-6 (ACA bisection); five accumulated years stay well inside a cent, so dollar
 * expectations assert `toBeCloseTo(x, 2)` — tight against real drift, immune to float dust.
 */
import { describe, it, expect } from 'vitest'
import type { SimulationParams } from '@shared/model'
import {
  SOLVER_CASES,
  caseAcaCliff,
  caseBracketFill,
  caseConstantRate,
  caseLeaveMore,
  caseNoChange,
  caseStateNc,
  caseStatePa,
  solverCandidateId,
  CASE_III_OVER_AMOUNT,
  CASE_III_UNDER_AMOUNT,
} from '../../reference/solver-cases'
import {
  assertFixtureApplies,
  checkOracleCase,
  runOptimalityOracle,
} from '../optimalityOracle'
import {
  collectCandidateOutcome,
  evaluateCandidates,
  rankCandidates,
  scoreFromDistribution,
  type CandidateOutcome,
} from '../evaluate'

const meanOf = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length

const scoredOf = (outcomes: readonly CandidateOutcome[]) =>
  outcomes.filter((o): o is Extract<CandidateOutcome, { kind: 'scored' }> => o.kind === 'scored')

const byId = (outcomes: readonly CandidateOutcome[], id: string) => {
  const hit = scoredOf(outcomes).find((o) => solverCandidateId(o.candidate) === id)
  if (hit === undefined) throw new Error(`no scored candidate ${id}`)
  return hit
}

describe('the five oracle cases + state companions — every ranking matches its hand derivation', () => {
  for (const fixture of SOLVER_CASES) {
    it(`${fixture.id} — ${fixture.title}`, () => {
      const verdict = checkOracleCase(fixture)
      expect(verdict.pass, verdict.detail).toBe(true)
    })
  }
})

describe('case (i) — constant-marginal-rate: the dollars, the tie, and the degrade witness', () => {
  const verdict = checkOracleCase(caseConstantRate)
  const exp = caseConstantRate.expected()

  it('lifetime tax matches the closed forms EXACTLY (per policy, re-derived from the table)', () => {
    expect(byId(verdict.outcomes, 'conventional:taxable-first:0').score.lifetimeTaxMeanReal).toBeCloseTo(exp.lifetimeTaxTaxableFirst!, 2)
    expect(byId(verdict.outcomes, 'grid:proportional:0').score.lifetimeTaxMeanReal).toBeCloseTo(exp.lifetimeTaxProportional!, 2)
    expect(byId(verdict.outcomes, 'grid:pre-tax-first:0').score.lifetimeTaxMeanReal).toBeCloseTo(exp.lifetimeTaxPretaxFirst!, 2)
  })

  it('bracket-fill degrades to pre-tax-first BYTE-identically (no active rail ⇒ +∞ ceiling — the live degrade witness)', () => {
    const pretaxFirst = byId(verdict.outcomes, 'grid:pre-tax-first:0')
    const bracketFill = byId(verdict.outcomes, 'grid:bracket-fill:0')
    expect(bracketFill.score.lifetimeTaxMeanReal).toBe(pretaxFirst.score.lifetimeTaxMeanReal)
    expect(bracketFill.distribution.terminalValuesReal).toEqual(pretaxFirst.distribution.terminalValuesReal)
  })

  it('Tier-1 ties at exactly 1.0 for every candidate (the pay-less-tax goal decides alone) + presence: real tax was paid', () => {
    for (const o of scoredOf(verdict.outcomes)) {
      expect(o.score.survival).toBe(1)
      expect(o.score.lifetimeTaxMeanReal!).toBeGreaterThan(0) // insight 029 — the world is not vacuously tax-free
    }
  })
})

describe('case (ii) — the bracket-fill conversion optimum (fill to the 22%-top, no further)', () => {
  const verdict = checkOracleCase(caseBracketFill)
  const exp = caseBracketFill.expected()

  it('the after-tax bequest matches the closed form at every anchor', () => {
    expect(byId(verdict.outcomes, 'conventional:taxable-first:0').score.afterTaxBequestMeanReal).toBeCloseTo(exp.bequestConv0!, 2)
    expect(byId(verdict.outcomes, `grid:taxable-first:${exp.anchor10}`).score.afterTaxBequestMeanReal).toBeCloseTo(exp.bequestA10!, 2)
    expect(byId(verdict.outcomes, `grid:taxable-first:${exp.anchor12}`).score.afterTaxBequestMeanReal).toBeCloseTo(exp.bequestA12!, 2)
    expect(byId(verdict.outcomes, `grid:taxable-first:${exp.anchor22}`).score.afterTaxBequestMeanReal).toBeCloseTo(exp.bequestA22!, 2)
  })

  it('the conversion tax is the world’s ONLY tax (the winner’s lifetime tax = its conversion’s own tax)', () => {
    expect(byId(verdict.outcomes, `grid:taxable-first:${exp.anchor22}`).score.lifetimeTaxMeanReal).toBeCloseTo(exp.lifetimeTaxA22!, 2)
    expect(byId(verdict.outcomes, 'conventional:taxable-first:0').score.lifetimeTaxMeanReal).toBeCloseTo(0, 2)
  })

  it('presence companion (insight 029): the winner’s conversion genuinely relocated into Roth on every path', () => {
    const winner = byId(verdict.outcomes, `grid:taxable-first:${exp.anchor22}`)
    const roth = winner.distribution.taxAware!.terminalRothReal
    expect(roth.length).toBeGreaterThan(0)
    expect(roth.every((r) => r >= exp.anchor22! - 1)).toBe(true) // the full amount landed (r = 0 world)
  })

  it('the zero-vol world is DRAW-INVARIANT: a second seed reproduces the ranking and the dollars byte-for-byte', () => {
    const again = evaluateCandidates(caseBracketFill.buildBase(), caseBracketFill.buildCandidates(), 0xd1f5eed, {
      heirBracket: caseBracketFill.preconditions.heirBracket,
    })
    const ranked = rankCandidates(again, caseBracketFill.goal, 0).map((o) => solverCandidateId(o.candidate))
    expect(ranked).toEqual([...caseBracketFill.expectedRankingIds])
    expect(byId(again, `grid:taxable-first:${exp.anchor22}`).score.afterTaxBequestMeanReal).toBe(
      byId(verdict.outcomes, `grid:taxable-first:${exp.anchor22}`).score.afterTaxBequestMeanReal,
    )
  })
})

describe('case (iii) — the ACA cliff: the true ranking, the hand-exact premiums, and the BLIND inversion', () => {
  const verdict = checkOracleCase(caseAcaCliff)
  const exp = caseAcaCliff.expected()
  const premiumsOf = (id: string): number => meanOf(byId(verdict.outcomes, id).distribution.taxAware!.lifetimeNetPremiumReal)

  it('lifetime net premiums match the closed forms (the crossing-year witness — the over candidate pays FULL enrolled in exactly the conversion years)', () => {
    expect(premiumsOf('grid:pre-tax-first:0')).toBeCloseTo(exp.premiumsConv0!, 2)
    expect(premiumsOf(`grid:pre-tax-first:${CASE_III_UNDER_AMOUNT}`)).toBeCloseTo(exp.premiumsUnder!, 2)
    expect(premiumsOf(`grid:pre-tax-first:${CASE_III_OVER_AMOUNT}`)).toBeCloseTo(exp.premiumsOver!, 2)
  })

  it('the after-tax bequests match the closed forms (under > none > over — filling past the cliff LOSES)', () => {
    expect(byId(verdict.outcomes, 'grid:pre-tax-first:0').score.afterTaxBequestMeanReal).toBeCloseTo(exp.afterTaxConv0!, 2)
    expect(byId(verdict.outcomes, `grid:pre-tax-first:${CASE_III_UNDER_AMOUNT}`).score.afterTaxBequestMeanReal).toBeCloseTo(exp.afterTaxUnder!, 2)
    expect(byId(verdict.outcomes, `grid:pre-tax-first:${CASE_III_OVER_AMOUNT}`).score.afterTaxBequestMeanReal).toBeCloseTo(exp.afterTaxOver!, 2)
  })

  it('THE SIGN INVERSION: the healthcare-BLIND counterfactual (premiums added back from the engine’s own surface) crowns the over-cliff candidate', () => {
    const blind = (['grid:pre-tax-first:0', `grid:pre-tax-first:${CASE_III_UNDER_AMOUNT}`, `grid:pre-tax-first:${CASE_III_OVER_AMOUNT}`] as const).map(
      (id) => ({ id, value: byId(verdict.outcomes, id).score.afterTaxBequestMeanReal! + premiumsOf(id) }),
    )
    const blindWinner = blind.reduce((m, x) => (x.value > m.value ? x : m))
    expect(blindWinner.id).toBe(`grid:pre-tax-first:${CASE_III_OVER_AMOUNT}`)
    // …and the blind values themselves re-derive:
    expect(blind[0]!.value).toBeCloseTo(exp.blindConv0!, 2)
    expect(blind[1]!.value).toBeCloseTo(exp.blindUnder!, 2)
    expect(blind[2]!.value).toBeCloseTo(exp.blindOver!, 2)
  })

  it('survival is 1.0 for every candidate — the inversion is priced, never a fabricated depletion', () => {
    for (const o of scoredOf(verdict.outcomes)) expect(o.score.survival).toBe(1)
  })
})

describe('case (iv) — the §1014/IRD inversion: the gross argmax is the after-tax loser (the fails-loud control)', () => {
  const verdict = checkOracleCase(caseLeaveMore)
  const exp = caseLeaveMore.expected()

  it('the gross-bequest argmax crowns conversion-0 — NOT the known-best (a gross objective would mis-rank, exactly as contract #7 forbids)', () => {
    const grossWinner = scoredOf(verdict.outcomes).reduce((m, o) =>
      o.score.terminalGrossMeanReal > m.score.terminalGrossMeanReal ? o : m,
    )
    expect(solverCandidateId(grossWinner.candidate)).toBe('conventional:taxable-first:0')
    expect(solverCandidateId(grossWinner.candidate)).not.toBe(caseLeaveMore.expectedRankingIds[0])
    expect(grossWinner.score.terminalGrossMeanReal).toBeCloseTo(exp.grossConv0!, 2)
  })

  it('the gross ranking is the EXACT REVERSE of the after-tax ranking (perfect anti-alignment by construction)', () => {
    const byGross = [...scoredOf(verdict.outcomes)]
      .sort((a, b) => b.score.terminalGrossMeanReal - a.score.terminalGrossMeanReal)
      .map((o) => solverCandidateId(o.candidate))
    expect(byGross).toEqual([...caseLeaveMore.expectedRankingIds].reverse())
  })
})

describe('case (v) — the no-change routing: the LABELED conventional baseline is crowned', () => {
  const verdict = checkOracleCase(caseNoChange)

  it('the winner IS the conventional-baseline candidate (provenance-checked, conversion null) — never a fabricated active move', () => {
    const ranked = rankCandidates(verdict.outcomes, caseNoChange.goal, 0)
    const winner = ranked[0]!
    expect(winner.candidate.provenance).toBe('conventional-baseline')
    expect(winner.candidate.conversion).toBeNull()
    expect(winner.candidate.policy).toBe('taxable-first')
  })

  it('the closed-form dollars are ASSERTED, not just implied (U14 fold — expected() was a dead re-derivation)', () => {
    const exp = caseNoChange.expected()
    expect(byId(verdict.outcomes, 'conventional:taxable-first:0').score.lifetimeTaxMeanReal).toBeCloseTo(exp.lifetimeTaxTaxableFirst!, 2)
    expect(byId(verdict.outcomes, 'grid:pre-tax-first:0').score.lifetimeTaxMeanReal).toBeCloseTo(exp.lifetimeTaxPretaxFirst!, 2)
  })
})

describe('the state companions — the NC flip, the NC dollars, and the PA byte-identity', () => {
  it('NC: the crown FLIPS to the 12%-top anchor, and the winner’s lifetime tax = fed + state EXACTLY', () => {
    const verdict = checkOracleCase(caseStateNc)
    expect(verdict.pass, verdict.detail).toBe(true)
    const exp = caseStateNc.expected()
    const winnerId = caseStateNc.expectedRankingIds[0]!
    expect(byId(verdict.outcomes, winnerId).score.lifetimeTaxMeanReal).toBeCloseTo(exp.lifetimeTaxA12!, 2)
    // The federal 22%-top anchor — the STATE-ABSENT crown — pays fed + a LARGER state bill here:
    const fed22Id = caseStateNc.expectedRankingIds[1]!
    expect(byId(verdict.outcomes, fed22Id).score.lifetimeTaxMeanReal).toBeCloseTo(exp.lifetimeTaxA22!, 2)
    // …and the flip is real: NC's crown differs from the federal twin's crown.
    expect(winnerId).not.toBe(caseBracketFill.expectedRankingIds[0])
  })

  it('PA: byte-identical to the state-absent twin (the +0 addend leaves every iterate untouched)', () => {
    const pa = checkOracleCase(caseStatePa)
    const federal = checkOracleCase(caseBracketFill)
    expect(pa.pass, pa.detail).toBe(true)
    for (const id of caseStatePa.expectedRankingIds) {
      const paOutcome = byId(pa.outcomes, id)
      const fedOutcome = byId(federal.outcomes, id)
      expect(paOutcome.distribution.terminalValuesReal).toEqual(fedOutcome.distribution.terminalValuesReal)
      expect(paOutcome.score.lifetimeTaxMeanReal).toBe(fedOutcome.score.lifetimeTaxMeanReal)
    }
    // The closed-form DOLLARS asserted too (U14 fold — expected() was a dead re-derivation):
    // the winner's whole-run tax is the federal-only figure EXACTLY (PA adds literally $0).
    const exp = caseStatePa.expected()
    expect(exp.paStateCost).toBe(0)
    expect(byId(pa.outcomes, caseStatePa.expectedRankingIds[0]!).score.lifetimeTaxMeanReal).toBeCloseTo(exp.lifetimeTaxA22!, 2)
  })
})

describe('the precondition REFUSAL gate (insight 023 / supersession item 1)', () => {
  it('a federal-only fixture REFUSES a priced-state run (the NC flip is why)', () => {
    const base = caseBracketFill.buildBase()
    const ncRun: SimulationParams = { ...base, overlay: { ...base.overlay!, retirementState: 'NC' } }
    expect(() => assertFixtureApplies(caseBracketFill, ncRun)).toThrow(/REFUSED.*state/)
  })

  it('a state fixture REFUSES a state-absent run (both directions of the gate)', () => {
    expect(() => assertFixtureApplies(caseStateNc, caseBracketFill.buildBase())).toThrow(/REFUSED.*state/)
  })

  it("an 'elsewhere' run normalizes to the disclosed-out world — the absent fixture accepts it", () => {
    const base = caseBracketFill.buildBase()
    const elsewhere: SimulationParams = { ...base, overlay: { ...base.overlay!, retirementState: 'elsewhere' } }
    expect(() => assertFixtureApplies(caseBracketFill, elsewhere)).not.toThrow()
  })

  it('a deterministic-world fixture REFUSES a volatile run (the hand ledger does not price it)', () => {
    const base = caseBracketFill.buildBase()
    const volatile: SimulationParams = {
      ...base,
      market: { ...base.market, stock: { mean: 0.03, stdDev: 0.18 } },
    }
    expect(() => assertFixtureApplies(caseBracketFill, volatile)).toThrow(/REFUSED.*deterministic|volatility/)
  })
})

describe('the oracle is FALSIFIABLE (insights 016/070, burned/070) — the planted wrong-best control', () => {
  it('a fixture whose declared best is INFERIOR comes back pass === false, naming the divergence', () => {
    const planted = {
      ...caseBracketFill,
      id: 'planted-wrong-best',
      // Declare the conversion-0 baseline best — the hand derivation proves it WORST.
      expectedRankingIds: [...caseBracketFill.expectedRankingIds].reverse(),
    }
    const verdict = checkOracleCase(planted)
    expect(verdict.pass).toBe(false)
    expect(verdict.detail).toMatch(/ranking mismatch/)
    // The CONTROL arm: the genuine fixture passes on the same machinery (the checker can
    // distinguish — a gate that can never fail is theater).
    expect(checkOracleCase(caseBracketFill).pass).toBe(true)
  })

  it('an EMPTY roster is REFUSED (U14 fold) — zero cases would mint a vacuously-green report, the gate that cannot go red', () => {
    expect(() => runOptimalityOracle([])).toThrow(/EMPTY fixture roster.*vacuous/)
  })

  it('runOptimalityOracle mints the branded report ONLY on a clean roster; a planted roster yields failures, never a report', () => {
    const clean = runOptimalityOracle(SOLVER_CASES)
    expect('report' in clean && clean.report.caseIds).toEqual(SOLVER_CASES.map((f) => f.id))
    const planted = runOptimalityOracle([
      ...SOLVER_CASES,
      { ...caseBracketFill, id: 'planted', expectedRankingIds: [...caseBracketFill.expectedRankingIds].reverse() },
    ])
    expect('report' in planted).toBe(false)
    if ('failures' in planted) {
      expect(planted.failures.map((f) => f.fixtureId)).toEqual(['planted'])
    }
  }, 120_000)
})

describe('the evaluation seams (insight 048 — the synthetic arms the live engine cannot cheaply produce)', () => {
  const anyCandidate = { policy: 'proportional', conversion: null, provenance: 'grid' } as const

  it('a typed SimInfeasible becomes an infeasible-as-a-whole candidate outcome (never a throw, never dropped paths)', () => {
    const out = collectCandidateOutcome(anyCandidate, {
      indeterminate: false,
      infeasible: true,
      reason: 'non-finite portfolio value (float overflow)',
      pathIndex: 7,
    })
    expect(out).toEqual({ kind: 'infeasible', candidate: anyCandidate, reason: 'non-finite portfolio value (float overflow)', pathIndex: 7 })
  })

  it('an INDETERMINATE candidate output throws — the base passed validation, so this is an enumerator bug, never a quiet skip', () => {
    expect(() =>
      collectCandidateOutcome(anyCandidate, { indeterminate: true, reason: 'planted' }),
    ).toThrow(/enumerator\/harness bug/)
  })

  it('an infeasible candidate ranks WORST — after every scored candidate (M6/§7.5)', () => {
    const verdict = checkOracleCase(caseBracketFill)
    const infeasible: CandidateOutcome = {
      kind: 'infeasible',
      candidate: { policy: 'pre-tax-first', conversion: null, provenance: 'grid' },
      reason: 'planted',
      pathIndex: 0,
    }
    const ranked = rankCandidates([...verdict.outcomes, infeasible], 'leave-more', 0)
    expect(ranked[ranked.length - 1]).toBe(infeasible)
  })

  it('a NaN tie-tolerance fails LOUD (a NaN admits everything — insight 010)', () => {
    const verdict = checkOracleCase(caseBracketFill)
    expect(() => rankCandidates(verdict.outcomes, 'leave-more', Number.NaN)).toThrow(/finite/)
  })

  it('scoreFromDistribution refuses an out-of-domain heirBracket (U14 fold — the guard had no red test): =1, negative, NaN', () => {
    // heirBracket = 1 would zero the IRD term and ≥ 1 would flip its sign — the leave-more
    // objective's OPTIMISTIC error direction; the [0, 1) guard must be pinned red.
    const dist = byId(checkOracleCase(caseBracketFill).outcomes, 'conventional:taxable-first:0').distribution
    expect(() => scoreFromDistribution(dist, 1)).toThrow(/heirBracket/)
    expect(() => scoreFromDistribution(dist, -0.1)).toThrow(/heirBracket/)
    expect(() => scoreFromDistribution(dist, Number.NaN)).toThrow(/heirBracket/)
    // CONTROL: the declared in-domain bracket scores clean on the same distribution.
    expect(scoreFromDistribution(dist, 0.23).afterTaxBequestMeanReal).toBeDefined()
  })
})
