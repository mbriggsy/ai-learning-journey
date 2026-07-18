/**
 * The OPTIMALITY ORACLE (U14 S2 — the known-best ranking gate; plan contract #1's first
 * clause). Runs every committed solver-case fixture through the SHARED apply seam + the real
 * engine + the reference ranking, and judges the ranking against the fixture's hand-derived
 * expectation. The oracle is FALSIFIABLE by construction (insights 016/070, burned/070):
 * `checkOracleCase` RETURNS a verdict rather than asserting, so the suite carries both the
 * genuine arm (verdict.pass === true) and the planted-wrong-best control arm (a fixture
 * whose declared best is inferior MUST come back pass === false) — a gate that cannot go
 * red is theater.
 *
 * THE PRECONDITION REFUSAL (S2's state dimension, supersession item 1): a fixture's
 * known-best is a claim about ITS declared world. `assertFixtureApplies` refuses to grade a
 * run outside the fixture's preconditions — most load-bearingly the STATE axis (the NC
 * companion proves a federal-only known-best is WRONG under NC's flat rate: the optimum
 * flips a band). Refusal is a THROW (the harness asked an incoherent question), never a
 * silent skip and never a wrong grade.
 */
import type { SimulationParams } from '@shared/model'
import { isPricedState } from '@engine/constants'
import { solverCandidateId, type SolverCaseFixture } from '../reference/solver-cases/types'
import { evaluateCandidates, rankCandidates, type CandidateOutcome } from './evaluate'

declare const ORACLE_REPORT: unique symbol

/** The oracle's branded report — mintable ONLY by {@link runOptimalityOracle} on a clean
 *  pass over the whole roster (the S6 token takes it; a hand-built literal fails the brand
 *  without a deliberate cast, which is the discipline bar a type can enforce). */
export interface OracleReport {
  readonly [ORACLE_REPORT]: true
  readonly caseIds: readonly string[]
  readonly pass: true
}

export interface OracleCaseVerdict {
  readonly fixtureId: string
  readonly pass: boolean
  /** The engine-produced ranking, as candidate ids (best first, infeasible last). */
  readonly actualRankingIds: readonly string[]
  readonly expectedRankingIds: readonly string[]
  readonly outcomes: readonly CandidateOutcome[]
  readonly detail: string
}

/**
 * The precondition gate: refuse to apply a fixture outside its declared world. The STATE
 * axis is checked against the run's own built overlay (the producer's output — insight 088);
 * the deterministic axis is checked against the market/longevity knobs it derives from.
 */
export function assertFixtureApplies(fixture: SolverCaseFixture, params: SimulationParams): void {
  const runState = params.overlay?.retirementState
  const fixtureState = fixture.preconditions.state
  const runStateNormalized = runState !== undefined && isPricedState(runState) ? runState : 'absent'
  if (runStateNormalized !== fixtureState) {
    throw new Error(
      `[oracle] REFUSED: fixture ${fixture.id} declares state '${fixtureState}' but the run is ` +
        `'${runStateNormalized}' — a known-best never grades a run outside its preconditions ` +
        `(the NC companion is the live proof: the state term flips the optimal anchor)`,
    )
  }
  if (fixture.preconditions.deterministic) {
    const m = params.market
    if (m.stock.stdDev !== 0 || m.bond.stdDev !== 0 || params.longevityMode !== 'fixed-horizon') {
      throw new Error(
        `[oracle] REFUSED: fixture ${fixture.id} is a deterministic-world derivation but the run ` +
          `carries volatility or sampled longevity — the hand ledger does not price this world`,
      )
    }
  }
}

/** Run one fixture end-to-end and JUDGE it (no assertion — the caller owns pass/fail so the
 *  planted-wrong-best control arm can exist). */
export function checkOracleCase(fixture: SolverCaseFixture): OracleCaseVerdict {
  const base = fixture.buildBase()
  assertFixtureApplies(fixture, base)
  const candidates = fixture.buildCandidates()
  const outcomes = evaluateCandidates(base, candidates, fixture.seed, {
    heirBracket: fixture.preconditions.heirBracket,
  })
  const ranked = rankCandidates(outcomes, fixture.goal, fixture.tieTolerance)
  const actualRankingIds = ranked.map((o) => solverCandidateId(o.candidate))
  const expected = fixture.expectedRankingIds
  const pass =
    actualRankingIds.length === expected.length &&
    actualRankingIds.every((id, i) => id === expected[i])
  return {
    fixtureId: fixture.id,
    pass,
    actualRankingIds,
    expectedRankingIds: expected,
    outcomes,
    detail: pass
      ? 'ranking matches the hand derivation exactly'
      : `ranking mismatch — expected [${expected.join(' > ')}], engine produced [${actualRankingIds.join(' > ')}]`,
  }
}

/** Run the WHOLE roster; mint the branded report ONLY when every case passes. A failure
 *  returns the verdicts (never a report) so the caller can name the exact divergence. */
export function runOptimalityOracle(
  fixtures: readonly SolverCaseFixture[],
): { readonly report: OracleReport } | { readonly failures: readonly OracleCaseVerdict[] } {
  const verdicts = fixtures.map(checkOracleCase)
  const failures = verdicts.filter((v) => !v.pass)
  if (failures.length > 0) return { failures }
  // The ONE sanctioned brand mint (module-internal; external construction requires a
  // deliberate double-cast — the compile-level discipline bar).
  const report = {
    caseIds: verdicts.map((v) => v.fixtureId),
    pass: true,
  } as unknown as OracleReport
  return { report }
}
